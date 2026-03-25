/**
 * Workflow Integration - Bridges WorkflowEngine with FSM/LoopState
 *
 * This module provides bidirectional integration between:
 * - WorkflowEngine (graph-based orchestration)
 * - FSM (phase tracking)
 * - LoopState (data management)
 *
 * IMPORTANT: This is an OPTIONAL integration layer.
 * The existing agentLoop() continues to work unchanged.
 *
 * @module agent-loop/workflow-integration
 */

import type { Message as WorkflowMessage, StepProcessor, StepResult, WorkflowContext } from "../../circuit/types.js";
import { WorkflowEngine, createMessage, cloneMessage } from "../../circuit/engine.js";
import type { FSM } from "../fsm/index.js";
import type {
  AgentLoopState,
  AgentLoopEvent,
  AgentLoopContext,
} from "./loop-fsm.js";
import type { FSMIntegratedLoopState } from "./fsm-integration.js";

// ============================================
// TYPES
// ============================================

/**
 * Message types exchanged between FSM and Workflow
 */
export type FSMWorkflowMessageType =
  | "fsm.state_change"
  | "fsm.turn_complete"
  | "fsm.error"
  | "fsm.tool_result"
  | "workflow.step_start"
  | "workflow.step_complete"
  | "workflow.loop_feedback";

/**
 * Sync direction
 */
export type SyncDirection = "fsm-to-workflow" | "workflow-to-fsm" | "bidirectional";

/**
 * Configuration for FSM-Workflow integration
 */
export interface FSMWorkflowIntegrationConfig {
  /** Session ID */
  sessionId: string;
  /** Enable bidirectional sync */
  syncDirection?: SyncDirection;
  /** Convert FSM events to workflow messages */
  emitFSMEventsToWorkflow?: boolean;
  /** Update FSM context from workflow state */
  syncWorkflowStateToFSM?: boolean;
  /** Maximum sync iterations (prevent infinite loops) */
  maxSyncIterations?: number;
  /** Callback when sync occurs */
  onSync?: (event: SyncEvent) => void;
}

/**
 * Event emitted during sync
 */
export interface SyncEvent {
  type: "fsm_to_workflow" | "workflow_to_fsm";
  timestamp: number;
  source: "fsm" | "workflow";
  data: {
    fsmState?: AgentLoopState;
    workflowStep?: string;
    changes: Record<string, unknown>;
  };
}

/**
 * Combined context for FSM + Workflow
 */
export interface CombinedWorkflowContext {
  /** FSM integrated state */
  fsm: FSMIntegratedLoopState;
  /** Workflow engine */
  workflow: WorkflowEngine;
  /** Workflow ID */
  workflowId: string;
  /** Sync events log */
  syncEvents: SyncEvent[];
  /** Current sync iteration */
  syncIteration: number;
}

// ============================================
// FSM STEP PROCESSOR
// ============================================

/**
 * Create a workflow step processor that wraps FSM execution
 *
 * This allows an FSM to be used as a step in a WorkflowEngine pipeline.
 */
export function createFSMStepProcessor(
  integratedState: FSMIntegratedLoopState,
  options: {
    maxTurns?: number;
    onTurnComplete?: (turn: number, result: unknown) => void;
  } = {}
): StepProcessor {
  const maxTurns = options.maxTurns ?? 10;

  return async (
    message: WorkflowMessage,
    context: WorkflowContext
  ): Promise<StepResult> => {
    // Extract goal from message
    const goal = extractGoalFromMessage(message);

    // Start the FSM if not already started
    if (integratedState.fsmState === "idle") {
      integratedState.start(goal);
    }

    // Execute turns until complete or max reached
    let turnsExecuted = 0;
    const turnResults: unknown[] = [];

    while (!integratedState.isComplete && turnsExecuted < maxTurns) {
      // In a real implementation, this would call executeTurn()
      // For now, we simulate a turn
      const turnResult = await simulateTurn(integratedState, context);
      turnResults.push(turnResult);
      turnsExecuted++;

      options.onTurnComplete?.(turnsExecuted, turnResult);

      // Check if we should continue
      if (!integratedState.shouldContinue) {
        break;
      }
    }

    // Create output message
    const outputMessage = createMessage(
      "fsm.turn_complete",
      {
        turnsExecuted,
        turnResults,
        finalState: integratedState.fsmState,
        totalCost: integratedState.totalCost,
      },
      "fsm_step",
      { priority: message.priority }
    );

    return {
      messages: [outputMessage],
      continue: !integratedState.isComplete,
      state: {
        fsmState: integratedState.fsmState,
        turnNumber: integratedState.turnNumber,
        totalCost: integratedState.totalCost,
      },
    };
  };
}

/**
 * Simulate a turn execution (placeholder for actual implementation)
 */
