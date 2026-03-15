/**
 * Tests for Result-Based Loop Control (Dynamic Conditions)
 *
 * These tests verify that result conditions check ACTUAL tool results,
 * not AI claims. This is the "Ralph Loop" pattern.
 *
 * Conditions are fully dynamic - no hardcoded presets.
 * Users define conditions at runtime via JSON.
 */

import { describe, test, expect } from "bun:test";
import {
  checkResultConditions,
  checkAllResults,
  createConfig,
  EXAMPLE_CONDITIONS,
  type ResultCondition,
  type ResultConditionsConfig,
} from "../result-conditions.js";
import type { ToolResult, ToolResultBlock } from "../../../schemas/index.js";

// Helper to create a tool result
function makeResult(content: string, isError = false): ToolResult {
  return {
    type: "tool_result",
    tool_use_id: "test-id",
    content,
    is_error: isError,
  };
}

// Helper to create a tool result block
function makeResultBlock(content: string, isError = false): ToolResultBlock {
  return {
    type: "tool_result",
    tool_use_id: "test-id",
    content,
    is_error: isError,
  };
}

describe("createConfig (dynamic)", () => {
  test("should create config from JSON string - single condition", () => {
    const json = JSON.stringify({
      id: "my-check",
      action: "stop_success",
      successPattern: "pushed",
    });

    const config = createConfig(json);

    expect(config.conditions).toHaveLength(1);
    expect(config.conditions[0].id).toBe("my-check");
    expect(config.conditions[0].action).toBe("stop_success");
  });

  test("should create config from JSON string - array of conditions", () => {
    const json = JSON.stringify([
      { id: "check1", action: "stop_success", successPattern: "done" },
      { id: "check2", action: "continue", successPattern: "working" },
    ]);

    const config = createConfig(json);

    expect(config.conditions).toHaveLength(2);
    expect(config.conditions[0].id).toBe("check1");
    expect(config.conditions[1].id).toBe("check2");
  });

  test("should create config from JSON string - full config object", () => {
    const json = JSON.stringify({
      conditions: [
        { id: "check1", action: "stop_success", successPattern: "done" },
      ],
      maxRetries: 5,
      stopOnUnhandledError: true,
    });

    const config = createConfig(json);

    expect(config.conditions).toHaveLength(1);
    expect(config.maxRetries).toBe(5);
    expect(config.stopOnUnhandledError).toBe(true);
  });

  test("should create config from condition array", () => {
    const conditions: ResultCondition[] = [
      { id: "push-check", action: "stop_success", successPattern: "pushed" },
    ];

    const config = createConfig(conditions);

    expect(config.conditions).toHaveLength(1);
    expect(config.conditions[0].id).toBe("push-check");
  });

  test("should merge options", () => {
    const conditions: ResultCondition[] = [
      { id: "check", action: "stop_success" },
    ];

    const config = createConfig(conditions, { maxRetries: 5, stopOnUnhandledError: true });

    expect(config.maxRetries).toBe(5);
    expect(config.stopOnUnhandledError).toBe(true);
  });

  test("should throw on invalid JSON", () => {
    expect(() => createConfig("not valid json")).toThrow();
  });
});

