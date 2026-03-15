/**
 * Input with history hook
 */

import { useState, useRef, useCallback } from "react";
import type { InputHistoryOptions } from "./types.js";

/**
 * Hook for managing input with command history
 */
export function useInputWithHistory(options: InputHistoryOptions = {}) {
  const { maxHistorySize = 100, initialHistory = [] } = options;

  const [inputValue, setInputValue] = useState("");
  const [cursorPos, setCursorPos] = useState(0);

  // Refs for history (no re-renders needed)
  const historyRef = useRef<string[]>(initialHistory);
  const historyIdxRef = useRef(-1);
  const savedInputRef = useRef("");

  /**
   * Add value to history
   */
  const addToHistory = useCallback((value: string) => {
    if (!value && historyRef.current[0] !== value) {
      historyRef.current = [value, ...historyRef.current].slice(0, maxHistorySize);
    }
  }, [maxHistorySize]);

  /**
   * Navigate history up (older)
   */
  const historyUp = useCallback(() => {
    if (historyRef.current.length > 0) {
      if (historyIdxRef.current === -1) {
        savedInputRef.current = inputValue;
      }
      const newIdx = Math.min(historyIdxRef.current + 1, historyRef.current.length - 1);
      historyIdxRef.current = newIdx;
      const newValue = historyRef.current[newIdx] || "";
      setInputValue(newValue);
      setCursorPos(newValue.length);
      return newValue;
    }
    return inputValue;
  }, [inputValue]);

  /**
   * Navigate history down (newer)
   */
  const historyDown = useCallback(() => {
    if (historyIdxRef.current > 0) {
      const newIdx = historyIdxRef.current - 1;
      historyIdxRef.current = newIdx;
      const newValue = historyRef.current[newIdx] || "";
      setInputValue(newValue);
      setCursorPos(newValue.length);
      return newValue;
    } else if (historyIdxRef.current === 0) {
      historyIdxRef.current = -1;
      setInputValue(savedInputRef.current);
      setCursorPos(savedInputRef.current.length);
      return savedInputRef.current;
    }
    return inputValue;
  }, [inputValue]);

  /**
   * Reset history navigation
   */
  const resetHistoryNav = useCallback(() => {
    historyIdxRef.current = -1;
    savedInputRef.current = "";
  }, []);

  /**
   * Insert character at cursor
   */
  const insertChar = useCallback((char: string) => {
    if (historyIdxRef.current !== -1) {
      historyIdxRef.current = -1;
      savedInputRef.current = "";
    }
    setInputValue(prev => prev.slice(0, cursorPos) + char + prev.slice(cursorPos));
    setCursorPos(p => p + char.length);
  }, [cursorPos]);

  /**
   * Delete character before cursor
   */
  const backspace = useCallback(() => {
    if (cursorPos > 0) {
      setInputValue(prev => prev.slice(0, cursorPos - 1) + prev.slice(cursorPos));
      setCursorPos(p => p - 1);
    }
  }, [cursorPos]);

  /**
   * Delete character at cursor
   */
  const deleteForward = useCallback(() => {
    if (cursorPos < inputValue.length) {
      setInputValue(prev => prev.slice(0, cursorPos) + prev.slice(cursorPos + 1));
    }
  }, [cursorPos, inputValue]);

  /**
   * Move cursor left
   */
  const moveLeft = useCallback(() => {
    setCursorPos(p => Math.max(0, p - 1));
  }, []);

  /**
   * Move cursor right
   */
  const moveRight = useCallback(() => {
    setCursorPos(p => Math.min(inputValue.length, p + 1));
  }, [inputValue]);

  /**
   * Move cursor to start
   */
  const moveHome = useCallback(() => {
    setCursorPos(0);
  }, []);

  /**
   * Move cursor to end
   */
  const moveEnd = useCallback(() => {
    setCursorPos(inputValue.length);
  }, [inputValue]);

  /**
   * Clear input
   */
  const clearInput = useCallback(() => {
    setInputValue("");
    setCursorPos(0);
    resetHistoryNav();
  }, [resetHistoryNav]);

  /**
   * Set input value
   */
  const setValue = useCallback((value: string) => {
    setInputValue(value);
    setCursorPos(value.length);
    resetHistoryNav();
  }, [resetHistoryNav]);

  return {
    // State
    inputValue,
    cursorPos,

    // History operations
    addToHistory,
    historyUp,
    historyDown,
    resetHistoryNav,
    history: historyRef.current,

    // Cursor operations
    insertChar,
    backspace,
    deleteForward,
    moveLeft,
    moveRight,
    moveHome,
    moveEnd,

    // Input operations
    clearInput,
    setValue,
    setInputValue,
    setCursorPos,
  };
}

export type InputWithHistory = ReturnType<typeof useInputWithHistory>;
