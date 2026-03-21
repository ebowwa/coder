/**
 * Text Utilities for TUI
 *
 * Re-exports and extensions of @ebowwa/tui-core text algorithms
 * for use in Coder's TUI components.
 *
 * @module core/tui/text-utils
 */

// ============================================
// IMPORTS FROM TUI-CORE PRIMITIVES
// ============================================

// All text algorithms from @ebowwa/tui-core
import {
  // Word boundary detection
  findWordBoundaries,
  analyzeWordBoundaries,
  getWordAtPosition,
  findNextWordBoundary,
  deleteWordAt,
  selectWordAt,
  isWordChar,
  countWords,
  // ANSI parsing and handling
  parseAnsi,
  stripAnsi,
  measureAnsiWidth,
  // Efficient text editing
  createRope,
  createGapBuffer,
  // Buffer utilities
  createCircularBuffer,
  createLogBuffer,
  // Search utilities
  fuzzySearch,
  fuzzyMatch,
  highlightMatch,
  // Layout utilities
  getStringWidth,
  alignText,
  truncate,
  // Text utilities
  wrapText,
  // Edit distance
  levenshtein,
  isSimilar,
  findBestMatch,
} from "@ebowwa/tui-core/algorithms";

// Types
import type {
  WordBoundary,
  WordBoundaryResult,
  CircularBuffer,
  RopeAPI,
  GapBuffer,
  FuzzyMatch,
} from "@ebowwa/tui-core/algorithms";

// ============================================
// RE-EXPORTS
// ============================================

export {
  // Word boundaries
  findWordBoundaries,
  analyzeWordBoundaries,
  getWordAtPosition,
  findNextWordBoundary,
  deleteWordAt,
  selectWordAt,
  isWordChar,
  countWords,
  // ANSI
  parseAnsi,
  stripAnsi,
  measureAnsiWidth,
  // Rope/Gap buffer
  createRope,
  createGapBuffer,
  // Buffers
  createCircularBuffer,
  createLogBuffer,
  // Search
  fuzzySearch,
  fuzzyMatch,
  highlightMatch,
  // Layout
  getStringWidth,
  alignText,
  truncate,
  // Edit distance
  levenshtein,
  isSimilar,
  findBestMatch,
};

// ============================================
// TUI-SPECIFIC EXTENSIONS
// ============================================

/**
 * Truncate a message for display in the TUI
 * Preserves ANSI codes and adds ellipsis
 */
export function truncateMessage(
  message: string,
  maxWidth: number,
  options?: { position?: "start" | "middle" | "end" }
): string {
  const position = options?.position ?? "end";
  const ellipsis = "...";

  if (measureAnsiWidth(message) <= maxWidth) {
    return message;
  }

  const plainText = stripAnsi(message);
  const targetWidth = maxWidth - ellipsis.length;

  if (position === "end") {
    // Truncate from end
    let result = "";
    let width = 0;
    for (const char of plainText) {
      if (width + 1 > targetWidth) break;
      result += char;
      width++;
    }
    return result + ellipsis;
  } else if (position === "start") {
    // Truncate from start
    const chars = [...plainText];
    const startIdx = chars.length - targetWidth;
    return ellipsis + chars.slice(Math.max(0, startIdx)).join("");
  } else {
    // Middle truncation
    const halfWidth = Math.floor(targetWidth / 2);
    const left = plainText.slice(0, halfWidth);
    const right = plainText.slice(-halfWidth);
    return left + ellipsis + right;
  }
}

/**
 * Wrap a message for display in the TUI
 * Preserves ANSI codes and respects word boundaries
 */
export function wrapMessage(
  message: string,
  width: number,
  options?: { breakWords?: boolean }
): string[] {
  return wrapText(message, {
    width,
    preserveAnsi: true,
    breakWords: options?.breakWords ?? false,
    respectWordBoundaries: true,
  });
}

/**
 * Get visual width of text (ignoring ANSI)
 */
export function getVisualWidth(text: string): number {
  return measureAnsiWidth(text);
}

/**
 * Strip ANSI codes from text for plain display
 */
export function stripAnsiCodes(text: string): string {
  return stripAnsi(text);
}

/**
 * Format a tool call for display
 */
export function formatToolCall(
  toolName: string,
  input: unknown,
  maxWidth: number = 100
): string {
  const inputStr = typeof input === "string"
    ? input
    : JSON.stringify(input);

  const truncated = truncateMessage(inputStr, maxWidth - toolName.length - 3);

  return `${toolName}(${truncated})`;
}

/**
 * Format a tool result for display
 */
export function formatToolResult(
  result: unknown,
  isError: boolean,
  maxWidth: number = 200
): string {
  const resultStr = typeof result === "string"
    ? result
    : JSON.stringify(result);

  const truncated = truncateMessage(resultStr, maxWidth);
  const prefix = isError ? "Error: " : "";

  return `${prefix}${truncated}`;
}

/**
 * Highlight matching text in a string (for fuzzy search results)
 */
export function highlightMatches(
  text: string,
  ranges: Array<{ start: number; end: number }>,
  highlightStyle: string = "\x1b[36m", // Cyan
  resetStyle: string = "\x1b[0m"
): string {
  if (ranges.length === 0) return text;

  const result: string[] = [];
  let lastEnd = 0;

  for (const range of ranges) {
    // Add text before match
    result.push(text.slice(lastEnd, range.start));
    // Add highlighted match
    result.push(highlightStyle);
    result.push(text.slice(range.start, range.end));
    result.push(resetStyle);
    lastEnd = range.end;
  }

  // Add remaining text
  result.push(text.slice(lastEnd));

  return result.join("");
}

/**
 * Format cost for display
 */
export function formatCostDisplay(costUSD: number): string {
  if (costUSD < 0.01) {
    return `$${costUSD.toFixed(4)}`;
  }
  if (costUSD < 1) {
    return `$${costUSD.toFixed(3)}`;
  }
  return `$${costUSD.toFixed(2)}`;
}

/**
 * Format token count with K/M suffix
 */
export function formatTokenDisplay(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toString();
}

/**
 * Create a message buffer with circular storage
 */
export function createMessageBuffer<T>(maxSize: number = 1000): CircularBuffer<T> {
  return createCircularBuffer<T>({ maxSize });
}

/**
 * Calculate text similarity (for fuzzy matching commands/files)
 */
export function calculateTextSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const distance = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return 1 - distance / maxLen;
}

/**
 * Find best matching commands for autocomplete
 */
export function findMatchingCommands(
  input: string,
  commands: string[],
  maxResults: number = 5
): Array<{ command: string; score: number }> {
  const results: Array<{ command: string; score: number }> = [];

  for (const cmd of commands) {
    // Check if command starts with input (prefix match)
    if (cmd.startsWith(input)) {
      results.push({ command: cmd, score: 1 });
    } else {
      // Use fuzzy matching
      const match = fuzzyMatch(input, cmd);
      if (match && match.score > 0.3) {
        results.push({ command: cmd, score: match.score });
      }
    }
  }

  // Sort by score (prefix matches first, then by score)
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

// Re-export types
export type {
  WordBoundary,
  WordBoundaryResult,
  CircularBuffer,
  RopeAPI,
  GapBuffer,
  FuzzyMatch,
};
