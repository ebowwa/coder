/**
 * Offline Evaluation Runner - Pre-deployment evaluation from session logs
 *
 * Runs evaluations against real session data without live agent execution.
 * Supports:
 * - Loading sessions from ~/.claude/sessions/
 * - Converting session logs to EvalTrace format
 * - Running code-based and LLM-based graders
 * - Generating evaluation reports
 *
 * @module eval/runners/offline
 */

import { homedir } from "os";
import { join } from "path";
import type {
  EvalTask,
  EvalResult,
  EvalTrace,
  EvalSuite,
  EvalSuiteResult,
  EvalMetrics,
  GraderConfig,
  SuccessCriteriaConfig,
} from "../types.js";
import type { AgentLoopResult } from "../../schemas/agent-loop.zod.js";
import type {
  SessionEntry,
  SessionMetadata,
  SessionMessage,
  SessionToolUse,
  SessionMetrics,
  LoadedSession,
} from "../../schemas/sessions.zod.js";
import { evaluateCriteria } from "../graders/code-based.js";
import { runLLMJudge, type LLMJudgeConfig } from "../graders/llm-judge.js";

// ============================================
// SESSION TO TRACE CONVERTER
// ============================================

/**
 * Convert a loaded session to an EvalTrace
 */
export function sessionToTrace(session: LoadedSession): EvalTrace {
  const stateTransitions: EvalTrace["stateTransitions"] = [];
  const toolCalls: EvalTrace["toolCalls"] = [];
  const fileChanges: EvalTrace["fileChanges"] = [];

  // Extract tool calls from session
  for (const tool of session.tools) {
    toolCalls.push({
      id: tool.toolId,
      name: tool.toolName,
      input: tool.input,
      // Convert string result to ToolResult format
      result: tool.result ? { content: tool.result } : undefined,
      success: !tool.isError,
      timestamp: tool.timestamp,
    });

    // Infer file changes from tool calls
    if (tool.toolName === "Write" && tool.input.file_path) {
      fileChanges.push({
        path: tool.input.file_path as string,
        action: "create",
      });
    } else if (tool.toolName === "Edit" && tool.input.file_path) {
      fileChanges.push({
        path: tool.input.file_path as string,
        action: "modify",
      });
    }
  }

  // Add initial state transition
  stateTransitions.push({
    from: "idle" as const,
    to: "processing" as const,
    event: { type: "START" },
    timestamp: session.metadata.created,
  });

  // Add completion transition
  stateTransitions.push({
    from: "processing" as const,
    to: "completed" as const,
    event: { type: "STOP", payload: { reason: "completed" } },
    timestamp: session.metadata.updated,
  });

  // Extract final response
  let finalResponse: string | undefined;
  const messages = session.messages;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg?.role === "assistant" && Array.isArray(msg.content)) {
      const textContent = msg.content
        .filter((b): b is { type: "text"; text: string } => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      finalResponse = textContent;
      break;
    }
  }

  return {
    stateTransitions,
    toolCalls,
    fileChanges,
    finalResponse,
    error: undefined,
  };
}

/**
 * Convert a loaded session to AgentLoopResult format
 */
export function sessionToAgentLoopResult(
  session: LoadedSession,
  trace: EvalTrace
): AgentLoopResult {
  // Aggregate metrics from session.metrics (QueryMetrics[])
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheRead = 0;
  let totalCacheWrite = 0;

  for (const m of session.metrics) {
    totalInputTokens += m.usage?.input_tokens ?? 0;
    totalOutputTokens += m.usage?.output_tokens ?? 0;
    totalCacheRead += m.usage?.cache_read_input_tokens ?? 0;
    totalCacheWrite += m.usage?.cache_creation_input_tokens ?? 0;
  }

  return {
    messages: session.messages,
    totalCost: session.metadata.totalCost ?? 0,
    totalDuration: session.metadata.updated - session.metadata.created,
    metrics: session.metrics,
    compactionCount: 0,
    totalTokensCompacted: 0,
    totalCacheMetrics: {
      cacheHits: 0,
      cacheMisses: 0,
      cacheReadTokens: totalCacheRead,
      cacheWriteTokens: totalCacheWrite,
      totalCacheReadTokens: totalCacheRead,
      totalCacheWriteTokens: totalCacheWrite,
      cacheHitRate: 0,
      estimatedSavingsUSD: 0,
    },
  };
}

// ============================================
// OFFLINE EVALUATOR
// ============================================

export interface OfflineEvalConfig {
  /** Sessions directory (default: ~/.claude/sessions) */
  sessionsDir?: string;
  /** LLM judge config (optional, for subjective evals) */
  llmJudge?: LLMJudgeConfig;
  /** Working directory for file-based checks */
  workingDir?: string;
  /** Whether to include reasoning in output */
  includeReasoning?: boolean;
  /** Output directory for reports */
  outputDir?: string;
}

