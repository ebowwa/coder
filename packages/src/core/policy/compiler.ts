/**
 * Policy Compiler
 *
 * Compiles PolicyDocuments to:
 * - Bounds (for mechanical enforcement)
 * - AgentIntent (for cognitive security alignment)
 * - LogicSpec flows (for procedural specification)
 */

import type { Boundary, BoundaryContext, BoundaryViolation } from "../bounds/types.js";
import type {
  PolicyDocument,
  PolicyConstraint,
  PolicyPermission,
  PolicyIntent,
  PolicyGoal,
  PolicyBoundary as PolicyBoundaryDef,
  ConstraintSeverity,
} from "./types.js";

// ============================================
// POLICY TO BOUNDS COMPILER
// ============================================

/**
 * Compile a policy constraint to a Boundary
 */
export function compileConstraintToBoundary(constraint: PolicyConstraint): Boundary {
  const severityMap: Record<ConstraintSeverity, "warn" | "block" | "fatal"> = {
    warn: "warn",
    block: "block",
    fatal: "fatal",
  };

  return {
    id: `policy:${constraint.id}`,
    name: constraint.id,
    description: constraint.description,
    severity: severityMap[constraint.severity],
    enabled: constraint.enabled !== false,
    tags: constraint.learned ? ["learned", "policy"] : ["policy"],
    check: async (context: BoundaryContext): Promise<BoundaryViolation | null> => {
      return checkPolicyConstraint(constraint, context);
    },
  };
}

/**
 * Check a policy constraint against boundary context
 */
async function checkPolicyConstraint(
  constraint: PolicyConstraint,
  context: BoundaryContext
): Promise<BoundaryViolation | null> {
  const { tool_name, tool_input } = context;
  const { pattern } = constraint;

  // Check tool match
  if (pattern.tool) {
    const tools = Array.isArray(pattern.tool) ? pattern.tool : [pattern.tool];
    const matches = tools.some((t) => matchToolPattern(t, tool_name));

    if (!matches) return null;
  }

  // Check path pattern
  if (pattern.path_pattern) {
    const path = extractPath(tool_input);
    if (path && new RegExp(pattern.path_pattern, "i").test(path)) {
      return createBoundaryViolation(constraint, context);
    }
  }

  // Check command pattern (for Bash)
  if (pattern.command_pattern && tool_name === "Bash") {
    const command = tool_input.command as string;
    if (command && new RegExp(pattern.command_pattern, "i").test(command)) {
      return createBoundaryViolation(constraint, context);
    }
  }

  // Check content pattern (for Write/Edit)
  if (pattern.content_pattern && (tool_name === "Write" || tool_name === "Edit")) {
    const content = (tool_input.content as string) || (tool_input.new_string as string);
    if (content && new RegExp(pattern.content_pattern, "i").test(content)) {
      return createBoundaryViolation(constraint, context);
    }
  }

  // Check input patterns
  if (pattern.input_pattern) {
    for (const [key, regex] of Object.entries(pattern.input_pattern)) {
      const value = tool_input[key];
      if (value && new RegExp(regex, "i").test(String(value))) {
        return createBoundaryViolation(constraint, context);
      }
    }
  }

  return null;
}

/**
 * Create a boundary violation from a constraint
 */
function createBoundaryViolation(
  constraint: PolicyConstraint,
  context: BoundaryContext
): BoundaryViolation {
  return {
    boundaryId: `policy:${constraint.id}`,
    reason: constraint.reason || constraint.description,
    suggestion: constraint.suggestion,
    autoFixable: constraint.auto_fixable || false,
    context: {
      constraint,
      tool: context.tool_name,
      input: context.tool_input,
    },
  };
}

/**
 * Compile multiple constraints to boundaries
 */
export function compileConstraintsToBoundaries(constraints: PolicyConstraint[]): Boundary[] {
  return constraints
    .filter((c) => c.enabled !== false)
    .map(compileConstraintToBoundary);
}

// ============================================
// POLICY TO AGENT INTENT COMPILER
// ============================================

/**
 * Compile a policy to AgentIntent for cognitive security
 */
