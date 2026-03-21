/**
 * Highlight Types
 * Type definitions for syntax highlighting and diff operations
 */

// ===== Highlight Result Types =====

export interface HighlightResult {
  /** ANSI-colored text (for terminal display) */
  html: string;
  /** Theme used for highlighting */
  theme: string;
}

export interface HighlightDiffResult {
  /** ANSI-colored diff output */
  output: string;
  /** Number of added lines */
  additions: number;
  /** Number of deleted lines */
  deletions: number;
  /** Number of hunks */
  hunks: number;
}

export interface DiffOptions {
  /** File path to display in header */
  file_path?: string;
  /** Number of context lines around changes (default: 3) */
  context_lines?: number;
}
