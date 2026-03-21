/**
 * Zod Validation Schemas for Model Types
 * Derived from types/models.ts
 * @version 2.0.0 - Complete schema coverage with validation helpers
 */

import { z } from "zod";

// ============================================
// MODEL ID SCHEMAS
// ============================================

/** Known Claude model IDs with extended context variants */
export const KnownClaudeModelSchema = z.enum([
  "claude-opus-4-6",
  "claude-opus-4-6[1m]",
  "claude-opus-4-1",
  "claude-opus-4",
  "claude-sonnet-4-6",
  "claude-sonnet-4-6[1m]",
  "claude-sonnet-4-5",
  "claude-sonnet-4",
  "claude-haiku-4-5",
  "claude-haiku-4-5-20251001",
]);

/** Claude model ID - known models or custom string */
export const ClaudeModelSchema = z.union([
  KnownClaudeModelSchema,
  z.string(), // Allow any string for custom models
]);

// ============================================
// CONTEXT WINDOWS SCHEMAS
// ============================================

export const ContextWindowsSchema = z.object({
  standard: z.literal(200000),
  extended_1m: z.literal(100000),
});

export const MaxOutputTokensSchema = z.object({
  default: z.literal(40000),
  min: z.literal(10000),
  max: z.literal(40000),
});

// ============================================
// MODEL TIER SCHEMA
// ============================================

export const ModelTierSchema = z.enum(["haiku", "sonnet", "opus"]);

// ============================================
// MODEL PROVIDER SCHEMA
// ============================================

export const ModelProviderSchema = z.enum(["anthropic", "zhipu", "openai", "other"]);

// ============================================
// MODEL DEFINITION SCHEMA (Extended)
// ============================================

export const ModelPricingSchema = z.object({
  input: z.number().nonnegative(),
  output: z.number().nonnegative(),
  cacheWrite: z.number().nonnegative(),
  cacheRead: z.number().nonnegative(),
});

export const ModelDefinitionSchema = z.object({
  /** Model ID (e.g., "claude-opus-4-6") */
  id: z.string(),
  /** Short display name (e.g., "Opus 4.6") */
  name: z.string(),
  /** Display name - alias for name (for schema compatibility) */
  displayName: z.string(),
  /** Full display name (e.g., "Claude Opus 4.6") - for /models command */
  fullName: z.string(),
  /** Context window in tokens */
  contextWindow: z.number().int().positive(),
  /** Maximum output tokens (optional, defaults to contextWindow/4) */
  maxOutput: z.number().int().positive().optional(),
  /** Pricing per 1M tokens in USD */
  pricing: ModelPricingSchema,
  /** Whether model supports extended thinking */
  supportsThinking: z.boolean(),
  /** Model provider */
  provider: ModelProviderSchema,
  /** Whether model supports vision/images */
  supportsVision: z.boolean(),
  /** Model tier (haiku, sonnet, opus) */
  tier: ModelTierSchema,
  /** Vertex region (optional) */
  vertexRegion: z.string().optional(),
});

// ============================================
// VERTEX REGION MAPPING SCHEMA
// ============================================

export const VertexRegionMappingSchema = z.object({
  modelId: z.string(),
  regionEnv: z.string(),
});

// ============================================
// EXTENDED THINKING SCHEMAS
// ============================================

export const ExtendedThinkingFeaturesSchema = z.object({
  interleavedThinking: z.string(),
  adaptiveThinking: z.string(),
  redactThinking: z.string(),
});

export const ExtendedThinkingSettingsSchema = z.object({
  alwaysThinkingEnabled: z.string(),
  showThinkingSummaries: z.string(),
});

export const ModelPricingRegistrySchema = z.record(z.string(), ModelPricingSchema);

// ============================================
// COST CALCULATION INPUT SCHEMA
// ============================================

