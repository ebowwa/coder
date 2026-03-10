/**
 * Interactive Runner - Main Interactive CLI Loop
 *
 * Non-React implementation of the interactive CLI mode.
 * Extracts the core patterns from v1 TUI without the Ink dependency.
 *
 * Features:
 * - Native terminal input handling
 * - Message state management via MessageStore
 * - Agent loop integration for AI responses
 * - Command handling
 * - History navigation
 * - Loading states with spinner
 */

import process from "node:process";
import type { Message as ApiMessage } from "../../../../../types/index.js";
import { agentLoop } from "../../../../../core/agent-loop.js";
import { getGitStatus } from "../../../../../core/git-status.js";
import { createStreamHighlighter } from "../../../../../core/stream-highlighter.js";
import { NativeRenderer } from "../../../../../native/index.js";
import type { InputEvent, NativeRendererType } from "../../../../../native/index.js";
import { spinnerFrames } from "../../shared/spinner-frames.js";
import { MessageStoreImpl } from "./message-store.js";
import { InputManagerImpl, KeyEvents, inputEventToNativeKeyEvent } from "./input-handler.js";
import type {
  InteractiveRunnerProps,
  InteractiveState,
  NativeKeyEvent,
} from "./types.js";
import { InputPriority } from "./types.js";

// ============================================
// STATE MANAGEMENT
// ============================================

/**
 * Create initial interactive state
 */
function createInitialState(): InteractiveState {
  return {
    isLoading: false,
    inputValue: "",
    cursorPos: 0,
    scrollOffset: 0,
    totalCost: 0,
    spinnerFrame: spinnerFrames[0] ?? "⠋",
    streamingText: "",
    inputHistory: [],
    historyIndex: -1,
    sessionSelectMode: false,
    selectableSessions: [],
    helpMode: false,
    helpSection: 0,
  };
}

// ============================================
// INTERACTIVE RUNNER CLASS
// ============================================

/**
 * Main interactive runner class
 *
 * Usage:
 * ```ts
 * const runner = new InteractiveRunner(props);
 * await runner.start();
 * ```
 */
export class InteractiveRunner {
  private props: InteractiveRunnerProps;
  private messageStore: MessageStoreImpl;
  private inputManager: InputManagerImpl;
  private state: InteractiveState;
  private renderer: NativeRendererType | null = null;
  private spinnerInterval: Timer | null = null;
  private frameIndex = 0;
  private isProcessing = false;
  private savedInput = "";
  private shouldExit = false;

  constructor(props: InteractiveRunnerProps) {
    this.props = props;
    this.messageStore = new MessageStoreImpl();
    this.inputManager = new InputManagerImpl();
    this.state = createInitialState();

    // Initialize messages from props
    if (props.initialMessages.length > 0) {
      this.messageStore.addApiMessages(props.initialMessages);
    }
  }

