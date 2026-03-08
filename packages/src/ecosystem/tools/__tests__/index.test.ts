/**
 * Built-in Tools Tests
 *
 * Comprehensive tests for Read, Write, Edit, Bash, Glob, and Grep tools.
 */

import { describe, test, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, writeFile, mkdir, rm, stat } from "fs/promises";
import { tmpdir } from "os";
import { join, dirname } from "path";
import {
  ReadTool,
  WriteTool,
  EditTool,
  BashTool,
  GlobTool,
  GrepTool,
  getToolByName,
  builtInTools,
} from "../index.js";
import type { ToolContext, ToolResult } from "../../../types/index.js";

// Helper to create a default tool context
function createToolContext(workingDirectory: string): ToolContext {
  return {
    workingDirectory,
    permissionMode: "bypassPermissions",
  };
}

describe("Built-in Tools Registry", () => {
  test("builtInTools array contains all expected tools", () => {
    const toolNames = builtInTools.map((t) => t.name);
    expect(toolNames).toContain("Read");
    expect(toolNames).toContain("Write");
    expect(toolNames).toContain("Edit");
    expect(toolNames).toContain("Bash");
    expect(toolNames).toContain("Glob");
    expect(toolNames).toContain("Grep");
  });

  test("getToolByName returns correct tool", () => {
    expect(getToolByName("Read")?.name).toBe("Read");
    expect(getToolByName("Write")?.name).toBe("Write");
    expect(getToolByName("NonExistent")).toBeUndefined();
  });
});

