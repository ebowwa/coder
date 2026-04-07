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
  provider: "anthropic" | "zhipu" | "openai" | "minimax" | "openrouter" | "other";
  /** Whether model supports vision/images */
  supportsVision: boolean;
  /** Model tier (haiku, sonnet, opus) */
  tier: "haiku" | "sonnet" | "opus";
  /** Custom API base URL for non-Anthropic providers (e.g., GLM, MiniMax, OpenRouter) */
  baseUrl?: string;
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

  // GLM Series (Z.AI Coding Plan - api.z.ai)
  "glm-5": {
    id: "glm-5",
    name: "GLM-5",
    displayName: "GLM-5",
    fullName: "GLM-5",
    contextWindow: 200_000,
    maxOutput: 128_000,
    pricing: { input: 0.5, output: 0.5, cacheWrite: 0, cacheRead: 0 },
    supportsThinking: true,
    provider: "zhipu",
    supportsVision: false,
    tier: "sonnet",
    baseUrl: "https://api.z.ai/api/coding/paas/v4",
  },
  "glm-5-turbo": {
    id: "glm-5-turbo",
    name: "GLM-5 Turbo",
    displayName: "GLM-5 Turbo",
    fullName: "GLM-5 Turbo",
    contextWindow: 200_000,
    maxOutput: 128_000,
    pricing: { input: 0.5, output: 0.5, cacheWrite: 0, cacheRead: 0 },
    supportsThinking: true,
    provider: "zhipu",
    supportsVision: false,
    tier: "sonnet",
    baseUrl: "https://api.z.ai/api/coding/paas/v4",
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
    tier: "haiku",
    baseUrl: "https://api.z.ai/api/coding/paas/v4",
  },
  "glm-4.6v-flashx": {
    id: "glm-4.6v-flashx",
    name: "GLM-4.6V-FlashX",
    displayName: "GLM-4.6V-FlashX",
    fullName: "GLM-4.6V-FlashX",
    contextWindow: 128_000,
    maxOutput: 8_192,
    pricing: { input: 0.1, output: 0.1, cacheWrite: 0, cacheRead: 0 },
    supportsThinking: false,
    provider: "zhipu",
    supportsVision: true,
    tier: "haiku",
    baseUrl: "https://api.z.ai/api/coding/paas/v4",
  },

  // GLM Vision Models (z.ai coding plan)
  "glm-4.5v": {
    id: "glm-4.5v",
    name: "GLM-4.5V",
    displayName: "GLM-4.5V",
    fullName: "GLM-4.5V",
    contextWindow: 128_000,
    maxOutput: 4_096,
    pricing: { input: 0.1, output: 0.1, cacheWrite: 0, cacheRead: 0 },
    supportsThinking: false,
    provider: "zhipu",
    supportsVision: true,
    tier: "haiku",
    baseUrl: "https://api.z.ai/api/coding/paas/v4",
  },
  "glm-4.6v": {
    id: "glm-4.6v",
    name: "GLM-4.6V",
    displayName: "GLM-4.6V",
    fullName: "GLM-4.6V",
    contextWindow: 128_000,
    maxOutput: 4_096,
    pricing: { input: 0.1, output: 0.1, cacheWrite: 0, cacheRead: 0 },
    supportsThinking: false,
    provider: "zhipu",
    supportsVision: true,
    tier: "sonnet",
    baseUrl: "https://api.z.ai/api/coding/paas/v4",
  },
  "glm-5v-turbo": {
    id: "glm-5v-turbo",
    name: "GLM-5V Turbo",
    displayName: "GLM-5V Turbo",
    fullName: "GLM-5V Turbo",
    contextWindow: 128_000,
    maxOutput: 8_192,
    pricing: { input: 0.5, output: 0.5, cacheWrite: 0, cacheRead: 0 },
    supportsThinking: false,
    provider: "zhipu",
    supportsVision: true,
    tier: "sonnet",
    baseUrl: "https://api.z.ai/api/coding/paas/v4",
  },

  // MiniMax API (Anthropic-compatible endpoint)
  "minimax/minimax-m2.5": {
    id: "minimax/minimax-m2.5",
    name: "MiniMax M2.5",
    displayName: "MiniMax M2.5",
    fullName: "MiniMax M2.5",
    contextWindow: 128_000,
    maxOutput: 8_192,
    pricing: { input: 0.1, output: 0.1, cacheWrite: 0, cacheRead: 0 },
    supportsThinking: false,
    provider: "minimax",
    supportsVision: true,
    tier: "haiku",
    baseUrl: "https://api.minimax.io/anthropic",
  },
  // Alias for MiniMax M2.5 (common naming variant)
  "MiniMax-M2.5": {
    id: "MiniMax-M2.5",
    name: "MiniMax M2.5",
    displayName: "MiniMax M2.5",
    fullName: "MiniMax M2.5",
    contextWindow: 128_000,
    maxOutput: 8_192,
    pricing: { input: 0.1, output: 0.1, cacheWrite: 0, cacheRead: 0 },
    supportsThinking: false,
    provider: "minimax",
    supportsVision: true,
    tier: "haiku",
    baseUrl: "https://api.minimax.io/anthropic",
  },

  // OpenRouter - Claude models via OpenRouter
  "openrouter/claude-sonnet-4-6": {
    id: "openrouter/claude-sonnet-4-6",
    name: "Claude Sonnet 4.6 (OpenRouter)",
    displayName: "Sonnet 4.6 OR",
    fullName: "Claude Sonnet 4.6 via OpenRouter",
    contextWindow: 200_000,
    maxOutput: 16_000,
    pricing: { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
    supportsThinking: true,
    provider: "openrouter",
    supportsVision: true,
    tier: "sonnet",
    baseUrl: "https://openrouter.ai/api/v1",
  },
  "openrouter/claude-haiku-4-5": {
    id: "openrouter/claude-haiku-4-5",
    name: "Claude Haiku 4.5 (OpenRouter)",
    displayName: "Haiku 4.5 OR",
    fullName: "Claude Haiku 4.5 via OpenRouter",
    contextWindow: 200_000,
    maxOutput: 8_000,
    pricing: { input: 0.8, output: 4, cacheWrite: 1, cacheRead: 0.08 },
    supportsThinking: true,
    provider: "openrouter",
    supportsVision: true,
    tier: "haiku",
    baseUrl: "https://openrouter.ai/api/v1",
  },
};

