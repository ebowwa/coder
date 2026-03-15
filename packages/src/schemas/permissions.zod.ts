/**
 * Zod Validation Schemas for Permission Types
 * Extracted from Claude Code binary internals
 */

import { z } from "zod";

// ============================================
// PERMISSION MODES
// ============================================

export const PermissionModeSchema = z.enum([
  "default",
  "ask",
  "acceptEdits",
  "bypassPermissions",
  "bypass",
  "dontAsk",
  "interactive",
  "plan",
  "auto",
]);

export const PermissionModeDefinitionSchema = z.object({
  id: PermissionModeSchema,
  description: z.string(),
});

// ============================================
// PERMISSION REQUEST/RESPONSE
// ============================================

// Permission decision for interactive prompts (from permissions.ts)
export const PermissionPromptDecisionSchema = z.enum([
  "allow",
  "deny",
  "allowAlways",
  "denyAlways",
]);

// Permission decision for API responses
export const PermissionDecisionSchema = z.enum(["allow", "deny", "ask"]);

// Risk levels (extended from permissions.ts with "critical")
export const RiskLevelSchema = z.enum(["low", "medium", "high", "critical"]);

// Permission request from permissions.ts
export const PermissionRequestSchema = z.object({
  toolName: z.string(),
  toolInput: z.record(z.unknown()),
  riskLevel: RiskLevelSchema,
  description: z.string(),
  file: z.string().optional(),
  command: z.string().optional(),
});

// Permission request for API (with additional fields)
export const APIPermissionRequestSchema = z.object({
  requestId: z.string(),
  toolName: z.string(),
  toolInput: z.record(z.string(), z.unknown()).optional(),
  description: z.string().optional(),
  riskLevel: z.enum(["low", "medium", "high"]),
  sessionId: z.string().optional(),
  timestamp: z.number(),
});

// Permission result from permissions.ts
export const PermissionResultSchema = z.object({
  decision: PermissionPromptDecisionSchema,
  reason: z.string().optional(),
});

export const PermissionResponseSchema = z.object({
  requestId: z.string(),
  decision: PermissionDecisionSchema,
  reason: z.string().optional(),
  modifiedInput: z.record(z.string(), z.unknown()).optional(),
  remember: z.boolean().optional(),
  rememberDuration: z.number().optional(),
});

// API permission result (different structure)
export const APIPermissionResultSchema = z.object({
  allowed: z.boolean(),
  reason: z.string().optional(),
  modifiedInput: z.record(z.string(), z.unknown()).optional(),
  fromCache: z.boolean().optional(),
});

// ============================================
// PERMISSION CACHE
// ============================================

// Cache entry from permissions.ts
export const PermissionCacheEntrySchema = z.object({
  decision: PermissionPromptDecisionSchema,
  timestamp: z.number(),
});

// Cache type (record-based from permissions.ts)
export const PermissionCacheSchema = z.record(PermissionCacheEntrySchema);

// API cache entry (different structure)
export const APIPermissionCacheEntrySchema = z.object({
  key: z.string(),
  decision: PermissionDecisionSchema,
  createdAt: z.number(),
  expiresAt: z.number(),
  sessionId: z.string(),
});

// API cache type (map-based)
export const APIPermissionCacheSchema = z.object({
  entries: z.map(z.string(), APIPermissionCacheEntrySchema),
  maxSize: z.number(),
  defaultTTL: z.number(),
});

// ============================================
// TOOL FILTERING
// ============================================

export const PermissionToolChoiceSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("auto") }),
  z.object({ type: z.literal("any") }),
  z.object({ type: z.literal("none") }),
  z.object({ type: z.literal("tool"), name: z.string() }),
]);

export const ToolFilteringConfigSchema = z.object({
  allowedTools: z.array(z.string()).optional(),
  disallowedTools: z.array(z.string()).optional(),
  toolChoice: PermissionToolChoiceSchema.optional(),
});

// ============================================
// RISK ASSESSMENT
// ============================================

export const RiskAssessmentSchema = z.object({
  level: RiskLevelSchema,
  factors: z.array(z.string()),
  recommendation: z.enum(["allow", "ask", "deny"]),
});

// ============================================
// TYPE GUARDS
// ============================================

export function isValidPermissionMode(mode: unknown): mode is z.infer<typeof PermissionModeSchema> {
  return PermissionModeSchema.safeParse(mode).success;
}

export function isValidPermissionRequest(request: unknown): request is z.infer<typeof PermissionRequestSchema> {
  return PermissionRequestSchema.safeParse(request).success;
}

export function isValidPermissionResponse(response: unknown): response is z.infer<typeof PermissionResponseSchema> {
  return PermissionResponseSchema.safeParse(response).success;
}

export function isValidRiskLevel(level: unknown): level is z.infer<typeof RiskLevelSchema> {
  return RiskLevelSchema.safeParse(level).success;
}

// ============================================
// TYPE EXPORTS
// ============================================

export type PermissionMode = z.infer<typeof PermissionModeSchema>;
export type PermissionModeDefinition = z.infer<typeof PermissionModeDefinitionSchema>;
export type PermissionPromptDecision = z.infer<typeof PermissionPromptDecisionSchema>;
export type PermissionDecision = z.infer<typeof PermissionDecisionSchema>;
export type RiskLevel = z.infer<typeof RiskLevelSchema>;
export type PermissionRequest = z.infer<typeof PermissionRequestSchema>;
export type APIPermissionRequest = z.infer<typeof APIPermissionRequestSchema>;
export type PermissionResult = z.infer<typeof PermissionResultSchema>;
export type PermissionResponse = z.infer<typeof PermissionResponseSchema>;
export type APIPermissionResult = z.infer<typeof APIPermissionResultSchema>;
export type PermissionCacheEntry = z.infer<typeof PermissionCacheEntrySchema>;
export type PermissionCache = z.infer<typeof PermissionCacheSchema>;
export type APIPermissionCacheEntry = z.infer<typeof APIPermissionCacheEntrySchema>;
export type APIPermissionCache = z.infer<typeof APIPermissionCacheSchema>;
export type PermissionToolChoice = z.infer<typeof PermissionToolChoiceSchema>;
export type ToolFilteringConfig = z.infer<typeof ToolFilteringConfigSchema>;
export type RiskAssessment = z.infer<typeof RiskAssessmentSchema>;

// Callback type (not serializable to Zod)
export type PermissionPromptCallback = (
  request: PermissionRequest
) => Promise<PermissionResult>;
