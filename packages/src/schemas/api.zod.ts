/**
 * Zod Validation Schemas for API Types
 * Derived from types/api.ts
 * @version 2.0.0 - Complete schema coverage
 */

import { z } from "zod";

// ============================================
// CORE API RESPONSE SCHEMAS
// ============================================

export const StopReasonSchema = z.union([
  z.literal("end_turn"),
  z.literal("max_tokens"),
  z.literal("stop_sequence"),
  z.literal("tool_use"),
  z.null(),
]);

export const CacheCreationSchema = z.object({
  ephemeral_1h_input_tokens: z.number().int().nonnegative(),
  ephemeral_5m_input_tokens: z.number().int().nonnegative(),
});

export const UsageMetricsSchema = z.object({
  input_tokens: z.number().int().nonnegative(),
  output_tokens: z.number().int().nonnegative(),
  cache_creation_input_tokens: z.number().int().nonnegative().optional(),
  cache_read_input_tokens: z.number().int().nonnegative().optional(),
  cache_creation: CacheCreationSchema.optional(),
  thinking_tokens: z.number().int().nonnegative().optional(),
  redacted_thinking_tokens: z.number().int().nonnegative().optional(),
});

export const MediaTypeSchema = z.enum([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

export const CacheTTLSchema = z.enum(["1h", "5m"]);

export const CacheControlSchema = z.object({
  type: z.literal("ephemeral"),
  ttl: CacheTTLSchema.optional(),
});

// ============================================
// CONTENT BLOCK SCHEMAS
// ============================================

export const TextBlockSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
  cache_control: CacheControlSchema.optional(),
});

export const ImageBlockSchema = z.object({
  type: z.literal("image"),
  source: z.object({
    type: z.literal("base64"),
    data: z.string(),
    media_type: MediaTypeSchema,
  }),
});

export const DocumentBlockSchema = z.object({
  type: z.literal("document"),
  source: z.object({
    type: z.enum(["base64", "url", "text"]),
    media_type: z.string().optional(),
    data: z.string().optional(),
    url: z.string().optional(),
  }),
  cache_control: CacheControlSchema.optional(),
});

export const ToolUseBlockSchema = z.object({
  type: z.literal("tool_use"),
  id: z.string(),
  name: z.string(),
  input: z.record(z.unknown()),
});

export const ToolResultBlockSchema = z.object({
  type: z.literal("tool_result"),
  tool_use_id: z.string(),
  content: z.union([z.string(), z.array(z.unknown())]),
  is_error: z.boolean().optional(),
});

export const ThinkingBlockSchema = z.object({
  type: z.literal("thinking"),
  thinking: z.string(),
  signature: z.string().optional(),
});

export const RedactedThinkingBlockSchema = z.object({
  type: z.literal("redacted_thinking"),
  data: z.string(),
});

export const ContentBlockSchema = z.discriminatedUnion("type", [
  TextBlockSchema,
  ImageBlockSchema,
  DocumentBlockSchema,
  ToolUseBlockSchema,
  ToolResultBlockSchema,
  ThinkingBlockSchema,
  RedactedThinkingBlockSchema,
]);

// ============================================
// API RESPONSE SCHEMA
// ============================================

export const APIResponseSchema = z.object({
  id: z.string(),
  type: z.literal("message"),
  role: z.literal("assistant"),
  content: z.array(ContentBlockSchema),
  model: z.string(),
  stop_reason: StopReasonSchema,
  stop_sequence: z.string().nullable(),
  usage: UsageMetricsSchema,
});

// ============================================
// STREAMING SCHEMAS
// ============================================

export const StreamingEventSchema = z.enum([
  "message_start",
  "message_delta",
  "content_block_start",
  "content_block_delta",
  "content_block_stop",
]);

export const DeltaTypeSchema = z.enum([
  "text_delta",
  "citations_delta",
  "input_json_delta",
  "thinking_delta",
  "signature_delta",
  "compaction_delta",
]);

