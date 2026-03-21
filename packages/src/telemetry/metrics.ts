/**
 * Metrics Registry - Counters, gauges, histograms
 * @module telemetry/metrics
 */

import type { Metric, MetricDataPoint, HistogramData, TelemetryConfig } from "./types.js";
import { METRIC_NAMES } from "./types.js";
import { getConfig } from "./config.js";

/**
 * Metric value with metadata
 */
interface MetricValue {
  value: number;
  timestamp: number;
  attributes: Record<string, unknown>;
}

/**
 * Histogram bucket configuration
 */
const HISTOGRAM_BUCKETS: Record<string, number[]> = {
  [METRIC_NAMES.API_LATENCY]: [50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000],
  [METRIC_NAMES.API_TTFT]: [50, 100, 250, 500, 1000, 2500, 5000],
  [METRIC_NAMES.TURN_DURATION_MS]: [100, 500, 1000, 2500, 5000, 10000, 30000, 60000],
  [METRIC_NAMES.TOOL_DURATION_MS]: [10, 50, 100, 250, 500, 1000, 2500, 5000],
  default: [1, 5, 10, 25, 50, 100, 250, 500],
};

/**
 * MetricsRegistry - Holds all metrics
 */
export class MetricsRegistry {
  private counters: Map<string, MetricValue[]> = new Map();
  private gauges: Map<string, MetricValue> = new Map();
  private histograms: Map<string, { values: number[]; sum: number; count: number; min?: number; max?: number }> = new Map();
  private config: TelemetryConfig;
  private descriptions: Map<string, string> = new Map();
  private units: Map<string, string> = new Map();

  constructor(config?: TelemetryConfig) {
    this.config = config ?? getConfig();
    this.initializeDescriptions();
  }

  /**
   * Initialize metric descriptions
   */
  private initializeDescriptions(): void {
    this.descriptions.set(METRIC_NAMES.API_CALLS_TOTAL, "Total API calls by model");
    this.descriptions.set(METRIC_NAMES.API_LATENCY, "API call duration in milliseconds");
    this.descriptions.set(METRIC_NAMES.API_TTFT, "Time to first token in milliseconds");
    this.descriptions.set(METRIC_NAMES.API_TOKENS_INPUT, "Input tokens by model");
    this.descriptions.set(METRIC_NAMES.API_TOKENS_OUTPUT, "Output tokens by model");
    this.descriptions.set(METRIC_NAMES.API_COST_USD_TOTAL, "Cumulative cost in USD by model");
    this.descriptions.set(METRIC_NAMES.API_ERRORS_TOTAL, "API errors by type");
    this.descriptions.set(METRIC_NAMES.TURN_TOTAL, "Turns executed");
    this.descriptions.set(METRIC_NAMES.TURN_DURATION_MS, "Turn execution time in milliseconds");
    this.descriptions.set(METRIC_NAMES.TURN_ERRORS_TOTAL, "Turn failures");
    this.descriptions.set(METRIC_NAMES.TOOL_CALLS_TOTAL, "Tool invocations by name");
    this.descriptions.set(METRIC_NAMES.TOOL_DURATION_MS, "Tool execution time in milliseconds");
    this.descriptions.set(METRIC_NAMES.TOOL_ERRORS_TOTAL, "Tool errors by name");
    this.descriptions.set(METRIC_NAMES.CACHE_HIT_RATE, "Cache efficiency percentage");
    this.descriptions.set(METRIC_NAMES.SESSION_COST_TOTAL, "Running session cost in USD");

    this.units.set(METRIC_NAMES.API_LATENCY, "ms");
    this.units.set(METRIC_NAMES.API_TTFT, "ms");
    this.units.set(METRIC_NAMES.TURN_DURATION_MS, "ms");
    this.units.set(METRIC_NAMES.TOOL_DURATION_MS, "ms");
    this.units.set(METRIC_NAMES.CACHE_HIT_RATE, "%");
    this.units.set(METRIC_NAMES.API_COST_USD_TOTAL, "USD");
    this.units.set(METRIC_NAMES.SESSION_COST_TOTAL, "USD");
  }

  /**
   * Increment a counter
   */
  incrementCounter(name: string, value: number = 1, attributes: Record<string, unknown> = {}): void {
    if (!this.config.metricsEnabled) return;

    const key = this.getMetricKey(name, attributes);
    const existing = this.counters.get(key) ?? [];

    // Find existing entry with same attributes
    const existingIdx = existing.findIndex(
      (e) => JSON.stringify(e.attributes) === JSON.stringify(attributes)
    );

    if (existingIdx >= 0) {
      existing[existingIdx]!.value += value;
      existing[existingIdx]!.timestamp = Date.now();
    } else {
      existing.push({
        value,
        timestamp: Date.now(),
        attributes,
      });
    }

    this.counters.set(key, existing);
  }

  /**
   * Set a gauge value
   */
  setGauge(name: string, value: number, attributes: Record<string, unknown> = {}): void {
    if (!this.config.metricsEnabled) return;

    const key = this.getMetricKey(name, attributes);
    this.gauges.set(key, {
      value,
      timestamp: Date.now(),
      attributes,
    });
  }

