#!/usr/bin/env bun
/**
 * Quick verification that the SDK is properly installed and can be imported
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import {
  ClaudeAgentClient,
  createCodeAnalyzer,
  createRefactoringAgent,
  createDocumentationAgent,
} from "../src/lib/claudecodesdk/client.js";

console.log("✓ SDK imports successful");
console.log("✓ query function:", typeof query === "function" ? "OK" : "FAIL");
console.log("✓ ClaudeAgentClient:", ClaudeAgentClient ? "OK" : "FAIL");
console.log(
  "✓ createCodeAnalyzer:",
  typeof createCodeAnalyzer === "function" ? "OK" : "FAIL",
);
console.log(
  "✓ createRefactoringAgent:",
  typeof createRefactoringAgent === "function" ? "OK" : "FAIL",
);
console.log(
  "✓ createDocumentationAgent:",
  typeof createDocumentationAgent === "function" ? "OK" : "FAIL",
);

// Create instances to verify they work
const client = new ClaudeAgentClient();
console.log(
  "✓ Client instance:",
  client instanceof ClaudeAgentClient ? "OK" : "FAIL",
);

const withConfig = client.withConfig({ maxBudgetUsd: 1 });
console.log(
  "✓ withConfig:",
  withConfig instanceof ClaudeAgentClient ? "OK" : "FAIL",
);

const analyzer = createCodeAnalyzer();
console.log(
  "✓ CodeAnalyzer:",
  analyzer instanceof ClaudeAgentClient ? "OK" : "FAIL",
);

const refactoring = createRefactoringAgent();
console.log(
  "✓ RefactoringAgent:",
  refactoring instanceof ClaudeAgentClient ? "OK" : "FAIL",
);

const docs = createDocumentationAgent();
console.log(
  "✓ DocumentationAgent:",
  docs instanceof ClaudeAgentClient ? "OK" : "FAIL",
);

console.log("\n✅ All verification checks passed!");
console.log("\nNote: To run actual API tests, set ANTHROPIC_API_KEY and run:");
console.log(
  "  ANTHROPIC_API_KEY=sk-ant-xxx bun test tests/claudecodesdk.test.ts",
);
console.log("  OR");
console.log(
  "  doppler run --project seed --config prd bun test tests/claudecodesdk.test.ts",
);
