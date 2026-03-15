/**
 * UI Components for Coder CLI
 */

// ============================================
// SPINNER
// ============================================

// Spinner (main implementation)
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
} from "./spinner.js";

// Spinner frames from TUI
export {
  spinnerFrames,
  dotSpinnerFrames,
  asciiSpinnerFrames,
  arrowSpinnerFrames,
  simpleDotFrames,
} from "./terminal/tui/spinner.js";

// ============================================
// LOADING STATE
// ============================================

// Loading State (from shared)
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
} from "./terminal/shared/loading-state.js";

// ============================================
// STATUS LINE
// ============================================

// Status Line (from shared)
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
} from "./terminal/shared/status-line.js";

// ============================================
// UTILITIES
// ============================================

export {
  genId,
  resetMessageId,
} from "./utils/id.js";

export {
  estimateTokens,
  estimateMessagesTokens,
} from "./utils/tokens.js";

export {
  apiToText,
  formatElapsedTime,
  formatLoadingMessage,
  formatBytes,
} from "./utils/format.js";

// ============================================
// COMPONENTS
// ============================================

export {
  ToolDisplay,
  MessageList,
  InputField,
  useInputWithHistory,
} from "./components/index.js";

// ============================================
// NATIVE TUI RENDERER
// ============================================

// Native TUI rendering bridge (Rust-backed)
export {
  // Colors
  Colors,
  // Styles
  Styles,
  StyleBuilder,
  // Text
  Text,
  // Borders & Padding
  Borders,
  Padding,
  // Drawing
  Draw,
  // Rendering
  Render,
  // Terminal Control
  Terminal,
  // High-level functions
  renderMessage,
  renderStatusBar,
  renderSeparator,
  styledLine,
  // Screen manager
  TuiScreen,
  // Types
  type TuiStyle,
  type TuiColor,
  type TuiRgb,
  type TuiModifiers,
  type TuiTextSegment,
  type TuiTextLine,
  type TuiTextBlock,
  type TuiBorders,
  type TuiPadding,
  type MessageOptions,
} from "./terminal/tui/tui-renderer.js";

// ============================================
// PROGRESS CALLBACK TYPES
// ============================================

/**
 * Progress update for tool execution
 */
export interface ProgressUpdate {
  toolName: string;
  status: "pending" | "running" | "complete" | "error";
  message?: string;
  progress?: number; // 0-100
  timestamp: number;
}

/**
 * Progress callback type for tool context
 */
export type ProgressCallback = (update: ProgressUpdate) => void;

/**
 * Create a progress callback for a specific tool
 */
export function createProgressCallback(
  toolName: string,
  onProgress?: ((message: string) => void) | undefined
): ProgressCallback | undefined {
  return (update: ProgressUpdate) => {
    if (onProgress) {
      const message = update.message || `${update.toolName}: ${update.status}`;
      onProgress(message);
    }
  };
}
