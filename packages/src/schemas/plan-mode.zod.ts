/**
 * Plan Mode Schemas
 * Zod schemas for planning mode
 */

import { z } from "zod";

// ============================================
// PLAN MODE SCHEMAS
// ============================================

export const PlanModeSchema = z.enum(["edit", "approve"]);

// ============================================
// PLAN MODE CONFIG SCHEMAS
// ============================================

export const PlanModeConfigSchema = z.object({
  enabled: z.boolean(),
  mode: PlanModeSchema.optional(),
  autoApprove: z.boolean().optional(),
  showPlanOnExit: z.boolean().optional(),
});

// ============================================
// PLAN SCHEMAS
// ============================================

export const PlanStepSchema = z.object({
  id: z.string(),
  description: z.string(),
  status: z.enum(["pending", "in_progress", "completed", "failed"]),
  dependencies: z.array(z.string()).optional(),
  estimatedTokens: z.number().optional(),
  actualTokens: z.number().optional(),
  files: z.array(z.string()).optional(),
});

export const PlanSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  steps: z.array(PlanStepSchema),
  createdAt: z.number(),
  updatedAt: z.number(),
  status: z.enum(["draft", "active", "completed", "abandoned"]),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================
// PLAN APPROVAL SCHEMAS
// ============================================

export const PlanApprovalRequestSchema = z.object({
  planId: z.string(),
  stepId: z.string().optional(),
  action: z.enum(["approve", "reject", "modify"]),
  feedback: z.string().optional(),
});

export const PlanApprovalResultSchema = z.object({
  planId: z.string(),
  approved: z.boolean(),
  modifications: z.array(z.string()).optional(),
  nextStep: PlanStepSchema.optional(),
});

// ============================================
// PLAN GENERATION SCHEMAS
// ============================================

export const PlanGenerationOptionsSchema = z.object({
  includeEstimates: z.boolean().optional(),
  maxSteps: z.number().optional(),
  detailLevel: z.enum(["brief", "detailed", "comprehensive"]).optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type PlanMode = z.infer<typeof PlanModeSchema>;
export type PlanModeConfig = z.infer<typeof PlanModeConfigSchema>;
export type PlanStep = z.infer<typeof PlanStepSchema>;
export type Plan = z.infer<typeof PlanSchema>;
export type PlanApprovalRequest = z.infer<typeof PlanApprovalRequestSchema>;
export type PlanApprovalResult = z.infer<typeof PlanApprovalResultSchema>;
export type PlanGenerationOptions = z.infer<typeof PlanGenerationOptionsSchema>;
