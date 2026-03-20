/**
 * Turn Executor - Single turn execution logic
 *
 * With continuation system for autonomous loops (Ralph-style).
 * When model returns end_turn WITHOUT tools, we can inject continuation
 * prompts to keep working until verified completion.
 */

import type {
  ToolDefinition,
  APITool,
  ToolUseBlock,
  StopReason,
  PermissionMode,
  JSONSchema,
} from "../../schemas/index.js";
import { createMessageStream } from "../api-client.js";
import { buildCombinedReminder } from "../system-reminders.js";
import type { PermissionManager } from "../permissions.js";
import type { HookManager } from "../../ecosystem/hooks/index.js";
import type { LoopState } from "./loop-state.js";
import { buildAPIMessages } from "./message-builder.js";
import { handleProactiveCompaction, handleReactiveCompaction, DEFAULT_PROACTIVE_OPTIONS, DEFAULT_REACTIVE_OPTIONS } from "./compaction.js";
import { executeTools, type ToolExecutionOptions } from "./tool-executor.js";
import {
  getStopSequences,
  type StopSequenceConfig,
  type StopSequenceOptions,
} from "./stop-sequences.js";
import {
  checkAllResults,
  type ResultConditionsConfig,
  type ResultCondition,
} from "./result-conditions.js";
import {
  checkContinuation,
  buildContinuationMessage,
  extractTextFromBlocks,
  type ContinuationConfig,
  type ContinuationContext,
  type ContinuationCheckResult,
} from "./continuation.js";

/**
 * Options for turn execution
 */
export interface TurnExecutorOptions {
  apiKey: string;
  model: string;
  maxTokens: number;
  systemPrompt: string;
  tools: ToolDefinition[];
  cacheConfig: import("../../schemas/index.js").CacheConfig;
  thinking?: import("../../schemas/index.js").ThinkingConfig;
  extendedThinking?: import("../../schemas/index.js").ExtendedThinkingConfig;
  workingDirectory: string;
  gitStatus: import("../../schemas/index.js").GitStatus | null;
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
  onMetrics?: (metrics: import("../../schemas/index.js").QueryMetrics) => void;
  onToolResult?: (result: { id: string; result: import("../../schemas/index.js").ToolResult }) => void;
  /** Stop sequences - user/AI decides */
  stopSequences?: string[];
  /** Stop sequence config with optional reason */
  stopSequenceConfig?: StopSequenceConfig;
  /** Result-based loop control - checks actual tool results */
  resultConditions?: ResultConditionsConfig;
  /** Continuation config - enables autonomous loop continuation (Ralph-style) */
  continuation?: ContinuationConfig;
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
  metrics?: import("../../schemas/index.js").QueryMetrics;
  /** Whether this turn triggered a continuation (autonomous loop) */
  wasContinued?: boolean;
  /** Number of consecutive continuations */
  consecutiveContinuations?: number;
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
    stopSequences: userStopSequences,
    stopSequenceConfig,
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

