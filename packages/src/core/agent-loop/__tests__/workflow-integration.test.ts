/**
 * Tests for Workflow Integration with FSM
 */

import { describe, test, expect, beforeEach } from "bun:test";
import {
  createFSMStepProcessor,
  FSMWorkflowSyncManager,
  createAgentWorkflow,
  fsmEventToWorkflowMessage,
  workflowMessageToFSMEvent,
  isFSMWorkflowMessage,
  createCombinedContext,
  type FSMWorkflowIntegrationConfig,
  type SyncEvent,
} from "../workflow-integration.js";
import { createIntegratedLoopState, type FSMIntegrationOptions } from "../fsm-integration.js";
import { DEFAULT_LOOP_BEHAVIOR } from "../../../ecosystem/presets/types.js";
import { createMessage } from "../../../circuit/engine.js";

// ============================================
// HELPERS
// ============================================

const createTestFSMOptions = (
  overrides: Partial<FSMIntegrationOptions> = {}
): FSMIntegrationOptions => ({
  initialMessages: [{ role: "user", content: [{ type: "text", text: "Hello" }] }],
  enableFSMLogging: false,
  loopBehaviorOverrides: {
    ...DEFAULT_LOOP_BEHAVIOR,
    maxTurns: 5,
  },
  ...overrides,
});

const createTestSyncConfig = (
  overrides: Partial<FSMWorkflowIntegrationConfig> = {}
): FSMWorkflowIntegrationConfig => ({
  sessionId: "test-session",
  syncDirection: "bidirectional",
  ...overrides,
});

// Create a complete mock FSM context
const createMockFSMContext = () => ({
  sessionId: "test",
  goal: "test",
  startTime: Date.now(),
  turnNumber: 0,
  maxTurns: 10,
  totalCost: 0,
  maxCost: 1.0,
  estimatedTokens: 0,
  contextWindow: 200000,
  errorCount: 0,
  maxErrors: 5,
  lastError: undefined,
  toolsUsed: [] as Array<{ name: string; timestamp: number }>,
  pendingTools: [] as Array<{ id: string; name: string; input: unknown }>,
  pendingPermission: undefined,
  compactionCount: 0,
  tokensCompacted: 0,
  canResume: false,
  isInterrupted: false,
});

// ============================================
// FSM STEP PROCESSOR TESTS
// ============================================

describe("createFSMStepProcessor", () => {
  test("should create a step processor function", () => {
    const integrated = createIntegratedLoopState(createTestFSMOptions());
    const processor = createFSMStepProcessor(integrated);

    expect(typeof processor).toBe("function");
  });

  test("should process a message and return step result", async () => {
    const integrated = createIntegratedLoopState(
      createTestFSMOptions({
        loopBehaviorOverrides: {
          ...DEFAULT_LOOP_BEHAVIOR,
          maxTurns: 2,
        },
      })
    );
    const processor = createFSMStepProcessor(integrated, { maxTurns: 2 });

    const inputMessage = createMessage("query", { goal: "Test goal" }, "test");
    const context = {
      workflowId: "test-workflow",
      cycle: 0,
      maxCycles: 10,
      startTime: Date.now(),
      state: {},
      pendingMessages: [],
      completedMessages: [],
      metrics: {
        messagesProcessed: 0,
        stepActivations: 0,
        connectionTransmissions: 0,
        avgPriority: 0,
        executionTime: 0,
        cyclesCompleted: 0,
      },
    };

    const result = await processor(inputMessage, context);

    expect(result.messages).toBeDefined();
    expect(result.messages.length).toBeGreaterThan(0);
    expect(result.messages[0].type).toBe("fsm.turn_complete");
    expect(result.continue).toBeDefined();
    expect(result.state).toBeDefined();
  });

  test("should call onTurnComplete callback", async () => {
    const integrated = createIntegratedLoopState(
      createTestFSMOptions({
        loopBehaviorOverrides: {
          ...DEFAULT_LOOP_BEHAVIOR,
          maxTurns: 2,
        },
      })
    );

    const completedTurns: number[] = [];
    const processor = createFSMStepProcessor(integrated, {
      maxTurns: 2,
      onTurnComplete: (turn) => completedTurns.push(turn),
    });

    const inputMessage = createMessage("query", { goal: "Test" }, "test");
    const context = {
      workflowId: "test-workflow",
      cycle: 0,
      maxCycles: 10,
      startTime: Date.now(),
      state: {},
      pendingMessages: [],
      completedMessages: [],
      metrics: {
        messagesProcessed: 0,
        stepActivations: 0,
        connectionTransmissions: 0,
        avgPriority: 0,
        executionTime: 0,
        cyclesCompleted: 0,
      },
    };

    await processor(inputMessage, context);

    expect(completedTurns.length).toBeGreaterThan(0);
  });
});

