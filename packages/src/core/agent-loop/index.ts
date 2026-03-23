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
 * - Loop behavior from teammate templates
 * - Persistence for long-running loops (loop-persistence.ts)
 */

import { homedir } from "os";
import { join } from "path";
import type { Message } from "../../schemas/index.js";
import { DEFAULT_CACHE_CONFIG } from "../../schemas/index.js";
import { PermissionManager } from "../permissions.js";
import { DEFAULT_REMINDER_CONFIG } from "../system-reminders.js";
import { DEFAULT_MODEL, getContextWindow } from "../models.js";
import type { HookManager } from "../../ecosystem/hooks/index.js";

import type { AgentLoopOptions, AgentLoopResult, LoopPersistenceConfig } from "./types.js";
import { LoopState, type LoopStateOptions } from "./loop-state.js";
import { executeTurn, type TurnExecutorOptions } from "./turn-executor.js";
import {
  LoopPersistence,
  DEFAULT_PERSISTENCE_CONFIG,
  type PersistedLoopState,
} from "./loop-persistence.js";
import {
  LongRunningIntegration,
  DEFAULT_LONG_RUNNING_INTEGRATION_CONFIG,
  type LongRunningIntegrationConfig,
} from "./long-running-integration.js";
import { LongRunningMemoryManager } from "./long-running-memory.js";
import { StatusWriter, formatStatus, getStatusFilePath, getStatusLogPath, getMetricsFilePath, readStatus, type CoderStatus, type StatusWriterOptions } from "./status-writer.js";

// Aggressive telemetry - auto-enabled, always-on observability
import {
  setSession as setAggressiveSession,
  turnStart as aggressiveTurnStart,
  turnEnd as aggressiveTurnEnd,
  apiCall as aggressiveApiCall,
  toolCall as aggressiveToolCall,
  error as aggressiveTelemetryError,
  contextUpdate as aggressiveContextUpdate,
  memoryUpdate as aggressiveMemoryUpdate,
  getRealtimeMetrics,
} from "../../telemetry/auto-telemetry.js";

// Re-export types and utilities
export type { AgentLoopOptions, AgentLoopResult, LoopPersistenceConfig } from "./types.js";
export type { LoopStateOptions } from "./loop-state.js";
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

// Re-export loop behavior from template system
export {
  type LoopBehavior,
  type CompactionStrategy,
  type ErrorHandling,
  type CostThresholds,
  type TeammateTemplate,
  LoopBehaviorSchema,
  CompactionStrategySchema,
  ErrorHandlingSchema,
  CostThresholdsSchema,
  TeammateTemplateSchema,
  DEFAULT_LOOP_BEHAVIOR,
  getLoopBehavior,
  TEAMMATE_TEMPLATES,
  TEAMMATE_TEMPLATE_NAMES,
  templateManager,
} from "../../ecosystem/presets/index.js";

// Re-export stop sequences system (user-controlled, no auto-detection)
export {
  type StopSequenceConfig,
  type StopSequenceContext,
  type StopSequenceOptions,
  getStopSequences,
  createConfig,
  fromMarkers,
} from "./stop-sequences.js";

// Re-export result conditions system (verified loop control - fully dynamic)
export {
  type ResultCondition,
  type ResultConditionsConfig,
  type ConditionCheckResult,
  type ConditionAction,
  checkResultConditions,
  checkAllResults,
  createConfig as createResultConditionsConfig,
  EXAMPLE_CONDITIONS,
} from "./result-conditions.js";

// Re-export persistence module
export {
  LoopPersistence,
  DEFAULT_PERSISTENCE_CONFIG,
  type PersistedLoopState,
  type LoopCheckpoint,
  type LoopManifest,
  type LoopRecoveryResult,
} from "./loop-persistence.js";

export {
  SERIALIZER_VERSION,
  type PersistedLoopState as SerializedLoopState,
  type LoopCheckpoint as Checkpoint,
  validatePersistedState,
  generateCheckpointId,
  createStateSummary,
} from "./loop-serializer.js";

// Re-export continuation system for autonomous loops
export {
  type ContinuationConfig,
  type ContinuationCondition,
  type ContinuationContext,
  type ContinuationCheckResult,
  type ContinuationAction,
  RALPH_CONTINUATION_CONFIG,
  DEFAULT_CONTINUATION_CONFIG,
  DEFAULT_CONTINUATION_PROMPT,
  DEFAULT_STUCK_PROMPT,
  checkContinuation,
  buildContinuationMessage,
  createContinuationConfig,
} from "./continuation.js";

