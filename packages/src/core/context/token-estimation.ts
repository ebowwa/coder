/**
 * Token Estimation - Estimate token counts for messages
 *
 * Uses native Rust module for accurate, code-aware token counting.
 * Falls back to heuristic (~4 chars/token) if native unavailable.
 */

import type { Message, ContentBlock } from "../../types/index.js";
import { CHARS_PER_TOKEN } from "./constants.js";

// Lazy-load native module to avoid circular dependencies
let _native: { count_tokens?: (text: string) => number } | null = null;
let _nativeLoadAttempted = false;

function getNative(): { count_tokens?: (text: string) => number } | null {
  if (_nativeLoadAttempted) return _native;
  _nativeLoadAttempted = true;

  try {
    // Dynamic import to avoid bundling issues
    const nativePath = require.resolve("../../../native/index.js");
    _native = require(nativePath).getNative?.() ?? null;
  } catch {
    // Native module not available, use fallback
    _native = null;
  }

  return _native;
}

/**
 * Estimate the number of tokens in a text string.
 * Uses native code-aware tokenizer if available, falls back to heuristic.
 */
export function estimateTokens(text: string): number {
  if (!text || text.length === 0) return 0;

  // Try native module first (more accurate, code-aware)
  const native = getNative();
  if (native?.count_tokens) {
    return native.count_tokens(text);
  }

  // Fallback: simple heuristic
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Estimate tokens for a single content block
 */
export function estimateBlockTokens(block: ContentBlock): number {
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
export function estimateMessageTokens(message: Message): number {
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
