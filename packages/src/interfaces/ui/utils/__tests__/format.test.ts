import { describe, test, expect } from "bun:test";
import {
  apiToText,
  formatElapsedTime,
  formatBytes,
  formatLoadingMessage,
} from "../format.js";
import type { Message, ContentBlock } from "../../../schemas/index.js";

describe("apiToText", () => {
  test("returns string content directly", () => {
    const msg = { content: "hello world" } as Message;
    expect(apiToText(msg)).toBe("hello world");
  });

  test("returns empty string for non-array content", () => {
    const msg = { content: null } as unknown as Message;
    expect(apiToText(msg)).toBe("");
  });

  test("formats array content with text blocks", () => {
    const msg = {
      content: [{ type: "text", text: "line 1" }, { type: "text", text: "line 2" }],
    } as Message;
    expect(apiToText(msg)).toBe("line 1\nline 2");
  });

  test("formats tool_use blocks", () => {
    const msg = {
      content: [{ type: "tool_use", name: "Bash", id: "1" }],
    } as Message;
    expect(apiToText(msg)).toBe("[Tool: Bash]");
  });

  test("formats tool_result blocks (success)", () => {
    const msg = {
      content: [{ type: "tool_result", tool_use_id: "1", is_error: false }],
    } as unknown as Message;
    expect(apiToText(msg)).toBe("[Result]");
  });

  test("formats tool_result blocks (error)", () => {
    const msg = {
      content: [{ type: "tool_result", tool_use_id: "1", is_error: true }],
    } as unknown as Message;
    expect(apiToText(msg)).toBe("[Error]");
  });

  test("handles mixed content blocks", () => {
    const msg = {
      content: [
        { type: "text", text: "Running command" },
        { type: "tool_use", name: "Bash", id: "1" },
        { type: "tool_result", tool_use_id: "1", is_error: false },
      ],
    } as unknown as Message;
    expect(apiToText(msg)).toBe("Running command\n[Tool: Bash]\n[Result]");
  });
});

describe("formatElapsedTime", () => {
  test("formats milliseconds < 1000", () => {
    expect(formatElapsedTime(0)).toBe("0ms");
    expect(formatElapsedTime(500)).toBe("500ms");
    expect(formatElapsedTime(999)).toBe("999ms");
  });

  test("formats seconds < 60", () => {
    expect(formatElapsedTime(1000)).toBe("1s");
    expect(formatElapsedTime(5000)).toBe("5s");
    expect(formatElapsedTime(59000)).toBe("59s");
  });

  test("formats minutes < 60", () => {
    expect(formatElapsedTime(60000)).toBe("1m0s");
    expect(formatElapsedTime(90000)).toBe("1m30s");
    expect(formatElapsedTime(3500000)).toBe("58m20s");
  });

  test("formats hours", () => {
    expect(formatElapsedTime(3600000)).toBe("1h0m");
    expect(formatElapsedTime(3660000)).toBe("1h1m");
    expect(formatElapsedTime(7200000)).toBe("2h0m");
  });
});

describe("formatBytes", () => {
  test("returns '0 B' for 0", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  test("formats bytes < 1024", () => {
    expect(formatBytes(1)).toBe("1 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1023)).toBe("1023 B");
  });

  test("formats KB", () => {
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(10240)).toBe("10 KB");
  });

  test("formats MB", () => {
    expect(formatBytes(1048576)).toBe("1 MB");
    expect(formatBytes(1572864)).toBe("1.5 MB");
  });

  test("formats GB", () => {
    expect(formatBytes(1073741824)).toBe("1 GB");
  });

  test("formats TB", () => {
    expect(formatBytes(1099511627776)).toBe("1 TB");
  });
});

describe("formatLoadingMessage", () => {
  test("adds spinner when loading", () => {
    expect(formatLoadingMessage("Processing", true)).toBe("⏳ Processing");
  });

  test("returns message unchanged when not loading", () => {
    expect(formatLoadingMessage("Done", false)).toBe("Done");
  });
});
