/**
 * Tracer module for CRM system
 *
 * Provides distributed tracing support with spans and trace context.
 * Can export traces in OpenTelemetry-compatible format.
 */

import { randomUUID } from 'crypto';

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  sampled: boolean;
}

export interface SpanAttribute {
  key: string;
  value: string | number | boolean | string[] | number[];
}

export interface SpanEvent {
  timestamp: number;
  name: string;
  attributes?: SpanAttribute[];
}

export interface SpanLink {
  traceId: string;
  spanId: string;
  attributes?: SpanAttribute[];
}

export interface SpanStatus {
  code: 'ok' | 'error' | 'unset';
  message?: string;
}

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: 'internal' | 'server' | 'client' | 'producer' | 'consumer';
  startTime: number;
  endTime?: number;
  duration?: number;
  attributes: SpanAttribute[];
  events: SpanEvent[];
  links: SpanLink[];
  status: SpanStatus;
}

export interface TracerConfig {
  serviceName: string;
  serviceVersion: string;
  samplingRate: number; // 0.0 to 1.0
  maxEventsPerSpan: number;
  maxAttributesPerSpan: number;
}

/**
 * Tracer for creating and managing spans
 */
export class Tracer {
  private readonly config: TracerConfig;
  private readonly spans: Span[] = [];
  private activeSpans: Map<string, Span> = new Map();

  constructor(config: Partial<TracerConfig> & { serviceName: string }) {
    this.config = {
      serviceVersion: '0.1.0',
      samplingRate: 1.0,
      maxEventsPerSpan: 128,
      maxAttributesPerSpan: 128,
      ...config,
    };
  }

  /**
   * Start a new span
   */
  startSpan(
    name: string,
    options?: {
      kind?: Span['kind'];
      parent?: TraceContext | Span;
      attributes?: SpanAttribute[];
      links?: SpanLink[];
    }
  ): SpanHandle {
    const traceId = options?.parent
      ? ('traceId' in options.parent ? options.parent.traceId : options.parent.traceId)
      : this.generateTraceId();

    const spanId = this.generateSpanId();
    const parentSpanId = options?.parent
      ? ('spanId' in options.parent ? options.parent.spanId : options.parent.spanId)
      : undefined;

    const sampled = Math.random() < this.config.samplingRate;

    const span: Span = {
      traceId,
      spanId,
      parentSpanId,
      name,
      kind: options?.kind ?? 'internal',
      startTime: Date.now(),
      attributes: options?.attributes ?? [],
      events: [],
      links: options?.links ?? [],
      status: { code: 'unset' },
    };

    this.activeSpans.set(spanId, span);

    return new SpanHandle(span, this, sampled);
  }

  /**
   * Start a span from HTTP headers
   */
  startSpanFromHeaders(
    name: string,
    headers: Record<string, string>,
    options?: {
      kind?: Span['kind'];
      attributes?: SpanAttribute[];
    }
  ): SpanHandle {
    const traceparent = headers['traceparent'] || headers['Traceparent'];
    let parentContext: TraceContext | undefined;

    if (traceparent) {
      const parsed = this.parseTraceParent(traceparent);
      if (parsed) {
        parentContext = parsed;
      }
    }

    return this.startSpan(name, {
      ...options,
      parent: parentContext,
    });
  }

  /**
   * Create a child span from a parent span
   */
  startChildSpan(parent: Span | SpanHandle, name: string, options?: {
    kind?: Span['kind'];
    attributes?: SpanAttribute[];
  }): SpanHandle {
    const parentSpan = 'span' in parent ? parent.span : parent;
    return this.startSpan(name, {
      ...options,
      parent: parentSpan,
    });
  }

  /**
   * Get trace context from a span
   */
  getTraceContext(span: Span | SpanHandle): TraceContext {
    const s = 'span' in span ? span.span : span;
    return {
      traceId: s.traceId,
      spanId: s.spanId,
      parentSpanId: s.parentSpanId,
      sampled: true,
    };
  }

  /**
   * Get all completed spans
   */
  getSpans(): Span[] {
    return [...this.spans];
  }

  /**
   * Get spans by trace ID
   */
  getSpansByTraceId(traceId: string): Span[] {
    return this.spans.filter(s => s.traceId === traceId);
  }