  /**
   * Start the interactive loop
   */
  async start(): Promise<void> {
    // Check if stdin is a TTY
    const isInteractive = process.stdin.isTTY;
    const forceInteractive = process.env.CLAUDE_FORCE_INTERACTIVE === "true";

    // Debug output
    if (process.env.CODER_DEBUG === "1") {
      console.error("[InteractiveRunner] isInteractive:", isInteractive);
      console.error("[InteractiveRunner] forceInteractive:", forceInteractive);
    }

    if (!isInteractive && !forceInteractive) {
      console.error("Error: Interactive mode requires a TTY. Use -q for single query mode.");
      return;
    }

    // Try to use native TUI renderer, fall back to simple mode if not available
    if (isInteractive) {
      try {
        if (process.env.CODER_DEBUG === "1") {
          console.error("[InteractiveRunner] Creating NativeRenderer...");
        }
        this.renderer = new NativeRenderer();
        if (process.env.CODER_DEBUG === "1") {
          console.error("[InteractiveRunner] NativeRenderer created, initializing...");
        }
        this.renderer.init();
        if (process.env.CODER_DEBUG === "1") {
          console.error("[InteractiveRunner] NativeRenderer initialized successfully");
        }
      } catch (err) {
        // Native renderer not available, fall back to simple mode
        if (process.env.CODER_DEBUG === "1") {
          console.error("[InteractiveRunner] NativeRenderer failed:", err);
        }
        await this._runSimpleMode();
        return;
      }
    } else {
      // Non-interactive terminal, use simple mode
      await this._runSimpleMode();
      return;
    }

    // Show startup message
    this._showStartupMessage();

    // Register input handlers
    this._registerInputHandlers();

    // Start spinner animation (when loading)
    // Note: Spinner is controlled by state.isLoading

    // Main event loop
    while (!this.shouldExit) {
      // Poll for input (non-blocking, 16ms timeout for ~60fps)
      const event = this.renderer.pollInput(16);

      // Dispatch to input manager if it's a key event
      // Note: NAPI-RS converts snake_case to camelCase, so use eventType (not event_type)
      if (event.eventType === "key") {
        // Convert InputEvent (from native module) to NativeKeyEvent (for input handlers)
        const nativeEvent = inputEventToNativeKeyEvent(event);
        if (nativeEvent) {
          this.inputManager.dispatch(nativeEvent);
        }
      }

      // Render current state
      this._render();

      // Small yield to prevent CPU spinning
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    // Cleanup
    this._cleanup();
  }

  /**
   * Stop the interactive loop
   */
  stop(): void {
    this.shouldExit = true;
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Show startup message
   */
  private _showStartupMessage(): void {
    console.log(`\x1b[90mSession: ${this.props.sessionId}\x1b[0m`);
    console.log(`\x1b[90mModel: ${this.props.model}\x1b[0m`);
    if (this.props.teammateRunner) {
      console.log(`\x1b[90mTeammate Mode: Active\x1b[0m`);
    }
    console.log(`\x1b[90mType your message, ? for help, or /help for commands.\x1b[0m\n`);
  }

  /**
   * Register input handlers
   */
  private _registerInputHandlers(): void {
    // System handler (Ctrl+C, etc.) - highest priority
    this.inputManager.register({
      id: "system",
      priority: InputPriority.SYSTEM,
      handler: (event) => {
        if (KeyEvents.isCtrlC(event)) {
          this._handleExit();
          return true;
        }
        if (KeyEvents.isCtrlD(event)) {
          this._handleExit();
          return true;
        }
        return false;
      },
    });

    // Main input handler
    this.inputManager.register({
      id: "main-input",
      priority: InputPriority.INPUT,
      handler: (event) => this._handleMainInput(event),
    });

    // Focus on main input
    this.inputManager.focus("main-input");
  }

  /**
   * Handle main input events
   */
  private _handleMainInput(event: NativeKeyEvent): boolean {
    // Block input when loading
    if (this.state.isLoading) {
      // Allow Ctrl+C even when loading
      if (KeyEvents.isCtrlC(event)) {
        this._handleExit();
        return true;
      }
      return false;
    }

    // Handle special modes
    if (this.state.helpMode) {
      return this._handleHelpModeInput(event);
    }

    if (this.state.sessionSelectMode) {
      return this._handleSessionSelectInput(event);
    }

    // Regular input handling
    const { inputValue, cursorPos } = this.state;

    // Enter - submit
    if (KeyEvents.isEnter(event)) {
      if (inputValue.trim()) {
        this._submitInput();
      }
      return true;
    }

    // Escape - clear input or exit help
    if (KeyEvents.isEscape(event)) {
      this.state = { ...this.state, inputValue: "", cursorPos: 0 };
      return true;
    }

    // History navigation
    if (KeyEvents.isUp(event)) {
      return this._handleHistoryUp();
    }

    if (KeyEvents.isDown(event)) {
      return this._handleHistoryDown();
    }

    // Cursor movement
    if (KeyEvents.isLeft(event)) {
      this.state = { ...this.state, cursorPos: Math.max(0, cursorPos - 1) };
      return true;
    }

    if (KeyEvents.isRight(event)) {
      this.state = { ...this.state, cursorPos: Math.min(inputValue.length, cursorPos + 1) };
      return true;
    }

    if (KeyEvents.isHome(event) || KeyEvents.isCtrlA(event)) {
      this.state = { ...this.state, cursorPos: 0 };
      return true;
    }

    if (KeyEvents.isEnd(event) || KeyEvents.isCtrlE(event)) {
      this.state = { ...this.state, cursorPos: inputValue.length };
      return true;
    }

    // Backspace
    if (KeyEvents.isBackspace(event)) {
      if (cursorPos > 0) {
        const newVal = inputValue.slice(0, cursorPos - 1) + inputValue.slice(cursorPos);
        this.state = { ...this.state, inputValue: newVal, cursorPos: cursorPos - 1 };
      }
      return true;
    }

    // Delete
    if (KeyEvents.isDelete(event)) {
      if (cursorPos < inputValue.length) {
        const newVal = inputValue.slice(0, cursorPos) + inputValue.slice(cursorPos + 1);
        this.state = { ...this.state, inputValue: newVal };
      }
      return true;
    }

    // Printable character
    if (KeyEvents.isPrintable(event)) {
      const char = KeyEvents.getChar(event);
      const newVal = inputValue.slice(0, cursorPos) + char + inputValue.slice(cursorPos);
      this.state = {
        ...this.state,
        inputValue: newVal,
        cursorPos: cursorPos + 1,
        historyIndex: -1,
      };
      return true;
    }

    return false;
  }

  /**
   * Handle history up
   */
  private _handleHistoryUp(): boolean {
    const { inputHistory, historyIndex } = this.state;
    if (inputHistory.length === 0) return false;

    if (historyIndex === -1) {
      this.savedInput = this.state.inputValue;
    }

    const newIndex = Math.min(historyIndex + 1, inputHistory.length - 1);
    const newInput = inputHistory[newIndex] ?? "";
    this.state = {
      ...this.state,
      historyIndex: newIndex,
      inputValue: newInput,
      cursorPos: newInput.length,
    };
    return true;
  }

  /**
   * Handle history down
   */
  private _handleHistoryDown(): boolean {
    const { inputHistory, historyIndex } = this.state;
    if (historyIndex === -1) return false;

    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const newInput = inputHistory[newIndex] ?? "";
      this.state = {
        ...this.state,
        historyIndex: newIndex,
        inputValue: newInput,
        cursorPos: newInput.length,
      };
    } else {
      this.state = {
        ...this.state,
        historyIndex: -1,
        inputValue: this.savedInput,
        cursorPos: this.savedInput.length,
      };
    }
    return true;
  }

  /**
   * Handle help mode input
   */
  private _handleHelpModeInput(event: NativeKeyEvent): boolean {
    const HELP_SECTIONS_COUNT = 5;

    if (KeyEvents.isEscape(event) || event.code === "q") {
      this.state = { ...this.state, helpMode: false };
      return true;
    }

    if (event.code === "tab" || KeyEvents.isRight(event)) {
      this.state = {
        ...this.state,
        helpSection: (this.state.helpSection + 1) % HELP_SECTIONS_COUNT,
      };
      return true;
    }

    if (KeyEvents.isLeft(event)) {
      this.state = {
        ...this.state,
        helpSection: (this.state.helpSection - 1 + HELP_SECTIONS_COUNT) % HELP_SECTIONS_COUNT,
      };
      return true;
    }

    return false;
  }

  /**
   * Handle session select input
   */
  private _handleSessionSelectInput(event: NativeKeyEvent): boolean {
    const num = parseInt(event.code ?? "", 10);
    if (!isNaN(num) && num >= 1 && num <= this.state.selectableSessions.length) {
      const selected = this.state.selectableSessions[num - 1];
      if (selected) {
        this.state = {
          ...this.state,
          sessionSelectMode: false,
          selectableSessions: [],
        };
        // Handle session resume
        this._handleCommand(`/resume ${selected.id}`);
      }
      return true;
    }

    if (KeyEvents.isEnter(event) || KeyEvents.isEscape(event)) {
      this.state = {
        ...this.state,
        sessionSelectMode: false,
        selectableSessions: [],
      };
      this.messageStore.addSystem("Session selection cancelled.");
      return true;
    }

    return false;
  }

  /**
   * Submit the current input
   */
  private async _submitInput(): Promise<void> {
    if (this.isProcessing) return;

    const input = this.state.inputValue.trim();
    if (!input) return;

    // Clear input immediately
    this.state = { ...this.state, inputValue: "", cursorPos: 0 };

    // Add to history (skip commands and duplicates)
    if (!input.startsWith("/") && input !== this.state.inputHistory[0]) {
      this.state = {
        ...this.state,
        inputHistory: [input, ...this.state.inputHistory].slice(0, 100),
        historyIndex: -1,
      };
    }

    // Handle commands
    if (input.startsWith("/")) {
      this._handleCommand(input);
      return;
    }

    // Process as message
    await this._processMessage(input);
  }

  /**
   * Handle a command
   */
  private _handleCommand(cmd: string): void {
    // Import command handling logic
    // For now, handle basic commands inline
    const command = cmd.toLowerCase().trim();

    if (command === "/exit" || command === "/quit") {
      this._handleExit();
      return;
    }

    if (command === "/clear") {
      this.messageStore.clear();
      this.messageStore.addSystem("Messages cleared.");
      return;
    }

    if (command === "/help" || command === "?") {
      this.state = { ...this.state, helpMode: true, helpSection: 0 };
      return;
    }

    if (command === "/cost") {
      this.messageStore.addSystem(`Total cost: $${this.state.totalCost.toFixed(4)}`);
      return;
    }

    if (command === "/status") {
      this.messageStore.addSystem(
        `Session: ${this.props.sessionId}\n` +
        `Model: ${this.props.model}\n` +
        `Messages: ${this.messageStore.messages.length}\n` +
        `Tokens: ${this.messageStore.tokenCount}`
      );
      return;
    }

    // Unknown command
    this.messageStore.addSystem(`Unknown command: ${cmd}. Type /help for available commands.`);
  }

  /**
   * Process a message through the agent loop
   */
  private async _processMessage(input: string): Promise<void> {
    this.isProcessing = true;
    this.state = { ...this.state, isLoading: true, streamingText: "" };

    // Start spinner animation
    this._startSpinner();

    // Add user message
    this.messageStore.addMessage({ role: "user", content: input });

    try {
      // Execute hooks
      const hookResult = await this.props.hookManager.execute("UserPromptSubmit", {
        prompt: input,
        session_id: this.props.sessionId,
      });

      if (hookResult.decision === "deny" || hookResult.decision === "block") {
        this.messageStore.addSystem(`Input blocked: ${hookResult.reason || "Security policy"}`);
        return;
      }

      const processedInput = (hookResult.modified_input?.prompt as string) ?? input;

      // Build messages for API
      const newUserMsg: ApiMessage = {
        role: "user",
        content: [{ type: "text", text: processedInput }],
      };
      const messagesForApi = [...this.messageStore.apiMessages, newUserMsg];

      // Get git status
      const gitStatus = await getGitStatus(this.props.workingDirectory);

      // Create stream highlighter
      const highlighter = createStreamHighlighter();
      let streamingText = "";

      // Run agent loop
      const result = await agentLoop(messagesForApi, {
        apiKey: this.props.apiKey,
        model: this.props.model,
        maxTokens: this.props.maxTokens,
        systemPrompt: this.props.systemPrompt,
        tools: this.props.tools,
        permissionMode: this.props.permissionMode,
        workingDirectory: this.props.workingDirectory,
        gitStatus,
        hookManager: this.props.hookManager,
        sessionId: this.props.sessionId,
        onText: (text) => {
          streamingText += text;
          this.state = { ...this.state, streamingText };
        },
        onToolUse: (toolUse) => {
          this.messageStore.addSystem(`[Using: ${toolUse.name}]`, "tool_call", toolUse.name);
        },
        onToolResult: (toolResult) => {
          if (toolResult.result.is_error) {
            this.messageStore.addSystem(`[Tool Error]`, "tool_result", undefined, true);
          }
        },
        onMetrics: async (metrics) => {
          const apiTokens = metrics.usage.input_tokens + metrics.usage.output_tokens;
          if (apiTokens > 0) {
            this.messageStore.setTokenCount(apiTokens);
          }
          await this.props.sessionStore.saveMetrics(metrics);
        },
      });

      // Add API messages (skipping user message already added)
      this.messageStore.addApiMessages(result.messages.slice(this.messageStore.apiMessages.length));
      this.state = { ...this.state, totalCost: this.state.totalCost + result.totalCost };

      // Save to session
      const lastUserMsg = result.messages[result.messages.length - 2];
      const lastAssistantMsg = result.messages[result.messages.length - 1];
      if (lastUserMsg) await this.props.sessionStore.saveMessage(lastUserMsg);
      if (lastAssistantMsg) await this.props.sessionStore.saveMessage(lastAssistantMsg);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.messageStore.addSystem(`Error: ${errorMessage}`, "error");
    } finally {
      this._stopSpinner();
      this.state = { ...this.state, isLoading: false, streamingText: "" };
      this.isProcessing = false;
    }
  }

  /**
   * Start spinner animation
   */
  private _startSpinner(): void {
    this._stopSpinner();
    this.spinnerInterval = setInterval(() => {
      this.frameIndex = (this.frameIndex + 1) % spinnerFrames.length;
      const frame = spinnerFrames[this.frameIndex];
      if (frame) {
        this.state = { ...this.state, spinnerFrame: frame };
      }
    }, 80);
  }

  /**
   * Stop spinner animation
   */
  private _stopSpinner(): void {
    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
      this.spinnerInterval = null;
    }
  }

