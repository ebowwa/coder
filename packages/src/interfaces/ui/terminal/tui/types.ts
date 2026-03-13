/**
 * TUI Types
 * Type definitions for the interactive TUI components
 */

import type { PermissionMode, ClaudeModel, Message as ApiMessage, ToolDefinition } from "../../../../types/index.js";
import type { HookManager } from "../../../../ecosystem/hooks/index.js";
import type { LoadedSession, SessionSummary } from "../../../../core/sessions/types.js";

/**
 * Message sub-type for granular categorization
 * - tool_call: Assistant is invoking a tool
 * - tool_result: Tool execution result (success or error)
 * - hook: Hook intercept/decision message
 * - info: General system info (session start, commands, etc.)
 * - error: Error messages
 * - thinking: Extended thinking output
 */
export type MessageSubType =
  | "tool_call"
  | "tool_result"
  | "hook"
  | "info"
  | "error"
  | "thinking";

/**
 * UI-specific message representation
 */
export interface UIMessage {
  id: string;
  /** Base role: user, assistant, or system */
  role: "user" | "assistant" | "system";
  /** Message content for display */
  content: string;
  /** Timestamp in milliseconds */
  timestamp: number;
  /** Optional sub-type for granular display labels */
  subType?: MessageSubType;
  /** For tool messages: the tool name */
  toolName?: string;
  /** For tool_result: whether it was an error */
  isError?: boolean;
}

/**
 * Props for the main InteractiveTUI component
 */
export interface InteractiveTUIProps {
  apiKey: string;
  model: ClaudeModel;
  permissionMode: PermissionMode;
  maxTokens: number;
  systemPrompt: string;
  tools: ToolDefinition[];
  hookManager: HookManager;
  sessionStore: SessionStore;
  sessionId: string;
  setSessionId: (id: string) => void;
  initialMessages: ApiMessage[];
  workingDirectory: string;
  onExit: () => void;
}

/**
 * Session store interface (subset used by TUI)
 */
export interface SessionStore {
  saveMessage(message: ApiMessage): Promise<void>;
  saveMetrics(metrics: unknown): Promise<void>;
  exportSession(sessionId: string, format: "jsonl" | "json" | "markdown"): Promise<string>;
  listSessions(limit?: number): Promise<SessionSummary[]>;
  resumeSession(sessionId: string): Promise<LoadedSession | null>;
  createSession(options: {
    model: string;
    workingDirectory: string;
    agentName?: string;
    agentColor?: string;
    teamName?: string;
  }): Promise<string>;
}

/**
 * Session info for listing
 */
export interface SessionInfo {
  id: string;
  messageCount: number;
  lastActivity?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Message area component props
 */
export interface MessageAreaProps {
  messages: UIMessage[];
  isLoading: boolean;
  spinnerFrame: string;
  height: number;
  scrollOffset: number;
  contextWarning: string | null;
  streamingText?: string;
}

/**
 * Status bar component props
 */
export interface StatusBarProps {
  permissionMode: PermissionMode;
  tokensUsed: number;
  model: string;
  isLoading: boolean;
  spinnerFrame: string;
}

/**
 * Input field component props
 */
export interface InputFieldProps {
  value: string;
  cursorPos: number;
  placeholder: string;
  isActive: boolean;
}

/**
 * Terminal layout configuration
 */
export interface TerminalLayout {
  terminalHeight: number;
  inputHeight: number;
  statusHeight: number;
  messageHeight: number;
}

/**
 * Command handler context
 */
export interface CommandContext {
  sessionId: string;
  setSessionId: (id: string) => void;
  model: ClaudeModel;
  setModel: (model: ClaudeModel) => void;
  apiMessages: ApiMessage[];
  setApiMessages: (messages: ApiMessage[]) => void;
  setMessages: (messages: UIMessage[]) => void;
  processedCountRef: React.MutableRefObject<number>;
  totalCost: number;
  setTotalCost: (cost: number) => void;
  totalTokens: number;
  setTotalTokens: (tokens: number) => void;
  permissionMode: PermissionMode;
  tools: ToolDefinition[];
  workingDirectory: string;
  sessionStore: SessionStore;
  addSystemMessage: (content: string) => void;
  messagesLength: number;
  onExit: () => void;
  exit: () => void;
  // Session selection state
  sessionSelectMode: boolean;
  setSessionSelectMode: (mode: boolean) => void;
  setSelectableSessions: (sessions: SessionInfo[]) => void;
  // Help mode state
  helpMode: boolean;
  setHelpMode: (mode: boolean) => void;
  helpSection: number;
  setHelpSection: (section: number) => void;
}

/**
 * Context info from status-line
 */
export interface ContextInfo {
  percentRemaining: number;
  isLow: boolean;
  isCritical: boolean;
}

/**
 * Re-export types from parent for convenience
 */
export type { PermissionMode, ClaudeModel, Message as ApiMessage, ToolDefinition } from "../../../../types/index.js";
export type { HookManager } from "../../../../ecosystem/hooks/index.js";
