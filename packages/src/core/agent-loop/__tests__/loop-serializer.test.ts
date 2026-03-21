/**
 * Tests for Loop Serializer
 */

import { describe, test, expect } from "bun:test";
import {
  SERIALIZER_VERSION,
  generateCheckpointId,
  validatePersistedState,
  validateCheckpoint,
  pruneCheckpoints,
  createStateSummary,
} from "../loop-serializer.js";
import type { PersistedLoopState, LoopCheckpoint } from "../loop-serializer.js";
import { DEFAULT_LOOP_BEHAVIOR } from "../../../ecosystem/presets/types.js";

describe("loop-serializer", () => {
  describe("SERIALIZER_VERSION", () => {
    test("should be 1", () => {
      expect(SERIALIZER_VERSION).toBe(1);
    });
  });

  describe("generateCheckpointId", () => {
    test("should generate unique IDs", async () => {
      const id1 = generateCheckpointId(1);
      // Wait 1ms to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 2));
      const id2 = generateCheckpointId(1);

      // IDs should be different due to timestamp
      expect(id1).not.toBe(id2);
    });

    test("should include turn number in ID", () => {
      const id = generateCheckpointId(42);
      expect(id).toContain("0042"); // Zero-padded turn number
    });

    test("should start with cp_", () => {
      const id = generateCheckpointId(1);
      expect(id.startsWith("cp_")).toBe(true);
    });
  });

  describe("validatePersistedState", () => {
    test("should validate a valid state", () => {
      const validState: PersistedLoopState = {
        version: 1,
        sessionId: "test-session",
        timestamp: Date.now(),
        messages: [],
        metrics: [],
        allToolsUsed: [],
        totalCost: 0,
        previousCost: 0,
        totalDuration: 0,
        turnNumber: 0,
        compactionCount: 0,
        totalTokensCompacted: 0,
        retryCount: 0,
        cacheMetrics: {
          cacheHits: 0,
          cacheMisses: 0,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
          totalCacheReadTokens: 0,
          totalCacheWriteTokens: 0,
          cacheHitRate: 0,
          estimatedSavingsUSD: 0,
        },
        templateName: null,
        loopBehavior: DEFAULT_LOOP_BEHAVIOR,
        sessionStartTime: Date.now(),
        checkpoints: [],
      };

      expect(validatePersistedState(validState)).toBe(true);
    });

    test("should reject null", () => {
      expect(validatePersistedState(null)).toBe(false);
    });

    test("should reject non-objects", () => {
      expect(validatePersistedState("string")).toBe(false);
      expect(validatePersistedState(123)).toBe(false);
      expect(validatePersistedState(undefined)).toBe(false);
    });

    test("should reject missing required fields", () => {
      const missingVersion = {
        sessionId: "test",
        timestamp: Date.now(),
        messages: [],
        metrics: [],
        allToolsUsed: [],
        totalCost: 0,
        turnNumber: 0,
      };

      expect(validatePersistedState(missingVersion)).toBe(false);
    });

    test("should reject invalid messages type", () => {
      const invalidMessages = {
        version: 1,
        sessionId: "test",
        timestamp: Date.now(),
        messages: "not an array",
        metrics: [],
        allToolsUsed: [],
        totalCost: 0,
        turnNumber: 0,
      };

      expect(validatePersistedState(invalidMessages)).toBe(false);
    });
  });

  describe("validateCheckpoint", () => {
    test("should validate a valid checkpoint", () => {
      const validCheckpoint: LoopCheckpoint = {
        id: "cp_0001_1234567890",
        turnNumber: 1,
        timestamp: Date.now(),
        type: "auto",
        summary: "Test checkpoint",
      };

      expect(validateCheckpoint(validCheckpoint)).toBe(true);
    });

    test("should validate all checkpoint types", () => {
      for (const type of ["auto", "manual", "qc"] as const) {
        const checkpoint: LoopCheckpoint = {
          id: `cp_0001_${Date.now()}`,
          turnNumber: 1,
          timestamp: Date.now(),
          type,
          summary: `${type} checkpoint`,
        };

        expect(validateCheckpoint(checkpoint)).toBe(true);
      }
    });

    test("should reject invalid type", () => {
      const invalidType = {
        id: "cp_0001_1234567890",
        turnNumber: 1,
        timestamp: Date.now(),
        type: "invalid",
        summary: "Test",
      };

      expect(validateCheckpoint(invalidType)).toBe(false);
    });

    test("should reject missing fields", () => {
      const missingSummary = {
        id: "cp_0001_1234567890",
        turnNumber: 1,
        timestamp: Date.now(),
        type: "auto",
      };

      expect(validateCheckpoint(missingSummary)).toBe(false);
    });
  });

  describe("pruneCheckpoints", () => {
    function createCheckpoint(turn: number, timestamp: number): LoopCheckpoint {
      return {
        id: `cp_${String(turn).padStart(4, "0")}_${timestamp}`,
        turnNumber: turn,
        timestamp,
        type: "auto",
        summary: `Checkpoint at turn ${turn}`,
      };
    }

    test("should return all checkpoints when under limit", () => {
      const checkpoints = [
        createCheckpoint(1, 1000),
        createCheckpoint(2, 2000),
        createCheckpoint(3, 3000),
      ];

      const pruned = pruneCheckpoints(checkpoints, 5);

      expect(pruned.length).toBe(3);
    });

    test("should return all checkpoints when at limit", () => {
      const checkpoints = [
        createCheckpoint(1, 1000),
        createCheckpoint(2, 2000),
        createCheckpoint(3, 3000),
      ];

      const pruned = pruneCheckpoints(checkpoints, 3);

      expect(pruned.length).toBe(3);
    });

    test("should keep most recent checkpoints when over limit", () => {
      const checkpoints = [
        createCheckpoint(1, 1000),
        createCheckpoint(2, 2000),
        createCheckpoint(3, 3000),
        createCheckpoint(4, 4000),
        createCheckpoint(5, 5000),
      ];

      const pruned = pruneCheckpoints(checkpoints, 3);

      expect(pruned.length).toBe(3);
      // Should have the 3 most recent by timestamp
      expect(pruned.map((cp) => cp.turnNumber)).toEqual([5, 4, 3]);
    });

    test("should handle empty array", () => {
      const pruned = pruneCheckpoints([], 3);
      expect(pruned.length).toBe(0);
    });
  });

  describe("createStateSummary", () => {
    test("should create summary from state", () => {
      const state: PersistedLoopState = {
        version: 1,
        sessionId: "test-session-123",
        timestamp: Date.now(),
        messages: [{ role: "user", content: [] }],
        metrics: [],
        allToolsUsed: [],
        totalCost: 0.05,
        previousCost: 0,
        totalDuration: 60000, // 1 minute
        turnNumber: 5,
        compactionCount: 0,
        totalTokensCompacted: 0,
        retryCount: 0,
        cacheMetrics: {
          cacheHits: 0,
          cacheMisses: 0,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
          totalCacheReadTokens: 0,
          totalCacheWriteTokens: 0,
          cacheHitRate: 0,
          estimatedSavingsUSD: 0,
        },
        templateName: "default",
        loopBehavior: DEFAULT_LOOP_BEHAVIOR,
        sessionStartTime: Date.now() - 60000,
        checkpoints: [{ id: "cp1", turnNumber: 2, timestamp: Date.now(), type: "auto", summary: "test" }],
      };

      const summary = createStateSummary(state);

      expect(summary.sessionId).toBe("test-session-123");
      expect(summary.turnNumber).toBe(5);
      expect(summary.totalCost).toBe(0.05);
      expect(summary.checkpointCount).toBe(1);
      expect(summary.templateName).toBe("default");
      expect(summary.interrupted).toBe(false);
      expect(summary.duration).toBeDefined();
    });
  });
});
