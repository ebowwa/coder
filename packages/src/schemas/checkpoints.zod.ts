/**
 * Checkpoint Schemas
 * Zod schemas for conversation checkpoint management
 */

import { z } from "zod";
import { MessageSchema } from "./api.zod.js";

// ============================================
// FILE SNAPSHOT SCHEMA
// ============================================

export const FileSnapshotSchema = z.object({
  path: z.string(),
  content: z.string(),
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
// CHECKPOINT SCHEMA
// ============================================

export const CheckpointSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string(),
  timestamp: z.number().positive(),
  label: z.string(),
  description: z.string().optional(),
  messages: z.array(MessageSchema),
  files: z.array(FileSnapshotSchema),
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

export type FileSnapshot = z.infer<typeof FileSnapshotSchema>;
export type GitState = z.infer<typeof GitStateSchema>;
export type CheckpointMetadata = z.infer<typeof CheckpointMetadataSchema>;
export type Checkpoint = z.infer<typeof CheckpointSchema>;
export type CheckpointStore = z.infer<typeof CheckpointStoreSchema>;
