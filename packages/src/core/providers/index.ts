/**
 * Provider Registry - Central registry for all LLM providers
 *
 * Exports:
 * - PROVIDERS: All provider configurations
 * - getProvider(): Get provider by name
 * - getProviderForModel(): Detect provider from model name
 * - resolveProvider(): Resolve provider with API key
 * - RollingKeysManager integration for multi-key rotation
 */

import type {
  ProviderName,
  ProviderConfig,
  ProviderHealth,
  ResolvedProvider,
} from "./types.js";
import { DEFAULT_ROUTING_CONFIG, BACKOFF_CONFIG } from "./types.js";
import { RollingKeyManager } from "@ebowwa/rolling-keys";

// ============================================================
// Provider Configurations
// ============================================================

/**
 * All available provider configurations
 */
export const PROVIDERS: Record<ProviderName, ProviderConfig> = {
  // ============================================================
  // Z.AI / Zhipu (GLM Models)
  // ============================================================
  zhipu: {
    name: "zhipu",
    displayName: "Z.AI (GLM)",
    endpoint: process.env.ZHIPU_BASE_URL || "https://api.z.ai/api/coding/paas/v4",
    authHeader: "Authorization",
    apiKeyEnv: ["Z_AI_API_KEY", "ZAI_API_KEY", "GLM_API_KEY", "ZHIPU_API_KEY"],
    format: "openai",
    defaultModel: "GLM-4.7",
    models: [
      // GLM-5 (quota: 3x peak, 2x off-peak)
      "GLM-5", "glm-5",
      // GLM-4.x series (shared quota)
      "GLM-4.7", "glm-4.7",
      "GLM-4.6", "glm-4.6",
      "GLM-4.5V", "glm-4.5v",  // Vision variant
      "GLM-4.5", "glm-4.5",
      "GLM-4.5-Air", "glm-4.5-air",
    ],
    supportsStreaming: true,
    supportsToolCalling: true,
    supportsVision: true,
    supportsThinking: true,
  },

  // ============================================================
  // MiniMax (M2.5 Model)
  // ============================================================
  minimax: {
    name: "minimax",
    displayName: "MiniMax",
    endpoint: process.env.MINIMAX_BASE_URL || "https://api.minimax.io/anthropic",
    authHeader: "ANTHROPIC_AUTH_TOKEN", // Anthropic-compatible
    apiKeyEnv: ["MINIMAX_API_KEY"],
    format: "anthropic",
    defaultModel: "MiniMax-M2.5",
    models: ["MiniMax-M2.5", "minimax-m2.5"],
    supportsStreaming: true,
    supportsToolCalling: true,
    supportsVision: true,
    supportsThinking: false,
  },

  // ============================================================
  // OpenAI (Future)
  // ============================================================
  openai: {
    name: "openai",
    displayName: "OpenAI",
    endpoint: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    authHeader: "Authorization",
    apiKeyEnv: ["OPENAI_API_KEY"],
    format: "openai",
    defaultModel: "gpt-4-turbo",
    models: ["gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"],
    supportsStreaming: true,
    supportsToolCalling: true,
    supportsVision: true,
    supportsThinking: false,
  },

  // ============================================================
  // Anthropic (Stub - Not Implemented)
  // ============================================================
  anthropic: {
    name: "anthropic",
    displayName: "Anthropic (Not Implemented)",
    endpoint: process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com",
    authHeader: "x-api-key",
    apiKeyEnv: ["ANTHROPIC_API_KEY"],
    format: "anthropic",
    defaultModel: "claude-sonnet-4-6",
    models: ["claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5"],
    supportsStreaming: true,
    supportsToolCalling: true,
    supportsVision: true,
    supportsThinking: true,
  },
};

// ============================================================
// Provider Health Tracking
// ============================================================

/**
 * Health status for each provider
 */
