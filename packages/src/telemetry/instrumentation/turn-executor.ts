/**
 * Turn Executor Instrumentation - Wraps executeTurn with telemetry
 *
 * Enhanced with:
 * - Agent behavior analytics
 * - Error analytics with root cause
 * - Performance analytics with percentiles
 * - Loop iteration tracking
 * - Decision recording
 *
 * @module telemetry/instrumentation/turn-executor
 */

import { startSpan } from "../tracer.js";
import { metrics } from "../metrics.js";
import { logger } from "../logger.js";
import { METRIC_NAMES } from "../types.js";
import type { LoopState } from "../../core/agent-loop/loop-state.js";
import type { TurnExecutorOptions, ExecuteTurnResult } from "../../core/agent-loop/turn-executor.js";

// Import enhanced analytics
import {
  getAgentAnalytics,
  type LoopStopReason,
  type DecisionType,
  type DecisionOutcome,
} from "../observability/agent-analytics.js";
import { getErrorAnalytics, type ErrorCategory } from "../observability/error-analytics.js";
import {
  getPerformanceAnalytics,
  type BottleneckType,
} from "../observability/performance-analytics.js";

// Re-export types for consumers
export type { TurnExecutorOptions, ExecuteTurnResult, LoopState };

/**
 * Import original executeTurn dynamically to avoid circular deps
 */
async function getOriginalExecuteTurn() {
  const { executeTurn } = await import("../../core/agent-loop/turn-executor.js");
  return executeTurn;
}

/**
 * Map stop reason to analytics type
 */
function mapStopReason(reason: string | undefined): LoopStopReason {
  if (!reason) return "completion_detected";
  if (reason.includes("end_turn")) return "tool_end_turn";
  if (reason.includes("max_turns")) return "max_turns";
  if (reason.includes("stop_sequence")) return "stop_sequence";
  if (reason.includes("error")) return "error";
  return "completion_detected";
}

/**
 * Categorize error for analytics
 */
function categorizeError(error: unknown): ErrorCategory {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (message.includes("rate limit")) return "api_rate_limit";
  if (message.includes("timeout")) return "api_timeout";
  if (message.includes("unauthorized") || message.includes("forbidden")) return "api_auth_error";
  if (message.includes("context") && message.includes("overflow")) return "context_overflow";
  if (message.includes("connection")) return "network_connection_failed";

  return "internal_unknown";
}

/**
 * Execute a turn with comprehensive instrumentation
 */
