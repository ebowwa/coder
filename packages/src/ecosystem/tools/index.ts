/**
 * Built-in Tools
 */

import type { ToolDefinition, ToolResult, ToolContext, ImageBlock } from "../../schemas/index.js";
import { glob as globAsync } from "glob";
import { spawn } from "child_process";
import { apply_multi_edits, validate_multi_edits, preview_multi_edits, type MultiEditEntry } from "../../native/index.js";
import {
  isImageExtension,
  isBinaryExclusion,
  readImageFile,
  toImageBlock,
  formatImageResult,
} from "../../core/image.js";
import { MODEL_ALIASES, resolveModelAlias } from "../../core/models.js";
import * as path from "path";

// ============================================
// READ TOOL
// ============================================

export const ReadTool: ToolDefinition = {
  name: "Read",
  description:
    "Reads a file from the local filesystem. You can access any file directly by using this tool.\n\nAssume this tool is able to read all files on the machine. If the User provides a path to a file assume that path is valid.\n\nThis tool allows Coder to read images (PNG, JPG, JPEG, GIF, WEBP) and PDF files.\n\nUsage:\n- The file_path parameter must be an absolute path, not a relative path\n- By default, reads up to 2000 lines starting from the beginning of the file\n- You can optionally specify line offset and limit (especially handy for long files)\n- Any lines longer than 2000 characters will be truncated\n- Results are returned using cat -n format, with line numbers starting at 1\n\nThis tool can read images (PNG, JPG, JPEG, GIF, WEBP). When reading images, the tool displays them visually.\n\nFor PDF files:\n- Get the pages parameter to read specific page ranges (e.g., pages: \"1-5\")\n- Maximum 20 pages per request\n- For large PDFs (more than 10 pages), you MUST provide the pages parameter to read specific page ranges.\n\nTry to read the whole file by default, but for particularly large files, you should consider reading the file in chunks.\n\nIf you read a file that exists but has empty contents you will receive a system reminder warning in place of file contents.",
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
      pages: {
        type: "string",
        description: "Page range for PDF files (e.g., \"1-5\")",
      },
    },
    required: ["file_path"],
  },
  handler: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const filePath = args.file_path as string;
    const offset = (args.offset as number) || 1;
    const limit = (args.limit as number) || 2000;

    // Validate required parameters
    if (!filePath || typeof filePath !== 'string' || filePath.trim() === '') {
      return { content: "Error: file_path parameter is required and must be a non-empty string", is_error: true };
    }

    try {
      // Get file extension to check for image files
      const ext = path.extname(filePath).toLowerCase().slice(1);

      // Check if this is an image file (GI8 set in binary)
      if (isImageExtension(ext)) {
        return await handleImageRead(filePath, context.abortSignal);
      }

      // Check for binary exclusions (CI8 set in binary)
      if (isBinaryExclusion(ext)) {
        return {
          content: `Binary file detected: ${filePath}\nThis file type (${ext}) is not supported for text reading.`,
          is_error: true,
        };
      }

      // Default text file reading
      const file = Bun.file(filePath);

      // Check if file exists
      if (!(await file.exists())) {
        return { content: `Error: File not found: ${filePath}`, is_error: true };
      }

      const text = await file.text();
      const lines = text.split("\n");

      // Apply offset and limit (1-based offset)
      const startLine = Math.max(0, offset - 1);
      const endLine = Math.min(lines.length, startLine + limit);
      const selectedLines = lines.slice(startLine, endLine);

      // Check for truncation
      const wasTruncated = endLine < lines.length;

      // Format with line numbers
      const formatted = selectedLines
        .map((line, i) => `${startLine + i + 1}\t${line}`)
        .join("\n");

      // Add truncation notice if applicable
      let result = formatted;
      if (wasTruncated) {
        result += `\n\n> WARNING: ${filePath} is ${lines.length} lines (limit: ${limit}). Only the first ${limit} lines were loaded.`;
      }

      return { content: result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { content: `Error reading file: ${errorMessage}`, is_error: true };
    }
  },
};

/**
 * Handle reading image files (bwA function in binary)
 */
