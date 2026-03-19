/**
 * Token Utilities for TUI
 *
 * Provides token estimation, ID generation, and message formatting.
 * Extracted from tui/helpers.ts to provide shared utilities.
 */

import type { Message as ApiMessage, ContentBlock } from "../../schemas/index.js";

// ============================================
// ID GENERATION
// ============================================

let messageIdCounter = 0;

/**
 * Generate a unique message ID
 * Format: msg-{counter}-{timestamp}
 */
export function genId(): string {
  return `msg-${++messageIdCounter}-${Date.now()}`;
}

/**
 * Reset the message ID counter (for testing)
 */
export function resetIdCounter(): void {
  messageIdCounter = 0;
}

// ============================================
// TOKEN ESTIMATION
// ============================================

/**
 * Estimate token count from text
 * Uses a simple heuristic: ~4 characters per token
 */
export function estimateTokens(text: string): number {
  if (!text) return 1;
  return Math.ceil(text.length / 4);
}

/**
 * Estimate total tokens from API messages
 * Handles both string and array content formats
 */
export function estimateMessagesTokens(messages: ApiMessage[]): number {
  let total = 0;

  for (const msg of messages) {
    // Add overhead for role
    total += 4;

    if (typeof msg.content === "string") {
      total += estimateTokens(msg.content);
    } else if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        total += estimateBlockTokens(block);
      }
    }
  }

  return total;
}

/**
 * Estimate tokens for a single content block
 */
function estimateBlockTokens(block: ContentBlock): number {
  switch (block.type) {
    case "text":
      return estimateTokens(block.text);
    case "tool_use":
      return estimateTokens(block.name) + estimateTokens(JSON.stringify(block.input));
    case "tool_result":
      if (typeof block.content === "string") {
        return estimateTokens(block.content);
      } else if (Array.isArray(block.content)) {
        return block.content.reduce((sum, b) => sum + estimateBlockTokens(b), 0);
      }
      return 10;
    case "thinking":
      return estimateTokens(block.thinking);
    case "redacted_thinking":
      return 10; // Placeholder for redacted content
    default:
      return 10;
  }
}

// ============================================
// MESSAGE FORMATTING
// ============================================

/**
 * Convert API message to display text
 * Extracts text content from various block types
 */
export function apiToText(msg: ApiMessage): string {
  if (typeof msg.content === "string") {
    return msg.content;
  }

  if (!Array.isArray(msg.content)) {
    return "";
  }

  return msg.content
    .map((block: ContentBlock): string => {
      switch (block.type) {
        case "text":
          return block.text;
        case "tool_use":
          return `[Tool: ${block.name}]`;
        case "tool_result":
          return block.is_error ? "[Error]" : "[Result]";
        case "thinking":
          return `[Thinking: ${block.thinking.slice(0, 50)}...]`;
        case "redacted_thinking":
          return "[Redacted Thinking]";
        default:
          return "";
      }
    })
    .join("\n");
}

// ============================================
// DISPLAY FORMATTING
// ============================================

/**
 * Format token count for display
 * Examples: 500 → "500", 1500 → "1.5k", 1500000 → "1.5M"
 */
export function formatTokenCount(tokens: number): string {
  if (tokens < 1000) {
    return `${tokens}`;
  }
  if (tokens < 1_000_000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return `${(tokens / 1_000_000).toFixed(1)}M`;
}

/**
 * Format cost for display
 * Examples: 0.001 → "$0.001", 0.05 → "$0.05", 1.5 → "$1.50"
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }
  if (cost < 1) {
    return `$${cost.toFixed(3)}`;
  }
  return `$${cost.toFixed(2)}`;
}

/**
 * Format bytes for display
 * Examples: 500 → "500 B", 1500 → "1.5 KB", 1500000 → "1.5 MB"
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
