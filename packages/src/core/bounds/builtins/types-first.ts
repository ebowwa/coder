/**
 * Types-First Boundary
 *
 * Enforces the pattern: Extract types into types.ts before implementation.
 * This ensures interfaces are defined before code is written.
 */

import type { Boundary, BoundaryContext, BoundaryViolation } from "../types.js";

/**
 * Check if a file is a types file
 */
function isTypesFile(filePath: string): boolean {
  return (
    filePath.endsWith("types.ts") ||
    filePath.endsWith("types.d.ts") ||
    filePath.includes("/types/") ||
    filePath.includes("\\types\\")
  );
}

/**
 * Check if a file is an implementation file that should reference types
 */
function isImplementationFile(filePath: string): boolean {
  return (
    (filePath.endsWith(".ts") && !isTypesFile(filePath)) ||
    filePath.endsWith(".tsx")
  );
}

/**
 * Extract potential type definitions from content
 */
function extractTypeDefinitions(content: string): string[] {
  const definitions: string[] = [];

  // Match interface definitions
  const interfaceMatches = content.matchAll(/interface\s+(\w+)/g);
  for (const match of interfaceMatches) {
    definitions.push(`interface:${match[1]}`);
  }

  // Match type definitions
  const typeMatches = content.matchAll(/type\s+(\w+)/g);
  for (const match of typeMatches) {
    definitions.push(`type:${match[1]}`);
  }

  // Match enum definitions
  const enumMatches = content.matchAll(/enum\s+(\w+)/g);
  for (const match of enumMatches) {
    definitions.push(`enum:${match[1]}`);
  }

  return definitions;
}

/**
 * Types-First Boundary Definition
 *
 * This boundary enforces that:
 * 1. Types should be defined in types.ts files
 * 2. Implementation files should import from types files
 * 3. New interfaces in implementation files should be warned
 */
export const typesFirstBoundary: Boundary = {
  id: "types-first",
  name: "Types-First Development",
  description:
    "Enforces extracting types into types.ts before implementation. " +
    "Types should be defined in dedicated type files, not inline in implementation.",

  severity: "warn",

  tags: ["architecture", "types", "convention"],

  enabled: true,

  check: async (context: BoundaryContext): Promise<BoundaryViolation | null> => {
    // Only check Write and Edit operations
    if (context.tool_name !== "Write" && context.tool_name !== "Edit") {
      return null;
    }

    const filePath = context.tool_input.file_path as string | undefined;
    if (!filePath || !isImplementationFile(filePath)) {
      return null;
    }

    // Get the content being written
    const content = context.tool_input.content || context.tool_input.new_string;
    if (!content || typeof content !== "string") {
      return null;
    }

    // Check for type definitions in implementation file
    const definitions = extractTypeDefinitions(content);

    // Warn if there are many type definitions in implementation
    if (definitions.length > 2) {
      return {
        boundaryId: "types-first",
        reason: `Implementation file contains ${definitions.length} type definitions: ${definitions
          .slice(0, 3)
          .join(", ")}`,
        suggestion:
          "Consider extracting types to a types.ts file in the same directory",
        autoFixable: false,
        context: { definitions, filePath },
      };
    }

    // Check for interface definitions that should be in types file
    const interfaceDefs = definitions.filter((d) => d.startsWith("interface:"));
    if (interfaceDefs.length > 1) {
      return {
        boundaryId: "types-first",
        reason: `Multiple interfaces defined in implementation file`,
        suggestion: "Extract interfaces to types.ts for better reusability",
        autoFixable: false,
        context: { interfaceDefs, filePath },
      };
    }

    return null;
  },
};

/**
 * Strict Types-First Boundary (blocking version)
 *
 * This is a stricter version that blocks files with inline type definitions
 * in certain critical directories.
 */
export const strictTypesFirstBoundary: Boundary = {
  id: "strict-types-first",
  name: "Strict Types-First",
  description:
    "Blocks type definitions in implementation files for core modules. " +
    "Core modules must have types extracted to dedicated type files.",

  severity: "block",

  tags: ["architecture", "types", "strict"],

  enabled: false, // Opt-in

  check: async (context: BoundaryContext): Promise<BoundaryViolation | null> => {
    // Only check Write operations
    if (context.tool_name !== "Write") {
      return null;
    }

    const filePath = context.tool_input.file_path as string | undefined;
    if (!filePath) return null;

    // Only enforce for core modules
    const isCoreModule =
      filePath.includes("/core/") ||
      filePath.includes("\\core\\") ||
      filePath.includes("/bounds/") ||
      filePath.includes("\\bounds\\");

    if (!isCoreModule || isTypesFile(filePath)) {
      return null;
    }

    const content = context.tool_input.content as string | undefined;
    if (!content) return null;

    const definitions = extractTypeDefinitions(content);

    if (definitions.length > 0) {
      return {
        boundaryId: "strict-types-first",
        reason: `Core module must not contain inline type definitions: ${definitions.join(
          ", "
        )}`,
        suggestion: "Extract types to a types.ts file in the same directory",
        autoFixable: false,
        context: { definitions, filePath },
      };
    }

    return null;
  },
};

export default typesFirstBoundary;
