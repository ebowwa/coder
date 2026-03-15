/**
 * Native TUI Runner (Simplified)
 *
 * Full native Rust TUI rendering without Ink.
 */

import type { InteractiveTUIProps } from "./InteractiveTUI.js";
import type { SuppressOptions } from "./console.js";
import type { Message as ApiMessage, ToolDefinition, PermissionMode } from "../../../../schemas/index.js";
import type { HookManager } from "../../../../ecosystem/hooks/index.js";

import {
  Terminal,
  Styles,
  Render,
  Draw,
  renderMessage,
  renderStatusBar,
  renderSeparator,
  type TuiStyle,
} from "./tui-renderer.js";

import { calculateContextInfo, VERSION, getModelDisplayName, formatTokenCount } from "../shared/status-line.js";
import { formatCost } from "../../../../core/agent-loop/formatters.js";
import { spinnerFrames } from "./spinner.js";
import { agentLoop, createResultConditionsConfig, type ResultConditionsConfig } from "../../../../core/agent-loop.js";
import { getGitStatus } from "../../../../core/git-status.js";

// ============================================
// TYPES
// ============================================

interface DisplayMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolName?: string;
  type?: "tool_call" | "tool_result" | "text";
  isError?: boolean;
  timestamp: number;
}

// ============================================
// CONSTANTS
// ============================================

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

const HELP_TEXT = `
Commands:
  /help              Show help
  /clear             Clear messages
  /model [name]      Switch model
  /status            Session info
  /exit              Exit

Navigation:
  ↑/↓                Scroll one line
  PgUp/PgDn          Scroll one page (coming soon)
  Ctrl+↑/↓           History nav
`;

let msgId = 0;
const genId = () => `msg-${++msgId}-${Date.now()}`;

// ============================================
// HELPERS
// ============================================

function estimateTokens(text: string): number {
  return Math.ceil((text?.length || 1) / 4);
}

function estimateMessagesTokens(messages: ApiMessage[]): number {
  let total = 0;
  for (const msg of messages) {
    if (typeof msg.content === "string") {
      total += estimateTokens(msg.content);
    } else if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === "text") total += estimateTokens(block.text);
      }
    }
  }
  return total;
}

function truncateContent(content: string, maxLength: number): string {
  // For TUI, we want wrapping not truncation
  // Return content as-is and let the native renderer handle wrapping
  return content;
}

// ============================================
// STATE INTERFACE
// ============================================

interface TUIState {
  inputValue: string;
  cursorPos: number;
  isLoading: boolean;
  spinnerFrame: number;
  tokenCount: number;
  scrollOffset: number;
  model: string;
  history: string[];
  historyIndex: number;
  savedInput: string;
}

// ============================================
// NATIVE TUI CLASS
// ============================================

export class NativeTUI {
  private messages: DisplayMessage[] = [];
  private props: InteractiveTUIProps;
  private terminalWidth: number;
  private terminalHeight: number;
  private spinnerInterval: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private state: TUIState;
  private streamingMessageId: string | null = null;

  constructor(props: InteractiveTUIProps) {
    this.props = props;
    this.terminalWidth = process.stdout.columns ?? 80;
    this.terminalHeight = process.stdout.rows ?? 24;
    this.state = {
      inputValue: "",
      cursorPos: 0,
      isLoading: false,
      spinnerFrame: 0,
      tokenCount: estimateMessagesTokens(props.initialMessages ?? []),
      scrollOffset: 0,
      model: props.model,
      history: [],
      historyIndex: -1,
      savedInput: "",
    };
  }

  // ============================================
  // LIFECYCLE
  // ============================================

  async start(): Promise<void> {
    // Enter alternate screen and setup terminal
    process.stdout.write(Terminal.enterAltScreen());
    process.stdout.write(Terminal.hideCursor());
    process.stdout.write(Terminal.clearScreen());

    // Setup raw input mode
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    // Handle resize
    process.stdout.on("resize", () => this.handleResize());

    // Handle input
    process.stdin.on("data", (data: string) => this.handleInput(data));

    this.isRunning = true;
    this.render();
  }

  stop(): void {
    this.isRunning = false;

    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
      this.spinnerInterval = null;
    }