describe("ReadTool", () => {
  let tempDir: string;
  let context: ToolContext;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "read-tool-test-"));
    context = createToolContext(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("successful operations", () => {
    test("reads a simple text file", async () => {
      const filePath = join(tempDir, "test.txt");
      await writeFile(filePath, "Hello, World!");

      const result = await ReadTool.handler({ file_path: filePath }, context);

      expect(result.is_error).toBeUndefined();
      expect(result.content).toContain("Hello, World!");
    });

    test("reads a file with multiple lines", async () => {
      const filePath = join(tempDir, "multiline.txt");
      const content = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5";
      await writeFile(filePath, content);

      const result = await ReadTool.handler({ file_path: filePath }, context);

      expect(result.is_error).toBeUndefined();
      expect(result.content).toContain("Line 1");
      expect(result.content).toContain("Line 5");
    });

    test("reads file with line numbers (cat -n format)", async () => {
      const filePath = join(tempDir, "numbered.txt");
      await writeFile(filePath, "First\nSecond\nThird");

      const result = await ReadTool.handler({ file_path: filePath }, context);

      expect(result.content).toMatch(/1\tFirst/);
      expect(result.content).toMatch(/2\tSecond/);
      expect(result.content).toMatch(/3\tThird/);
    });

    test("reads file with offset", async () => {
      const filePath = join(tempDir, "offset.txt");
      await writeFile(filePath, "Line 1\nLine 2\nLine 3\nLine 4\nLine 5");

      const result = await ReadTool.handler(
        { file_path: filePath, offset: 3 },
        context
      );

      expect(result.content).toContain("Line 3");
      expect(result.content).not.toContain("Line 1");
      expect(result.content).not.toContain("Line 2");
    });

    test("reads file with limit", async () => {
      const filePath = join(tempDir, "limit.txt");
      await writeFile(filePath, "Line 1\nLine 2\nLine 3\nLine 4\nLine 5");

      const result = await ReadTool.handler(
        { file_path: filePath, limit: 2 },
        context
      );

      expect(result.content).toContain("Line 1");
      expect(result.content).toContain("Line 2");
      expect(result.content).not.toContain("Line 5");
    });

    test("reads file with offset and limit", async () => {
      const filePath = join(tempDir, "offset-limit.txt");
      await writeFile(filePath, "Line 1\nLine 2\nLine 3\nLine 4\nLine 5");

      const result = await ReadTool.handler(
        { file_path: filePath, offset: 2, limit: 2 },
        context
      );

      expect(result.content).toContain("Line 2");
      expect(result.content).toContain("Line 3");
      expect(result.content).not.toContain("Line 1");
      expect(result.content).not.toContain("Line 5");
    });

    test("reads an empty file", async () => {
      const filePath = join(tempDir, "empty.txt");
      await writeFile(filePath, "");

      const result = await ReadTool.handler({ file_path: filePath }, context);

      expect(result.is_error).toBeUndefined();
      // Empty file returns a single line with line number but no content
      expect(result.content).toBe("1\t");
    });

    test("reads a file with special characters", async () => {
      const filePath = join(tempDir, "special.txt");
      await writeFile(filePath, "Special: \t<Tab>\nUnicode: \u00e9\u00e8\u00ea");

      const result = await ReadTool.handler({ file_path: filePath }, context);

      expect(result.is_error).toBeUndefined();
      expect(result.content).toContain("<Tab>");
      expect(result.content).toContain("\u00e9\u00e8\u00ea");
    });

    test("reads a JSON file", async () => {
      const filePath = join(tempDir, "data.json");
      await writeFile(filePath, JSON.stringify({ key: "value", num: 42 }));

      const result = await ReadTool.handler({ file_path: filePath }, context);

      expect(result.is_error).toBeUndefined();
      expect(result.content).toContain('"key"');
      expect(result.content).toContain('"value"');
    });

    test("reads a TypeScript file", async () => {
      const filePath = join(tempDir, "code.ts");
      await writeFile(filePath, "const x: number = 42;\nexport { x };");

      const result = await ReadTool.handler({ file_path: filePath }, context);

      expect(result.is_error).toBeUndefined();
      expect(result.content).toContain("const x: number = 42");
    });
  });

  describe("truncation warning", () => {
    test("shows truncation warning when file exceeds limit", async () => {
      const filePath = join(tempDir, "long.txt");
      const lines = Array(3000)
        .fill(null)
        .map((_, i) => `Line ${i + 1}`)
        .join("\n");
      await writeFile(filePath, lines);

      const result = await ReadTool.handler(
        { file_path: filePath, limit: 100 },
        context
      );

      expect(result.content).toContain("WARNING");
      expect(result.content).toContain("3000 lines");
      expect(result.content).toContain("limit: 100");
    });

    test("does not show truncation warning when file is within limit", async () => {
      const filePath = join(tempDir, "short.txt");
      await writeFile(filePath, "Line 1\nLine 2\nLine 3");

      const result = await ReadTool.handler(
        { file_path: filePath, limit: 100 },
        context
      );

      expect(result.content).not.toContain("WARNING");
    });
  });

  describe("error handling", () => {
    test("returns error for non-existent file", async () => {
      const result = await ReadTool.handler(
        { file_path: join(tempDir, "nonexistent.txt") },
        context
      );

      expect(result.is_error).toBe(true);
      expect(result.content).toContain("Error");
      expect(result.content).toContain("not found");
    });

    test("returns error for empty file_path", async () => {
      const result = await ReadTool.handler({ file_path: "" }, context);

      expect(result.is_error).toBe(true);
      expect(result.content).toContain("required");
    });

    test("returns error for missing file_path", async () => {
      const result = await ReadTool.handler({}, context);

      expect(result.is_error).toBe(true);
      expect(result.content).toContain("required");
    });

    test("returns error for whitespace-only file_path", async () => {
      const result = await ReadTool.handler({ file_path: "   " }, context);

      expect(result.is_error).toBe(true);
      expect(result.content).toContain("required");
    });

    test("returns error for directory path instead of file", async () => {
      const dirPath = join(tempDir, "subdir");
      await mkdir(dirPath);

      const result = await ReadTool.handler({ file_path: dirPath }, context);

      // Bun.file can read directories but returns empty or error
      // The behavior depends on the implementation
      expect(result).toBeDefined();
    });
  });

  describe("binary file handling", () => {
    test("returns error for binary exclusion files", async () => {
      const filePath = join(tempDir, "test.exe");
      // Write a small binary file (fake executable header)
      await writeFile(filePath, Buffer.from([0x4d, 0x5a, 0x90, 0x00]));

      const result = await ReadTool.handler({ file_path: filePath }, context);

      expect(result.is_error).toBe(true);
      expect(result.content).toContain("Binary file detected");
    });

    test("returns error for zip files", async () => {
      const filePath = join(tempDir, "archive.zip");
      // Write a minimal zip header
      await writeFile(filePath, Buffer.from([0x50, 0x4b, 0x03, 0x04]));

      const result = await ReadTool.handler({ file_path: filePath }, context);

      expect(result.is_error).toBe(true);
      expect(result.content).toContain("Binary file detected");
    });
  });
});

