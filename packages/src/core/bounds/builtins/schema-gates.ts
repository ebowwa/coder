/**
 * Schema Gates Boundary
 *
 * Enforces runtime validation at system boundaries.
 * "A declared interface is a claim. Without enforcement,
 * claims drift from reality."
 */

import type { Boundary, BoundaryContext, BoundaryViolation } from "../types.js";

/**
 * Tools that require strict schema validation
 */
const SCHEMA_REQUIRED_TOOLS = new Set([
  "Bash", // Commands should be validated
  "Write", // File writes should have valid content
  "Edit", // Edits should match expected schema
  "Agent", // Agent calls need proper parameters
]);

/**
 * Known required fields per tool
 */
const TOOL_REQUIRED_FIELDS: Record<string, string[]> = {
  Bash: ["command"],
  Write: ["file_path", "content"],
  Edit: ["file_path", "old_string", "new_string"],
  Read: ["file_path"],
  Glob: ["pattern"],
  Grep: ["pattern"],
  Agent: ["description", "prompt"],
};

/**
 * Check if a value is non-empty
 */
function isNonEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

/**
 * Schema Gates Boundary Definition
 *
 * Enforces that:
 * 1. Required fields are present and non-empty
 * 2. Field types match expected types
 * 3. Dangerous patterns are caught early
 */
export const schemaGatesBoundary: Boundary = {
  id: "schema-gates",
  name: "Schema Gates",
  description:
    "Enforces runtime validation at system boundaries. " +
    "Ensures tool inputs match expected schemas before execution.",

  severity: "warn",

  tags: ["validation", "schema", "security"],

  enabled: true,

  check: async (context: BoundaryContext): Promise<BoundaryViolation | null> => {
    const { tool_name, tool_input } = context;

    // Check if this tool requires schema validation
    if (!SCHEMA_REQUIRED_TOOLS.has(tool_name)) {
      return null;
    }

    const requiredFields = TOOL_REQUIRED_FIELDS[tool_name] || [];
    const missingFields: string[] = [];
    const emptyFields: string[] = [];

    // Check required fields
    for (const field of requiredFields) {
      if (!(field in tool_input)) {
        missingFields.push(field);
      } else if (!isNonEmpty(tool_input[field])) {
        emptyFields.push(field);
      }
    }

    if (missingFields.length > 0 || emptyFields.length > 0) {
      const issues: string[] = [];
      if (missingFields.length > 0) {
        issues.push(`missing: ${missingFields.join(", ")}`);
      }
      if (emptyFields.length > 0) {
        issues.push(`empty: ${emptyFields.join(", ")}`);
      }

      return {
        boundaryId: "schema-gates",
        reason: `Schema validation failed for ${tool_name}: ${issues.join("; ")}`,
        suggestion: "Ensure all required fields are present and non-empty",
        autoFixable: false,
        context: { tool_name, missingFields, emptyFields },
      };
    }

    // Tool-specific validation
    if (tool_name === "Bash") {
      const command = tool_input.command as string;
      if (typeof command !== "string") {
        return {
          boundaryId: "schema-gates",
          reason: "Bash command must be a string",
          suggestion: "Provide command as a string value",
          autoFixable: false,
        };
      }

      // Check for potentially dangerous patterns
      const dangerousPatterns = [
        { pattern: /rm\s+-rf\s+\//, message: "Dangerous: rm -rf at root" },
        { pattern: />\s*\/dev\/sda/, message: "Dangerous: writing to disk device" },
        { pattern: /:(){ :|:& };:/, message: "Dangerous: fork bomb" },
      ];

      for (const { pattern, message } of dangerousPatterns) {
        if (pattern.test(command)) {
          return {
            boundaryId: "schema-gates",
            reason: message,
            suggestion: "Review command for safety before execution",
            autoFixable: false,
            context: { command },
          };
        }
      }
    }

    if (tool_name === "Write" || tool_name === "Edit") {
      const filePath = tool_input.file_path as string;

      // Check for path traversal
      if (filePath?.includes("..")) {
        return {
          boundaryId: "schema-gates",
          reason: "Path traversal detected in file_path",
          suggestion: "Use absolute paths or paths without ..",
          autoFixable: false,
          context: { filePath },
        };
      }
    }

    return null;
  },
};

/**
 * Strict Schema Gates Boundary (blocking version)
 */
export const strictSchemaGatesBoundary: Boundary = {
  id: "strict-schema-gates",
  name: "Strict Schema Gates",
  description:
    "Blocks tool execution if schema validation fails. " +
    "All required fields must be present and valid.",

  severity: "block",

  tags: ["validation", "schema", "security", "strict"],

  enabled: false, // Opt-in

  check: async (context: BoundaryContext): Promise<BoundaryViolation | null> => {
    return schemaGatesBoundary.check(context);
  },
};

export default schemaGatesBoundary;
