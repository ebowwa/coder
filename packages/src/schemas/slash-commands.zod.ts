/**
 * Zod Validation Schemas for Slash Command Types
 * Built-in commands for Claude Code CLI
 */

import { z } from "zod";

// ============================================
// SLASH COMMAND TYPES
// ============================================

/**
 * Slash command definition schema
 */
export const SlashCommandSchema = z.object({
  name: z.string().startsWith("/"),
  description: z.string(),
  skill: z.boolean().optional(),
  aliases: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
  hidden: z.boolean().optional(),
});

/**
 * Slash command registry schema
 */
export const SlashCommandRegistrySchema = z.object({
  commands: z.record(z.string(), SlashCommandSchema),
});

// ============================================
// SKILLS API
// ============================================

/**
 * Skills API configuration schema
 */
export const SkillsAPIConfigSchema = z.object({
  beta_header: z.string(),
  endpoints: z.array(z.string()),
});

// ============================================
// COMMAND PARSING
// ============================================

/**
 * Parsed command result schema
 */
export const ParsedCommandSchema = z.object({
  command: z.string(),
  args: z.array(z.string()),
  raw: z.string(),
});

// ============================================
// COMMAND CATEGORIES
// ============================================

/**
 * Command categories for organization
 */
export const CommandCategorySchema = z.enum([
  "git",
  "session",
  "ui",
  "voice",
  "project",
  "utility",
]);

/**
 * Command category mappings schema
 */
export const CommandCategoriesSchema = z.record(
  CommandCategorySchema,
  z.array(z.string().startsWith("/"))
);

// ============================================
// BUILT-IN COMMANDS VALIDATION
// ============================================

/**
 * Array schema for built-in commands
 */
export const BuiltInCommandsArraySchema = z.array(SlashCommandSchema);

/**
 * Validate that a command name follows the slash command format
 */
export const SlashCommandNameSchema = z.string().regex(/^\/[a-z-]+$/);

// ============================================
// TYPE GUARDS
// ============================================

/**
 * Type guard for SlashCommand
 */
export function isValidSlashCommand(command: unknown): command is z.infer<typeof SlashCommandSchema> {
  return SlashCommandSchema.safeParse(command).success;
}

/**
 * Type guard for ParsedCommand
 */
export function isValidParsedCommand(parsed: unknown): parsed is z.infer<typeof ParsedCommandSchema> {
  return ParsedCommandSchema.safeParse(parsed).success;
}

/**
 * Type guard for CommandCategory
 */
export function isValidCommandCategory(category: unknown): category is z.infer<typeof CommandCategorySchema> {
  return CommandCategorySchema.safeParse(category).success;
}

/**
 * Type guard for SkillsAPIConfig
 */
export function isValidSkillsAPIConfig(config: unknown): config is z.infer<typeof SkillsAPIConfigSchema> {
  return SkillsAPIConfigSchema.safeParse(config).success;
}

/**
 * Check if input is a slash command (starts with /)
 */
export function isSlashCommandInput(input: string): boolean {
  return input.trim().startsWith("/");
}

/**
 * Parse and validate a slash command string
 * Returns null if not a valid slash command format
 */
export function parseSlashCommandSchema(input: string): z.infer<typeof ParsedCommandSchema> | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) {
    return null;
  }

  const parts = trimmed.slice(1).split(/\s+/);
  const command = parts[0] ?? "";
  const args = parts.slice(1);

  const result = ParsedCommandSchema.safeParse({
    command,
    args,
    raw: trimmed,
  });

  return result.success ? result.data : null;
}

/**
 * Validate slash command name format
 */
export function isValidSlashCommandName(name: string): boolean {
  return SlashCommandNameSchema.safeParse(name).success;
}
