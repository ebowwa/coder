/**
 * Telemetry Types
 * Core type definitions for the telemetry system
 * @module telemetry/types
 */

import { z } from "zod";

// ============================================
// TELEMETRY CONFIG SCHEMAS
// ============================================

export const LogLevelSchema = z.enum([
  "trace",
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
]);

export const ExporterTypeSchema = z.enum([
  "console",
  "file",
  "otlp",
]);

export const TelemetryConfigSchema = z.object({
  enabled: z.boolean().default(true),
  logLevel: LogLevelSchema.default("info"),
  prettyPrint: z.boolean().default(true),
  tracingEnabled: z.boolean().default(true),
  samplingRate: z.number().min(0).max(1).default(1.0),
  metricsEnabled: z.boolean().default(true),
  exporters: z.array(ExporterTypeSchema).default(["console"]),
  otlpEndpoint: z.string().optional(),
  filePath: z.string().optional(),
  includeStackTrace: z.boolean().default(true),
  flushIntervalMs: z.number().default(5000),
  batchSize: z.number().default(100),
});

// ============================================
// SPAN SCHEMAS (OpenTelemetry-compatible)
// ============================================

export const SpanKindSchema = z.enum([
  "internal",
  "client",
  "server",
  "producer",
  "consumer",
]);

export const SpanStatusSchema = z.enum([
  "unset",
  "ok",
  "error",
]);

export const SpanEventSchema = z.object({
  name: z.string(),
  timestamp: z.number(),
  attributes: z.record(z.unknown()).optional(),
});

export const SpanSchema = z.object({
  traceId: z.string(),
  spanId: z.string(),
  parentSpanId: z.string().optional(),
  name: z.string(),
  kind: SpanKindSchema,
  startTime: z.number(),
  endTime: z.number().optional(),
  status: SpanStatusSchema.default("unset"),
  statusMessage: z.string().optional(),
  attributes: z.record(z.unknown()).default({}),
  events: z.array(SpanEventSchema).default([]),
});

// ============================================
// METRIC SCHEMAS
// ============================================

export const MetricTypeSchema = z.enum([
  "counter",
  "gauge",
  "histogram",
]);

export const MetricDataPointSchema = z.object({
  value: z.number(),
  timestamp: z.number(),
  attributes: z.record(z.unknown()).optional(),
});

export const HistogramBucketSchema = z.object({
  boundary: z.number(),
  count: z.number(),
});

export const HistogramDataSchema = z.object({
  count: z.number(),
  sum: z.number(),
  min: z.number().optional(),
  max: z.number().optional(),
  buckets: z.array(HistogramBucketSchema).optional(),
});

export const MetricSchema = z.object({
  name: z.string(),
  type: MetricTypeSchema,
  description: z.string().optional(),
  unit: z.string().optional(),
  dataPoints: z.array(MetricDataPointSchema),
  histogram: HistogramDataSchema.optional(),
});

// ============================================
// LOG ENTRY SCHEMAS
// ============================================

export const LogContextSchema = z.record(z.unknown());

export const LogEntrySchema = z.object({
  timestamp: z.string(),
  level: LogLevelSchema,
  message: z.string(),
  context: z.record(z.unknown()).optional(),
  error: z.object({
    name: z.string(),
    message: z.string(),
    stack: z.string().optional(),
  }).optional(),
  duration: z.number().optional(),
  traceId: z.string().optional(),
  spanId: z.string().optional(),
  sessionId: z.string().optional(),
});

// ============================================
// TELEMETRY EVENT SCHEMAS
// ============================================

export const TelemetryEventTypeSchema = z.enum([
  "session_start",
  "session_end",
  "turn_start",
  "turn_end",
  "api_call_start",
  "api_call_end",
  "tool_call_start",
  "tool_call_end",
  "error",
  "metric",
  "log",
]);

export const TelemetryEventSchema = z.object({
  id: z.string(),
  type: TelemetryEventTypeSchema,
  timestamp: z.number(),
  traceId: z.string().optional(),
  spanId: z.string().optional(),
  data: z.record(z.unknown()),
});

