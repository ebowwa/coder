/**
 * API Client Instrumentation - Wraps createMessageStream with telemetry
 * @module telemetry/instrumentation/api-client
 */

import { startSpan } from "../tracer.js";
import { metrics, getMetricsRegistry } from "../metrics.js";
import { logger } from "../logger.js";
import { METRIC_NAMES } from "../types.js";
import { DEFAULT_MODEL } from "../../core/models.js";

/**
 * Instrumented stream options
 */
export interface InstrumentedStreamOptions {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  sessionId?: string;
  parentTraceId?: string;
  onToken?: (text: string) => void;
  onThinking?: (thinking: string) => void;
  onToolUse?: (toolUse: { id: string; name: string; input: unknown }) => void;
  signal?: AbortSignal;
  [key: string]: unknown;
}

/**
 * Instrumented stream result
 */
export interface InstrumentedStreamResult {
  message: {
    id: string;
    content: unknown[];
    stop_reason: string | null;
    [key: string]: unknown;
  };
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
  cacheMetrics?: {
    cacheHits: number;
    cacheMisses: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    cacheHitRate: number;
    estimatedSavingsUSD: number;
  };
  costUSD: number;
  durationMs: number;
  ttftMs: number;
  thinkingTokens?: number;
  traceId?: string;
  spanId?: string;
}

/**
 * Get the original createMessageStream function dynamically
 */
async function getOriginalCreateMessageStream() {
  const { createMessageStream } = await import("../../core/api-client-impl.js");
  return createMessageStream;
}

/**
 * Create an instrumented message stream
 */
export async function createInstrumentedMessageStream(
  messages: unknown[],
  options: InstrumentedStreamOptions
): Promise<InstrumentedStreamResult> {
  const { model = DEFAULT_MODEL, sessionId } = options;

  // Check if telemetry is enabled
  if (!shouldInstrument()) {
    const createMessageStream = await getOriginalCreateMessageStream();
    // Cast messages to expected type - the original function will validate
    return createMessageStream(
      messages as Parameters<typeof createMessageStream>[0],
      options as Parameters<typeof createMessageStream>[1]
    );
  }

  const span = startSpan("coder.api.call", "client");

  // Set attributes
  span
    .setAttribute("model", model)
    .setAttribute("message_count", messages.length)
    .setAttribute("max_tokens", options.maxTokens ?? 4096)
    .setAttribute("session_id", sessionId)
    .addEvent("api.request.started");

  // Increment call counter
  metrics.incrementCounter(METRIC_NAMES.API_CALLS_TOTAL, 1, { model });

  const startTime = performance.now();
  let ttft = 0;

  try {
    // Wrap the onToken callback to measure TTFT
    const originalOnToken = options.onToken;
    let firstToken = true;
    const wrappedOptions = {
      ...options,
      onToken: (text: string) => {
        if (firstToken) {
          ttft = performance.now() - startTime;
          firstToken = false;
          metrics.recordHistogram(METRIC_NAMES.API_TTFT, ttft, { model });
          span.addEvent("api.first_token", { ttft_ms: ttft });
        }
        originalOnToken?.(text);
      },
    };

    const createMessageStream = await getOriginalCreateMessageStream();
    const result = await createMessageStream(
      messages as Parameters<typeof createMessageStream>[0],
      wrappedOptions as Parameters<typeof createMessageStream>[1]
    );

    const duration = performance.now() - startTime;

    // Record metrics
    metrics.recordHistogram(METRIC_NAMES.API_LATENCY, duration, { model });
    metrics.incrementCounter(METRIC_NAMES.API_TOKENS_INPUT, result.usage.input_tokens, { model });
    metrics.incrementCounter(METRIC_NAMES.API_TOKENS_OUTPUT, result.usage.output_tokens, { model });
    metrics.incrementCounter(METRIC_NAMES.API_COST_USD_TOTAL, result.costUSD, { model });

    // Cache metrics
    if (result.cacheMetrics && result.cacheMetrics.cacheHitRate > 0) {
      metrics.setGauge(METRIC_NAMES.CACHE_HIT_RATE, result.cacheMetrics.cacheHitRate, { model });
    }

    // Update session cost
    if (sessionId) {
      metrics.setGauge(METRIC_NAMES.SESSION_COST_TOTAL, result.costUSD, { session_id: sessionId });
    }

    // Add attributes to span
    span
      .setAttributes({
        input_tokens: result.usage.input_tokens,
        output_tokens: result.usage.output_tokens,
        cache_read_tokens: result.usage.cache_read_input_tokens ?? 0,
        cache_write_tokens: result.usage.cache_creation_input_tokens ?? 0,
        cost_usd: result.costUSD,
        duration_ms: duration,
        ttft_ms: ttft || result.ttftMs,
        stop_reason: result.message.stop_reason,
      })
      .addEvent("api.request.completed")
      .setStatus("ok");

    logger.debug("API call completed", {
      model,
      duration_ms: Math.round(duration),
      ttft_ms: Math.round(ttft || result.ttftMs),
      input_tokens: result.usage.input_tokens,
      output_tokens: result.usage.output_tokens,
      cost_usd: result.costUSD.toFixed(6),
    });

    const spanData = span.end();

    return {
      ...result,
      traceId: spanData.traceId,
      spanId: spanData.spanId,
    };
  } catch (error) {
    const duration = performance.now() - startTime;

    metrics.incrementCounter(METRIC_NAMES.API_ERRORS_TOTAL, 1, {
      model,
      error_type: error instanceof Error ? error.name : "unknown",
    });

    span
      .setAttribute("duration_ms", duration)
      .setAttribute("error_type", error instanceof Error ? error.name : "unknown")
      .addEvent("api.request.failed")
      .recordError(error);

    logger.error("API call failed", error, {
      model,
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

/**
 * Create a usage summary string
 */
export function createUsageSummary(result: InstrumentedStreamResult): string {
  const { usage, costUSD, durationMs, ttftMs, cacheMetrics } = result;
  const parts = [
    `${usage.input_tokens}in/${usage.output_tokens}out`,
    `${costUSD.toFixed(4)}usd`,
    `${Math.round(durationMs)}ms`,
  ];

  if (ttftMs) {
    parts.push(`ttft:${Math.round(ttftMs)}ms`);
  }

  if (cacheMetrics && cacheMetrics.cacheHitRate > 0) {
    parts.push(`cache:${cacheMetrics.cacheHitRate.toFixed(0)}%`);
  }

  return parts.join(" ");
}

// Re-export for backward compatibility
export { createInstrumentedMessageStream as createMessageStream };