// Re-export long-running memory system for days/weeks of autonomous work
export {
  type LongRunningIntegrationConfig,
  type VerificationCommand,
  DEFAULT_LONG_RUNNING_INTEGRATION_CONFIG,
  LongRunningIntegration,
  detectMilestoneFromResult,
  extractDecisionFromOutput,
  runVerification,
  buildCompactionRecoveryMessage,
  buildPeriodicReminder,
} from "./long-running-integration.js";
export {
  type Decision,
  type Discovery,
  type GoalSnapshot,
  type VerificationResult as MemoryVerificationResult,
  type MilestoneCheckpoint,
  type LongRunningMemory,
  type LongRunningMemoryConfig,
  DEFAULT_LONG_RUNNING_CONFIG,
  LongRunningMemoryManager,
} from "./long-running-memory.js";

// Re-export agent patterns (Microsoft Research patterns)
export {
  // Pattern 1: Structured Planning
  type PlanStep,
  type ExecutionPlan,
  type PlanGeneratorOptions,
  PlanStepSchema,
  ExecutionPlanSchema,
  generatePlan,
  updatePlanStep,
  getNextStep,
  isPlanComplete,

  // Pattern 2: Verification Loops
  type VerificationResult,
  type VerificationLoopOptions,
  VerificationResultSchema,
  DEFAULT_VERIFICATION_OPTIONS,
  createVerificationResult,
  shouldRetryVerification,
  incrementRetry,

  // Pattern 3: Tool Selection Strategy
  type ToolSelectionContext,
  TOOL_CATEGORIES,
  TASK_TOOL_MAP,
  selectTool,
  getNextToolInWorkflow,
  validateToolSequence,

  // Pattern 4: Error Taxonomy
  type ErrorCategory,
  type ClassifiedError,
  ErrorCategorySchema,
  ClassifiedErrorSchema,
  classifyError,
  getRecoveryStrategy,

  // Pattern 5: Progressive Refinement
  type RefinementState,
  type RefinementLevel,
  type ProgressiveRefinementOptions,
  RefinementLevelSchema,
  RefinementStateSchema,
  DEFAULT_REFINEMENT_OPTIONS,
  createRefinementState,
  canAdvanceLevel,
  advanceLevel,
  getRefinementGuidance,
  isRefinementComplete,

  // Combined pattern context
  type PatternExecutionContext,
  createPatternContext,
  processToolResult,
} from "./agent-patterns.js";

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

/**
 * Main agent loop - processes messages in turns until completion
 *
 * With persistence enabled, the loop state is automatically saved at
 * configurable intervals, allowing resumption from interrupted loops.
 *
 * @example
 * ```typescript
 * // Basic usage (no persistence)
 * const result = await agentLoop(messages, { apiKey, ... });
 *
 * // With persistence enabled
 * const result = await agentLoop(messages, {
 *   apiKey,
 *   persistence: { enabled: true, autoSaveInterval: 30000 },
 *   ...
 * });
 *
 * // Resume from interrupted loop
 * const result = await agentLoop([], {
 *   apiKey,
 *   resumeFrom: { sessionId: "abc123" },
 *   ...
 * });
 * ```
 */
