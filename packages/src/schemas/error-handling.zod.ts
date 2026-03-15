/**
 * Error Handling and Retry System Schemas
 * Zod schemas for error classification and retry logic
 */

import { z } from "zod";

// ============================================
// ERROR HIERARCHY SCHEMAS
// ============================================

export const AnthropicErrorCodeSchema = z.enum([
  "invalid_request_error",
  "authentication_error",
  "permission_error",
  "not_found_error",
  "rate_limit_error",
  "api_error",
  "overloaded_error",
  "context_length_exceeded",
]);

export const AnthropicErrorSchema = z.object({
  type: z.literal("error"),
  error: z.object({
    type: AnthropicErrorCodeSchema,
    message: z.string(),
  }),
  status: z.number().optional(),
  headers: z.record(z.string()).optional(),
  requestId: z.string().optional(),
});

// ============================================
// API ERROR TYPES SCHEMAS
// ============================================

export const APIErrorConfigSchema = z.object({
  name: z.string(),
  description: z.string(),
  retryEligible: z.boolean(),
  httpStatus: z.number().optional(),
});

// ============================================
// INTERNAL ERROR CLASSES SCHEMAS
// ============================================

export const InternalErrorConfigSchema = z.object({
  className: z.string(),
  extends: z.literal("Error"),
  purpose: z.string(),
});

// ============================================
// RETRY STATUS CODE HANDLING SCHEMAS
// ============================================

export const StatusCodeRetryConfigSchema = z.object({
  alwaysRetry: z.array(z.number()),
  neverRetry: z.array(z.number()),
  headerOverride: z.string(),
});

// ============================================
// EXPONENTIAL BACKOFF SCHEMAS
// ============================================

export const ExponentialBackoffConfigSchema = z.object({
  baseDelayMs: z.number(),
  maxDelayMs: z.number(),
  jitterMs: z.number(),
  maxRetries: z.number(),
});

// ============================================
// RETRY-AFTER HEADERS SCHEMAS
// ============================================

export const RetryAfterHeaderSchema = z.object({
  name: z.string(),
  format: z.enum(["seconds", "milliseconds", "http-date"]),
  parse: z.function().args(z.string()).returns(z.number()),
});

// ============================================
// RETRY FLOW SCHEMAS
// ============================================

export const RetryFlowConfigSchema = z.object({
  maxRetries: z.number(),
  shouldRetry: z.function().args(z.custom<Error>()).returns(z.promise(z.boolean())),
  calculateDelay: z.function().args(z.number()).returns(z.number()),
  onRetry: z.function().args(z.number(), z.custom<Error>(), z.number()).returns(z.void()).optional(),
});

export const RetryResultSchema = z.object({
  result: z.unknown().optional(),
  error: z.custom<Error>().optional(),
  attempts: z.number(),
  totalDelayMs: z.number(),
});

// ============================================
// ERROR CLASSIFICATION SCHEMAS
// ============================================

export const ErrorClassificationSchema = z.enum(["transient", "permanent", "client"]);

export const ErrorClassificationConfigSchema = z.object({
  type: ErrorClassificationSchema,
  description: z.string(),
  retryEligible: z.boolean(),
  examples: z.array(z.string()),
});

// ============================================
// ERROR CONTEXT SCHEMAS
// ============================================

export const ErrorContextSchema = z.object({
  status: z.number().optional(),
  headers: z.record(z.string()).optional(),
  error: z.unknown().optional(),
  message: z.string(),
  requestId: z.string().optional(),
  attempt: z.number().optional(),
  willRetry: z.boolean().optional(),
});

// ============================================
// SPECIAL ERROR SCHEMAS
// ============================================

export const SpecialErrorConfigSchema = z.object({
  className: z.string(),
  description: z.string(),
  pattern: z.string().optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type AnthropicErrorCode = z.infer<typeof AnthropicErrorCodeSchema>;
export type AnthropicError = z.infer<typeof AnthropicErrorSchema>;
export type APIErrorConfig = z.infer<typeof APIErrorConfigSchema>;
export type InternalErrorConfig = z.infer<typeof InternalErrorConfigSchema>;
export type StatusCodeRetryConfig = z.infer<typeof StatusCodeRetryConfigSchema>;
export type ExponentialBackoffConfig = z.infer<typeof ExponentialBackoffConfigSchema>;
export type RetryAfterHeader = z.infer<typeof RetryAfterHeaderSchema>;
export type RetryFlowConfig = z.infer<typeof RetryFlowConfigSchema>;
export type RetryResult<T> = z.infer<typeof RetryResultSchema>;
export type ErrorClassification = z.infer<typeof ErrorClassificationSchema>;
export type ErrorClassificationConfig = z.infer<typeof ErrorClassificationConfigSchema>;
export type ErrorContext = z.infer<typeof ErrorContextSchema>;
export type SpecialErrorConfig = z.infer<typeof SpecialErrorConfigSchema>;
