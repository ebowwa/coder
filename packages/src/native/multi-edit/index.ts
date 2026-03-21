/**
 * Multi-Edit Module
 * Atomic multi-file editing with rollback
 *
 * @module native/multi-edit
 */

import type {
  MultiEditEntry,
  MultiEditResult,
  MultiEditPreviewEntry,
} from "../types/index.js";

// Import native module singleton
import { native } from "../index.js";

// ============================================================================
// Multi-File Edit Functions
// ============================================================================

/**
 * Validate multi-file edits without applying them
 * Returns an array of error messages (empty if valid)
 */
export function validate_multi_edits(edits: MultiEditEntry[]): string[] {
  return native.validate_multi_edits(edits);
}

/**
 * Preview what edits would be applied without making changes
 * Returns an array of { file_path, replacement_count } for each file
 */
export function preview_multi_edits(edits: MultiEditEntry[]): MultiEditPreviewEntry[] {
  return native.preview_multi_edits(edits);
}

/**
 * Apply multiple file edits atomically with rollback on failure
 *
 * This function:
 * 1. Validates all edits can be applied (files exist, strings found)
 * 2. Creates backups of all affected files
 * 3. Applies all edits
 * 4. Rolls back on any failure
 *
 * @param edits Array of edit operations
 * @returns Result with success status and list of modified files
 */
export function apply_multi_edits(edits: MultiEditEntry[]): MultiEditResult {
  return native.apply_multi_edits(edits);
}
