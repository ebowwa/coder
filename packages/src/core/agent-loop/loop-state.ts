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
import type { CompactionResult, getCompactionStats } from "../context-compaction.js";
import {
  type TeammateTemplate,
  type LoopBehavior,
  getLoopBehavior,
  DEFAULT_LOOP_BEHAVIOR,
  TEAMMATE_TEMPLATES,
} from "../../ecosystem/presets/types.js";

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

  // Dynamic configuration from template
  readonly template: TeammateTemplate | null;
  readonly loopBehavior: LoopBehavior;
  private costWarningIssued = false;
  private turnWarningIssued = false;

  constructor(options: LoopStateOptions | Message[]) {
    // Support legacy constructor signature
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
    // Rough estimation based on usage metrics
    const totalInput = this.metrics.reduce((sum, m) => sum + m.usage.input_tokens, 0);
    const totalOutput = this.metrics.reduce((sum, m) => sum + m.usage.output_tokens, 0);
    return totalInput + totalOutput;
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
   * Add user message (tool results) to history
   */
  addUserMessage(content: import("../../schemas/index.js").ToolResultBlock[]): void {
    this.messages.push({
      role: "user",
      content,
    });
  }

  /**
   * Track tool usage
   */
  trackToolUse(toolUseBlocks: ToolUseBlock[]): void {
    this.allToolsUsed.push(...toolUseBlocks);
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
      return false;
    }

    // Replace messages array content
    this.messages.length = 0;
    this.messages.push(...compactionResult.messages);

    this.compactionCount++;
    const tokensSaved = compactionResult.tokensBefore - compactionResult.tokensAfter;
    this.totalTokensCompacted += tokensSaved;

    const stats = getStats(compactionResult);
    console.log(`Context compacted: ${stats.reductionPercent}% reduction, ${stats.tokensSaved} tokens saved`);

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
}
