/**
 * Zod Validation Schemas for Hook System Types
 * Lifecycle event handlers for Claude Code
 */

import { z } from "zod";

// ============================================
// HOOK TYPES
// ============================================

/**
 * Types of hooks available
 */
export const HookTypeSchema = z.enum(["command", "prompt", "http", "agent"]);

// ============================================
// HOOK EVENTS
// ============================================

/**
 * Events that can trigger hooks
 */
export const HookEventSchema = z.enum([
  "SessionStart",
  "SessionEnd",
  "PreToolUse",
  "PostToolUse",
  "PostToolUseFailure",
  "PrePrompt",
  "PostPrompt",
  "Notification",
  "TeammateIdle",
  "UserPromptSubmit",
  "ConfigChange",
  "WorktreeCreate",
]);

/**
 * Extended hook events including additional lifecycle events
 */
export const ExtendedHookEventSchema = z.enum([
  "SessionStart",
  "SessionEnd",
  "PreToolUse",
  "PostToolUse",
  "PostToolUseFailure",
  "PrePrompt",
  "PostPrompt",
  "Notification",
  "TeammateIdle",
  "UserPromptSubmit",
  "ConfigChange",
  "WorktreeCreate",
  "Stop",
]);

// ============================================
// HOOK MATCHERS
// ============================================

/**
 * Matcher types for filtering hook execution
 */
export const HookMatcherTypeSchema = z.enum(["tool_name", "file_pattern", "regex"]);

// ============================================
// HOOK EXECUTION
// ============================================

/**
 * Hook execution configuration schema
 */
export const HookExecutionConfigSchema = z.object({
  run_in_background: z.boolean(),
  background_task_tools: z.array(z.string()),
  timeout_ms: z.number().positive(),
  default_timeout: z.number().positive(),
});

/**
 * Default hook execution configuration
 */
export const DEFAULT_HOOK_EXECUTION_SCHEMA = HookExecutionConfigSchema.parse({
  run_in_background: true,
  background_task_tools: ["Bash", "Agent"],
  timeout_ms: 120000,
  default_timeout: 120000,
});

// ============================================
// HOOK DEFINITIONS
// ============================================

/**
 * Hook definition for configuration
 */
export const HookDefinitionSchema = z.object({
  event: HookEventSchema,
  type: z.enum(["command", "prompt", "http"]).optional(),
  command: z.string().optional(),
  prompt: z.string().optional(),
  url: z.string().url().optional(),
  timeout: z.number().positive().max(600000).optional(),
  enabled: z.boolean().optional(),
  matcher: z.string().optional(),
});

/**
 * Hook configuration in settings
 */
export const HookConfigSchema = z.object({
  hooks: z.record(z.string(), z.array(HookDefinitionSchema)).optional(),
});

// ============================================
// HOOK INPUT/OUTPUT
// ============================================

/**
 * Input passed to hook execution
 */
export const HookInputSchema = z.object({
  event: HookEventSchema,
  tool_name: z.string().optional(),
  tool_input: z.record(z.string(), z.unknown()).optional(),
  tool_result: z.unknown().optional(),
  tool_result_is_error: z.boolean().optional(),
  error: z.string().optional(),
  session_id: z.string().optional(),
  prompt: z.string().optional(),
  timestamp: z.number(),
});

/**
 * Hook decision types
 */
export const HookDecisionSchema = z.enum(["allow", "block", "deny"]);

/**
 * Output from hook execution
 */
export const HookOutputSchema = z.object({
  decision: HookDecisionSchema.optional(),
  reason: z.string().optional(),
  modified_input: z.record(z.string(), z.unknown()).optional(),
  errors: z.array(z.string()).optional(),
});

// ============================================
// HOOK EXIT CODES
// ============================================

/**
 * Exit codes for hook commands (as const object)
 */
export const HOOK_EXIT_CODES_SCHEMA = {
  ALLOW: 0,
  DENY: 1,
  BLOCK: 2,
} as const;

/**
 * Schema for validating hook exit codes
 */
export const HookExitCodeSchema = z.union([
  z.literal(0), // ALLOW
  z.literal(1), // DENY
  z.literal(2), // BLOCK
]);

// ============================================
// TYPE GUARDS
// ============================================

/**
 * Type guard for HookType
 */
export function isValidHookType(type: unknown): type is z.infer<typeof HookTypeSchema> {
  return HookTypeSchema.safeParse(type).success;
}

/**
 * Type guard for HookEvent
 */
export function isValidHookEvent(event: unknown): event is z.infer<typeof HookEventSchema> {
  return HookEventSchema.safeParse(event).success;
}

/**
 * Type guard for ExtendedHookEvent
 */
export function isValidExtendedHookEvent(event: unknown): event is z.infer<typeof ExtendedHookEventSchema> {
  return ExtendedHookEventSchema.safeParse(event).success;
}

/**
 * Type guard for HookMatcherType
 */
export function isValidHookMatcherType(matcher: unknown): matcher is z.infer<typeof HookMatcherTypeSchema> {
  return HookMatcherTypeSchema.safeParse(matcher).success;
}

/**
 * Type guard for HookDefinition
 */
export function isValidHookDefinition(definition: unknown): definition is z.infer<typeof HookDefinitionSchema> {
  return HookDefinitionSchema.safeParse(definition).success;
}

/**
 * Type guard for HookInput
 */
export function isValidHookInput(input: unknown): input is z.infer<typeof HookInputSchema> {
  return HookInputSchema.safeParse(input).success;
}

/**
 * Type guard for HookOutput
 */
export function isValidHookOutput(output: unknown): output is z.infer<typeof HookOutputSchema> {
  return HookOutputSchema.safeParse(output).success;
}

/**
 * Type guard for HookConfig
 */
export function isValidHookConfig(config: unknown): config is z.infer<typeof HookConfigSchema> {
  return HookConfigSchema.safeParse(config).success;
}

/**
 * Type guard for HookExitCode
 */
export function isValidHookExitCode(code: unknown): code is z.infer<typeof HookExitCodeSchema> {
  return HookExitCodeSchema.safeParse(code).success;
}
