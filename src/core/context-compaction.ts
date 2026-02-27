/**
 * Context Compaction - Reduces context size while preserving important information
 *
 * When the context window fills up, we need to compact messages to continue.
 * This module provides token estimation, summarization, and compaction utilities.
 */

import type { Message, ContentBlock, ToolUseBlock, ToolResultBlock } from "../types/index.js";

// ============================================
// CONSTANTS
// ============================================

/** Approximate characters per token (rough estimate for Claude models) */
const CHARS_PER_TOKEN = 4;

/** Default number of recent messages to keep during compaction */
const DEFAULT_KEEP_LAST = 5;

/** Default number of initial messages to keep (usually just the first user query) */
const DEFAULT_KEEP_FIRST = 1;

/** Minimum messages required before compaction is possible */
const MIN_MESSAGES_FOR_COMPACTION = 8;

/** Default threshold for proactive compaction (90% of max tokens) */
const DEFAULT_COMPACTION_THRESHOLD = 0.9;

/** Maximum length for summary text before truncation */
const MAX_SUMMARY_LENGTH = 8000;

// ============================================
// TOKEN ESTIMATION
// ============================================

/**
 * Estimate the number of tokens in a text string.
 * Uses a simple heuristic of ~4 characters per token.
 * This is a rough estimate; actual tokenization varies by model.
 */
