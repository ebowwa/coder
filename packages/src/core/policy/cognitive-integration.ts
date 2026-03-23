/**
 * Policy → Cognitive Security Integration
 *
 * Bridges policy declarations with cognitive security enforcement.
 * Policies compile to AgentIntent which is used for alignment checking.
 */

import type { AgentIntent, AgentIdentity, AgentPurpose, AgentPrinciples } from "../cognitive-security/index.js";
import type { PolicyDocument, PolicyIntent, PolicyGoal, PolicyBoundary } from "./types.js";
import { getRegistry, type PolicyRegistry } from "./registry.js";

/**
 * Convert PolicyIntent to AgentIntent for cognitive security
 */
export function policyIntentToAgentIntent(
  policyIntent: PolicyIntent,
  identity?: Partial<AgentIdentity>
): AgentIntent {
  const now = Date.now();

  return {
    id: `policy-${now}`,
    version: 1,
    identity: {
      name: identity?.name || "Policy-Constrained Agent",
      description: identity?.description || "Agent operating under policy constraints",
      capabilities: extractCapabilities(policyIntent),
      constraints: policyIntent.forbidden,
      ...identity,
    },
    purpose: {
      goals: convertGoals(policyIntent.goals),
      nonGoals: policyIntent.forbidden,
      boundaries: convertBoundaries(policyIntent.boundaries),
    },
    principles: {
      values: policyIntent.values,
      priorities: extractPriorities(policyIntent),
      forbidden: policyIntent.forbidden,
    },
    createdAt: now,
  };
}

/**
 * Convert policy goals to agent goals
 */
function convertGoals(goals: PolicyGoal[]): AgentIntent["purpose"]["goals"] {
  return goals.map((g) => ({
    id: g.id,
    description: g.description,
    priority: g.priority,
    measurable: g.measurable,
    successCriteria: g.successCriteria,
  }));
}

/**
 * Convert policy boundaries to agent boundaries
 */
function convertBoundaries(
  boundaries: PolicyBoundary[]
): AgentIntent["purpose"]["boundaries"] {
  return boundaries.map((b) => ({
    id: b.id,
    description: b.description,
    enforcement: b.enforcement,
    domain: b.domain,
    pattern: b.pattern,
  }));
}

/**
 * Extract capabilities from policy intent
 */
function extractCapabilities(intent: PolicyIntent): string[] {
  const capabilities = new Set<string>();

  for (const goal of intent.goals) {
    // Extract domain from goal description
    const match = goal.description.match(/within (\w+) domain/);
    if (match && match[1]) {
      capabilities.add(match[1]);
    }
  }

  return Array.from(capabilities);
}

/**
 * Extract priorities from policy intent
 */
function extractPriorities(intent: PolicyIntent): string[] {
  const priorities: string[] = [];

  // High priority from critical goals
  const criticalGoals = intent.goals.filter((g) => g.priority === "critical");
  if (criticalGoals.length > 0) {
    priorities.push(`Critical: ${criticalGoals.map((g) => g.description).join(", ")}`);
  }

  // Forbidden actions are always high priority
  if (intent.forbidden.length > 0) {
    priorities.push("Never violate forbidden constraints");
  }

  // Values become priorities
  priorities.push(...intent.values.slice(0, 5));

  return priorities;
}

/**
 * Create a combined AgentIntent from multiple policies
 */
export function createCombinedIntent(
  policies: PolicyDocument[],
  identity?: Partial<AgentIdentity>
): AgentIntent {
  const combinedIntent: PolicyIntent = {
    goals: [],
    boundaries: [],
    forbidden: [],
    values: [],
  };

  for (const policy of policies) {
    // Extract goals from permissions
    for (const permission of policy.permissions || []) {
      combinedIntent.goals.push({
        id: `permission:${permission.id}`,
        description: `Operate within ${permission.domain} domain: ${permission.actions.join(", ")}`,
        priority: permission.requires_approval === "always" ? "critical" : "high",
        measurable: true,
        successCriteria: `Domain: ${permission.domain}`,
      });
    }

    // Extract boundaries from constraints
    for (const constraint of policy.constraints || []) {
      combinedIntent.boundaries.push({
        id: `constraint:${constraint.id}`,
        description: constraint.description,
        enforcement: constraint.severity === "fatal" ? "never" :
          constraint.severity === "block" ? "require_approval" : "log_only",
        domain: inferDomain(constraint),
        pattern: JSON.stringify(constraint.pattern),
      });

      if (constraint.severity === "fatal") {
        combinedIntent.forbidden.push(constraint.description);
      }

      if (constraint.reason && !combinedIntent.values.includes(constraint.reason)) {
        combinedIntent.values.push(constraint.reason);
      }
    }

    // Extract values from teaching
    for (const hint of policy.teaching || []) {
      if (hint.reason && !combinedIntent.values.includes(hint.reason)) {
        combinedIntent.values.push(hint.reason);
      }
    }
  }

  return policyIntentToAgentIntent(combinedIntent, identity);
}

