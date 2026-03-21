/**
 * Cron Manager - Session-only job scheduling
 *
 * Built-in scheduling system for Coder that mirrors Claude Code's native cron.
 * Jobs live in memory only (not persisted to disk) and auto-expire after 3 days.
 *
 * Features:
 * - Standard 5-field cron syntax (local timezone)
 * - Recurring or one-shot jobs
 * - Jitter to avoid API thundering herd
 * - Auto-expiry after 3 days
 *
 * Usage:
 * ```typescript
 * const manager = new CronManager({
 *   onFire: async (job) => {
 *     // Handle job firing - enqueue prompt to agent loop
 *     console.log(`Job ${job.id} fired: ${job.prompt}`);
 *   }
 * });
 *
 * // Schedule recurring job (every 5 minutes)
 * const result = await manager.create({
 *   cron: "0,5,10,15,20,25,30,35,40,45,50,55 * * * *",
 *   prompt: "check status",
 *   recurring: true
 * });
 *
 * // List all jobs
 * const { jobs } = manager.list();
 *
 * // Delete a job
 * manager.delete(result.jobId);
 * ```
 */

import { randomUUID } from "crypto";
import {
  type CronJob,
  type CreateCronJobInput,
  type CreateCronJobResult,
  type ListCronJobsResult,
  type DeleteCronJobResult,
  type CronManagerConfig,
  CronJobSchema,
  CreateCronJobInputSchema,
  CronManagerConfigSchema,
  DEFAULT_JOB_EXPIRY_MS,
  DEFAULT_JITTER_PERCENT,
  MAX_JITTER_MS,
  isValidCronExpression,
} from "../../schemas/cron.zod.js";

/**
 * Callback fired when a job triggers
 */
export type CronFireCallback = (job: CronJob) => Promise<void> | void;

/**
 * Constructor parameters for CronManager
 */
export type CronManagerOptions = Partial<CronManagerConfig> & { onFire?: CronFireCallback };

/**
 * Parsed cron fields
 */
interface CronFields {
  minute: number[] | null; // null = *
  hour: number[] | null;
  dayOfMonth: number[] | null;
  month: number[] | null;
  dayOfWeek: number[] | null;
}

/**
 * Cron Manager - In-memory job scheduler
 */
export class CronManager {
  private jobs = new Map<string, CronJob>();
  private config: CronManagerConfig;
  private onFire?: CronFireCallback;
  private checkTimer?: ReturnType<typeof setInterval>;
  private isRunning = false;

  constructor(config?: Partial<CronManagerConfig> & { onFire?: CronFireCallback }) {
    const { onFire, ...managerConfig } = config || {};
    this.config = CronManagerConfigSchema.parse(managerConfig);
    this.onFire = onFire;
  }

