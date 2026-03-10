/**
 * Spinner Component for Coder CLI
 *
 * Re-exports spinner frames from tui/spinner.ts for backward compatibility.
 */

import ora, { type Ora } from "ora";
import chalk from "chalk";

// Import spinner frames from the single source of truth (shared)
import {
  spinnerFrames,
  dotSpinnerFrames,
  asciiSpinnerFrames,
  arrowSpinnerFrames,
  simpleDotFrames,
} from "./terminal/shared/spinner-frames.js";

// Re-export for external use
export {
  spinnerFrames,
  dotSpinnerFrames,
  asciiSpinnerFrames,
  arrowSpinnerFrames,
  simpleDotFrames,
};

// Legacy aliases for backward compatibility
export const defaultFrames = spinnerFrames;
export const dotFrames = simpleDotFrames;
export const arrowFrames = arrowSpinnerFrames;

// ============================================
// TYPES
// ============================================

export interface SpinnerOptions {
  /** Tip text shown below spinner */
  tip?: string;
  /** Color override */
  color?: SpinnerColor;
  /** Show elapsed time */
  showTime?: boolean;
  /** Tool activity indicator */
  hasActiveTools?: boolean;
  /** Suffix text after spinner */
  suffix?: string;
  /** Verbose mode - show more details */
  verbose?: boolean;
  /** Spinner text prefix */
  prefix?: string;
  /** Disable spinner (for --no-progress) */
  disabled?: boolean;
}

export type SpinnerColor =
  | "cyan"
  | "green"
  | "yellow"
  | "blue"
  | "magenta"
  | "red"
  | "white"
  | "gray";

export interface SpinnerState {
  isSpinning: boolean;
  startTime: number;
  totalPausedMs: number;
  pauseStartTime: number | null;
  currentTip: string;
  responseLength: number;
}

// ============================================
// SPINNER TIPS
// ============================================

/** Rotating tips shown during loading */
export const defaultTips = [
  "Thinking...",
  "Processing...",
  "Analyzing...",
  "Working on it...",
];

/** Tips shown during tool execution */
export const toolTips = [
  "Executing tool...",
  "Running command...",
  "Processing request...",
  "Working...",
];

/** Tips shown during API streaming */
export const streamingTips = [
  "Receiving response...",
  "Streaming...",
  "Getting results...",
];

// ============================================
// SPINNER CLASS
// ============================================

export class Spinner {
  private ora: Ora | null = null;
  private state: SpinnerState;
  private options: SpinnerOptions;
  private tipInterval: Timer | null = null;
  private tipIndex = 0;
  private customTips: string[] = [];

  constructor(options: SpinnerOptions = {}) {
    this.options = {
      color: "cyan",
      showTime: true,
      ...options,
    };

    this.state = {
      isSpinning: false,
      startTime: 0,
      totalPausedMs: 0,
      pauseStartTime: null,
      currentTip: options.tip || "",
      responseLength: 0,
    };
  }

  /**
   * Start the spinner
   */
  start(text?: string): this {
    if (this.options.disabled || this.state.isSpinning) {
      return this;
    }

    this.state.startTime = Date.now();
    this.state.isSpinning = true;

    const spinnerText = this.buildText(text || this.state.currentTip);

    this.ora = ora({
      text: spinnerText,
      spinner: {
        frames: [...spinnerFrames], // Convert readonly tuple to mutable array
        interval: 80,
      },
      color: this.options.color,
      prefixText: this.options.prefix,
    }).start();

    // Start rotating tips if enabled
    if (!this.options.tip && this.customTips.length === 0) {
      this.startTipRotation();
    }

    return this;
  }

  /**
   * Stop the spinner
   */
  stop(options?: { clear?: boolean; text?: string; symbol?: string }): this {
    if (!this.ora || !this.state.isSpinning) {
      return this;
    }

    this.stopTipRotation();

    if (options?.text) {
      if (options?.symbol) {
        this.ora.stopAndPersist({ symbol: options.symbol, text: options.text });
      } else {
        this.ora.succeed(options.text);
      }
    } else if (options?.clear) {
      this.ora.stop();
    } else {
      this.ora.stop();
    }

    this.state.isSpinning = false;
    this.ora = null;

    return this;
  }

  /**
   * Stop with success message
   */
  succeed(text?: string): this {
    return this.stop({ text, symbol: chalk.green("✓") });
  }

  /**
   * Stop with failure message
   */
  fail(text?: string): this {
    return this.stop({ text, symbol: chalk.red("✗") });
  }

  /**
   * Stop with warning message
   */
  warn(text?: string): this {
    return this.stop({ text, symbol: chalk.yellow("⚠") });
  }

  /**
   * Stop with info message
   */
  info(text?: string): this {
    return this.stop({ text, symbol: chalk.blue("ℹ") });
  }

