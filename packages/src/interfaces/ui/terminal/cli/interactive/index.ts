/**
 * CLI Interactive Module
 *
 * Non-React implementation of the interactive CLI mode.
 * Extracts core patterns from v1 TUI without the Ink dependency.
 *
 * This module provides:
 * - MessageStore: Centralized message state management
 * - InputManager: Priority-based keyboard input handling
 * - InteractiveRunner: Main interactive loop with agent integration
 * - Type definitions for all components
 *
 * Usage:
 * ```ts
 * import { InteractiveRunner, MessageStoreImpl, InputManagerImpl } from "./interactive/index.js";
 *
 * // Create and run interactive mode
 * const runner = new InteractiveRunner({
 *   apiKey: process.env.API_KEY!,
 *   model: "claude-sonnet-4-6",
 *   // ... other props
 * });
 *
 * await runner.start();
 * ```
 *
 * Architecture:
 * - MessageStore: Single source of truth for messages (non-React)
 * - InputManager: Centralized keyboard input with priority system
 * - InteractiveRunner: Main loop that orchestrates everything
 *
 * Patterns from v1 TUI:
 * - MessageStore pattern: addMessage, addApiMessages, addSystem, clear, replace
 * - InputContext pattern: register, focus, dispatch, blocked state
 * - Clean separation of concerns
 * - Well-defined TypeScript interfaces
 */

// ============================================
// TYPES
// ============================================

export type {
  // Message types
  UIMessage,
  MessageSubType,
  MessageStore,

  // Input types
  InputManager,
  InputHandler,
  InputHandlerOptions,
  NativeKeyEvent,

  // Runner types
  InteractiveRunnerProps,
  InteractiveState,
  SessionStore,
  SessionInfo,
  CommandContext,

  // Context types
  ContextInfo,
} from "./types.js";

export { InputPriority } from "./types.js";

// ============================================
// MESSAGE STORE
// ============================================

export {
  MessageStoreImpl,
  getMessageStore,
  resetMessageStore,
} from "./message-store.js";

// ============================================
// INPUT HANDLER
// ============================================

export {
  InputManagerImpl,
  getInputManager,
  resetInputManager,
  KeyEvents,
} from "./input-handler.js";

// ============================================
// INTERACTIVE RUNNER
// ============================================

import { InteractiveRunner as _InteractiveRunner } from "./interactive-runner.js";

export { _InteractiveRunner as InteractiveRunner };

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Run interactive mode with the given props
 * Convenience function that creates and starts an InteractiveRunner
 */
export async function runInteractiveMode(
  props: import("./types.js").InteractiveRunnerProps
): Promise<void> {
  const runner = new _InteractiveRunner(props);
  await runner.start();
}
