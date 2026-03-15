/**
 * Zod Validation Schemas for Agent Types
 * Derived from types/agents.ts
 * @version 2.0.0 - Complete schema coverage with validation helpers
 */

import { z } from "zod";

// ============================================
// AGENT TYPE DEFINITION SCHEMA
// ============================================

export const AgentTypeDefinitionSchema = z.object({
  id: z.string(),
  description: z.string(),
  useCase: z.string().optional(),
  tools: z.union([z.string(), z.array(z.string())]),
  subagentType: z.string().nullable(),
});

// ============================================
// SESSION TYPE SCHEMAS
// ============================================

export const SessionTypeSchema = z.enum([
  "main-session",
  "teammate",
  "subagent",
  "worker",
]);

export const SessionTypeDefinitionSchema = z.object({
  id: SessionTypeSchema,
  description: z.string(),
});

// ============================================
// SESSION MANAGEMENT SCHEMAS
// ============================================

export const SessionSourceSchema = z.enum(["cli", "api", "mcp", "teammate"]);

export const SessionIdentifierSchema = z.object({
  /** Unique session identifier (UUID) */
  sessionId: z.string().uuid(),
  /** Parent session for nested agents */
  parentSessionId: z.string().uuid().optional(),
  /** Origin of session */
  sessionSource: SessionSourceSchema,
  /** Authentication token for session */
  sessionIngressToken: z.string().optional(),
  /** Project directory path */
  sessionProjectDir: z.string(),
  /** Primary agent type */
  mainThreadAgentType: z.string(),
  /** Scheduled tasks for session */
  sessionCronTasks: z.array(z.string()).optional(),
});

export const SessionStatusSchema = z.enum([
  "active",
  "idle",
  "paused",
  "completed",
  "error",
]);

export const SessionStateSchema = z.object({
  sessionId: z.string(),
  status: SessionStatusSchema,
  startTime: z.number().int().positive(),
  endTime: z.number().int().positive().optional(),
  messageCount: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  costUSD: z.number().nonnegative(),
});

// ============================================
// AGENT CAPABILITIES SCHEMA
// ============================================

export const AgentCapabilitiesSchema = z.object({
  canSpawnAgents: z.boolean(),
  canUseBash: z.boolean(),
  canEditFiles: z.boolean(),
  canAccessNetwork: z.boolean(),
  canUseMCP: z.boolean(),
  maxConcurrency: z.number().int().positive(),
});

export const PartialAgentCapabilitiesSchema = AgentCapabilitiesSchema.partial();

// ============================================
// AGENT CONFIGURATION SCHEMA
// ============================================

export const PermissionModeSchema = z.enum(["ask", "bypass"]);

export const AgentConfigSchema = z.object({
  /** Agent type identifier */
  agentType: z.string(),
  /** Display name for the agent */
  name: z.string().optional(),
  /** Color for UI display */
  color: z.string().optional(),
  /** Custom system prompt */
  systemPrompt: z.string().optional(),
  /** Model to use */
  model: z.string().optional(),
  /** Permission mode */
  permissionMode: PermissionModeSchema.optional(),
  /** Capabilities configuration */
  capabilities: PartialAgentCapabilitiesSchema.optional(),
  /** Maximum turns before stopping */
  maxTurns: z.number().int().positive().optional(),
  /** Working directory */
  workingDirectory: z.string().optional(),
  /** Environment variables */
  env: z.record(z.string()).optional(),
});

// ============================================
// AGENT LIFECYCLE SCHEMAS
// ============================================

export const AgentStatusSchema = z.enum([
  "initializing",
  "running",
  "waiting_for_input",
  "executing_tool",
  "thinking",
  "idle",
  "completed",
  "error",
  "stopped",
]);

export const AgentLifecycleEventTypeSchema = z.enum([
  "status_change",
  "tool_use",
  "tool_result",
  "message",
  "error",
]);

export const AgentLifecycleEventSchema = z.object({
  type: AgentLifecycleEventTypeSchema,
  agentId: z.string(),
  timestamp: z.number().int().positive(),
  data: z.unknown(),
});

// ============================================
// TYPE GUARDS
// ============================================

export function isAgentTypeDefinition(
  value: unknown
): value is z.infer<typeof AgentTypeDefinitionSchema> {
  return AgentTypeDefinitionSchema.safeParse(value).success;
}

