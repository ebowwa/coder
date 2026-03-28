/**
 * Tests for Offline Evaluation Runner
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "path";
import { mkdir, rm, writeFile } from "fs/promises";
import { homedir } from "os";
import {
  sessionToTrace,
  sessionToAgentLoopResult,
  parseSessionEntries,
  listSessions,
  generateReport,
} from "./offline.js";
import type {
  LoadedSession,
  SessionEntry,
  SessionMetadata,
  SessionMessage,
  SessionToolUse,
  SessionMetrics,
} from "../../schemas/sessions.zod.js";
import type { QueryMetrics } from "../../schemas/api.zod.js";

// Test fixtures
const createTestMetadata = (id: string): SessionMetadata => ({
  type: "metadata",
  id,
  created: Date.now() - 60000,
  updated: Date.now(),
  workingDirectory: "/test/workdir",
  model: "claude-sonnet-4-5-20250929",
  totalCost: 0.05,
});

const createTestMessage = (role: "user" | "assistant", text: string): SessionMessage => ({
  type: "message",
  timestamp: Date.now(),
  data: {
    role,
    content: [{ type: "text", text }],
  },
});

const createTestToolUse = (
  toolId: string,
  toolName: string,
  input: Record<string, unknown>,
  result?: string,
  isError?: boolean
): SessionToolUse => ({
  type: "tool_use",
  timestamp: Date.now(),
  toolId,
  toolName,
  input,
  result,
  isError,
});

const createTestMetrics = (inputTokens: number, outputTokens: number): SessionMetrics => ({
  type: "metrics",
  timestamp: Date.now(),
  data: {
    usage: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
    },
    costUSD: 0.01,
    durationMs: 1000,
    model: "claude-sonnet-4-5-20250929",
  } as QueryMetrics,
});

describe("Offline Evaluation Runner", () => {
  describe("parseSessionEntries", () => {
    test("should parse metadata, messages, tools, and metrics", () => {
      const entries: SessionEntry[] = [
        createTestMetadata("test-session-1"),
        createTestMessage("user", "Hello"),
        createTestMessage("assistant", "Hi there!"),
        createTestToolUse("tool-1", "Read", { file_path: "/test/file.txt" }, "file contents"),
        createTestMetrics(100, 50),
      ];

      const session = parseSessionEntries(entries);

      expect(session.metadata.id).toBe("test-session-1");
      expect(session.messages.length).toBe(2);
      expect(session.tools.length).toBe(1);
      expect(session.metrics.length).toBe(1);
    });

    test("should throw error when metadata is missing", () => {
      const entries: SessionEntry[] = [
        createTestMessage("user", "Hello"),
      ];

      expect(() => parseSessionEntries(entries)).toThrow("Session missing metadata");
    });
  });

  describe("sessionToTrace", () => {
    test("should convert session to eval trace", () => {
      const entries: SessionEntry[] = [
        createTestMetadata("test-session-2"),
        createTestToolUse("tool-1", "Read", { file_path: "/test/file.txt" }, "file contents"),
        createTestToolUse("tool-2", "Write", { file_path: "/test/new.txt" }, "written"),
        createTestToolUse("tool-3", "Edit", { file_path: "/test/existing.txt" }, "edited"),
        createTestMessage("assistant", "Done!"),
      ];

      const session = parseSessionEntries(entries);
      const trace = sessionToTrace(session);

      expect(trace.toolCalls.length).toBe(3);
      expect(trace.toolCalls[0].name).toBe("Read");
      expect(trace.toolCalls[0].success).toBe(true);
      expect(trace.fileChanges.length).toBe(2); // Write creates, Edit modifies
      expect(trace.stateTransitions.length).toBe(2);
      expect(trace.finalResponse).toBe("Done!");
    });

    test("should track failed tool calls", () => {
      const entries: SessionEntry[] = [
        createTestMetadata("test-session-3"),
        createTestToolUse("tool-1", "Bash", { command: "false" }, "Error: exit code 1", true),
      ];

      const session = parseSessionEntries(entries);
      const trace = sessionToTrace(session);

      expect(trace.toolCalls.length).toBe(1);
      expect(trace.toolCalls[0].success).toBe(false);
    });
  });

  describe("sessionToAgentLoopResult", () => {
    test("should aggregate metrics correctly", () => {
      const entries: SessionEntry[] = [
        createTestMetadata("test-session-4"),
        createTestMetrics(100, 50),
        createTestMetrics(200, 100),
      ];

      const session = parseSessionEntries(entries);
      const trace = sessionToTrace(session);
      const result = sessionToAgentLoopResult(session, trace);

      expect(result.metrics.length).toBe(2);
      expect(result.totalCacheMetrics.cacheReadTokens).toBe(0);
      expect(result.totalCacheMetrics.cacheWriteTokens).toBe(0);
    });
  });

  describe("generateReport", () => {
    test("should generate markdown report", () => {
      const result = {
        suiteId: "test-suite",
        passRate: 0.75,
        avgScore: 0.8,
        taskResults: [
          {
            taskId: "task-1",
            passed: true,
            score: 0.9,
            reason: "All criteria met",
            criteriaResults: [
              { criterionId: "c1", passed: true, reason: "OK", actual: 1, expected: 1, durationMs: 100 },
            ],
            trace: { toolCalls: [], stateTransitions: [], fileChanges: [] },
            metrics: {
              turns: 3,
              tokens: { input: 100, output: 50 },
              costUSD: 0.01,
              durationMs: 5000,
              ttftMs: 200,
              toolCallCount: 5,
              errorCount: 0,
              compactionCount: 0,
            },
            timestamp: Date.now(),
            model: "claude-sonnet-4-5-20250929",
          },
          {
            taskId: "task-2",
            passed: false,
            score: 0.5,
            reason: "Partial success",
            criteriaResults: [],
            trace: { toolCalls: [], stateTransitions: [], fileChanges: [] },
            metrics: {
              turns: 2,
              tokens: { input: 50, output: 25 },
              costUSD: 0.005,
              durationMs: 3000,
              ttftMs: 150,
              toolCallCount: 3,
              errorCount: 1,
              compactionCount: 0,
            },
            timestamp: Date.now(),
            model: "claude-sonnet-4-5-20250929",
          },
        ],
        aggregatedMetrics: {
          totalCost: 0.015,
          totalDuration: 8000,
          totalTokens: { input: 150, output: 75 },
          avgTurns: 2.5,
          avgToolCalls: 4,
          errorRate: 0.5,
        },
        timestamp: Date.now(),
        model: "claude-sonnet-4-5-20250929",
      };

      const report = generateReport(result as any);

      expect(report).toContain("# Evaluation Report: test-suite");
      expect(report).toContain("Pass Rate");
      expect(report).toContain("75.0%");
      expect(report).toContain("✅ task-1");
      expect(report).toContain("❌ task-2");
    });
  });
});
