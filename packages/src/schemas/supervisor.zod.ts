/**
 * Supervisor Schemas - Zod validation schemas for supervisor mode
 *
 * Shared types for the task-file-based sequential supervisor.
 * Used by both core/supervisor and core/daemon/supervisor.
 *
 * @module supervisor-schemas
 */

import { z } from "zod";

// ============================================
// TASK PHASE SCHEMAS
// ============================================

/**
 * Status of a single task phase
 */
export const TaskPhaseStatusSchema = z.enum([
  "pending",
  "running",
  "complete",
  "failed",
]);

/**
 * A single task phase parsed from a task file
 */
export const TaskPhaseSchema = z.object({
  phase: z.number().int().nonnegative(),
  status: TaskPhaseStatusSchema,
  description: z.string().min(1),
});

/**
 * Result of executing a single phase
 */
export const PhaseResultSchema = z.object({
  phase: z.number().int().nonnegative(),
  status: z.string(),
  description: z.string(),
  durationMs: z.number().nonnegative(),
});

/**
 * Complete supervisor run result
 */
export const SupervisorResultSchema = z.object({
  project: z.string(),
  date: z.string(),
  totalDurationMs: z.number().nonnegative(),
  totalPhases: z.number().int().nonnegative(),
  completedPhases: z.number().int().nonnegative(),
  failedPhases: z.number().int().nonnegative(),
  phases: z.array(PhaseResultSchema),
});

// ============================================
// TYPE GUARDS
// ============================================

export function isTaskPhase(value: unknown): value is TaskPhase {
  return TaskPhaseSchema.safeParse(value).success;
}

export function isPhaseResult(value: unknown): value is PhaseResult {
  return PhaseResultSchema.safeParse(value).success;
}

export function isSupervisorResult(value: unknown): value is SupervisorResult {
  return SupervisorResultSchema.safeParse(value).success;
}

// ============================================
// QUALITY GATE SCHEMAS
// ============================================

export const QualityGateResultSchema = z.object({
  passed: z.boolean(),
  tests: z.object({
    pass: z.number().int().nonnegative(),
    fail: z.number().int().nonnegative(),
    error: z.number().int().nonnegative(),
    skipped: z.number().int().nonnegative(),
  }),
  tsErrors: z.number().int().nonnegative(),
  filesChanged: z.array(z.string()),
  duration: z.number().nonnegative(),
  failures: z.array(z.string()),
});

// ============================================
// TASK LIFECYCLE SCHEMAS
// ============================================

export const TaskLifecycleStateSchema = z.object({
  status: z.enum(["idle", "running", "auditing", "generating", "complete"]),
  currentCycle: z.number().int().nonnegative(),
  totalPhasesCompleted: z.number().int().nonnegative(),
  totalPhasesFailed: z.number().int().nonnegative(),
  lastAuditAt: z.string().nullable(),
  lastTaskGeneratedAt: z.string().nullable(),
});

// ============================================
// INFERRED TYPES
// ============================================

export type TaskPhaseStatus = z.infer<typeof TaskPhaseStatusSchema>;
export type TaskPhase = z.infer<typeof TaskPhaseSchema>;
export type PhaseResult = z.infer<typeof PhaseResultSchema>;
export type SupervisorResult = z.infer<typeof SupervisorResultSchema>;
export type QualityGateResult = z.infer<typeof QualityGateResultSchema>;
export type TaskLifecycleState = z.infer<typeof TaskLifecycleStateSchema>;
