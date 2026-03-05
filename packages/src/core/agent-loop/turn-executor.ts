/**
 * Turn Executor - Single turn execution logic
 */

import type {
  ToolDefinition,
  APITool,
  ToolUseBlock,
  StopReason,
  PermissionMode,
} from "../../types/index.js";
import { createMessageStream } from "../api-client.js";
import { buildCombinedReminder } from "../system-reminders.js";
import type { PermissionManager } from "../permissions.js";
import type { HookManager } from "../../ecosystem/hooks/index.js";
import type { LoopState } from "./loop-state.js";
import { buildAPIMessages } from "./message-builder.js";
import { handleProactiveCompaction, handleReactiveCompaction, DEFAULT_PROACTIVE_OPTIONS, DEFAULT_REACTIVE_OPTIONS } from "./compaction.js";
import { executeTools, type ToolExecutionOptions } from "./tool-executor.js";

/**
 * Options for turn execution
 */
export interface TurnExecutorOptions {
  apiKey: string;
  model: string;
  maxTokens: number;
  systemPrompt: string;
  tools: ToolDefinition[];
  cacheConfig: import("../../types/index.js").CacheConfig;
  thinking?: import("../../types/index.js").ThinkingConfig;
  extendedThinking?: import("../../types/index.js").ExtendedThinkingConfig;
  workingDirectory: string;
  gitStatus: import("../../types/index.js").GitStatus | null;
  reminderConfig: import("../system-reminders.js").SystemReminderConfig;
  hookManager?: HookManager;
  sessionId?: string;
  signal?: AbortSignal;
  onText?: (text: string) => void;
  onThinking?: (thinking: string) => void;
  onToolUse?: (toolUse: { id: string; name: string; input: unknown }) => void;
  onReminder?: (reminder: string) => void;
  permissionMode: PermissionMode;
  permissionManager: PermissionManager;
  onMetrics?: (metrics: import("../../types/index.js").QueryMetrics) => void;
  onToolResult?: (result: { id: string; result: import("../../types/index.js").ToolResult }) => void;
}

/**
 * Result of executing a turn
 */
export interface ExecuteTurnResult {
  /** Whether the loop should continue */
  shouldContinue: boolean;
  /** Stop reason if the loop should stop */
  stopReason?: StopReason;
  /** The metrics from this turn (if any) */
  metrics?: import("../../types/index.js").QueryMetrics;
}

/**
 * Execute a single turn of the agent loop
 */
export async function executeTurn(
  state: LoopState,
  options: TurnExecutorOptions
): Promise<ExecuteTurnResult> {
  const {
    apiKey,
    model,
    maxTokens,
    systemPrompt,
    tools,
    cacheConfig,
    thinking,
    extendedThinking,
    workingDirectory,
    gitStatus,
    reminderConfig,
    hookManager,
    sessionId,
    signal,
    onText,
    onThinking,
    onToolUse,
    onReminder,
    permissionMode,
    permissionManager,
    onToolResult,
  } = options;

  // Increment turn counter
  state.incrementTurn();

  const turnNumber = state.turnNumber;

  // Build system reminder for this turn
  const reminder = buildCombinedReminder({
    usage: state.currentUsage,
    maxTokens,
    totalCost: state.totalCost,
    previousCost: state.previousCost,
    toolsUsed: state.allToolsUsed,
    workingDirectory,
    gitStatus,
    turnNumber,
    config: reminderConfig,
  });

  if (reminder) {
    onReminder?.(reminder);
  }

  // Proactive compaction check - compact BEFORE hitting the limit
  await handleProactiveCompaction(state, maxTokens, DEFAULT_PROACTIVE_OPTIONS);

  // Build API messages with system reminders
  const apiMessages = buildAPIMessages(state.messages, systemPrompt, reminder);

  // Create streaming request
  const streamResult = await createMessageStream(apiMessages, {
    apiKey,
    model,
    maxTokens,
    systemPrompt,
    cacheConfig,
    thinking,
    extendedThinking,
    tools: tools.map((t): APITool => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema,
    })),
    onToken: onText,
    onThinking,
    onToolUse,
    signal,
  });

  const { message, usage, cacheMetrics, costUSD, durationMs, ttftMs } = streamResult;

  // Track metrics
  const queryMetrics = state.addTurnResult({
    message,
    usage,
    cacheMetrics,
    costUSD,
    durationMs,
    model,
    messageCount: state.messages.length,
  });

  // Add assistant message to history
  state.addAssistantMessage(message.content);

  // Check stop reason
  if (message.stop_reason === "end_turn" || message.stop_reason === "stop_sequence") {
    return {
      shouldContinue: false,
      stopReason: message.stop_reason,
      metrics: queryMetrics,
    };
  }

  if (message.stop_reason === "max_tokens") {
    // Context window limit reached - compact and continue
    const compacted = await handleReactiveCompaction(state, maxTokens, DEFAULT_REACTIVE_OPTIONS);

    if (compacted) {
      // Continue the loop with compacted context
      return {
        shouldContinue: true,
        metrics: queryMetrics,
      };
    } else {
      // Could not compact further or compaction didn't help, must stop
      return {
        shouldContinue: false,
        stopReason: "max_tokens",
        metrics: queryMetrics,
      };
    }
  }

  // Handle tool use
  const toolUseBlocks = message.content.filter(
    (block): block is ToolUseBlock => block.type === "tool_use"
  );

  // Track all tools used for summary
  state.trackToolUse(toolUseBlocks);

  if (toolUseBlocks.length === 0) {
    return {
      shouldContinue: false,
      metrics: queryMetrics,
    };
  }

  // Execute tools in parallel and collect results
  const toolExecutionOptions: ToolExecutionOptions = {
    tools,
    workingDirectory,
    permissionMode,
    hookManager,
    sessionId,
    signal,
    permissionManager,
    onToolResult,
  };

  const toolResults = await executeTools(toolUseBlocks, toolExecutionOptions);

  // Add tool results as user message
  state.addUserMessage(toolResults);

  // Continue loop to process tool results
  return {
    shouldContinue: true,
    metrics: queryMetrics,
  };
}
