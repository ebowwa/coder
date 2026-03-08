/**
 * Session Store - Backward compatibility layer
 * Re-exports from composable sessions module
 *
 * @deprecated Import from "./sessions/index.js" instead for composable access
 */

// Re-export everything from the new composable module
export {
  SessionStore,
  SessionPersistence,
  SessionMetadataManager,
  SessionExporter,
  formatSessionSummary,
  printSessionsList,
  // Types
  type SessionMetadata,
  type SessionMessage,
  type SessionToolUse,
  type SessionMetrics,
  type SessionContext,
  type SessionCheckpoint,
  type SessionEntry,
  type LoadedSession,
  type SessionSummary,
  type SessionFilter,
  type SessionEvent,
  type SessionEventType,
  type SessionEventHandler,
  type ExportFormat,
  type ISessionPersistence,
  type ISessionExporter,
} from "./sessions/index.js";

// Default export
export { SessionStore as default } from "./sessions/index.js";
