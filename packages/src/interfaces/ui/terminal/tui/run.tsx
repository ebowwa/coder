/**
 * TUI Entry Point
 * Renders and runs the TUI
 *
 * Three modes available:
 * - native (default): Full Rust TUI rendering (best performance)
 * - scrollable: Ink with scrollable viewport
 * - ink: Pure Ink rendering (no scrollback, but reactive UI)
 *
 * Set TUI_MODE=native|scrollable|ink to switch modes.
 */

import type { InteractiveTUIProps } from "./InteractiveTUI.js";
import type { SuppressOptions } from "./console.js";
import { runScrollableTUI } from "./run-scrollable.js";

// Re-export the scrollable runner
export { runScrollableTUI };

/**
 * Run the interactive TUI
 *
 * Uses native mode by default for best performance.
 *
 * @param options - TUI configuration
 * @param suppressOptions - Console suppression options
 */
export async function runInteractiveTUI(
  options: InteractiveTUIProps,
  suppressOptions?: SuppressOptions
): Promise<void> {
  // Use ink mode by default (built on @ebowwa/tui-core)
  // Set TUI_MODE=native for Rust TUI rendering (best performance)
  // Set TUI_MODE=scrollable for Ink-based scrolling
  // Set TUI_MODE=ink for pure Ink mode (no scrollback)
  const mode = process.env.TUI_MODE || "ink";

  if (mode === "native") {
    // Full native Rust TUI rendering
    const { runNativeTUI } = await import("./run-native.js");
    return runNativeTUI(options);
  }

  if (mode === "ink") {
    // Dynamic import to avoid circular deps
    const { runInkTUI } = await import("./run-ink.js");
    return runInkTUI(options, suppressOptions);
  }

  return runScrollableTUI(options, suppressOptions);
}
