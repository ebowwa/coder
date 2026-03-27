/**
 * Agent Loop FSM - Finite State Machine for the agent loop
 *
 * Defines the formal state machine for the agent's execution loop.
 * States: idle, processing, tool_execution, compaction, paused, completed, error
 * Events: start, turn_complete, tool_needed, tool_result, compact, pause, resume, stop, error
 *
 * @module agent-loop/loop-fsm
 */

import { FSM, createFSM, and, or, not } from "../fsm/index.js";
import type {
  FSMConfig,
  FSMContext,
  FSMEvent,
  Guard,
  Action,
} from "../fsm/types.js";
import {
  maxTurnsGuard,
  costThresholdGuard,
  timeoutGuard,
  errorCountGuard,
  greaterThan,
  equals,
} from "../fsm/guards.js";
import {
  increment,
  set,
  log,
  assign,
  sequence,
  trackToolUse,
  updateCost,
  incrementTurn,
  recordError,
} from "../fsm/actions.js";

// ============================================
// TYPES
// ============================================

/**
 * Agent Loop States
 */
export type AgentLoopState =
  | "idle"
  | "processing"
  | "streaming"
  | "tool_execution"
  | "waiting_permission"
  | "compaction"
  | "paused"
  | "completed"
  | "cancelled"
  | "error";

/**
 * Agent Loop Events
 */
export type AgentLoopEvent =
  | { type: "START"; payload?: { goal?: string } }
  | { type: "TURN_START"; payload?: { turnNumber: number } }
  | { type: "TURN_COMPLETE"; payload: TurnCompletePayload }
  | { type: "STREAM_START" }
  | { type: "STREAM_CHUNK"; payload: { text: string } }
  | { type: "STREAM_END" }
  | { type: "TOOL_NEEDED"; payload: { toolId: string; toolName: string; input: unknown } }
  | { type: "TOOL_RESULT"; payload: { toolId: string; result: unknown; success: boolean } }
  | { type: "PERMISSION_REQUEST"; payload: { toolId: string; toolName: string } }
  | { type: "PERMISSION_GRANTED"; payload: { toolId: string } }
  | { type: "PERMISSION_DENIED"; payload: { toolId: string; reason?: string } }
  | { type: "COMPACT_START" }
  | { type: "COMPACT_END"; payload: { tokensSaved: number } }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "STOP"; payload?: { reason: string } }
  | { type: "CANCEL"; payload?: { reason: string } }
  | { type: "ERROR"; payload: { error: Error; recoverable: boolean } }
  | { type: "MAX_TURNS_REACHED" }
  | { type: "COST_THRESHOLD_REACHED" }
  | { type: "TIMEOUT_REACHED" }
  | { type: "GOAL_COMPLETE" };

export interface TurnCompletePayload {
  turnNumber: number;
  tokensUsed: number;
  cost: number;
  stopReason: string;
}

/**
 * Agent Loop Context
 */
export interface AgentLoopContext {
  // Session info
  sessionId: string;
  goal: string;
  startTime: number;

  // Turn tracking
  turnNumber: number;
  maxTurns: number;

  // Cost tracking
  totalCost: number;
  maxCost: number;

  // Token tracking
  estimatedTokens: number;
  contextWindow: number;

  // Error tracking
  errorCount: number;
  maxErrors: number;
  lastError?: Error;

  // Tool tracking
  toolsUsed: Array<{ name: string; timestamp: number }>;
  pendingTools: Array<{ id: string; name: string; input: unknown }>;

  // Permission tracking
  pendingPermission?: { toolId: string; toolName: string };

  // Compaction tracking
  compactionCount: number;
  tokensCompacted: number;

  // State flags
  canResume: boolean;
  isInterrupted: boolean;
}

/**
 * Default context values
 */
export const DEFAULT_LOOP_CONTEXT: AgentLoopContext = {
  sessionId: "",
  goal: "",
  startTime: 0,
  turnNumber: 0,
  maxTurns: 100,
  totalCost: 0,
  maxCost: 10.0,
  estimatedTokens: 0,
  contextWindow: 200000,
  errorCount: 0,
  maxErrors: 5,
  toolsUsed: [],
  pendingTools: [],
  compactionCount: 0,
  tokensCompacted: 0,
  canResume: false,
  isInterrupted: false,
};

