/**
 * Policy Registry
 *
 * Manages policy documents, compiles them to enforceable rules,
 * and integrates with bounds and cognitive security.
 */

import type {
  PolicyDocument,
  PolicyConstraint,
  CompiledPolicy,
  PolicyRegistryConfig,
  PolicyStats,
  PolicyCheckContext,
  PolicyViolation,
  CompiledBoundary,
  CompiledPermissionRule,
  PolicyIntent,
  PolicyGoal,
  PolicyBoundary,
  ConstraintSeverity,
} from "./types.js";

// Default configuration
const DEFAULT_CONFIG: Required<PolicyRegistryConfig> = {
  searchPaths: [
    "~/.claude/policies",
    "./.claude/policies",
    "./policies",
  ],
  autoLoad: true,
  enableLearned: true,
  defaultScope: "project",
  filePatterns: ["policy.yaml", "policy.yml", "policy.json"],
};

/**
 * Policy Registry
 *
 * Stores, compiles, and manages policy documents.
 */
export class PolicyRegistry {
  private config: Required<PolicyRegistryConfig>;
  private policies: Map<string, PolicyDocument> = new Map();
  private compiled: Map<string, CompiledPolicy> = new Map();
  private learnedConstraints: Map<string, PolicyConstraint> = new Map();
  private initialized = false;

