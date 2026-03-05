/**
 * Cognitive Security Hooks
 *
 * Automatic security checks integrated into the agent lifecycle.
 * No manual calls needed - hooks intercept all operations.
 */

import type { HookInput, HookOutput } from "../../types/index.js";
import {
  classifyData,
  classifyOperation,
  scoreAlignment,
  createFlowPolicyEngine,
  createFlowTracker,
  createLeakPrevention,
  createTaintTracker,
  type FlowPolicyEngineHandle,
  type FlowTrackerHandle,
  type LeakPreventionHandle,
  type TaintTrackerHandle,
  type AgentIntent,
  type ActionContext,
} from "./index.js";

/**
 * Security configuration for hooks
 */
export interface SecurityHookConfig {
  /** Enable all security checks */
  enabled: boolean;

  /** Check intent alignment before actions */
  checkIntentAlignment: boolean;

  /** Enforce flow policies */
  enforceFlowPolicies: boolean;

  /** Check for data leaks */
  preventLeaks: boolean;

  /** Track taint propagation */
  trackTaints: boolean;

  /** Log security events */
  logEvents: boolean;

  /** Block on violations (false = log only) */
  blockOnViolation: boolean;

  /** Minimum alignment score to allow (0-1) */
  minAlignmentScore: number;

  /** Sensitivities that require approval */
  approvalRequiredSensitivities: string[];

  /** Domains that require signed actions (every action cryptographically signed) */
  requireSignedActions: string[];

  /** Threshold for drift detection (0-1, higher = more strict) */
  driftThreshold: number;

  /** Enable immutable directives (cryptographically signed rules outside AI context) */
  enableImmutableDirectives: boolean;

  /** Require approval for operations above this sensitivity level */
  approvalSensitivityLevel: string;
}

export const DEFAULT_SECURITY_CONFIG: SecurityHookConfig = {
  enabled: true,
  checkIntentAlignment: true,
  enforceFlowPolicies: true,
  preventLeaks: true,
  trackTaints: true,
  logEvents: true,
  blockOnViolation: true,
  minAlignmentScore: 0.5,
  approvalRequiredSensitivities: ["secret", "top_secret"],
  // Domains requiring cryptographic action signing
  requireSignedActions: ["financial", "external", "credentials"],
  // Drift detection threshold - flag when behavior deviates > 30%
  driftThreshold: 0.3,
  // Enable immutable directives from secure storage
  enableImmutableDirectives: true,
  // Sensitivity level requiring explicit user approval
  approvalSensitivityLevel: "confidential",
};

/**
 * Security event for logging
 */
export interface SecurityEvent {
  timestamp: number;
  hook: string;
  tool?: string;
  action: "check" | "allow" | "deny" | "sanitize";
  reason?: string;
  sensitivity?: string;
  category?: string;
  alignmentScore?: number;
  dataId?: string;
}

/**
 * Cognitive Security Hook Handler
 *
 * Maintains state across hooks and provides security check methods.
 */
export class CognitiveSecurityHooks {
  private config: SecurityHookConfig;
  private intent: AgentIntent | null = null;
  private policyEngine: FlowPolicyEngineHandle | null = null;
  private flowTracker: FlowTrackerHandle | null = null;
  private leakPrevention: LeakPreventionHandle | null = null;
  private taintTracker: TaintTrackerHandle | null = null;
  private events: SecurityEvent[] = [];
  private initialized = false;
  private sessionId: string | null = null;

  constructor(config: Partial<SecurityHookConfig> = {}) {
    this.config = { ...DEFAULT_SECURITY_CONFIG, ...config };
  }

  /**
   * Initialize security components (called on SessionStart)
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      if (this.config.enforceFlowPolicies) {
        this.policyEngine = await createFlowPolicyEngine();
      }
      if (this.config.trackTaints) {
        this.flowTracker = await createFlowTracker();
        this.taintTracker = await createTaintTracker();
      }
      if (this.config.preventLeaks) {
        this.leakPrevention = await createLeakPrevention();
      }
      this.initialized = true;
      this.log("SessionStart", undefined, "check", "Security hooks initialized");
    } catch (error) {
      this.log("SessionStart", undefined, "check", `Init failed: ${error}`);
    }
  }

  /**
   * Set the agent intent for alignment checking
   */
  setIntent(intent: AgentIntent): void {
    this.intent = intent;
    this.log("SessionStart", undefined, "check", `Intent loaded: ${intent.identity.name}`);
  }

