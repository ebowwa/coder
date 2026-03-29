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
import { evaluateCriterionWithLLM, type LLMJudgeConfig } from "./llm-judge.js";

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
  const expected = criterion.expected;

  // Handle undefined/null actual values
  if (actual === undefined || actual === null) {
    return {
      criterionId: criterion.id,
      passed: false,
      reason: `Value is ${actual === undefined ? 'undefined' : 'null'}, cannot check contains`,
      actual,
      expected,
      durationMs: Date.now() - start,
    };
  }

  let passed = false;
  let actualStr: string;
  let expectedStr: string;

  // If expected is an object (like { name: "Read" }), check if array contains matching item
  if (typeof expected === "object" && expected !== null && !Array.isArray(expected)) {
    const expectedObj = expected as Record<string, unknown>;
    if (Array.isArray(actual)) {
      // Check if any item in the array has all the expected properties
      passed = actual.some(item => {
        if (typeof item === "object" && item !== null) {
          return Object.entries(expectedObj).every(([key, value]) =>
            (item as Record<string, unknown>)[key] === value
          );
        }
        return false;
      });
      actualStr = JSON.stringify(actual);
      expectedStr = JSON.stringify(expected);
    } else {
      actualStr = typeof actual === "string" ? actual : JSON.stringify(actual);
      expectedStr = JSON.stringify(expected);
      passed = actualStr.includes(expectedStr);
    }
  } else {
    // String or primitive comparison
    expectedStr = String(expected);
    actualStr = typeof actual === "string" ? actual : JSON.stringify(actual);
    passed = actualStr.includes(expectedStr);
  }

  return {
    criterionId: criterion.id,
    passed,
    reason: passed
      ? `Value contains: "${expectedStr}"`
      : `Value does not contain "${expectedStr}"`,
    actual: actualStr,
    expected: expectedStr,
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

  // Handle undefined/null actual values
  if (actual === undefined || actual === null) {
    return {
      criterionId: criterion.id,
      passed: true, // If value doesn't exist, it doesn't contain anything
      reason: `Value is ${actual === undefined ? 'undefined' : 'null'}, correctly does not contain "${expected}"`,
      actual: actual === undefined ? 'undefined' : 'null',
      expected,
      durationMs: Date.now() - start,
    };
  }

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
 * Contains any check - matches if any of the expected values are found
 */
graderRegistry.set("contains_any", async (criterion, result, trace, workingDir) => {
  const start = Date.now();
  const actual = extractValue(criterion.target, result, trace, workingDir);
  const expectedValues = Array.isArray(criterion.expected)
    ? criterion.expected
    : [criterion.expected];

  // Handle undefined/null actual values
  if (actual === undefined || actual === null) {
    return {
      criterionId: criterion.id,
      passed: false,
      reason: `Value is ${actual === undefined ? 'undefined' : 'null'}, cannot check contains_any`,
      actual,
      expected: expectedValues,
      durationMs: Date.now() - start,
    };
  }

  let passed = false;
  let matchedValue: unknown = null;
  const actualStr = typeof actual === "string" ? actual : JSON.stringify(actual);

  for (const expected of expectedValues) {
    // Handle object matching (like { name: "Read" })
    if (typeof expected === "object" && expected !== null && !Array.isArray(expected)) {
      const expectedObj = expected as Record<string, unknown>;
      if (Array.isArray(actual)) {
        passed = actual.some(item => {
          if (typeof item === "object" && item !== null) {
            return Object.entries(expectedObj).every(([key, value]) =>
              (item as Record<string, unknown>)[key] === value
            );
          }
          return false;
        });
        if (passed) {
          matchedValue = expected;
          break;
        }
      }
    } else {
      // String matching
      const expectedStr = String(expected);
      if (actualStr.toLowerCase().includes(expectedStr.toLowerCase())) {
        passed = true;
        matchedValue = expected;
        break;
      }
    }
  }

  return {
    criterionId: criterion.id,
    passed,
    reason: passed
      ? `Value contains one of: ${JSON.stringify(matchedValue)}`
      : `Value does not contain any of: ${JSON.stringify(expectedValues)}`,
    actual: actualStr.slice(0, 200),
    expected: expectedValues,
    durationMs: Date.now() - start,
  };
});

/**
 * Matches any check - regex match against any of multiple patterns
 */
graderRegistry.set("matches_any", async (criterion, result, trace, workingDir) => {
  const start = Date.now();
  const actual = extractValue(criterion.target, result, trace, workingDir);
  const patterns = Array.isArray(criterion.expected)
    ? criterion.expected
    : [criterion.expected];
  const actualStr = typeof actual === "string" ? actual : JSON.stringify(actual);

  let passed = false;
  let matchedPattern: string | null = null;

  for (const pattern of patterns) {
    try {
      const regex = new RegExp(String(pattern), "si"); // case-insensitive
      if (regex.test(actualStr)) {
        passed = true;
        matchedPattern = String(pattern);
        break;
      }
    } catch {
      // Invalid regex, skip
    }
  }

  return {
    criterionId: criterion.id,
    passed,
    reason: passed
      ? `Value matches pattern: ${matchedPattern}`
      : `Value does not match any pattern: ${JSON.stringify(patterns)}`,
    actual: actualStr.slice(0, 200),
    expected: patterns,
    durationMs: Date.now() - start,
  };
});

/**
 * Count check - exact count match
 */
graderRegistry.set("count", async (criterion, result, trace, workingDir) => {
  const start = Date.now();
  const actual = extractValue(criterion.target, result, trace, workingDir);
  const expected = Number(criterion.expected);
  const actualCount = Array.isArray(actual) ? actual.length : Number(actual) || 0;
  const passed = actualCount === expected;

  return {
    criterionId: criterion.id,
    passed,
    reason: passed
      ? `Count equals expected: ${expected}`
      : `Expected count ${expected}, got ${actualCount}`,
    actual: actualCount,
    expected,
    durationMs: Date.now() - start,
  };
});

/**
 * Count min check - minimum count
 */
graderRegistry.set("count_min", async (criterion, result, trace, workingDir) => {
  const start = Date.now();
  const actual = extractValue(criterion.target, result, trace, workingDir);
  const minCount = Number(criterion.expected);
  const actualCount = Array.isArray(actual) ? actual.length : Number(actual) || 0;
  const passed = actualCount >= minCount;

  return {
    criterionId: criterion.id,
    passed,
    reason: passed
      ? `Count ${actualCount} >= minimum ${minCount}`
      : `Count ${actualCount} is less than minimum ${minCount}`,
    actual: actualCount,
    expected: `>= ${minCount}`,
    durationMs: Date.now() - start,
  };
});

/**
 * Count max check - maximum count
 */
graderRegistry.set("count_max", async (criterion, result, trace, workingDir) => {
  const start = Date.now();
  const actual = extractValue(criterion.target, result, trace, workingDir);
  const maxCount = Number(criterion.expected);
  const actualCount = Array.isArray(actual) ? actual.length : Number(actual) || 0;
  const passed = actualCount <= maxCount;

  return {
    criterionId: criterion.id,
    passed,
    reason: passed
      ? `Count ${actualCount} <= maximum ${maxCount}`
      : `Count ${actualCount} exceeds maximum ${maxCount}`,
    actual: actualCount,
    expected: `<= ${maxCount}`,
    durationMs: Date.now() - start,
  };
});

/**
 * Sequence check - verify items appear in order
 */
graderRegistry.set("sequence", async (criterion, result, trace, workingDir) => {
  const start = Date.now();
  const actual = extractValue(criterion.target, result, trace, workingDir);
  const expectedSequence = Array.isArray(criterion.expected)
    ? criterion.expected
    : [criterion.expected];

  if (!Array.isArray(actual)) {
    return {
      criterionId: criterion.id,
      passed: false,
      reason: "Actual value is not an array, cannot check sequence",
      actual,
      expected: expectedSequence,
      durationMs: Date.now() - start,
    };
  }

  // For tool_calls_sequence, actual is already an array of tool names
  const actualArr = actual;
  let lastIndex = -1;
  let passed = true;
  let failedAt: number | null = null;

  for (let i = 0; i < expectedSequence.length; i++) {
    const expected = expectedSequence[i];
    const currentIndex = actualArr.findIndex((item, idx) => {
      if (idx <= lastIndex) return false;
      if (typeof expected === "object" && typeof item === "object") {
        return JSON.stringify(item).includes(JSON.stringify(expected).slice(1, -1));
      }
      return String(item).toLowerCase().includes(String(expected).toLowerCase());
    });

    if (currentIndex === -1) {
      passed = false;
      failedAt = i;
      break;
    }
    lastIndex = currentIndex;
  }

  return {
    criterionId: criterion.id,
    passed,
    reason: passed
      ? `Sequence found in order: ${JSON.stringify(expectedSequence)}`
      : `Sequence broken at item ${failedAt}: ${JSON.stringify(expectedSequence[failedAt!])}`,
    actual: actualArr,
    expected: expectedSequence,
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

/**
 * LLM-as-Judge evaluation - uses LLM to evaluate subjective criteria
 * Expected format: { dimensions: string[], threshold: number, model?: string }
 */
graderRegistry.set("llm_judge", async (criterion, result, trace, workingDir) => {
  const start = Date.now();

  // Extract judge config from expected
  const expected = criterion.expected as Record<string, unknown>;
  const dimensions = (expected?.dimensions as string[]) ?? ["correctness", "quality", "completeness"];
  const threshold = (expected?.threshold as number) ?? 0.7;
  const model = (expected?.model as string) ?? "glm-5";

  // Build judge config from env
  const judgeConfig: LLMJudgeConfig = {
    model,
    apiKey: process.env.ANTHROPIC_API_KEY ?? process.env.API_KEY ?? "",
    baseUrl: process.env.ANTHROPIC_BASE_URL,
    dimensions,
    threshold,
  };

  // Run LLM judge
  const judgeResult = await evaluateCriterionWithLLM(criterion, result, trace, judgeConfig);

  return {
    criterionId: criterion.id,
    passed: judgeResult.passed,
    reason: judgeResult.reasoning,
    actual: judgeResult.criteria,
    expected: { dimensions, threshold },
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
      const filtered = (target as { toolName?: string }).toolName
        ? toolCalls.filter((tc) => tc.name === target.toolName)
        : toolCalls;
      const index = (target as { index?: number }).index ?? 0;
      return filtered[index];
    }

    case "tool_calls": {
      // Return all tool calls as array
      return trace.toolCalls;
    }

    case "tool_calls_sequence": {
      // Return tool call names in order
      return trace.toolCalls.map((tc) => tc.name);
    }

    case "tool_call_count": {
      // Return count of tool calls
      return trace.toolCalls.length;
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

    case "state_changes": {
      // Return all state changes (from stateTransitions)
      return trace.stateTransitions.map((st) => ({
        from: st.from,
        to: st.to,
        event: st.event,
      }));
    }

    case "file_changes": {
      // Return all file changes
      return trace.fileChanges;
    }

    case "error_count": {
      // Return count of errors
      return trace.toolCalls.filter((tc) => tc.success === false || tc.isError).length;
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
  // Extract operator from condition (supports both string and object formats)
  const operatorRaw = typeof criterion.condition === "string"
    ? criterion.condition
    : (criterion.condition as { operator?: ConditionOperator }).operator;

  // Handle missing or invalid operator
  if (!operatorRaw) {
    return {
      criterionId: criterion.id,
      passed: false,
      reason: "Missing condition operator",
      durationMs: 0,
    };
  }

  const grader = graderRegistry.get(operatorRaw);

  if (!grader) {
    return {
      criterionId: criterion.id,
      passed: false,
      reason: `Unknown condition operator: ${operatorRaw}`,
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
