#!/usr/bin/env bun
/**
 * CLI Bootstrap - PTY Wrapper Detection
 *
 * This file MUST run before any other imports to handle PTY wrapping.
 * ES modules hoist imports, so we need a separate entry point.
 *
 * Usage: bun bootstrap.ts [args...]
 */

import { spawn, spawnSync } from "node:child_process";
import process from "node:process";

/**
 * Check if we need PTY wrapping and handle it
 * Returns true if we should continue to main module, false if we're the parent waiting
 */
function checkPtyWrapper(): boolean {
  const isTTY = process.stdin.isTTY;
  const isDoppler = !!process.env.DOPPLER_TOKEN;
  const forceInteractive = process.env.CLAUDE_FORCE_INTERACTIVE === "true";
  const hasQuery = process.argv.includes("-q") || process.argv.includes("--query");
  const hasVersion = process.argv.includes("--version") || process.argv.includes("-v");
  const hasHelp = process.argv.includes("--help") || process.argv.includes("-h");
  const alreadyWrapped = process.env.CODER_PTY_WRAPPED === "1";

  // Debug output
  if (process.env.CODER_DEBUG === "1") {
    console.error("[bootstrap] isTTY:", isTTY);
    console.error("[bootstrap] isDoppler:", isDoppler);
    console.error("[bootstrap] alreadyWrapped:", alreadyWrapped);
    console.error("[bootstrap] forceInteractive:", forceInteractive);
  }

  // Skip if we have a TTY, force interactive, have a query, version, help, or already wrapped
  if (isTTY || forceInteractive || hasQuery || hasVersion || hasHelp || alreadyWrapped) {
    if (process.env.CODER_DEBUG === "1") {
      console.error("[bootstrap] Skipping wrapper - conditions met");
    }
    return true; // Continue to main module
  }

  // If under doppler without TTY, try to wrap with unbuffer
  if (isDoppler) {
    if (process.env.CODER_DEBUG === "1") {
      console.error("[bootstrap] Attempting PTY wrap...");
    }
    const result = tryWrapWithUnbuffer();
    if (process.env.CODER_DEBUG === "1") {
      console.error("[bootstrap] Wrap result:", result.wrapped ? "success" : "failed");
    }
    if (result.wrapped && result.child) {
      // Successfully wrapped - child is running
      // Wait for child to exit, then exit parent with same code
      const child = result.child;
      child.on("exit", (code: number | null) => {
        process.exit(code ?? 1);
      });
      child.on("error", (err: Error) => {
        console.error("Child process error:", err.message);
        process.exit(1);
      });

      // Keep parent alive
      process.stdin.resume();
      setInterval(() => {
        /* keep alive */
      }, 60000);

      return false; // Don't continue - parent just waits
    }

    // Failed to wrap - show helpful error
    console.error("Error: Interactive mode requires a TTY.");
    console.error("");
    console.error("When using 'doppler run', TTY is not passed through.");
    console.error("");
    console.error("Install 'expect' package for automatic PTY support:");
    console.error("  macOS:   brew install expect");
    console.error("  Ubuntu:  sudo apt install expect");
    console.error("  Fedora:  sudo dnf install expect");
    console.error("");
    console.error("Or use one of these alternatives:");
    console.error("  1. Single query:    doppler run -- coder -q \"your question\"");
    console.error("  2. Export secrets:  doppler secrets download --no-file && coder");
    console.error("  3. Force simple:    CLAUDE_FORCE_INTERACTIVE=true doppler run -- coder");
    console.error("  4. With unbuffer:   unbuffer doppler run -- coder");
    process.exit(1);
  }

  return true; // Continue to main module
}

/**
 * Try to wrap execution with unbuffer to provide a PTY
 */
function tryWrapWithUnbuffer(): { wrapped: boolean; child?: ReturnType<typeof spawn> } {
  try {
    // Check if unbuffer is available
    const checkResult = spawnSync("which", ["unbuffer"], {
      stdio: "ignore",
      timeout: 1000,
    });

    if (checkResult.status !== 0) {
      return { wrapped: false };
    }

    // Re-exec ourselves with unbuffer
    const args = [process.execPath, ...process.argv.slice(1)];
    const child = spawn("unbuffer", args, {
      stdio: "inherit",
      env: {
        ...process.env,
        CODER_PTY_WRAPPED: "1",
      },
    });

    return { wrapped: true, child };
  } catch {
    return { wrapped: false };
  }
}

// Run PTY check and conditionally load main module
if (checkPtyWrapper()) {
  // Dynamic import of main module - only after PTY check passes
  import("./index.js").catch((err) => {
    console.error("Failed to load main module:", err);
    process.exit(1);
  });
}
