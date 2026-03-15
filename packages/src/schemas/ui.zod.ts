/**
 * UI Schemas
 * Zod schemas for UI interface types
 */

import { z } from "zod";
import { PermissionModeSchema, ClaudeModelSchema, MessageSchema, ToolDefinitionSchema } from "./index.js";

// ============================================
// MESSAGE SUB-TYPE SCHEMA
// ============================================

export const MessageSubTypeSchema = z.enum([
  "tool_call",
  "tool_result",
  "hook",
  "info",
  "error",
  "thinking",
]);

// ============================================
// UI MESSAGE SCHEMA
// ============================================

export const UIMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  timestamp: z.number().positive(),
  subType: MessageSubTypeSchema.optional(),
  toolName: z.string().optional(),
  isError: z.boolean().optional(),
});

// ============================================
// STATUS LINE OPTIONS SCHEMA
// ============================================

export const StatusLineOptionsSchema = z.object({
  permissionMode: PermissionModeSchema,
  tokensUsed: z.number().int().nonnegative(),
  maxTokens: z.number().int().positive(),
  model: z.string(),
  isLoading: z.boolean().optional(),
  isPlanMode: z.boolean().optional(),
  verbose: z.boolean().optional(),
  terminalWidth: z.number().int().positive().optional(),
});

// ============================================
// CONTEXT INFO SCHEMA
// ============================================

export const ContextInfoSchema = z.object({
  percentRemaining: z.number().min(0).max(100),
  tokenDisplay: z.string().optional(),
  isLow: z.boolean(),
  isCritical: z.boolean(),
});

// ============================================
// TERMINAL SIZE SCHEMA
// ============================================

export const TerminalSizeSchema = z.object({
  rows: z.number().int().positive(),
  columns: z.number().int().positive(),
});

// ============================================
// USE TERMINAL SIZE OPTIONS SCHEMA
// ============================================

export const UseTerminalSizeOptionsSchema = z.object({
  onResize: z.custom<(size: { rows: number; columns: number }) => void>().optional(),
});

// ============================================
// MESSAGE AREA PROPS SCHEMA
// ============================================

export const MessageAreaPropsSchema = z.object({
  messages: z.array(UIMessageSchema),
  isLoading: z.boolean(),
  spinnerFrame: z.string(),
  height: z.number().int().nonnegative(),
  scrollOffset: z.number().int().nonnegative(),
  contextWarning: z.string().nullable(),
  streamingText: z.string().optional(),
});

// ============================================
// STATUS BAR PROPS SCHEMA
// ============================================

export const StatusBarPropsSchema = z.object({
  permissionMode: PermissionModeSchema,
  tokensUsed: z.number().int().nonnegative(),
  model: z.string(),
  isLoading: z.boolean(),
  spinnerFrame: z.string(),
});

// ============================================
// INPUT FIELD PROPS SCHEMA
// ============================================

export const InputFieldPropsSchema = z.object({
  value: z.string(),
  cursorPos: z.number().int().nonnegative(),
  placeholder: z.string(),
  isActive: z.boolean(),
});

// ============================================
// TERMINAL LAYOUT SCHEMA
// ============================================

export const TerminalLayoutSchema = z.object({
  terminalHeight: z.number().int().nonnegative(),
  inputHeight: z.number().int().nonnegative(),
  statusHeight: z.number().int().nonnegative(),
  messageHeight: z.number().int().nonnegative(),
});

// ============================================
// SESSION INFO SCHEMA
// ============================================

