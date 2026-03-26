/**
 * REPL Mode for Coder
 * Simple readline-based interactive mode (no TTY required)
 *
 * This is a fallback for environments where Ink/TUI isn't available
 * or when --repl flag is explicitly requested.
 */

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { homedir } from "os";
import { join } from "path";
import type { Message, ToolDefinition, PermissionMode, ClaudeModel } from "../../../../../schemas/index.js";
import type { HookManager } from "../../../../../ecosystem/hooks/index.js";
import type { SkillManager } from "../../../../../ecosystem/skills/index.js";
import type { SessionStore } from "../../../../../core/session-store.js";
import { agentLoop, formatCost, formatCostBrief } from "../../../../../core/agent-loop/index.js";
import { createStreamHighlighter } from "../../../../../core/stream-highlighter.js";
import { renderStatusLine, getContextWindow, type StatusLineOptions } from "../../shared/status-line.js";

// ============================================
// TYPES
// ============================================

export interface REPLOptions {
  apiKey: string;
  model: ClaudeModel;
  permissionMode: PermissionMode;
  maxTokens: number;
  systemPrompt: string;
  tools: ToolDefinition[];
  hookManager: HookManager;
  skillManager: SkillManager;
  sessionStore: SessionStore;
  sessionId: string;
  initialMessages: Message[];
  workingDirectory: string;
  /** Daemon session ID - if set, worker is running under daemon supervisor */
  daemonSessionId?: string;
  /** Daemon goal - the original goal for the daemon */
  daemonGoal?: string;
}

// ============================================
// REPL RUNNER
// ============================================