export const CostCalculationInputSchema = z.object({
  modelId: z.string(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cacheWriteTokens: z.number().int().nonnegative().default(0),
  cacheReadTokens: z.number().int().nonnegative().default(0),
});

// ============================================
// TYPE GUARDS
// ============================================

export function isClaudeModel(value: unknown): value is z.infer<typeof ClaudeModelSchema> {
  return ClaudeModelSchema.safeParse(value).success;
}

export function isKnownClaudeModel(value: unknown): value is z.infer<typeof KnownClaudeModelSchema> {
  return KnownClaudeModelSchema.safeParse(value).success;
}

export function isModelTier(value: unknown): value is z.infer<typeof ModelTierSchema> {
  return ModelTierSchema.safeParse(value).success;
}

export function isModelDefinition(value: unknown): value is z.infer<typeof ModelDefinitionSchema> {
  return ModelDefinitionSchema.safeParse(value).success;
}

export function isVertexRegionMapping(value: unknown): value is z.infer<typeof VertexRegionMappingSchema> {
  return VertexRegionMappingSchema.safeParse(value).success;
}

export function isModelPricing(value: unknown): value is z.infer<typeof ModelPricingSchema> {
  return ModelPricingSchema.safeParse(value).success;
}

export function isExtendedThinkingFeatures(value: unknown): value is z.infer<typeof ExtendedThinkingFeaturesSchema> {
  return ExtendedThinkingFeaturesSchema.safeParse(value).success;
}

export function isExtendedThinkingSettings(value: unknown): value is z.infer<typeof ExtendedThinkingSettingsSchema> {
  return ExtendedThinkingSettingsSchema.safeParse(value).success;
}

export function isCostCalculationInput(value: unknown): value is z.infer<typeof CostCalculationInputSchema> {
  return CostCalculationInputSchema.safeParse(value).success;
}

// Type guards for runtime validation
export function isValidModelId(id: unknown): id is string {
  return z.string().safeParse(id).success;
}

export function isValidModelTier(tier: unknown): tier is "haiku" | "sonnet" | "opus" {
  return ModelTierSchema.safeParse(tier).success;
}

export function isValidModelDefinition(model: unknown): model is z.infer<typeof ModelDefinitionSchema> {
  return ModelDefinitionSchema.safeParse(model).success;
}

export function isValidPricing(pricing: unknown): pricing is z.infer<typeof ModelPricingSchema> {
  return ModelPricingSchema.safeParse(pricing).success;
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validates the entire model registry at runtime
 * Useful for ensuring config integrity on startup
 */
export function validateModelRegistry(
  registry: unknown
): z.SafeParseReturnType<unknown, z.infer<typeof ModelDefinitionSchema>[]> {
  return z.array(ModelDefinitionSchema).safeParse(registry);
}

/**
 * Validates the pricing registry at runtime
 */
export function validatePricingRegistry(
  registry: unknown
): z.SafeParseReturnType<unknown, Record<string, z.infer<typeof ModelPricingSchema>>> {
  return ModelPricingRegistrySchema.safeParse(registry);
}

/**
 * Validates vertex region mappings
 */
export function validateVertexRegionMappings(
  mappings: unknown
): z.SafeParseReturnType<unknown, z.infer<typeof VertexRegionMappingSchema>[]> {
  return z.array(VertexRegionMappingSchema).safeParse(mappings);
}

// ============================================
// MODEL VALIDATION UTILITIES
// ============================================

/**
 * Check if a model ID has extended context (1M tokens)
 */
export function hasExtendedContext(modelId: string): boolean {
  return modelId.includes("[1m]");
}

/**
 * Extract base model ID without context suffix
 */
export function getBaseModelId(modelId: string): string {
  return modelId.replace(/\[1m\]$/, "");
}

/**
 * Validate model ID format
 */
export function isValidModelIdFormat(modelId: unknown): modelId is string {
  if (typeof modelId !== "string") return false;
  // Basic format: claude-{tier}-{version} with optional [1m] suffix
  return /^claude-(opus|sonnet|haiku)-[\d.-]+(\[1m\])?$/.test(modelId) ||
         // Also allow custom model IDs
         modelId.length > 0;
}
