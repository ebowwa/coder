/**
 * Agent Loop Types - All type definitions for the agent loop system
 */

import type {
  Message,
  StopReason,
  ToolDefinition,
  ToolResult,
  QueryMetrics,
  PermissionMode,
  GitStatus,
  CacheConfig,
  CacheMetrics,
  ThinkingConfig,
  ExtendedThinkingConfig,
} from "../../types/index.js";
import type { SystemReminderConfig } from "../system-reminders.js";
import type { HookManager } from "../../ecosystem/hooks/index.js";
import type { PermissionRequest, PermissionResult, PermissionManager } from "../permissions.js";

/**
 * Callback types for agent loop events
 */
export interface AgentLoopCallbacks {
  onText?: (text: string) => void;
  onThinking?: (thinking: string) => void;
  onToolUse?: (toolUse: { id: string; name: string; input: unknown }) => void;
  onToolResult?: (result: { id: string; result: ToolResult }) => void;
  onMetrics?: (metrics: QueryMetrics) => void;
  onReminder?: (reminder: string) => void;
  /** Called when API retry starts - UI should reset streaming state */
  onRetryStart?: () => void;
}

/**
 * Options for the agent loop
 */
export interface AgentLoopOptions extends AgentLoopCallbacks {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  systemPrompt: string;
  tools: ToolDefinition[];
  permissionMode: PermissionMode;
  workingDirectory: string;
  gitStatus?: GitStatus | null;
  reminderConfig?: Partial<SystemReminderConfig>;
  cacheConfig?: CacheConfig;
  /** Legacy thinking config (budget_tokens) */
  thinking?: ThinkingConfig;
  /** Extended thinking config with effort levels */
  extendedThinking?: ExtendedThinkingConfig;
  /** Enable extended thinking mode */
  extendedThinkingEnabled?: boolean;
  /** Effort level for extended thinking */
  extendedThinkingEffort?: "low" | "medium" | "high" | "max";
  /** Enable interleaved thinking */
  extendedThinkingInterleaved?: boolean;
  /** Hook manager for lifecycle events */
  hookManager?: HookManager;
  /** Session ID for hooks */
  sessionId?: string;
  /** Permission request callback */
  onPermissionRequest?: (request: PermissionRequest) => Promise<PermissionResult>;
  /** Abort signal */
  signal?: AbortSignal;
}

/**
 * Result of the agent loop
 */
export interface AgentLoopResult {
  messages: Message[];
  metrics: QueryMetrics[];
  totalCost: number;
  totalDuration: number;
  totalCacheMetrics: CacheMetrics;
  compactionCount: number;
  totalTokensCompacted: number;
}

/**
 * Internal state for the agent loop
 */
export interface LoopState {
  messages: Message[];
  metrics: QueryMetrics[];
  allToolsUsed: import("../../types/index.js").ToolUseBlock[];
  totalCost: number;
  totalDuration: number;
  turnNumber: number;
  previousCost: number;
  compactionCount: number;
  totalTokensCompacted: number;
  cacheMetrics: CacheMetrics;
}

/**
 * Options for a single turn execution
 */
export interface TurnOptions {
  apiKey: string;
  model: string;
  maxTokens: number;
  systemPrompt: string;
  tools: ToolDefinition[];
  cacheConfig: CacheConfig;
  thinking?: ThinkingConfig;
  extendedThinking?: ExtendedThinkingConfig;
  workingDirectory: string;
  gitStatus: GitStatus | null;
  reminderConfig: SystemReminderConfig;
  hookManager?: HookManager;
  sessionId?: string;
  signal?: AbortSignal;
  onText?: (text: string) => void;
  onThinking?: (thinking: string) => void;
  onToolUse?: (toolUse: { id: string; name: string; input: unknown }) => void;
  onReminder?: (reminder: string) => void;
  /** Called when API retry starts - UI should reset streaming state */
  onRetryStart?: () => void;
}

/**
 * Result of a single turn
 */
export interface TurnResult {
  message: import("../../types/index.js").APIResponse;
  usage: import("../../types/index.js").UsageMetrics;
  cacheMetrics: import("../../types/index.js").CacheMetrics;
  costUSD: number;
  durationMs: number;
  ttftMs: number;
}

/**
 * Options for tool execution
 */
export interface ToolExecutionOptions {
  tools: ToolDefinition[];
  workingDirectory: string;
  permissionMode: PermissionMode;
  hookManager?: HookManager;
  sessionId?: string;
  signal?: AbortSignal;
  permissionManager: import("../permissions.js").PermissionManager;
  onToolResult?: (result: { id: string; result: ToolResult }) => void;
}

// Re-export permission types for convenience
export type { PermissionRequest, PermissionResult, PermissionManager } from "../permissions.js";