export interface SessionEvalResult extends EvalResult {
  /** Original session ID */
  sessionId: string;
  /** Session metadata */
  sessionMetadata: SessionMetadata;
}

/**
 * Evaluate a single task against a session
 */
export async function evaluateSessionTask(
  task: EvalTask,
  session: LoadedSession,
  config: OfflineEvalConfig
): Promise<SessionEvalResult> {
  const trace = sessionToTrace(session);
  const result = sessionToAgentLoopResult(session, trace);

  const criteriaResults = [];

  // Run code-based evaluation
  const codeBasedResult = await evaluateCriteria(
    task.successCriteria,
    result,
    trace,
    config.workingDir ?? session.metadata.workingDirectory
  );
  criteriaResults.push(...codeBasedResult.criteriaResults);

  // Run LLM judge if configured and task has LLM-judge criteria
  if (config.llmJudge && task.successCriteria.aggregation === "custom") {
    const llmResult = await runLLMJudge(config.llmJudge, task, result, trace);
    criteriaResults.push({
      criterionId: "llm_judge",
      passed: llmResult.passed,
      reason: llmResult.reasoning,
      actual: llmResult.score,
      expected: "quality score >= 0.7",
      durationMs: 0,
    });
  }

  // Calculate metrics from session data
  // Aggregate token usage from session metrics
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  for (const m of session.metrics) {
    totalInputTokens += m.usage?.input_tokens ?? 0;
    totalOutputTokens += m.usage?.output_tokens ?? 0;
  }

  const metrics: EvalMetrics = {
    turns: session.metrics.length,
    tokens: {
      input: totalInputTokens,
      output: totalOutputTokens,
    },
    costUSD: result.totalCost,
    durationMs: result.totalDuration,
    ttftMs: session.metrics[0]?.ttftMs ?? 0,
    toolCallCount: trace.toolCalls.length,
    errorCount: trace.toolCalls.filter((tc) => !tc.success).length,
    compactionCount: result.compactionCount,
  };

  return {
    taskId: task.id,
    passed: codeBasedResult.passed,
    score: codeBasedResult.score,
    criteriaResults,
    reason: codeBasedResult.reason,
    trace,
    metrics,
    timestamp: Date.now(),
    model: session.metadata.model,
    sessionId: session.metadata.id,
    sessionMetadata: session.metadata,
  };
}

/**
 * Run evaluation suite against multiple sessions
 */
export async function runOfflineSuite(
  suite: EvalSuite,
  sessions: LoadedSession[],
  config: OfflineEvalConfig
): Promise<EvalSuiteResult> {
  const taskResults: EvalResult[] = [];

  for (const task of suite.tasks) {
    // Find matching sessions (by category or manual mapping)
    const matchingSessions = sessions.filter((s) => {
      // Could add session-to-task mapping logic here
      // For now, evaluate all sessions against all tasks
      return true;
    });

    for (const session of matchingSessions) {
      const result = await evaluateSessionTask(task, session, config);
      taskResults.push(result);
    }
  }

  // Aggregate metrics
  const aggregatedMetrics = {
    totalCost: taskResults.reduce((sum, r) => sum + r.metrics.costUSD, 0),
    totalDuration: taskResults.reduce((sum, r) => sum + r.metrics.durationMs, 0),
    totalTokens: taskResults.reduce(
      (sum, r) => ({
        input: sum.input + r.metrics.tokens.input,
        output: sum.output + r.metrics.tokens.output,
      }),
      { input: 0, output: 0 }
    ),
    avgTurns: taskResults.reduce((sum, r) => sum + r.metrics.turns, 0) / taskResults.length || 0,
    avgToolCalls:
      taskResults.reduce((sum, r) => sum + r.metrics.toolCallCount, 0) / taskResults.length || 0,
    errorRate:
      taskResults.reduce((sum, r) => sum + (r.metrics.errorCount > 0 ? 1 : 0), 0) /
        taskResults.length || 0,
  };

  return {
    suiteId: suite.id,
    passRate: taskResults.filter((r) => r.passed).length / taskResults.length || 0,
    avgScore: taskResults.reduce((sum, r) => sum + r.score, 0) / taskResults.length || 0,
    taskResults,
    aggregatedMetrics,
    timestamp: Date.now(),
    model: sessions[0]?.metadata.model ?? "unknown",
  };
}

// ============================================
// SESSION LOADER
// ============================================

/**
 * Load a session from JSONL file
 */
