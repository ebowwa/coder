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

// ============================================
// POLICY METADATA
// ============================================

/**
 * Policy document metadata
 */
export interface PolicyMeta {
  /** Unique policy name */
  name: string;
  /** Semantic version */
  version: string;
  /** Human-readable description */
  description?: string;
  /** Policy author */
  author?: string;
  /** Policy scope */
  scope: "global" | "project" | "session";
  /** Is this policy enabled? */
  enabled?: boolean;
  /** Tags for categorization */
  tags?: string[];
}

// ============================================
// CONSTRAINTS (What NOT to do)
// ============================================

/**
 * Severity of constraint violation
 */
export type ConstraintSeverity = "warn" | "block" | "fatal";

/**
 * Pattern matcher for tool operations
 */
export interface ToolPattern {
  /** Tool name(s) to match (supports regex) */
  tool?: string | string[];
  /** Pattern to match in tool input */
  input_pattern?: Record<string, string>;
  /** Pattern to match in file paths */
  path_pattern?: string;
  /** Pattern to match in command (for Bash) */
  command_pattern?: string;
  /** Pattern to match in content (for Write/Edit) */
  content_pattern?: string;
}

/**
 * A declarative constraint (what NOT to do)
 */
export interface PolicyConstraint {
  /** Unique constraint ID */
  id: string;
  /** Human-readable description */
  description: string;
  /** Why this constraint exists (teaching context) */
  reason?: string;
  /** Severity level */
  severity: ConstraintSeverity;
  /** Pattern to match */
  pattern: ToolPattern;
  /** Suggested alternative action */
  suggestion?: string;
  /** Can this be auto-fixed? */
  auto_fixable?: boolean;
  /** Auto-fix action */
  auto_fix?: AutoFixAction;
  /** Is this a learned constraint? */
  learned?: boolean;
  /** Enable/disable */
  enabled?: boolean;
}

/**
 * Auto-fix action definition
 */
export interface AutoFixAction {
  type: "sanitize" | "redirect" | "reject" | "modify";
  description: string;
  params?: Record<string, unknown>;
}

// ============================================
// PERMISSIONS (What IS allowed)
// ============================================

/**
 * A permission grant
 */
export interface PolicyPermission {
  /** Unique permission ID */
  id: string;
  /** Domain of the permission */
  domain: PermissionDomain;
  /** Allowed actions */
  actions: PermissionAction[];
  /** Path patterns (for filesystem) */
  paths?: string[];
  /** Branch patterns (for git) */
  branches?: BranchPermission;
  /** Tool patterns (for tools) */
  tools?: string[];
  /** Required approval level */
  requires_approval?: "never" | "always" | "sensitive";
  /** Conditions for this permission */
  conditions?: PermissionCondition[];
}

/**
 * Permission domains
 */
export type PermissionDomain =
  | "filesystem"
  | "git"
  | "network"
  | "shell"
  | "mcp"
  | "secrets"
  | "database"
  | "external";

/**
 * Permission actions
 */
export type PermissionAction =
  | "read"
  | "write"
  | "create"
  | "delete"
  | "execute"
  | "modify"
  | "push"
  | "pull"
  | "commit"
  | "branch"
  | "merge";

/**
 * Branch permission rules
 */
export interface BranchPermission {
  /** Allowed branch patterns */
  allow?: string[];
  /** Denied branch patterns */
  deny?: string[];
  /** Require PR for these patterns */
  require_pr?: string[];
}

/**
 * Condition for permission activation
 */
export interface PermissionCondition {
  type: "context" | "state" | "approval" | "time";
  expression: string;
}

// ============================================
// TEACHING HINTS (How to respond)
// ============================================

/**
 * A teaching hint for the agent
 */
export interface TeachingHint {
  /** Unique hint ID */
  id: string;
  /** Trigger pattern (what the user might ask) */
  trigger: string | string[];
  /** How the agent should respond */
  response: string;
  /** Why this response (educational) */
  reason?: string;
  /** Related constraints */
  related_constraints?: string[];
  /** Examples of correct behavior */
  examples?: TeachingExample[];
}

