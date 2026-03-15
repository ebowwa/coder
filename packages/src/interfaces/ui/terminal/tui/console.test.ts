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
      suppressConsole({ buffer: true });

      console.log("test message");

      const messages = getBufferedMessages();
      // If suppressed, the message won't appear in console but will be buffered
      expect(messages).toHaveLength(1);
      expect(messages[0].method).toBe("log");
      expect(messages[0].args).toEqual(["test message"]);

      restoreConsole();
    });

    test("restores all methods", () => {
      suppressConsole();
      restoreConsole();

      // After restore, console.log should work normally
      // We can't easily test this without side effects, so just verify state
      expect(isConsoleSuppressed()).toBe(false);
    });

    test("suppresses only specified methods", () => {
      suppressConsole({ methods: ["log"], buffer: true });

      console.log("log message");
      console.error("error message");

      const messages = getBufferedMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].method).toBe("log");
      expect(messages[0].args).toEqual(["log message"]);

      restoreConsole();
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
      // Use buffer to capture what would be replayed
      suppressConsole({ buffer: true });
      console.log("replayed message");
      restoreConsole();

      // Verify buffer has the message
      const messages = getBufferedMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].args).toEqual(["replayed message"]);

      // replayBuffer will output to real console - we just verify it doesn't throw
      expect(() => replayBuffer()).not.toThrow();
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
