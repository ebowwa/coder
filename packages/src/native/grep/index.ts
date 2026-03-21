/**
 * Grep Module
 * Native ripgrep-based file search
 *
 * @module native/grep
 */

import type { GrepSearchResult, GrepOptions } from "../types/index.js";

// Import native module singleton
import { native } from "../index.js";

// ============================================================================
// Grep Functions
// ============================================================================

/**
 * Search for pattern in files using native ripgrep
 * Returns array of matches with file path, line number, and content
 */
export async function grep_search(
  pattern: string,
  path: string,
  options?: GrepOptions
): Promise<GrepSearchResult[]> {
  return native.grep_search(pattern, path, options || {});
}

/**
 * Count matching lines in files
 * Returns total number of matches
 */
export async function grep_count(
  pattern: string,
  path: string,
  options?: GrepOptions
): Promise<number> {
  return native.grep_count(pattern, path, options || {});
}

/**
 * List files containing matches
 * Returns object with files array and total count
 */
export async function grep_files(
  pattern: string,
  path: string,
  options?: GrepOptions
): Promise<{ files: string[]; total_matches: number }> {
  return native.grep_files(pattern, path, options || {});
}
