/**
 * Session Schemas
 * Zod schemas for session management types
 */

import { z } from "zod";
import { MessageSchema, QueryMetricsSchema } from "./api.zod.js";

// Infer types from schemas
type Message = z.infer<typeof MessageSchema>;
type QueryMetrics = z.infer<typeof QueryMetricsSchema>;

// ============================================
// SESSION METADATA SCHEMA
// ============================================

export const SessionMetadataSchema = z.object({
  type: z.literal("metadata"),
  id: z.string(),
  created: z.number(),
  updated: z.number(),
  model: z.string(),
  workingDirectory: z.string(),
  agentName: z.string().optional(),
  agentColor: z.string().optional(),
  teamName: z.string().optional(),
  totalCost: z.number().optional(),
  totalTokens: z
    .object({
      input: z.number(),
      output: z.number(),
    })
    .optional(),
});

// ============================================
// SESSION ENTRIES SCHEMAS (JSONL lines)
// ============================================

export const SessionMessageSchema = z.object({
  type: z.literal("message"),
  timestamp: z.number(),
  data: z.custom<Message>(), // Message is complex, use custom
});

export const SessionToolUseSchema = z.object({
  type: z.literal("tool_use"),
  timestamp: z.number(),
  toolId: z.string(),
  toolName: z.string(),
  input: z.record(z.unknown()),
  result: z.string().optional(),
  isError: z.boolean().optional(),
});

export const SessionMetricsSchema = z.object({
  type: z.literal("metrics"),
  timestamp: z.number(),
  data: z.custom<QueryMetrics>(), // QueryMetrics is complex, use custom
});

export const SessionContextSchema = z.object({
  type: z.literal("context"),
  timestamp: z.number(),
  workingDirectory: z.string(),
  gitBranch: z.string().optional(),
  systemPrompt: z.string().optional(),
});

export const SessionCheckpointSchema = z.object({
  type: z.literal("checkpoint"),
  timestamp: z.number(),
  checkpointId: z.string(),
  label: z.string().optional(),
  messageCount: z.number(),
});

export const SessionEntrySchema = z.discriminatedUnion("type", [
  SessionMetadataSchema,
  SessionMessageSchema,
  SessionToolUseSchema,
  SessionMetricsSchema,
  SessionContextSchema,
  SessionCheckpointSchema,
]);

// ============================================
// LOADED SESSION SCHEMA
// ============================================

export const LoadedSessionSchema = z.object({
  metadata: SessionMetadataSchema,
  messages: z.array(z.custom<Message>()),
  tools: z.array(SessionToolUseSchema),
  metrics: z.array(z.custom<QueryMetrics>()),
  context: SessionContextSchema.nullable(),
  checkpoints: z.array(SessionCheckpointSchema),
});

// ============================================
// SESSION SUMMARY SCHEMA
// ============================================

export const SessionSummarySchema = z.object({
  id: z.string(),
  created: z.number(),
  updated: z.number(),
  lastActivity: z.number().optional(),
  model: z.string(),
  messageCount: z.number(),
  totalCost: z.number(),
  totalTokens: z.object({
    input: z.number(),
    output: z.number(),
  }),
  firstMessage: z.string().optional(),
  workingDirectory: z.string(),
  metadata: z.record(z.unknown()).optional(),
  agentName: z.string().optional(),
  agentColor: z.string().optional(),
  teamName: z.string().optional(),
});

// ============================================
// SESSION FILTER SCHEMA
// ============================================

export const SessionFilterSchema = z.object({
  model: z.string().optional(),
  workingDirectory: z.string().optional(),
  minMessages: z.number().optional(),
  maxAge: z.number().optional(), // milliseconds
  since: z.number().optional(), // timestamp
});

// ============================================
// SESSION EVENT SCHEMAS
// ============================================

export const SessionEventTypeSchema = z.enum([
  "created",
  "resumed",
  "message_saved",
  "metrics_saved",
  "checkpoint_created",
  "deleted",
]);

export const SessionEventSchema = z.object({
  type: SessionEventTypeSchema,
  sessionId: z.string(),
  timestamp: z.number(),
  data: z.unknown().optional(),
});

// ============================================
// EXPORT FORMAT SCHEMA
// ============================================

export const ExportFormatSchema = z.enum(["jsonl", "json", "markdown"]);

// ============================================
// TYPE EXPORTS
// ============================================

export type SessionMetadata = z.infer<typeof SessionMetadataSchema>;
export type SessionMessage = z.infer<typeof SessionMessageSchema>;
export type SessionToolUse = z.infer<typeof SessionToolUseSchema>;
export type SessionMetrics = z.infer<typeof SessionMetricsSchema>;
export type SessionContext = z.infer<typeof SessionContextSchema>;
export type SessionCheckpoint = z.infer<typeof SessionCheckpointSchema>;
export type SessionEntry = z.infer<typeof SessionEntrySchema>;
export type LoadedSession = z.infer<typeof LoadedSessionSchema>;
export type SessionSummary = z.infer<typeof SessionSummarySchema>;
export type SessionFilter = z.infer<typeof SessionFilterSchema>;
export type SessionEventType = z.infer<typeof SessionEventTypeSchema>;
export type SessionEvent = z.infer<typeof SessionEventSchema>;
export type ExportFormat = z.infer<typeof ExportFormatSchema>;

// Callback type (not serializable to Zod)
export type SessionEventHandler = (
  event: SessionEvent
) => void | Promise<void>;

// ============================================
// TYPE GUARDS
// ============================================

export function isSessionMetadata(value: unknown): value is SessionMetadata {
  return SessionMetadataSchema.safeParse(value).success;
}

export function isSessionToolUse(value: unknown): value is SessionToolUse {
  return SessionToolUseSchema.safeParse(value).success;
}

export function isSessionEvent(value: unknown): value is SessionEvent {
  return SessionEventSchema.safeParse(value).success;
}

export function isLoadedSession(value: unknown): value is LoadedSession {
  return LoadedSessionSchema.safeParse(value).success;
}

export function isSessionSummary(value: unknown): value is SessionSummary {
  return SessionSummarySchema.safeParse(value).success;
}