export function compilePolicyToAgentIntent(policy: PolicyDocument): {
  identity: {
    name: string;
    description: string;
    capabilities: string[];
    constraints: string[];
  };
  purpose: {
    goals: Array<{
      id: string;
      description: string;
      priority: "critical" | "high" | "medium" | "low";
      measurable: boolean;
      successCriteria?: string;
    }>;
    nonGoals: string[];
    boundaries: Array<{
      id: string;
      description: string;
      enforcement: "never" | "require_approval" | "log_only";
      domain: string;
      pattern?: string;
    }>;
  };
  principles: {
    values: string[];
    priorities: string[];
    forbidden: string[];
  };
} {
  const intent = compilePolicyToIntent(policy);

  return {
    identity: {
      name: policy.meta.name,
      description: policy.meta.description || `Policy: ${policy.meta.name}`,
      capabilities: extractCapabilities(policy),
      constraints: intent.forbidden,
    },
    purpose: {
      goals: intent.goals,
      nonGoals: extractNonGoals(policy),
      boundaries: intent.boundaries,
    },
    principles: {
      values: intent.values,
      priorities: extractPriorities(policy),
      forbidden: intent.forbidden,
    },
  };
}

/**
 * Compile policy to PolicyIntent
 */
export function compilePolicyToIntent(policy: PolicyDocument): PolicyIntent {
  const goals: PolicyGoal[] = [];
  const boundaries: PolicyBoundaryDef[] = [];
  const forbidden: string[] = [];
  const values: string[] = [];

  // Convert permissions to goals
  for (const permission of policy.permissions || []) {
    goals.push({
      id: `permission:${permission.id}`,
      description: `Operate within ${permission.domain} domain: ${permission.actions.join(", ")}`,
      priority: "high",
      measurable: true,
      successCriteria: `Domain: ${permission.domain}`,
    });

    // Extract values from approval requirements
    if (permission.requires_approval === "always") {
      values.push(`Require approval for ${permission.domain} operations`);
    }
  }

  // Convert constraints to boundaries
  for (const constraint of policy.constraints || []) {
    boundaries.push({
      id: `constraint:${constraint.id}`,
      description: constraint.description,
      enforcement: mapSeverityToEnforcement(constraint.severity),
      domain: inferDomain(constraint),
      pattern: JSON.stringify(constraint.pattern),
    });

    // Extract forbidden actions
    if (constraint.severity === "fatal") {
      forbidden.push(constraint.description);
    }

    // Extract values from reasons
    if (constraint.reason && !values.includes(constraint.reason)) {
      values.push(constraint.reason);
    }
  }

  // Extract values from teaching hints
  for (const hint of policy.teaching || []) {
    if (hint.reason && !values.includes(hint.reason)) {
      values.push(hint.reason);
    }
  }

  return { goals, boundaries, forbidden, values };
}

// ============================================
// POLICY TO LOGIC SPEC COMPILER
// ============================================

/**
 * Compile a policy to a LogicSpec-like structure
 */
export function compilePolicyToLogicSpec(policy: PolicyDocument): {
  meta: {
    spec_version: string;
    name: string;
    version: string;
    description?: string;
  };
  inputs: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }>;
  outputs: Array<{
    name: string;
    type: string;
    description?: string;
  }>;
  logic: Array<{
    id: string;
    type: string;
    input: string;
    output: string;
    algorithm: string;
  }>;
  state?: {
    initial: string;
    transitions: Array<{
      from: string;
      to: string;
      trigger: string;
      action?: string;
    }>;
  };
} {
  const logic: Array<{
    id: string;
    type: string;
    input: string;
    output: string;
    algorithm: string;
  }> = [];

  // Convert constraints to validation logic
  for (const constraint of policy.constraints || []) {
    logic.push({
      id: `check_${constraint.id}`,
      type: "validate",
      input: "tool_context",
      output: "validation_result",
      algorithm: `
1. Match tool: ${JSON.stringify(constraint.pattern.tool || "any")}
2. Check patterns: ${constraint.pattern.path_pattern || constraint.pattern.command_pattern || "none"}
3. If match, return violation with severity: ${constraint.severity}
4. Otherwise, return valid
      `.trim(),
    });
  }

  // Convert permissions to decision logic
  for (const permission of policy.permissions || []) {
    logic.push({
      id: `check_permission_${permission.id}`,
      type: "decision",
      input: "action_context",
      output: "permission_result",
      algorithm: `
1. Check domain: ${permission.domain}
2. Verify action in: ${permission.actions.join(", ")}
3. Check path/tool patterns
4. Return allowed/denied with approval requirement
      `.trim(),
    });
  }

  return {
    meta: {
      spec_version: "1.0",
      name: policy.meta.name,
      version: policy.meta.version,
      description: policy.meta.description,
    },
    inputs: [
      { name: "tool_context", type: "ToolContext", required: true },
      { name: "action_context", type: "ActionContext", required: true },
    ],
    outputs: [
      { name: "validation_result", type: "ValidationResult" },
      { name: "permission_result", type: "PermissionResult" },
    ],
    logic,
    state: {
      initial: "idle",
      transitions: [
        { from: "idle", to: "checking", trigger: "tool_use", action: "validate_constraints" },
        { from: "checking", to: "allowed", trigger: "all_passed" },
        { from: "checking", to: "blocked", trigger: "violation_found" },
        { from: "blocked", to: "idle", trigger: "retry" },
      ],
    },
  };
}

