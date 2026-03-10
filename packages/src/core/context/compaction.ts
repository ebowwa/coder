/**
 * Compaction - Reduce message context size while preserving important information
 *
 * Strategy:
 * 1. Always keep the first N messages (original query)
 * 2. Always keep the last M messages (recent context)
 * 3. Summarize middle messages into a single "context summary" user message
 * 4. Preserve tool_use/tool_result pairs when possible
 */

import type { Message, ContentBlock } from "../../types/index.js";
import type { CompactionOptions, CompactionResult, CompactionStats } from "./types.js";
import {
  DEFAULT_KEEP_FIRST,
  DEFAULT_KEEP_LAST,
  DEFAULT_COMPACTION_THRESHOLD,
  MIN_MESSAGES_FOR_COMPACTION,
} from "./constants.js";
import { estimateMessagesTokens } from "./token-estimation.js";
import { extractToolPairs } from "./extraction.js";
import { summarizeMessages, summarizeWithLLM } from "./summarization.js";

/**
 * Compact messages to fit within a token limit.
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
    useLLMSummarization = true,
    apiKey,
    baseUrl,
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

  // Create summary of middle messages (use LLM if available, fallback to simple)
  const summary = useLLMSummarization
    ? await summarizeWithLLM(middleMessages, { apiKey, baseUrl })
    : await summarizeMessages(middleMessages);

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
export function getCompactionStats(result: CompactionResult): CompactionStats {
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
