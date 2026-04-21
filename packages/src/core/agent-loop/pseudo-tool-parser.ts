/**
 * Pseudo-Tool Parser — detects tool-like instructions in plain text from
 * non-Anthropic models and converts them into synthetic tool_use blocks.
 */

import type { ContentBlock, ToolUseBlock } from "../../schemas/index.js";

export interface PseudoToolCall {
  name: string;
  input: Record<string, unknown>;
  confidence: number;
}

export interface PseudoToolParseResult {
  detected: boolean;
  calls: PseudoToolCall[];
}

/**
 * Check if the model response contains pseudo-tool behavior
 * (describes file operations in text instead of using tool calls).
 */
export function hasPseudoToolBehavior(
  content: ContentBlock[],
  provider?: string,
): boolean {
  if (!content.length) return false;

  const textBlocks = content.filter(
    (b): b is Extract<typeof b, { type: "text" }> => b.type === "text",
  );
  if (!textBlocks.length) return false;

  const hasToolUse = content.some((b) => b.type === "tool_use");
  if (hasToolUse) return false;

  const text = textBlocks.map((b) => b.text).join("\n");

  const toolPatterns = [
    /```(?:bash|sh|shell)\n/i,
    /\bcat\s+[^\s]+\b/,
    /\bsed\s+-[ie]/,
    /\becho\s+["'].+["']\s*>/,
    /\bmkdir\s+-p\b/,
    /\bgit\s+(?:add|commit|push|checkout)\b/,
    /"name"\s*:\s*"(?:Bash|Read|Write|Edit|Glob|Grep)"/,
    /"tool_name"\s*:\s*"/,
  ];

  return toolPatterns.some((p) => p.test(text));
}

const RAW_JSON_TOOL_PATTERN =
  /\{\s*"(?:name|tool_name)"\s*:\s*"(\w+)"\s*,\s*"(?:input|parameters|arguments)"\s*:/g;

function extractJsonObjects(text: string): string[] {
  const objects: string[] = [];
  RAW_JSON_TOOL_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = RAW_JSON_TOOL_PATTERN.exec(text)) !== null) {
    const start = match.index;
    let depth = 0;
    let end = start;
    for (let i = start; i < text.length; i++) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") {
        depth--;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
    if (depth === 0 && end > start) {
      objects.push(text.slice(start, end));
    }
  }
  return objects;
}

/**
 * Parse pseudo-tool calls from model text output.
 */
export function parsePseudoToolCalls(text: string): PseudoToolParseResult {
  const calls: PseudoToolCall[] = [];

  const jsonBlobs = extractJsonObjects(text);
  for (const blob of jsonBlobs) {
    try {
      const parsed = JSON.parse(blob);
      const name = parsed.name || parsed.tool_name;
      const input = parsed.input || parsed.parameters || parsed.arguments || {};
      if (name && typeof name === "string") {
        calls.push({ name, input, confidence: 0.8 });
      }
    } catch {
      // malformed JSON, skip
    }
  }

  if (calls.length > 0) {
    return { detected: true, calls };
  }

  const bashPattern = /```(?:bash|sh|shell)\n([\s\S]*?)```/g;
  let bashMatch: RegExpExecArray | null;
  while ((bashMatch = bashPattern.exec(text)) !== null) {
    const command = bashMatch[1]?.trim();
    if (command) {
      calls.push({
        name: "Bash",
        input: { command },
        confidence: 0.5,
      });
    }
  }

  return { detected: calls.length > 0, calls };
}

/**
 * Convert parsed pseudo-tool calls into ToolUseBlock structures.
 */
export function convertToToolUseBlocks(
  calls: PseudoToolCall[],
  minConfidence = 0.3,
): ToolUseBlock[] {
  return calls
    .filter((c) => c.confidence >= minConfidence)
    .map((c, i) => ({
      type: "tool_use" as const,
      id: `pseudo_${Date.now()}_${i}`,
      name: c.name,
      input: c.input,
    }));
}