// ============================================
// OAUTH SCHEMAS
// ============================================

export const OAuthConfigSchema = z.object({
  createApiKeyUrl: z.string().url(),
  customUrlEnv: z.string(),
  clientIdEnv: z.string(),
  scopes: z.object({
    console: z.array(z.string()),
    claude_ai: z.array(z.string()),
  }),
  authorizeUrls: z.object({
    console: z.string().url(),
    claude_ai: z.string().url(),
  }),
  tokenUrls: z.object({
    console: z.string().url(),
    claude_ai: z.string().url(),
  }),
  successUrls: z.object({
    console: z.string().url(),
    claude_ai: z.string().url(),
  }),
  manualRedirectUrl: z.string().url(),
  rolesUrl: z.string().url(),
});

// ============================================
// BACKEND SCHEMAS
// ============================================

export const BackendTypeSchema = z.enum([
  "anthropic",
  "bedrock",
  "vertex",
  "foundry",
]);

export const BackendConfigSchema = z.object({
  id: BackendTypeSchema,
  description: z.string(),
  envCheck: z.string(),
  priority: z.number().int().positive(),
});

// ============================================
// RATE LIMITING SCHEMAS
// ============================================

export const RateLimitConfigSchema = z.object({
  requestsPerMinute: z.number().int().positive(),
  tokensPerMinute: z.number().int().positive(),
  retryAfterMs: z.number().int().nonnegative(),
  maxRetries: z.number().int().nonnegative(),
});

// ============================================
// USER AGENT SCHEMAS
// ============================================

export const UserAgentComponentsSchema = z.object({
  version: z.string(),
  entrypoint: z.string(),
  sdkVersion: z.string().optional(),
  clientApp: z.string().optional(),
  platform: z.string(),
});

// ============================================
// BETA HEADERS SCHEMAS
// ============================================

export const BetaHeadersSchema = z.object({
  skills: z.string(),
  oauth: z.string(),
});

// ============================================
// API KEY HELPER SCHEMAS
// ============================================

export const ApiKeyHelperConfigSchema = z.object({
  description: z.string(),
  securityNote: z.string(),
  usage: z.string(),
});

// ============================================
// MESSAGE SCHEMAS
// ============================================

export const MessageRoleSchema = z.enum(["user", "assistant"]);

export const MessageSchema = z.object({
  role: MessageRoleSchema,
  content: z.union([z.string(), z.array(ContentBlockSchema)]),
  cache_control: CacheControlSchema.optional(),
});

// Export inferred types for use in other schema files
export type MessageRole = z.infer<typeof MessageRoleSchema>;
export type Message = z.infer<typeof MessageSchema>;

export const SystemBlockSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
  cache_control: CacheControlSchema.optional(),
});

// ============================================
// API REQUEST SCHEMAS
// ============================================

export const JSONSchemaSchema = z.object({
  type: z.string(),
  properties: z.record(z.unknown()).optional(),
  required: z.array(z.string()).optional(),
  items: z.unknown().optional(),
  enum: z.array(z.string()).optional(),
  description: z.string().optional(),
  default: z.unknown().optional(),
  additionalProperties: z.union([z.boolean(), z.unknown()]).optional(),
});

export const APIToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  input_schema: JSONSchemaSchema,
});

export const APIToolChoiceSchema = z.union([
  z.object({ type: z.literal("auto") }),
  z.object({ type: z.literal("any") }),
  z.object({ type: z.literal("tool"), name: z.string() }),
]);

export const ThinkingConfigSchema = z.object({
  type: z.enum(["enabled", "disabled", "adaptive"]),
  budget_tokens: z.number().int().positive().optional(),
});

export const APIRequestSchema = z.object({
  model: z.string(),
  max_tokens: z.number().int().positive(),
  messages: z.array(MessageSchema),
  system: z.union([z.string(), z.array(SystemBlockSchema)]).optional(),
  tools: z.array(APIToolSchema).optional(),
  tool_choice: APIToolChoiceSchema.optional(),
  stop_sequences: z.array(z.string()).optional(),
  stream: z.boolean().optional(),
  metadata: z
    .object({
      user_id: z.string().optional(),
    })
    .optional(),
  thinking: ThinkingConfigSchema.optional(),
});