  /**
   * Record a histogram value
   */
  recordHistogram(name: string, value: number, attributes: Record<string, unknown> = {}): void {
    if (!this.config.metricsEnabled) return;

    const key = this.getMetricKey(name, attributes);
    const existing = this.histograms.get(key) ?? { values: [], sum: 0, count: 0 };

    existing.values.push(value);
    existing.sum += value;
    existing.count += 1;
    existing.min = existing.min === undefined ? value : Math.min(existing.min, value);
    existing.max = existing.max === undefined ? value : Math.max(existing.max, value);

    this.histograms.set(key, existing);
  }

  /**
   * Get metric key with attributes
   */
  private getMetricKey(name: string, attributes: Record<string, unknown>): string {
    const attrStr = Object.entries(attributes)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(",");
    return attrStr ? `${name}:{${attrStr}}` : name;
  }

  /**
   * Build histogram buckets
   */
  private buildHistogramBuckets(name: string, values: number[]): HistogramData["buckets"] {
    const boundaries = HISTOGRAM_BUCKETS[name] ?? HISTOGRAM_BUCKETS.default!;
    const sortedValues = [...values].sort((a, b) => a - b);

    const buckets: { boundary: number; count: number }[] = [];
    let valueIdx = 0;

    for (const boundary of boundaries) {
      let count = 0;
      while (valueIdx < sortedValues.length && sortedValues[valueIdx]! <= boundary) {
        count++;
        valueIdx++;
      }
      buckets.push({ boundary, count });
    }

    // Add overflow bucket
    buckets.push({
      boundary: Infinity,
      count: sortedValues.length - valueIdx,
    });

    return buckets;
  }

  /**
   * Export all metrics
   */
  export(): Metric[] {
    const metrics: Metric[] = [];

    // Export counters
    for (const [key, values] of this.counters) {
      const name = key.split(":")[0]!;
      metrics.push({
        name,
        type: "counter",
        description: this.descriptions.get(name),
        unit: this.units.get(name),
        dataPoints: values.map((v) => ({
          value: v.value,
          timestamp: v.timestamp,
          attributes: v.attributes,
        })),
      });
    }

    // Export gauges
    for (const [key, value] of this.gauges) {
      const name = key.split(":")[0]!;
      metrics.push({
        name,
        type: "gauge",
        description: this.descriptions.get(name),
        unit: this.units.get(name),
        dataPoints: [
          {
            value: value.value,
            timestamp: value.timestamp,
            attributes: value.attributes,
          },
        ],
      });
    }

    // Export histograms
    for (const [key, data] of this.histograms) {
      const name = key.split(":")[0]!;
      const histogram: HistogramData = {
        count: data.count,
        sum: data.sum,
        min: data.min,
        max: data.max,
        buckets: this.buildHistogramBuckets(name, data.values),
      };

      metrics.push({
        name,
        type: "histogram",
        description: this.descriptions.get(name),
        unit: this.units.get(name),
        dataPoints: [
          {
            value: data.sum / data.count, // average
            timestamp: Date.now(),
          },
        ],
        histogram,
      });
    }

    return metrics;
  }

  /**
   * Get summary of all metrics
   */
  getSummary(): Record<string, unknown> {
    const summary: Record<string, unknown> = {};

    // Counter summaries
    const counterSummary: Record<string, number> = {};
    for (const [key, values] of this.counters) {
      const name = key.split(":")[0]!;
      counterSummary[name] = (counterSummary[name] ?? 0) + values.reduce((sum, v) => sum + v.value, 0);
    }
    summary["counters"] = counterSummary;

    // Gauge summaries
    const gaugeSummary: Record<string, number> = {};
    for (const [key, value] of this.gauges) {
      const name = key.split(":")[0]!;
      gaugeSummary[name] = value.value;
    }
    summary["gauges"] = gaugeSummary;

    // Histogram summaries
    const histogramSummary: Record<string, { count: number; avg: number; min?: number; max?: number }> = {};
    for (const [key, data] of this.histograms) {
      const name = key.split(":")[0]!;
      histogramSummary[name] = {
        count: data.count,
        avg: data.sum / data.count,
        min: data.min,
        max: data.max,
      };
    }
    summary["histograms"] = histogramSummary;

    return summary;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }
}

/**
 * Global metrics registry
 */
let _registry: MetricsRegistry | null = null;

/**
 * Get the global metrics registry
 */
export function getMetricsRegistry(): MetricsRegistry {
  if (!_registry) {
    _registry = new MetricsRegistry();
  }
  return _registry;
}

/**
 * Reset the global registry (for testing)
 */
export function resetMetricsRegistry(): void {
  _registry = null;
}

/**
 * Convenience functions for common metrics
 */
export const metrics = {
  incrementCounter: (name: string, value?: number, attrs?: Record<string, unknown>) =>
    getMetricsRegistry().incrementCounter(name, value, attrs),

  setGauge: (name: string, value: number, attrs?: Record<string, unknown>) =>
    getMetricsRegistry().setGauge(name, value, attrs),

  recordHistogram: (name: string, value: number, attrs?: Record<string, unknown>) =>
    getMetricsRegistry().recordHistogram(name, value, attrs),
};
