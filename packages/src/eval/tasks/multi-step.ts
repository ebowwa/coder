/**
 * eval-task-multi-step.ts
 * Multi-step workflow capability tasks
 *
 * Tests complex workflows requiring multiple tool calls in sequence
 */

import type { EvalTask } from "../types.js";

/**
 * Task: Read and edit file in sequence
 * Category: multi_step_workflows
 * Level: run
 * Type: capability
 * AgentType: coding
 * Difficulty: medium
 */
export const multiStepReadEditTask: EvalTask = {
  id: "multi-step-read-edit",
  name: "Read file, then edit it",
  description: "Verify agent reads a file first, then makes targeted edits",
  category: "multi_step_workflows",
  level: "run",
  type: "capability",
  agentType: "coding",
  difficulty: "medium",
  input: {
    level: "run",
    prompt:
      "Read the file at /src/config.ts, then add a comment at the top describing the configuration module",
  },
  successCriteria: {
    criteria: [
      {
        id: "read-then-edit",
        target: { type: "tool_calls" },
        condition: { operator: "sequence" },
        expected: [
          { name: "Read", position: 0 },
          { name: "Edit", position: 1 },
        ],
        priority: 10,
      },
      {
        id: "comment-added",
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
    tags: ["multi-step", "read", "edit", "capability"],
    source: "handwritten",
    version: "1.0.0",
  },
};

/**
 * Task: Multiple files edited atomically
 * Category: multi_step_workflows
 * Level: run
 * Type: capability
 * AgentType: coding
 * Difficulty: "medium
 */
export const multiStepAtomicEditsTask: EvalTask = {
  id: "multi-step-atomic-edits",
  name: "Edit multiple files atomically",
  description: "Verify agent edits multiple files in a single turn",
  category: "multi_step_workflows",
  level: "run",
  type: "capability",
  agentType: "coding",
  difficulty: "medium",
  input: {
    level: "run",
    prompt:
      "Update the import statements in all TypeScript files in the src/ directory to use .js extension",
  },
  successCriteria: {
    criteria: [
      {
        id: "multiple-edits",
        target: { type: "tool_calls" },
        condition: { operator: "count" },
        expected: { min: 2 },
        priority: 10,
      },
      {
        id: "all-success",
        target: { type: "error_count" },
        condition: { operator: "equals" },
        expected: 0,
        priority: 5,
      },
    ],
    aggregation: "all",
    passingThreshold: 1,
  },
  metadata: {
    tags: ["multi-step", "atomic-edits", "capability"],
    source: "handwritten",
    version: "1.0.0",
  },
};
