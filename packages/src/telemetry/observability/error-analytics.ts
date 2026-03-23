/**
 * Error Analytics - Advanced error tracking, correlation, and root cause analysis
 *
 * Features:
 * - Error categorization with taxonomy
 * - Root cause analysis
 * - Error correlation across operations
 * - Error pattern detection
 * - Recovery tracking and suggestions
 *
 * @module telemetry/observability/error-analytics
 */

import { z } from "zod";

// ============================================
// ERROR TAXONOMY
// ============================================

export const ErrorCategorySchema = z.enum([
  // API errors
  "api_rate_limit",
  "api_timeout",
  "api_auth_error",
  "api_invalid_response",
  "api_service_error",

  // Tool errors
  "tool_not_found",
  "tool_permission_denied",
  "tool_invalid_input",
  "tool_execution_failed",
  "tool_timeout",

  // Context errors
  "context_overflow",
  "context_compaction_failed",
  "context_invalid",

  // File errors
  "file_not_found",
  "file_permission_denied",
  "file_too_large",
  "file_encoding_error",

  // Network errors
  "network_connection_failed",
  "network_dns_error",
  "network_ssl_error",

  // MCP errors
  "mcp_server_disconnected",
  "mcp_tool_not_found",
  "mcp_protocol_error",

  // Agent errors
  "agent_loop_stuck",
  "agent_max_turns_exceeded",
  "agent_cost_limit_exceeded",
  "agent_invalid_state",

  // Internal errors
  "internal_assertion_failed",
  "internal_state_error",
  "internal_unknown",
]);

export const ErrorSeveritySchema = z.enum([
  "low",       // Minor issue, auto-recovered
  "medium",    // Recoverable with retry
  "high",      // Requires intervention
  "critical",  // Session-terminating
]);

export const ErrorRecoverabilitySchema = z.enum([
  "auto_recoverable",    // System can auto-recover
  "retry_recoverable",   // Retry might fix it
  "manual_recoverable",  // User intervention needed
  "unrecoverable",       // Cannot be recovered
]);

// ============================================
// ERROR RECORD SCHEMA
// ============================================

export const ErrorContextSchema = z.object({
  sessionId: z.string(),
  turnNumber: z.number().optional(),
  toolName: z.string().optional(),
  operationType: z.string().optional(),
  parentErrorId: z.string().optional(),
  relatedSpanId: z.string().optional(),
  stackTrace: z.string().optional(),
  inputSnapshot: z.record(z.unknown()).optional(),
  environment: z.record(z.string()).optional(),
});

export const ErrorRecordSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  message: z.string(),
  category: ErrorCategorySchema,
  severity: ErrorSeveritySchema,
  recoverability: ErrorRecoverabilitySchema,
  rawError: z.unknown().optional(),
  context: ErrorContextSchema,

  // Recovery tracking
  recoveryAttempted: z.boolean().default(false),
  recoveryStrategy: z.string().optional(),
  recoverySuccess: z.boolean().optional(),
  recoveryTimeMs: z.number().optional(),

  // Root cause
  rootCauseId: z.string().optional(),
  rootCauseAnalysis: z.string().optional(),

  // Impact
  impactDescription: z.string().optional(),
  affectedOperations: z.array(z.string()).default([]),
});

// ============================================
// ERROR PATTERN SCHEMA
// ============================================

export const ErrorPatternSchema = z.object({
  patternId: z.string(),
  description: z.string(),
  category: ErrorCategorySchema,
  occurrences: z.number(),
  firstOccurrence: z.number(),
  lastOccurrence: z.number(),
  // Conditions that trigger this pattern
  conditions: z.array(z.object({
    type: z.string(),
    value: z.unknown(),
  })),
  // Suggested fixes
  suggestions: z.array(z.object({
    priority: z.number(),
    action: z.string(),
    effectiveness: z.number().optional(),
  })),
  // Sessions affected
  affectedSessions: z.array(z.string()),
});

// ============================================
// ROOT CAUSE ANALYSIS
// ============================================

