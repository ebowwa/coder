/**
 * TUI Footer Component for Coder CLI
 * Provides a persistent status bar at the bottom of the terminal
 *
 * Uses ANSI escape codes for cursor positioning:
 * - ESC[s    Save cursor position
 * - ESC[u    Restore cursor position
 * - ESC[#;#H Move cursor to row, col
 * - ESC[2K   Clear entire line
 * - ESC[J    Clear from cursor to end of screen
 */

import chalk from "chalk";
import type { PermissionMode } from "../../../../types/index.js";
import {
  calculateContextInfo,
  formatPermissionMode,
  type StatusLineOptions,
} from "../shared/status-line.js";
import { spinnerFrames } from "./spinner.js";

// ============================================
// ANSI ESCAPE CODES
// ============================================

const ANSI = {
  // Cursor
  SAVE_CURSOR: "\x1b[s",
  RESTORE_CURSOR: "\x1b[u",
  MOVE_TO: (row: number, col: number) => `\x1b[${row};${col}H`,
  MOVE_TO_BOTTOM: (offset = 0) => `\x1b[999;1H\x1b[${offset + 1}A`,

  // Clear
  CLEAR_LINE: "\x1b[2K",
  CLEAR_TO_END: "\x1b[J",
  CLEAR_SCREEN: "\x1b[2J",

  // Scrolling
  SCROLL_UP: (lines: number) => `\x1b[${lines}S`,
  SCROLL_DOWN: (lines: number) => `\x1b[${lines}T`,

  // Colors reset
  RESET: "\x1b[0m",

  // Alternate screen buffer
  ENTER_ALT_SCREEN: "\x1b[?1049h",
  EXIT_ALT_SCREEN: "\x1b[?1049l",

  // Cursor visibility
  HIDE_CURSOR: "\x1b[?25l",
  SHOW_CURSOR: "\x1b[?25h",
};

// Export ANSI for external use
export { ANSI };

// ============================================
// TYPES
// ============================================

export interface TUIFooterOptions {
  /** Permission mode to display */
  permissionMode: PermissionMode;
  /** Tokens used in context */
  tokensUsed: number;
  /** Current model */
  model: string;
  /** Is loading/spinning */
  isLoading?: boolean;
  /** Verbose mode */
  verbose?: boolean;
  /** Show version */
  showVersion?: boolean;
}

export interface TUIFooterState {
  isEnabled: boolean;
  lastRender: string;
  lastOptions: TUIFooterOptions | null;
  renderInterval: Timer | null;
  spinnerFrame: number;
  terminalHeight: number;
  terminalWidth: number;
}

// ============================================
// FOOTER RENDERER
// ============================================

/**
 * Render footer content (without positioning)
 */
function renderFooterContent(options: TUIFooterOptions, spinnerFrame?: string): string {
  const { permissionMode, tokensUsed, model, isLoading, verbose, showVersion } = options;
  const contextInfo = calculateContextInfo(tokensUsed, model);

  // Build status parts
  const parts: string[] = [];

  // 1. Loading spinner if active
  if (isLoading && spinnerFrame) {
    parts.push(chalk.cyan(spinnerFrame));
  }

  // 2. Context percentage with color
  const contextValue = contextInfo.isCritical
    ? chalk.red(`${contextInfo.percentRemaining.toFixed(0)}%`)
    : contextInfo.isLow
      ? chalk.yellow(`${contextInfo.percentRemaining.toFixed(0)}%`)
      : chalk.dim(`${contextInfo.percentRemaining.toFixed(0)}%`);
  parts.push(`Context: ${contextValue}`);

  // 3. Permission mode
  const permDisplay = formatPermissionMode(permissionMode);
  parts.push(permDisplay);

  // 4. Version (if verbose or showVersion)
  if (verbose || showVersion) {
    parts.push(chalk.dim(`v${getVersion()}`));
  }

  return parts.join(chalk.dim(" | "));
}

/**
 * Get VERSION dynamically to avoid circular imports
 */
