/**
 * Abort and Cancellation System Schemas
 * Zod schemas for abort controller, signals, and cleanup
 */

import { z } from "zod";

// ============================================
// ABORT CONTROLLER SCHEMAS
// ============================================

export const AbortControllerConfigSchema = z.object({
  parentSignal: z.any().optional(),
  maxListeners: z.number().optional(),
});

export const ProcessSignalNameSchema = z.enum(["SIGINT", "SIGTERM", "SIGHUP"]);

export const ProcessSignalConfigSchema = z.object({
  name: ProcessSignalNameSchema,
  number: z.number(),
  action: z.literal("terminate"),
  description: z.string(),
  exitCode: z.number(),
});

export const PROCESS_SIGNALS_SCHEMA = z.array(ProcessSignalConfigSchema);

// ============================================
// CLEANUP BEHAVIOR SCHEMAS
// ============================================

export const CleanupBehaviorSchema = z.object({
  flushPendingTelemetry: z.boolean(),
  closeFileHandles: z.boolean(),
  killChildProcesses: z.boolean(),
  abortPendingRequests: z.boolean(),
  saveSessionState: z.boolean(),
});

// ============================================
// ORPHAN DETECTION SCHEMAS
// ============================================

export const OrphanDetectionConfigSchema = z.object({
  checkIntervalMs: z.number(),
  enabled: z.boolean(),
});

// ============================================
// MCP CANCELLATION SCHEMAS
// ============================================

export const MCPCancelNotificationSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.literal("notifications/cancelled"),
  params: z.object({
    requestId: z.string().optional(),
    reason: z.string().optional(),
  }),
});

export const MCPRequestCancellationConfigSchema = z.object({
  requestId: z.string(),
  reason: z.string().optional(),
});

// ============================================
// TASK STATUS SCHEMAS
// ============================================

export const TaskStatusSchema = z.enum([
  "working",
  "input_required",
  "completed",
  "failed",
  "cancelled",
]);

export const TaskCancellationFlowSchema = z.object({
  validate: z.string(),
  updateStatus: z.string(),
  clearQueue: z.string(),
  abortController: z.string(),
});

// ============================================
// CONTROL REQUEST SCHEMAS
// ============================================

export const ControlRequestInterruptSchema = z.object({
  type: z.literal("control_request"),
  request: z.object({
    subtype: z.literal("interrupt"),
  }),
});

// ============================================
// STDIN RAW MODE SCHEMAS
// ============================================

export const StdinRawModeConfigSchema = z.object({
  encoding: z.literal("utf8"),
  rawMode: z.boolean(),
  exitOnCtrlC: z.boolean(),
});

// ============================================
// ERROR CONFIG SCHEMAS
// ============================================

export const CancellationErrorConfigSchema = z.object({
  name: z.string(),
  extends: z.string(),
  cause: z.string().optional(),
  trigger: z.string().optional(),
});

// ============================================
// RETRY SCHEMAS
// ============================================

export const RetryWithAbortConfigSchema = z.object({
  maxRetries: z.number(),
  retryDelayMs: z.number(),
  maxRetryDelayMs: z.number(),
  abortSignal: z.any().optional(),
});

export const RetryDecisionSchema = z.object({
  shouldRetry: z.boolean(),
  delay: z.number().optional(),
  config: RetryWithAbortConfigSchema.optional(),
});

// ============================================
// CHILD PROCESS SCHEMAS
// ============================================

export const ChildProcessCleanupResultSchema = z.object({
  status: z.enum(["completed", "error", "interrupted"]),
  code: z.number().optional(),
  signal: z.any().optional(),
});

// ============================================
// WEAK REF CLEANUP SCHEMAS
// ============================================

export const WeakRefCleanupSchema = z.object({
  deref: z.function().returns(z.any().optional()),
  cleanup: z.function().returns(z.void()),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type AbortControllerConfig = z.infer<typeof AbortControllerConfigSchema>;
export type ProcessSignalName = z.infer<typeof ProcessSignalNameSchema>;
export type ProcessSignalConfig = z.infer<typeof ProcessSignalConfigSchema>;
export type CleanupBehavior = z.infer<typeof CleanupBehaviorSchema>;
export type OrphanDetectionConfig = z.infer<typeof OrphanDetectionConfigSchema>;
export type MCPCancelNotification = z.infer<typeof MCPCancelNotificationSchema>;
export type MCPRequestCancellationConfig = z.infer<typeof MCPRequestCancellationConfigSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type TaskCancellationFlow = z.infer<typeof TaskCancellationFlowSchema>;
export type ControlRequestInterrupt = z.infer<typeof ControlRequestInterruptSchema>;
export type StdinRawModeConfig = z.infer<typeof StdinRawModeConfigSchema>;
export type CancellationErrorConfig = z.infer<typeof CancellationErrorConfigSchema>;
export type RetryWithAbortConfig = z.infer<typeof RetryWithAbortConfigSchema>;
export type RetryDecision = z.infer<typeof RetryDecisionSchema>;
export type ChildProcessCleanupResult = z.infer<typeof ChildProcessCleanupResultSchema>;
export type WeakRefCleanup = z.infer<typeof WeakRefCleanupSchema>;
