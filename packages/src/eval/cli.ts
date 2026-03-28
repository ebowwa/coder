/**
 * Eval CLI - Command-line interface for running evaluations
 *
 * Usage:
 *   coder --eval                    # List available suites
 *   coder --eval capability         # Run capability suite
 *   coder --eval regression         # Run regression suite
 *   coder --eval analyze            # Analyze real session data
 *   coder --eval analyze <session>  # Analyze specific session
 */

import { homedir } from "os";
import { join } from "path";
import { readdirSync, existsSync, readFileSync } from "fs";
import type { EvalSuite, EvalTask, EvalTrace, LoadedSession } from "./types.js";

// Import all suites
import {
  coreCodingCapabilitySuite,
  toolMasteryCapabilitySuite,
  errorResilienceCapabilitySuite,
  bashExecutionCapabilitySuite,
  fileWritingCapabilitySuite,
  codeReviewCapabilitySuite,
  multiStepWorkflowsCapabilitySuite,
} from "./suites/capability-suite.js";
import { coreFunctionalityRegressionSuite } from "./suites/regression-suite.js";

// Import all tasks
import * as tasks from "./tasks/index.js";

// ============================================
// SUITE REGISTRY
// ============================================

const SUITES: Record<string, EvalSuite> = {
  "capability-core": coreCodingCapabilitySuite,
  "capability-tools": toolMasteryCapabilitySuite,
  "capability-errors": errorResilienceCapabilitySuite,
  "capability-bash": bashExecutionCapabilitySuite,
  "capability-file-writing": fileWritingCapabilitySuite,
  "capability-code-review": codeReviewCapabilitySuite,
  "capability-workflows": multiStepWorkflowsCapabilitySuite,
  "regression-core": coreFunctionalityRegressionSuite,
};

// ============================================
// LIST COMMANDS
// ============================================

export function listSuites(): void {
  console.log("\n\x1b[36mAvailable Evaluation Suites\x1b[0m\n");

  for (const [key, suite] of Object.entries(SUITES)) {
    console.log(`  \x1b[33m${key}\x1b[0m - ${suite.name}`);
    console.log(`    ${suite.description}`);
    console.log(`    Tasks: ${suite.tasks.length} | Type: ${suite.type}`);
    console.log("");
  }

  console.log("\x1b[90mUsage: coder --eval <suite-name>\x1b[0m");
  console.log("\x1b[90m       coder --eval analyze [session-id]\x1b[0m\n");
}

export function listTasks(): void {
  console.log("\n\x1b[36mAvailable Evaluation Tasks\x1b[0m\n");

  const taskList = Object.values(tasks).filter((t): t is EvalTask =>
    typeof t === "object" && t !== null && "id" in t && "name" in t
  );

  // Group by category
  const byCategory: Record<string, EvalTask[]> = {};
  for (const task of taskList) {
    const cat = task.category || "other";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(task);
  }

  for (const [category, categoryTasks] of Object.entries(byCategory)) {
    console.log(`\n\x1b[33m${category.toUpperCase()}\x1b[0m`);
    for (const task of categoryTasks) {
      const difficulty = task.difficulty || "medium";
      const diffColor = difficulty === "easy" ? "\x1b[32m" :
                        difficulty === "hard" ? "\x1b[31m" : "\x1b[33m";
      console.log(`  ${task.id}`);
      console.log(`    ${task.name}`);
      console.log(`    Level: ${task.level} | Type: ${task.type} | Difficulty: ${diffColor}${difficulty}\x1b[0m`);
    }
  }
}

// ============================================
// SESSION ANALYSIS
// ============================================