// ============================================
// PROVIDER CONFIGURATIONS
// ============================================

export interface ProviderConfig {
  /** Provider name */
  name: string;
  /** API base URL */
  baseUrl: string;
  /** Environment variable for API key */
  apiKeyEnv: string;
  /** API format (anthropic or openai) */
  apiFormat: "anthropic" | "openai";
  /** Whether provider supports streaming */
  supportsStreaming: boolean;
  /** Default model for this provider */
  defaultModel: string;
}

/** Provider configurations for different API backends */
export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  anthropic: {
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com",
    apiKeyEnv: "ANTHROPIC_API_KEY",
    apiFormat: "anthropic",
    supportsStreaming: true,
    defaultModel: "claude-sonnet-4-6",
  },
  zhipu: {
    name: "Z.AI (GLM Coding Plan)",
    baseUrl: "https://api.z.ai/api/coding/paas/v4",
    apiKeyEnv: "ZHIPU_API_KEY",
    apiFormat: "openai",
    supportsStreaming: true,
    defaultModel: "glm-5",
  },
  minimax: {
    name: "MiniMax",
    baseUrl: "https://api.minimax.chat/v1",
    apiKeyEnv: "MINIMAX_API_KEY",
    apiFormat: "openai",
    supportsStreaming: true,
    defaultModel: "minimax/minimax-m2.5",
  },
  openrouter: {
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKeyEnv: "OPENROUTER_API_KEY",
    apiFormat: "openai",
    supportsStreaming: true,
    defaultModel: "openrouter/claude-sonnet-4-6",
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

/** Default model for interactive use (configurable via CODER_DEFAULT_MODEL env var) */
export const DEFAULT_MODEL = process.env.CODER_DEFAULT_MODEL || "claude-sonnet-4-6";

/** Default model for meta-tasks: compaction, handoff summarization, self-assessment */
export const META_LLM_MODEL = process.env.CODER_META_MODEL || "glm-5-turbo";

/** @deprecated Use META_LLM_MODEL */
export const SUMMARIZATION_MODEL = META_LLM_MODEL;

/** Fixed vision-capable model for image analysis (screenshots, rendered output) */
export const VISION_MODEL = process.env.CODER_VISION_MODEL || "glm-4.5v";

/** Backup model to use if primary model fails all retries (read from Doppler) */
export const BACKUP_MODEL = process.env.CODER_BACKUP_MODEL;

/** API key for backup model (separate from primary API key) */
export const BACKUP_MODEL_API_KEY = process.env.CODER_BACKUP_MODEL_API_KEY;

/** Base URL for backup model API (separate from primary API) */
export const BACKUP_MODEL_BASE_URL = process.env.CODER_BACKUP_MODEL_BASE_URL;

/** Maximum times to use backup model per session (default: 1) */
export const BACKUP_MODEL_MAX_ATTEMPTS = parseInt(process.env.CODER_BACKUP_MODEL_MAX_ATTEMPTS || "1", 10);

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

/**
 * Get all models by provider
 */
export function getModelsByProvider(provider: ModelDefinition["provider"]): ModelDefinition[] {
  return Object.values(MODELS).filter((m) => m.provider === provider);
}

/**
 * Get all available providers
 */
export function getProviders(): ModelDefinition["provider"][] {
  return ["anthropic", "zhipu", "openai", "other"];
}

/**
 * Get provider configuration by name
 */
export function getProviderConfig(providerName: string): ProviderConfig | undefined {
  return PROVIDER_CONFIGS[providerName];
}

/**
 * Get all available provider names
 */
export function getProviderNames(): string[] {
  return Object.keys(PROVIDER_CONFIGS);
}

/**
 * List all models with their provider and baseUrl for display
 */
export function listAllModels(): Array<{
  id: string;
  name: string;
  provider: string;
  baseUrl?: string;
  tier: string;
}> {
  return Object.values(MODELS).map((m) => ({
    id: m.id,
    name: m.name,
    provider: m.provider,
    baseUrl: m.baseUrl,
    tier: m.tier,
  }));
}

/**
 * Get current configuration summary (for debugging/display)
 */
export function getConfigSummary(): {
  defaultModel: string;
  availableProviders: string[];
  modelCount: number;
} {
  return {
    defaultModel: DEFAULT_MODEL,
    availableProviders: getProviderNames(),
    modelCount: Object.keys(MODELS).length,
  };
}

/**
 * OpenRouter model response type
 */
export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  top_provider?: {
    max_completion_tokens?: number;
  };
}

