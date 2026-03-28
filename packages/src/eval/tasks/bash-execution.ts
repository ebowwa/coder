/**
 * eval-task-bash-execution.ts
 * Bash command execution capability tasks
 *
 * Tests shell command execution, output handling, and error recovery
 * Based on patterns found in real session data
 */

import type { EvalTask } from "../types.js";

/**
 * Task: Execute simple echo command
 * Category: bash_execution
 * Level: run
 * Type: capability
 * AgentType: coding
 * Difficulty: easy
 *
 * Pattern: User asks for simple bash command execution
 * Source: Real session "Run the bash command 'echo hello from subagent'"
 */
export const bashExecutionEchoTask: EvalTask = {
  id: "bash-execution-echo",
  name: "Execute simple echo command",
  description: "Verify agent executes a simple bash echo command correctly",
  category: "bash_execution",
  level: "run",
  type: "capability",
  agentType: "coding",
  difficulty: "easy",
  input: {
    level: "run",
    prompt: "Run the bash command 'echo hello world' and output the result",
  },
  successCriteria: {
    criteria: [
      {
        id: "bash-tool-used",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { name: "Bash" },
        priority: 10,
      },
      {
        id: "correct-command",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { input: { command: "echo hello world" } },
        priority: 8,
      },
      {
        id: "output-present",
        target: { type: "final_response" },
        condition: { operator: "contains" },
        expected: "hello world",
        priority: 5,
      },
    ],
    aggregation: "any",
    passingThreshold: 0.8,
  },
  metadata: {
    tags: ["bash", "execution", "simple", "capability"],
    source: "session-derived",
    version: "1.0.0",
  },
};

/**
 * Task: List files in directory
 * Category: bash_execution
 * Level: run
 * Type: capability
 * AgentType: coding
 * Difficulty: easy
 *
 * Pattern: User asks to list files
 * Source: Real session "List files in current directory"
 */
export const bashExecutionListFilesTask: EvalTask = {
  id: "bash-execution-list-files",
  name: "List files in current directory",
  description: "Verify agent lists directory contents",
  category: "bash_execution",
  level: "run",
  type: "capability",
  agentType: "coding",
  difficulty: "easy",
  input: {
    level: "run",
    prompt: "List files in current directory",
  },
  successCriteria: {
    criteria: [
      {
        id: "listing-tool-used",
        target: { type: "tool_calls" },
        condition: { operator: "matches_any" },
        expected: [{ name: "Bash" }, { name: "Glob" }],
        priority: 10,
      },
      {
        id: "output-not-empty",
        target: { type: "final_response" },
        condition: { operator: "not_equals" },
        expected: "",
        priority: 8,
      },
    ],
    aggregation: "all",
    passingThreshold: 1,
  },
  metadata: {
    tags: ["bash", "ls", "directory", "capability"],
    source: "session-derived",
    version: "1.0.0",
  },
};

/**
 * Task: Execute command with working directory
 * Category: bash_execution
 * Level: run
 * Type: capability
 * AgentType: coding
 * Difficulty: medium
 *
 * Pattern: User asks to run command in specific directory
 */
export const bashExecutionWorkingDirTask: EvalTask = {
  id: "bash-execution-working-dir",
  name: "Execute command in specific directory",
  description: "Verify agent runs command in correct working directory",
  category: "bash_execution",
  level: "run",
  type: "capability",
  agentType: "coding",
  difficulty: "medium",
  input: {
    level: "run",
    prompt: "Run 'pwd' in the /tmp directory",
  },
  successCriteria: {
    criteria: [
      {
        id: "bash-tool-used",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { name: "Bash" },
        priority: 10,
      },
      {
        id: "correct-directory",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { input: { cwd: "/tmp" } },
        priority: 8,
      },
    ],
    aggregation: "any",
    passingThreshold: 0.8,
  },
  metadata: {
    tags: ["bash", "working-directory", "capability"],
    source: "handwritten",
    version: "1.0.0",
  },
};

/**
 * Task: Handle command failure gracefully
 * Category: bash_execution
 * Level: run
 * Type: capability
 * AgentType: coding
 * Difficulty: medium
 *
 * Pattern: Command fails, agent should report error
 */
export const bashExecutionErrorHandlingTask: EvalTask = {
  id: "bash-execution-error",
  name: "Handle command failure",
  description: "Verify agent handles failed command gracefully",
  category: "bash_execution",
  level: "run",
  type: "capability",
  agentType: "coding",
  difficulty: "medium",
  input: {
    level: "run",
    prompt: "Run the command 'nonexistent_command_xyz'",
  },
  successCriteria: {
    criteria: [
      {
        id: "error-reported",
        target: { type: "final_response" },
        condition: { operator: "contains_any" },
        expected: ["error", "failed", "not found", "not recognized"],
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
    tags: ["bash", "error-handling", "capability"],
    source: "handwritten",
    version: "1.0.0",
  },
};

/**
 * Task: Chain multiple bash commands
 * Category: bash_execution
 * Level: trace
 * Type: capability
 * AgentType: coding
 * Difficulty: medium
 *
 * Pattern: User asks for sequential commands
 */
export const bashExecutionChainedTask: EvalTask = {
  id: "bash-execution-chained",
  name: "Execute chained commands",
  description: "Verify agent handles chained bash commands",
  category: "bash_execution",
  level: "trace",
  type: "capability",
  agentType: "coding",
  difficulty: "medium",
  input: {
    level: "trace",
    prompt: "Create a temp directory, cd into it, and create a file called test.txt",
  },
  successCriteria: {
    criteria: [
      {
        id: "directory-created",
        target: { type: "tool_calls" },
        condition: { operator: "contains" },
        expected: { input: { command: "mkdir" } },
        priority: 10,
      },
      {
        id: "file-created",
        target: { type: "tool_calls" },
        condition: { operator: "matches_any" },
        expected: [
          { input: { command: "touch" } },
          { input: { command: "echo" } },
          { name: "Write" },
        ],
        priority: 8,
      },
    ],
    aggregation: "all",
    passingThreshold: 1,
  },
  metadata: {
    tags: ["bash", "chained", "multi-step", "capability"],
    source: "handwritten",
    version: "1.0.0",
  },
};