export function estimateTokens(text: string): number {
  if (!text || text.length === 0) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Estimate tokens for a single content block
 */
function estimateBlockTokens(block: ContentBlock): number {
  switch (block.type) {
    case "text":
      return estimateTokens(block.text);
    case "image":
      // Images are roughly 85-110 tokens for standard sizes
      // Use 100 as an average estimate
      return 100;
    case "tool_use":
      // Tool use: name + JSON input
      const toolInput = JSON.stringify(block.input);
      return estimateTokens(block.name) + estimateTokens(toolInput) + 10; // overhead
    case "tool_result":
      // Tool result: content + metadata
      if (typeof block.content === "string") {
        return estimateTokens(block.content) + 10;
      }
      return block.content.reduce((sum, b) => sum + estimateBlockTokens(b), 0) + 10;
    case "thinking":
      return estimateTokens(block.thinking);
    default:
      return 0;
  }
}

/**
 * Estimate the total number of tokens in a message
 */
function estimateMessageTokens(message: Message): number {
  // Role overhead (~4 tokens)
  const roleOverhead = 4;

  // Sum all content blocks
  const contentTokens = message.content.reduce(
    (sum, block) => sum + estimateBlockTokens(block),
    0
  );

  return roleOverhead + contentTokens;
}

/**
 * Get total estimated tokens across all messages
 */
export function estimateMessagesTokens(messages: Message[]): number {
  if (!messages || messages.length === 0) return 0;
  return messages.reduce((sum, msg) => sum + estimateMessageTokens(msg), 0);
}

// ============================================
// CONTENT EXTRACTION
// ============================================

/**
 * Extract text content from a message for summarization
 */
function extractTextFromMessage(message: Message): string {
  const parts: string[] = [];

  for (const block of message.content) {
    switch (block.type) {
      case "text":
        parts.push(block.text);
        break;
      case "tool_use":
        parts.push(`[Tool: ${block.name}(${JSON.stringify(block.input)})]`);
        break;
      case "tool_result":
        const content = typeof block.content === "string"
          ? block.content
          : block.content.map(b => b.type === "text" ? b.text : "[content]").join("");
        parts.push(`[Result: ${content.slice(0, 500)}${content.length > 500 ? "..." : ""}]`);
        break;
      case "thinking":
        parts.push(`[Thinking: ${block.thinking.slice(0, 200)}...]`);
        break;
    }
  }

  return parts.join("\n");
}

/**
 * Extract tool use/result pairs from messages for preservation
 */
function extractToolPairs(messages: Message[]): Map<string, { use: ToolUseBlock; result?: ToolResultBlock }> {
  const toolPairs = new Map<string, { use: ToolUseBlock; result?: ToolResultBlock }>();

  // First pass: collect all tool uses
  for (const message of messages) {
    for (const block of message.content) {
      if (block.type === "tool_use") {
        toolPairs.set(block.id, { use: block });
      }
    }
  }

  // Second pass: match results to uses
  for (const message of messages) {
    for (const block of message.content) {
      if (block.type === "tool_result") {
        const pair = toolPairs.get(block.tool_use_id);
        if (pair) {
          pair.result = block;
        }
      }
    }
  }

  return toolPairs;
}

// ============================================
// SUMMARIZATION
// ============================================

/**
 * Summarize a range of messages into a single text.
 * This is a simple implementation that concatenates and truncates.
 * Can be enhanced later with LLM-based summarization.
 */
export async function summarizeMessages(messages: Message[]): Promise<string> {
  if (!messages || messages.length === 0) {
    return "";
  }

  const summaryParts: string[] = [];
  summaryParts.push(`[Context Summary: ${messages.length} messages compacted]\n`);

  // Track tool operations for a cleaner summary
  const toolOperations: string[] = [];

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    if (!message) continue;

    const role = message.role.toUpperCase();
    const text = extractTextFromMessage(message);

    // Track tool operations
    for (const block of message.content) {
      if (block.type === "tool_use") {
        toolOperations.push(`${block.name}`);
      }
    }

    // Add truncated message content
    const truncated = text.length > 300 ? `${text.slice(0, 300)}...` : text;
    summaryParts.push(`${role}: ${truncated}\n`);
  }

  // Add tool summary
  if (toolOperations.length > 0) {
    const toolCounts = toolOperations.reduce((acc, tool) => {
      acc[tool] = (acc[tool] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const toolSummary = Object.entries(toolCounts)
      .map(([name, count]) => `${name}(${count})`)
      .join(", ");
    summaryParts.push(`\nTools used: ${toolSummary}\n`);
  }

  let summary = summaryParts.join("");

  // Truncate if too long
  if (summary.length > MAX_SUMMARY_LENGTH) {
    summary = summary.slice(0, MAX_SUMMARY_LENGTH) + "\n...[truncated]";
  }

  return summary;
}

// ============================================
// COMPACTION
// ============================================

export interface CompactionOptions {
  /** Number of initial messages to keep unchanged */
  keepFirst?: number;
  /** Number of recent messages to keep unchanged */
  keepLast?: number;
  /** Whether to preserve tool_use/tool_result pairs */
  preserveToolPairs?: boolean;
}

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

/**
 * Compact messages to fit within a token limit.
 *
 * Strategy:
 * 1. Always keep the first N messages (original query)
 * 2. Always keep the last M messages (recent context)
 * 3. Summarize middle messages into a single "context summary" user message
 * 4. Preserve tool_use/tool_result pairs when possible
 */
export async function compactMessages(
  messages: Message[],
  maxTokens: number,
  options: CompactionOptions = {}
): Promise<CompactionResult> {
  const {
    keepFirst = DEFAULT_KEEP_FIRST,
    keepLast = DEFAULT_KEEP_LAST,
    preserveToolPairs = true,
  } = options;

  const tokensBefore = estimateMessagesTokens(messages);

  // If already under limit, no compaction needed
  if (tokensBefore <= maxTokens) {
    return {
      messages,
      messagesRemoved: 0,
      tokensBefore,
      tokensAfter: tokensBefore,
      didCompact: false,
    };
  }

  // Not enough messages to compact - silent return
  if (messages.length <= keepFirst + keepLast) {
    return {
      messages,
      messagesRemoved: 0,
      tokensBefore,
      tokensAfter: tokensBefore,
      didCompact: false,
    };
  }

  // Extract segments
  const firstMessages = messages.slice(0, keepFirst);
  const middleMessages = messages.slice(keepFirst, -keepLast);
  const lastMessages = messages.slice(-keepLast);

  // Create summary of middle messages
  const summary = await summarizeMessages(middleMessages);

  // Build summary message
  const summaryMessage: Message = {
    role: "user",
    content: [{
      type: "text",
      text: `[Previous context has been compacted for continuity]\n\n${summary}`,
    }],
  };

  // Optionally preserve important tool pairs
  let preservedBlocks: ContentBlock[] = [];
  if (preserveToolPairs && middleMessages.length > 0) {
    const toolPairs = extractToolPairs(middleMessages);

    // Keep the most recent tool use/result pairs (up to 3)
    const recentPairs = Array.from(toolPairs.values())
      .slice(-3)
      .filter(pair => pair.result && !pair.result.is_error);

    for (const pair of recentPairs) {
      preservedBlocks.push(pair.use as ContentBlock);
      if (pair.result) {
        preservedBlocks.push(pair.result as ContentBlock);
      }
    }
  }

  // Build compacted message list
  const compacted: Message[] = [
    ...firstMessages,
    summaryMessage,
  ];

  // Add preserved tool results if any
  if (preservedBlocks.length > 0) {
    compacted.push({
      role: "assistant",
      content: preservedBlocks.filter(b => b.type === "tool_use"),
    });
    compacted.push({
      role: "user",
      content: preservedBlocks.filter(b => b.type === "tool_result"),
    });
  }

  // Add recent messages
  compacted.push(...lastMessages);

  const tokensAfter = estimateMessagesTokens(compacted);
  const messagesRemoved = messages.length - compacted.length;

  console.log(`Context compaction: ${messages.length} -> ${compacted.length} messages, ${tokensBefore} -> ${tokensAfter} tokens`);

  return {
    messages: compacted,
    messagesRemoved,
    tokensBefore,
    tokensAfter,
    didCompact: true,
  };
}

/**
 * Check if compaction is needed proactively.
 * Returns true if current token usage exceeds the threshold AND there are enough messages to compact.
 */
export function needsCompaction(
  messages: Message[],
  maxTokens: number,
  threshold: number = DEFAULT_COMPACTION_THRESHOLD
): boolean {
  // Not enough messages to meaningfully compact
  if (messages.length < MIN_MESSAGES_FOR_COMPACTION) {
    return false;
  }

  const currentTokens = estimateMessagesTokens(messages);
  const thresholdTokens = Math.floor(maxTokens * threshold);
  return currentTokens >= thresholdTokens;
}

/**
 * Get compaction statistics for logging/metrics
 */
export function getCompactionStats(result: CompactionResult): {
  reductionPercent: number;
  tokensSaved: number;
} {
  if (!result.didCompact) {
    return { reductionPercent: 0, tokensSaved: 0 };
  }

  const tokensSaved = result.tokensBefore - result.tokensAfter;
  const reductionPercent = (tokensSaved / result.tokensBefore) * 100;

  return {
    reductionPercent: Math.round(reductionPercent * 100) / 100,
    tokensSaved,
  };
}
