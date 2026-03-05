/**
 * Coder - AI-powered terminal coding assistant
 * Main entry point
 */

// Types
export * from "./types/index.js";

// Core
export {
  createMessageStream,
  calculateCost,
  buildSystemPrompt,
  buildCachedMessages,
  calculateCacheMetrics,
} from "./core/api-client.js";
export type { StreamOptionsType as StreamOptions, StreamResultType as StreamResult } from "./core/api-client.js";
export { agentLoop, formatCost, formatMetrics, formatCostBrief, formatCacheMetrics } from "./core/agent-loop.js";
export type { AgentLoopOptions, AgentLoopResult } from "./core/agent-loop.js";

// Permissions (types are re-exported via ./types/index.js)
export {
  PermissionManager,
  assessRiskLevel,
  generateDescription,
  isReadOnlyTool,
  isFileEditTool,
  isSystemTool,
  TOOL_CATEGORIES,
} from "./core/permissions.js";

// Session Store
export {
  SessionStore,
  formatSessionSummary,
  printSessionsList,
} from "./core/session-store.js";
export type {
  SessionMetadata,
  SessionMessage,
  SessionToolUse,
  SessionMetrics,
  SessionContext,
  SessionEntry,
  SessionSummary,
  LoadedSession,
} from "./core/session-store.js";

// Tools
export * from "./ecosystem/tools/index.js";

// MCP (renamed to avoid conflict with MCPClient type)
export { MCPClientImpl } from "./interfaces/mcp/client.js";
export { MCPClientImpl as MCPClient } from "./interfaces/mcp/client.js";

// Hooks
export * from "./ecosystem/hooks/index.js";

// Skills
export * from "./ecosystem/skills/index.js";

// Teammates
export * from "./teammates/index.js";

// Cognitive Security
export * from "./core/cognitive-security/index.js";

// UI Components (exclude types that are already in types/index.js)
export {
  Spinner,
  getSpinner,
  resetSpinner,
  defaultFrames,
  dotFrames,
  arrowFrames,
  defaultTips,
  toolTips,
  streamingTips,
  type SpinnerOptions,
  type SpinnerColor,
  type SpinnerState,
  LoadingState,
  getLoadingState,
  setLoading,
  stopLoading,
  updateLoading,
  startTool,
  endTool,
  type LoadingStateEvents,
  type ProgressUpdate,
  type ProgressCallback,
  createProgressCallback,
  formatElapsedTime,
  formatLoadingMessage,
} from "./interfaces/ui/index.js";

// Native module (Rust)
export * from "./native/index.js";