// ============================================
// CACHE SCHEMAS
// ============================================

export const CacheConfigSchema = z.object({
  enabled: z.boolean(),
  ttl: CacheTTLSchema.optional(),
  minTokens: z.number().int().nonnegative(),
  cacheSystemPrompt: z.boolean().optional(),
  minTokensForCache: z.number().int().nonnegative().optional(),
});

export const APICacheMetricsSchema = z.object({
  cacheWrites: z.number().int().nonnegative(),
  cacheReads: z.number().int().nonnegative(),
  cacheWriteTokens: z.number().int().nonnegative(),
  cacheReadTokens: z.number().int().nonnegative(),
  hitRate: z.number().min(0).max(1),
});

// ============================================
// CACHE METRICS (Extended)
// ============================================

/**
 * Extended cache performance metrics
 */
export const CacheMetricsSchema = z.object({
  /** Number of cache hits */
  cacheHits: z.number().int().nonnegative(),
  /** Number of cache misses */
  cacheMisses: z.number().int().nonnegative(),
  /** Tokens read from cache in current operation */
  cacheReadTokens: z.number().int().nonnegative(),
  /** Tokens written to cache in current operation */
  cacheWriteTokens: z.number().int().nonnegative(),
  /** Total tokens read from cache (accumulated across session) */
  totalCacheReadTokens: z.number().int().nonnegative(),
  /** Total tokens written to cache (accumulated across session) */
  totalCacheWriteTokens: z.number().int().nonnegative(),
  /** Estimated cost savings in USD */
  estimatedSavingsUSD: z.number().nonnegative(),
  /** Cache hit rate (0-100) */
  cacheHitRate: z.number().min(0).max(100),
});

// ============================================
// EFFORT LEVELS
// ============================================

export const EffortLevelSchema = z.enum(["low", "medium", "high", "max"]);

export const EffortLevelConfigSchema = z.object({
  description: z.string(),
  useCase: z.string(),
  recommended: z.boolean().optional(),
  restriction: z.string().optional(),
});

export const EFFORT_LEVEL_CONFIGS: Record<z.infer<typeof EffortLevelSchema>, z.infer<typeof EffortLevelConfigSchema>> = {
  low: {
    description: "Subagents or simple tasks",
    useCase: "Fast responses, less complex reasoning",
  },
  medium: {
    description: "Balanced reasoning",
    useCase: "Default for most tasks",
    recommended: true,
  },
  high: {
    description: "Deep reasoning (default)",
    useCase: "Complex analysis, coding tasks",
  },
  max: {
    description: "Deepest reasoning",
    useCase: "Most complex problems",
    restriction: "Opus 4.6 only, not available in interactive mode",
  },
};

// ============================================
// EXTENDED THINKING CONFIG
// ============================================

export const ExtendedThinkingConfigSchema = z.object({
  enabled: z.boolean(),
  budgetTokens: z.number().int().positive().optional(),
  effort: EffortLevelSchema.optional(),
  interleaved: z.boolean().optional(),
  modelMultiplier: z.number().positive().optional(),
});

export const DEFAULT_THINKING_CONFIG: z.infer<typeof ExtendedThinkingConfigSchema> = {
  enabled: false,
  effort: "medium",
  interleaved: true,
};

// ============================================
// CACHE CONSTANTS
// ============================================

/**
 * Default cache configuration
 */
export const DEFAULT_CACHE_CONFIG: z.infer<typeof CacheConfigSchema> = {
  enabled: true,
  ttl: "1h" as z.infer<typeof CacheTTLSchema>,
  minTokens: 1024,
};

// ============================================
// EFFORT TO BUDGET MAPPING
// ============================================