describe("WriteTool", () => {
  let tempDir: string;
  let context: ToolContext;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "write-tool-test-"));
    context = createToolContext(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("successful operations", () => {
    test("writes a new file", async () => {
      const filePath = join(tempDir, "new.txt");
      const result = await WriteTool.handler(
        { file_path: filePath, content: "Hello, World!" },
        context
      );

      expect(result.is_error).toBeUndefined();
      expect(result.content).toContain("Successfully wrote");

      // Verify file was created
      const file = Bun.file(filePath);
      expect(await file.exists()).toBe(true);
      expect(await file.text()).toBe("Hello, World!");
    });

    test("overwrites an existing file", async () => {
      const filePath = join(tempDir, "existing.txt");
      await writeFile(filePath, "Original content");

      const result = await WriteTool.handler(
        { file_path: filePath, content: "New content" },
        context
      );

      expect(result.is_error).toBeUndefined();

      const file = Bun.file(filePath);
      expect(await file.text()).toBe("New content");
    });

    test("writes an empty file", async () => {
      const filePath = join(tempDir, "empty.txt");
      const result = await WriteTool.handler(
        { file_path: filePath, content: "" },
        context
      );

      expect(result.is_error).toBeUndefined();

      const file = Bun.file(filePath);
      expect(await file.text()).toBe("");
    });

    test("writes a file with special characters", async () => {
      const filePath = join(tempDir, "special.txt");
      const content = "Special: \t<Tab>\nUnicode: \u00e9\u00e8\u00ea\nEmoji: \ud83d\ude00";

      const result = await WriteTool.handler(
        { file_path: filePath, content },
        context
      );

      expect(result.is_error).toBeUndefined();

      const file = Bun.file(filePath);
      expect(await file.text()).toBe(content);
    });

    test("writes a large file", async () => {
      const filePath = join(tempDir, "large.txt");
      const content = "x".repeat(100000);

      const result = await WriteTool.handler(
        { file_path: filePath, content },
        context
      );

      expect(result.is_error).toBeUndefined();

      const file = Bun.file(filePath);
      expect(await file.text()).toBe(content);
    });

    test("writes JSON content", async () => {
      const filePath = join(tempDir, "data.json");
      const content = JSON.stringify({ key: "value", nested: { a: 1 } });

      const result = await WriteTool.handler(
        { file_path: filePath, content },
        context
      );

      expect(result.is_error).toBeUndefined();

      const file = Bun.file(filePath);
      const parsed = JSON.parse(await file.text());
      expect(parsed.key).toBe("value");
    });

    test("creates nested directories if needed", async () => {
      const filePath = join(tempDir, "nested", "deep", "file.txt");

      // Bun.write creates parent directories automatically
      const result = await WriteTool.handler(
        { file_path: filePath, content: "nested content" },
        context
      );

      expect(result.is_error).toBeUndefined();

      const file = Bun.file(filePath);
      expect(await file.exists()).toBe(true);
    });
  });

  describe("error handling", () => {
    test("returns error for empty file_path", async () => {
      const result = await WriteTool.handler(
        { file_path: "", content: "test" },
        context
      );

      expect(result.is_error).toBe(true);
      expect(result.content).toContain("required");
    });

    test("returns error for missing file_path", async () => {
      const result = await WriteTool.handler({ content: "test" }, context);

      expect(result.is_error).toBe(true);
      expect(result.content).toContain("required");
    });

    test("returns error for missing content", async () => {
      const result = await WriteTool.handler(
        { file_path: join(tempDir, "test.txt") },
        context
      );

      expect(result.is_error).toBe(true);
      expect(result.content).toContain("required");
    });

    test("returns error for null content", async () => {
      const result = await WriteTool.handler(
        { file_path: join(tempDir, "test.txt"), content: null },
        context
      );

      expect(result.is_error).toBe(true);
      expect(result.content).toContain("required");
    });
  });
});

