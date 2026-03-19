/**
 * Core TUI Module
 *
 * Provides shared logic for terminal UI implementations.
 * Extracted from interfaces/ui/terminal/tui/ to separate concerns.
 *
 * @module core/tui
 */

// ============================================
// TYPE EXPORTS
// ============================================

export type {
  TUIStateSnapshot,
  TUIStateData,
  TUIStateCallbacks,
  ParsedCommand,
  CommandContext,
  CommandResult,
  InputManagerOptions,
  HistoryNavigationResult,
  TerminalSize,
  CursorPosition,
} from "./types.js";

// ============================================
// UTILITY EXPORTS
// ============================================

export {
  genId,
  resetIdCounter,
  estimateTokens,
  estimateMessagesTokens,
  apiToText,
  formatTokenCount,
  formatCost,
  formatBytes,
} from "./token-utils.js";

export {
  TerminalControl,
  setupTerminal,
  styledWrite,
  Colors,
} from "./terminal-control.js";

// ============================================
// CLASS EXPORTS
// ============================================

export { TUIState } from "./tui-state.js";
export { CommandHandler, HELP_TEXT } from "./command-handler.js";
export { InputManager } from "./input-manager.js";
