/**
 * Retry Schemas
 * Zod schemas for retry logic types
 */

import { z } from "zod";

// ============================================
// RETRY OPTIONS SCHEMA
// ============================================

export const RetryOptionsSchema = z.object({
  maxRetries: z.number().int().nonnegative().optional(),
  baseDelayMs: z.number().int().positive().optional(),
  maxDelayMs: z.number().int().positive().optional(),
  jitterFactor: z.number().min(0).max(1).optional(),
  retryableStatusCodes: z.array(z.number().int()).optional(),
  onRetry: z.custom<(attempt: number, error: Error, delayMs: number) => void>().optional(),
});

// ============================================
// DEFAULTS
// ============================================

export const DEFAULT_RETRY_OPTIONS: {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterFactor: number;
  retryableStatusCodes: number[];
} = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  jitterFactor: 0.2,
  retryableStatusCodes: [429, 500, 502, 503, 504, 529],
};

// ============================================
// TYPE EXPORTS
// ============================================

export type RetryOptions = z.infer<typeof RetryOptionsSchema>;
