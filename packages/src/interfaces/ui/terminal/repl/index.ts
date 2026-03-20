/**
 * Coder REPL - AI Assistant in Readline Interface
 *
 * Provides a readline-based interface for Coder using the BaseREPL pattern
 * from @ebowwa/sandbox but with AI execution via agentLoop instead of
 * code execution via kernel.
 *
 * Usage:
 *   coder --repl
 *   doppler run -- coder --repl -m glm-5
 */

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { Message } from "../../../../schemas/index.js";
import type { ToolDefinition, PermissionMode } from "../../../../schemas/index.js";
import type { HookManager } from "../../../../ecosystem/hooks/index.js";
import type { SessionStore } from "../../../../core/session-store.js";
import { agentLoop, type AgentLoopOptions } from "../../../../core/agent-loop/index.js";
import { formatCost, formatMetrics } from "../../../../core/agent-loop/formatters.js";
import { renderCompactStatusLine, getContextWindow } from "../shared/status-line.js";

// ============================================
// TYPES
// ============================================

/**
 * Coder REPL history entry
 */
export interface CoderREPLHistoryEntry {
  /** User input */
  input: string;
  /** AI response (truncated for display) */
  response?: string;
  /** Token usage */
  tokens?: { input: number; output: number };
  /** Cost in USD */
  cost?: number;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Coder REPL state
 */
export interface CoderREPLState {
  /** Conversation messages */
  messages: Message[];
  /** Input history */
  history: CoderREPLHistoryEntry[];
  /** Current model */
  model: string;
  /** Total session cost */
  totalCost: number;
  /** Total tokens used */
  totalTokens: { input: number; output: number };
  /** Session ID */
  sessionId: string;
  /** Working directory */
  workingDirectory: string;
}

/**
 * Coder REPL options
 */
export interface CoderREPLOptions {
  /** API key */
  apiKey: string;
  /** Model to use */
  model: string;
  /** Permission mode */
  permissionMode: PermissionMode;
  /** Max output tokens */
  maxTokens?: number;
  /** System prompt */
  systemPrompt: string;
  /** Available tools */
  tools: ToolDefinition[];
  /** Hook manager */
  hookManager?: HookManager;
  /** Session store */
  sessionStore?: SessionStore;
  /** Session ID */
  sessionId: string;
  /** Initial messages (for resume) */
  initialMessages?: Message[];
  /** Working directory */
  workingDirectory: string;
  /** Prompt string */
  prompt?: string;
  /** Welcome message */
  welcomeMessage?: string;
  /** Output stream */
  output?: NodeJS.WritableStream;
  /** Input stream */
  input?: NodeJS.ReadableStream;
}

// ============================================
// CODER REPL IMPLEMENTATION
// ============================================

/**
 * CoderREPL - Interactive AI assistant via readline
 *
 * Features:
 * - Line-by-line prompts with streaming responses
 * - Session persistence (save/load)
 * - History navigation
 * - Cost/tracking commands
 * - Checkpoint management
 */
export class CoderREPL {
  private apiKey: string;
  private model: string;
  private permissionMode: PermissionMode;
  private maxTokens: number;
  private systemPrompt: string;
  private tools: ToolDefinition[];
  private hookManager?: HookManager;
  private sessionStore?: SessionStore;
  private prompt: string;
  private welcomeMessage: string;
  private output: NodeJS.WritableStream;
  private input: NodeJS.ReadableStream;
  private rl?: readline.Interface;
  private isExecuting = false;

  state: CoderREPLState;

  constructor(options: CoderREPLOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.permissionMode = options.permissionMode;
    this.maxTokens = options.maxTokens ?? 4096;
    this.systemPrompt = options.systemPrompt;
    this.tools = options.tools;
    this.hookManager = options.hookManager;
    this.sessionStore = options.sessionStore;
    this.prompt = options.prompt ?? ">>> ";
    this.welcomeMessage = options.welcomeMessage ?? this.getDefaultWelcome();
    this.output = options.output ?? output;
    this.input = options.input ?? input;

    this.state = {
      messages: options.initialMessages ?? [],
      history: [],
      model: options.model,
      totalCost: 0,
      totalTokens: { input: 0, output: 0 },
      sessionId: options.sessionId,
      workingDirectory: options.workingDirectory,
    };
  }

