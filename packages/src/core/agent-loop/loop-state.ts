/**
 * Loop State - Mutable state management for the agent loop
 *
 * Dynamic behavior is determined by teammate templates which control:
 * - Turn limits and timeouts
 * - Compaction strategy
 * - Cost thresholds
 * - Error handling
 * - Permission modes
 */

import type {
  Message,
  ToolUseBlock,
  QueryMetrics,
  CacheMetrics,
  UsageMetrics,
  StopReason,
} from "../../schemas/index.js";
import {
  type CompactionResult,
  getCompactionStats,
  estimateMessagesTokens,
} from "../context-compaction.js";
import {
  type TeammateTemplate,
  type LoopBehavior,
  getLoopBehavior,
  DEFAULT_LOOP_BEHAVIOR,
  TEAMMATE_TEMPLATES,
} from "../../ecosystem/presets/types.js";
import {
  type PersistedLoopState,
  type LoopCheckpoint,
  SERIALIZER_VERSION,
  pruneCheckpoints,
} from "./loop-serializer.js";

/**
 * Creates an initial cache metrics object
 */
export function createInitialCacheMetrics(): CacheMetrics {
  return {
    cacheHits: 0,
    cacheMisses: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    totalCacheReadTokens: 0,
    totalCacheWriteTokens: 0,
    cacheHitRate: 0,
    estimatedSavingsUSD: 0,
  };
}

/**
 * Options for creating LoopState
 */
export interface LoopStateOptions {
  /** Initial messages for the conversation */
  initialMessages: Message[];
  /** Template name to determine behavior */
  templateName?: string;
  /** Template object (overrides templateName) */
  template?: TeammateTemplate;
  /** Override loop behavior settings */
  loopBehaviorOverrides?: Partial<LoopBehavior>;
  /** Maximum turns override (0 = use template) */
  maxTurnsOverride?: number;
  /** Session start time for timeout tracking */
  sessionStartTime?: number;
}

/**
 * Check cost threshold
 */
function checkCostThreshold(
  loopBehavior: LoopBehavior,
  currentCost: number
): { exceeded: boolean; warning: boolean; message?: string } {
  const { costThresholds } = loopBehavior;
  if (!costThresholds.enabled) {
    return { exceeded: false, warning: false };
  }

  const { warnAt, stopAt } = costThresholds;

  if (currentCost >= stopAt) {
    return {
      exceeded: true,
      warning: true,
      message: `Cost threshold exceeded: $${currentCost.toFixed(4)} >= $${stopAt}`,
    };
  }

  if (currentCost >= warnAt) {
    return {
      exceeded: false,
      warning: true,
      message: `Cost warning: $${currentCost.toFixed(4)} >= $${warnAt}`,
    };
  }

  return { exceeded: false, warning: false };
}

/**
 * LoopState class encapsulates all mutable state during the agent loop
 *
 * Behavior is dynamically configured by the template's loopBehavior:
 * - Turn limits and warnings
 * - Cost thresholds and tracking
 * - Compaction triggers
 * - Timeout handling
 */
export class LoopState {
  // Conversation state
  messages: Message[];
  metrics: QueryMetrics[] = [];
  allToolsUsed: ToolUseBlock[] = [];

  // Cost tracking
  totalCost = 0;
  previousCost = 0;

  // Timing
  totalDuration = 0;
  turnNumber = 0;
  sessionStartTime: number;

  // Compaction tracking
  compactionCount = 0;
  totalTokensCompacted = 0;
  cacheMetrics: CacheMetrics;

  // Result-based loop control
  retryCount = 0;

  // Continuation tracking (for autonomous loops)
  consecutiveContinuations = 0;

  // NEW: Smart continuation fields
  /** Whether the context was just compacted this turn */
  wasCompacted = false;
  /** Names of tools used in recent turns (for cooldown check) */
  recentToolNames: string[] = [];

  // Dynamic configuration from template
  readonly template: TeammateTemplate | null;
  readonly loopBehavior: LoopBehavior;
  private costWarningIssued = false;
  private turnWarningIssued = false;