export const RootCauseAnalysisSchema = z.object({
  errorId: z.string(),
  rootCause: z.string(),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.object({
    type: z.string(),
    description: z.string(),
    weight: z.number(),
  })),
  chain: z.array(z.object({
    errorId: z.string(),
    category: ErrorCategorySchema,
    message: z.string(),
    relationship: z.string(),
  })),
  preventionStrategies: z.array(z.string()),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type ErrorCategory = z.infer<typeof ErrorCategorySchema>;
export type ErrorSeverity = z.infer<typeof ErrorSeveritySchema>;
export type ErrorRecoverability = z.infer<typeof ErrorRecoverabilitySchema>;
export type ErrorContext = z.infer<typeof ErrorContextSchema>;
export type ErrorRecord = z.infer<typeof ErrorRecordSchema>;
export type ErrorPattern = z.infer<typeof ErrorPatternSchema>;
export type RootCauseAnalysis = z.infer<typeof RootCauseAnalysisSchema>;

// ============================================
// ERROR ANALYTICS ENGINE
// ============================================

/**
 * ErrorAnalyticsEngine - Advanced error tracking and analysis
 */
export class ErrorAnalyticsEngine {
  private errors: Map<string, ErrorRecord> = new Map();
  private patterns: Map<string, ErrorPattern> = new Map();
  private sessionErrors: Map<string, string[]> = new Map();

  /**
   * Record an error with automatic categorization
   */
  recordError(
    error: unknown,
    context: ErrorContext
  ): ErrorRecord {
    const id = `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const message = this.extractMessage(error);
    const category = this.categorizeError(error, message);
    const severity = this.determineSeverity(error, category);
    const recoverability = this.determineRecoverability(category);

    const record: ErrorRecord = {
      id,
      timestamp: Date.now(),
      message,
      category,
      severity,
      recoverability,
      rawError: error,
      context,
      recoveryAttempted: false,
      affectedOperations: [],
    };

    this.errors.set(id, record);

    // Track by session
    const sessionErrors = this.sessionErrors.get(context.sessionId) || [];
    sessionErrors.push(id);
    this.sessionErrors.set(context.sessionId, sessionErrors);

    // Check for patterns
    this.detectPattern(record);

    // Find root cause if this is a cascading error
    if (context.parentErrorId) {
      this.analyzeRootCause(id, context.parentErrorId);
    }

    return record;
  }

  /**
   * Attempt recovery for an error
   */
  attemptRecovery(
    errorId: string,
    strategy: string
  ): void {
    const record = this.errors.get(errorId);
    if (!record) return;

    record.recoveryAttempted = true;
    record.recoveryStrategy = strategy;
  }

  /**
   * Mark recovery result
   */
  markRecoveryResult(
    errorId: string,
    success: boolean,
    timeMs: number
  ): void {
    const record = this.errors.get(errorId);
    if (!record) return;

    record.recoverySuccess = success;
    record.recoveryTimeMs = timeMs;
  }

  /**
   * Get error by ID
   */
  getError(errorId: string): ErrorRecord | undefined {
    return this.errors.get(errorId);
  }

  /**
   * Get all errors for a session
   */
  getSessionErrors(sessionId: string): ErrorRecord[] {
    const ids = this.sessionErrors.get(sessionId) || [];
    return ids.map(id => this.errors.get(id)).filter((e): e is ErrorRecord => e !== undefined);
  }

  /**
   * Get error statistics
   */
  getStatistics(): {
    total: number;
    byCategory: Record<ErrorCategory, number>;
    bySeverity: Record<ErrorSeverity, number>;
    byRecoverability: Record<ErrorRecoverability, number>;
    recoveryRate: number;
    avgRecoveryTimeMs: number;
  } {
    const byCategory: Record<ErrorCategory, number> = {} as Record<ErrorCategory, number>;
    const bySeverity: Record<ErrorSeverity, number> = {} as Record<ErrorSeverity, number>;
    const byRecoverability: Record<ErrorRecoverability, number> = {} as Record<ErrorRecoverability, number>;

    let recovered = 0;
    let recoveryTimes: number[] = [];

    for (const error of this.errors.values()) {
      byCategory[error.category] = (byCategory[error.category] || 0) + 1;
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
      byRecoverability[error.recoverability] = (byRecoverability[error.recoverability] || 0) + 1;

      if (error.recoverySuccess === true) {
        recovered++;
        if (error.recoveryTimeMs) {
          recoveryTimes.push(error.recoveryTimeMs);
        }
      }
    }

    const total = this.errors.size;
    const attemptedRecovery = Array.from(this.errors.values()).filter(e => e.recoveryAttempted).length;

    return {
      total,
      byCategory,
      bySeverity,
      byRecoverability,
      recoveryRate: attemptedRecovery > 0 ? recovered / attemptedRecovery : 0,
      avgRecoveryTimeMs: recoveryTimes.length > 0
        ? recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length
        : 0,
    };
  }

  /**
   * Get detected patterns
   */
  getPatterns(): ErrorPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Get recovery suggestions for a category
   */
  getRecoverySuggestions(category: ErrorCategory): string[] {
    const suggestions: Record<ErrorCategory, string[]> = {
      api_rate_limit: ["Wait and retry with exponential backoff", "Reduce request frequency"],
      api_timeout: ["Increase timeout value", "Check network connectivity", "Reduce payload size"],
      api_auth_error: ["Refresh authentication token", "Check API key validity"],
      api_invalid_response: ["Retry request", "Check API version compatibility"],
      api_service_error: ["Retry with backoff", "Check service status", "Use fallback endpoint"],

      tool_not_found: ["Verify tool name spelling", "Check if tool is registered", "Check MCP server connection"],
      tool_permission_denied: ["Request permission from user", "Use alternative tool", "Check permission settings"],
      tool_invalid_input: ["Validate input parameters", "Check parameter types", "Review tool documentation"],
      tool_execution_failed: ["Check tool logs", "Verify preconditions", "Retry with modified input"],
      tool_timeout: ["Increase tool timeout", "Optimize tool operation", "Check for deadlocks"],

      context_overflow: ["Trigger compaction", "Reduce context size", "Use selective message retention"],
      context_compaction_failed: ["Force compaction with different strategy", "Archive old messages"],
      context_invalid: ["Reset context", "Rebuild message history"],

      file_not_found: ["Verify file path", "Check working directory", "Create file if needed"],
      file_permission_denied: ["Check file permissions", "Use appropriate access level"],
      file_too_large: ["Use streaming", "Process in chunks", "Exclude from context"],
      file_encoding_error: ["Detect encoding automatically", "Convert file encoding"],

      network_connection_failed: ["Check network connectivity", "Retry with backoff", "Use offline mode"],
      network_dns_error: ["Check DNS settings", "Use IP address directly"],
      network_ssl_error: ["Check certificates", "Verify TLS configuration"],

      mcp_server_disconnected: ["Reconnect to MCP server", "Check server status", "Use cached results"],
      mcp_tool_not_found: ["Verify tool name", "Check MCP server capabilities", "Update MCP configuration"],
      mcp_protocol_error: ["Restart MCP server", "Check protocol version", "Review MCP logs"],

      agent_loop_stuck: ["Inject continuation prompt", "Check for infinite loops", "Reset agent state"],
      agent_max_turns_exceeded: ["Increase turn limit", "Optimize task decomposition", "Review goal complexity"],
      agent_cost_limit_exceeded: ["Increase cost limit", "Optimize token usage", "Use cheaper model"],
      agent_invalid_state: ["Reset agent state", "Recover from checkpoint"],

      internal_assertion_failed: ["Report bug", "Reset state", "Check for data corruption"],
      internal_state_error: ["Reset to known state", "Recover from checkpoint"],
      internal_unknown: ["Report error with details", "Restart session"],
    };

    return suggestions[category] || ["No suggestions available"];
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private extractMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === "string") {
      return error;
    }
    return JSON.stringify(error);
  }

  private categorizeError(error: unknown, message: string): ErrorCategory {
    const msg = message.toLowerCase();

    // API errors
    if (msg.includes("rate limit")) return "api_rate_limit";
    if (msg.includes("timeout") && msg.includes("api")) return "api_timeout";
    if (msg.includes("unauthorized") || msg.includes("forbidden") || msg.includes("auth")) return "api_auth_error";
    if (msg.includes("invalid response") || msg.includes("parse error")) return "api_invalid_response";
    if (msg.includes("service unavailable") || msg.includes("500") || msg.includes("503")) return "api_service_error";

    // Tool errors
    if (msg.includes("tool not found") || msg.includes("unknown tool")) return "tool_not_found";
    if (msg.includes("permission denied") && msg.includes("tool")) return "tool_permission_denied";
    if (msg.includes("invalid input") || msg.includes("invalid parameter")) return "tool_invalid_input";
    if (msg.includes("execution failed")) return "tool_execution_failed";
    if (msg.includes("timeout") && msg.includes("tool")) return "tool_timeout";

    // Context errors
    if (msg.includes("context") && msg.includes("overflow")) return "context_overflow";
    if (msg.includes("compaction failed")) return "context_compaction_failed";

    // File errors
    if (msg.includes("file not found") || msg.includes("enoent")) return "file_not_found";
    if (msg.includes("permission denied") && (msg.includes("file") || msg.includes("access"))) return "file_permission_denied";
    if (msg.includes("file too large")) return "file_too_large";
    if (msg.includes("encoding")) return "file_encoding_error";

    // Network errors
    if (msg.includes("connection refused") || msg.includes("network error")) return "network_connection_failed";
    if (msg.includes("dns")) return "network_dns_error";
    if (msg.includes("ssl") || msg.includes("tls") || msg.includes("certificate")) return "network_ssl_error";

    // MCP errors
    if (msg.includes("mcp") && msg.includes("disconnect")) return "mcp_server_disconnected";
    if (msg.includes("mcp") && msg.includes("tool")) return "mcp_tool_not_found";
    if (msg.includes("mcp") && msg.includes("protocol")) return "mcp_protocol_error";

    // Agent errors
    if (msg.includes("loop stuck") || msg.includes("infinite loop")) return "agent_loop_stuck";
    if (msg.includes("max turns") || msg.includes("turn limit")) return "agent_max_turns_exceeded";
    if (msg.includes("cost limit") || msg.includes("budget exceeded")) return "agent_cost_limit_exceeded";

    // Check for specific error types
    if (error instanceof Error) {
      if (error.name === "AssertionError") return "internal_assertion_failed";
    }

    return "internal_unknown";
  }

  private determineSeverity(error: unknown, category: ErrorCategory): ErrorSeverity {
    // Critical errors that terminate sessions
    const criticalCategories: ErrorCategory[] = [
      "api_auth_error",
      "agent_cost_limit_exceeded",
      "internal_assertion_failed",
    ];
    if (criticalCategories.includes(category)) return "critical";

    // High severity - requires intervention
    const highCategories: ErrorCategory[] = [
      "api_service_error",
      "tool_execution_failed",
      "context_overflow",
      "agent_loop_stuck",
      "agent_max_turns_exceeded",
    ];
    if (highCategories.includes(category)) return "high";

    // Medium severity - recoverable with retry
    const mediumCategories: ErrorCategory[] = [
      "api_rate_limit",
      "api_timeout",
      "tool_timeout",
      "network_connection_failed",
      "mcp_server_disconnected",
    ];
    if (mediumCategories.includes(category)) return "medium";

    return "low";
  }

  private determineRecoverability(category: ErrorCategory): ErrorRecoverability {
    // Auto-recoverable
    const autoRecoverable: ErrorCategory[] = [
      "api_rate_limit",
      "api_timeout",
      "context_overflow",
      "network_connection_failed",
      "mcp_server_disconnected",
    ];
    if (autoRecoverable.includes(category)) return "auto_recoverable";

    // Retry recoverable
    const retryRecoverable: ErrorCategory[] = [
      "api_service_error",
      "tool_timeout",
      "tool_execution_failed",
      "network_dns_error",
    ];
    if (retryRecoverable.includes(category)) return "retry_recoverable";

    // Manual recoverable
    const manualRecoverable: ErrorCategory[] = [
      "api_auth_error",
      "tool_permission_denied",
      "file_permission_denied",
      "agent_cost_limit_exceeded",
    ];
    if (manualRecoverable.includes(category)) return "manual_recoverable";

    return "unrecoverable";
  }

  private detectPattern(error: ErrorRecord): void {
    // Look for patterns based on category and context
    const patternKey = `${error.category}:${error.context.toolName || "none"}`;

    let pattern = this.patterns.get(patternKey);
    if (!pattern) {
      pattern = {
        patternId: patternKey,
        description: `Recurring ${error.category} errors${error.context.toolName ? ` in ${error.context.toolName}` : ""}`,
        category: error.category,
        occurrences: 0,
        firstOccurrence: error.timestamp,
        lastOccurrence: error.timestamp,
        conditions: [],
        suggestions: this.getRecoverySuggestions(error.category).map((action, i) => ({
          priority: i + 1,
          action,
          effectiveness: undefined,
        })),
        affectedSessions: [],
      };
      this.patterns.set(patternKey, pattern);
    }

    pattern.occurrences++;
    pattern.lastOccurrence = error.timestamp;
    if (!pattern.affectedSessions.includes(error.context.sessionId)) {
      pattern.affectedSessions.push(error.context.sessionId);
    }
  }

  private analyzeRootCause(errorId: string, parentId: string): void {
    const error = this.errors.get(errorId);
    const parent = this.errors.get(parentId);

    if (!error || !parent) return;

    // Mark the root cause chain
    error.rootCauseId = parent.rootCauseId || parentId;

    // Generate root cause analysis
    const chain: RootCauseAnalysis["chain"] = [];
    let current: ErrorRecord | undefined = error;
    while (current) {
      chain.unshift({
        errorId: current.id,
        category: current.category,
        message: current.message.slice(0, 100),
        relationship: current.context.parentErrorId ? "caused_by" : "root",
      });

      if (current.context.parentErrorId) {
        current = this.errors.get(current.context.parentErrorId);
      } else {
        break;
      }
    }

    error.rootCauseAnalysis = `Error chain: ${chain.map(c => c.category).join(" → ")}`;
  }
}

// ============================================
// SINGLETON
// ============================================

let _engine: ErrorAnalyticsEngine | null = null;

export function getErrorAnalytics(): ErrorAnalyticsEngine {
  if (!_engine) {
    _engine = new ErrorAnalyticsEngine();
  }
  return _engine;
}

export function resetErrorAnalytics(): void {
  _engine = null;
}
