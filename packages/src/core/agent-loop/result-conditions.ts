/**
 * Result-Based Loop Control
 *
 * Unlike text-based stop sequences (AI can lie), this system checks
 * ACTUAL tool results to determine loop continuation.
 *
 * This is the "Ralph Loop" pattern - verified outcomes, not AI claims.
 *
 * Conditions are fully dynamic and user-definable:
 * - Via CLI: --result-conditions 'conditions.json' or inline JSON
 * - Via CLAUDE.md: resultConditions field
 * - Via settings.json: resultConditions config
 */

import type { ToolResult, ToolResultBlock } from "../../schemas/index.js";

// ============================================
// TYPES
// ============================================

/**
 * Action to take when condition matches
 */
export type ConditionAction = "stop_success" | "stop_failure" | "continue" | "retry";

/**
 * A condition that checks tool results for specific patterns
 */
export interface ResultCondition {
  /** Unique identifier for this condition */
  id: string;
  /** Description of what this condition checks */
  description?: string;
  /** Tool names to check (empty = all tools) */
  tools?: string[];
  /** Pattern to match in successful results (regex string) */
  successPattern?: string;
  /** Pattern to match in failed results (regex string) */
  failurePattern?: string;
  /** Match error results */
  isError?: boolean;
  /** What to do when condition matches */
  action: ConditionAction;
  /** Optional message to log when triggered */
  message?: string;
}

/**
 * Configuration for result-based loop control
 */
export interface ResultConditionsConfig {
  /** Conditions to check after each tool execution */
  conditions: ResultCondition[];
  /** Maximum retries for "retry" actions */
  maxRetries?: number;
  /** Whether to stop on any unhandled error */
  stopOnUnhandledError?: boolean;
}

/**
 * Result of checking conditions
 */
export interface ConditionCheckResult {
  /** Whether a condition was triggered */
  triggered: boolean;
  /** The condition that was triggered (if any) */
  condition?: ResultCondition;
  /** Whether the loop should continue */
  shouldContinue: boolean;
  /** Stop reason if loop should stop */
  stopReason?: "success" | "failure" | "error" | "max_retries";
  /** Retry count increment if action is retry */
  retryIncrement?: number;
  /** All results checked (for logging) */
  checkedCount?: number;
}

/**
 * Parsed condition with compiled regex
 */
interface CompiledCondition extends ResultCondition {
  _successRegex?: RegExp;
  _failureRegex?: RegExp;
}

// ============================================
// CONDITION COMPILATION
// ============================================

/**
 * Compile a condition's patterns into regex objects
 */
function compileCondition(condition: ResultCondition): CompiledCondition {
  const compiled: CompiledCondition = { ...condition };

  if (condition.successPattern) {
    compiled._successRegex = new RegExp(condition.successPattern, "is");
  }
  if (condition.failurePattern) {
    compiled._failureRegex = new RegExp(condition.failurePattern, "is");
  }

  return compiled;
}

/**
 * Compile all conditions in a config
 */
export function compileConfig(config: ResultConditionsConfig): {
  conditions: CompiledCondition[];
  maxRetries: number;
  stopOnUnhandledError: boolean;
} {
  return {
    conditions: config.conditions.map(compileCondition),
    maxRetries: config.maxRetries ?? 3,
    stopOnUnhandledError: config.stopOnUnhandledError ?? false,
  };
}

// ============================================
// CONDITION CHECKING
// ============================================

/**
 * Check a single tool result against conditions (low-level, uses compiled config)
 */
function checkResultInternal(
  toolName: string,
  result: ToolResult | ToolResultBlock,
  config: ReturnType<typeof compileConfig>,
  currentRetries: number = 0
): ConditionCheckResult {
  const content = typeof result.content === "string"
    ? result.content
    : JSON.stringify(result.content);
  const isError = "is_error" in result ? result.is_error : false;

  for (const condition of config.conditions) {
    // Check if condition applies to this tool
    if (condition.tools && condition.tools.length > 0) {
      if (!condition.tools.includes(toolName)) {
        continue;
      }
    }

    let matched = false;

    // Check error status
    if (condition.isError === true && isError) {
      matched = true;
    }

    // Check success pattern
    if (!matched && condition._successRegex) {
      if (condition._successRegex.test(content)) {
        matched = true;
      }
    }

    // Check failure pattern (in non-error results)
    if (!matched && !isError && condition._failureRegex) {
      if (condition._failureRegex.test(content)) {
        matched = true;
      }
    }

    if (matched) {
      // Log the message
      if (condition.message) {
        console.log(`[ResultCondition:${condition.id}] ${condition.message}`);
      } else {
        console.log(`[ResultCondition:${condition.id}] Triggered: ${condition.action}`);
      }

      // Handle action
      switch (condition.action) {
        case "stop_success":
          return {
            triggered: true,
            condition,
            shouldContinue: false,
            stopReason: "success",
          };
        case "stop_failure":
          return {
            triggered: true,
            condition,
            shouldContinue: false,
            stopReason: "failure",
          };
        case "retry":
          if (currentRetries >= config.maxRetries) {
            return {
              triggered: true,
              condition,
              shouldContinue: false,
              stopReason: "max_retries",
            };
          }
          return {
            triggered: true,
            condition,
            shouldContinue: true,
            retryIncrement: 1,
          };
        case "continue":
          return {
            triggered: true,
            condition,
            shouldContinue: true,
          };
      }
    }
  }

  // No condition matched - check for unhandled errors
  if (isError && config.stopOnUnhandledError) {
    return {
      triggered: false,
      shouldContinue: false,
      stopReason: "error",
    };
  }

  // Default: continue
  return {
    triggered: false,
    shouldContinue: true,
  };
}

