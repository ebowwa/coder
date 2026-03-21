/**
 * Session Reports
 * Generate detailed reports for sessions
 * @module telemetry/observability/reports
 */

import {
  type SessionReport,
} from "./types.js";
import type { SessionMetrics } from "../types.js";
import { getSessionMetrics } from "../instrumentation/agent-loop.js";
import { getMetricsRegistry } from "../metrics.js";
import { logger } from "../logger.js";

/**
 * Session event for timeline
 */
interface SessionEvent {
  timestamp: number;
  type: "turn" | "tool" | "error" | "api";
  name: string;
  duration?: number;
  cost?: number;
}

/**
 * Session data accumulator
 */
interface SessionAccumulator {
  startTime: number;
  endTime?: number;
  model: string;
  events: SessionEvent[];
  tools: Map<string, { count: number; durations: number[]; errors: number }>;
}

/**
 * Active session accumulators
 */
const sessionAccumulators = new Map<string, SessionAccumulator>();

/**
 * Start tracking a session for reporting
 */
export function startSessionReport(
  sessionId: string,
  model: string
): void {
  sessionAccumulators.set(sessionId, {
    startTime: Date.now(),
    model,
    events: [],
    tools: new Map(),
  });
}

/**
 * Record turn event
 */
export function recordTurnEvent(
  sessionId: string,
  data: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
    duration: number;
  }
): void {
  const acc = sessionAccumulators.get(sessionId);
  if (!acc) return;

  acc.events.push({
    timestamp: Date.now(),
    type: "turn",
    name: `Turn ${acc.events.filter((e) => e.type === "turn").length + 1}`,
    duration: data.duration,
    cost: data.cost,
  });
}

/**
 * Record tool event
 */
export function recordToolEvent(
  sessionId: string,
  toolName: string,
  duration: number,
  isError: boolean
): void {
  const acc = sessionAccumulators.get(sessionId);
  if (!acc) return;

  // Track tool stats
  const toolStats = acc.tools.get(toolName) ?? {
    count: 0,
    durations: [],
    errors: 0,
  };
  toolStats.count++;
  toolStats.durations.push(duration);
  if (isError) toolStats.errors++;
  acc.tools.set(toolName, toolStats);

  // Add event
  acc.events.push({
    timestamp: Date.now(),
    type: "tool",
    name: toolName,
    duration,
  });
}

/**
 * Record error event
 */
export function recordErrorEvent(sessionId: string, error: Error): void {
  const acc = sessionAccumulators.get(sessionId);
  if (!acc) return;

  acc.events.push({
    timestamp: Date.now(),
    type: "error",
    name: error.message,
  });
}

/**
 * Record API event
 */
export function recordApiEvent(
  sessionId: string,
  data: {
    endpoint: string;
    duration: number;
    success: boolean;
  }
): void {
  const acc = sessionAccumulators.get(sessionId);
  if (!acc) return;

  acc.events.push({
    timestamp: Date.now(),
    type: "api",
    name: data.endpoint,
    duration: data.duration,
  });
}

/**
 * End session tracking
 */
export function endSessionReport(sessionId: string): void {
  const acc = sessionAccumulators.get(sessionId);
  if (acc) {
    acc.endTime = Date.now();
  }
}

/**
 * Generate session report
 */
export function generateSessionReport(sessionId: string): SessionReport | null {
  const acc = sessionAccumulators.get(sessionId);
  const metrics = getSessionMetrics(sessionId);

  if (!acc && !metrics) {
    return null;
  }

  const startTime = acc?.startTime ?? metrics?.startTime ?? Date.now();
  const endTime = acc?.endTime ?? metrics?.endTime ?? Date.now();
  const duration = endTime - startTime;
  const model = acc?.model ?? "unknown";

  // Build tool breakdown
  const toolBreakdown: SessionReport["toolBreakdown"] = {};
  if (acc?.tools) {
    for (const [name, stats] of acc.tools) {
      toolBreakdown[name] = {
        count: stats.count,
        avgDuration: stats.durations.length > 0
          ? stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length
          : 0,
        errorCount: stats.errors,
      };
    }
  }

  // Build timeline
  const timeline: SessionReport["timeline"] = (acc?.events ?? []).map((e) => ({
    timestamp: e.timestamp,
    type: e.type,
    name: e.name,
    duration: e.duration,
    cost: e.cost,
  }));

  // Calculate costs (from metrics if available)
  const totalCostUSD = metrics?.totalCostUSD ?? 0;
  const inputTokens = metrics?.totalInputTokens ?? 0;
  const outputTokens = metrics?.totalOutputTokens ?? 0;

  // Estimate costs breakdown (rough approximation)
  const inputCostUSD = totalCostUSD * 0.3; // ~30% for input
  const outputCostUSD = totalCostUSD * 0.7; // ~70% for output
  const cacheSavingsUSD = (metrics?.totalCacheReadTokens ?? 0) * 0.000003; // ~$3 per million cached tokens

  // Generate insights
  const reportInsights: string[] = [];

  if (metrics) {
    if (metrics.avgTTFT && metrics.avgTTFT > 5000) {
      reportInsights.push("High average time to first token - consider optimizing prompts");
    }
    if (metrics.errorCount > 0) {
      reportInsights.push(`${metrics.errorCount} errors occurred during session`);
    }
    if (metrics.toolCallCount > 50) {
      reportInsights.push("High tool usage - consider batching operations");
    }
    if (totalCostUSD > 1.0) {
      reportInsights.push("Session cost exceeds $1 - monitor for efficiency");
    }
    const cacheRate = metrics.totalCacheReadTokens / (metrics.totalInputTokens || 1);
    if (cacheRate > 0.5) {
      reportInsights.push(`Good cache utilization: ${(cacheRate * 100).toFixed(0)}% of input tokens cached`);
    }
  }

  const report: SessionReport = {
    sessionId,
    startTime,
    endTime,
    duration,
    model,
    totalInputTokens: inputTokens,
    totalOutputTokens: outputTokens,
    totalCacheReadTokens: metrics?.totalCacheReadTokens ?? 0,
    totalCacheWriteTokens: metrics?.totalCacheWriteTokens ?? 0,
    totalThinkingTokens: metrics?.totalThinkingTokens ?? 0,
    totalCostUSD,
    inputCostUSD,
    outputCostUSD,
    cacheSavingsUSD,
    turnCount: metrics?.turnCount ?? acc?.events.filter((e) => e.type === "turn").length ?? 0,
    apiCallCount: metrics?.apiCallCount ?? acc?.events.filter((e) => e.type === "api").length ?? 0,
    toolCallCount: metrics?.toolCallCount ?? acc?.events.filter((e) => e.type === "tool").length ?? 0,
    errorCount: metrics?.errorCount ?? acc?.events.filter((e) => e.type === "error").length ?? 0,
    avgTTFT: metrics?.avgTTFT,
    avgLatency: metrics?.avgLatency,
    toolBreakdown,
    timeline,
    insights: reportInsights,
  };

  return report;
}

