/**
 * Tests for FSM Integration with LoopState
 */

import { describe, test, expect, beforeEach } from "bun:test";
import {
  FSMIntegratedLoopState,
  createIntegratedLoopState,
  type FSMIntegrationOptions,
  type FSMIntegrationEvent,
} from "../fsm-integration.js";
import { LoopState } from "../loop-state.js";
import { DEFAULT_LOOP_BEHAVIOR } from "../../../ecosystem/presets/types.js";

// ============================================
// HELPERS
// ============================================

const createTestOptions = (
  overrides: Partial<FSMIntegrationOptions> = {}
): FSMIntegrationOptions => ({
  initialMessages: [{ role: "user", content: [{ type: "text", text: "Hello" }] }],
  enableFSMLogging: false,
  ...overrides,
});

// ============================================
// BASIC FSM INTEGRATION TESTS
// ============================================

describe("FSMIntegratedLoopState - Basic", () => {
  test("should start in idle state", () => {
    const integrated = createIntegratedLoopState(createTestOptions());
    expect(integrated.fsmState).toBe("idle");
    expect(integrated.isComplete).toBe(false);
  });

  test("should transition to processing on start()", () => {
    const integrated = createIntegratedLoopState(createTestOptions());
    const result = integrated.start("Test goal");

    expect(result).toBe(true);
    expect(integrated.fsmState).toBe("processing");
  });

  test("should track messages from LoopState", () => {
    const integrated = createIntegratedLoopState(createTestOptions());
    expect(integrated.messages.length).toBe(1);
    expect(integrated.messages[0].role).toBe("user");
  });
});

// ============================================
// FSM EVENT TRACKING TESTS
// ============================================

describe("FSMIntegratedLoopState - Event Tracking", () => {
  test("should record FSM events", () => {
    const events: FSMIntegrationEvent[] = [];
    const integrated = createIntegratedLoopState(
      createTestOptions({
        onFSMEvent: (e) => events.push(e),
      })
    );

    integrated.start("Test goal");

    expect(events.length).toBe(1);
    expect(events[0].fromState).toBe("idle");
    expect(events[0].toState).toBe("processing");
    expect(events[0].event.type).toBe("START");
  });

  test("should track multiple events", () => {
    const integrated = createIntegratedLoopState(createTestOptions());

    integrated.start("Test goal");
    integrated.beginStreaming();
    integrated.endStreaming();

    const events = integrated.getFSMEvents();
    expect(events.length).toBe(3);
    expect(events[0].event.type).toBe("START");
    expect(events[1].event.type).toBe("STREAM_START");
    expect(events[2].event.type).toBe("STREAM_END");
  });

  test("should clear events", () => {
    const integrated = createIntegratedLoopState(createTestOptions());
    integrated.start("Test goal");
    expect(integrated.getFSMEvents().length).toBe(1);

    integrated.clearFSMEvents();
    expect(integrated.getFSMEvents().length).toBe(0);
  });
});

// ============================================
// TURN FLOW TESTS
// ============================================

describe("FSMIntegratedLoopState - Turn Flow", () => {
  test("should complete turn and continue", () => {
    const integrated = createIntegratedLoopState(
      createTestOptions({
        loopBehaviorOverrides: {
          ...DEFAULT_LOOP_BEHAVIOR,
          maxTurns: 5,
        },
      })
    );

    integrated.start("Test goal");

    // Add assistant message
    integrated.addAssistantMessage([{ type: "text", text: "Response" }]);

    // Complete the turn
    const result = integrated.completeTurn({
      turnNumber: 1,
      tokensUsed: 100,
      cost: 0.01,
      stopReason: "continue",
    });

    expect(result.transitioned).toBe(true);
    expect(result.isComplete).toBe(false);
    expect(integrated.fsmState).toBe("processing");
  });

  test("should stop on max turns reached", () => {
    const integrated = createIntegratedLoopState(
      createTestOptions({
        loopBehaviorOverrides: {
          ...DEFAULT_LOOP_BEHAVIOR,
          maxTurns: 1,
        },
      })
    );

    integrated.start("Test goal");
    integrated.addAssistantMessage([{ type: "text", text: "Response" }]);

    // Turn 1 should complete but trigger limit
    const result = integrated.completeTurn({
      turnNumber: 1,
      tokensUsed: 100,
      cost: 0.01,
      stopReason: "continue",
    });

    // The FSM should transition to completed
    expect(integrated.fsmState).toBe("completed");
    expect(integrated.isComplete).toBe(true);
  });

  test("should track cost from LoopState", () => {
    const integrated = createIntegratedLoopState(createTestOptions());

    integrated.start("Test goal");

    // Add turn result
    integrated.addTurnResult({
      message: {
        content: [{ type: "text", text: "Response" }],
        stop_reason: "end_turn",
        id: "msg_1",
      },
      usage: { input_tokens: 100, output_tokens: 50 },
      costUSD: 0.05,
      durationMs: 1000,
      model: "test-model",
      messageCount: 2,
    });

    expect(integrated.totalCost).toBe(0.05);
  });
});

