/**
 * Console Suppression Utilities
 * Manages console output suppression during TUI mode
 *
 * Features:
 * - Buffered message capture for debugging
 * - Selective suppression by method
 * - File logging redirect option
 * - Debug mode bypass via DEBUG_TUI env
 * - State tracking
 * - Sync and async wrappers
 */

// ============================================
// TYPES
// ============================================

export type ConsoleMethod = "log" | "error" | "warn" | "info" | "debug" | "trace";

export interface BufferedMessage {
  method: ConsoleMethod;
  args: unknown[];
  timestamp: number;
}

export interface SuppressOptions {
  /** Specific methods to suppress (default: all) */
  methods?: ConsoleMethod[];
  /** Buffer suppressed messages for later retrieval */
  buffer?: boolean;
  /** Write suppressed messages to file path */
  logFile?: string;
}

// ============================================
// STATE
// ============================================

/** Store original console methods for restoration */
const originalConsole: Record<ConsoleMethod, typeof console.log> = {
  log: console.log.bind(console),
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console),
  trace: console.trace.bind(console),
};

/** Track suppression state */
let isSuppressed = false;

/** Buffer for captured messages when buffering is enabled */
let messageBuffer: BufferedMessage[] = [];

/** Current suppression options */
let currentOptions: SuppressOptions = {};

/** File write function for log file mode */
let logFileWriter: ((msg: string) => void) | null = null;

/** Debug mode bypass - check once at module load */
const DEBUG_TUI = process.env.DEBUG_TUI === "true";

// ============================================
// BUFFER UTILITIES
// ============================================

/**
 * Get all buffered messages
 */
export function getBufferedMessages(): BufferedMessage[] {
  return [...messageBuffer];
}

/**
 * Get buffered messages for a specific method
 */
export function getBufferedByMethod(method: ConsoleMethod): BufferedMessage[] {
  return messageBuffer.filter(m => m.method === method);
}

/**
 * Clear the message buffer
 */
export function clearBuffer(): void {
  messageBuffer = [];
}

/**
 * Replay buffered messages to original console
 * Useful for debugging after TUI exits
 */
export function replayBuffer(): void {
  for (const msg of messageBuffer) {
    originalConsole[msg.method](...msg.args);
  }
}

// ============================================
// STATE UTILITIES
// ============================================

/**
 * Check if console is currently suppressed
 */
export function isConsoleSuppressed(): boolean {
  return isSuppressed;
}

/**
 * Get current suppression options
 */
export function getSuppressOptions(): SuppressOptions {
  return { ...currentOptions };
}

// ============================================
// SUPPRESSION CORE
// ============================================

/** Create a no-op function that optionally buffers */
function createNoOp(method: ConsoleMethod): typeof console.log {
  return (...args: unknown[]) => {
    // Debug mode: pass through to original
    if (DEBUG_TUI) {
      originalConsole[method](...args);
      return;
    }

    // Buffering enabled: store message
    if (currentOptions.buffer) {
      messageBuffer.push({
        method,
        args,
        timestamp: Date.now(),
      });
    }

    // Log file enabled: write to file
    if (logFileWriter) {
      const prefix = `[${method.toUpperCase()}]`;
      const timestamp = new Date().toISOString();
      const content = args.map(a =>
        typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)
      ).join(" ");
      logFileWriter(`[${timestamp}] ${prefix} ${content}\n`);
    }
  };
}

/**
 * Suppress console output during TUI mode
 * Prevents TUI corruption from stray console output
 *
 * @param options - Suppression configuration
 */
export function suppressConsole(options: SuppressOptions = {}): void {
  // Warn on double suppression (helps debug issues)
  if (isSuppressed && !DEBUG_TUI) {
    originalConsole.warn("[console.ts] Warning: suppressConsole() called while already suppressed. Call restoreConsole() first.");
  }

  currentOptions = options;
  const methodsToSuppress = options.methods ?? ["log", "error", "warn", "info", "debug", "trace"];

  // Setup file writer if logFile specified
  if (options.logFile) {
    try {
      // Use Bun's file API for writing
      const file = Bun.file(options.logFile);
      let content = "";
      logFileWriter = (msg: string) => {
        content += msg;
        Bun.write(options.logFile!, content).catch(() => {});
      };
    } catch {
      // Fallback: disable file logging
      logFileWriter = null;
    }
  }

  // Apply suppression to specified methods
  for (const method of methodsToSuppress) {
    if (method in originalConsole) {
      (console as unknown as Record<string, unknown>)[method] = createNoOp(method);
    }
  }

  isSuppressed = true;
}

/**
 * Restore original console methods
 * Call when exiting TUI mode
 */
export function restoreConsole(): void {
  // Restore all methods
  for (const method of Object.keys(originalConsole) as ConsoleMethod[]) {
    (console as unknown as Record<string, unknown>)[method] = originalConsole[method];
  }

  // Clear file writer
  logFileWriter = null;

  // Reset state
  isSuppressed = false;
  currentOptions = {};
}

// ============================================
// WRAPPER UTILITIES
// ============================================

/**
 * Execute an async function with console suppressed
 * Automatically restores console after execution
 */
export async function withSuppressedConsole<T>(
  fn: () => Promise<T>,
  options: SuppressOptions = {}
): Promise<T> {
  suppressConsole(options);
  try {
    return await fn();
  } finally {
    restoreConsole();
  }
}

/**
 * Execute a sync function with console suppressed
 * Automatically restores console after execution
 */
export function withSuppressedConsoleSync<T>(
  fn: () => T,
  options: SuppressOptions = {}
): T {
  suppressConsole(options);
  try {
    return fn();
  } finally {
    restoreConsole();
  }
}

// ============================================
// CONVENIENCE EXPORTS
// ============================================

/**
 * Suppress all console methods (convenience)
 */
export function suppressAllConsole(): void {
  suppressConsole();
}

/**
 * Suppress only verbose methods (log, info, debug, trace)
 * Keeps error and warn visible for critical issues
 */
export function suppressVerboseConsole(): void {
  suppressConsole({ methods: ["log", "info", "debug", "trace"] });
}

/**
 * Suppress and buffer all messages
 * Messages can be retrieved later with getBufferedMessages()
 */
export function suppressAndBuffer(): void {
  suppressConsole({ buffer: true });
}
