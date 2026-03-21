/**
 * TUI Footer Component
 * Renders a status footer at the bottom of the terminal
 */

import type { PermissionMode } from "../../../../../schemas/index.js";

// ============================================
// ANSI ESCAPE CODES
// ============================================

export const ANSI = {
  SAVE_CURSOR: "\x1b[s",
  RESTORE_CURSOR: "\x1b[u",
  CLEAR_LINE: "\x1b[2K",
  MOVE_TO: (row: number, col: number) => `\x1b[${row};${col}H`,
  MOVE_TO_BOTTOM: (offset: number = 0) => `\x1b[999;1H\x1b[${offset + 1}A`,
  HIDE_CURSOR: "\x1b[?25l",
  SHOW_CURSOR: "\x1b[?25h",
  RESET: "\x1b[0m",
  BOLD: "\x1b[1m",
  DIM: "\x1b[2m",
};

// ============================================
// TYPES
// ============================================

export interface TUIFooterOptions {
  permissionMode: PermissionMode;
  model?: string;
  tokensUsed?: number;
  maxTokens?: number;
  isLoading?: boolean;
  width?: number;
}

interface TerminalSize {
  width: number;
  height: number;
}

// ============================================
// FOOTER MANAGER CLASS
// ============================================

class FooterManager {
  private enabled = false;
  private options: TUIFooterOptions | null = null;
  private lastRender = "";
  private spinnerInterval: ReturnType<typeof setInterval> | null = null;
  private spinnerFrame = 0;
  private static instance: FooterManager | null = null;

  private constructor() {}

  static getInstance(): FooterManager {
    if (!FooterManager.instance) {
      FooterManager.instance = new FooterManager();
    }
    return FooterManager.instance;
  }

  static reset(): void {
    if (FooterManager.instance) {
      FooterManager.instance.stopSpinner();
      FooterManager.instance.enabled = false;
      FooterManager.instance.options = null;
      FooterManager.instance.lastRender = "";
    }
    FooterManager.instance = new FooterManager();
  }

  enable(): this {
    this.enabled = true;
    return this;
  }

  disable(): void {
    this.enabled = false;
    this.stopSpinner();
    this.clear();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getTerminalSize(): TerminalSize {
    // Try to get actual terminal size, fall back to defaults
    try {
      return {
        width: process.stdout.columns ?? 80,
        height: process.stdout.rows ?? 24,
      };
    } catch {
      return { width: 80, height: 24 };
    }
  }

  setOptions(options: TUIFooterOptions): void {
    this.options = options;
  }

  getOptions(): TUIFooterOptions | null {
    return this.options;
  }

  render(options?: TUIFooterOptions): string {
    if (options) {
      this.options = options;
    }

    if (!this.enabled || !this.options) {
      return "";
    }

    const { permissionMode, model, tokensUsed = 0, isLoading = false, width } = this.options;
    const terminalWidth = width ?? this.getTerminalSize().width;

    const parts: string[] = [];

    // Permission mode
    const modeDisplay = this.formatPermissionMode(permissionMode);
    parts.push(modeDisplay);

    // Model if provided
    if (model) {
      parts.push(this.formatModel(model));
    }

    // Token usage
    if (tokensUsed > 0) {
      parts.push(this.formatTokens(tokensUsed));
    }

    // Loading indicator
    let footer = parts.join(" | ");
    if (isLoading) {
      footer = `${ANSI.DIM}⠋${ANSI.RESET} ${footer}`;
    }

    // Truncate to width
    if (footer.length > terminalWidth) {
      footer = footer.substring(0, terminalWidth - 3) + "...";
    }

    this.lastRender = footer;
    return footer;
  }

  renderLoading(options: TUIFooterOptions): string {
    return this.render({ ...options, isLoading: true });
  }

  private formatPermissionMode(mode: PermissionMode): string {
    const modeLabels: Record<PermissionMode, string> = {
      default: "○ default",
      ask: "? ask",
      acceptEdits: "✓ accept edits",
      bypassPermissions: "⚡ bypass",
      bypass: "⚡ bypass",
      dontAsk: "✗ dontAsk",
      interactive: "💬 interactive",
      plan: "📋 plan",
      auto: "⚡ auto",
    };
    return modeLabels[mode] ?? mode;
  }

  private formatModel(model: string): string {
    // Simplify model name
    if (model.includes("opus")) return "Opus";
    if (model.includes("sonnet")) return "Sonnet";
    if (model.includes("haiku")) return "Haiku";
    return model.split("-").pop() ?? model;
  }

  private formatTokens(tokens: number): string {
    if (tokens < 1000) return `${tokens}t`;
    if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}k`;
    return `${(tokens / 1000000).toFixed(1)}M`;
  }

  startSpinner(options: TUIFooterOptions): void {
    this.stopSpinner();
    this.options = options;

    const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

    this.spinnerInterval = setInterval(() => {
      if (!this.enabled || !this.options) return;

      const frame = frames[this.spinnerFrame % frames.length];
      this.spinnerFrame++;

      // Build footer with spinner
      const { permissionMode, model, tokensUsed = 0, width } = this.options;
      const terminalWidth = width ?? this.getTerminalSize().width;

      const parts: string[] = [this.formatPermissionMode(permissionMode)];
      if (model) parts.push(this.formatModel(model));
      if (tokensUsed > 0) parts.push(this.formatTokens(tokensUsed));

      let footer = `${frame} ${parts.join(" | ")}`;
      if (footer.length > terminalWidth) {
        footer = footer.substring(0, terminalWidth - 3) + "...";
      }

      // Write to terminal
      process.stdout.write(ANSI.SAVE_CURSOR);
      process.stdout.write(ANSI.MOVE_TO_BOTTOM(0));
      process.stdout.write(ANSI.CLEAR_LINE);
      process.stdout.write(footer);
      process.stdout.write(ANSI.RESTORE_CURSOR);

      this.lastRender = footer;
    }, 80);
  }

  stopSpinner(): void {
    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
      this.spinnerInterval = null;
    }
    this.spinnerFrame = 0;
  }

  updateTokens(tokens: number): void {
    if (this.options) {
      this.options.tokensUsed = tokens;
      if (this.enabled) {
        this.render();
      }
    }
  }

  setLoading(loading: boolean): void {
    if (this.options) {
      this.options.isLoading = loading;
      if (this.enabled) {
        this.render();
      }
    }
  }

  clear(): void {
    if (this.lastRender && this.enabled) {
      process.stdout.write(ANSI.SAVE_CURSOR);
      process.stdout.write(ANSI.MOVE_TO_BOTTOM(0));
      process.stdout.write(ANSI.CLEAR_LINE);
      process.stdout.write(ANSI.RESTORE_CURSOR);
    }
    this.lastRender = "";
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const TUIFooter = FooterManager;

// Convenience functions
export function getTUIFooter(): FooterManager {
  return FooterManager.getInstance();
}

export function enableTUIFooter(): FooterManager {
  const footer = FooterManager.getInstance();
  footer.enable();
  return footer;
}

export function disableTUIFooter(): void {
  FooterManager.getInstance().disable();
}