  /**
   * Update spinner text
   */
  update(text: string): this {
    if (this.ora && this.state.isSpinning) {
      this.state.currentTip = text;
      this.ora.text = this.buildText(text);
    }
    return this;
  }

  /**
   * Update the tip text (shown below main text)
   */
  updateTip(tip: string): this {
    this.stopTipRotation();
    this.state.currentTip = tip;
    if (this.ora && this.state.isSpinning) {
      this.ora.text = this.buildText(this.state.currentTip);
    }
    return this;
  }

  /**
   * Set custom tips for rotation
   */
  setTips(tips: string[]): this {
    this.customTips = tips;
    return this;
  }

  /**
   * Update response length (for streaming progress)
   */
  updateResponseLength(length: number): this {
    this.state.responseLength = length;
    if (this.ora && this.state.isSpinning && this.options.verbose) {
      this.ora.text = this.buildText(this.state.currentTip);
    }
    return this;
  }

  /**
   * Set tool activity state
   */
  setToolActivity(active: boolean): this {
    this.options.hasActiveTools = active;
    if (this.ora && this.state.isSpinning) {
      this.ora.text = this.buildText(this.state.currentTip);
    }
    return this;
  }

  /**
   * Pause spinner (for user input, etc.)
   */
  pause(): this {
    if (this.state.isSpinning && !this.state.pauseStartTime) {
      this.state.pauseStartTime = Date.now();
      if (this.ora) {
        this.ora.stop();
      }
    }
    return this;
  }

  /**
   * Resume spinner after pause
   */
  resume(): this {
    if (this.state.pauseStartTime) {
      this.state.totalPausedMs += Date.now() - this.state.pauseStartTime;
      this.state.pauseStartTime = null;
      if (this.ora) {
        this.ora.start();
      }
    }
    return this;
  }

  /**
   * Get elapsed time in seconds (excluding pauses)
   */
  getElapsedSeconds(): number {
    const now = Date.now();
    let elapsed = now - this.state.startTime - this.state.totalPausedMs;

    // Subtract current pause if active
    if (this.state.pauseStartTime) {
      elapsed -= now - this.state.pauseStartTime;
    }

    return Math.floor(elapsed / 1000);
  }

  /**
   * Get current state
   */
  getState(): SpinnerState {
    return { ...this.state };
  }

  /**
   * Check if spinner is active
   */
  isActive(): boolean {
    return this.state.isSpinning;
  }

  /**
   * Clear the spinner line
   */
  clear(): this {
    if (this.ora) {
      this.ora.clear();
    }
    return this;
  }

  /**
   * Render spinner frame manually (for non-TTY)
   */
  renderFrame(): string {
    const frame = spinnerFrames[this.tipIndex % spinnerFrames.length];
    return `${frame} ${this.state.currentTip}`;
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private buildText(baseText: string): string {
    let text = baseText;

    // Add suffix
    if (this.options.suffix) {
      text = `${text} ${this.options.suffix}`;
    }

    // Add elapsed time
    if (this.options.showTime && this.state.startTime > 0) {
      const elapsed = this.getElapsedSeconds();
      if (elapsed > 0) {
        text = `${text} ${chalk.gray(`[${formatTime(elapsed)}]`)}`;
      }
    }

    // Add tool indicator
    if (this.options.hasActiveTools) {
      text = `${chalk.yellow("⚙")} ${text}`;
    }

    // Add response length in verbose mode
    if (this.options.verbose && this.state.responseLength > 0) {
      text = `${text} ${chalk.gray(`(${formatBytes(this.state.responseLength)})`)}`;
    }

    return text;
  }

  private startTipRotation(): void {
    const tips = this.customTips.length > 0 ? this.customTips : defaultTips;
    this.tipIndex = 0;

    this.tipInterval = setInterval(() => {
      this.tipIndex = (this.tipIndex + 1) % tips.length;
      if (this.ora && this.state.isSpinning) {
        this.ora.text = this.buildText(tips[this.tipIndex] ?? "");
      }
    }, 2000);
  }

  private stopTipRotation(): void {
    if (this.tipInterval) {
      clearInterval(this.tipInterval);
      this.tipInterval = null;
    }
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format seconds to human-readable time
 */
function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m${secs}s`;
}

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes}B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let globalSpinner: Spinner | null = null;

/**
 * Get or create global spinner instance
 */
export function getSpinner(options?: SpinnerOptions): Spinner {
  if (!globalSpinner) {
    globalSpinner = new Spinner(options);
  }
  return globalSpinner;
}

/**
 * Reset global spinner (for testing)
 */
export function resetSpinner(): void {
  if (globalSpinner) {
    globalSpinner.stop({ clear: true });
    globalSpinner = null;
  }
}