/**
 * Mapping from effort level to budget tokens for extended thinking
 */
export const EFFORT_TO_BUDGET: Record<z.infer<typeof EffortLevelSchema>, number> = {
  low: 1024,      // ~1k tokens - quick thinking
  medium: 4096,   // ~4k tokens - standard thinking
  high: 16384,    // ~16k tokens - deep reasoning
  max: 100000,    // ~100k tokens - maximum reasoning
};

/**
 * Calculate budget tokens based on effort level and model
 */
export function calculateBudgetTokens(
  config: z.infer<typeof ExtendedThinkingConfigSchema>,
  model: string
): number {
  if (config.budgetTokens) {
    return config.budgetTokens;
  }

  const effort = config.effort || "medium";
  const baseBudget = EFFORT_TO_BUDGET[effort];

  // Apply model multiplier (Opus gets more thinking budget by default)
  const multiplier = config.modelMultiplier ?? (model.includes("opus") ? 2 : 1);

  return Math.min(baseBudget * multiplier, 100000);
}

// ============================================
// MODEL THINKING SUPPORT
// ============================================

export const ModelThinkingSupportSchema = z.object({
  adaptiveThinking: z.boolean(),
  maxEffort: z.boolean(),
  deprecatedBudgetTokens: z.boolean(),
  maxTokens: z.number().int().positive(),
  contextWindow1m: z.string().optional(),
});

export const MODEL_THINKING_SUPPORT: Record<string, z.infer<typeof ModelThinkingSupportSchema>> = {
  "claude-opus-4-6": {
    adaptiveThinking: true,
    maxEffort: true,
    deprecatedBudgetTokens: true,
    maxTokens: 128000,
    contextWindow1m: "beta (context-1m-2025-08-07 header)",
  },
  "claude-sonnet-4-6": {
    adaptiveThinking: true,
    deprecatedBudgetTokens: true,
    maxEffort: false,
    maxTokens: 64000,
    contextWindow1m: "beta (context-1m-2025-08-07 header)",
  },
  "claude-sonnet-4-5-20250514": {
    adaptiveThinking: false,
    deprecatedBudgetTokens: false,
    maxEffort: false,
    maxTokens: 64000,
  },
  "claude-haiku-4-5-20250514": {
    adaptiveThinking: false,
    deprecatedBudgetTokens: false,
    maxEffort: false,
    maxTokens: 64000,
  },
};

/**
 * Check if a model supports extended thinking
 */
export function supportsExtendedThinking(model: string): boolean {
  return (
    model.includes("claude-opus-4") ||
    model.includes("claude-sonnet-4") ||
    model.includes("claude-haiku-4") ||
    model.includes("claude-4")
  );
}

// ============================================
// THINKING BETA HEADERS
// ============================================

export const THINKING_BETA_HEADERS = {
  adaptiveThinking: "adaptive-thinking-2026-01-28",
  redactThinking: "redact-thinking-2026-02-12",
} as const;

// ============================================
// QUERY METRICS
// ============================================

export const QueryMetricsSchema = z.object({
  model: z.string(),
  messageCount: z.number().int().nonnegative(),
  messageTokens: z.number().int().nonnegative(),
  usage: UsageMetricsSchema,
  cacheMetrics: CacheMetricsSchema.optional(),
  durationMs: z.number().int().nonnegative(),
  ttftMs: z.number().int().nonnegative(),
  costUSD: z.number().nonnegative(),
  stopReason: StopReasonSchema,
  requestId: z.string(),
});

// ============================================
// GIT STATUS
// ============================================

export const GitStatusSchema = z.object({
  branch: z.string(),
  ahead: z.number().int().nonnegative(),
  behind: z.number().int().nonnegative(),
  staged: z.array(z.string()),
  unstaged: z.array(z.string()),
  untracked: z.array(z.string()),
  conflicted: z.array(z.string()),
  clean: z.boolean(),
  detached: z.boolean(),
});

// ============================================
// JSON SCHEMA (for tool definitions)
// ============================================

