/**
 * Cron/Scheduling System Types
 *
 * Session-only job scheduling with standard 5-field cron syntax.
 * Jobs live in memory only and auto-expire after 3 days.
 */

import { z } from "zod";

// ============================================
// CRON EXPRESSION SCHEMA
// ============================================

/**
 * Standard 5-field cron expression (local timezone)
 * Format: minute hour day-of-month month day-of-week
 *
 * Examples:
 * - "5,10,15,20,25,30,35,40,45,50,55 * * * *" - Every 5 minutes
 * - "0 9 * * *" - Every day at 9am local
 * - "30 14 16 3 *" - March 16 at 2:30pm (one-shot)
 * - "0 * * * *" - Hourly at :00
 * - "0 9 * * 1-5" - Weekdays at 9am
 */
export const CronExpressionSchema = z.string().regex(
  /^(\*|([0-9]|[1-5][0-9])(-([0-9]|[1-5][0-9]))?(,([0-9]|[1-5][0-9])(-([0-9]|[1-5][0-9]))?)*)\s+(\*|([0-9]|1[0-9]|2[0-3])(-([0-9]|1[0-9]|2[0-3]))?(,([0-9]|1[0-9]|2[0-3])(-([0-9]|1[0-9]|2[0-3]))?)*)\s+(\*|([1-9]|[12][0-9]|3[01])(-([1-9]|[12][0-9]|3[01]))?(,([1-9]|[12][0-9]|3[01])(-([1-9]|[12][0-9]|3[01]))?)*)\s+(\*|([1-9]|1[0-2])(-([1-9]|1[0-2]))?(,([1-9]|1[0-2])(-([1-9]|1[0-2]))?)*)\s+(\*|([0-7])(-([0-7]))?(,([0-7])(-([0-7]))?)*)$/,
  "Invalid cron expression. Use standard 5-field format: M H DoM Mon DoW"
);
export type CronExpression = z.infer<typeof CronExpressionSchema>;

// ============================================
// JOB DEFINITION SCHEMA
// ============================================

/**
 * Scheduled job definition
 */
export const CronJobSchema = z.object({
  /** Unique job identifier */
  id: z.string().uuid(),

  /** Human-readable description */
  description: z.string().optional(),

  /** Cron expression (5-field, local timezone) */
  cron: CronExpressionSchema,

  /** Prompt to enqueue when job fires */
  prompt: z.string().min(1),

  /** Whether this job recurs (true) or fires once (false) */
  recurring: z.boolean().default(true),

  /** Creation timestamp */
  createdAt: z.number().int().positive(),

  /** Next fire time (Unix timestamp in ms) */
  nextFire: z.number().int().positive(),

  /** Last fire time (Unix timestamp in ms), if any */
  lastFire: z.number().int().positive().optional(),

  /** Fire count */
  fireCount: z.number().int().nonnegative().default(0),

  /** Job enabled status */
  enabled: z.boolean().default(true),

  /** Auto-expiry time (3 days default) */
  expiresAt: z.number().int().positive(),
});
export type CronJob = z.infer<typeof CronJobSchema>;

// ============================================
// CREATE JOB INPUT SCHEMA
// ============================================

/**
 * Input for creating a new scheduled job
 */
export const CreateCronJobInputSchema = z.object({
  /** Cron expression (5-field, local timezone) */
  cron: CronExpressionSchema,

  /** Prompt to enqueue when job fires */
  prompt: z.string().min(1),

  /** Whether this job recurs (default: true) */
  recurring: z.boolean().default(true),

  /** Optional description */
  description: z.string().optional(),
});
export type CreateCronJobInput = z.infer<typeof CreateCronJobInputSchema>;

// ============================================
// JOB RESULT SCHEMAS
// ============================================

/**
 * Result of creating a job
 */
export const CreateCronJobResultSchema = z.object({
  success: z.literal(true),
  jobId: z.string().uuid(),
  message: z.string(),
  nextFire: z.number().int().positive(),
});
export type CreateCronJobResult = z.infer<typeof CreateCronJobResultSchema>;

/**
 * Result of listing jobs
 */
export const ListCronJobsResultSchema = z.object({
  jobs: z.array(CronJobSchema),
  count: z.number().int().nonnegative(),
});
export type ListCronJobsResult = z.infer<typeof ListCronJobsResultSchema>;

/**
 * Result of deleting a job
 */
export const DeleteCronJobResultSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export type DeleteCronJobResult = z.infer<typeof DeleteCronJobResultSchema>;

// ============================================
// CONFIGURATION
// ============================================

/**
 * Default expiry duration (3 days in milliseconds)
 */
export const DEFAULT_JOB_EXPIRY_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Default jitter percentage (10% of interval, max 15 minutes)
 */
export const DEFAULT_JITTER_PERCENT = 0.10;
export const MAX_JITTER_MS = 15 * 60 * 1000;

/**
 * Cron manager configuration
 */
export const CronManagerConfigSchema = z.object({
  /** Auto-expiry duration in ms (default: 3 days) */
  defaultExpiryMs: z.number().int().positive().default(DEFAULT_JOB_EXPIRY_MS),

  /** Enable jitter to avoid thundering herd (default: true) */
  enableJitter: z.boolean().default(true),

  /** Maximum jitter in ms (default: 15 minutes) */
  maxJitterMs: z.number().int().positive().default(MAX_JITTER_MS),

  /** Check interval in ms (default: 1 second) */
  checkIntervalMs: z.number().int().positive().default(1000),
});
export type CronManagerConfig = z.infer<typeof CronManagerConfigSchema>;

// ============================================
// TYPE GUARDS
// ============================================

export function isCronJob(value: unknown): value is CronJob {
  return CronJobSchema.safeParse(value).success;
}

export function isCreateCronJobInput(value: unknown): value is CreateCronJobInput {
  return CreateCronJobInputSchema.safeParse(value).success;
}

export function isValidCronExpression(expr: string): boolean {
  return CronExpressionSchema.safeParse(expr).success;
}
