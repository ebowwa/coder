/**
 * Provider Types - Generic LLM Provider Abstraction
 *
 * Supports multiple providers:
 * - zhipu (Z.AI / GLM models)
 * - minimax (MiniMax M2.5)
 * - openai (future)
 * - anthropic (stub/commented only)
 */

// ============================================================
// Provider Types
// ============================================================

/**
 * Supported provider names
 */
export type ProviderName = "zhipu" | "minimax" | "openai" | "anthropic";

/**
 * API format type - determines request/response format
 */
export type APIFormat = "anthropic" | "openai";

/**
 * Provider configuration
 */
export interface ProviderConfig {
  /** Provider identifier */
  name: ProviderName;
  /** Human-readable display name */
  displayName: string;
  /** API endpoint base URL */
  endpoint: string;
  /** Authentication header name */
  authHeader: string;
  /** Environment variable names for API keys (checked in order) */
  apiKeyEnv: string[];
  /** API format (anthropic or openai compatible) */
  format: APIFormat;
  /** Default model for this provider */
  defaultModel: string;
  /** List of supported model IDs */
  models: string[];
  /** Whether provider supports streaming */
  supportsStreaming: boolean;
  /** Whether provider supports tool calling */
  supportsToolCalling: boolean;
  /** Whether provider supports vision/images */
  supportsVision: boolean;
  /** Whether provider supports extended thinking */
  supportsThinking: boolean;
}

/**
 * Provider health status
 */
export interface ProviderHealth {
  /** Provider name */
  name: ProviderName;
  /** Whether provider is healthy */
  healthy: boolean;
  /** Last successful request timestamp */
  lastSuccess?: number;
  /** Last failure timestamp */
  lastFailure?: number;
  /** Consecutive failure count */
  failureCount: number;
  /** Backoff until timestamp (if in cooldown) */
  backoffUntil?: number;
  /** Average latency in ms */
  avgLatencyMs: number;
  /** Total requests made */
  totalRequests: number;
}

/**
 * Provider routing configuration
 */
export interface ProviderRoutingConfig {
  /** Enable fallback between providers */
  fallbackEnabled: boolean;
  /** Fallback chain (order of providers to try) */
  fallbackChain: ProviderName[];
  /** Latency threshold in ms before trying next provider */
  latencyThresholdMs: number;
  /** Enable health tracking */
  healthTracking: boolean;
  /** Enable load balancing across healthy providers */
  loadBalancing: boolean;
}

/**
 * Resolved provider info for a request
 */
export interface ResolvedProvider {
  /** Provider configuration */
  config: ProviderConfig;
  /** API key to use */
  apiKey: string;
  /** Full endpoint URL */
  endpoint: string;
  /** Model to use (may be mapped from requested model) */
  model: string;
}

// ============================================================
// Default Configuration
// ============================================================

/**
 * Default provider routing configuration
 */
export const DEFAULT_ROUTING_CONFIG: ProviderRoutingConfig = {
  fallbackEnabled: true,
  fallbackChain: ["zhipu", "minimax"],
  latencyThresholdMs: 30000, // 30 seconds
  healthTracking: true,
  loadBalancing: false, // Disabled by default - use primary provider
};

/**
 * Backoff configuration for health tracking
 */
export const BACKOFF_CONFIG = {
  /** Base backoff in ms */
  baseMs: 60000, // 1 minute
  /** Maximum backoff in ms */
  maxMs: 3600000, // 1 hour
  /** Number of failures before backoff */
  failureThreshold: 3,
} as const;