function getVersion(): string {
  try {
    // Dynamic import to avoid circular dependency
    const statusLine = require("../shared/status-line.js");
    return statusLine.VERSION || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

// ============================================
// TUI FOOTER CLASS
// ============================================

export class TUIFooter {
  private state: TUIFooterState;
  private static instance: TUIFooter | null = null;

  private constructor() {
    this.state = {
      isEnabled: false,
      lastRender: "",
      lastOptions: null,
      renderInterval: null,
      spinnerFrame: 0,
      terminalHeight: process.stdout.rows || 24,
      terminalWidth: process.stdout.columns || 80,
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(): TUIFooter {
    if (!TUIFooter.instance) {
      TUIFooter.instance = new TUIFooter();
    }
    return TUIFooter.instance;
  }

  /**
   * Reset singleton (for testing)
   */
  static reset(): void {
    if (TUIFooter.instance) {
      TUIFooter.instance.disable();
      TUIFooter.instance = null;
    }
  }

  /**
   * Enable the footer (start tracking terminal size)
   */
  enable(): void {
    if (this.state.isEnabled) return;

    this.state.isEnabled = true;
    this.updateTerminalSize();

    // Listen for terminal resize
    process.stdout.on("resize", this.handleResize);
  }

  /**
   * Disable the footer and clear it
   */
  disable(): void {
    if (!this.state.isEnabled) return;

    this.stopSpinner();
    this.clear();

    process.stdout.off("resize", this.handleResize);
    this.state.isEnabled = false;
  }

  /**
   * Check if footer is enabled
   */
  isEnabled(): boolean {
    return this.state.isEnabled;
  }

  /**
   * Update terminal dimensions
   */
  private updateTerminalSize(): void {
    this.state.terminalHeight = process.stdout.rows || 24;
    this.state.terminalWidth = process.stdout.columns || 80;
  }

  /**
   * Handle terminal resize
   */
  private handleResize = (): void => {
    this.updateTerminalSize();
    if (this.state.lastOptions) {
      this.render(this.state.lastOptions);
    }
  };

  /**
   * Render the footer at the bottom of the screen
   * Saves cursor position, moves to bottom, renders, restores cursor
   */
  render(options: TUIFooterOptions): void {
    if (!this.state.isEnabled) return;

    this.state.lastOptions = options;

    // Build footer content
    const content = renderFooterContent(options);

    // Skip if content unchanged (optimization)
    if (content === this.state.lastRender && !options.isLoading) {
      return;
    }

    this.state.lastRender = content;

    // Build ANSI sequence:
    // 1. Save cursor position
    // 2. Move to bottom of screen
    // 3. Clear the line
    // 4. Render footer content
    // 5. Restore cursor position
    const output =
      ANSI.SAVE_CURSOR +
      ANSI.MOVE_TO_BOTTOM() +
      ANSI.CLEAR_LINE +
      "\r" + // Go to start of line
      chalk.dim("┌") +
      content +
      ANSI.RESTORE_CURSOR;

    process.stdout.write(output);
  }

  /**
   * Render with loading spinner animation
   */
  renderLoading(options: TUIFooterOptions): void {
    const frame = spinnerFrames[this.state.spinnerFrame];
    this.state.spinnerFrame = (this.state.spinnerFrame + 1) % spinnerFrames.length;

    const content = renderFooterContent(options, frame);
    this.state.lastRender = content;

    if (!this.state.isEnabled) return;

    const output =
      ANSI.SAVE_CURSOR +
      ANSI.MOVE_TO_BOTTOM() +
      ANSI.CLEAR_LINE +
      "\r" +
      chalk.dim("┌") +
      content +
      ANSI.RESTORE_CURSOR;

    process.stdout.write(output);
  }

  /**
   * Start spinner animation for loading state
   */
  startSpinner(options: TUIFooterOptions, interval = 80): void {
    this.stopSpinner();

    this.state.renderInterval = setInterval(() => {
      this.renderLoading(options);
    }, interval);
  }

  /**
   * Stop spinner animation
   */
  stopSpinner(): void {
    if (this.state.renderInterval) {
      clearInterval(this.state.renderInterval);
      this.state.renderInterval = null;
    }
  }

  /**
   * Clear the footer line
   */
  clear(): void {
    if (!this.state.isEnabled) return;

    const output =
      ANSI.SAVE_CURSOR +
      ANSI.MOVE_TO_BOTTOM() +
      ANSI.CLEAR_LINE +
      ANSI.RESTORE_CURSOR;

    process.stdout.write(output);
    this.state.lastRender = "";
  }

  /**
   * Update just the token count (for incremental updates)
   */
  updateTokens(tokensUsed: number): void {
    if (this.state.lastOptions) {
      this.render({
        ...this.state.lastOptions,
        tokensUsed,
      });
    }
  }

  /**
   * Update loading state
   */
  setLoading(isLoading: boolean): void {
    if (this.state.lastOptions) {
      const options = {
        ...this.state.lastOptions,
        isLoading,
      };

      if (isLoading) {
        this.startSpinner(options);
      } else {
        this.stopSpinner();
        this.render(options);
      }
    }
  }

  /**
   * Get terminal dimensions
   */
  getTerminalSize(): { width: number; height: number } {
    return {
      width: this.state.terminalWidth,
      height: this.state.terminalHeight,
    };
  }
}

// ============================================
// CONVENIENCE EXPORTS
// ============================================

/**
 * Get the global TUI footer instance
 */
export function getTUIFooter(): TUIFooter {
  return TUIFooter.getInstance();
}

/**
 * Enable TUI footer
 */
export function enableTUIFooter(): TUIFooter {
  const footer = TUIFooter.getInstance();
  footer.enable();
  return footer;
}

/**
 * Disable TUI footer
 */
export function disableTUIFooter(): void {
  TUIFooter.getInstance().disable();
}

/**
 * Render footer status (convenience function)
 */
export function renderTUIFooter(options: TUIFooterOptions): void {
  TUIFooter.getInstance().render(options);
}

/**
 * Clear the footer line
 */
export function clearTUIFooter(): void {
  TUIFooter.getInstance().clear();
}

// ============================================
// EXPORTS
// ============================================

export default {
  TUIFooter,
  getTUIFooter,
  enableTUIFooter,
  disableTUIFooter,
  renderTUIFooter,
  clearTUIFooter,
  ANSI,
};
