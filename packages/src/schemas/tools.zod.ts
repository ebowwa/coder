/**
 * Zod Validation Schemas for Tool Definitions
 * Built-in tools available in Claude Code
 */

import { z } from "zod";

// ============================================
// TOOL CATEGORIES
// ============================================

/**
 * Categories of built-in tools
 */
export const ToolCategorySchema = z.enum([
  "file",
  "execution",
  "search",
  "workflow",
  "code-intelligence",
  "interaction",
  "planning",
  "git",
]);

// ============================================
// TOOL PARAMETERS
// ============================================

/**
 * Parameter type schema
 */
export const ToolParameterTypeSchema = z.enum([
  "string",
  "number",
  "boolean",
  "array",
  "object",
]);

/**
 * Tool parameter definition schema
 */
export const ToolParameterSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  required: z.boolean(),
  type: ToolParameterTypeSchema.optional(),
  default: z.unknown().optional(),
  enum: z.array(z.string()).optional(),
});

// ============================================
// TOOL DEFINITIONS
// ============================================

/**
 * Built-in tool definition schema
 */
export const BuiltInToolSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  category: ToolCategorySchema,
  parameters: z.array(ToolParameterSchema).optional(),
  operations: z.array(z.string()).optional(),
});

/**
 * Array of built-in tools schema
 */
export const BuiltInToolsArraySchema = z.array(BuiltInToolSchema);

// ============================================
// TOOL EXECUTION CONFIG
// ============================================

/**
 * Tool execution configuration schema
 */
export const ToolExecutionConfigSchema = z.object({
  timeout_ms: z.number().positive(),
  default_timeout: z.number().positive(),
  max_timeout: z.number().positive(),
  chrome_bridge: z.boolean(),
  tool_call_timeout_ms: z.number().positive(),
  max_retries: z.number().int().nonnegative(),
});

/**
 * Default tool execution configuration
 */
export const DEFAULT_TOOL_EXECUTION_SCHEMA = ToolExecutionConfigSchema.parse({
  timeout_ms: 120000,
  default_timeout: 120000,
  max_timeout: 600000,
  chrome_bridge: true,
  tool_call_timeout_ms: 120000,
  max_retries: 5,
});

// ============================================
// TOOL DEFINITION & RESULT
// ============================================

/**
 * Permission mode schema - imported from permissions.zod.js to avoid duplication
 */
import { PermissionModeSchema } from "./permissions.zod.js";

/**
 * Tool execution context schema
 * Note: AbortSignal and functions cannot be fully validated by Zod
 */
export const ToolContextSchema = z.object({
  workingDirectory: z.string(),
  permissionMode: PermissionModeSchema,
  abortSignal: z.custom<AbortSignal>().optional(),
  sessionId: z.string().optional(),
  model: z.string().optional(),
  mcpClient: z.unknown().optional(),
});

/**
 * Tool input schema definition
 */
export const ToolInputSchemaDefinitionSchema = z.object({
  type: z.literal("object"),
  properties: z.record(z.string(), z.unknown()),
  required: z.array(z.string()).optional(),
});

/**
 * Tool definition for API submission schema
 */
// Handler type for tools - using z.function() for proper typing
// Note: args() takes individual arguments, not an array
export const ToolHandlerSchema = z.function()
  .args(z.record(z.string(), z.unknown()), z.any())
  .returns(z.promise(z.unknown()));

/**
 * Tool annotations — mirrors MCP protocol annotations + our capability tags.
 * MCP servers declare these in their tools/list response.
 * Built-in and plugin tools declare them directly on the ToolDefinition.
 */
export const ToolAnnotationsSchema = z.object({
  /** Capability tags — what this tool does (e.g. "browser", "vision", "quality", "search") */
  capabilities: z.array(z.string()).optional(),
  /** MCP readOnlyHint — tool does not modify state */
  readOnlyHint: z.boolean().optional(),
  /** MCP destructiveHint — tool may irreversibly modify state */
  destructiveHint: z.boolean().optional(),
  /** MCP openWorldHint — tool may contact external services */
  openWorldHint: z.boolean().optional(),
}).optional();

export const ToolDefinitionSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  input_schema: ToolInputSchemaDefinitionSchema,
  // Handler is a function - typed as any but cannot be fully validated by Zod
  handler: z.any().optional(),
  /** True when this tool was loaded from an external MCP server */
  isMcp: z.boolean().optional(),
  /** Server name + original tool name for MCP tools */
  mcpInfo: z.object({ serverName: z.string(), toolName: z.string() }).optional(),
  /** Declared capability metadata — used for routing, not inferred from name */
  annotations: ToolAnnotationsSchema,
});

/**
 * Output mode schema
 */
export const OutputModeSchema = z.enum(["content", "files_with_matches", "count"]);

/**
 * Tool result schema
 */
export const ToolResultSchema = z.object({
  tool_use_id: z.string().optional(),
  content: z.string(),
  is_error: z.boolean().optional(),
  output_mode: OutputModeSchema.optional(),
});

// ============================================
// BACKGROUND TASK TOOLS
// ============================================

/**
 * Tools that support background execution
 */
export const BACKGROUND_TASK_TOOLS_SCHEMA = ["Bash", "Agent"] as const;

/**
 * Check if tool supports background execution
 */
export function supportsBackgroundExecution(toolName: string): boolean {
  return BACKGROUND_TASK_TOOLS_SCHEMA.includes(toolName as "Bash" | "Agent");
}

// ============================================
// TYPE GUARDS
// ============================================

/**
 * Type guard for ToolCategory
 */
export function isValidToolCategory(category: unknown): category is z.infer<typeof ToolCategorySchema> {
  return ToolCategorySchema.safeParse(category).success;
}

/**
 * Type guard for ToolParameter
 */
export function isValidToolParameter(param: unknown): param is z.infer<typeof ToolParameterSchema> {
  return ToolParameterSchema.safeParse(param).success;
}

/**
 * Type guard for BuiltInTool
 */
export function isValidBuiltInTool(tool: unknown): tool is z.infer<typeof BuiltInToolSchema> {
  return BuiltInToolSchema.safeParse(tool).success;
}

/**
 * Type guard for ToolExecutionConfig
 */
export function isValidToolExecutionConfig(config: unknown): config is z.infer<typeof ToolExecutionConfigSchema> {
  return ToolExecutionConfigSchema.safeParse(config).success;
}

/**
 * Type guard for ToolDefinition
 */
export function isValidToolDefinition(definition: unknown): definition is z.infer<typeof ToolDefinitionSchema> {
  return ToolDefinitionSchema.safeParse(definition).success;
}

/**
 * Type guard for ToolResult
 */
export function isValidToolResult(result: unknown): result is z.infer<typeof ToolResultSchema> {
  return ToolResultSchema.safeParse(result).success;
}

/**
 * Type guard for OutputMode
 */
export function isValidOutputMode(mode: unknown): mode is z.infer<typeof OutputModeSchema> {
  return OutputModeSchema.safeParse(mode).success;
}

/**
 * Type guard for ToolContext
 */
export function isValidToolContext(context: unknown): context is z.infer<typeof ToolContextSchema> {
  return ToolContextSchema.safeParse(context).success;
}

/**
 * Check if a tool name is a built-in tool
 * This requires the TOOL_MAP to be populated, so we just validate the name format
 */
export function isBuiltInToolName(name: string): boolean {
  // Built-in tools typically start with uppercase letter
  return /^[A-Z][a-zA-Z]+$/.test(name);
}
