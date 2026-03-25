/**
 * Tests for Agent Loop FSM
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { FSM } from "../../fsm/index.js";
import {
  createAgentLoopFSM,
  createAgentLoopFSMConfig,
  shouldContinueLoop,
  getStopReason,
  getLoopStats,
  DEFAULT_LOOP_CONTEXT,
  type AgentLoopContext,
  type AgentLoopState,
} from "../loop-fsm.js";

// ============================================
// HELPERS
// ============================================

const createTestContext = (
  overrides: Partial<AgentLoopContext> = {}
): Partial<AgentLoopContext> => ({
  ...DEFAULT_LOOP_CONTEXT,
  sessionId: "test-session",
  startTime: Date.now(),
  ...overrides,
});

// ============================================
// BASIC FSM TESTS
// ============================================

describe("Agent Loop FSM - Basic", () => {
  test("should start in idle state", () => {
    const fsm = createAgentLoopFSM(createTestContext());
    expect(fsm.current).toBe("idle");
    expect(fsm.done).toBe(false);
  });

  test("should transition to processing on START", () => {
    const fsm = createAgentLoopFSM(createTestContext());
    const result = fsm.send({ type: "START", payload: { goal: "Test goal" } });

    expect(result.transitioned).toBe(true);
    expect(fsm.current).toBe("processing");
    expect(fsm.context.goal).toBe("Test goal");
  });

  test("should increment turn on start", () => {
    const fsm = createAgentLoopFSM(createTestContext());
    fsm.send({ type: "START" });

    expect(fsm.context.turnNumber).toBe(1);
  });
});

// ============================================
// TURN FLOW TESTS
// ============================================

describe("Agent Loop FSM - Turn Flow", () => {
  test("should complete turn and continue", () => {
    const fsm = createAgentLoopFSM(createTestContext({ maxTurns: 5 }));
    fsm.send({ type: "START" });

    const result = fsm.send({
      type: "TURN_COMPLETE",
      payload: {
        turnNumber: 1,
        tokensUsed: 100,
        cost: 0.01,
        stopReason: "continue",
      },
    });

    expect(result.transitioned).toBe(true);
    expect(fsm.current).toBe("processing");
    expect(fsm.context.turnNumber).toBe(2);
    expect(fsm.context.totalCost).toBe(0.01);
  });

  test("should stop on max turns reached", () => {
    const fsm = createAgentLoopFSM(createTestContext({ maxTurns: 2 }));
    fsm.send({ type: "START" });

    // First turn
    fsm.send({
      type: "TURN_COMPLETE",
      payload: {
        turnNumber: 1,
        tokensUsed: 100,
        cost: 0.01,
        stopReason: "continue",
      },
    });

    expect(fsm.current).toBe("processing");

    // Second turn - should stop because turnNumber (2) >= maxTurns (2)
    fsm.send({
      type: "TURN_COMPLETE",
      payload: {
        turnNumber: 2,
        tokensUsed: 100,
        cost: 0.01,
        stopReason: "continue",
      },
    });

    expect(fsm.current).toBe("completed");
    expect(fsm.done).toBe(true);
  });

  test("should stop on end_turn stop reason", () => {
    const fsm = createAgentLoopFSM(createTestContext({ maxTurns: 100 }));
    fsm.send({ type: "START" });

    const result = fsm.send({
      type: "TURN_COMPLETE",
      payload: {
        turnNumber: 1,
        tokensUsed: 100,
        cost: 0.01,
        stopReason: "end_turn",
      },
    });

    expect(fsm.current).toBe("completed");
    expect(fsm.done).toBe(true);
  });

  test("should track cumulative cost", () => {
    const fsm = createAgentLoopFSM(createTestContext({ maxTurns: 10 }));
    fsm.send({ type: "START" });

    for (let i = 1; i <= 3; i++) {
      fsm.send({
        type: "TURN_COMPLETE",
        payload: {
          turnNumber: i,
          tokensUsed: 100 * i,
          cost: 0.05,
          stopReason: "continue",
        },
      });
    }

    expect(fsm.context.totalCost).toBeCloseTo(0.15, 4);
    expect(fsm.context.estimatedTokens).toBe(600); // 100 + 200 + 300
  });
});

// ============================================
// COST THRESHOLD TESTS
// ============================================

describe("Agent Loop FSM - Cost Threshold", () => {
  test("should stop when cost threshold reached", () => {
    const fsm = createAgentLoopFSM(createTestContext({ maxTurns: 100, maxCost: 0.1 }));
    fsm.send({ type: "START" });

    // First turn under threshold
    fsm.send({
      type: "TURN_COMPLETE",
      payload: {
        turnNumber: 1,
        tokensUsed: 100,
        cost: 0.05,
        stopReason: "continue",
      },
    });

    expect(fsm.current).toBe("processing");

    // Second turn reaches threshold - should stop
    fsm.send({
      type: "TURN_COMPLETE",
      payload: {
        turnNumber: 2,
        tokensUsed: 100,
        cost: 0.06,
        stopReason: "continue",
      },
    });

    // totalCost (0.11) >= maxCost (0.1), should complete
    expect(fsm.current).toBe("completed");
  });
});

// ============================================
// TOOL EXECUTION TESTS
// ============================================

describe("Agent Loop FSM - Tool Execution", () => {
  test("should transition to tool_execution on TOOL_NEEDED", () => {
    const fsm = createAgentLoopFSM(createTestContext());
    fsm.send({ type: "START" });

    const result = fsm.send({
      type: "TOOL_NEEDED",
      payload: {
        toolId: "tool_1",
        toolName: "Read",
        input: { path: "/test" },
      },
    });

    expect(result.transitioned).toBe(true);
    expect(fsm.current).toBe("tool_execution");
    expect(fsm.context.pendingTools.length).toBe(1);
    expect(fsm.context.pendingTools[0].name).toBe("Read");
  });

  test("should return to processing after tool result", () => {
    const fsm = createAgentLoopFSM(createTestContext());
    fsm.send({ type: "START" });
    fsm.send({
      type: "TOOL_NEEDED",
      payload: {
        toolId: "tool_1",
        toolName: "Read",
        input: { path: "/test" },
      },
    });

    const result = fsm.send({
      type: "TOOL_RESULT",
      payload: {
        toolId: "tool_1",
        result: "file contents",
        success: true,
      },
    });

    expect(result.transitioned).toBe(true);
    expect(fsm.current).toBe("processing");
    expect(fsm.context.pendingTools.length).toBe(0);
    expect(fsm.context.toolsUsed.length).toBe(1);
  });

  test("should handle multiple pending tools", () => {
    const fsm = createAgentLoopFSM(createTestContext());
    fsm.send({ type: "START" });

    // Add two tools
    fsm.send({
      type: "TOOL_NEEDED",
      payload: { toolId: "t1", toolName: "Read", input: {} },
    });
    fsm.send({
      type: "TOOL_NEEDED",
      payload: { toolId: "t2", toolName: "Write", input: {} },
    });

    expect(fsm.context.pendingTools.length).toBe(2);
    expect(fsm.current).toBe("tool_execution");

    // Resolve first tool
    fsm.send({
      type: "TOOL_RESULT",
      payload: { toolId: "t1", result: "ok", success: true },
    });

    expect(fsm.current).toBe("tool_execution"); // Still has pending tools
    expect(fsm.context.pendingTools.length).toBe(1);

    // Resolve second tool
    fsm.send({
      type: "TOOL_RESULT",
      payload: { toolId: "t2", result: "ok", success: true },
    });

    expect(fsm.current).toBe("processing"); // All tools resolved
    expect(fsm.context.pendingTools.length).toBe(0);
  });
});

// ============================================
// PERMISSION FLOW TESTS
// ============================================

describe("Agent Loop FSM - Permission Flow", () => {
  test("should wait for permission", () => {
    const fsm = createAgentLoopFSM(createTestContext());
    fsm.send({ type: "START" });
    fsm.send({
      type: "TOOL_NEEDED",
      payload: { toolId: "t1", toolName: "Bash", input: {} },
    });

    const result = fsm.send({
      type: "PERMISSION_REQUEST",
      payload: { toolId: "t1", toolName: "Bash" },
    });

    expect(result.transitioned).toBe(true);
    expect(fsm.current).toBe("waiting_permission");
  });

  test("should continue on permission granted", () => {
    const fsm = createAgentLoopFSM(createTestContext());
    fsm.send({ type: "START" });
    fsm.send({
      type: "TOOL_NEEDED",
      payload: { toolId: "t1", toolName: "Bash", input: {} },
    });
    fsm.send({
      type: "PERMISSION_REQUEST",
      payload: { toolId: "t1", toolName: "Bash" },
    });

    const result = fsm.send({
      type: "PERMISSION_GRANTED",
      payload: { toolId: "t1" },
    });

    expect(result.transitioned).toBe(true);
    expect(fsm.current).toBe("tool_execution");
  });

  test("should return to processing on permission denied", () => {
    const fsm = createAgentLoopFSM(createTestContext());
    fsm.send({ type: "START" });
    fsm.send({
      type: "TOOL_NEEDED",
      payload: { toolId: "t1", toolName: "Bash", input: {} },
    });
    fsm.send({
      type: "PERMISSION_REQUEST",
      payload: { toolId: "t1", toolName: "Bash" },
    });

    const result = fsm.send({
      type: "PERMISSION_DENIED",
      payload: { toolId: "t1", reason: "User denied" },
    });

    expect(result.transitioned).toBe(true);
    expect(fsm.current).toBe("processing");
  });
});

// ============================================
// STREAMING TESTS
// ============================================

describe("Agent Loop FSM - Streaming", () => {
  test("should transition to streaming state", () => {
    const fsm = createAgentLoopFSM(createTestContext());
    fsm.send({ type: "START" });

    const result = fsm.send({ type: "STREAM_START" });

    expect(result.transitioned).toBe(true);
    expect(fsm.current).toBe("streaming");
  });

  test("should handle stream chunks", () => {
    const fsm = createAgentLoopFSM(createTestContext());
    fsm.send({ type: "START" });
    fsm.send({ type: "STREAM_START" });

    // Multiple chunks should stay in streaming state
    fsm.send({ type: "STREAM_CHUNK", payload: { text: "Hello" } });
    expect(fsm.current).toBe("streaming");

    fsm.send({ type: "STREAM_CHUNK", payload: { text: " world" } });
    expect(fsm.current).toBe("streaming");

    // Stream end should return to processing
    fsm.send({ type: "STREAM_END" });
    expect(fsm.current).toBe("processing");
  });
});

// ============================================
// COMPACTION TESTS
// ============================================

describe("Agent Loop FSM - Compaction", () => {
  test("should transition to compaction state", () => {
    const fsm = createAgentLoopFSM(createTestContext());
    fsm.send({ type: "START" });

    const result = fsm.send({ type: "COMPACT_START" });

    expect(result.transitioned).toBe(true);
    expect(fsm.current).toBe("compaction");
  });

  test("should record compaction stats", () => {
    const fsm = createAgentLoopFSM(createTestContext({ estimatedTokens: 10000 }));
    fsm.send({ type: "START" });
    fsm.send({ type: "COMPACT_START" });

    const result = fsm.send({
      type: "COMPACT_END",
      payload: { tokensSaved: 5000 },
    });

    expect(result.transitioned).toBe(true);
    expect(fsm.current).toBe("processing");
    expect(fsm.context.compactionCount).toBe(1);
    expect(fsm.context.tokensCompacted).toBe(5000);
    expect(fsm.context.estimatedTokens).toBe(5000);
  });
});

// ============================================
// PAUSE/RESUME TESTS
// ============================================

describe("Agent Loop FSM - Pause/Resume", () => {
  test("should pause and resume", () => {
    const fsm = createAgentLoopFSM(createTestContext());
    fsm.send({ type: "START" });

    const pauseResult = fsm.send({ type: "PAUSE" });
    expect(pauseResult.transitioned).toBe(true);
    expect(fsm.current).toBe("paused");

    const resumeResult = fsm.send({ type: "RESUME" });
    expect(resumeResult.transitioned).toBe(true);
    expect(fsm.current).toBe("processing");
  });

  test("should stop from paused state", () => {
    const fsm = createAgentLoopFSM(createTestContext());
    fsm.send({ type: "START" });
    fsm.send({ type: "PAUSE" });

    fsm.send({ type: "STOP", payload: { reason: "User requested" } });

    expect(fsm.current).toBe("completed");
    expect(fsm.done).toBe(true);
    expect(fsm.context.isInterrupted).toBe(true);
  });
});

// ============================================
// ERROR HANDLING TESTS
// ============================================

describe("Agent Loop FSM - Error Handling", () => {
  test("should handle recoverable error", () => {
    const fsm = createAgentLoopFSM(createTestContext({ maxErrors: 3 }));
    fsm.send({ type: "START" });

    const result = fsm.send({
      type: "ERROR",
      payload: {
        error: new Error("Network timeout"),
        recoverable: true,
      },
    });

    expect(result.transitioned).toBe(true);
    expect(fsm.current).toBe("processing");
    expect(fsm.context.errorCount).toBe(1);
  });

  test("should fail on non-recoverable error", () => {
    const fsm = createAgentLoopFSM(createTestContext());
    fsm.send({ type: "START" });

    fsm.send({
      type: "ERROR",
      payload: {
        error: new Error("Fatal error"),
        recoverable: false,
      },
    });

    expect(fsm.current).toBe("error");
    expect(fsm.done).toBe(true);
    expect(fsm.context.lastError?.message).toBe("Fatal error");
  });

  test("should fail on max errors reached", () => {
    const fsm = createAgentLoopFSM(createTestContext({ maxErrors: 2 }));
    fsm.send({ type: "START" });

    // First error - recoverable
    fsm.send({
      type: "ERROR",
      payload: { error: new Error("Error 1"), recoverable: true },
    });
    expect(fsm.current).toBe("processing");

    // Second error - still recoverable
    fsm.send({
      type: "ERROR",
      payload: { error: new Error("Error 2"), recoverable: true },
    });
    expect(fsm.current).toBe("processing");

    // Third error - max reached
    fsm.send({
      type: "ERROR",
      payload: { error: new Error("Error 3"), recoverable: true },
    });
    expect(fsm.current).toBe("error");
    expect(fsm.done).toBe(true);
  });
});

// ============================================
// CANCEL TESTS
// ============================================

describe("Agent Loop FSM - Cancel", () => {
  test("should cancel from processing", () => {
    const fsm = createAgentLoopFSM(createTestContext());
    fsm.send({ type: "START" });

    fsm.send({ type: "CANCEL", payload: { reason: "User cancelled" } });

    expect(fsm.current).toBe("cancelled");
    expect(fsm.done).toBe(true);
  });

  test("should cancel from tool_execution", () => {
    const fsm = createAgentLoopFSM(createTestContext());
    fsm.send({ type: "START" });
    fsm.send({
      type: "TOOL_NEEDED",
      payload: { toolId: "t1", toolName: "Read", input: {} },
    });

    fsm.send({ type: "CANCEL" });

    expect(fsm.current).toBe("cancelled");
  });
});

// ============================================
// HELPER FUNCTION TESTS
// ============================================

describe("Helper Functions", () => {
  test("shouldContinueLoop should check limits", () => {
    const context1 = { ...DEFAULT_LOOP_CONTEXT, turnNumber: 5, maxTurns: 10, totalCost: 0.5, maxCost: 1.0, errorCount: 0, maxErrors: 3 };
    expect(shouldContinueLoop(context1)).toBe(true);

    const context2 = { ...DEFAULT_LOOP_CONTEXT, turnNumber: 10, maxTurns: 10, totalCost: 0.5, maxCost: 1.0, errorCount: 0, maxErrors: 3 };
    expect(shouldContinueLoop(context2)).toBe(false);

    const context3 = { ...DEFAULT_LOOP_CONTEXT, turnNumber: 5, maxTurns: 10, totalCost: 1.5, maxCost: 1.0, errorCount: 0, maxErrors: 3 };
    expect(shouldContinueLoop(context3)).toBe(false);

    const context4 = { ...DEFAULT_LOOP_CONTEXT, turnNumber: 5, maxTurns: 10, totalCost: 0.5, maxCost: 1.0, errorCount: 3, maxErrors: 3 };
    expect(shouldContinueLoop(context4)).toBe(false);
  });

  test("getStopReason should return appropriate reason", () => {
    const context1 = { ...DEFAULT_LOOP_CONTEXT, turnNumber: 10, maxTurns: 10, totalCost: 0.5, maxCost: 1.0, errorCount: 0, maxErrors: 3 };
    expect(getStopReason(context1)).toBe("max_turns_reached");

    const context2 = { ...DEFAULT_LOOP_CONTEXT, turnNumber: 5, maxTurns: 10, totalCost: 1.5, maxCost: 1.0, errorCount: 0, maxErrors: 3 };
    expect(getStopReason(context2)).toBe("cost_threshold_reached");

    const context3 = { ...DEFAULT_LOOP_CONTEXT, turnNumber: 5, maxTurns: 10, totalCost: 0.5, maxCost: 1.0, errorCount: 3, maxErrors: 3 };
    expect(getStopReason(context3)).toBe("error_limit_reached");

    const context4 = { ...DEFAULT_LOOP_CONTEXT, turnNumber: 5, maxTurns: 10, totalCost: 0.5, maxCost: 1.0, errorCount: 1, maxErrors: 3 };
    expect(getStopReason(context4)).toBe(null);
  });

  test("getLoopStats should return summary", () => {
    const context: AgentLoopContext = {
      ...DEFAULT_LOOP_CONTEXT,
      sessionId: "test-123",
      startTime: Date.now() - 60000,
      turnNumber: 10,
      maxTurns: 100,
      totalCost: 0.25,
      maxCost: 1.0,
      estimatedTokens: 5000,
      contextWindow: 200000,
      errorCount: 1,
      toolsUsed: [{ name: "Read", timestamp: Date.now() }],
      compactionCount: 2,
      tokensCompacted: 1000,
    };

    const stats = getLoopStats(context);

    expect(stats.sessionId).toBe("test-123");
    expect(stats.turns).toBe(10);
    expect(stats.cost).toBe(0.25);
    expect(stats.tokens).toBe(5000);
    expect(stats.errors).toBe(1);
    expect(stats.toolsUsed).toBe(1);
    expect(stats.compactions).toBe(2);
    expect(stats.tokensCompacted).toBe(1000);
    expect(stats.duration).toBeGreaterThanOrEqual(60000);
  });
});

// ============================================
// SERIALIZATION TESTS
// ============================================

describe("Agent Loop FSM - Serialization", () => {
  test("should serialize and deserialize state", () => {
    const fsm = createAgentLoopFSM(createTestContext());
    fsm.send({ type: "START" });
    fsm.send({
      type: "TURN_COMPLETE",
      payload: {
        turnNumber: 1,
        tokensUsed: 100,
        cost: 0.01,
        stopReason: "continue",
      },
    });

    const serialized = fsm.serialize();

    const config = createAgentLoopFSMConfig(createTestContext());
    const restored = FSM.deserialize(config, serialized);

    expect(restored.current).toBe("processing");
    expect(restored.context.turnNumber).toBe(2);
    expect(restored.context.totalCost).toBe(0.01);
  });
});
