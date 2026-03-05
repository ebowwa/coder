/**
 * Cognitive Security Middleware
 *
 * Automatically integrates flow control into the agent loop.
 * All tool inputs/outputs are classified, tracked, and validated.
 */

import {
  classifyData,
  createFlowPolicyEngine,
  createFlowTracker,
  createLeakPrevention,
  createTaintTracker,
  type ClassifiedData,
  type FlowPolicyEngineHandle,
  type FlowTrackerHandle,
  type LeakPreventionHandle,
  type TaintTrackerHandle,
  type FlowValidationResult,
  type LeakCheckResult,
} from "./index.js";

export interface SecurityConfig {
  /** Enable automatic data classification */
  enabled: boolean;
  /** Enable flow policy enforcement */
  enforcePolicies: boolean;
  /** Enable taint tracking */
  trackTaints: boolean;
  /** Enable leak prevention on outputs */
  preventLeaks: boolean;
  /** Log security events */
  logEvents: boolean;
  /** Block on policy violations */
  blockOnViolation: boolean;
  /** Domains considered external (require stricter checks) */
  externalDomains: string[];
  /** Tools that transmit data externally */
  externalTools: string[];
  /** Tools that read from sensitive sources */
  sensitiveSourceTools: string[];
}

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  enabled: true,
  enforcePolicies: true,
  trackTaints: true,
  preventLeaks: true,
  logEvents: true,
  blockOnViolation: true,
  externalDomains: ["external", "network", "api", "web"],
  externalTools: ["Bash", "Write", "Edit", "MultiEdit", "NotebookEdit"],
  sensitiveSourceTools: ["Read", "Bash"],
};

export interface SecurityEvent {
  type: "classify" | "flow_check" | "leak_check" | "taint" | "block" | "allow";
  timestamp: number;
  toolName: string;
  dataId?: string;
  sensitivity?: string;
  category?: string;
  sourceDomain?: string;
  targetDomain?: string;
  allowed?: boolean;
  reason?: string;
}

export interface ToolSecurityContext {
  toolName: string;
  input: Record<string, unknown>;
  output?: unknown;
  sourceDomain: string;
  targetDomain: string;
}

export interface SecurityMiddlewareResult {
  allowed: boolean;
  reason: string;
  classifiedInput?: ClassifiedData;
  classifiedOutput?: ClassifiedData;
  flowResult?: FlowValidationResult;
  leakResult?: LeakCheckResult;
  sanitizedOutput?: string;
  events: SecurityEvent[];
}

/**
 * Cognitive Security Middleware
 *
 * Wraps tool execution with automatic security checks.
 */