export async function runCoderREPL(options: REPLOptions): Promise<void> {
  const {
    apiKey,
    model,
    permissionMode,
    maxTokens,
    systemPrompt,
    tools,
    hookManager,
    sessionStore,
    sessionId,
    initialMessages,
    workingDirectory,
    daemonSessionId,
    daemonGoal,
  } = options;

  // Check if running under daemon supervisor
  const isDaemonWorker = !!(daemonSessionId && daemonGoal);
  if (isDaemonWorker) {
    console.log(`\x1b[90m[Daemon Worker] Session: ${daemonSessionId}\x1b[0m`);
  }

  const messages: Message[] = [...initialMessages];
  let totalCost = 0;
  let totalTokens = 0;

  const rl = readline.createInterface({ input, output });

  console.log(`\x1b[36mCoder REPL Mode\x1b[0m`);
  console.log(`\x1b[90mModel: ${model} | Permission: ${permissionMode}\x1b[0m`);
  console.log(`\x1b[90mSession: ${sessionId}\x1b[0m`);
  console.log(`\x1b[90mType your message, 'exit' to quit, '/help' for commands.\x1b[0m\n`);

  // REPL loop
  while (true) {
    // Show prompt
    const query = await rl.question(`\x1b[1m\x1b[32m>\x1b[0m `);

    // Handle exit
    if (query.toLowerCase() === "exit" || query.toLowerCase() === "quit") {
      console.log(`\x1b[90mGoodbye! Total cost: ${formatCost(totalCost)}\x1b[0m`);
      rl.close();
      break;
    }

    // Handle help
    if (query === "/help" || query === "?") {
      console.log(`
\x1b[36mCommands:\x1b[0m
  /help, ?        Show this help
  /status         Show session status
  /cost           Show usage/cost
  /clear          Clear screen
  /exit, exit     Exit REPL
`);
      continue;
    }

    // Handle status
    if (query === "/status") {
      const statusOptions: StatusLineOptions = {
        permissionMode,
        tokensUsed: totalTokens,
        maxTokens: getContextWindow(model),
        model,
        isLoading: false,
      };
      console.log(`\x1b[90m${renderStatusLine(statusOptions)}\x1b[0m`);
      console.log(`\x1b[90mSession: ${sessionId}\x1b[0m`);
      console.log(`\x1b[90mMessages: ${messages.length}\x1b[0m`);
      continue;
    }

    // Handle cost
    if (query === "/cost") {
      console.log(`\x1b[90mTotal cost: ${formatCost(totalCost)}\x1b[0m`);
      console.log(`\x1b[90mTotal tokens: ${totalTokens.toLocaleString()}\x1b[0m`);
      continue;
    }

    // Handle clear
    if (query === "/clear") {
      console.clear();
      continue;
    }

    // Skip empty queries
    if (!query.trim()) {
      continue;
    }

    // Add user message
    messages.push({
      role: "user",
      content: [{ type: "text", text: query }],
    });

    // Save user message
    await sessionStore.saveMessage(messages[messages.length - 1]!);

    // Show loading status
    const loadingStatus: StatusLineOptions = {
      permissionMode,
      tokensUsed: totalTokens,
      maxTokens: getContextWindow(model),
      model,
      isLoading: true,
    };
    console.log(`\x1b[90m${renderStatusLine(loadingStatus)}\x1b[0m\n`);

    // Create stream highlighter
    const highlighter = createStreamHighlighter();

    // Track labels
    let thinkingLabeled = false;
    let responseLabeled = false;

    try {
      const result = await agentLoop(messages, {
        apiKey,
        model,
        maxTokens,
        systemPrompt,
        tools,
        permissionMode,
        workingDirectory,
        hookManager,
        sessionId,
        // Enable long-running memory when running under daemon supervisor
        ...(isDaemonWorker && {
          longRunning: {
            enabled: true,
            sessionId: daemonSessionId,
            originalGoal: daemonGoal,
          },
          longRunningGoal: daemonGoal,
        }),
        onText: (text) => {
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
          if (!thinkingLabeled) {
            process.stdout.write(`\x1b[90m\x1b[3m[Thinking]\x1b[0m\n`);
            thinkingLabeled = true;
          }
          process.stdout.write(`\x1b[90m${thinking}\x1b[0m`);
        },
        onToolUse: (tu) => {
          const inputPreview = JSON.stringify(tu.input).slice(0, 100);
          console.log(`\x1b[33m▶ ${tu.name}\x1b[0m ${inputPreview}${inputPreview.length >= 100 ? "..." : ""}`);
        },
        onToolResult: (tr) => {
          const output = typeof tr.result.content === "string"
            ? tr.result.content.slice(0, 300)
            : JSON.stringify(tr.result.content).slice(0, 300);
          const isError = tr.result.is_error;
          const prefix = isError ? "\x1b[31m✗ Error:\x1b[0m" : "\x1b[32m✓ Result:\x1b[0m";
          console.log(`${prefix} ${output}${output.length >= 300 ? "..." : ""}`);
        },
        onMetrics: async (metrics) => {
          totalTokens = metrics.usage.input_tokens + metrics.usage.output_tokens;
          totalCost += metrics.costUSD;
          console.log(`\n\x1b[90m${formatCostBrief(metrics)}\x1b[0m`);
          await sessionStore.saveMetrics(metrics);
        },
      });

      // Flush remaining highlighted content
      const remaining = highlighter.flush();
      if (remaining) {
        process.stdout.write(remaining);
      }

      // Update messages with result
      messages.length = 0;
      messages.push(...result.messages);

      // Save assistant message
      const lastMessage = result.messages[result.messages.length - 1];
      if (lastMessage && lastMessage.role === "assistant") {
        await sessionStore.saveMessage(lastMessage);
      }

      // Show final status
      const finalStatus: StatusLineOptions = {
        permissionMode,
        tokensUsed: totalTokens,
        maxTokens: getContextWindow(model),
        model,
        isLoading: false,
      };
      console.log(`\n\x1b[90m${renderStatusLine(finalStatus)}\x1b[0m`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`\x1b[31mError: ${errorMessage}\x1b[0m`);
    }

    console.log(""); // Add newline after response
  }
}
