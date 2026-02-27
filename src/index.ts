/**
 * Claude Code Reimplementation
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
export { agentLoop, formatCost, formatMetrics, formatCacheMetrics } from "./core/agent-loop.js";
export type { AgentLoopOptions, AgentLoopResult } from "./core/agent-loop.js";

// Permissions
export {
  PermissionManager,
  assessRiskLevel,
  generateDescription,
  isReadOnlyTool,
  isFileEditTool,
  isSystemTool,
  TOOL_CATEGORIES,
} from "./core/permissions.js";
export type {
  PermissionMode,
  PermissionDecision,
  PermissionRequest,
  PermissionResult,
  PermissionCache,
  PermissionPromptCallback,
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
export * from "./tools/index.js";

// MCP (renamed to avoid conflict with MCPClient type)
export { MCPClientImpl } from "./mcp/client.js";
export { MCPClientImpl as MCPClient } from "./mcp/client.js";

// Hooks
export * from "./hooks/index.js";

// Skills
export * from "./skills/index.js";

// Teammates
export * from "./teammates/index.js";

// Native module (Rust)
export * from "./native/index.js";
