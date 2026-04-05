/**
 * Coder - AI-powered terminal coding assistant
 * Main entry point
 */

// Types (from Zod schemas - single source of truth)
export * from "./schemas/index.js";

// Version
export { VERSION, BUILD_TIME, getVersion, getBuildTime } from "./core/version.js";

// Core
export {
  createMessageStream,
  calculateCost,
  buildSystemPrompt,
  buildCachedMessages,
  calculateCacheMetrics,
} from "./core/api-client.js";
export type { StreamOptionsType as StreamOptions, StreamResultType as StreamResult } from "./core/api-client.js";
export {
  agentLoop,
  formatCost,
  formatMetrics,
  formatCostBrief,
  formatCacheMetrics,
} from "./core/agent-loop.js";
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

// Presets
export * from "./ecosystem/presets/index.js";

// Teammates
export * from "./teammates/index.js";

// Cognitive Security
export * from "./ecosystem/cognitive-security/index.js";

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

// Native module (Rust) - export functions and types not in schemas
export {
  native,
  isNativeAvailable,
  highlight_code,
  highlight_markdown,
  list_highlight_languages,
  highlight_diff,
  calculate_diff,
  validate_multi_edits,
  preview_multi_edits,
  apply_multi_edits,
  grep_search,
  grep_count,
  grep_files,
  // Quant functions
  quant,
  quantVersion,
  isQuantAvailable,
  createOHLCV,
  createAMM,
  ammCalculateCost,
  ammPriceImpact,
  lmsrPrice,
  lmsrCost,
  detectArbitrage,
  convertOdds,
  // Types from native module (not duplicated in schemas)
  type TerminalHandle,
  type NativeTuiHandle,
  type NativeModule,
} from "./native/index.js";

// Image processing
export {
  isSharpAvailable,
  checkSharpAvailability,
  IMAGE_EXTENSIONS,
  BINARY_EXCLUSIONS,
  MAX_IMAGE_TOKENS,
  MAX_FILE_SIZE,
  MAX_DIMENSION,
  detectMimeType,
  readImageFile,
  type ImageFileResult,
} from "./core/image.js";

// Context Compaction
export {
  estimateTokens,
  estimateMessagesTokens,
  compactMessages,
  needsCompaction,
  summarizeMessages,
  summarizeWithLLM,
  getCompactionStats,
} from "./core/context-compaction.js";
export type {
  CompactionOptions,
  CompactionResult,
  LLMSummarizationOptions,
} from "./core/context-compaction.js";
