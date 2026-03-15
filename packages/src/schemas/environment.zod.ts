/**
 * Environment Variables Schemas
 * Zod schemas for environment variable configuration
 */

import { z } from "zod";

// ============================================
// CORE ENVIRONMENT VARIABLES SCHEMAS
// ============================================

export const CoreEnvironmentVariablesSchema = z.object({
  ANTHROPIC_API_KEY: z.string().optional(),
  CLAUDE_CONFIG_DIR: z.string().optional(),
  CLAUDE_ENV_FILE: z.string().optional(),
});

// ============================================
// DEBUGGING ENVIRONMENT VARIABLES SCHEMAS
// ============================================

export const DebuggingEnvironmentVariablesSchema = z.object({
  CLAUDE_CODE_DEBUG_LOGS_DIR: z.string().optional(),
  CLAUDE_CODE_DEBUG_LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
  CLAUDE_CODE_PROFILE_STARTUP: z.enum(["1", "0"]).optional(),
  CLAUDE_CODE_DIAGNOSTICS_FILE: z.string().optional(),
  CLAUDE_CODE_SLOW_OPERATION_THRESHOLD_MS: z.number().optional(),
});

// ============================================
// BACKEND ENVIRONMENT VARIABLES SCHEMAS
// ============================================

export const BackendEnvironmentVariablesSchema = z.object({
  CLAUDE_CODE_USE_BEDROCK: z.string().optional(),
  CLAUDE_CODE_USE_VERTEX: z.string().optional(),
  CLAUDE_CODE_USE_FOUNDRY: z.string().optional(),
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: z.string().optional(),
});

// ============================================
// CONTEXT ENVIRONMENT VARIABLES SCHEMAS
// ============================================

export const ContextEnvironmentVariablesSchema = z.object({
  CLAUDE_CODE_DISABLE_1M_CONTEXT: z.boolean().optional(),
  CLAUDE_CODE_DISABLE_AUTO_MEMORY: z.string().optional(),
  CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS: z.number().optional(),
});

// ============================================
// PLUGIN ENVIRONMENT VARIABLES SCHEMAS
// ============================================

export const PluginEnvironmentVariablesSchema = z.object({
  CLAUDE_CODE_USE_COWORK_PLUGINS: z.boolean().optional(),
  CLAUDE_CODE_PLUGIN_CACHE_DIR: z.string().optional(),
  CLAUDE_CODE_PLUGIN_SEED_DIR: z.string().optional(),
});

// ============================================
// REMOTE ENVIRONMENT VARIABLES SCHEMAS
// ============================================

export const RemoteEnvironmentVariablesSchema = z.object({
  CLAUDE_CODE_REMOTE: z.string().optional(),
  CLAUDE_CODE_REMOTE_MEMORY_DIR: z.string().optional(),
  CLAUDE_CODE_HOST_PLATFORM: z.string().optional(),
});

// ============================================
// GIT ENVIRONMENT VARIABLES SCHEMAS
// ============================================

export const GitEnvironmentVariablesSchema = z.object({
  CLAUDE_CODE_GIT_BASH_PATH: z.string().optional(),
  CLAUDE_CODE_GLOB_TIMEOUT_SECONDS: z.number().optional(),
  CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR: z.string().optional(),
});

// ============================================
// OAUTH ENVIRONMENT VARIABLES SCHEMAS
// ============================================

export const OAuthEnvironmentVariablesSchema = z.object({
  CLAUDE_CODE_CUSTOM_OAUTH_URL: z.string().optional(),
  CLAUDE_CODE_OAUTH_CLIENT_ID: z.string().optional(),
});

// ============================================
// AGENT SDK ENVIRONMENT VARIABLES SCHEMAS
// ============================================

export const AgentSdkEnvironmentVariablesSchema = z.object({
  CLAUDE_AGENT_SDK_VERSION: z.string().optional(),
  CLAUDE_AGENT_SDK_CLIENT_APP: z.string().optional(),
  CLAUDE_CODE_ENTRYPOINT: z.string().optional(),
});

// ============================================
// TELEMETRY ENVIRONMENT VARIABLES SCHEMAS
// ============================================

export const TelemetryEnvironmentVariablesSchema = z.object({
  DISABLE_TELEMETRY: z.boolean().optional(),
});

// ============================================
// MEMORY/TEAMMATE ENVIRONMENT VARIABLES SCHEMAS
// ============================================

export const MemoryEnvironmentVariablesSchema = z.object({
  CLAUDE_CODE_TEAMMATE_COMMAND: z.string().optional(),
});

// ============================================
// COMBINED ENVIRONMENT TYPE SCHEMAS
// ============================================

export const ClaudeCodeEnvironmentSchema = CoreEnvironmentVariablesSchema
  .merge(DebuggingEnvironmentVariablesSchema)
  .merge(BackendEnvironmentVariablesSchema)
  .merge(ContextEnvironmentVariablesSchema)
  .merge(PluginEnvironmentVariablesSchema)
  .merge(RemoteEnvironmentVariablesSchema)
  .merge(GitEnvironmentVariablesSchema)
  .merge(OAuthEnvironmentVariablesSchema)
  .merge(AgentSdkEnvironmentVariablesSchema)
  .merge(TelemetryEnvironmentVariablesSchema)
  .merge(MemoryEnvironmentVariablesSchema);

// ============================================
// ENVIRONMENT VARIABLE METADATA SCHEMAS
// ============================================

export const EnvironmentVariableMetadataSchema = z.object({
  name: z.string(),
  description: z.string(),
  defaultValue: z.union([z.string(), z.boolean(), z.number()]).optional(),
  sensitive: z.boolean().optional(),
  internal: z.boolean().optional(),
  category: z.string(),
  values: z.array(z.string()).optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type CoreEnvironmentVariables = z.infer<typeof CoreEnvironmentVariablesSchema>;
export type DebuggingEnvironmentVariables = z.infer<typeof DebuggingEnvironmentVariablesSchema>;
export type BackendEnvironmentVariables = z.infer<typeof BackendEnvironmentVariablesSchema>;
export type ContextEnvironmentVariables = z.infer<typeof ContextEnvironmentVariablesSchema>;
export type PluginEnvironmentVariables = z.infer<typeof PluginEnvironmentVariablesSchema>;
export type RemoteEnvironmentVariables = z.infer<typeof RemoteEnvironmentVariablesSchema>;
export type GitEnvironmentVariables = z.infer<typeof GitEnvironmentVariablesSchema>;
export type OAuthEnvironmentVariables = z.infer<typeof OAuthEnvironmentVariablesSchema>;
export type AgentSdkEnvironmentVariables = z.infer<typeof AgentSdkEnvironmentVariablesSchema>;
export type TelemetryEnvironmentVariables = z.infer<typeof TelemetryEnvironmentVariablesSchema>;
export type MemoryEnvironmentVariables = z.infer<typeof MemoryEnvironmentVariablesSchema>;
export type ClaudeCodeEnvironment = z.infer<typeof ClaudeCodeEnvironmentSchema>;
export type EnvironmentVariableMetadata = z.infer<typeof EnvironmentVariableMetadataSchema>;
