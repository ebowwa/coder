/**
 * Summarization - Create summaries of conversation messages
 *
 * Strategies:
 * 1. Native compact_content (Rust) - Fast preprocessing
 * 2. Simple concatenation + truncation - Fallback
 * 3. LLM-based summarization - Best quality when API available
 */

import type { Message, ToolResultBlock } from "../../types/index.js";
import { SUMMARIZATION_MODEL } from "../models.js";
import type { LLMSummarizationOptions } from "./types.js";
import {
  MAX_SUMMARY_LENGTH,
  SUMMARY_MAX_TOKENS,
  SUMMARIZATION_SYSTEM_PROMPT,
  SUMMARIZATION_PROMPT,
} from "./constants.js";
import { extractTextFromMessage, extractToolNames } from "./extraction.js";

// Lazy-load native module
let _native: {
  compact_content?: (
    content: string,
    maxTokens: number,
    strategy?: "truncate" | "summarize" | "extract"
  ) => string;
} | null = null;
let _nativeLoadAttempted = false;

function getNative(): typeof _native {
  if (_nativeLoadAttempted) return _native;
  _nativeLoadAttempted = true;

  try {
    const nativePath = require.resolve("../../../native/index.js");
    const nativeModule = require(nativePath);
    _native = nativeModule.getNative?.() ?? null;
  } catch {
    _native = null;
  }

  return _native;
}

/**
 * Preprocess content using native compact_content if available.
 * Used to reduce large content before LLM summarization.
 */
function preprocessContent(content: string, maxTokens: number): string {
  const native = getNative();

  if (native?.compact_content) {
    // Use native "extract" strategy for better preservation of structure
    return native.compact_content(content, maxTokens, "extract");
  }

  // Fallback: simple truncation
  const maxChars = maxTokens * 4;
  if (content.length <= maxChars) return content;
  return content.slice(0, maxChars) + "\n\n...[content truncated]";
}

/**
 * Simple summarization that concatenates and truncates.
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
    toolOperations.push(...extractToolNames(message));

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

/**
 * Summarize messages using an LLM for better context preservation.
 * Falls back to simple truncation if LLM fails or no API key provided.
 */
export async function summarizeWithLLM(
  messages: Message[],
  options: LLMSummarizationOptions = {}
): Promise<string> {
  const {
    apiKey = process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY,
    model = SUMMARIZATION_MODEL,
    baseUrl = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com",
    timeout = 30000,
  } = options;

  // No API key - fall back to simple summarization
  if (!apiKey) {
    return summarizeMessages(messages);
  }

  try {
    // Build the conversation text for summarization
    let conversationText = messages.map((msg) => {
      const role = msg.role.toUpperCase();
      const text = extractTextFromMessage(msg);

      // Extract tool info
      const tools: string[] = [];
      for (const block of msg.content) {
        if (block.type === "tool_use") {
          tools.push(`[TOOL_USE: ${block.name}]`);
        } else if (block.type === "tool_result") {
          const resultBlock = block as ToolResultBlock;
          const preview = typeof resultBlock.content === "string"
            ? resultBlock.content.slice(0, 200)
            : "[complex result]";
          tools.push(`[TOOL_RESULT: ${resultBlock.is_error ? "ERROR" : "OK"}] ${preview}`);
        }
      }

      const toolsStr = tools.length > 0 ? `\n${tools.join("\n")}` : "";
      return `${role}:\n${text.slice(0, 2000)}${toolsStr}`;
    }).join("\n\n---\n\n");

    // Preprocess with native if content is very large (reduce API costs)
    const estimatedInputTokens = Math.ceil(conversationText.length / 4);
    if (estimatedInputTokens > 8000) {
      // Use native preprocessing to reduce size before LLM
      conversationText = preprocessContent(conversationText, 6000);
    }

    // Build request
    const requestBody = {
      model,
      max_tokens: SUMMARY_MAX_TOKENS,
      system: SUMMARIZATION_SYSTEM_PROMPT,
      messages: [{
        role: "user" as const,
        content: SUMMARIZATION_PROMPT.replace("{{MESSAGES}}", conversationText),
      }],
    };

    // Make API call with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${baseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`\x1b[33m[Compaction] LLM summarization failed: ${response.status} - ${errorText}\x1b[0m`);
        return summarizeMessages(messages);
      }

      const data = await response.json() as {
        content?: Array<{ type: string; text?: string }>;
        usage?: { input_tokens: number; output_tokens: number };
      };

      // Extract text from response
      const summaryText = data.content
        ?.filter((block) => block.type === "text")
        .map((block) => block.text || "")
        .join("\n") || "";

      if (!summaryText) {
        console.error("\x1b[33m[Compaction] LLM returned empty summary\x1b[0m");
        return summarizeMessages(messages);
      }

      // Log usage for debugging
      if (data.usage) {
        console.log(`\x1b[90m[Compaction] LLM summary: ${data.usage.input_tokens} in, ${data.usage.output_tokens} out\x1b[0m`);
      }

      return `[LLM Summary of ${messages.length} messages]\n\n${summaryText}`;

    } finally {
      clearTimeout(timeoutId);
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`\x1b[33m[Compaction] LLM summarization error: ${errorMsg}\x1b[0m`);
    // Fall back to simple summarization
    return summarizeMessages(messages);
  }
}

/**
 * Compact content using native module (exposed for direct use)
 */
export function compactContentNative(
  content: string,
  maxTokens: number,
  strategy: "truncate" | "summarize" | "extract" = "extract"
): string | null {
  const native = getNative();
  if (native?.compact_content) {
    return native.compact_content(content, maxTokens, strategy);
  }
  return null;
}