  // Get stop sequences - user-controlled, no auto-detection
  const stopSequences = getStopSequences({
    sequences: userStopSequences,
    config: stopSequenceConfig,
    includeSafety: true,
    maxSequences: 10,
  });

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
      input_schema: t.input_schema as JSONSchema,
    })),
    onToken: onText,
    onThinking,
    onToolUse,
    signal,
    stopSequences,
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
    // Check for continuation (autonomous loops - Ralph style)
    // This bridges the gap when model returns end_turn WITHOUT using tools
    const toolUseBlocks = message.content.filter(
      (block): block is ToolUseBlock => block.type === "tool_use"
    );

    if (toolUseBlocks.length === 0 && options.continuation?.enabled) {
      // Model ended without tools - check if we should continue
      const continuationResult = checkContinuation(
        {
          lastOutput: extractTextFromBlocks(message.content),
          lastBlocks: message.content,
          toolsUsedCount: 0,
          turnNumber: state.turnNumber,
          consecutiveContinuations: state.consecutiveContinuations ?? 0,
          totalCost: state.totalCost,
          workingDirectory,
          gitStatus: gitStatus ? {
            hasUncommittedChanges: !gitStatus.clean,
            currentBranch: gitStatus.branch,
          } : null,
        },
        options.continuation
      );

      if (continuationResult.shouldContinue && continuationResult.prompt) {
        // Inject continuation prompt instead of stopping
        console.log(
          `[Continuation] Injecting prompt: ${continuationResult.reason}` +
            (continuationResult.isStuck ? " (STUCK DETECTED)" : "")
        );

        // Add continuation message to state
        const continuationMessage = buildContinuationMessage(
          continuationResult.prompt,
          {
            ...continuationResult,
            turnNumber: state.turnNumber,
            consecutiveContinuations: (state.consecutiveContinuations ?? 0) + 1,
            lastOutput: "",
            lastBlocks: [],
            toolsUsedCount: 0,
            totalCost: state.totalCost,
            workingDirectory,
          }
        );
        // continuationMessage.content is TextBlock[], which is valid for addUserMessage
        state.addUserMessage(continuationMessage.content as import("../../schemas/index.js").TextBlock[]);

        // Track consecutive continuations
        state.consecutiveContinuations = (state.consecutiveContinuations ?? 0) + 1;

        return {
          shouldContinue: true,
          metrics: queryMetrics,
          wasContinued: true,
          consecutiveContinuations: state.consecutiveContinuations,
        };
      }

      // No continuation - stop normally
      return {
        shouldContinue: false,
        stopReason: message.stop_reason,
        metrics: queryMetrics,
        consecutiveContinuations: state.consecutiveContinuations,
      };
    }

    // Normal stop - no continuation configured
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
    // No tools used - check continuation for autonomous loops
    if (options.continuation?.enabled) {
      const continuationResult = checkContinuation(
        {
          lastOutput: extractTextFromBlocks(message.content),
          lastBlocks: message.content,
          toolsUsedCount: 0,
          turnNumber: state.turnNumber,
          consecutiveContinuations: state.consecutiveContinuations ?? 0,
          totalCost: state.totalCost,
          workingDirectory,
          gitStatus: gitStatus ? {
            hasUncommittedChanges: !gitStatus.clean,
            currentBranch: gitStatus.branch,
          } : null,
        },
        options.continuation
      );

      if (continuationResult.shouldContinue && continuationResult.prompt) {
        console.log(
          `[Continuation] Injecting prompt (no tools): ${continuationResult.reason}`
        );

        const continuationMessage = buildContinuationMessage(
          continuationResult.prompt,
          {
            ...continuationResult,
            turnNumber: state.turnNumber,
            consecutiveContinuations: (state.consecutiveContinuations ?? 0) + 1,
            lastOutput: "",
            lastBlocks: [],
            toolsUsedCount: 0,
            totalCost: state.totalCost,
            workingDirectory,
          }
        );
        // continuationMessage.content is TextBlock[], which is valid for addUserMessage
        state.addUserMessage(continuationMessage.content as import("../../schemas/index.js").TextBlock[]);
        state.consecutiveContinuations = (state.consecutiveContinuations ?? 0) + 1;

        return {
          shouldContinue: true,
          metrics: queryMetrics,
          wasContinued: true,
          consecutiveContinuations: state.consecutiveContinuations,
        };
      }
    }

    return {
      shouldContinue: false,
      metrics: queryMetrics,
      consecutiveContinuations: state.consecutiveContinuations,
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

  // Check result conditions if configured (verified loop control)
  if (options.resultConditions) {
    const resultsToCheck = toolResults.map((tr) => ({
      toolName: toolUseBlocks.find((b) => b.id === tr.tool_use_id)?.name ?? "unknown",
      result: tr,
    }));

    const conditionResult = checkAllResults(
      resultsToCheck,
      options.resultConditions,
      state.retryCount ?? 0
    );

    // Update retry count if needed
    if (conditionResult.retryIncrement) {
      state.retryCount = (state.retryCount ?? 0) + conditionResult.retryIncrement;
    }

    // If condition says stop, respect it
    if (!conditionResult.shouldContinue) {
      state.addUserMessage(toolResults);
      console.log(
        `[ResultCondition] Loop stopped: ${conditionResult.stopReason}` +
          (conditionResult.condition ? ` (${conditionResult.condition.id})` : "")
      );
      return {
        shouldContinue: false,
        stopReason: "end_turn",
        metrics: queryMetrics,
      };
    }
  }

  // Add tool results as user message
  state.addUserMessage(toolResults);

  // Continue loop to process tool results
  return {
    shouldContinue: true,
    metrics: queryMetrics,
  };
}
