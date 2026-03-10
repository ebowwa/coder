/**
 * TUI Bridge Module
 * Enables external control of coder via TUI Bridge MCP
 *
 * This module provides:
 * 1. State export for external parsing
 * 2. Command execution from external sources
 * 3. Event emission for external listeners
 * 4. Screen capture and export utilities
 */

import { EventEmitter } from "events";
import type {
  BridgeState,
  BridgeEvent,
  BridgeCommand,
  BridgeCommandResult,
  TUIBridgeConfig,
  ParsedScreen,
  ScreenBuffer,
  ScreenCell,
  UIElement,
  UIElementType,
  BridgeEventType,
} from "./types.js";

// Re-export screen-export utilities
export {
  DEFAULT_CELL,
  parseANSIText,
  stripANSI,
  createScreenBuffer,
  renderToScreenBuffer,
  captureScreen,
  detectUIElements,
  exportToText,
  exportToJSON,
  exportToHTML,
  exportToMarkdown,
  exportScreen,
  parseScreen,
  createScreenExportAPI,
  type ExportFormat,
  type ExportOptions,
  type ScreenExportAPI,
} from "./screen-export.js";

// Import for use in TUIBridge
import {
  createScreenBuffer as createBuffer,
  parseANSIText,
  renderToScreenBuffer,
  detectUIElements,
  exportScreen as doExport,
  parseScreen,
} from "./screen-export.js";
import type { ExportFormat, ExportOptions } from "./screen-export.js";

/**
 * TUI Bridge singleton for external control
 */
export class TUIBridge extends EventEmitter {
  private static instance: TUIBridge | null = null;
  private config: TUIBridgeConfig;
  private state: BridgeState | null = null;
  private subscribers: Set<string> = new Set();
  private commandQueue: Array<{ command: BridgeCommand; resolve: (result: BridgeCommandResult) => void }> = [];
  private isProcessing: boolean = false;
  private screenBuffer: ScreenBuffer | null = null;
  private terminalDimensions: { width: number; height: number } = { width: 80, height: 24 };

  private constructor(config: TUIBridgeConfig) {
    super();
    this.config = config;
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: TUIBridgeConfig): TUIBridge | null {
    if (!TUIBridge.instance && config) {
      TUIBridge.instance = new TUIBridge(config);
    }
    return TUIBridge.instance;
  }

  /**
   * Initialize bridge with config
   */
  static init(config: TUIBridgeConfig): TUIBridge {
    if (!TUIBridge.instance) {
      TUIBridge.instance = new TUIBridge(config);
    }
    return TUIBridge.instance;
  }

  /**
   * Update internal state and emit event
   */
  updateState(newState: Partial<BridgeState>): void {
    if (!this.state) {
      return;
    }
    this.state = { ...this.state, ...newState, timestamp: Date.now() };
    this.emitEvent("state_update", this.state);
  }

  /**
   * Initialize state (called once at startup)
   */
  initState(initialState: BridgeState): void {
    this.state = { ...initialState, timestamp: Date.now() };
  }

  /**
   * Get current state
   */
  getState(): BridgeState | null {
    return this.state ? { ...this.state } : null;
  }

  /**
   * Emit event to subscribers
   */
  emitEvent<T>(type: BridgeEventType, payload: T): void {
    const event: BridgeEvent<T> = {
      type,
      payload,
      timestamp: Date.now(),
    };

    // Emit to local listeners
    this.emit("event", event);

    // Call config callback if provided
    if (this.config.onEvent) {
      this.config.onEvent(event as BridgeEvent);
    }
  }

  /**
   * Execute a command from external source
   */
  async executeCommand(command: BridgeCommand): Promise<BridgeCommandResult> {
    return new Promise((resolve) => {
      this.commandQueue.push({ command, resolve });
      this.processQueue();
    });
  }

