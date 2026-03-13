/**
 * TUI Entry Point
 * Renders and runs the simplified TUI
 *
 * IMPORTANT: Ink manages terminal state (raw mode, stdin).
 *
 * Features:
 * - Console suppression to prevent TUI corruption
 * - Optional buffering for debugging (set DEBUG_TUI_BUFFER=true)
 * - Optional file logging (set DEBUG_TUI_LOG=/path/to/file)
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

// Debug options from environment
const DEBUG_TUI_BUFFER = process.env.DEBUG_TUI_BUFFER === "true";
const DEBUG_TUI_LOG = process.env.DEBUG_TUI_LOG;

/**
 * Run the interactive TUI
 *
 * @param options - TUI configuration
 * @param suppressOptions - Console suppression options
 */
export async function runInteractiveTUI(
  options: InteractiveTUIProps,
  suppressOptions?: SuppressOptions
): Promise<void> {
  // Build suppression options
  const opts: SuppressOptions = {
    // Buffer if explicitly requested or if we need to replay
    buffer: DEBUG_TUI_BUFFER || suppressOptions?.buffer || false,
    // File logging if specified
    logFile: DEBUG_TUI_LOG || suppressOptions?.logFile,
    // Override methods if specified
    ...suppressOptions,
  };

  // Suppress console output to prevent TUI corruption
  suppressConsole(opts);

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
    // Restore console output
    restoreConsole();

    // If buffering was enabled, replay messages for debugging
    if (opts.buffer) {
      replayBuffer();
    }
  }
}
