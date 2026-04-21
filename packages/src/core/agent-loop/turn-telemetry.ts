/**
 * Turn Telemetry - Extract status writer bookkeeping from turn-executor
 *
 * Records API latency, token metrics, tool execution results,
 * file operations, and MCP call tracking into the StatusWriter
 * and SessionStore.
 */

import type { ToolUseBlock, ToolResultBlock } from "../../schemas/index.js";
import type { StatusWriter } from "./status-writer.js";
import type { SessionStore } from "../sessions/index.js";

// Cached MCP tool name parser (shared with turn-executor)
const mcpNameCache = new Map<string, { server: string; tool: string } | null>();
function parseMcpName(name: string): { server: string; tool: string } | null {
  let cached = mcpNameCache.get(name);
  if (cached !== undefined) return cached;
  const parts = name.split("__");
  if (parts.length >= 3) {
    cached = { server: parts[1]!, tool: parts.slice(2).join("__") };
  } else {
    cached = null;
  }
  mcpNameCache.set(name, cached);
  return cached;
}

/** Tool execution result for telemetry */
export interface ToolExecResult {
  toolUseId: string;
  result: ToolResultBlock;
  durationMs: number | undefined;
  success: boolean;
}

/**
 * Record turn-level telemetry (API latency, tokens, payload event).
 * Handles both status writer and session store persistence.
 */
export function recordTurnTelemetry(
  statusWriter: StatusWriter | undefined,
  sessionStore: SessionStore | undefined,
  telemetry: {
    turnNumber: number;
    model: string;
    durationMs: number;
    ttftMs: number;
    costUSD: number | undefined;
    inputTokens: number;
    outputTokens: number;
    finishReason: string | null;
  },
  sessionPayload?: {
    turn: number;
    model: string;
    requestMessages: number;
    systemPromptLength: number;
    responseTokensIn: number;
    responseTokensOut: number;
    costUSD: number;
    durationMs: number;
    ttftMs?: number | undefined;
    finishReason?: string | undefined;
  },
): void {
  if (statusWriter) {
    statusWriter.recordApiLatency(telemetry.durationMs);
    statusWriter.updateTokens(telemetry.inputTokens, telemetry.outputTokens);
    statusWriter.recordEvent("api_payload", {
      turn: telemetry.turnNumber,
      model: telemetry.model,
      tokensIn: telemetry.inputTokens,
      tokensOut: telemetry.outputTokens,
      costUSD: telemetry.costUSD,
      durationMs: telemetry.durationMs,
      ttftMs: telemetry.ttftMs,
      finishReason: telemetry.finishReason,
    });
  }

  if (sessionStore && sessionPayload) {
    sessionStore.saveApiPayload({
      turn: sessionPayload.turn,
      model: sessionPayload.model,
      requestMessages: sessionPayload.requestMessages,
      systemPromptLength: sessionPayload.systemPromptLength,
      responseTokensIn: sessionPayload.responseTokensIn,
      responseTokensOut: sessionPayload.responseTokensOut,
      costUSD: sessionPayload.costUSD,
      durationMs: sessionPayload.durationMs,
      ttftMs: sessionPayload.ttftMs,
      finishReason: sessionPayload.finishReason,
    }).catch(() => {
      // Ignore save errors - don't block turn execution
    });
  }
}

/**
 * Record tool-level telemetry (execution times, file ops, MCP calls).
 */
export function recordToolTelemetry(
  statusWriter: StatusWriter | undefined,
  toolUseBlocks: ToolUseBlock[],
  toolResults: ToolExecResult[],
): void {
  if (!statusWriter) return;

  for (let i = 0; i < toolResults.length; i++) {
    const execResult = toolResults[i]!;
    const toolUse = toolUseBlocks[i];
    if (!toolUse || execResult.durationMs === undefined) continue;

    const isError = execResult.result.is_error ?? false;
    statusWriter.recordToolUse(
      toolUse.name,
      execResult.durationMs,
      execResult.success ?? !isError,
      isError ? String(execResult.result.content).slice(0, 200) : undefined,
    );

    // Track file operations
    const filePath = (toolUse.input as Record<string, unknown>)?.file_path as string | undefined;

    if (filePath && !isError) {
      if (toolUse.name === "Read") {
        statusWriter.recordFileRead(filePath);
      } else if (toolUse.name === "Edit") {
        statusWriter.recordFileEdit(filePath);
      } else if (toolUse.name === "Write") {
        statusWriter.recordFileCreate(filePath);
      }
    }

    // Track MCP calls
    if (toolUse.name.startsWith("mcp__") && !isError) {
      const parsed = parseMcpName(toolUse.name);
      if (parsed) {
        statusWriter.recordMcpCall(
          parsed.server,
          parsed.tool,
          execResult.durationMs,
          isError,
        );
      }
    }
  }
}