export function isSessionType(value: unknown): value is z.infer<typeof SessionTypeSchema> {
  return SessionTypeSchema.safeParse(value).success;
}

export function isSessionTypeDefinition(
  value: unknown
): value is z.infer<typeof SessionTypeDefinitionSchema> {
  return SessionTypeDefinitionSchema.safeParse(value).success;
}

export function isSessionSource(value: unknown): value is z.infer<typeof SessionSourceSchema> {
  return SessionSourceSchema.safeParse(value).success;
}

export function isSessionIdentifier(
  value: unknown
): value is z.infer<typeof SessionIdentifierSchema> {
  return SessionIdentifierSchema.safeParse(value).success;
}

export function isSessionStatus(value: unknown): value is z.infer<typeof SessionStatusSchema> {
  return SessionStatusSchema.safeParse(value).success;
}

export function isSessionState(value: unknown): value is z.infer<typeof SessionStateSchema> {
  return SessionStateSchema.safeParse(value).success;
}

export function isAgentCapabilities(
  value: unknown
): value is z.infer<typeof AgentCapabilitiesSchema> {
  return AgentCapabilitiesSchema.safeParse(value).success;
}

export function isAgentConfig(value: unknown): value is z.infer<typeof AgentConfigSchema> {
  return AgentConfigSchema.safeParse(value).success;
}

export function isAgentStatus(value: unknown): value is z.infer<typeof AgentStatusSchema> {
  return AgentStatusSchema.safeParse(value).success;
}

export function isAgentLifecycleEvent(
  value: unknown
): value is z.infer<typeof AgentLifecycleEventSchema> {
  return AgentLifecycleEventSchema.safeParse(value).success;
}

export function isPermissionMode(value: unknown): value is z.infer<typeof PermissionModeSchema> {
  return PermissionModeSchema.safeParse(value).success;
}

// Legacy type guards for backwards compatibility
export function isValidSessionType(type: unknown): type is z.infer<typeof SessionTypeSchema> {
  return SessionTypeSchema.safeParse(type).success;
}

export function isValidSessionSource(source: unknown): source is z.infer<typeof SessionSourceSchema> {
  return SessionSourceSchema.safeParse(source).success;
}

export function isValidAgentConfig(config: unknown): config is z.infer<typeof AgentConfigSchema> {
  return AgentConfigSchema.safeParse(config).success;
}

export function isValidAgentCapabilities(caps: unknown): caps is z.infer<typeof AgentCapabilitiesSchema> {
  return AgentCapabilitiesSchema.safeParse(caps).success;
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validates the built-in agent types registry at runtime
 */
export function validateAgentTypesRegistry(
  registry: unknown
): z.SafeParseReturnType<unknown, z.infer<typeof AgentTypeDefinitionSchema>[]> {
  return z.array(AgentTypeDefinitionSchema).safeParse(registry);
}

/**
 * Validates the session types registry at runtime
 */
export function validateSessionTypesRegistry(
  registry: unknown
): z.SafeParseReturnType<unknown, z.infer<typeof SessionTypeDefinitionSchema>[]> {
  return z.array(SessionTypeDefinitionSchema).safeParse(registry);
}

// ============================================
// AGENT UTILITY FUNCTIONS
// ============================================

/**
 * Check if agent type can spawn subagents
 */
export function canSpawnSubagents(agentType: string, registry: z.infer<typeof AgentTypeDefinitionSchema>[]): boolean {
  const agent = registry.find(a => a.id === agentType);
  return agent?.subagentType !== null;
}

/**
 * Get tools for an agent type
 */
export function getToolsForAgentType(
  agentType: string,
  registry: z.infer<typeof AgentTypeDefinitionSchema>[]
): string[] {
  const agent = registry.find(a => a.id === agentType);
  if (!agent) return [];
  if (agent.tools === "all") return ["*"];
  if (typeof agent.tools === "string") {
    return agent.tools.split(",").map(t => t.trim());
  }
  return agent.tools;
}

/**
 * Check if session is in terminal state
 */
export function isTerminalSessionStatus(status: z.infer<typeof SessionStatusSchema>): boolean {
  return status === "completed" || status === "error";
}

/**
 * Check if agent is in active state
 */
export function isActiveAgentStatus(status: z.infer<typeof AgentStatusSchema>): boolean {
  return ["running", "thinking", "executing_tool", "waiting_for_input"].includes(status);
}
