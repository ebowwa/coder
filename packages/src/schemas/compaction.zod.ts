/**
 * Context Compaction Schemas
 * Zod schemas for context window management and compaction
 */

import { z } from "zod";

// ============================================
// CONTEXT WINDOW SIZES SCHEMAS
// ============================================

export const ContextWindowSizeTypeSchema = z.enum(["standard", "extended_1m"]);

export const ContextWindowSizesSchema = z.object({
  standard: z.literal(200000),
  extended_1m: z.literal(1000000),
});

// ============================================
// TOKEN THRESHOLDS SCHEMAS
// ============================================

export const TokenThresholdsSchema = z.object({
  maxOutputTokens: z.number(),
  autoCompactBuffer: z.number(),
  warningOffset: z.number(),
  errorOffset: z.number(),
  blockingLimitBuffer: z.number(),
});

// ============================================
// THRESHOLD CHECK RESULT SCHEMAS
// ============================================

export const ThresholdCheckResultSchema = z.object({
  percentLeft: z.number(),
  isAboveWarningThreshold: z.boolean(),
  isAboveErrorThreshold: z.boolean(),
  isAboveAutoCompactThreshold: z.boolean(),
  isAtBlockingLimit: z.boolean(),
});

// ============================================
// COMPACTION TRIGGERS SCHEMAS
// ============================================

export const CompactionTriggerSchema = z.enum([
  "auto_compact",
  "manual_compact",
  "threshold_exceeded",
]);

export const CompactionConditionsSchema = z.object({
  validSessionType: z.boolean(),
  autoCompactEnabled: z.boolean(),
  compactNotDisabled: z.boolean(),
  autoCompactNotDisabled: z.boolean(),
  tokenCountExceedsThreshold: z.boolean(),
});

// ============================================
// COMPACTION PROCESS SCHEMAS
// ============================================

export const CompactionStepSchema = z.enum([
  "determine_range",
  "filter_messages",
  "generate_summary",
  "validate_summary",
  "return_result",
]);

// LLM Summarization Options (from context-compaction.ts)
export const LLMSummarizationOptionsSchema = z.object({
  apiKey: z.string().optional(),
  model: z.string().optional(),
  baseUrl: z.string().optional(),
  timeout: z.number().optional(),
});

// Compaction Options (for agent-loop compaction.ts)
export const AgentLoopCompactionOptionsSchema = z.object({
  force: z.boolean().optional(),
  startIndex: z.number().optional(),
  summaryModel: z.string().optional(),
  maxSummaryTokens: z.number().optional(),
  preserveRecent: z.boolean().optional(),
  recentMessageCount: z.number().optional(),
});

// Compaction Options (from context-compaction.ts)
export const ContextCompactionOptionsSchema = z.object({
  keepFirst: z.number().optional(),
  keepLast: z.number().optional(),
  preserveToolPairs: z.boolean().optional(),
  useLLMSummarization: z.boolean().optional(),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
});

// Alias for backward compatibility
export const CompactionOptionsSchema = ContextCompactionOptionsSchema;

// Compaction Result (from agent-loop compaction.ts)
export const AgentLoopCompactionResultSchema = z.object({
  compacted: z.boolean(),
  postCompactTokenCount: z.number(),
  truePostCompactTokenCount: z.number(),
  summary: z.string().optional(),
  messagesRemoved: z.number(),
  stepResults: z.record(z.unknown()).optional(),
});

// Import Message type for use in schema
import type { Message } from "./api.zod.js";

// Compaction Result (from context-compaction.ts)
export const ContextCompactionResultSchema = z.object({
  messages: z.custom<Message[]>(), // Message[] is complex, use custom
  messagesRemoved: z.number(),
  tokensBefore: z.number(),
  tokensAfter: z.number(),
  didCompact: z.boolean(),
});

// Alias for backward compatibility
export const CompactionResultSchema = ContextCompactionResultSchema;

// ============================================
// SUMMARY PROMPTS SCHEMAS
// ============================================

export const SummaryPromptConfigSchema = z.object({
  fullCompaction: z.object({
    instruction: z.string(),
    structure: z.array(z.string()),
  }),
  partialCompaction: z.object({
    instruction: z.string(),
    structure: z.array(z.string()),
  }),
});

// ============================================
// COMPACTION ENVIRONMENT SCHEMAS
// ============================================

export const CompactionEnvConfigSchema = z.object({
  CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: z.number().min(0).max(100).optional(),
  DISABLE_COMPACT: z.string().optional(),
  DISABLE_AUTO_COMPACT: z.string().optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type ContextWindowSizeType = z.infer<typeof ContextWindowSizeTypeSchema>;
export type ContextWindowSizes = z.infer<typeof ContextWindowSizesSchema>;
export type TokenThresholds = z.infer<typeof TokenThresholdsSchema>;
export type ThresholdCheckResult = z.infer<typeof ThresholdCheckResultSchema>;
export type CompactionTrigger = z.infer<typeof CompactionTriggerSchema>;
export type CompactionConditions = z.infer<typeof CompactionConditionsSchema>;
export type CompactionStep = z.infer<typeof CompactionStepSchema>;
export type LLMSummarizationOptions = z.infer<typeof LLMSummarizationOptionsSchema>;
export type AgentLoopCompactionOptions = z.infer<typeof AgentLoopCompactionOptionsSchema>;
export type ContextCompactionOptions = z.infer<typeof ContextCompactionOptionsSchema>;
export type CompactionOptions = z.infer<typeof CompactionOptionsSchema>;
export type AgentLoopCompactionResult = z.infer<typeof AgentLoopCompactionResultSchema>;
export type ContextCompactionResult = z.infer<typeof ContextCompactionResultSchema>;
export type CompactionResult = z.infer<typeof CompactionResultSchema>;
export type SummaryPromptConfig = z.infer<typeof SummaryPromptConfigSchema>;
export type CompactionEnvConfig = z.infer<typeof CompactionEnvConfigSchema>;
