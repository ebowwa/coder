/**
 * Policy - Teaching Rules for AI Agents
 *
 * "Policies are the curriculum. Bounds are the harness.
 * Cognitive security is the alignment check."
 *
 * This module provides declarative rules for teaching AI agents
 * what they should and shouldn't do. Policies compile to:
 * - Bounds (mechanical enforcement)
 * - AgentIntent (cognitive security alignment)
 * - LogicSpec flows (procedural specification)
 */

// Core types
export type {
  PolicyMeta,
  PolicyDocument,
  ConstraintSeverity,
  ToolPattern,
  PolicyConstraint,
  AutoFixAction,
  PolicyPermission,
  PermissionDomain,
  PermissionAction,
  BranchPermission,
  PermissionCondition,
  TeachingHint,
  TeachingExample,
  CompiledPolicy,
  CompiledBoundary,
  CompiledPermissionRule,
  PolicyIntent,
  PolicyGoal,
  PolicyBoundary,
  PolicyCheckContext,
  PolicyViolation,
  PolicyRegistryConfig,
  PolicyStats,
} from "./types.js";

// Registry
export {
  PolicyRegistry,
  getRegistry,
  resetRegistry,
} from "./registry.js";

// Compiler
export {
  compileConstraintToBoundary,
  compileConstraintsToBoundaries,
  compilePolicyToAgentIntent,
  compilePolicyToIntent,
  compilePolicyToLogicSpec,
  compilePolicy,
  type CompiledPolicyArtifacts,
} from "./compiler.js";

// Hooks
export {
  PolicyHooks,
  getPolicyHooks,
  createPolicyHookHandlers,
  DEFAULT_POLICY_HOOK_CONFIG,
  type PolicyHookConfig,
  type PolicyEvent,
} from "./hooks.js";

// Built-in policies
export {
  gitSafetyPolicy,
  filesystemSafetyPolicy,
  networkSafetyPolicy,
  codeQualityPolicy,
  devWorkflowPolicy,
  builtInPolicies,
  criticalPolicies,
  developmentPolicies,
  getAllPolicies,
} from "./builtins.js";

// Cognitive security integration
export {
  policyIntentToAgentIntent,
  createCombinedIntent,
  initializePolicyBasedSecurity,
  getPolicyIntent,
  checkPolicyAlignment,
} from "./cognitive-integration.js";

// ============================================
// INITIALIZATION
// ============================================

import { getRegistry, type PolicyRegistry } from "./registry.js";
import { builtInPolicies, criticalPolicies, developmentPolicies, getAllPolicies } from "./builtins.js";
import { initializePolicyBasedSecurity } from "./cognitive-integration.js";
import type { PolicyIntent } from "./types.js";

/**
 * Initialize the policy system with default configuration
 */
export async function initializePolicySystem(options?: {
  registerBuiltIns?: boolean;
  includeDevelopment?: boolean;
  integrateWithCognitiveSecurity?: boolean;
  identity?: {
    name?: string;
    description?: string;
  };
}): Promise<{
  registry: PolicyRegistry;
  intent: PolicyIntent | null;
}> {
  const {
    registerBuiltIns = true,
    includeDevelopment = true,
    integrateWithCognitiveSecurity = true,
    identity,
  } = options || {};

  // Get registry
  const registry = getRegistry();

  // Register built-in policies
  if (registerBuiltIns) {
    const policies = getAllPolicies({ includeDevelopment });
    registry.registerAll(policies);
  }

  // Integrate with cognitive security
  let intent: PolicyIntent | null = null;
  if (integrateWithCognitiveSecurity) {
    const agentIntent = await initializePolicyBasedSecurity(registry, identity);
    intent = {
      goals: agentIntent.purpose.goals,
      boundaries: agentIntent.purpose.boundaries,
      forbidden: agentIntent.principles.forbidden,
      values: agentIntent.principles.values,
    };
  }

  return { registry, intent };
}

/**
 * Quick setup for common use cases
 */
export async function quickSetup(mode: "strict" | "balanced" | "permissive" = "balanced"): Promise<void> {
  const registry = getRegistry();

  switch (mode) {
    case "strict":
      // All policies including strict versions
      registry.registerAll(builtInPolicies);
      break;

    case "balanced":
      // Critical policies + development warnings
      registry.registerAll(criticalPolicies);
      registry.registerAll(developmentPolicies);
      break;

    case "permissive":
      // Only fatal constraints
      registry.registerAll(criticalPolicies);
      break;
  }

  await initializePolicyBasedSecurity(registry);
}