/**
 * Infer domain from constraint
 */
function inferDomain(constraint: { pattern: { tool?: string | string[] } }): string {
  const { tool } = constraint.pattern;
  if (!tool) return "agent";

  const tools = Array.isArray(tool) ? tool.join(" ").toLowerCase() : tool.toLowerCase();

  if (tools.includes("bash")) return "shell";
  if (tools.includes("git")) return "git";
  if (tools.includes("read") || tools.includes("write") || tools.includes("edit")) {
    return "filesystem";
  }
  if (tools.includes("mcp")) return "mcp";

  return "agent";
}

/**
 * Initialize cognitive security with policies
 *
 * This creates an AgentIntent from registered policies and
 * sets it in the cognitive security hooks.
 */
export async function initializePolicyBasedSecurity(
  registry?: PolicyRegistry,
  identity?: Partial<AgentIdentity>
): Promise<AgentIntent> {
  const reg = registry || getRegistry();
  const policies = reg.list();
  const intent = createCombinedIntent(policies, identity);

  // Import cognitive security and set the intent
  const { getSecurityHooks } = await import("../cognitive-security/hooks.js");
  const hooks = getSecurityHooks();
  hooks.setIntent(intent);

  return intent;
}

/**
 * Get the current policy-based intent
 */
export function getPolicyIntent(): PolicyIntent {
  const registry = getRegistry();
  return registry.getCombinedIntent();
}

/**
 * Check if an action aligns with policy
 */
export function checkPolicyAlignment(
  action: {
    type: string;
    domain: string;
    operation: string;
    target?: string;
    params?: Record<string, unknown>;
    reasoning?: string;
  }
): {
  aligned: boolean;
  score: number;
  concerns: string[];
  suggestions: string[];
} {
  const intent = getPolicyIntent();
  const concerns: string[] = [];
  const suggestions: string[] = [];
  let score = 1.0;

  // Check against forbidden actions
  for (const forbidden of intent.forbidden) {
    if (action.reasoning?.toLowerCase().includes(forbidden.toLowerCase()) ||
        action.operation.toLowerCase().includes(forbidden.toLowerCase())) {
      concerns.push(`Matches forbidden pattern: ${forbidden}`);
      score = 0;
    }
  }

  // Check against boundaries
  for (const boundary of intent.boundaries) {
    if (action.domain === boundary.domain || boundary.domain === "agent") {
      if (boundary.enforcement === "never") {
        concerns.push(`Violates boundary: ${boundary.description}`);
        score = Math.max(0, score - 0.5);
        suggestions.push(`Avoid: ${boundary.description}`);
      } else if (boundary.enforcement === "require_approval") {
        concerns.push(`Requires approval: ${boundary.description}`);
        score = Math.max(0, score - 0.2);
        suggestions.push(`Get approval for: ${boundary.description}`);
      }
    }
  }

  // Check against goals
  const servesGoals = intent.goals.filter((g) =>
    g.description.toLowerCase().includes(action.domain.toLowerCase())
  );

  if (servesGoals.length === 0 && action.domain !== "agent") {
    concerns.push(`No matching goal for domain: ${action.domain}`);
    score = Math.max(0, score - 0.1);
  }

  return {
    aligned: score > 0.5 && concerns.length === 0,
    score,
    concerns,
    suggestions,
  };
}

// Re-export types
export type { PolicyIntent, PolicyGoal, PolicyBoundary };
