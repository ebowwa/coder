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
import type { StopSequenceConfig, StopSequenceContext, StopSequenceOptions } from "./stop-sequences.js";
import type { ResultConditionsConfig, ResultCondition } from "./result-conditions.js";
import type { LoopPersistenceConfig } from "./loop-persistence.js";
import type { ContinuationConfig } from "./continuation.js";
import type { LongRunningIntegrationConfig } from "./long-running-integration.js";

// Re-export for convenience
export type { StopSequenceConfig, StopSequenceContext, StopSequenceOptions } from "./stop-sequences.js";
export type { ResultConditionsConfig, ResultCondition } from "./result-conditions.js";
export type { LoopPersistenceConfig, LoopRecoveryResult } from "./loop-persistence.js";
export type { LongRunningIntegrationConfig } from "./long-running-integration.js";

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
  hookManager?: HookManager;
  sessionId?: string;
  onPermissionRequest?: (request: PermissionRequest) => Promise<PermissionResult>;
  signal?: AbortSignal;
  /** Stop sequences - user/AI decides what to use */
  stopSequences?: string[];
  /** Stop sequence config with optional reason */
  stopSequenceConfig?: StopSequenceConfig;
  /** Result-based loop control - checks actual tool results (Ralph Loop pattern) */
  resultConditions?: ResultConditionsConfig;
  /** Persistence configuration for long-running loops */
  persistence?: boolean | Partial<LoopPersistenceConfig>;
  /** Resume from a previous interrupted loop */
  resumeFrom?: { sessionId: string };
  /** Callback when loop state is persisted */
  onPersist?: (sessionId: string, turnNumber: number) => void;
  /** Continuation config - enables autonomous loop continuation (Ralph-style) */
  continuation?: ContinuationConfig;
  /** Long-running mode - enables persistent memory for days/weeks of autonomous work */
  longRunning?: boolean | Partial<LongRunningIntegrationConfig>;
  /** Original goal for long-running sessions (required if longRunning is true) */
  longRunningGoal?: string;
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
  /** Custom stop sequences that will cause the model to stop generating */
  stopSequences?: string[];
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

/**
 * Interface for loop state management
 *
 * Both LoopState and FSMIntegratedLoopState implement this interface,
 * allowing either to be used in the agent loop.
 */
export interface ILoopState {
  // Properties
  messages: Message[];
  metrics: QueryMetrics[];
  allToolsUsed: ToolUseBlock[];
  totalCost: number;
  previousCost: number;
  totalDuration: number;
  turnNumber: number;
  sessionStartTime: number;
  compactionCount: number;
  totalTokensCompacted: number;
  cacheMetrics: import("../../schemas/index.js").CacheMetrics;
  retryCount: number;
  consecutiveContinuations: number;
  wasCompacted: boolean;
  recentToolNames: string[];
  loopBehavior: import("../../ecosystem/presets/types.js").LoopBehavior;
  template: import("../../ecosystem/presets/types.js").TeammateTemplate | null;
  estimatedContextTokens: number;
  currentUsage: import("../../schemas/index.js").UsageMetrics;

  // Getters
  readonly isMaxTurnsExceeded: boolean;
  readonly shouldWarnTurns: boolean;
  readonly isSessionTimeoutExceeded: boolean;
  readonly isCostThresholdExceeded: boolean;
  readonly shouldWarnCost: boolean;
  readonly remainingTurns: number;
  readonly remainingSessionTime: number;
  readonly shouldContinue: boolean;
  readonly stopReason: import("../../schemas/index.js").StopReason | null;
  readonly compactionThresholdTokens: number;
  readonly shouldProactiveCompact: boolean;
  readonly latestMetrics: QueryMetrics | undefined;

  // Methods
  addTurnResult(result: {
    message: { content: unknown[]; stop_reason: import("../../schemas/index.js").StopReason; id: string };
    usage: import("../../schemas/index.js").UsageMetrics;
    cacheMetrics?: import("../../schemas/index.js").CacheMetrics;
    costUSD: number;
    durationMs: number;
    model: string;
    messageCount: number;
  }): QueryMetrics;
  addAssistantMessage(content: unknown[]): void;
  addUserMessage(content: import("../../schemas/index.js").ToolResultBlock[] | import("../../schemas/index.js").TextBlock[] | string): void;
  trackToolUse(toolUseBlocks: ToolUseBlock[]): void;
  incrementTurn(): number;
  applyCompaction(
    compactionResult: import("../context-compaction.js").CompactionResult,
    getStats: typeof import("../context-compaction.js").getCompactionStats
  ): boolean;
  markCostWarningIssued(): void;
  markTurnWarningIssued(): void;
  isToolAllowed(toolName: string): boolean;
  serialize(sessionId: string, options?: {
    interrupted?: boolean;
    endedAt?: number;
    endReason?: string;
  }): import("./loop-serializer.js").PersistedLoopState;
  toResult(): AgentLoopResult;
  getStatusSummary(): {
    templateName: string | null;
    turnNumber: number;
    remainingTurns: number | "unlimited";
    totalCost: number;
    costStatus: "ok" | "warning" | "exceeded";
    sessionDuration: number;
    compactionCount: number;
    toolUseCount: number;
  };
}
