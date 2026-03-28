/**
 * eval-task-basic-regression.ts
 * Regression tests for basic functionality
 *
 * Tests verify existing functionality continues't changes
 */

import type { EvalTask } from "../types.js";

/**
 * Task: File read regression
 * Category: regression
 * Level: run
 * Type: regression
 * AgentType: coding
 * Difficulty: easy
 */
export const regressionFileReadTask: EvalTask = {
  id: "regression-file-read",
  name: "File read still works",
  description: "Verify file reading functionality hasn't regressed",
  category: "regression",
  level: "run",
  type: "regression",
  agentType: "coding",
  difficulty: "easy",
  input: {
    level: "run",
    prompt: "Read the file package.json",
  },
  successCriteria: {
    criteria: [
      {
        id: "read-tool-called",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { name: "Read" },
        priority: 10,
      },
      {
        id: "content-returned",
        target: { type: "final_response" },
        condition: { operator: "contains" },
        expected: "dependencies",
        priority: 5,
      },
    ],
    aggregation: "all",
    passingThreshold: 1,
  },
  metadata: {
    tags: ["regression", "read", "basic"],
    source: "handwritten",
    version: "1.0.0",
  },
};

/**
 * Task: File edit regression
 * Category: regression
 * Level: run
 * Type: regression
 * AgentType: coding
 * Difficulty: easy
 */
export const regressionFileEditTask: EvalTask = {
  id: "regression-file-edit",
  name: "File edit still works",
  description: "Verify file editing functionality hasn't regressed",
  category: "regression",
  level: "run",
  type: "regression",
  agentType: "coding",
  difficulty: "easy",
  input: {
    level: "run",
    prompt:
      "Add a comment '// This is a test comment' to the top of the file at /test/fixtures/sample.ts. If the file doesn't exist, create it.",
  },
  successCriteria: {
    criteria: [
      {
        id: "edit-tool-called",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { name: "Edit" },
        priority: 10,
      },
      {
        id: "file-modified",
        target: { type: "file_changes" },
        condition: { operator: "contains" },
        expected: { action: "modify" },
        priority: 5,
      },
    ],
    aggregation: "all",
    passingThreshold: 1,
  },
  metadata: {
    tags: ["regression", "edit", "basic"],
    source: "handwritten",
    version: "1.0.0",
  },
};

/**
 * Task: Session persistence regression
 * Category: regression
 * Level: run
 * Type: regression
 * AgentType: coding
 * Difficulty: medium
 */
export const regressionSessionPersistenceTask: EvalTask = {
  id: "regression-session-persistence",
  name: "Session persistence still works",
  description: "Verify session data is correctly persisted",
  category: "regression",
  level: "run",
  type: "regression",
  agentType: "coding",
  difficulty: "medium",
  input: {
    level: "run",
    prompt:
      "Start a session, save some messages, and verify that the session data can be loaded back.",
  },
  successCriteria: {
    criteria: [
      {
        id: "session-created",
        target: { type: "state_changes" },
        condition: { operator: "contains" },
        expected: "session_initialized",
        priority: 10,
      },
    ],
    aggregation: "all",
    passingThreshold: 1,
  },
  metadata: {
    tags: ["regression", "session", "persistence"],
    source: "handwritten",
    version: "1.0.0",
  },
};