export async function executeInstrumentedTurn(
  state: LoopState,
  options: TurnExecutorOptions
): Promise<ExecuteTurnResult> {
  const turnNumber = state.turnNumber;

  if (!shouldInstrument()) {
    const executeTurn = await getOriginalExecuteTurn();
    return executeTurn(state, options);
  }

  const span = startSpan("coder.turn.execute", "internal");

  span
    .setAttribute("turn_number", turnNumber)
    .setAttribute("model", options.model)
    .setAttribute("session_id", options.sessionId)
    .addEvent("turn.started");

  metrics.incrementCounter(METRIC_NAMES.TURN_TOTAL, 1, {
    model: options.model,
    session_id: options.sessionId,
  });

  const startTime = performance.now();
  const turnStartTokens = state.estimatedContextTokens;

  // Record loop iteration start
  try {
    const agentAnalytics = getAgentAnalytics(options.sessionId);
    agentAnalytics.recordLoopIteration({
      turnNumber,
      startTime: Date.now(),
      inputTokens: state.currentUsage.input_tokens,
      outputTokens: state.currentUsage.output_tokens,
      toolsUsed: [],
      shouldContinue: true,
      costUSD: state.totalCost,
    });
  } catch {
    // Analytics not initialized, skip
  }

  // Record context measurement
  try {
    const agentAnalytics = getAgentAnalytics(options.sessionId);
    // Estimate context window (would be better to get from model config)
    const contextWindow = 200000;
    agentAnalytics.recordContextMeasurement(
      turnNumber,
      state.estimatedContextTokens,
      contextWindow,
      state.messages.length
    );
  } catch {
    // Analytics not initialized, skip
  }

  // Time API call with performance analytics
  let perfAnalytics: ReturnType<typeof getPerformanceAnalytics> | null = null;
  try {
    perfAnalytics = getPerformanceAnalytics(options.sessionId);
  } catch {
    // Not initialized
  }

  try {
    const executeTurn = await getOriginalExecuteTurn();

    // Use performance analytics timing if available
    let result: ExecuteTurnResult;
    if (perfAnalytics) {
      const timed = await perfAnalytics.time(
        "api.turn_latency",
        "api_latency",
        async () => executeTurn(state, options)
      );
      result = timed.result;
    } else {
      result = await executeTurn(state, options);
    }

    const duration = performance.now() - startTime;

    // Record metrics
    metrics.recordHistogram(METRIC_NAMES.TURN_DURATION_MS, duration, {
      model: options.model,
      stop_reason: result.stopReason ?? "unknown",
    });

    // Record performance metrics
    if (perfAnalytics) {
      perfAnalytics.recordTiming("turn.duration", duration, "tool_execution");
    }

    // Update loop iteration with completion data
    try {
      const agentAnalytics = getAgentAnalytics(options.sessionId);
      agentAnalytics.recordLoopIteration({
        turnNumber,
        startTime: Date.now() - duration,
        endTime: Date.now(),
        durationMs: duration,
        inputTokens: result.metrics?.usage.input_tokens ?? state.currentUsage.input_tokens,
        outputTokens: result.metrics?.usage.output_tokens ?? state.currentUsage.output_tokens,
        toolsUsed: [], // Would need to extract from result
        stopReason: mapStopReason(result.stopReason ?? undefined),
        shouldContinue: result.shouldContinue,
        costUSD: result.metrics?.costUSD ?? state.totalCost,
        continuationReason: result.shouldContinue ? "model_continuing" : (result.stopReason ?? undefined),
        productiveTurn: true, // Would need more sophisticated detection
      });
    } catch {
      // Analytics not initialized
    }

    // Record continuation decision
    try {
      const agentAnalytics = getAgentAnalytics(options.sessionId);
      agentAnalytics.recordDecision({
        turnNumber,
        type: "continuation" as DecisionType,
        context: {
          stopReason: result.stopReason,
          toolCount: 0, // Would extract from result
          messageCount: state.messages.length,
        },
        reasoning: result.shouldContinue ? "Model decided to continue" : `Stopped: ${result.stopReason}`,
        options: [{
          id: "continue",
          description: "Continue execution",
          selected: result.shouldContinue,
        }, {
          id: "stop",
          description: "Stop execution",
          selected: !result.shouldContinue,
        }],
        outcome: result.shouldContinue ? "success" as DecisionOutcome : "abort" as DecisionOutcome,
        durationMs: duration,
      });
    } catch {
      // Analytics not initialized
    }

    // Add attributes to span
    span
      .setAttributes({
        duration_ms: duration,
        should_continue: result.shouldContinue,
        stop_reason: result.stopReason ?? "none",
        message_count: state.messages.length,
      })
      .addEvent("turn.completed", {
        metrics_recorded: result.metrics !== undefined,
      })
      .setStatus("ok");

    // Log turn completion
    logger.debug("Turn completed", {
      turn_number: turnNumber,
      duration_ms: Math.round(duration),
      should_continue: result.shouldContinue,
      stop_reason: result.stopReason,
    });

    // Log metrics if available
    if (result.metrics) {
      span.setAttributes({
        input_tokens: result.metrics.usage.input_tokens,
        output_tokens: result.metrics.usage.output_tokens,
        cost_usd: result.metrics.costUSD,
      });
    }

    // Sample resources
    if (perfAnalytics) {
      perfAnalytics.sampleResources();
    }

    span.end();
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;

    // Record error in analytics
    try {
      const errorAnalytics = getErrorAnalytics();
      const errorRecord = errorAnalytics.recordError(error, {
        sessionId: options.sessionId ?? "unknown",
        turnNumber,
        operationType: "turn_execution",
      });

      // Record error performance
      if (perfAnalytics) {
        perfAnalytics.recordTiming("turn.errors", duration);
      }

      span.setAttribute("error_id", errorRecord.id);
    } catch {
      // Analytics not initialized
    }

    metrics.incrementCounter(METRIC_NAMES.TURN_ERRORS_TOTAL, 1, {
      model: options.model,
      error_type: error instanceof Error ? error.name : "unknown",
    });

    span
      .setAttribute("duration_ms", duration)
      .addEvent("turn.failed")
      .recordError(error);

    logger.error("Turn execution failed", error, {
      turn_number: turnNumber,
      duration_ms: Math.round(duration),
    });

    span.end();
    throw error;
  }
}

/**
 * Check if instrumentation should be applied
 */
function shouldInstrument(): boolean {
  return process.env.CODER_TELEMETRY_ENABLED !== "false";
}

// Re-export for backward compatibility
export { executeInstrumentedTurn as executeTurn };