// ============================================
// TOOL EXECUTION TESTS
// ============================================

describe("FSMIntegratedLoopState - Tool Execution", () => {
  test("should transition to tool_execution on TOOL_NEEDED", () => {
    const integrated = createIntegratedLoopState(createTestOptions());
    integrated.start("Test goal");

    const result = integrated.requestTool("tool_1", "Read", { path: "/test" });

    expect(result).toBe(true);
    expect(integrated.fsmState).toBe("tool_execution");
  });

  test("should return to processing after tool result", () => {
    const integrated = createIntegratedLoopState(createTestOptions());
    integrated.start("Test goal");
    integrated.requestTool("tool_1", "Read", { path: "/test" });

    const result = integrated.reportToolResult("tool_1", "file contents", true);

    expect(result).toBe(true);
    expect(integrated.fsmState).toBe("processing");
  });

  test("should handle permission flow", () => {
    const integrated = createIntegratedLoopState(createTestOptions());
    integrated.start("Test goal");
    integrated.requestTool("tool_1", "Bash", { command: "rm -rf /" });

    // Request permission
    integrated.requestPermission("tool_1", "Bash");
    expect(integrated.fsmState).toBe("waiting_permission");

    // Grant permission
    integrated.grantPermission("tool_1");
    expect(integrated.fsmState).toBe("tool_execution");
  });
});

// ============================================
// STREAMING TESTS
// ============================================

describe("FSMIntegratedLoopState - Streaming", () => {
  test("should transition through streaming states", () => {
    const integrated = createIntegratedLoopState(createTestOptions());
    integrated.start("Test goal");

    integrated.beginStreaming();
    expect(integrated.fsmState).toBe("streaming");

    integrated.endStreaming();
    expect(integrated.fsmState).toBe("processing");
  });
});

// ============================================
// COMPACTION TESTS
// ============================================

describe("FSMIntegratedLoopState - Compaction", () => {
  test("should transition through compaction states", () => {
    const integrated = createIntegratedLoopState(createTestOptions());
    integrated.start("Test goal");

    integrated.beginCompaction();
    expect(integrated.fsmState).toBe("compaction");

    integrated.endCompaction(5000);
    expect(integrated.fsmState).toBe("processing");
  });
});

// ============================================
// PAUSE/RESUME TESTS
// ============================================

describe("FSMIntegratedLoopState - Pause/Resume", () => {
  test("should pause and resume", () => {
    const integrated = createIntegratedLoopState(createTestOptions());
    integrated.start("Test goal");

    integrated.pause();
    expect(integrated.fsmState).toBe("paused");

    integrated.resume();
    expect(integrated.fsmState).toBe("processing");
  });

  test("should stop from paused state", () => {
    const integrated = createIntegratedLoopState(createTestOptions());
    integrated.start("Test goal");
    integrated.pause();

    integrated.stop("User requested");

    expect(integrated.fsmState).toBe("completed");
    expect(integrated.isComplete).toBe(true);
  });
});

// ============================================
// ERROR HANDLING TESTS
// ============================================

