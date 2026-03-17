/**
 * Layer Rules Boundary
 *
 * Enforces dependency direction in layered architecture.
 * Prevents lower layers from importing from higher layers.
 */

import type { Boundary, BoundaryContext, BoundaryViolation } from "../types.js";

/**
 * Layer definitions - order matters (lower index = lower layer)
 */
const LAYERS = [
  { name: "types", patterns: [/\/types\//, /\\types\\/, /types\.ts$/, /types\.d\.ts$/] },
  { name: "core", patterns: [/\/core\//, /\\core\\/] },
  { name: "ecosystem", patterns: [/\/ecosystem\//, /\\ecosystem\\/] },
  { name: "interfaces", patterns: [/\/interfaces\//, /\\interfaces\\/] },
];

/**
 * Get the layer for a file path
 */
function getLayer(filePath: string): string | null {
  for (const layer of LAYERS) {
    for (const pattern of layer.patterns) {
      if (pattern.test(filePath)) {
        return layer.name;
      }
    }
  }
  return null;
}

/**
 * Get layer index (lower = more foundational)
 */
function getLayerIndex(layerName: string): number {
  return LAYERS.findIndex((l) => l.name === layerName);
}

/**
 * Extract imports from content
 */
function extractImports(content: string): string[] {
  const imports: string[] = [];

  // Match ES6 imports
  const importMatches = content.matchAll(
    /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g
  );
  for (const match of importMatches) {
    if (match[1]) imports.push(match[1]);
  }

  // Match dynamic imports
  const dynamicMatches = content.matchAll(/import\(['"]([^'"]+)['"]\)/g);
  for (const match of dynamicMatches) {
    if (match[1]) imports.push(match[1]);
  }

  return imports;
}

/**
 * Resolve relative import to absolute-ish path
 */
function resolveImport(
  importPath: string,
  fromFile: string,
  workingDir: string
): string {
  // Skip external packages
  if (!importPath.startsWith(".") && !importPath.startsWith("/")) {
    return importPath;
  }

  // Simple resolution (not perfect but good enough for layer checking)
  if (importPath.startsWith("./") || importPath.startsWith("../")) {
    const fromDir = fromFile.substring(0, fromFile.lastIndexOf("/"));
    const parts = fromDir.split("/");
    const importParts = importPath.split("/");

    for (const part of importParts) {
      if (part === "..") {
        parts.pop();
      } else if (part !== ".") {
        parts.push(part);
      }
    }

    return parts.join("/");
  }

  return importPath;
}

/**
 * Layer Rules Boundary Definition
 *
 * Enforces that:
 * 1. Types layer can only be imported (no imports from other layers)
 * 2. Core layer cannot import from ecosystem or interfaces
 * 3. Ecosystem layer cannot import from interfaces
 */
export const layerRulesBoundary: Boundary = {
  id: "layer-rules",
  name: "Layer Rules",
  description:
    "Enforces dependency direction in layered architecture. " +
    "Lower layers (types, core) should not depend on higher layers (ecosystem, interfaces).",

  severity: "warn",

  tags: ["architecture", "dependencies", "layers"],

  enabled: true,

  check: async (context: BoundaryContext): Promise<BoundaryViolation | null> => {
    // Only check Write and Edit operations
    if (context.tool_name !== "Write" && context.tool_name !== "Edit") {
      return null;
    }

    const filePath = context.tool_input.file_path as string | undefined;
    if (!filePath) return null;

    const fileLayer = getLayer(filePath);
    if (!fileLayer) {
      // File not in a recognized layer
      return null;
    }

    const content = context.tool_input.content || context.tool_input.new_string;
    if (!content || typeof content !== "string") {
      return null;
    }

    const imports = extractImports(content);
    const violations: string[] = [];

    for (const importPath of imports) {
      // Skip external packages
      if (!importPath.startsWith(".") && !importPath.startsWith("/")) {
        continue;
      }

      const resolvedPath = resolveImport(
        importPath,
        filePath,
        context.workingDirectory
      );
      const importLayer = getLayer(resolvedPath);

      if (importLayer) {
        const fileLayerIndex = getLayerIndex(fileLayer);
        const importLayerIndex = getLayerIndex(importLayer);

        // Check if importing from a higher layer
        if (importLayerIndex > fileLayerIndex) {
          violations.push(
            `${fileLayer} -> ${importLayer} (${importPath})`
          );
        }
      }
    }

    if (violations.length > 0) {
      return {
        boundaryId: "layer-rules",
        reason: `Layer violation: ${fileLayer} layer imports from higher layers`,
        suggestion:
          "Restructure code to maintain proper layer dependencies (lower layers should not depend on higher layers)",
        autoFixable: false,
        context: { violations, fileLayer },
      };
    }

    return null;
  },
};

/**
 * Strict Layer Rules Boundary (blocking version)
 */
export const strictLayerRulesBoundary: Boundary = {
  id: "strict-layer-rules",
  name: "Strict Layer Rules",
  description:
    "Blocks dependency violations in layered architecture. " +
    "Prevents any imports from higher layers.",

  severity: "block",

  tags: ["architecture", "dependencies", "layers", "strict"],

  enabled: false, // Opt-in

  check: async (context: BoundaryContext): Promise<BoundaryViolation | null> => {
    // Use the same logic but with blocking severity
    return layerRulesBoundary.check(context);
  },
};

export default layerRulesBoundary;
