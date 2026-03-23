/**
 * Observability Module
 * Comprehensive observability system for Coder
 *
 * This module provides:
 * - Real-time dashboards (TUI)
 * - Health monitoring and checks
 * - Performance insights and recommendations
 * - Alert system with thresholds
 * - Session reports
 *
 * @module telemetry/observability
 *
 * @example
 * ```typescript
 * import { observability } from "@ebowwa/coder/telemetry/observability";
 *
 * // Initialize observability
 * observability.initialize();
 *
 * // Start dashboard
 * observability.dashboard.start("session-123");
 *
 * // Check health
 * const health = await observability.health.runAll();
 *
 * // Get insights
 * const insights = observability.insights.generate();
 *
 * // Check alerts
 * const alerts = observability.alerts.check();
 *
 * // Generate session report
 * const report = observability.reports.generate("session-123");
 * ```
 */

// ============================================
// TYPES
// ============================================

export * from "./types.js";

// ============================================
// HEALTH
// ============================================

export {
  health,
  registerHealthCheck,
  unregisterHealthCheck,
  runAllHealthChecks,
  getCachedHealth,
  formatHealthStatus,
  formatUptime,
  initializeHealthChecks,
  checkApiHealth,
  checkMemoryHealth,
  checkTelemetryHealth,
  type HealthCheckFn,
} from "./health.js";

// ============================================
// ALERTS
// ============================================

export {
  alerts,
  addAlertRule,
  removeAlertRule,
  getAlertRules,
  checkAlerts,
  getActiveAlerts,
  getAllAlerts,
  acknowledgeAlert,
  clearAlert,
  clearAllAlerts,
  onAlert,
  formatAlertSeverity,
  initializeAlerts,
  type AlertCallback,
} from "./alerts.js";

// ============================================
// INSIGHTS
// ============================================

export {
  insights,
  analyzePerformance,
  generateInsights,
  getInsightsByCategory,
  getHighImpactInsights,
  formatInsight,
} from "./insights.js";

// ============================================
// REPORTS
// ============================================

export {
  reports,
  startSessionReport,
  endSessionReport,
  recordTurnEvent,
  recordToolEvent,
  recordErrorEvent,
  recordApiEvent,
  generateSessionReport,
  formatSessionReport,
  exportSessionReport,
  clearSessionReport,
} from "./reports.js";

// ============================================
// DASHBOARD
// ============================================

export {
  dashboard,
  startDashboard,
  ObservabilityDashboard,
  type DashboardProps,
} from "./dashboard.js";

// ============================================
// AGENT ANALYTICS
// ============================================

export {
  // Types
  DecisionTypeSchema,
  DecisionOutcomeSchema,
  AgentDecisionSchema,
  LoopStopReasonSchema,
  LoopIterationSchema,
  LoopAnalyticsSchema,
  ToolSelectionContextSchema,
  ToolUsagePatternSchema,
  PlanAnalyticsSchema,
  CompactionTriggerSchema,
  CompactionAnalyticsSchema,
  ContextGrowthSchema,
  TeammateRoleSchema,
  TeammateSpawnSchema,
  InterAgentMessageSchema,
  TeamCoordinationSchema,
  type DecisionType,
  type DecisionOutcome,
  type AgentDecision,
  type LoopStopReason,
  type LoopIteration,
  type LoopAnalytics,
  type ToolSelectionContext,
  type ToolUsagePattern,
  type PlanStepStatus,
  type PlanAnalytics,
  type RefinementLevelAnalytics,
  type CompactionTrigger,
  type CompactionAnalytics,
  type ContextGrowth,
  type TeammateRole,
  type TeammateSpawn,
  type InterAgentMessage,
  type TeamCoordination,
  // Engine
  AgentAnalyticsEngine,
  getAgentAnalytics,
  resetAgentAnalytics,
  createAgentAnalytics,
} from "./agent-analytics.js";

