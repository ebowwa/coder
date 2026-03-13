/**
 * Tests for Console Suppression Utilities
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  suppressConsole,
  restoreConsole,
  withSuppressedConsole,
  withSuppressedConsoleSync,
  isConsoleSuppressed,
  getSuppressOptions,
  getBufferedMessages,
  getBufferedByMethod,
  clearBuffer,
  replayBuffer,
  suppressAllConsole,
  suppressVerboseConsole,
  suppressAndBuffer,
  type ConsoleMethod,
} from "./console.js";

// Helper to capture console output
function captureConsole(method: ConsoleMethod): { output: string[]; restore: () => void } {
  const output: string[] = [];
  const original = console[method];
  (console as Record<string, unknown>)[method] = (...args: unknown[]) => {
    output.push(args.map(a => String(a)).join(" "));
  };
  return {
    output,
    restore: () => {
      (console as Record<string, unknown>)[method] = original;
    },
  };
}

describe("console.ts", () => {
  beforeEach(() => {
    // Ensure clean state
    restoreConsole();
    clearBuffer();
  });

  afterEach(() => {
    // Clean up
    restoreConsole();
    clearBuffer();
  });

  describe("isConsoleSuppressed", () => {
    test("returns false initially", () => {
      expect(isConsoleSuppressed()).toBe(false);
    });

    test("returns true after suppressConsole", () => {
      suppressConsole();
      expect(isConsoleSuppressed()).toBe(true);
    });

    test("returns false after restoreConsole", () => {
      suppressConsole();
      restoreConsole();
      expect(isConsoleSuppressed()).toBe(false);
    });
  });

  describe("getSuppressOptions", () => {
    test("returns empty options initially", () => {
      const opts = getSuppressOptions();
      expect(opts.buffer).toBeUndefined();
      expect(opts.methods).toBeUndefined();
      expect(opts.logFile).toBeUndefined();
    });

    test("returns current options after suppressConsole", () => {
      suppressConsole({ buffer: true, methods: ["log", "warn"] });
      const opts = getSuppressOptions();
      expect(opts.buffer).toBe(true);
      expect(opts.methods).toEqual(["log", "warn"]);
    });
  });

  describe("suppressConsole / restoreConsole", () => {
    test("suppresses all methods by default", () => {
      const captured = captureConsole("log");
      suppressConsole();

      console.log("test message");

      expect(captured.output).toHaveLength(0);

      restoreConsole();
      captured.restore();
    });

    test("restores all methods", () => {
      const captured = captureConsole("log");
      suppressConsole();
      restoreConsole();

      console.log("test message");

      expect(captured.output).toHaveLength(1);
      expect(captured.output[0]).toBe("test message");
      captured.restore();
    });

    test("suppresses only specified methods", () => {
      const logCapture = captureConsole("log");
      const errorCapture = captureConsole("error");

      suppressConsole({ methods: ["log"] });

      console.log("log message");
      console.error("error message");

      expect(logCapture.output).toHaveLength(0);
      expect(errorCapture.output).toHaveLength(1);
      expect(errorCapture.output[0]).toBe("error message");

      restoreConsole();
      logCapture.restore();
      errorCapture.restore();
    });
  });

  describe("buffering", () => {
    test("buffers messages when buffer option is true", () => {
      suppressConsole({ buffer: true });

      console.log("test 1");
      console.warn("test 2");
      console.error("test 3");

      const messages = getBufferedMessages();
      expect(messages).toHaveLength(3);
      expect(messages[0].method).toBe("log");
      expect(messages[0].args).toEqual(["test 1"]);
      expect(messages[1].method).toBe("warn");
      expect(messages[2].method).toBe("error");

      restoreConsole();
    });

    test("getBufferedByMethod filters by method", () => {
      suppressConsole({ buffer: true });

      console.log("log 1");
      console.error("error 1");
      console.log("log 2");

      const logs = getBufferedByMethod("log");
      expect(logs).toHaveLength(2);
      expect(logs[0].args).toEqual(["log 1"]);
      expect(logs[1].args).toEqual(["log 2"]);

      restoreConsole();
    });

    test("clearBuffer removes all buffered messages", () => {
      suppressConsole({ buffer: true });

      console.log("test");
      expect(getBufferedMessages()).toHaveLength(1);

      clearBuffer();
      expect(getBufferedMessages()).toHaveLength(0);

      restoreConsole();
    });

    test("replayBuffer outputs messages to original console", () => {
      const captured = captureConsole("log");

      suppressConsole({ buffer: true });
      console.log("replayed message");
      restoreConsole();

      replayBuffer();

      expect(captured.output).toHaveLength(1);
      expect(captured.output[0]).toBe("replayed message");

      captured.restore();
    });
  });

  describe("withSuppressedConsole", () => {
    test("suppresses during async function execution", async () => {
      expect(isConsoleSuppressed()).toBe(false);

      await withSuppressedConsole(async () => {
        expect(isConsoleSuppressed()).toBe(true);
      });

      expect(isConsoleSuppressed()).toBe(false);
    });

    test("restores console even on error", async () => {
      expect(isConsoleSuppressed()).toBe(false);

      try {
        await withSuppressedConsole(async () => {
          throw new Error("test error");
        });
      } catch {
        // Expected
      }

      expect(isConsoleSuppressed()).toBe(false);
    });

    test("passes options to suppressConsole", async () => {
      await withSuppressedConsole(
        async () => {
          console.log("buffered");
          expect(getBufferedMessages()).toHaveLength(1);
        },
        { buffer: true }
      );
    });
  });

  describe("withSuppressedConsoleSync", () => {
    test("suppresses during sync function execution", () => {
      expect(isConsoleSuppressed()).toBe(false);

      withSuppressedConsoleSync(() => {
        expect(isConsoleSuppressed()).toBe(true);
      });

      expect(isConsoleSuppressed()).toBe(false);
    });

    test("restores console even on error", () => {
      expect(isConsoleSuppressed()).toBe(false);

      try {
        withSuppressedConsoleSync(() => {
          throw new Error("test error");
        });
      } catch {
        // Expected
      }

      expect(isConsoleSuppressed()).toBe(false);
    });
  });

  describe("convenience functions", () => {
    test("suppressAllConsole suppresses all methods", () => {
      suppressAllConsole();

      const opts = getSuppressOptions();
      expect(opts.methods).toEqual(["log", "error", "warn", "info", "debug", "trace"]);

      restoreConsole();
    });

    test("suppressVerboseConsole only suppresses verbose methods", () => {
      suppressVerboseConsole();

      const opts = getSuppressOptions();
      expect(opts.methods).toEqual(["log", "info", "debug", "trace"]);
      expect(opts.methods).not.toContain("error");
      expect(opts.methods).not.toContain("warn");

      restoreConsole();
    });

    test("suppressAndBuffer enables buffering", () => {
      suppressAndBuffer();

      const opts = getSuppressOptions();
      expect(opts.buffer).toBe(true);

      restoreConsole();
    });
  });
});