async function simulateTurn(
  integratedState: FSMIntegratedLoopState,
  _context: WorkflowContext
): Promise<unknown> {
  // Begin streaming
  integratedState.beginStreaming();

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 10));

  // End streaming
  integratedState.endStreaming();

  // Complete the turn
  const result = integratedState.completeTurn({
    turnNumber: integratedState.turnNumber + 1,
    tokensUsed: 100,
    cost: 0.01,
    stopReason: "continue",
  });

  return {
    turnNumber: integratedState.turnNumber,
    fsmState: integratedState.fsmState,
    isComplete: result.isComplete,
  };
}

/**
 * Extract goal from workflow message
 */
function extractGoalFromMessage(message: WorkflowMessage): string {
  if (typeof message.payload === "string") {
    return message.payload;
  }
  if (message.payload && typeof message.payload === "object") {
    const payload = message.payload as Record<string, unknown>;
    if (payload.goal) return String(payload.goal);
    if (payload.query) return String(payload.query);
    if (payload.text) return String(payload.text);
  }
  return "Process message";
}

// ============================================
// SYNC MANAGER
// ============================================

/**
 * FSM-Workflow Sync Manager
 *
 * Manages bidirectional synchronization between FSM state and Workflow state.
 */
export class FSMWorkflowSyncManager {
  private config: FSMWorkflowIntegrationConfig;
  private syncEvents: SyncEvent[] = [];
  private syncIteration = 0;

  constructor(config: FSMWorkflowIntegrationConfig) {
    this.config = {
      syncDirection: "bidirectional",
      emitFSMEventsToWorkflow: true,
      syncWorkflowStateToFSM: true,
      maxSyncIterations: 100,
      ...config,
    };
  }

  /**
   * Sync FSM state changes to workflow messages
   */
  syncFSMToWorkflow(
    fsm: FSM<AgentLoopContext>,
    fromState: AgentLoopState,
    toState: AgentLoopState,
    event: AgentLoopEvent
  ): WorkflowMessage | null {
    if (!this.config.emitFSMEventsToWorkflow) {
      return null;
    }

    const syncEvent: SyncEvent = {
      type: "fsm_to_workflow",
      timestamp: Date.now(),
      source: "fsm",
      data: {
        fsmState: toState,
        changes: {
          fromState,
          toState,
          eventType: event.type,
          context: {
            turnNumber: fsm.context.turnNumber,
            totalCost: fsm.context.totalCost,
            errorCount: fsm.context.errorCount,
          },
        },
      },
    };

    this.syncEvents.push(syncEvent);
    this.config.onSync?.(syncEvent);

    // Create workflow message from FSM transition
    return createMessage(
      `fsm.state_change`,
      {
        fromState,
        toState,
        event: event.type,
        context: {
          turnNumber: fsm.context.turnNumber,
          totalCost: fsm.context.totalCost,
          pendingTools: fsm.context.pendingTools?.length ?? 0,
        },
      },
      "fsm",
      { priority: 1.0 }
    );
  }

  /**
   * Sync workflow state to FSM context
   */
  syncWorkflowToFSM(
    workflowContext: WorkflowContext,
    fsm: FSM<AgentLoopContext>
  ): void {
    if (!this.config.syncWorkflowStateToFSM) {
      return;
    }

    this.syncIteration++;
    if (this.syncIteration > (this.config.maxSyncIterations ?? 100)) {
      console.warn("Max sync iterations reached, stopping sync");
      return;
    }

    // Extract relevant state from workflow context
    const workflowState = workflowContext.state;
    const changes: Record<string, unknown> = {};

    // Sync metrics if available
    if (workflowState.totalCost !== undefined) {
      const oldCost = fsm.context.totalCost;
      fsm.context.totalCost = Math.max(fsm.context.totalCost, workflowState.totalCost as number);
      if (oldCost !== fsm.context.totalCost) {
        changes.totalCost = fsm.context.totalCost;
      }
    }

    // Sync token count if available
    if (workflowState.estimatedTokens !== undefined) {
      const oldTokens = fsm.context.estimatedTokens;
      fsm.context.estimatedTokens = workflowState.estimatedTokens as number;
      if (oldTokens !== fsm.context.estimatedTokens) {
        changes.estimatedTokens = fsm.context.estimatedTokens;
      }
    }

    // Record sync event if changes occurred
    if (Object.keys(changes).length > 0) {
      const syncEvent: SyncEvent = {
        type: "workflow_to_fsm",
        timestamp: Date.now(),
        source: "workflow",
        data: {
          changes,
        },
      };

      this.syncEvents.push(syncEvent);
      this.config.onSync?.(syncEvent);
    }
  }

  /**
   * Get all sync events
   */
  getSyncEvents(): SyncEvent[] {
    return [...this.syncEvents];
  }

