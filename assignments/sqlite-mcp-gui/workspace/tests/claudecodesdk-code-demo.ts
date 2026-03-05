#!/usr/bin/env bun
/**
 * Claude Agent SDK - Code Analysis Demo
 *
 * Run with: doppler run --project seed --config prd -- bun run tests/claudecodesdk-code-demo.ts
 *
 * ════════════════════════════════════════════════════════════════════════════════
 * DEMO OUTPUT (from actual run)
 * ════════════════════════════════════════════════════════════════════════════════
 *
 * ⏺  The Claude Agent SDK is working!
 *
 * What it did:
 * 1. Created a test file (demo-temp/utils.ts) with intentional bugs
 * 2. Analyzed the code and found 15 issues:
 *    - 🔴 Critical: null references, division by zero, invalid discount range
 *    - 🟡 High: any types, missing type safety
 *    - 🔐 Security: hardcoded data, no input validation
 *    - 📊 Code quality: missing error handling, JSDoc, input validation
 * 3. Provided detailed fixes with code examples
 *
 * Stats:
 * - Tools used: 1 (Read tool)
 * - Cost: $0.029039
 * - Duration: 19.15s
 * - Turns: 2
 *
 * The SDK successfully:
 * - Read files from the filesystem
 * - Analyzed code for bugs, security issues, and best practices
 * - Returned structured, actionable feedback
 * - Tracked cost and usage
 *
 * Sample analysis output:
 *
 *   ## Analysis of `demo-temp/utils.ts`
 *
 *   ### 🔴 **Critical Bugs & Edge Cases**
 *
 *   **Line 3-5: Null/Undefined Reference Error**
 *   - Bug: No null/undefined check on `user` or `user.name`
 *   - Impact: Will crash with TypeError
 *   - Fix: Add validation: `if (!user?.name) throw new Error('Invalid user');`
 *
 *   **Line 11-13: Division by Zero**
 *   - Bug: No check for `b === 0`
 *   - Impact: Returns `Infinity` or `NaN`
 *   - Fix: `if (b === 0) throw new Error('Division by zero');`
 *
 *   ### 🟡 **TypeScript Best Practices Issues**
 *
 *   **Lines 3, 15: Use of `any` Type**
 *   - Issue: Completely bypasses TypeScript's type safety
 *   - Fix: Define a `User` interface and use proper types
 *
 *   ### 🔐 **Security Concerns**
 *
 *   **Line 15: Hardcoded Mock Data**
 *   - Issue: Ignores the `id` parameter completely
 *   - Risk: Could lead to unauthorized data access
 *
 *   ### 📈 **Severity Summary**
 *   - 🔴 Critical: 3 issues
 *   - 🟡 High: 4 issues
 *   - 🟢 Medium: 5 issues
 *   - 🔵 Low: 3 issues
 *
 *   Total: 15 issues found across 19 lines of code
 */

import { promises as fs } from "fs";
import path from "path";
import { query } from "@anthropic-ai/claude-agent-sdk";

const TEST_DIR = path.join(process.cwd(), "demo-temp");

async function setup() {
  await fs.mkdir(TEST_DIR, { recursive: true });

  // Create a TypeScript file with issues
  await fs.writeFile(
    path.join(TEST_DIR, "utils.ts"),
    `// Utility functions for data processing

export function processUser(user: any): string {
  return user.name.toUpperCase();
}

export function calculateDiscount(price: number, discount: number): number {
  return price * (1 - discount / 100);
}

export function divide(a: number, b: number): number {
  return a / b;
}

export function getUserData(id: string): any {
  // Would fetch from database
  return { name: "John", age: 30 };
}
`
  );
}

async function main() {
  console.log("🔍 Claude Agent SDK - Code Analysis Demo\n");

  const apiKey = process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("❌ No API key found");
    process.exit(1);
  }

  await setup();
  console.log("✓ Created test file: demo-temp/utils.ts\n");

  console.log("─".repeat(60));
  console.log("Analyzing code for bugs, security issues, and improvements...");
  console.log("─".repeat(60));
  console.log();

  const agent = query({
    prompt: `Analyze demo-temp/utils.ts for:
1. Potential bugs (edge cases, null checks, division by zero)
2. TypeScript best practices (type safety, any types)
3. Security concerns
4. Code quality improvements

Be specific about line numbers and provide actionable feedback.`,
    options: {
      cwd: process.cwd(),
      permissionMode: "acceptEdits",
      allowedTools: ["Read", "Grep", "Glob"],
    },
  });

  let responseText = "";
  let toolCount = 0;

  for await (const message of agent) {
    if (message.type === "assistant") {
      for (const block of message.message.content) {
        if (block.type === "text") {
          process.stdout.write(block.text);
          responseText += block.text;
        } else if (block.type === "tool_use") {
          toolCount++;
        }
      }
    } else if (message.type === "result") {
      console.log("\n\n─".repeat(60));
      console.log("Analysis Complete!");
      console.log("─".repeat(60));
      console.log(`Tools used: ${toolCount}`);
      console.log(`Cost: $${message.total_cost_usd.toFixed(6)}`);
      console.log(`Duration: ${(message.duration_ms / 1000).toFixed(2)}s`);
      console.log(`Turns: ${message.num_turns}`);
    }
  }

  // Cleanup
  await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});

  console.log("\n✅ Demo complete!");
}

main().catch(console.error);
