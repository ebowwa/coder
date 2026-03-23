/**
 * Policy Hooks
 *
 * Hook handlers for policy enforcement.
 * Integrates with the hook system to enforce policies at runtime.
 */

import type { BoundsHookInput, BoundsHookOutput } from "../bounds/types.js";

/** Alias for convenience */
type HookInput = BoundsHookInput;
type HookOutput = BoundsHookOutput;
import { getRegistry, type PolicyRegistry } from "./registry.js";
import type {
  PolicyCheckContext,
  PolicyViolation,
  PolicyDocument,
  PolicyConstraint,
  ConstraintSeverity,
  ToolPattern,
} from "./types.js";

/**
 * Policy hook configuration
 */
export interface PolicyHookConfig {
  /** Enable policy enforcement */
  enabled: boolean;
  /** Block on violations */
  blockOnViolation: boolean;
  /** Log policy events */
  logEvents: boolean;
  /** Enable learning from failures */
  enableLearning: boolean;
  /** Minimum severity to block */
  minBlockSeverity: ConstraintSeverity;
  /** Auto-fix when possible */
  autoFix: boolean;
}

export const DEFAULT_POLICY_HOOK_CONFIG: PolicyHookConfig = {
  enabled: true,
  blockOnViolation: true,
  logEvents: true,
  enableLearning: true,
  minBlockSeverity: "block",
  autoFix: true,
};

/**
 * Policy event for logging
 */
export interface PolicyEvent {
  timestamp: number;
  hook: string;
  tool?: string;
  action: "check" | "allow" | "deny" | "learn" | "fix";
  reason?: string;
  constraintId?: string;
  severity?: ConstraintSeverity;
  autoFixed?: boolean;
}

/**
 * Policy Hook Handler
 *
 * Manages policy enforcement across the agent lifecycle.
 */
export class PolicyHooks {
  private config: PolicyHookConfig;
  private registry: PolicyRegistry;
  private events: PolicyEvent[] = [];
  private sessionId: string | null = null;

  constructor(config: Partial<PolicyHookConfig> = {}) {
    this.config = { ...DEFAULT_POLICY_HOOK_CONFIG, ...config };
    this.registry = getRegistry();
  }

  // ============================================
  // HOOK HANDLERS
  // ============================================

  /**
   * SessionStart hook - Initialize policies
   */
  async onSessionStart(input: HookInput): Promise<HookOutput> {
    if (!this.config.enabled) {
      return { decision: "allow" };
    }

    this.sessionId = input.session_id || null;

    // Get combined intent for cognitive security
    const intent = this.registry.getCombinedIntent();

    this.log("SessionStart", undefined, "check",
      `Loaded ${intent.goals.length} goals, ${intent.boundaries.length} boundaries`
    );

    return { decision: "allow" };
  }

  /**
   * PreToolUse hook - Check policies before tool execution
   */
  async onPreToolUse(input: HookInput): Promise<HookOutput> {
    if (!this.config.enabled) {
      return { decision: "allow" };
    }

    const toolName = input.tool_name || "unknown";
    const toolInput = input.tool_input || {};

    const context: PolicyCheckContext = {
      tool_name: toolName,
      tool_input: toolInput,
      working_directory: input.working_directory || process.cwd(),
      session_id: this.sessionId || undefined,
      timestamp: Date.now(),
    };

    try {
      const result = await this.registry.checkAll(context);

      // Fatal violation - always block
      if (result.fatal) {
        this.log("PreToolUse", toolName, "deny",
          result.fatal.reason, result.fatal.constraintId, "fatal"
        );

        if (this.config.blockOnViolation) {
          return {
            decision: "deny",
            reason: `[Policy] FATAL: ${result.fatal.reason}`,
          };
        }
      }

      // Blocking violations
      if (result.violations && result.violations.length > 0) {
        const reasons = result.violations.map((v) => v.reason).join("; ");
        const firstViolation = result.violations[0];

        this.log("PreToolUse", toolName, "deny",
          reasons, firstViolation?.constraintId, "block"
        );

        if (this.config.blockOnViolation) {
          // Try auto-fix if enabled
          if (this.config.autoFix) {
            const fixed = await this.tryAutoFix(result.violations, context);
            if (fixed) {
              this.log("PreToolUse", toolName, "fix", "Auto-fixed violation");
              return {
                decision: "allow",
                modified_input: toolInput, // Modified by auto-fix
              };
            }
          }

          return {
            decision: "deny",
            reason: `[Policy] ${reasons}`,
          };
        }
      }

      // Warnings - log but allow
      for (const warning of result.warnings) {
        this.log("PreToolUse", toolName, "check",
          `Warning: ${warning.reason}`, warning.constraintId, "warn"
        );
      }

      // Check teaching responses
      const teaching = this.registry.getTeachingResponse(
        this.extractTrigger(toolName, toolInput)
      );

      if (teaching) {
        // Include teaching hint in context (could be used to inform the model)
        this.log("PreToolUse", toolName, "check",
          `Teaching: ${teaching.response}`
        );
      }

      this.log("PreToolUse", toolName, "allow", "Policy check passed");
      return { decision: "allow" };

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.log("PreToolUse", toolName, "check", `Error: ${msg}`);
      return { decision: "allow" }; // Allow on error
    }
  }

