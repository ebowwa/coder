/**
 * Context Module - Context compaction for conversation management
 *
 * When the context window fills up, we need to compact messages to continue.
 * This module provides token estimation, summarization, and compaction utilities.
 *
 * @example
 * ```ts
 * import { compactMessages, needsCompaction, estimateMessagesTokens } from "./context/index.js";
 *
 * // Check if compaction is needed
 * if (needsCompaction(messages, maxTokens)) {
 *   const result = await compactMessages(messages, maxTokens);
 *   console.log(`Saved ${result.tokensBefore - result.tokensAfter} tokens`);
 * }
 * ```
 */

// Types
export type {
  LLMSummarizationOptions,
  CompactionOptions,
  CompactionResult,
  CompactionStats,
  ToolPair,
} from "./types.js";

// Constants
export {
  CHARS_PER_TOKEN,
  DEFAULT_KEEP_LAST,
  DEFAULT_KEEP_FIRST,
  MIN_MESSAGES_FOR_COMPACTION,
  DEFAULT_COMPACTION_THRESHOLD,
  MAX_SUMMARY_LENGTH,
  SUMMARY_MAX_TOKENS,
} from "./constants.js";

// Token Estimation
export {
  estimateTokens,
  estimateBlockTokens,
  estimateMessageTokens,
  estimateMessagesTokens,
} from "./token-estimation.js";

// Extraction
export {
  extractTextFromMessage,
  extractToolPairs,
  extractToolNames,
} from "./extraction.js";

// Summarization
export {
  summarizeMessages,
  summarizeWithLLM,
  compactContentNative,
} from "./summarization.js";

// Compaction
export {
  compactMessages,
  needsCompaction,
  getCompactionStats,
} from "./compaction.js";