const providerHealth: Record<ProviderName, ProviderHealth> = {
  zhipu: { name: "zhipu", healthy: true, failureCount: 0, avgLatencyMs: 0, totalRequests: 0 },
  minimax: { name: "minimax", healthy: true, failureCount: 0, avgLatencyMs: 0, totalRequests: 0 },
  openai: { name: "openai", healthy: true, failureCount: 0, avgLatencyMs: 0, totalRequests: 0 },
  anthropic: { name: "anthropic", healthy: false, failureCount: 999, avgLatencyMs: 0, totalRequests: 0 },
};

// ============================================================
// Rolling Keys Support (using @ebowwa/rolling-keys)
// ============================================================

/**
 * Rolling key managers for each provider
 */
const keyManagers: Partial<Record<ProviderName, RollingKeyManager>> = {};

/**
 * Get or create rolling key manager for a provider
 */
function getKeyManager(provider: ProviderName): RollingKeyManager | null {
  if (keyManagers[provider]) {
    return keyManagers[provider]!;
  }

  const config = PROVIDERS[provider];
  if (!config || config.apiKeyEnv.length === 0) {
    return null;
  }

  try {
    // Create manager with first env var as primary, optional plural for array
    const manager = new RollingKeyManager({
      keysEnvVar: config.apiKeyEnv[0] + "S", // e.g., Z_AI_API_KEYS
      singleKeyEnvVar: config.apiKeyEnv[0],  // e.g., Z_AI_API_KEY
    });

    // Only cache if it has keys
    if (manager.getKeyCount() > 0) {
      keyManagers[provider] = manager;
      return manager;
    }
  } catch {
    // No keys configured for this provider
    return null;
  }

  return null;
}

/**
 * Get next API key using round-robin rotation with health tracking
 */
function getNextKey(provider: ProviderName): string | null {
  const manager = getKeyManager(provider);
  if (!manager) {
    return null;
  }

  const result = manager.getNextKey();
  return result?.key ?? null;
}

/**
 * Record key success (for health tracking)
 * Note: RollingKeyManager tracks success internally via key rotation
 */
function recordKeySuccess(_provider: ProviderName): void {
  // Success is tracked implicitly through continued key usage
  // RollingKeyManager handles health recovery automatically
}

/**
 * Record key failure (triggers backoff)
 */
function recordKeyFailure(provider: ProviderName, error?: unknown): void {
  const manager = getKeyManager(provider);
  if (manager && error) {
    manager.handleError(error);
  }
}

// ============================================================
// Provider Resolution
// ============================================================

/**
 * Model name to provider mapping
 */
const MODEL_TO_PROVIDER: Record<string, ProviderName> = {
  // Zhipu / Z.AI models (coding plan - shared quota)
  "glm-5": "zhipu",        // 3x peak, 2x off-peak
  "glm-4.7": "zhipu",
  "glm-4.6": "zhipu",
  "glm-4.5v": "zhipu",     // Vision variant
  "glm-4.5-air": "zhipu",
  "glm-4.5": "zhipu",
  "glm-4-plus": "zhipu",

  // MiniMax models
  "minimax-m2.5": "minimax",
  "minimax-m2": "minimax",
  "abab6.5-chat": "minimax",

  // OpenAI models
  "gpt-4": "openai",
  "gpt-4-turbo": "openai",
  "gpt-3.5-turbo": "openai",
  "gpt-4o": "openai",

  // Anthropic models (stub)
  "claude-opus-4-6": "anthropic",
  "claude-sonnet-4-6": "anthropic",
  "claude-haiku-4-5": "anthropic",
};

/**
 * Get provider configuration by name
 */
export function getProvider(name: ProviderName): ProviderConfig | undefined {
  return PROVIDERS[name];
}

/**
 * Detect provider from model name
 */
export function getProviderForModel(model: string): ProviderName {
  // Normalize model name
  const normalizedModel = model.toLowerCase();

  // Direct lookup
  if (MODEL_TO_PROVIDER[normalizedModel]) {
    return MODEL_TO_PROVIDER[normalizedModel];
  }

  // Partial match
  for (const [modelPrefix, provider] of Object.entries(MODEL_TO_PROVIDER)) {
    if (normalizedModel.includes(modelPrefix) || modelPrefix.includes(normalizedModel)) {
      return provider;
    }
  }

  // Check provider model lists
  for (const [providerName, config] of Object.entries(PROVIDERS)) {
    if (config.models.some((m) => m.toLowerCase() === normalizedModel)) {
      return providerName as ProviderName;
    }
  }

  // Default to zhipu
  return "zhipu";
}

