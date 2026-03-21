/**
 * Tests for Loop Persistence
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "path";
import { mkdir, rm } from "fs/promises";
import { existsSync } from "fs";
import {
  LoopPersistence,
  DEFAULT_PERSISTENCE_CONFIG,
  type LoopPersistenceConfig,
} from "../loop-persistence.js";
import type { PersistedLoopState } from "../loop-serializer.js";
import { SERIALIZER_VERSION } from "../loop-serializer.js";
import { DEFAULT_LOOP_BEHAVIOR } from "../../../ecosystem/presets/types.js";

// Test directory for persistence
const TEST_DIR = join(process.cwd(), ".test-persistence");

// Helper to create a valid state
function createTestState(sessionId: string, overrides: Partial<PersistedLoopState> = {}): PersistedLoopState {
  return {
    version: SERIALIZER_VERSION,
    sessionId,
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
    ...overrides,
  };
}

describe("LoopPersistence", () => {
  let persistence: LoopPersistence;
  let config: LoopPersistenceConfig;

  beforeEach(async () => {
    // Create test directory
    config = {
      ...DEFAULT_PERSISTENCE_CONFIG,
      storageDir: TEST_DIR,
      enabled: true,
      autoSaveInterval: 100, // Fast for testing
    };
    persistence = new LoopPersistence(config);

    // Ensure clean state - remove if exists, but don't create
    // The init() method should create the directory
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true });
    }
  });

  afterEach(async () => {
    // Cleanup test directory
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true });
    }
  });

  describe("initialization", () => {
    test("should initialize storage directory", async () => {
      await persistence.init();
      expect(existsSync(TEST_DIR)).toBe(true);
    });

    test("should use config values", () => {
      expect(persistence.getStorageDir()).toBe(TEST_DIR);
    });
  });

  describe("save and load", () => {
    test("should save state to disk", async () => {
      const sessionId = "test-session-1";
      const state = createTestState(sessionId);

      await persistence.save(sessionId, state);

      // Verify file exists
      const exists = await persistence.exists(sessionId);
      expect(exists).toBe(true);
    });

    test("should load saved state", async () => {
      const sessionId = "test-session-2";
      const state = createTestState(sessionId, {
        turnNumber: 5,
        totalCost: 0.25,
      });

      await persistence.save(sessionId, state);
      const loaded = await persistence.load(sessionId);

      expect(loaded).not.toBeNull();
      expect(loaded?.sessionId).toBe(sessionId);
      expect(loaded?.turnNumber).toBe(5);
      expect(loaded?.totalCost).toBe(0.25);
    });

    test("should return null for non-existent session", async () => {
      const loaded = await persistence.load("non-existent");
      expect(loaded).toBeNull();
    });

    test("should update lastSaveTime on save", async () => {
      const sessionId = "test-session-3";
      const state = createTestState(sessionId);

      await persistence.save(sessionId, state);

      // First save should set the time
      expect(persistence.shouldAutoSave(sessionId)).toBe(false);

      // Wait for autoSaveInterval to pass
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Now should be ready for auto-save
      expect(persistence.shouldAutoSave(sessionId)).toBe(true);
    });
  });

  describe("lifecycle", () => {
    test("should start loop with initial state", async () => {
      const sessionId = "test-lifecycle-1";
      const state = createTestState(sessionId);

      await persistence.startLoop(sessionId, state, {
        workingDirectory: "/test/dir",
        model: "test-model",
      });

      const manifest = await persistence.loadManifest(sessionId);
      expect(manifest).not.toBeNull();
      expect(manifest?.sessionId).toBe(sessionId);
      expect(manifest?.interrupted).toBe(false);
      expect(manifest?.workingDirectory).toBe("/test/dir");
    });

    test("should end loop properly", async () => {
      const sessionId = "test-lifecycle-2";
      const state = createTestState(sessionId);

      await persistence.startLoop(sessionId, state);
      await persistence.endLoop(sessionId, { endReason: "completed" });

      const manifest = await persistence.loadManifest(sessionId);
      expect(manifest?.endedAt).toBeDefined();
      expect(manifest?.interrupted).toBe(false);
    });
  });

  describe("checkpoints", () => {
    test("should create checkpoint", async () => {
      const sessionId = "test-checkpoint-1";
      const state = createTestState(sessionId, { turnNumber: 5 });

      await persistence.startLoop(sessionId, state);
      const checkpoint = await persistence.createCheckpoint(
        sessionId,
        state,
        "auto",
        "Test checkpoint"
      );

      expect(checkpoint.type).toBe("auto");
      expect(checkpoint.turnNumber).toBe(5);
      expect(checkpoint.summary).toBe("Test checkpoint");
    });

    test("should list checkpoints", async () => {
      const sessionId = "test-checkpoint-2";
      const state = createTestState(sessionId);

      await persistence.startLoop(sessionId, state);
      await persistence.createCheckpoint(sessionId, state, "auto", "CP1");

      // Get updated state which now has checkpoint
      const updatedState = await persistence.load(sessionId);
      expect(updatedState).not.toBeNull();
      expect(updatedState?.checkpoints.length).toBe(1);
    });

    test("should delete checkpoint", async () => {
      const sessionId = "test-checkpoint-3";
      const state = createTestState(sessionId);

      await persistence.startLoop(sessionId, state);
      const cp = await persistence.createCheckpoint(sessionId, state, "auto", "CP1");

      const deleted = await persistence.deleteCheckpoint(sessionId, cp.id);
      expect(deleted).toBe(true);

      const loadedState = await persistence.load(sessionId);
      expect(loadedState?.checkpoints.length).toBe(0);
    });
  });

  describe("recovery", () => {
    test("should find interrupted loops", async () => {
      // Create an interrupted loop - simulate by starting and NOT ending
      const sessionId1 = "interrupted-1";
      const state1 = createTestState(sessionId1);

      await persistence.startLoop(sessionId1, state1);
      // Simulate crash by not calling endLoop

      // Manually update the manifest to mark as interrupted
      const manifest1 = await persistence.loadManifest(sessionId1);
      if (manifest1) {
        manifest1.interrupted = true;
        const manifestPath = join(TEST_DIR, sessionId1, "manifest.json");
        await Bun.write(manifestPath, JSON.stringify(manifest1, null, 2));
      }

      // Create a completed loop
      const sessionId2 = "completed-1";
      const state2 = createTestState(sessionId2);

      await persistence.startLoop(sessionId2, state2);
      await persistence.endLoop(sessionId2);

      const interrupted = await persistence.findInterruptedLoops();

      expect(interrupted).toContain(sessionId1);
      expect(interrupted).not.toContain(sessionId2);
    });

    test("should recover loop state", async () => {
      const sessionId = "recover-1";
      const state = createTestState(sessionId, {
        turnNumber: 10,
        totalCost: 1.5,
      });

      await persistence.startLoop(sessionId, state);
      await persistence.save(sessionId, state);

      const result = await persistence.recoverLoop(sessionId);

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe(sessionId);
      expect(result.state?.turnNumber).toBe(10);
      expect(result.state?.totalCost).toBe(1.5);
    });

    test("should fail recovery for non-existent loop", async () => {
      const result = await persistence.recoverLoop("non-existent");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("cleanup", () => {
    test("should prune old completed loops", async () => {
      // Create a completed loop
      const sessionId = "completed-to-prune";
      const state = createTestState(sessionId);

      await persistence.startLoop(sessionId, state);
      await persistence.endLoop(sessionId);

      // Update manifest to simulate old endedAt
      const manifest = await persistence.loadManifest(sessionId);
      if (manifest) {
        manifest.endedAt = Date.now() - 31 * 24 * 60 * 60 * 1000; // 31 days ago
        // Write manifest directly
        const manifestPath = join(TEST_DIR, sessionId, "manifest.json");
        await Bun.write(manifestPath, JSON.stringify(manifest, null, 2));
      }

      // Create a recent completed loop
      const recentSessionId = "recent-completed";
      const recentState = createTestState(recentSessionId);

      await persistence.startLoop(recentSessionId, recentState);
      await persistence.endLoop(recentSessionId);

      // Prune loops older than 30 days
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      const deleted = await persistence.pruneOldLoops(thirtyDays);

      expect(deleted).toBe(1);
      expect(await persistence.exists(sessionId)).toBe(false);
      expect(await persistence.exists(recentSessionId)).toBe(true);
    });

    test("should delete loop entirely", async () => {
      const sessionId = "to-delete";
      const state = createTestState(sessionId);

      await persistence.startLoop(sessionId, state);
      await persistence.deleteLoop(sessionId);

      expect(await persistence.exists(sessionId)).toBe(false);
    });
  });

  describe("auto-save timer", () => {
    test("should start and stop auto-save timer", async () => {
      const sessionId = "autosave-1";
      const state = createTestState(sessionId);

      let saveCount = 0;
      persistence.startAutoSaveTimer(sessionId, () => {
        saveCount++;
        return state;
      });

      // Wait for at least one interval
      await new Promise((resolve) => setTimeout(resolve, 200));

      persistence.stopAutoSaveTimer(sessionId);

      // Should have been saved at least once
      expect(saveCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("summary", () => {
    test("should get summary of persisted loop", async () => {
      const sessionId = "summary-test";
      const state = createTestState(sessionId, {
        turnNumber: 15,
        totalCost: 2.5,
      });

      await persistence.startLoop(sessionId, state);

      const summary = await persistence.getSummary(sessionId);

      expect(summary).not.toBeNull();
      expect(summary?.sessionId).toBe(sessionId);
      expect(summary?.turnNumber).toBe(15);
      expect(summary?.totalCost).toBe(2.5);
    });
  });
});