/**
 * Example of correct behavior
 */
export interface TeachingExample {
  input: string;
  output: string;
  explanation: string;
}

// ============================================
// POLICY DOCUMENT
// ============================================

/**
 * A complete policy document
 */
export interface PolicyDocument {
  /** Policy metadata */
  meta: PolicyMeta;
  /** Constraints (what NOT to do) */
  constraints?: PolicyConstraint[];
  /** Permissions (what IS allowed) */
  permissions?: PolicyPermission[];
  /** Teaching hints */
  teaching?: TeachingHint[];
  /** Inherited policies */
  extends?: string[];
}

// ============================================
// POLICY REGISTRY TYPES
// ============================================

/**
 * Compiled policy (ready for enforcement)
 */
export interface CompiledPolicy {
  /** Source policy document */
  source: PolicyDocument;
  /** Compiled boundaries */
  boundaries: CompiledBoundary[];
  /** Intent configuration */
  intent: PolicyIntent;
  /** Permission rules */
  permissionRules: CompiledPermissionRule[];
  /** Teaching responses */
  teachingResponses: Map<string, TeachingHint>;
}

/**
 * A compiled boundary from a policy constraint
 */
export interface CompiledBoundary {
  /** Source constraint ID */
  constraintId: string;
  /** Boundary definition */
  boundary: {
    id: string;
    name: string;
    description: string;
    severity: "warn" | "block" | "fatal";
    check: (context: PolicyCheckContext) => Promise<PolicyViolation | null>;
  };
}


/**
 * Context for policy checking
 */
export interface PolicyCheckContext {
  tool_name: string;
  tool_input: Record<string, unknown>;
  working_directory: string;
  session_id?: string;
  timestamp: number;
}

/**
 * A policy violation
 */
export interface PolicyViolation {
  constraintId: string;
  reason: string;
  suggestion?: string;
  autoFixable: boolean;
  autoFix?: AutoFixAction;
  severity: ConstraintSeverity;
}

/**
 * Compiled permission rule
 */
export interface CompiledPermissionRule {
  permissionId: string;
  domain: PermissionDomain;
  actions: PermissionAction[];
  matcher: (context: PolicyCheckContext) => boolean;
  requiresApproval: boolean;
}

/**
 * Policy intent (for cognitive security integration)
 */
export interface PolicyIntent {
  /** Goals derived from permissions */
  goals: PolicyGoal[];
  /** Boundaries derived from constraints */
  boundaries: PolicyBoundary[];
  /** Forbidden actions */
  forbidden: string[];
  /** Values (from teaching hints) */
  values: string[];
}

/**
 * A goal in policy intent
 */
export interface PolicyGoal {
  id: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  measurable: boolean;
  successCriteria?: string;
}

/**
 * A boundary in policy intent
 */
export interface PolicyBoundary {
  id: string;
  description: string;
  enforcement: "never" | "require_approval" | "log_only";
  domain: string;
  pattern?: string;
}

// ============================================
// POLICY REGISTRY CONFIG
// ============================================

/**
 * Configuration for policy registry
 */
export interface PolicyRegistryConfig {
  /** Policy search paths */
  searchPaths?: string[];
  /** Auto-load policies on init */
  autoLoad?: boolean;
  /** Enable learned policies */
  enableLearned?: boolean;
  /** Default policy scope */
  defaultScope?: "global" | "project" | "session";
  /** Policy file patterns */
  filePatterns?: string[];
}

/**
 * Policy registry statistics
 */
export interface PolicyStats {
  /** Total policies */
  totalPolicies: number;
  /** Total constraints */
  totalConstraints: number;
  /** Total permissions */
  totalPermissions: number;
  /** Total teaching hints */
  totalTeachingHints: number;
  /** Compiled boundaries */
  compiledBoundaries: number;
  /** Learned constraints */
  learnedConstraints: number;
}