  constructor(options: LoopStateOptions | Message[]) {
    // Support shorthand: pass messages array directly
    if (Array.isArray(options)) {
      this.messages = [...options];
      this.template = null;
      this.loopBehavior = DEFAULT_LOOP_BEHAVIOR;
      this.sessionStartTime = Date.now();
      this.cacheMetrics = createInitialCacheMetrics();
      return;
    }

    this.messages = [...options.initialMessages];
    this.sessionStartTime = options.sessionStartTime ?? Date.now();
    this.cacheMetrics = createInitialCacheMetrics();

    // Load template
    if (options.template) {
      this.template = options.template;
    } else if (options.templateName && TEAMMATE_TEMPLATES[options.templateName]) {
      this.template = TEAMMATE_TEMPLATES[options.templateName] ?? null;
    } else {
      this.template = null;
    }

    // Get loop behavior from template with optional overrides
    const baseBehavior = this.template ? getLoopBehavior(this.template) : DEFAULT_LOOP_BEHAVIOR;
    this.loopBehavior = options.loopBehaviorOverrides
      ? { ...baseBehavior, ...options.loopBehaviorOverrides }
      : baseBehavior;

    // Apply maxTurns override if provided
    if (options.maxTurnsOverride !== undefined) {
      (this.loopBehavior as { maxTurns: number }).maxTurns = options.maxTurnsOverride;
    }
  }

  // ============================================
  // BEHAVIOR-DERIVED GETTERS
  // ============================================

  /**
   * Check if the session has exceeded max turns
   */
  get isMaxTurnsExceeded(): boolean {
    const { maxTurns } = this.loopBehavior;
    return maxTurns > 0 && this.turnNumber >= maxTurns;
  }

  /**
   * Check if turn warning should be issued
   */
  get shouldWarnTurns(): boolean {
    if (this.turnWarningIssued) return false;
    return this.turnNumber >= this.loopBehavior.warnAfterTurns;
  }

  /**
   * Check if session timeout is exceeded
   */
  get isSessionTimeoutExceeded(): boolean {
    const { sessionTimeoutMs } = this.loopBehavior;
    if (sessionTimeoutMs === 0) return false;
    return Date.now() - this.sessionStartTime >= sessionTimeoutMs;
  }

  /**
   * Check if cost threshold is exceeded
   */
  get isCostThresholdExceeded(): boolean {
    const result = checkCostThreshold(this.loopBehavior, this.totalCost);
    return result.exceeded;
  }

  /**
   * Check if cost warning should be issued
   */
  get shouldWarnCost(): boolean {
    if (this.costWarningIssued) return false;
    const result = checkCostThreshold(this.loopBehavior, this.totalCost);
    return result.warning;
  }

  /**
   * Get remaining turns (0 = unlimited)
   */
  get remainingTurns(): number {
    const { maxTurns } = this.loopBehavior;
    if (maxTurns === 0) return Infinity;
    return Math.max(0, maxTurns - this.turnNumber);
  }

  /**
   * Get remaining session time in ms (0 = unlimited)
   */
  get remainingSessionTime(): number {
    const { sessionTimeoutMs } = this.loopBehavior;
    if (sessionTimeoutMs === 0) return Infinity;
    return Math.max(0, sessionTimeoutMs - (Date.now() - this.sessionStartTime));
  }

  /**
   * Check if loop should continue based on behavior limits
   */
  get shouldContinue(): boolean {
    return !this.isMaxTurnsExceeded &&
           !this.isSessionTimeoutExceeded &&
           !this.isCostThresholdExceeded;
  }

  /**
   * Get stop reason if limits exceeded
   */
  get stopReason(): StopReason | null {
    if (this.isMaxTurnsExceeded) return "stop_sequence";
    if (this.isCostThresholdExceeded) return "stop_sequence";
    if (this.isSessionTimeoutExceeded) return "stop_sequence";
    return null;
  }

  /**
   * Get compaction threshold based on behavior
   */
  get compactionThresholdTokens(): number {
    return Math.floor(this.loopBehavior.contextWindowTarget * this.loopBehavior.compactionThreshold);
  }

  /**
   * Check if proactive compaction should occur
   */
  get shouldProactiveCompact(): boolean {
    if (!this.loopBehavior.autoCompact) return false;
    const currentTokens = this.estimatedContextTokens;
    return currentTokens >= this.compactionThresholdTokens;
  }

