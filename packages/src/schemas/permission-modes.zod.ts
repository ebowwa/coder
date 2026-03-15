/**
 * Permission Mode Schemas
 * Zod schemas for permission modes
 */

import { z } from "zod";

// ============================================
// PERMISSION MODE SCHEMAS
// ============================================

export const PermissionModeSchema = z.enum([
  "default",
  "acceptEdits",
  "bypassPermissions",
  "plan",
  "dontAsk",
]);

// ============================================
// PERMISSION MODE CONFIG SCHEMAS
// ============================================

export const PermissionModeConfigSchema = z.object({
  mode: PermissionModeSchema,
  description: z.string(),
  symbol: z.string(),
  color: z.string(),
  allowsAutoEdit: z.boolean(),
  allowsAutoCommand: z.boolean(),
  showsPrompts: z.boolean(),
});

// ============================================
// PERMISSION MODE TRANSITION SCHEMAS
// ============================================

export const PermissionModeTransitionSchema = z.object({
  from: PermissionModeSchema,
  to: PermissionModeSchema,
  trigger: z.enum(["cycle", "explicit", "plan_complete"]),
  requiresConfirmation: z.boolean(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type PermissionMode = z.infer<typeof PermissionModeSchema>;
export type PermissionModeConfig = z.infer<typeof PermissionModeConfigSchema>;
export type PermissionModeTransition = z.infer<typeof PermissionModeTransitionSchema>;
