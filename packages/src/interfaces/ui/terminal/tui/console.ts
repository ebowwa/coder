/**
 * Console Suppression Utilities
 * Manages console output suppression during TUI mode
 */

/**
 * Store original console methods for restoration
 */
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
};

/**
 * Suppress all console output during TUI mode
 * Prevents TUI corruption from stray console output
 */
export function suppressConsole(): void {
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
  console.info = () => {};
}

/**
 * Restore original console methods
 * Call when exiting TUI mode
 */
export function restoreConsole(): void {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  console.info = originalConsole.info;
}

/**
 * Execute a function with console suppressed
 * Automatically restores console after execution
 */
export async function withSuppressedConsole<T>(fn: () => Promise<T>): Promise<T> {
  suppressConsole();
  try {
    return await fn();
  } finally {
    restoreConsole();
  }
}