describe("checkResultConditions", () => {
  test("should match success pattern", () => {
    const config = createConfig([{
      id: "push-check",
      tools: ["Bash"],
      successPattern: "(?:pushed|refs/heads/)",
      action: "stop_success",
    }]);

    const result = makeResult("To github.com:user/repo.git\n   main -> main\n pushed");

    const check = checkResultConditions("Bash", result, config);

    expect(check.triggered).toBe(true);
    expect(check.shouldContinue).toBe(false);
    expect(check.stopReason).toBe("success");
    expect(check.condition?.id).toBe("push-check");
  });

  test("should not match wrong tool name", () => {
    const config = createConfig([{
      id: "push-check",
      tools: ["Bash"],
      successPattern: "pushed",
      action: "stop_success",
    }]);

    const result = makeResult("pushed successfully");

    const check = checkResultConditions("Write", result, config);

    expect(check.triggered).toBe(false);
    expect(check.shouldContinue).toBe(true);
  });

  test("should match when tools list is empty (all tools)", () => {
    const config = createConfig([{
      id: "any-check",
      tools: [],
      successPattern: "done",
      action: "stop_success",
    }]);

    const result = makeResult("work done");

    const check1 = checkResultConditions("Bash", result, config);
    const check2 = checkResultConditions("Write", result, config);
    const check3 = checkResultConditions("Read", result, config);

    expect(check1.triggered).toBe(true);
    expect(check2.triggered).toBe(true);
    expect(check3.triggered).toBe(true);
  });

  test("should match when tools is undefined (all tools)", () => {
    const config = createConfig([{
      id: "any-check",
      successPattern: "done",
      action: "stop_success",
    }]);

    const result = makeResult("work done");

    const check = checkResultConditions("AnyTool", result, config);

    expect(check.triggered).toBe(true);
  });

  test("should match failure pattern in non-error results", () => {
    const config = createConfig([{
      id: "reject-check",
      tools: ["Bash"],
      failurePattern: "rejected|fetch\\s+first",
      action: "retry",
    }]);

    const result = makeResult("! [rejected]        main -> main (fetch first)");

    const check = checkResultConditions("Bash", result, config, 0);

    expect(check.triggered).toBe(true);
    expect(check.shouldContinue).toBe(true);
    expect(check.retryIncrement).toBe(1);
  });

  test("should stop after max retries", () => {
    const config = createConfig([{
      id: "reject-check",
      failurePattern: "rejected",
      action: "retry",
    }], { maxRetries: 2 });

    const result = makeResult("! [rejected]");

    const check = checkResultConditions("Bash", result, config, 2);

    expect(check.triggered).toBe(true);
    expect(check.shouldContinue).toBe(false);
    expect(check.stopReason).toBe("max_retries");
  });

  test("should match error results when isError is true", () => {
    const config = createConfig([{
      id: "error-check",
      isError: true,
      action: "stop_failure",
    }]);

    const result = makeResult("Something failed", true);

    const check = checkResultConditions("Bash", result, config);

    expect(check.triggered).toBe(true);
    expect(check.shouldContinue).toBe(false);
    expect(check.stopReason).toBe("failure");
  });

  test("should stop on unhandled error when configured", () => {
    const config: ResultConditionsConfig = {
      conditions: [],
      stopOnUnhandledError: true,
    };
    const result = makeResult("Something went wrong", true);

    const check = checkResultConditions("Bash", result, config);

    expect(check.shouldContinue).toBe(false);
    expect(check.stopReason).toBe("error");
  });

  test("should continue on unhandled error by default", () => {
    const config: ResultConditionsConfig = {
      conditions: [],
      stopOnUnhandledError: false,
    };
    const result = makeResult("Something went wrong", true);

    const check = checkResultConditions("Bash", result, config);

    expect(check.shouldContinue).toBe(true);
  });

  test("should handle continue action", () => {
    const config = createConfig([{
      id: "commit-check",
      tools: ["Bash"],
      successPattern: "\\[\\S+\\s+\\w+\\]|committed",
      action: "continue",
    }]);

    const result = makeResult("[main abc123] Add feature\n 2 files changed");

    const check = checkResultConditions("Bash", result, config);

    expect(check.triggered).toBe(true);
    expect(check.shouldContinue).toBe(true);
  });
});

describe("checkAllResults", () => {
  test("should check multiple results", () => {
    const config = createConfig([{
      id: "push-check",
      tools: ["Bash"],
      successPattern: "pushed",
      action: "stop_success",
    }]);

    const results = [
      { toolName: "Write", result: makeResult("File written") },
      { toolName: "Bash", result: makeResult("pushed to origin/main") },
    ];

    const check = checkAllResults(results, config);

    expect(check.triggered).toBe(true);
    expect(check.shouldContinue).toBe(false);
    expect(check.stopReason).toBe("success");
  });

  test("should accumulate retries", () => {
    const config = createConfig([{
      id: "retry-check",
      failurePattern: "rejected",
      action: "retry",
    }]);

    const results = [
      { toolName: "Bash", result: makeResult("! [rejected] main -> main") },
      { toolName: "Bash", result: makeResult("! [rejected] main -> main") },
    ];

    const check = checkAllResults(results, config, 0);

    expect(check.triggered).toBe(true);
    expect(check.retryIncrement).toBe(2);
    expect(check.shouldContinue).toBe(true);
  });

  test("should return checked count", () => {
    const config = createConfig([]);

    const results = [
      { toolName: "Bash", result: makeResult("some output") },
      { toolName: "Write", result: makeResult("file written") },
      { toolName: "Read", result: makeResult("file contents") },
    ];

    const check = checkAllResults(results, config);

    expect(check.checkedCount).toBe(3);
  });

  test("should stop on first stop_success", () => {
    const config = createConfig([
      { id: "check1", successPattern: "done", action: "continue" },
      { id: "check2", successPattern: "pushed", action: "stop_success" },
    ]);

    const results = [
      { toolName: "Bash", result: makeResult("work done") },      // matches check1, continues
      { toolName: "Bash", result: makeResult("pushed to origin") }, // matches check2, stops
      { toolName: "Bash", result: makeResult("more work") },       // never checked
    ];

    const check = checkAllResults(results, config);

    expect(check.triggered).toBe(true);
    expect(check.stopReason).toBe("success");
    expect(check.condition?.id).toBe("check2");
  });
});

