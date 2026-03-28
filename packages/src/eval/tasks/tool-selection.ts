/**
 * eval-task-tool-selection.ts
 * Tool selection and error handling capability tasks
 *
 * Tests selecting appropriate tools for different tasks
 */

import type { EvalTask } from "../types.js";

import type { SuccessCriterion } from "../types.js";

/**
 * Task: Choose correct tool for file read
 * Category: tool_selection
 * Level: run
 * Type: capability
 * AgentType: coding
 * Difficulty: easy
 */
export const toolSelectionReadTask: EvalTask = {
  id: "tool-selection-read",
  name: "Choose Read tool for file operations",
  description: "Verify agent chooses Read tool when asked to read a file",
  category: "tool_selection",
  level: "run",
  type: "capability",
  agentType: "coding",
  difficulty: "easy",
  input: {
    level: "run",
    prompt: "Read the contents of the file at /src/index.ts",
  },
  successCriteria: {
    criteria: [
      {
        id: "read-tool-used",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { name: "Read" },
        priority: 10,
      },
      {
        id: "correct-file-path",
        target: { type: "tool_calls" },
        condition: { operator: "equals" },
        expected: { input: { file_path: "/src/index.ts" } },
        priority: 5,
      },
    ],
    aggregation: "all",
    passingThreshold: 1,
  },
  metadata: {
    tags: ["tool-selection", "read", "capability"],
    source: "handwritten",
    version: "1.0.0",
  },
};

/**
 * Task: Choose Glob for file search
 * Category: tool_selection
 * Level: run
 * Type: capability
 * AgentType: coding
 * Difficulty: easy
 */
export const toolSelectionGlobTask: EvalTask = {
  id: "tool-selection-glob",
  name: "Choose Glob tool for file pattern search",
  description: "Verify agent chooses Glob tool when searching for files by pattern",
  category: "tool_selection",
  level: "run",
  type: "capability",
  agentType: "coding",
  difficulty: "easy",
  input: {
    level: "run",
    prompt: "Find all TypeScript files in the src directory",
  },
  successCriteria: {
    criteria: [
      {
        id: "glob-tool-used",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { name: "Glob" },
        priority: 10,
      },
      {
        id: "correct-pattern",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { input: { pattern: "**/*.ts" } },
        priority: 5,
      },
    ],
    aggregation: "all",
    passingThreshold: 1,
  },
  metadata: {
    tags: ["tool-selection", "glob", "capability"],
    source: "handwritten",
    version: "1.0.0",
  },
};

/**
 * Task: Handle tool error gracefully
 * Category: error_handling
 * Level: run
 * Type: capability
 * AgentType: coding
 * Difficulty: medium
 */
export const errorHandlingTask: EvalTask = {
  id: "error-handling-read-nonexistent",
  name: "Handle non-existent file error",
  description: "Verify agent handles error when reading a file that doesn't exist",
  category: "error_handling",
  level: "run",
  type: "capability",
  agentType: "coding",
  difficulty: "medium",
  input: {
    level: "run",
    prompt: "Read the file at /nonexistent/path/to/file.ts",
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
