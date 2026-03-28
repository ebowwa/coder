/**
 * eval-task-import-detection.ts
 * Import detection and optimization tasks
 *
 * Tests detecting unnecessary imports and suggesting optimizations
 */

import type { EvalTask } from "../types.js";

/**
 * Task: Detect unused imports
 * Category: import_detection
 * Level: run
 * Type: capability
 * AgentType: coding
 * Difficulty: "medium
 */
export const importDetectionTask: EvalTask = {
  id: "import-detection-unused",
  name: "Detect unused imports in code",
  description: "Verify agent identifies and removes unused import statements",
  category: "import_detection",
  level: "run",
  type: "capability",
  agentType: "coding",
  difficulty: "medium",
  input: {
    level: "run",
    prompt:
      "Analyze the codebase and identify any unused imports. Remove them to clean up the code.",
    tools: ["Read", "Glob", "Grep", "Edit"],
  },
  successCriteria: {
    criteria: [
      {
        id: "imports-analyzed",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { name: "Grep" },
        priority: 10,
      },
      {
        id: "files-modified",
        target: { type: "file_changes" },
        condition: { operator: "contains" },
        expected: { action: "modify" },
        priority: 5,
      },
      {
        id: "no-broken-imports",
        target: { type: "error_count" },
        condition: { operator: "equals" },
        expected: 0,
        priority: 3,
      },
    ],
    aggregation: "all",
    passingThreshold: 1,
  },
  metadata: {
    tags: ["import-detection", "code-quality", "capability"],
    source: "handwritten",
    version: "1.0.0",
  },
};
