/**
 * UI Components for Coder CLI
 */

// Spinner
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

// Interactive CLI (non-React, from interactive module)
export {
  InteractiveRunner,
  runInteractiveMode,
  MessageStoreImpl,
  InputManagerImpl,
  KeyEvents,
  InputPriority,
  type InteractiveRunnerProps,
  type InteractiveState,
  type UIMessage,
  type MessageSubType,
  type MessageStore,
  type InputManager,
  type InputHandler,
  type InputHandlerOptions,
  type NativeKeyEvent,
} from "./terminal/cli/interactive/index.js";

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
  onProgress?: (message: string) => void
): ProgressCallback {
  return (update: ProgressUpdate) => {
    if (onProgress) {
      const message = update.message || `${update.toolName}: ${update.status}`;
      onProgress(message);
    }
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format elapsed time for display
 */
export function formatElapsedTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return `${minutes}m${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h${remainingMinutes}m`;
}

/**
 * Format a loading message with optional phase
 */
export function formatLoadingMessage(
  phase: string,
  message?: string,
  elapsedTime?: number
): string {
  let result = phase;

  if (message) {
    result = `${result}: ${message}`;
  }

  if (elapsedTime !== undefined && elapsedTime > 0) {
    result = `${result} [${formatElapsedTime(elapsedTime)}]`;
  }

  return result;
}
