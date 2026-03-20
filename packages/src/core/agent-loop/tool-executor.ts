/**
 * Tool Executor - Parallel tool execution with hooks and permissions
 *
 * Claude Code Parity Features:
 * - Tool restrictions: allowedTools/disallowedTools enforcement
 * - Teammate context: Per-agent tool restrictions from templates
 */

import type {
  ToolDefinition,
  ToolUseBlock,
  ToolResultBlock,
  ToolResult,
  PermissionMode,
  ToolRestrictions,
} from "../../schemas/index.js";
import type { PermissionManager, PermissionResult } from "../permissions.js";
import type { HookManager } from "../../ecosystem/hooks/index.js";

export interface ToolExecutionOptions {
  tools: ToolDefinition[];
  workingDirectory: string;
  permissionMode: PermissionMode;
  hookManager?: HookManager;
  sessionId?: string;
  signal?: AbortSignal;
  permissionManager: import("../permissions.js").PermissionManager;
  onToolResult?: (result: { id: string; result: ToolResult }) => void;
  /** Tool restrictions from template/agent type (Claude Code parity) */
  toolRestrictions?: ToolRestrictions;
  /** Teammate ID for per-agent restrictions */
  teammateId?: string;
}

/**
 * Internal result of a single tool execution
 */
interface ToolExecutionResult {
  toolUseId: string;
  result: ToolResultBlock;
  toolResult: { id: string; result: ToolResult } | null;
}

/**
 * Safely convert tool input to Record<string, unknown>
 * Handles edge cases: null, undefined, non-object types
 */
function toInputRecord(input: unknown): Record<string, unknown> {
  if (input === null || input === undefined) {
    return {};
  }
  if (typeof input !== "object") {
    // Primitive types wrapped in a generic key
    return { value: input };
  }
  if (Array.isArray(input)) {
    // Arrays wrapped in items key
    return { items: input };
  }
  return input as Record<string, unknown>;
}

/**
 * Execute a single tool with permission checks and hooks
 */
