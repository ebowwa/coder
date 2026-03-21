/**
 * Agent Loop Instrumentation - Session lifecycle telemetry
 * @module telemetry/instrumentation/agent-loop
 */

import { startSpan, type SpanBuilder, generateTraceId } from "../tracer.js";
import { metrics, getMetricsRegistry } from "../metrics.js";
import { logger } from "../logger.js";
import { METRIC_NAMES, type SessionMetrics } from "../types.js";

/**
 * Session context for telemetry
 */
export interface SessionTelemetryContext {
  sessionId: string;
  traceId: string;
  startTime: number;
  model: string;
}

/**
 * Active sessions map
 */
const activeSessions = new Map<string, SessionTelemetryContext>();

/**
 * Session metrics accumulator
 */
const sessionMetrics = new Map<string, SessionMetrics>();

/**
 * Start session telemetry
 */
export function startSessionTelemetry(
  sessionId: string,
  model: string,
  workingDirectory: string
): SessionTelemetryContext {
  const traceId = generateTraceId();
  const startTime = Date.now();

  const context: SessionTelemetryContext = {
    sessionId,
    traceId,
    startTime,
    model,
  };

  activeSessions.set(sessionId, context);

  // Initialize session metrics
  sessionMetrics.set(sessionId, {
    sessionId,
    startTime,
    turnCount: 0,
    totalCostUSD: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCacheReadTokens: 0,
    totalCacheWriteTokens: 0,
    totalThinkingTokens: 0,
    apiCallCount: 0,
    toolCallCount: 0,
    errorCount: 0,
  });

  const span = startSpan("coder.session.start", "internal");
  span
    .setAttribute("session_id", sessionId)
    .setAttribute("trace_id", traceId)
    .setAttribute("model", model)
    .setAttribute("working_directory", workingDirectory)
    .addEvent("session.started")
    .setStatus("ok");
  span.end();

  logger.info("Session started", {
    session_id: sessionId,
    model,
    working_directory: workingDirectory,
  });

  return context;
}

/**
 * End session telemetry
 */
export function endSessionTelemetry(sessionId: string): SessionMetrics | undefined {
  const context = activeSessions.get(sessionId);
  const metrics = sessionMetrics.get(sessionId);

  if (!context || !metrics) {
    return undefined;
  }

  const endTime = Date.now();
  const duration = endTime - context.startTime;

  // Finalize metrics
  metrics.endTime = endTime;

  const span = startSpan("coder.session.end", "internal");
  span
    .setAttribute("session_id", sessionId)
    .setAttribute("trace_id", context.traceId)
    .setAttribute("duration_ms", duration)
    .setAttribute("turn_count", metrics.turnCount)
    .setAttribute("total_cost_usd", metrics.totalCostUSD)
    .setAttribute("total_tokens", metrics.totalInputTokens + metrics.totalOutputTokens)
    .addEvent("session.ended")
    .setStatus("ok");
  span.end();

  logger.info("Session ended", {
    session_id: sessionId,
    duration_ms: Math.round(duration),
    turn_count: metrics.turnCount,
    total_cost_usd: metrics.totalCostUSD.toFixed(4),
    api_calls: metrics.apiCallCount,
    tool_calls: metrics.toolCallCount,
    errors: metrics.errorCount,
  });

  // Clean up
  activeSessions.delete(sessionId);
  sessionMetrics.delete(sessionId);

  return metrics;
}

/**
 * Record turn metrics for session
 */
export function recordTurnMetrics(
  sessionId: string,
  data: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
    thinkingTokens?: number;
    costUSD: number;
    ttft?: number;
    latency?: number;
  }
): void {
  const session = sessionMetrics.get(sessionId);
  if (!session) return;

  session.turnCount++;
  session.totalInputTokens += data.inputTokens;
  session.totalOutputTokens += data.outputTokens;
  session.totalCacheReadTokens += data.cacheReadTokens ?? 0;
  session.totalCacheWriteTokens += data.cacheWriteTokens ?? 0;
  session.totalThinkingTokens += data.thinkingTokens ?? 0;
  session.totalCostUSD += data.costUSD;
  session.apiCallCount++;

  // Update averages
  if (data.ttft !== undefined) {
    session.avgTTFT = session.avgTTFT
      ? (session.avgTTFT * (session.apiCallCount - 1) + data.ttft) / session.apiCallCount
      : data.ttft;
  }

  if (data.latency !== undefined) {
    session.avgLatency = session.avgLatency
      ? (session.avgLatency * (session.apiCallCount - 1) + data.latency) / session.apiCallCount
      : data.latency;
  }

  // Update gauge
  metrics.setGauge(METRIC_NAMES.SESSION_COST_TOTAL, session.totalCostUSD, {
    session_id: sessionId,
  });
}

/**
 * Record tool call for session
 */
export function recordToolCall(sessionId: string, toolName: string): void {
  const session = sessionMetrics.get(sessionId);
  if (!session) return;

  session.toolCallCount++;
}

/**
 * Record error for session
 */
export function recordSessionError(sessionId: string): void {
  const session = sessionMetrics.get(sessionId);
  if (!session) return;

  session.errorCount++;
}

/**
 * Get session context
 */
export function getSessionContext(sessionId: string): SessionTelemetryContext | undefined {
  return activeSessions.get(sessionId);
}

/**
 * Get session metrics
 */
export function getSessionMetrics(sessionId: string): SessionMetrics | undefined {
  return sessionMetrics.get(sessionId);
}

/**
 * Get all active sessions
 */
export function getActiveSessions(): string[] {
  return Array.from(activeSessions.keys());
}

/**
 * Get summary of all sessions
 */
export function getAllSessionSummaries(): SessionMetrics[] {
  return Array.from(sessionMetrics.values());
}