// ============================================
// SYNC MANAGER TESTS
// ============================================

describe("FSMWorkflowSyncManager", () => {
  test("should create sync manager", () => {
    const manager = new FSMWorkflowSyncManager(createTestSyncConfig());
    expect(manager).toBeDefined();
  });

  test("should sync FSM to Workflow", () => {
    const syncEvents: SyncEvent[] = [];
    const manager = new FSMWorkflowSyncManager(
      createTestSyncConfig({
        onSync: (e) => syncEvents.push(e),
      })
    );

    const mockFSM = {
      context: createMockFSMContext(),
    } as unknown as import("../loop-fsm.js").FSM<import("../loop-fsm.js").AgentLoopContext>;

    const message = manager.syncFSMToWorkflow(
      mockFSM,
      "idle",
      "processing",
      { type: "START" }
    );

    expect(message).toBeDefined();
    expect(message?.type).toBe("fsm.state_change");
    expect(syncEvents.length).toBe(1);
    expect(syncEvents[0].source).toBe("fsm");
  });

  test("should not sync when disabled", () => {
    const manager = new FSMWorkflowSyncManager(
      createTestSyncConfig({
        emitFSMEventsToWorkflow: false,
      })
    );

    const mockFSM = {
      context: createMockFSMContext(),
    } as unknown as import("../loop-fsm.js").FSM<import("../loop-fsm.js").AgentLoopContext>;

    const message = manager.syncFSMToWorkflow(
      mockFSM,
      "idle",
      "processing",
      { type: "START" }
    );

    expect(message).toBeNull();
  });

  test("should sync Workflow to FSM", () => {
    const syncEvents: SyncEvent[] = [];
    const manager = new FSMWorkflowSyncManager(
      createTestSyncConfig({
        onSync: (e) => syncEvents.push(e),
      })
    );

    const mockFSM = {
      context: createMockFSMContext(),
    } as unknown as import("../loop-fsm.js").FSM<import("../loop-fsm.js").AgentLoopContext>;

    const workflowContext = {
      state: {
        totalCost: 0.05,
        estimatedTokens: 500,
      },
    } as unknown as import("../../../circuit/types.js").WorkflowContext;

    manager.syncWorkflowToFSM(workflowContext, mockFSM);

    expect(mockFSM.context.totalCost).toBe(0.05);
    expect(mockFSM.context.estimatedTokens).toBe(500);
  });

  test("should track sync stats", () => {
    const manager = new FSMWorkflowSyncManager(createTestSyncConfig());

    const mockFSM = {
      context: createMockFSMContext(),
    } as unknown as import("../loop-fsm.js").FSM<import("../loop-fsm.js").AgentLoopContext>;

    // Do some syncs
    manager.syncFSMToWorkflow(mockFSM, "idle", "processing", { type: "START" });
    manager.syncWorkflowToFSM(
      { state: { totalCost: 0.05, estimatedTokens: 100 } } as unknown as import("../../../circuit/types.js").WorkflowContext,
      mockFSM
    );

    const stats = manager.getStats();
    expect(stats.totalSyncs).toBeGreaterThan(0);
  });

  test("should clear sync events", () => {
    const manager = new FSMWorkflowSyncManager(createTestSyncConfig());

    const mockFSM = {
      context: createMockFSMContext(),
    } as unknown as import("../loop-fsm.js").FSM<import("../loop-fsm.js").AgentLoopContext>;

    manager.syncFSMToWorkflow(mockFSM, "idle", "processing", { type: "START" });
    expect(manager.getSyncEvents().length).toBe(1);

    manager.clearSyncEvents();
    expect(manager.getSyncEvents().length).toBe(0);
  });
});