async function executeSingleTool(
  toolUse: ToolUseBlock,
  options: ToolExecutionOptions
): Promise<ToolExecutionResult> {
  const { tools, workingDirectory, permissionMode, hookManager, sessionId, signal, permissionManager, toolRestrictions, teammateId } = options;

  const tool = tools.find((t) => t.name === toolUse.name);

  if (!tool) {
    return {
      toolUseId: toolUse.id,
      result: {
        type: "tool_result" as const,
        tool_use_id: toolUse.id,
        content: `Error: Unknown tool "${toolUse.name}"`,
        is_error: true,
      },
      toolResult: null,
    };
  }

  // ============================================
  // TOOL RESTRICTIONS CHECK (Claude Code parity)
  // ============================================

  // Check disallowedTools first
  if (toolRestrictions?.disallowedTools?.includes(tool.name)) {
    return {
      toolUseId: toolUse.id,
      result: {
        type: "tool_result" as const,
        tool_use_id: toolUse.id,
        content: `Tool "${tool.name}" is not allowed for this agent type. Disallowed tools: ${toolRestrictions.disallowedTools.join(", ")}`,
        is_error: true,
      },
      toolResult: null,
    };
  }

  // Check allowedTools (if set, tool must be in the list)
  if (toolRestrictions?.allowedTools && toolRestrictions.allowedTools.length > 0) {
    if (!toolRestrictions.allowedTools.includes(tool.name)) {
      return {
        toolUseId: toolUse.id,
        result: {
          type: "tool_result" as const,
          tool_use_id: toolUse.id,
          content: `Tool "${tool.name}" is not allowed for this agent type. Allowed tools: ${toolRestrictions.allowedTools.join(", ")}`,
          is_error: true,
        },
        toolResult: null,
      };
    }
  }

  // Check permissions using PermissionManager
  const permissionResult = await permissionManager.checkPermission(
    tool.name,
    toInputRecord(toolUse.input)
  );

  if (permissionResult.decision === "deny" || permissionResult.decision === "denyAlways") {
    return {
      toolUseId: toolUse.id,
      result: {
        type: "tool_result" as const,
        tool_use_id: toolUse.id,
        content: `Permission denied for tool "${toolUse.name}"${permissionResult.reason ? `: ${permissionResult.reason}` : ""}`,
        is_error: true,
      },
      toolResult: null,
    };
  }

  // Execute PreToolUse hooks
  if (hookManager) {
    const hookResult = await hookManager.execute("PreToolUse", {
      tool_name: tool.name,
      tool_input: toInputRecord(toolUse.input),
      session_id: sessionId,
    });

    if (hookResult.decision === "deny" || hookResult.decision === "block") {
      return {
        toolUseId: toolUse.id,
        result: {
          type: "tool_result" as const,
          tool_use_id: toolUse.id,
          content: hookResult.reason || `Tool "${tool.name}" blocked by hook`,
          is_error: true,
        },
        toolResult: null,
      };
    }

    // Apply modified input if provided
    if (hookResult.modified_input) {
      Object.assign(toolUse.input, hookResult.modified_input);
    }
  }

  // Execute tool
  try {
    // Check if tool has a handler
    if (!tool.handler) {
      return {
        toolUseId: toolUse.id,
        result: {
          type: "tool_result" as const,
          tool_use_id: toolUse.id,
          content: `Error: Tool "${tool.name}" has no handler implemented`,
          is_error: true,
        },
        toolResult: null,
      };
    }

    const handlerResult = await tool.handler(toInputRecord(toolUse.input), {
      workingDirectory,
      permissionMode,
      abortSignal: signal,
    });

    // Execute PostToolUse hooks
    let finalContent = handlerResult.content;
    if (hookManager) {
      const hookResult = await hookManager.execute("PostToolUse", {
        tool_name: tool.name,
        tool_input: toInputRecord(toolUse.input),
        tool_result: handlerResult,
        tool_result_is_error: handlerResult.is_error,
        session_id: sessionId,
      });

      if (hookResult.decision === "deny" || hookResult.decision === "block") {
        return {
          toolUseId: toolUse.id,
          result: {
            type: "tool_result" as const,
            tool_use_id: toolUse.id,
            content: hookResult.reason || `Tool "${tool.name}" result blocked by hook`,
            is_error: true,
          },
          toolResult: null,
        };
      }

      // Apply modified output if provided
      if (hookResult.modified_input?.tool_result) {
        finalContent = hookResult.modified_input.tool_result as string;
      }
    }

    return {
      toolUseId: toolUse.id,
      result: {
        type: "tool_result" as const,
        tool_use_id: toolUse.id,
        content: finalContent,
        is_error: handlerResult.is_error,
      },
      toolResult: {
        id: toolUse.id,
        result: { ...handlerResult, content: finalContent },
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Execute PostToolUseFailure hooks
    if (hookManager) {
      await hookManager.execute("PostToolUseFailure", {
        tool_name: tool.name,
        tool_input: toInputRecord(toolUse.input),
        error: errorMessage,
        session_id: sessionId,
      });
    }

    return {
      toolUseId: toolUse.id,
      result: {
        type: "tool_result" as const,
        tool_use_id: toolUse.id,
        content: `Error: ${errorMessage}`,
        is_error: true,
      },
      toolResult: null,
    };
  }
}

/**
 * Execute multiple tools in parallel and collect results
 */
export async function executeTools(
  toolUseBlocks: ToolUseBlock[],
  options: ToolExecutionOptions
): Promise<ToolResultBlock[]> {
  // Check for abort before starting parallel execution
  if (options.signal?.aborted) {
    return [];
  }

  // Map each tool use to an async operation
  const toolExecutions = toolUseBlocks.map((toolUse) =>
    executeSingleTool(toolUse, options)
  );

  // Execute all tools in parallel
  const executionResults = await Promise.all(toolExecutions);

  // Collect results and notify callbacks
  const toolResults: ToolResultBlock[] = [];
  for (const executionResult of executionResults) {
    toolResults.push(executionResult.result);
    if (executionResult.toolResult && options.onToolResult) {
      options.onToolResult(executionResult.toolResult);
    }
  }

  return toolResults;
}
