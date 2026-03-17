/**
 * Context Walls Boundary
 *
 * Prevents context pollution - ensures tool inputs don't
 * contain excessive or irrelevant data that could confuse
 * the model or slow down execution.
 */

import type { Boundary, BoundaryContext, BoundaryViolation } from "../types.js";

/**
 * Maximum string length for tool inputs
 */
const MAX_STRING_LENGTH = 10000;
const MAX_ARRAY_LENGTH = 100;
const MAX_OBJECT_DEPTH = 5;

/**
 * Check string length
 */
function checkStringLength(value: unknown, maxLength: number): string[] {
  if (typeof value !== "string") return [];

  const issues: string[] = [];
  if (value.length > maxLength) {
    issues.push(`String exceeds ${maxLength} characters (${value.length})`);
  }

  return issues;
}

/**
 * Check array length
 */
function checkArrayLength(value: unknown, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];

  const issues: string[] = [];
  if (value.length > maxLength) {
    issues.push(`Array exceeds ${maxLength} items (${value.length})`);
  }

  return issues;
}

/**
 * Check object depth (nesting level)
 */
function checkObjectDepth(value: unknown, maxDepth: number, currentDepth: number = 0): string[] {
  if (typeof value !== "object" || value === null) return [];

  if (currentDepth >= maxDepth) {
    return [`Object depth exceeds ${maxDepth} levels`];
  }

  const issues: string[] = [];

  for (const [, val] of Object.entries(value as Record<string, unknown>)) {
    const nestedIssues = checkObjectDepth(val, maxDepth, currentDepth + 1);
    issues.push(...nestedIssues);
  }

  return issues;
}

/**
 * Tools that commonly have large inputs that should be exempt from strict checks
 */
const EXEMPT_TOOLS = new Set([
  "Read", // File content reading
  "Glob", // File pattern matching
  "Grep", // Content searching
  "LSP", // Language server protocol
]);

/**
 * Context Walls Boundary Definition
 *
 * Prevents:
 * 1. Excessively long strings in tool inputs
 * 2. Deeply nested objects in tool inputs
 * 3. Large arrays in tool inputs
 */
export const contextWallsBoundary: Boundary = {
  id: "context-walls",
  name: "Context Walls",
  description:
    "Prevents context pollution by limiting tool input size. " +
    "Large inputs slow down execution and can confuse the model.",

  severity: "warn",

  tags: ["performance", "context", "pollution"],

  enabled: true,

  check: async (context: BoundaryContext): Promise<BoundaryViolation | null> => {
    // Skip exempt tools
    if (EXEMPT_TOOLS.has(context.tool_name)) {
      return null;
    }

    const input = context.tool_input;
    const issues: string[] = [];

    // Check string lengths
    for (const [key, value] of Object.entries(input)) {
      if (typeof value === "string") {
        const stringIssues = checkStringLength(value, MAX_STRING_LENGTH);
        issues.push(...stringIssues.map((i) => `${key}: ${i}`));
      }
    }

    // Check array lengths
    for (const [key, value] of Object.entries(input)) {
      if (Array.isArray(value)) {
        const arrayIssues = checkArrayLength(value, MAX_ARRAY_LENGTH);
        issues.push(...arrayIssues.map((i) => `${key}: ${i}`));
      }
    }

    // Check object depth
    for (const [key, value] of Object.entries(input)) {
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        const depthIssues = checkObjectDepth(value, MAX_OBJECT_DEPTH, 0);
        issues.push(...depthIssues.map((i) => `${key}: ${i}`));
      }
    }

    if (issues.length > 0) {
      return {
        boundaryId: "context-walls",
        reason: `Tool input may contain potentially problematic data`,
        suggestion: "Consider reducing input size or complexity",
        autoFixable: false,
        context: { issues, toolName: context.tool_name },
      };
    }

    return null;
  },
};

/**
 * Strict Context Walls Boundary (blocking version)
 */
export const strictContextWallsBoundary: Boundary = {
  id: "strict-context-walls",
  name: "Strict Context Walls",
  description:
    "Blocks tool inputs that exceed size or complexity limits. " +
    "Prevents context pollution from impacting token usage.",

  severity: "block",

  tags: ["performance", "context", "pollution", "strict"],

  enabled: false, // Opt-in

  check: async (context: BoundaryContext): Promise<BoundaryViolation | null> => {
    // Skip exempt tools
    if (EXEMPT_TOOLS.has(context.tool_name)) {
      return null;
    }

    const input = context.tool_input;
    const issues: string[] = [];

    // Stricter limits
    const STRICT_MAX_STRING = 5000;
    const STRICT_MAX_ARRAY = 50;
    const STRICT_MAX_DEPTH = 3;

    // Check string lengths
    for (const [key, value] of Object.entries(input)) {
      if (typeof value === "string" && value.length > STRICT_MAX_STRING) {
        issues.push(`${key}: ${value.length} chars (max ${STRICT_MAX_STRING})`);
      }
    }

    // Check array lengths
    for (const [key, value] of Object.entries(input)) {
      if (Array.isArray(value) && value.length > STRICT_MAX_ARRAY) {
        issues.push(`${key}: ${value.length} items (max ${STRICT_MAX_ARRAY})`);
      }
    }

    // Check object depth
    for (const [key, value] of Object.entries(input)) {
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        const depthIssues = checkObjectDepth(value, STRICT_MAX_DEPTH, 0);
        if (depthIssues.length > 0) {
          issues.push(`${key}: depth exceeds ${STRICT_MAX_DEPTH}`);
        }
      }
    }

    if (issues.length > 0) {
      return {
        boundaryId: "strict-context-walls",
        reason: `Tool input exceeds size limits`,
        suggestion: "Reduce input size before executing",
        autoFixable: false,
        context: { issues },
      };
    }

    return null;
  },
};

export default contextWallsBoundary;
