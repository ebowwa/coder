/**
 * eval-task-multi-step-workflows.ts
 * Multi-step workflow capability tasks
 *
 * Tests complex workflows requiring multiple tool calls
 * Based on patterns found in real session data
 */

import type { EvalTask } from "../types.js";

/**
 * Task: Create HTML website
 * Category: multi_step_workflow
 * Level: trace
 * Type: capability
 * AgentType: coding
 * Difficulty: hard
 *
 * Pattern: User asks to create a multi-file project
 * Source: Real session "create a simple HTML website with a landing page"
 */
export const multiStepCreateWebsiteTask: EvalTask = {
  id: "multi-step-create-website",
  name: "Create HTML website with landing page",
  description: "Verify agent creates a multi-file website correctly",
  category: "multi_step_workflow",
  level: "trace",
  type: "capability",
  agentType: "coding",
  difficulty: "hard",
  input: {
    level: "trace",
    prompt: "Create a simple HTML website with a landing page in a new folder called 'test-site'. Include: index.html with a hero section, features section, and footer. Use modern CSS styling embedded in a style tag.",
  },
  successCriteria: {
    criteria: [
      {
        id: "creates-directory",
        target: { type: "tool_calls" },
        condition: { operator: "matches_any" },
        expected: [
          { input: { command: "mkdir" } },
          { input: { file_path: "test-site" } },
        ],
        priority: 10,
      },
      {
        id: "creates-index-html",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { input: { file_path: "test-site/index.html" } },
        priority: 8,
      },
      {
        id: "includes-hero",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { input: { content: "hero" } },
        priority: 5,
      },
      {
        id: "includes-features",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { input: { content: "features" } },
        priority: 5,
      },
      {
        id: "includes-footer",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { input: { content: "footer" } },
        priority: 5,
      },
      {
        id: "includes-css",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { input: { content: "style" } },
        priority: 3,
      },
    ],
    aggregation: "weighted_average",
    passingThreshold: 0.7,
  },
  metadata: {
    tags: ["multi-step", "website", "html", "css", "capability"],
    source: "session-derived",
    version: "1.0.0",
  },
};

/**
 * Task: Read then edit file
 * Category: multi_step_workflow
 * Level: trace
 * Type: capability
 * AgentType: coding
 * Difficulty: medium
 *
 * Pattern: User asks to read a file, then make specific edits
 * Source: Real session "Read package.json and update the version"
 */
export const multiStepReadThenEditTask: EvalTask = {
  id: "multi-step-read-then-edit",
  name: "Read file then make specific edits",
  description: "Verify agent reads file before editing",
  category: "multi_step_workflow",
  level: "trace",
  type: "capability",
  agentType: "coding",
  difficulty: "medium",
  input: {
    level: "trace",
    prompt: "Read the file at /test/fixtures/config.json and update the version from 1.0.0 to 2.0.0",
    setupSteps: [
      {
        action: "create_file",
        path: "/test/fixtures/config.json",
        content: `{"name": "test-project", "version": "1.0.1"}`,
      },
    ],
  },
  successCriteria: {
    criteria: [
      {
        id: "reads-first",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { name: "Read" },
        priority: 10,
      },
      {
        id: "edits-after-read",
        target: { type: "tool_calls_sequence" },
        condition: { operator: "sequence" },
        expected: ["Read", "Edit"],
        priority: 8,
      },
      {
        id: "correct-version",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { input: { new_string: "2.0.0" } },
        priority: 5,
      },
    ],
    aggregation: "all",
    passingThreshold: 1,
  },
  metadata: {
    tags: ["multi-step", "read", "edit", "capability"],
    source: "session-derived",
    version: "1.0.0",
  },
};

/**
 * Task: Search and analyze codebase
 * Category: multi_step_workflow
 * Level: thread
 * Type: capability
 * AgentType: coding
 * Difficulty: hard
 *
 * Pattern: User asks for comprehensive codebase analysis
 * Source: Real session "List all .ts files, read each one, describe what it does"
 */
export const multiStepCodebaseAnalysisTask: EvalTask = {
  id: "multi-step-codebase-analysis",
  name: "Comprehensive codebase analysis",
  description: "Verify agent performs thorough codebase analysis",
  category: "multi_step_workflow",
  level: "thread",
  type: "capability",
  agentType: "coding",
  difficulty: "hard",
  input: {
    level: "thread",
    prompt: "List all TypeScript files in the src directory, read each one, and provide a summary of the codebase structure",
  },
  successCriteria: {
    criteria: [
      {
        id: "uses-glob",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { name: "Glob" },
        priority: 10,
      },
      {
        id: "reads-multiple-files",
        target: { type: "tool_call_count" },
        condition: { operator: "greater_than" },
        expected: { name: "Read", count: 2 },
        priority: 8,
      },
      {
        id: "provides-structure-summary",
        target: { type: "final_response" },
        condition: { operator: "contains_any" },
        expected: ["structure", "architecture", "modules", "components"],
        priority: 5,
      },
      {
        id: "identifies-files",
        target: { type: "final_response" },
        condition: { operator: "contains_any" },
        expected: [".ts", "typescript", "files"],
        priority: 3,
      },
    ],
    aggregation: "weighted_average",
    passingThreshold: 0.7,
  },
  metadata: {
    tags: ["multi-step", "codebase", "analysis", "capability"],
    source: "session-derived",
    version: "1.0.0",
  },
};

/**
 * Task: Fix multiple issues in file
 * Category: multi_step_workflow
 * Level: trace
 * Type: capability
 * AgentType: coding
 * Difficulty: hard
 *
 * Pattern: User asks to fix multiple specific issues
 * Source: Real session "Fix demo-site/index.html: remove duplicate nav, add CSS, move navbar"
 */
export const multiStepMultipleFixesTask: EvalTask = {
  id: "multi-step-multiple-fixes",
  name: "Fix multiple issues in single file",
  description: "Verify agent handles multiple edit requests in single file",
  category: "multi_step_workflow",
  level: "trace",
  type: "capability",
  agentType: "coding",
  difficulty: "hard",
  input: {
    level: "trace",
    prompt: "Fix /test/fixtures/webpage.html: 1) Remove the duplicate <nav> element 2) Add CSS for .button class 3) Move the <header> to top of <body>",
    setupSteps: [
      {
        action: "create_file",
        path: "/test/fixtures/webpage.html",
        content: `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
<main>Content</main>
<nav>Menu 1</nav>
<nav>Menu 2</nav>
<header>Header</header>
<button class="button">Click</button>
</body>
</html>`,
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
        id: "removes-duplicate",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { input: { old_string: "Menu 2" } },
        priority: 8,
      },
      {
        id: "adds-css",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { input: { new_string: ".button" } },
        priority: 5,
      },
      {
        id: "moves-header",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { input: { new_string: "<header>" } },
        priority: 5,
      },
    ],
    aggregation: "weighted_average",
    passingThreshold: 0.6,
  },
  metadata: {
    tags: ["multi-step", "fix", "edit", "capability"],
    source: "session-derived",
    version: "1.0.0",
  },
};