// ============================================
// GUARDS
// ============================================

/**
 * Guard: Check if turn limit not reached (accounting for the turn that will start)
 */
const canContinueTurns: Guard<AgentLoopContext> = (ctx) => {
  // Account for the turn that will be started if we continue
  const nextTurnNumber = ctx.state.turnNumber + 1;
  // maxTurns: 0 means unlimited turns
  const passed = ctx.state.maxTurns === 0 || nextTurnNumber <= ctx.state.maxTurns;

  if (process.env.DEBUG_API === '1') {
    console.log(`\x1b[90m[DEBUG] canContinueTurns: turnNumber=${ctx.state.turnNumber}, maxTurns=${ctx.state.maxTurns}, nextTurnNumber=${nextTurnNumber}, passed=${passed}\x1b[0m`);
  }

  return {
    passed,
    reason: passed
      ? undefined
      : `Turn limit would be reached: ${nextTurnNumber} > ${ctx.state.maxTurns}`,
  };
};

/**
 * Guard: Check if cost limit not reached (accounting for incoming cost)
 */
const canContinueCost: Guard<AgentLoopContext> = (ctx) => {
  // Account for the cost that will be added by this turn
  const incomingCost = (ctx.event.payload as TurnCompletePayload | undefined)?.cost ?? 0;
  const projectedCost = ctx.state.totalCost + incomingCost;
  const passed = projectedCost < ctx.state.maxCost;

  if (process.env.DEBUG_API === '1') {
    console.log(`\x1b[90m[DEBUG] canContinueCost: totalCost=${ctx.state.totalCost.toFixed(4)}, incomingCost=${incomingCost.toFixed(4)}, maxCost=${ctx.state.maxCost}, passed=${passed}\x1b[0m`);
  }

  return {
    passed,
    reason: passed
      ? undefined
      : `Cost limit would be reached: $${projectedCost.toFixed(4)} >= $${ctx.state.maxCost}`,
  };
};

/**
 * Guard: Check if error limit not reached
 */
const canContinueErrors: Guard<AgentLoopContext> = (ctx) => ({
  passed: ctx.state.errorCount < ctx.state.maxErrors,
  reason: `Error limit reached: ${ctx.state.errorCount} >= ${ctx.state.maxErrors}`,
});

/**
 * Guard: Check if context window has capacity
 */
const contextWindowAvailable: Guard<AgentLoopContext> = (ctx) => {
  const threshold = ctx.state.contextWindow * 0.9;
  const passed = ctx.state.estimatedTokens < threshold;
  return {
    passed,
    reason: passed
      ? undefined
      : `Context window near capacity: ${ctx.state.estimatedTokens} >= ${threshold}`,
  };
};

/**
 * Guard: Check if there will be remaining pending tools after current one resolves
 */
const hasRemainingPendingTools: Guard<AgentLoopContext> = (ctx) => {
  // Current tool will be removed, so check if there are more than 1
  const willHaveRemaining = ctx.state.pendingTools.length > 1;
  return {
    passed: willHaveRemaining,
    reason: willHaveRemaining ? undefined : "No remaining pending tools after this one",
  };
};

/**
 * Guard: Check if error is recoverable
 */
const errorRecoverable: Guard<AgentLoopContext> = (ctx) => {
  if (ctx.event.type !== "ERROR") return { passed: false, reason: "Not an error event" };
  const payload = ctx.event.payload as { error: Error; recoverable: boolean } | undefined;
  return {
    passed: payload?.recoverable ?? false,
    reason: payload?.recoverable ? undefined : "Error is not recoverable",
  };
};

// ============================================
// ACTIONS
// ============================================

/**
 * Action: Initialize session
 */
const initializeSession: Action<AgentLoopContext> = (ctx) => {
  const payload = ctx.event.payload as { goal?: string } | undefined;
  ctx.state.sessionId = `session_${Date.now()}`;
  ctx.state.goal = payload?.goal ?? "";
  ctx.state.startTime = Date.now();
};

/**
 * Action: Start a new turn
 */
const startTurn: Action<AgentLoopContext> = (ctx) => {
  ctx.state.turnNumber++;
};

/**
 * Action: Record turn completion
 */