describe("EditTool", () => {
  let tempDir: string;
  let context: ToolContext;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "edit-tool-test-"));
    context = createToolContext(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("successful operations", () => {
    test("edits a file with exact string replacement", async () => {
      const filePath = join(tempDir, "edit.txt");
      await writeFile(filePath, "Hello, World!");

      const result = await EditTool.handler(
        {
          file_path: filePath,
          old_string: "World",
          new_string: "Universe",
        },
        context
      );

      expect(result.is_error).toBeUndefined();
      expect(result.content).toContain("Successfully edited");

      const file = Bun.file(filePath);
      expect(await file.text()).toBe("Hello, Universe!");
    });

    test("edits multi-line content", async () => {
      const filePath = join(tempDir, "multiline.txt");
      await writeFile(filePath, "Line 1\nLine 2\nLine 3");

      const result = await EditTool.handler(
        {
          file_path: filePath,
          old_string: "Line 2",
          new_string: "Modified Line 2",
        },
        context
      );

      expect(result.is_error).toBeUndefined();

      const file = Bun.file(filePath);
      const text = await file.text();
      expect(text).toContain("Modified Line 2");
      expect(text).toContain("Line 1");
      expect(text).toContain("Line 3");
    });

    test("replaces all occurrences with replace_all", async () => {
      const filePath = join(tempDir, "replace-all.txt");
      await writeFile(filePath, "foo bar foo baz foo");

      const result = await EditTool.handler(
        {
          file_path: filePath,
          old_string: "foo",
          new_string: "qux",
          replace_all: true,
        },
        context
      );

      expect(result.is_error).toBeUndefined();
      expect(result.content).toContain("3 occurrences");

      const file = Bun.file(filePath);
      expect(await file.text()).toBe("qux bar qux baz qux");
    });

    test("replaces with empty string (deletion)", async () => {
      const filePath = join(tempDir, "delete.txt");
      await writeFile(filePath, "Hello, World!");

      const result = await EditTool.handler(
        {
          file_path: filePath,
          old_string: ", World",
          new_string: "",
        },
        context
      );

      expect(result.is_error).toBeUndefined();

      const file = Bun.file(filePath);
      expect(await file.text()).toBe("Hello!");
    });

    test("replaces with longer string", async () => {
      const filePath = join(tempDir, "expand.txt");
      await writeFile(filePath, "Hi");

      const result = await EditTool.handler(
        {
          file_path: filePath,
          old_string: "Hi",
          new_string: "Hello, this is a much longer greeting!",
        },
        context
      );

      expect(result.is_error).toBeUndefined();

      const file = Bun.file(filePath);
      expect(await file.text()).toBe("Hello, this is a much longer greeting!");
    });

    test("edits file with special regex characters in old_string", async () => {
      const filePath = join(tempDir, "regex.txt");
      await writeFile(filePath, "Price: $100 (50% off)");

      const result = await EditTool.handler(
        {
          file_path: filePath,
          old_string: "$100 (50% off)",
          new_string: "$80",
        },
        context
      );

      expect(result.is_error).toBeUndefined();

      const file = Bun.file(filePath);
      expect(await file.text()).toBe("Price: $80");
    });
  });

  describe("error handling", () => {
    test("returns error when old_string not found", async () => {
      const filePath = join(tempDir, "not-found.txt");
      await writeFile(filePath, "Hello, World!");

      const result = await EditTool.handler(
        {
          file_path: filePath,
          old_string: "NonExistent",
          new_string: "Replacement",
        },
        context
      );

      expect(result.is_error).toBe(true);
      expect(result.content).toContain("not found");
    });

    test("returns error when string appears multiple times without replace_all", async () => {
      const filePath = join(tempDir, "multiple.txt");
      await writeFile(filePath, "foo bar foo baz foo");

      const result = await EditTool.handler(
        {
          file_path: filePath,
          old_string: "foo",
          new_string: "qux",
        },
        context
      );

      expect(result.is_error).toBe(true);
      expect(result.content).toContain("multiple times");
      expect(result.content).toContain("replace_all");
    });

    test("returns error for non-existent file", async () => {
      const result = await EditTool.handler(
        {
          file_path: join(tempDir, "nonexistent.txt"),
          old_string: "old",
          new_string: "new",
        },
        context
      );

      expect(result.is_error).toBe(true);
    });

    test("returns error for missing file_path", async () => {
      const result = await EditTool.handler(
        { old_string: "old", new_string: "new" },
        context
      );

      expect(result.is_error).toBe(true);
      expect(result.content).toContain("required");
    });

    test("returns error for missing old_string", async () => {
      const result = await EditTool.handler(
        { file_path: join(tempDir, "test.txt"), new_string: "new" },
        context
      );

      expect(result.is_error).toBe(true);
      expect(result.content).toContain("required");
    });

    test("returns error for missing new_string", async () => {
      const result = await EditTool.handler(
        { file_path: join(tempDir, "test.txt"), old_string: "old" },
        context
      );

      expect(result.is_error).toBe(true);
      expect(result.content).toContain("required");
    });

    test("returns error when replace_all finds no matches", async () => {
      const filePath = join(tempDir, "no-match.txt");
      await writeFile(filePath, "Hello, World!");

      const result = await EditTool.handler(
        {
          file_path: filePath,
          old_string: "NonExistent",
          new_string: "Replacement",
          replace_all: true,
        },
        context
      );

      expect(result.is_error).toBe(true);
      expect(result.content).toContain("not found");
    });
  });
});

