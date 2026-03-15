/**
 * TUI Module Exports
 */

// Types
export type {
  InteractiveTUIProps,
  SessionStore,
  ContextInfo,
} from "./types.js";

// Console utilities
export { suppressConsole, restoreConsole, withSuppressedConsole } from "./console.js";

// Spinner utilities
export {
  spinnerFrames,
  dotSpinnerFrames,
  asciiSpinnerFrames,
  arrowSpinnerFrames,
  simpleDotFrames,
  nextFrame,
  getFrame,
  createSpinnerIterator,
} from "./spinner.js";

// Terminal size hook
export { useTerminalSize, type TerminalSize, type UseTerminalSizeOptions } from "./useTerminalSize.js";

// Main TUI component
export {
  default as InteractiveTUI,
  createInteractiveTUI,
  type InteractiveTUIHandle,
} from "./InteractiveTUI.js";

// Scrollable TUI component
export {
  default as ScrollableTUI,
  type ScrollableTUIProps,
} from "./ScrollableTUI.js";

// Runners
export { runInteractiveTUI, runScrollableTUI } from "./run.js";
export { runInkTUI } from "./run-ink.js";
export { runNativeTUI, NativeTUI } from "./run-native.js";
