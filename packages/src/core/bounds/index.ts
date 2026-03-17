/**
 * Bounds - Boundary Enforcement System
 *
 * "The harness defines the boundaries, the agent converges faster
 * because the solution space is constrained."
 *
 * This module provides mechanical enforcement of constraints,
 * not declarative suggestions. Failures become signals that
 * improve the environment.
 *
 * Architecture:
 * - types.ts: Core type definitions
 * - registry.ts: Boundary, signal, and patch management
 * - enforcer.ts: Hook-based enforcement
 * - signals.ts: Failure signal extraction and analysis
 * - patcher.ts: Signal → boundary patch generation
 * - builtins/: Built-in boundary definitions
 *
 * Usage:
 * ```typescript
 * import { getEnforcer, getRegistry } from "@ebowwa/coder/bounds";
 *
 * // Get the enforcer and register with hook manager
 * const enforcer = getEnforcer();
 * enforcer.registerWithHookManager(hookManager);
 *
 * // Register built-in boundaries
 * const { builtInBoundaries } = await import("@ebowwa/coder/bounds/builtins");
 * const registry = getRegistry();
 * registry.registerAll(builtInBoundaries);
 * ```
 */

// Core types
export type {
  Boundary,
  BoundaryContext,
  BoundaryViolation,
  BoundarySeverity,
  BoundaryCheckResult,
  FailureSignal,
  ErrorType,
  BoundaryPatch,
  PatchSource,
  NewBoundaryPatch,
  BoundaryStats,
  BoundaryRegistryConfig,
  BoundsHookInput,
  BoundsHookOutput,
} from "./types.js";

// Registry
export { BoundaryRegistry, getRegistry, resetRegistry } from "./registry.js";

// Enforcer
export {
  BoundaryEnforcer,
  getEnforcer,
  resetEnforcer,
  createPreToolUseHandler,
  createPostFailureHandler,
  type EnforcerConfig,
} from "./enforcer.js";

// Signal analysis
export {
  SignalAnalyzer,
  SignalAggregator,
  getAnalyzer,
  getAggregator,
  type ErrorPattern,
} from "./signals.js";

// Patch generation
export {
  BoundaryPatcher,
  getPatcher,
  resetPatcher,
  type PatchRule,
  type PatchGenerator,
} from "./patcher.js";

// Built-in boundaries
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

/**
 * Initialize the bounds system with default configuration
 */
export async function initializeBounds(
  options?: {
    registerBuiltIns?: boolean;
    includeStrict?: boolean;
    config?: BoundaryRegistryConfig;
  }
): Promise<{ registry: BoundaryRegistry; enforcer: BoundaryEnforcer }> {
  const { registerBuiltIns = true, includeStrict = false, config } = options || {};

  // Get registry
  const registry = getRegistry(config);

  // Load persisted state
  await registry.load();

  // Register built-in boundaries
  if (registerBuiltIns) {
    const { getAllBoundaries } = await import("./builtins/index.js");
    const boundaries = getAllBoundaries(includeStrict);
    registry.registerAll(boundaries);
  }

  // Get enforcer
  const enforcer = getEnforcer({ registry });

  return { registry, enforcer };
}