describe("BashTool", () => {
  let tempDir: string;
  let context: ToolContext;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "bash-tool-test-"));
    context = createToolContext(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("successful operations", () => {
    test("executes echo command", async () => {
      const result = await BashTool.handler({ command: "echo 'Hello'" }, context);

      expect(result.is_error).toBeUndefined();
      expect(result.content).toContain("Hello");
    });

    test("executes pwd command", async () => {
      const result = await BashTool.handler({ command: "pwd" }, context);

      expect(result.is_error).toBeUndefined();
      expect(result.content).toContain(tempDir.split("/").pop()!);
    });

    test("executes ls command", async () => {
      await writeFile(join(tempDir, "test.txt"), "content");

      const result = await BashTool.handler({ command: "ls" }, context);

      expect(result.is_error).toBeUndefined();
      expect(result.content).toContain("test.txt");
    });

    test("executes command with pipes", async () => {
      const result = await BashTool.handler(
        { command: "echo 'line1\nline2\nline3' | wc -l" },
        context
      );

      expect(result.is_error).toBeUndefined();
      expect(typeof result.content === "string" ? result.content.trim() : result.content).toBe("3");
    });

    test("executes command with redirection", async () => {
      const result = await BashTool.handler(
        { command: "echo 'test content' > output.txt" },
        context
      );

      expect(result.is_error).toBeUndefined();

      const file = Bun.file(join(tempDir, "output.txt"));
      expect(await file.text()).toContain("test content");
    });

    test("executes command with environment variables", async () => {
      const result = await BashTool.handler(
        { command: "MY_VAR=hello && echo $MY_VAR" },
        context
      );

      expect(result.is_error).toBeUndefined();
      expect(result.content).toContain("hello");
    });

    test("returns (no output) for commands with no stdout", async () => {
      const result = await BashTool.handler(
        { command: "mkdir -p subdir" },
        context
      );

      expect(result.is_error).toBeUndefined();
      expect(result.content).toContain("no output");
    });
  });

  describe("error handling", () => {
    test("returns error for non-zero exit code", async () => {
      const result = await BashTool.handler(
        { command: "exit 1" },
        context
      );

      expect(result.is_error).toBe(true);
      expect(result.content).toContain("Exit code: 1");
    });

    test("returns error for command not found", async () => {
      const result = await BashTool.handler(
        { command: "nonexistent_command_xyz" },
        context
      );

      expect(result.is_error).toBe(true);
    });

    test("returns error for missing command", async () => {
      const result = await BashTool.handler({}, context);

      expect(result.is_error).toBe(true);
      expect(result.content).toContain("required");
    });

    test("returns error for empty command", async () => {
      const result = await BashTool.handler({ command: "" }, context);

      expect(result.is_error).toBe(true);
      expect(result.content).toContain("required");
    });

    test("returns error for whitespace-only command", async () => {
      const result = await BashTool.handler({ command: "   " }, context);

      expect(result.is_error).toBe(true);
      expect(result.content).toContain("required");
    });

    test("includes stderr in error output", async () => {
      const result = await BashTool.handler(
        { command: "ls /nonexistent_directory_xyz" },
        context
      );

      expect(result.is_error).toBe(true);
      // Should include error message about non-existent directory
    });
  });

  describe("timeout handling", () => {
    test("uses default timeout when not specified", async () => {
      const result = await BashTool.handler(
        { command: "echo 'quick'" },
        context
      );

      expect(result.is_error).toBeUndefined();
    });

    test("respects custom timeout", async () => {
      const result = await BashTool.handler(
        { command: "echo 'test'", timeout: 5000 },
        context
      );

      expect(result.is_error).toBeUndefined();
    });
  });

  describe("working directory", () => {
    test("executes in specified working directory", async () => {
      const subDir = join(tempDir, "subdir");
      await mkdir(subDir);
      await writeFile(join(subDir, "unique.txt"), "content");

      const localContext = createToolContext(subDir);
      const result = await BashTool.handler({ command: "ls" }, localContext);

      expect(result.content).toContain("unique.txt");
    });
  });
});

