/**
 * Policy System Examples
 *
 * This file demonstrates how to use the policy system.
 */

import {
  getRegistry,
  initializePolicySystem,
  quickSetup,
  createPolicyHookHandlers,
  checkPolicyAlignment,
  type PolicyDocument,
  type PolicyConstraint,
} from "./index.js";

// ============================================
// Example 1: Quick Setup
// ============================================

async function example1QuickSetup() {
  console.log("=== Example 1: Quick Setup ===\n");

  // Quick setup with balanced mode
  await quickSetup("balanced");

  // Check alignment
  const result = checkPolicyAlignment({
    type: "execute",
    domain: "git",
    operation: "git push --force main",
    reasoning: "Force push to main",
  });

  console.log("Alignment check for 'force push main':");
  console.log(`  Aligned: ${result.aligned}`);
  console.log(`  Score: ${result.score}`);
  console.log(`  Concerns: ${result.concerns.join(", ") || "none"}`);
  console.log(`  Suggestions: ${result.suggestions.join(", ") || "none"}\n`);
}

// ============================================
// Example 2: Custom Policy
// ============================================

async function example2CustomPolicy() {
  console.log("=== Example 2: Custom Policy ===\n");

  const registry = getRegistry();

  // Define a custom policy
  const myPolicy: PolicyDocument = {
    meta: {
      name: "my-project-policy",
      version: "1.0.0",
      description: "Custom policy for my project",
      scope: "project",
      tags: ["custom", "project"],
    },

    constraints: [
      {
        id: "no-delete-migrations",
        description: "Never delete migration files",
        reason: "Migrations must be preserved for database consistency",
        severity: "fatal",
        pattern: {
          tool: ["Bash", "Write"],
          path_pattern: "migrations/.*\\.sql$",
          command_pattern: "rm\\s+.*migrations",
        },
        suggestion: "Create a new migration to reverse changes instead",
      },
      {
        id: "no-direct-main-push",
        description: "Don't push directly to main branch",
        reason: "All changes must go through PR review",
        severity: "block",
        pattern: {
          tool: "Bash",
          command_pattern: "git\\s+push.*origin\\s+main",
        },
        suggestion: "Create a feature branch and push to that instead",
      },
    ],

    permissions: [
      {
        id: "src-write",
        domain: "filesystem",
        actions: ["read", "write", "create", "modify"],
        paths: ["src/**", "tests/**"],
        requires_approval: "never",
      },
      {
        id: "config-sensitive",
        domain: "filesystem",
        actions: ["write", "modify"],
        paths: [".env*", "config/*.json"],
        requires_approval: "always",
      },
    ],

    teaching: [
      {
        id: "migration-help",
        trigger: ["delete migration", "remove migration"],
        response: "Migration files should not be deleted. Create a new migration to reverse the changes you want to undo.",
        reason: "Database migrations must be append-only for consistency",
        examples: [
          {
            input: "delete the add-users-table migration",
            output: "Instead of deleting the migration, I'll create a new migration to drop the users table if needed.",
            explanation: "Appending a reversal migration is safer than deleting history",
          },
        ],
      },
    ],
  };

  // Register the policy
  registry.register(myPolicy);

  console.log("Registered custom policy:");
  console.log(`  Name: ${myPolicy.meta.name}`);
  console.log(`  Constraints: ${myPolicy.constraints?.length || 0}`);
  console.log(`  Permissions: ${myPolicy.permissions?.length || 0}`);
  console.log(`  Teaching hints: ${myPolicy.teaching?.length || 0}\n`);

  // Get stats
  const stats = registry.getStats();
  console.log("Registry stats:");
  console.log(`  Total policies: ${stats.totalPolicies}`);
  console.log(`  Total constraints: ${stats.totalConstraints}`);
  console.log(`  Learned constraints: ${stats.learnedConstraints}\n`);
}

// ============================================
// Example 3: Hook Integration
// ============================================

async function example3HookIntegration() {
  console.log("=== Example 3: Hook Integration ===\n");

  // Create hook handlers
  const handlers = createPolicyHookHandlers({
    enabled: true,
    blockOnViolation: true,
    enableLearning: true,
    autoFix: true,
  });

  // Simulate a session start
  const sessionResult = await handlers.SessionStart({
    session_id: "test-session-123",
  });
  console.log("SessionStart result:", sessionResult.decision);

  // Simulate a tool use that should be blocked
  const preToolResult = await handlers.PreToolUse({
    tool_name: "Bash",
    tool_input: { command: "git push origin main --force" },
    working_directory: "/tmp/project",
    session_id: "test-session-123",
  });
  console.log("PreToolUse (force push main) result:", preToolResult.decision);
  if (preToolResult.reason) {
    console.log("  Reason:", preToolResult.reason);
  }

  // Simulate a tool use that should be allowed
  const allowedResult = await handlers.PreToolUse({
    tool_name: "Bash",
    tool_input: { command: "git checkout -b feat/new-feature" },
    working_directory: "/tmp/project",
    session_id: "test-session-123",
  });
  console.log("PreToolUse (create feature branch) result:", allowedResult.decision, "\n");
}

// ============================================
// Example 4: Learning from Failures
// ============================================

async function example4LearningFromFailures() {
  console.log("=== Example 4: Learning from Failures ===\n");

  const registry = getRegistry();

  // Simulate learning a constraint from an error
  const learnedConstraint: PolicyConstraint = {
    id: "learned:no-rm-rf-node-modules",
    description: "Avoid rm -rf node_modules - use rm -rf with caution",
    reason: "Large directory deletion can hang the terminal",
    severity: "warn",
    pattern: {
      tool: "Bash",
      command_pattern: "rm\\s+-rf\\s+node_modules",
    },
    learned: true,
    enabled: true,
  };

  registry.learnConstraint(learnedConstraint);

  const learned = registry.getLearnedConstraints();
  console.log(`Learned ${learned.length} constraints:`);
  for (const c of learned) {
    console.log(`  - ${c.id}: ${c.description}`);
  }
  console.log();
}

// ============================================
// Run all examples
// ============================================

async function main() {
  try {
    await example1QuickSetup();
    await example2CustomPolicy();
    await example3HookIntegration();
    await example4LearningFromFailures();

    console.log("=== All examples completed ===");
  } catch (error) {
    console.error("Error running examples:", error);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  example1QuickSetup,
  example2CustomPolicy,
  example3HookIntegration,
  example4LearningFromFailures,
};
