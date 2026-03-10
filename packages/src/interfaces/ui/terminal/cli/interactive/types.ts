/**
 * CLI Interactive Types
 * Type definitions for the non-React interactive mode
 *
 * Extracted from v1 TUI patterns without Ink dependency
 */

import type { PermissionMode, ClaudeModel, Message as ApiMessage, ToolDefinition } from "../../../../../types/index.js";
import type { HookManager } from "../../../../../ecosystem/hooks/index.js";
import type { LoadedSession, SessionSummary } from "../../../../../core/sessions/types.js";
import type { TeammateModeRunner } from "../../../../../teammates/runner.js";

// ============================================
// MESSAGE TYPES
// ============================================

/**
 * Message sub-type for granular categorization
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
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  subType?: MessageSubType;
  toolName?: string;
  isError?: boolean;
}

// ============================================
// MESSAGE STORE TYPES
// ============================================

/**
 * Message store interface for non-React usage
 */
export interface MessageStore {
  /** UI messages for display */
  messages: UIMessage[];
  /** API messages for context */
  apiMessages: ApiMessage[];
  /** Add a UI message */
  addMessage(msg: Omit<UIMessage, "id" | "timestamp">): string;
  /** Add multiple messages from API response */
  addApiMessages(msgs: ApiMessage[]): void;
  /** Add system message (convenience) */
  addSystem(content: string, subType?: MessageSubType, toolName?: string, isError?: boolean): string;
  /** Clear all messages */
  clear(): void;
  /** Replace messages (for undo/redo) */
  replace(ui: UIMessage[], api: ApiMessage[]): void;
  /** Total token count */
  tokenCount: number;
  /** Update token count */
  setTokenCount(count: number): void;
  /** Subscribe to store changes */
  subscribe(listener: () => void): () => void;
}

// ============================================
// INPUT HANDLER TYPES
// ============================================

/**
 * Native key event representation for input handling
 *
 * This is the TypeScript interface used by input handlers.
 * It's converted from the native module's InputEvent format.
 */
export interface NativeKeyEvent {
  /** Key code or character */
  code: string;
  /** Whether this is a special/control key */
  is_special: boolean;
  /** Ctrl modifier state */
  ctrl: boolean;
  /** Alt modifier state */
  alt: boolean;
  /** Shift modifier state */
  shift: boolean;
  /** Key event kind */
  kind: "press" | "release" | "repeat";
}

/**
 * Input handler function type
 */
export type InputHandler = (event: NativeKeyEvent) => boolean;

/**
 * Input handler registration options
 */
export interface InputHandlerOptions {
  /** Unique ID for this handler */
  id: string;
  /** Priority (higher = receives input first) */
  priority?: number;
  /** Handler function - return true to consume, false to pass through */
  handler: InputHandler;
  /** Whether this handler is currently active */
  isActive?: boolean;
}

/**
 * Input manager interface for non-React usage
 */
export interface InputManager {
  /** Register an input handler */
  register(options: InputHandlerOptions): () => void;
  /** Set focus to a specific handler */
  focus(handlerId: string): void;
  /** Get currently focused handler ID */
  focusedId: string | null;
  /** Dispatch a key event to handlers */
  dispatch(event: NativeKeyEvent): boolean;
  /** Whether input is currently blocked */
  isBlocked: boolean;
  /** Block/unblock input (for loading states) */
  setBlocked(blocked: boolean): void;
}

// ============================================
// INTERACTIVE RUNNER TYPES
// ============================================

/**
 * Props for the interactive runner
 */
export interface InteractiveRunnerProps {
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
  teammateRunner?: TeammateModeRunner | null;
  onExit?: () => Promise<void> | void;
}

/**
 * Session store interface (subset used by interactive mode)
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
 * Interactive runner state
 */
export interface InteractiveState {
  isLoading: boolean;
  inputValue: string;
  cursorPos: number;
  scrollOffset: number;
  totalCost: number;
  spinnerFrame: string;
  streamingText: string;
  inputHistory: string[];
  historyIndex: number;
  sessionSelectMode: boolean;
  selectableSessions: SessionInfo[];
  helpMode: boolean;
  helpSection: number;
}

// ============================================
// COMMAND TYPES
// ============================================

/**
 * Command handler context
 */
export interface CommandContext {
  sessionId: string;
  setSessionId: (id: string) => void;
  model: ClaudeModel;
  setModel: (model: ClaudeModel) => void;
  messageStore: MessageStore;
  totalCost: number;
  setTotalCost: (cost: number) => void;
  permissionMode: PermissionMode;
  tools: ToolDefinition[];
  workingDirectory: string;
  sessionStore: SessionStore;
  messagesLength: number;
  onExit: () => void;
  exit: () => void;
  state: InteractiveState;
  setState: (state: Partial<InteractiveState>) => void;
}

// ============================================
// CONTEXT INFO TYPES
// ============================================

/**
 * Context info from status-line calculations
 */
export interface ContextInfo {
  percentRemaining: number;
  isLow: boolean;
  isCritical: boolean;
}

// ============================================
// PRIORITY CONSTANTS
// ============================================

/**
 * Input priority levels
 */
export const InputPriority = {
  /** Normal components */
  DEFAULT: 0,
  /** Focused input fields */
  INPUT: 10,
  /** Selectable lists */
  LIST: 20,
  /** Modal dialogs */
  MODAL: 100,
  /** System-level (Ctrl+C, etc.) */
  SYSTEM: 1000,
} as const;

// ============================================
// RE-EXPORTS
// ============================================

export type {
  PermissionMode,
  ClaudeModel,
  Message as ApiMessage,
  ToolDefinition,
} from "../../../../../types/index.js";
export type { HookManager } from "../../../../../ecosystem/hooks/index.js";
export type { SkillManager } from "../../../../../ecosystem/skills/index.js";