const recordTurnComplete: Action<AgentLoopContext> = (ctx) => {
  const payload = ctx.event.payload as TurnCompletePayload | undefined;
  if (payload) {
    ctx.state.totalCost += payload.cost;
    ctx.state.estimatedTokens += payload.tokensUsed;
  }
};

/**
 * Action: Add pending tool
 */
const addPendingTool: Action<AgentLoopContext> = (ctx) => {
  const payload = ctx.event.payload as { toolId: string; toolName: string; input: unknown } | undefined;
  if (payload) {
    ctx.state.pendingTools.push({
      id: payload.toolId,
      name: payload.toolName,
      input: payload.input,
    });
  }
};

/**
 * Action: Remove pending tool
 */
const removePendingTool: Action<AgentLoopContext> = (ctx) => {
  const payload = ctx.event.payload as { toolId: string } | undefined;
  if (payload) {
    ctx.state.pendingTools = ctx.state.pendingTools.filter(
      (t) => t.id !== payload.toolId
    );
  }
};

/**
 * Action: Record tool result
 */
const recordToolResult: Action<AgentLoopContext> = (ctx) => {
  const payload = ctx.event.payload as { toolId: string; result: unknown; success: boolean } | undefined;
  if (payload) {
    const tool = ctx.state.pendingTools.find((t) => t.id === payload.toolId);
    if (tool) {
      ctx.state.toolsUsed.push({
        name: tool.name,
        timestamp: Date.now(),
      });
    }
  }
};

/**
 * Action: Record error
 */
const recordLoopError: Action<AgentLoopContext> = (ctx) => {
  const payload = ctx.event.payload as { error: Error; recoverable: boolean } | undefined;
  if (payload) {
    ctx.state.errorCount++;
    ctx.state.lastError = payload.error;
  }
};

/**
 * Action: Record compaction
 */
const recordCompaction: Action<AgentLoopContext> = (ctx) => {
  const payload = ctx.event.payload as { tokensSaved: number } | undefined;
  if (payload) {
    ctx.state.compactionCount++;
    ctx.state.tokensCompacted += payload.tokensSaved;
    ctx.state.estimatedTokens -= payload.tokensSaved;
  }
};

/**
 * Action: Mark as interrupted
 */
const markInterrupted: Action<AgentLoopContext> = (ctx) => {
  ctx.state.isInterrupted = true;
};

// ============================================
// FSM CONFIGURATION
// ============================================

/**
 * Create the agent loop FSM configuration
 */