export const SessionInfoSchema = z.object({
  id: z.string(),
  messageCount: z.number().int().nonnegative(),
  lastActivity: z.number().positive().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ============================================
// CLI ARGS SCHEMA
// ============================================

export const CLIArgsSchema = z.object({
  query: z.string().optional(),
  model: z.string().optional(),
  resume: z.string().optional(),
  sessions: z.boolean().optional(),
  help: z.boolean().optional(),
  version: z.boolean().optional(),
  mcpConfig: z.string().optional(),
  workingDirectory: z.string().optional(),
});

// ============================================
// LOADING STATE DATA SCHEMA
// ============================================

export const LoadingStateDataSchema = z.object({
  isLoading: z.boolean(),
  message: z.string().optional(),
  progress: z.number().min(0).max(100).optional(),
  startTime: z.number().optional(),
});

// ============================================
// LOADING STATE EVENTS SCHEMA
// ============================================

export const LoadingStateEventsSchema = z.object({
  onStart: z.custom<() => void>().optional(),
  onComplete: z.custom<() => void>().optional(),
  onProgress: z.custom<(progress: number) => void>().optional(),
  onError: z.custom<(error: Error) => void>().optional(),
});

// ============================================
// QUERY OPTIONS SCHEMA
// ============================================

export const QueryOptionsSchema = z.object({
  maxTokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  timeout: z.number().int().positive().optional(),
});

// ============================================
// BUFFERED MESSAGE SCHEMA
// ============================================

export const BufferedMessageSchema = z.object({
  content: z.string(),
  timestamp: z.number().positive(),
  level: z.enum(["log", "error", "warn", "info", "debug", "trace"]),
});

// ============================================
// SUPPRESS OPTIONS SCHEMA
// ============================================

export const SuppressOptionsSchema = z.object({
  methods: z.array(z.enum(["log", "error", "warn", "info", "debug", "trace"])).optional(),
  silent: z.boolean().optional(),
  replay: z.boolean().optional(),
});

// ============================================
// SPINNER OPTIONS SCHEMA
// ============================================

export const SpinnerOptionsSchema = z.object({
  text: z.string().optional(),
  color: z.enum(["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white", "gray"]).optional(),
  spinner: z.string().optional(),
});

// ============================================
// SPINNER STATE SCHEMA
// ============================================

export const SpinnerStateSchema = z.object({
  isSpinning: z.boolean(),
  text: z.string(),
  frame: z.number().int().nonnegative(),
});

// ============================================
// PROGRESS UPDATE SCHEMA
// ============================================

export const ProgressUpdateSchema = z.object({
  current: z.number().int().nonnegative(),
  total: z.number().int().positive(),
  message: z.string().optional(),
  percentage: z.number().min(0).max(100),
});

// ============================================
// INPUT HISTORY OPTIONS SCHEMA
// ============================================

export const InputHistoryOptionsSchema = z.object({
  maxSize: z.number().int().positive().optional(),
  persistKey: z.string().optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type MessageSubType = z.infer<typeof MessageSubTypeSchema>;
export type UIMessage = z.infer<typeof UIMessageSchema>;
export type StatusLineOptions = z.infer<typeof StatusLineOptionsSchema>;
export type ContextInfo = z.infer<typeof ContextInfoSchema>;
export type TerminalSize = z.infer<typeof TerminalSizeSchema>;
export type UseTerminalSizeOptions = z.infer<typeof UseTerminalSizeOptionsSchema>;
export type MessageAreaProps = z.infer<typeof MessageAreaPropsSchema>;
export type StatusBarProps = z.infer<typeof StatusBarPropsSchema>;
export type InputFieldProps = z.infer<typeof InputFieldPropsSchema>;
export type TerminalLayout = z.infer<typeof TerminalLayoutSchema>;
export type SessionInfo = z.infer<typeof SessionInfoSchema>;
export type CLIArgs = z.infer<typeof CLIArgsSchema>;
export type LoadingStateData = z.infer<typeof LoadingStateDataSchema>;
export type LoadingStateEvents = z.infer<typeof LoadingStateEventsSchema>;
export type QueryOptions = z.infer<typeof QueryOptionsSchema>;
export type BufferedMessage = z.infer<typeof BufferedMessageSchema>;
export type SuppressOptions = z.infer<typeof SuppressOptionsSchema>;
export type SpinnerOptions = z.infer<typeof SpinnerOptionsSchema>;
export type SpinnerState = z.infer<typeof SpinnerStateSchema>;
export type ProgressUpdate = z.infer<typeof ProgressUpdateSchema>;
export type InputHistoryOptions = z.infer<typeof InputHistoryOptionsSchema>;
