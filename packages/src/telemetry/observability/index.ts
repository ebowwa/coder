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
// OBSERVABILITY SINGLETON
// ============================================

import * as healthModule from "./health.js";
import * as alertsModule from "./alerts.js";
import * as insightsModule from "./insights.js";
import * as reportsModule from "./reports.js";
import * as dashboardModule from "./dashboard.js";

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
   * Initialize all observability systems
   */
  initialize(): void {
    this.health.initialize();
    this.alerts.initialize();
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
};

// Default export
export default observability;