// ============================================
// TELEMETRY METRICS AGGREGATION
// ============================================

export const SessionMetricsSchema = z.object({
  sessionId: z.string(),
  startTime: z.number(),
  endTime: z.number().optional(),
  turnCount: z.number().default(0),
  totalCostUSD: z.number().default(0),
  totalInputTokens: z.number().default(0),
  totalOutputTokens: z.number().default(0),
  totalCacheReadTokens: z.number().default(0),
  totalCacheWriteTokens: z.number().default(0),
  totalThinkingTokens: z.number().default(0),
  apiCallCount: z.number().default(0),
  toolCallCount: z.number().default(0),
  errorCount: z.number().default(0),
  avgTTFT: z.number().optional(),
  avgLatency: z.number().optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type LogLevel = z.infer<typeof LogLevelSchema>;
export type ExporterType = z.infer<typeof ExporterTypeSchema>;
export type TelemetryConfig = z.infer<typeof TelemetryConfigSchema>;
export type SpanKind = z.infer<typeof SpanKindSchema>;
export type SpanStatus = z.infer<typeof SpanStatusSchema>;
export type SpanEvent = z.infer<typeof SpanEventSchema>;
export type Span = z.infer<typeof SpanSchema>;
export type MetricType = z.infer<typeof MetricTypeSchema>;
export type MetricDataPoint = z.infer<typeof MetricDataPointSchema>;
export type HistogramBucket = z.infer<typeof HistogramBucketSchema>;
export type HistogramData = z.infer<typeof HistogramDataSchema>;
export type Metric = z.infer<typeof MetricSchema>;
export type LogContext = z.infer<typeof LogContextSchema>;
export type LogEntry = z.infer<typeof LogEntrySchema>;
export type TelemetryEventType = z.infer<typeof TelemetryEventTypeSchema>;
export type TelemetryEvent = z.infer<typeof TelemetryEventSchema>;
export type SessionMetrics = z.infer<typeof SessionMetricsSchema>;

// ============================================
// TYPE GUARDS
// ============================================

export function isLogLevel(value: unknown): value is LogLevel {
  return LogLevelSchema.safeParse(value).success;
}

export function isSpan(value: unknown): value is Span {
  return SpanSchema.safeParse(value).success;
}

export function isMetric(value: unknown): value is Metric {
  return MetricSchema.safeParse(value).success;
}

export function isLogEntry(value: unknown): value is LogEntry {
  return LogEntrySchema.safeParse(value).success;
}

export function isTelemetryEvent(value: unknown): value is TelemetryEvent {
  return TelemetryEventSchema.safeParse(value).success;
}

// ============================================
// METRIC NAMES (constants)
// ============================================

export const METRIC_NAMES = {
  // API metrics
  API_CALLS_TOTAL: "coder.api.calls.total",
  API_LATENCY: "coder.api.latency",
  API_TTFT: "coder.api.ttft",
  API_TOKENS_INPUT: "coder.api.tokens.input",
  API_TOKENS_OUTPUT: "coder.api.tokens.output",
  API_COST_USD_TOTAL: "coder.api.cost_usd.total",
  API_ERRORS_TOTAL: "coder.api.errors.total",

  // Turn metrics
  TURN_TOTAL: "coder.turn.total",
  TURN_DURATION_MS: "coder.turn.duration_ms",
  TURN_ERRORS_TOTAL: "coder.turn.errors.total",

  // Tool metrics
  TOOL_CALLS_TOTAL: "coder.tool.calls.total",
  TOOL_DURATION_MS: "coder.tool.duration_ms",
  TOOL_ERRORS_TOTAL: "coder.tool.errors.total",

  // Cache metrics
  CACHE_HIT_RATE: "coder.cache.hit_rate",

  // Session metrics
  SESSION_COST_TOTAL: "coder.session.cost_total",
} as const;

export type MetricName = typeof METRIC_NAMES[keyof typeof METRIC_NAMES];
