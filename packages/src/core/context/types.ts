/**
 * Context Types - Type definitions for context compaction
 */

import type { ContentBlock, Message } from "../../types/index.js";

/** Options for LLM-based summarization */
export interface LLMSummarizationOptions {
  /** API key for the LLM */
  apiKey?: string;
  /** Model to use for summarization (default: haiku) */
  model?: string;
  /** Base URL for API (for non-Anthropic providers) */
  baseUrl?: string;
  /** Timeout in ms (default: 30000) */
  timeout?: number;
}

/** Options for message compaction */
export interface CompactionOptions {
  /** Number of initial messages to keep unchanged */
  keepFirst?: number;
  /** Number of recent messages to keep unchanged */
  keepLast?: number;
  /** Whether to preserve tool_use/tool_result pairs */
  preserveToolPairs?: boolean;
  /** Use LLM for summarization (default: true if API key available) */
  useLLMSummarization?: boolean;
  /** API key for LLM summarization (falls back to env) */
  apiKey?: string;
  /** Base URL for API (for non-Anthropic providers like Z.AI) */
  baseUrl?: string;
}

/** Result of a compaction operation */
export interface CompactionResult {
  /** The compacted messages */
  messages: Message[];
  /** Number of messages removed */
  messagesRemoved: number;
  /** Estimated tokens before compaction */
  tokensBefore: number;
  /** Estimated tokens after compaction */
  tokensAfter: number;
  /** Whether compaction actually occurred */
  didCompact: boolean;
}

/** Statistics from compaction */
export interface CompactionStats {
  reductionPercent: number;
  tokensSaved: number;
}

/** Tool use/result pair for preservation */
export interface ToolPair {
  use: { type: "tool_use"; id: string; name: string; input: unknown };
  result?: { type: "tool_result"; tool_use_id: string; content: string | ContentBlock[]; is_error?: boolean };
}
