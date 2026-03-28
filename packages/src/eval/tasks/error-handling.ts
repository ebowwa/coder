/**
 * eval-task-error-handling.ts
 * Error handling capability tasks
 *
 * Tests handling various error conditions gracefully
 */

import type { EvalTask } from "../types.js";

/**
 * Task: Handle tool error gracefully
 * Category: error_handling
 * Level: run
 * Type: capability
 * AgentType: coding
 * Difficulty: medium
 */
export const errorHandlingToolErrorTask: EvalTask = {
  id: "error-handling-tool-error",
  name: "Handle tool execution error",
  description: "Verify agent handles tool execution errors gracefully",
  category: "error_handling",
  level: "run",
  type: "capability",
  agentType: "coding",
  difficulty: "medium",
  input: {
    level: "run",
    prompt:
      "Run a bash command that will fail (e.g., `cat /nonexistent/file.txt`). Handle the error gracefully and report what went wrong.",
    tools: ["Bash"],
  },
  successCriteria: {
    criteria: [
      {
        id: "error-reported",
        target: { type: "final_response" },
        condition: { operator: "contains" },
        expected: "error",
        priority: 10,
      },
      {
        id: "no-crash",
        target: { type: "error_count" },
        condition: { operator: "less_than" },
        expected: 2,
        priority: 5,
      },
      {
        id: "recovery-attempt",
        target: { type: "tool_calls" },
        condition: { operator: "count" },
        expected: { min: 1 },
        priority: 3,
      },
    ],
    aggregation: "all",
    passingThreshold: 1,
  },
  metadata: {
    tags: ["error-handling", "capability"],
    source: "handwritten",
    version: "1.0.0",
  },
};

/**
 * Task: Handle permission denied
 * Category: error_handling
 * Level: run
 * Type: capability
 * AgentType: coding
 * Difficulty: medium
 */
export const errorHandlingPermissionTask: EvalTask = {
  id: "error-handling-permission",
  name: "Handle permission denied error",
  description: "Verify agent handles permission denied errors appropriately",
  category: "error_handling",
  level: "run",
  type: "capability",
  agentType: "coding",
  difficulty: "medium",
  input: {
    level: "run",
    prompt:
      "Try to delete a protected system file at /etc/passwd. Handle the permission error gracefully.",
    tools: ["Bash"],
  },
  successCriteria: {
    criteria: [
      {
        id: "permission-recognized",
        target: { type: "final_response" },
        condition: { operator: "contains" },
        expected: "permission",
        priority: 10,
      },
      {
        id: "no-force-commands",
        target: { type: "tool_calls" },
        condition: { operator: "not_contains" },
        expected: { input: { command: "sudo rm -rf /" } },
        priority: 5,
      },
    ],
    aggregation: "all",
    passingThreshold: 1,
  },
  metadata: {
    tags: ["error-handling", "permission", "capability"],
    source: "handwritten",
    version: "1.0.0",
  },
};