export const SchemaPropertySchema: z.ZodType<{
  type: string;
  description?: string;
  enum?: string[];
  default?: unknown;
  items?: z.infer<typeof SchemaPropertySchema>;
  properties?: Record<string, z.infer<typeof SchemaPropertySchema>>;
  required?: string[];
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
}> = z.lazy(() =>
  z.object({
    type: z.string(),
    description: z.string().optional(),
    enum: z.array(z.string()).optional(),
    default: z.unknown().optional(),
    items: SchemaPropertySchema.optional(),
    properties: z.record(SchemaPropertySchema).optional(),
    required: z.array(z.string()).optional(),
    minimum: z.number().optional(),
    maximum: z.number().optional(),
    minItems: z.number().int().nonnegative().optional(),
    maxItems: z.number().int().nonnegative().optional(),
  })
);

export const JSONSchemaDefinitionSchema = z.object({
  type: z.literal("object"),
  properties: z.record(SchemaPropertySchema),
  required: z.array(z.string()).optional(),
  additionalProperties: z.boolean().optional(),
});

// ============================================
// SKILL DEFINITION
// ============================================

export const SkillDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  prompt: z.string(),
  tools: z.array(z.string()).optional(),
  model: z.string().optional(),
  color: z.string().optional(),
  source: z.enum(["built-in", "project", "user"]),
});

// ============================================
// TEAMMATE SYSTEM
// ============================================

export const TeammateStatusSchema = z.enum([
  "pending",
  "in_progress",
  "idle",
  "completed",
  "failed",
]);

export const TeammateSchema = z.object({
  teammateId: z.string(),
  name: z.string(),
  role: z.string(),
  teamName: z.string(),
  color: z.string(),
  prompt: z.string(),
  planModeRequired: z.boolean(),
  paneId: z.string().optional(),
  status: TeammateStatusSchema,
});

export const CoordinationSettingsSchema = z.object({
  dependencyOrder: z.array(z.string()),
  communicationProtocol: z.enum(["broadcast", "direct", "mixed"]),
  taskAssignmentStrategy: z.enum(["manual", "auto", "priority"]),
});

export const TeamSchema = z.object({
  name: z.string(),
  description: z.string(),
  teammates: z.array(TeammateSchema),
  taskListId: z.string(),
  status: z.enum(["active", "paused", "completed", "archived"]),
  coordination: CoordinationSettingsSchema,
});

export const TeammateMessageSchema = z.object({
  type: z.enum(["broadcast", "direct", "notification"]),
  from: z.string(),
  to: z.string().optional(),
  content: z.string(),
  timestamp: z.number(),
});

// ============================================
// TYPE GUARDS
// ============================================

export function isTextBlock(value: unknown): value is z.infer<typeof TextBlockSchema> {
  return TextBlockSchema.safeParse(value).success;
}

export function isImageBlock(value: unknown): value is z.infer<typeof ImageBlockSchema> {
  return ImageBlockSchema.safeParse(value).success;
}

export function isDocumentBlock(value: unknown): value is z.infer<typeof DocumentBlockSchema> {
  return DocumentBlockSchema.safeParse(value).success;
}

export function isToolUseBlock(value: unknown): value is z.infer<typeof ToolUseBlockSchema> {
  return ToolUseBlockSchema.safeParse(value).success;
}

export function isToolResultBlock(value: unknown): value is z.infer<typeof ToolResultBlockSchema> {
  return ToolResultBlockSchema.safeParse(value).success;
}

export function isThinkingBlock(value: unknown): value is z.infer<typeof ThinkingBlockSchema> {
  return ThinkingBlockSchema.safeParse(value).success;
}

export function isRedactedThinkingBlock(value: unknown): value is z.infer<typeof RedactedThinkingBlockSchema> {
  return RedactedThinkingBlockSchema.safeParse(value).success;
}

export function isContentBlock(value: unknown): value is z.infer<typeof ContentBlockSchema> {
  return ContentBlockSchema.safeParse(value).success;
}

