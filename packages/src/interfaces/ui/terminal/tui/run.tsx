/**
 * TUI Entry Point
 * Renders and runs the InteractiveTUI
 *
 * IMPORTANT: Ink manages terminal state (raw mode, stdin).
 * The native input hook reads events without managing raw mode.
 */

import React from "react";
import { render } from "ink";
import InteractiveTUI from "./InteractiveTUI.js";
import { suppressConsole, restoreConsole } from "./console.js";
import type { InteractiveTUIProps } from "./types.js";

/**
 * Run the interactive TUI
 */
export async function runInteractiveTUI(
  options: InteractiveTUIProps
): Promise<void> {
  // Suppress console output to prevent TUI corruption
  suppressConsole();

  // Ink manages raw mode and stdin
  // Native input reads events without touching raw mode
  const { unmount, waitUntilExit } = render(
    <InteractiveTUI {...options} />,
    {
      exitOnCtrlC: false,
      // Ensure Ink uses stdin properly
      stdin: process.stdin,
      stdout: process.stdout,
      stderr: process.stderr,
    }
  );

  await waitUntilExit();
  unmount();

  // Restore console output
  restoreConsole();
}
