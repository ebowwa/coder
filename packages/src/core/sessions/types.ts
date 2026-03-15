/**
 * Session Types - Re-exports from schemas for session handling
 */

// Re-export all session types from schemas
export type {
  SessionMetadata,
  SessionMessage,
  SessionToolUse,
  SessionMetrics,
  SessionContext,
  SessionCheckpoint,
  SessionEntry,
  LoadedSession,
  SessionSummary,
  SessionFilter,
  SessionEventType,
  SessionEvent,
  ExportFormat,
} from "../../schemas/index.js";

// Import types for interface definitions
import type {
  SessionMetadata,
  SessionEntry,
  LoadedSession,
  ExportFormat,
} from "../../schemas/index.js";

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

export interface ISessionExporter {
  export(session: LoadedSession, format: ExportFormat): string;
  exportToFile(
    sessionId: string,
    format: ExportFormat,
    outputPath?: string
  ): Promise<string>;
}

// Callback type (not serializable to Zod)
export type SessionEventHandler = (
  event: import("../../schemas/index.js").SessionEvent
) => void | Promise<void>;