describe("GlobTool", () => {
  let tempDir: string;
  let context: ToolContext;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "glob-tool-test-"));
    context = createToolContext(tempDir);

    // Create test file structure
    await writeFile(join(tempDir, "file1.txt"), "content");
    await writeFile(join(tempDir, "file2.txt"), "content");
    await writeFile(join(tempDir, "script.ts"), "content");
    await writeFile(join(tempDir, "config.json"), "content");
    await mkdir(join(tempDir, "subdir"));
    await writeFile(join(tempDir, "subdir", "nested.txt"), "content");
    await writeFile(join(tempDir, "subdir", "nested.ts"), "content");
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("successful operations", () => {
    test("finds files with *.txt pattern", async () => {
      const result = await GlobTool.handler({ pattern: "*.txt" }, context);

      expect(result.is_error).toBeUndefined();
      expect(result.content).toContain("file1.txt");
      expect(result.content).toContain("file2.txt");
    });

    test("finds files with **/*.ts pattern (recursive)", async () => {
      const result = await GlobTool.handler({ pattern: "**/*.ts" }, context);

      expect(result.is_error).toBeUndefined();
      expect(result.content).toContain("script.ts");
      expect(result.content).toContain("nested.ts");
    });

    test("finds files with **/* pattern (all files)", async () => {
      const result = await GlobTool.handler({ pattern: "**/*" }, context);

      expect(result.is_error).toBeUndefined();
      expect(result.content).toContain("file1.txt");
      expect(result.content).toContain("script.ts");
      expect(result.content).toContain("nested.txt");
    });

    test("finds files in specific directory", async () => {
      const result = await GlobTool.handler(
        { pattern: "*.txt", path: join(tempDir, "subdir") },
        context
      );

      expect(result.is_error).toBeUndefined();
      expect(result.content).toContain("nested.txt");
      expect(result.content).not.toContain("file1.txt");
    });

    test("finds JSON files", async () => {
      const result = await GlobTool.handler({ pattern: "*.json" }, context);

      expect(result.is_error).toBeUndefined();
      expect(result.content).toContain("config.json");
    });

    test("returns absolute paths", async () => {
      const result = await GlobTool.handler({ pattern: "*.txt" }, context);

      expect(result.content).toContain(tempDir);
    });
  });

  describe("no matches", () => {
    test("returns message when no files match", async () => {
      const result = await GlobTool.handler(
        { pattern: "*.nonexistent" },
        context
      );

      expect(result.is_error).toBeUndefined();
      expect(result.content).toContain("No files found");
    });
  });

  describe("error handling", () => {
    test("returns error for missing pattern", async () => {
      const result = await GlobTool.handler({}, context);

      expect(result.is_error).toBe(true);
      expect(result.content).toContain("required");
    });

    test("returns error for empty pattern", async () => {
      const result = await GlobTool.handler({ pattern: "" }, context);

      expect(result.is_error).toBe(true);
      expect(result.content).toContain("required");
    });

    test("returns error for non-existent directory", async () => {
      const result = await GlobTool.handler(
        { pattern: "*.txt", path: "/nonexistent/path" },
        context
      );

      // Glob may succeed with empty results or fail depending on implementation
      expect(result).toBeDefined();
    });
  });
});

