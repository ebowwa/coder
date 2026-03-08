/**
 * Native terminal input hook
 *
 * Reads key events from stdin without managing raw mode.
 * Ink handles raw mode - we just read the key events.
 *
 * IMPORTANT: This hook does NOT manage raw mode. Ink does that.
 * We only read events from stdin via the native module.
 */

import { useEffect, useRef, useState } from "react";
import { loadNative, type NativeKeyEvent, type TerminalHandle } from "../../../../native/index.js";

interface UseNativeInputOptions {
  /** Whether the hook is active (default: true) */
  isActive?: boolean;
  /** Callback for key events */
  onKey: (event: NativeKeyEvent) => void;
}

interface UseNativeInputResult {
  /** Whether the terminal is ready for input */
  isReady: boolean;
  /** Whether there was an error initializing */
  error: Error | null;
}

/**
 * React hook for terminal keyboard input
 *
 * Uses native Rust TerminalHandle to read key events from stdin.
 * Does NOT manage raw mode - let Ink handle that.
 *
 * @example
 * ```tsx
 * useNativeInput({
 *   isActive: !isLoading,
 *   onKey: (event) => {
 *     if (KeyEvents.isEnter(event)) {
 *       handleSubmit();
 *     } else if (KeyEvents.isPrintable(event)) {
 *       handleChar(event.code);
 *     }
 *   },
 * });
 * ```
 */
export function useNativeInput({
  isActive = true,
  onKey,
}: UseNativeInputOptions): UseNativeInputResult {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const onKeyRef = useRef(onKey);
  const terminalRef = useRef<TerminalHandle | null>(null);
  const runningRef = useRef(false);

  // Keep callback ref updated
  useEffect(() => {
    onKeyRef.current = onKey;
  }, [onKey]);

  // Initialize terminal and start polling loop
  useEffect(() => {
    if (!isActive) {
      runningRef.current = false;
      setIsReady(false);
      return;
    }

    // Get terminal handle from native module
    const native = loadNative();
    let terminal: TerminalHandle;
    try {
      terminal = native.create_terminal();
      terminalRef.current = terminal;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      return;
    }

    // DON'T enter raw mode - Ink handles that
    // Just mark as ready and start polling
    setIsReady(true);
    runningRef.current = true;

    // Polling loop using setImmediate-like behavior
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const poll = () => {
      if (!runningRef.current) return;

      try {
        // Poll with 16ms timeout (60fps) for responsive input
        // Use non-blocking read - returns null if no event available
        const event = terminal.pollEvent(16);
        if (event) {
          onKeyRef.current(event);
        }
      } catch {
        // Ignore polling errors
      }

      // Continue polling with a small delay to prevent tight loop
      if (runningRef.current) {
        timeoutId = setTimeout(poll, 16);
      }
    };

    // Start polling
    poll();

    // Cleanup: stop polling (no raw mode to exit - Ink handles that)
    return () => {
      runningRef.current = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      terminalRef.current = null;
      setIsReady(false);
    };
  }, [isActive]);

  return { isReady, error };
}

/**
 * Key event helper functions
 */
export const KeyEvents = {
  /** Check if event is Enter key */
  isEnter(event: NativeKeyEvent): boolean {
    return event.code === "enter" && event.kind === "press";
  },

  /** Check if event is Backspace key */
  isBackspace(event: NativeKeyEvent): boolean {
    return event.code === "backspace" && event.kind === "press";
  },

  /** Check if event is Delete key */
  isDelete(event: NativeKeyEvent): boolean {
    return event.code === "delete" && event.kind === "press";
  },

  /** Check if event is Escape key */
  isEscape(event: NativeKeyEvent): boolean {
    return event.code === "escape" && event.kind === "press";
  },

  /** Check if event is Tab key */
  isTab(event: NativeKeyEvent): boolean {
    return event.code === "tab" && event.kind === "press";
  },

  /** Check if event is BackTab (Shift+Tab) key */
  isBackTab(event: NativeKeyEvent): boolean {
    return event.code === "backtab" && event.kind === "press";
  },

  /** Check if event is Arrow Up key */
  isUp(event: NativeKeyEvent): boolean {
    return event.code === "up" && event.kind === "press";
  },

  /** Check if event is Arrow Down key */
  isDown(event: NativeKeyEvent): boolean {
    return event.code === "down" && event.kind === "press";
  },

  /** Check if event is Arrow Left key */
  isLeft(event: NativeKeyEvent): boolean {
    return event.code === "left" && event.kind === "press";
  },

  /** Check if event is Arrow Right key */
  isRight(event: NativeKeyEvent): boolean {
    return event.code === "right" && event.kind === "press";
  },

  /** Check if event is Page Up key */
  isPageUp(event: NativeKeyEvent): boolean {
    return event.code === "pageup" && event.kind === "press";
  },

  /** Check if event is Page Down key */
  isPageDown(event: NativeKeyEvent): boolean {
    return event.code === "pagedown" && event.kind === "press";
  },

  /** Check if event is Home key */
  isHome(event: NativeKeyEvent): boolean {
    return event.code === "home" && event.kind === "press";
  },

  /** Check if event is End key */
  isEnd(event: NativeKeyEvent): boolean {
    return event.code === "end" && event.kind === "press";
  },

  /** Check if event is Ctrl+C */
  isCtrlC(event: NativeKeyEvent): boolean {
    return event.code === "c" && event.ctrl && event.kind === "press";
  },

  /** Check if event is Ctrl+A (beginning of line) */
  isCtrlA(event: NativeKeyEvent): boolean {
    return event.code === "a" && event.ctrl && event.kind === "press";
  },

  /** Check if event is Ctrl+E (end of line) */
  isCtrlE(event: NativeKeyEvent): boolean {
    return event.code === "e" && event.ctrl && event.kind === "press";
  },

  /** Check if event is a printable character */
  isPrintable(event: NativeKeyEvent): boolean {
    return (
      !event.is_special &&
      !event.ctrl &&
      !event.alt &&
      event.code.length === 1 &&
      event.kind === "press"
    );
  },

  /** Check if event is Shift+Up */
  isShiftUp(event: NativeKeyEvent): boolean {
    return event.code === "up" && event.shift && event.kind === "press";
  },

  /** Check if event is Shift+Down */
  isShiftDown(event: NativeKeyEvent): boolean {
    return event.code === "down" && event.shift && event.kind === "press";
  },
};

export type { NativeKeyEvent, TerminalHandle };
