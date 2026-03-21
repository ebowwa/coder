/**
 * Multi-File Edit Types
 * Type definitions for atomic multi-file editing operations
 */

// ===== Multi-File Edit Types =====

/** A single edit operation for multi-file editing */
export interface MultiEditEntry {
  /** File path to edit (absolute path) */
  filePath: string;
  /** String to find and replace */
  oldString: string;
  /** Replacement string */
  newString: string;
  /** Replace all occurrences (default: false) */
  replaceAll?: boolean;
}

/** Result of an atomic multi-file edit operation */
export interface MultiEditResult {
  /** Whether all edits succeeded */
  success: boolean;
  /** List of files that were modified */
  filesModified: string[];
  /** Total number of string replacements made */
  totalReplacements: number;
  /** Error message if operation failed */
  error?: string;
  /** Whether changes were rolled back due to failure */
  rolledBack: boolean;
}

/** Preview result for a single file */
export interface MultiEditPreviewEntry {
  /** File path */
  filePath: string;
  /** Number of replacements that would be made */
  replacementCount: number;
}