  /**
   * PostToolUse hook - Learn from failures
   */
  async onPostToolUse(input: HookInput): Promise<HookOutput> {
    if (!this.config.enabled || !this.config.enableLearning) {
      return { decision: "allow" };
    }

    const toolName = input.tool_name || "unknown";
    const isError = input.tool_result_is_error || false;

    // Learn from errors
    if (isError && this.config.enableLearning) {
      const error = input.tool_result;
      const constraint = this.learnFromError(
        toolName,
        input.tool_input || {},
        error
      );

      if (constraint) {
        this.registry.learnConstraint(constraint);
        this.log("PostToolUse", toolName, "learn",
          `Learned constraint: ${constraint.id}`
        );
      }
    }

    return { decision: "allow" };
  }

  /**
   * UserPromptSubmit hook - Check for policy triggers
   * Note: This requires extending BoundsHookInput to include prompt field
   */
  async onUserPromptSubmit(input: HookInput & { prompt?: string }): Promise<HookOutput> {
    if (!this.config.enabled) {
      return { decision: "allow" };
    }

    const prompt = input.prompt || "";

    // Check for teaching triggers
    const teaching = this.registry.getTeachingResponse(prompt);

    if (teaching) {
      this.log("UserPromptSubmit", undefined, "check",
        `Matched teaching: ${teaching.response}`
      );

      // Could inject teaching into context
      // For now, just log it
    }

    return { decision: "allow" };
  }

  /**
   * SessionEnd hook - Report policy stats
   */
  async onSessionEnd(_input: HookInput): Promise<HookOutput> {
    const stats = this.registry.getStats();
    const eventStats = this.getStats();

    this.log("SessionEnd", undefined, "check",
      `Session ended - ${stats.totalPolicies} policies, ` +
      `${eventStats.deniedCount} denied, ${eventStats.learnedCount} learned`
    );

    return { decision: "allow" };
  }

  // ============================================
  // LEARNING
  // ============================================

  /**
   * Learn a constraint from an error
   */
  private learnFromError(
    toolName: string,
    toolInput: Record<string, unknown>,
    error: unknown
  ): PolicyConstraint | null {
    const errorMsg = typeof error === "string" ? error : JSON.stringify(error);

    // Generate constraint ID
    const id = `learned:${toolName}:${Date.now()}`;

    // Extract pattern from error
    const pattern = this.extractPatternFromError(toolName, toolInput, errorMsg);

    if (!pattern) return null;

    return {
      id,
      description: `Learned from error: ${errorMsg.slice(0, 100)}`,
      reason: errorMsg,
      severity: "warn", // Start with warning
      pattern,
      learned: true,
      enabled: true,
    };
  }

  /**
   * Extract a pattern from an error
   */
  private extractPatternFromError(
    toolName: string,
    toolInput: Record<string, unknown>,
    _error: string
  ): ToolPattern | null {
    const pattern: ToolPattern = { tool: toolName };

    // Extract path pattern
    const path = this.extractPath(toolInput);
    if (path) {
      // Generalize the path
      pattern.path_pattern = this.generalizePath(path);
    }

    // For bash commands, extract command pattern
    if (toolName === "Bash" && toolInput.command) {
      pattern.command_pattern = this.generalizeCommand(toolInput.command as string);
    }

    return Object.keys(pattern).length > 1 ? pattern : null;
  }

  /**
   * Generalize a path for learning
   */
  private generalizePath(path: string): string {
    // Replace specific file names with patterns
    return path
      .replace(/\.[a-z]+$/i, "\\.[a-z]+$")
      .replace(/\d+/g, "\\d+")
      .replace(/node_modules\/[^/]+/g, "node_modules/[^/]+");
  }

