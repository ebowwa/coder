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
import { DEFAULT_MODEL } from "../models.js";
import type { HookManager } from "../../ecosystem/hooks/index.js";
import { buildToolCapabilities } from "../tool-capabilities.js";

import type { AgentLoopOptions, AgentLoopResult, LoopPersistenceConfig } from "./types.js";
import { LoopState, type LoopStateOptions } from "./loop-state.js";
import { executeTurn, type TurnExecutorOptions } from "./turn-executor.js";
import { handleProactiveCompaction, DEFAULT_PROACTIVE_OPTIONS } from "./compaction.js";
import { getContextWindow, getMaxOutput } from "../models.js";
import {
  LoopPersistence,
  DEFAULT_PERSISTENCE_CONFIG,
  type PersistedLoopState,
} from "./loop-persistence.js";

// Degeneration detection: tracks patterns of unproductive model output
const DEGENERATION_NO_TOOL_THRESHOLD = 2;
const DEGENERATION_SIMILARITY_THRESHOLD = 0.7;
const DEGENERATION_WINDOW = 5;

interface DegenerationTracker {
  consecutiveNoToolTurns: number;
  consecutiveErrorOnlyTurns: number;
  recentOutputs: string[];
  lastThinkingContent: string;
}

function extractLastAssistantText(state: LoopState): string {
  const last = state.messages[state.messages.length - 1];
  if (!last || last.role !== "assistant") return "";
  if (typeof last.content === "string") return last.content;
  if (Array.isArray(last.content)) {
    const parts: string[] = [];
    for (const b of last.content) {
      if (b.type === "text" && typeof (b as { text?: string }).text === "string") {
        parts.push((b as { text: string }).text);
      }
      if (b.type === "thinking" && typeof (b as { thinking?: string }).thinking === "string") {
        parts.push((b as { thinking: string }).thinking);
      }
    }
    return parts.join(" ").slice(0, 1000);
  }
  return "";
}

/**
 * Detect intra-turn thinking loops: the same phrase repeated many times
 * within a single model response. This catches glm-5's common failure mode
 * where reasoning tokens loop on "Let me read X" endlessly.
 */
function hasIntraTurnRepetition(text: string): boolean {
  if (!text || text.length < 200) return false;
  const sentences = text.split(/[.!?\n]/).map((s) => s.trim().toLowerCase()).filter((s) => s.length > 15);
  if (sentences.length < 6) return false;
  const counts = new Map<string, number>();
  for (const s of sentences) {
    const key = s.slice(0, 60);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  for (const [, count] of counts) {
    if (count >= 4) return true;
  }
  return false;
}

function textSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 ? intersection / union : 0;
}

function isGibberish(text: string): boolean {
  if (!text || text.length < 50) return false;

  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return false;

  let brokenLines = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    const words = trimmed.split(/\s+/);
    const avgWordLen = words.reduce((s, w) => s + w.length, 0) / words.length;
    const hasBalancedBraces =
      (trimmed.match(/\{/g)?.length ?? 0) === (trimmed.match(/\}/g)?.length ?? 0);
    const hasBalancedParens =
      (trimmed.match(/\(/g)?.length ?? 0) === (trimmed.match(/\)/g)?.length ?? 0);

    if (
      (avgWordLen < 2 && words.length > 5) ||
      (!hasBalancedBraces && !hasBalancedParens && words.length > 3) ||
      (trimmed.length > 100 && !/[.;{})\]>]$/.test(trimmed))
    ) {
      brokenLines++;
    }
  }

  return brokenLines / lines.length > 0.5;
}

