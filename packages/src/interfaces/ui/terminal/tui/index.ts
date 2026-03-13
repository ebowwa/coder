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

// Runner
export { runInteractiveTUI } from "./run.js";