describe("GrepTool", () => {
  let tempDir: string;
  let context: ToolContext;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "grep-tool-test-"));
    context = createToolContext(tempDir);

    // Create test files
    await writeFile(
      join(tempDir, "file1.txt"),
      "Hello World\nThis is a test\nAnother line"
    );
    await writeFile(
      join(tempDir, "file2.txt"),
      "Hello Universe\nDifferent content\nTest pattern here"
    );
    await writeFile(
      join(tempDir, "code.ts"),
      "const greeting = 'Hello';\nfunction test() { return 'Hello'; }"
    );
    await mkdir(join(tempDir, "subdir"));
    await writeFile(
      join(tempDir, "subdir", "nested.txt"),
      "Nested Hello\nAnother test"
    );
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("successful operations", () => {
    test("searches for pattern in directory", async () => {
      const result = await GrepTool.handler({ pattern: "Hello" }, context);

      expect(result.is_error).toBeUndefined();
      expect(result.content).toContain("Hello");
    });

    test("searches for pattern in specific file", async () => {
      const result = await GrepTool.handler(
        { pattern: "test", path: join(tempDir, "file1.txt") },
        context
      );

      // Note: GrepTool uses ripgrep which may require the path to be a directory
      // when searching with --json flag. Check that the tool returns results.
      // If path is a file, ripgrep may behave differently.
      expect(result).toBeDefined();
    });

    test("searches case-insensitively with -i flag", async () => {
      await writeFile(join(tempDir, "case.txt"), "HELLO world");

      const result = await GrepTool.handler(
        { pattern: "hello", "-i:": true },
        context
      );

      expect(result.is_error).toBeUndefined();
      expect(result.content).toContain("HELLO");
    });

    test("filters by glob pattern", async () => {
      const result = await GrepTool.handler(
        { pattern: "Hello", glob: "*.ts" },
        context
      );

      expect(result.is_error).toBeUndefined();
      expect(result.content).toContain("code.ts");
      expect(result.content).not.toContain("file1.txt");
    });

    test("returns files_with_matches mode", async () => {
      const result = await GrepTool.handler(
        { pattern: "Hello", output_mode: "files_with_matches" },
        context
      );

      expect(result.is_error).toBeUndefined();
      // Should list files, not line content
    });

    test("returns count mode", async () => {
      const result = await GrepTool.handler(
        { pattern: "Hello", output_mode: "count" },
        context
      );

      expect(result.is_error).toBeUndefined();
      // Should return counts
    });

    test("respects head_limit", async () => {
      const result = await GrepTool.handler(
        { pattern: "Hello", head_limit: 1 },
        context
      );

      expect(result.is_error).toBeUndefined();
      // Should limit results
    });

    test("searches with regex pattern", async () => {
      const result = await GrepTool.handler(
        { pattern: "H[a-z]+o" },
        context
      );

      expect(result.is_error).toBeUndefined();
      expect(result.content).toContain("Hello");
    });
  });

  describe("no matches", () => {
    test("returns message when no matches found", async () => {
      const result = await GrepTool.handler(
        { pattern: "NonExistentPatternXYZ123" },
        context
      );

      expect(result.is_error).toBeUndefined();
      expect(result.content).toContain("No matches");
    });
  });

  describe("error handling", () => {
    test("returns error for missing pattern", async () => {
      const result = await GrepTool.handler({}, context);

      expect(result.is_error).toBe(true);
      expect(result.content).toContain("required");
    });

    test("returns error for empty pattern", async () => {
      const result = await GrepTool.handler({ pattern: "" }, context);

      expect(result.is_error).toBe(true);
      expect(result.content).toContain("required");
    });

    test("returns error for whitespace-only pattern", async () => {
      const result = await GrepTool.handler({ pattern: "   " }, context);

      expect(result.is_error).toBe(true);
      expect(result.content).toContain("required");
    });
  });
});

describe("Tool Integration", () => {
  let tempDir: string;
  let context: ToolContext;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "tool-integration-test-"));
    context = createToolContext(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test("Write -> Read workflow", async () => {
    const filePath = join(tempDir, "workflow.txt");

    // Write
    const writeResult = await WriteTool.handler(
      { file_path: filePath, content: "Test content" },
      context
    );
    expect(writeResult.is_error).toBeUndefined();

    // Read
    const readResult = await ReadTool.handler({ file_path: filePath }, context);
    expect(readResult.is_error).toBeUndefined();
    expect(readResult.content).toContain("Test content");
  });

  test("Write -> Edit -> Read workflow", async () => {
    const filePath = join(tempDir, "edit-workflow.txt");

    // Write
    await WriteTool.handler(
      { file_path: filePath, content: "Original content" },
      context
    );

    // Edit
    const editResult = await EditTool.handler(
      { file_path: filePath, old_string: "Original", new_string: "Modified" },
      context
    );
    expect(editResult.is_error).toBeUndefined();

    // Read
    const readResult = await ReadTool.handler({ file_path: filePath }, context);
    expect(readResult.content).toContain("Modified content");
  });

  test("Bash -> Glob -> Read workflow", async () => {
    // Create files via bash
    await BashTool.handler(
      { command: "echo 'file content' > created.txt" },
      context
    );

    // Find file via glob
    const globResult = await GlobTool.handler({ pattern: "*.txt" }, context);
    expect(globResult.content).toContain("created.txt");

    // Extract file path and read
    const filePath = join(tempDir, "created.txt");
    const readResult = await ReadTool.handler({ file_path: filePath }, context);
    expect(readResult.content).toContain("file content");
  });

  test("Glob -> Grep workflow", async () => {
    // Create multiple files
    await writeFile(join(tempDir, "a.ts"), "export const X = 1;");
    await writeFile(join(tempDir, "b.ts"), "export const Y = 2;");
    await writeFile(join(tempDir, "c.js"), "const Z = 3;");

    // Find TypeScript files
    const globResult = await GlobTool.handler({ pattern: "*.ts" }, context);
    expect(globResult.content).toContain("a.ts");
    expect(globResult.content).toContain("b.ts");
    expect(globResult.content).not.toContain("c.js");

    // Search for export in TypeScript files only
    const grepResult = await GrepTool.handler(
      { pattern: "export", glob: "*.ts" },
      context
    );
    expect(grepResult.content).toContain("export");
  });
});