  /**
   * Start the scheduler loop
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    this.checkTimer = setInterval(() => {
      this.tick();
    }, this.config.checkIntervalMs);
  }

  /**
   * Stop the scheduler loop
   */
  stop(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = undefined;
    }
    this.isRunning = false;
  }

  /**
   * Create a new scheduled job
   */
  async create(input: CreateCronJobInput): Promise<CreateCronJobResult> {
    const validated = CreateCronJobInputSchema.parse(input);

    const now = Date.now();
    const nextFire = this.calculateNextFire(validated.cron, now);

    const job: CronJob = {
      id: randomUUID(),
      cron: validated.cron,
      prompt: validated.prompt,
      recurring: validated.recurring,
      description: validated.description,
      createdAt: now,
      nextFire,
      fireCount: 0,
      enabled: true,
      expiresAt: now + this.config.defaultExpiryMs,
    };

    this.jobs.set(job.id, job);

    const recurringText = validated.recurring
      ? `Every ${this.formatInterval(validated.cron)}`
      : `One-shot at ${new Date(nextFire).toISOString()}`;

    return {
      success: true,
      jobId: job.id,
      message: `Scheduled ${recurringText}. Session-only (not written to disk, dies when Coder exits). Auto-expires after 3 days.`,
      nextFire,
    };
  }

  /**
   * Delete a scheduled job
   */
  delete(jobId: string): DeleteCronJobResult {
    if (!this.jobs.has(jobId)) {
      return { success: false, message: `Job ${jobId} not found` };
    }

    this.jobs.delete(jobId);
    return { success: true, message: `Cancelled job ${jobId}` };
  }

  /**
   * Get a specific job by ID
   */
  get(jobId: string): CronJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * List all scheduled jobs
   */
  list(): ListCronJobsResult {
    const jobs = Array.from(this.jobs.values())
      .filter(job => job.expiresAt > Date.now()) // Filter expired
      .sort((a, b) => a.nextFire - b.nextFire);

    return { jobs, count: jobs.length };
  }

  /**
   * Clear all jobs
   */
  clear(): void {
    this.jobs.clear();
  }

  /**
   * Get count of active jobs
   */
  get size(): number {
    return this.jobs.size;
  }

  /**
   * Check if scheduler is running
   */
  get active(): boolean {
    return this.isRunning;
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Main tick loop - check for jobs to fire
   */
  private tick(): void {
    const now = Date.now();

    for (const job of this.jobs.values()) {
      // Skip disabled jobs
      if (!job.enabled) continue;

      // Skip expired jobs
      if (job.expiresAt <= now) {
        this.jobs.delete(job.id);
        continue;
      }

      // Check if job should fire
      if (job.nextFire <= now) {
        this.fireJob(job);
      }
    }
  }

  /**
   * Fire a job and schedule next occurrence
   */
  private async fireJob(job: CronJob): Promise<void> {
    // Apply jitter if enabled
    const jitter = this.config.enableJitter
      ? this.calculateJitter(job.cron)
      : 0;

    // Update job state
    job.lastFire = Date.now();
    job.fireCount += 1;

    // Calculate next fire time (for recurring jobs)
    if (job.recurring) {
      job.nextFire = this.calculateNextFire(job.cron, Date.now() + jitter);
    } else {
      // One-shot job - remove after firing
      this.jobs.delete(job.id);
    }

    // Fire callback
    if (this.onFire) {
      try {
        await this.onFire(job);
      } catch (error) {
        console.error(`[CronManager] Job ${job.id} callback error:`, error);
      }
    }
  }

  /**
   * Calculate next fire time from cron expression
   */
  private calculateNextFire(cron: string, from: number): number {
    const fields = this.parseCron(cron);
    const date = new Date(from);

    // Round to next minute boundary
    date.setSeconds(0, 0);
    date.setMinutes(date.getMinutes() + 1);

    // Find next matching time (limit iterations for safety)
    const maxIterations = 366 * 24 * 60; // 1 year of minutes
    let iterations = 0;

    while (iterations < maxIterations) {
      iterations++;

      const minute = date.getMinutes();
      const hour = date.getHours();
      const dayOfMonth = date.getDate();
      const month = date.getMonth() + 1;
      const dayOfWeek = date.getDay();

      // Check if all fields match
      if (this.matchesField(fields.minute, minute) &&
          this.matchesField(fields.hour, hour) &&
          this.matchesField(fields.dayOfMonth, dayOfMonth) &&
          this.matchesField(fields.month, month) &&
          this.matchesField(fields.dayOfWeek, dayOfWeek)) {
        return date.getTime();
      }

      // Advance to next minute
      date.setMinutes(date.getMinutes() + 1);
    }

    // Fallback: return 1 year from now
    return from + 365 * 24 * 60 * 60 * 1000;
  }

  /**
   * Parse cron expression into field arrays
   */
  private parseCron(cron: string): CronFields {
    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) {
      throw new Error(`Invalid cron expression: ${cron}`);
    }

    // Type assertion is safe because we verified length === 5
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts as [string, string, string, string, string];

    return {
      minute: this.parseField(minute, 0, 59),
      hour: this.parseField(hour, 0, 23),
      dayOfMonth: this.parseField(dayOfMonth, 1, 31),
      month: this.parseField(month, 1, 12),
      dayOfWeek: this.parseField(dayOfWeek, 0, 7),
    };
  }

  /**
   * Parse a single cron field
   */
  private parseField(field: string, min: number, max: number): number[] | null {
    if (field === "*") {
      return null; // Wildcard
    }

    const values = new Set<number>();

    for (const part of field.split(",")) {
      // Handle step values: */5 or 1-10/2
      const splitPart = part.split("/");
      const range = splitPart[0] ?? "";
      const stepStr = splitPart[1];
      const step = stepStr ? parseInt(stepStr, 10) : 1;

      let start: number;
      let end: number;

      if (range === "*") {
        start = min;
        end = max;
      } else if (range.includes("-")) {
        const rangeParts = range.split("-").map(n => parseInt(n, 10));
        start = rangeParts[0] ?? min;
        end = rangeParts[1] ?? start;
      } else {
        start = end = parseInt(range, 10);
      }

      for (let i = start; i <= end; i += step) {
        if (i >= min && i <= max) {
          values.add(i);
        }
      }
    }

    return Array.from(values).sort((a, b) => a - b);
  }

  /**
   * Check if a value matches a cron field
   */
  private matchesField(field: number[] | null, value: number): boolean {
    if (field === null) return true; // Wildcard matches all
    return field.includes(value);
  }

  /**
   * Calculate jitter for a job based on its interval
   */
  private calculateJitter(cron: string): number {
    const fields = this.parseCron(cron);

    // Estimate interval in ms
    let estimatedIntervalMs: number;

    if (fields.minute !== null && fields.minute.length === 1) {
      // Specific minute = hourly or longer
      estimatedIntervalMs = 60 * 60 * 1000; // 1 hour
    } else if (fields.minute !== null && fields.minute.length > 1) {
      // Multiple minutes = minute-based
      const minuteArr = fields.minute;
      const interval = Math.min(...minuteArr.slice(1).map((m, i) => m - (minuteArr[i] ?? 0)));
      estimatedIntervalMs = interval * 60 * 1000;
    } else {
      // Every minute
      estimatedIntervalMs = 60 * 1000;
    }

    // Apply jitter (10% of interval, max 15 minutes)
    const jitter = Math.min(
      estimatedIntervalMs * DEFAULT_JITTER_PERCENT,
      MAX_JITTER_MS
    );

    return Math.random() * jitter;
  }

  /**
   * Format cron expression for human-readable description
   */
  private formatInterval(cron: string): string {
    const fields = this.parseCron(cron);

    if (fields.minute === null && fields.hour === null) {
      return "minute";
    }

    if (fields.minute !== null && fields.minute.length > 1) {
      const m0 = fields.minute[0] ?? 0;
      const m1 = fields.minute[1] ?? 0;
      const interval = m1 - m0;
      if (interval > 1) {
        return `${interval} minutes`;
      }
    }

    if (fields.hour === null && fields.minute !== null && fields.minute.length === 1) {
      return "hour";
    }

    if (fields.hour !== null && fields.hour.length > 1) {
      const h0 = fields.hour[0] ?? 0;
      const h1 = fields.hour[1] ?? 0;
      const interval = h1 - h0;
      if (interval > 1) {
        return `${interval} hours`;
      }
    }

    return cron;
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let defaultManager: CronManager | null = null;

/**
 * Get or create the default cron manager
 */
export function getCronManager(config?: CronManagerOptions): CronManager {
  if (!defaultManager) {
    defaultManager = new CronManager(config);
  }
  return defaultManager;
}

/**
 * Reset the default manager (useful for testing)
 */
export function resetCronManager(): void {
  if (defaultManager) {
    defaultManager.stop();
    defaultManager = null;
  }
}

// ============================================
// BUILT-IN PATTERNS
// ============================================

/**
 * Common cron patterns for convenience
 */
export const CronPatterns = {
  /** Every minute */
  everyMinute: "* * * * *",

  /** Every 5 minutes */
  every5Minutes: "*/5 * * * *",

  /** Every 15 minutes */
  every15Minutes: "*/15 * * * *",

  /** Every 30 minutes */
  every30Minutes: "*/30 * * * *",

  /** Every hour at :00 */
  hourly: "0 * * * *",

  /** Every hour at :07 (avoid thundering herd) */
  hourlyOffPeak: "7 * * * *",

  /** Every day at 9am local */
  daily9am: "0 9 * * *",

  /** Every day at midnight */
  dailyMidnight: "0 0 * * *",

  /** Weekdays at 9am */
  weekdays9am: "0 9 * * 1-5",

  /** Every Monday at 9am */
  weeklyMonday: "0 9 * * 1",
} as const;

// Re-export types
export type { CronJob, CreateCronJobInput, CreateCronJobResult, ListCronJobsResult, DeleteCronJobResult, CronManagerConfig };