describe("EXAMPLE_CONDITIONS", () => {
  test("should provide example conditions for documentation", () => {
    expect(EXAMPLE_CONDITIONS.gitPush).toBeDefined();
    expect(EXAMPLE_CONDITIONS.gitPush.id).toBe("git_push_success");
    expect(EXAMPLE_CONDITIONS.gitPush.action).toBe("stop_success");

    expect(EXAMPLE_CONDITIONS.testsPassed).toBeDefined();
    expect(EXAMPLE_CONDITIONS.testsPassed.id).toBe("tests_passed");

    expect(EXAMPLE_CONDITIONS.deploySuccess).toBeDefined();
    expect(EXAMPLE_CONDITIONS.buildSuccess).toBeDefined();
  });

  test("example conditions should be usable", () => {
    const config = createConfig([EXAMPLE_CONDITIONS.gitPush]);

    const result = makeResult("To github.com:user/repo.git\n pushed");
    const check = checkResultConditions("Bash", result, config);

    expect(check.triggered).toBe(true);
    expect(check.stopReason).toBe("success");
  });

  test("example conditions are NOT included by default", () => {
    const config = createConfig([]);

    expect(config.conditions).toHaveLength(0);
  });
});

describe("pattern matching edge cases", () => {
  test("should handle regex special characters in string patterns", () => {
    const config = createConfig([{
      id: "special-chars",
      successPattern: "\\[main\\]",  // Escaped brackets
      action: "stop_success",
    }]);

    const result = makeResult("[main] commit created");

    const check = checkResultConditions("Bash", result, config);

    expect(check.triggered).toBe(true);
  });

  test("should handle ToolResultBlock format with array content", () => {
    const config = createConfig([{
      id: "push-check",
      successPattern: "pushed",
      action: "stop_success",
    }]);

    const block: ToolResultBlock = {
      type: "tool_result",
      tool_use_id: "test-id",
      content: [{ type: "text", text: "pushed to origin" }],
    };

    const check = checkResultConditions("Bash", block, config);

    expect(check.triggered).toBe(true);
    expect(check.shouldContinue).toBe(false);
  });

  test("should be case-insensitive by default", () => {
    const config = createConfig([{
      id: "case-check",
      successPattern: "PUSHED",
      action: "stop_success",
    }]);

    const result1 = makeResult("pushed to origin");
    const result2 = makeResult("PUSHED to origin");
    const result3 = makeResult("PuShEd to origin");

    expect(checkResultConditions("Bash", result1, config).triggered).toBe(true);
    expect(checkResultConditions("Bash", result2, config).triggered).toBe(true);
    expect(checkResultConditions("Bash", result3, config).triggered).toBe(true);
  });

  test("should handle complex multi-line output", () => {
    const config = createConfig([{
      id: "complex-check",
      successPattern: "tests?\\s+passed",
      action: "stop_success",
    }]);

    const result = makeResult(`
Running tests...
  ✓ test 1
  ✓ test 2
  ✓ test 3

3 tests passed
All good!
    `);

    const check = checkResultConditions("Bash", result, config);

    expect(check.triggered).toBe(true);
    expect(check.stopReason).toBe("success");
  });
});

describe("real-world scenarios", () => {
  test("git workflow - commit then push", () => {
    const config = createConfig([
      {
        id: "commit-success",
        tools: ["Bash"],
        successPattern: "\\[\\S+\\s+\\w+\\]",
        action: "continue",
        message: "Commit verified",
      },
      {
        id: "push-success",
        tools: ["Bash"],
        successPattern: "pushed|refs/heads/",
        action: "stop_success",
        message: "Push verified",
      },
    ]);

    // First: commit succeeds (continue)
    const commitResult = makeResult("[main abc123] Add feature");
    const commitCheck = checkResultConditions("Bash", commitResult, config);
    expect(commitCheck.shouldContinue).toBe(true);

    // Second: push succeeds (stop)
    const pushResult = makeResult("To github.com:user/repo.git\n refs/heads/main -> refs/heads/main");
    const pushCheck = checkResultConditions("Bash", pushResult, config);
    expect(pushCheck.shouldContinue).toBe(false);
    expect(pushCheck.stopReason).toBe("success");
  });

  test("CI/CD workflow - build and deploy", () => {
    const config = createConfig([
      {
        id: "build-success",
        successPattern: "build\\s+(?:complete|successful)",
        action: "continue",
      },
      {
        id: "deploy-success",
        successPattern: "deployed|deployment\\s+successful",
        action: "stop_success",
      },
    ]);

    const results = [
      { toolName: "Bash", result: makeResult("npm run build\nbuild successful") },
      { toolName: "Bash", result: makeResult("deploy command run\ndeployed to production") },
    ];

    const check = checkAllResults(results, config);

    expect(check.triggered).toBe(true);
    expect(check.stopReason).toBe("success");
  });

  test("test runner workflow - stop on failure", () => {
    const config = createConfig([
      {
        id: "tests-pass",
        successPattern: "tests?\\s+passed",
        action: "stop_success",
      },
      {
        id: "tests-fail",
        failurePattern: "tests?\\s+failed|failed:\\s*\\d+",
        action: "continue", // Let AI fix
      },
    ]);

    const failResult = makeResult("Running tests...\n2 tests failed");
    const failCheck = checkResultConditions("Bash", failResult, config);

    expect(failCheck.triggered).toBe(true);
    expect(failCheck.shouldContinue).toBe(true); // AI should fix
  });
});