  // ============================================
  // MAIN LOOP
  // ============================================

  /**
   * Start REPL
   */
  async start(): Promise<void> {
    this.print(this.welcomeMessage);
    this.print("");
    this.print(`\x1b[90mSession: ${this.state.sessionId}\x1b[0m`);
    this.print(`\x1b[90mModel: ${this.model} | Tokens: 0/${getContextWindow(this.model)}\x1b[0m`);
    this.print("\x1b[90mType your message, %help for commands.\x1b[0m\n");

    this.rl = readline.createInterface({
      input: this.input,
      output: this.output,
      prompt: this.getPrompt(),
      history: this.getHistoryStrings(),
    });

    this.rl.prompt();

    for await (const line of this.rl) {
      if (!this.isExecuting) {
        await this.handleLine(line);
      }
      this.rl?.setPrompt(this.getPrompt());
      this.rl?.prompt();
    }
  }

  /**
   * Handle a line of input
   */
  private async handleLine(line: string): Promise<void> {
    // Check for commands
    if (line.startsWith("%") || line.startsWith("/")) {
      await this.handleCommand(line);
      return;
    }

    // Check for empty line
    if (line.trim() === "") {
      return;
    }

    // Execute as AI prompt
    await this.execute(line);
  }

  // ============================================
  // EXECUTION
  // ============================================

  /**
   * Execute a prompt via agentLoop
   */
  private async execute(userInput: string): Promise<void> {
    this.isExecuting = true;
    const startTime = Date.now();

    try {
      // Add user message
      this.state.messages.push({
        role: "user",
        content: userInput,
      });

      // Track response for history
      let responseText = "";
      // Use wrapper object for proper closure type tracking
      const metricsHolder: { value: import("../../../../schemas/index.js").QueryMetrics | null } = { value: null };

      // Run agent loop with streaming callbacks
      const result = await agentLoop(this.state.messages, {
        apiKey: this.apiKey,
        model: this.model,
        maxTokens: this.maxTokens,
        systemPrompt: this.systemPrompt,
        tools: this.tools,
        permissionMode: this.permissionMode,
        workingDirectory: this.state.workingDirectory,
        sessionId: this.state.sessionId,
        hookManager: this.hookManager,

        // Streaming callbacks
        onText: (text) => {
          responseText += text;
          this.output.write(text);
        },

        onToolUse: (toolUse: { id: string; name: string; input: unknown }) => {
          // Show tool name and key arguments
          let args = "";
          if (toolUse.input) {
            // Extract key fields for display
            const input = toolUse.input as Record<string, unknown>;
            if (input.file_path) args = String(input.file_path).slice(0, 50);
            else if (input.command) args = String(input.command).slice(0, 50);
            else if (input.pattern) args = String(input.pattern).slice(0, 50);
            else if (input.path) args = String(input.path).slice(0, 50);
            else if (input.url) args = String(input.url).slice(0, 50);
          }
          this.print(`\n\x1b[90m[${toolUse.name}${args ? `: ${args}` : ""}]\x1b[0m`);
        },

        onToolResult: (result: { id: string; result: { isError?: boolean; content: string | unknown[] } }) => {
          // Show result summary
          const isError = result.result.isError;
          const status = isError ? "\x1b[31m✗\x1b[0m" : "\x1b[32m✓\x1b[0m";
          const content = result.result.content;
          const contentStr = Array.isArray(content)
            ? content.map((c) => (typeof c === "string" ? c : JSON.stringify(c))).join("")
            : String(content ?? "");
          const lines = contentStr.split("\n").length;
          const chars = contentStr.length;
          this.print(`\x1b[90m → ${status} ${lines} lines, ${chars} chars\x1b[0m`);
        },

        onMetrics: (metrics: import("../../../../schemas/index.js").QueryMetrics) => {
          metricsHolder.value = metrics;
          this.state.totalTokens.input += metrics.usage.input_tokens;
          this.state.totalTokens.output += metrics.usage.output_tokens;
          this.state.totalCost += metrics.costUSD;
        },
      });

      // Update messages from result
      this.state.messages = result.messages;

      // Add newline after response
      this.print("");

      // Show metrics
      const lastMetrics = metricsHolder.value;
      if (lastMetrics) {
        const duration = Date.now() - startTime;
        this.print(
          `\x1b[90m[${duration}ms | ${lastMetrics.usage.input_tokens}→${lastMetrics.usage.output_tokens} tokens | $${lastMetrics.costUSD.toFixed(4)}]\x1b[0m`
        );
      }

      // Add to history
      this.state.history.push({
        input: userInput,
        response: responseText.slice(0, 200) + (responseText.length > 200 ? "..." : ""),
        tokens: lastMetrics
          ? { input: lastMetrics.usage.input_tokens, output: lastMetrics.usage.output_tokens }
          : undefined,
        cost: lastMetrics?.costUSD,
        timestamp: new Date(),
      });

      // Save session if store available
      if (this.sessionStore) {
        // Save the assistant's response
        const lastMessage = this.state.messages[this.state.messages.length - 1];
        if (lastMessage?.role === "assistant") {
          await this.sessionStore.saveMessage(lastMessage);
        }
        if (lastMetrics) {
          await this.sessionStore.saveMetrics({
            model: this.model,
            messageCount: this.state.messages.length,
            messageTokens: this.state.totalTokens.input,
            usage: lastMetrics.usage,
            costUSD: lastMetrics.costUSD,
            durationMs: Date.now() - startTime,
            ttftMs: lastMetrics.ttftMs,
            stopReason: lastMetrics.stopReason,
            requestId: this.state.sessionId,
          });
        }
      }
    } catch (error) {
      const err = error as Error;
      this.print(`\n\x1b[31mError: ${err.message}\x1b[0m`);

      // Remove the failed user message
      this.state.messages.pop();
    } finally {
      this.isExecuting = false;
    }
  }