  /**
   * Generalize a command for learning
   */
  private generalizeCommand(command: string): string {
    // Replace specific values with patterns
    return command
      .replace(/"[^"]+"/g, '"[^"]+"')
      .replace(/'[^']+'/g, "'[^']+'")
      .replace(/\s+/g, "\\s+");
  }

  // ============================================
  // AUTO-FIX
  // ============================================

  /**
   * Try to auto-fix violations
   */
  private async tryAutoFix(
    violations: PolicyViolation[],
    _context: PolicyCheckContext
  ): Promise<boolean> {
    for (const violation of violations) {
      if (!violation.autoFixable || !violation.autoFix) continue;

      const action = violation.autoFix;

      switch (action.type) {
        case "sanitize":
          // Sanitize the input
          this.log("AutoFix", undefined, "fix",
            `Sanitized: ${action.description}`
          );
          return true;

        case "redirect":
          // Redirect to safe alternative
          this.log("AutoFix", undefined, "fix",
            `Redirected: ${action.description}`
          );
          return true;

        case "reject":
          // Cannot auto-fix, must reject
          return false;

        case "modify":
          // Modify the input
          this.log("AutoFix", undefined, "fix",
            `Modified: ${action.description}`
          );
          return true;
      }
    }

    return false;
  }

  // ============================================
  // UTILITIES
  // ============================================

  private extractTrigger(toolName: string, toolInput: Record<string, unknown>): string {
    const parts = [toolName];

    if (toolInput.command) {
      parts.push(String(toolInput.command).slice(0, 50));
    }
    if (toolInput.file_path) {
      parts.push(String(toolInput.file_path));
    }

    return parts.join(" ").toLowerCase();
  }

  private extractPath(input: Record<string, unknown>): string | undefined {
    return (input.file_path as string) ||
      (input.path as string) ||
      (input.directory as string);
  }

  private log(
    hook: string,
    tool: string | undefined,
    action: PolicyEvent["action"],
    reason: string,
    constraintId?: string,
    severity?: ConstraintSeverity
  ): void {
    const event: PolicyEvent = {
      timestamp: Date.now(),
      hook,
      tool,
      action,
      reason,
      constraintId,
      severity,
    };

    this.events.push(event);

    if (this.config.logEvents) {
      const prefix = action === "deny" ? "\x1b[31m[Policy]\x1b[0m" :
        action === "learn" ? "\x1b[33m[Policy]\x1b[0m" :
          action === "fix" ? "\x1b[32m[Policy]\x1b[0m" :
            "\x1b[90m[Policy]\x1b[0m";
      const toolStr = tool ? ` ${tool}:` : "";
      console.log(`${prefix}${toolStr} ${reason}`);
    }
  }

  /**
   * Get all events
   */
  getEvents(): PolicyEvent[] {
    return [...this.events];
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalEvents: number;
    deniedCount: number;
    allowedCount: number;
    learnedCount: number;
    fixedCount: number;
  } {
    return {
      totalEvents: this.events.length,
      deniedCount: this.events.filter((e) => e.action === "deny").length,
      allowedCount: this.events.filter((e) => e.action === "allow").length,
      learnedCount: this.events.filter((e) => e.action === "learn").length,
      fixedCount: this.events.filter((e) => e.action === "fix").length,
    };
  }

  /**
   * Clear events
   */
  clearEvents(): void {
    this.events = [];
  }
}

// ============================================
// SINGLETON
// ============================================

let globalHooks: PolicyHooks | null = null;

/**
 * Get global policy hooks
 */
export function getPolicyHooks(config?: Partial<PolicyHookConfig>): PolicyHooks {
  if (!globalHooks) {
    globalHooks = new PolicyHooks(config);
  }
  return globalHooks;
}

/**
 * Create hook handlers for HookManager
 */
export function createPolicyHookHandlers(
  config?: Partial<PolicyHookConfig>
): {
  SessionStart: (input: HookInput) => Promise<HookOutput>;
  PreToolUse: (input: HookInput) => Promise<HookOutput>;
  PostToolUse: (input: HookInput) => Promise<HookOutput>;
  UserPromptSubmit: (input: HookInput) => Promise<HookOutput>;
  SessionEnd: (input: HookInput) => Promise<HookOutput>;
} {
  const hooks = new PolicyHooks(config);

  return {
    SessionStart: (input) => hooks.onSessionStart(input),
    PreToolUse: (input) => hooks.onPreToolUse(input),
    PostToolUse: (input) => hooks.onPostToolUse(input),
    UserPromptSubmit: (input) => hooks.onUserPromptSubmit(input),
    SessionEnd: (input) => hooks.onSessionEnd(input),
  };
}
