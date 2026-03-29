/**
 * Tests for Telemetry Collector
 */

import { describe, test, expect } from "bun:test";
import { TelemetryCollector, buildSuiteTelemetry } from "./collector.js";
import type { EvalResult, EvalTrace } from "../types.js";

describe("TelemetryCollector", () => {
  test("should initialize correctly", () => {
    const collector = new TelemetryCollector("session-1", "task-1", "glm-5");
    expect(collector).toBeDefined();
  });

  test("should start collection", () => {
    const collector = new TelemetryCollector("session-1", "task-1", "glm-5");
    collector.startCollection();
    // Should not throw
    expect(true).toBe(true);
  });

  test("should record turn metrics", () => {
    const collector = new TelemetryCollector("session-1", "task-1", "glm-5");
    collector.startCollection();
    collector.startTurn(0);
    collector.recordTurn(0, {
      durationMs: 1000,
      ttftMs: 200,
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    // Should not throw
    expect(true).toBe(true);
  });

  test("should record tool calls", () => {
    const collector = new TelemetryCollector("session-1", "task-1", "glm-5");
    collector.startCollection();
    collector.recordToolCall("Read", "call-1", 0, { file_path: "/test.txt" }, "content", 50, true);

    // Should not throw
    expect(true).toBe(true);
  });

  test("should record errors", () => {
    const collector = new TelemetryCollector("session-1", "task-1", "glm-5");
    collector.startCollection();
    collector.recordError(new Error("Test error"), 0, "Read", false, undefined, 0);

    // Should not throw
    expect(true).toBe(true);
  });

  test("should record state transitions", () => {
    const collector = new TelemetryCollector("session-1", "task-1", "glm-5");
    collector.startCollection();
    collector.recordStateTransition("idle", "processing", "start", 0);
    collector.recordStateTransition("processing", "responding", "complete", 1);

    // Should not throw
    expect(true).toBe(true);
  });

  test("should build session telemetry", () => {
    const collector = new TelemetryCollector("session-1", "task-1", "glm-5");
    collector.startCollection();
    collector.startTurn(0);
    collector.recordTurn(0, {
      durationMs: 1000,
      ttftMs: 200,
      usage: { input_tokens: 100, output_tokens: 50 },
    });
    collector.recordToolCall("Read", "call-1", 0, { file_path: "/test.txt" }, "content", 50, true);

    const mockResult: EvalResult = {
      taskId: "task-1",
      passed: true,
      score: 1.0,
      criteriaResults: [],
      reason: "All criteria passed",
      metrics: {
        turns: 1,
        tokens: { input: 100, output: 50 },
        costUSD: 0.001,
        durationMs: 1000,
        ttftMs: 200,
        toolCallCount: 1,
        errorCount: 0,
        compactionCount: 0,
      },
      timestamp: Date.now(),
      model: "glm-5",
    };

    const telemetry = collector.buildSessionTelemetry(mockResult);

    expect(telemetry.sessionId).toBe("session-1");
    expect(telemetry.taskId).toBe("task-1");
    expect(telemetry.model).toBe("glm-5");
    expect(telemetry.passed).toBe(true);
    expect(telemetry.score).toBe(1.0);
    expect(telemetry.turns).toBe(1);
    expect(telemetry.turnTimings.length).toBe(1);
    expect(telemetry.toolInvocations.length).toBe(1);
  });
});

describe("buildSuiteTelemetry", () => {
  test("should build suite telemetry from results", () => {
    const results: EvalResult[] = [
      {
        taskId: "task-1",
        passed: true,
        score: 1.0,
        criteriaResults: [],
        reason: "Passed",
        metrics: {
          turns: 1,
          tokens: { input: 100, output: 50 },
          costUSD: 0.001,
          durationMs: 1000,
          ttftMs: 200,
          toolCallCount: 2,
          errorCount: 0,
          compactionCount: 0,
        },
        timestamp: Date.now(),
        model: "glm-5",
      },
      {
        taskId: "task-2",
        passed: false,
        score: 0.5,
        criteriaResults: [],
        reason: "Failed",
        metrics: {
          turns: 2,
          tokens: { input: 200, output: 100 },
          costUSD: 0.002,
          durationMs: 2000,
          ttftMs: 300,
          toolCallCount: 4,
          errorCount: 1,
          compactionCount: 0,
        },
        timestamp: Date.now(),
        model: "glm-5",
      },
    ];

    const telemetry = buildSuiteTelemetry("suite-1", "Test Suite", results, "glm-5");

    expect(telemetry.suiteId).toBe("suite-1");
    expect(telemetry.suiteName).toBe("Test Suite");
    expect(telemetry.model).toBe("glm-5");
    expect(telemetry.totalTasks).toBe(2);
    expect(telemetry.passedTasks).toBe(1);
    expect(telemetry.passRate).toBe(0.5);
    expect(telemetry.avgScore).toBe(0.75);
    expect(telemetry.taskSummaries.length).toBe(2);
  });

  test("should handle empty results", () => {
    const telemetry = buildSuiteTelemetry("suite-1", "Empty Suite", [], "glm-5");

    expect(telemetry.totalTasks).toBe(0);
    expect(telemetry.passedTasks).toBe(0);
    expect(telemetry.passRate).toBe(0);
  });
});
