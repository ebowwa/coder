/**
 * Config Schemas
 * Zod schemas for configuration loading types
 */

import { z } from "zod";
import { MCPServerConfigSchema, PermissionModeSchema, HookEventSchema } from "./index.js";

// ============================================
// HOOK MATCHER CONFIG SCHEMA
// ============================================

export const HookMatcherConfigSchema = z.object({
  matcher: z.string().optional(),
  hooks: z.array(z.object({
    type: z.enum(["command", "prompt"]),
    command: z.string().optional(),
    prompt: z.string().optional(),
    timeout: z.number().int().positive().optional(),
  })),
});

// ============================================
// PROJECT CONFIG SCHEMA
// ============================================

export const ProjectConfigSchema = z.object({
  allowedTools: z.array(z.string()).optional(),
  mcpServers: z.record(z.string(), MCPServerConfigSchema).optional(),
  enabledMcpjsonServers: z.array(z.string()).optional(),
  disabledMcpjsonServers: z.array(z.string()).optional(),
  hasTrustDialogAccepted: z.boolean().optional(),
  lastSessionId: z.string().optional(),
});

// ============================================
// CLAUDE MAIN CONFIG SCHEMA
// ============================================

export const ClaudeMainConfigSchema = z.object({
  numStartups: z.number().int().nonnegative().optional(),
  verbose: z.boolean().optional(),
  preferredNotifChannel: z.enum(["terminal_bell", "notification"]).optional(),
  projects: z.record(z.string(), ProjectConfigSchema).optional(),
  mcpServers: z.record(z.string(), MCPServerConfigSchema).optional(),
});

// ============================================
// SETTINGS CONFIG SCHEMA
// ============================================

export const SettingsConfigSchema = z.object({
  hooks: z.record(HookEventSchema, z.array(HookMatcherConfigSchema)).optional(),
  permissions: z.object({
    defaultMode: PermissionModeSchema.optional(),
    allowedTools: z.array(z.string()).optional(),
    disallowedTools: z.array(z.string()).optional(),
  }).optional(),
});

// ============================================
// KEYBINDING CONFIG SCHEMA
// ============================================

export const KeybindingConfigSchema = z.object({
  bindings: z.array(z.object({
    key: z.string(),
    command: z.string(),
    when: z.string().optional(),
  })),
});

// ============================================
// LOADED CONFIG SCHEMA
// ============================================

export const LoadedConfigSchema = z.object({
  main: ClaudeMainConfigSchema,
  settings: SettingsConfigSchema,
  keybindings: KeybindingConfigSchema,
  projectSettings: SettingsConfigSchema,
  sources: z.array(z.string()),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type HookMatcherConfig = z.infer<typeof HookMatcherConfigSchema>;
export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;
export type ClaudeMainConfig = z.infer<typeof ClaudeMainConfigSchema>;
export type SettingsConfig = z.infer<typeof SettingsConfigSchema>;
export type KeybindingConfig = z.infer<typeof KeybindingConfigSchema>;
export type LoadedConfig = z.infer<typeof LoadedConfigSchema>;
