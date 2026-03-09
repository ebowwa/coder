/**
 * Tests for TeammateModeRunner
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "bun:test";
import { TeammateModeRunner, getTeammateRunner, setTeammateRunner, isTeammateModeActive } from "./runner.js";
import type { TeammateModeConfig } from "./runner.js";

// Mock TeammateManager
vi.mock("./index.js", () => ({
  TeammateManager: vi.fn().mockImplementation(() => ({
    getTeam: vi.fn(() => null),
    createTeam: vi.fn((config) => ({ ...config, teammates: [] })),
    getTeammate: vi.fn(() => null),
    addTeammate: vi.fn(),
    updateTeammateStatus: vi.fn(),
    persistAllTeams: vi.fn(),
    getMessages: vi.fn(() => []),
    sendDirect: vi.fn(),
    broadcast: vi.fn(),
    injectUserMessageToTeammate: vi.fn(),
    getInboxStats: vi.fn(() => ({ pending: 0, processed: 0 })),
    waitForTeammatesToBecomeIdle: vi.fn(() => ({ success: true, timedOut: false, statuses: {} })),
  })),
  generateTeammateId: vi.fn(() => "test-teammate-id"),
}));

describe("TeammateModeRunner", () => {
  let runner: TeammateModeRunner;
  let config: TeammateModeConfig;

  beforeEach(() => {
    config = {
      teamName: "test-team",
      workingDirectory: "/tmp/test",
      pollInterval: 100, // Fast polling for tests
    };
    runner = new TeammateModeRunner(config);
    vi.useFakeTimers();
  });

  afterEach(async () => {
    if (runner.isActive()) {
      await runner.stop();
    }
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with correct default state", () => {
      expect(runner.isActive()).toBe(false);
      expect(runner.getStatus()).toBe("pending");
      expect(runner.getTeammate()).toBe(null);
      expect(runner.getTeam()).toBe(null);
    });
  });

  describe("start", () => {
    it("should start teammate mode successfully", async () => {
      const teammate = await runner.start();

      expect(runner.isActive()).toBe(true);
      expect(runner.getStatus()).toBe("in_progress");
      expect(teammate.teamName).toBe("test-team");
      // Status comes from local state, not the returned teammate object
      expect(runner.getStatus()).toBe("in_progress");
    });

    it("should throw if already active", async () => {
      await runner.start();

      await expect(runner.start()).rejects.toThrow("Teammate mode already active");
    });

    it("should use provided agent config", async () => {
      const customConfig: TeammateModeConfig = {
        ...config,
        // Don't provide agentId - that requires an existing teammate
        agentName: "Custom Agent",
        agentColor: "red",
        prompt: "Test prompt",
      };
      const customRunner = new TeammateModeRunner(customConfig);

      const teammate = await customRunner.start();

      expect(teammate.name).toBe("Custom Agent");
      expect(teammate.color).toBe("red");
      expect(teammate.prompt).toBe("Test prompt");

      await customRunner.stop();
    });
  });

  describe("stop", () => {
    it("should stop teammate mode", async () => {
      await runner.start();
      await runner.stop();

      expect(runner.isActive()).toBe(false);
      expect(runner.getStatus()).toBe("idle");
    });

    it("should be idempotent", async () => {
      await runner.start();
      await runner.stop();
      await runner.stop(); // Should not throw

      expect(runner.isActive()).toBe(false);
    });
  });

  describe("message polling", () => {
    it("should have pending messages methods", async () => {
      await runner.start();

      expect(runner.hasPendingMessages()).toBe(false);
      expect(runner.getPendingMessages()).toEqual([]);
      expect(runner.peekPendingMessages()).toEqual([]);
    });
  });

  describe("idle detection", () => {
    it("should start with non-idle status", async () => {
      await runner.start();

      expect(runner.getStatus()).toBe("in_progress");
    });

    it("should report activity", async () => {
      await runner.start();

      runner.reportActivity();

      expect(runner.getStatus()).toBe("in_progress");
    });
  });

  describe("messaging", () => {
    it("should throw when sending without active teammate", async () => {
      expect(() => runner.sendDirectMessage("target", "hello")).toThrow("Teammate mode not active");
      expect(() => runner.broadcast("hello")).toThrow("Teammate mode not active");
      expect(() => runner.injectUserMessage("hello")).toThrow("Teammate mode not active");
    });
  });

  describe("status & info", () => {
    it("should return teammate after start", async () => {
      await runner.start();

      const teammate = runner.getTeammate();
      expect(teammate).not.toBe(null);
      expect(teammate?.teamName).toBe("test-team");
    });

    it("should return team after start", async () => {
      await runner.start();

      const team = runner.getTeam();
      expect(team).not.toBe(null);
      expect(team?.name).toBe("test-team");
    });

    it("should return inbox stats", async () => {
      await runner.start();

      const stats = runner.getInboxStats();
      expect(stats).toEqual({ pending: 0, processed: 0 });
    });

    it("should return team members", async () => {
      await runner.start();

      const members = runner.getTeamMembers();
      expect(Array.isArray(members)).toBe(true);
    });
  });

  describe("task integration", () => {
    it("should report task complete", async () => {
      await runner.start();
      expect(runner.getStatus()).toBe("in_progress");

      // reportTaskComplete calls updateStatus("completed")
      runner.reportTaskComplete("task-123", "Test Task");

      // Verify status changed to completed
      const status = runner.getStatus();
      expect(status).toBe("completed");
    });

    it("should report task failed", async () => {
      await runner.start();
      expect(runner.getStatus()).toBe("in_progress");

      runner.reportTaskFailed("task-123", "Test Task", "Something went wrong");

      const status = runner.getStatus();
      expect(status).toBe("failed");
    });

    it("should request task", async () => {
      await runner.start();

      runner.requestTask();

      expect(runner.getStatus()).toBe("idle");
    });
  });
});

describe("Global runner functions", () => {
  afterEach(() => {
    setTeammateRunner(null);
  });

  it("should return null when no global runner set", () => {
    expect(getTeammateRunner()).toBe(null);
    expect(isTeammateModeActive()).toBe(false);
  });

  it("should set and get global runner", () => {
    const config: TeammateModeConfig = {
      teamName: "global-test",
      workingDirectory: "/tmp/test",
    };
    const runner = new TeammateModeRunner(config);

    setTeammateRunner(runner);

    expect(getTeammateRunner()).toBe(runner);
    expect(isTeammateModeActive()).toBe(false); // Not started yet
  });
});
