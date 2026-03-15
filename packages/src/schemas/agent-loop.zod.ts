/**
 * Agent Loop Schemas
 * Zod schemas for agent loop types
 */

import { z } from "zod";
import type {
  Message,
  ToolDefinition,
  ToolResult,
  QueryMetrics,
  PermissionMode,
  GitStatus,
  CacheConfig,
  CacheMetrics,
  ThinkingConfig,
  ExtendedThinkingConfig,
  ToolUseBlock,
  APIResponse,
  UsageMetrics,
} from "./index.js";
import type { SystemReminderConfig } from "./system-reminders.zod.js";
import type { PermissionRequest, PermissionResult } from "./permissions.zod.js";

// ============================================
// AGENT LOOP CALLBACKS SCHEMA
// ============================================

export interface AgentLoopCallbacks {
  onText?: (text: string) => void;
  onThinking?: (thinking: string) => void;
  onToolUse?: (toolUse: { id: string; name: string; input: unknown }) => void;
  onToolResult?: (result: { id: string; result: ToolResult }) => void;
  onMetrics?: (metrics: QueryMetrics) => void;
  onReminder?: (reminder: string) => void;
}

// ============================================
// AGENT LOOP OPTIONS SCHEMA
// ============================================

export const AgentLoopOptionsSchema = z.object({
  apiKey: z.string(),
  model: z.string().optional(),
  maxTokens: z.number().optional(),
  systemPrompt: z.string(),
  tools: z.array(z.custom<ToolDefinition>()),
  permissionMode: z.custom<PermissionMode>(),
  workingDirectory: z.string(),
  gitStatus: z.custom<GitStatus>().nullable().optional(),
  reminderConfig: z.custom<SystemReminderConfig>().optional(),
  cacheConfig: z.custom<CacheConfig>().optional(),
  thinking: z.custom<ThinkingConfig>().optional(),
  extendedThinking: z.custom<ExtendedThinkingConfig>().optional(),
  extendedThinkingEnabled: z.boolean().optional(),
  extendedThinkingEffort: z.enum(["low", "medium", "high", "max"]).optional(),
  extendedThinkingInterleaved: z.boolean().optional(),
  sessionId: z.string().optional(),
  signal: z.custom<AbortSignal>().optional(),
  // Callbacks (not serializable to Zod schema)
  onText: z.custom<(text: string) => void>().optional(),
  onThinking: z.custom<(thinking: string) => void>().optional(),
  onToolUse: z.custom<(toolUse: { id: string; name: string; input: unknown }) => void>().optional(),
  onToolResult: z.custom<(result: { id: string; result: ToolResult }) => void>().optional(),
  onMetrics: z.custom<(metrics: QueryMetrics) => void>().optional(),
  onReminder: z.custom<(reminder: string) => void>().optional(),
  onPermissionRequest: z.custom<(request: PermissionRequest) => Promise<PermissionResult>>().optional(),
});

// ============================================
// AGENT LOOP RESULT SCHEMA
// ============================================

export const AgentLoopResultSchema = z.object({
  messages: z.array(z.custom<Message>()),
  metrics: z.array(z.custom<QueryMetrics>()),
  totalCost: z.number(),
  totalDuration: z.number(),
  totalCacheMetrics: z.custom<CacheMetrics>(),
  compactionCount: z.number(),
  totalTokensCompacted: z.number(),
});

// ============================================
// LOOP STATE SCHEMA
// ============================================

export const LoopStateSchema = z.object({
  messages: z.array(z.custom<Message>()),
  metrics: z.array(z.custom<QueryMetrics>()),
  allToolsUsed: z.array(z.custom<ToolUseBlock>()),
  totalCost: z.number(),
  totalDuration: z.number(),
  turnNumber: z.number(),
  previousCost: z.number(),
  compactionCount: z.number(),
  totalTokensCompacted: z.number(),
  cacheMetrics: z.custom<CacheMetrics>(),
});

// ============================================
// TURN OPTIONS SCHEMA
// ============================================

export const TurnOptionsSchema = z.object({
  apiKey: z.string(),
  model: z.string(),
  maxTokens: z.number(),
  systemPrompt: z.string(),
  tools: z.array(z.custom<ToolDefinition>()),
  cacheConfig: z.custom<CacheConfig>(),
  thinking: z.custom<ThinkingConfig>().optional(),
  extendedThinking: z.custom<ExtendedThinkingConfig>().optional(),
  workingDirectory: z.string(),
  gitStatus: z.custom<GitStatus>().nullable(),
  reminderConfig: z.custom<SystemReminderConfig>(),
  sessionId: z.string().optional(),
  signal: z.custom<AbortSignal>().optional(),
  // Callbacks
  onText: z.custom<(text: string) => void>().optional(),
  onThinking: z.custom<(thinking: string) => void>().optional(),
  onToolUse: z.custom<(toolUse: { id: string; name: string; input: unknown }) => void>().optional(),
  onReminder: z.custom<(reminder: string) => void>().optional(),
});

// ============================================
// TURN RESULT SCHEMA
// ============================================

export const TurnResultSchema = z.object({
  message: z.custom<APIResponse>(),
  usage: z.custom<UsageMetrics>(),
  cacheMetrics: z.custom<CacheMetrics>(),
  costUSD: z.number(),
  durationMs: z.number(),
  ttftMs: z.number(),
});

// ============================================
// TOOL EXECUTION OPTIONS SCHEMA
// ============================================

export const ToolExecutionOptionsSchema = z.object({
  tools: z.array(z.custom<ToolDefinition>()),
  workingDirectory: z.string(),
  permissionMode: z.custom<PermissionMode>(),
  sessionId: z.string().optional(),
  signal: z.custom<AbortSignal>().optional(),
  // Callback
  onToolResult: z.custom<(result: { id: string; result: ToolResult }) => void>().optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type AgentLoopOptions = z.infer<typeof AgentLoopOptionsSchema>;
export type AgentLoopResult = z.infer<typeof AgentLoopResultSchema>;
export type LoopState = z.infer<typeof LoopStateSchema>;
export type TurnOptions = z.infer<typeof TurnOptionsSchema>;
export type TurnResult = z.infer<typeof TurnResultSchema>;
export type ToolExecutionOptions = z.infer<typeof ToolExecutionOptionsSchema>;

// ============================================
// TYPE GUARDS
// ============================================

export function isAgentLoopResult(value: unknown): value is AgentLoopResult {
  return AgentLoopResultSchema.safeParse(value).success;
}

export function isLoopState(value: unknown): value is LoopState {
  return LoopStateSchema.safeParse(value).success;
}

export function isTurnResult(value: unknown): value is TurnResult {
  return TurnResultSchema.safeParse(value).success;
}
