/**
 * Single Query Execution
 * Shared query runner for CLI -q mode
 */

import { homedir } from "os";
import { join } from "path";
import type { Message, ToolDefinition, ExtendedThinkingConfig, GitStatus } from "../../../../schemas/index.js";
import { agentLoop, formatCost, formatCostBrief, createResultConditionsConfig, type ResultConditionsConfig, RALPH_CONTINUATION_CONFIG } from "../../../../core/agent-loop.js";
import { HookManager } from "../../../../ecosystem/hooks/index.js";
import { SessionStore } from "../../../../core/session-store.js";
import { createStreamHighlighter } from "../../../../core/stream-highlighter.js";
import {
  renderStatusLine,
  getContextWindow,
  type StatusLineOptions,
} from "./status-line.js";
import type { CLIArgs } from "./args.js";

// ============================================
// TYPES
// ============================================

export interface QueryOptions {
  apiKey: string;
  args: CLIArgs;
  systemPrompt: string;
  tools: ToolDefinition[];
  query: string;
  sessionStore: SessionStore;
  sessionId: string;
  hookManager: HookManager;
  workingDirectory: string;
  gitStatus?: GitStatus | null;
  /** Daemon session ID - if set, worker is running under daemon supervisor */
  daemonSessionId?: string;
  /** Daemon goal - the original goal for the daemon */
  daemonGoal?: string;
}

// ============================================
// SINGLE QUERY RUNNER
// ============================================

export async function runSingleQuery(options: QueryOptions): Promise<void> {
  const {
    apiKey,
    args,
    systemPrompt,
    tools,
    query,
    sessionStore,
    sessionId,
    hookManager,
    workingDirectory,
    gitStatus,
    daemonSessionId,
    daemonGoal,
  } = options;

  // Check if running under daemon supervisor
  const isDaemonWorker = !!(daemonSessionId && daemonGoal);
  if (isDaemonWorker) {
    console.log(`\x1b[90m[Daemon Worker] Session: ${daemonSessionId}\x1b[0m`);
  }

  // Show initial status line
  const initialStatusOptions: StatusLineOptions = {
    permissionMode: args.permissionMode,
    tokensUsed: 0,
    maxTokens: getContextWindow(args.model),
    model: args.model,
    isLoading: true,
  };
  console.log(`\x1b[90m${renderStatusLine(initialStatusOptions)}\x1b[0m\n`);

  // Track tokens for final status
  let totalTokens = 0;

  const messages: Message[] = [
    {
      role: "user",
      content: [{ type: "text", text: query }],
    },
  ];

  // Save user message to session
  await sessionStore.saveMessage(messages[0]!);

  // Create stream highlighter for code blocks
  const highlighter = createStreamHighlighter();

  // Track if we've printed labels for thinking/response
  let thinkingLabeled = false;
  let responseLabeled = false;

  // Build extended thinking config
  const extendedThinkingConfig: ExtendedThinkingConfig | undefined = args.extendedThinking
    ? {
        enabled: true,
        effort: args.effort ?? "medium",
        interleaved: args.interleaved ?? true,
      }
    : undefined;

  try {
    const result = await agentLoop(messages, {
      apiKey,
      model: args.model,
      maxTokens: args.maxTokens,
      systemPrompt,
      tools,
      permissionMode: args.permissionMode,
      workingDirectory,
      gitStatus: gitStatus ?? undefined,
      extendedThinking: extendedThinkingConfig,
      hookManager,
      sessionId,
      stopSequences: args.stopSequences,
      resultConditions: args.resultConditions
        ? createResultConditionsConfig(args.resultConditions, {
            stopOnUnhandledError: args.stopOnUnhandledError,
          })
        : undefined,
      continuation: args.continuation ? RALPH_CONTINUATION_CONFIG : undefined,
      // Enable long-running memory when running under daemon supervisor
      longRunning: isDaemonWorker
        ? {
            sessionId: daemonSessionId,
            storageDir: join(homedir(), ".claude", "daemon", "memory"),
          }
        : args.longRunning
          ? {
              enabled: true,
              enableWebSocket: args.enableWebSocket ?? false,
              websocketPort: args.websocketPort,
              enableSSE: args.enableSSE ?? false,
              ssePort: args.ssePort,
            }
          : false,
      longRunningGoal: isDaemonWorker ? daemonGoal : args.longRunningGoal,
      onText: (text) => {
        // Label response on first text chunk
        if (!responseLabeled) {
          process.stdout.write(`\x1b[1m\x1b[36m[Response]\x1b[0m\n`);
          responseLabeled = true;
        }
        const highlighted = highlighter.process(text);
        if (highlighted) {
          process.stdout.write(highlighted);
        }
      },
      onThinking: (thinking) => {
        // Label thinking on first thinking chunk
        if (!thinkingLabeled) {
          process.stdout.write(`\x1b[90m\x1b[3m[Thinking]\x1b[0m\n`);
          thinkingLabeled = true;
        }
        process.stdout.write(`\x1b[90m${thinking}\x1b[0m`);
      },
      onToolUse: (tu) => {
        // Show tool use
        const inputPreview = JSON.stringify(tu.input).slice(0, 100);
        console.log(`\x1b[33m▶ ${tu.name}\x1b[0m ${inputPreview}${inputPreview.length >= 100 ? "..." : ""}`);
      },
      onToolResult: (tr) => {
        // Show tool result
        const output = typeof tr.result.content === "string"
          ? tr.result.content.slice(0, 300)
          : JSON.stringify(tr.result.content).slice(0, 300);
        const isError = tr.result.is_error;
        const prefix = isError ? "\x1b[31m✗ Error:\x1b[0m" : "\x1b[32m✓ Result:\x1b[0m";
        console.log(`${prefix} ${output}${output.length >= 300 ? "..." : ""}`);
      },
      onMetrics: async (metrics) => {
        // Track tokens for final status
        totalTokens = metrics.usage.input_tokens + metrics.usage.output_tokens;
        console.log(`\n\x1b[90m${formatCostBrief(metrics)}\x1b[0m`);
        await sessionStore.saveMetrics(metrics);
      },
    });

    // Flush any remaining highlighted content
    const remaining = highlighter.flush();
    if (remaining) {
      process.stdout.write(remaining);
    }

    // Save assistant message to session
    const lastMessage = result.messages[result.messages.length - 1];
    if (lastMessage && lastMessage.role === "assistant") {
      await sessionStore.saveMessage(lastMessage);
    }

    // Show final status line
    const finalStatusOptions: StatusLineOptions = {
      permissionMode: args.permissionMode,
      tokensUsed: totalTokens,
      maxTokens: getContextWindow(args.model),
      model: args.model,
      isLoading: false,
    };
    console.log(`\n\x1b[90m${renderStatusLine(finalStatusOptions)}\x1b[0m`);
    console.log(`\x1b[90mSession: ${sessionId}\x1b[0m`);
    console.log(`\x1b[90mTotal cost: ${formatCost(result.totalCost)}\x1b[0m`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${errorMessage}`);
    process.exit(1);
  }
}
