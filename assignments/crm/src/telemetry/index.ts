/**
 * Telemetry module exports
 *
 * Provides unified access to logging, metrics, and tracing.
 */

export { Logger, createLogger, logger, type LogLevel, type LogContext, type LogEntry, type LoggerConfig } from './logger.js';
export { MetricsRegistry, metrics, initializeCrmMetrics, type MetricType, type MetricLabel, type MetricValue, type MetricDefinition, type HistogramOptions } from './metrics.js';
export { Tracer, SpanHandle, tracer, createTracer, withSpan, type TraceContext, type SpanAttribute, type SpanEvent, type SpanLink, type SpanStatus, type Span, type TracerConfig } from './tracer.js';

/**
 * Combined telemetry context for a request/operation
 */
export class TelemetryContext {
  public readonly logger: ReturnType<typeof logger.child>;
  private span?: SpanHandle;
  private timer?: () => number;

  constructor(
    public readonly operation: string,
    context?: Record<string, unknown>
  ) {
    this.logger = logger.child({ operation, ...context });
  }

  /**
   * Start telemetry tracking for an operation
   */
  start(labels?: Record<string, string>): void {
    this.span = tracer.startSpan(this.operation, {
      kind: 'internal',
      attributes: Object.entries(labels ?? {}).map(([key, value]) => ({
        key,
        value,
      })),
    });
    this.timer = metrics.startTimer('operation_duration_seconds', {
      operation: this.operation,
      ...labels,
    });
  }

  /**
   * Add an event to the span
   */
  addEvent(name: string, attributes?: Record<string, unknown>): void {
    this.span?.addEvent(name, attributes as Record<string, string | number | boolean>);
  }

  /**
   * Set an attribute on the span
   */
  setAttribute(key: string, value: string | number | boolean): void {
    this.span?.setAttribute(key, value);
  }

  /**
   * Increment a metric
   */
  incrementMetric(name: string, value: number = 1, labels?: Record<string, string | number>): void {
    metrics.increment(name, value, labels ?? {});
  }

  /**
   * Mark the operation as successful and end tracking
   */
  success(message?: string): void {
    if (message) {
      this.logger.info(message);
    }
    this.span?.ok();
    this.end();
  }

  /**
   * Mark the operation as failed and end tracking
   */
  failure(error: Error | string): void {
    const err = typeof error === 'string' ? new Error(error) : error;
    this.logger.error(err.message, err);
    this.span?.recordException(err);
    this.end();
  }

  /**
   * End telemetry tracking
   */
  private end(): void {
    if (this.timer) {
      const duration = this.timer();
      this.span?.setAttribute('duration_ms', duration * 1000);
    }
    this.span?.end();
  }
}

/**
 * Create a telemetry context for an operation
 */
export function createTelemetryContext(
  operation: string,
  context?: Record<string, unknown>
): TelemetryContext {
  const ctx = new TelemetryContext(operation, context);
  ctx.start();
  return ctx;
}

/**
 * Wrap an async function with telemetry
 */
export async function withTelemetry<T>(
  operation: string,
  fn: (ctx: TelemetryContext) => Promise<T>,
  options?: {
    context?: Record<string, unknown>;
    labels?: Record<string, string>;
  }
): Promise<T> {
  const ctx = new TelemetryContext(operation, options?.context);
  ctx.start(options?.labels);

  try {
    const result = await fn(ctx);
    ctx.success();
    return result;
  } catch (error) {
    ctx.failure(error instanceof Error ? error : String(error));
    throw error;
  }
}
