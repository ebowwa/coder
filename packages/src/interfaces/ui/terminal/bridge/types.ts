/**
 * TUI Bridge Types
 * Type definitions for external control via TUI Bridge MCP
 */

import type { PermissionMode } from "../../../../types/index.js";

/**
 * Bridge event types that can be sent to external controllers
 */
export type BridgeEventType =
  | "state_update"
  | "message_added"
  | "message_updated"
  | "loading_changed"
  | "model_changed"
  | "session_changed"
  | "command_executed"
  | "error";

/**
 * Bridge state snapshot for external controllers
 */
export interface BridgeState {
  /** Current session ID */
  sessionId: string;
  /** Current model */
  model: string;
  /** Permission mode */
  permissionMode: PermissionMode;
  /** Is currently processing */
  isLoading: boolean;
  /** Total messages count */
  messageCount: number;
  /** Working directory */
  workingDirectory: string;
  /** Tokens used */
  tokensUsed: number;
  /** Total cost */
  totalCost: number;
  /** Timestamp */
  timestamp: number;
}

/**
 * Bridge event payload
 */
export interface BridgeEvent<T = unknown> {
  /** Event type */
  type: BridgeEventType;
  /** Event payload */
  payload: T;
  /** Timestamp */
  timestamp: number;
}

/**
 * Bridge event map for type-safe event handling
 */
export interface BridgeEventMap {
  state_update: BridgeState;
  message_added: { id: string; content: string; role: "user" | "assistant" | "system" };
  message_updated: { id: string; content: string };
  loading_changed: { isLoading: boolean };
  model_changed: { model: string };
  session_changed: { sessionId: string };
  command_executed: BridgeCommand;
  error: { message: string; code?: string };
}

/**
 * Command that can be sent to coder via bridge
 */
export type BridgeCommand =
  | { type: "send_message"; content: string }
  | { type: "execute_command"; command: string }
  | { type: "set_model"; model: string }
  | { type: "clear_messages" }
  | { type: "export_session"; format: "jsonl" | "json" | "markdown" }
  | { type: "get_state" }
  | { type: "get_screen" };

/**
 * Bridge command result
 */
export interface BridgeCommandResult<T = unknown> {
  /** Whether command succeeded */
  success: boolean;
  /** Result data if any */
  data?: T;
  /** Error message if failed */
  error?: string;
}

/**
 * TUI Bridge configuration
 */
export interface TUIBridgeConfig {
  /** Enable bridge mode */
  enabled: boolean;
  /** Unix socket path for IPC */
  socketPath?: string;
  /** Port for HTTP bridge */
  httpPort?: number;
  /** Callback for external events */
  onEvent?: (event: BridgeEvent) => void;
}

/**
 * Screen buffer cell for TUI parsing
 */
export interface ScreenCell {
  /** Character at this position */
  char: string;
  /** Foreground color */
  fg?: string;
  /** Background color */
  bg?: string;
  /** Text attributes */
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  dim?: boolean;
  inverse?: boolean;
}

/**
 * Screen buffer representation
 */
export interface ScreenBuffer {
  /** Screen width */
  width: number;
  /** Screen height */
  height: number;
  /** 2D array of cells [row][col] */
  cells: ScreenCell[][];
  /** Cursor position */
  cursor: { x: number; y: number; visible: boolean };
  /** Timestamp */
  timestamp: number;
}

/**
 * Parsed screen content
 */
export interface ParsedScreen {
  /** Plain text content */
  text: string;
  /** Screen buffer */
  buffer: ScreenBuffer;
  /** Detected UI elements */
  elements: UIElement[];
  /** Timestamp */
  timestamp: number;
}

/**
 * Detected UI element types
 */
export type UIElementType =
  | "button"
  | "input"
  | "menu"
  | "menu_item"
  | "list"
  | "list_item"
  | "dialog"
  | "text"
  | "header"
  | "footer";

/**
 * Detected UI element in the screen
 */
export interface UIElement {
  /** Element type */
  type: UIElementType;
  /** Bounding box */
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Text content */
  text: string;
  /** Is focused/selected */
  focused?: boolean;
  /** Is clickable */
  clickable?: boolean;
}

/**
 * Bridge message format for IPC
 */
export interface BridgeMessage {
  /** Message ID for request/response correlation */
  id: string;
  /** Message type */
  type: "request" | "response" | "event";
  /** Method name (for requests) */
  method?: string;
  /** Parameters (for requests) */
  params?: unknown;
  /** Result (for responses) */
  result?: unknown;
  /** Error (for error responses) */
  error?: { code: number; message: string };
  /** Event data (for events) */
  event?: BridgeEvent;
}

/**
 * Bridge methods available for external control
 */
export type BridgeMethod =
  | "getState"
  | "sendMessage"
  | "executeCommand"
  | "setModel"
  | "clearMessages"
  | "exportSession"
  | "getScreen"
  | "parseScreen"
  | "subscribe"
  | "unsubscribe";
