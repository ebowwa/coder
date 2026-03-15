/**
 * Streaming Schemas
 * Zod schemas for streaming events and types
 */

import { z } from "zod";
import { APIResponseSchema, UsageMetricsSchema, APIToolSchema, CacheConfigSchema, ThinkingConfigSchema, ExtendedThinkingConfigSchema, SystemBlockSchema, CacheMetricsSchema } from "./api.zod.js";

// ============================================
// CALLBACK TYPES (for use with z.custom)
// ============================================

export interface OnToolUseCallback {
  (toolUse: { id: string; name: string; input: unknown }): void;
}

// ============================================
// STREAM OPTIONS SCHEMA
// ============================================

export const StreamOptionsSchema = z.object({
  apiKey: z.string(),
  model: z.string().optional(),
  maxTokens: z.number().int().positive().optional(),
  tools: z.array(APIToolSchema).optional(),
  /** Force tool usage: "auto", "required", "none", or specific tool name */
  toolChoice: z.union([z.literal("auto"), z.literal("required"), z.literal("none"), z.string()]).optional(),
  /** API format: "anthropic" (default) or "openai" (for GLM, etc.) */
  apiFormat: z.enum(["anthropic", "openai"]).optional(),
  /** Base URL for API (defaults to ANTHROPIC_BASE_URL env or api.anthropic.com) */
  baseUrl: z.string().url().optional(),
  systemPrompt: z.union([z.string(), z.array(SystemBlockSchema)]).optional(),
  cacheConfig: CacheConfigSchema.optional(),
  /** Legacy thinking config (budget_tokens) */
  thinking: ThinkingConfigSchema.optional(),
  /** Extended thinking config (effort levels) */
  extendedThinking: ExtendedThinkingConfigSchema.optional(),
  onToken: z.custom<(text: string) => void>().optional(),
  onThinking: z.custom<(thinking: string) => void>().optional(),
  /** Called when redacted thinking is received (data is base64) */
  onRedactedThinking: z.custom<(data: string) => void>().optional(),
  onToolUse: z.custom<OnToolUseCallback>().optional(),
  signal: z.custom<AbortSignal>().optional(),
});

// ============================================
// STREAM RESULT SCHEMA
// ============================================

export const StreamResultSchema = z.object({
  message: APIResponseSchema,
  usage: UsageMetricsSchema,
  cacheMetrics: CacheMetricsSchema.optional(),
  costUSD: z.number().nonnegative(),
  durationMs: z.number().nonnegative(),
  ttftMs: z.number().nonnegative(),
  /** Thinking tokens used (if extended thinking was enabled) */
  thinkingTokens: z.number().nonnegative().optional(),
});

// ============================================
// STREAMING EVENT SCHEMAS
// ============================================

export const StreamingEventTypeSchema = z.enum([
  "message_start",
  "content_block_start",
  "content_block_delta",
  "content_block_stop",
  "message_delta",
  "message_stop",
  "ping",
  "error",
]);

export const StreamingEventSchema = z.object({
  type: StreamingEventTypeSchema,
  index: z.number().optional(),
  delta: z.unknown().optional(),
  message: z.unknown().optional(),
  content_block: z.unknown().optional(),
  error: z.unknown().optional(),
});

// ============================================
// DELTA TYPE SCHEMAS
// ============================================

export const DeltaTypeSchema = z.enum([
  "text_delta",
  "input_json_delta",
  "thinking_delta",
  "signature_delta",
  "code_delta",
]);

export const TextDeltaSchema = z.object({
  type: z.literal("text_delta"),
  text: z.string(),
});

export const InputJsonDeltaSchema = z.object({
  type: z.literal("input_json_delta"),
  partial_json: z.string(),
});

export const ThinkingDeltaSchema = z.object({
  type: z.literal("thinking_delta"),
  thinking: z.string(),
});

// ============================================
// STREAMING CONFIG SCHEMAS
// ============================================

export const StreamingConfigSchema = z.object({
  enabled: z.boolean(),
  onToken: z.function().args(z.string()).returns(z.void()).optional(),
  onToolUse: z.function().args(z.unknown()).returns(z.void()).optional(),
  onThinking: z.function().args(z.string()).returns(z.void()).optional(),
  onError: z.function().args(z.custom<Error>()).returns(z.void()).optional(),
  onComplete: z.function().args(z.unknown()).returns(z.void()).optional(),
});

// ============================================
// STREAMING STATE SCHEMAS
// ============================================

export const StreamingStateSchema = z.enum([
  "idle",
  "streaming",
  "tool_use",
  "thinking",
  "complete",
  "error",
]);

// ============================================
// TYPE EXPORTS
// ============================================

export type StreamOptions = z.infer<typeof StreamOptionsSchema>;
export type StreamResult = z.infer<typeof StreamResultSchema>;
export type StreamingEventType = z.infer<typeof StreamingEventTypeSchema>;
export type StreamingEvent = z.infer<typeof StreamingEventSchema>;
export type DeltaType = z.infer<typeof DeltaTypeSchema>;
export type TextDelta = z.infer<typeof TextDeltaSchema>;
export type InputJsonDelta = z.infer<typeof InputJsonDeltaSchema>;
export type ThinkingDelta = z.infer<typeof ThinkingDeltaSchema>;
export type StreamingConfig = z.infer<typeof StreamingConfigSchema>;
export type StreamingState = z.infer<typeof StreamingStateSchema>;
