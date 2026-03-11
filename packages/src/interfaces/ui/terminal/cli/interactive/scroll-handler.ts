/**
 * Scroll Handler - Chat History Scrolling
 *
 * Manages scroll state for the chat message history.
 * Scroll offset represents how many messages to "hide" from the bottom (newer messages).
 *
 * scrollOffset = 0  -> Show latest messages (bottom)
 * scrollOffset > 0 -> Show older messages (scrolled up)
 */

import type { NativeKeyEvent } from "./types.js";
import { KeyEvents } from "./input-handler.js";

// ============================================
// TYPES
// ============================================

export interface ScrollState {
  /** Number of messages hidden from bottom (0 = show latest) */
  offset: number;
}

export interface ScrollConfig {
  /** Messages to scroll per PageUp/PageDown */
  pageScrollAmount: number;
  /** Messages to scroll per Shift+Up/Down */
  lineScrollAmount: number;
}

// ============================================
// DEFAULTS
// ============================================

export const DEFAULT_SCROLL_CONFIG: ScrollConfig = {
  pageScrollAmount: 3,
  lineScrollAmount: 1,
};

// ============================================
// SCROLL HANDLER CLASS
// ============================================

/**
 * Handles chat history scrolling with keyboard input
 *
 * Usage:
 * ```ts
 * const scrollHandler = new ScrollHandler();
 *
 * // In input handler
 * const result = scrollHandler.handleKeyEvent(event, totalMessages);
 * if (result.handled) {
 *   state.scrollOffset = result.newOffset;
 * }
 * ```
 */
export class ScrollHandler {
  private config: ScrollConfig;
  private _offset: number = 0;

  constructor(config: Partial<ScrollConfig> = {}) {
    this.config = { ...DEFAULT_SCROLL_CONFIG, ...config };
  }

  /** Current scroll offset */
  get offset(): number {
    return this._offset;
  }

  /** Set scroll offset directly */
  set offset(value: number) {
    this._offset = Math.max(0, value);
  }

  /**
   * Handle a keyboard event for scrolling
   * Returns the new offset and whether it event was handled
   */
  handleKeyEvent(
    event: NativeKeyEvent,
    totalMessages: number
  ): { handled: boolean; newOffset: number } {
    // Shift+Up = scroll up (show older messages, increase offset)
    if (KeyEvents.isUp(event) && event.shift) {
      const maxScroll = this.calculateMaxScroll(totalMessages);
      const newOffset = Math.min(this._offset + this.config.lineScrollAmount, maxScroll);
      this._offset = newOffset;
      return { handled: true, newOffset };
    }

    // Shift+Down = scroll down (show newer messages, decrease offset)
    if (KeyEvents.isDown(event) && event.shift) {
      const newOffset = Math.max(0, this._offset - this.config.lineScrollAmount);
      this._offset = newOffset;
      return { handled: true, newOffset };
    }

    // PageUp = scroll up by page amount
    if (KeyEvents.isPageUp(event)) {
      const maxScroll = this.calculateMaxScroll(totalMessages);
      const newOffset = Math.min(this._offset + this.config.pageScrollAmount, maxScroll);
      this._offset = newOffset;
      return { handled: true, newOffset };
    }

    // PageDown = scroll down by page amount
    if (KeyEvents.isPageDown(event)) {
      const newOffset = Math.max(0, this._offset - this.config.pageScrollAmount);
      this._offset = newOffset;
      return { handled: true, newOffset };
    }

    // Not a scroll event
    return { handled: false, newOffset: this._offset };
  }

  /**
   * Calculate maximum scroll offset
   * Returns the maximum number of lines you can scroll up
   * This allows scrolling even with a single message
   */
  private calculateMaxScroll(totalMessages: number, estimatedLines: number = 50): number {
    // If we have messages, allow scrolling through all their estimated lines
    // Even 1 message with many lines should be scrollable
    if (totalMessages === 0) return 0;
    // Estimate: each message has ~5 lines on average, minimum 10 lines scrollable
    const estimatedTotalLines = Math.max(totalMessages * 5, 10);
    return Math.max(0, estimatedTotalLines);
  }

  /**
   * Reset scroll to bottom (show latest)
   */
  reset(): void {
    this._offset = 0;
  }

  /**
   * Check if currently scrolled (not at bottom)
   */
  get isScrolled(): boolean {
    return this._offset > 0;
  }

  /**
   * Get scroll info for display
   */
  getScrollInfo(totalMessages: number, visibleCount: number): {
    isScrollable: boolean;
    olderCount: number;
    newerCount: number;
    visibleRange: string;
  } {
    const maxScroll = this.calculateMaxScroll(totalMessages);
    const isScrollable = totalMessages > 1;

    // How many older messages are hidden above the view
    const olderCount = this._offset;

    // How many newer messages are hidden below the view
    const newerCount = Math.max(0, totalMessages - visibleCount - olderCount);

    return {
      isScrollable,
      olderCount,
      newerCount,
      visibleRange: `${visibleCount}/${totalMessages}`,
    };
  }
}