export class CognitiveSecurityMiddleware {
  private config: SecurityConfig;
  private policyEngine: FlowPolicyEngineHandle | null = null;
  private flowTracker: FlowTrackerHandle | null = null;
  private leakPrevention: LeakPreventionHandle | null = null;
  private taintTracker: TaintTrackerHandle | null = null;
  private events: SecurityEvent[] = [];
  private initialized = false;

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...DEFAULT_SECURITY_CONFIG, ...config };
  }

  /**
   * Initialize security components (lazy loading)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      if (this.config.enforcePolicies) {
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
    } catch (error) {
      console.warn("[Security] Failed to initialize:", error);
      // Continue without security if init fails
    }
  }

  /**
   * Check tool input before execution
   */
  async checkInput(
    toolName: string,
    input: Record<string, unknown>
  ): Promise<SecurityMiddlewareResult> {
    await this.initialize();

    const events: SecurityEvent[] = [];
    const sourceDomain = this.getToolDomain(toolName);
    const targetDomain = "agent";

    // Extract input content for classification
    const inputContent = this.extractContent(input);

    // Classify input data
    const classifiedInput = await classifyData(
      inputContent,
      sourceDomain,
      [toolName]
    );

    events.push({
      type: "classify",
      timestamp: Date.now(),
      toolName,
      dataId: classifiedInput.id,
      sensitivity: classifiedInput.sensitivity,
      category: classifiedInput.category,
      sourceDomain,
      targetDomain,
    });

    // Check flow policy
    let flowResult: FlowValidationResult | undefined;
    if (this.policyEngine && this.config.enforcePolicies) {
      flowResult = this.policyEngine.evaluate(
        classifiedInput,
        sourceDomain,
        targetDomain
      );

      events.push({
        type: "flow_check",
        timestamp: Date.now(),
        toolName,
        dataId: classifiedInput.id,
        sourceDomain,
        targetDomain,
        allowed: flowResult.allowed,
        reason: flowResult.reason,
      });

      if (!flowResult.allowed && this.config.blockOnViolation) {
        events.push({
          type: "block",
          timestamp: Date.now(),
          toolName,
          reason: flowResult.reason,
        });

        this.logEvent(events);
        return {
          allowed: false,
          reason: `Security policy blocked: ${flowResult.reason}`,
          classifiedInput,
          flowResult,
          events,
        };
      }
    }

    // Register taint for sensitive data
    if (this.taintTracker && this.config.trackTaints) {
      if (classifiedInput.sensitivity !== "public") {
        const sourceId = this.taintTracker.registerSource(
          sourceDomain,
          classifiedInput.sensitivity,
          [classifiedInput.category]
        );
        this.taintTracker.taint(sourceId, inputContent, "tool_input", toolName);

        events.push({
          type: "taint",
          timestamp: Date.now(),
          toolName,
          sensitivity: classifiedInput.sensitivity,
        });
      }
    }

    events.push({
      type: "allow",
      timestamp: Date.now(),
      toolName,
      reason: "Input check passed",
    });

    this.logEvent(events);
    return {
      allowed: true,
      reason: "Input check passed",
      classifiedInput,
      flowResult,
      events,
    };
  }

  /**
   * Check tool output after execution
   */
  async checkOutput(
    toolName: string,
    input: Record<string, unknown>,
    output: string
  ): Promise<SecurityMiddlewareResult> {
    await this.initialize();

    const events: SecurityEvent[] = [];
    const sourceDomain = "agent";
    const targetDomain = this.isExternalTool(toolName)
      ? "external"
      : "internal";

    // Classify output data
    const classifiedOutput = await classifyData(
      output,
      sourceDomain,
      [toolName, "output"]
    );

    events.push({
      type: "classify",
      timestamp: Date.now(),
      toolName,
      dataId: classifiedOutput.id,
      sensitivity: classifiedOutput.sensitivity,
      category: classifiedOutput.category,
      sourceDomain,
      targetDomain,
    });

    // Check flow policy for output
    let flowResult: FlowValidationResult | undefined;
    if (this.policyEngine && this.config.enforcePolicies && this.isExternalTool(toolName)) {
      flowResult = this.policyEngine.evaluate(
        classifiedOutput,
        sourceDomain,
        targetDomain
      );

      events.push({
        type: "flow_check",
        timestamp: Date.now(),
        toolName,
        dataId: classifiedOutput.id,
        sourceDomain,
        targetDomain,
        allowed: flowResult.allowed,
        reason: flowResult.reason,
      });

      if (!flowResult.allowed && this.config.blockOnViolation) {
        events.push({
          type: "block",
          timestamp: Date.now(),
          toolName,
          reason: flowResult.reason,
        });

        this.logEvent(events);
        return {
          allowed: false,
          reason: `Security policy blocked output: ${flowResult.reason}`,
          classifiedOutput,
          flowResult,
          events,
        };
      }
    }

    // Check for leaks
    let leakResult: LeakCheckResult | undefined;
    let sanitizedOutput = output;
    if (this.leakPrevention && this.config.preventLeaks) {
      leakResult = this.leakPrevention.check(output, targetDomain);

      events.push({
        type: "leak_check",
        timestamp: Date.now(),
        toolName,
        allowed: leakResult.action !== "block",
        reason: leakResult.action,
      });

      if (leakResult.action === "block") {
        // Sanitize instead of blocking
        sanitizedOutput = this.leakPrevention.sanitize(output);

        if (this.config.blockOnViolation) {
          events.push({
            type: "block",
            timestamp: Date.now(),
            toolName,
            reason: `Leak detected: ${leakResult.detections.map(d => d.pattern_name).join(", ")}`,
          });

          this.logEvent(events);
          return {
            allowed: false,
            reason: `Potential data leak detected and blocked`,
            classifiedOutput,
            leakResult,
            sanitizedOutput,
            events,
          };
        }
      }
    }

    // Track flow
    if (this.flowTracker && this.config.trackTaints && flowResult) {
      this.flowTracker.record(
        classifiedOutput,
        sourceDomain,
        targetDomain,
        this.isExternalTool(toolName) ? "outbound" : "internal",
        flowResult,
        null,
        null
      );
    }

    events.push({
      type: "allow",
      timestamp: Date.now(),
      toolName,
      reason: "Output check passed",
    });

    this.logEvent(events);
    return {
      allowed: true,
      reason: "Output check passed",
      classifiedOutput,
      flowResult,
      leakResult,
      sanitizedOutput,
      events,
    };
  }

  /**
   * Wrap tool handler with security checks
   */
  wrapToolHandler<TInput extends Record<string, unknown>, TResult>(
    toolName: string,
    handler: (input: TInput, context: unknown) => Promise<{ content: string; is_error?: boolean }>
  ): (input: TInput, context: unknown) => Promise<{ content: string; is_error?: boolean }> {
    return async (input: TInput, context: unknown) => {
      if (!this.config.enabled) {
        return handler(input, context);
      }

      // Check input
      const inputCheck = await this.checkInput(toolName, input as Record<string, unknown>);
      if (!inputCheck.allowed) {
        return {
          content: `[Security] ${inputCheck.reason}`,
          is_error: true,
        };
      }

      // Execute tool
      const result = await handler(input, context);

      // Check output
      const outputCheck = await this.checkOutput(toolName, input as Record<string, unknown>, result.content);
      if (!outputCheck.allowed) {
        return {
          content: outputCheck.sanitizedOutput || `[Security] ${outputCheck.reason}`,
          is_error: true,
        };
      }

      // Return sanitized output if needed
      return {
        content: outputCheck.sanitizedOutput || result.content,
        is_error: result.is_error,
      };
    };
  }

  /**
   * Get domain for a tool
   */
  private getToolDomain(toolName: string): string {
    if (this.isExternalTool(toolName)) return "external";
    if (this.config.sensitiveSourceTools.includes(toolName)) return "filesystem";
    return "internal";
  }

  /**
   * Check if tool transmits externally
   */
  private isExternalTool(toolName: string): boolean {
    return this.config.externalTools.includes(toolName);
  }

  /**
   * Extract content from tool input for classification
   */
  private extractContent(input: Record<string, unknown>): string {
    const parts: string[] = [];

    for (const [key, value] of Object.entries(input)) {
      if (typeof value === "string") {
        parts.push(`${key}=${value}`);
      } else if (typeof value === "object" && value !== null) {
        parts.push(`${key}=${JSON.stringify(value)}`);
      }
    }

    return parts.join(" ");
  }

  /**
   * Log security events
   */
  private logEvent(events: SecurityEvent[]): void {
    this.events.push(...events);

    if (this.config.logEvents) {
      for (const event of events) {
        if (event.type === "block") {
          console.warn(`[Security] BLOCK: ${event.toolName} - ${event.reason}`);
        } else if (event.type === "allow" && event.sensitivity && event.sensitivity !== "public") {
          console.log(`[Security] ALLOW: ${event.toolName} (${event.sensitivity})`);
        }
      }
    }
  }

  /**
   * Get all security events
   */
  getEvents(): SecurityEvent[] {
    return [...this.events];
  }

  /**
   * Clear event history
   */
  clearEvents(): void {
    this.events = [];
  }

  /**
   * Get security statistics
   */
  getStats(): {
    totalEvents: number;
    blockedCount: number;
    allowedCount: number;
    bySensitivity: Record<string, number>;
  } {
    const blockedCount = this.events.filter(e => e.type === "block").length;
    const allowedCount = this.events.filter(e => e.type === "allow").length;

    const bySensitivity: Record<string, number> = {};
    for (const event of this.events) {
      if (event.sensitivity) {
        bySensitivity[event.sensitivity] = (bySensitivity[event.sensitivity] || 0) + 1;
      }
    }

    return {
      totalEvents: this.events.length,
      blockedCount,
      allowedCount,
      bySensitivity,
    };
  }
}

// Singleton instance for global use
let globalMiddleware: CognitiveSecurityMiddleware | null = null;

/**
 * Get or create global security middleware
 */
export function getSecurityMiddleware(
  config?: Partial<SecurityConfig>
): CognitiveSecurityMiddleware {
  if (!globalMiddleware) {
    globalMiddleware = new CognitiveSecurityMiddleware(config);
  }
  return globalMiddleware;
}

/**
 * Reset global middleware (for testing)
 */
export function resetSecurityMiddleware(): void {
  globalMiddleware = null;
}