  /**
   * Clear sync events
   */
  clearSyncEvents(): void {
    this.syncEvents = [];
    this.syncIteration = 0;
  }

  /**
   * Get sync statistics
   */
  getStats() {
    const fsmToWorkflow = this.syncEvents.filter((e) => e.type === "fsm_to_workflow").length;
    const workflowToFsm = this.syncEvents.filter((e) => e.type === "workflow_to_fsm").length;

    return {
      totalSyncs: this.syncEvents.length,
      fsmToWorkflow,
      workflowToFsm,
      syncIteration: this.syncIteration,
    };
  }
}

// ============================================
// WORKFLOW FACTORY
// ============================================

/**
 * Create an agent workflow with FSM integration
 *
 * This creates a WorkflowEngine workflow that uses FSM for turn management.
 */
export function createAgentWorkflow(
  integratedState: FSMIntegratedLoopState,
  config: {
    workflowId: string;
    maxCycles?: number;
    adaptiveRouting?: boolean;
  }
): {
  engine: WorkflowEngine;
  workflowId: string;
  syncManager: FSMWorkflowSyncManager;
} {
  const engine = new WorkflowEngine({
    rule: "hebbian",
    boostRate: 0.1,
    decayRate: 0.01,
    minPriority: 0.1,
    maxPriority: 1.0,
  });

  // Create workflow steps
  const fsmProcessor = createFSMStepProcessor(integratedState);

  engine.createWorkflow(
    {
      id: config.workflowId,
      name: "Agent Workflow",
      steps: [
        { id: "input", type: "input", name: "Input" },
        { id: "agent", type: "agent", name: "Agent Turn" },
        { id: "output", type: "output", name: "Output" },
      ],
      connections: [
        { from: "input", to: "agent", type: "direct" },
        { from: "agent", to: "output", type: "direct" },
      ],
      maxCycles: config.maxCycles ?? 100,
      adaptiveRouting: config.adaptiveRouting ?? true,
    },
    new Map([
      ["agent", fsmProcessor],
    ])
  );

  // Create sync manager
  const syncManager = new FSMWorkflowSyncManager({
    sessionId: config.workflowId,
  });

  return {
    engine,
    workflowId: config.workflowId,
    syncManager,
  };
}

// ============================================
// EVENT CONVERTERS
// ============================================

/**
 * Convert FSM event to Workflow message
 */
export function fsmEventToWorkflowMessage(
  event: AgentLoopEvent,
  fsmContext: AgentLoopContext
): WorkflowMessage {
  // Map event types to valid message types
  const eventTypeMap: Record<string, FSMWorkflowMessageType> = {
    START: "fsm.state_change",
    TURN_COMPLETE: "fsm.turn_complete",
    STOP: "fsm.state_change",
    CANCEL: "fsm.state_change",
    ERROR: "fsm.state_change",
  };
  const messageType: FSMWorkflowMessageType = eventTypeMap[event.type] ?? "fsm.state_change";

  return createMessage(
    messageType,
    {
      eventType: event.type,
      payload: "payload" in event ? event.payload : undefined,
      context: {
        turnNumber: fsmContext.turnNumber,
        totalCost: fsmContext.totalCost,
        pendingTools: fsmContext.pendingTools.length,
      },
    },
    "fsm",
    { priority: 1.0 }
  );
}

/**
 * Convert Workflow message to FSM event
 */
export function workflowMessageToFSMEvent(
  message: WorkflowMessage
): AgentLoopEvent | null {
  // Only convert messages that are meant for FSM
  if (!message.type.startsWith("fsm.")) {
    return null;
  }

  const eventType = message.type.replace("fsm.", "").toUpperCase();

  // Map to FSM event types
  const payload = message.payload as Record<string, unknown> | undefined;
  switch (eventType) {
    case "START":
      return { type: "START", payload: { goal: (payload?.goal as string) || "" } };
    case "PAUSE":
      return { type: "PAUSE" };
    case "RESUME":
      return { type: "RESUME" };
    case "STOP":
      return { type: "STOP", payload: { reason: (payload?.reason as string) || "user requested" } };
    case "CANCEL":
      return { type: "CANCEL", payload: { reason: (payload?.reason as string) || "user cancelled" } };
    default:
      return null;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if workflow message is an FSM event
 */
export function isFSMWorkflowMessage(message: WorkflowMessage): boolean {
  return message.type.startsWith("fsm.");
}

/**
 * Create a combined context for FSM + Workflow
 */
export function createCombinedContext(
  integratedState: FSMIntegratedLoopState,
  workflowEngine: WorkflowEngine,
  workflowId: string
): CombinedWorkflowContext {
  return {
    fsm: integratedState,
    workflow: workflowEngine,
    workflowId,
    syncEvents: [],
    syncIteration: 0,
  };
}
