/**
 * Token estimation utilities
 */

/**
 * Estimate tokens from text
 * Simple estimation: ~4 characters per token
 */
export function estimateTokens(text: string): number {
  return Math.ceil((text?.length || 1) / 4);
}

/**
 * Estimate tokens from API messages
 */
export function estimateMessagesTokens(messages: Array<{ role: string; content: unknown }>): number {
  let total = 0;
  for (const msg of messages) {
    if (typeof msg.content === "string") {
      total += estimateTokens(msg.content);
    } else if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === "text") total += estimateTokens(block.text);
        else if (block.type === "tool_use") total += estimateTokens(JSON.stringify(block.input));
        else if (block.type === "tool_result" && typeof block.content === "string") {
          total += estimateTokens(block.content);
        } else {
          total += estimateTokens(block.content);
        }
      }
    }
  }
  return total;
}
