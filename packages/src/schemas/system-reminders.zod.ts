/**
 * System Reminders Schemas
 * Zod schemas for system reminder types
 */

import { z } from "zod";
import { ToolUseBlockSchema, GitStatusSchema } from "./api.zod.js";

// ============================================
// TOKEN WARNING OPTIONS SCHEMA
// ============================================

export const TokenWarningOptionsSchema = z.object({
  current: z.number().int().nonnegative(),
  max: z.number().int().positive(),
  threshold: z.number().min(0).max(1).optional(),
});

// ============================================
// COST UPDATE OPTIONS SCHEMA
// ============================================

export const CostUpdateOptionsSchema = z.object({
  cost: z.number().nonnegative(),
  previousCost: z.number().nonnegative().optional(),
  currency: z.string().optional(),
});

// ============================================
// TOOL SUMMARY OPTIONS SCHEMA
// ============================================

export const ToolSummaryOptionsSchema = z.object({
  tools: z.array(ToolUseBlockSchema),
  maxDisplay: z.number().int().positive().optional(),
});

// ============================================
// ENV INFO OPTIONS SCHEMA
// ============================================

export const EnvInfoOptionsSchema = z.object({
  workingDirectory: z.string(),
  gitStatus: GitStatusSchema.nullable().optional(),
  platform: z.enum(["aix", "darwin", "freebsd", "linux", "openbsd", "sunos", "win32", "android"]).optional(),
  shell: z.string().optional(),
});

// ============================================
// SYSTEM REMINDER CONFIG SCHEMA
// ============================================

export const SystemReminderConfigSchema = z.object({
  tokenWarningThreshold: z.number().min(0).max(1),
  costUpdateInterval: z.number().int().nonnegative(),
  toolSummaryInterval: z.number().int().nonnegative(),
  envInfoOnStart: z.boolean(),
});

// ============================================
// COMBINED REMINDER OPTIONS SCHEMA
// ============================================

export const CombinedReminderOptionsSchema = z.object({
  usage: z.object({
    input_tokens: z.number().int().nonnegative(),
    output_tokens: z.number().int().nonnegative(),
  }),
  contextWindow: z.number().int().positive(),
  totalCost: z.number().nonnegative(),
  previousCost: z.number().nonnegative().optional(),
  toolsUsed: z.array(z.string()).optional(),
  workingDirectory: z.string().optional(),
  gitStatus: GitStatusSchema.nullable().optional(),
  turnNumber: z.number().int().nonnegative().optional(),
  config: SystemReminderConfigSchema.partial().optional(),
});

// ============================================
// DEFAULTS
// ============================================

export const DEFAULT_REMINDER_CONFIG: SystemReminderConfig = {
  tokenWarningThreshold: 1.0, // DISABLED: user is token rich
  costUpdateInterval: 0, // DISABLED: no cost updates
  toolSummaryInterval: 0, // DISABLED: no tool summaries
  envInfoOnStart: true,
};

// ============================================
// TYPE EXPORTS
// ============================================

export type TokenWarningOptions = z.infer<typeof TokenWarningOptionsSchema>;
export type CostUpdateOptions = z.infer<typeof CostUpdateOptionsSchema>;
export type ToolSummaryOptions = z.infer<typeof ToolSummaryOptionsSchema>;
export type EnvInfoOptions = z.infer<typeof EnvInfoOptionsSchema>;
export type SystemReminderConfig = z.infer<typeof SystemReminderConfigSchema>;
export type CombinedReminderOptions = z.infer<typeof CombinedReminderOptionsSchema>;
