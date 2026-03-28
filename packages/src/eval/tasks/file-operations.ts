/**
 * eval-task-file-operations.ts
 * File operations capability tasks
 *
 * Tests reading files, writing content, checking imports, identifying unused code
 */

import type { EvalTask } from "../types.js";
import type { SuccessCriterion } from "../types.js";

/**
 * Task: Read file and identify its imports
 * Category: file_operations
 * Level: run
 * Type: capability
 * AgentType: coding
 * Difficulty: easy
 *
 * Success Criteria:
 * 1. File exists after read attempt
 * 2. File content was returned
 * 3. Unused imports identified
 */
export const fileOperationsReadTask: EvalTask = {
  id: "file-operations-read",
  name: "Read file and identify imports",
  description: "Read a TypeScript file and identify its import statements",
  category: "file_operations",
  level: "run",
  type: "capability",
  agentType: "coding",
  difficulty: "easy",
  input: {
    level: "run",
    prompt: "Read the file at /test/fixtures/example.ts. If it doesn't exist, report an error. Then identify all import statements and the file.",
  },
  successCriteria: {
    criteria: [
      {
        id: "file-read",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { name: "Read" },
        priority: 10,
      },
      {
        id: "file-exists",
        target: { type: "final_response" },
        condition: { operator: "not_contains" },
        expected: "error",
        priority: 5,
      },
      {
        id: "imports-detected",
        target: { type: "final_response" },
        condition: { operator: "contains" },
        expected: "import",
        priority: 3,
      },
    ],
    aggregation: "all",
    passingThreshold: 1,
  },
  metadata: {
    tags: ["file-operations", "read", "imports", "capability"],
    source: "handwritten",
    version: "1.0.0",
  },
};
