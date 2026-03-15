/**
 * Cost Calculation Schemas
 * Zod schemas for cost tracking and calculation
 */

import { z } from "zod";

// ============================================
// MODEL USAGE SCHEMAS
// ============================================

export const ModelUsageSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheReadInputTokens: z.number(),
  cacheCreationInputTokens: z.number(),
  webSearchRequests: z.number(),
  costUSD: z.number(),
});

export const CostTrackingStateSchema = z.object({
  modelUsage: z.record(ModelUsageSchema),
  totalCostUSD: z.number(),
});

// ============================================
// PRICING MODEL SCHEMAS
// ============================================

export const ModelPricingConfigSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheReadInputTokens: z.number().optional(),
  cacheCreationInputTokens: z.number().optional(),
});

export const UsageForCostSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheReadInputTokens: z.number().optional(),
  cacheCreationInputTokens: z.number().optional(),
});

// ============================================
// CACHE METRICS SCHEMAS
// ============================================

export const CacheMetricsSchema = z.object({
  cacheHits: z.number(),
  cacheMisses: z.number(),
  cacheReadTokens: z.number(),
  cacheWriteTokens: z.number(),
  totalCacheReadTokens: z.number(),
  totalCacheWriteTokens: z.number(),
  estimatedSavingsUSD: z.number(),
  cacheHitRate: z.number(),
});

// ============================================
// COST DISPLAY SCHEMAS
// ============================================

export const CostDisplayConfigSchema = z.object({
  showCacheBreakdown: z.boolean(),
  showModelBreakdown: z.boolean(),
  showTokenCounts: z.boolean(),
});

// ============================================
// EFFORT PARAMETER SCHEMAS
// ============================================

export const EffortLevelSchema = z.enum(["low", "medium", "high", "max"]);

export const EffortGuidanceSchema = z.record(EffortLevelSchema, z.string());

// ============================================
// TYPE EXPORTS
// ============================================

export type ModelUsage = z.infer<typeof ModelUsageSchema>;
export type CostTrackingState = z.infer<typeof CostTrackingStateSchema>;
export type ModelPricingConfig = z.infer<typeof ModelPricingConfigSchema>;
export type UsageForCost = z.infer<typeof UsageForCostSchema>;
export type CacheMetrics = z.infer<typeof CacheMetricsSchema>;
export type CostDisplayConfig = z.infer<typeof CostDisplayConfigSchema>;
export type EffortLevel = z.infer<typeof EffortLevelSchema>;
export type EffortGuidance = z.infer<typeof EffortGuidanceSchema>;
