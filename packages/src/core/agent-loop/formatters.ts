/**
 * Formatters - Cost and metrics display utilities
 */

import type { QueryMetrics, CacheMetrics } from "../../schemas/index.js";

/**
 * Format cost for display
 */
export function formatCost(costUSD: number): string {
  if (costUSD < 0.01) {
    return `$${costUSD.toFixed(4)}`;
  }
  return `$${costUSD.toFixed(2)}`;
}

/**
 * Format metrics for display
 */
export function formatMetrics(metrics: QueryMetrics): string {
  const cost = formatCost(metrics.costUSD);
  const tokens = `${metrics.usage.input_tokens.toLocaleString()} input, ${metrics.usage.output_tokens.toLocaleString()} output`;

  // Include cache info if available
  if (metrics.usage.cache_read_input_tokens || metrics.usage.cache_creation_input_tokens) {
    const cacheRead = metrics.usage.cache_read_input_tokens?.toLocaleString() ?? "0";
    const cacheWrite = metrics.usage.cache_creation_input_tokens?.toLocaleString() ?? "0";
    return `Cost: ${cost} | Tokens: ${tokens} | Cache: ${cacheRead} read, ${cacheWrite} write`;
  }

  return `Cost: ${cost} | Tokens: ${tokens}`;
}

/**
 * Format brief cost for per-turn display (less verbose)
 */
export function formatCostBrief(metrics: QueryMetrics): string {
  const cost = formatCost(metrics.costUSD);
  const totalTokens = metrics.usage.input_tokens + metrics.usage.output_tokens;
  return `Cost: ${cost} | Tokens: ${totalTokens.toLocaleString()}`;
}

/**
 * Format cache metrics for display
 */
export function formatCacheMetrics(cacheMetrics: CacheMetrics): string {
  const savings = formatCost(cacheMetrics.estimatedSavingsUSD);
  const hitRate = (cacheMetrics.cacheHitRate * 100).toFixed(1);
  return `Cache: ${hitRate}% hit rate | ${cacheMetrics.totalCacheReadTokens.toLocaleString()} read | ${cacheMetrics.totalCacheWriteTokens.toLocaleString()} written | Saved: ${savings}`;
}
