/**
 * Worktree Schemas
 * Zod schemas for git worktree management
 */

import { z } from "zod";

// ============================================
// WORKTREE CONFIG SCHEMAS
// ============================================

export const WorktreeConfigSchema = z.object({
  name: z.string(),
  branch: z.string().optional(),
  commitish: z.string().optional(),
  path: z.string().optional(),
  createBranch: z.boolean().optional(),
  detach: z.boolean().optional(),
});

// ============================================
// WORKTREE INFO SCHEMAS
// ============================================

export const WorktreeInfoSchema = z.object({
  path: z.string(),
  head: z.string(),
  branch: z.string().optional(),
  locked: z.string().optional(),
  prunable: z.string().optional(),
  isMainWorktree: z.boolean(),
});

// ============================================
// WORKTREE LIST SCHEMAS
// ============================================

export const WorktreeListSchema = z.object({
  mainWorktree: WorktreeInfoSchema.optional(),
  worktrees: z.array(WorktreeInfoSchema),
});

// ============================================
// WORKTREE OPERATION SCHEMAS
// ============================================

export const WorktreeOperationSchema = z.enum([
  "add",
  "remove",
  "prune",
  "list",
  "lock",
  "unlock",
  "move",
]);

export const WorktreeOperationResultSchema = z.object({
  success: z.boolean(),
  operation: WorktreeOperationSchema,
  worktree: WorktreeInfoSchema.optional(),
  error: z.string().optional(),
});

// ============================================
// WORKTREE SESSION SCHEMAS
// ============================================

export const WorktreeSessionSchema = z.object({
  id: z.string(),
  worktreePath: z.string(),
  branch: z.string(),
  createdAt: z.number(),
  lastActivity: z.number().optional(),
  status: z.enum(["active", "idle", "completed"]),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type WorktreeConfig = z.infer<typeof WorktreeConfigSchema>;
export type WorktreeInfo = z.infer<typeof WorktreeInfoSchema>;
export type WorktreeList = z.infer<typeof WorktreeListSchema>;
export type WorktreeOperation = z.infer<typeof WorktreeOperationSchema>;
export type WorktreeOperationResult = z.infer<typeof WorktreeOperationResultSchema>;
export type WorktreeSession = z.infer<typeof WorktreeSessionSchema>;
