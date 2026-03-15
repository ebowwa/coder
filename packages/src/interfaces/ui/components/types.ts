/**
 * UI Component Types
 */

/**
 * UIMessage - Message for display in terminal UI
 */
export interface UIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  /** Tool name if this is a tool call/result */
  toolName?: string;
  /** Tool input preview */
  toolInput?: string;
  /** Tool output preview */
  toolOutput?: string;
  /** Whether tool result was an error */
  isError?: boolean;
  /** Message type for styling */
  type?: "tool_call" | "tool_result" | "text";
}

/**
 * InputHistoryOptions - Options for input history hook
 */
export interface InputHistoryOptions {
  /** Maximum history size */
  maxHistorySize?: number;
  /** Initial history values */
  initialHistory?: string[];
}