  /**
   * Export spans in OpenTelemetry format
   */
  exportOpenTelemetry(): {
    resourceSpans: {
      resource: {
        attributes: { key: string; value: { stringValue: string } }[];
      };
      scopeSpans: {
        scope: { name: string; version: string };
        spans: {
          traceId: string;
          spanId: string;
          parentSpanId?: string;
          name: string;
          kind: number;
          startTimeUnixNano: string;
          endTimeUnixNano: string;
          attributes: { key: string; value: { stringValue?: string; intValue?: string } }[];
          status: { code: number; message?: string };
        }[];
      }[];
    }[];
  } {
    const spans = this.spans.map(span => ({
      traceId: span.traceId,
      spanId: span.spanId,
      parentSpanId: span.parentSpanId,
      name: span.name,
      kind: this.spanKindToNumber(span.kind),
      startTimeUnixNano: (span.startTime * 1e6).toString(),
      endTimeUnixNano: span.endTime ? (span.endTime * 1e6).toString() : '0',
      attributes: span.attributes.map(attr => ({
        key: attr.key,
        value: typeof attr.value === 'string'
          ? { stringValue: attr.value }
          : { intValue: String(attr.value) },
      })),
      status: {
        code: span.status.code === 'ok' ? 1 : span.status.code === 'error' ? 2 : 0,
        message: span.status.message,
      },
    }));

    return {
      resourceSpans: [{
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: this.config.serviceName } },
            { key: 'service.version', value: { stringValue: this.config.serviceVersion } },
          ],
        },
        scopeSpans: [{
          scope: {
            name: this.config.serviceName,
            version: this.config.serviceVersion,
          },
          spans,
        }],
      }],
    };
  }

  /**
   * Clear all spans
   */
  clear(): void {
    this.spans.length = 0;
    this.activeSpans.clear();
  }

  /**
   * Internal: End a span
   */
  endSpan(span: Span): void {
    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    this.activeSpans.delete(span.spanId);
    this.spans.push(span);
  }

  /**
   * Internal: Add event to span
   */
  addEvent(span: Span, name: string, attributes?: SpanAttribute[]): void {
    if (span.events.length < this.config.maxEventsPerSpan) {
      span.events.push({
        timestamp: Date.now(),
        name,
        attributes,
      });
    }
  }

  /**
   * Internal: Set attribute on span
   */
  setAttribute(span: Span, key: string, value: SpanAttribute['value']): void {
    if (span.attributes.length < this.config.maxAttributesPerSpan) {
      const existing = span.attributes.findIndex(a => a.key === key);
      if (existing >= 0) {
        span.attributes[existing].value = value;
      } else {
        span.attributes.push({ key, value });
      }
    }
  }

  /**
   * Internal: Set span status
   */
  setStatus(span: Span, code: SpanStatus['code'], message?: string): void {
    span.status = { code, message };
  }

  private generateTraceId(): string {
    return randomUUID().replace(/-/g, '');
  }

  private generateSpanId(): string {
    return randomUUID().replace(/-/g, '').slice(0, 16);
  }

  private parseTraceParent(header: string): TraceContext | null {
    // Parse W3C Trace Context format: version-traceid-spanid-flags
    const match = header.match(/^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i);
    if (!match) return null;

    return {
      traceId: match[2],
      spanId: match[3],
      sampled: match[4] === '01',
    };
  }

  private spanKindToNumber(kind: Span['kind']): number {
    switch (kind) {
      case 'internal': return 1;
      case 'server': return 2;
      case 'client': return 3;
      case 'producer': return 4;
      case 'consumer': return 5;
      default: return 1;
    }
  }
}

/**
 * Handle to an active span
 */
export class SpanHandle {
  private ended = false;

  constructor(
    public readonly span: Span,
    private readonly tracer: Tracer,
    public readonly sampled: boolean
  ) {}

  /**
   * Set an attribute on the span
   */
  setAttribute(key: string, value: SpanAttribute['value']): this {
    if (!this.ended) {
      this.tracer.setAttribute(this.span, key, value);
    }
    return this;
  }

  /**
   * Set multiple attributes
   */
  setAttributes(attributes: Record<string, SpanAttribute['value']>): this {
    for (const [key, value] of Object.entries(attributes)) {
      this.setAttribute(key, value);
    }
    return this;
  }

  /**
   * Add an event to the span
   */
  addEvent(name: string, attributes?: Record<string, SpanAttribute['value']>): this {
    if (!this.ended) {
      const attrs = attributes
        ? Object.entries(attributes).map(([key, value]) => ({ key, value }))
        : undefined;
      this.tracer.addEvent(this.span, name, attrs);
    }
    return this;
  }

  /**
   * Set span status to OK
   */
  ok(): this {
    if (!this.ended) {
      this.tracer.setStatus(this.span, 'ok');
    }
    return this;
  }

  /**
   * Set span status to error
   */
  error(message?: string): this {
    if (!this.ended) {
      this.tracer.setStatus(this.span, 'error', message);
    }
    return this;
  }

  /**
   * Record an exception
   */
  recordException(error: Error): this {
    if (!this.ended) {
      this.addEvent('exception', {
        'exception.type': error.name,
        'exception.message': error.message,
        'exception.stacktrace': error.stack ?? '',
      });
      this.error(error.message);
    }
    return this;
  }

  /**
   * End the span
   */
  end(): void {
    if (!this.ended) {
      this.tracer.endSpan(this.span);
      this.ended = true;
    }
  }

  /**
   * Create traceparent header value for propagation
   */
  toTraceParent(): string {
    const flags = this.sampled ? '01' : '00';
    return `00-${this.span.traceId}-${this.span.spanId}-${flags}`;
  }

  /**
   * Get trace context for propagation
   */
  getContext(): TraceContext {
    return {
      traceId: this.span.traceId,
      spanId: this.span.spanId,
      parentSpanId: this.span.parentSpanId,
      sampled: this.sampled,
    };
  }
}

/**
 * Default tracer instance
 */
export const tracer = new Tracer({
  serviceName: 'crm',
  serviceVersion: '0.1.0',
});

/**
 * Create a new tracer instance
 */
export function createTracer(config: Partial<TracerConfig> & { serviceName: string }): Tracer {
  return new Tracer(config);
}

/**
 * Helper: Run a function within a span
 */
export async function withSpan<T>(
  name: string,
  fn: (span: SpanHandle) => Promise<T>,
  options?: {
    kind?: Span['kind'];
    parent?: Span | SpanHandle;
    attributes?: SpanAttribute[];
  }
): Promise<T> {
  const span = tracer.startSpan(name, options);
  try {
    const result = await fn(span);
    span.ok();
    return result;
  } catch (error) {
    if (error instanceof Error) {
      span.recordException(error);
    }
    throw error;
  } finally {
    span.end();
  }
}
