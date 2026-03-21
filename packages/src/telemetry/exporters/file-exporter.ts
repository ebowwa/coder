/**
 * File Exporter - JSONL persistence
 * @module telemetry/exporters/file
 */

import type { Span, Metric, LogEntry, TelemetryConfig } from "../types.js";
import { getConfig } from "../config.js";
import * as fs from "fs";
import * as path from "path";

/**
 * FileExporter - Writes telemetry to JSONL file
 */
export class FileExporter {
  private config: TelemetryConfig;
  private filePath: string;
  private buffer: string[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private writeStream: fs.WriteStream | null = null;

  constructor(config?: TelemetryConfig) {
    this.config = config ?? getConfig();
    this.filePath = this.config.filePath ?? this.expandPath("~/.claude/telemetry.jsonl");
    this.init();
  }

  /**
   * Initialize the exporter
   */
  private init(): void {
    // Ensure directory exists
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Create write stream (append mode)
    this.writeStream = fs.createWriteStream(this.filePath, { flags: "a" });

    // Set up periodic flush
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushIntervalMs);
  }

  /**
   * Expand tilde in path
   */
  private expandPath(p: string): string {
    if (p.startsWith("~/")) {
      return p.replace("~", process.env.HOME ?? "");
    }
    return p;
  }

  /**
   * Export a span to file
   */
  exportSpan(span: Span): void {
    if (!this.config.enabled || !this.config.tracingEnabled) return;

    const record = {
      type: "span",
      timestamp: new Date().toISOString(),
      data: span,
    };
    this.buffer.push(JSON.stringify(record));
    this.checkFlush();
  }

  /**
   * Export a metric to file
   */
  exportMetric(metric: Metric): void {
    if (!this.config.enabled || !this.config.metricsEnabled) return;

    const record = {
      type: "metric",
      timestamp: new Date().toISOString(),
      data: metric,
    };
    this.buffer.push(JSON.stringify(record));
    this.checkFlush();
  }

  /**
   * Export a log entry to file
   */
  exportLog(entry: LogEntry): void {
    if (!this.config.enabled) return;

    const record = {
      type: "log",
      timestamp: entry.timestamp,
      data: entry,
    };
    this.buffer.push(JSON.stringify(record));
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
    if (this.buffer.length >= this.config.batchSize) {
      this.flush();
    }
  }

  /**
   * Flush buffer to file
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0 || !this.writeStream) return;

    const data = this.buffer.join("\n") + "\n";
    this.buffer = [];

    return new Promise((resolve, reject) => {
      this.writeStream!.write(data, (err) => {
        if (err) {
          console.error(`[Telemetry] File write error: ${err.message}`);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Shutdown the exporter
   */
  async shutdown(): Promise<void> {
    // Stop flush timer
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Final flush
    await this.flush();

    // Close stream
    if (this.writeStream) {
      this.writeStream.end();
      this.writeStream = null;
    }
  }

  /**
   * Get file path
   */
  getFilePath(): string {
    return this.filePath;
  }

  /**
   * Read recent entries from file
   */
  readRecent(limit: number = 100): Array<{ type: string; timestamp: string; data: unknown }> {
    if (!fs.existsSync(this.filePath)) {
      return [];
    }

    const entries: Array<{ type: string; timestamp: string; data: unknown }> = [];
    const content = fs.readFileSync(this.filePath, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);

    // Get last N lines
    const startIdx = Math.max(0, lines.length - limit);
    for (let i = startIdx; i < lines.length; i++) {
      try {
        entries.push(JSON.parse(lines[i]!));
      } catch {
        // Skip invalid lines
      }
    }

    return entries;
  }

  /**
   * Clear the telemetry file
   */
  clear(): void {
    if (fs.existsSync(this.filePath)) {
      fs.unlinkSync(this.filePath);
    }
    this.buffer = [];
  }
}

/**
 * Create a file exporter
 */
export function createFileExporter(config?: TelemetryConfig): FileExporter {
  return new FileExporter(config);
}
