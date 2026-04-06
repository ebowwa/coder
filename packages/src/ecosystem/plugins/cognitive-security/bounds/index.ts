/**
 * Bounds - Code quality boundary enforcement
 *
 * Absorbed into the cognitive-security plugin. Provides mechanical
 * enforcement of code structure constraints (types-first, layer rules,
 * schema gates, context walls) with self-healing signal extraction.
 */

export * from "./types.js";
export { BoundaryRegistry, getRegistry, resetRegistry } from "./registry.js";
export {
  SignalAnalyzer,
  SignalAggregator,
  getAnalyzer,
  getAggregator,
  resetAnalyzers,
  type ErrorPattern,
} from "./signals.js";
export {
  BoundaryPatcher,
  getPatcher,
  resetPatcher,
  type PatchRule,
  type PatchGenerator,
} from "./patcher.js";
export {
  builtInBoundaries,
  strictBuiltInBoundaries,
  getAllBoundaries,
  typesFirstBoundary,
  strictTypesFirstBoundary,
  layerRulesBoundary,
  strictLayerRulesBoundary,
  schemaGatesBoundary,
  strictSchemaGatesBoundary,
  contextWallsBoundary,
  strictContextWallsBoundary,
} from "./builtins/index.js";
