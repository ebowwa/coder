/**
 * eval-task-code-review.ts
 * Code review and analysis capability tasks
 *
 * Tests analyzing, reviewing, and understanding codebases
 * Based on patterns found in real session data
 */

import type { EvalTask } from "../types.js";

/**
 * Task: Analyze codebase structure
 * Category: code_review
 * Level: thread
 * Type: capability
 * AgentType: coding
 * Difficulty: medium
 *
 * Pattern: User asks for codebase analysis
 * Source: Real session "Review YOURSELF - this codebase. Read src/core/*.ts files"
 */
export const codeReviewStructureTask: EvalTask = {
  id: "code-review-structure",
  name: "Analyze codebase structure",
  description: "Verify agent analyzes codebase structure correctly",
  category: "code_review",
  level: "thread",
  type: "capability",
  agentType: "coding",
  difficulty: "medium",
  input: {
    level: "thread",
    prompt: "List all TypeScript files in the src directory and describe the codebase structure",
  },
  successCriteria: {
    criteria: [
      {
        id: "uses-glob-tool",
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
        priority: 8,
      },
      {
        id: "provides-summary",
        target: { type: "final_response" },
        condition: { operator: "contains_any" },
        expected: ["structure", "files", "directory", "codebase"],
        priority: 5,
      },
    ],
    aggregation: "any",
    passingThreshold: 0.7,
  },
  metadata: {
    tags: ["code-review", "analysis", "structure", "capability"],
    source: "session-derived",
    version: "1.0.0",
  },
};

/**
 * Task: Identify imports in file
 * Category: code_review
 * Level: run
 * Type: capability
 * AgentType: coding
 * Difficulty: easy
 *
 * Pattern: User asks to identify imports
 * Source: Real session "identify all import statements"
 */
export const codeReviewImportsTask: EvalTask = {
  id: "code-review-imports",
  name: "Identify imports in file",
  description: "Verify agent identifies import statements in a file",
  category: "code_review",
  level: "run",
  type: "capability",
  agentType: "coding",
  difficulty: "easy",
  input: {
    level: "run",
    prompt: "Read the file at /test/fixtures/example.ts and identify all import statements",
    setupSteps: [
      {
        action: "create_file",
        path: "/test/fixtures/example.ts",
        content: `import { foo } from './foo.js';
import { bar } from './bar.js';
import * as baz from './baz.js';

export const example = () => {
  console.log(foo, bar, baz);
};`,
      },
    ],
  },
  successCriteria: {
    criteria: [
      {
        id: "reads-file",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { name: "Read" },
        priority: 10,
      },
      {
        id: "identifies-imports",
        target: { type: "final_response" },
        condition: { operator: "contains" },
        expected: "import",
        priority: 8,
      },
      {
        id: "lists-sources",
        target: { type: "final_response" },
        condition: { operator: "contains_any" },
        expected: ["foo.js", "bar.js", "baz.js"],
        priority: 5,
      },
    ],
    aggregation: "all",
    passingThreshold: 1,
  },
  metadata: {
    tags: ["code-review", "imports", "analysis", "capability"],
    source: "session-derived",
    version: "1.0.0",
  },
};

/**
 * Task: Code quality assessment
 * Category: code_review
 * Level: thread
 * Type: capability
 * AgentType: coding
 * Difficulty: hard
 *
 * Pattern: User asks for quality review
 * Source: Real session "provide code quality assessment"
 */
export const codeReviewQualityTask: EvalTask = {
  id: "code-review-quality",
  name: "Code quality assessment",
  description: "Verify agent provides meaningful code quality assessment",
  category: "code_review",
  level: "thread",
  type: "capability",
  agentType: "coding",
  difficulty: "hard",
  input: {
    level: "thread",
    prompt: "Review the codebase and provide: 1) Code quality assessment 2) Architecture review 3) Bug/issue detection. Be critical and thorough.",
  },
  successCriteria: {
    criteria: [
      {
        id: "uses-appropriate-tools",
        target: { type: "tool_calls" },
        condition: { operator: "count_min" },
        expected: 2, // At least 2 tool calls (reading files, etc.)
        priority: 10,
      },
      {
        id: "mentions-quality",
        target: { type: "final_response" },
        condition: { operator: "contains_any" },
        expected: ["quality", "code", "review", "assessment"],
        priority: 8,
      },
      {
        id: "mentions-architecture",
        target: { type: "final_response" },
        condition: { operator: "contains_any" },
        expected: ["architecture", "structure", "design", "pattern"],
        priority: 8,
      },
      {
        id: "mentions-issues",
        target: { type: "final_response" },
        condition: { operator: "contains_any" },
        expected: ["bug", "issue", "problem", "concern", "error"],
        priority: 5,
      },
    ],
    aggregation: "any",
    passingThreshold: 0.6,
  },
  metadata: {
    tags: ["code-review", "quality", "architecture", "capability"],
    source: "session-derived",
    version: "1.0.0",
  },
};

/**
 * Task: Describe function purpose
 * Category: code_review
 * Level: run
 * Type: capability
 * AgentType: coding
 * Difficulty: easy
 *
 * Pattern: User asks to describe what a function does
 * Source: Real session "describe what each function does in detail"
 */
export const codeReviewFunctionTask: EvalTask = {
  id: "code-review-function",
  name: "Describe function purpose",
  description: "Verify agent describes function purpose accurately",
  category: "code_review",
  level: "run",
  type: "capability",
  agentType: "coding",
  difficulty: "easy",
  input: {
    level: "run",
    prompt: "Read the file at /test/fixtures/math.ts and describe what each function does",
    setupSteps: [
      {
        action: "create_file",
        path: "/test/fixtures/math.ts",
        content: `export function add(a: number, b: number): number {
  return a + b;
}

export function multiply(a: number, b: number): number {
  return a * b;
}

export function factorial(n: number): number {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}`,
      },
    ],
  },
  successCriteria: {
    criteria: [
      {
        id: "reads-file",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { name: "Read" },
        priority: 10,
      },
      {
        id: "describes-functions",
        target: { type: "final_response" },
        condition: { operator: "contains_any" },
        expected: ["add", "multiply", "factorial"],
        priority: 8,
      },
      {
        id: "explains-purpose",
        target: { type: "final_response" },
        condition: { operator: "contains_any" },
        expected: ["returns", "calculates", "computes", "function"],
        priority: 5,
      },
    ],
    aggregation: "all",
    passingThreshold: 1,
  },
  metadata: {
    tags: ["code-review", "function", "analysis", "capability"],
    source: "session-derived",
    version: "1.0.0",
  },
};
