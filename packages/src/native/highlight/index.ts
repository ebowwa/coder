/**
 * Highlight Module
 * Syntax highlighting with ANSI escape codes
 *
 * @module native/highlight
 */

import type {
  HighlightResult,
  HighlightDiffResult,
  DiffOptions,
} from "../types/index.js";

// Import native module singleton
import { native } from "../index.js";

// ============================================================================
// Highlight Functions
// ============================================================================

/**
 * Syntax highlight code with ANSI escape codes for terminal display
 * Uses native Rust module if available, falls back to JS implementation
 */
export function highlight_code(code: string, language: string): HighlightResult {
  return native.highlight_code(code, language);
}

/**
 * Highlight markdown with nested code block syntax highlighting
 * Parses markdown for code fences and highlights code blocks with their language
 */
export function highlight_markdown(markdown: string): HighlightResult {
  return native.highlight_markdown(markdown);
}

/**
 * Highlight a diff with ANSI colors
 * Uses native Rust module if available, falls back to JS implementation
 */
export function highlight_diff(
  oldText: string,
  newText: string,
  options?: DiffOptions
): HighlightDiffResult {
  return native.highlight_diff(oldText, newText, options);
}

/**
 * Calculate diff hunks with hunk headers for LLM context
 * Returns structured diff with @@ headers included in content
 */
export function calculate_diff(oldText: string, newText: string): Array<{
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  content: string;
}> {
  return native.calculate_diff(oldText, newText);
}

/**
 * List all supported languages for syntax highlighting
 */
export function list_highlight_languages(): string[] {
  return [
    // Core languages
    "typescript", "ts", "javascript", "js",
    "python", "py",
    "rust", "rs",
    "go", "golang",
    "ruby", "rb",
    "java",
    "c", "cpp", "c++", "csharp", "cs", "c#",
    "php",
    "swift",
    "kotlin", "kt",
    "scala",
    // Shell & config
    "shell", "sh", "bash", "zsh",
    "json",
    "yaml", "yml",
    "toml",
    // Markup
    "markdown", "md",
    "html", "htm",
    "css", "scss", "less",
    "xml",
    // Database
    "sql",
    // Diagrams
    "mermaid", "mmd",
  ];
}