  /**
   * Handle exit
   */
  private async _handleExit(): Promise<void> {
    this.shouldExit = true;
    await this.props.onExit?.();
  }

  /**
   * Render current state
   */
  private _render(): void {
    if (!this.renderer) return;

    // Build render state
    const renderState = this._buildRenderState();
    this.renderer.render(renderState);
  }

  /**
   * Build render state for the renderer
   * Returns a RenderState object matching the NativeRenderer.render() interface
   */
  private _buildRenderState() {
    const { messages } = this.messageStore;
    const { isLoading, inputValue, cursorPos, streamingText, helpMode, helpSection, sessionSelectMode, selectableSessions } = this.state;

    // Convert MessageStore messages to RenderMessage format
    const renderMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // Build status text
    const statusText = `Session: ${this.props.sessionId} | Model: ${this.props.model}`;

    // Build help text if in help mode
    const helpText = helpMode ? this._getHelpText(helpSection) : "";

    // Build search results if in session select mode
    const searchResults = sessionSelectMode ? selectableSessions.map(s => ({
      filePath: s.id,
      lineNumber: 0,
      content: `${s.messageCount} messages`,
    })) : [];

    // NativeRenderer expects camelCase field names (NAPI-RS converts snake_case to camelCase)
    return {
      messages: renderMessages,
      inputValue: inputValue,
      cursorPos: cursorPos,
      statusText: statusText,
      isLoading: isLoading,
      streamingText: streamingText,
      model: this.props.model,
      showHelp: helpMode,
      helpText: helpText,
      searchMode: sessionSelectMode,
      searchQuery: "",
      searchResults: searchResults,
      searchSelected: 0,
    };
  }

