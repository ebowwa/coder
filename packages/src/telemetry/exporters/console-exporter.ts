/**
 * Console Exporter - Pretty-printed console output (dev)
 * @module telemetry/exporters/console
 */

import type { Span, Metric, LogEntry, TelemetryConfig } from "../types.js";

/**
 * Level colors for pretty printing
 */
const LEVEL_COLORS: Record<string, string> = {
  trace: "\x1b[90m", // gray
  debug: "\x1b[36m", // cyan
  info: "\x1b[32m", // green
  warn: "\x1b[33m", // yellow
  error: "\x1b[31m", // red
  fatal: "\x1b[35m", // magenta
};

const RESET = "\x1b[0m";

/**
 * ConsoleExporter - Pretty prints telemetry to console
 */
export class ConsoleExporter {
  private config: TelemetryConfig;

  constructor(config?: TelemetryConfig) {
    this.config = config ?? { enabled: true, logLevel: "info", prettyPrint: true, tracingEnabled: true, samplingRate: 1, metricsEnabled: true, exporters: ["console"], includeStackTrace: true, flushIntervalMs: 5000, batchSize: 100 };
  }

  /**
   * Export a span to console
   */
  exportSpan(span: Span): void {
    if (!this.config.enabled || !this.config.tracingEnabled) return;

    const duration = span.endTime ? span.endTime - span.startTime : 0;
    const statusIcon = span.status === "ok" ? "✓" : span.status === "error" ? "✗" : "○";
    const statusColor = span.status === "ok" ? "\x1b[32m" : span.status === "error" ? "\x1b[31m" : "\x1b[90m";

    const timestamp = new Date(span.startTime).toISOString().split("T")[1]?.split(".")[0] ?? "";
    const kind = span.kind.padEnd(8);

    console.log(
      `${statusColor}${statusIcon}${RESET} [${timestamp}] \x1b[36mtrace\x1b[0m ${span.name} ` +
        `\x1b[90m${kind}${duration.toFixed(2)}ms\x1b[0m`
    );

    // Print attributes if any
    if (Object.keys(span.attributes).length > 0) {
      const attrs = Object.entries(span.attributes)
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
        .join(" ");
      console.log(`  \x1b[90m${attrs}\x1b[0m`);
    }

    // Print events if any
    if (span.events.length > 0) {
      for (const event of span.events) {
        console.log(`  \x1b[33m⚡ ${event.name}\x1b[0m`);
      }
    }

    // Print error if any
    if (span.statusMessage && span.status === "error") {
      console.log(`  \x1b[31mError: ${span.statusMessage}\x1b[0m`);
    }
  }

  /**
   * Export a metric to console
   */
  exportMetric(metric: Metric): void {
    if (!this.config.enabled || !this.config.metricsEnabled) return;

    const typeIcon = metric.type === "counter" ? "∑" : metric.type === "gauge" ? "⏱" : "📊";
    const unit = metric.unit ? ` ${metric.unit}` : "";

    for (const dp of metric.dataPoints) {
      const attrs = dp.attributes
        ? ` \x1b[90m${JSON.stringify(dp.attributes)}\x1b[0m`
        : "";
      console.log(`${typeIcon} ${metric.name}: ${dp.value}${unit}${attrs}`);
    }

    // Print histogram details if available
    if (metric.histogram) {
      const h = metric.histogram;
      console.log(
        `  \x1b[90mcount=${h.count} sum=${h.sum.toFixed(2)} ` +
          `min=${h.min?.toFixed(2) ?? "N/A"} max=${h.max?.toFixed(2) ?? "N/A"}\x1b[0m`
      );
    }
  }

  /**
   * Export a log entry to console
   */
  exportLog(entry: LogEntry): void {
    if (!this.config.enabled) return;

    const color = LEVEL_COLORS[entry.level] ?? "\x1b[0m";
    const timestamp = entry.timestamp.split("T")[1]?.split(".")[0] ?? entry.timestamp;
    const level = entry.level.toUpperCase().padEnd(5);

    let output = `${color}[${timestamp}] ${level}${RESET} ${entry.message}`;

    if (entry.context && Object.keys(entry.context).length > 0) {
      output += ` ${RESET}\x1b[90m${JSON.stringify(entry.context)}\x1b[0m`;
    }

    if (entry.duration !== undefined) {
      output += ` ${RESET}\x1b[90m(${entry.duration.toFixed(2)}ms)\x1b[0m`;
    }

    if (entry.traceId) {
      output += ` ${RESET}\x1b[90m[trace:${entry.traceId.slice(0, 8)}]\x1b[0m`;
    }

    if (entry.error) {
      output += `\n  \x1b[31m${entry.error.name}: ${entry.error.message}\x1b[0m`;
      if (entry.error.stack && this.config.includeStackTrace) {
        const stackLines = entry.error.stack.split("\n").slice(1, 3);
        output += `\n  \x1b[90m${stackLines.join("\n  ")}\x1b[0m`;
      }
    }

    if (entry.level === "fatal" || entry.level === "error") {
      console.error(output);
    } else if (entry.level === "warn") {
      console.warn(output);
    } else {
      console.log(output);
    }
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
   * Flush (no-op for console)
   */
  async flush(): Promise<void> {
    // Console output is synchronous, no flush needed
  }

  /**
   * Shutdown (no-op for console)
   */
  async shutdown(): Promise<void> {
    // No cleanup needed
  }
}

/**
 * Create a console exporter
 */
export function createConsoleExporter(config?: TelemetryConfig): ConsoleExporter {
  return new ConsoleExporter(config);
}