  // ============================================
  // COMMANDS
  // ============================================

  /**
   * Handle REPL command
   */
  private async handleCommand(command: string): Promise<void> {
    const parts = command.slice(1).split(/\s+/);
    const cmd = parts[0] ?? "";
    const args = parts.slice(1);
    const cmdLower = cmd.toLowerCase();

    switch (cmdLower) {
      // Help
      case "help":
      case "h":
      case "?":
        this.showHelp();
        break;

      // Exit
      case "exit":
      case "quit":
      case "q":
        this.print("\x1b[90mGoodbye!\x1b[0m");
        process.exit(0);

      // Clear screen
      case "clear":
      case "cls":
        console.clear();
        break;

      // Reset session
      case "reset":
        await this.reset();
        this.print("\x1b[90mSession reset\x1b[0m");
        break;

      // History
      case "history":
      case "hist":
        this.showHistory();
        break;

      // Cost/usage
      case "cost":
      case "usage":
      case "tokens":
        this.showCost();
        break;

      // Status
      case "status":
      case "info":
        this.showStatus();
        break;

      // Save session
      case "save":
        await this.save(args[0]);
        break;

      // Load session
      case "load":
        await this.load(args[0]);
        break;

      // Model switch
      case "model":
      case "m":
        if (args[0]) {
          this.model = args[0];
          this.state.model = args[0];
          this.print(`\x1b[90mSwitched to ${args[0]}\x1b[0m`);
        } else {
          this.print(`\x1b[90mCurrent model: ${this.model}\x1b[0m`);
        }
        break;

      // Undo last turn
      case "undo":
        this.undo();
        break;

      // Messages
      case "messages":
      case "msgs":
        this.showMessages();
        break;

      // Export
      case "export":
        await this.export(args[0]);
        break;

      // Sessions management
      case "sessions":
      case "sess":
        await this.listSessions();
        break;

      // Resume session
      case "resume":
        await this.resumeSession(args[0]);
        break;

      default:
        this.print(`\x1b[31mUnknown command: ${cmd}\x1b[0m");
        this.print("\x1b[90mType %help for available commands\x1b[0m");
    }
  }

  // ============================================
  // COMMAND IMPLEMENTATIONS
  // ============================================

  /**
   * Show help
   */
  private showHelp(): void {
    const lines = [
      "",
      "\x1b[1mCoder REPL Commands\x1b[0m",
      "",
      "\x1b[36mSession:\x1b[0m",
      "  %help, %h, %?        Show this help",
      "  %exit, %quit, %q     Exit REPL",
      "  %clear, %cls         Clear screen",
      "  %reset               Reset conversation (clear messages)",
      "  %status, %info       Show session status",
      "",
      "\x1b[36mConversation:\x1b[0m",
      "  %history, %hist      Show input history",
      "  %messages, %msgs     Show message count",
      "  %undo                Undo last turn (remove last exchange)",
      "  %model [name]        Switch or show model",
      "",
      "\x1b[36mPersistence:\x1b[0m",
      "  %save [file]         Save session to file (default: coder-session.json)",
      "  %load [file]         Load session from file",
      "  %export [file]       Export as markdown (default: coder-session.md)",
      "  %sessions            List recent sessions",
      "  %resume <id>         Resume a previous session",
      "",
      "\x1b[36mUsage:\x1b[0m",
      "  %cost, %usage        Show token usage and cost",
      "  %tokens              Alias for %cost",
      "",
      "\x1b[90mTips:\x1b[0m",
      "  - Just type your message and press Enter to chat",
      "  - Use Up/Down arrows to navigate history",
      "  - Press Ctrl+C twice to exit",
      "",
    ];
    this.print(lines.join("\n"));
  }

  /**
   * Show history
   */
  private showHistory(): void {
    if (this.state.history.length === 0) {
      this.print("\x1b[90mNo history yet\x1b[0m");
      return;
    }

    this.print("\n\x1b[1mHistory:\x1b[0m\n");
    for (let i = 0; i < this.state.history.length; i++) {
      const entry = this.state.history[i];
      if (!entry) continue;
      const preview = entry.input.length > 60 ? entry.input.slice(0, 60) + "..." : entry.input;
      const cost = entry.cost ? ` $${entry.cost.toFixed(4)}` : "";
      this.print(`  \x1b[90m${i + 1}.\x1b[0m ${preview}${cost}`);
    }
    this.print("");
  }

  /**
   * Show cost/usage
   */
  private showCost(): void {
    this.print(`
\x1b[1mSession Usage:\x1b[0m
  Input tokens:  ${this.state.totalTokens.input.toLocaleString()}
  Output tokens: ${this.state.totalTokens.output.toLocaleString()}
  Total tokens:  ${(this.state.totalTokens.input + this.state.totalTokens.output).toLocaleString()}
  Total cost:    $${this.state.totalCost.toFixed(4)}
  Messages:      ${this.state.messages.length}
  Turns:         ${this.state.history.length}
`);
  }

  /**
   * Show status
   */
  private showStatus(): void {
    const contextWindow = getContextWindow(this.model);
    const usedTokens = this.state.totalTokens.input + this.state.totalTokens.output;
    const percent = ((usedTokens / contextWindow) * 100).toFixed(1);

    this.print(`
\x1b[1mSession Status:\x1b[0m
  Session ID:    ${this.state.sessionId}
  Model:         ${this.model}
  Working dir:   ${this.state.workingDirectory}
  Context:       ${usedTokens.toLocaleString()} / ${contextWindow.toLocaleString()} (${percent}%)
  Cost:          $${this.state.totalCost.toFixed(4)}
  Permission:    ${this.permissionMode}
`);
  }

  /**
   * Show messages count
   */
  private showMessages(): void {
    this.print(
      `\x1b[90m${this.state.messages.length} messages in conversation\x1b[0m`
    );
    for (let i = 0; i < Math.min(this.state.messages.length, 10); i++) {
      const msg = this.state.messages[i];
      if (!msg) continue;
      const role = msg.role === "user" ? "\x1b[33muser\x1b[0m" : "\x1b[36massistant\x1b[0m";
      const preview =
        typeof msg.content === "string"
          ? msg.content.slice(0, 50) + (msg.content.length > 50 ? "..." : "")
          : `[${(msg.content as { type: string }[]).length} blocks]`;
      this.print(`  ${i + 1}. ${role}: ${preview}`);
    }
    if (this.state.messages.length > 10) {
      this.print(`  ... and ${this.state.messages.length - 10} more`);
    }
  }

  /**
   * Undo last turn
   */
  private undo(): void {
    if (this.state.history.length === 0) {
      this.print("\x1b[90mNothing to undo\x1b[0m");
      return;
    }

    // Remove last history entry
    const lastEntry = this.state.history.pop();
    if (!lastEntry) return;

    // Remove last user message and assistant response
    // Messages are in pairs: user, assistant
    const removedAssistant = this.state.messages.pop(); // assistant
    const removedUser = this.state.messages.pop(); // user

    // Adjust totals
    if (lastEntry.tokens) {
      this.state.totalTokens.input -= lastEntry.tokens.input;
      this.state.totalTokens.output -= lastEntry.tokens.output;
    }
    if (lastEntry.cost) {
      this.state.totalCost -= lastEntry.cost;
    }

    this.print(
      `\x1b[90mUndone: "${lastEntry.input.slice(0, 50)}..."\x1b[0m`
    );
  }

  /**
   * Reset session
   */
  private async reset(): Promise<void> {
    this.state.messages = [];
    this.state.history = [];
    this.state.totalCost = 0;
    this.state.totalTokens = { input: 0, output: 0 };
  }

  /**
   * Save session to file
   */
  private async save(filename?: string): Promise<void> {
    const fs = await import("node:fs/promises");
    const file = filename ?? "coder-session.json";

    const data = {
      version: 1,
      sessionId: this.state.sessionId,
      model: this.model,
      messages: this.state.messages,
      history: this.state.history,
      totalCost: this.state.totalCost,
      totalTokens: this.state.totalTokens,
      savedAt: new Date().toISOString(),
    };

    await fs.writeFile(file, JSON.stringify(data, null, 2));
    this.print(`\x1b[90mSession saved to ${file}\x1b[0m`);
  }

  /**
   * Load session from file
   */
  private async load(filename?: string): Promise<void> {
    const fs = await import("node:fs/promises");
    const file = filename ?? "coder-session.json";

    try {
      const content = await fs.readFile(file, "utf-8");
      const data = JSON.parse(content);

      this.state.sessionId = data.sessionId ?? this.state.sessionId;
      this.model = data.model ?? this.model;
      this.state.messages = data.messages ?? [];
      this.state.history = data.history ?? [];
      this.state.totalCost = data.totalCost ?? 0;
      this.state.totalTokens = data.totalTokens ?? { input: 0, output: 0 };

      this.print(`\x1b[90mSession loaded from ${file}\x1b[0m`);
      this.print(
        `\x1b[90m${this.state.messages.length} messages | $${this.state.totalCost.toFixed(4)} total cost\x1b[0m`
      );
    } catch (error) {
      this.print(`\x1b[31mFailed to load: ${(error as Error).message}\x1b[0m`);
    }
  }

  /**
   * Export as markdown
   */
  private async export(filename?: string): Promise<void> {
    const fs = await import("node:fs/promises");
    const file = filename ?? "coder-session.md";

    let md = `# Coder Session Export\n\n`;
    md += `**Session:** ${this.state.sessionId}\n`;
    md += `**Model:** ${this.model}\n`;
    md += `**Date:** ${new Date().toISOString()}\n`;
    md += `**Cost:** $${this.state.totalCost.toFixed(4)}\n\n`;
    md += `---\n\n`;

    for (const msg of this.state.messages) {
      const role = msg.role === "user" ? "## User" : "## Assistant";
      const content =
        typeof msg.content === "string"
          ? msg.content
          : JSON.stringify(msg.content, null, 2);
      md += `${role}\n\n${content}\n\n---\n\n`;
    }

    await fs.writeFile(file, md);
    this.print(`\x1b[90mExported to ${file}\x1b[0m`);
  }

  /**
   * List recent sessions
   */
  private async listSessions(): Promise<void> {
    if (!this.sessionStore) {
      this.print("\x1b[31mSession store not available\x1b[0m");
      return;
    }

    try {
      const sessions = await this.sessionStore.listSessions(10);

      if (sessions.length === 0) {
        this.print("\x1b[90mNo sessions found\x1b[0m");
        return;
      }

      this.print("\n\x1b[1mRecent Sessions:\x1b[0m\n");
      for (const session of sessions) {
        const current = session.id === this.state.sessionId ? " \x1b[32m(current)\x1b[0m" : "";
        const date = new Date(session.updatedAt).toLocaleString();
        this.print(
          `  \x1b[90m${session.id.slice(0, 12)}\x1b[0m ${date} | ${session.messageCount} msgs | $${(session.totalCost ?? 0).toFixed(4)}${current}`
        );
      }
      this.print("\n\x1b[90mUse %resume <id> to resume a session\x1b[0m\n");
    } catch (error) {
      this.print(`\x1b[31mError listing sessions: ${(error as Error).message}\x1b[0m`);
    }
  }

  /**
   * Resume a previous session
   */
  private async resumeSession(sessionId?: string): Promise<void> {
    if (!this.sessionStore) {
      this.print("\x1b[31mSession store not available\x1b[0m");
      return;
    }

    if (!sessionId) {
      this.print("\x1b[31mUsage: %resume <session-id>\x1b[0m");
      this.print("\x1b[90mUse %sessions to list available sessions\x1b[0m");
      return;
    }

    try {
      const loaded = await this.sessionStore.resumeSession(sessionId);

      if (!loaded) {
        this.print(`\x1b[31mSession not found: ${sessionId}\x1b[0m`);
        return;
      }

      // Update state with loaded session
      this.state.messages = loaded.messages;
      this.state.sessionId = sessionId;

      // Try to restore metadata
      if (loaded.metadata.model) {
        this.model = loaded.metadata.model as string;
        this.state.model = this.model;
      }

      this.print(`\x1b[90mResumed session: ${sessionId}\x1b[0m`);
      this.print(`\x1b[90mMessages: ${loaded.messages.length} | Model: ${this.model}\x1b[0m`);
    } catch (error) {
      this.print(`\x1b[31mError resuming session: ${(error as Error).message}\x1b[0m`);
    }
  }

  // ============================================
  // UTILITIES
  // ============================================

  /**
   * Get prompt string
   */
  private getPrompt(): string {
    const modelShort = this.model.replace(/^claude-/, "").slice(0, 10);
    return `\x1b[90m[${modelShort}]\x1b[0m ${this.prompt}`;
  }

  /**
   * Get history as strings for readline
   */
  private getHistoryStrings(): string[] {
    return this.state.history.map((h) => h.input);
  }

  /**
   * Print to output
   */
  private print(message: string): void {
    this.output.write(message + "\n");
  }

  /**
   * Get default welcome message
   */
  private getDefaultWelcome(): string {
    const bold = "\x1b[1m";
    const reset = "\x1b[0m";

    return `
${bold}Coder REPL${reset}

  AI-powered coding assistant in interactive readline mode
  Type %help for commands, or just start chatting
    `.trim();
  }
}

// ============================================
// FACTORY
// ============================================

/**
 * Create a Coder REPL
 */
export function createCoderREPL(options: CoderREPLOptions): CoderREPL {
  return new CoderREPL(options);
}

/**
 * Run Coder REPL (convenience function)
 */
export async function runCoderREPL(options: CoderREPLOptions): Promise<void> {
  const repl = createCoderREPL(options);
  await repl.start();
}
