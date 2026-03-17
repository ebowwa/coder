/**
 * Boundary Enforcer - Hook-based boundary enforcement
 *
 * Integrates with the existing HookManager to provide:
 * - PreToolUse: Check boundaries before tool execution
 * - PostToolUseFailure: Extract signals from failures
 *
 * The enforcer is the mechanical layer that turns boundary
 * definitions into actual blocking behavior.
 */

import type {
  BoundaryContext,
  BoundaryViolation,
  FailureSignal,
  BoundsHookInput,
  BoundsHookOutput,
  ErrorType,
} from "./types.js";
import { BoundaryRegistry, getRegistry } from "./registry.js";

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `sig_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Classify an error into a type
 */
function classifyError(error: unknown): ErrorType {
  if (!error) return "unknown";

  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();

  // Parse errors
  if (
    lowerMessage.includes("parse") ||
    lowerMessage.includes("json") ||
    lowerMessage.includes("unexpected token") ||
    lowerMessage.includes("invalid json") ||
    lowerMessage.includes("syntaxerror")
  ) {
    return "parse";
  }

  // Permission errors
  if (
    lowerMessage.includes("permission") ||
    lowerMessage.includes("access denied") ||
    lowerMessage.includes("eacces") ||
    lowerMessage.includes("eperm") ||
    lowerMessage.includes("unauthorized") ||
    lowerMessage.includes("forbidden")
  ) {
    return "permission";
  }

  // Timeout errors
  if (
    lowerMessage.includes("timeout") ||
    lowerMessage.includes("timed out") ||
    lowerMessage.includes("etimedout") ||
    lowerMessage.includes("deadline exceeded")
  ) {
    return "timeout";
  }

  // Validation errors
  if (
    lowerMessage.includes("validation") ||
    lowerMessage.includes("invalid") ||
    lowerMessage.includes("required") ||
    lowerMessage.includes("expected") ||
    lowerMessage.includes("must be")
  ) {
    return "validation";
  }

  return "runtime";
}

/**
 * Extract a failure signal from a hook input
 */
function extractSignal(input: BoundsHookInput): FailureSignal | null {
  // Only extract signals from errors
  if (!input.tool_result_is_error && !input.error) {
    return null;
  }

  return {
    id: generateId(),
    timestamp: Date.now(),
    tool_name: input.tool_name,
    tool_input: input.tool_input,
    error: input.error || String(input.tool_result),
    errorType: classifyError(input.error || input.tool_result),
    debugInfo: input.tool_result ? JSON.stringify(input.tool_result, null, 2) : undefined,
    workingDirectory: input.working_directory,
    sessionId: input.session_id,
    processed: false,
  };
}

/**
 * Build a boundary context from hook input
 */
function buildContext(input: BoundsHookInput): BoundaryContext {
  return {
    tool_name: input.tool_name,
    tool_input: input.tool_input,
    workingDirectory: input.working_directory || process.cwd(),
    sessionId: input.session_id,
    timestamp: Date.now(),
  };
}

/**
 * Create a pre-tool-use hook handler
 *
 * This hook checks all boundaries before a tool is executed.
 * If any boundary with severity "block" or "fatal" is violated,
 * the tool execution is blocked.
 */
export function createPreToolUseHandler(
  registry: BoundaryRegistry = getRegistry()
): (input: BoundsHookInput) => Promise<BoundsHookOutput> {
  return async (input: BoundsHookInput): Promise<BoundsHookOutput> => {
    const context = buildContext(input);

    try {
      const result = await registry.checkAll(context);

      // Fatal violations stop everything
      if (result.fatal) {
        const fatal = result.violations.find((v) => {
          const b = registry.get(v.boundaryId);
          return b?.severity === "fatal";
        });

        return {
          decision: "block",
          reason: `FATAL: ${fatal?.reason || "Fatal boundary violation"}`,
          violations: result.violations,
        };
      }

      // Blocking violations prevent the tool
      if (result.blocked) {
        const blocking = result.violations.filter((v) => {
          const b = registry.get(v.boundaryId);
          return b?.severity === "block";
        });

        const reasons = blocking.map((v) => v.reason).join("; ");

        return {
          decision: "deny",
          reason: `Blocked by boundaries: ${reasons}`,
          violations: result.violations,
        };
      }

      // Warnings are logged but don't block
      if (result.warnings.length > 0) {
        for (const warning of result.warnings) {
          console.warn(`[Bounds] Warning: ${warning.reason}`);
        }
      }

      return { decision: "allow" };
    } catch (err) {
      // On error, allow but log
      console.error("[Bounds] Error checking boundaries:", err);
      return { decision: "allow" };
    }
  };
}

/**
 * Create a post-tool-use-failure hook handler
 *
 * This hook extracts failure signals from tool errors and
 * records them for analysis and potential patch generation.
 */
export function createPostFailureHandler(
  registry: BoundaryRegistry = getRegistry()
): (input: BoundsHookInput) => Promise<void> {
  return async (input: BoundsHookInput): Promise<void> => {
    const signal = extractSignal(input);
    if (!signal) return;

    try {
      registry.recordSignal(signal);

      // Log the signal
      console.log(
        `[Bounds] Signal recorded: ${signal.errorType} error in ${signal.tool_name}`
      );
    } catch (err) {
      console.error("[Bounds] Error recording signal:", err);
    }
  };
}

/**
 * Enforcer configuration
 */
export interface EnforcerConfig {
  /** Boundary registry to use */
  registry?: BoundaryRegistry;
  /** Enable signal recording */
  recordSignals?: boolean;
  /** Enable warning logs */
  logWarnings?: boolean;
  /** Enable debug logs */
  debug?: boolean;
}

/**
 * Boundary Enforcer - Main class for hook integration
 */
export class BoundaryEnforcer {
  private registry: BoundaryRegistry;
  private config: Required<EnforcerConfig>;
  private preToolUseHandler: ReturnType<typeof createPreToolUseHandler> | null = null;
  private postFailureHandler: ReturnType<typeof createPostFailureHandler> | null = null;

  constructor(config?: EnforcerConfig) {
    this.registry = config?.registry || getRegistry();
    this.config = {
      registry: this.registry,
      recordSignals: config?.recordSignals ?? true,
      logWarnings: config?.logWarnings ?? true,
      debug: config?.debug ?? false,
    };

    // Create handlers
    this.preToolUseHandler = createPreToolUseHandler(this.registry);
    this.postFailureHandler = createPostFailureHandler(this.registry);
  }

  /**
   * Get the pre-tool-use handler for hook registration
   */
  getPreToolUseHandler(): ReturnType<typeof createPreToolUseHandler> {
    if (!this.preToolUseHandler) {
      this.preToolUseHandler = createPreToolUseHandler(this.registry);
    }
    return this.preToolUseHandler;
  }

  /**
   * Get the post-failure handler for hook registration
   */
  getPostFailureHandler(): ReturnType<typeof createPostFailureHandler> {
    if (!this.postFailureHandler) {
      this.postFailureHandler = createPostFailureHandler(this.registry);
    }
    return this.postFailureHandler;
  }

  /**
   * Register enforcer with a hook manager
   *
   * Usage:
   * ```typescript
   * const enforcer = new BoundaryEnforcer();
   * enforcer.registerWithHookManager(hookManager);
   * ```
   */
  registerWithHookManager(hookManager: {
    register: (event: string, handler: unknown) => void;
  }): void {
    // Register pre-tool-use hook
    hookManager.register("PreToolUse", this.getPreToolUseHandler());

    // Register post-failure hook
    hookManager.register("PostToolUseFailure", this.getPostFailureHandler());

    if (this.config.debug) {
      console.log("[Bounds] Enforcer registered with hook manager");
    }
  }

  /**
   * Get the underlying registry
   */
  getRegistry(): BoundaryRegistry {
    return this.registry;
  }

  /**
   * Check boundaries manually (for testing or direct use)
   */
  async check(
    tool_name: string,
    tool_input: Record<string, unknown>,
    context?: Partial<BoundaryContext>
  ): Promise<{
    allowed: boolean;
    violations: BoundaryViolation[];
    warnings: BoundaryViolation[];
  }> {
    const fullContext: BoundaryContext = {
      tool_name,
      tool_input,
      workingDirectory: context?.workingDirectory || process.cwd(),
      sessionId: context?.sessionId,
      timestamp: Date.now(),
    };

    const result = await this.registry.checkAll(fullContext);

    return {
      allowed: !result.blocked && !result.fatal,
      violations: result.violations,
      warnings: result.warnings,
    };
  }

  /**
   * Record a signal manually (for testing or direct use)
   */
  recordSignal(signal: FailureSignal): void {
    this.registry.recordSignal(signal);
  }
}

// Singleton enforcer
let defaultEnforcer: BoundaryEnforcer | null = null;

/**
 * Get the default enforcer instance
 */
export function getEnforcer(config?: EnforcerConfig): BoundaryEnforcer {
  if (!defaultEnforcer) {
    defaultEnforcer = new BoundaryEnforcer(config);
  }
  return defaultEnforcer;
}

/**
 * Reset the default enforcer (for testing)
 */
export function resetEnforcer(): void {
  defaultEnforcer = null;
}
