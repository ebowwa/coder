/**
 * Settings Schemas
 * Zod schemas for configuration settings
 */

import { z } from "zod";

// ============================================
// SETTINGS FILE SCHEMAS
// ============================================

export const SettingsFilePathSchema = z.enum([
  "~/.claude.json",
  "~/.claude/settings.json",
  "~/.claude/keybindings.json",
  ".claude/settings.json",
]);

// ============================================
// HOOK CONFIG SCHEMAS
// ============================================

export const HookEventSchema = z.enum([
  "SessionStart",
  "SessionEnd",
  "PreToolUse",
  "PostToolUse",
  "PrePrompt",
  "PostPrompt",
  "PreCompact",
  "PostCompact",
]);

export const HookConfigSchema = z.object({
  event: HookEventSchema,
  command: z.string(),
  enabled: z.boolean().optional(),
  timeout: z.number().optional(),
  description: z.string().optional(),
});

// ============================================
// SETTINGS SCHEMAS
// ============================================

export const SettingsSchema = z.object({
  hooks: z.array(HookConfigSchema).optional(),
  permissions: z.record(z.boolean()).optional(),
  mcpServers: z.record(z.unknown()).optional(),
  autoCompact: z.boolean().optional(),
  autoCompactThreshold: z.number().optional(),
  thinkingEnabled: z.boolean().optional(),
  thinkingBudget: z.number().optional(),
  defaultModel: z.string().optional(),
  telemetryEnabled: z.boolean().optional(),
});

// ============================================
// KEYBINDING SCHEMAS
// ============================================

export const KeybindingSchema = z.object({
  key: z.string(),
  command: z.string(),
  when: z.string().optional(),
});

export const KeybindingsConfigSchema = z.object({
  keybindings: z.array(KeybindingSchema),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type SettingsFilePath = z.infer<typeof SettingsFilePathSchema>;
export type HookEvent = z.infer<typeof HookEventSchema>;
export type HookConfig = z.infer<typeof HookConfigSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
export type Keybinding = z.infer<typeof KeybindingSchema>;
export type KeybindingsConfig = z.infer<typeof KeybindingsConfigSchema>;
