/**
 * Telemetry Schemas
 * Zod schemas for telemetry and tracking
 */

import { z } from "zod";

// ============================================
// TELEMETRY CONFIG SCHEMAS
// ============================================

export const TelemetryConfigSchema = z.object({
  enabled: z.boolean(),
  endpoint: z.string().optional(),
  batchSize: z.number().optional(),
  flushIntervalMs: z.number().optional(),
  includeEnvironment: z.boolean().optional(),
});

// ============================================
// TELEMETRY EVENT SCHEMAS
// ============================================

export const TelemetryEventTypeSchema = z.enum([
  "session_start",
  "session_end",
  "tool_use",
  "api_call",
  "error",
  "performance",
  "user_action",
]);

export const TelemetryEventSchema = z.object({
  type: TelemetryEventTypeSchema,
  timestamp: z.number(),
  data: z.record(z.unknown()),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
});

// ============================================
// TELEMETRY METRICS SCHEMAS
// ============================================

export const TelemetryMetricsSchema = z.object({
  eventsSent: z.number(),
  eventsQueued: z.number(),
  errors: z.number(),
  lastFlush: z.number().optional(),
  averageLatency: z.number().optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type TelemetryConfig = z.infer<typeof TelemetryConfigSchema>;
export type TelemetryEventType = z.infer<typeof TelemetryEventTypeSchema>;
export type TelemetryEvent = z.infer<typeof TelemetryEventSchema>;
export type TelemetryMetrics = z.infer<typeof TelemetryMetricsSchema>;
