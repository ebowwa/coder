/**
 * OTLP Exporter - OpenTelemetry Protocol (production)
 * @module telemetry/exporters/otlp
 */

import type { Span, Metric, LogEntry, TelemetryConfig } from "../types.js";
import { getConfig } from "../config.js";

/**
 * OTLP Exporter - Sends telemetry to OpenTelemetry collector
 */
export class OTLPExporter {
  private config: TelemetryConfig;
  private endpoint: string;
  private buffer: {
    spans: Array<{ type: "span"; timestamp: string; data: Span }>;
    metrics: Array<{ type: "metric"; timestamp: string; data: Metric }>;
    logs: Array<{ type: "log"; timestamp: string; data: LogEntry }>;
  };
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private headers: Record<string, string>;

  constructor(config?: TelemetryConfig) {
    this.config = config ?? getConfig();
    this.endpoint = this.config.otlpEndpoint ?? "http://localhost:4318";
    this.buffer = { spans: [], metrics: [], logs: [] };
    this.headers = {
      "Content-Type": "application/json",
    };

    if (this.config.enabled) {
      this.init();
    }
  }

  /**
   * Initialize the exporter
   */
  private init(): void {
    // Set up periodic flush
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushIntervalMs);
  }

  /**
   * Export a span
   */
  exportSpan(span: Span): void {
    if (!this.config.enabled || !this.config.tracingEnabled) return;

    this.buffer.spans.push({
      type: "span",
      timestamp: new Date().toISOString(),
      data: span,
    });
    this.checkFlush();
  }

  /**
   * Export a metric
   */
  exportMetric(metric: Metric): void {
    if (!this.config.enabled || !this.config.metricsEnabled) return;

    this.buffer.metrics.push({
      type: "metric",
      timestamp: new Date().toISOString(),
      data: metric,
    });
    this.checkFlush();
  }

  /**
   * Export a log entry
   */
  exportLog(entry: LogEntry): void {
    if (!this.config.enabled) return;

    this.buffer.logs.push({
      type: "log",
      timestamp: entry.timestamp,
      data: entry,
    });
    this.checkFlush();
  }

  /**
   * Export multiple spans
   */
  exportSpans(spans: Span[]): void {
    for (const span of spans) {
      this.exportSpan(span);
    }
  }

  /**
   * Export multiple metrics
   */
  exportMetrics(metrics: Metric[]): void {
    for (const metric of metrics) {
      this.exportMetric(metric);
    }
  }

  /**
   * Export multiple logs
   */
  exportLogs(entries: LogEntry[]): void {
    for (const entry of entries) {
      this.exportLog(entry);
    }
  }

  /**
   * Check if buffer should be flushed
   */
  private checkFlush(): void {
    const totalSize = this.buffer.spans.length + this.buffer.metrics.length + this.buffer.logs.length;
    if (totalSize >= this.config.batchSize) {
      this.flush();
    }
  }

  /**
   * Flush buffer to OTLP endpoint
   */
  async flush(): Promise<void> {
    const { spans, metrics, logs } = this.buffer;
    if (spans.length === 0 && metrics.length === 0 && logs.length === 0) return;

    // Reset buffer
    this.buffer = { spans: [], metrics: [], logs: [] };

    try {
      // Send traces
      if (spans.length > 0) {
        await this.sendTraces(spans.map((s) => this.convertSpan(s.data)));
      }

      // Send metrics
      if (metrics.length > 0) {
        await this.sendMetrics(metrics.map((m) => this.convertMetric(m.data)));
      }

      // Send logs
      if (logs.length > 0) {
        await this.sendLogs(logs.map((l) => this.convertLog(l.data)));
      }
    } catch (error) {
      console.error(`[Telemetry] OTLP export error: ${error}`);
    }
  }

  /**
   * Convert span to OTLP format
   */
  private convertSpan(span: Span): OTLPSpan {
    return {
      traceId: span.traceId,
      spanId: span.spanId,
      parentSpanId: span.parentSpanId,
      name: span.name,
      kind: span.kind === "internal" ? 1 : span.kind === "client" ? 2 : span.kind === "server" ? 3 : 1,
      startTimeUnixNano: span.startTime * 1_000_000,
      endTimeUnixNano: span.endTime ? span.endTime * 1_000_000 : undefined,
      status: {
        code: span.status === "ok" ? 1 : span.status === "error" ? 2 : 0,
        message: span.statusMessage,
      },
      attributes: Object.entries(span.attributes).map(([k, v]) => ({
        key: k,
        value: { stringValue: String(v) },
      })),
      events: span.events.map((e) => ({
        timeUnixNano: e.timestamp * 1_000_000,
        name: e.name,
        attributes: e.attributes
          ? Object.entries(e.attributes).map(([k, v]) => ({
              key: k,
              value: { stringValue: String(v) },
            }))
          : [],
      })),
    };
  }

  /**
   * Convert metric to OTLP format
   */
  private convertMetric(metric: Metric): OTLPMetric {
    return {
      name: metric.name,
      description: metric.description,
      unit: metric.unit,
      data: {
        dataPoints: metric.dataPoints.map((dp) => ({
          timeUnixNano: dp.timestamp * 1_000_000,
          asDouble: dp.value,
          attributes: dp.attributes
            ? Object.entries(dp.attributes).map(([k, v]) => ({
                key: k,
                value: { stringValue: String(v) },
              }))
            : [],
        })),
      },
    };
  }

  /**
   * Convert log to OTLP format
   */
  private convertLog(entry: LogEntry): OTLPLog {
    return {
      timeUnixNano: new Date(entry.timestamp).getTime() * 1_000_000,
      severityNumber: this.getSeverityNumber(entry.level),
      severityText: entry.level,
      body: { stringValue: entry.message },
      attributes: entry.context
        ? Object.entries(entry.context).map(([k, v]) => ({
            key: k,
            value: { stringValue: String(v) },
          }))
        : [],
      traceId: entry.traceId,
      spanId: entry.spanId,
    };
  }

  /**
   * Get OTLP severity number from log level
   */
  private getSeverityNumber(level: string): number {
    const mapping: Record<string, number> = {
      trace: 1,
      debug: 5,
      info: 9,
      warn: 13,
      error: 17,
      fatal: 21,
    };
    return mapping[level] ?? 9;
  }

  /**
   * Send traces to OTLP endpoint
   */
  private async sendTraces(spans: OTLPSpan[]): Promise<void> {
    const url = `${this.endpoint}/v1/traces`;
    const body = {
      resourceSpans: [
        {
          resource: {
            attributes: [
              { key: "service.name", value: { stringValue: "coder" } },
            ],
          },
          scopeSpans: [
            {
              scope: { name: "coder" },
              spans,
            },
          ],
        },
      ],
    };

    await fetch(url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });
  }

  /**
   * Send metrics to OTLP endpoint
   */
  private async sendMetrics(metrics: OTLPMetric[]): Promise<void> {
    const url = `${this.endpoint}/v1/metrics`;
    const body = {
      resourceMetrics: [
        {
          resource: {
            attributes: [
              { key: "service.name", value: { stringValue: "coder" } },
            ],
          },
          scopeMetrics: [
            {
              scope: { name: "coder" },
              metrics,
            },
          ],
        },
      ],
    };

    await fetch(url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });
  }

  /**
   * Send logs to OTLP endpoint
   */
  private async sendLogs(logs: OTLPLog[]): Promise<void> {
    const url = `${this.endpoint}/v1/logs`;
    const body = {
      resourceLogs: [
        {
          resource: {
            attributes: [
              { key: "service.name", value: { stringValue: "coder" } },
            ],
          },
          scopeLogs: [
            {
              scope: { name: "coder" },
              logRecords: logs,
            },
          ],
        },
      ],
    };

    await fetch(url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });
  }

  /**
   * Shutdown the exporter
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }
}

/**
 * OTLP type definitions
 */
interface OTLPSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: number;
  startTimeUnixNano: number;
  endTimeUnixNano?: number;
  status: { code: number; message?: string };
  attributes: Array<{ key: string; value: { stringValue: string } }>;
  events: Array<{
    timeUnixNano: number;
    name: string;
    attributes: Array<{ key: string; value: { stringValue: string } }>;
  }>;
}

interface OTLPMetric {
  name: string;
  description?: string;
  unit?: string;
  data: {
    dataPoints: Array<{
      timeUnixNano: number;
      asDouble: number;
      attributes: Array<{ key: string; value: { stringValue: string } }>;
    }>;
  };
}

interface OTLPLog {
  timeUnixNano: number;
  severityNumber: number;
  severityText: string;
  body: { stringValue: string };
  attributes: Array<{ key: string; value: { stringValue: string } }>;
  traceId?: string;
  spanId?: string;
}

/**
 * Create an OTLP exporter
 */
export function createOTLPExporter(config?: TelemetryConfig): OTLPExporter {
  return new OTLPExporter(config);
}