// ============================================
// ERROR ANALYTICS
// ============================================

export {
  // Types
  ErrorCategorySchema,
  ErrorSeveritySchema,
  ErrorRecoverabilitySchema,
  ErrorContextSchema,
  ErrorRecordSchema,
  ErrorPatternSchema,
  RootCauseAnalysisSchema,
  type ErrorCategory,
  type ErrorSeverity,
  type ErrorRecoverability,
  type ErrorContext,
  type ErrorRecord,
  type ErrorPattern,
  type RootCauseAnalysis,
  // Engine
  ErrorAnalyticsEngine,
  getErrorAnalytics,
  resetErrorAnalytics,
} from "./error-analytics.js";

// ============================================
// PERFORMANCE ANALYTICS
// ============================================

export {
  // Types
  PercentileMetricsSchema,
  BottleneckTypeSchema,
  BottleneckSchema,
  ResourceUsageSchema,
  ResourceThresholdsSchema,
  OperationProfileSchema,
  SessionPerformanceProfileSchema,
  type PercentileMetrics,
  type BottleneckType,
  type Bottleneck,
  type ResourceUsage,
  type ResourceThresholds,
  type OperationProfile,
  type SessionPerformanceProfile,
  // Engine
  PerformanceAnalyticsEngine,
  getPerformanceAnalytics,
  resetPerformanceAnalytics,
  createPerformanceAnalytics,
} from "./performance-analytics.js";

// ============================================
// OBSERVABILITY SINGLETON
// ============================================

import * as healthModule from "./health.js";
import * as alertsModule from "./alerts.js";
import * as insightsModule from "./insights.js";
import * as reportsModule from "./reports.js";
import * as dashboardModule from "./dashboard.js";
import * as agentAnalyticsModule from "./agent-analytics.js";
import * as errorAnalyticsModule from "./error-analytics.js";
import * as performanceAnalyticsModule from "./performance-analytics.js";

/**
 * Observability singleton - Main API for observability operations
 */
