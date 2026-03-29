/**
 * Online Evaluation Runner - Live agent execution for evals
 *
 * Runs evaluation tasks by actually spawning the agent with GLM-5
 * and evaluating the results against success criteria.
 *
 * @module eval/runners/online
 */

import { homedir } from "os";
import { join, dirname } from "path";
import { mkdirSync, writeFileSync, existsSync, rmSync } from "fs";
import type {
  EvalTask,
  EvalResult,
  EvalTrace,
  EvalSuite,
  EvalSuiteResult,
  EvalMetrics,
  SuccessCriterion,
  EvalTaskInput,
  RunLevelInput,
  TraceLevelInput,
} from "../types.js";
import type { Message, ContentBlock, ToolUseBlock } from "../../schemas/index.js";
import { agentLoop, type AgentLoopOptions, type AgentLoopResult } from "../../core/agent-loop/index.js";
import { builtInTools } from "../../ecosystem/tools/index.js";
import { DEFAULT_MODEL } from "../../core/models.js";
import { evaluateCriteria } from "../graders/code-based.js";
import { TelemetryCollector, buildSuiteTelemetry } from "../telemetry/index.js";
import type { SessionTelemetry, SuiteTelemetry } from "../telemetry/index.js";

// ============================================
// HELPERS
// ============================================

/**
 * Extract prompt string from any EvalTaskInput type
 */
function getPromptFromInput(input: EvalTaskInput): string {
  if ("prompt" in input && typeof input.prompt === "string") {
    return input.prompt;
  }
  if ("messages" in input && Array.isArray(input.messages) && input.messages.length > 0) {
    const firstMsg = input.messages[0];
    if (typeof firstMsg?.content === "string") return firstMsg.content;
    if (Array.isArray(firstMsg?.content)) {
      const textBlock = firstMsg.content.find((b: { type?: string }) => b.type === "text");
      if (textBlock && "text" in textBlock) return textBlock.text as string;
    }
  }
  if ("finalPrompt" in input && typeof input.finalPrompt === "string") {
    return input.finalPrompt;
  }
  return "";
}

/**
 * Setup step file paths for cleanup
 */
const setupStepFiles: string[] = [];

/**
 * Execute setup steps before running a task
 * Creates files, directories, etc. as specified in the task input
 */