describe("FSMIntegratedLoopState - Error Handling", () => {
  test("should handle recoverable error", () => {
    const integrated = createIntegratedLoopState(
      createTestOptions({
        loopBehaviorOverrides: {
          ...DEFAULT_LOOP_BEHAVIOR,
          errorHandling: { maxRetries: 3 },
        },
      })
    );
    integrated.start("Test goal");

    integrated.reportError(new Error("Network timeout"), true);

    expect(integrated.fsmState).toBe("processing");
    expect(integrated.isComplete).toBe(false);
  });

  test("should fail on non-recoverable error", () => {
    const integrated = createIntegratedLoopState(createTestOptions());
    integrated.start("Test goal");

    integrated.reportError(new Error("Fatal error"), false);

    expect(integrated.fsmState).toBe("error");
    expect(integrated.isComplete).toBe(true);
  });
});

// ============================================
// CANCEL TESTS
// ============================================

describe("FSMIntegratedLoopState - Cancel", () => {
  test("should cancel from processing", () => {
    const integrated = createIntegratedLoopState(createTestOptions());
    integrated.start("Test goal");

    integrated.cancel("User cancelled");

    expect(integrated.fsmState).toBe("cancelled");
    expect(integrated.isComplete).toBe(true);
  });
});

// ============================================
// COMBINED STATE TESTS
// ============================================

describe("FSMIntegratedLoopState - Combined State", () => {
  test("should provide combined state for debugging", () => {
    const integrated = createIntegratedLoopState(createTestOptions());
    integrated.start("Test goal");

    const combined = integrated.combinedState;

    expect(combined.fsm.current).toBe("processing");
    expect(combined.fsm.done).toBe(false);
    expect(combined.loop.messageCount).toBe(1);
    expect(combined.loop.turnNumber).toBe(0);
  });

  test("should provide stats summary", () => {
    const integrated = createIntegratedLoopState(createTestOptions());
    integrated.start("Test goal");

    const stats = integrated.getStats();

    expect(stats.loop).toBeDefined();
    expect(stats.fsm).toBeDefined();
    expect(stats.eventCount).toBeGreaterThan(0);
  });
});

// ============================================
// SERIALIZATION TESTS
// ============================================

describe("FSMIntegratedLoopState - Serialization", () => {
  test("should serialize with FSM state", () => {
    const integrated = createIntegratedLoopState(createTestOptions());
    integrated.start("Test goal");

    const serialized = integrated.serializeWithFSM("test-session");

    expect(serialized.loopState).toBeDefined();
    expect(serialized.fsmState.current).toBe("processing");
    expect(serialized.fsmState.events.length).toBeGreaterThan(0);
  });

  test("should delegate toResult to LoopState", () => {
    const integrated = createIntegratedLoopState(createTestOptions());
    integrated.start("Test goal");

    const result = integrated.toResult();

    expect(result.messages).toBeDefined();
    expect(result.totalCost).toBe(0);
  });
});

// ============================================
// SHOULD CONTINUE TESTS
// ============================================

describe("FSMIntegratedLoopState - shouldContinue", () => {
  test("should continue when in processing state", () => {
    const integrated = createIntegratedLoopState(
      createTestOptions({
        loopBehaviorOverrides: {
          ...DEFAULT_LOOP_BEHAVIOR,
          maxTurns: 100,
        },
      })
    );
    integrated.start("Test goal");

    expect(integrated.shouldContinue).toBe(true);
  });

  test("should not continue when FSM is done", () => {
    const integrated = createIntegratedLoopState(createTestOptions());
    integrated.start("Test goal");
    integrated.stop("Done");

    expect(integrated.shouldContinue).toBe(false);
  });

  test("should not continue when cost threshold exceeded", () => {
    const integrated = createIntegratedLoopState(
      createTestOptions({
        loopBehaviorOverrides: {
          ...DEFAULT_LOOP_BEHAVIOR,
          costThresholds: {
            enabled: true,
            warnAt: 0.05,
            stopAt: 0.10,
          },
        },
      })
    );
    integrated.start("Test goal");

    // Add cost that exceeds threshold
    integrated.addTurnResult({
      message: {
        content: [{ type: "text", text: "Response" }],
        stop_reason: "end_turn",
        id: "msg_1",
      },
      usage: { input_tokens: 100, output_tokens: 50 },
      costUSD: 0.15,
      durationMs: 1000,
      model: "test-model",
      messageCount: 2,
    });

    expect(integrated.shouldContinue).toBe(false);
  });
});
