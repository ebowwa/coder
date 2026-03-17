/**
 * Built-in Boundaries
 *
 * These boundaries provide mechanical enforcement of common
 * patterns and conventions.
 */

export { typesFirstBoundary, strictTypesFirstBoundary } from "./types-first.js";
export { layerRulesBoundary, strictLayerRulesBoundary } from "./layer-rules.js";
export { schemaGatesBoundary, strictSchemaGatesBoundary } from "./schema-gates.js";
export { contextWallsBoundary, strictContextWallsBoundary } from "./context-walls.js";

import type { Boundary } from "../types.js";

/**
 * All built-in boundaries
 */
export const builtInBoundaries: Boundary[] = [
  typesFirstBoundary,
  layerRulesBoundary,
  schemaGatesBoundary,
  contextWallsBoundary,
];

/**
 * Strict built-in boundaries (opt-in)
 */
export const strictBuiltInBoundaries: Boundary[] = [
  strictTypesFirstBoundary,
  strictLayerRulesBoundary,
  strictSchemaGatesBoundary,
  strictContextWallsBoundary,
];

/**
 * Get all boundaries (built-in + strict if enabled)
 */
export function getAllBoundaries(includeStrict: boolean = false): Boundary[] {
  const boundaries = [...builtInBoundaries];

  if (includeStrict) {
    boundaries.push(...strictBuiltInBoundaries);
  }

  return boundaries;
}
