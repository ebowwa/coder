/**
 * TUI Core Types
 * Runtime types for TUI state management, commands, and input handling
 */

import type { Message as ApiMessage, PermissionMode, ClaudeModel } from "../../schemas/index.js";
import type { UIMessage } from "../../schemas/ui.zod.js";

// ============================================
// TUI STATE TYPES
// ============================================

/**
 * Serializable TUI state snapshot for persistence
 */
export interface TUIStateSnapshot {
  messages: UIMessage[];
  apiMessages: ApiMessage[];
  tokenCount: number;
  totalCost: number;
  model: ClaudeModel;
  timestamp: number;
}

/**
 * Mutable TUI state data (used internally)
 */
export interface TUIStateData {
  messages: UIMessage[];
  apiMessages: ApiMessage[];
  inputValue: string;
  cursorPos: number;
  isLoading: boolean;
  tokenCount: number;
  model: ClaudeModel;
  totalCost: number;
}

// ============================================
// CALLBACK TYPES
// ============================================

/**
 * Callbacks for TUI state changes
 */
export interface TUIStateCallbacks {
  /** Called when a new message is added */
  onMessage: (msg: UIMessage) => void;
  /** Called when messages are cleared */
  onClear: () => void;
  /** Called when exit is requested */
  onExit: () => void;
  /** Called when model changes */
  onModelChange: (model: string) => void;
  /** Called when cost/tokens update */
  onCostUpdate: (cost: number, tokens: number) => void;
  /** Called to show a system message in UI */
  showSystemMessage: (content: string) => void;
}

// ============================================
// COMMAND TYPES
// ============================================

/**
 * Parsed command result
 */
export interface ParsedCommand {
  command: string;
  args: string;
  raw: string;
}

/**
 * Context passed to command handlers
 */
export interface CommandContext {
  sessionId: string;
  workingDirectory: string;
  permissionMode: PermissionMode;
  model: ClaudeModel;
  tokenCount: number;
  totalCost: number;
}

/**
 * Result from command execution
 */
export interface CommandResult {
  /** Whether the command was recognized and handled */
  handled: boolean;
  /** Optional message to display */
  message?: UIMessage;
  /** Whether to exit the application */
  exit?: boolean;
  /** Optional action to perform */
  action?: "clear" | "compact" | "model-switch";
  /** Data associated with action */
  actionData?: unknown;
}

// ============================================
// INPUT MANAGER TYPES
// ============================================

/**
 * Options for InputManager
 */
export interface InputManagerOptions {
  /** Maximum number of history entries (default: 100) */
  maxHistorySize?: number;
}

/**
 * Navigation result from history
 */
export interface HistoryNavigationResult {
  /** The input value to display */
  value: string;
  /** Whether navigation occurred */
  navigated: boolean;
}

// ============================================
// TERMINAL TYPES
// ============================================

/**
 * Terminal size information
 */
export interface TerminalSize {
  rows: number;
  columns: number;
}

/**
 * Cursor position
 */
export interface CursorPosition {
  row: number;
  column: number;
}
