/**
 * CLAUDE.md Schemas
 * Zod schemas for CLAUDE.md configuration and system signatures
 */

import { z } from "zod";

// ============================================
// ENVIRONMENT INFO SCHEMA
// ============================================

export const EnvironmentInfoSchema = z.object({
  platform: z.string(),
  nodeVersion: z.string(),
  shell: z.string(),
  homeDir: z.string(),
  cwd: z.string().optional(),
  isInteractive: z.boolean().optional(),
});

// ============================================
// GIT STATUS INFO SCHEMA
// ============================================

export const GitStatusInfoSchema = z.object({
  branch: z.string(),
  hasChanges: z.boolean(),
  staged: z.number().int().nonnegative(),
  unstaged: z.number().int().nonnegative(),
  untracked: z.number().int().nonnegative(),
  ahead: z.number().int().nonnegative().optional(),
  behind: z.number().int().nonnegative().optional(),
});

// ============================================
// TOOLS INFO SCHEMA
// ============================================

export const ToolsInfoSchema = z.object({
  available: z.array(z.string()),
  mcpServers: z.array(z.string()),
});

// ============================================
// SYSTEM SIGNATURE SCHEMA
// ============================================

export const SystemSignatureSchema = z.object({
  version: z.string(),
  projectId: z.string(),
  sessionId: z.string(),
  timestamp: z.number().positive(),
  environment: EnvironmentInfoSchema,
  gitStatus: GitStatusInfoSchema,
  tools: ToolsInfoSchema,
});

// ============================================
// CLAUDE.MD CONFIG SCHEMA
// ============================================

export const ClaudeMdConfigSchema = z.object({
  globalPath: z.string(),
  projectPath: z.string(),
  rootPath: z.string(),
});

// ============================================
// CLAUDE.MD RESULT SCHEMA
// ============================================

export const ClaudeMdResultSchema = z.object({
  global: z.string().nullable(),
  project: z.string().nullable(),
  merged: z.string(),
  sources: z.array(z.string()),
});

// ============================================
// DEFAULT CONFIG
// ============================================

export const DEFAULT_CLAUDE_MD_CONFIG: ClaudeMdConfig = {
  globalPath: `${process.env.HOME}/.claude/CLAUDE.md`,
  projectPath: ".claude/CLAUDE.md",
  rootPath: "CLAUDE.md",
};

// ============================================
// TYPE EXPORTS
// ============================================

export type EnvironmentInfo = z.infer<typeof EnvironmentInfoSchema>;
export type GitStatusInfo = z.infer<typeof GitStatusInfoSchema>;
export type ToolsInfo = z.infer<typeof ToolsInfoSchema>;
export type SystemSignature = z.infer<typeof SystemSignatureSchema>;
export type ClaudeMdConfig = z.infer<typeof ClaudeMdConfigSchema>;
export type ClaudeMdResult = z.infer<typeof ClaudeMdResultSchema>;
