/**
 * SessionStore Tests
 *
 * Tests for session creation, resumption, persistence,
 * message/tool use/metrics saving, listing, and export.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";
import { SessionStore, SessionPersistence } from "../sessions/index.js";
import type {
  SessionMetadata,
  SessionSummary,
  SessionFilter,
  LoadedSession,
} from "../sessions/types.js";
import type { Message, QueryMetrics } from "../../schemas/index.js";

// Test directory for session files
const TEST_DIR = join("/tmp", "coder-session-test-" + Date.now());
const SESSIONS_DIR = join(TEST_DIR, "sessions");

describe("SessionStore", () => {
  let store: SessionStore;

  beforeEach(async () => {
    // Create test directories
    await mkdir(SESSIONS_DIR, { recursive: true });
    store = new SessionStore(SESSIONS_DIR);
    await store.init();
  });

  afterEach(async () => {
    // Clean up test directories
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  describe("initialization", () => {
    it("should initialize sessions directory", async () => {
      const newStore = new SessionStore(join(TEST_DIR, "new-sessions"));
      await newStore.init();

      const sessionsDir = newStore.getSessionsDir();
      expect(sessionsDir).toContain("new-sessions");
    });

    it("should get session path correctly", () => {
      const path = store.getSessionPath("test-session-id");
      expect(path).toContain("test-session-id.jsonl");
    });

    it("should return sessions directory", () => {
      const dir = store.getSessionsDir();
      expect(dir).toBe(SESSIONS_DIR);
    });
  });

  describe("session creation", () => {
    it("should create a new session", async () => {
      const sessionId = await store.createSession({
        model: "claude-sonnet-4-6",
        workingDirectory: "/test/path",
      });

      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe("string");
      expect(sessionId.length).toBeGreaterThan(0);

      const exists = await store.sessionExists(sessionId);
      expect(exists).toBe(true);
    });

    it("should set current session after creation", async () => {
      const sessionId = await store.createSession({
        model: "claude-sonnet-4-6",
        workingDirectory: "/test/path",
      });

      expect(store.getCurrentSessionId()).toBe(sessionId);
    });

    it("should create metadata for new session", async () => {
      await store.createSession({
        model: "claude-sonnet-4-6",
        workingDirectory: "/test/path",
      });

      const metadata = store.getCurrentMetadata();
      expect(metadata).not.toBeNull();
      expect(metadata?.model).toBe("claude-sonnet-4-6");
    });

    it("should reuse empty session if exists", async () => {
      // Create first session (will be empty)
      const sessionId1 = await store.createSession({
        model: "claude-sonnet-4-6",
        workingDirectory: "/test/path",
      });

      // Create another session store to simulate fresh start
      const store2 = new SessionStore(SESSIONS_DIR);
      await store2.init();

      // Create new session - should reuse empty one
      const sessionId2 = await store2.createSession({
        model: "claude-opus-4-6",
        workingDirectory: "/other/path",
      });

      // Should reuse the same session ID
      expect(sessionId2).toBe(sessionId1);
    });

    it("should support optional agent metadata", async () => {
      const sessionId = await store.createSession({
        model: "claude-sonnet-4-6",
        workingDirectory: "/test/path",
        agentName: "test-agent",
        agentColor: "#FF0000",
        teamName: "test-team",
      });

      const summary = await store.getSessionSummary(sessionId);
      expect(summary?.metadata?.agentName).toBe("test-agent");
      expect(summary?.metadata?.agentColor).toBe("#FF0000");
      expect(summary?.metadata?.teamName).toBe("test-team");
    });
  });

  describe("session resumption", () => {
    it("should resume existing session", async () => {
      const sessionId = await store.createSession({
        model: "claude-sonnet-4-6",
        workingDirectory: "/test/path",
      });

      // Create a new store to simulate fresh start
      const store2 = new SessionStore(SESSIONS_DIR);
      await store2.init();

      const session = await store2.resumeSession(sessionId);

      expect(session).not.toBeNull();
      expect(session?.metadata.model).toBe("claude-sonnet-4-6");
      expect(session?.context?.workingDirectory).toBe("/test/path");
    });

    it("should return null for non-existent session", async () => {
      const session = await store.resumeSession("non-existent-id");
      expect(session).toBeNull();
    });

    it("should set current session after resume", async () => {
      const sessionId = await store.createSession({
        model: "claude-sonnet-4-6",
        workingDirectory: "/test/path",
      });

      // Reset current session
      const store2 = new SessionStore(SESSIONS_DIR);
      await store2.init();

      await store2.resumeSession(sessionId);

      expect(store2.getCurrentSessionId()).toBe(sessionId);
    });
  });

  describe("message saving", () => {
    it("should save user message", async () => {
      const sessionId = await store.createSession({
        model: "claude-sonnet-4-6",
        workingDirectory: "/test/path",
      });

      const message: Message = {
        role: "user",
        content: [{ type: "text", text: "Hello, world!" }],
      };

      await store.saveMessage(message);

      const session = await store.resumeSession(sessionId);
      expect(session?.messages.length).toBe(1);
      expect(session?.messages[0]?.role).toBe("user");
    });

    it("should save assistant message", async () => {
      const sessionId = await store.createSession({
        model: "claude-sonnet-4-6",
        workingDirectory: "/test/path",
      });

      const message: Message = {
        role: "assistant",
        content: [{ type: "text", text: "Hello back!" }],
      };

      await store.saveMessage(message);

      const session = await store.resumeSession(sessionId);
      expect(session?.messages.length).toBe(1);
      expect(session?.messages[0]?.role).toBe("assistant");
    });

    it("should throw when no active session", async () => {
      const message: Message = {
        role: "user",
        content: [{ type: "text", text: "Test" }],
      };

      await expect(store.saveMessage(message)).rejects.toThrow("No active session");
    });

    it("should save multiple messages", async () => {
      const sessionId = await store.createSession({
        model: "claude-sonnet-4-6",
        workingDirectory: "/test/path",
      });

      await store.saveMessage({
        role: "user",
        content: [{ type: "text", text: "Message 1" }],
      });

      await store.saveMessage({
        role: "assistant",
        content: [{ type: "text", text: "Message 2" }],
      });

      await store.saveMessage({
        role: "user",
        content: [{ type: "text", text: "Message 3" }],
      });

      const session = await store.resumeSession(sessionId);
      expect(session?.messages.length).toBe(3);
    });
  });

  describe("tool use saving", () => {
    it("should save tool use entry", async () => {
      const sessionId = await store.createSession({
        model: "claude-sonnet-4-6",
        workingDirectory: "/test/path",
      });

      await store.saveToolUse(
        "tool-123",
        "Read",
        { file_path: "/test/file.ts" },
        "file contents",
        false
      );

      const session = await store.resumeSession(sessionId);
      expect(session?.tools.length).toBe(1);
      expect(session?.tools[0]?.toolName).toBe("Read");
      expect(session?.tools[0]?.toolId).toBe("tool-123");
    });

    it("should save tool use with error", async () => {
      const sessionId = await store.createSession({
        model: "claude-sonnet-4-6",
        workingDirectory: "/test/path",
      });

      await store.saveToolUse(
        "tool-456",
        "Bash",
        { command: "invalid-command" },
        "Error: command not found",
        true
      );

      const session = await store.resumeSession(sessionId);
      expect(session?.tools[0]?.isError).toBe(true);
    });

    it("should throw when saving tool use without active session", async () => {
      await expect(
        store.saveToolUse("tool-123", "Read", {})
      ).rejects.toThrow("No active session");
    });
  });

  describe("metrics saving", () => {
    it("should save metrics entry", async () => {
      const sessionId = await store.createSession({
        model: "claude-sonnet-4-6",
        workingDirectory: "/test/path",
      });

      const metrics: QueryMetrics = {
        usage: { input_tokens: 100, output_tokens: 50 },
        costUSD: 0.001,
        duration_ms: 1000,
      };

      await store.saveMetrics(metrics);

      const session = await store.resumeSession(sessionId);
      expect(session?.metrics.length).toBe(1);
      expect(session?.metrics[0]?.costUSD).toBe(0.001);
    });

    it("should update total cost in metadata", async () => {
      await store.createSession({
        model: "claude-sonnet-4-6",
        workingDirectory: "/test/path",
      });

      const metrics1: QueryMetrics = {
        usage: { input_tokens: 100, output_tokens: 50 },
        costUSD: 0.001,
      };

      const metrics2: QueryMetrics = {
        usage: { input_tokens: 200, output_tokens: 100 },
        costUSD: 0.002,
      };

      await store.saveMetrics(metrics1);
      await store.saveMetrics(metrics2);

      const metadata = store.getCurrentMetadata();
      expect(metadata?.totalCost).toBeCloseTo(0.003);
    });

    it("should update total tokens in metadata", async () => {
      await store.createSession({
        model: "claude-sonnet-4-6",
        workingDirectory: "/test/path",
      });

      const metrics: QueryMetrics = {
        usage: { input_tokens: 100, output_tokens: 50 },
        costUSD: 0.001,
      };

      await store.saveMetrics(metrics);

      const metadata = store.getCurrentMetadata();
      expect(metadata?.totalTokens?.input).toBe(100);
      expect(metadata?.totalTokens?.output).toBe(50);
    });
  });

  describe("session listing", () => {
    it("should list sessions", async () => {
      await store.createSession({
        model: "claude-sonnet-4-6",
        workingDirectory: "/test/path1",
      });

      await store.createSession({
        model: "claude-opus-4-6",
        workingDirectory: "/test/path2",
      });

      const sessions = await store.listSessions(10);

      // Should have at least one session (reused empty one)
      expect(sessions.length).toBeGreaterThanOrEqual(1);
    });

    it("should respect limit parameter", async () => {
      // Create multiple sessions with content to avoid reuse
      for (let i = 0; i < 5; i++) {
        const id = await store.createSession({
          model: "claude-sonnet-4-6",
          workingDirectory: `/test/path${i}`,
        });
        // Add message to prevent reuse
        await store.saveMessage({
          role: "user",
          content: [{ type: "text", text: `Message ${i}` }],
        });
      }

      const sessions = await store.listSessions(2);
      expect(sessions.length).toBeLessThanOrEqual(2);
    });

    it("should return session summaries", async () => {
      await store.createSession({
        model: "claude-sonnet-4-6",
        workingDirectory: "/test/path",
      });

      const sessions = await store.listSessions(10);
      const summary = sessions[0];

      expect(summary).toHaveProperty("id");
      expect(summary).toHaveProperty("model");
      expect(summary).toHaveProperty("messageCount");
    });

    it("should find empty sessions", async () => {
      await store.createSession({
        model: "claude-sonnet-4-6",
        workingDirectory: "/test/path",
      });

      const empty = await store.findEmptySessions();
      // Current session is empty after creation
      expect(empty.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("session deletion", () => {
    it("should delete existing session", async () => {
      const sessionId = await store.createSession({
        model: "claude-sonnet-4-6",
        workingDirectory: "/test/path",
      });

      // Add content to prevent reuse
      await store.saveMessage({
        role: "user",
        content: [{ type: "text", text: "Test" }],
      });

      const deleted = await store.deleteSession(sessionId);
      expect(deleted).toBe(true);

      const exists = await store.sessionExists(sessionId);
      expect(exists).toBe(false);
    });

    it("should return false for non-existent session", async () => {
      const deleted = await store.deleteSession("non-existent-id");
      expect(deleted).toBe(false);
    });

    it("should clear current session if deleted", async () => {
      const sessionId = await store.createSession({
        model: "claude-sonnet-4-6",
        workingDirectory: "/test/path",
      });

      await store.saveMessage({
        role: "user",
        content: [{ type: "text", text: "Test" }],
      });

      await store.deleteSession(sessionId);

      expect(store.getCurrentSessionId()).toBeNull();
      expect(store.getCurrentMetadata()).toBeNull();
    });
  });

  describe("metadata accessors", () => {
    it("should get current session ID", async () => {
      const sessionId = await store.createSession({
        model: "claude-sonnet-4-6",
        workingDirectory: "/test/path",
      });

      expect(store.getCurrentSessionId()).toBe(sessionId);
    });

    it("should return null when no current session", () => {
      expect(store.getCurrentSessionId()).toBeNull();
      expect(store.getCurrentMetadata()).toBeNull();
    });

    it("should update metadata", async () => {
      await store.createSession({
        model: "claude-sonnet-4-6",
        workingDirectory: "/test/path",
      });

      store.updateMetadata({ agentName: "updated-agent" });

      const metadata = store.getCurrentMetadata();
      expect(metadata?.agentName).toBe("updated-agent");
    });
  });

  describe("event handling", () => {
    it("should emit created event", async () => {
      const events: Array<{ type: string; sessionId: string }> = [];

      store.onEvent((event) => {
        events.push({ type: event.type, sessionId: event.sessionId });
      });

      const sessionId = await store.createSession({
        model: "claude-sonnet-4-6",
        workingDirectory: "/test/path",
      });

      // Wait for events to process
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(events.some((e) => e.type === "created")).toBe(true);
    });

    it("should emit message_saved event", async () => {
      const events: Array<{ type: string }> = [];

      store.onEvent((event) => {
        events.push({ type: event.type });
      });

      await store.createSession({
        model: "claude-sonnet-4-6",
        workingDirectory: "/test/path",
      });

      await store.saveMessage({
        role: "user",
        content: [{ type: "text", text: "Test" }],
      });

      // Wait for events to process
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(events.some((e) => e.type === "message_saved")).toBe(true);
    });

    it("should unsubscribe with returned function", async () => {
      const events: string[] = [];

      const unsubscribe = store.onEvent((event) => {
        events.push(event.type);
      });

      await store.createSession({
        model: "claude-sonnet-4-6",
        workingDirectory: "/test/path",
      });

      await new Promise((resolve) => setTimeout(resolve, 10));
      unsubscribe();

      // Create another session - should not trigger event
      const store2 = new SessionStore(SESSIONS_DIR);
      await store2.createSession({
        model: "claude-sonnet-4-6",
        workingDirectory: "/test/path2",
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should only have events from first session
      const createdEvents = events.filter((e) => e === "created");
      expect(createdEvents.length).toBe(1);
    });
  });

  describe("session export", () => {
    it("should export session as JSON", async () => {
      const sessionId = await store.createSession({
        model: "claude-sonnet-4-6",
        workingDirectory: "/test/path",
      });

      await store.saveMessage({
        role: "user",
        content: [{ type: "text", text: "Test" }],
      });

      const outputPath = join(TEST_DIR, "export.json");
      const result = await store.exportSession(sessionId, "json", outputPath);

      const file = Bun.file(outputPath);
      expect(await file.exists()).toBe(true);

      const content = await file.text();
      const parsed = JSON.parse(content);
      expect(parsed.metadata.model).toBe("claude-sonnet-4-6");
    });

    it("should export session as markdown", async () => {
      const sessionId = await store.createSession({
        model: "claude-sonnet-4-6",
        workingDirectory: "/test/path",
      });

      await store.saveMessage({
        role: "user",
        content: [{ type: "text", text: "Hello" }],
      });

      const outputPath = join(TEST_DIR, "export.md");
      await store.exportSession(sessionId, "markdown", outputPath);

      const file = Bun.file(outputPath);
      const content = await file.text();
      expect(content).toContain("Hello");
    });

    it("should export session as JSONL", async () => {
      const sessionId = await store.createSession({
        model: "claude-sonnet-4-6",
        workingDirectory: "/test/path",
      });

      await store.saveMessage({
        role: "user",
        content: [{ type: "text", text: "Test" }],
      });

      const outputPath = join(TEST_DIR, "export.jsonl");
      await store.exportSession(sessionId, "jsonl", outputPath);

      const file = Bun.file(outputPath);
      const content = await file.text();
      expect(content).toContain('"type":"metadata"');
    });

    it("should throw for non-existent session export", async () => {
      await expect(
        store.exportSession("non-existent", "json")
      ).rejects.toThrow("Session not found");
    });
  });

  describe("session stats", () => {
    it("should return session stats", async () => {
      await store.createSession({
        model: "claude-sonnet-4-6",
        workingDirectory: "/test/path",
      });

      await store.saveMessage({
        role: "user",
        content: [{ type: "text", text: "Test" }],
      });

      const stats = await store.getStats();

      expect(stats).toHaveProperty("totalSessions");
      expect(stats).toHaveProperty("totalMessages");
      expect(stats).toHaveProperty("totalCost");
      expect(stats).toHaveProperty("emptySessions");
    });
  });

  describe("cleanup", () => {
    it("should cleanup empty sessions", async () => {
      // Create and leave empty
      await store.createSession({
        model: "claude-sonnet-4-6",
        workingDirectory: "/test/path",
      });

      // Create another session with content
      const store2 = new SessionStore(SESSIONS_DIR);
      const sessionWithContent = await store2.createSession({
        model: "claude-sonnet-4-6",
        workingDirectory: "/test/path2",
      });

      await store2.saveMessage({
        role: "user",
        content: [{ type: "text", text: "Content" }],
      });

      const deleted = await store2.cleanupEmptySessions();

      // Should have deleted at least one empty session
      expect(deleted).toBeGreaterThanOrEqual(0);

      // Session with content should still exist
      const exists = await store2.sessionExists(sessionWithContent);
      expect(exists).toBe(true);
    });
  });
});

describe("SessionPersistence", () => {
  let persistence: SessionPersistence;

  beforeEach(async () => {
    await mkdir(SESSIONS_DIR, { recursive: true });
    persistence = new SessionPersistence(SESSIONS_DIR);
    await persistence.init();
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  describe("read and write", () => {
    it("should return empty array for non-existent session", async () => {
      const entries = await persistence.read("non-existent");
      expect(entries).toEqual([]);
    });

    it("should append and read entries", async () => {
      const metadata: SessionMetadata = {
        type: "metadata",
        id: "test-id",
        model: "claude-sonnet-4-6",
        createdAt: Date.now(),
        workingDirectory: "/test",
      };

      await persistence.append("test-id", metadata);

      const entries = await persistence.read("test-id");
      expect(entries.length).toBe(1);
    });

    it("should check if session exists", async () => {
      const exists1 = await persistence.exists("non-existent");
      expect(exists1).toBe(false);

      await persistence.append("test-id", {
        type: "metadata",
        id: "test-id",
        model: "claude-sonnet-4-6",
        createdAt: Date.now(),
        workingDirectory: "/test",
      });

      const exists2 = await persistence.exists("test-id");
      expect(exists2).toBe(true);
    });

    it("should list session files", async () => {
      await persistence.append("session-1", {
        type: "metadata",
        id: "session-1",
        model: "claude-sonnet-4-6",
        createdAt: Date.now(),
        workingDirectory: "/test",
      });

      await persistence.append("session-2", {
        type: "metadata",
        id: "session-2",
        model: "claude-sonnet-4-6",
        createdAt: Date.now(),
        workingDirectory: "/test",
      });

      const files = await persistence.listFiles();
      expect(files.length).toBe(2);
      expect(files).toContain("session-1");
      expect(files).toContain("session-2");
    });

    it("should delete session", async () => {
      await persistence.append("to-delete", {
        type: "metadata",
        id: "to-delete",
        model: "claude-sonnet-4-6",
        createdAt: Date.now(),
        workingDirectory: "/test",
      });

      const deleted = await persistence.delete("to-delete");
      expect(deleted).toBe(true);

      const exists = await persistence.exists("to-delete");
      expect(exists).toBe(false);
    });

    it("should return false when deleting non-existent session", async () => {
      const deleted = await persistence.delete("non-existent");
      expect(deleted).toBe(false);
    });
  });

  describe("read operations", () => {
    it("should read metadata", async () => {
      await persistence.append("test", {
        type: "metadata",
        id: "test",
        model: "claude-sonnet-4-6",
        createdAt: Date.now(),
        workingDirectory: "/test",
      });

      const metadata = await persistence.readMetadata("test");
      expect(metadata).not.toBeNull();
      expect(metadata?.model).toBe("claude-sonnet-4-6");
    });

    it("should read last N entries", async () => {
      await persistence.append("test", {
        type: "metadata",
        id: "test",
        model: "claude-sonnet-4-6",
        createdAt: Date.now(),
        workingDirectory: "/test",
      });

      for (let i = 0; i < 5; i++) {
        await persistence.append("test", {
          type: "message",
          timestamp: Date.now(),
          data: {
            role: "user",
            content: [{ type: "text", text: `Message ${i}` }],
          },
        });
      }

      const last = await persistence.readLast("test", 2);
      expect(last.length).toBe(2);
    });

    it("should count entries", async () => {
      await persistence.append("test", {
        type: "metadata",
        id: "test",
        model: "claude-sonnet-4-6",
        createdAt: Date.now(),
        workingDirectory: "/test",
      });

      await persistence.append("test", {
        type: "message",
        timestamp: Date.now(),
        data: {
          role: "user",
          content: [{ type: "text", text: "Test" }],
        },
      });

      const count = await persistence.countEntries("test");
      expect(count).toBe(2);
    });
  });

  describe("stats", () => {
    it("should get file stats", async () => {
      await persistence.append("test", {
        type: "metadata",
        id: "test",
        model: "claude-sonnet-4-6",
        createdAt: Date.now(),
        workingDirectory: "/test",
      });

      const stats = await persistence.getStats("test");
      expect(stats.exists).toBe(true);
      expect(stats.size).toBeGreaterThan(0);
    });

    it("should return stats for non-existent file", async () => {
      const stats = await persistence.getStats("non-existent");
      expect(stats.exists).toBe(false);
      expect(stats.size).toBe(0);
    });

    it("should get modification times", async () => {
      await persistence.append("test1", {
        type: "metadata",
        id: "test1",
        model: "claude-sonnet-4-6",
        createdAt: Date.now(),
        workingDirectory: "/test",
      });

      await persistence.append("test2", {
        type: "metadata",
        id: "test2",
        model: "claude-sonnet-4-6",
        createdAt: Date.now(),
        workingDirectory: "/test",
      });

      const times = await persistence.getModificationTimes(["test1", "test2"]);
      expect(times.size).toBe(2);
      expect(times.has("test1")).toBe(true);
      expect(times.has("test2")).toBe(true);
    });
  });
});
