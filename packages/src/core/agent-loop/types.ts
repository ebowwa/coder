/**
 * Agent Loop Types - Extended types for agent loop system
 * Base types are from schemas, extended with runtime-only types
 */

// Import types used in interfaces
import type {
  Message,
  ToolDefinition,
  ToolResult,
  QueryMetrics,
  PermissionMode,
  GitStatus,
  CacheConfig,
  CacheMetrics,
  ThinkingConfig,
  ExtendedThinkingConfig,
  ToolUseBlock,
  APIResponse,
  UsageMetrics,
} from "../../schemas/index.js";
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
  thinking?: ThinkingConfig;
  extendedThinking?: ExtendedThinkingConfig;
  extendedThinkingEnabled?: boolean;
  extendedThinkingEffort?: "low" | "medium" | "high" | "max";
  extendedThinkingInterleaved?: boolean;
  hookManager?: HookManager;
  sessionId?: string;
  onPermissionRequest?: (request: PermissionRequest) => Promise<PermissionResult>;
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
  allToolsUsed: ToolUseBlock[];
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
}

/**
 * Result of a single turn
 */
export interface TurnResult {
  message: APIResponse;
  usage: UsageMetrics;
  cacheMetrics: CacheMetrics;
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
  permissionManager: PermissionManager;
  onToolResult?: (result: { id: string; result: ToolResult }) => void;
}

// Re-export permission types for convenience
export type { PermissionRequest, PermissionResult, PermissionManager } from "../permissions.js";
