/**
 * Tool Executor Instrumentation - Wraps executeTools with telemetry
 * @module telemetry/instrumentation/tool-executor
 */

import type { ToolUseBlock, ToolResultBlock, ToolDefinition, PermissionMode } from "../../schemas/index.js";
import { startSpan, type SpanBuilder } from "../tracer.js";
import { metrics } from "../metrics.js";
import { logger } from "../logger.js";
import { METRIC_NAMES } from "../types.js";

/**
 * Tool execution result (from tool-executor)
 */
interface ToolExecutionResult {
  toolUseId: string;
  result: ToolResultBlock;
  toolResult: { id: string; result: unknown } | null;
  durationMs?: number;
  success?: boolean;
}

/**
 * Tool execution options (re-exported from tool-executor)
 */
export interface ToolExecutionOptions {
  tools: ToolDefinition[];
  workingDirectory: string;
  permissionMode: PermissionMode;
  hookManager?: unknown;
  sessionId?: string;
  signal?: AbortSignal;
  permissionManager: unknown;
  onToolResult?: (result: { id: string; result: unknown }) => void;
  toolRestrictions?: { allowedTools?: string[]; disallowedTools?: string[] };
  teammateId?: string;
}

/**
 * Import original executeTools dynamically to avoid circular deps
 */
async function getOriginalExecuteTools() {
  const { executeTools } = await import("../../core/agent-loop/tool-executor.js");
  return executeTools;
}

/**
 * Execute tools with instrumentation
 */
export async function executeInstrumentedTools(
  toolUseBlocks: ToolUseBlock[],
  options: ToolExecutionOptions
): Promise<ToolResultBlock[]> {
  if (!shouldInstrument()) {
    const executeTools = await getOriginalExecuteTools();
    const results = await executeTools(toolUseBlocks, options as Parameters<typeof executeTools>[1]);
    return results.map(r => r.result);
  }

  const span = startSpan("coder.tools.execute_batch", "internal");

  span
    .setAttribute("tool_count", toolUseBlocks.length)
    .setAttribute("tool_names", toolUseBlocks.map((t) => t.name).join(","))
    .setAttribute("session_id", options.sessionId)
    .addEvent("tools.batch_started");

  const startTime = performance.now();

  try {
    const executeTools = await getOriginalExecuteTools();
    const execResults = await executeTools(toolUseBlocks, options as Parameters<typeof executeTools>[1]);

    const duration = performance.now() - startTime;
    const errorCount = execResults.filter((r) => r.result.is_error).length;

    // Record metrics for each tool
    for (const toolUse of toolUseBlocks) {
      const execResult = execResults.find((r) => r.toolUseId === toolUse.id);
      metrics.incrementCounter(METRIC_NAMES.TOOL_CALLS_TOTAL, 1, {
        tool_name: toolUse.name,
        session_id: options.sessionId,
      });
      metrics.recordHistogram(METRIC_NAMES.TOOL_DURATION_MS, duration / toolUseBlocks.length, {
        tool_name: toolUse.name,
        is_error: execResult?.result.is_error ? "true" : "false",
      });
      if (execResult?.result.is_error) {
        metrics.incrementCounter(METRIC_NAMES.TOOL_ERRORS_TOTAL, 1, {
          tool_name: toolUse.name,
        });
      }
    }

    span
      .setAttributes({
        duration_ms: duration,
        result_count: execResults.length,
        error_count: errorCount,
      })
      .addEvent("tools.batch_completed")
      .setStatus(errorCount > 0 ? "error" : "ok");

    logger.debug("Tool batch completed", {
      tool_count: toolUseBlocks.length,
      duration_ms: Math.round(duration),
      error_count: errorCount,
    });

    span.end();
    return execResults.map(r => r.result);
  } catch (error) {
    const duration = performance.now() - startTime;

    span
      .setAttribute("duration_ms", duration)
      .addEvent("tools.batch_failed")
      .recordError(error);

    logger.error("Tool batch failed", error, {
      tool_count: toolUseBlocks.length,
      duration_ms: Math.round(duration),
    });

    span.end();
    throw error;
  }
}

/**
 * Check if instrumentation should be applied
 */
function shouldInstrument(): boolean {
  return process.env.CODER_TELEMETRY_ENABLED !== "false";
}

// Re-export for backward compatibility
export { executeInstrumentedTools as executeTools };
