/**
 * Performance Analytics - Advanced performance monitoring and bottleneck detection
 *
 * Features:
 * - Percentile metrics (p50, p90, p95, p99)
 * - Bottleneck detection
 * - Resource usage tracking
 * - Performance profiles
 * - Optimization suggestions
 *
 * @module telemetry/observability/performance-analytics
 */

import { z } from "zod";
import { performance } from "perf_hooks";

// ============================================
// PERCENTILE METRICS
// ============================================

export const PercentileMetricsSchema = z.object({
  metric: z.string(),
  count: z.number(),
  min: z.number(),
  max: z.number(),
  mean: z.number(),
  stdDev: z.number(),
  p50: z.number(),
  p90: z.number(),
  p95: z.number(),
  p99: z.number(),
  lastUpdated: z.number(),
});

// ============================================
// BOTTLENECK DETECTION
// ============================================

export const BottleneckTypeSchema = z.enum([
  "api_latency",
  "tool_execution",
  "context_compaction",
  "file_io",
  "network_io",
  "serialization",
  "permission_check",
]);

export const BottleneckSchema = z.object({
  id: z.string(),
  type: BottleneckTypeSchema,
  operation: z.string(),
  avgDurationMs: z.number(),
  impactScore: z.number(), // 0-100
  frequency: z.number(), // occurrences per hour
  totalWastedTimeMs: z.number(),
  suggestion: z.string(),
  detectedAt: z.number(),
  lastOccurrence: z.number(),
  occurrences: z.number(),
});

// ============================================
// RESOURCE USAGE
// ============================================

export const ResourceUsageSchema = z.object({
  timestamp: z.number(),
  // Memory
  heapUsedMB: z.number(),
  heapTotalMB: z.number(),
  externalMB: z.number(),
  rssMB: z.number(),
  // CPU (process)
  cpuUserMs: z.number(),
  cpuSystemMs: z.number(),
  cpuPercent: z.number(),
  // I/O
  fileDescriptorsOpen: z.number().optional(),
  // Event loop
  eventLoopDelayMs: z.number().optional(),
  // Network
  activeConnections: z.number().optional(),
  bytesReceived: z.number().optional(),
  bytesSent: z.number().optional(),
});

export const ResourceThresholdsSchema = z.object({
  heapUsedMB: z.number().default(1024),
  cpuPercent: z.number().default(80),
  eventLoopDelayMs: z.number().default(100),
  fileDescriptors: z.number().default(1000),
});

// ============================================
// PERFORMANCE PROFILE
// ============================================

export const OperationProfileSchema = z.object({
  operation: z.string(),
  totalCalls: z.number(),
  totalTimeMs: z.number(),
  avgTimeMs: z.number(),
  minTimeMs: z.number(),
  maxTimeMs: z.number(),
  // Breakdown
  subOperations: z.record(z.object({
    totalCalls: z.number(),
    totalTimeMs: z.number(),
    avgTimeMs: z.number(),
  })),
  // Patterns
  frequentPaths: z.array(z.object({
    path: z.string(),
    count: z.number(),
    avgTimeMs: z.number(),
  })),
});