// ============================================
// STANDALONE FUNCTIONS
// ============================================

/**
 * Handle scroll key events (stateless version)
 * Use this if you prefer functional style over class-based
 *
 * Keybindings:
 * - PageUp: scroll up by page (always works)
 * - PageDown: scroll down by page (always works)
 * - Home: reset to bottom (show latest)
 * - Shift+Up/Down: line scroll (may not work in all terminals)
 * - Alt+Up/Down: line scroll (alternative)
 * - Ctrl+Up/Down: line scroll (alternative)
 */
export function handleScrollEvent(
  event: NativeKeyEvent,
  currentOffset: number,
  totalMessages: number,
  config: Partial<ScrollConfig> = {}
): { handled: boolean; newOffset: number } {
  const { pageScrollAmount, lineScrollAmount } = { ...DEFAULT_SCROLL_CONFIG, ...config };

  // Calculate max scroll - allow scrolling even with few messages
  // Minimum scroll range of 10 to handle small terminals
  const maxScroll = Math.max(0, Math.max(totalMessages - 1, 10));

  // Debug: log what we're receiving
  if (process.env.CODER_DEBUG_SCROLL === "1") {
    console.error("[ScrollHandler] Event:", {
      code: event.code,
      shift: event.shift,
      ctrl: event.ctrl,
      alt: event.alt,
      is_special: event.is_special,
    });
  }

  // PageUp = scroll up by page (always works)
  if (KeyEvents.isPageUp(event)) {
    if (process.env.CODER_DEBUG_SCROLL === "1") {
      console.error("[ScrollHandler] PageUp detected, scrolling up");
    }
    return { handled: true, newOffset: Math.min(currentOffset + pageScrollAmount, maxScroll) };
  }

  // PageDown = scroll down by page
  if (KeyEvents.isPageDown(event)) {
    if (process.env.CODER_DEBUG_SCROLL === "1") {
      console.error("[ScrollHandler] PageDown detected, scrolling down");
    }
    return { handled: true, newOffset: Math.max(0, currentOffset - pageScrollAmount) };
  }

  // Home = reset to bottom (show latest)
  if (KeyEvents.isHome(event)) {
    if (process.env.CODER_DEBUG_SCROLL === "1") {
      console.error("[ScrollHandler] Home detected, resetting to bottom");
    }
    return { handled: true, newOffset: 0 };
  }

  // Alt+Up = scroll up (works in most terminals)
  if (KeyEvents.isUp(event) && event.alt) {
    if (process.env.CODER_DEBUG_SCROLL === "1") {
      console.error("[ScrollHandler] Alt+Up detected, scrolling up");
    }
    return { handled: true, newOffset: Math.min(currentOffset + lineScrollAmount, maxScroll) };
  }

  // Alt+Down = scroll down
  if (KeyEvents.isDown(event) && event.alt) {
    if (process.env.CODER_DEBUG_SCROLL === "1") {
      console.error("[ScrollHandler] Alt+Down detected, scrolling down");
    }
    return { handled: true, newOffset: Math.max(0, currentOffset - lineScrollAmount) };
  }

  // Ctrl+Up = scroll up (alternative)
  if (KeyEvents.isUp(event) && event.ctrl) {
    if (process.env.CODER_DEBUG_SCROLL === "1") {
      console.error("[ScrollHandler] Ctrl+Up detected, scrolling up");
    }
    return { handled: true, newOffset: Math.min(currentOffset + lineScrollAmount, maxScroll) };
  }

  // Ctrl+Down = scroll down (alternative)
  if (KeyEvents.isDown(event) && event.ctrl) {
    if (process.env.CODER_DEBUG_SCROLL === "1") {
      console.error("[ScrollHandler] Ctrl+Down detected, scrolling down");
    }
    return { handled: true, newOffset: Math.max(0, currentOffset - lineScrollAmount) };
  }

  // Shift+Up = scroll up (fallback, may not work in all terminals)
  if (KeyEvents.isUp(event) && event.shift) {
    if (process.env.CODER_DEBUG_SCROLL === "1") {
      console.error("[ScrollHandler] Shift+Up detected, scrolling up");
    }
    return { handled: true, newOffset: Math.min(currentOffset + lineScrollAmount, maxScroll) };
  }

  // Shift+Down = scroll down (fallback)
  if (KeyEvents.isDown(event) && event.shift) {
    if (process.env.CODER_DEBUG_SCROLL === "1") {
      console.error("[ScrollHandler] Shift+Down detected, scrolling down");
    }
    return { handled: true, newOffset: Math.max(0, currentOffset - lineScrollAmount) };
  }

  return { handled: false, newOffset: currentOffset };
}
