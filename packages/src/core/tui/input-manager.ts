/**
 * Input Manager
 *
 * Manages input history navigation and cursor operations.
 * Extracted from TUI implementations to provide unified handling.
 */

import type {
  InputManagerOptions,
  HistoryNavigationResult,
} from "./types.js";

// ============================================
// DEFAULT OPTIONS
// ============================================

const DEFAULT_MAX_HISTORY_SIZE = 100;

// ============================================
// INPUT MANAGER CLASS
// ============================================

/**
 * InputManager handles:
 * - Command history (up/down navigation)
 * - Cursor movement (left/right, home/end)
 * - Text editing (insert, delete)
 *
 * This class is stateless regarding the actual input buffer -
 * it operates on values passed to it and returns new values.
 */
export class InputManager {
  // History state
  private history: string[] = [];
  private historyIndex = -1;
  private savedInput = ""; // Input saved when navigating history
  private maxHistorySize: number;

  constructor(options?: InputManagerOptions) {
    this.maxHistorySize = options?.maxHistorySize ?? DEFAULT_MAX_HISTORY_SIZE;
  }

  // ============================================
  // HISTORY MANAGEMENT
  // ============================================

  /**
   * Add input to history
   */
  addToHistory(input: string): void {
    // Don't add empty input
    if (!input.trim()) return;

    // Don't add duplicates (remove if exists)
    const existingIndex = this.history.indexOf(input);
    if (existingIndex !== -1) {
      this.history.splice(existingIndex, 1);
    }

    // Add to end
    this.history.push(input);

    // Trim if exceeded max size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    // Reset navigation state
    this.resetNavigation();
  }

  /**
   * Navigate up in history (older entries)
   */
  navigateUp(currentInput: string): HistoryNavigationResult {
    if (this.history.length === 0) {
      return { value: currentInput, navigated: false };
    }

    // Save current input on first navigation
    if (this.historyIndex === -1) {
      this.savedInput = currentInput;
    }

    // Move to older entry
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const value = this.history[this.history.length - 1 - this.historyIndex];
      return { value, navigated: true };
    }

    // Already at oldest entry
    return {
      value: this.history[0],
      navigated: false,
    };
  }

  /**
   * Navigate down in history (newer entries)
   */
  navigateDown(): HistoryNavigationResult {
    if (this.historyIndex === -1) {
      // Not navigating, nothing to do
      return { value: "", navigated: false };
    }

    // Move to newer entry
    this.historyIndex--;

    if (this.historyIndex === -1) {
      // Back to saved input
      return { value: this.savedInput, navigated: true };
    }

    const value = this.history[this.history.length - 1 - this.historyIndex];
    return { value, navigated: true };
  }

  /**
   * Reset navigation state
   */
  resetNavigation(): void {
    this.historyIndex = -1;
    this.savedInput = "";
  }

  /**
   * Get history entries (for display/testing)
   */
  getHistory(): readonly string[] {
    return [...this.history];
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    this.history = [];
    this.historyIndex = -1;
    this.savedInput = "";
  }

  // ============================================
  // CURSOR MOVEMENT
  // ============================================

  /**
   * Move cursor left by one character
   */
  moveCursorLeft(pos: number): number {
    return Math.max(0, pos - 1);
  }

  /**
   * Move cursor right by one character
   */
  moveCursorRight(pos: number, textLength: number): number {
    return Math.min(textLength, pos + 1);
  }

  /**
   * Move cursor to start of line
   */
  moveToStart(): number {
    return 0;
  }

  /**
   * Move cursor to end of line
   */
  moveToEnd(textLength: number): number {
    return textLength;
  }

  /**
   * Move cursor left by one word
   */
  moveWordLeft(text: string, pos: number): number {
    if (pos === 0) return 0;

    let i = pos - 1;

    // Skip spaces
    while (i > 0 && text[i] === " ") {
      i--;
    }

    // Skip word characters
    while (i > 0 && text[i - 1] !== " ") {
      i--;
    }

    return i;
  }

  /**
   * Move cursor right by one word
   */
  moveWordRight(text: string, pos: number): number {
    const len = text.length;
    if (pos >= len) return len;

    let i = pos;

    // Skip current word
    while (i < len && text[i] !== " ") {
      i++;
    }

    // Skip spaces
    while (i < len && text[i] === " ") {
      i++;
    }

    return i;
  }

  // ============================================
  // TEXT EDITING
  // ============================================

  /**
   * Insert a character at position
   */
  insertChar(text: string, pos: number, char: string): { text: string; pos: number } {
    const newText = text.slice(0, pos) + char + text.slice(pos);
    return {
      text: newText,
      pos: pos + 1,
    };
  }

  /**
   * Delete character before cursor (backspace)
   */
  deleteCharBefore(text: string, pos: number): { text: string; pos: number } {
    if (pos === 0) {
      return { text, pos };
    }

    const newText = text.slice(0, pos - 1) + text.slice(pos);
    return {
      text: newText,
      pos: pos - 1,
    };
  }

  /**
   * Delete character at cursor (delete key)
   */
  deleteCharAt(text: string, pos: number): { text: string; pos: number } {
    if (pos >= text.length) {
      return { text, pos };
    }

    const newText = text.slice(0, pos) + text.slice(pos + 1);
    return { text: newText, pos };
  }

  /**
   * Delete from cursor to start of line
   */
  deleteToStart(text: string, pos: number): { text: string; pos: number } {
    return {
      text: text.slice(pos),
      pos: 0,
    };
  }

  /**
   * Delete from cursor to end of line
   */
  deleteToEnd(text: string, pos: number): { text: string; pos: number } {
    return {
      text: text.slice(0, pos),
      pos,
    };
  }

  /**
   * Delete word before cursor
   */
  deleteWordBefore(text: string, pos: number): { text: string; pos: number } {
    const newPos = this.moveWordLeft(text, pos);
    const newText = text.slice(0, newPos) + text.slice(pos);
    return { text: newText, pos: newPos };
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Check if currently navigating history
   */
  isNavigating(): boolean {
    return this.historyIndex !== -1;
  }

  /**
   * Get current history index (for debugging)
   */
  getHistoryIndex(): number {
    return this.historyIndex;
  }

  /**
   * Get saved input (for debugging)
   */
  getSavedInput(): string {
    return this.savedInput;
  }
}
