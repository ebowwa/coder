/**
 * Built-in Tools
 * Based on Claude Code binary analysis
 */

import type { ToolDefinition, ToolResult, ToolContext } from "../types/index.js";
import { glob as globAsync } from "glob";
import { spawn } from "child_process";

// ============================================
// READ TOOL
// ============================================

export const ReadTool: ToolDefinition = {
  name: "Read",
  description:
    "Reads a file from the local filesystem. You can access any file directly by using this tool.",
  input_schema: {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "The absolute path to the file to read",
      },
      offset: {
        type: "number",
        description: "The line number to start reading from (1-based)",
      },
      limit: {
        type: "number",
        description: "The number of lines to read",
      },
    },
    required: ["file_path"],
  },
  handler: async (args, context: ToolContext): Promise<ToolResult> => {
    const filePath = args.file_path as string;
    const offset = (args.offset as number) || 1;
    const limit = (args.limit as number) || 2000;

    try {
      const file = Bun.file(filePath);
      const text = await file.text();
      const lines = text.split("\n");

      // Apply offset and limit (1-based offset)
      const startLine = Math.max(0, offset - 1);
      const endLine = Math.min(lines.length, startLine + limit);
      const selectedLines = lines.slice(startLine, endLine);

      // Format with line numbers
      const formatted = selectedLines
        .map((line, i) => `${startLine + i + 1}\t${line}`)
        .join("\n");

      return { content: formatted };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { content: `Error reading file: ${errorMessage}`, is_error: true };
    }
  },
};

// ============================================
// WRITE TOOL
// ============================================

export const WriteTool: ToolDefinition = {
  name: "Write",
  description:
    "Writes a file to the local filesystem. This tool will overwrite the existing file if there is one at the provided path.",
  input_schema: {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "The absolute path to the file to write",
      },
      content: {
        type: "string",
        description: "The content to write to the file",
      },
    },
    required: ["file_path", "content"],
  },
  handler: async (args, context: ToolContext): Promise<ToolResult> => {
    const filePath = args.file_path as string;
    const content = args.content as string;

    try {
      await Bun.write(filePath, content);
      return { content: `Successfully wrote to ${filePath}` };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { content: `Error writing file: ${errorMessage}`, is_error: true };
    }
  },
};

// ============================================
// EDIT TOOL
// ============================================

export const EditTool: ToolDefinition = {
  name: "Edit",
  description:
    "Performs exact string replacements in files. Use this tool to modify existing files.",
  input_schema: {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "The absolute path to the file to modify",
      },
      old_string: {
        type: "string",
        description: "The text to replace",
      },
      new_string: {
        type: "string",
        description: "The text to replace it with",
      },
      replace_all: {
        type: "boolean",
        description: "Replace all occurrences (default false)",
      },
    },
    required: ["file_path", "old_string", "new_string"],
  },
  handler: async (args, context: ToolContext): Promise<ToolResult> => {
    const filePath = args.file_path as string;
    const oldString = args.old_string as string;
    const newString = args.new_string as string;
    const replaceAll = (args.replace_all as boolean) || false;

    try {
      const file = Bun.file(filePath);
      let content = await file.text();

      if (replaceAll) {
        const originalContent = content;
        content = content.split(oldString).join(newString);
        const count = (originalContent.match(new RegExp(escapeRegex(oldString), "g")) || []).length;
        if (count === 0) {
          return { content: `Error: String not found in file`, is_error: true };
        }
        await Bun.write(filePath, content);
        return { content: `Successfully replaced ${count} occurrences` };
      } else {
        const index = content.indexOf(oldString);
        if (index === -1) {
          return { content: `Error: String not found in file`, is_error: true };
        }
        // Check for uniqueness
        const secondIndex = content.indexOf(oldString, index + 1);
        if (secondIndex !== -1) {
          return {
            content: `Error: String appears multiple times in file. Use replace_all or provide more context.`,
            is_error: true,
          };
        }
        content = content.replace(oldString, newString);
        await Bun.write(filePath, content);
        return { content: `Successfully edited ${filePath}` };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { content: `Error editing file: ${errorMessage}`, is_error: true };
    }
  },
};

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ============================================
// BASH TOOL
// ============================================