// ============================================
// AGENT WORKFLOW FACTORY TESTS
// ============================================

describe("createAgentWorkflow", () => {
  test("should create workflow with FSM integration", () => {
    const integrated = createIntegratedLoopState(createTestFSMOptions());
    const { engine, workflowId, syncManager } = createAgentWorkflow(integrated, {
      workflowId: "test-workflow",
    });

    expect(engine).toBeDefined();
    expect(workflowId).toBe("test-workflow");
    expect(syncManager).toBeDefined();
  });

  test("should have correct workflow steps", () => {
    const integrated = createIntegratedLoopState(createTestFSMOptions());
    const { engine } = createAgentWorkflow(integrated, {
      workflowId: "test-workflow",
    });

    const workflow = engine.getWorkflow("test-workflow");
    expect(workflow).toBeDefined();
    expect(workflow?.steps.length).toBe(3);
    expect(workflow?.steps.map((s) => s.id)).toEqual(["input", "agent", "output"]);
  });

  test("should have correct connections", () => {
    const integrated = createIntegratedLoopState(createTestFSMOptions());
    const { engine } = createAgentWorkflow(integrated, {
      workflowId: "test-workflow",
    });

    const workflow = engine.getWorkflow("test-workflow");
    expect(workflow?.connections.length).toBe(2);
  });
});

// ============================================
// EVENT CONVERTER TESTS
// ============================================

describe("fsmEventToWorkflowMessage", () => {
  test("should convert START event", () => {
    const event = { type: "START" as const, payload: { goal: "Test" } };
    const context = createMockFSMContext();

    const message = fsmEventToWorkflowMessage(event, context);

    expect(message.type).toBe("fsm.start");
    expect(message.payload).toBeDefined();
  });

  test("should convert TURN_COMPLETE event", () => {
    const event = {
      type: "TURN_COMPLETE" as const,
      payload: { turnNumber: 1, tokensUsed: 100, cost: 0.01, stopReason: "continue" },
    };
    const context = createMockFSMContext();
    context.turnNumber = 1;
    context.totalCost = 0.01;

    const message = fsmEventToWorkflowMessage(event, context);

    expect(message.type).toBe("fsm.turn_complete");
    expect((message.payload as { context: { turnNumber: number } }).context.turnNumber).toBe(1);
  });
});

describe("workflowMessageToFSMEvent", () => {
  test("should convert START message", () => {
    const message = createMessage("fsm.start", { goal: "Test" }, "test");
    const event = workflowMessageToFSMEvent(message);

    expect(event).toBeDefined();
    expect(event?.type).toBe("START");
  });

  test("should convert PAUSE message", () => {
    const message = createMessage("fsm.pause", {}, "test");
    const event = workflowMessageToFSMEvent(message);

    expect(event).toBeDefined();
    expect(event?.type).toBe("PAUSE");
  });

  test("should return null for non-FSM messages", () => {
    const message = createMessage("query", { text: "Hello" }, "test");
    const event = workflowMessageToFSMEvent(message);

    expect(event).toBeNull();
  });
});

// ============================================
// UTILITY FUNCTION TESTS
// ============================================

describe("isFSMWorkflowMessage", () => {
  test("should return true for FSM messages", () => {
    const message = createMessage("fsm.state_change", {}, "test");
    expect(isFSMWorkflowMessage(message)).toBe(true);
  });

  test("should return false for non-FSM messages", () => {
    const message = createMessage("query", {}, "test");
    expect(isFSMWorkflowMessage(message)).toBe(false);
  });
});

describe("createCombinedContext", () => {
  test("should create combined context", () => {
    const integrated = createIntegratedLoopState(createTestFSMOptions());
    const { engine, workflowId } = createAgentWorkflow(integrated, {
      workflowId: "test-workflow",
    });

    const combined = createCombinedContext(integrated, engine, workflowId);

    expect(combined.fsm).toBe(integrated);
    expect(combined.workflow).toBe(engine);
    expect(combined.workflowId).toBe(workflowId);
    expect(combined.syncEvents).toEqual([]);
    expect(combined.syncIteration).toBe(0);
  });
});