export const observability = {
  /**
   * Health check system
   */
  health: {
    register: healthModule.registerHealthCheck,
    unregister: healthModule.unregisterHealthCheck,
    runAll: healthModule.runAllHealthChecks,
    getCached: healthModule.getCachedHealth,
    formatStatus: healthModule.formatHealthStatus,
    formatUptime: healthModule.formatUptime,
    initialize: healthModule.initializeHealthChecks,
  },

  /**
   * Alert system
   */
  alerts: {
    addRule: alertsModule.addAlertRule,
    removeRule: alertsModule.removeAlertRule,
    getRules: alertsModule.getAlertRules,
    check: alertsModule.checkAlerts,
    getActive: alertsModule.getActiveAlerts,
    getAll: alertsModule.getAllAlerts,
    acknowledge: alertsModule.acknowledgeAlert,
    clear: alertsModule.clearAlert,
    clearAll: alertsModule.clearAllAlerts,
    onAlert: alertsModule.onAlert,
    initialize: alertsModule.initializeAlerts,
  },

  /**
   * Performance insights
   */
  insights: {
    analyze: insightsModule.analyzePerformance,
    generate: insightsModule.generateInsights,
    getByCategory: insightsModule.getInsightsByCategory,
    getHighImpact: insightsModule.getHighImpactInsights,
    format: insightsModule.formatInsight,
  },

  /**
   * Session reports
   */
  reports: {
    start: reportsModule.startSessionReport,
    end: reportsModule.endSessionReport,
    recordTurn: reportsModule.recordTurnEvent,
    recordTool: reportsModule.recordToolEvent,
    recordError: reportsModule.recordErrorEvent,
    recordApi: reportsModule.recordApiEvent,
    generate: reportsModule.generateSessionReport,
    format: reportsModule.formatSessionReport,
    export: reportsModule.exportSessionReport,
    clear: reportsModule.clearSessionReport,
  },

  /**
   * Real-time dashboard
   */
  dashboard: {
    start: dashboardModule.startDashboard,
  },

  /**
   * Agent behavior analytics
   */
  agent: {
    get: agentAnalyticsModule.getAgentAnalytics,
    reset: agentAnalyticsModule.resetAgentAnalytics,
    create: agentAnalyticsModule.createAgentAnalytics,
  },

  /**
   * Error analytics
   */
  error: {
    get: errorAnalyticsModule.getErrorAnalytics,
    reset: errorAnalyticsModule.resetErrorAnalytics,
  },

  /**
   * Performance analytics
   */
  perf: {
    get: performanceAnalyticsModule.getPerformanceAnalytics,
    reset: performanceAnalyticsModule.resetPerformanceAnalytics,
    create: performanceAnalyticsModule.createPerformanceAnalytics,
  },

  /**
   * Initialize all observability systems
   */
  initialize(): void {
    this.health.initialize();
    this.alerts.initialize();
  },

  /**
   * Initialize for a new session
   */
  initializeSession(sessionId: string): {
    agent: agentAnalyticsModule.AgentAnalyticsEngine;
    perf: performanceAnalyticsModule.PerformanceAnalyticsEngine;
    error: errorAnalyticsModule.ErrorAnalyticsEngine;
  } {
    const agent = agentAnalyticsModule.createAgentAnalytics(sessionId);
    const perf = performanceAnalyticsModule.createPerformanceAnalytics(sessionId);
    const error = errorAnalyticsModule.getErrorAnalytics();

    return { agent, perf, error };
  },

  /**
   * Get full observability status
   */
  async getStatus(): Promise<{
    health: Awaited<ReturnType<typeof healthModule.runAllHealthChecks>>;
    alerts: ReturnType<typeof alertsModule.getActiveAlerts>;
    insights: ReturnType<typeof insightsModule.generateInsights>;
    performance: ReturnType<typeof insightsModule.analyzePerformance>;
  }> {
    const health = await this.health.runAll();
    const alerts = this.alerts.getActive();
    const insights = this.insights.generate();
    const performance = this.insights.analyze();

    return {
      health,
      alerts,
      insights,
      performance,
    };
  },

  /**
   * Get comprehensive session analytics
   */
  getSessionAnalytics(sessionId?: string): {
    agent?: ReturnType<agentAnalyticsModule.AgentAnalyticsEngine["export"]>;
    error: ReturnType<errorAnalyticsModule.ErrorAnalyticsEngine["getStatistics"]>;
    perf?: ReturnType<performanceAnalyticsModule.PerformanceAnalyticsEngine["export"]>;
    patterns: errorAnalyticsModule.ErrorPattern[];
    suggestions: string[];
  } {
    const error = errorAnalyticsModule.getErrorAnalytics().getStatistics();
    const patterns = errorAnalyticsModule.getErrorAnalytics().getPatterns();

    let agent: ReturnType<agentAnalyticsModule.AgentAnalyticsEngine["export"]> | undefined;
    let perf: ReturnType<performanceAnalyticsModule.PerformanceAnalyticsEngine["export"]> | undefined;
    const suggestions: string[] = [];

    try {
      const agentEngine = agentAnalyticsModule.getAgentAnalytics(sessionId);
      agent = agentEngine.export();
    } catch {
      // Not initialized
    }

    try {
      const perfEngine = performanceAnalyticsModule.getPerformanceAnalytics(sessionId);
      perf = perfEngine.export();
      suggestions.push(...perf.suggestions);
    } catch {
      // Not initialized
    }

    // Add error-based suggestions
    for (const pattern of patterns) {
      if (pattern.occurrences > 3) {
        suggestions.push(`Pattern detected: ${pattern.description}. See suggestions in pattern.`);
      }
    }

    return { agent, error, perf, patterns, suggestions };
  },
};

// Default export
export default observability;
