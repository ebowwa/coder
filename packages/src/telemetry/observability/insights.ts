/**
 * Performance Insights
 * Analyze metrics and generate actionable insights
 * @module telemetry/observability/insights
 */

import {
  type Insight,
  type InsightCategory,
  type PerformanceAnalysis,
  InsightSchema,
} from "./types.js";
import { getMetricsRegistry } from "../metrics.js";
import { getSessionMetrics, getAllSessionSummaries } from "../instrumentation/agent-loop.js";
import { METRIC_NAMES } from "../types.js";
import { logger } from "../logger.js";

/**
 * Insight ID counter
 */
let insightIdCounter = 0;

/**
 * Generate unique insight ID
 */
function generateInsightId(): string {
  return `insight-${++insightIdCounter}-${Date.now()}`;
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)] ?? 0;
}

/**
 * Calculate performance analysis from metrics
 */
export function analyzePerformance(): PerformanceAnalysis {
  const registry = getMetricsRegistry();
  const summary = registry.getSummary();
  const exported = registry.export();

  // Extract latency data
  const latencyMetric = exported.find((m) => m.name === METRIC_NAMES.API_LATENCY);
  const latencies: number[] = [];
  if (latencyMetric?.dataPoints) {
    for (const dp of latencyMetric.dataPoints) {
      latencies.push(dp.value);
    }
  }

  // Extract TTFT data
  const ttftMetric = exported.find((m) => m.name === METRIC_NAMES.API_TTFT);
  const ttfts: number[] = [];
  if (ttftMetric?.dataPoints) {
    for (const dp of ttftMetric.dataPoints) {
      ttfts.push(dp.value);
    }
  }

  // Sort for percentiles
  latencies.sort((a, b) => a - b);
  ttfts.sort((a, b) => a - b);

  // Get counts
  const apiCalls = (summary[METRIC_NAMES.API_CALLS_TOTAL] as number) ?? 0;
  const errors = (summary[METRIC_NAMES.API_ERRORS_TOTAL] as number) ?? 0;
  const inputTokens = (summary[METRIC_NAMES.API_TOKENS_INPUT] as number) ?? 0;
  const outputTokens = (summary[METRIC_NAMES.API_TOKENS_OUTPUT] as number) ?? 0;
  const cost = (summary[METRIC_NAMES.API_COST_USD_TOTAL] as number) ?? 0;
  const cacheHitRate = (summary[METRIC_NAMES.CACHE_HIT_RATE] as number) ?? 0;

  // Calculate averages
  const avgLatency = latencies.length > 0
    ? latencies.reduce((a, b) => a + b, 0) / latencies.length
    : 0;
  const avgTTFT = ttfts.length > 0
    ? ttfts.reduce((a, b) => a + b, 0) / ttfts.length
    : 0;

  // Calculate throughput (requests per minute)
  // Assuming metrics are from last hour
  const throughput = apiCalls / 60;

  return {
    avgTTFT,
    avgLatency,
    p50Latency: percentile(latencies, 50),
    p95Latency: percentile(latencies, 95),
    p99Latency: percentile(latencies, 99),
    errorRate: apiCalls > 0 ? (errors / apiCalls) * 100 : 0,
    throughput,
    cacheHitRate: cacheHitRate * 100,
    costPerRequest: apiCalls > 0 ? cost / apiCalls : 0,
    tokensPerRequest: apiCalls > 0 ? (inputTokens + outputTokens) / apiCalls : 0,
  };
}

/**
 * Generate insights from current metrics
 */