function loadSession(sessionPath: string): LoadedSession | null {
  if (!existsSync(sessionPath)) return null;

  try {
    const content = readFileSync(sessionPath, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);

    const metadata: Record<string, unknown> = {};
    const messages: unknown[] = [];
    const tools: unknown[] = [];
    const metrics: unknown[] = [];

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);

        // First line is session metadata (has id, model, workingDirectory)
        if (entry.id && entry.model) {
          metadata.sessionId = entry.id;
          metadata.model = entry.model;
          metadata.workingDirectory = entry.workingDirectory;
          metadata.created = entry.created;
          metadata.updated = entry.updated;
          continue;
        }

        // Entry with type field
        if (entry.type === "message") {
          // Message data is in entry.data
          const msgData = entry.data || entry;
          messages.push(msgData);

          // Extract tool_use from message content (embedded in assistant messages)
          if (msgData && typeof msgData === "object" && "content" in msgData) {
            const content = (msgData as { content?: unknown }).content;
            if (Array.isArray(content)) {
              for (const block of content) {
                if (block && typeof block === "object" && "type" in block) {
                  if (block.type === "tool_use") {
                    tools.push(block);
                  } else if (block.type === "tool_result") {
                    tools.push({
                      ...block,
                      isResult: true,
                    });
                  }
                }
              }
            }
          }
        } else if (entry.type === "tool_use") {
          tools.push(entry.data || entry);
        } else if (entry.type === "tool_result") {
          tools.push({ ...(entry.data || entry), isResult: true });
        } else if (entry.type === "metrics") {
          const m = entry.data || entry;
          metrics.push(m);
          // Aggregate into metadata
          if (m.costUSD) {
            metadata.costUSD = ((metadata.costUSD as number) || 0) + m.costUSD;
          }
          if (m.durationMs) {
            metadata.durationMs = ((metadata.durationMs as number) || 0) + m.durationMs;
          }
          if (m.usage) {
            metadata.inputTokens = ((metadata.inputTokens as number) || 0) + (m.usage.input_tokens || 0);
            metadata.outputTokens = ((metadata.outputTokens as number) || 0) + (m.usage.output_tokens || 0);
            metadata.totalTokens = ((metadata.totalTokens as number) || 0) + (m.messageTokens || 0);
          }
          if (m.messageTokens) {
            metadata.totalTokens = ((metadata.totalTokens as number) || 0) + m.messageTokens;
          }
        }
      } catch {
        // Skip malformed lines
      }
    }

    return {
      metadata,
      messages: messages as LoadedSession["messages"],
      tools: tools as LoadedSession["tools"],
      metrics: metrics as LoadedSession["metrics"],
      context: {},
      checkpoints: [],
    };
  } catch (error) {
    console.error(`Error loading session: ${error}`);
    return null;
  }
}

function convertSessionToTrace(session: LoadedSession): EvalTrace {
  return {
    sessionId: session.metadata.sessionId as string || "unknown",
    timestamp: new Date(session.metadata.startTime as string || Date.now()),
    level: "thread",
    input: {
      level: "thread",
      prompt: (session.messages[0] as { content?: string })?.content || "",
    },
    output: {
      response: "",
      toolCalls: session.tools.map((t: { toolName?: string; input?: unknown; output?: unknown; isError?: boolean }) => ({
        name: t.toolName || "unknown",
        input: t.input || {},
        output: t.output || "",
        isError: t.isError || false,
      })),
    },
    toolCalls: session.tools.map((t: { toolName?: string; input?: unknown; output?: unknown; isError?: boolean }) => ({
      name: t.toolName || "unknown",
      input: t.input || {},
      output: t.output || "",
      isError: t.isError || false,
    })),
    metrics: {
      durationMs: (session.metadata.durationMs as number) || 0,
      tokenUsage: {
        input: (session.metadata.inputTokens as number) || 0,
        output: (session.metadata.outputTokens as number) || 0,
        total: (session.metadata.totalTokens as number) || 0,
      },
      costUSD: (session.metadata.costUSD as number) || 0,
    },
  };
}