  /**
   * Get help text for a given section
   */
  private _getHelpText(section: number): string {
    const sections = [
      `Commands:
  /help, ?        Show this help
  /exit, /quit    Exit the CLI
  /clear          Clear messages
  /cost           Show total cost
  /status         Show session status`,
      `Keyboard Shortcuts:
  Enter           Send message
  Escape          Clear input
  Up/Down         History navigation
  Ctrl+C          Exit`,
      `Model: ${this.props.model}
  Max tokens: ${this.props.maxTokens}
  Permission mode: ${this.props.permissionMode}`,
    ];
    return sections[section] || sections[0] || "";
  }

  /**
   * Simple input mode fallback (without native TUI)
   * Uses basic readline for input
   */
  private async _runSimpleMode(): Promise<void> {
    const readline = await import("node:readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log("\n\x1b[90mRunning in simple mode (no TUI)\x1b[0m");
    console.log("\x1b[90mType /exit to quit\x1b[0m\n");

    const prompt = (): void => {
      rl.question("> ", async (input) => {
        const trimmed = input.trim();

        if (trimmed === "/exit" || trimmed === "/quit") {
          rl.close();
          console.log("\n\x1b[90mGoodbye!\x1b[0m");
          return;
        }

        if (trimmed === "/clear") {
          console.clear();
          prompt();
          return;
        }

        if (trimmed === "/help" || trimmed === "?") {
          console.log(`
Commands:
  /help, ?      Show this help
  /exit         Exit the CLI
  /clear        Clear screen
  /cost         Show total cost
  /status       Show session status
`);
          prompt();
          return;
        }

        if (trimmed === "/cost") {
          console.log(`Total cost: $${this.state.totalCost.toFixed(4)}`);
          prompt();
          return;
        }

        if (trimmed === "/status") {
          console.log(`
Session: ${this.props.sessionId}
Model: ${this.props.model}
Messages: ${this.messageStore.messages.length}
Tokens: ${this.messageStore.tokenCount}
`);
          prompt();
          return;
        }

        if (trimmed) {
          await this._processMessage(trimmed);
        }

        prompt();
      });
    };

    prompt();

    return new Promise((resolve) => {
      rl.on("close", () => {
        resolve();
      });
    });
  }

  /**
   * Cleanup resources
   */
  private _cleanup(): void {
    this._stopSpinner();
    if (this.renderer) {
      this.renderer.cleanup();
      this.renderer = null;
    }
    console.log("\n\x1b[90mGoodbye!\x1b[0m");
  }
}

// ============================================
// EXPORTS
// ============================================

export type { InteractiveRunnerProps, InteractiveState } from "./types.js";
