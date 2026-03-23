/**
 * Unified Telemetry - Single entry point for all telemetry operations
 *
 * This module provides a unified interface for:
 * - Starting/stopping sessions
 * - Recording turn metrics
 * - Recording tool calls
 * - Recording errors
 * - Getting comprehensive analytics
 *
 * @module telemetry/unified-telemetry
 */

import type { LoopState } from "../core/agent-loop/loop-state.js";
import { AgentAnalyticsEngine, getAgentAnalytics, createAgentAnalytics } from "./observability/agent-analytics.js";
import { ErrorAnalyticsEngine, getErrorAnalytics } from "./observability/error-analytics.js";
import { PerformanceAnalyticsEngine, createPerformanceAnalytics } from "./observability/performance-analytics.js";
import { logger } from "./logger.js";
import { metrics, getMetricsRegistry } from "./metrics.js";
import { METRIC_NAMES } from "./types.js";

// ============================================
// TYPES
// ============================================

export interface UnifiedTelemetryConfig {
  sessionId: string;
  model: string;
  workingDirectory: string;
  enableAgentAnalytics?: boolean;
  enableErrorAnalytics?: boolean;
  enablePerformanceAnalytics?: boolean;
}

export interface SessionAnalytics {
  sessionId: string;
  startTime: number;
  endTime?: number;
  duration?: number;

  // Basic metrics
  turnCount: number;
  toolCallCount: number;
  errorCount: number;
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;

  // Agent analytics
  agent?: ReturnType<AgentAnalyticsEngine["export"]>;

  // Error analytics
  errors: ReturnType<ErrorAnalyticsEngine["getStatistics"]>;
  errorPatterns: ReturnType<ErrorAnalyticsEngine["getPatterns"]>;

  // Performance analytics
  performance?: ReturnType<PerformanceAnalyticsEngine["export"]>;

  // Suggestions
  suggestions: string[];
}

// ============================================
// UNIFIED TELEMETRY MANAGER
// ============================================

/**
 * UnifiedTelemetryManager - Single entry point for all telemetry
 *
 * Usage:
 * ```typescript
 * const telemetry = new UnifiedTelemetryManager({
 *   sessionId: "session-123",
 *   model: "claude-sonnet-4-6",
 *   workingDirectory: "/workspace",
 * });
 *
 * // Start session
 * telemetry.start();
 *
 * // Record turn
 * telemetry.recordTurn({
 *   inputTokens: 1000,
 *   outputTokens: 500,
 *   costUSD: 0.01,
 * });
 *
 * // Record tool call
 * telemetry.recordToolCall("Read", 150, true);
 *
 * // Get analytics
 * const analytics = telemetry.getAnalytics();
 *
 * // End session
 * telemetry.end();
 * ```
 */
export class UnifiedTelemetryManager {
  private config: UnifiedTelemetryConfig;
  private agentEngine: AgentAnalyticsEngine | null = null;
  private errorEngine: ErrorAnalyticsEngine | null = null;
  private perfEngine: PerformanceAnalyticsEngine | null = null;
  private startTime: number = 0;
  private endTime: number | null = null;
  private isStarted: boolean = false;
  private turnCount: number = 0;
  private toolCallCount: number = 0;
  private errorCount: number = 0;
  private totalCost: number = 0;
  private totalInputTokens: number = 0;
  private totalOutputTokens: number = 0;

  constructor(config: UnifiedTelemetryConfig) {
    this.config = config;
  }

  /**
   * Start telemetry for the session
   */
  start(): void {
    if (this.isStarted) {
      logger.warn("UnifiedTelemetry already started", { sessionId: this.config.sessionId });
      return;
    }

    this.startTime = Date.now();
    this.isStarted = true;

    // Initialize engines
    if (this.config.enableAgentAnalytics !== false) {
      this.agentEngine = createAgentAnalytics(this.config.sessionId);
    }

    if (this.config.enableErrorAnalytics !== false) {
      this.errorEngine = getErrorAnalytics();
    }

    if (this.config.enablePerformanceAnalytics !== false) {
      this.perfEngine = createPerformanceAnalytics(this.config.sessionId);
    }

    logger.info("UnifiedTelemetry started", {
      sessionId: this.config.sessionId,
      model: this.config.model,
    });
  }

  /**
   * End telemetry for the session
   */
  end(): SessionAnalytics {
    if (!this.isStarted) {
      throw new Error("UnifiedTelemetry not started");
    }

    this.endTime = Date.now();

    // Get analytics from all engines
    const analytics = this.getAnalytics();
    analytics.endTime = this.endTime;
    analytics.duration = this.endTime - this.startTime;

    this.isStarted = false;

    logger.info("UnifiedTelemetry ended", {
      sessionId: this.config.sessionId,
      duration: analytics.duration,
      turns: analytics.turnCount,
      cost: analytics.totalCost.toFixed(4),
    });

    return analytics;
  }

