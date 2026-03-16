/**
 * Metrics module for CRM system
 *
 * Provides a simple metrics collection system with counters, gauges, and histograms.
 * Supports exporting metrics in Prometheus format.
 */

export type MetricType = 'counter' | 'gauge' | 'histogram';

export interface MetricLabel {
  [key: string]: string | number;
}

export interface MetricValue {
  value: number;
  timestamp: number;
  labels: MetricLabel;
}

export interface MetricDefinition {
  name: string;
  type: MetricType;
  description: string;
  unit?: string;
}

export interface HistogramOptions {
  buckets?: number[];
}

interface CounterMetric extends MetricDefinition {
  type: 'counter';
  values: MetricValue[];
}

interface GaugeMetric extends MetricDefinition {
  type: 'gauge';
  values: MetricValue[];
}

interface HistogramMetric extends MetricDefinition {
  type: 'histogram';
  values: {
    sum: number;
    count: number;
    buckets: { boundary: number; count: number }[];
    timestamp: number;
    labels: MetricLabel;
  }[];
  options: HistogramOptions;
}

type Metric = CounterMetric | GaugeMetric | HistogramMetric;

/**
 * Default histogram buckets (in seconds for latency)
 */
const DEFAULT_BUCKETS = [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

/**
 * Metrics registry for collecting and exporting metrics
 */
export class MetricsRegistry {
  private readonly metrics: Map<string, Metric> = new Map();
  private readonly prefix: string;

  constructor(prefix: string = 'crm_') {
    this.prefix = prefix;
  }

  /**
   * Register a counter metric
   */
  registerCounter(name: string, description: string, unit?: string): void {
    const metricName = this.prefix + name;
    if (this.metrics.has(metricName)) {
      throw new Error(`Metric ${metricName} already registered`);
    }

    this.metrics.set(metricName, {
      name: metricName,
      type: 'counter',
      description,
      unit,
      values: [],
    });
  }

  /**
   * Register a gauge metric
   */
  registerGauge(name: string, description: string, unit?: string): void {
    const metricName = this.prefix + name;
    if (this.metrics.has(metricName)) {
      throw new Error(`Metric ${metricName} already registered`);
    }

    this.metrics.set(metricName, {
      name: metricName,
      type: 'gauge',
      description,
      unit,
      values: [],
    });
  }

  /**
   * Register a histogram metric
   */
  registerHistogram(
    name: string,
    description: string,
    unit?: string,
    options?: HistogramOptions
  ): void {
    const metricName = this.prefix + name;
    if (this.metrics.has(metricName)) {
      throw new Error(`Metric ${metricName} already registered`);
    }

    this.metrics.set(metricName, {
      name: metricName,
      type: 'histogram',
      description,
      unit,
      options: { buckets: options?.buckets ?? DEFAULT_BUCKETS },
      values: [],
    });
  }

  /**
   * Increment a counter
   */
  increment(name: string, value: number = 1, labels: MetricLabel = {}): void {
    const metricName = this.prefix + name;
    const metric = this.metrics.get(metricName);

    if (!metric) {
      throw new Error(`Metric ${metricName} not found`);
    }

    if (metric.type !== 'counter') {
      throw new Error(`Metric ${metricName} is not a counter`);
    }

    const existingIndex = metric.values.findIndex(v =>
      this.labelsMatch(v.labels, labels)
    );

    if (existingIndex >= 0) {
      metric.values[existingIndex].value += value;
      metric.values[existingIndex].timestamp = Date.now();
    } else {
      metric.values.push({
        value,
        timestamp: Date.now(),
        labels,
      });
    }
  }

  /**
   * Decrement a counter (useful for error tracking)
   */
  decrement(name: string, value: number = 1, labels: MetricLabel = {}): void {
    this.increment(name, -value, labels);
  }

  /**
   * Set a gauge value
   */
  gauge(name: string, value: number, labels: MetricLabel = {}): void {
    const metricName = this.prefix + name;
    const metric = this.metrics.get(metricName);

    if (!metric) {
      throw new Error(`Metric ${metricName} not found`);
    }

    if (metric.type !== 'gauge') {
      throw new Error(`Metric ${metricName} is not a gauge`);
    }

    const existingIndex = metric.values.findIndex(v =>
      this.labelsMatch(v.labels, labels)
    );

    if (existingIndex >= 0) {
      metric.values[existingIndex].value = value;
      metric.values[existingIndex].timestamp = Date.now();
    } else {
      metric.values.push({
        value,
        timestamp: Date.now(),
        labels,
      });
    }
  }

  /**
   * Observe a value for histogram
   */
  observe(name: string, value: number, labels: MetricLabel = {}): void {
    const metricName = this.prefix + name;
    const metric = this.metrics.get(metricName);

    if (!metric) {
      throw new Error(`Metric ${metricName} not found`);
    }

    if (metric.type !== 'histogram') {
      throw new Error(`Metric ${metricName} is not a histogram`);
    }

    const existingIndex = metric.values.findIndex(v =>
      this.labelsMatch(v.labels, labels)
    );

    if (existingIndex >= 0) {
      const existing = metric.values[existingIndex];
      existing.sum += value;
      existing.count += 1;

      for (const bucket of existing.buckets) {
        if (value <= bucket.boundary) {
          bucket.count += 1;
        }
      }
      existing.timestamp = Date.now();
    } else {
      const buckets = metric.options.buckets ?? DEFAULT_BUCKETS;
      metric.values.push({
        sum: value,
        count: 1,
        buckets: buckets.map(boundary => ({
          boundary,
          count: value <= boundary ? 1 : 0,
        })),
        timestamp: Date.now(),
        labels,
      });
    }
  }

  /**
   * Create a timer that records duration in a histogram
   */
  startTimer(name: string, labels: MetricLabel = {}): () => number {
    const start = process.hrtime.bigint();

    return () => {
      const end = process.hrtime.bigint();
      const durationSeconds = Number(end - start) / 1e9;
      this.observe(name, durationSeconds, labels);
      return durationSeconds;
    };
  }

  /**
   * Get all metrics
   */
  getMetrics(): Metric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Export metrics in Prometheus text format
   */
  exportPrometheus(): string {
    const lines: string[] = [];

    for (const metric of this.metrics.values()) {
      // Add help and type comments
      lines.push(`# HELP ${metric.name} ${metric.description}`);
      lines.push(`# TYPE ${metric.name} ${metric.type}`);

      if (metric.type === 'counter' || metric.type === 'gauge') {
        for (const value of metric.values) {
          const labelStr = this.formatLabels(value.labels);
          lines.push(`${metric.name}${labelStr} ${value.value}`);
        }
      } else if (metric.type === 'histogram') {
        for (const value of metric.values) {
          const labelStr = this.formatLabels(value.labels);

          // Bucket counts
          for (const bucket of value.buckets) {
            const bucketLabels = { ...value.labels, le: bucket.boundary.toString() };
            const bucketLabelStr = this.formatLabels(bucketLabels);
            lines.push(`${metric.name}_bucket${bucketLabelStr} ${bucket.count}`);
          }

          // +Inf bucket (same as count)
          const infLabels = { ...value.labels, le: '+Inf' };
          const infLabelStr = this.formatLabels(infLabels);
          lines.push(`${metric.name}_bucket${infLabelStr} ${value.count}`);

          // Sum and count
          lines.push(`${metric.name}_sum${labelStr} ${value.sum}`);
          lines.push(`${metric.name}_count${labelStr} ${value.count}`);
        }
      }

      lines.push(''); // Empty line between metrics
    }

    return lines.join('\n');
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    for (const metric of this.metrics.values()) {
      if (metric.type === 'histogram') {
        metric.values = [];
      } else {
        metric.values = [];
      }
    }
  }

  /**
   * Get metric by name
   */
  getMetric(name: string): Metric | undefined {
    return this.metrics.get(this.prefix + name);
  }

  private labelsMatch(a: MetricLabel, b: MetricLabel): boolean {
    const keysA = Object.keys(a).sort();
    const keysB = Object.keys(b).sort();

    if (keysA.length !== keysB.length) return false;

    return keysA.every((key, i) => {
      if (key !== keysB[i]) return false;
      return a[key] === b[key];
    });
  }

  private formatLabels(labels: MetricLabel): string {
    const entries = Object.entries(labels);
    if (entries.length === 0) return '';

    const formatted = entries.map(([key, value]) => {
      const escapedValue = String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      return `${key}="${escapedValue}"`;
    });

    return `{${formatted.join(',')}}`;
  }
}

/**
 * Default metrics registry
 */
export const metrics = new MetricsRegistry('crm_');

/**
 * Pre-registered CRM metrics
 */
export function initializeCrmMetrics(registry: MetricsRegistry = metrics): void {
  // Contact metrics
  registry.registerCounter('contacts_created_total', 'Total number of contacts created');
  registry.registerCounter('contacts_updated_total', 'Total number of contacts updated');
  registry.registerCounter('contacts_deleted_total', 'Total number of contacts deleted');
  registry.registerGauge('contacts_active_count', 'Current number of active contacts');

  // Deal metrics
  registry.registerCounter('deals_created_total', 'Total number of deals created');
  registry.registerCounter('deals_won_total', 'Total number of deals won');
  registry.registerCounter('deals_lost_total', 'Total number of deals lost');
  registry.registerGauge('deals_active_count', 'Current number of active deals');
  registry.registerGauge('deals_pipeline_value', 'Total value of deals in pipeline', 'USD');

  // Activity metrics
  registry.registerCounter('activities_created_total', 'Total number of activities created');
  registry.registerCounter('activities_completed_total', 'Total number of activities completed');
  registry.registerGauge('activities_pending_count', 'Current number of pending activities');

  // API metrics
  registry.registerHistogram('api_request_duration_seconds', 'API request duration in seconds');
  registry.registerCounter('api_requests_total', 'Total number of API requests');
  registry.registerCounter('api_errors_total', 'Total number of API errors');

  // Search metrics
  registry.registerHistogram('search_duration_seconds', 'Search query duration in seconds');
  registry.registerCounter('search_queries_total', 'Total number of search queries');
}

// Initialize default metrics
initializeCrmMetrics();