  /**
   * Estimate current context token count
   */
  get estimatedContextTokens(): number {
    // Use actual message token estimation instead of cumulative metrics
    // This gives accurate context window tracking for compaction decisions
    return estimateMessagesTokens(this.messages);
  }

  // ============================================
  // BEHAVIOR-AWARE METHODS
  // ============================================

  /**
   * Mark cost warning as issued
   */
  markCostWarningIssued(): void {
    this.costWarningIssued = true;
  }

  /**
   * Mark turn warning as issued
   */
  markTurnWarningIssued(): void {
    this.turnWarningIssued = true;
  }

  /**
   * Check if a tool is allowed by template permissions
   */
  isToolAllowed(toolName: string): boolean {
    const permissions = this.template?.permissions;
    if (!permissions) return true;

    if (permissions.disallowedTools?.includes(toolName)) {
      return false;
    }

    if (permissions.allowedTools) {
      return permissions.allowedTools.includes(toolName) ||
             permissions.allowedTools.includes("*");
    }

    return true;
  }

  /**
   * Get error handling config from behavior
   */
  getErrorHandling() {
    return this.loopBehavior.errorHandling;
  }

  /**
   * Get cost thresholds from behavior
   */
  getCostThresholds() {
    return this.loopBehavior.costThresholds;
  }

  /**
   * Get compaction options from behavior
   */
  getCompactionOptions() {
    return {
      strategy: this.loopBehavior.compactionStrategy,
      threshold: this.loopBehavior.compactionThreshold,
      autoCompact: this.loopBehavior.autoCompact,
    };
  }

  /**
   * Get the latest metrics entry
   */
  get latestMetrics(): QueryMetrics | undefined {
    return this.metrics[this.metrics.length - 1];
  }

  /**
   * Get usage for reminder building (with fallback)
   */
  get currentUsage(): UsageMetrics {
    return this.latestMetrics?.usage ?? {
      input_tokens: 0,
      output_tokens: 0,
    };
  }

  /**
   * Add a turn's results to the state
   */
  addTurnResult(result: {
    message: { content: unknown[]; stop_reason: StopReason; id: string };
    usage: UsageMetrics;
    cacheMetrics?: CacheMetrics;
    costUSD: number;
    durationMs: number;
    model: string;
    messageCount: number;
  }): QueryMetrics {
    const queryMetrics: QueryMetrics = {
      model: result.model,
      messageCount: result.messageCount,
      messageTokens: result.usage.input_tokens + result.usage.output_tokens,
      usage: result.usage,
      cacheMetrics: result.cacheMetrics,
      durationMs: result.durationMs,
      ttftMs: 0, // Will be set by caller if available
      costUSD: result.costUSD,
      stopReason: result.message.stop_reason ?? null,
      requestId: result.message.id,
    };

    this.metrics.push(queryMetrics);
    this.previousCost = this.totalCost;
    this.totalCost += result.costUSD;
    this.totalDuration += result.durationMs;

    // Aggregate cache metrics
    if (result.cacheMetrics) {
      this.cacheMetrics.cacheHits += result.cacheMetrics.cacheHits;
      this.cacheMetrics.cacheMisses += result.cacheMetrics.cacheMisses;
      this.cacheMetrics.totalCacheReadTokens += result.cacheMetrics.totalCacheReadTokens;
      this.cacheMetrics.totalCacheWriteTokens += result.cacheMetrics.totalCacheWriteTokens;
      this.cacheMetrics.estimatedSavingsUSD += result.cacheMetrics.estimatedSavingsUSD;
    }

    // Update cache hit rate
    const totalCacheOps = this.cacheMetrics.cacheHits + this.cacheMetrics.cacheMisses;
    this.cacheMetrics.cacheHitRate = totalCacheOps > 0
      ? this.cacheMetrics.cacheHits / totalCacheOps
      : 0;

    return queryMetrics;
  }

  /**
   * Add assistant message to history
   */
  addAssistantMessage(content: unknown[]): void {
    this.messages.push({
      role: "assistant",
      content: content as import("../../schemas/index.js").ContentBlock[],
    });
  }