function checkDegeneration(tracker: DegenerationTracker): "ok" | "compact" | "stuck" {
  // Intra-turn thinking loop: model repeats the same phrase within one response.
  // This is the most common glm-5 failure mode -- catches it immediately.
  if (tracker.lastThinkingContent && hasIntraTurnRepetition(tracker.lastThinkingContent)) {
    return "stuck";
  }

  if (tracker.consecutiveNoToolTurns >= DEGENERATION_NO_TOOL_THRESHOLD) {
    return "stuck";
  }

  if (tracker.consecutiveErrorOnlyTurns >= 3) {
    return "stuck";
  }

  // Extended repetition (5+ similar outputs) is "stuck" even if tools are used.
  if (tracker.recentOutputs.length >= 5) {
    const last5 = tracker.recentOutputs.slice(-5);
    const allSimilar = last5.slice(1).every(
      (t, i) => textSimilarity(last5[i]!, t) > DEGENERATION_SIMILARITY_THRESHOLD,
    );
    if (allSimilar) {
      return "stuck";
    }
  }

  if (tracker.recentOutputs.length >= 3) {
    const last3 = tracker.recentOutputs.slice(-3);
    const similarities = [
      textSimilarity(last3[0]!, last3[1]!),
      textSimilarity(last3[1]!, last3[2]!),
    ];
    if (similarities.every((s) => s > DEGENERATION_SIMILARITY_THRESHOLD)) {
      return "compact";
    }
  }

  if (tracker.recentOutputs.length >= 2) {
    const lastTwo = tracker.recentOutputs.slice(-2);
    if (lastTwo.every((t) => isGibberish(t))) {
      return "stuck";
    }
  }

  return "ok";
}
import {
  LongRunningIntegration,
  DEFAULT_LONG_RUNNING_INTEGRATION_CONFIG,
  type LongRunningIntegrationConfig,
} from "./long-running-integration.js";
import { LongRunningMemoryManager } from "./long-running-memory.js";

