/**
 * Loop State - Mutable state management for the agent loop
 */

import type {
  Message,
  ToolUseBlock,
  QueryMetrics,
  CacheMetrics,
  UsageMetrics,
} from "../../types/index.js";
import type { CompactionResult, getCompactionStats } from "../context/index.js";

/**
 * Creates an initial cache metrics object
 */
export function createInitialCacheMetrics(): CacheMetrics {
  return {
    cacheHits: 0,
    cacheMisses: 0,
    totalCacheReadTokens: 0,
    totalCacheWriteTokens: 0,
    cacheHitRate: 0,
    estimatedSavingsUSD: 0,
  };
}

/**
 * LoopState class encapsulates all mutable state during the agent loop
 */
export class LoopState {
  messages: Message[];
  metrics: QueryMetrics[] = [];
  allToolsUsed: ToolUseBlock[] = [];
  totalCost = 0;
  totalDuration = 0;
  turnNumber = 0;
  previousCost = 0;
  compactionCount = 0;
  totalTokensCompacted = 0;
  cacheMetrics: CacheMetrics;

  constructor(initialMessages: Message[]) {
    this.messages = [...initialMessages];
    this.cacheMetrics = createInitialCacheMetrics();
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
    message: { content: unknown[]; stop_reason: string | null; id: string };
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
      stopReason: result.message.stop_reason as import("../../types/index.js").StopReason,
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
      content: content as import("../../types/index.js").ContentBlock[],
    });
  }

  /**
   * Add user message (tool results) to history
   */
  addUserMessage(content: import("../../types/index.js").ToolResultBlock[]): void {
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
}