  /**
   * Add user message to history
   * @param content - Tool results, text blocks, or string
   */
  addUserMessage(
    content:
      | import("../../schemas/index.js").ToolResultBlock[]
      | import("../../schemas/index.js").TextBlock[]
      | string
  ): void {
    let messageContent: import("../../schemas/index.js").ContentBlock[];
    if (typeof content === "string") {
      messageContent = [{ type: "text", text: content }];
    } else {
      messageContent = content as import("../../schemas/index.js").ContentBlock[];
    }
    this.messages.push({
      role: "user",
      content: messageContent,
    });
  }

  /**
   * Track tool usage
   */
  trackToolUse(toolUseBlocks: ToolUseBlock[]): void {
    this.allToolsUsed.push(...toolUseBlocks);
    // Reset consecutive continuations when tools are used (progress made)
    if (toolUseBlocks.length > 0) {
      this.consecutiveContinuations = 0;

      // Track recent tool names for cooldown detection
      const toolNames = toolUseBlocks.map(b => b.name);
      this.recentToolNames = [...this.recentToolNames, ...toolNames].slice(-10); // Keep last 10
    }
  }

  /**
   * Reset consecutive continuations counter
   */
  resetConsecutiveContinuations(): void {
    this.consecutiveContinuations = 0;
  }

  /**
   * Apply compaction result to state
   */
  applyCompaction(
    compactionResult: CompactionResult,
    getStats: typeof getCompactionStats
  ): boolean {
    // Only apply compaction if it actually saved tokens
    if (!compactionResult.didCompact || compactionResult.tokensAfter >= compactionResult.tokensBefore) {
      this.wasCompacted = false;
      return false;
    }

    // Replace messages array content
    this.messages.length = 0;
    this.messages.push(...compactionResult.messages);

    this.compactionCount++;
    const tokensSaved = compactionResult.tokensBefore - compactionResult.tokensAfter;
    this.totalTokensCompacted += tokensSaved;

    // Mark that we just compacted (for continuation system)
    this.wasCompacted = true;

    const stats = getStats(compactionResult);
    // Log compaction event for user awareness
    process.stderr.write(`\x1b[90m[Compaction] ${compactionResult.messagesRemoved} messages removed, ${stats.reductionPercent}% reduction (${stats.tokensSaved} tokens saved)\x1b[0m\n`);

    return true;
  }

  /**
   * Increment turn counter
   */
  incrementTurn(): number {
    return ++this.turnNumber;
  }

  /**
   * Convert to AgentLoopResult
   */
  toResult(): import("./types.js").AgentLoopResult {
    return {
      messages: this.messages,
      metrics: this.metrics,
      totalCost: this.totalCost,
      totalDuration: this.totalDuration,
      totalCacheMetrics: this.cacheMetrics,
      compactionCount: this.compactionCount,
      totalTokensCompacted: this.totalTokensCompacted,
    };
  }

  /**
   * Get a status summary for display/logging
   */
  getStatusSummary(): {
    templateName: string | null;
    turnNumber: number;
    remainingTurns: number | "unlimited";
    totalCost: number;
    costStatus: "ok" | "warning" | "exceeded";
    sessionDuration: number;
    compactionCount: number;
    toolUseCount: number;
  } {
    const costResult = checkCostThreshold(this.loopBehavior, this.totalCost);

    return {
      templateName: this.template?.name ?? null,
      turnNumber: this.turnNumber,
      remainingTurns: this.loopBehavior.maxTurns === 0 ? "unlimited" : this.remainingTurns,
      totalCost: this.totalCost,
      costStatus: costResult.exceeded ? "exceeded" : costResult.warning ? "warning" : "ok",
      sessionDuration: Date.now() - this.sessionStartTime,
      compactionCount: this.compactionCount,
      toolUseCount: this.allToolsUsed.length,
    };
  }

  /**
   * Check if detailed metrics are enabled
   */
  get shouldTrackDetailedMetrics(): boolean {
    return this.loopBehavior.detailedMetrics;
  }

  /**
   * Check if verbose logging is enabled
   */
  get isVerbose(): boolean {
    return this.loopBehavior.verbose;
  }

  /**
   * Check if parallel tool execution is enabled
   */
  get shouldExecuteToolsInParallel(): boolean {
    return this.loopBehavior.parallelTools;
  }

  // ============================================
  // SERIALIZATION (for persistence)
  // ============================================