function executeSetupSteps(input: EvalTaskInput, workingDir: string): void {
  const setupSteps = (input as RunLevelInput | TraceLevelInput).setupSteps;
  if (!setupSteps || setupSteps.length === 0) return;

  for (const step of setupSteps) {
    if (typeof step === "string") {
      // Bash command - skip for now (security)
      console.log(`  Setup: Would execute: ${step}`);
    } else if (step.action === "create" && step.path && step.content) {
      const filePath = step.path.startsWith("./") || step.path.startsWith("/")
        ? step.path
        : join(workingDir, step.path);
      // Ensure parent directory exists
      const dir = dirname(filePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(filePath, step.content, "utf-8");
      setupStepFiles.push(filePath);
      console.log(`  Setup: Created file ${step.path}`);
    }
  }
}

/**
 * Cleanup setup step files after task completion
 */
function cleanupSetupSteps(): void {
  for (const filePath of setupStepFiles) {
    try {
      if (existsSync(filePath)) {
        rmSync(filePath, { force: true });
      }
    } catch {
      // Ignore cleanup errors
    }
  }
  setupStepFiles.length = 0;
}

// ============================================
// CONFIG
// ============================================

export interface OnlineEvalConfig {
  /** Model to use for evaluation (default: glm-5) */
  model?: string;
  /** API key (defaults to ANTHROPIC_API_KEY env) */
  apiKey?: string;
  /** Working directory for eval execution */
  workingDir?: string;
  /** Timeout per task in ms (default: 120000) */
  timeoutMs?: number;
  /** Whether to capture traces */
  captureTraces?: boolean;
  /** Output directory for results */
  outputDir?: string;
  /** Whether to run in parallel */
  parallel?: boolean;
  /** Max concurrent tasks */
  maxConcurrent?: number;
  /** Whether to collect detailed telemetry */
  collectTelemetry?: boolean;
}

const DEFAULT_CONFIG: OnlineEvalConfig = {
  model: "glm-5",
  timeoutMs: 120000,
  captureTraces: true,
  outputDir: "./eval-results",
  parallel: false,
  maxConcurrent: 1,
  collectTelemetry: true,
};

// ============================================
// TASK EXECUTOR
// ============================================

/**
 * Convert eval task input to messages format
 */
function inputToMessages(input: EvalTaskInput): Message[] {
  const promptText = getPromptFromInput(input);
  return [
    {
      role: "user",
      content: [{ type: "text", text: promptText }],
    },
  ];
}

/**
 * Convert AgentLoopResult to EvalTrace
 */
function resultToTrace(result: AgentLoopResult, sessionId: string): EvalTrace {
  const toolCalls: EvalTrace["toolCalls"] = [];
  const fileChanges: EvalTrace["fileChanges"] = [];
  let finalResponse: string | undefined;

  // Extract tool calls from messages
  for (const msg of result.messages) {
    if (msg.role === "assistant" && Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === "tool_use") {
          const toolBlock = block as ToolUseBlock;
          toolCalls.push({
            id: toolBlock.id,
            name: toolBlock.name,
            input: toolBlock.input,
            success: true, // Would need tool_result to determine
            timestamp: Date.now(),
          });

          // Track file changes
          if (toolBlock.name === "Write" && toolBlock.input.file_path) {
            fileChanges.push({
              path: toolBlock.input.file_path as string,
              action: "create",
            });
          } else if (toolBlock.name === "Edit" && toolBlock.input.file_path) {
            fileChanges.push({
              path: toolBlock.input.file_path as string,
              action: "modify",
            });
          } else if (toolBlock.name === "MultiEdit" && Array.isArray(toolBlock.input.edits)) {
            // Track all files modified by MultiEdit
            const paths = new Set<string>();
            for (const edit of toolBlock.input.edits as Array<{ file_path?: string }>) {
              if (edit.file_path && !paths.has(edit.file_path)) {
                paths.add(edit.file_path);
                fileChanges.push({
                  path: edit.file_path,
                  action: "modify",
                });
              }
            }
          }
        } else if (block.type === "text") {
          finalResponse = (finalResponse || "") + (block as { text: string }).text;
        }
      }
    }
  }

  return {
    sessionId,
    timestamp: new Date(),
    level: "trace",
    input: { level: "trace", prompt: "" },
    output: {
      response: finalResponse || "",
      toolCalls: toolCalls.map(tc => ({
        name: tc.name,
        input: tc.input,
        output: tc.result,
        isError: !tc.success,
      })),
    },
    toolCalls,
    stateTransitions: [],
    fileChanges,
    finalResponse,
    metrics: {
      durationMs: result.totalDuration,
      tokenUsage: {
        input: result.totalCacheMetrics.totalCacheReadTokens || 0,
        output: result.totalCacheMetrics.totalCacheWriteTokens || 0,
        total: result.totalCacheMetrics.totalCacheReadTokens + result.totalCacheMetrics.totalCacheWriteTokens || 0,
      },
      costUSD: result.totalCost,
    },
  };
}

/**
 * Run a single eval task with live agent execution
 */