export async function agentLoop(
  initialMessages: Message[],
  options: AgentLoopOptions
): Promise<AgentLoopResult> {
  const {
    apiKey,
    model = DEFAULT_MODEL,
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
    sessionId = generateSessionId(),
    onText,
    onThinking,
    onToolUse,
    onToolResult,
    onMetrics,
    onReminder,
    onPermissionRequest,
    signal,
    stopSequences,
    stopSequenceConfig,
    resultConditions,
    persistence: persistenceOption,
    resumeFrom,
    onPersist,
    continuation,
    longRunning: longRunningOption,
    longRunningGoal,
  } = options;

  // Resolve persistence configuration
  const persistenceConfig: LoopPersistenceConfig =
    typeof persistenceOption === "boolean"
      ? { ...DEFAULT_PERSISTENCE_CONFIG, enabled: persistenceOption }
      : persistenceOption
        ? { ...DEFAULT_PERSISTENCE_CONFIG, ...persistenceOption }
        : { ...DEFAULT_PERSISTENCE_CONFIG, enabled: false };

  // Initialize persistence manager if enabled
  let persistence: LoopPersistence | null = null;
  let state: LoopState;
  let resumedFromCheckpoint = false;

  if (persistenceConfig.enabled) {
    persistence = new LoopPersistence(persistenceConfig);

    // Handle resume from previous session
    if (resumeFrom?.sessionId) {
      const recovered = await persistence.recoverLoop(resumeFrom.sessionId);

      if (recovered.success && recovered.state) {
        // Restore state from persisted data
        state = LoopState.deserialize(recovered.state);
        resumedFromCheckpoint = true;

        console.log(`Resumed loop from session ${resumeFrom.sessionId} at turn ${state.turnNumber}`);
      } else {
        // Failed to recover, start fresh
        console.warn(`Failed to resume session ${resumeFrom.sessionId}: ${recovered.error}`);
        state = new LoopState(initialMessages);
      }
    } else {
      // Start fresh
      state = new LoopState(initialMessages);
    }
  } else {
    // No persistence, use in-memory state
    state = new LoopState(initialMessages);
  }

  // Initialize long-running integration if enabled
  let longRunningIntegration: LongRunningIntegration | null = null;
  let statusWriter: StatusWriter | null = null;
  if (longRunningOption) {
    const memoryManager = new LongRunningMemoryManager();
    const config: Partial<LongRunningIntegrationConfig> = typeof longRunningOption === "boolean"
      ? { enabled: longRunningOption, sessionId, originalGoal: longRunningGoal || "Autonomous work session" }
      : { enabled: true, sessionId, originalGoal: longRunningGoal || "Autonomous work session", ...longRunningOption };

    longRunningIntegration = new LongRunningIntegration(config, memoryManager);
    await longRunningIntegration.initialize();

    // Initialize status writer with full telemetry options
    const statusWriterOptions: StatusWriterOptions = {
      sessionId,
      goal: longRunningGoal || "Autonomous work session",
      workingDirectory,
      model,
      maxTokens,
      extendedThinking: extendedThinking?.enabled ?? false,
      effortLevel: extendedThinking?.effort,
      interleaved: extendedThinking?.interleaved ?? true,
      contextWindowSize: getContextWindow(model),
      enableWebSocket: typeof longRunningOption === "object" ? longRunningOption.enableWebSocket ?? false : false,
      websocketPort: typeof longRunningOption === "object" ? longRunningOption.websocketPort : undefined,
      enableSSE: typeof longRunningOption === "object" ? longRunningOption.enableSSE ?? false : false,
      ssePort: typeof longRunningOption === "object" ? longRunningOption.ssePort : undefined,
      mcpServers: [], // Will be updated as MCP servers connect
    };

    statusWriter = new StatusWriter(statusWriterOptions);
    statusWriter.setActivity("Starting session");

    // Update git status if available
    if (gitStatus) {
      statusWriter.updateGitStatus(
        gitStatus.branch,
        !gitStatus.clean,
        gitStatus.untracked.length + gitStatus.staged.length,
        gitStatus.ahead,
        gitStatus.behind
      );
    }

    console.log(`Long-running mode enabled for session ${sessionId}`);
    console.log(`Status file: ${getStatusFilePath()}`);
    console.log(`Metrics file: ${getMetricsFilePath()}`);
    console.log(`Monitor with: tail -f ${getStatusFilePath()}`);
  }

  const permissionManager = new PermissionManager(permissionMode, onPermissionRequest);
  const mergedReminderConfig = { ...DEFAULT_REMINDER_CONFIG, ...reminderConfig };

  // Execute SessionStart hook
  if (hookManager) {
    await hookManager.execute("SessionStart", {
      session_id: sessionId,
    });
  }

  // Initialize aggressive telemetry for this session
  setAggressiveSession(sessionId);
  aggressiveTurnStart();

  // Start loop persistence if enabled
  if (persistence && !resumedFromCheckpoint) {
    const initialState = state.serialize(sessionId);
    await persistence.startLoop(sessionId, initialState, {
      workingDirectory,
      model,
    });
  }

  // Start auto-save timer if persistence is enabled
  if (persistence) {
    persistence.startAutoSaveTimer(sessionId, () => state.serialize(sessionId));
  }

  let shouldContinue = true;
  let lastError: Error | null = null;

  try {
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
        permissionMode,
        permissionManager,
        onMetrics,
        onToolResult,
        stopSequences,
        stopSequenceConfig,
        resultConditions,
        continuation,
        longRunning: longRunningIntegration ?? undefined,
        statusWriter: statusWriter ?? undefined,
      };

      // Execute a single turn
      const turnResult = await executeTurn(state, turnOptions);

      // Track with aggressive telemetry
      if (turnResult.metrics) {
        aggressiveTurnEnd(
          turnResult.metrics.durationMs,
          {
            input: turnResult.metrics.usage.input_tokens,
            output: turnResult.metrics.usage.output_tokens,
          }
        );
        aggressiveApiCall(
          turnResult.metrics.durationMs,
          true,
          {
            input: turnResult.metrics.usage.input_tokens,
            output: turnResult.metrics.usage.output_tokens,
          }
        );
      }

      // Track context usage
      const contextWindow = getContextWindow(model);
      aggressiveContextUpdate(
        state.estimatedContextTokens,
        contextWindow
      );

      // Track memory usage
      const memUsage = process.memoryUsage();
      aggressiveMemoryUpdate(memUsage.heapUsed / (1024 * 1024));

      // Update status writer if enabled
      if (statusWriter) {
        statusWriter.update({
          turnNumber: state.turnNumber,
          totalCost: state.totalCost,
          durationMs: Date.now() - state.sessionStartTime,
          toolUseCount: state.allToolsUsed.length,
          messageCount: state.messages.length,
          compactionCount: state.compactionCount,
        });
      }

      shouldContinue = turnResult.shouldContinue;

      // Start tracking next turn if continuing
      if (shouldContinue) {
        aggressiveTurnStart();
      }

      // Call onMetrics callback with the latest metrics
      if (turnResult.metrics && onMetrics) {
        onMetrics(turnResult.metrics);
      }

      // Auto-save check after each turn if persistence is enabled
      if (persistence && persistence.shouldAutoSave(sessionId)) {
        await persistence.save(sessionId, state.serialize(sessionId));
        if (onPersist) {
          onPersist(sessionId, state.turnNumber);
        }
      }
    }
  } catch (error) {
    lastError = error as Error;

    // Track error with aggressive telemetry
    aggressiveTelemetryError(
      (error as Error).name || "AgentLoopError",
      (error as Error).message,
      { turnNumber: state.turnNumber, sessionId }
    );

    // Save state on error (mark as interrupted) if persistence is enabled
    if (persistence) {
      const interruptedState = state.serialize(sessionId, {
        interrupted: true,
        endReason: `Error: ${(error as Error).message}`,
      });
      await persistence.save(sessionId, interruptedState);
    }

    throw error;
  } finally {
    // Stop auto-save timer
    if (persistence) {
      persistence.stopAutoSaveTimer(sessionId);
    }

    // Cleanup status writer
    if (statusWriter) {
      statusWriter.setActivity("Session ended");
      statusWriter.cleanup();
    }
  }

  // End loop persistence
  if (persistence) {
    await persistence.endLoop(sessionId, {
      endReason: shouldContinue ? "stopped" : "completed",
    });
  }

  // Execute SessionEnd hook
  if (hookManager) {
    await hookManager.execute("SessionEnd", {
      session_id: sessionId,
    });
  }

  return state.toResult();
}