// Re-export types and utilities
export type { AgentLoopOptions, AgentLoopResult, LoopPersistenceConfig, LoopEndReason } from "./types.js";
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
    // CC pattern: II6(model) = Math.min(env.MAX_OUTPUT_TOKENS, iYA(model))
    // iYA defaults to 32000 for unknown models; sonnet-4/haiku-4 = 64000
    // We use model's declared maxOutput, capped at a practical per-turn limit
    maxTokens = Math.min(
      getMaxOutput(model),
      parseInt(process.env.CODER_MAX_OUTPUT_TOKENS || "0") || 32_000
    ),
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
  if (longRunningOption) {
    const memoryManager = new LongRunningMemoryManager();
    const config: Partial<LongRunningIntegrationConfig> = typeof longRunningOption === "boolean"
      ? { enabled: longRunningOption, sessionId, originalGoal: longRunningGoal || "Autonomous work session" }
      : { enabled: true, sessionId, originalGoal: longRunningGoal || "Autonomous work session", ...longRunningOption };

    longRunningIntegration = new LongRunningIntegration(config, memoryManager);
    await longRunningIntegration.initialize();
    console.log(`Long-running mode enabled for session ${sessionId}`);
  }

  const permissionManager = new PermissionManager(permissionMode, onPermissionRequest);
  const mergedReminderConfig = { ...DEFAULT_REMINDER_CONFIG, ...reminderConfig };

  // Execute SessionStart hook
  if (hookManager) {
    await hookManager.execute("SessionStart", {
      session_id: sessionId,
    });
  }

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
  let consecutiveApiFailures = 0;
  const MAX_CONSECUTIVE_API_FAILURES = 5;
  const API_FAILURE_COOLDOWN_BASE_MS = 15_000;

  const degenTracker: DegenerationTracker = {
    consecutiveNoToolTurns: 0,
    consecutiveErrorOnlyTurns: 0,
    recentOutputs: [],
    lastThinkingContent: "",
  };
  let degenerationCompactions = 0;
  const MAX_DEGENERATION_COMPACTIONS = 2;

  try {
    while (shouldContinue) {
      if (signal?.aborted) {
        state.endReason = "aborted";
        break;
      }

      const toolCapabilities = buildToolCapabilities(tools);

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
        toolCapabilities,
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
      };

      try {
        // Capture per-turn thinking for intra-turn repetition detection
        let turnThinking = "";
        const wrappedOptions = {
          ...turnOptions,
          onThinking: (chunk: string) => {
            turnThinking += chunk;
            if (onThinking) onThinking(chunk);
          },
        };

        const toolCountBefore = state.allToolsUsed.length;
        const turnResult = await executeTurn(state, wrappedOptions);
        consecutiveApiFailures = 0;

        shouldContinue = turnResult.shouldContinue;

        if (turnResult.metrics && onMetrics) {
          onMetrics(turnResult.metrics);
        }

        // Degeneration tracking
        const toolsThisTurn = state.allToolsUsed.length - toolCountBefore;
        if (toolsThisTurn > 0) {
          degenTracker.consecutiveNoToolTurns = 0;
          const lastMsg = state.messages[state.messages.length - 1];
          const hasErrors = Array.isArray(lastMsg?.content)
            && lastMsg.content.some((b: Record<string, unknown>) => b.type === "tool_result" && b.is_error);
          const allErrors = Array.isArray(lastMsg?.content)
            && lastMsg.content.filter((b: Record<string, unknown>) => b.type === "tool_result").length > 0
            && lastMsg.content
                .filter((b: Record<string, unknown>) => b.type === "tool_result")
                .every((b: Record<string, unknown>) => b.is_error);
          if (allErrors) {
            degenTracker.consecutiveErrorOnlyTurns++;
          } else {
            degenTracker.consecutiveErrorOnlyTurns = 0;
          }
        } else {
          degenTracker.consecutiveNoToolTurns++;
        }

        const lastText = extractLastAssistantText(state);
        degenTracker.recentOutputs.push(lastText);
        if (degenTracker.recentOutputs.length > DEGENERATION_WINDOW) {
          degenTracker.recentOutputs.shift();
        }
        degenTracker.lastThinkingContent = turnThinking;

        const degenStatus = checkDegeneration(degenTracker);
        if (degenStatus === "stuck" || degenStatus === "compact") {
          degenerationCompactions++;
          const isThinkingLoop = turnThinking.length > 200 && hasIntraTurnRepetition(turnThinking);
          const reason = isThinkingLoop
            ? "thinking token loop (repeated phrase in reasoning)"
            : degenStatus === "stuck"
              ? `${degenTracker.consecutiveNoToolTurns} turns without tool calls`
              : "repetitive output";

          if (degenerationCompactions > MAX_DEGENERATION_COMPACTIONS) {
            console.log(
              `\x1b[31m[AgentLoop] Degeneration persists after ${MAX_DEGENERATION_COMPACTIONS} compactions (${reason}). Ending session for handoff.\x1b[0m`
            );
            state.endReason = "degeneration";
            shouldContinue = false;
          } else {
            console.log(
              `\x1b[33m[AgentLoop] Degeneration detected (${reason}), compaction ${degenerationCompactions}/${MAX_DEGENERATION_COMPACTIONS}.\x1b[0m`
            );
            const contextWindow = getContextWindow(model);
            await handleProactiveCompaction(state, contextWindow, { ...DEFAULT_PROACTIVE_OPTIONS, keepLast: 2 });
            degenTracker.consecutiveNoToolTurns = 0;
            degenTracker.consecutiveErrorOnlyTurns = 0;
            degenTracker.recentOutputs = [];
          }
        }
      } catch (turnError) {
        consecutiveApiFailures++;
        const errMsg = turnError instanceof Error ? turnError.message : String(turnError);
        console.error(
          `\x1b[33m[AgentLoop] Turn ${state.turnNumber} failed (${consecutiveApiFailures}/${MAX_CONSECUTIVE_API_FAILURES}): ${errMsg}\x1b[0m`
        );

        if (consecutiveApiFailures >= MAX_CONSECUTIVE_API_FAILURES) {
          lastError = turnError as Error;
          throw turnError;
        }

        const cooldownMs = API_FAILURE_COOLDOWN_BASE_MS * Math.min(consecutiveApiFailures, 4);
        console.log(`\x1b[33m[AgentLoop] Cooling down ${cooldownMs / 1000}s before retry...\x1b[0m`);
        await new Promise((resolve) => setTimeout(resolve, cooldownMs));
        continue;
      }

      if (persistence && persistence.shouldAutoSave(sessionId)) {
        await persistence.save(sessionId, state.serialize(sessionId));
        if (onPersist) {
          onPersist(sessionId, state.turnNumber);
        }
      }
    }
  } catch (error) {
    lastError = error as Error;

    if (persistence) {
      const interruptedState = state.serialize(sessionId, {
        interrupted: true,
        endReason: `Error: ${(error as Error).message}`,
      });
      await persistence.save(sessionId, interruptedState);
    }

    throw error;
  } finally {
    if (persistence) {
      persistence.stopAutoSaveTimer(sessionId);
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
