/**
 * Tool Executor Tests - Parallel tool execution with hooks and permissions
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { executeTools, type ToolExecutionOptions } from "../tool-executor.js";
import type {
  ToolDefinition,
  ToolUseBlock,
  ToolResult,
  PermissionMode,
} from "../../../types/index.js";
import { PermissionManager } from "../../permissions.js";

// Mock tool definitions
const createMockTool = (
  name: string,
  handler: (args: Record<string, unknown>) => Promise<ToolResult>
): ToolDefinition => ({
  name,
  description: `Mock ${name} tool`,
  input_schema: {
    type: "object",
    properties: {},
  },
  handler,
});

describe("executeTools", () => {
  let permissionManager: PermissionManager;
  let toolResults: Array<{ id: string; result: ToolResult }>;

  beforeEach(() => {
    permissionManager = new PermissionManager("bypassPermissions");
    toolResults = [];
  });

  const createOptions = (
    tools: ToolDefinition[],
    overrides: Partial<ToolExecutionOptions> = {}
  ): ToolExecutionOptions => ({
    tools,
    workingDirectory: "/test",
    permissionMode: "bypassPermissions" as PermissionMode,
    permissionManager,
    onToolResult: (result) => toolResults.push(result),
    ...overrides,
  });

  describe("basic execution", () => {
    it("should execute a single tool and return result", async () => {
      const tools = [
        createMockTool("TestTool", async () => ({ content: "Success" })),
      ];

      const toolUseBlocks: ToolUseBlock[] = [
        { type: "tool_use", id: "tool1", name: "TestTool", input: {} },
      ];

      const results = await executeTools(toolUseBlocks, createOptions(tools));

      expect(results).toHaveLength(1);
      expect(results[0]?.tool_use_id).toBe("tool1");
      expect(results[0]?.content).toBe("Success");
      expect(results[0]?.is_error).toBeFalsy();
    });

    it("should execute multiple tools in parallel", async () => {
      const executionOrder: string[] = [];

      const tools = [
        createMockTool("Tool1", async () => {
          executionOrder.push("Tool1");
          await new Promise((r) => setTimeout(r, 10));
          return { content: "Result 1" };
        }),
        createMockTool("Tool2", async () => {
          executionOrder.push("Tool2");
          await new Promise((r) => setTimeout(r, 5));
          return { content: "Result 2" };
        }),
      ];

      const toolUseBlocks: ToolUseBlock[] = [
        { type: "tool_use", id: "tool1", name: "Tool1", input: {} },
        { type: "tool_use", id: "tool2", name: "Tool2", input: {} },
      ];

      const results = await executeTools(toolUseBlocks, createOptions(tools));

      expect(results).toHaveLength(2);
      // Both should have been started before either finished (parallel)
      expect(executionOrder).toContain("Tool1");
      expect(executionOrder).toContain("Tool2");
    });

    it("should return error for unknown tool", async () => {
      const tools = [
        createMockTool("KnownTool", async () => ({ content: "OK" })),
      ];

      const toolUseBlocks: ToolUseBlock[] = [
        { type: "tool_use", id: "tool1", name: "UnknownTool", input: {} },
      ];

      const results = await executeTools(toolUseBlocks, createOptions(tools));

      expect(results).toHaveLength(1);
      expect(results[0]?.is_error).toBe(true);
      expect(results[0]?.content).toContain("Unknown tool");
    });

    it("should handle tool handler errors", async () => {
      const tools = [
        createMockTool("FailingTool", async () => {
          throw new Error("Handler error");
        }),
      ];

      const toolUseBlocks: ToolUseBlock[] = [
        { type: "tool_use", id: "tool1", name: "FailingTool", input: {} },
      ];

      const results = await executeTools(toolUseBlocks, createOptions(tools));

      expect(results).toHaveLength(1);
      expect(results[0]?.is_error).toBe(true);
      expect(results[0]?.content).toContain("Handler error");
    });

    it("should pass tool input to handler", async () => {
      let receivedInput: Record<string, unknown> | null = null;

      const tools = [
        createMockTool("InputTool", async (args) => {
          receivedInput = args;
          return { content: "OK" };
        }),
      ];

      const toolUseBlocks: ToolUseBlock[] = [
        {
          type: "tool_use",
          id: "tool1",
          name: "InputTool",
          input: { path: "/test/file.txt", mode: "read" },
        },
      ];

      await executeTools(toolUseBlocks, createOptions(tools));

      expect(receivedInput).not.toBeNull();
      expect(receivedInput as unknown as Record<string, unknown>).toEqual({ path: "/test/file.txt", mode: "read" });
    });
  });

  describe("tool result callbacks", () => {
    it("should call onToolResult for successful tools", async () => {
      const tools = [
        createMockTool("SuccessTool", async () => ({ content: "Done" })),
      ];

      const toolUseBlocks: ToolUseBlock[] = [
        { type: "tool_use", id: "tool1", name: "SuccessTool", input: {} },
      ];

      await executeTools(toolUseBlocks, createOptions(tools));

      expect(toolResults).toHaveLength(1);
      expect(toolResults[0]?.id).toBe("tool1");
      expect(toolResults[0]?.result.content).toBe("Done");
    });

    it("should not call onToolResult for unknown tools", async () => {
      const tools: ToolDefinition[] = [];

      const toolUseBlocks: ToolUseBlock[] = [
        { type: "tool_use", id: "tool1", name: "Unknown", input: {} },
      ];

      await executeTools(toolUseBlocks, createOptions(tools));

      expect(toolResults).toHaveLength(0);
    });

    it("should not call onToolResult for failed tools", async () => {
      const tools = [
        createMockTool("FailingTool", async () => {
          throw new Error("Fail");
        }),
      ];

      const toolUseBlocks: ToolUseBlock[] = [
        { type: "tool_use", id: "tool1", name: "FailingTool", input: {} },
      ];

      await executeTools(toolUseBlocks, createOptions(tools));

      expect(toolResults).toHaveLength(0);
    });
  });

  describe("abort signal", () => {
    it("should return empty array if signal is already aborted", async () => {
      const tools = [
        createMockTool("Tool", async () => ({ content: "OK" })),
      ];

      const controller = new AbortController();
      controller.abort();

      const toolUseBlocks: ToolUseBlock[] = [
        { type: "tool_use", id: "tool1", name: "Tool", input: {} },
      ];

      const results = await executeTools(
        toolUseBlocks,
        createOptions(tools, { signal: controller.signal })
      );

      expect(results).toHaveLength(0);
    });
  });

  describe("permission checks", () => {
    it("should deny tool when permission is denied", async () => {
      const tools = [
        createMockTool("RestrictedTool", async () => ({ content: "Should not reach" })),
      ];

      const denyManager = new PermissionManager("dontAsk");

      const toolUseBlocks: ToolUseBlock[] = [
        { type: "tool_use", id: "tool1", name: "RestrictedTool", input: {} },
      ];

      const results = await executeTools(
        toolUseBlocks,
        createOptions(tools, { permissionManager: denyManager })
      );

      expect(results).toHaveLength(1);
      expect(results[0]?.is_error).toBe(true);
      expect(results[0]?.content).toContain("Permission denied");
    });

    it("should allow tool when permission is granted", async () => {
      const tools = [
        createMockTool("AllowedTool", async () => ({ content: "Success" })),
      ];

      const toolUseBlocks: ToolUseBlock[] = [
        { type: "tool_use", id: "tool1", name: "AllowedTool", input: {} },
      ];

      const results = await executeTools(
        toolUseBlocks,
        createOptions(tools, { permissionManager })
      );

      expect(results[0]?.is_error).toBeFalsy();
      expect(results[0]?.content).toBe("Success");
    });
  });

  describe("hook integration", () => {
    it("should execute PreToolUse hooks", async () => {
      let hookCalled = false;

      const mockHookManager = {
        execute: async (event: string, input: any) => {
          if (event === "PreToolUse") {
            hookCalled = true;
          }
          return { decision: "allow" as const };
        },
      };

      const tools = [
        createMockTool("HookTool", async () => ({ content: "OK" })),
      ];

      const toolUseBlocks: ToolUseBlock[] = [
        { type: "tool_use", id: "tool1", name: "HookTool", input: {} },
      ];

      await executeTools(
        toolUseBlocks,
        createOptions(tools, { hookManager: mockHookManager as any })
      );

      expect(hookCalled).toBe(true);
    });

    it("should block tool when PreToolUse hook denies", async () => {
      const mockHookManager = {
        execute: async (event: string, input: any) => {
          if (event === "PreToolUse") {
            return { decision: "deny" as const, reason: "Blocked by hook" };
          }
          return { decision: "allow" as const };
        },
      };

      const tools = [
        createMockTool("BlockedTool", async () => ({ content: "Should not reach" })),
      ];

      const toolUseBlocks: ToolUseBlock[] = [
        { type: "tool_use", id: "tool1", name: "BlockedTool", input: {} },
      ];

      const results = await executeTools(
        toolUseBlocks,
        createOptions(tools, { hookManager: mockHookManager as any })
      );

      expect(results[0]?.is_error).toBe(true);
      expect(results[0]?.content).toContain("Blocked by hook");
    });

    it("should execute PostToolUse hooks", async () => {
      let postHookCalled = false;

      const mockHookManager = {
        execute: async (event: string, input: any) => {
          if (event === "PostToolUse") {
            postHookCalled = true;
          }
          return { decision: "allow" as const };
        },
      };

      const tools = [
        createMockTool("PostHookTool", async () => ({ content: "Result" })),
      ];

      const toolUseBlocks: ToolUseBlock[] = [
        { type: "tool_use", id: "tool1", name: "PostHookTool", input: {} },
      ];

      await executeTools(
        toolUseBlocks,
        createOptions(tools, { hookManager: mockHookManager as any })
      );

      expect(postHookCalled).toBe(true);
    });

    it("should modify tool input via hook", async () => {
      let receivedInput: Record<string, unknown> | null = null;

      const mockHookManager = {
        execute: async (event: string, input: any) => {
          if (event === "PreToolUse") {
            return {
              decision: "allow" as const,
              modified_input: { modified: true },
            };
          }
          return { decision: "allow" as const };
        },
      };

      const tools = [
        createMockTool("ModifiedInputTool", async (args) => {
          receivedInput = args;
          return { content: "OK" };
        }),
      ];

      const toolUseBlocks: ToolUseBlock[] = [
        {
          type: "tool_use",
          id: "tool1",
          name: "ModifiedInputTool",
          input: { original: true },
        },
      ];

      await executeTools(
        toolUseBlocks,
        createOptions(tools, { hookManager: mockHookManager as any })
      );

      // Object.assign merges properties, so we get both original and modified
      expect(receivedInput).not.toBeNull();
      expect(receivedInput as unknown as Record<string, unknown>).toEqual({ original: true, modified: true });
    });

    it("should execute PostToolUseFailure hooks on error", async () => {
      let failureHookCalled = false;

      const mockHookManager = {
        execute: async (event: string, input: any) => {
          if (event === "PostToolUseFailure") {
            failureHookCalled = true;
            expect(input.error).toContain("Handler crashed");
          }
          return { decision: "allow" as const };
        },
      };

      const tools = [
        createMockTool("CrashTool", async () => {
          throw new Error("Handler crashed");
        }),
      ];

      const toolUseBlocks: ToolUseBlock[] = [
        { type: "tool_use", id: "tool1", name: "CrashTool", input: {} },
      ];

      await executeTools(
        toolUseBlocks,
        createOptions(tools, { hookManager: mockHookManager as any })
      );

      expect(failureHookCalled).toBe(true);
    });
  });

  describe("error handling", () => {
    it("should handle non-Error thrown objects", async () => {
      const tools = [
        createMockTool("StringThrowTool", async () => {
          throw "String error";
        }),
      ];

      const toolUseBlocks: ToolUseBlock[] = [
        { type: "tool_use", id: "tool1", name: "StringThrowTool", input: {} },
      ];

      const results = await executeTools(toolUseBlocks, createOptions(tools));

      expect(results[0]?.is_error).toBe(true);
      expect(results[0]?.content).toContain("String error");
    });

    it("should handle null thrown", async () => {
      const tools = [
        createMockTool("NullThrowTool", async () => {
          throw null;
        }),
      ];

      const toolUseBlocks: ToolUseBlock[] = [
        { type: "tool_use", id: "tool1", name: "NullThrowTool", input: {} },
      ];

      const results = await executeTools(toolUseBlocks, createOptions(tools));

      expect(results[0]?.is_error).toBe(true);
    });
  });
});