/**
 * Find all interrupted loops that can be resumed
 *
 * @param storageDir - Optional custom storage directory
 * @returns Array of session IDs for interrupted loops
 */
export async function findInterruptedLoops(
  storageDir?: string
): Promise<string[]> {
  const persistence = new LoopPersistence(
    storageDir ? { ...DEFAULT_PERSISTENCE_CONFIG, storageDir } : DEFAULT_PERSISTENCE_CONFIG
  );
  return persistence.findInterruptedLoops();
}

/**
 * Get the most recent interrupted loop
 *
 * @param storageDir - Optional custom storage directory
 * @returns Session ID of the most recent interrupted loop, or null
 */
export async function getMostRecentInterruptedLoop(
  storageDir?: string
): Promise<string | null> {
  const persistence = new LoopPersistence(
    storageDir ? { ...DEFAULT_PERSISTENCE_CONFIG, storageDir } : DEFAULT_PERSISTENCE_CONFIG
  );
  return persistence.getMostRecentInterruptedLoop();
}

/**
 * Get summary of a persisted loop
 *
 * @param sessionId - The session ID to get summary for
 * @param storageDir - Optional custom storage directory
 * @returns Summary object or null if not found
 */
export async function getLoopSummary(
  sessionId: string,
  storageDir?: string
): Promise<{
  sessionId: string;
  turnNumber: number;
  totalCost: number;
  duration: string;
  checkpointCount: number;
  templateName: string | null;
  interrupted: boolean;
} | null> {
  const persistence = new LoopPersistence(
    storageDir ? { ...DEFAULT_PERSISTENCE_CONFIG, storageDir } : DEFAULT_PERSISTENCE_CONFIG
  );
  return persistence.getSummary(sessionId);
}
