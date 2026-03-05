#!/usr/bin/env bun
/**
 * Claude Agent SDK Demo
 *
 * Demonstrates the Claude Agent SDK client functionality.
 *
 * Requirements:
 * - ANTHROPIC_AUTH_TOKEN environment variable (from doppler)
 * - Claude Code CLI installed
 *
 * Run with: doppler run --project seed --config prd -- bun run tests/claudecodesdk-demo.ts
 */

import { promises as fs } from "fs";
import path from "path";
import {
  ClaudeAgentClient,
  createCodeAnalyzer,
  createRefactoringAgent,
  createDocumentationAgent,
} from "../src/lib/claudecodesdk/client.js";

const DEMO_DIR = path.join(process.cwd(), "demo-temp");

async function setupDemo() {
  console.log("Setting up demo directory...");
  await fs.mkdir(DEMO_DIR, { recursive: true });

  // Create a sample TypeScript file with issues
  await fs.writeFile(
    path.join(DEMO_DIR, "calculator.ts"),
    `export class Calculator {
  private history: number[] = [];

  add(a: number, b: number): number {
    return a + b;
  }

  subtract(a: number, b: number): number {
    return a - b;
  }

  multiply(a: number, b: number): number {
    return a * b;
  }

  divide(a: number, b: number): number {
    return a / b;  // Bug: no zero check
  }

  addToHistory(result: number): void {
    this.history.push(result);
  }
}

export const calc = new Calculator();
`
  );

  console.log("Demo directory created at:", DEMO_DIR);
}

async function demo1_BasicQuery() {
  console.log("\n" + "=".repeat(60));
  console.log("Demo 1: Basic Query");
  console.log("=".repeat(60));

  const client = new ClaudeAgentClient({
    permissionMode: "acceptEdits",
  });

  console.log("Running: What is 2 + 2?");
  const result = await client.run("What is 2 + 2?");

  console.log("Success:", result.success);
  console.log("Result:", result.result);
  console.log("Cost:", `$${result.totalCostUsd.toFixed(6)}`);
  console.log("Duration:", `${result.durationMs}ms`);
}

async function demo2_CodeAnalysis() {
  console.log("\n" + "=".repeat(60));
  console.log("Demo 2: Code Analysis");
  console.log("=".repeat(60));

  const analyzer = createCodeAnalyzer(DEMO_DIR);

  console.log("Running: Analyze calculator.ts for issues");
  const result = await analyzer.run(
    "Analyze calculator.ts for bugs, security issues, and improvement opportunities. Be specific about line numbers.",
    (msg) => {
      if (msg.type === "assistant") {
        const texts = analyzer.extractTextFromMessage(msg);
        for (const text of texts) {
          process.stdout.write(".");
        }
      }
    }
  );

  console.log(); // New line after dots
  console.log("Success:", result.success);
  console.log("Result:", result.result?.substring(0, 200) + "...");
  console.log("Cost:", `$${result.totalCostUsd.toFixed(6)}`);
}

async function demo3_StreamingMessages() {
  console.log("\n" + "=".repeat(60));
  console.log("Demo 3: Streaming Messages");
  console.log("=".repeat(60));

  const client = new ClaudeAgentClient({
    permissionMode: "acceptEdits",
  });

  console.log("Running: Count backwards from 5 (streaming)");
  const stream = client.stream("Count backwards from 5 to 1. Just say the numbers.");

  let messageCount = 0;
  for await (const msg of stream) {
    messageCount++;

    if (msg.type === "assistant") {
      const texts = client.extractTextFromMessage(msg);
      for (const text of texts) {
        process.stdout.write(".");
      }
    }
  }

  console.log(); // New line
  console.log("Total messages:", messageCount);
}

async function demo4_WithBudgetLimit() {
  console.log("\n" + "=".repeat(60));
  console.log("Demo 4: Budget Limit");
  console.log("=".repeat(60));

  const client = new ClaudeAgentClient({
    permissionMode: "acceptEdits",
    maxBudgetUsd: 0.01, // $0.01 limit
    maxTurns: 10,
  });

  console.log("Running: Tell me a long story (with $0.01 budget)");
  const result = await client.run(
    "Tell me a long story about a robot learning to code. Make it detailed."
  );

  console.log("Success:", result.success);
  console.log("Result:", result.result);
  console.log("Cost:", `$${result.totalCostUsd.toFixed(6)}`);
  console.log("Turns:", result.numTurns);
}

async function cleanup() {
  console.log("\n" + "=".repeat(60));
  console.log("Cleanup");
  console.log("=".repeat(60));

  try {
    await fs.rm(DEMO_DIR, { recursive: true, force: true });
    console.log("Demo directory removed");
  } catch (error) {
    console.warn("Could not remove demo directory:", error);
  }
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║     Claude Agent SDK Demo                                   ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  // Check for API key
  const apiKey = process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("\n❌ ANTHROPIC_AUTH_TOKEN environment variable is required");
    console.log("   Run: doppler run --project seed --config prd -- bun run tests/claudecodesdk-demo.ts");
    process.exit(1);
  }

  try {
    await setupDemo();
    await demo1_BasicQuery();
    await demo2_CodeAnalysis();
    await demo3_StreamingMessages();
    await demo4_WithBudgetLimit();
    await cleanup();

    console.log("\n" + "=".repeat(60));
    console.log("✓ All demos completed successfully!");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("\n❌ Demo failed:", error);
    await cleanup();
    process.exit(1);
  }
}

main();
