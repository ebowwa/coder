/**
 * Context Management Schemas
 * Zod schemas for context window and token management
 */

import { z } from "zod";

// ============================================
// CONTEXT DEFAULTS SCHEMAS
// ============================================

export const ContextDefaultsSchema = z.object({
  maxTokens: z.number(),
  minTokens: z.number(),
  minTextBlockMessages: z.number(),
});

// ============================================
// CONTEXT WINDOW SCHEMAS
// ============================================

export const ContextWindowConfigSchema = z.object({
  maxTokens: z.number(),
  minTokens: z.number(),
  minTextBlockMessages: z.number(),
  compressionEnabled: z.boolean(),
});

// ============================================
// TOKEN TRACKING SCHEMAS
// ============================================

export const TokenUsageSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheReadTokens: z.number(),
  cacheWriteTokens: z.number(),
  thinkingTokens: z.number(),
});

export const TokenCounterSchema = z.object({
  messageCount: z.number(),
  messageTokens: z.number(),
  usage: TokenUsageSchema,
});

// ============================================
// CONTEXT COMPRESSION SCHEMAS
// ============================================

export const CompressionTriggerSchema = z.enum([
  "context_limit_approaching",
  "large_conversation_history",
]);

export const CompressionBehaviorSchema = z.object({
  type: z.enum([
    "summarize_old_messages",
    "preserve_key_decisions",
    "maintain_conversation_continuity",
  ]),
  priority: z.number(),
});

export const CompressionConfigSchema = z.object({
  enabled: z.boolean(),
  description: z.string(),
  triggers: z.array(CompressionTriggerSchema),
  behaviors: z.array(CompressionBehaviorSchema),
});

// ============================================
// CONTINUATION SUMMARY SCHEMAS
// ============================================

export const ContinuationSummarySchema = z.object({
  taskDescription: z.string(),
  completedSteps: z.array(z.string()),
  remainingSteps: z.array(z.string()),
  keyFiles: z.array(z.string()),
  importantDecisions: z.array(z.string()),
  workingDirectory: z.string(),
  gitStatus: z.string().optional(),
  timestamp: z.number(),
});

export const ContinuationSummaryConfigSchema = z.object({
  description: z.string(),
  includes: z.array(z.string()),
  maxLength: z.string(),
});

// ============================================
// CONTEXT FUNCTIONS SCHEMAS
// ============================================

export const ContextFunctionsSchema = z.object({
  contextWindow: z.function().returns(ContextWindowConfigSchema),
  tokenCounter: z.function().returns(TokenCounterSchema),
  tokenizer: z.object({
    countTokens: z.function().args(z.string()).returns(z.number()),
    countMessages: z.function().args(z.array(z.unknown())).returns(z.number()),
  }),
});

// ============================================
// CONTEXT SNAPSHOT SCHEMAS
// ============================================

export const GitStatusSnapshotSchema = z.object({
  branch: z.string(),
  ahead: z.number(),
  behind: z.number(),
  staged: z.array(z.string()),
  unstaged: z.array(z.string()),
  untracked: z.array(z.string()),
  conflicted: z.array(z.string()),
});

export const GitStatusSchema = z.object({
  branch: z.string(),
  tracking: z.string().optional(),
  ahead: z.number(),
  behind: z.number(),
  staged: z.array(z.string()),
  unstaged: z.array(z.string()),
  untracked: z.array(z.string()),
  conflicted: z.array(z.string()),
  clean: z.boolean(),
  detached: z.boolean(),
  commit: z.string().optional(),
  commitMessage: z.string().optional(),
});

export const FileHistoryEntrySchema = z.object({
  path: z.string(),
  content: z.string(),
  timestamp: z.number(),
});

export const ContextSnapshotSchema = z.object({
  workingDirectory: z.string(),
  gitStatus: GitStatusSnapshotSchema.optional(),
  fileHistory: z.array(FileHistoryEntrySchema),
  systemPrompt: z.string(),
  systemReminders: z.array(z.string()),
});

// ============================================
// QUERY METRICS SCHEMAS
// ============================================

export const QueryUsageSchema = z.object({
  input_tokens: z.number(),
  output_tokens: z.number(),
  cache_creation_input_tokens: z.number().optional(),
  cache_read_input_tokens: z.number().optional(),
  thinking_tokens: z.number().optional(),
  redacted_thinking_tokens: z.number().optional(),
});

export const QueryMetricsSchema = z.object({
  model: z.string(),
  costUSD: z.number(),
  usage: QueryUsageSchema,
  durationMs: z.number().optional(),
  stopReason: z.string().optional(),
  messageCount: z.number().optional(),
  messageTokens: z.number().optional(),
  requestId: z.string().optional(),
  ttftMs: z.number().optional(),
  cacheMetrics: z.unknown().optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type ContextDefaults = z.infer<typeof ContextDefaultsSchema>;
export type ContextWindowConfig = z.infer<typeof ContextWindowConfigSchema>;
export type TokenUsage = z.infer<typeof TokenUsageSchema>;
export type TokenCounter = z.infer<typeof TokenCounterSchema>;
export type CompressionTrigger = z.infer<typeof CompressionTriggerSchema>;
export type CompressionBehavior = z.infer<typeof CompressionBehaviorSchema>;
export type CompressionConfig = z.infer<typeof CompressionConfigSchema>;
export type ContinuationSummary = z.infer<typeof ContinuationSummarySchema>;
export type ContinuationSummaryConfig = z.infer<typeof ContinuationSummaryConfigSchema>;
export type ContextFunctions = z.infer<typeof ContextFunctionsSchema>;
export type GitStatusSnapshot = z.infer<typeof GitStatusSnapshotSchema>;
export type GitStatus = z.infer<typeof GitStatusSchema>;
export type FileHistoryEntry = z.infer<typeof FileHistoryEntrySchema>;
export type ContextSnapshot = z.infer<typeof ContextSnapshotSchema>;
export type QueryUsage = z.infer<typeof QueryUsageSchema>;
export type QueryMetrics = z.infer<typeof QueryMetricsSchema>;