/**
 * Format session report for display
 */
export function formatSessionReport(report: SessionReport): string {
  const lines: string[] = [
    `═══════════════════════════════════════════════════════════════`,
    `  SESSION REPORT: ${report.sessionId.slice(0, 8)}...`,
    `═══════════════════════════════════════════════════════════════`,
    ``,
    `  Model: ${report.model}`,
    `  Duration: ${formatDuration(report.duration)}`,
    `  Turns: ${report.turnCount} | API Calls: ${report.apiCallCount} | Tools: ${report.toolCallCount}`,
    ``,
    `  ─── TOKENS ───`,
    `  Input:        ${formatNumber(report.totalInputTokens)}`,
    `  Output:       ${formatNumber(report.totalOutputTokens)}`,
    `  Cache Read:   ${formatNumber(report.totalCacheReadTokens)}`,
    `  Cache Write:  ${formatNumber(report.totalCacheWriteTokens)}`,
    `  Thinking:     ${formatNumber(report.totalThinkingTokens)}`,
    ``,
    `  ─── COSTS ───`,
    `  Input Cost:   $${report.inputCostUSD.toFixed(4)}`,
    `  Output Cost:  $${report.outputCostUSD.toFixed(4)}`,
    `  Total Cost:   $${report.totalCostUSD.toFixed(4)}`,
    `  Cache Saved:  $${report.cacheSavingsUSD.toFixed(4)}`,
    ``,
  ];

  // Tool breakdown
  if (Object.keys(report.toolBreakdown).length > 0) {
    lines.push(`  ─── TOOL BREAKDOWN ───`);
    for (const [name, stats] of Object.entries(report.toolBreakdown)) {
      lines.push(
        `  ${name.padEnd(20)} ${stats.count.toString().padStart(4)} calls | ` +
        `${stats.avgDuration.toFixed(0)}ms avg | ${stats.errorCount} errors`
      );
    }
    lines.push(``);
  }

  // Insights
  if (report.insights.length > 0) {
    lines.push(`  ─── INSIGHTS ───`);
    for (const insight of report.insights) {
      lines.push(`  • ${insight}`);
    }
    lines.push(``);
  }

  // Performance metrics
  if (report.avgTTFT || report.avgLatency) {
    lines.push(`  ─── PERFORMANCE ───`);
    if (report.avgTTFT) {
      lines.push(`  Avg TTFT:    ${report.avgTTFT.toFixed(0)}ms`);
    }
    if (report.avgLatency) {
      lines.push(`  Avg Latency: ${report.avgLatency.toFixed(0)}ms`);
    }
    lines.push(``);
  }

  lines.push(`═══════════════════════════════════════════════════════════════`);

  return lines.join("\n");
}

/**
 * Format duration in human-readable format
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Format number with commas
 */
function formatNumber(n: number): string {
  return n.toLocaleString();
}

/**
 * Export session report as JSON
 */
export function exportSessionReport(report: SessionReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Clear session report data
 */
export function clearSessionReport(sessionId: string): void {
  sessionAccumulators.delete(sessionId);
}

/**
 * Reports manager singleton
 */
export const reports = {
  start: startSessionReport,
  end: endSessionReport,
  recordTurn: recordTurnEvent,
  recordTool: recordToolEvent,
  recordError: recordErrorEvent,
  recordApi: recordApiEvent,
  generate: generateSessionReport,
  format: formatSessionReport,
  export: exportSessionReport,
  clear: clearSessionReport,
};

export default reports;
