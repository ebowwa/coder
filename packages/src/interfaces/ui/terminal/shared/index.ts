/**
 * Shared Terminal Utilities
 * Common code shared between CLI and TUI modes
 */

// Argument parsing
export {
  parseArgs,
  printHelp,
  getApiKey,
  requireApiKey,
  type CLIArgs,
} from "./args.js";

// Session setup
export {
  setupSession,
  loadMCPConfig,
  mcpToolsToToolDefinitions,
  type SessionSetup,
  type SetupOptions,
} from "./setup.js";

// System prompt building
export {
  buildDefaultSystemPrompt,
  buildCompleteSystemPrompt,
  fetchGitStatus,
  type GitStatusInfo,
} from "./system-prompt.js";

// Single query execution
export {
  runSingleQuery,
  type QueryOptions,
} from "./query.js";

// Loading State
export {
  LoadingState,
  getLoadingState,
  setLoading,
  stopLoading,
  updateLoading,
  startTool,
  endTool,
  type LoadingPhase,
  type LoadingStateData,
  type LoadingStateEvents,
} from "./loading-state.js";

// Status Line
export {
  VERSION,
  BUILD_TIME,
  renderStatusLine,
  renderCompactStatusLine,
  renderMinimalStatusLine,
  renderFooterStatus,
  renderAutoCompactWarning,
  calculateContextInfo,
  formatPermissionMode,
  formatTokenCount,
  formatContextPercent,
  getContextWindow,
  shouldShowAutoCompactWarning,
  getModelDisplayName,
  getPermissionModeDisplay,
  type StatusLineOptions,
  type ContextInfo,
} from "./status-line.js";
