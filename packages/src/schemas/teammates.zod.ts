/**
 * Teammates Schemas
 * Zod schemas for multi-agent teammate system
 *
 * Parity with Claude Code agents:
 * - Templates: Load MCP servers + CLAUDE.md + permissions from templates
 * - Tool restrictions: allowedTools/disallowedTools per teammate
 * - Worktree isolation: Optional git worktree for safe parallel work
 */

import { z } from "zod";

// ============================================
// TEAMMATE STATUS SCHEMAS
// ============================================

export const TeammateStatusSchema = z.enum([
  "pending",
  "in_progress",
  "completed",
  "failed",
  "idle",
]);

// ============================================
// AGENT TYPES (Claude Code parity)
// ============================================

/**
 * Agent types matching Claude Code's built-in agents:
 * - general-purpose: Full tool access
 * - Explore: Read-only, Glob/Grep/Read/Bash only
 * - Plan: Planning agent, Glob/Grep/Read/LSP
 * - claude-code-guide: Help with Claude Code features
 */
export const AgentTypeSchema = z.enum([
  "general-purpose",
  "Explore",
  "Plan",
  "claude-code-guide",
]);

export type AgentType = z.infer<typeof AgentTypeSchema>;

// ============================================
// TOOL RESTRICTIONS SCHEMA
// ============================================

/**
 * Tool restrictions per teammate
 * If allowedTools is set, only those tools are permitted
 * If disallowedTools is set, those tools are blocked
 */
export const ToolRestrictionsSchema = z.object({
  allowedTools: z.array(z.string()).optional(),
  disallowedTools: z.array(z.string()).optional(),
});

export type ToolRestrictions = z.infer<typeof ToolRestrictionsSchema>;

// ============================================
// WORKTREE ISOLATION SCHEMA
// ============================================

/**
 * Git worktree isolation for safe parallel agent work
 */
export const WorktreeConfigSchema = z.object({
  enabled: z.boolean().default(false),
  branch: z.string().optional(),
  path: z.string().optional(),
  createBranch: z.boolean().default(true),
});

export type WorktreeConfig = z.infer<typeof WorktreeConfigSchema>;

// ============================================
// TEAMMATE SCHEMAS
// ============================================

export const TeammateSchema = z.object({
  // Primary ID field (used interchangeably with teammateId for compatibility)
  id: z.string().optional(),
  teammateId: z.string().optional(), // Legacy field from api.zod.ts

  name: z.string(),
  role: z.string(),
  description: z.string().optional(),
  teamName: z.string().optional(), // Team this teammate belongs to

  // Status tracking
  status: TeammateStatusSchema.optional(),
  tasks: z.array(z.string()).optional(),
  subagentType: z.string().optional(),
  prompt: z.string().optional(),
  color: z.string().optional(),
  planModeRequired: z.boolean().optional(), // Legacy field from api.zod.ts
  paneId: z.string().optional(), // For tmux pane tracking

  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),

  // Template support (Claude Code parity)
  template: z.string().optional(), // Reference to TeammateTemplate name

  // Tool restrictions (Claude Code parity)
  toolRestrictions: ToolRestrictionsSchema.optional(),
  allowedTools: z.array(z.string()).optional(), // Shorthand for toolRestrictions.allowedTools
  disallowedTools: z.array(z.string()).optional(), // Shorthand for toolRestrictions.disallowedTools

  // Agent type (Claude Code parity)
  agentType: AgentTypeSchema.optional(),

  // Worktree isolation (Claude Code parity)
  worktree: WorktreeConfigSchema.optional(),

  // MCP servers from template (populated at spawn)
  mcpServers: z.record(z.string(), z.any()).optional(),

  // CLAUDE.md from template (populated at spawn)
  claudeMd: z.string().optional(),
});

// ============================================
// TEAM SCHEMAS
// ============================================

export const TeamSchema = z.object({
  name: z.string(),
  description: z.string(),
  teammates: z.array(TeammateSchema), // Changed from 'members' to match codebase
  taskListId: z.string().optional(), // Task list ID for coordination
  status: z.enum(["active", "paused", "completed", "archived"]).optional(),
  project: z.object({
    repository: z.string().optional(),
    goals: z.array(z.string()).optional(),
  }).optional(),
  coordination: z.object({
    dependencyOrder: z.array(z.string()).optional(), // Flat array of teammate IDs
    communicationProtocol: z.enum(["sync", "async", "broadcast"]).optional(),
    taskAssignmentStrategy: z.enum(["manual", "auto", "priority"]).optional(),
  }).optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});

// ============================================
// TEAMMATE MESSAGE SCHEMAS
// ============================================

export const TeammateMessageSchema = z.object({
  id: z.string().optional(), // Optional - generated when stored
  from: z.string(),
  to: z.union([z.string(), z.array(z.string())]).optional(), // Optional for broadcasts
  type: z.enum(["task", "status", "query", "response", "notification", "broadcast", "direct"]),
  content: z.string(),
  timestamp: z.number(),
  priority: z.enum(["low", "normal", "high"]).optional(),
});

// ============================================
// COORDINATION SETTINGS SCHEMAS
// ============================================

export const CoordinationSettingsSchema = z.object({
  maxParallelTasks: z.number().optional(),
  taskTimeout: z.number().optional(),
  retryAttempts: z.number().optional(),
  communicationDelay: z.number().optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type TeammateStatus = z.infer<typeof TeammateStatusSchema>;
export type Teammate = z.infer<typeof TeammateSchema>;
export type Team = z.infer<typeof TeamSchema>;
export type TeammateMessage = z.infer<typeof TeammateMessageSchema>;
export type CoordinationSettings = z.infer<typeof CoordinationSettingsSchema>;

// ============================================
// TYPE GUARDS
// ============================================

export function isTeammateStatus(value: unknown): value is TeammateStatus {
  return TeammateStatusSchema.safeParse(value).success;
}

export function isTeammate(value: unknown): value is Teammate {
  return TeammateSchema.safeParse(value).success;
}

export function isTeam(value: unknown): value is Team {
  return TeamSchema.safeParse(value).success;
}

export function isTeammateMessage(value: unknown): value is TeammateMessage {
  return TeammateMessageSchema.safeParse(value).success;
}

export function isCoordinationSettings(value: unknown): value is CoordinationSettings {
  return CoordinationSettingsSchema.safeParse(value).success;
}
