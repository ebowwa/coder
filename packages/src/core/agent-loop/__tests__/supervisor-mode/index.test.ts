/**
 * Supervisor Tests
 *
 * Tests for the native supervision mode that executes sequential tasks.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, readFileSync, unlinkSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  parseTaskFile,
  writeTaskFile,
} from "../../../parsers/task-file.js";
import {
  runSupervisorMode,
  type SupervisorOptions,
  type TaskPhase,
} from "../../supervisor-mode.js";
import type { CLIArgs } from "../../../../interfaces/ui/terminal/shared/args.js";
import type { SessionSetup } from "../../../../interfaces/ui/terminal/shared/setup.js";
import type { SessionStore } from "../../../session-store.js";

// Test utilities
const testDir = join(tmpdir(), `supervisor-test-${Date.now()}`);
const testTaskFile = join(testDir, "tasks.txt");
const testSuperviseFile = "/tmp/supervise-test.txt";

function setupTestEnvironment(): void {
  mkdirSync(testDir, { recursive: true });
  writeFileSync(testSuperviseFile, "hello from supervisor", "utf-8");
}

function cleanupTestEnvironment(): void {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
  if (existsSync(testSuperviseFile)) {
    unlinkSync(testSuperviseFile);
  }
}

// Mock dependencies
const mockArgs: CLIArgs = {
  model: "test-model",
  permissionMode: "bypassPermissions",
  enableWebSocket: false,
  longRunning: false,
};

const mockSetup: SessionSetup = {
  permissionMode: "bypassPermissions",
  tools: [],
  hookManager: {
    registerBeforeToolUse: () => {},
    registerAfterToolUse: () => {},
    registerBeforeResponse: () => {},
    registerAfterResponse: () => {},
  },
  pluginRegistry: { size: 0, listPlugins: () => ({ enabled: [], disabled: [], errors: [] }) },
};

const mockSystemPrompt = "Test system prompt";

const mockSessionStore: SessionStore = {
  createSession: async () => `test-session-${Date.now()}`,
  loadSession: async () => null,
  saveMessage: async () => {},
  listSessions: async () => [],
  deleteSession: async () => {},
};

describe("Supervisor", () => {
  describe("parseTaskFile", () => {
    beforeEach(() => {
      setupTestEnvironment();
    });

    afterEach(() => {
      cleanupTestEnvironment();
    });

    it("should parse a valid task file", () => {
      const content = `# Comment line
1|pending|Fix TypeScript errors
2|complete|Already done task
3|pending|Add integration tests
`;
      writeFileSync(testTaskFile, content, "utf-8");

      const tasks = parseTaskFile(testTaskFile);

      expect(tasks).toHaveLength(3);
      expect(tasks[0]).toEqual({
        phase: 1,
        status: "pending",
        description: "Fix TypeScript errors",
      });
      expect(tasks[1]).toEqual({
        phase: 2,
        status: "complete",
        description: "Already done task",
      });
      expect(tasks[2]).toEqual({
        phase: 3,
        status: "pending",
        description: "Add integration tests",
      });
    });

    it("should handle empty lines and comments", () => {
      const content = `
# This is a comment
1|pending|Task 1

# Another comment
2|pending|Task 2
`;
      writeFileSync(testTaskFile, content, "utf-8");

      const tasks = parseTaskFile(testTaskFile);

      expect(tasks).toHaveLength(2);
    });

    it("should sort tasks by phase number", () => {
      const content = `3|pending|Task 3
1|pending|Task 1
2|pending|Task 2
`;
      writeFileSync(testTaskFile, content, "utf-8");

      const tasks = parseTaskFile(testTaskFile);

      expect(tasks[0].phase).toBe(1);
      expect(tasks[1].phase).toBe(2);
      expect(tasks[2].phase).toBe(3);
    });

    it("should throw error if file does not exist", () => {
      expect(() => parseTaskFile("/nonexistent/file.txt")).toThrow("Task file not found");
    });

    it("should handle descriptions with pipes", () => {
      const content = `1|pending|Fix error in src/api|routes.ts| line 42`;
      writeFileSync(testTaskFile, content, "utf-8");

      const tasks = parseTaskFile(testTaskFile);

      expect(tasks[0].description).toBe("Fix error in src/api|routes.ts| line 42");
    });
  });

  describe("writeTaskFile", () => {
    beforeEach(() => {
      setupTestEnvironment();
    });

    afterEach(() => {
      cleanupTestEnvironment();
    });

    it("should write tasks to file", () => {
      const tasks: TaskPhase[] = [
        { phase: 1, status: "pending", description: "Task 1" },
        { phase: 2, status: "complete", description: "Task 2" },
      ];

      writeTaskFile(testTaskFile, tasks);

      const content = readFileSync(testTaskFile, "utf-8");
      expect(content).toBe("1|pending|Task 1\n2|complete|Task 2\n");
    });

    it("should handle special characters in descriptions", () => {
      const tasks: TaskPhase[] = [
        { phase: 1, status: "pending", description: "Task with 'quotes' and \"double quotes\"" },
      ];

      writeTaskFile(testTaskFile, tasks);

      const content = readFileSync(testTaskFile, "utf-8");
      expect(content).toContain("Task with 'quotes' and \"double quotes\"");
    });
  });

  describe("Integration: Read supervise test file", () => {
    beforeEach(() => {
      setupTestEnvironment();
    });

    afterEach(() => {
      cleanupTestEnvironment();
    });

    it("should read /tmp/supervise-test.txt and verify it contains 'hello from supervisor'", () => {
      // Verify the test file exists and contains the expected content
      expect(existsSync(testSuperviseFile)).toBe(true);

      const content = readFileSync(testSuperviseFile, "utf-8");
      expect(content).toBe("hello from supervisor");
      expect(content).toContain("hello from supervisor");
    });

    it("should verify the exact content matches", () => {
      const content = readFileSync(testSuperviseFile, "utf-8");

      // Check exact match
      expect(content.trim()).toBe("hello from supervisor");

      // Check contains
      expect(content).toContain("hello from supervisor");

      // Check with regex
      expect(content).toMatch(/hello from supervisor/);
    });

    it("should handle reading the file multiple times", () => {
      const read1 = readFileSync(testSuperviseFile, "utf-8");
      const read2 = readFileSync(testSuperviseFile, "utf-8");

      expect(read1).toBe(read2);
      expect(read1).toBe("hello from supervisor");
    });
  });

  describe("Task file round-trip", () => {
    beforeEach(() => {
      setupTestEnvironment();
    });

    afterEach(() => {
      cleanupTestEnvironment();
    });

    it("should preserve task data through parse-write cycle", () => {
      const originalTasks: TaskPhase[] = [
        { phase: 1, status: "pending", description: "First task" },
        { phase: 2, status: "complete", description: "Second task" },
        { phase: 3, status: "failed", description: "Third task" },
      ];

      // Write tasks
      writeTaskFile(testTaskFile, originalTasks);

      // Parse them back
      const parsedTasks = parseTaskFile(testTaskFile);

      // Verify they match
      expect(parsedTasks).toEqual(originalTasks);
    });
  });

  describe("Supervisor workflow integration", () => {
    beforeEach(() => {
      setupTestEnvironment();
    });

    afterEach(() => {
      cleanupTestEnvironment();
    });

    it("should create a valid task file for supervisor mode", () => {
      const tasks: TaskPhase[] = [
        { phase: 1, status: "pending", description: 'Read /tmp/supervise-test.txt and verify it contains "hello from supervisor"' },
      ];

      writeTaskFile(testTaskFile, tasks);

      const parsed = parseTaskFile(testTaskFile);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].description).toContain('Read /tmp/supervise-test.txt');
      expect(parsed[0].description).toContain('hello from supervisor');
    });
  });
});