export function generateInsights(): Insight[] {
  const insights: Insight[] = [];
  const analysis = analyzePerformance();
  const sessions = getAllSessionSummaries();

  // High latency insight
  if (analysis.p95Latency > 20000) {
    insights.push({
      id: generateInsightId(),
      category: "performance",
      title: "High API Latency Detected",
      description: `P95 latency is ${(analysis.p95Latency / 1000).toFixed(1)}s, which may indicate network issues or API overload.`,
      impact: analysis.p95Latency > 30000 ? "high" : "medium",
      recommendation: "Consider reducing request complexity or implementing request batching.",
      metrics: {
        p95Latency: analysis.p95Latency,
        avgLatency: analysis.avgLatency,
      },
      timestamp: Date.now(),
    });
  }

  // High TTFT insight
  if (analysis.avgTTFT > 5000) {
    insights.push({
      id: generateInsightId(),
      category: "performance",
      title: "Slow Time to First Token",
      description: `Average TTFT is ${(analysis.avgTTFT / 1000).toFixed(1)}s, impacting user experience.`,
      impact: analysis.avgTTFT > 10000 ? "high" : "medium",
      recommendation: "Consider using streaming responses or reducing prompt size.",
      metrics: {
        avgTTFT: analysis.avgTTFT,
      },
      timestamp: Date.now(),
    });
  }

  // High error rate insight
  if (analysis.errorRate > 5) {
    insights.push({
      id: generateInsightId(),
      category: "error",
      title: "High Error Rate Detected",
      description: `Error rate is ${analysis.errorRate.toFixed(1)}%, which is above normal thresholds.`,
      impact: analysis.errorRate > 10 ? "high" : "medium",
      recommendation: "Review error logs and implement retry logic with exponential backoff.",
      metrics: {
        errorRate: analysis.errorRate,
      },
      timestamp: Date.now(),
    });
  }

  // Low cache hit rate insight
  if (analysis.cacheHitRate < 30 && analysis.costPerRequest > 0.01) {
    insights.push({
      id: generateInsightId(),
      category: "cost",
      title: "Low Cache Hit Rate",
      description: `Cache hit rate is ${analysis.cacheHitRate.toFixed(1)}%, missing potential cost savings.`,
      impact: "medium",
      recommendation: "Enable prompt caching for repeated system prompts and context.",
      metrics: {
        cacheHitRate: analysis.cacheHitRate,
        costPerRequest: analysis.costPerRequest,
      },
      timestamp: Date.now(),
    });
  }

  // High cost per request insight
  if (analysis.costPerRequest > 0.10) {
    insights.push({
      id: generateInsightId(),
      category: "cost",
      title: "High Cost Per Request",
      description: `Average cost per request is $${analysis.costPerRequest.toFixed(4)}, which may indicate inefficient prompts.`,
      impact: analysis.costPerRequest > 0.50 ? "high" : "medium",
      recommendation: "Review prompt sizes and consider using smaller models for simple tasks.",
      metrics: {
        costPerRequest: analysis.costPerRequest,
        tokensPerRequest: analysis.tokensPerRequest,
      },
      timestamp: Date.now(),
    });
  }

  // Token efficiency insight
  if (analysis.tokensPerRequest > 10000) {
    insights.push({
      id: generateInsightId(),
      category: "optimization",
      title: "High Token Usage Per Request",
      description: `Average ${Math.round(analysis.tokensPerRequest)} tokens per request may indicate verbose prompts.`,
      impact: "medium",
      recommendation: "Review and optimize prompts. Use context compaction for long conversations.",
      metrics: {
        tokensPerRequest: analysis.tokensPerRequest,
      },
      timestamp: Date.now(),
    });
  }

  // Session insights
  if (sessions.length > 0) {
    const totalCost = sessions.reduce((sum, s) => sum + s.totalCostUSD, 0);
    const avgCost = totalCost / sessions.length;
    const totalTurns = sessions.reduce((sum, s) => sum + s.turnCount, 0);
    const avgTurns = totalTurns / sessions.length;

    if (avgCost > 1.0) {
      insights.push({
        id: generateInsightId(),
        category: "cost",
        title: "High Average Session Cost",
        description: `Average session cost is $${avgCost.toFixed(2)} across ${sessions.length} sessions.`,
        impact: avgCost > 5.0 ? "high" : "medium",
        recommendation: "Monitor session costs and set budget limits for expensive operations.",
        metrics: {
          avgSessionCost: avgCost,
          totalSessions: sessions.length,
          totalCost,
        },
        timestamp: Date.now(),
      });
    }

    if (avgTurns > 20) {
      insights.push({
        id: generateInsightId(),
        category: "usage",
        title: "Long Sessions Detected",
        description: `Average session has ${avgTurns.toFixed(0)} turns, which may indicate complex tasks or inefficient solutions.`,
        impact: "low",
        recommendation: "Consider breaking down complex tasks or improving prompt efficiency.",
        metrics: {
          avgTurns,
          totalSessions: sessions.length,
        },
        timestamp: Date.now(),
      });
    }
  }

  return insights;
}

/**
 * Get insights for a specific category
 */
export function getInsightsByCategory(category: InsightCategory): Insight[] {
  const allInsights = generateInsights();
  return allInsights.filter((i) => i.category === category);
}

/**
 * Get high-impact insights
 */
export function getHighImpactInsights(): Insight[] {
  const allInsights = generateInsights();
  return allInsights.filter((i) => i.impact === "high");
}

/**
 * Format insight for display
 */
export function formatInsight(insight: Insight): string {
  const icon = insight.impact === "high" ? "🔴" : insight.impact === "medium" ? "🟡" : "🟢";
  const lines = [
    `${icon} [${insight.category.toUpperCase()}] ${insight.title}`,
    `  ${insight.description}`,
    `  → ${insight.recommendation}`,
  ];

  if (insight.metrics) {
    const metricsStr = Object.entries(insight.metrics)
      .map(([k, v]) => `${k}=${typeof v === "number" ? v.toFixed(2) : v}`)
      .join(", ");
    lines.push(`  Metrics: ${metricsStr}`);
  }

  return lines.join("\n");
}

/**
 * Insights manager singleton
 */
export const insights = {
  analyze: analyzePerformance,
  generate: generateInsights,
  getByCategory: getInsightsByCategory,
  getHighImpact: getHighImpactInsights,
  format: formatInsight,
};

export default insights;
