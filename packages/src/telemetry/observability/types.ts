/**
 * Observability Types
 * Type definitions for the observability system
 * @module telemetry/observability/types
 */

import { z } from "zod";

// ============================================
// HEALTH CHECK SCHEMAS
// ============================================

export const HealthStatusSchema = z.enum([
  "healthy",
  "degraded",
  "unhealthy",
]);

export const ComponentHealthSchema = z.object({
  name: z.string(),
  status: HealthStatusSchema,
  message: z.string().optional(),
  lastCheck: z.number(),
  latencyMs: z.number().optional(),
  details: z.record(z.unknown()).optional(),
});

export const SystemHealthSchema = z.object({
  status: HealthStatusSchema,
  components: z.array(ComponentHealthSchema),
  uptime: z.number(),
  version: z.string(),
  timestamp: z.number(),
});

// Extended health types for internal use
export interface HealthCheckResult extends ComponentHealth {
  latencyMs?: number;
  lastCheck: number;
  details?: Record<string, unknown>;
}

// ============================================
// ALERT SCHEMAS
// ============================================

export const AlertSeveritySchema = z.enum([
  "info",
  "warning",
  "error",
  "critical",
]);

export const AlertSchema = z.object({
  id: z.string(),
  name: z.string(),
  severity: AlertSeveritySchema,
  message: z.string(),
  threshold: z.number(),
  currentValue: z.number(),
  timestamp: z.number(),
  acknowledged: z.boolean().default(false),
  metadata: z.record(z.unknown()).optional(),
});

export const AlertRuleSchema = z.object({
  name: z.string(),
  metric: z.string(),
  threshold: z.number(),
  comparison: z.enum(["gt", "lt", "gte", "lte", "eq"]),
  severity: AlertSeveritySchema,
  cooldownMs: z.number().default(60000), // 1 minute cooldown
  enabled: z.boolean().default(true),
});

// ============================================
// PERFORMANCE INSIGHT SCHEMAS
// ============================================

export const InsightCategorySchema = z.enum([
  "performance",
  "cost",
  "usage",
  "error",
  "optimization",
]);

export const InsightSchema = z.object({
  id: z.string(),
  category: InsightCategorySchema,
  title: z.string(),
  description: z.string(),
  impact: z.enum(["low", "medium", "high"]),
  recommendation: z.string(),
  metrics: z.record(z.number()).optional(),
  timestamp: z.number(),
});

export const PerformanceAnalysisSchema = z.object({
  avgTTFT: z.number(),
  avgLatency: z.number(),
  p50Latency: z.number(),
  p95Latency: z.number(),
  p99Latency: z.number(),
  errorRate: z.number(), // percentage 0-100
  throughput: z.number(), // requests per minute
  cacheHitRate: z.number(), // percentage 0-100
  costPerRequest: z.number(),
  tokensPerRequest: z.number(),
});

// ============================================
// DASHBOARD SCHEMAS
// ============================================

export const DashboardWidgetSchema = z.object({
  id: z.string(),
  type: z.enum([
    "metric",
    "gauge",
    "chart",
    "table",
    "log",
    "alert",
    "health",
  ]),
  title: z.string(),
  dataSource: z.string(),
  refreshIntervalMs: z.number().default(1000),
  position: z.object({
    row: z.number(),
    col: z.number(),
    width: z.number(),
    height: z.number(),
  }),
  config: z.record(z.unknown()).optional(),
});

export const DashboardConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  widgets: z.array(DashboardWidgetSchema),
  refreshIntervalMs: z.number().default(1000),
  theme: z.enum(["dark", "light"]).default("dark"),
});

// ============================================
// SESSION REPORT SCHEMAS
// ============================================

export const SessionReportSchema = z.object({
  sessionId: z.string(),
  startTime: z.number(),
  endTime: z.number(),
  duration: z.number(),
  model: z.string(),
  // Token usage
  totalInputTokens: z.number(),
  totalOutputTokens: z.number(),
  totalCacheReadTokens: z.number(),
  totalCacheWriteTokens: z.number(),
  totalThinkingTokens: z.number(),
  // Costs
  totalCostUSD: z.number(),
  inputCostUSD: z.number(),
  outputCostUSD: z.number(),
  cacheSavingsUSD: z.number(),
  // Performance
  turnCount: z.number(),
  apiCallCount: z.number(),
  toolCallCount: z.number(),
  errorCount: z.number(),
  avgTTFT: z.number().optional(),
  avgLatency: z.number().optional(),
  // Tool breakdown
  toolBreakdown: z.record(z.object({
    count: z.number(),
    avgDuration: z.number(),
    errorCount: z.number(),
  })),
  // Timeline
  timeline: z.array(z.object({
    timestamp: z.number(),
    type: z.enum(["turn", "tool", "error", "api"]),
    name: z.string(),
    duration: z.number().optional(),
    cost: z.number().optional(),
  })),
  // Insights
  insights: z.array(z.string()),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type HealthStatus = z.infer<typeof HealthStatusSchema>;
export type ComponentHealth = z.infer<typeof ComponentHealthSchema>;
export type SystemHealth = z.infer<typeof SystemHealthSchema>;
export type AlertSeverity = z.infer<typeof AlertSeveritySchema>;
export type Alert = z.infer<typeof AlertSchema>;
export type AlertRule = z.infer<typeof AlertRuleSchema>;
export type InsightCategory = z.infer<typeof InsightCategorySchema>;
export type Insight = z.infer<typeof InsightSchema>;
export type PerformanceAnalysis = z.infer<typeof PerformanceAnalysisSchema>;
export type DashboardWidget = z.infer<typeof DashboardWidgetSchema>;
export type DashboardConfig = z.infer<typeof DashboardConfigSchema>;
export type SessionReport = z.infer<typeof SessionReportSchema>;

// ============================================
// DEFAULT ALERT RULES
// ============================================

export const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    name: "high_latency",
    metric: "coder.api.latency",
    threshold: 30000, // 30 seconds
    comparison: "gt",
    severity: "warning",
    cooldownMs: 60000,
    enabled: true,
  },
  {
    name: "high_ttft",
    metric: "coder.api.ttft",
    threshold: 10000, // 10 seconds
    comparison: "gt",
    severity: "warning",
    cooldownMs: 60000,
    enabled: true,
  },
  {
    name: "high_error_rate",
    metric: "coder.api.errors.total",
    threshold: 5,
    comparison: "gt",
    severity: "error",
    cooldownMs: 300000, // 5 minutes
    enabled: true,
  },
  {
    name: "high_cost",
    metric: "coder.session.cost_total",
    threshold: 10, // $10 USD
    comparison: "gt",
    severity: "info",
    cooldownMs: 60000,
    enabled: true,
  },
  {
    name: "low_cache_hit_rate",
    metric: "coder.cache.hit_rate",
    threshold: 0.3, // 30%
    comparison: "lt",
    severity: "info",
    cooldownMs: 300000,
    enabled: true,
  },
];