    process.stdout.write(Terminal.showCursor());
    process.stdout.write(Terminal.exitAltScreen());

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
  }

  private handleResize(): void {
    this.terminalWidth = process.stdout.columns ?? 80;
    this.terminalHeight = process.stdout.rows ?? 24;
    this.render();
  }

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  private addMessage(msg: Omit<DisplayMessage, "id" | "timestamp">): void {
    this.messages.push({
      ...msg,
      id: genId(),
      timestamp: Date.now(),
    });

    // Auto-scroll to bottom
    const viewportHeight = this.terminalHeight - 4;
    const maxOffset = Math.max(0, this.messages.length - viewportHeight);
    this.state.scrollOffset = maxOffset;

    this.render();
  }

  private setLoading(loading: boolean): void {
    this.state.isLoading = loading;

    if (loading) {
      this.spinnerInterval = setInterval(() => {
        this.state.spinnerFrame = (this.state.spinnerFrame + 1) % SPINNER_FRAMES.length;
        this.render();
      }, 80);
    } else if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
      this.spinnerInterval = null;
    }

    this.render();
  }

  // ============================================
  // INPUT HANDLING
  // ============================================

  private handleInput(data: string): void {
    // Ctrl+C
    if (data === "\x03") {
      this.stop();
      this.props.onExit?.();
      process.exit(0);
      return;
    }

    // Scroll controls (work during loading)
    if (data === "\x1b[A") {
      this.state.scrollOffset = Math.max(0, this.state.scrollOffset - 1);
      this.render();
      return;
    }
    if (data === "\x1b[B") {
      const viewportHeight = this.terminalHeight - 4;
      const maxOffset = Math.max(0, this.messages.length - viewportHeight);
      this.state.scrollOffset = Math.min(maxOffset, this.state.scrollOffset + 1);
      this.render();
      return;
    }

    if (this.state.isLoading) return;

    // Enter
    if (data === "\r" || data === "\n") {
      this.submitInput();
      return;
    }

    // Backspace
    if (data === "\x7f" || data === "\x08") {
      if (this.state.cursorPos > 0) {
        this.state.inputValue =
          this.state.inputValue.slice(0, this.state.cursorPos - 1) +
          this.state.inputValue.slice(this.state.cursorPos);
        this.state.cursorPos--;
        this.render();
      }
      return;
    }

    // Left/Right arrows
    if (data === "\x1b[D") {
      this.state.cursorPos = Math.max(0, this.state.cursorPos - 1);
      this.render();
      return;
    }
    if (data === "\x1b[C") {
      this.state.cursorPos = Math.min(this.state.inputValue.length, this.state.cursorPos + 1);
      this.render();
      return;
    }

    // Ctrl+A (start of line)
    if (data === "\x01") {
      this.state.cursorPos = 0;
      this.render();
      return;
    }

    // Ctrl+E (end of line)
    if (data === "\x05") {
      this.state.cursorPos = this.state.inputValue.length;
      this.render();
      return;
    }

    // Ctrl+U (clear line)
    if (data === "\x15") {
      this.state.inputValue = "";
      this.state.cursorPos = 0;
      this.render();
      return;
    }

    // Regular character
    if (data.length === 1 && data.charCodeAt(0) >= 32) {
      this.state.inputValue =
        this.state.inputValue.slice(0, this.state.cursorPos) +
        data +
        this.state.inputValue.slice(this.state.cursorPos);
      this.state.cursorPos++;
      this.render();
    }
  }

  private async submitInput(): Promise<void> {
    const value = this.state.inputValue.trim();
    if (!value) return;

    // Clear input
    this.state.inputValue = "";
    this.state.cursorPos = 0;

    // Add to history
    if (!value.startsWith("/") && value !== this.state.history[0]) {
      this.state.history = [value, ...this.state.history].slice(0, 100);
    }
    this.state.historyIndex = -1;

    // Process command or message
    if (value.startsWith("/")) {
      this.handleCommand(value);
    } else {
      await this.processMessage(value);
    }
  }

  // ============================================
  // COMMAND HANDLING
  // ============================================

  private handleCommand(cmd: string): void {
    const [command, ...argsArr] = cmd.slice(1).split(" ");
    const args = argsArr.join(" ");

    switch (command?.toLowerCase()) {
      case "help":
        this.addMessage({ role: "system", content: HELP_TEXT });
        break;

      case "clear":
        this.messages = [];
        this.state.tokenCount = 0;
        this.addMessage({ role: "system", content: "[Cleared]" });
        break;

      case "exit":
      case "quit":
        this.stop();
        this.props.onExit?.();
        process.exit(0);
        break;

      case "model":
        if (args) {
          this.state.model = args;
          this.addMessage({ role: "system", content: `Model: ${getModelDisplayName(args)}` });
        } else {
          this.addMessage({ role: "system", content: `Model: ${getModelDisplayName(this.state.model)}` });
        }
        break;

      case "status": {
        const contextInfo = calculateContextInfo(this.state.tokenCount, this.state.model);
        this.addMessage({
          role: "system",
          content: `Session: ${this.props.sessionId.slice(0, 8)}... | Model: ${getModelDisplayName(this.state.model)} | Context: ${contextInfo.percentRemaining.toFixed(0)}%`,
        });
        break;
      }

      default:
        this.addMessage({ role: "system", content: `Unknown: /${command}` });
    }
  }

  // ============================================
  // MESSAGE PROCESSING
  // ============================================

  /**
   * Parse result conditions from JSON string
   */
  private parseResultConditions(): ResultConditionsConfig | undefined {
    if (!this.props.resultConditions) return undefined;

    try {
      return createResultConditionsConfig(this.props.resultConditions, {
        stopOnUnhandledError: this.props.stopOnUnhandledError,
      });
    } catch (err) {
      this.addMessage({
        role: "system",
        content: `Warning: Invalid result conditions: ${err instanceof Error ? err.message : String(err)}`,
        isError: true,
      });
      return undefined;
    }
  }

  private async processMessage(input: string): Promise<void> {
    this.addMessage({ role: "user", content: input });
    this.setLoading(true);

    try {
      const newUserMsg: ApiMessage = {
        role: "user",
        content: [{ type: "text", text: input }],
      };
      // Filter to only user/assistant messages (API doesn't accept system in messages array)
      const messagesForApi = [...this.messages
        .filter(m => m.role === "user" || m.role === "assistant")
        .map(m => ({
          role: m.role as "user" | "assistant",
          content: [{ type: "text" as const, text: m.content }],
        })), newUserMsg];

      const result = await agentLoop(messagesForApi, {
        apiKey: this.props.apiKey,
        model: this.state.model,
        maxTokens: this.props.maxTokens,
        systemPrompt: this.props.systemPrompt ?? "You are a helpful AI assistant.",
        tools: this.props.tools ?? [],
        permissionMode: this.props.permissionMode,
        workingDirectory: this.props.workingDirectory,
        gitStatus: await getGitStatus(this.props.workingDirectory),
        extendedThinking: undefined,
        hookManager: this.props.hookManager,
        sessionId: this.props.sessionId,
        stopSequences: this.props.stopSequences,
        resultConditions: this.parseResultConditions(),
        onText: (text) => {
          // Update or create streaming message
          if (this.streamingMessageId) {
            const msg = this.messages.find(m => m.id === this.streamingMessageId);
            if (msg) {
              msg.content = text;
              this.render();
              return;
            }
          }
          // Create new streaming message
          const id = genId();
          this.streamingMessageId = id;
          this.messages.push({
            id,
            role: "assistant",
            content: text,
            timestamp: Date.now(),
          });
          const viewportHeight = this.terminalHeight - 4;
          const maxOffset = Math.max(0, this.messages.length - viewportHeight);
          this.state.scrollOffset = maxOffset;
          this.render();
        },
        onToolUse: (tu) => {
          const preview = typeof tu.input === "object"
            ? JSON.stringify(tu.input, null, 2).slice(0, 200)
            : String(tu.input).slice(0, 200);
          this.addMessage({
            role: "system",
            content: preview,
            toolName: tu.name,
            type: "tool_call",
          });
        },
        onToolResult: (tr) => {
          const preview = typeof tr.result.content === "string"
            ? tr.result.content.slice(0, 200)
            : JSON.stringify(tr.result.content).slice(0, 200);
          this.addMessage({
            role: "system",
            content: preview,
            toolName: "result",
            type: "tool_result",
            isError: tr.result.is_error,
          });
        },
        onMetrics: async (m) => {
          const tokens = m.usage.input_tokens + m.usage.output_tokens;
          if (tokens > 0) this.state.tokenCount = tokens;
        },
      });

      // Add the final assistant response if we have one
      const lastAssistant = result.messages.filter(m => m.role === "assistant").pop();
      if (lastAssistant) {
        const text = typeof lastAssistant.content === "string"
          ? lastAssistant.content
          : Array.isArray(lastAssistant.content)
            ? lastAssistant.content
                .filter((b): b is { type: "text"; text: string } => b.type === "text")
                .map(b => b.text)
                .join("")
            : "";
        if (text) {
          // Update the streaming message with final content
          if (this.streamingMessageId) {
            const msg = this.messages.find(m => m.id === this.streamingMessageId);
            if (msg) {
              msg.content = text;
            }
            this.streamingMessageId = null;
          } else {
            // No streaming message, add new one
            this.addMessage({ role: "assistant", content: text });
          }
          this.render();
        }
      }

    } catch (err) {
      this.addMessage({
        role: "system",
        content: `Error: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      this.setLoading(false);
    }
  }

  // ============================================
  // RENDERING
  // ============================================

  private render(): void {
    if (!this.isRunning) return;

    const width = this.terminalWidth;
    const height = this.terminalHeight;
    const viewportHeight = height - 4;

    // Build output buffer (use process.stdout.write consistently - console.log escapes ANSI)
    let output = Terminal.clearScreen() + Terminal.moveCursor(1, 1);

    // Get visible messages
    const visibleMessages = this.messages.slice(
      this.state.scrollOffset,
      this.state.scrollOffset + viewportHeight
    );

    // Render messages
    for (const msg of visibleMessages) {
      if (msg.type === "tool_call") {
        output += Terminal.styledText(`▶ ${msg.toolName}`, Styles.tool()) + "\n";
        if (msg.content) {
          output += Terminal.styledText(`  ${msg.content}`, Styles.muted()) + "\n";
        }
      } else if (msg.type === "tool_result") {
        const icon = msg.isError ? "✗" : "✓";
        const style = msg.isError ? Styles.error() : Styles.success();
        output += Terminal.styledText(`${icon} ${msg.toolName}`, style) + "\n";
        if (msg.content) {
          output += Terminal.styledText(`  ${msg.content}`, Styles.muted()) + "\n";
        }
      } else {
        // Use native renderMessage with full width for proper wrapping
        const rendered = renderMessage({
          role: msg.role as "user" | "assistant" | "system" | "tool" | "error",
          content: msg.content,
          width,
        });
        output += rendered + "\n";
      }
    }

    // Loading indicator
    if (this.state.isLoading) {
      output += Terminal.styledText(`${SPINNER_FRAMES[this.state.spinnerFrame]} Processing...`, Styles.highlight()) + "\n";
    }

    // Empty state
    if (visibleMessages.length === 0 && !this.state.isLoading) {
      output += Terminal.styledText(`Welcome to Coder v${VERSION} (Native TUI). Type /help for commands.`, Styles.muted()) + "\n";
    }

    // Status bar
    const contextInfo = calculateContextInfo(this.state.tokenCount, this.state.model);
    const statusLeft = this.state.isLoading
      ? `${SPINNER_FRAMES[this.state.spinnerFrame]} Processing...`
      : `${getModelDisplayName(this.state.model)}`;
    const statusRight = `${formatTokenCount(this.state.tokenCount)} (${contextInfo.percentRemaining.toFixed(0)}%) | ${this.props.permissionMode}`;

    // Native status bar
    const statusBarLine = renderStatusBar(statusLeft, statusRight, width);
    output += statusBarLine + "\n";

    // Input line
    output += Terminal.styledText("You: ", Styles.user());

    if (this.state.inputValue.length > 0) {
      const beforeCursor = this.state.inputValue.slice(0, this.state.cursorPos);
      const atCursor = this.state.inputValue[this.state.cursorPos] || " ";
      const afterCursor = this.state.inputValue.slice(this.state.cursorPos + 1);

      output += beforeCursor;
      // Cursor highlight style: Cyan background, Black foreground
      const cursorStyle: TuiStyle = { fg: "Black", bg: "Cyan" };
      output += Terminal.styledText(atCursor, cursorStyle);
      output += afterCursor;
    } else {
      output += Terminal.styledText("Type... (/help)", Styles.muted());
    }

    // Write all output at once
    process.stdout.write(output);
  }
}

// ============================================
// RUNNER
// ============================================

export async function runNativeTUI(
  options: InteractiveTUIProps
): Promise<void> {
  const tui = new NativeTUI(options);

  // Handle exit signals
  const exitHandler = () => {
    tui.stop();
    process.exit(0);
  };

  process.on("SIGINT", exitHandler);
  process.on("SIGTERM", exitHandler);

  await tui.start();

  // Keep process alive
  return new Promise((resolve) => {
    process.on("beforeExit", () => {
      tui.stop();
      resolve();
    });
  });
}
