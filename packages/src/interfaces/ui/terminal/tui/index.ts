/**
 * TUI Module Exports
 * Re-exports all components and utilities from the modular TUI package
 */

// Types
export type {
  InteractiveTUIProps,
  SessionStore,
  MessageAreaProps,
  StatusBarProps,
  InputFieldProps,
  TerminalLayout,
  CommandContext,
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

// Components
export { MessageArea } from "./MessageArea.js";
export { StatusBar } from "./StatusBar.js";
export { InputField } from "./InputField.js";

// Hooks
export { useInputHandler as useInputFieldHandler, useExitHandler } from "./useInputHandler.js";

// Commands
export { handleCommand, getHelpText } from "./commands.js";

// Main component and entry point
export { default as InteractiveTUI } from "./InteractiveTUI.js";
export { runInteractiveTUI } from "./run.js";

// TUI App (Ink-based)
export {
  createTUIApp,
  type TUIAppProps,
  type TUIAppHandle,
  type Message as TUIMessage,
} from "./tui-app.js";
export { default as TUIApp } from "./tui-app.js";

// TUI Footer
export {
  TUIFooter,
  getTUIFooter,
  enableTUIFooter,
  disableTUIFooter,
  renderTUIFooter,
  clearTUIFooter,
  ANSI,
  type TUIFooterOptions,
  type TUIFooterState,
} from "./tui-footer.js";

// Input Context (centralized keyboard input management)
export {
  InputProvider,
  useInputContext,
  useInputHandler,
  useInputFocus,
  useInputBlock,
  InputPriority,
  type InputHandler,
  type InputHandlerOptions,
  type InputContextValue,
} from "./InputContext.js";

// Message Store (centralized message state management)
export {
  MessageStoreProvider,
  useMessageStore,
  type UIMessage,
  type MessageSubType,
  type MessageStoreValue,
} from "./MessageStore.js";