export async function runEvalTask(
  task: EvalTask,
  config: OnlineEvalConfig = {}
): Promise<EvalResult & { telemetry?: SessionTelemetry }> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const startTime = Date.now();
  const sessionId = `eval-${task.id}-${Date.now()}`;

  // Initialize telemetry collector
  const telemetryCollector = cfg.collectTelemetry
    ? new TelemetryCollector(sessionId, task.id, cfg.model || "unknown")
    : null;

  telemetryCollector?.startCollection();

  console.log(`\n\x1b[36m▶ Running task: ${task.id}\x1b[0m`);
  console.log(`  Model: ${cfg.model}`);
  console.log(`  Prompt: ${getPromptFromInput(task.input).slice(0, 60)}...`);

  // Execute setup steps (create test files, etc.)
  const workingDir = cfg.workingDir || process.cwd();
  executeSetupSteps(task.input, workingDir);

  try {
    // Use built-in tools (same as CLI)
    const tools = builtInTools;

    // Build messages from task input
    const messages = inputToMessages(task.input);

    // Run agent loop
    const loopOptions: AgentLoopOptions = {
      apiKey: cfg.apiKey || process.env.ANTHROPIC_API_KEY || "",
      model: cfg.model,
      tools,
      systemPrompt: `You are being evaluated. Complete the task accurately and efficiently.

IMPORTANT RULES:
1. Use the appropriate tools for each operation
2. Be precise and follow instructions exactly
3. Report errors clearly if something fails
4. Keep responses concise`,
      workingDirectory: cfg.workingDir || process.cwd(),
      permissionMode: "bypassPermissions", // Evals don't need permission prompts
      maxTokens: 4096,
    };

    const result = await agentLoop(messages, loopOptions);

    // Record turn metrics to telemetry
    if (telemetryCollector) {
      for (let i = 0; i < result.metrics.length; i++) {
        const m = result.metrics[i];
        if (!m) continue;
        telemetryCollector.startTurn(i);
        telemetryCollector.recordTurn(i, {
          usage: m.usage ? {
            input_tokens: m.usage.input_tokens,
            output_tokens: m.usage.output_tokens,
          } : undefined,
          durationMs: m.durationMs,
          ttftMs: m.ttftMs,
        });
      }
    }

    // Convert to eval trace
    const trace = resultToTrace(result, sessionId);

    // Record tool calls to telemetry
    if (telemetryCollector) {
      for (const tc of trace.toolCalls) {
        telemetryCollector.recordToolCall(
          tc.name,
          tc.id,
          0, // Turn unknown from trace
          tc.input,
          tc.result,
          0, // Duration unknown
          tc.success !== false
        );
      }
    }

    // Evaluate against success criteria
    const evalResult = await evaluateCriteria(
      task.successCriteria,
      result,
      trace,
      cfg.workingDir || process.cwd()
    );

    // Build metrics
    const metrics: EvalMetrics = {
      turns: result.metrics.length,
      tokens: {
        input: trace.metrics?.tokenUsage?.input ?? 0,
        output: trace.metrics?.tokenUsage?.output ?? 0,
      },
      costUSD: result.totalCost,
      durationMs: Date.now() - startTime,
      ttftMs: result.metrics[0]?.ttftMs ?? 0,
      toolCallCount: trace.toolCalls.length,
      errorCount: trace.toolCalls.filter(tc => tc.success === false).length,
      compactionCount: result.compactionCount,
    };

    // Build session telemetry
    const telemetry = telemetryCollector
      ? telemetryCollector.buildSessionTelemetry(
          {
            taskId: task.id,
            passed: evalResult.passed,
            score: evalResult.score,
            criteriaResults: evalResult.criteriaResults,
            reason: evalResult.reason,
            trace,
            metrics,
            timestamp: Date.now(),
            model: cfg.model || "unknown",
          },
          result
        )
      : undefined;

    const status = evalResult.passed ? "\x1b[32m✓ PASSED\x1b[0m" : "\x1b[31m✗ FAILED\x1b[0m";
    console.log(`  ${status} (score: ${(evalResult.score * 100).toFixed(0)}%)`);

    return {
      taskId: task.id,
      passed: evalResult.passed,
      score: evalResult.score,
      criteriaResults: evalResult.criteriaResults,
      reason: evalResult.reason,
      trace: cfg.captureTraces ? trace : undefined,
      metrics,
      timestamp: Date.now(),
      model: cfg.model || "unknown",
      telemetry,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`  \x1b[31m✗ ERROR: ${errorMessage.slice(0, 50)}\x1b[0m`);

    // Record error in telemetry
    if (telemetryCollector && error instanceof Error) {
      telemetryCollector.recordError(error, 0, undefined, false, undefined, 0);
    }

    return {
      taskId: task.id,
      passed: false,
      score: 0,
      criteriaResults: [],
      reason: `Error: ${errorMessage}`,
      sessionId,
      metrics: {
        turns: 0,
        tokens: { input: 0, output: 0 },
        costUSD: 0,
        durationMs: Date.now() - startTime,
        ttftMs: 0,
        toolCallCount: 0,
        errorCount: 1,
        compactionCount: 0,
      },
      timestamp: Date.now(),
      model: cfg.model || "unknown",
    };
  } finally {
    // Always cleanup setup step files
    cleanupSetupSteps();
  }
}

// ============================================
// SUITE RUNNER
// ============================================

/**
 * Run an entire eval suite
 */