/**
 * Resolve provider with API key and endpoint
 */
export function resolveProvider(
  model: string,
  preferredProvider?: ProviderName
): ResolvedProvider | null {
  // Determine provider
  const providerName = preferredProvider || getProviderForModel(model);
  const config = PROVIDERS[providerName];

  if (!config) {
    console.error(`Unknown provider: ${providerName}`);
    return null;
  }

  // Get API key
  const apiKey = getNextKey(providerName);
  if (!apiKey) {
    console.error(`No API key found for provider: ${providerName}`);
    return null;
  }

  // Build endpoint URL
  let endpoint = config.endpoint;
  if (config.format === "openai") {
    endpoint = `${endpoint}/chat/completions`;
  } else {
    endpoint = `${endpoint}/v1/messages`;
  }

  // Resolve model name
  const resolvedModel = config.models.includes(model)
    ? model
    : config.defaultModel;

  return {
    config,
    apiKey,
    endpoint,
    model: resolvedModel,
  };
}

/**
 * Check if provider is healthy
 */
export function isProviderHealthy(provider: ProviderName): boolean {
  const health = providerHealth[provider];
  if (!health) return false;

  // Check if in backoff period
  if (health.backoffUntil && health.backoffUntil > Date.now()) {
    return false;
  }

  return health.healthy;
}

/**
 * Record provider success
 */
export function recordProviderSuccess(provider: ProviderName, latencyMs: number): void {
  const health = providerHealth[provider];
  if (!health) return;

  health.healthy = true;
  health.lastSuccess = Date.now();
  health.failureCount = 0;
  health.backoffUntil = undefined;
  health.totalRequests++;

  // Update average latency
  health.avgLatencyMs = Math.round(
    (health.avgLatencyMs * (health.totalRequests - 1) + latencyMs) / health.totalRequests
  );
}

/**
 * Record provider failure
 */
export function recordProviderFailure(provider: ProviderName): void {
  const health = providerHealth[provider];
  if (!health) return;

  health.failureCount++;
  health.lastFailure = Date.now();
  health.totalRequests++;

  // Apply backoff after threshold
  if (health.failureCount >= BACKOFF_CONFIG.failureThreshold) {
    health.healthy = false;
    const backoffMs = Math.min(
      BACKOFF_CONFIG.baseMs * Math.pow(2, health.failureCount - BACKOFF_CONFIG.failureThreshold),
      BACKOFF_CONFIG.maxMs
    );
    health.backoffUntil = Date.now() + backoffMs;
    console.warn(
      `[Provider] ${provider} unhealthy after ${health.failureCount} failures, ` +
        `backoff for ${Math.round(backoffMs / 1000)}s`
    );
  }
}

/**
 * Get health status for all providers
 */
export function getProviderHealth(): Record<ProviderName, ProviderHealth> {
  return { ...providerHealth };
}

/**
 * Get list of healthy providers
 */
export function getHealthyProviders(): ProviderName[] {
  return (Object.keys(PROVIDERS) as ProviderName[]).filter(isProviderHealthy);
}

/**
 * Get next healthy provider from fallback chain
 */
export function getNextHealthyProvider(
  excludeProvider?: ProviderName
): ProviderName | null {
  const chain = DEFAULT_ROUTING_CONFIG.fallbackChain;

  for (const provider of chain) {
    if (excludeProvider && provider === excludeProvider) continue;
    if (isProviderHealthy(provider)) {
      return provider;
    }
  }

  return null;
}

// ============================================================
// Initialization
// ============================================================

// Key pools are loaded lazily via getKeyManager()

// Re-export types
export type {
  ProviderName,
  ProviderConfig,
  ProviderHealth,
  ResolvedProvider,
  ProviderRoutingConfig,
} from "./types.js";