export const BashTool: ToolDefinition = {
  name: "Bash",
  description:
    "Executes a given bash command with optional timeout. Working directory persists between commands.",
  input_schema: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The command to execute",
      },
      timeout: {
        type: "number",
        description: "Optional timeout in milliseconds (max 600000)",
      },
      description: {
        type: "string",
        description: "Clear, concise description of what this command does",
      },
    },
    required: ["command"],
  },
  handler: async (args, context: ToolContext): Promise<ToolResult> => {
    const command = args.command as string;
    const timeout = (args.timeout as number) || 120000;

    try {
      const result = Bun.spawnSync(["sh", "-c", command], {
        cwd: context.workingDirectory,
        timeout,
        maxBuffer: 1024 * 1024 * 30, // 30MB
      });

      const stdout = result.stdout?.toString() || "";
      const stderr = result.stderr?.toString() || "";

      if (result.exitCode !== 0) {
        return {
          content: `Exit code: ${result.exitCode}\n${stdout}\n${stderr}`.trim(),
          is_error: true,
        };
      }

      return { content: stdout || "(no output)" };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { content: `Error executing command: ${errorMessage}`, is_error: true };
    }
  },
};

// ============================================
// GLOB TOOL
// ============================================

export const GlobTool: ToolDefinition = {
  name: "Glob",
  description:
    "Fast file pattern matching tool that works with any codebase size. Supports glob patterns.",
  input_schema: {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "The glob pattern to match files",
      },
      path: {
        type: "string",
        description: "The directory to search (default: current directory)",
      },
    },
    required: ["pattern"],
  },
  handler: async (args, context: ToolContext): Promise<ToolResult> => {
    const pattern = args.pattern as string;
    const path = (args.path as string) || context.workingDirectory;

    try {
      const files = await globAsync(pattern, {
        cwd: path,
        absolute: true,
        nodir: true,
      });

      if (files.length === 0) {
        return { content: "No files found matching pattern" };
      }

      return { content: files.sort().join("\n") };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { content: `Error searching files: ${errorMessage}`, is_error: true };
    }
  },
};

// ============================================
// GREP TOOL
// ============================================

export const GrepTool: ToolDefinition = {
  name: "Grep",
  description:
    "A powerful search tool built on ripgrep. Supports full regex syntax.",
  input_schema: {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "The regular expression pattern to search for",
      },
      path: {
        type: "string",
        description: "File or directory to search",
      },
      glob: {
        type: "string",
        description: "Glob pattern to filter files",
      },
      output_mode: {
        type: "string",
        enum: ["content", "files_with_matches", "count"],
        description: "Output mode (default: content)",
      },
      "-i:": {
        type: "boolean",
        description: "Case insensitive search",
      },
      "-C:": {
        type: "number",
        description: "Context lines around match",
      },
      head_limit: {
        type: "number",
        description: "Maximum number of results",
      },
    },
    required: ["pattern"],
  },
  handler: async (args, context: ToolContext): Promise<ToolResult> => {
    const pattern = args.pattern as string;
    const path = (args.path as string) || context.workingDirectory;
    const glob = args.glob as string | undefined;
    const outputMode = (args.output_mode as string) || "content";
    const caseInsensitive = args["-i:"] as boolean;
    const contextLines = args["-C:"] as number;
    const headLimit = args.head_limit as number;

    try {
      // Build ripgrep arguments
      const rgArgs = ["--json"];
      if (caseInsensitive) rgArgs.push("-i");
      if (contextLines) rgArgs.push("-C", String(contextLines));
      if (glob) rgArgs.push("--glob", glob);
      if (outputMode === "files_with_matches") rgArgs.push("--files-with-matches");
      if (outputMode === "count") rgArgs.push("--count");

      rgArgs.push(pattern, path);

      const result = Bun.spawnSync(["rg", ...rgArgs], {
        cwd: context.workingDirectory,
        maxBuffer: 1024 * 1024 * 10, // 10MB
      });

      const stdout = result.stdout?.toString() || "";

      if (!stdout.trim()) {
        return { content: "No matches found" };
      }

      // Parse JSON output for content mode
      if (outputMode === "content") {
        const lines = stdout.trim().split("\n");
        const matches: string[] = [];

        for (const line of lines.slice(0, headLimit || 100)) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.type === "match") {
              const filePath = parsed.data?.path?.text || "";
              const lineNum = parsed.data?.line_number || 0;
              const text = parsed.data?.lines?.text || "";
              matches.push(`${filePath}:${lineNum}:${text.trim()}`);
            }
          } catch {
            // Not JSON, use raw line
            matches.push(line);
          }
        }

        return { content: matches.join("\n") || "No matches found" };
      }

      return { content: stdout.trim() };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { content: `Error searching: ${errorMessage}`, is_error: true };
    }
  },
};

// ============================================
// ALL BUILT-IN TOOLS
// ============================================

export const builtInTools: ToolDefinition[] = [
  ReadTool,
  WriteTool,
  EditTool,
  BashTool,
  GlobTool,
  GrepTool,
];

export function getToolByName(name: string): ToolDefinition | undefined {
  return builtInTools.find((t) => t.name === name);
}
