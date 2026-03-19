/**
 * Terminal Control Utilities
 *
 * Provides ANSI escape code sequences for terminal manipulation.
 * Extracted from multiple TUI files to provide a unified interface.
 */

import process from "process";

// ============================================
// TERMINAL CONTROL OBJECT
// ============================================

/**
 * Terminal control utilities using ANSI escape codes
 */
export const TerminalControl = {
  // ============================================
  // SCREEN CONTROL
  // ============================================

  /**
   * Enter alternate screen buffer (isolates TUI from terminal history)
   */
  enterAltScreen: (): void => {
    process.stdout.write("\x1b[?1049h");
  },

  /**
   * Exit alternate screen buffer (restores previous terminal content)
   */
  exitAltScreen: (): void => {
    process.stdout.write("\x1b[?1049l");
  },

  /**
   * Clear entire screen
   */
  clearScreen: (): void => {
    process.stdout.write("\x1b[2J");
  },

  /**
   * Clear screen and move cursor to home (1,1)
   */
  clearScreenAndHome: (): void => {
    process.stdout.write("\x1b[2J\x1b[H");
  },

  // ============================================
  // CURSOR CONTROL
  // ============================================

  /**
   * Hide the cursor
   */
  hideCursor: (): void => {
    process.stdout.write("\x1b[?25l");
  },

  /**
   * Show the cursor
   */
  showCursor: (): void => {
    process.stdout.write("\x1b[?25h");
  },

  /**
   * Move cursor to specific position (1-indexed)
   */
  moveCursor: (row: number, col: number): void => {
    process.stdout.write(`\x1b[${row};${col}H`);
  },

  /**
   * Move cursor up N rows
   */
  moveCursorUp: (rows: number = 1): void => {
    process.stdout.write(`\x1b[${rows}A`);
  },

  /**
   * Move cursor down N rows
   */
  moveCursorDown: (rows: number = 1): void => {
    process.stdout.write(`\x1b[${rows}B`);
  },

  /**
   * Move cursor forward N columns
   */
  moveCursorForward: (cols: number = 1): void => {
    process.stdout.write(`\x1b[${cols}C`);
  },

  /**
   * Move cursor backward N columns
   */
  moveCursorBackward: (cols: number = 1): void => {
    process.stdout.write(`\x1b[${cols}D`);
  },

  /**
   * Move cursor to beginning of line
   */
  moveToLineStart: (): void => {
    process.stdout.write("\r");
  },

  /**
   * Move cursor to column (1-indexed)
   */
  moveToColumn: (col: number): void => {
    process.stdout.write(`\x1b[${col}G`);
  },

  // ============================================
  // LINE CONTROL
  // ============================================

  /**
   * Clear entire line
   */
  clearLine: (): void => {
    process.stdout.write("\x1b[2K");
  },

  /**
   * Clear line from cursor to end
   */
  clearLineRight: (): void => {
    process.stdout.write("\x1b[0K");
  },

  /**
   * Clear line from beginning to cursor
   */
  clearLineLeft: (): void => {
    process.stdout.write("\x1b[1K");
  },

  // ============================================
  // SCROLL CONTROL
  // ============================================

  /**
   * Scroll screen up N lines
   */
  scrollUp: (lines: number = 1): void => {
    process.stdout.write(`\x1b[${lines}S`);
  },

  /**
   * Scroll screen down N lines
   */
  scrollDown: (lines: number = 1): void => {
    process.stdout.write(`\x1b[${lines}T`);
  },

  // ============================================
  // STYLE CONTROL
  // ============================================

  /**
   * Reset all styles to default
   */
  resetStyle: (): void => {
    process.stdout.write("\x1b[0m");
  },

  /**
   * Save cursor position
   */
  saveCursor: (): void => {
    process.stdout.write("\x1b[s");
  },

  /**
   * Restore cursor position
   */
  restoreCursor: (): void => {
    process.stdout.write("\x1b[u");
  },

  // ============================================
  // MOUSE CONTROL
  // ============================================

  /**
   * Enable mouse reporting (SGR extended mode)
   */
  enableMouse: (): void => {
    process.stdout.write("\x1b[?1000h\x1b[?1006h");
  },

  /**
   * Disable mouse reporting
   */
  disableMouse: (): void => {
    process.stdout.write("\x1b[?1000l\x1b[?1006l");
  },

  // ============================================
  // TERMINAL INFO
  // ============================================

  /**
   * Get terminal size
   */
  getSize: (): { rows: number; columns: number } => {
    return {
      rows: process.stdout.rows ?? 24,
      columns: process.stdout.columns ?? 80,
    };
  },

  /**
   * Check if stdout is a TTY
   */
  isTTY: (): boolean => {
    return process.stdout.isTTY ?? false;
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Setup terminal for TUI mode
 * Returns cleanup function
 */
export function setupTerminal(): () => void {
  TerminalControl.enterAltScreen();
  TerminalControl.hideCursor();
  TerminalControl.clearScreen();

  return () => {
    TerminalControl.showCursor();
    TerminalControl.exitAltScreen();
  };
}

/**
 * Write styled text to terminal
 */
export function styledWrite(text: string, style: string): void {
  process.stdout.write(`${style}${text}\x1b[0m`);
}

/**
 * ANSI color codes
 */
export const Colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  underline: "\x1b[4m",

  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",

  bgBlack: "\x1b[40m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
  bgWhite: "\x1b[47m",
};
