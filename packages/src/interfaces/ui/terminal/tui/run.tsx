/**
 * TUI Entry Point
 * Renders and runs the simplified TUI
 *
 * IMPORTANT: Ink manages terminal state (raw mode, stdin).
 */

import React from "react";
import { render } from "ink";
import InteractiveTUI, { type InteractiveTUIProps } from "./InteractiveTUI.js";
import { suppressConsole, restoreConsole } from "./console.js";

/**
 * Run the interactive TUI
 */
export async function runInteractiveTUI(
  options: InteractiveTUIProps
): Promise<void> {
  // Suppress console output to prevent TUI corruption
  suppressConsole();

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
  }
}
