/**
 * eval-task-context-compaction.ts
 * Context compaction capability tasks
 *
 * Tests context window management and compaction behavior
 */

import type { EvalTask } from "../types.js";

/**
 * Task: Context compaction triggered
 * Category: context_compaction
 * Level: run
 * Type: capability
 * AgentType: coding
 * Difficulty: hard
 */
export const contextCompactionTask: EvalTask = {
  id: "context-compaction-triggered",
  name: "Trigger context compaction when approaching limit",
  description: "Verify agent correctly triggers compaction when context is near limit",
  category: "context_compaction",
  level: "run",
  type: "capability",
  agentType: "coding",
  difficulty: "hard",
  input: {
    level: "run",
    prompt:
      "Process a very large file (simulate by reading multiple files in sequence until context approaches limit). The agent should trigger compaction.",
    tools: ["Read", "Bash"],
  },
  successCriteria: {
    criteria: [
      {
        id: "compaction-triggered",
        target: { type: "state_changes" },
        condition: { operator: "contains" },
        expected: "compaction",
        priority: 10,
      },
      {
        id: "context-preserved",
        target: { type: "final_response" },
        condition: { operator: "contains" },
        expected: "summary",
        priority: 5,
      },
    ],
    aggregation: "all",
    passingThreshold: 1,
  },
  metadata: {
    tags: ["context-compaction", "token-management", "capability"],
    source: "handwritten",
    version: "1.0.0",
  },
};
