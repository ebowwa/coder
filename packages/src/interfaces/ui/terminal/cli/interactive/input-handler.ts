/**
 * Input Handler - Non-React Implementation
 *
 * Centralized keyboard input management extracted from v1 TUI patterns.
 * This is a pure TypeScript class without React dependency.
 *
 * Features:
 * - Priority-based handler registration
 * - Focus system for exclusive input
 * - Block/unblock for loading states
 * - Native key event support
 */

import type { InputManager, InputHandler, InputHandlerOptions, NativeKeyEvent } from "./types.js";
import type { InputEvent } from "../../../../../native/index.js";
import { InputPriority } from "./types.js";

// Re-export for convenience
export type { InputEvent } from "../../../../../native/index.js";

// ============================================
// INPUT EVENT CONVERSION
// ============================================

/**
 * Convert native InputEvent to NativeKeyEvent format
 *
 * The native module returns InputEvent with:
 * - eventType: "key" | "resize" | "none"
 * - key?: string
 * - modifiers?: string (comma-separated like "ctrl,shift")
 *
 * Input handlers expect NativeKeyEvent with:
 * - code: string
 * - ctrl: boolean
 * - alt: boolean
 * - shift: boolean
 * - is_special: boolean
 * - kind: "press" | "release" | "repeat"
 */
export function inputEventToNativeKeyEvent(event: InputEvent): NativeKeyEvent | null {
  // Only convert key events
  if (event.eventType !== "key" || !event.key) {
    return null;
  }

  // Parse modifiers string
  const modifiers = (event.modifiers ?? "").toLowerCase();
  const hasCtrl = modifiers.includes("ctrl") || modifiers.includes("control");
  const hasAlt = modifiers.includes("alt") || modifiers.includes("meta");
  const hasShift = modifiers.includes("shift");

  // Detect special keys
  const specialKeys = new Set([
    "return", "enter", "escape", "tab", "backspace", "delete",
    "up", "down", "left", "right",
    "pageup", "pagedown", "home", "end",
    "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10", "f11", "f12"
  ]);

  const keyLower = event.key.toLowerCase();
  const isSpecial = specialKeys.has(keyLower) || hasCtrl || hasAlt;

  // Normalize key names
  let code = event.key;
  if (keyLower === "return" || keyLower === "enter") code = "Enter";
  else if (keyLower === "escape") code = "Escape";
  else if (keyLower === " ") code = "Space";
  else if (keyLower === "backspace") code = "Backspace";
  else if (keyLower === "delete") code = "Delete";
  else if (keyLower === "tab") code = "Tab";
  else if (keyLower === "up") code = "Up";
  else if (keyLower === "down") code = "Down";
  else if (keyLower === "left") code = "Left";
  else if (keyLower === "right") code = "Right";
  else if (keyLower === "home") code = "Home";
  else if (keyLower === "end") code = "End";
  else if (keyLower === "pageup") code = "PageUp";
  else if (keyLower === "pagedown") code = "PageDown";

  return {
    code,
    is_special: isSpecial,
    ctrl: hasCtrl,
    alt: hasAlt,
    shift: hasShift,
    kind: "press", // Default to press since native doesn't provide this
  };
}

// ============================================
// KEY EVENT DETECTION UTILITIES
// ============================================

/**
 * Static utilities for detecting key events
 * Pattern from v1 TUI's KeyEvents class
 *
 * Note: Native module's NativeKeyEvent has * - code: string (key code/char)
 * - is_special: boolean
 * - ctrl: boolean
 * - kind: "press" | "release" | "repeat"
 */
export const KeyEvents = {
  /** Check if event is Enter key */
  isEnter(event: NativeKeyEvent): boolean {
    return event.code === "return" || event.code === "Enter";
  },

  /** Check if event is Escape key */
  isEscape(event: NativeKeyEvent): boolean {
    return event.code === "escape" || event.code === "Escape";
  },

  /** Check if event is Tab key */
  isTab(event: NativeKeyEvent): boolean {
    return event.code === "tab" || event.code === "Tab";
  },

  /** Check if event is Backspace key */
  isBackspace(event: NativeKeyEvent): boolean {
    return event.code === "backspace" || event.code === "Backspace" || event.code === "DEL";
  },

  /** Check if event is Delete key */
  isDelete(event: NativeKeyEvent): boolean {
    return event.code === "delete" || event.code === "Delete" || event.code === "DEL";
  },

  /** Check if event is Up arrow */
  isUp(event: NativeKeyEvent): boolean {
    return event.code === "up" || event.code === "Up";
  },

  /** Check if event is Down arrow */
  isDown(event: NativeKeyEvent): boolean {
    return event.code === "down" || event.code === "Down";
  },

  /** Check if event is Left arrow */
  isLeft(event: NativeKeyEvent): boolean {
    return event.code === "left" || event.code === "Left";
  },

  /** Check if event is Right arrow */
  isRight(event: NativeKeyEvent): boolean {
    return event.code === "right" || event.code === "Right";
  },

  /** Check if event is Page Up */
  isPageUp(event: NativeKeyEvent): boolean {
    return event.code === "pageup" || event.code === "PageUp";
  },

  /** Check if event is Page Down */
  isPageDown(event: NativeKeyEvent): boolean {
    return event.code === "pagedown" || event.code === "PageDown";
  },

  /** Check if event is Home key */
  isHome(event: NativeKeyEvent): boolean {
    return event.code === "home" || event.code === "Home";
  },

  /** Check if event is End key */
  isEnd(event: NativeKeyEvent): boolean {
    return event.code === "end" || event.code === "End";
  },

  /** Check if event is Ctrl+C */
  isCtrlC(event: NativeKeyEvent): boolean {
    return event.ctrl === true && (event.code === "c" || event.code === "C");
  },

  /** Check if event is Ctrl+D */
  isCtrlD(event: NativeKeyEvent): boolean {
    return event.ctrl === true && (event.code === "d" || event.code === "D");
  },

  /** Check if event is Ctrl+A */
  isCtrlA(event: NativeKeyEvent): boolean {
    return event.ctrl === true && (event.code === "a" || event.code === "A");
  },

  /** Check if event is Ctrl+E */
  isCtrlE(event: NativeKeyEvent): boolean {
    return event.ctrl === true && (event.code === "e" || event.code === "E");
  },

  /** Check if event is Shift+Up */
  isShiftUp(event: NativeKeyEvent): boolean {
    // Note: Native module doesn't have shift modifier in NativeKeyEvent
    // For now, check if up arrow (without ctrl check since we can't detect shift)
    return event.code === "up" || event.code === "Up";
  },

  /** Check if event is Shift+Down */
  isShiftDown(event: NativeKeyEvent): boolean {
    // Note: Similar to Shift+Up
    return event.code === "down" || event.code === "Down";
  },

  /** Check if event is Space key */
  isSpace(event: NativeKeyEvent): boolean {
    return event.code === " " || event.code === "Space";
  },

  /** Check if event is a printable character */
  isPrintable(event: NativeKeyEvent): boolean {
    if (event.is_special) return false;
    const code = event.code;
    // Space is printable (normalized to "Space" but should work in text input)
    if (code === " " || code === "Space") return true;
    // Single character that is not a control character
    return code.length === 1 && !event.ctrl;
  },

  /** Get the character from the event */
  getChar(event: NativeKeyEvent): string {
    // Handle normalized space
    if (event.code === "Space") return " ";
    return event.code;
  },
};