export async function loadSession(
  sessionId: string,
  sessionsDir?: string
): Promise<LoadedSession | null> {
  const dir = sessionsDir ?? join(homedir(), ".claude", "sessions");
  const filePath = join(dir, `${sessionId}.jsonl`);

  try {
    const content = await Bun.file(filePath).text();
    if (!content) return null;

    const entries: SessionEntry[] = [];
    const lines = content.trim().split("\n");

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        entries.push(JSON.parse(line) as SessionEntry);
      } catch {
        // Skip malformed lines
      }
    }

    return parseSessionEntries(entries);
  } catch {
    return null;
  }
}

/**
 * Parse session entries into a LoadedSession
 */
export function parseSessionEntries(entries: SessionEntry[]): LoadedSession {
  let metadata: SessionMetadata | null = null;
  const messages: LoadedSession["messages"] = [];
  const tools: LoadedSession["tools"] = [];
  const metrics: LoadedSession["metrics"] = [];
  let context: LoadedSession["context"] = null;
  const checkpoints: LoadedSession["checkpoints"] = [];

  for (const entry of entries) {
    switch (entry.type) {
      case "metadata":
        metadata = entry;
        break;
      case "message":
        messages.push(entry.data);
        break;
      case "tool_use":
        tools.push(entry);
        break;
      case "metrics":
        metrics.push(entry.data);
        break;
      case "context":
        context = entry;
        break;
      case "checkpoint":
        checkpoints.push(entry);
        break;
    }
  }

  if (!metadata) {
    throw new Error("Session missing metadata");
  }

  return {
    metadata,
    messages,
    tools,
    metrics,
    context,
    checkpoints,
  };
}

/**
 * List all available sessions
 */
export async function listSessions(sessionsDir?: string): Promise<string[]> {
  const dir = sessionsDir ?? join(homedir(), ".claude", "sessions");

  try {
    const glob = new Bun.Glob("*.jsonl");
    const files = [...glob.scanSync(dir)];
    return files.map((f) => f.replace(".jsonl", ""));
  } catch {
    return [];
  }
}

/**
 * Load multiple sessions
 */
export async function loadSessions(
  sessionIds?: string[],
  sessionsDir?: string
): Promise<LoadedSession[]> {
  const dir = sessionsDir ?? join(homedir(), ".claude", "sessions");

  const ids = sessionIds ?? (await listSessions(dir));
  const sessions: LoadedSession[] = [];

  for (const id of ids) {
    const session = await loadSession(id, dir);
    if (session) {
      sessions.push(session);
    }
  }

  return sessions;
}

// ============================================
// REPORT GENERATOR
// ============================================

/**
 * Generate a markdown report from evaluation results
 */
export function generateReport(result: EvalSuiteResult): string {
  const lines: string[] = [];

  lines.push(`# Evaluation Report: ${result.suiteId}`);
  lines.push("");
  lines.push(`**Generated**: ${new Date(result.timestamp).toISOString()}`);
  lines.push(`**Model**: ${result.model}`);
  lines.push("");

  // Summary
  lines.push("## Summary");
  lines.push("");
  lines.push(`- **Pass Rate**: ${(result.passRate * 100).toFixed(1)}%`);
  lines.push(`- **Average Score**: ${(result.avgScore * 100).toFixed(1)}%`);
  lines.push(`- **Tasks Evaluated**: ${result.taskResults.length}`);
  lines.push("");

  // Metrics
  lines.push("## Metrics");
  lines.push("");
  lines.push(`- **Total Cost**: $${result.aggregatedMetrics.totalCost.toFixed(4)}`);
  lines.push(`- **Total Duration**: ${(result.aggregatedMetrics.totalDuration / 1000).toFixed(1)}s`);
  lines.push(`- **Total Tokens**: ${result.aggregatedMetrics.totalTokens.input + result.aggregatedMetrics.totalTokens.output}`);
  lines.push(`- **Average Turns**: ${result.aggregatedMetrics.avgTurns.toFixed(1)}`);
  lines.push(`- **Average Tool Calls**: ${result.aggregatedMetrics.avgToolCalls.toFixed(1)}`);
  lines.push(`- **Error Rate**: ${(result.aggregatedMetrics.errorRate * 100).toFixed(1)}%`);
  lines.push("");

  // Task Results
  lines.push("## Task Results");
  lines.push("");

  for (const task of result.taskResults) {
    const status = task.passed ? "✅" : "❌";
    lines.push(`### ${status} ${task.taskId}`);
    lines.push("");
    lines.push(`- **Score**: ${(task.score * 100).toFixed(1)}%`);
    lines.push(`- **Reason**: ${task.reason}`);
    lines.push("");

    if (task.criteriaResults.length > 0) {
      lines.push("**Criteria**:");
      lines.push("");
      for (const cr of task.criteriaResults) {
        const crStatus = cr.passed ? "✓" : "✗";
        lines.push(`- ${crStatus} ${cr.criterionId}: ${cr.reason}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

// ============================================
// EXPORTS
// ============================================

// All exports are inline with function definitions