export function createAgentLoopFSMConfig(
  context: Partial<AgentLoopContext> = {}
): FSMConfig<AgentLoopContext> {
  return {
    id: "agent-loop",
    initial: "idle",
    context: { ...DEFAULT_LOOP_CONTEXT, ...context },
    states: {
      // ============================================
      // IDLE STATE
      // ============================================
      idle: {
        on: {
          START: {
            target: "processing",
            action: [initializeSession, startTurn],
          },
        },
      },

      // ============================================
      // PROCESSING STATE
      // ============================================
      processing: {
        entry: [log((ctx) => `Starting turn ${ctx.state.turnNumber}`)],
        on: {
          STREAM_START: { target: "streaming" },
          TOOL_NEEDED: {
            target: "tool_execution",
            action: [addPendingTool],
          },
          TURN_COMPLETE: [
            {
              target: "completed",
              guard: (ctx) => {
                const payload = ctx.event.payload as TurnCompletePayload | undefined;
                return payload?.stopReason === "end_turn";
              },
              action: [recordTurnComplete],
            },
            {
              target: "processing",
              guard: and(canContinueTurns, canContinueCost),
              action: [recordTurnComplete, startTurn],
            },
            // Fallback: limits reached, complete the session
            {
              target: "completed",
              action: [recordTurnComplete],
            },
          ],
          COMPACT_START: { target: "compaction" },
          ERROR: [
            {
              target: "processing",
              guard: and(errorRecoverable, canContinueErrors),
              action: [recordLoopError],
            },
            {
              target: "error",
              action: [recordLoopError],
            },
          ],
          PAUSE: { target: "paused" },
          STOP: { target: "completed", action: [markInterrupted] },
          CANCEL: { target: "cancelled" },
        },
      },

      // ============================================
      // STREAMING STATE
      // ============================================
      streaming: {
        on: {
          STREAM_CHUNK: {
            target: "streaming",
            internal: true,
          },
          STREAM_END: { target: "processing" },
          ERROR: { target: "error", action: [recordLoopError] },
        },
      },

      // ============================================
      // TOOL EXECUTION STATE
      // ============================================
      tool_execution: {
        on: {
          PERMISSION_REQUEST: { target: "waiting_permission" },
          TOOL_NEEDED: {
            target: "tool_execution",
            internal: true,
            action: [addPendingTool],
          },
          TOOL_RESULT: [
            {
              target: "tool_execution",
              guard: hasRemainingPendingTools,
              action: [recordToolResult, removePendingTool],
            },
            {
              target: "processing",
              action: [recordToolResult, removePendingTool],
            },
          ],
          ERROR: [
            {
              target: "tool_execution",
              guard: and(errorRecoverable, canContinueErrors),
              action: [recordLoopError],
            },
            {
              target: "error",
              action: [recordLoopError],
            },
          ],
          PAUSE: { target: "paused" },
          STOP: { target: "completed", action: [markInterrupted] },
          CANCEL: { target: "cancelled" },
        },
      },

      // ============================================
      // WAITING PERMISSION STATE
      // ============================================
      waiting_permission: {
        on: {
          PERMISSION_GRANTED: { target: "tool_execution" },
          PERMISSION_DENIED: { target: "processing" },
          CANCEL: { target: "cancelled" },
        },
      },

      // ============================================
      // COMPACTION STATE
      // ============================================
      compaction: {
        on: {
          COMPACT_END: { target: "processing", action: [recordCompaction] },
          ERROR: { target: "error", action: [recordLoopError] },
        },
      },

      // ============================================
      // PAUSED STATE
      // ============================================
      paused: {
        entry: [log("Session paused")],
        exit: [log("Session resumed")],
        on: {
          RESUME: { target: "processing" },
          STOP: { target: "completed", action: [markInterrupted] },
          CANCEL: { target: "cancelled" },
        },
      },

      // ============================================
      // TERMINAL STATES
      // ============================================
      completed: {
        final: true,
        entry: [log((ctx) => `Session completed after ${ctx.state.turnNumber} turns, $${ctx.state.totalCost.toFixed(4)}`)],
      },
      cancelled: {
        final: true,
        entry: [log("Session cancelled")],
      },
      error: {
        final: true,
        entry: [log((ctx) => {
          const errorMsg = ctx.state.lastError?.message ?? "Unknown error";
          // Distinguish abort errors (often intentional) from real errors
          if (errorMsg.includes("aborted") || errorMsg.includes("AbortError")) {
            return `Session aborted: ${errorMsg} (this is usually intentional - timeout or user cancel)`;
          }
          return `Session error: ${errorMsg}`;
        })],
      },
    },
  };
}

/**
 * Create an agent loop FSM instance
 */
export function createAgentLoopFSM(
  context: Partial<AgentLoopContext> = {}
): FSM<AgentLoopContext> {
  const config = createAgentLoopFSMConfig(context);
  return createFSM(config);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if the loop should continue based on context
 */
export function shouldContinueLoop(context: AgentLoopContext): boolean {
  return (
    context.turnNumber < context.maxTurns &&
    context.totalCost < context.maxCost &&
    context.errorCount < context.maxErrors
  );
}

/**
 * Get stop reason if any
 */
export function getStopReason(context: AgentLoopContext): string | null {
  if (context.turnNumber >= context.maxTurns) {
    return "max_turns_reached";
  }
  if (context.totalCost >= context.maxCost) {
    return "cost_threshold_reached";
  }
  if (context.errorCount >= context.maxErrors) {
    return "error_limit_reached";
  }
  return null;
}

/**
 * Get loop statistics
 */
export function getLoopStats(context: AgentLoopContext) {
  return {
    sessionId: context.sessionId,
    turns: context.turnNumber,
    maxTurns: context.maxTurns,
    cost: context.totalCost,
    maxCost: context.maxCost,
    tokens: context.estimatedTokens,
    contextWindow: context.contextWindow,
    errors: context.errorCount,
    toolsUsed: context.toolsUsed.length,
    compactions: context.compactionCount,
    tokensCompacted: context.tokensCompacted,
    duration: Date.now() - context.startTime,
  };
}
