/**
 * Skills Schemas
 * Zod schemas for the skills system
 */

import { z } from "zod";

// ============================================
// SKILL DEFINITION SCHEMAS
// ============================================

export const SkillDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  prompt: z.string().optional(),
  args: z.string().optional(),
  enabled: z.boolean().optional(),
});

// ============================================
// SKILL REGISTRY SCHEMAS
// ============================================

export const SkillRegistrySchema = z.record(SkillDefinitionSchema);

// ============================================
// SKILL EXECUTION SCHEMAS
// ============================================

export const SkillExecutionContextSchema = z.object({
  skillName: z.string(),
  args: z.string().optional(),
  sessionId: z.string().optional(),
  timestamp: z.number(),
});

export const SkillExecutionResultSchema = z.object({
  success: z.boolean(),
  output: z.string().optional(),
  error: z.string().optional(),
  durationMs: z.number(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type SkillDefinition = z.infer<typeof SkillDefinitionSchema>;
export type SkillRegistry = z.infer<typeof SkillRegistrySchema>;
export type SkillExecutionContext = z.infer<typeof SkillExecutionContextSchema>;
export type SkillExecutionResult = z.infer<typeof SkillExecutionResultSchema>;