// ============================================
// HELPERS
// ============================================

function matchToolPattern(pattern: string, toolName: string): boolean {
  if (pattern.includes("*")) {
    return new RegExp(`^${pattern.replace(/\*/g, ".*")}$`, "i").test(toolName);
  }
  return pattern.toLowerCase() === toolName.toLowerCase();
}

function extractPath(input: Record<string, unknown>): string | undefined {
  return (input.file_path as string) ||
    (input.path as string) ||
    (input.directory as string) ||
    (input.cwd as string);
}

function mapSeverityToEnforcement(
  severity: ConstraintSeverity
): "never" | "require_approval" | "log_only" {
  switch (severity) {
    case "fatal":
      return "never";
    case "block":
      return "require_approval";
    case "warn":
      return "log_only";
  }
}

function inferDomain(constraint: PolicyConstraint): string {
  const { pattern } = constraint;

  if (pattern.tool) {
    const tools = Array.isArray(pattern.tool) ? pattern.tool : [pattern.tool];
    const toolList = tools.join(" ").toLowerCase();

    if (toolList.includes("bash") || toolList.includes("shell")) return "shell";
    if (toolList.includes("git")) return "git";
    if (toolList.includes("read") || toolList.includes("write") || toolList.includes("edit")) {
      return "filesystem";
    }
    if (toolList.includes("mcp")) return "mcp";
  }

  if (pattern.path_pattern) return "filesystem";
  if (pattern.command_pattern) return "shell";

  return "agent";
}

function extractCapabilities(policy: PolicyDocument): string[] {
  const capabilities = new Set<string>();

  for (const permission of policy.permissions || []) {
    capabilities.add(permission.domain);
    for (const action of permission.actions) {
      capabilities.add(`${permission.domain}:${action}`);
    }
  }

  return Array.from(capabilities);
}

function extractNonGoals(policy: PolicyDocument): string[] {
  return (policy.constraints || [])
    .filter((c) => c.severity === "fatal")
    .map((c) => c.description);
}

function extractPriorities(policy: PolicyDocument): string[] {
  const priorities: string[] = [];

  // High-priority permissions
  const criticalDomains = new Set<string>();
  for (const permission of policy.permissions || []) {
    if (permission.requires_approval === "always") {
      criticalDomains.add(permission.domain);
    }
  }

  if (criticalDomains.size > 0) {
    priorities.push(`Careful operation in: ${Array.from(criticalDomains).join(", ")}`);
  }

  return priorities;
}

// ============================================
// EXPORTS
// ============================================

export interface CompiledPolicyArtifacts {
  boundaries: Boundary[];
  agentIntent: ReturnType<typeof compilePolicyToAgentIntent>;
  logicSpec: ReturnType<typeof compilePolicyToLogicSpec>;
  policyIntent: PolicyIntent;
}

/**
 * Fully compile a policy to all artifact types
 */
export function compilePolicy(policy: PolicyDocument): CompiledPolicyArtifacts {
  return {
    boundaries: compileConstraintsToBoundaries(policy.constraints || []),
    agentIntent: compilePolicyToAgentIntent(policy),
    logicSpec: compilePolicyToLogicSpec(policy),
    policyIntent: compilePolicyToIntent(policy),
  };
}
