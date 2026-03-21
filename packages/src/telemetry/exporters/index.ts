/**
 * Exporter Factory - Creates exporters based on configuration
 * @module telemetry/exporters
 */

import type { TelemetryConfig, ExporterType, Span, Metric, LogEntry } from "../types.js";
import { ConsoleExporter, createConsoleExporter } from "./console-exporter.js";
import { FileExporter, createFileExporter } from "./file-exporter.js";
import { OTLPExporter, createOTLPExporter } from "./otlp-exporter.js";

/**
 * Exporter interface
 */
export interface Exporter {
  exportSpan(span: Span): void;
  exportMetric(metric: Metric): void;
  exportLog(entry: LogEntry): void;
  exportSpans(spans: Span[]): void;
  exportMetrics(metrics: Metric[]): void;
  exportLogs(entries: LogEntry[]): void;
  flush(): Promise<void>;
  shutdown(): Promise<void>;
}

/**
 * Composite exporter that sends to multiple exporters
 */
export class CompositeExporter implements Exporter {
  private exporters: Exporter[];

  constructor(exporters: Exporter[]) {
    this.exporters = exporters;
  }

  exportSpan(span: Span): void {
    for (const exporter of this.exporters) {
      exporter.exportSpan(span);
    }
  }

  exportMetric(metric: Metric): void {
    for (const exporter of this.exporters) {
      exporter.exportMetric(metric);
    }
  }

  exportLog(entry: LogEntry): void {
    for (const exporter of this.exporters) {
      exporter.exportLog(entry);
    }
  }

  exportSpans(spans: Span[]): void {
    for (const exporter of this.exporters) {
      exporter.exportSpans(spans);
    }
  }

  exportMetrics(metrics: Metric[]): void {
    for (const exporter of this.exporters) {
      exporter.exportMetrics(metrics);
    }
  }

  exportLogs(entries: LogEntry[]): void {
    for (const exporter of this.exporters) {
      exporter.exportLogs(entries);
    }
  }

  async flush(): Promise<void> {
    await Promise.all(this.exporters.map((e) => e.flush()));
  }

  async shutdown(): Promise<void> {
    await Promise.all(this.exporters.map((e) => e.shutdown()));
  }

  /**
   * Get underlying exporters
   */
  getExporters(): Exporter[] {
    return [...this.exporters];
  }
}

/**
 * Create an exporter by type
 */
export function createExporter(type: ExporterType, config?: TelemetryConfig): Exporter {
  switch (type) {
    case "console":
      return createConsoleExporter(config);
    case "file":
      return createFileExporter(config);
    case "otlp":
      return createOTLPExporter(config);
    default:
      throw new Error(`Unknown exporter type: ${type}`);
  }
}

/**
 * Create composite exporter from configuration
 */
export function createExporters(config: TelemetryConfig): CompositeExporter {
  const exporters: Exporter[] = [];

  for (const type of config.exporters) {
    try {
      exporters.push(createExporter(type, config));
    } catch (error) {
      console.warn(`[Telemetry] Failed to create exporter '${type}': ${error}`);
    }
  }

  // Always add console exporter as fallback if no exporters configured
  if (exporters.length === 0) {
    exporters.push(createConsoleExporter(config));
  }

  return new CompositeExporter(exporters);
}

// Re-export individual exporters
export { ConsoleExporter, createConsoleExporter } from "./console-exporter.js";
export { FileExporter, createFileExporter } from "./file-exporter.js";
export { OTLPExporter, createOTLPExporter } from "./otlp-exporter.js";
