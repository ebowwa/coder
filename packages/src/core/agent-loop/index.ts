/**
 * Agent Loop - Turn-based processing system
 *
 * This is the main orchestrator that coordinates:
 * - State management (loop-state.ts)
 * - Turn execution (turn-executor.ts)
 * - Tool execution (tool-executor.ts)
 * - Context compaction (compaction.ts)
 * - Message building (message-builder.ts)
 * - Formatting utilities (formatters.ts)
 */

import type { Message } from "../../types/index.js";
import { DEFAULT_CACHE_CONFIG } from "../../types/index.js";
import { PermissionManager } from "../permissions.js";
import { DEFAULT_REMINDER_CONFIG } from "../system-reminders.js";
import type { HookManager } from "../../ecosystem/hooks/index.js";

import type { AgentLoopOptions, AgentLoopResult } from "./types.js";
import { LoopState } from "./loop-state.js";
import { executeTurn, type TurnExecutorOptions } from "./turn-executor.js";

// Re-export types and utilities
export type { AgentLoopOptions, AgentLoopResult } from "./types.js";
export { formatCost, formatMetrics, formatCostBrief, formatCacheMetrics } from "./formatters.js";
export { LoopState } from "./loop-state.js";
export { executeTurn } from "./turn-executor.js";
export { executeTools, type ToolExecutionOptions } from "./tool-executor.js";
export { buildAPIMessages, injectReminderIntoContent } from "./message-builder.js";
export {
  handleProactiveCompaction,
  handleReactiveCompaction,
  needsCompaction,
  estimateMessagesTokens,
  DEFAULT_PROACTIVE_OPTIONS,
  DEFAULT_REACTIVE_OPTIONS,
} from "./compaction.js";

/**
 * Main agent loop - processes messages in turns until completion
 */
export async function agentLoop(
  initialMessages: Message[],
  options: AgentLoopOptions
): Promise<AgentLoopResult> {
  const {
    apiKey,
    model = "claude-sonnet-4-6",
    maxTokens = 4096,
    systemPrompt,
    tools,
    permissionMode,
    workingDirectory,
    gitStatus = null,
    reminderConfig,
    cacheConfig = DEFAULT_CACHE_CONFIG,
    thinking,
    extendedThinking,
    hookManager,
    sessionId,
    onText,
    onThinking,
    onToolUse,
    onToolResult,
    onMetrics,
    onReminder,
    onRetryStart,
    onPermissionRequest,
    signal,
  } = options;

  // Initialize state
  const state = new LoopState(initialMessages);
  const permissionManager = new PermissionManager(permissionMode, onPermissionRequest);
  const mergedReminderConfig = { ...DEFAULT_REMINDER_CONFIG, ...reminderConfig };

  // Execute SessionStart hook
  if (hookManager) {
    await hookManager.execute("SessionStart", {
      session_id: sessionId,
    });
  }

  let shouldContinue = true;

  while (shouldContinue) {
    if (signal?.aborted) {
      break;
    }

    // Build turn executor options
    const turnOptions: TurnExecutorOptions = {
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
      reminderConfig: mergedReminderConfig,
      hookManager,
      sessionId,
      signal,
      onText,
      onThinking,
      onToolUse,
      onReminder,
      onRetryStart,
      permissionMode,
      permissionManager,
      onMetrics,
      onToolResult,
    };

    // Execute a single turn
    const turnResult = await executeTurn(state, turnOptions);

    shouldContinue = turnResult.shouldContinue;

    // Call onMetrics callback with the latest metrics
    if (turnResult.metrics && onMetrics) {
      onMetrics(turnResult.metrics);
    }
  }

  // Execute SessionEnd hook
  if (hookManager) {
    await hookManager.execute("SessionEnd", {
      session_id: sessionId,
    });
  }

  return state.toResult();
}