/**
 * Check a single tool result against conditions (public API)
 * Accepts raw config and compiles it internally
 */
export function checkResultConditions(
  toolName: string,
  result: ToolResult | ToolResultBlock,
  config: ResultConditionsConfig,
  currentRetries: number = 0
): ConditionCheckResult {
  const compiled = compileConfig(config);
  return checkResultInternal(toolName, result, compiled, currentRetries);
}

/**
 * Check multiple tool results
 */
export function checkAllResults(
  results: Array<{ toolName: string; result: ToolResult | ToolResultBlock }>,
  config: ResultConditionsConfig,
  currentRetries: number = 0
): ConditionCheckResult {
  const compiled = compileConfig(config);
  let totalRetryIncrement = 0;

  for (const { toolName, result } of results) {
    const check = checkResultInternal(
      toolName,
      result,
      compiled,
      currentRetries + totalRetryIncrement
    );

    if (check.triggered) {
      if (check.retryIncrement) {
        totalRetryIncrement += check.retryIncrement;
        // Continue checking - retry actions don't stop the loop
        continue;
      }
      if (!check.shouldContinue) {
        return {
          ...check,
          checkedCount: results.length,
        };
      }
    }
  }

  // If we accumulated retries, return with retry info
  if (totalRetryIncrement > 0) {
    return {
      triggered: true,
      shouldContinue: true,
      retryIncrement: totalRetryIncrement,
      checkedCount: results.length,
    };
  }

  return { triggered: false, shouldContinue: true, checkedCount: results.length };
}

// ============================================
// CONFIG FACTORY
// ============================================

/**
 * Create config from various input formats
 */
export function createConfig(
  input: string | ResultCondition[] | ResultConditionsConfig,
  options: Partial<ResultConditionsConfig> = {}
): ResultConditionsConfig {
  // Already a full config
  if (typeof input === "object" && "conditions" in input) {
    return { ...input, ...options };
  }

  // Array of conditions
  if (Array.isArray(input)) {
    return {
      conditions: input,
      maxRetries: 3,
      stopOnUnhandledError: false,
      ...options,
    };
  }

  // String input - parse as JSON
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);

      // Could be a single condition, array of conditions, or full config
      if (Array.isArray(parsed)) {
        return {
          conditions: parsed,
          maxRetries: 3,
          stopOnUnhandledError: false,
          ...options,
        };
      }

      if ("conditions" in parsed) {
        return { ...parsed, ...options };
      }

      // Single condition object
      if ("id" in parsed && "action" in parsed) {
        return {
          conditions: [parsed as ResultCondition],
          maxRetries: 3,
          stopOnUnhandledError: false,
          ...options,
        };
      }

      throw new Error("Invalid condition format");
    } catch (e) {
      throw new Error(`Failed to parse result conditions: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  throw new Error("Invalid result conditions input");
}

// ============================================
// EXAMPLE CONDITIONS (for documentation)
// ============================================

/**
 * Example conditions for documentation purposes.
 * These are NOT used by default - users must explicitly configure them.
 */
export const EXAMPLE_CONDITIONS = {
  gitPush: {
    id: "git_push_success",
    description: "Git push succeeded",
    tools: ["Bash"],
    successPattern: "(?:pushed|To\\s+\\S+|refs/heads/)",
    action: "stop_success" as ConditionAction,
    message: "Git push verified successful",
  },

  gitPushRejected: {
    id: "git_push_rejected",
    description: "Push rejected, needs pull",
    tools: ["Bash"],
    failurePattern: "rejected|fetch\\s+first|divergent",
    action: "retry" as ConditionAction,
    message: "Push rejected - retry with pull first",
  },

  testsPassed: {
    id: "tests_passed",
    description: "All tests passed",
    tools: ["Bash"],
    successPattern: "(?:all\\s+)?tests?\\s+(?:passed|succeeded)|✓",
    action: "stop_success" as ConditionAction,
    message: "Tests verified passing",
  },

  testsFailed: {
    id: "tests_failed",
    description: "Tests failed",
    tools: ["Bash"],
    failurePattern: "tests?\\s+failed|failed:\\s*\\d+",
    action: "continue" as ConditionAction,
    message: "Tests failed - AI should fix",
  },

  deploySuccess: {
    id: "deploy_success",
    description: "Deployment succeeded",
    tools: ["Bash"],
    successPattern: "deployed|deployment\\s+(?:complete|successful)",
    action: "stop_success" as ConditionAction,
    message: "Deployment verified",
  },

  buildSuccess: {
    id: "build_success",
    description: "Build succeeded",
    tools: ["Bash"],
    successPattern: "build\\s+(?:complete|successful|finished)|compiled\\s+successfully",
    action: "stop_success" as ConditionAction,
    message: "Build verified",
  },
};

// Re-export types
export type { ResultCondition as Condition, ResultConditionsConfig as Config };