  /**
   * SessionStart hook - Initialize security and load intent
   */
  async onSessionStart(input: HookInput): Promise<HookOutput> {
    await this.initialize();
    this.sessionId = input.session_id || null;

    // Intent should be set externally before session starts
    // This is just initialization

    return { decision: "allow" };
  }

  /**
   * PreToolUse hook - Check intent, classify action, enforce policies
   */
  async onPreToolUse(input: HookInput): Promise<HookOutput> {
    if (!this.config.enabled) {
      return { decision: "allow" };
    }

    await this.initialize();
    const toolName = input.tool_name || "unknown";
    const toolInput = input.tool_input || {};

    // 1. Classify the operation
    const actionContext: ActionContext = {
      actionType: this.inferActionType(toolName),
      domain: this.inferDomain(toolName),
      operation: toolName,
      target: typeof toolInput.file_path === "string" ? toolInput.file_path : undefined,
      params: toolInput,
      reasoning: `Tool: ${toolName}`,
    };

    try {
      const classifiedAction = await classifyOperation(
        toolName,
        actionContext.domain,
        actionContext.target,
        actionContext.reasoning
      );

      // 2. Check intent alignment
      if (this.config.checkIntentAlignment && this.intent) {
        const alignment = await scoreAlignment(actionContext, this.intent);

        this.log("PreToolUse", toolName, "check",
          `Alignment: ${alignment.score.toFixed(2)}`,
          undefined, undefined, alignment.score
        );

        if (alignment.shouldBlock || alignment.score < this.config.minAlignmentScore) {
          const reason = alignment.boundaryConcerns.length > 0
            ? `Boundary concerns: ${alignment.boundaryConcerns.join(", ")}`
            : `Low alignment score: ${alignment.score.toFixed(2)}`;

          this.log("PreToolUse", toolName, "deny", reason);

          if (this.config.blockOnViolation) {
            return {
              decision: "deny",
              reason: `[Security] ${reason}`,
            };
          }
        }
      }

      // 3. Check flow policy
      if (this.config.enforceFlowPolicies && this.policyEngine) {
        // Extract content for classification
        const content = this.extractContent(toolInput);
        const classified = await classifyData(content, actionContext.domain, [toolName]);

        this.log("PreToolUse", toolName, "check",
          `Classified: ${classified.sensitivity}/${classified.category}`,
          classified.sensitivity, classified.category
        );

        // Determine target domain
        const targetDomain = this.isExternalTool(toolName) ? "external" : "internal";

        const flowResult = this.policyEngine.evaluate(
          classified,
          actionContext.domain,
          targetDomain
        );

        if (!flowResult.allowed) {
          this.log("PreToolUse", toolName, "deny", flowResult.reason);

          if (this.config.blockOnViolation) {
            return {
              decision: "deny",
              reason: `[Security] Flow policy violation: ${flowResult.reason}`,
            };
          }
        }

        // Check if approval required
        if (flowResult.requireApproval ||
            this.config.approvalRequiredSensitivities.includes(classified.sensitivity)) {
          // For now, just log - in full implementation would prompt user
          this.log("PreToolUse", toolName, "check", "Approval recommended");
        }
      }

      this.log("PreToolUse", toolName, "allow", "Checks passed");
      return { decision: "allow" };

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.log("PreToolUse", toolName, "check", `Error: ${msg}`);
      // On error, allow but log
      return { decision: "allow" };
    }
  }