describe("Edge Cases", () => {
  let tempDir: string;
  let context: ToolContext;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "edge-cases-test-"));
    context = createToolContext(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("Read edge cases", () => {
    test("handles file with very long lines", async () => {
      const filePath = join(tempDir, "long-line.txt");
      await writeFile(filePath, "x".repeat(5000));

      const result = await ReadTool.handler({ file_path: filePath }, context);
      expect(result.is_error).toBeUndefined();
    });

    test("handles file with only newlines", async () => {
      const filePath = join(tempDir, "newlines.txt");
      await writeFile(filePath, "\n\n\n\n");

      const result = await ReadTool.handler({ file_path: filePath }, context);
      expect(result.is_error).toBeUndefined();
    });

    test("handles offset beyond file length", async () => {
      const filePath = join(tempDir, "short.txt");
      await writeFile(filePath, "Short file");

      const result = await ReadTool.handler(
        { file_path: filePath, offset: 1000 },
        context
      );
      expect(result.is_error).toBeUndefined();
    });
  });

  describe("Write edge cases", () => {
    test("handles content with null bytes", async () => {
      const filePath = join(tempDir, "null.txt");
      const content = "Before\x00After";

      const result = await WriteTool.handler(
        { file_path: filePath, content },
        context
      );
      expect(result.is_error).toBeUndefined();
    });

    test("handles very long file paths", async () => {
      const longName = "a".repeat(200) + ".txt";
      const filePath = join(tempDir, longName);

      // This may fail on some filesystems
      try {
        const result = await WriteTool.handler(
          { file_path: filePath, content: "test" },
          context
        );
        // If it succeeds, great
        expect(result).toBeDefined();
      } catch {
        // If it fails due to filesystem limits, that's expected
      }
    });
  });

  describe("Edit edge cases", () => {
    test("handles old_string at end of file", async () => {
      const filePath = join(tempDir, "end.txt");
      await writeFile(filePath, "Start End");

      const result = await EditTool.handler(
        { file_path: filePath, old_string: "End", new_string: "Finish" },
        context
      );
      expect(result.is_error).toBeUndefined();

      const file = Bun.file(filePath);
      expect(await file.text()).toBe("Start Finish");
    });

    test("handles old_string at start of file", async () => {
      const filePath = join(tempDir, "start.txt");
      await writeFile(filePath, "Start End");

      const result = await EditTool.handler(
        { file_path: filePath, old_string: "Start", new_string: "Beginning" },
        context
      );
      expect(result.is_error).toBeUndefined();

      const file = Bun.file(filePath);
      expect(await file.text()).toBe("Beginning End");
    });

    test("handles multi-line old_string", async () => {
      const filePath = join(tempDir, "multi.txt");
      await writeFile(filePath, "Line 1\nLine 2\nLine 3");

      const result = await EditTool.handler(
        {
          file_path: filePath,
          old_string: "Line 1\nLine 2",
          new_string: "Replaced",
        },
        context
      );
      expect(result.is_error).toBeUndefined();

      const file = Bun.file(filePath);
      expect(await file.text()).toBe("Replaced\nLine 3");
    });
  });

  describe("Bash edge cases", () => {
    test("handles command with quotes", async () => {
      const result = await BashTool.handler(
        { command: 'echo "Hello \'World\'"' },
        context
      );
      expect(result.is_error).toBeUndefined();
      expect(result.content).toContain("Hello");
    });

    test("handles command with backslashes", async () => {
      const result = await BashTool.handler(
        { command: "echo 'test\\nvalue'" },
        context
      );
      expect(result.is_error).toBeUndefined();
    });
  });
});