/**
 * Fetch available models from OpenRouter API
 * Requires OPENROUTER_API_KEY environment variable
 */
export async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable not set");
  }

  const response = await fetch("https://openrouter.ai/api/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { data: OpenRouterModel[] };
  return data.data;
}

/**
 * Get configured OpenRouter models (from MODELS registry)
 */
export function getConfiguredOpenRouterModels(): ModelDefinition[] {
  return getModelsByProvider("openrouter");
}

/**
 * Get model configuration summary for display
 */
export function getModelConfigSummary(modelId: string): {
  id: string;
  name: string;
  provider: string;
  baseUrl?: string;
  contextWindow: number;
  maxOutput: number;
  supportsThinking: boolean;
  supportsVision: boolean;
  tier: string;
} | undefined {
  const model = MODELS[modelId];
  if (!model) return undefined;

  return {
    id: model.id,
    name: model.name,
    provider: model.provider,
    baseUrl: model.baseUrl,
    contextWindow: model.contextWindow,
    maxOutput: model.maxOutput ?? Math.floor(model.contextWindow / 4),
    supportsThinking: model.supportsThinking,
    supportsVision: model.supportsVision,
    tier: model.tier,
  };
}

/**
 * Get backup model if configured
 * Returns the backup model ID or undefined if not configured
 */
export function getBackupModel(): string | undefined {
  return BACKUP_MODEL;
}

/**
 * Get backup model API key
 * Returns the backup-specific API key or falls back to the main API key
 */
export function getBackupApiKey(): string | undefined {
  return BACKUP_MODEL_API_KEY;
}

/**
 * Get backup model base URL
 * Returns the backup-specific base URL or undefined
 */
export function getBackupBaseUrl(): string | undefined {
  return BACKUP_MODEL_BASE_URL;
}

/**
 * Check if backup model is available and valid
 */
export function isBackupModelAvailable(): boolean {
  if (!BACKUP_MODEL) {
    return false;
  }
  // Verify the backup model exists in our registry
  return !!MODELS[BACKUP_MODEL];
}
