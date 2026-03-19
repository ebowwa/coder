/**
 * TUI Module Exports
 */

// Types
export type {
  InteractiveTUIProps,
  SessionStore,
  ContextInfo,
  UIMessage,
  MessageSubType,
} from "./types.js";

// Console utilities
export { suppressConsole, restoreConsole, withSuppressedConsole } from "./console.js";

// Spinner utilities
export {
  SPINNERS,
  spinnerFrames,
  dotSpinnerFrames,
  asciiSpinnerFrames,
  arrowSpinnerFrames,
  simpleDotFrames,
  nextFrame,
  getFrame,
  createSpinnerIterator,
} from "./spinner.js";

// Shared helpers
export {
  genId,
  estimateTokens,
  estimateMessagesTokens,
  apiToText,
  HELP_TEXT,
  useTokenCount,
  wrapText,
} from "./helpers.js";

// Terminal size hook
export { useTerminalSize, type TerminalSize, type UseTerminalSizeOptions } from "./useTerminalSize.js";

// Main TUI component
export {
  default as InteractiveTUI,
  createInteractiveTUI,
  type InteractiveTUIHandle,
} from "./InteractiveTUI.js";

// Scrollable TUI component - Removed (file was orphaned, logic moved to core/tui)
// Runners

// Suggestion agent (Cursor-style autocomplete)
export {
  SuggestionAgent,
  getSuggestionAgent,
  destroySuggestionAgent,
  type SuggestionAgentOptions,
  type SuggestionContext,
  type SuggestionResult,
} from "./suggestion-agent.js";

// Runners
export { runInteractiveTUI, runScrollableTUI } from "./run.js";
export { runInkTUI } from "./run-ink.js";
export { runNativeTUI, NativeTUI } from "./run-native.js";
