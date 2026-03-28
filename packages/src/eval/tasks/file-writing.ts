/**
 * eval-task-file-writing.ts
 * File writing and editing capability tasks
 *
 * Tests creating, writing, and editing files
 * Based on patterns found in real session data
 */

import type { EvalTask } from "../types.js";

/**
 * Task: Create new file with content
 * Category: file_writing
 * Level: run
 * Type: capability
 * AgentType: coding
 * Difficulty: easy
 *
 * Pattern: User asks to create a new file
 * Source: Real session "create a simple HTML website"
 */
export const fileWritingCreateTask: EvalTask = {
  id: "file-writing-create",
  name: "Create new file with content",
  description: "Verify agent creates a new file with specified content",
  category: "file_writing",
  level: "run",
  type: "capability",
  agentType: "coding",
  difficulty: "easy",
  input: {
    level: "run",
    prompt: "Create a file called hello.txt with content 'Hello, World!'",
  },
  successCriteria: {
    criteria: [
      {
        id: "write-tool-used",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { name: "Write" },
        priority: 10,
      },
      {
        id: "correct-path",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { input: { file_path: "hello.txt" } },
        priority: 8,
      },
      {
        id: "correct-content",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { input: { content: "Hello, World!" } },
        priority: 5,
      },
    ],
    aggregation: "any",
    passingThreshold: 0.8,
  },
  metadata: {
    tags: ["file", "write", "create", "capability"],
    source: "session-derived",
    version: "1.0.0",
  },
};

/**
 * Task: Edit existing file
 * Category: file_writing
 * Level: run
 * Type: capability
 * AgentType: coding
 * Difficulty: medium
 *
 * Pattern: User asks to edit specific parts of a file
 * Source: Real session "Fix the demo-site/index.html - remove duplicate"
 */
export const fileWritingEditTask: EvalTask = {
  id: "file-writing-edit",
  name: "Edit existing file",
  description: "Verify agent edits specific parts of a file",
  category: "file_writing",
  level: "run",
  type: "capability",
  agentType: "coding",
  difficulty: "medium",
  input: {
    level: "run",
    prompt: "The file /test/fixtures/sample.txt contains 'foo bar baz'. Change 'bar' to 'qux' using the Edit tool.",
    setupSteps: [
      {
        action: "create_file",
        path: "/test/fixtures/sample.txt",
        content: "foo bar baz",
      },
    ],
  },
  successCriteria: {
    criteria: [
      {
        id: "edit-tool-used",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { name: "Edit" },
        priority: 10,
      },
      {
        id: "old-string-correct",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { input: { old_string: "bar" } },
        priority: 8,
      },
      {
        id: "new-string-correct",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { input: { new_string: "qux" } },
        priority: 8,
      },
    ],
    aggregation: "all",
    passingThreshold: 1,
  },
  metadata: {
    tags: ["file", "edit", "capability"],
    source: "session-derived",
    version: "1.0.0",
  },
};

/**
 * Task: Create HTML file with structure
 * Category: file_writing
 * Level: trace
 * Type: capability
 * AgentType: coding
 * Difficulty: medium
 *
 * Pattern: User asks to create structured HTML
 * Source: Real session with demo-site creation
 */
export const fileWritingHTMLStructureTask: EvalTask = {
  id: "file-writing-html",
  name: "Create HTML file with structure",
  description: "Verify agent creates HTML file with proper structure",
  category: "file_writing",
  level: "trace",
  type: "capability",
  agentType: "coding",
  difficulty: "medium",
  input: {
    level: "trace",
    prompt: "Create index.html with a hero section, features section, and footer. Use modern CSS styling embedded in a style tag.",
  },
  successCriteria: {
    criteria: [
      {
        id: "write-tool-used",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { name: "Write" },
        priority: 10,
      },
      {
        id: "html-structure",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { input: { content: "<!DOCTYPE html>" } },
        priority: 8,
      },
      {
        id: "has-hero",
        target: { type: "tool_calls" },
        condition: { operator: "contains_any" },
        expected: [
          { input: { content: "hero" } },
          { input: { content: "class=\"hero\"" } },
        ],
        priority: 5,
      },
      {
        id: "has-style",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { input: { content: "<style>" } },
        priority: 5,
      },
    ],
    aggregation: "any",
    passingThreshold: 0.75,
  },
  metadata: {
    tags: ["file", "html", "web", "capability"],
    source: "session-derived",
    version: "1.0.0",
  },
};

