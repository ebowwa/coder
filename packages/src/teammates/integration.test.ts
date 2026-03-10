/**
 * Integration test for teammate coordination
 * Tests: long horizon, cohesion, assignment completion
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { TeammateManager } from "./index.js";
import { TeammateModeRunner, setTeammateRunner } from "./runner.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const TEAMS_DIR = path.join(os.homedir(), ".claude", "teams");
const TEST_TEAM = `integration-test-${Date.now()}`;

function cleanupTestTeam() {
  const teamPath = path.join(TEAMS_DIR, TEST_TEAM);
  if (fs.existsSync(teamPath)) {
    fs.rmSync(teamPath, { recursive: true, force: true });
  }
}

describe("Teammate Integration Tests", () => {
  let manager: TeammateManager;

  beforeEach(() => {
    cleanupTestTeam();
    manager = new TeammateManager();
  });

  afterEach(() => {
    cleanupTestTeam();
    setTeammateRunner(null);
  });

  describe("Long Horizon - Extended Operation", () => {
    it("should maintain state over multiple operations", async () => {
      // Create team
      const team = manager.createTeam({
        name: TEST_TEAM,
        description: "Long horizon test team",
        teammates: [],
        taskListId: `${TEST_TEAM}-tasks`,
        coordination: {
          dependencyOrder: [],
          communicationProtocol: "broadcast",
          taskAssignmentStrategy: "manual",
        },
      });

      // Create teammate
      const runner = new TeammateModeRunner({
        teamName: TEST_TEAM,
        agentName: "long-horizon-agent",
        agentColor: "green",
        workingDirectory: process.cwd(),
        pollInterval: 100,
      });

      await runner.start();
      setTeammateRunner(runner);

      // Simulate long horizon: multiple status updates
      expect(runner.getStatus()).toBe("in_progress");

      runner.reportActivity();
      expect(runner.getStatus()).toBe("in_progress");

      // Complete a task
      runner.reportTaskComplete("task-1", "First task");
      expect(runner.getStatus()).toBe("completed");

      // Request new task (resets to idle)
      runner.requestTask();
      expect(runner.getStatus()).toBe("idle");

      // Report activity again (should flip to in_progress)
      runner.reportActivity();
      expect(runner.getStatus()).toBe("in_progress");

      // Fail a task
      runner.reportTaskFailed("task-2", "Second task", "Test failure");
      expect(runner.getStatus()).toBe("failed");

      await runner.stop();
      expect(runner.getStatus()).toBe("idle");
    });

    it("should persist team state across operations", async () => {
      const runner = new TeammateModeRunner({
        teamName: TEST_TEAM,
        agentName: "persist-agent",
        workingDirectory: process.cwd(),
        pollInterval: 100,
      });

      await runner.start();

      // Verify teammate was added to team
      const teammate = runner.getTeammate();
      expect(teammate).not.toBe(null);
      expect(teammate?.name).toBe("persist-agent");

      // Stop and restart
      await runner.stop();

      // Create new runner with same team
      const runner2 = new TeammateModeRunner({
        teamName: TEST_TEAM,
        agentName: "persist-agent-2",
        workingDirectory: process.cwd(),
        pollInterval: 100,
      });

      await runner2.start();

      // Team should have both teammates now
      const members = runner2.getTeamMembers();
      expect(members.length).toBe(2);

      await runner2.stop();
    });
  });

  describe("Cohesion - Multi-Agent Coordination", () => {
    it("should support multiple teammates in same team", async () => {
      // Create first teammate
      const runner1 = new TeammateModeRunner({
        teamName: TEST_TEAM,
        agentName: "coordinator",
        agentColor: "blue",
        workingDirectory: process.cwd(),
        pollInterval: 100,
      });

      await runner1.start();

      // Wait for persistence to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      // Create second teammate (will load team from disk)
      const runner2 = new TeammateModeRunner({
        teamName: TEST_TEAM,
        agentName: "worker",
        agentColor: "orange",
        workingDirectory: process.cwd(),
        pollInterval: 100,
      });

      await runner2.start();

      // Wait for persistence
      await new Promise(resolve => setTimeout(resolve, 50));

      // Both should see each other
      const members1 = runner1.getTeamMembers();
      const members2 = runner2.getTeamMembers();

      // runner1 sees itself (in memory) + runner2 (loaded from disk)
      expect(members1.length).toBeGreaterThanOrEqual(1);
      // runner2 sees itself (in memory) + runner1 (loaded from disk)
      expect(members2.length).toBeGreaterThanOrEqual(1);

      // Verify coordinator and worker are both in the team
      const allNames = new Set([...members1, ...members2].map(m => m.name));
      expect(allNames.has("coordinator")).toBe(true);
      expect(allNames.has("worker")).toBe(true);

      await runner1.stop();
      await runner2.stop();
    });

    it("should support broadcast messages", async () => {
      const runner1 = new TeammateModeRunner({
        teamName: TEST_TEAM,
        agentName: "broadcaster",
        workingDirectory: process.cwd(),
        pollInterval: 100,
      });

      await runner1.start();

      // Broadcast should not throw
      runner1.broadcast("Attention all teammates!");

      await runner1.stop();
    });
  });

  describe("Assignment Completion", () => {
    it("should track task completion workflow", async () => {
      const runner = new TeammateModeRunner({
        teamName: TEST_TEAM,
        agentName: "task-worker",
        workingDirectory: process.cwd(),
        pollInterval: 100,
      });

      await runner.start();

      // Initial status
      expect(runner.getStatus()).toBe("in_progress");

      // Complete task
      runner.reportTaskComplete("assignment-1", "Complete integration tests");
      expect(runner.getStatus()).toBe("completed");

      // Request new assignment
      runner.requestTask();
      expect(runner.getStatus()).toBe("idle");

      await runner.stop();
    });

    it("should track task failure and recovery", async () => {
      const runner = new TeammateModeRunner({
        teamName: TEST_TEAM,
        agentName: "failing-worker",
        workingDirectory: process.cwd(),
        pollInterval: 100,
      });

      await runner.start();

      // Fail task
      runner.reportTaskFailed("assignment-2", "Risky task", "Dependencies not met");
      expect(runner.getStatus()).toBe("failed");

      // Recover by requesting new task
      runner.requestTask();
      expect(runner.getStatus()).toBe("idle");

      await runner.stop();
    });
  });

  describe("Inbox Management", () => {
    it("should track inbox stats", async () => {
      const runner = new TeammateModeRunner({
        teamName: TEST_TEAM,
        agentName: "inbox-worker",
        workingDirectory: process.cwd(),
        pollInterval: 100,
      });

      await runner.start();

      const stats = runner.getInboxStats();
      expect(stats).toHaveProperty("pending");
      expect(stats).toHaveProperty("processed");

      await runner.stop();
    });

    it("should check for pending messages", async () => {
      const runner = new TeammateModeRunner({
        teamName: TEST_TEAM,
        agentName: "message-checker",
        workingDirectory: process.cwd(),
        pollInterval: 100,
      });

      await runner.start();

      expect(runner.hasPendingMessages()).toBe(false);
      expect(runner.getPendingMessages()).toEqual([]);
      expect(runner.peekPendingMessages()).toEqual([]);

      await runner.stop();
    });
  });
});