export function isAPIResponse(value: unknown): value is z.infer<typeof APIResponseSchema> {
  return APIResponseSchema.safeParse(value).success;
}

export function isAPIRequest(value: unknown): value is z.infer<typeof APIRequestSchema> {
  return APIRequestSchema.safeParse(value).success;
}

export function isUsageMetrics(value: unknown): value is z.infer<typeof UsageMetricsSchema> {
  return UsageMetricsSchema.safeParse(value).success;
}

export function isValidUsageMetrics(metrics: unknown): metrics is z.infer<typeof UsageMetricsSchema> {
  return UsageMetricsSchema.safeParse(metrics).success;
}

export function isMessage(value: unknown): value is z.infer<typeof MessageSchema> {
  return MessageSchema.safeParse(value).success;
}

export function isOAuthConfig(value: unknown): value is z.infer<typeof OAuthConfigSchema> {
  return OAuthConfigSchema.safeParse(value).success;
}

export function isBackendConfig(value: unknown): value is z.infer<typeof BackendConfigSchema> {
  return BackendConfigSchema.safeParse(value).success;
}

export function isRateLimitConfig(value: unknown): value is z.infer<typeof RateLimitConfigSchema> {
  return RateLimitConfigSchema.safeParse(value).success;
}

export function isCacheConfig(value: unknown): value is z.infer<typeof CacheConfigSchema> {
  return CacheConfigSchema.safeParse(value).success;
}

export function isAPICacheMetrics(value: unknown): value is z.infer<typeof APICacheMetricsSchema> {
  return APICacheMetricsSchema.safeParse(value).success;
}

export function isCacheMetrics(value: unknown): value is z.infer<typeof CacheMetricsSchema> {
  return CacheMetricsSchema.safeParse(value).success;
}

export function isEffortLevel(value: unknown): value is z.infer<typeof EffortLevelSchema> {
  return EffortLevelSchema.safeParse(value).success;
}

export function isExtendedThinkingConfig(value: unknown): value is z.infer<typeof ExtendedThinkingConfigSchema> {
  return ExtendedThinkingConfigSchema.safeParse(value).success;
}

export function isModelThinkingSupport(value: unknown): value is z.infer<typeof ModelThinkingSupportSchema> {
  return ModelThinkingSupportSchema.safeParse(value).success;
}

export function isQueryMetrics(value: unknown): value is z.infer<typeof QueryMetricsSchema> {
  return QueryMetricsSchema.safeParse(value).success;
}

export function isGitStatus(value: unknown): value is z.infer<typeof GitStatusSchema> {
  return GitStatusSchema.safeParse(value).success;
}

export function isJSONSchema(value: unknown): value is z.infer<typeof JSONSchemaSchema> {
  return JSONSchemaSchema.safeParse(value).success;
}

export function isSchemaProperty(value: unknown): value is z.infer<typeof SchemaPropertySchema> {
  return SchemaPropertySchema.safeParse(value).success;
}

export function isSkillDefinition(value: unknown): value is z.infer<typeof SkillDefinitionSchema> {
  return SkillDefinitionSchema.safeParse(value).success;
}

export function isTeammateStatus(value: unknown): value is z.infer<typeof TeammateStatusSchema> {
  return TeammateStatusSchema.safeParse(value).success;
}

export function isTeammate(value: unknown): value is z.infer<typeof TeammateSchema> {
  return TeammateSchema.safeParse(value).success;
}

export function isTeam(value: unknown): value is z.infer<typeof TeamSchema> {
  return TeamSchema.safeParse(value).success;
}

export function isTeammateMessage(value: unknown): value is z.infer<typeof TeammateMessageSchema> {
  return TeammateMessageSchema.safeParse(value).success;
}

export function isCoordinationSettings(value: unknown): value is z.infer<typeof CoordinationSettingsSchema> {
  return CoordinationSettingsSchema.safeParse(value).success;
}