async function handleImageRead(filePath: string, signal?: AbortSignal): Promise<ToolResult> {
  try {
    const result = await readImageFile(filePath, 25000, signal);
    const meta = formatImageResult(result);

    // glm-5 doesn't support vision -- route through the dedicated vision model
    try {
      const { getVisionLLM } = await import("../../core/meta-llm-client.js");
      const analysis = await getVisionLLM().completeWithImage(
        `You are an image analyzer for a coding agent. Describe what you see concisely and accurately. Focus on: UI elements, layout, text content, errors, visual bugs, colors, and structure. Be factual, not decorative. Max 300 words.`,
        `Describe this image from file: ${path.basename(filePath)}`,
        { base64: result.base64, mediaType: result.mediaType },
        1024,
      );

      if (analysis?.text) {
        return {
          content: `${meta}\n\nVision analysis (via ${analysis.inputTokens + analysis.outputTokens} tokens, ${analysis.durationMs}ms):\n${analysis.text}`,
        };
      }
    } catch { /* vision model unavailable -- fall through */ }

    return {
      content: `${meta}\n\nNote: Vision model unavailable. Image was read but could not be analyzed visually.`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { content: `Error reading image: ${errorMessage}`, is_error: true };
  }
}

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
  handler: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const filePath = args.file_path as string;
    const content = args.content as string;

    // Validate required parameters
    if (!filePath || typeof filePath !== 'string' || filePath.trim() === '') {
      return { content: "Error: file_path parameter is required and must be a non-empty string", is_error: true };
    }
    if (content === undefined || content === null) {
      return { content: "Error: content parameter is required", is_error: true };
    }

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
  handler: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const filePath = args.file_path as string;
    const oldString = args.old_string as string;
    const newString = args.new_string as string;
    const replaceAll = (args.replace_all as boolean) || false;

    // Validate required parameters
    if (!filePath || typeof filePath !== 'string' || filePath.trim() === '') {
      return { content: "Error: file_path parameter is required and must be a non-empty string", is_error: true };
    }
    if (oldString === undefined || oldString === null) {
      return { content: "Error: old_string parameter is required", is_error: true };
    }
    if (newString === undefined || newString === null) {
      return { content: "Error: new_string parameter is required", is_error: true };
    }

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
  handler: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const command = args.command as string;
    const timeout = (args.timeout as number) || 120000;

    // Validate required parameters
    if (!command || typeof command !== 'string' || command.trim() === '') {
      return { content: "Error: command parameter is required and must be a non-empty string", is_error: true };
    }

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
  handler: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const pattern = args.pattern as string;
    const searchPath = (args.path as string) || context.workingDirectory;

    // Validate required parameters
    if (!pattern || typeof pattern !== 'string' || pattern.trim() === '') {
      return { content: "Error: pattern parameter is required and must be a non-empty string", is_error: true };
    }

    try {
      const files = await globAsync(pattern, {
        cwd: searchPath,
        absolute: true,
        nodir: true,
        ignore: [
          "**/node_modules/**",
          "**/.git/**",
          "**/dist/**",
          "**/.next/**",
          "**/build/**",
        ],
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
  handler: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const pattern = args.pattern as string;
    const searchPath = (args.path as string) || context.workingDirectory;
    const glob = args.glob as string | undefined;
    const outputMode = (args.output_mode as string) || "content";
    const caseInsensitive = args["-i:"] as boolean;
    const contextLines = args["-C:"] as number;
    const headLimit = args.head_limit as number;

    // Validate required parameters
    if (!pattern || typeof pattern !== 'string' || pattern.trim() === '') {
      return { content: "Error: pattern parameter is required and must be a non-empty string", is_error: true };
    }

    try {
      // Build ripgrep arguments
      const rgArgs = ["--json"];
      if (caseInsensitive) rgArgs.push("-i");
      if (contextLines) rgArgs.push("-C", String(contextLines));
      if (glob) rgArgs.push("--glob", glob);
      if (outputMode === "files_with_matches") rgArgs.push("--files-with-matches");
      if (outputMode === "count") rgArgs.push("--count");

      rgArgs.push(pattern, searchPath);

      const result = Bun.spawnSync(["rg", ...rgArgs], {
        cwd: searchPath,
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
// TASK TOOL (Subagents)
// ============================================

export const TaskTool: ToolDefinition = {
  name: "Task",
  description: `Launch a new agent to handle complex, multi-step tasks autonomously.

The Task tool launches specialized agents (subprocesses) that autonomously handle complex tasks. Each agent type has specific capabilities and tools available to it.

Available agent types and their tools:
- Bash: Command execution specialist for running bash commands. Use for git operations, command execution, and other terminal tasks.
- general-purpose: General-purpose agent for researching complex questions, searching for code, and executing multi-step tasks.
- Explore: Fast agent specialized for exploring codebases. Use to quickly find files by patterns, search code for keywords, or answer questions about the codebase.
- Plan: Software architect agent for designing implementation plans. Returns step-by-step plans, identifies critical files and considers architectural trade-offs.

When using the Task tool, you must specify a subagent_type parameter to select the agent type.

Usage notes:
- Always include a short description (3-5 words) summarizing what the agent will do
- Launch multiple agents concurrently whenever possible to maximize performance
- Agents can be resumed using the "resume" parameter by passing the agent ID from a previous invocation.`,
  input_schema: {
    type: "object",
    properties: {
      subagent_type: {
        type: "string",
        enum: ["Bash", "general-purpose", "Explore", "Plan"],
        description: "The agent type to launch",
      },
      description: {
        type: "string",
        description: "A short (3-5 word) description of what the agent will do",
      },
      prompt: {
        type: "string",
        description: "The task for the agent to perform",
      },
      resume: {
        type: "string",
        description: "Resume a previous agent by its ID",
      },
      model: {
        type: "string",
        enum: ["sonnet", "opus", "haiku"],
        description: "Model for the subagent (default: haiku for quick tasks)",
      },
      run_in_background: {
        type: "boolean",
        description: "Run the agent in the background",
      },
    },
    required: ["subagent_type", "prompt"],
  },
  handler: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const subagentType = args.subagent_type as string;
    const prompt = args.prompt as string;
    const description = args.description as string | undefined;
    const model = (args.model as string) || "haiku";
    const resume = args.resume as string | undefined;
    const runInBackground = args.run_in_background as boolean;

    // Generate a unique agent ID
    const agentId = resume || `${subagentType.toLowerCase()}-${Date.now().toString(36)}`;

    try {
      // Get API key from environment (check multiple env var names)
      const apiKey = process.env.ANTHROPIC_API_KEY ||
                     process.env.CLAUDE_API_KEY ||
                     process.env.ANTHROPIC_AUTH_TOKEN ||
                     process.env.Z_AI_API_KEY || "";
      if (!apiKey) {
        return { content: "Error: No API key available for subagent. Set ANTHROPIC_API_KEY, CLAUDE_API_KEY, ANTHROPIC_AUTH_TOKEN, or Z_AI_API_KEY environment variable.", is_error: true };
      }

      // Map model names using centralized aliases
      const fullModel = resolveModelAlias(model) || MODEL_ALIASES.haiku!;

      // Find the CLI - check multiple locations
      // The CLI entry point is dist/interfaces/ui/terminal/cli/index.js (as defined in package.json bin)
      // When bundled, import.meta.dir points to dist/ directory
      const coderRoot = path.resolve(import.meta.dir, "..", "..");  // Go up from dist/ to coder root

      const possiblePaths = [
        // Check for globally installed 'coder' binary first (most reliable)
        "/usr/local/bin/coder",
        path.join(process.env.HOME || "", ".bun", "bin", "coder"),

        // Built CLI in dist (correct path)
        path.join(coderRoot, "dist", "interfaces", "ui", "terminal", "cli", "index.js"),

        // Source CLI (for development)
        path.join(coderRoot, "packages", "src", "interfaces", "ui", "terminal", "cli", "index.ts"),

        // Fallback: check relative to cwd
        path.join(process.cwd(), "dist", "interfaces", "ui", "terminal", "cli", "index.js"),
        path.join(process.cwd(), "packages", "src", "interfaces", "ui", "terminal", "cli", "index.ts"),
      ];

      let cliPath: string | null = null;
      for (const checkPath of possiblePaths) {
        try {
          const file = Bun.file(checkPath);
          if (await file.exists()) {
            cliPath = checkPath;
            break;
          }
        } catch {
          // Continue to next path
        }
      }

      // Also try to find 'coder' in PATH
      if (!cliPath) {
        try {
          const whichResult = Bun.spawnSync(["which", "coder"], { timeout: 5000 });
          if (whichResult.exitCode === 0) {
            const coderBin = whichResult.stdout?.toString().trim();
            if (coderBin) {
              cliPath = coderBin;
            }
          }
        } catch {
          // which command failed, continue
        }
      }

      if (!cliPath) {
        return {
          content: `Error: Could not find Coder CLI. Tried:\n${possiblePaths.join("\n")}\n\nAlso checked PATH for 'coder' binary.\n\nEnsure Coder is built (bun run build) and linked (bun link).`,
          is_error: true,
        };
      }

      // Build command arguments
      const cmdArgs = [
        "run",
        cliPath,
        "-m", fullModel,
        "-p", context.permissionMode,
        "-q", prompt,
      ];

      if (runInBackground) {
        // Spawn in background with proper env
        const child = Bun.spawn(["bun", ...cmdArgs], {
          cwd: context.workingDirectory,
          detached: true,
          stdio: ["ignore", "pipe", "pipe"],
          env: {
            ...process.env,
            ANTHROPIC_API_KEY: apiKey,
          },
        });

        // Don't wait for background tasks
        child.unref();

        return {
          content: JSON.stringify({
            agentId,
            status: "running",
            message: `Agent started in background. Use TaskOutput tool with task_id: "${agentId}" to check results.`,
            description: description || "Background task",
          }),
        };
      }

      // Run synchronously with timeout
      const result = Bun.spawnSync(["bun", ...cmdArgs], {
        cwd: context.workingDirectory,
        timeout: 300000, // 5 minutes max
        maxBuffer: 1024 * 1024 * 10, // 10MB
        env: {
          ...process.env,
          ANTHROPIC_API_KEY: apiKey,
        },
      });

      const MAX_TASK_OUTPUT_CHARS = 4000;
      const rawStdout = result.stdout?.toString() || "";
      const stderr = result.stderr?.toString() || "";

      if (result.exitCode !== 0) {
        return {
          content: `Agent failed with exit code ${result.exitCode}\n${stderr}\n${rawStdout}`.trim(),
          is_error: true,
        };
      }

      const outputTruncated = rawStdout.length > MAX_TASK_OUTPUT_CHARS;
      const output = outputTruncated
        ? rawStdout.slice(0, MAX_TASK_OUTPUT_CHARS) +
          `\n\n[Output truncated: ${rawStdout.length} chars total. Use Read tool for full content.]`
        : rawStdout;

      return {
        content: JSON.stringify({
          agentId,
          status: "completed",
          output,
          description: description || "Task completed",
        }),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { content: `Error running subagent: ${errorMessage}`, is_error: true };
    }
  },
};

// ============================================
// TASK OUTPUT TOOL
// ============================================

export const TaskOutputTool: ToolDefinition = {
  name: "TaskOutput",
  description: `Retrieves output from a running or completed task (background shell, agent, or remote session).

Takes a task_id parameter identifying the task.
Returns the task output along with status information.
Use block=true (default) to wait for task completion.
Use block=false for non-blocking check of current status.

Task IDs can be found using the /tasks command
Works with all task types: background shells, async agents, and remote sessions`,
  input_schema: {
    type: "object",
    properties: {
      task_id: {
        type: "string",
        description: "The task ID to get output from",
      },
      block: {
        type: "boolean",
        description: "Whether to wait for completion (default: true)",
        default: true,
      },
      timeout: {
        type: "number",
        description: "Max wait time in ms (default: 30000, max: 600000)",
        default: 30000,
        minimum: 0,
        maximum: 600000,
      },
    },
    required: ["task_id"],
  },
  handler: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const taskId = args.task_id as string;
    const block = (args.block as boolean) ?? true;
    const timeout = (args.timeout as number) ?? 30000;

    try {
      // In a real implementation, this would check a task registry
      // For now, we'll check for background task output files
      const taskFile = `${context.workingDirectory}/.claude/tasks/${taskId}.json`;

      const file = Bun.file(taskFile);
      if (!(await file.exists())) {
        return {
          content: `Task not found: ${taskId}. Use /tasks to list available tasks.`,
          is_error: true,
        };
      }

      const taskData = await file.json() as {
        status: string;
        output?: string;
        error?: string;
        startTime: number;
        endTime?: number;
      };

      if (block && taskData.status === "running") {
        // Wait for task completion with timeout
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const updatedFile = Bun.file(taskFile);
          if (await updatedFile.exists()) {
            const updatedData = await updatedFile.json() as typeof taskData;
            if (updatedData.status !== "running") {
              return {
                content: JSON.stringify({
                  task_id: taskId,
                  status: updatedData.status,
                  output: updatedData.output,
                  error: updatedData.error,
                  duration: updatedData.endTime
                    ? updatedData.endTime - updatedData.startTime
                    : null,
                }, null, 2),
              };
            }
          }
        }
        return {
          content: JSON.stringify({
            task_id: taskId,
            status: "timeout",
            message: `Task still running after ${timeout}ms`,
          }, null, 2),
        };
      }

      return {
        content: JSON.stringify({
          task_id: taskId,
          status: taskData.status,
          output: taskData.output,
          error: taskData.error,
          duration: taskData.endTime
            ? taskData.endTime - taskData.startTime
            : null,
        }, null, 2),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { content: `Error getting task output: ${errorMessage}`, is_error: true };
    }
  },
};

// ============================================
// ASK USER QUESTION TOOL
// ============================================

export const AskUserQuestionTool: ToolDefinition = {
  name: "AskUserQuestion",
  description: `Use this tool when you need to ask the user questions during execution.

This allows you to:
1. Gather user preferences or requirements
2. Clarify ambiguous instructions
3. Get decisions on implementation choices
4. Offer choices to the user about what direction to take

Plan mode note: In plan mode, use this tool to clarify requirements or choose between approaches BEFORE finalizing your plan. Do NOT use this tool if your plan is ready - that's what ExitPlanMode is for.

The options array should have 2-4 options. Each option should be a distinct, mutually exclusive choice.
The preview feature allows showing markdown content in a side-by-side layout.

User can always select "Other" to provide custom text input.`,
  input_schema: {
    type: "object",
    properties: {
      questions: {
        type: "array",
        description: "Questions to ask the user (1-4 questions)",
        items: {
          type: "object",
          properties: {
            question: {
              type: "string",
              description: "The complete question to ask the user",
            },
            header: {
              type: "string",
              description: "Very short label displayed as a chip/tag (max 12 chars)",
            },
            options: {
              type: "array",
              description: "The available choices (2-4 options)",
              items: {
                type: "object",
                properties: {
                  label: {
                    type: "string",
                    description: "The display text for this option (5 words max)",
                  },
                  description: {
                    type: "string",
                    description: "Explanation of what this option means",
                  },
                  markdown: {
                    type: "string",
                    description: "Optional preview content shown in a monospace box",
                  },
                },
                required: ["label", "description"],
              },
              minItems: 2,
              maxItems: 4,
            },
            multiSelect: {
              type: "boolean",
              description: "Allow selecting multiple options (default: false)",
              default: false,
            },
          },
          required: ["question", "header", "options"],
        },
        minItems: 1,
        maxItems: 4,
      },
    },
    required: ["questions"],
  },
  handler: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const questions = args.questions as Array<{
      question: string;
      header: string;
      options: Array<{ label: string; description: string; markdown?: string }>;
      multiSelect?: boolean;
    }>;

    try {
      // Format questions for display
      const formattedQuestions = questions.map((q, i) => {
        const options = q.options
          .map((opt, j) => {
            let optionText = `  ${j + 1}. ${opt.label}`;
            if (opt.description) {
              optionText += ` - ${opt.description}`;
            }
            return optionText;
          })
          .join("\n");

        return `## Question ${i + 1}: [${q.header}]\n${q.question}\n\nOptions:\n${options}${q.multiSelect ? "\n(multi-select enabled)" : ""}`;
      }).join("\n\n---\n\n");

      // In interactive mode, this would prompt the user
      // For now, return the formatted questions
      return {
        content: JSON.stringify({
          type: "user_question",
          questions: questions,
          formatted: formattedQuestions,
          message: "Questions prepared for user response",
        }, null, 2),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { content: `Error preparing questions: ${errorMessage}`, is_error: true };
    }
  },
};

// ============================================
// ENTER PLAN MODE TOOL
// ============================================

export const EnterPlanModeTool: ToolDefinition = {
  name: "EnterPlanMode",
  description: `Use this tool when you are in plan mode and have finished writing your plan to the plan file and are ready for user approval.

How This Tool Works:
- You should have already written your plan to the plan file specified in the plan mode system message
- This tool does NOT take the plan content as a parameter - it will read the plan from the file you wrote
- This tool simply signals that you're done planning and ready for the user to review and approve

When to Use This Tool:
IMPORTANT: Only use this tool when the task requires planning the implementation steps of a task that requires writing code. For research tasks where you're gathering information, searching files, reading files or in general trying to understand the codebase - do NOT use this tool.

Plan mode note: In plan mode, use this tool to clarify requirements or choose between approaches BEFORE finalizing your plan. Do NOT use this tool if your plan is ready - that's what ExitPlanMode is for.

Examples:
- "Search for and understand the implementation of vim mode" - Do NOT use this tool
- "Help me implement yank mode for vim" - Use EnterPlanMode

Important notes:
- NEVER run additional commands to read or explore code, besides git bash commands
- NEVER use the TodoWrite or Task tools
- DO NOT commit files that likely contain secrets (.env, credentials.json, etc.)
- If you discover unexpected state like unfamiliar files, branches, or configuration, investigate before deleting or overwriting`,
  input_schema: {
    type: "object",
    properties: {
      allowedPrompts: {
        type: "array",
        description: "Prompt-based permissions needed to implement the plan",
        items: {
          type: "object",
          properties: {
            tool: {
              type: "string",
              description: "The tool this prompt applies to (e.g., 'Bash')",
            },
            prompt: {
              type: "string",
              description: "Semantic description of the action (e.g., 'run tests', 'install dependencies')",
            },
          },
          required: ["tool", "prompt"],
        },
      },
    },
    required: [],
  },
  handler: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const allowedPrompts = args.allowedPrompts as Array<{ tool: string; prompt: string }> | undefined;

    try {
      // Read the plan file
      const planFile = `${context.workingDirectory}/.claude/plan.md`;
      const file = Bun.file(planFile);

      if (!(await file.exists())) {
        return {
          content: "Error: No plan file found. Please write your plan to .claude/plan.md first.",
          is_error: true,
        };
      }

      const planContent = await file.text();

      return {
        content: JSON.stringify({
          type: "plan_ready",
          planFile: planFile,
          planLength: planContent.length,
          allowedPrompts: allowedPrompts || [],
          message: "Plan is ready for user review. ExitPlanMode will request user approval.",
        }, null, 2),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { content: `Error entering plan mode: ${errorMessage}`, is_error: true };
    }
  },
};

// ============================================
// EXIT PLAN MODE TOOL
// ============================================

export const ExitPlanModeTool: ToolDefinition = {
  name: "ExitPlanMode",
  description: `Use this tool when you are in plan mode and have finished writing your plan to the plan file and are ready for user approval.

This tool does NOT take the plan content as a parameter - it will read the plan from the file you wrote.
This tool simply signals that you're done planning and ready for the user to review and approve.

IMPORTANT: Only use this tool when the task requires planning the implementation steps of a task that requires writing code.
ExitPlanMode inherently requests user approval of the plan.`,
  input_schema: {
    type: "object",
    properties: {
      allowedPrompts: {
        type: "array",
        description: "Prompt-based permissions needed to implement the plan",
        items: {
          type: "object",
          properties: {
            tool: {
              type: "string",
              description: "The tool this prompt applies to",
            },
            prompt: {
              type: "string",
              description: "Semantic description of the action",
            },
          },
          required: ["tool", "prompt"],
        },
      },
    },
    required: [],
  },
  handler: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const allowedPrompts = args.allowedPrompts as Array<{ tool: string; prompt: string }> | undefined;

    try {
      // Read the plan file
      const planFile = `${context.workingDirectory}/.claude/plan.md`;
      const file = Bun.file(planFile);

      if (!(await file.exists())) {
        return {
          content: "Error: No plan file found at .claude/plan.md",
          is_error: true,
        };
      }

      const planContent = await file.text();

      return {
        content: JSON.stringify({
          type: "exit_plan_mode",
          status: "awaiting_approval",
          planFile: planFile,
          planPreview: planContent.slice(0, 500) + (planContent.length > 500 ? "..." : ""),
          allowedPrompts: allowedPrompts || [],
          message: "Plan submitted for user approval.",
        }, null, 2),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { content: `Error exiting plan mode: ${errorMessage}`, is_error: true };
    }
  },
};

// ============================================
// SKILL TOOL
// ============================================

export const SkillTool: ToolDefinition = {
  name: "Skill",
  description: `Execute a skill within the main conversation.

When users ask you to perform tasks, check if any of the available skills match. Skills provide specialized capabilities and domain knowledge.

When users reference a "slash command" or "/<something>" (e.g., "/commit", "/review-pr"), they are referring to a skill. Use this tool to invoke it.

How to invoke:
- Use this tool with the skill name and optional arguments
- Examples:
  - skill: "commit" - invoke the commit skill
  - skill: "review-pr", args: "123" - invoke with arguments
- Use fully qualified name for namespaced skills: skill: "ms-office-suite:pdf"

Available skills are listed in system-reminder messages in the conversation.
When a skill matches the user's request, this is a BLOCKING REQUIREMENT: invoke the relevant Skill tool BEFORE generating any other response about the task.

Important:
- NEVER mention a skill without actually calling this tool
- Do not invoke a skill that is already running
- Do not use this tool for built-in CLI commands (like /help, /clear)`,
  input_schema: {
    type: "object",
    properties: {
      skill: {
        type: "string",
        description: "The skill name (e.g., 'commit', 'review-pr', or fully qualified 'namespace:skill')",
      },
      args: {
        type: "string",
        description: "Optional arguments for the skill",
      },
    },
    required: ["skill"],
  },
  handler: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const skillName = args.skill as string;
    const skillArgs = args.args as string | undefined;

    try {
      // 1. Check built-in skills first
      const builtInSkills = ["commit", "review-pr", "mcp-builder", "hooks", "claude-api", "simplify", "skill-creator"];
      if (builtInSkills.includes(skillName)) {
        return {
          content: JSON.stringify({
            type: "skill_invocation",
            skill: skillName,
            args: skillArgs,
            source: "built-in",
            message: `Built-in skill "${skillName}" invoked. The skill instructions are now active.`,
          }, null, 2),
        };
      }

      // 2. Check local skill files
      const skillsDir = `${context.workingDirectory}/.claude/skills`;
      const globalSkillsDir = `${process.env.HOME || ""}/.claude/skills`;

      const possiblePaths = [
        `${skillsDir}/${skillName}.md`,
        `${skillsDir}/${skillName}/skill.md`,
        `${globalSkillsDir}/${skillName}.md`,
        `${globalSkillsDir}/${skillName}/skill.md`,
      ];

      let skillFile: string | null = null;
      for (const path of possiblePaths) {
        const file = Bun.file(path);
        if (await file.exists()) {
          skillFile = path;
          break;
        }
      }

      if (skillFile) {
        const file = Bun.file(skillFile);
        const skillContent = await file.text();

        return {
          content: JSON.stringify({
            type: "skill_invocation",
            skill: skillName,
            args: skillArgs,
            skillFile: skillFile,
            source: "local",
            content: skillContent,
            message: `Skill "${skillName}" loaded from local file.`,
          }, null, 2),
        };
      }

      // 3. Try marketplace (if API key available)
      const apiKey = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN;
      if (apiKey) {
        try {
          const { SkillsClient } = await import("../skills/skills-client.js");
          const client = new SkillsClient(apiKey);
          const marketplaceSkill = await client.getByName(skillName);

          if (marketplaceSkill) {
            return {
              content: JSON.stringify({
                type: "skill_invocation",
                skill: skillName,
                args: skillArgs,
                source: "marketplace",
                skillData: marketplaceSkill,
                content: marketplaceSkill.prompt,
                message: `Skill "${skillName}" loaded from marketplace.`,
              }, null, 2),
            };
          }
        } catch (marketplaceError) {
          // Marketplace lookup failed, fall through to error
          console.error("Marketplace lookup failed:", marketplaceError);
        }
      }

      // 4. Skill not found anywhere
      return {
        content: `Skill not found: ${skillName}

Available sources checked:
- Built-in skills: ${builtInSkills.join(", ")}
- Local skills: ${skillsDir}
- Global skills: ${globalSkillsDir}
- Marketplace: ${apiKey ? "checked" : "no API key"}

Use /help to see available skills.`,
        is_error: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { content: `Error invoking skill: ${errorMessage}`, is_error: true };
    }
  },
};

// ============================================
// TASK STOP TOOL
// ============================================

export const TaskStopTool: ToolDefinition = {
  name: "TaskStop",
  description: `Stops a running background task by its ID.
Takes a task_id parameter identifying the task to stop.
Returns a success or failure status.
Use this tool to terminate a long-running task.`,
  input_schema: {
    type: "object",
    properties: {
      task_id: {
        type: "string",
        description: "The ID of the background task to stop",
      },
      shell_id: {
        type: "string",
        description: "Deprecated: use task_id instead",
      },
    },
    required: ["task_id"],
  },
  handler: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const taskId = args.task_id as string;

    try {
      const taskFile = `${context.workingDirectory}/.claude/tasks/${taskId}.json`;
      const file = Bun.file(taskFile);

      if (!(await file.exists())) {
        return {
          content: `Task not found: ${taskId}`,
          is_error: true,
        };
      }

      const taskData = await file.json() as {
        status: string;
        pid?: number;
      };

      if (taskData.status !== "running") {
        return {
          content: JSON.stringify({
            task_id: taskId,
            status: taskData.status,
            message: `Task is already ${taskData.status}`,
          }, null, 2),
        };
      }

      // In a real implementation, this would kill the process
      // For now, just update the status
      taskData.status = "stopped";
      await Bun.write(taskFile, JSON.stringify(taskData, null, 2));

      return {
        content: JSON.stringify({
          task_id: taskId,
          status: "stopped",
          message: "Task stopped successfully",
        }, null, 2),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { content: `Error stopping task: ${errorMessage}`, is_error: true };
    }
  },
};

// ============================================
// MULTI-EDIT TOOL (Atomic Multi-File Editing)
// ============================================

export const MultiEditTool: ToolDefinition = {
  name: "MultiEdit",
  description: `Performs atomic multi-file editing with rollback on failure.

This tool allows you to edit multiple files simultaneously in a single atomic operation.
If any edit fails, all changes are automatically rolled back to maintain consistency.

Key features:
- Validates all edits before applying (files exist, strings found)
- Creates automatic backups before editing
- Applies all edits atomically (all-or-nothing)
- Rolls back on any failure

Use this when you need to make coordinated changes across multiple files and want
to ensure either all changes succeed or none are applied.

IMPORTANT: You MUST read the files first before using this tool. Only edit files you have already read.`,
  input_schema: {
    type: "object",
    properties: {
      edits: {
        type: "array",
        description: "Array of edit operations to apply atomically",
        items: {
          type: "object",
          properties: {
            file_path: {
              type: "string",
              description: "The absolute path to the file to edit",
            },
            old_string: {
              type: "string",
              description: "The text to find and replace",
            },
            new_string: {
              type: "string",
              description: "The text to replace it with",
            },
            replace_all: {
              type: "boolean",
              description: "Replace all occurrences (default: false)",
            },
          },
          required: ["file_path", "old_string", "new_string"],
        },
      },
      dry_run: {
        type: "boolean",
        description: "Preview changes without applying them (default: false)",
      },
    },
    required: ["edits"],
  },
  handler: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const rawEdits = args.edits as Array<{
      file_path?: string;
      old_string?: string;
      new_string?: string;
      replace_all?: boolean;
    }>;
    const dryRun = (args.dry_run as boolean) || false;

    try {
      // Validate inputs
      if (!Array.isArray(rawEdits) || rawEdits.length === 0) {
        return { content: "Error: edits must be a non-empty array", is_error: true };
      }

      // Validate each edit has required fields and convert to native format
      const edits: MultiEditEntry[] = [];
      for (let i = 0; i < rawEdits.length; i++) {
        const rawEdit = rawEdits[i];
        if (!rawEdit || !rawEdit.file_path || !rawEdit.old_string || rawEdit.new_string === undefined) {
          return {
            content: `Error: Edit at index ${i} is missing required fields (file_path, old_string, new_string)`,
            is_error: true,
          };
        }
        edits.push({
          filePath: rawEdit.file_path,
          oldString: rawEdit.old_string,
          newString: rawEdit.new_string,
          replaceAll: rawEdit.replace_all || false,
        });
      }

      // If dry run, just preview
      if (dryRun) {
        const preview = preview_multi_edits(edits);
        const errors = validate_multi_edits(edits);

        if (errors.length > 0) {
          return {
            content: JSON.stringify({
              valid: false,
              errors,
              preview: preview,
            }, null, 2),
            is_error: true,
          };
        }

        return {
          content: JSON.stringify({
            valid: true,
            preview: preview,
            total_files: preview.length,
            total_replacements: preview.reduce((sum, p) => sum + p.replacementCount, 0),
            message: "Dry run successful - no changes applied",
          }, null, 2),
        };
      }

      // Validate all edits first
      const errors = validate_multi_edits(edits);
      if (errors.length > 0) {
        return {
          content: `Validation failed:\n${errors.join("\n")}`,
          is_error: true,
        };
      }

      // Apply edits atomically
      const result = apply_multi_edits(edits);

      if (result.success) {
        return {
          content: JSON.stringify({
            success: true,
            files_modified: result.filesModified,
            total_replacements: result.totalReplacements,
            message: `Successfully applied ${result.totalReplacements} replacement(s) across ${result.filesModified.length} file(s)`,
          }, null, 2),
        };
      } else {
        return {
          content: JSON.stringify({
            success: false,
            error: result.error,
            rolled_back: result.rolledBack,
            files_modified: result.filesModified,
          }, null, 2),
          is_error: true,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { content: `Error applying multi-edit: ${errorMessage}`, is_error: true };
    }
  },
};

// ============================================
// NOTEBOOK EDIT TOOL
// ============================================

export const NotebookEditTool: ToolDefinition = {
  name: "NotebookEdit",
  description: `Completely replaces the contents of a specific cell in a Jupyter notebook (.ipynb file) with new source.

Jupyter notebooks are interactive documents that combine code, text, and visualizations. The notebook_path parameter must be an absolute path, not a relative path. The cell_number is 0-indexed. Use edit_mode=insert to add a new cell at the index specified by cell_number. Use edit_mode=delete to delete the cell at the index specified by cell_number.`,
  input_schema: {
    type: "object",
    properties: {
      notebook_path: {
        type: "string",
        description: "The absolute path to the Jupyter notebook file to edit",
      },
      cell_id: {
        type: "string",
        description: "The ID of the cell to edit (optional, alternative to cell_number)",
      },
      cell_number: {
        type: "number",
        description: "The index of the cell to edit (0-indexed)",
      },
      new_source: {
        type: "string",
        description: "The new source for the cell",
      },
      cell_type: {
        type: "string",
        enum: ["code", "markdown"],
        description: "The type of the cell (code or markdown). Defaults to code.",
      },
      edit_mode: {
        type: "string",
        enum: ["replace", "insert", "delete"],
        description: "The type of edit to perform (replace, insert, delete)",
      },
    },
    required: ["notebook_path"],
  },
  handler: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const notebookPath = args.notebook_path as string;
    const cellId = args.cell_id as string | undefined;
    const cellNumber = args.cell_number as number | undefined;
    const newSource = args.new_source as string | undefined;
    const cellType = (args.cell_type as string) || "code";
    const editMode = (args.edit_mode as string) || "replace";

    try {
      // Read the notebook
      const file = Bun.file(notebookPath);
      if (!await file.exists()) {
        return { content: `Error: Notebook not found: ${notebookPath}`, is_error: true };
      }

      const notebook = await file.json() as {
        cells: Array<{
          id?: string;
          cell_type: string;
          source: string | string[];
          outputs?: unknown[];
          metadata?: Record<string, unknown>;
          execution_count?: number | null;
        }>;
        metadata: Record<string, unknown>;
        nbformat: number;
        nbformat_minor: number;
      };

      // Validate notebook structure
      if (!notebook.cells || !Array.isArray(notebook.cells)) {
        return { content: "Error: Invalid notebook format - no cells array", is_error: true };
      }

      // Find the cell to edit
      let targetIndex: number;

      if (cellId) {
        // Find by cell ID
        targetIndex = notebook.cells.findIndex(c => c.id === cellId);
        if (targetIndex === -1) {
          return { content: `Error: Cell with ID "${cellId}" not found`, is_error: true };
        }
      } else if (cellNumber !== undefined) {
        targetIndex = cellNumber;
        if (targetIndex < 0 || targetIndex >= notebook.cells.length) {
          if (editMode === "insert") {
            // Allow inserting at the end
            targetIndex = notebook.cells.length;
          } else {
            return { content: `Error: Cell number ${targetIndex} out of range (0-${notebook.cells.length - 1})`, is_error: true };
          }
        }
      } else if (editMode !== "insert") {
        return { content: "Error: Must specify either cell_id or cell_number", is_error: true };
      } else {
        targetIndex = notebook.cells.length;
      }

      // Perform the edit
      switch (editMode) {
        case "delete": {
          notebook.cells.splice(targetIndex, 1);
          break;
        }

        case "insert": {
          const newCell = {
            id: `cell-${Date.now()}`,
            cell_type: cellType,
            source: newSource || "",
            metadata: {},
            ...(cellType === "code" ? { outputs: [] as unknown[], execution_count: null } : {}),
          };
          notebook.cells.splice(targetIndex, 0, newCell);
          break;
        }

        case "replace":
        default: {
          if (newSource === undefined) {
            return { content: "Error: new_source is required for replace mode", is_error: true };
          }
          const existingCell = notebook.cells[targetIndex];
          if (!existingCell) {
            return { content: `Error: Cell at index ${targetIndex} not found`, is_error: true };
          }
          notebook.cells[targetIndex] = {
            ...existingCell,
            source: newSource,
            cell_type: cellType,
            ...(cellType === "code" ? { execution_count: null } : {}),
          };
          break;
        }
      }

      // Write the notebook back
      await Bun.write(notebookPath, JSON.stringify(notebook, null, 1));

      return {
        content: JSON.stringify({
          success: true,
          message: `Successfully ${editMode}d cell in ${notebookPath}`,
          cellCount: notebook.cells.length,
        }),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { content: `Error editing notebook: ${errorMessage}`, is_error: true };
    }
  },
};

// ============================================
// ALL BUILT-IN TOOLS
// ============================================

// ============================================
// TEMPGlmVision TOOL (Simple Vision via GLM)
// ============================================

export const TempGlmVisionTool: ToolDefinition = {
  name: "tempglmvision",
  description: `Analyze images using GLM-4.6V vision model. Use this tool when you need to analyze, describe, or extract information from images. Supports PNG, JPG, JPEG, GIF, and WEBP formats. Accepts both local file paths and remote URLs.`,
  input_schema: {
    type: "object",
    properties: {
      imageSource: {
        type: "string",
        description: "Local file path or remote URL to the image (supports PNG, JPG, JPEG, GIF, WEBP)",
      },
      prompt: {
        type: "string",
        description: "Detailed text prompt describing what to analyze, extract, or understand from the image.",
      },
    },
    required: ["imageSource", "prompt"],
  },
  handler: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const imageSource = args.imageSource as string;
    const prompt = args.prompt as string;

    try {
      // Get API credentials from environment
      const apiKey = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN;
      if (!apiKey) {
        return {
          content: "Error: No API key found. Set ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN.",
          is_error: true,
        };
      }

      const baseUrl = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";

      // Read and encode the image
      let imageData: string;
      let mediaType: string;

      if (imageSource.startsWith("http://") || imageSource.startsWith("https://")) {
        // Fetch remote image
        const response = await fetch(imageSource);
        if (!response.ok) {
          return {
            content: `Error fetching image: ${response.status} ${response.statusText}`,
            is_error: true,
          };
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        imageData = buffer.toString("base64");

        // Detect media type from content-type header or extension
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("image/png")) {
          mediaType = "image/png";
        } else if (contentType?.includes("image/gif")) {
          mediaType = "image/gif";
        } else if (contentType?.includes("image/webp")) {
          mediaType = "image/webp";
        } else {
          mediaType = "image/jpeg"; // Default to JPEG
        }
      } else {
        // Local file path
        const file = Bun.file(imageSource);
        if (!(await file.exists())) {
          return {
            content: `Error: Image file not found: ${imageSource}`,
            is_error: true,
          };
        }
        const buffer = Buffer.from(await file.arrayBuffer());
        imageData = buffer.toString("base64");

        // Detect media type from extension
        const ext = path.extname(imageSource).toLowerCase();
        if (ext === ".png") {
          mediaType = "image/png";
        } else if (ext === ".gif") {
          mediaType = "image/gif";
        } else if (ext === ".webp") {
          mediaType = "image/webp";
        } else {
          mediaType = "image/jpeg";
        }
      }

      // Build request for vision model
      // Use GLM-5 for vision (supportsVision: true in models.ts)
      const request = {
        model: "glm-5",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: imageData,
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      };

      // Make API request
      const response = await fetch(`${baseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(request),
        signal: context.abortSignal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          content: `Vision API error: ${response.status} - ${errorText}`,
          is_error: true,
        };
      }

      const result = (await response.json()) as {
        content?: Array<{ type: string; text?: string }>;
        error?: { message: string };
      };

      if (result.error) {
        return {
          content: `Vision API error: ${result.error.message}`,
          is_error: true,
        };
      }

      // Extract text from response
      const textContent = result.content
        ?.filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n");

      return {
        content: textContent || "No text content in vision response",
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { content: `Error analyzing image: ${errorMessage}`, is_error: true };
    }
  },
};

// ============================================
// ANALYZE IMAGE TOOL (Vision via GLM)
// ============================================

export const AnalyzeImageTool: ToolDefinition = {
  name: "mcp__4_5v_mcp__analyze_image",
  description: `Analyze an image using advanced AI vision models with comprehensive understanding capabilities. Supports PNG, JPG, JPEG, GIF, and WEBP formats. Accepts both local file paths and remote URLs.`,
  input_schema: {
    type: "object",
    properties: {
      imageSource: {
        type: "string",
        description: "Local file path or remote URL to the image (supports PNG, JPG, JPEG, GIF, WEBP)",
      },
      prompt: {
        type: "string",
        description: "Detailed text prompt describing what to analyze, extract, or understand from the image. For front-end code replication, describe layout structure, color style, main components, and interactive elements.",
      },
    },
    required: ["imageSource", "prompt"],
  },
  handler: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const imageSource = args.imageSource as string;
    const prompt = args.prompt as string;

    try {
      // Get API credentials from environment
      const apiKey = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN;
      if (!apiKey) {
        return {
          content: "Error: No API key found. Set ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN.",
          is_error: true,
        };
      }

      const baseUrl = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";

      // Read and encode the image
      let imageData: string;
      let mediaType: string;

      if (imageSource.startsWith("http://") || imageSource.startsWith("https://")) {
        // Fetch remote image
        const response = await fetch(imageSource);
        if (!response.ok) {
          return {
            content: `Error fetching image: ${response.status} ${response.statusText}`,
            is_error: true,
          };
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        imageData = buffer.toString("base64");

        // Detect media type from content-type header or extension
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("image/png")) {
          mediaType = "image/png";
        } else if (contentType?.includes("image/gif")) {
          mediaType = "image/gif";
        } else if (contentType?.includes("image/webp")) {
          mediaType = "image/webp";
        } else {
          mediaType = "image/jpeg"; // Default to JPEG
        }
      } else {
        // Local file path
        const file = Bun.file(imageSource);
        if (!(await file.exists())) {
          return {
            content: `Error: Image file not found: ${imageSource}`,
            is_error: true,
          };
        }
        const buffer = Buffer.from(await file.arrayBuffer());
        imageData = buffer.toString("base64");

        // Detect media type from extension
        const ext = path.extname(imageSource).toLowerCase();
        if (ext === ".png") {
          mediaType = "image/png";
        } else if (ext === ".gif") {
          mediaType = "image/gif";
        } else if (ext === ".webp") {
          mediaType = "image/webp";
        } else {
          mediaType = "image/jpeg";
        }
      }

      // Build request for vision model
      const request = {
        model: "glm-5", // Vision-capable model
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: imageData,
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      };

      // Make API request
      const response = await fetch(`${baseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(request),
        signal: context.abortSignal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          content: `Vision API error: ${response.status} - ${errorText}`,
          is_error: true,
        };
      }

      const result = (await response.json()) as {
        content?: Array<{ type: string; text?: string }>;
        error?: { message: string };
      };

      if (result.error) {
        return {
          content: `Vision API error: ${result.error.message}`,
          is_error: true,
        };
      }

      // Extract text from response
      const textContent = result.content
        ?.filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n");

      return {
        content: textContent || "No text content in vision response",
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { content: `Error analyzing image: ${errorMessage}`, is_error: true };
    }
  },
};

export const builtInTools: ToolDefinition[] = [
  ReadTool,
  WriteTool,
  EditTool,
  MultiEditTool,
  BashTool,
  GlobTool,
  GrepTool,
  TaskTool,
  TaskOutputTool,
  TaskStopTool,
  AskUserQuestionTool,
  EnterPlanModeTool,
  ExitPlanModeTool,
  SkillTool,
  NotebookEditTool,
  AnalyzeImageTool,
  TempGlmVisionTool,
];

export function getToolByName(name: string): ToolDefinition | undefined {
  return builtInTools.find((t) => t.name === name);
}
