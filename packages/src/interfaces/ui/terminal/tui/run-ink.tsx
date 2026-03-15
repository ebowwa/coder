/**
 * Pure Ink TUI Runner
 *
 * This is the fallback mode that uses pure Ink rendering.
 * Does NOT support terminal scrollback - only shows current state.
 *
 * Set TUI_MODE=ink to use this mode.
 */

import React from "react";
import { render } from "ink";
import InteractiveTUI, { type InteractiveTUIProps } from "./InteractiveTUI.js";
import {
  suppressConsole,
  restoreConsole,
  replayBuffer,
  type SuppressOptions,
} from "./console.js";

const DEBUG_TUI_BUFFER = process.env.DEBUG_TUI_BUFFER === "true";
const DEBUG_TUI_LOG = process.env.DEBUG_TUI_LOG;

const ENTER_ALT_SCREEN = "\x1b[?1049h";
const EXIT_ALT_SCREEN = "\x1b[?1049l";

/**
 * Run the pure Ink TUI (no scrollback)
 */
export async function runInkTUI(
  options: InteractiveTUIProps,
  suppressOptions?: SuppressOptions
): Promise<void> {
  const opts: SuppressOptions = {
    buffer: DEBUG_TUI_BUFFER || suppressOptions?.buffer || false,
    logFile: DEBUG_TUI_LOG || suppressOptions?.logFile,
    ...suppressOptions,
  };

  suppressConsole(opts);

  // Use alternate screen buffer ONLY if explicitly requested
  const useAltScreen = process.env.TUI_ALT_SCREEN === "true";
  if (useAltScreen) {
    process.stdout.write(ENTER_ALT_SCREEN);
  }

  try {
    const { unmount, waitUntilExit } = render(
      <InteractiveTUI {...options} />,
      {
        exitOnCtrlC: false,
        stdin: process.stdin,
        stdout: process.stdout,
        stderr: process.stderr,
      }
    );

    await waitUntilExit();
    unmount();
  } finally {
    if (useAltScreen) {
      process.stdout.write(EXIT_ALT_SCREEN);
    }
    restoreConsole();

    if (opts.buffer) {
      replayBuffer();
    }
  }
}
