/**
 * Model Configuration - Single Source of Truth
 * Consolidates all model-related constants, types, and utilities
 */

// ============================================
// MODEL DEFINITIONS
// ============================================

export interface ModelDefinition {
  /** Model ID (e.g., "claude-opus-4-6") */
  id: string;
  /** Short display name (e.g., "Opus 4.6") */
  name: string;
  /** Display name - alias for name (for schema compatibility) */
  displayName: string;
  /** Full display name (e.g., "Claude Opus 4.6") - for /models command */
  fullName: string;
  /** Context window in tokens */
  contextWindow: number;
  /** Maximum output tokens (optional, defaults to contextWindow/4) */
  maxOutput?: number;
  /** Pricing per 1M tokens in USD */
  pricing: {
    input: number;
    output: number;
    cacheWrite: number;
    cacheRead: number;
  };
  /** Whether model supports extended thinking */
  supportsThinking: boolean;
  /** Model provider */
  provider: "anthropic" | "zhipu" | "openai" | "other";
  /** Whether model supports vision/images */
  supportsVision: boolean;
  /** Model tier (haiku, sonnet, opus) */
  tier: "haiku" | "sonnet" | "opus";
}

/**
 * All available models with complete configuration
 */
export const MODELS: Record<string, ModelDefinition> = {
  // Claude 4.x Series (Latest)
  "claude-opus-4-6": {
    id: "claude-opus-4-6",
    name: "Opus 4.6",
    displayName: "Opus 4.6",
    fullName: "Claude Opus 4.6",
    contextWindow: 200_000,
    maxOutput: 32_000,
    pricing: { input: 15, output: 75, cacheWrite: 18.75, cacheRead: 1.5 },
    supportsThinking: true,
    provider: "anthropic",
    supportsVision: true,
    tier: "opus",
  },
  "claude-sonnet-4-6": {
    id: "claude-sonnet-4-6",
    name: "Sonnet 4.6",
    displayName: "Sonnet 4.6",
    fullName: "Claude Sonnet 4.6",
    contextWindow: 200_000,
    maxOutput: 16_000,
    pricing: { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
    supportsThinking: true,
    provider: "anthropic",
    supportsVision: true,
    tier: "sonnet",
  },
  "claude-haiku-4-5": {
    id: "claude-haiku-4-5",
    name: "Haiku 4.5",
    displayName: "Haiku 4.5",
    fullName: "Claude Haiku 4.5",
    contextWindow: 200_000,
    maxOutput: 8_000,
    pricing: { input: 0.8, output: 4, cacheWrite: 1, cacheRead: 0.08 },
    supportsThinking: true,
    provider: "anthropic",
    supportsVision: true,
    tier: "haiku",
  },
  "claude-haiku-4-5-20251001": {
    id: "claude-haiku-4-5-20251001",
    name: "Haiku 4.5",
    displayName: "Haiku 4.5",
    fullName: "Claude Haiku 4.5",
    contextWindow: 200_000,
    maxOutput: 8_000,
    pricing: { input: 0.8, output: 4, cacheWrite: 1, cacheRead: 0.08 },
    supportsThinking: true,
    provider: "anthropic",
    supportsVision: true,
    tier: "haiku",
  },

  // Claude 4.x Series (Legacy naming)
  "claude-opus-4-5": {
    id: "claude-opus-4-5",
    name: "Opus 4.5",
    displayName: "Opus 4.5",
    fullName: "Claude Opus 4.5",
    contextWindow: 200_000,
    maxOutput: 32_000,
    pricing: { input: 15, output: 75, cacheWrite: 18.75, cacheRead: 1.5 },
    supportsThinking: true,
    provider: "anthropic",
    supportsVision: true,
    tier: "opus",
  },
  "claude-sonnet-4-5": {
    id: "claude-sonnet-4-5",
    name: "Sonnet 4.5",
    displayName: "Sonnet 4.5",
    fullName: "Claude Sonnet 4.5",
    contextWindow: 200_000,
    maxOutput: 16_000,
    pricing: { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
    supportsThinking: true,
    provider: "anthropic",
    supportsVision: true,
    tier: "sonnet",
  },

  // Claude 3.x Series (Legacy)
  "claude-3-5-sonnet": {
    id: "claude-3-5-sonnet",
    name: "Sonnet 3.5",
    displayName: "Sonnet 3.5",
    fullName: "Claude 3.5 Sonnet",
    contextWindow: 200_000,
    maxOutput: 8_192,
    pricing: { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
    supportsThinking: false,
    provider: "anthropic",
    supportsVision: true,
    tier: "sonnet",
  },
  "claude-3-5-haiku": {
    id: "claude-3-5-haiku",
    name: "Haiku 3.5",
    displayName: "Haiku 3.5",
    fullName: "Claude 3.5 Haiku",
    contextWindow: 200_000,
    maxOutput: 8_192,
    pricing: { input: 0.8, output: 4, cacheWrite: 1, cacheRead: 0.08 },
    supportsThinking: false,
    provider: "anthropic",
    supportsVision: true,
    tier: "haiku",
  },
  "claude-3-opus": {
    id: "claude-3-opus",
    name: "Opus 3",
    displayName: "Opus 3",
    fullName: "Claude 3 Opus",
    contextWindow: 200_000,
    maxOutput: 4_096,
    pricing: { input: 15, output: 75, cacheWrite: 18.75, cacheRead: 1.5 },
    supportsThinking: false,
    provider: "anthropic",
    supportsVision: true,
    tier: "opus",
  },
  "claude-3-sonnet": {
    id: "claude-3-sonnet",
    name: "Sonnet 3",
    displayName: "Sonnet 3",
    fullName: "Claude 3 Sonnet",
    contextWindow: 200_000,
    maxOutput: 4_096,
    pricing: { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
    supportsThinking: false,
    provider: "anthropic",
    supportsVision: true,
    tier: "sonnet",
  },
  "claude-3-haiku": {
    id: "claude-3-haiku",
    name: "Haiku 3",
    displayName: "Haiku 3",
    fullName: "Claude 3 Haiku",
    contextWindow: 200_000,
    maxOutput: 4_096,
    pricing: { input: 0.25, output: 1.25, cacheWrite: 0.3, cacheRead: 0.03 },
    supportsThinking: false,
    provider: "anthropic",
    supportsVision: true,
    tier: "haiku",
  },

  // GLM Series (Zhipu AI)
  "glm-5": {
    id: "glm-5",
    name: "GLM-5",
    displayName: "GLM-5",
    fullName: "GLM-5",
    contextWindow: 200_000,
    maxOutput: 128_000,
    pricing: { input: 0.5, output: 0.5, cacheWrite: 0, cacheRead: 0 }, // GLM pricing TBD
    supportsThinking: true,
    provider: "zhipu",
    supportsVision: true,
    tier: "sonnet", // GLM-5 is roughly sonnet-tier
  },
  "glm-4.5-air": {
    id: "glm-4.5-air",
    name: "GLM-4.5 Air",
    displayName: "GLM-4.5 Air",
    fullName: "GLM-4.5 Air",
    contextWindow: 128_000,
    maxOutput: 4_096,
    pricing: { input: 0.1, output: 0.1, cacheWrite: 0, cacheRead: 0 },
    supportsThinking: false,
    provider: "zhipu",
    supportsVision: false,
    tier: "haiku", // GLM-4.5 Air is haiku-tier (fast/cheap)
  },
};

// ============================================
// MODEL LISTS
// ============================================

/** Models available for interactive use (shown in /models command) */
export const AVAILABLE_MODELS = [
  MODELS["claude-opus-4-6"]!,
  MODELS["claude-sonnet-4-6"]!,
  MODELS["claude-haiku-4-5"]!,
  MODELS["glm-5"]!,
] as const;

/** Model aliases for subagent tasks */
export const MODEL_ALIASES = {
  haiku: "claude-haiku-4-5",
  sonnet: "claude-sonnet-4-6",
  opus: "claude-opus-4-6",
  fast: "glm-4.5-air",
  default: "claude-sonnet-4-6",
} as const;

// ============================================
// DEFAULTS
// ============================================

/** Default model for interactive use */
export const DEFAULT_MODEL = "claude-sonnet-4-6";

/** Default model for summarization (fast/cheap) */
export const SUMMARIZATION_MODEL = process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL || "glm-4.5-air";

/** Default context window if model not found */
export const DEFAULT_CONTEXT_WINDOW = 200_000;

/** Default max output tokens if not specified */
export const DEFAULT_MAX_OUTPUT = 4_096;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get model definition by ID
 */
export function getModel(modelId: string): ModelDefinition | undefined {
  return MODELS[modelId];
}

/**
 * Get model or throw if not found
 */
export function requireModel(modelId: string): ModelDefinition {
  const model = MODELS[modelId];
  if (!model) {
    throw new Error(`Unknown model: ${modelId}`);
  }
  return model;
}

/**
 * Get context window for a model
 * Falls back to fuzzy matching and then default
 */
export function getContextWindow(modelId: string): number {
  // Exact match
  const model = MODELS[modelId];
  if (model) {
    return model.contextWindow;
  }

  // Fuzzy match (e.g., "opus" in model name)
  const modelLower = modelId.toLowerCase();
  for (const [key, def] of Object.entries(MODELS)) {
    const keyPart = key.split("-")[1];
    if (keyPart && modelLower.includes(keyPart)) {
      return def.contextWindow;
    }
  }

  return DEFAULT_CONTEXT_WINDOW;
}

/**
 * Get max output tokens for a model
 */
export function getMaxOutput(modelId: string): number {
  const model = MODELS[modelId];
  if (model?.maxOutput) {
    return model.maxOutput;
  }
  // Default to 1/4 of context window
  return Math.floor(getContextWindow(modelId) / 4);
}

/**
 * Get display name for a model
 */
export function getModelDisplayName(modelId: string): string {
  const model = MODELS[modelId];
  return model?.name || modelId;
}

/**
 * Check if model supports extended thinking
 */
export function supportsExtendedThinking(modelId: string): boolean {
  const model = MODELS[modelId];
  if (model) {
    return model.supportsThinking;
  }
  // Fuzzy check for Claude 4.x
  return (
    modelId.includes("claude-opus-4") ||
    modelId.includes("claude-sonnet-4") ||
    modelId.includes("claude-haiku-4") ||
    modelId.includes("claude-4")
  );
}

/**
 * Check if model supports vision
 */
export function supportsVision(modelId: string): boolean {
  const model = MODELS[modelId];
  return model?.supportsVision ?? false;
}

/**
 * Get pricing for a model
 */
export function getModelPricing(
  modelId: string
): { input: number; output: number; cacheWrite: number; cacheRead: number } {
  const model = MODELS[modelId];
  if (model) {
    return model.pricing;
  }
  // Default to Sonnet pricing
  return { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 };
}

/**
 * Calculate cost for API usage
 */
export function calculateCost(
  modelId: string,
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  }
): { costUSD: number; estimatedSavingsUSD: number } {
  const pricing = getModelPricing(modelId);

  const inputTokens = usage.input_tokens - (usage.cache_read_input_tokens ?? 0);
  const cacheReadTokens = usage.cache_read_input_tokens ?? 0;
  const cacheWriteTokens = usage.cache_creation_input_tokens ?? 0;
  const outputTokens = usage.output_tokens;

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const cacheReadCost = (cacheReadTokens / 1_000_000) * pricing.cacheRead;
  const cacheWriteCost = (cacheWriteTokens / 1_000_000) * pricing.cacheWrite;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;

  const costUSD = inputCost + cacheReadCost + cacheWriteCost + outputCost;

  // Calculate savings from caching
  const totalCachedTokens = cacheReadTokens + cacheWriteTokens;
  const savedCost = (totalCachedTokens / 1_000_000) * (pricing.input - pricing.cacheRead);

  return { costUSD, estimatedSavingsUSD: savedCost };
}

/**
 * Format cost for display
 */
export function formatCost(costUSD: number): string {
  if (costUSD < 0.01) {
    return `$${costUSD.toFixed(4)}`;
  } else if (costUSD < 1) {
    return `$${costUSD.toFixed(3)}`;
  } else {
    return `$${costUSD.toFixed(2)}`;
  }
}

/**
 * Resolve model alias to model ID
 */
export function resolveModelAlias(alias: string): string {
  return MODEL_ALIASES[alias as keyof typeof MODEL_ALIASES] || alias;
}

// ============================================
// LEGACY TYPE EXPORTS (for backwards compatibility)
// ============================================

/** Claude model type (for TypeScript type checking) */
export type ClaudeModel =
  | "claude-opus-4-6"
  | "claude-sonnet-4-6"
  | "claude-haiku-4-5"
  | "claude-haiku-4-5-20251001"
  | "claude-opus-4-5"
  | "claude-sonnet-4-5"
  | "claude-3-5-sonnet"
  | "claude-3-5-haiku"
  | "claude-3-opus"
  | "claude-3-sonnet"
  | "claude-3-haiku"
  | "glm-5"
  | "glm-4.5-air"
  | string;

// ============================================
// LEGACY CONSTANTS (for backwards compatibility)
// ============================================

/** @deprecated Use getModelPricing() instead */
export const MODEL_PRICING: Record<
  string,
  { input: number; output: number; cache_write: number; cache_read: number }
> = Object.fromEntries(
  Object.entries(MODELS).map(([id, m]) => [
    id,
    { input: m.pricing.input, output: m.pricing.output, cache_write: m.pricing.cacheWrite, cache_read: m.pricing.cacheRead },
  ])
);

/** @deprecated Use getContextWindow() instead */
export const MODEL_CONTEXT_WINDOWS: Record<string, number> = Object.fromEntries(
  Object.entries(MODELS).map(([id, m]) => [id, m.contextWindow])
);

/** @deprecated Use getModelDisplayName() instead */
export const MODEL_DISPLAY_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(MODELS).map(([id, m]) => [id, m.name])
);
