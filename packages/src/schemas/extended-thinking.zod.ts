/**
 * Extended Thinking Schemas
 * Zod schemas for extended thinking and reasoning features
 */

import { z } from "zod";

// ============================================
// EXTENDED THINKING CONFIG SCHEMAS
// ============================================

export const ExtendedThinkingConfigSchema = z.object({
  type: z.enum(["enabled", "disabled"]),
  budget_tokens: z.number().optional(),
});

// ============================================
// THINKING BLOCK SCHEMAS
// ============================================

export const ThinkingBlockSchema = z.object({
  type: z.literal("thinking"),
  thinking: z.string(),
});

export const RedactedThinkingBlockSchema = z.object({
  type: z.literal("redacted_thinking"),
  data: z.string(),
});

// ============================================
// EXTENDED THINKING FEATURES SCHEMAS
// ============================================

export const ExtendedThinkingFeaturesSchema = z.object({
  interleavedThinking: z.string(),
  adaptiveThinking: z.string(),
  redactThinking: z.string(),
});

// ============================================
// EXTENDED THINKING SETTINGS SCHEMAS
// ============================================

export const ExtendedThinkingSettingsSchema = z.object({
  alwaysThinkingEnabled: z.string(),
  showThinkingSummaries: z.string(),
});

// ============================================
// MODEL THINKING SUPPORT SCHEMAS
// ============================================

export const ModelThinkingSupportSchema = z.object({
  modelId: z.string(),
  supportsThinking: z.boolean(),
  maxThinkingTokens: z.number().optional(),
  features: ExtendedThinkingFeaturesSchema.optional(),
});

// ============================================
// BETA HEADERS FOR THINKING SCHEMAS
// ============================================

export const ThinkingBetaHeadersSchema = z.object({
  interleavedThinking: z.string().optional(),
  adaptiveThinking: z.string().optional(),
  redactThinking: z.string().optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type ExtendedThinkingConfig = z.infer<typeof ExtendedThinkingConfigSchema>;
export type ThinkingBlock = z.infer<typeof ThinkingBlockSchema>;
export type RedactedThinkingBlock = z.infer<typeof RedactedThinkingBlockSchema>;
export type ExtendedThinkingFeatures = z.infer<typeof ExtendedThinkingFeaturesSchema>;
export type ExtendedThinkingSettings = z.infer<typeof ExtendedThinkingSettingsSchema>;
export type ModelThinkingSupport = z.infer<typeof ModelThinkingSupportSchema>;
export type ThinkingBetaHeaders = z.infer<typeof ThinkingBetaHeadersSchema>;