// ============================================
// INPUT MANAGER CLASS
// ============================================

/**
 * Non-React input manager implementation
 *
 * Usage:
 * ```ts
 * const input = new InputManagerImpl();
 *
 * // Register a handler
 * const unregister = input.register({
 *   id: "main-input",
 *   priority: InputPriority.INPUT,
 *   handler: (event) => {
 *     if (KeyEvents.isEnter(event)) {
 *       console.log("Enter pressed");
 *       return true; // consume
 *     }
 *     return false; // pass through
 *   },
 * });
 *
 * // Dispatch events
 * input.dispatch(nativeKeyEvent);
 *
 * // Cleanup
 * unregister();
 * ```
 */
export class InputManagerImpl implements InputManager {
  private _handlers: Map<string, InputHandlerOptions> = new Map();
  private _focusedId: string | null = null;
  private _isBlocked = false;
  private _listeners: Set<() => void> = new Set();

  /** Get currently focused handler ID */
  get focusedId(): string | null {
    return this._focusedId;
  }

  /** Whether input is currently blocked */
  get isBlocked(): boolean {
    return this._isBlocked;
  }

  /**
   * Register an input handler
   * Returns unregister function
   */
  register(options: InputHandlerOptions): () => void {
    const { id } = options;
    this._handlers.set(id, options);

    // If no focus set, focus this handler
    if (!this._focusedId) {
      this._focusedId = id;
      this._notify();
    }

    // Return unregister function
    return () => {
      this._handlers.delete(id);
      if (this._focusedId === id) {
        // Focus next available handler (highest priority)
        const remaining = Array.from(this._handlers.values())
          .filter((h) => h.isActive !== false)
          .sort((a, b) => (b.priority ?? 1) - (a.priority ?? 1));
        this._focusedId = remaining[0]?.id ?? null;
        this._notify();
      }
    };
  }

  /**
   * Set focus to a specific handler
   */
  focus(handlerId: string): void {
    if (this._handlers.has(handlerId)) {
      this._focusedId = handlerId;
      this._notify();
    }
  }

  /**
   * Dispatch a key event to handlers
   * Returns true if consumed, false if not
   */
  dispatch(event: NativeKeyEvent): boolean {
    if (this._isBlocked) return false;

    // Get all active handlers sorted by priority (highest first)
    const activeHandlers = Array.from(this._handlers.values())
      .filter((h) => h.isActive !== false)
      .sort((a, b) => (b.priority ?? 1) - (a.priority ?? 1));

    // First, try the focused handler
    if (this._focusedId) {
      const focused = this._handlers.get(this._focusedId);
      if (focused?.isActive !== false && focused?.handler) {
        const consumed = focused.handler(event);
        if (consumed) return true;
      }
    }

    // Then try other handlers by priority
    for (const h of activeHandlers) {
      if (h.id === this._focusedId) continue; // Already tried
      const consumed = h.handler(event);
      if (consumed) return true;
    }

    return false;
  }

  /**
   * Block/unblock input (for loading states)
   */
  setBlocked(blocked: boolean): void {
    this._isBlocked = blocked;
    this._notify();
  }

  /**
   * Subscribe to focus/blocked state changes
   */
  subscribe(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of a change
   */
  private _notify(): void {
    for (const listener of this._listeners) {
      try {
        listener();
      } catch (err) {
        console.error("InputManager listener error:", err);
      }
    }
  }
}

// ============================================
// SINGLETON (optional convenience)
// ============================================

let globalInputManager: InputManagerImpl | null = null;

/**
 * Get or create the global input manager
 */
export function getInputManager(): InputManagerImpl {
  if (!globalInputManager) {
    globalInputManager = new InputManagerImpl();
  }
  return globalInputManager;
}

/**
 * Reset the global input manager (for testing)
 */
export function resetInputManager(): void {
  globalInputManager = null;
}

// ============================================
// EXPORTS
// ============================================

export { InputPriority };
export type { InputManager, InputHandler, InputHandlerOptions, NativeKeyEvent } from "./types.js";
