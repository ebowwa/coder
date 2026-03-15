/**
 * Model Selection Schemas
 * Zod schemas for model selection logic
 */

import { z } from "zod";

// ============================================
// MODEL TIER SCHEMAS
// ============================================

export const ModelTierSchema = z.enum(["haiku", "sonnet", "opus"]);

// ============================================
// MODEL CAPABILITY SCHEMAS
// ============================================

export const ModelCapabilitySchema = z.object({
  supportsVision: z.boolean(),
  supportsThinking: z.boolean(),
  supportsStreaming: z.boolean(),
  supportsParallelToolCalls: z.boolean(),
  supportsBatch: z.boolean(),
  maxContextWindow: z.number(),
  maxOutputTokens: z.number(),
});

// ============================================
// MODEL SELECTION CRITERIA SCHEMAS
// ============================================

export const ModelSelectionCriteriaSchema = z.object({
  preferredTier: ModelTierSchema.optional(),
  requiresVision: z.boolean().optional(),
  requiresThinking: z.boolean().optional(),
  requiresStreaming: z.boolean().optional(),
  maxCost: z.number().optional(),
  minContextWindow: z.number().optional(),
  maxLatency: z.number().optional(),
  excludeModels: z.array(z.string()).optional(),
  preferModels: z.array(z.string()).optional(),
});

// ============================================
// MODEL SELECTION RESULT SCHEMAS
// ============================================

export const ModelSelectionResultSchema = z.object({
  modelId: z.string(),
  reason: z.string(),
  alternatives: z.array(z.string()).optional(),
  estimatedCost: z.number().optional(),
  estimatedLatency: z.number().optional(),
});

// ============================================
// MODEL AVAILABILITY SCHEMAS
// ============================================

export const ModelAvailabilitySchema = z.object({
  modelId: z.string(),
  available: z.boolean(),
  reason: z.string().optional(),
  backends: z.array(z.enum(["anthropic", "bedrock", "vertex", "foundry"])),
});

// ============================================
// MODEL SELECTION GUIDANCE SCHEMAS
// ============================================

export const ModelSelectionGuidanceSchema = z.record(z.string(), z.string());

// ============================================
// TYPE EXPORTS
// ============================================

export type ModelTier = z.infer<typeof ModelTierSchema>;
export type ModelCapability = z.infer<typeof ModelCapabilitySchema>;
export type ModelSelectionCriteria = z.infer<typeof ModelSelectionCriteriaSchema>;
export type ModelSelectionResult = z.infer<typeof ModelSelectionResultSchema>;
export type ModelAvailability = z.infer<typeof ModelAvailabilitySchema>;
export type ModelSelectionGuidance = z.infer<typeof ModelSelectionGuidanceSchema>;
