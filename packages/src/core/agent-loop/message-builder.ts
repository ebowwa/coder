/**
 * Message Builder - API message construction with reminder injection
 */

import type { Message, ContentBlock, TextBlock } from "../../types/index.js";

/**
 * Build API messages with system reminders injected
 */
export function buildAPIMessages(
  messages: Message[],
  systemPrompt: string,
  systemReminder?: string
): Message[] {
  // If we have a system reminder, inject it into the last user message
  if (systemReminder && messages.length > 0) {
    const result = [...messages];
    // Find the last user message
    for (let i = result.length - 1; i >= 0; i--) {
      const msg = result[i];
      if (msg && msg.role === "user") {
        // Clone the message to avoid mutating original
        const updatedMessage: Message = {
          role: "user",
          content: Array.isArray(msg.content)
            ? injectReminderIntoContent(msg.content, systemReminder)
            : [{ type: "text" as const, text: `${String(msg.content)}\n\n${systemReminder}` }],
        };
        result[i] = updatedMessage;
        break;
      }
    }
    return result;
  }

  return messages;
}

/**
 * Inject system reminder into content blocks
 */
export function injectReminderIntoContent(
  content: ContentBlock[],
  reminder: string
): ContentBlock[] {
  // Check if the last block is a text block we can append to
  if (content.length > 0) {
    const lastBlock = content[content.length - 1];
    if (lastBlock && lastBlock.type === "text") {
      // Append to existing text block
      const textBlock: TextBlock = {
        type: "text",
        text: `${lastBlock.text}\n\n${reminder}`,
      };
      return [...content.slice(0, -1), textBlock];
    }
  }

  // Add as new text block
  const newBlock: TextBlock = { type: "text", text: `\n\n${reminder}` };
  return [...content, newBlock];
}