  constructor(config?: Partial<PolicyRegistryConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================
  // POLICY MANAGEMENT
  // ============================================

  /**
   * Register a policy document
   */
  register(policy: PolicyDocument): void {
    const key = `${policy.meta.scope}:${policy.meta.name}`;
    this.policies.set(key, policy);

    // Compile immediately
    this.compiled.set(key, this.compilePolicy(policy));

    // Register learned constraints
    if (this.config.enableLearned) {
      for (const constraint of policy.constraints || []) {
        if (constraint.learned) {
          this.learnedConstraints.set(constraint.id, constraint);
        }
      }
    }
  }

  /**
   * Register multiple policies
   */
  registerAll(policies: PolicyDocument[]): void {
    for (const policy of policies) {
      this.register(policy);
    }
  }

  /**
   * Get a policy by name
   */
  get(name: string, scope?: string): PolicyDocument | undefined {
    if (scope) {
      return this.policies.get(`${scope}:${name}`);
    }

    // Search all scopes
    for (const [key, policy] of this.policies) {
      if (key.endsWith(`:${name}`)) {
        return policy;
      }
    }

    return undefined;
  }

  /**
   * Get compiled policy
   */
  getCompiled(name: string, scope?: string): CompiledPolicy | undefined {
    if (scope) {
      return this.compiled.get(`${scope}:${name}`);
    }

    for (const [key, compiled] of this.compiled) {
      if (key.endsWith(`:${name}`)) {
        return compiled;
      }
    }

    return undefined;
  }

  /**
   * Remove a policy
   */
  remove(name: string, scope?: string): boolean {
    const key = scope ? `${scope}:${name}` : this.findKey(name);
    if (!key) return false;

    this.policies.delete(key);
    this.compiled.delete(key);
    return true;
  }

  /**
   * List all policies
   */
  list(): PolicyDocument[] {
    return Array.from(this.policies.values());
  }

  // ============================================
  // COMPILATION
  // ============================================

  /**
   * Compile a policy document to enforceable rules
   */
  private compilePolicy(policy: PolicyDocument): CompiledPolicy {
    const boundaries: CompiledBoundary[] = [];
    const permissionRules: CompiledPermissionRule[] = [];
    const teachingResponses = new Map<string, import("./types.js").TeachingHint>();

    // Compile constraints to boundaries
    for (const constraint of policy.constraints || []) {
      if (constraint.enabled !== false) {
        boundaries.push(this.compileConstraint(constraint));
      }
    }

    // Compile permissions to rules
    for (const permission of policy.permissions || []) {
      permissionRules.push(this.compilePermission(permission));
    }

    // Index teaching hints
    for (const hint of policy.teaching || []) {
      const triggers = Array.isArray(hint.trigger) ? hint.trigger : [hint.trigger];
      for (const trigger of triggers) {
        teachingResponses.set(trigger.toLowerCase(), hint);
      }
    }

    // Generate intent for cognitive security
    const intent = this.generateIntent(policy);

    return {
      source: policy,
      boundaries,
      intent,
      permissionRules,
      teachingResponses,
    };
  }

  /**
   * Compile a constraint to a boundary
   */
  private compileConstraint(constraint: PolicyConstraint): CompiledBoundary {
    return {
      constraintId: constraint.id,
      boundary: {
        id: `policy:${constraint.id}`,
        name: constraint.id,
        description: constraint.description,
        severity: constraint.severity,
        check: async (context: PolicyCheckContext) => {
          return this.checkConstraint(constraint, context);
        },
      },
    };
  }

  /**
   * Check if a constraint is violated
   */
  private checkConstraint(
    constraint: PolicyConstraint,
    context: PolicyCheckContext
  ): PolicyViolation | null {
    const { pattern } = constraint;
    const { tool_name, tool_input } = context;

    // Check tool match
    if (pattern.tool) {
      const tools = Array.isArray(pattern.tool) ? pattern.tool : [pattern.tool];
      const matches = tools.some((t) => {
        if (t.includes("*")) {
          return new RegExp(`^${t.replace(/\*/g, ".*")}$`, "i").test(tool_name);
        }
        return t.toLowerCase() === tool_name.toLowerCase();
      });

      if (!matches) return null;
    }

    // Check path pattern
    if (pattern.path_pattern) {
      const path = this.extractPath(tool_input);
      if (path && new RegExp(pattern.path_pattern, "i").test(path)) {
        return this.createViolation(constraint);
      }
    }

    // Check command pattern (for Bash)
    if (pattern.command_pattern && tool_name === "Bash") {
      const command = tool_input.command as string;
      if (command && new RegExp(pattern.command_pattern, "i").test(command)) {
        return this.createViolation(constraint);
      }
    }

    // Check content pattern (for Write/Edit)
    if (pattern.content_pattern && (tool_name === "Write" || tool_name === "Edit")) {
      const content = (tool_input.content as string) || (tool_input.new_string as string);
      if (content && new RegExp(pattern.content_pattern, "i").test(content)) {
        return this.createViolation(constraint);
      }
    }

    // Check input patterns
    if (pattern.input_pattern) {
      for (const [key, regex] of Object.entries(pattern.input_pattern)) {
        const value = tool_input[key];
        if (value && new RegExp(regex, "i").test(String(value))) {
          return this.createViolation(constraint);
        }
      }
    }

    return null;
  }

  /**
   * Create a violation from a constraint
   */
  private createViolation(constraint: PolicyConstraint): PolicyViolation {
    return {
      constraintId: constraint.id,
      reason: constraint.reason || constraint.description,
      suggestion: constraint.suggestion,
      autoFixable: constraint.auto_fixable || false,
      autoFix: constraint.auto_fix,
      severity: constraint.severity,
    };
  }

  /**
   * Compile a permission to a rule
   */
  private compilePermission(
    permission: import("./types.js").PolicyPermission
  ): CompiledPermissionRule {
    return {
      permissionId: permission.id,
      domain: permission.domain,
      actions: permission.actions,
      matcher: this.createPermissionMatcher(permission),
      requiresApproval: permission.requires_approval === "always" ||
        permission.requires_approval === "sensitive",
    };
  }

  /**
   * Create a matcher function for permissions
   */
  private createPermissionMatcher(
    permission: import("./types.js").PolicyPermission
  ): (context: PolicyCheckContext) => boolean {
    return (context: PolicyCheckContext) => {
      const { tool_input } = context;

      // Check path patterns for filesystem
      if (permission.domain === "filesystem" && permission.paths) {
        const path = this.extractPath(tool_input);
        if (path) {
          return permission.paths.some((p) => this.matchGlob(p, path));
        }
      }

      // Check branch patterns for git
      if (permission.domain === "git" && permission.branches) {
        const branch = tool_input.branch as string;
        if (branch) {
          if (permission.branches.deny?.some((p) => this.matchGlob(p, branch))) {
            return false;
          }
          if (permission.branches.allow?.some((p) => this.matchGlob(p, branch))) {
            return true;
          }
        }
      }

      // Check tool patterns
      if (permission.tools) {
        return permission.tools.includes(context.tool_name);
      }

      return true;
    };
  }

  /**
   * Generate intent from policy for cognitive security
   */
  private generateIntent(policy: PolicyDocument): PolicyIntent {
    const goals: PolicyGoal[] = [];
    const boundaries: PolicyBoundary[] = [];
    const forbidden: string[] = [];
    const values: string[] = [];

    // Convert permissions to goals
    for (const permission of policy.permissions || []) {
      goals.push({
        id: `permission:${permission.id}`,
        description: `Operate within ${permission.domain} domain`,
        priority: "high",
        measurable: true,
        successCriteria: `Actions: ${permission.actions.join(", ")}`,
      });
    }

    // Convert constraints to boundaries
    for (const constraint of policy.constraints || []) {
      boundaries.push({
        id: `constraint:${constraint.id}`,
        description: constraint.description,
        enforcement: constraint.severity === "fatal" ? "never" :
          constraint.severity === "block" ? "require_approval" : "log_only",
        domain: this.inferDomain(constraint),
        pattern: JSON.stringify(constraint.pattern),
      });

      if (constraint.severity === "fatal") {
        forbidden.push(constraint.description);
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
  // CHECKING
  // ============================================

  /**
   * Check all policies against a context
   */
  async checkAll(context: PolicyCheckContext): Promise<{
    violations: PolicyViolation[];
    warnings: PolicyViolation[];
    fatal: PolicyViolation | null;
  }> {
    const violations: PolicyViolation[] = [];
    const warnings: PolicyViolation[] = [];
    let fatal: PolicyViolation | null = null;

    for (const [, compiled] of this.compiled) {
      for (const boundary of compiled.boundaries) {
        const violation = await boundary.boundary.check(context);

        if (violation) {
          if (violation.severity === "fatal" && !fatal) {
            fatal = violation;
          } else if (violation.severity === "block") {
            violations.push(violation);
          } else {
            warnings.push(violation);
          }
        }
      }
    }

    // Check learned constraints
    for (const [, constraint] of this.learnedConstraints) {
      const violation = this.checkConstraint(constraint, context);
      if (violation) {
        if (violation.severity === "fatal" && !fatal) {
          fatal = violation;
        } else if (violation.severity === "block") {
          violations.push(violation);
        } else {
          warnings.push(violation);
        }
      }
    }

    return { violations, warnings, fatal };
  }

  /**
   * Check if an action is permitted
   */
  isPermitted(
    domain: import("./types.js").PermissionDomain,
    action: import("./types.js").PermissionAction,
    context: PolicyCheckContext
  ): { allowed: boolean; requiresApproval: boolean; reason?: string } {
    let allowed = false;
    let requiresApproval = false;

    for (const [, compiled] of this.compiled) {
      for (const rule of compiled.permissionRules) {
        if (rule.domain === domain && rule.actions.includes(action)) {
          if (rule.matcher(context)) {
            allowed = true;
            if (rule.requiresApproval) {
              requiresApproval = true;
            }
          }
        }
      }
    }

    return { allowed, requiresApproval };
  }

  /**
   * Get teaching response for a trigger
   */
  getTeachingResponse(trigger: string): import("./types.js").TeachingHint | undefined {
    const normalized = trigger.toLowerCase();

    for (const [, compiled] of this.compiled) {
      const hint = compiled.teachingResponses.get(normalized);
      if (hint) return hint;

      // Try fuzzy match
      for (const [key, h] of compiled.teachingResponses) {
        if (normalized.includes(key) || key.includes(normalized)) {
          return h;
        }
      }
    }

    return undefined;
  }

  // ============================================
  // LEARNING
  // ============================================

  /**
   * Learn a new constraint from a failure
   */
  learnConstraint(constraint: PolicyConstraint): void {
    if (!this.config.enableLearned) return;

    constraint.learned = true;
    constraint.enabled = true;
    this.learnedConstraints.set(constraint.id, constraint);

    // Recompile affected policies
    for (const [key, policy] of this.policies) {
      if (!policy.constraints) policy.constraints = [];
      policy.constraints.push(constraint);
      this.compiled.set(key, this.compilePolicy(policy));
    }
  }

  /**
   * Get all learned constraints
   */
  getLearnedConstraints(): PolicyConstraint[] {
    return Array.from(this.learnedConstraints.values());
  }

  // ============================================
  // COGNITIVE SECURITY INTEGRATION
  // ============================================

  /**
   * Get combined intent from all policies
   */
  getCombinedIntent(): PolicyIntent {
    const combined: PolicyIntent = {
      goals: [],
      boundaries: [],
      forbidden: [],
      values: [],
    };

    for (const [, compiled] of this.compiled) {
      combined.goals.push(...compiled.intent.goals);
      combined.boundaries.push(...compiled.intent.boundaries);
      combined.forbidden.push(...compiled.intent.forbidden);
      combined.values.push(...compiled.intent.values);
    }

    return combined;
  }

  /**
   * Export policies as AgentIntent for cognitive security
   */
  exportAsAgentIntent(): import("./types.js").PolicyIntent {
    return this.getCombinedIntent();
  }

  // ============================================
  // UTILITIES
  // ============================================

  /**
   * Get registry statistics
   */
  getStats(): PolicyStats {
    let totalConstraints = 0;
    let totalPermissions = 0;
    let totalTeachingHints = 0;
    let compiledBoundaries = 0;

    for (const [, policy] of this.policies) {
      totalConstraints += policy.constraints?.length || 0;
      totalPermissions += policy.permissions?.length || 0;
      totalTeachingHints += policy.teaching?.length || 0;
    }

    for (const [, compiled] of this.compiled) {
      compiledBoundaries += compiled.boundaries.length;
    }

    return {
      totalPolicies: this.policies.size,
      totalConstraints,
      totalPermissions,
      totalTeachingHints,
      compiledBoundaries,
      learnedConstraints: this.learnedConstraints.size,
    };
  }

  /**
   * Clear all policies
   */
  clear(): void {
    this.policies.clear();
    this.compiled.clear();
    this.learnedConstraints.clear();
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private findKey(name: string): string | undefined {
    for (const key of this.policies.keys()) {
      if (key.endsWith(`:${name}`)) return key;
    }
    return undefined;
  }

  private extractPath(input: Record<string, unknown>): string | undefined {
    return (input.file_path as string) ||
      (input.path as string) ||
      (input.directory as string) ||
      (input.cwd as string);
  }

  private matchGlob(pattern: string, value: string): boolean {
    const regex = new RegExp(
      `^${pattern.replace(/\*/g, ".*").replace(/\?/g, ".")}$`
    );
    return regex.test(value);
  }

  private inferDomain(constraint: PolicyConstraint): string {
    const { pattern } = constraint;

    if (pattern.tool) {
      const tools = Array.isArray(pattern.tool) ? pattern.tool : [pattern.tool];
      const toolList = tools.join(" ").toLowerCase();

      if (toolList.includes("bash") || toolList.includes("shell")) return "shell";
      if (toolList.includes("git")) return "git";
      if (toolList.includes("read") || toolList.includes("write") || toolList.includes("edit")) {
        return "filesystem";
      }
    }

    if (pattern.path_pattern) return "filesystem";
    if (pattern.command_pattern) return "shell";

    return "agent";
  }
}

// ============================================
// SINGLETON
// ============================================

let globalRegistry: PolicyRegistry | null = null;

/**
 * Get the global policy registry
 */
export function getRegistry(config?: Partial<PolicyRegistryConfig>): PolicyRegistry {
  if (!globalRegistry) {
    globalRegistry = new PolicyRegistry(config);
  }
  return globalRegistry;
}

/**
 * Reset the global registry (for testing)
 */
export function resetRegistry(): void {
  globalRegistry = null;
}