/**
 * Task: Multi-file creation
 * Category: file_writing
 * Level: trace
 * Type: capability
 * AgentType: coding
 * Difficulty: hard
 *
 * Pattern: User asks to create multiple files
 * Source: Real session "create a simple HTML website in a new folder"
 */
export const fileWritingMultiFileTask: EvalTask = {
  id: "file-writing-multi",
  name: "Create multiple files in new directory",
  description: "Verify agent creates multiple files in a new directory structure",
  category: "file_writing",
  level: "trace",
  type: "capability",
  agentType: "coding",
  difficulty: "hard",
  input: {
    level: "trace",
    prompt: "Create a new folder called 'demo-site' with index.html (hero section, features, footer) and styles.css (modern styling)",
  },
  successCriteria: {
    criteria: [
      {
        id: "directory-created",
        target: { type: "tool_calls" },
        condition: { operator: "matches_any" },
        expected: [
          { input: { command: "mkdir" } },
          { input: { file_path: "demo-site/index.html" } },
        ],
        priority: 10,
      },
      {
        id: "html-created",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { input: { file_path: "demo-site/index.html" } },
        priority: 8,
      },
      {
        id: "css-created",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { input: { file_path: "demo-site/styles.css" } },
        priority: 8,
      },
    ],
    aggregation: "all",
    passingThreshold: 1,
  },
  metadata: {
    tags: ["file", "multi-file", "directory", "capability"],
    source: "session-derived",
    version: "1.0.0",
  },
};

/**
 * Task: Fix duplicate content in file
 * Category: file_writing
 * Level: run
 * Type: capability
 * AgentType: coding
 * Difficulty: medium
 *
 * Pattern: User asks to fix specific issues
 * Source: Real session "remove duplicate nav/headers"
 */
export const fileWritingFixDuplicateTask: EvalTask = {
  id: "file-writing-fix-duplicate",
  name: "Fix duplicate content in file",
  description: "Verify agent removes duplicate content correctly",
  category: "file_writing",
  level: "run",
  type: "capability",
  agentType: "coding",
  difficulty: "medium",
  input: {
    level: "run",
    prompt: "The file /test/fixtures/duplicate.html has TWO nav elements. Remove the duplicate one.",
    setupSteps: [
      {
        action: "create_file",
        path: "/test/fixtures/duplicate.html",
        content: "<html><body><nav>First</nav><div>Content</div><nav>Duplicate</nav></body></html>",
      },
    ],
  },
  successCriteria: {
    criteria: [
      {
        id: "edit-tool-used",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { name: "Edit" },
        priority: 10,
      },
      {
        id: "removes-duplicate",
        target: { type: "tool_calls" },
        condition: { operator: "contains_any" },
        expected: [
          { input: { old_string: "<nav>Duplicate</nav>" } },
          { input: { old_string: "<nav>First</nav>" } },
        ],
        priority: 8,
      },
    ],
    aggregation: "any",
    passingThreshold: 0.8,
  },
  metadata: {
    tags: ["file", "edit", "fix", "capability"],
    source: "session-derived",
    version: "1.0.0",
  },
};

/**
 * Task: Add CSS styles to existing file
 * Category: file_writing
 * Level: run
 * Type: capability
 * AgentType: coding
 * Difficulty: medium
 *
 * Pattern: User asks to add styling
 * Source: Real session "pricing section needs better styling"
 */
export const fileWritingAddStylesTask: EvalTask = {
  id: "file-writing-add-styles",
  name: "Add CSS styles to existing HTML",
  description: "Verify agent adds CSS styles correctly",
  category: "file_writing",
  level: "run",
  type: "capability",
  agentType: "coding",
  difficulty: "medium",
  input: {
    level: "run",
    prompt: "Add CSS styles for .pricing, .pricing-card, and .pricing-button classes to the <style> tag in /test/fixtures/pricing.html",
    setupSteps: [
      {
        action: "create_file",
        path: "/test/fixtures/pricing.html",
        content: "<html><head><style></style></head><body><div class=\"pricing\"><div class=\"pricing-card\"><button class=\"pricing-button\">Buy</button></div></div></body></html>",
      },
    ],
  },
  successCriteria: {
    criteria: [
      {
        id: "edit-tool-used",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { name: "Edit" },
        priority: 10,
      },
      {
        id: "adds-pricing-class",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { input: { new_string: ".pricing" } },
        priority: 8,
      },
      {
        id: "adds-card-class",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { input: { new_string: ".pricing-card" } },
        priority: 5,
      },
    ],
    aggregation: "any",
    passingThreshold: 0.7,
  },
  metadata: {
    tags: ["file", "css", "styling", "capability"],
    source: "session-derived",
    version: "1.0.0",
  },
};