export const SessionPerformanceProfileSchema = z.object({
  sessionId: z.string(),
  startTime: z.number(),
  endTime: z.number().optional(),
  totalDurationMs: z.number(),

  // Time breakdown
  timeBreakdown: z.object({
    apiTimeMs: z.number(),
    toolTimeMs: z.number(),
    compactionTimeMs: z.number(),
    idleTimeMs: z.number(),
    otherTimeMs: z.number(),
  }),

  // Efficiency metrics
  efficiency: z.object({
    productiveTimeRatio: z.number(), // api + tool / total
    apiUtilization: z.number(), // api time / (api + wait)
    parallelismRatio: z.number(), // parallel time / sequential time
  }),

  // Resource usage
  peakResourceUsage: ResourceUsageSchema,
  avgResourceUsage: ResourceUsageSchema,

  // Bottlenecks
  bottlenecks: z.array(BottleneckSchema),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type PercentileMetrics = z.infer<typeof PercentileMetricsSchema>;
export type BottleneckType = z.infer<typeof BottleneckTypeSchema>;
export type Bottleneck = z.infer<typeof BottleneckSchema>;
export type ResourceUsage = z.infer<typeof ResourceUsageSchema>;
export type ResourceThresholds = z.infer<typeof ResourceThresholdsSchema>;
export type OperationProfile = z.infer<typeof OperationProfileSchema>;
export type SessionPerformanceProfile = z.infer<typeof SessionPerformanceProfileSchema>;

// ============================================
// PERCENTILE CALCULATOR
// ============================================

class PercentileCalculator {
  private values: number[] = [];
  private sorted: boolean = false;
  private _min?: number;
  private _max?: number;
  private _sum: number = 0;

  add(value: number): void {
    this.values.push(value);
    this.sorted = false;
    this._sum += value;

    if (this._min === undefined || value < this._min) this._min = value;
    if (this._max === undefined || value > this._max) this._max = value;
  }

  get count(): number {
    return this.values.length;
  }

  get min(): number {
    return this._min ?? 0;
  }

  get max(): number {
    return this._max ?? 0;
  }

  get mean(): number {
    return this.values.length > 0 ? this._sum / this.values.length : 0;
  }

  private ensureSorted(): void {
    if (!this.sorted) {
      this.values.sort((a, b) => a - b);
      this.sorted = true;
    }
  }

  percentile(p: number): number {
    if (this.values.length === 0) return 0;
    this.ensureSorted();

    const index = (p / 100) * (this.values.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (lower === upper) {
      return this.values[lower]!;
    }

    return this.values[lower]! * (1 - weight) + this.values[upper]! * weight;
  }

  stdDev(): number {
    if (this.values.length < 2) return 0;
    const avg = this.mean;
    const squareDiffs = this.values.map(v => Math.pow(v - avg, 2));
    return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / this.values.length);
  }

  toMetrics(metric: string): PercentileMetrics {
    return {
      metric,
      count: this.count,
      min: this.min,
      max: this.max,
      mean: this.mean,
      stdDev: this.stdDev(),
      p50: this.percentile(50),
      p90: this.percentile(90),
      p95: this.percentile(95),
      p99: this.percentile(99),
      lastUpdated: Date.now(),
    };
  }
}

// ============================================
// PERFORMANCE ANALYTICS ENGINE
// ============================================

/**
 * Time breakdown type for performance analytics
 */
export interface TimeBreakdown {
  apiTimeMs: number;
  toolTimeMs: number;
  compactionTimeMs: number;
  idleTimeMs: number;
  otherTimeMs: number;
}

/**
 * PerformanceAnalyticsEngine - Comprehensive performance monitoring
 */
export class PerformanceAnalyticsEngine {
  private sessionId: string;
  private startTime: number;

  // Timing data
  private metrics: Map<string, PercentileCalculator> = new Map();
  private operationStartTimes: Map<string, number> = new Map();

  // Bottleneck detection
  private bottlenecks: Map<string, Bottleneck> = new Map();
  private bottleneckThresholds: Record<BottleneckType, number> = {
    api_latency: 30000, // 30s
    tool_execution: 5000, // 5s
    context_compaction: 10000, // 10s
    file_io: 1000, // 1s
    network_io: 5000, // 5s
    serialization: 500, // 500ms
    permission_check: 100, // 100ms
  };

  // Resource tracking
  private resourceSamples: ResourceUsage[] = [];
  private resourceThresholds: ResourceThresholds = {
    heapUsedMB: 1024,
    cpuPercent: 80,
    eventLoopDelayMs: 100,
    fileDescriptors: 1000,
  };

  // Time breakdown
  private timeBreakdown = {
    apiTimeMs: 0,
    toolTimeMs: 0,
    compactionTimeMs: 0,
    idleTimeMs: 0,
    otherTimeMs: 0,
  };

  // Session start CPU time
  private startCpuTime: { user: number; system: number };

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.startTime = Date.now();
    this.startCpuTime = process.cpuUsage();
  }

  // ============================================
  // TIMING OPERATIONS
  // ============================================

  /**
   * Start timing an operation
   */
  startOperation(operationId: string): void {
    this.operationStartTimes.set(operationId, performance.now());
  }

  /**
   * End timing an operation and record
   */
  endOperation(
    operationId: string,
    metricName: string,
    type: BottleneckType,
    metadata?: Record<string, unknown>
  ): number {
    const startTime = this.operationStartTimes.get(operationId);
    if (startTime === undefined) {
      return 0;
    }

    const durationMs = performance.now() - startTime;
    this.operationStartTimes.delete(operationId);

    // Record in metrics
    let calculator = this.metrics.get(metricName);
    if (!calculator) {
      calculator = new PercentileCalculator();
      this.metrics.set(metricName, calculator);
    }
    calculator.add(durationMs);

    // Update time breakdown
    this.updateTimeBreakdown(type, durationMs);

    // Check for bottleneck
    this.checkBottleneck(type, metricName, durationMs, metadata);

    return durationMs;
  }

  /**
   * Record a timing directly
   */
  recordTiming(metricName: string, durationMs: number, type?: BottleneckType): void {
    let calculator = this.metrics.get(metricName);
    if (!calculator) {
      calculator = new PercentileCalculator();
      this.metrics.set(metricName, calculator);
    }
    calculator.add(durationMs);

    if (type) {
      this.updateTimeBreakdown(type, durationMs);
      this.checkBottleneck(type, metricName, durationMs);
    }
  }

  /**
   * Record a tool call with detailed metrics
   */
  recordToolCall(
    toolName: string,
    durationMs: number,
    success: boolean,
    inputSize?: number,
    outputSize?: number,
    error?: string,
    taskType?: string
  ): void {
    const metricName = `tool.${toolName}`;
    this.recordTiming(metricName, durationMs, "tool_execution");

    // Track tool-specific metrics
    const toolMetric = `tool.${toolName}.${success ? "success" : "failure"}`;
    let calculator = this.metrics.get(toolMetric);
    if (!calculator) {
      calculator = new PercentileCalculator();
      this.metrics.set(toolMetric, calculator);
    }
    calculator.add(durationMs);

    // Track input/output sizes if provided
    if (inputSize !== undefined) {
      const sizeMetric = `tool.${toolName}.input_size`;
      let sizeCalc = this.metrics.get(sizeMetric);
      if (!sizeCalc) {
        sizeCalc = new PercentileCalculator();
        this.metrics.set(sizeMetric, sizeCalc);
      }
      sizeCalc.add(inputSize);
    }

    if (outputSize !== undefined) {
      const sizeMetric = `tool.${toolName}.output_size`;
      let sizeCalc = this.metrics.get(sizeMetric);
      if (!sizeCalc) {
        sizeCalc = new PercentileCalculator();
        this.metrics.set(sizeMetric, sizeCalc);
      }
      sizeCalc.add(outputSize);
    }
  }

  /**
   * Time an async function
   */
  async time<T>(
    metricName: string,
    type: BottleneckType,
    fn: () => Promise<T>
  ): Promise<{ result: T; durationMs: number }> {
    const operationId = `${metricName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.startOperation(operationId);

    try {
      const result = await fn();
      const durationMs = this.endOperation(operationId, metricName, type);
      return { result, durationMs };
    } catch (error) {
      this.endOperation(operationId, metricName, type);
      throw error;
    }
  }

  // ============================================
  // PERCENTILE METRICS
  // ============================================

  /**
   * Get percentile metrics for a specific metric
   */
  getMetrics(metricName: string): PercentileMetrics | undefined {
    const calculator = this.metrics.get(metricName);
    return calculator?.toMetrics(metricName);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): PercentileMetrics[] {
    const result: PercentileMetrics[] = [];
    for (const [name, calculator] of this.metrics) {
      result.push(calculator.toMetrics(name));
    }
    return result;
  }

  /**
   * Get API latency metrics
   */
  getApiLatencyMetrics(): PercentileMetrics | undefined {
    return this.getMetrics("api.latency");
  }

  /**
   * Get tool execution metrics
   */
  getToolMetrics(toolName?: string): PercentileMetrics[] {
    const result: PercentileMetrics[] = [];
    for (const [name, calculator] of this.metrics) {
      if (name.startsWith("tool.")) {
        if (!toolName || name.includes(toolName)) {
          result.push(calculator.toMetrics(name));
        }
      }
    }
    return result;
  }

  // ============================================
  // BOTTLENECK DETECTION
  // ============================================

  private checkBottleneck(
    type: BottleneckType,
    operation: string,
    durationMs: number,
    metadata?: Record<string, unknown>
  ): void {
    const threshold = this.bottleneckThresholds[type];
    if (durationMs < threshold) return;

    const bottleneckId = `${type}:${operation}`;
    let bottleneck = this.bottlenecks.get(bottleneckId);

    if (!bottleneck) {
      bottleneck = {
        id: bottleneckId,
        type,
        operation,
        avgDurationMs: durationMs,
        impactScore: this.calculateImpactScore(type, durationMs),
        frequency: 0,
        totalWastedTimeMs: 0,
        suggestion: this.getBottleneckSuggestion(type, operation),
        detectedAt: Date.now(),
        lastOccurrence: Date.now(),
        occurrences: 0,
      };
      this.bottlenecks.set(bottleneckId, bottleneck);
    }

    bottleneck.occurrences++;
    bottleneck.lastOccurrence = Date.now();
    bottleneck.avgDurationMs = (bottleneck.avgDurationMs * (bottleneck.occurrences - 1) + durationMs) / bottleneck.occurrences;
    bottleneck.totalWastedTimeMs += durationMs - threshold;

    // Update frequency (occurrences per hour)
    const hoursSinceDetection = (Date.now() - bottleneck.detectedAt) / (1000 * 60 * 60);
    bottleneck.frequency = hoursSinceDetection > 0 ? bottleneck.occurrences / hoursSinceDetection : 0;

    // Update impact score
    bottleneck.impactScore = this.calculateImpactScore(type, bottleneck.avgDurationMs) * Math.min(bottleneck.frequency, 10);
  }

  private calculateImpactScore(type: BottleneckType, durationMs: number): number {
    const threshold = this.bottleneckThresholds[type];
    const ratio = durationMs / threshold;
    // Score 0-100 based on how much over threshold
    return Math.min(100, (ratio - 1) * 50);
  }

  private getBottleneckSuggestion(type: BottleneckType, operation: string): string {
    const suggestions: Record<BottleneckType, string> = {
      api_latency: "Consider using streaming, reducing payload size, or switching to a faster model",
      tool_execution: "Optimize tool implementation or consider caching results",
      context_compaction: "Implement more aggressive compaction or reduce context growth",
      file_io: "Use async I/O, batch operations, or implement caching",
      network_io: "Implement connection pooling, compression, or retry with backoff",
      serialization: "Use streaming JSON parser or reduce data size",
      permission_check: "Cache permission decisions or implement batch checking",
    };
    return suggestions[type];
  }

  /**
   * Get detected bottlenecks sorted by impact
   */
  getBottlenecks(): Bottleneck[] {
    return Array.from(this.bottlenecks.values())
      .sort((a, b) => b.impactScore - a.impactScore);
  }

  /**
   * Set custom bottleneck thresholds
   */
  setBottleneckThresholds(thresholds: Partial<Record<BottleneckType, number>>): void {
    Object.assign(this.bottleneckThresholds, thresholds);
  }

  // ============================================
  // RESOURCE TRACKING
  // ============================================

  /**
   * Sample current resource usage
   */
  sampleResources(): ResourceUsage {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage(this.startCpuTime);
    const elapsedMs = Date.now() - this.startTime;

    const usage: ResourceUsage = {
      timestamp: Date.now(),
      heapUsedMB: memUsage.heapUsed / (1024 * 1024),
      heapTotalMB: memUsage.heapTotal / (1024 * 1024),
      externalMB: memUsage.external / (1024 * 1024),
      rssMB: memUsage.rss / (1024 * 1024),
      cpuUserMs: cpuUsage.user / 1000,
      cpuSystemMs: cpuUsage.system / 1000,
      cpuPercent: elapsedMs > 0 ? ((cpuUsage.user + cpuUsage.system) / 1000 / elapsedMs) * 100 : 0,
    };

    this.resourceSamples.push(usage);
    // Keep last 1000 samples
    if (this.resourceSamples.length > 1000) {
      this.resourceSamples.shift();
    }

    return usage;
  }

  /**
   * Get resource usage summary
   */
  getResourceSummary(): {
    current: ResourceUsage;
    peak: ResourceUsage;
    average: ResourceUsage;
    warnings: string[];
  } {
    const current = this.resourceSamples[this.resourceSamples.length - 1] ?? this.sampleResources();

    const peak: ResourceUsage = {
      timestamp: Date.now(),
      heapUsedMB: 0,
      heapTotalMB: 0,
      externalMB: 0,
      rssMB: 0,
      cpuUserMs: 0,
      cpuSystemMs: 0,
      cpuPercent: 0,
    };

    const sum: ResourceUsage = { ...peak, timestamp: 0 };

    for (const sample of this.resourceSamples) {
      peak.heapUsedMB = Math.max(peak.heapUsedMB, sample.heapUsedMB);
      peak.heapTotalMB = Math.max(peak.heapTotalMB, sample.heapTotalMB);
      peak.externalMB = Math.max(peak.externalMB, sample.externalMB);
      peak.rssMB = Math.max(peak.rssMB, sample.rssMB);
      peak.cpuPercent = Math.max(peak.cpuPercent, sample.cpuPercent);

      sum.heapUsedMB += sample.heapUsedMB;
      sum.heapTotalMB += sample.heapTotalMB;
      sum.externalMB += sample.externalMB;
      sum.rssMB += sample.rssMB;
      sum.cpuPercent += sample.cpuPercent;
    }

    const count = this.resourceSamples.length || 1;
    const average: ResourceUsage = {
      timestamp: Date.now(),
      heapUsedMB: sum.heapUsedMB / count,
      heapTotalMB: sum.heapTotalMB / count,
      externalMB: sum.externalMB / count,
      rssMB: sum.rssMB / count,
      cpuUserMs: sum.cpuUserMs / count,
      cpuSystemMs: sum.cpuSystemMs / count,
      cpuPercent: sum.cpuPercent / count,
    };

    const warnings: string[] = [];
    if (peak.heapUsedMB > this.resourceThresholds.heapUsedMB) {
      warnings.push(`Peak heap usage (${peak.heapUsedMB.toFixed(0)}MB) exceeds threshold (${this.resourceThresholds.heapUsedMB}MB)`);
    }
    if (peak.cpuPercent > this.resourceThresholds.cpuPercent) {
      warnings.push(`Peak CPU usage (${peak.cpuPercent.toFixed(0)}%) exceeds threshold (${this.resourceThresholds.cpuPercent}%)`);
    }

    return { current, peak, average, warnings };
  }

  // ============================================
  // TIME BREAKDOWN
  // ============================================

  private updateTimeBreakdown(type: BottleneckType, durationMs: number): void {
    switch (type) {
      case "api_latency":
        this.timeBreakdown.apiTimeMs += durationMs;
        break;
      case "tool_execution":
        this.timeBreakdown.toolTimeMs += durationMs;
        break;
      case "context_compaction":
        this.timeBreakdown.compactionTimeMs += durationMs;
        break;
      case "file_io":
      case "network_io":
        this.timeBreakdown.otherTimeMs += durationMs;
        break;
      default:
        this.timeBreakdown.otherTimeMs += durationMs;
    }
  }

  recordIdleTime(durationMs: number): void {
    this.timeBreakdown.idleTimeMs += durationMs;
  }

  // ============================================
  // PROFILE GENERATION
  // ============================================

  /**
   * Generate session performance profile
   */
  generateProfile(): SessionPerformanceProfile {
    const { peak, average } = this.getResourceSummary();
    const totalDurationMs = Date.now() - this.startTime;

    const totalTime = Object.values(this.timeBreakdown).reduce((a, b) => a + b, 0);

    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      endTime: Date.now(),
      totalDurationMs,

      timeBreakdown: { ...this.timeBreakdown },

      efficiency: {
        productiveTimeRatio: totalTime > 0
          ? (this.timeBreakdown.apiTimeMs + this.timeBreakdown.toolTimeMs) / totalTime
          : 0,
        apiUtilization: (this.timeBreakdown.apiTimeMs + this.timeBreakdown.idleTimeMs) > 0
          ? this.timeBreakdown.apiTimeMs / (this.timeBreakdown.apiTimeMs + this.timeBreakdown.idleTimeMs)
          : 0,
        parallelismRatio: 1, // Would need actual parallel tracking
      },

      peakResourceUsage: peak,
      avgResourceUsage: average,

      bottlenecks: this.getBottlenecks(),
    };
  }

  /**
   * Get optimization suggestions based on profile
   */
  getOptimizationSuggestions(): string[] {
    const suggestions: string[] = [];
    const profile = this.generateProfile();

    // Check efficiency
    if (profile.efficiency.productiveTimeRatio < 0.5) {
      suggestions.push("Low productive time ratio - consider reducing idle time between operations");
    }

    // Check API utilization
    if (profile.efficiency.apiUtilization < 0.3) {
      suggestions.push("Low API utilization - consider using streaming or batching requests");
    }

    // Check bottlenecks
    const topBottlenecks = profile.bottlenecks.slice(0, 3);
    for (const b of topBottlenecks) {
      if (b.impactScore > 50) {
        suggestions.push(`High-impact bottleneck: ${b.operation} - ${b.suggestion}`);
      }
    }

    // Check resource usage
    const { warnings } = this.getResourceSummary();
    suggestions.push(...warnings);

    // Check memory trend
    if (profile.peakResourceUsage.heapUsedMB > 500) {
      suggestions.push("High memory usage - check for memory leaks or reduce data retention");
    }

    return suggestions;
  }

  // ============================================
  // EXPORT
  // ============================================

  export(): {
    sessionId: string;
    metrics: PercentileMetrics[];
    bottlenecks: Bottleneck[];
    resourceSummary: ReturnType<PerformanceAnalyticsEngine["getResourceSummary"]>;
    timeBreakdown: TimeBreakdown;
    profile: SessionPerformanceProfile;
    suggestions: string[];
  } {
    return {
      sessionId: this.sessionId,
      metrics: this.getAllMetrics(),
      bottlenecks: this.getBottlenecks(),
      resourceSummary: this.getResourceSummary(),
      timeBreakdown: this.timeBreakdown,
      profile: this.generateProfile(),
      suggestions: this.getOptimizationSuggestions(),
    };
  }
}

// ============================================
// SINGLETON
// ============================================

let _engine: PerformanceAnalyticsEngine | null = null;

export function getPerformanceAnalytics(sessionId?: string): PerformanceAnalyticsEngine {
  if (!_engine && sessionId) {
    _engine = new PerformanceAnalyticsEngine(sessionId);
  }
  if (!_engine) {
    throw new Error("PerformanceAnalyticsEngine not initialized. Call getPerformanceAnalytics(sessionId) first.");
  }
  return _engine;
}

export function resetPerformanceAnalytics(): void {
  _engine = null;
}

export function createPerformanceAnalytics(sessionId: string): PerformanceAnalyticsEngine {
  _engine = new PerformanceAnalyticsEngine(sessionId);
  return _engine;
}
