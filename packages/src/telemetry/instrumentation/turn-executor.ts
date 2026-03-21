/**
 * Turn Executor Instrumentation - Wraps executeTurn with telemetry
 * @module telemetry/instrumentation/turn-executor
 */

import { startSpan } from "../tracer.js";
import { metrics } from "../metrics.js";
import { logger } from "../logger.js";
import { METRIC_NAMES } from "../types.js";
import type { LoopState } from "../../core/agent-loop/loop-state.js";
import type { TurnExecutorOptions, ExecuteTurnResult } from "../../core/agent-loop/turn-executor.js";

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
 * Execute a turn with instrumentation
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

  try {
    const executeTurn = await getOriginalExecuteTurn();
    const result = await executeTurn(state, options);

    const duration = performance.now() - startTime;

    // Record metrics
    metrics.recordHistogram(METRIC_NAMES.TURN_DURATION_MS, duration, {
      model: options.model,
      stop_reason: result.stopReason ?? "unknown",
    });

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

    span.end();
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;

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