  /**
   * Serialize the loop state for persistence
   *
   * This creates a PersistedLoopState that can be saved to disk
   * and later restored with deserialize().
   *
   * @param sessionId - The session ID this loop belongs to
   * @param options - Serialization options
   * @returns PersistedLoopState ready for storage
   */
  serialize(sessionId: string, options?: {
    interrupted?: boolean;
    endedAt?: number;
    endReason?: string;
  }): PersistedLoopState {
    return {
      version: SERIALIZER_VERSION,
      sessionId,
      timestamp: Date.now(),

      // Core state
      messages: this.messages,
      metrics: this.metrics,
      allToolsUsed: this.allToolsUsed,

      // Counters
      totalCost: this.totalCost,
      previousCost: this.previousCost,
      totalDuration: this.totalDuration,
      turnNumber: this.turnNumber,
      compactionCount: this.compactionCount,
      totalTokensCompacted: this.totalTokensCompacted,
      retryCount: this.retryCount,
      consecutiveContinuations: this.consecutiveContinuations,
      wasCompacted: this.wasCompacted,
      recentToolNames: this.recentToolNames,

      // Cache metrics
      cacheMetrics: this.cacheMetrics,

      // Template info
      templateName: this.template?.name ?? null,
      loopBehavior: this.loopBehavior,

      // Session timing
      sessionStartTime: this.sessionStartTime,

      // Checkpoints (empty by default, populated by createCheckpoint)
      checkpoints: [],

      // Resume metadata
      interrupted: options?.interrupted,
      endedAt: options?.endedAt,
      endReason: options?.endReason,
    };
  }

  /**
   * Deserialize a persisted loop state back into a LoopState instance
   *
   * @param data - The persisted state data
   * @returns A new LoopState instance with the restored state
   */
  static deserialize(data: PersistedLoopState): LoopState {
    // Create LoopStateOptions from persisted data
    const options: LoopStateOptions = {
      initialMessages: data.messages,
      templateName: data.templateName ?? undefined,
      loopBehaviorOverrides: data.loopBehavior,
      sessionStartTime: data.sessionStartTime,
    };

    const state = new LoopState(options);

    // Restore counters
    state.metrics = data.metrics;
    state.allToolsUsed = data.allToolsUsed;
    state.totalCost = data.totalCost;
    state.previousCost = data.previousCost;
    state.totalDuration = data.totalDuration;
    state.turnNumber = data.turnNumber;
    state.compactionCount = data.compactionCount;
    state.totalTokensCompacted = data.totalTokensCompacted;
    state.retryCount = data.retryCount;
    state.consecutiveContinuations = data.consecutiveContinuations ?? 0;
    state.wasCompacted = data.wasCompacted ?? false;
    state.recentToolNames = data.recentToolNames ?? [];
    state.cacheMetrics = data.cacheMetrics;

    // Note: checkpoints are stored separately and managed by LoopPersistence

    return state;
  }

  /**
   * Create a checkpoint at the current state
   *
   * @param type - The type of checkpoint
   * @param summary - Human-readable summary
   * @param options - Optional checkpoint data
   * @returns A LoopCheckpoint object
   */
  createCheckpoint(
    type: "auto" | "manual" | "qc",
    summary: string = "",
    options?: {
      fileSnapshots?: Record<string, string>;
      qc?: LoopCheckpoint["qc"];
    }
  ): LoopCheckpoint {
    const checkpoint: LoopCheckpoint = {
      id: `cp_${String(this.turnNumber).padStart(4, "0")}_${Date.now()}`,
      turnNumber: this.turnNumber,
      timestamp: Date.now(),
      type,
      summary: summary || `Checkpoint at turn ${this.turnNumber}`,
    };

    if (options?.fileSnapshots) {
      checkpoint.fileSnapshots = options.fileSnapshots;
    }

    if (options?.qc) {
      checkpoint.qc = options.qc;
    }

    return checkpoint;
  }

  /**
   * Get a summary of the current state for logging/display
   */
  getPersistenceSummary(): {
    turnNumber: number;
    totalCost: number;
    duration: string;
    toolUseCount: number;
    messageCount: number;
  } {
    const durationMs = Date.now() - this.sessionStartTime;
    const duration = this.formatDuration(durationMs);

    return {
      turnNumber: this.turnNumber,
      totalCost: this.totalCost,
      duration,
      toolUseCount: this.allToolsUsed.length,
      messageCount: this.messages.length,
    };
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }
}