export function analyzeSessions(sessionId?: string): void {
  const sessionsDir = join(homedir(), ".claude", "sessions");

  if (!existsSync(sessionsDir)) {
    console.log("\x1b[33mNo sessions directory found\x1b[0m");
    console.log(`\x1b[90mExpected: ${sessionsDir}\x1b[0m`);
    return;
  }

  if (sessionId) {
    // Analyze specific session
    const sessionPath = join(sessionsDir, `${sessionId}.jsonl`);
    const session = loadSession(sessionPath);

    if (!session) {
      console.log(`\x1b[31mSession not found: ${sessionId}\x1b[0m`);
      return;
    }

    console.log(`\n\x1b[36mSession Analysis: ${sessionId}\x1b[0m\n`);
    console.log(`  Model: ${session.metadata.model || "unknown"}`);
    console.log(`  Working Dir: ${session.metadata.workingDirectory || "unknown"}`);
    console.log(`  Messages: ${session.messages.length}`);
    console.log(`  Tool Calls: ${session.tools.length}`);
    console.log(`  Duration: ${session.metadata.durationMs || 0}ms`);
    console.log(`  Cost: $${((session.metadata.costUSD as number) || 0).toFixed(4)}`);
    console.log(`  Tokens: ${session.metadata.totalTokens || 0} (${session.metadata.inputTokens || 0} in / ${session.metadata.outputTokens || 0} out)`);

    // Tool usage breakdown
    const toolCounts: Record<string, number> = {};
    for (const tool of session.tools) {
      const name = (tool as { name?: string; toolName?: string }).name ||
                   (tool as { name?: string; toolName?: string }).toolName || "unknown";
      toolCounts[name] = (toolCounts[name] || 0) + 1;
    }

    if (Object.keys(toolCounts).length > 0) {
      console.log("\n\x1b[33mTool Usage:\x1b[0m");
      for (const [tool, count] of Object.entries(toolCounts).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${tool}: ${count}`);
      }
    }

    // Convert to eval trace
    const trace = convertSessionToTrace(session);
    console.log("\n\x1b[33mEval Trace (for training):\x1b[0m");
    console.log(JSON.stringify(trace, null, 2));

  } else {
    // List all sessions with summary
    const files = readdirSync(sessionsDir).filter(f => f.endsWith(".jsonl"));

    console.log(`\n\x1b[36mSession Analysis (${files.length} sessions)\x1b[0m\n`);

    // Aggregate statistics
    let totalMessages = 0;
    let totalTools = 0;
    let totalCost = 0;
    let totalTokens = 0;
    const toolCounts: Record<string, number> = {};
    const modelCounts: Record<string, number> = {};

    const recentSessions: Array<{
      id: string;
      messages: number;
      tools: number;
      cost: number;
      tokens: number;
      model: string;
    }> = [];

    for (const file of files.slice(-50)) { // Last 50 sessions
      const session = loadSession(join(sessionsDir, file));
      if (!session) continue;

      const msgCount = session.messages.length;
      const toolCount = session.tools.length;
      const cost = (session.metadata.costUSD as number) || 0;
      const tokens = (session.metadata.totalTokens as number) || 0;
      const model = (session.metadata.model as string) || "unknown";

      totalMessages += msgCount;
      totalTools += toolCount;
      totalCost += cost;
      totalTokens += tokens;

      modelCounts[model] = (modelCounts[model] || 0) + 1;

      for (const tool of session.tools) {
        const name = (tool as { name?: string; toolName?: string }).name ||
                     (tool as { name?: string; toolName?: string }).toolName || "unknown";
        toolCounts[name] = (toolCounts[name] || 0) + 1;
      }

      recentSessions.push({
        id: file.replace(".jsonl", ""),
        messages: msgCount,
        tools: toolCount,
        cost,
        tokens,
        model,
      });
    }

    console.log("\x1b[33mAggregate Statistics (last 50 sessions):\x1b[0m");
    console.log(`  Total Messages: ${totalMessages}`);
    console.log(`  Total Tool Calls: ${totalTools}`);
    console.log(`  Total Tokens: ${totalTokens.toLocaleString()}`);
    console.log(`  Total Cost: $${totalCost.toFixed(4)}`);

    console.log("\n\x1b[33mModels Used:\x1b[0m");
    for (const [model, count] of Object.entries(modelCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${model}: ${count}`);
    }

    if (Object.keys(toolCounts).length > 0) {
      console.log("\n\x1b[33mTool Usage (top 10):\x1b[0m");
      for (const [tool, count] of Object.entries(toolCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
        console.log(`  ${tool}: ${count}`);
      }
    }

    console.log("\n\x1b[33mRecent Sessions:\x1b[0m");
    for (const s of recentSessions.slice(-10).reverse()) {
      const tokensStr = s.tokens > 0 ? `${s.tokens.toLocaleString()} tok | ` : "";
      console.log(`  ${s.id.slice(0, 8)}... | ${s.messages} msgs | ${s.tools} tools | ${tokensStr}$${s.cost.toFixed(4)} | ${s.model}`);
    }

    console.log("\n\x1b[90mUsage: coder --eval analyze <session-id> for detailed analysis\x1b[0m");
  }
}

// ============================================
// RUN EVALUATION
// ============================================

export async function runEval(suiteName: string): Promise<void> {
  const suite = SUITES[suiteName];

  if (!suite) {
    console.log(`\x1b[31mSuite not found: ${suiteName}\x1b[0m`);
    listSuites();
    return;
  }

  console.log(`\n\x1b[36mRunning Suite: ${suite.name}\x1b[0m`);
  console.log(`\x1b[90m${suite.description}\x1b[0m\n`);

  // For now, just display the suite structure
  // Full execution would require agent spawning
  console.log(`\x1b[33mTasks (${suite.tasks.length}):\x1b[0m`);

  for (const task of suite.tasks) {
    console.log(`\n  \x1b[36m${task.id}\x1b[0m - ${task.name}`);
    console.log(`    Category: ${task.category} | Level: ${task.level} | Difficulty: ${task.difficulty}`);
    console.log(`    Prompt: ${task.input.prompt.slice(0, 80)}...`);

    if (task.successCriteria) {
      console.log(`    Success Criteria (${task.successCriteria.criteria.length}):`);
      for (const c of task.successCriteria.criteria) {
        console.log(`      - ${c.id}: ${c.condition.operator} ${JSON.stringify(c.expected).slice(0, 30)}`);
      }
    }
  }

  console.log(`\n\x1b[33mConfiguration:\x1b[0m`);
  console.log(`  Trials: ${suite.config.trialsPerTask}`);
  console.log(`  Parallel: ${suite.config.parallel}`);
  console.log(`  Timeout: ${suite.config.timeoutMs}ms`);
  console.log(`  Output: ${suite.config.outputDir}`);

  console.log(`\n\x1b[90mNote: Full eval execution requires API calls. This displays suite structure.\x1b[0m`);
  console.log(`\x1b[90mTo execute, use: coder --eval run ${suiteName} --execute\x1b[0m`);
}

// ============================================
// MAIN ENTRY POINT
// ============================================

export async function handleEvalCommand(args: string[]): Promise<void> {
  const subcommand = args[0];

  switch (subcommand) {
    case undefined:
    case "list":
    case "suites":
      listSuites();
      break;

    case "tasks":
      listTasks();
      break;

    case "analyze":
      analyzeSessions(args[1]);
      break;

    case "capability":
    case "capability-core":
    case "capability-tools":
    case "capability-errors":
    case "capability-bash":
    case "capability-file-writing":
    case "capability-code-review":
    case "capability-workflows":
    case "regression":
    case "regression-core":
      await runEval(subcommand);
      break;

    default:
      console.log(`\x1b[31mUnknown eval command: ${subcommand}\x1b[0m`);
      listSuites();
  }
}