  /**
   * PostToolUse hook - Check output for leaks, track flows
   */
  async onPostToolUse(input: HookInput): Promise<HookOutput> {
    if (!this.config.enabled) {
      return { decision: "allow" };
    }

    await this.initialize();
    const toolName = input.tool_name || "unknown";
    const toolResult = input.tool_result || "";
    const toolIsError = input.tool_result_is_error || false;

    // Skip error results
    if (toolIsError) {
      return { decision: "allow" };
    }

    try {
      // 1. Classify output
      const content = typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult);
      const classified = await classifyData(content, "agent", [toolName, "output"]);

      this.log("PostToolUse", toolName, "check",
        `Output: ${classified.sensitivity}/${classified.category}`,
        classified.sensitivity, classified.category
      );

      // 2. Check for leaks
      if (this.config.preventLeaks && this.leakPrevention) {
        const channel = this.isExternalTool(toolName) ? "external" : "internal";
        const leakCheck = this.leakPrevention.check(content, channel);

        if (leakCheck.action === "block") {
          const patterns = leakCheck.detections.map(d => d.pattern_name).join(", ");
          this.log("PostToolUse", toolName, "sanitize", `Leaks detected: ${patterns}`);

          if (this.config.blockOnViolation) {
            // Sanitize the output
            const sanitized = this.leakPrevention.sanitize(content);
            this.log("PostToolUse", toolName, "sanitize", "Output sanitized");

            return {
              decision: "allow",
              modified_input: {
                tool_result: sanitized,
              },
            };
          }
        }
      }

      // 3. Track flow
      if (this.config.trackTaints && this.flowTracker && this.policyEngine) {
        const sourceDomain = "agent";
        const targetDomain = this.isExternalTool(toolName) ? "external" : "internal";

        const flowResult = this.policyEngine.evaluate(
          classified,
          sourceDomain,
          targetDomain
        );

        this.flowTracker.record(
          classified,
          sourceDomain,
          targetDomain,
          this.isExternalTool(toolName) ? "outbound" : "internal",
          flowResult,
          this.sessionId,
          null
        );

        this.log("PostToolUse", toolName, "check", "Flow tracked");
      }

      this.log("PostToolUse", toolName, "allow", "Output checks passed");
      return { decision: "allow" };

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.log("PostToolUse", toolName, "check", `Error: ${msg}`);
      return { decision: "allow" };
    }
  }

  /**
   * UserPromptSubmit hook - Check user input for injection attempts
   */
  async onUserPromptSubmit(input: HookInput): Promise<HookOutput> {
    if (!this.config.enabled) {
      return { decision: "allow" };
    }

    const prompt = input.prompt || "";
    await this.initialize();

    try {
      // Check for potential injection patterns
      const suspiciousPatterns = [
        /ignore (all )?(previous|above) instructions/i,
        /you are now/i,
        /disregard (all )?(rules|policies)/i,
        /system:? prompt/i,
        /\[system\]/i,
        /<\|.*?\|>/,
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(prompt)) {
          this.log("UserPromptSubmit", undefined, "check", "Suspicious pattern detected");

          if (this.config.blockOnViolation) {
            return {
              decision: "deny",
              reason: "[Security] Prompt contains potentially unsafe patterns",
            };
          }
        }
      }

      // Classify user input
      const classified = await classifyData(prompt, "user_input", []);

      this.log("UserPromptSubmit", undefined, "check",
        `Input: ${classified.sensitivity}`,
        classified.sensitivity
      );

      return { decision: "allow" };

    } catch (error) {
      return { decision: "allow" };
    }
  }

  /**
   * SessionEnd hook - Generate security report
   */
  async onSessionEnd(_input: HookInput): Promise<HookOutput> {
    const stats = this.getStats();

    this.log("SessionEnd", undefined, "check",
      `Session ended - ${stats.totalEvents} events, ${stats.deniedCount} denied`
    );

    return { decision: "allow" };
  }

  // ============================================
  // Utility Methods
  // ============================================

  private inferActionType(toolName: string): string {
    const typeMap: Record<string, string> = {
      Read: "observe",
      Glob: "observe",
      Grep: "observe",
      Write: "modify",
      Edit: "modify",
      MultiEdit: "modify",
      Bash: "execute",
      NotebookEdit: "modify",
    };
    return typeMap[toolName] || "observe";
  }

  private inferDomain(toolName: string): string {
    const domainMap: Record<string, string> = {
      Read: "filesystem",
      Write: "filesystem",
      Edit: "filesystem",
      Glob: "filesystem",
      Grep: "filesystem",
      Bash: "shell",
      MultiEdit: "filesystem",
    };
    return domainMap[toolName] || "agent";
  }

  private isExternalTool(toolName: string): boolean {
    const externalTools = ["Bash", "Write", "Edit", "MultiEdit", "NotebookEdit"];
    return externalTools.includes(toolName);
  }

  private extractContent(input: Record<string, unknown>): string {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(input)) {
      if (typeof value === "string") {
        parts.push(value);
      } else if (typeof value === "object" && value !== null) {
        parts.push(JSON.stringify(value));
      }
    }
    return parts.join(" ");
  }

  private log(
    hook: string,
    tool: string | undefined,
    action: SecurityEvent["action"],
    reason: string,
    sensitivity?: string,
    category?: string,
    alignmentScore?: number
  ): void {
    const event: SecurityEvent = {
      timestamp: Date.now(),
      hook,
      tool,
      action,
      reason,
      sensitivity,
      category,
      alignmentScore,
    };

    this.events.push(event);

    if (this.config.logEvents) {
      const prefix = action === "deny" ? "\x1b[31m[Security]\x1b[0m" : "\x1b[90m[Security]\x1b[0m";
      const toolStr = tool ? ` ${tool}:` : "";
      console.log(`${prefix}${toolStr} ${reason}`);
    }
  }

  /**
   * Get all security events
   */
  getEvents(): SecurityEvent[] {
    return [...this.events];
  }

  /**
   * Get security statistics
   */
  getStats(): {
    totalEvents: number;
    allowedCount: number;
    deniedCount: number;
    sanitizedCount: number;
    bySensitivity: Record<string, number>;
    avgAlignmentScore: number;
  } {
    const allowedCount = this.events.filter(e => e.action === "allow").length;
    const deniedCount = this.events.filter(e => e.action === "deny").length;
    const sanitizedCount = this.events.filter(e => e.action === "sanitize").length;

    const bySensitivity: Record<string, number> = {};
    for (const event of this.events) {
      if (event.sensitivity) {
        bySensitivity[event.sensitivity] = (bySensitivity[event.sensitivity] || 0) + 1;
      }
    }

    const alignmentScores = this.events
      .filter(e => e.alignmentScore !== undefined)
      .map(e => e.alignmentScore!);
    const avgAlignmentScore = alignmentScores.length > 0
      ? alignmentScores.reduce((a, b) => a + b, 0) / alignmentScores.length
      : 0;

    return {
      totalEvents: this.events.length,
      allowedCount,
      deniedCount,
      sanitizedCount,
      bySensitivity,
      avgAlignmentScore,
    };
  }

  /**
   * Clear event history
   */
  clearEvents(): void {
    this.events = [];
  }
}