  /**
   * Record a turn
   */
  recordTurn(data: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
    thinkingTokens?: number;
    costUSD: number;
    ttft?: number;
    latency?: number;
    toolsUsed?: string[];
    stopReason?: string;
    shouldContinue?: boolean;
  }): void {
    if (!this.isStarted) return;

    this.turnCount++;
    this.totalInputTokens += data.inputTokens;
    this.totalOutputTokens += data.outputTokens;
    this.totalCost += data.costUSD;

    // Record in performance analytics
    if (this.perfEngine && data.latency) {
      this.perfEngine.recordTiming("api.latency", data.latency, "api_latency");
    }

    // Record in agent analytics
    if (this.agentEngine && data.toolsUsed) {
      this.agentEngine.recordLoopIteration({
        turnNumber: this.turnCount,
        startTime: Date.now() - (data.latency ?? 0),
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        toolsUsed: data.toolsUsed,
        stopReason: data.stopReason as any,
        shouldContinue: data.shouldContinue ?? true,
        costUSD: data.costUSD,
      });
    }

    // Update metrics
    metrics.incrementCounter(METRIC_NAMES.TURN_TOTAL, 1, {
      model: this.config.model,
    });
    if (data.latency) {
      metrics.recordHistogram(METRIC_NAMES.TURN_DURATION_MS, data.latency, {
        model: this.config.model,
      });
    }
  }

  /**
   * Record a tool call
   */
  recordToolCall(
    toolName: string,
    durationMs: number,
    success: boolean,
    options?: {
      error?: string;
      inputSize?: number;
      outputSize?: number;
      taskType?: string;
    }
  ): void {
    if (!this.isStarted) return;

    this.toolCallCount++;

    // Record in performance analytics
    if (this.perfEngine) {
      this.perfEngine.recordToolCall(
        toolName,
        durationMs,
        success,
        options?.inputSize,
        options?.outputSize,
        options?.error,
        options?.taskType
      );
    }

    // Record in agent analytics
    if (this.agentEngine) {
      this.agentEngine.recordToolCall(
        toolName,
        durationMs,
        success,
        options?.inputSize,
        options?.outputSize,
        options?.error,
        options?.taskType
      );
    }

    // Update metrics
    metrics.incrementCounter(METRIC_NAMES.TOOL_CALLS_TOTAL, 1, {
      tool_name: toolName,
      success: success.toString(),
    });
    metrics.recordHistogram(METRIC_NAMES.TOOL_DURATION_MS, durationMs, {
      tool_name: toolName,
    });

    if (!success) {
      metrics.incrementCounter(METRIC_NAMES.TOOL_ERRORS_TOTAL, 1, {
        tool_name: toolName,
      });
    }
  }

  /**
   * Record an error
   */
  recordError(
    error: unknown,
    context: {
      turnNumber?: number;
      toolName?: string;
      operationType?: string;
      parentErrorId?: string;
    }
  ): string {
    if (!this.isStarted) return "";

    this.errorCount++;

    // Record in error analytics
    let errorId = "";
    if (this.errorEngine) {
      const record = this.errorEngine.recordError(error, {
        sessionId: this.config.sessionId,
        turnNumber: context.turnNumber,
        toolName: context.toolName,
        operationType: context.operationType,
        parentErrorId: context.parentErrorId,
      });
      errorId = record.id;
    }

    // Update metrics
    metrics.incrementCounter(METRIC_NAMES.TURN_ERRORS_TOTAL, 1, {
      model: this.config.model,
    });

    logger.error("Error recorded", error instanceof Error ? error : new Error(String(error)), {
      sessionId: this.config.sessionId,
      error_id: errorId,
      ...context,
    });

    return errorId;
  }

  /**
   * Mark error as recovered
   */
  markErrorRecovered(errorId: string, recoveryTimeMs?: number): void {
    if (!this.isStarted) return;

    if (this.errorEngine) {
      this.errorEngine.markRecoveryResult(errorId, true, recoveryTimeMs ?? 0);
    }

    logger.info("Error recovered", {
      sessionId: this.config.sessionId,
      error_id: errorId,
      recovery_time_ms: recoveryTimeMs,
    });
  }

  /**
   * Record a decision
   */
  recordDecision(decision: {
    type: "tool_selection" | "continuation" | "compaction" | "error_recovery" | "planning" | "refinement";
    context: Record<string, unknown>;
    options: Array<{ id: string; description: string; selected: boolean }>;
    outcome: "success" | "failure" | "retry" | "abort" | "delegated";
    durationMs: number;
    reasoning?: string;
    confidence?: number;
    turnNumber?: number;
  }): string {
    if (!this.isStarted) return "";

    let decisionId = "";
    if (this.agentEngine) {
      decisionId = this.agentEngine.recordDecision({
        type: decision.type,
        context: decision.context,
        options: decision.options,
        outcome: decision.outcome,
        durationMs: decision.durationMs,
        turnNumber: decision.turnNumber ?? 0,
        reasoning: decision.reasoning,
        confidence: decision.confidence,
      });
    }

    return decisionId;
  }

  /**
   * Record context measurement
   */
  recordContext(
    totalTokens: number,
    contextWindowSize: number,
    messageCount: number
  ): void {
    if (!this.isStarted) return;

    if (this.agentEngine) {
      this.agentEngine.recordContextMeasurement(
        this.turnCount,
        totalTokens,
        contextWindowSize,
        messageCount
      );
    }
  }

  /**
   * Record a teammate spawn
   */
  recordTeammate(spawn: {
    teammateId: string;
    role: "worker" | "coordinator" | "specialist" | "reviewer";
    parentId?: string;
    tasksAssigned: number;
    spawnReason: string;
  }): void {
    if (!this.isStarted) return;

    if (this.agentEngine) {
      this.agentEngine.recordTeammateSpawn({
        teammateId: spawn.teammateId,
        role: spawn.role,
        parentId: spawn.parentId,
        sessionId: this.config.sessionId,
        tasksAssigned: spawn.tasksAssigned,
        tasksCompleted: 0, // Will be updated when teammate ends
        tokensUsed: 0, // Will be updated when teammate ends
        costUSD: 0, // Will be updated when teammate ends
        spawnReason: spawn.spawnReason,
      });
    }
  }

  /**
   * Record inter-agent message
   */
  recordInterAgentMessage(message: {
    fromId: string;
    toId: string;
    type: "task" | "result" | "query" | "coordination" | "error";
    sizeBytes: number;
    latencyMs?: number;
  }): void {
    if (!this.isStarted) return;

    if (this.agentEngine) {
      this.agentEngine.recordInterAgentMessage(message);
    }
  }

  /**
   * Get current session analytics
   */
  getAnalytics(): SessionAnalytics {
    const analytics: SessionAnalytics = {
      sessionId: this.config.sessionId,
      startTime: this.startTime,
      turnCount: this.turnCount,
      toolCallCount: this.toolCallCount,
      errorCount: this.errorCount,
      totalCost: this.totalCost,
      totalInputTokens: this.totalInputTokens,
      totalOutputTokens: this.totalOutputTokens,
      errors: this.errorEngine?.getStatistics() ?? {
        total: 0,
        byCategory: {} as Record<string, number>,
        bySeverity: {} as Record<string, number>,
        byRecoverability: {} as Record<string, number>,
        recoveryRate: 0,
        avgRecoveryTimeMs: 0,
      },
      errorPatterns: this.errorEngine?.getPatterns() ?? [],
      suggestions: this.perfEngine?.getOptimizationSuggestions() ?? [],
    };

    // Add agent analytics if available
    if (this.agentEngine) {
      analytics.agent = this.agentEngine.export()
    }

    // Add performance analytics if available
    if (this.perfEngine) {
      analytics.performance = this.perfEngine.export()
    }

    return analytics
  }

  /**
   * Sample current resource usage
   */
  sampleResources(): void {
    if (!this.isStarted) return
    if (this.perfEngine) {
      this.perfEngine.sampleResources()
    }
  }

  /**
   * Check if telemetry is active
   */
  isActive(): boolean {
    return this.isStarted
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.config.sessionId
  }
}

// ============================================
// FACTORY
// ============================================

const managers = new Map<string, UnifiedTelemetryManager>();

/**
 * Create or get a unified telemetry manager for a session
 */
export function getUnifiedTelemetry(config: UnifiedTelemetryConfig): UnifiedTelemetryManager {
  const existing = managers.get(config.sessionId);
  if (existing) {
    return existing;
  }
  const manager = new UnifiedTelemetryManager(config);
  managers.set(config.sessionId, manager);
  return manager;
}

/**
 * Get existing unified telemetry manager
 */
export function getExistingUnifiedTelemetry(sessionId: string): UnifiedTelemetryManager | undefined {
  return managers.get(sessionId)
}

/**
 * Remove unified telemetry manager
 */
export function removeUnifiedTelemetry(sessionId: string): void {
  managers.delete(sessionId)
}

/**
 * Get all active unified telemetry managers
 */
export function getAllUnifiedTelemetry(): UnifiedTelemetryManager[] {
  return Array.from(managers.values())
}
