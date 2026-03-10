/**
 * Content Extraction - Extract and organize message content
 */

import type { Message, ContentBlock } from "../../types/index.js";
import type { ToolPair } from "./types.js";

/**
 * Extract text content from a message for summarization
 */
export function extractTextFromMessage(message: Message): string {
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
export function extractToolPairs(messages: Message[]): Map<string, ToolPair> {
  const toolPairs = new Map<string, ToolPair>();

  // First pass: collect all tool uses
  for (const message of messages) {
    for (const block of message.content) {
      if (block.type === "tool_use") {
        toolPairs.set(block.id, {
          use: { type: "tool_use", id: block.id, name: block.name, input: block.input }
        });
      }
    }
  }

  // Second pass: match results to uses
  for (const message of messages) {
    for (const block of message.content) {
      if (block.type === "tool_result") {
        const pair = toolPairs.get(block.tool_use_id);
        if (pair) {
          pair.result = {
            type: "tool_result",
            tool_use_id: block.tool_use_id,
            content: block.content,
            is_error: block.is_error
          };
        }
      }
    }
  }

  return toolPairs;
}

/**
 * Extract tool names from a message
 */
export function extractToolNames(message: Message): string[] {
  const names: string[] = [];
  for (const block of message.content) {
    if (block.type === "tool_use") {
      names.push(block.name);
    }
  }
  return names;
}