// Singleton instance
let globalHooks: CognitiveSecurityHooks | null = null;

/**
 * Get global security hooks instance
 */
export function getSecurityHooks(
  config?: Partial<SecurityHookConfig>
): CognitiveSecurityHooks {
  if (!globalHooks) {
    globalHooks = new CognitiveSecurityHooks(config);
  }
  return globalHooks;
}

/**
 * Create hook handlers for HookManager
 */
export function createSecurityHookHandlers(
  config?: Partial<SecurityHookConfig>
): {
  SessionStart: (input: HookInput) => Promise<HookOutput>;
  PreToolUse: (input: HookInput) => Promise<HookOutput>;
  PostToolUse: (input: HookInput) => Promise<HookOutput>;
  UserPromptSubmit: (input: HookInput) => Promise<HookOutput>;
  SessionEnd: (input: HookInput) => Promise<HookOutput>;
} {
  const hooks = new CognitiveSecurityHooks(config);

  return {
    SessionStart: (input) => hooks.onSessionStart(input),
    PreToolUse: (input) => hooks.onPreToolUse(input),
    PostToolUse: (input) => hooks.onPostToolUse(input),
    UserPromptSubmit: (input) => hooks.onUserPromptSubmit(input),
    SessionEnd: (input) => hooks.onSessionEnd(input),
  };
}
