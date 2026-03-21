/**
 * Tracer - Span/trace management (OpenTelemetry-compatible)
 * @module telemetry/tracer
 */

import type { Span, SpanEvent, SpanKind, SpanStatus, TelemetryConfig } from "./types.js";
import { getConfig, shouldSample } from "./config.js";
import { getMetricsRegistry } from "./metrics.js";

/**
 * Generate a random hex ID
 */
function generateId(length: number): string {
  const bytes = new Uint8Array(length / 2);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generate trace ID (32 hex chars = 16 bytes)
 */
export function generateTraceId(): string {
  return generateId(32);
}

/**
 * Generate span ID (16 hex chars = 8 bytes)
 */
export function generateSpanId(): string {
  return generateId(16);
}

/**
 * Active span context
 */
interface SpanContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
}

/**
 * Global active span stack (per-async-context would be better but this works for simple cases)
 */
const activeSpanStack: Span[] = [];

/**
 * Get the currently active span
 */
export function getActiveSpan(): Span | undefined {
  return activeSpanStack[activeSpanStack.length - 1];
}

/**
 * Get the active span context (for creating child spans)
 */
export function getActiveContext(): SpanContext | undefined {
  const span = getActiveSpan();
  if (!span) return undefined;
  return {
    traceId: span.traceId,
    spanId: span.spanId,
    parentSpanId: span.parentSpanId,
  };
}

/**
 * SpanBuilder - Fluent interface for building spans
 */
export class SpanBuilder {
  private span: Span;
  private startTime: number;
  private config: TelemetryConfig;

  constructor(
    name: string,
    kind: SpanKind = "internal",
    parentContext?: SpanContext
  ) {
    this.config = getConfig();
    this.startTime = performance.now();

    const now = Date.now();
    this.span = {
      traceId: parentContext?.traceId ?? generateTraceId(),
      spanId: generateSpanId(),
      parentSpanId: parentContext?.spanId,
      name,
      kind,
      startTime: now,
      status: "unset",
      attributes: {},
      events: [],
    };
  }

  /**
   * Set an attribute on the span
   */
  setAttribute(key: string, value: unknown): this {
    this.span.attributes[key] = value;
    return this;
  }

  /**
   * Set multiple attributes
   */
  setAttributes(attrs: Record<string, unknown>): this {
    Object.assign(this.span.attributes, attrs);
    return this;
  }

  /**
   * Add an event to the span
   */
  addEvent(name: string, attributes?: Record<string, unknown>): this {
    const event: SpanEvent = {
      name,
      timestamp: Date.now(),
      attributes,
    };
    this.span.events.push(event);
    return this;
  }

  /**
   * Set span status
   */
  setStatus(status: SpanStatus, message?: string): this {
    this.span.status = status;
    if (message) {
      this.span.statusMessage = message;
    }
    return this;
  }

  /**
   * Record an error on the span
   */
  recordError(error: Error | unknown): this {
    this.span.status = "error";
    if (error instanceof Error) {
      this.span.statusMessage = error.message;
      this.addEvent("exception", {
        "exception.type": error.name,
        "exception.message": error.message,
        "exception.stacktrace": this.config.includeStackTrace ? error.stack : undefined,
      });
    } else {
      this.span.statusMessage = String(error);
    }
    return this;
  }

  /**
   * Start the span (push to active stack)
   */
  start(): this {
    if (this.config.tracingEnabled && shouldSample()) {
      activeSpanStack.push(this.span);
    }
    return this;
  }

  /**
   * End the span (pop from stack and record)
   */
  end(): Span {
    this.span.endTime = Date.now();
    const durationMs = performance.now() - this.startTime;

    // Pop from active stack
    const idx = activeSpanStack.indexOf(this.span);
    if (idx >= 0) {
      activeSpanStack.splice(idx, 1);
    }

    // Record metrics
    if (this.config.metricsEnabled) {
      const metrics = getMetricsRegistry();
      metrics.recordHistogram("coder.span.duration_ms", durationMs, {
        span_name: this.span.name,
        span_kind: this.span.kind,
        status: this.span.status,
      });
    }

    return this.span;
  }

  /**
   * Get the span without ending it
   */
  getSpan(): Span {
    return this.span;
  }

  /**
   * Get the span context
   */
  getContext(): SpanContext {
    return {
      traceId: this.span.traceId,
      spanId: this.span.spanId,
      parentSpanId: this.span.parentSpanId,
    };
  }
}

/**
 * Create a new span builder
 */
export function createSpan(name: string, kind: SpanKind = "internal"): SpanBuilder {
  const parentContext = getActiveContext();
  return new SpanBuilder(name, kind, parentContext);
}

/**
 * Start a span (convenience method)
 */
export function startSpan(name: string, kind: SpanKind = "internal"): SpanBuilder {
  return createSpan(name, kind).start();
}

/**
 * Wrap an async function in a span
 */
export async function withSpan<T>(
  name: string,
  fn: (span: SpanBuilder) => Promise<T>,
  kind: SpanKind = "internal"
): Promise<T> {
  const span = startSpan(name, kind);
  try {
    const result = await fn(span);
    span.setStatus("ok");
    return result;
  } catch (error) {
    span.recordError(error);
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Wrap a sync function in a span
 */
export function withSpanSync<T>(
  name: string,
  fn: (span: SpanBuilder) => T,
  kind: SpanKind = "internal"
): T {
  const span = startSpan(name, kind);
  try {
    const result = fn(span);
    span.setStatus("ok");
    return result;
  } catch (error) {
    span.recordError(error);
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Trace context for propagation
 */
export interface TraceContext {
  traceId: string;
  spanId: string;
  traceFlags?: number;
}

/**
 * Extract trace context from headers
 */
export function extractTraceContext(headers: Record<string, string>): TraceContext | undefined {
  const traceparent = headers["traceparent"];
  if (!traceparent) return undefined;

  // Parse W3C traceparent format: version-traceId-spanId-flags
  const parts = traceparent.split("-");
  if (parts.length < 3) return undefined;

  const [, traceId, spanId, flags] = parts;
  if (!traceId || !spanId) return undefined;

  return {
    traceId,
    spanId,
    traceFlags: flags ? parseInt(flags, 16) : undefined,
  };
}

/**
 * Inject trace context into headers
 */
export function injectTraceContext(context: TraceContext, headers: Record<string, string>): void {
  // W3C traceparent format: version-traceId-spanId-flags
  const traceparent = `00-${context.traceId}-${context.spanId}-${(context.traceFlags ?? 1).toString(16).padStart(2, "0")}`;
  headers["traceparent"] = traceparent;
}