  /**
   * Process command queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.commandQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const { command, resolve } = this.commandQueue.shift()!;

    try {
      const result = await this.handleCommand(command);
      resolve(result);
    } catch (error) {
      resolve({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.isProcessing = false;
      this.processQueue();
    }
  }

  /**
   * Handle individual command
   */
  private async handleCommand(command: BridgeCommand): Promise<BridgeCommandResult> {
    // Most commands are handled by the TUI component itself
    // This just validates and queues them
    switch (command.type) {
      case "get_state":
        return {
          success: true,
          data: this.getState(),
        };

      case "get_screen":
        // Screen capture is handled by TUI Bridge MCP directly via tmux
        return {
          success: true,
          data: {
            note: "Screen capture is handled by TUI Bridge MCP via tmux. Use tui_capture tool.",
            state: this.getState(),
          },
        };

      case "get_screen":
        // Screen capture is handled by TUI Bridge MCP directly via tmux
        return {
          success: true,
          data: {
            note: "Screen capture is handled by TUI Bridge MCP via tmux. Use tui_capture tool.",
            state: this.getState(),
          },
        };

      default:
        // Queue command for TUI to handle
        this.emitEvent("command_executed", command);
        return {
          success: true,
          data: { queued: true, command },
        };
    }
  }

  /**
   * Subscribe to events
   */
  subscribe(subscriberId: string): boolean {
    this.subscribers.add(subscriberId);
    return true;
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriberId: string): boolean {
    return this.subscribers.delete(subscriberId);
  }

  /**
   * Get subscriber count
   */
  getSubscriberCount(): number {
    return this.subscribers.size;
  }

  /**
   * Check if bridge is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  // ============================================
  // SCREEN BUFFER API
  // ============================================

  /**
   * Set terminal dimensions
   */
  setDimensions(width: number, height: number): void {
    this.terminalDimensions = { width, height };
  }

  /**
   * Get terminal dimensions
   */
  getDimensions(): { width: number; height: number } {
    return { ...this.terminalDimensions };
  }

  /**
   * Get screen buffer
   * Returns the current screen buffer if available, or creates an empty one
   */
  getScreenBuffer(): ScreenBuffer {
    if (this.screenBuffer) {
      return this.screenBuffer;
    }
    return createBuffer(this.terminalDimensions.width, this.terminalDimensions.height);
  }

  /**
   * Update screen buffer with raw terminal content
   * @param rawContent - Raw terminal output with ANSI codes
   */
  updateScreenBuffer(rawContent: string): ScreenBuffer {
    const chars = parseANSIText(rawContent);
    this.screenBuffer = renderToScreenBuffer(
      chars,
      this.terminalDimensions.width,
      this.terminalDimensions.height
    );
    return this.screenBuffer;
  }

  /**
   * Export screen to specified format
   * @param format - Export format (text, json, html, markdown)
   * @param options - Export options
   */
  exportScreen(format: ExportFormat, options?: ExportOptions): string {
    const buffer = this.getScreenBuffer();
    return doExport(buffer, format, options);
  }

  /**
   * Parse raw terminal content into a full ParsedScreen
   * @param rawContent - Raw terminal output with ANSI codes
   */
  parseRawScreen(rawContent: string): ParsedScreen {
    return parseScreen(
      rawContent,
      this.terminalDimensions.width,
      this.terminalDimensions.height
    );
  }

  /**
   * Get detected UI elements from current screen buffer
   */
  getUIElements(): UIElement[] {
    const buffer = this.getScreenBuffer();
    return detectUIElements(buffer);
  }

  /**
   * Clear screen buffer
   */
  clearScreenBuffer(): void {
    this.screenBuffer = null;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.removeAllListeners();
    this.subscribers.clear();
    this.commandQueue = [];
    TUIBridge.instance = null;
  }
}

// Re-export types
export type {
  BridgeState,
  BridgeEvent,
  BridgeCommand,
  BridgeCommandResult,
  TUIBridgeConfig,
  ParsedScreen,
  ScreenBuffer,
  ScreenCell,
  UIElement,
  UIElementType,
  BridgeEventType,
};

// Re-export IPC Server
export {
  IPCServer,
  createIPCServer,
  JSONRPCRequestSchema,
  JSONRPCNotificationSchema,
  IPCServerConfigSchema,
  type JSONRPCRequest,
  type JSONRPCSuccessResponse,
  type JSONRPCErrorResponse,
  type JSONRPCResponse,
  type JSONRPCNotification,
  type IPCServerConfig,
  type IPCServerEventType,
  type IPCServerEvent,
  type ClientConnection,
} from "./ipc.js";
