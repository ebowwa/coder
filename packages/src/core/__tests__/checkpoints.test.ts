/**
 * Checkpoints Tests
 *
 * Tests for checkpoint creation, loading, and navigation.
 * Uses unique session IDs to avoid collisions with real checkpoints.
 */

import { describe, it, expect } from "bun:test";
import {
  createCheckpoint,
  loadCheckpoints,
  getCheckpointSummary,
  registerCheckpoint,
  undoCheckpoint,
  redoCheckpoint,
  getNavigationStatus,
} from "../checkpoints.js";
import type { Message } from "../../schemas/index.js";

// Generate unique session IDs to avoid test collisions
const uniqueSessionId = () => `test-cp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

describe("Checkpoints", () => {
  describe("createCheckpoint", () => {
    it("should create a checkpoint with ID and timestamp", async () => {
      const sessionId = uniqueSessionId();
      const messages: Message[] = [{ role: "user", content: "Hello" }];

      const checkpoint = await createCheckpoint(sessionId, messages, {
        label: "Test checkpoint",
      });

      expect(checkpoint).toBeDefined();
      expect(checkpoint.id).toBeDefined();
      expect(checkpoint.timestamp).toBeGreaterThan(0);
      expect(checkpoint.label).toBe("Test checkpoint");
    });

    it("should include messages in checkpoint", async () => {
      const sessionId = uniqueSessionId();
      const messages: Message[] = [
        { role: "user", content: "Question" },
        { role: "assistant", content: "Answer" },
      ];

      const checkpoint = await createCheckpoint(sessionId, messages);

      expect(checkpoint.messages).toHaveLength(2);
    });

    it("should generate unique checkpoint IDs", async () => {
      const sessionId = uniqueSessionId();
      const messages: Message[] = [{ role: "user", content: "Test" }];

      const cp1 = await createCheckpoint(sessionId, messages);
      const cp2 = await createCheckpoint(sessionId, messages);

      expect(cp1.id).not.toBe(cp2.id);
    });
  });

  describe("loadCheckpoints", () => {
    it("should return empty map when no checkpoints exist", async () => {
      const sessionId = uniqueSessionId();
      const checkpoints = await loadCheckpoints(sessionId);
      expect(checkpoints.size).toBe(0);
    });

    it("should load existing checkpoints", async () => {
      const sessionId = uniqueSessionId();
      const messages: Message[] = [{ role: "user", content: "Test" }];

      await createCheckpoint(sessionId, messages);
      const checkpoints = await loadCheckpoints(sessionId);

      expect(checkpoints.size).toBeGreaterThan(0);
    });
  });

  describe("getCheckpointSummary", () => {
    it("should return summary string", async () => {
      const sessionId = uniqueSessionId();
      const messages: Message[] = [{ role: "user", content: "Test" }];

      const checkpoint = await createCheckpoint(sessionId, messages);
      const summary = getCheckpointSummary(checkpoint);

      expect(typeof summary).toBe("string");
      expect(summary.length).toBeGreaterThan(0);
    });

    it("should include message count", async () => {
      const sessionId = uniqueSessionId();
      const messages: Message[] = [
        { role: "user", content: "Q1" },
        { role: "assistant", content: "A1" },
        { role: "user", content: "Q2" },
      ];

      const checkpoint = await createCheckpoint(sessionId, messages);
      const summary = getCheckpointSummary(checkpoint);

      expect(summary).toContain("3 msgs");
    });
  });
});

describe("Checkpoint Navigation", () => {
  describe("getNavigationStatus", () => {
    it("should return empty status for new session", async () => {
      const sessionId = uniqueSessionId();
      const status = await getNavigationStatus(sessionId);

      expect(status.total).toBe(0);
      expect(status.current).toBe(0);
      expect(status.canUndo).toBe(false);
      expect(status.canRedo).toBe(false);
    });

    it("should track registered checkpoint", async () => {
      const sessionId = uniqueSessionId();
      const messages: Message[] = [{ role: "user", content: "Test" }];

      const cp = await createCheckpoint(sessionId, messages);
      await registerCheckpoint(sessionId, cp.id);

      const status = await getNavigationStatus(sessionId);

      expect(status.total).toBe(1);
      expect(status.current).toBe(1);
    });
  });

  describe("undoCheckpoint", () => {
    it("should return null when no checkpoints", async () => {
      const sessionId = uniqueSessionId();
      const result = await undoCheckpoint(sessionId);

      expect(result.checkpoint).toBeNull();
      expect(result.canRedo).toBe(false);
    });
  });

  describe("redoCheckpoint", () => {
    it("should return null when nothing to redo", async () => {
      const sessionId = uniqueSessionId();
      const result = await redoCheckpoint(sessionId);

      expect(result.checkpoint).toBeNull();
      expect(result.canRedo).toBe(false);
    });
  });
});
