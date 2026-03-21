/**
 * Checkpoint Schemas
 * Zod schemas for conversation checkpoint management
 *
 * Reference-based approach:
 * - Messages: Reference by index (stored in JSONL sessions)
 * - Files: Hash only (content recoverable from git)
 * - Git state: Full state (lightweight metadata)
 */

import { z } from "zod";

// ============================================
// FILE REFERENCE SCHEMA (hash only, no content)
// ============================================

export const FileReferenceSchema = z.object({
  path: z.string(),
  hash: z.string(),
});

// ============================================
// GIT STATE SCHEMA
// ============================================

export const GitStateSchema = z.object({
  branch: z.string(),
  ahead: z.number().int().nonnegative(),
  behind: z.number().int().nonnegative(),
  staged: z.array(z.string()),
  unstaged: z.array(z.string()),
  untracked: z.array(z.string()),
  stash: z.string().optional(),
});

// ============================================
// CHECKPOINT METADATA SCHEMA
// ============================================

export const CheckpointMetadataSchema = z.object({
  model: z.string().optional(),
  workingDirectory: z.string().optional(),
  totalCost: z.number().nonnegative(),
  messageCount: z.number().int().nonnegative(),
  fileCount: z.number().int().nonnegative(),
});

// ============================================
// CHECKPOINT SCHEMA (reference-based)
// ============================================

export const CheckpointSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  timestamp: z.number().positive(),
  label: z.string().optional(),
  description: z.string().optional(),
  // Reference: just the index, not full messages
  messageIndex: z.number().int().nonnegative(),
  // Reference: just hashes, not content
  files: z.array(FileReferenceSchema),
  gitState: GitStateSchema.optional(),
  metadata: CheckpointMetadataSchema,
});

// ============================================
// CHECKPOINT STORE SCHEMA
// ============================================

export const CheckpointStoreSchema = z.object({
  checkpoints: z.map(z.string(), CheckpointSchema),
  sessionFile: z.string(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type FileReference = z.infer<typeof FileReferenceSchema>;
export type GitState = z.infer<typeof GitStateSchema>;
export type CheckpointMetadata = z.infer<typeof CheckpointMetadataSchema>;
export type Checkpoint = z.infer<typeof CheckpointSchema>;
export type CheckpointStore = z.infer<typeof CheckpointStoreSchema>;
