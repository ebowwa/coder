/**
 * Session Types - All type definitions for session handling
 */

import type { Message, QueryMetrics } from "../../types/index.js";

// ============================================
// SESSION METADATA
// ============================================

export interface SessionMetadata {
  type: "metadata";
  id: string;
  created: number;
  updated: number;
  model: string;
  workingDirectory: string;
  agentName?: string;
  agentColor?: string;
  teamName?: string;
  totalCost?: number;
  totalTokens?: { input: number; output: number };
}

// ============================================
// SESSION ENTRIES (JSONL lines)
// ============================================

export interface SessionMessage {
  type: "message";
  timestamp: number;
  data: Message;
}

export interface SessionToolUse {
  type: "tool_use";
  timestamp: number;
  toolId: string;
  toolName: string;
  input: Record<string, unknown>;
  result?: string;
  isError?: boolean;
}

export interface SessionMetrics {
  type: "metrics";
  timestamp: number;
  data: QueryMetrics;
}

export interface SessionContext {
  type: "context";
  timestamp: number;
  workingDirectory: string;
  gitBranch?: string;
  systemPrompt?: string;
}

export interface SessionCheckpoint {
  type: "checkpoint";
  timestamp: number;
  checkpointId: string;
  label?: string;
  messageCount: number;
}

export type SessionEntry =
  | SessionMetadata
  | SessionMessage
  | SessionToolUse
  | SessionMetrics
  | SessionContext
  | SessionCheckpoint;

// ============================================
// LOADED SESSION
// ============================================

export interface LoadedSession {
  metadata: SessionMetadata;
  messages: Message[];
  tools: SessionToolUse[];
  metrics: QueryMetrics[];
  context: SessionContext | null;
  checkpoints: SessionCheckpoint[];
}

// ============================================
// SESSION SUMMARY (for listing)
// ============================================

export interface SessionSummary {
  id: string;
  created: number;
  updated: number;
  lastActivity?: number;
  model: string;
  messageCount: number;
  totalCost: number;
  totalTokens: { input: number; output: number };
  firstMessage?: string;
  workingDirectory: string;
  metadata?: Record<string, unknown>;
  // Additional fields for TUI compatibility
  agentName?: string;
  agentColor?: string;
  teamName?: string;
}

// ============================================
// SESSION FILTERS
// ============================================

export interface SessionFilter {
  model?: string;
  workingDirectory?: string;
  minMessages?: number;
  maxAge?: number; // milliseconds
  since?: number; // timestamp
}

// ============================================
// SESSION EVENTS
// ============================================

export type SessionEventType =
  | "created"
  | "resumed"
  | "message_saved"
  | "metrics_saved"
  | "checkpoint_created"
  | "deleted";

export interface SessionEvent {
  type: SessionEventType;
  sessionId: string;
  timestamp: number;
  data?: unknown;
}

export type SessionEventHandler = (event: SessionEvent) => void | Promise<void>;

// ============================================
// PERSISTENCE INTERFACE
// ============================================

export interface ISessionPersistence {
  init(): Promise<void>;
  read(sessionId: string): Promise<SessionEntry[]>;
  append(sessionId: string, entry: SessionEntry | SessionMetadata): Promise<void>;
  delete(sessionId: string): Promise<boolean>;
  exists(sessionId: string): Promise<boolean>;
  listFiles(): Promise<string[]>;
}

// ============================================
// EXPORT INTERFACE
// ============================================

export type ExportFormat = "jsonl" | "json" | "markdown";

export interface ISessionExporter {
  export(session: LoadedSession, format: ExportFormat): string;
  exportToFile(
    sessionId: string,
    format: ExportFormat,
    outputPath?: string
  ): Promise<string>;
}
