/**
 * Code-Based Grader - Deterministic evaluation functions
 *
 * Implements objective checks that don't require LLM judgment:
 * - File existence/content checks
 * - Tool call validation
 * - Metric thresholds
 * - Format validation
 *
 * @module eval/graders/code-based
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type {
  SuccessCriterion,
  SuccessCriteriaConfig,
  CriterionResult,
  EvalTask,
  EvalTrace,
  ConditionOperator,
} from "../types.js";
import type { AgentLoopResult } from "../../schemas/agent-loop.zod.js";
import type { TextBlock, ToolUseBlock, ToolResultBlock } from "../../schemas/index.js";

// ============================================
// GRADER REGISTRY
// ============================================

type GraderFunction = (
  criterion: SuccessCriterion,
  result: AgentLoopResult,
  trace: EvalTrace,
  workingDir?: string
) => Promise<CriterionResult>;

const graderRegistry = new Map<ConditionOperator, GraderFunction>();

// ============================================
// OPERATOR IMPLEMENTATIONS
// ============================================

/**
 * Equals check
 */
graderRegistry.set("equals", async (criterion, result, trace, workingDir) => {
  const start = Date.now();
  const actual = extractValue(criterion.target, result, trace, workingDir);
  const expected = criterion.expected;
  const passed = JSON.stringify(actual) === JSON.stringify(expected);

  return {
    criterionId: criterion.id,
    passed,
    reason: passed
      ? `Value equals expected: ${JSON.stringify(expected)}`
      : `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    actual,
    expected,
    durationMs: Date.now() - start,
  };
});

/**
 * Not equals check
 */
graderRegistry.set("not_equals", async (criterion, result, trace, workingDir) => {
  const start = Date.now();
  const actual = extractValue(criterion.target, result, trace, workingDir);
  const expected = criterion.expected;
  const passed = JSON.stringify(actual) !== JSON.stringify(expected);

  return {
    criterionId: criterion.id,
    passed,
    reason: passed
      ? `Value correctly differs from: ${JSON.stringify(expected)}`
      : `Value should not equal ${JSON.stringify(expected)}`,
    actual,
    expected,
    durationMs: Date.now() - start,
  };
});

/**
 * Contains check
 */
graderRegistry.set("contains", async (criterion, result, trace, workingDir) => {
  const start = Date.now();
  const actual = extractValue(criterion.target, result, trace, workingDir);
  const expected = String(criterion.expected);
  const actualStr = typeof actual === "string" ? actual : JSON.stringify(actual);
  const passed = actualStr.includes(expected);

  return {
    criterionId: criterion.id,
    passed,
    reason: passed
      ? `Value contains: "${expected}"`
      : `Value does not contain "${expected}"`,
    actual: actualStr,
    expected,
    durationMs: Date.now() - start,
  };
});

/**
 * Not contains check
 */
graderRegistry.set("not_contains", async (criterion, result, trace, workingDir) => {
  const start = Date.now();
  const actual = extractValue(criterion.target, result, trace, workingDir);
  const expected = String(criterion.expected);
  const actualStr = typeof actual === "string" ? actual : JSON.stringify(actual);
  const passed = !actualStr.includes(expected);

  return {
    criterionId: criterion.id,
    passed,
    reason: passed
      ? `Value correctly does not contain: "${expected}"`
      : `Value should not contain "${expected}"`,
    actual: actualStr,
    expected,
    durationMs: Date.now() - start,
  };
});

/**
 * Regex match check
 */
graderRegistry.set("matches", async (criterion, result, trace, workingDir) => {
  const start = Date.now();
  const actual = extractValue(criterion.target, result, trace, workingDir);
  const pattern = String(criterion.expected);
  const actualStr = typeof actual === "string" ? actual : JSON.stringify(actual);

  let passed = false;
  try {
    const regex = new RegExp(pattern, "s");
    passed = regex.test(actualStr);
  } catch {
    return {
      criterionId: criterion.id,
      passed: false,
      reason: `Invalid regex pattern: ${pattern}`,
      actual: actualStr,
      expected: pattern,
      durationMs: Date.now() - start,
    };
  }

  return {
    criterionId: criterion.id,
    passed,
    reason: passed
      ? `Value matches pattern: ${pattern}`
      : `Value does not match pattern: ${pattern}`,
    actual: actualStr,
    expected: pattern,
    durationMs: Date.now() - start,
  };
});

/**
 * Greater than check
 */
graderRegistry.set("greater_than", async (criterion, result, trace, workingDir) => {
  const start = Date.now();
  const actual = extractValue(criterion.target, result, trace, workingDir);
  const expected = Number(criterion.expected);
  const actualNum = Number(actual);
  const passed = !isNaN(actualNum) && !isNaN(expected) && actualNum > expected;

  return {
    criterionId: criterion.id,
    passed,
    reason: passed
      ? `${actualNum} > ${expected}`
      : `${actualNum} is not greater than ${expected}`,
    actual: actualNum,
    expected,
    durationMs: Date.now() - start,
  };
});

/**
 * Less than check
 */
graderRegistry.set("less_than", async (criterion, result, trace, workingDir) => {
  const start = Date.now();
  const actual = extractValue(criterion.target, result, trace, workingDir);
  const expected = Number(criterion.expected);
  const actualNum = Number(actual);
  const passed = !isNaN(actualNum) && !isNaN(expected) && actualNum < expected;

  return {
    criterionId: criterion.id,
    passed,
    reason: passed
      ? `${actualNum} < ${expected}`
      : `${actualNum} is not less than ${expected}`,
    actual: actualNum,
    expected,
    durationMs: Date.now() - start,
  };
});

/**
 * Exists check
 */
graderRegistry.set("exists", async (criterion, result, trace, workingDir) => {
  const start = Date.now();
  const actual = extractValue(criterion.target, result, trace, workingDir);
  const passed = actual !== undefined && actual !== null;

  return {
    criterionId: criterion.id,
    passed,
    reason: passed ? "Value exists" : "Value does not exist",
    actual: passed ? typeof actual : undefined,
    expected: "exists",
    durationMs: Date.now() - start,
  };
});

/**
 * Not exists check
 */
graderRegistry.set("not_exists", async (criterion, result, trace, workingDir) => {
  const start = Date.now();
  const actual = extractValue(criterion.target, result, trace, workingDir);
  const passed = actual === undefined || actual === null;

  return {
    criterionId: criterion.id,
    passed,
    reason: passed ? "Value correctly does not exist" : "Value exists but should not",
    actual,
    expected: "not exists",
    durationMs: Date.now() - start,
  };
});

/**
 * Valid JSON check
 */
graderRegistry.set("is_valid_json", async (criterion, result, trace, workingDir) => {
  const start = Date.now();
  const actual = extractValue(criterion.target, result, trace, workingDir);
  const actualStr = typeof actual === "string" ? actual : JSON.stringify(actual);

  let passed = false;
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(actualStr);
    passed = true;
  } catch {
    // Not valid JSON
  }

  return {
    criterionId: criterion.id,
    passed,
    reason: passed ? "Valid JSON" : "Invalid JSON",
    actual: passed ? typeof parsed : actualStr.slice(0, 100),
    expected: "valid JSON",
    durationMs: Date.now() - start,
  };
});

/**
 * Valid TypeScript check (basic syntax)
 */
graderRegistry.set("is_valid_typescript", async (criterion, result, trace, workingDir) => {
  const start = Date.now();
  const actual = extractValue(criterion.target, result, trace, workingDir);
  const actualStr = typeof actual === "string" ? actual : JSON.stringify(actual);

  // Basic TypeScript syntax checks
  const hasMatchingBraces =
    (actualStr.match(/{/g) || []).length === (actualStr.match(/}/g) || []).length;
  const hasMatchingParens =
    (actualStr.match(/\(/g) || []).length === (actualStr.match(/\)/g) || []).length;
  const hasMatchingBrackets =
    (actualStr.match(/\[/g) || []).length === (actualStr.match(/]/g) || []).length;

  const passed = hasMatchingBraces && hasMatchingParens && hasMatchingBrackets;

  return {
    criterionId: criterion.id,
    passed,
    reason: passed
      ? "Basic syntax check passed"
      : "Syntax check failed: mismatched braces/brackets/parens",
    actual: `${actualStr.length} chars`,
    expected: "valid TypeScript",
    durationMs: Date.now() - start,
  };
});

/**
 * File exists check
 */
graderRegistry.set("file_exists", async (criterion, result, trace, workingDir) => {
  const start = Date.now();
  const filePath = criterion.target.type === "file_path"
    ? criterion.target.path
    : criterion.target.type === "file_content"
      ? criterion.target.path
      : String(criterion.expected);

  const fullPath = workingDir ? join(workingDir, filePath) : filePath;
  const passed = existsSync(fullPath);

  return {
    criterionId: criterion.id,
    passed,
    reason: passed ? `File exists: ${filePath}` : `File does not exist: ${filePath}`,
    actual: filePath,
    expected: "exists",
    durationMs: Date.now() - start,
  };
});

/**
 * File contains check
 */
graderRegistry.set("file_contains", async (criterion, result, trace, workingDir) => {
  const start = Date.now();
  const filePath = criterion.target.type === "file_content"
    ? criterion.target.path
    : String(criterion.expected);
  const searchContent = String(criterion.expected);

  const fullPath = workingDir ? join(workingDir, filePath) : filePath;

  let passed = false;
  let actualContent = "";

  try {
    if (existsSync(fullPath)) {
      actualContent = readFileSync(fullPath, "utf-8");
      passed = actualContent.includes(searchContent);
    }
  } catch {
    // File read error
  }

  return {
    criterionId: criterion.id,
    passed,
    reason: passed
      ? `File contains: "${searchContent.slice(0, 50)}..."`
      : `File does not contain: "${searchContent.slice(0, 50)}..."`,
    actual: actualContent.slice(0, 100),
    expected: searchContent,
    durationMs: Date.now() - start,
  };
});

// ============================================
// VALUE EXTRACTION
// ============================================

/**
 * Extract value from result based on target type
 */
function extractValue(
  target: SuccessCriterion["target"],
  result: AgentLoopResult,
  trace: EvalTrace,
  workingDir?: string
): unknown {
  switch (target.type) {
    case "final_response": {
      // Get last assistant message
      const messages = result.messages;
      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (msg?.role === "assistant" && Array.isArray(msg.content)) {
          const textContent = msg.content
            .filter((b): b is TextBlock => b.type === "text")
            .map((b) => b.text)
            .join("\n");
          return textContent;
        }
      }
      return undefined;
    }

    case "tool_call": {
      const toolCalls = trace.toolCalls;
      const filtered = target.toolName
        ? toolCalls.filter((tc) => tc.name === target.toolName)
        : toolCalls;
      const index = target.index ?? 0;
      return filtered[index];
    }

    case "tool_result": {
      const toolCalls = trace.toolCalls;
      if (target.toolId) {
        return toolCalls.find((tc) => tc.id === target.toolId)?.result;
      }
      return toolCalls.map((tc) => tc.result);
    }

    case "file_path": {
      const fullPath = workingDir ? join(workingDir, target.path) : target.path;
      return existsSync(fullPath) ? target.path : undefined;
    }

    case "file_content": {
      const fullPath = workingDir ? join(workingDir, target.path) : target.path;
      try {
        return existsSync(fullPath) ? readFileSync(fullPath, "utf-8") : undefined;
      } catch {
        return undefined;
      }
    }

    case "state_change": {
      // Check file changes for state mutations
      const changes = trace.fileChanges;
      return changes.find((fc) => fc.path.includes(target.key));
    }

    case "trajectory": {
      // Return state transition path
      return trace.stateTransitions
        .map((st) => `${st.from}->${st.to}`)
        .join(",");
    }

    case "metric": {
      switch (target.name) {
        case "turns":
          return result.metrics.length;
        case "cost":
          return result.totalCost;
        case "duration":
          return result.totalDuration;
        case "tool_calls":
          return trace.toolCalls.length;
        case "compaction_count":
          return result.compactionCount;
        default:
          return undefined;
      }
    }

    case "fsm_state": {
      const lastTransition = trace.stateTransitions[trace.stateTransitions.length - 1];
      return lastTransition?.to;
    }

    case "custom": {
      // Custom evaluators are handled separately
      return { evaluator: target.evaluator };
    }

    default:
      return undefined;
  }
}

// ============================================
// MAIN GRADER FUNCTION
// ============================================

/**
 * Evaluate a single criterion
 */
export async function evaluateCriterion(
  criterion: SuccessCriterion,
  result: AgentLoopResult,
  trace: EvalTrace,
  workingDir?: string
): Promise<CriterionResult> {
  const grader = graderRegistry.get(criterion.condition);

  if (!grader) {
    return {
      criterionId: criterion.id,
      passed: false,
      reason: `Unknown condition operator: ${criterion.condition}`,
      durationMs: 0,
    };
  }

  return grader(criterion, result, trace, workingDir);
}

/**
 * Evaluate all criteria for a task
 */
export async function evaluateCriteria(
  config: SuccessCriteriaConfig,
  result: AgentLoopResult,
  trace: EvalTrace,
  workingDir?: string
): Promise<{
  passed: boolean;
  score: number;
  criteriaResults: CriterionResult[];
  reason: string;
}> {
  const criteriaResults: CriterionResult[] = [];

  for (const criterion of config.criteria) {
    const criterionResult = await evaluateCriterion(criterion, result, trace, workingDir);
    criteriaResults.push(criterionResult);
  }

  // Calculate score based on aggregation method
  let passed: boolean;
  let score: number;
  let reason: string;

  switch (config.aggregation) {
    case "all": {
      const requiredResults = criteriaResults.filter((_, i) => config.criteria[i]?.required !== false);
      passed = requiredResults.every((cr) => cr.passed);
      score = passed ? 1 : 0;
      reason = passed
        ? "All required criteria passed"
        : `Failed criteria: ${requiredResults
            .filter((cr) => !cr.passed)
            .map((cr) => cr.criterionId)
            .join(", ")}`;
      break;
    }

    case "any": {
      passed = criteriaResults.some((cr) => cr.passed);
      score = criteriaResults.filter((cr) => cr.passed).length / criteriaResults.length;
      reason = passed
        ? "At least one criterion passed"
        : "No criteria passed";
      break;
    }

    case "weighted_average": {
      let totalWeight = 0;
      let weightedScore = 0;

      for (let i = 0; i < criteriaResults.length; i++) {
        const criterion = config.criteria[i];
        const weight = criterion?.weight ?? 1;
        totalWeight += weight;
        if (criteriaResults[i]?.passed) {
          weightedScore += weight;
        }
      }

      score = totalWeight > 0 ? weightedScore / totalWeight : 0;
      passed = score >= (config.passingThreshold ?? 0.7);
      reason = `Weighted score: ${(score * 100).toFixed(1)}% (threshold: ${((config.passingThreshold ?? 0.7) * 100).toFixed(1)}%)`;
      break;
    }

    default: {
      // Default to "all" behavior
      const requiredResults = criteriaResults.filter((_, i) => config.criteria[i]?.required !== false);
      passed = requiredResults.every((cr) => cr.passed);
      score = passed ? 1 : 0;
      reason = passed ? "All required criteria passed" : "Some criteria failed";
    }
  }

  return {
    passed,
    score,
    criteriaResults,
    reason,
  };
}

/**
 * Get list of supported operators
 */
export function getSupportedOperators(): ConditionOperator[] {
  return Array.from(graderRegistry.keys());
}

// ============================================
// RE-EXPORTS
// ============================================

export {
  graderRegistry,
  extractValue,
};
