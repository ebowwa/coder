/**
 * TUI Input Handler Hook
 * Custom hook for handling keyboard input in TUI
 */

import { useCallback } from "react";
import { useInput } from "ink";

interface UseInputHandlerOptions {
  isLoading: boolean;
  inputValue: string;
  cursorPos: number;
  setInputValue: (value: string | ((prev: string) => string)) => void;
  setCursorPos: (value: number | ((prev: number) => number)) => void;
  onSubmit: (value: string) => void;
  onCommand: (cmd: string) => void;
}

/**
 * Hook for handling keyboard input in the TUI
 */
export function useInputHandler({
  isLoading,
  inputValue,
  cursorPos,
  setInputValue,
  setCursorPos,
  onSubmit,
  onCommand,
}: UseInputHandlerOptions) {
  // Main input handler
  useInput(
    (input, key) => {
      if (isLoading) return;

      // Submit on Enter
      if (key.return) {
        if (inputValue.trim()) {
          if (inputValue.startsWith("/")) {
            onCommand(inputValue);
          } else {
            onSubmit(inputValue);
          }
          setInputValue("");
          setCursorPos(0);
        }
        return;
      }

      // Backspace
      if (key.backspace || key.delete) {
        if (cursorPos > 0) {
          setInputValue((v) => v.slice(0, cursorPos - 1) + v.slice(cursorPos));
          setCursorPos((p) => p - 1);
        }
        return;
      }

      // Arrow keys
      if (key.leftArrow) {
        setCursorPos((p) => Math.max(0, p - 1));
        return;
      }

      if (key.rightArrow) {
        setCursorPos((p) => Math.min(inputValue.length, p + 1));
        return;
      }

      // Home/End keys (Ctrl+A / Ctrl+E)
      if (key.ctrl && input === "a") {
        setCursorPos(0);
        return;
      }

      if (key.ctrl && input === "e") {
        setCursorPos(inputValue.length);
        return;
      }

      // Regular character
      if (input && !key.ctrl && !key.meta) {
        setInputValue((v) => v.slice(0, cursorPos) + input + v.slice(cursorPos));
        setCursorPos((p) => p + input.length);
      }
    },
    { isActive: !isLoading }
  );
}

/**
 * Hook for handling exit shortcuts (Ctrl+C)
 */
export function useExitHandler(onExit: () => void, exit: () => void) {
  useInput(
    (input, key) => {
      if (key.ctrl && input === "c") {
        onExit();
        exit();
      }
    },
    { isActive: true }
  );
}