export async function runEvalSuite(
  suite: EvalSuite,
  config: OnlineEvalConfig = {}
): Promise<EvalSuiteResult> {
  const cfg = { ...DEFAULT_CONFIG, ...suite.config, ...config };
  const taskResults: EvalResult[] = [];

  console.log(`\n\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`);
  console.log(`\x1b[36mRunning Suite: ${suite.name}\x1b[0m`);
  console.log(`\x1b[90m${suite.description}\x1b[0m`);
  console.log(`\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n`);

  // Ensure output directory exists
  if (cfg.outputDir) {
    const outputDir = join(cfg.workingDir || process.cwd(), cfg.outputDir);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
  }

  // Run tasks (optionally in parallel)
  if (cfg.parallel && (cfg.maxConcurrent || 1) > 1) {
    // Parallel execution with concurrency limit
    const batches: EvalTask[][] = [];
    for (let i = 0; i < suite.tasks.length; i += cfg.maxConcurrent!) {
      batches.push(suite.tasks.slice(i, i + cfg.maxConcurrent!));
    }
    for (const batch of batches) {
      const results = await Promise.all(batch.map(task => runEvalTask(task, cfg)));
      taskResults.push(...results);
    }
  } else {
    // Sequential execution
    for (const task of suite.tasks) {
      const result = await runEvalTask(task, cfg);
      taskResults.push(result);
    }
  }

  // Calculate aggregate metrics
  const passedCount = taskResults.filter(r => r.passed).length;
  const passRate = passedCount / taskResults.length;
  const avgScore = taskResults.reduce((sum, r) => sum + r.score, 0) / taskResults.length;

  const aggregatedMetrics = {
    totalCost: taskResults.reduce((sum, r) => sum + r.metrics.costUSD, 0),
    totalDuration: taskResults.reduce((sum, r) => sum + r.metrics.durationMs, 0),
    totalTokens: {
      input: taskResults.reduce((sum, r) => sum + r.metrics.tokens.input, 0),
      output: taskResults.reduce((sum, r) => sum + r.metrics.tokens.output, 0),
    },
    avgTurns: taskResults.reduce((sum, r) => sum + r.metrics.turns, 0) / taskResults.length,
    avgToolCalls: taskResults.reduce((sum, r) => sum + r.metrics.toolCallCount, 0) / taskResults.length,
    errorRate: taskResults.filter(r => r.metrics.errorCount > 0).length / taskResults.length,
  };

  // Build suite telemetry if collection is enabled
  const suiteTelemetry = cfg.collectTelemetry
    ? buildSuiteTelemetry(suite.id, suite.name, taskResults, cfg.model || "unknown")
    : undefined;

  // Summary
  console.log(`\n\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`);
  console.log(`\x1b[33mResults Summary\x1b[0m`);
  console.log(`\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`);
  console.log(`  Pass Rate: ${(passRate * 100).toFixed(1)}% (${passedCount}/${taskResults.length})`);
  console.log(`  Avg Score: ${(avgScore * 100).toFixed(1)}%`);
  console.log(`  Total Cost: $${aggregatedMetrics.totalCost.toFixed(4)}`);
  console.log(`  Total Duration: ${(aggregatedMetrics.totalDuration / 1000).toFixed(1)}s`);
  console.log(`  Total Tokens: ${aggregatedMetrics.totalTokens.input + aggregatedMetrics.totalTokens.output}`);
  console.log(`  Avg Tool Calls: ${aggregatedMetrics.avgToolCalls.toFixed(1)}`);
  console.log(`  Error Rate: ${(aggregatedMetrics.errorRate * 100).toFixed(1)}%`);
  console.log();

  // Save results
  if (cfg.outputDir) {
    const outputPath = join(cfg.workingDir || process.cwd(), cfg.outputDir, `${suite.id}-${Date.now()}.json`);
    const suiteResult: EvalSuiteResult = {
      suiteId: suite.id,
      passRate,
      avgScore,
      taskResults,
      aggregatedMetrics,
      timestamp: Date.now(),
      model: cfg.model || "unknown",
      telemetry: suiteTelemetry,
    };
    writeFileSync(outputPath, JSON.stringify(suiteResult, null, 2));
    console.log(`\x1b[90mResults saved to: ${outputPath}\x1b[0m`);
  }

  return {
    suiteId: suite.id,
    passRate,
    avgScore,
    taskResults,
    aggregatedMetrics,
    timestamp: Date.now(),
    model: cfg.model || "unknown",
    telemetry: suiteTelemetry,
  };
}
