#!/usr/bin/env bun
/**
 * Test script for pattern recognition functions
 */

// Type annotations for native module
interface NativeModule {
  count_tool_use: (messages: unknown[]) => Record<string, number>;
  find_tool_pairs: (messages: unknown[], windowSize: number) => Record<string, Record<string, number>>;
  find_common_patterns: (messages: unknown[]) => Array<{ tools: string[]; count: number; percentage: number }>;
}

// Import with explicit type annotation
// @ts-expect-error - dist may not be built yet
import { native } from "../dist/index.js";

// Use unknown intermediate to avoid implicit any error
// @ts-expect-error - native has implicit any before build
const typedNative: NativeModule = (native ?? {}) as NativeModule;

type ToolCounts = Record<string, number>;
type ToolPairs = Record<string, Record<string, number>>;

// Test with realistic usage patterns
const messages = [
  // Example 1: Read -> Edit pattern
  {
    role: "user",
    content: "Fix the typo in file.js",
    tool_use: [],
  },
  {
    role: "assistant",
    tool_use: [
      { name: "Read", input: { file_path: "file.js" } },
      { name: "Edit", input: { file_path: "file.js", old_string: "typo", new_string: "fixed" } },
    ],
  },

  // Example 2: Bash -> Write pattern
  {
    role: "user",
    content: "Create a new file",
    tool_use: [],
  },
  {
    role: "assistant",
    tool_use: [
      { name: "Bash", input: { command: "ls -la" } },
      { name: "Write", input: { file_path: "newfile.ts", content: "code" } },
    ],
  },

  // Example 3: Multiple Read -> Edit patterns
  {
    role: "user",
    content: "Update multiple files",
    tool_use: [],
  },
  {
    role: "assistant",
    tool_use: [
      { name: "Read", input: { file_path: "file1.ts" } },
      { name: "Edit", input: { file_path: "file1.ts" } },
      { name: "Read", input: { file_path: "file2.ts" } },
      { name: "Edit", input: { file_path: "file2.ts" } },
      { name: "Read", input: { file_path: "file3.ts" } },
      { name: "Edit", input: { file_path: "file3.ts" } },
    ],
  },

  // Example 4: Glob -> Read pattern
  {
    role: "user",
    content: "Find and read all TypeScript files",
    tool_use: [],
  },
  {
    role: "assistant",
    tool_use: [
      { name: "Glob", input: { pattern: "**/*.ts" } },
      { name: "Read", input: { file_path: "src/index.ts" } },
      { name: "Read", input: { file_path: "src/cli.ts" } },
    ],
  },

  // Example 5: Bash -> Bash pattern (testing pipeline)
  {
    role: "user",
    content: "Build and test the project",
    tool_use: [],
  },
  {
    role: "assistant",
    tool_use: [
      { name: "Bash", input: { command: "bun run build" } },
      { name: "Bash", input: { command: "bun test" } },
      { name: "Bash", input: { command: "bun run lint" } },
    ],
  },
];

console.log("Testing pattern recognition functions\n");
console.log("=".repeat(60));

// Test 1: Count tool usage
console.log("\n1. Tool Usage Counts:");
console.log("-".repeat(60));
const counts = typedNative.count_tool_use(messages);
console.table(counts);

// Test 2: Find adjacent tool pairs
console.log("\n2. Adjacent Tool Pairs (window_size=1):");
console.log("-".repeat(60));
const pairs = typedNative.find_tool_pairs(messages, 1) as ToolPairs;
for (const [tool1, destinations] of Object.entries(pairs)) {
  console.log(`\n${tool1} →`);
  for (const [tool2, count] of Object.entries(destinations)) {
    console.log(`  ${tool2}: ${count}`);
  }
}

// Test 3: Find common patterns
console.log("\n3. Most Common Tool Patterns:");
console.log("-".repeat(60));
const patterns = typedNative.find_common_patterns(messages);
for (const pattern of patterns) {
  console.log(`${pattern.tools[0]} → ${pattern.tools[1]}: ${pattern.count}x (${pattern.percentage.toFixed(1)}%)`);
}

// Test 4: Analysis summary
console.log("\n4. Analysis Summary:");
console.log("-".repeat(60));
const totalToolUses = Object.values(counts as ToolCounts).reduce((a: number, b: number) => a + b, 0);
console.log(`Total tool uses: ${totalToolUses}`);
console.log(`Unique tools used: ${Object.keys(counts).length}`);
console.log(`Total patterns found: ${patterns.length}`);

// Test 5: Pattern detection
console.log("\n5. Detected Patterns:");
console.log("-".repeat(60));
if (counts["Read"] && counts["Edit"]) {
  console.log("✓ Read → Edit pattern detected");
}
if (counts["Bash"] && counts["Bash"] > 1) {
  console.log("✓ Sequential Bash commands detected");
}
if (counts["Glob"] && counts["Read"]) {
  console.log("✓ Glob → Read pattern detected");
}
if (counts["Bash"] && counts["Write"]) {
  console.log("✓ Bash → Write pattern detected");
}

console.log("\n" + "=".repeat(60));
console.log("All tests completed!");
