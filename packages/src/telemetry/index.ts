/**
 * Telemetry Module - Comprehensive observability for Coder
 *
 * This module provides:
 * - Distributed tracing (OpenTelemetry-compatible spans)
 * - Metrics (counters, gauges, histograms)
 * - Structured logging with levels
 * - Multiple exporters (console, file, OTLP)
 * - Auto-instrumentation for API calls, turns, tools
 * - Real-time dashboards and health monitoring
 * - Performance insights and alerts
 * - Session reports
 *
 * @module telemetry
 *
 * @example
 * ```typescript
 * import { telemetry, startSessionTelemetry, observability } from "@ebowwa/coder/telemetry";
 *
 * // Start session telemetry
 * const sessionCtx = startSessionTelemetry("session-123", "claude-sonnet-4-6", "/workspace");
 *
 * // Use instrumented API client
 * const result = await createInstrumentedMessageStream(messages, {
 *   apiKey: process.env.API_KEY,
 *   model: "claude-sonnet-4-6",
 *   sessionId: "session-123",
 * });
 *
 * // Check health
 * const health = await observability.health.runAll();
 *
 * // Get insights
 * const insights = observability.insights.generate();
 *
 * // End session
 * endSessionTelemetry("session-123");
 * ```
 */

// ============================================
// TYPES
// ============================================

export * from "./types.js";

// ============================================
// CONFIG
// ============================================

export {
  loadConfig,
  getConfig,
  resetConfig,
  isEnabled,
  isTracingEnabled,
  isMetricsEnabled,
  shouldSample,
  DEFAULT_CONFIG,
} from "./config.js";

// ============================================
// TRACER
// ============================================

export {
  SpanBuilder,
  createSpan,
  startSpan,
  withSpan,
  withSpanSync,
  getActiveSpan,
  getActiveContext,
  generateTraceId,
  generateSpanId,
  extractTraceContext,
  injectTraceContext,
} from "./tracer.js";

export type { TraceContext } from "./tracer.js";

// ============================================
// METRICS
// ============================================

export {
  MetricsRegistry,
  getMetricsRegistry,
  resetMetricsRegistry,
  metrics,
} from "./metrics.js";

// ============================================
// LOGGER
// ============================================

export {
  Logger,
  getLogger,
  createLogger,
  logger,
} from "./logger.js";

// ============================================
// EXPORTERS
// ============================================

export type { Exporter } from "./exporters/index.js";
export {
  CompositeExporter,
  createExporter,
  createExporters,
  ConsoleExporter,
  createConsoleExporter,
  FileExporter,
  createFileExporter,
  OTLPExporter,
  createOTLPExporter,
} from "./exporters/index.js";

// ============================================
// INSTRUMENTATION
// ============================================

export {
  initializeInstrumentation,
  isInstrumentationEnabled,
  // API client
  createInstrumentedMessageStream,
  createUsageSummary,
  // Turn executor
  executeInstrumentedTurn,
  // Tool executor
  executeInstrumentedTools,
  // Agent loop
  startSessionTelemetry,
  endSessionTelemetry,
  recordTurnMetrics,
  recordToolCall,
  recordSessionError,
  getSessionContext,
  getSessionMetrics,
  getActiveSessions,
  getAllSessionSummaries,
  // MCP client
  trackMCPConnectionStart,
  trackMCPConnectionSuccess,
  trackMCPConnectionFailure,
  trackMCPToolCall,
  trackMCPDisconnection,
  getActiveMCPConnections,
  getMCPConnectionSummary,
} from "./instrumentation/index.js";

// ============================================
// TELEMETRY SINGLETON
// ============================================

import type { TelemetryConfig, TelemetryEvent, Span, Metric, LogEntry, SessionMetrics } from "./types.js";
import { loadConfig, getConfig, resetConfig } from "./config.js";
import { getMetricsRegistry, resetMetricsRegistry } from "./metrics.js";
import { logger } from "./logger.js";
import { createExporters, type Exporter, type CompositeExporter } from "./exporters/index.js";
import {
  startSessionTelemetry,
  endSessionTelemetry,
  getSessionMetrics,
  getActiveSessions,
  getAllSessionSummaries,
} from "./instrumentation/agent-loop.js";

/**
 * Telemetry singleton - Main API for telemetry operations
 */
export const telemetry = {
  /**
   * Initialize telemetry with configuration
   */
  init(config?: Partial<TelemetryConfig>): void {
    if (config) {
      // Override config
      const current = getConfig();
      Object.assign(current, config);
    }

    logger.info("Telemetry initialized", {
      enabled: getConfig().enabled,
      exporters: getConfig().exporters,
    });
  },

  /**
   * Get current configuration
   */
  getConfig(): TelemetryConfig {
    return getConfig();
  },

  /**
   * Reset telemetry state
   */
  reset(): void {
    resetConfig();
    resetMetricsRegistry();
  },

  /**
   * Get metrics registry
   */
  getMetrics() {
    return getMetricsRegistry();
  },

  /**
   * Export all metrics
   */
  exportMetrics(): Metric[] {
    return getMetricsRegistry().export();
  },

  /**
   * Get metrics summary
   */
  getMetricsSummary(): Record<string, unknown> {
    return getMetricsRegistry().getSummary();
  },

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    getMetricsRegistry().reset();
  },

  /**
   * Start session tracking
   */
  startSession(sessionId: string, model: string, workingDirectory: string) {
    return startSessionTelemetry(sessionId, model, workingDirectory);
  },

  /**
   * End session tracking
   */
  endSession(sessionId: string): SessionMetrics | undefined {
    return endSessionTelemetry(sessionId);
  },

  /**
   * Get session metrics
   */
  getSessionMetrics(sessionId: string): SessionMetrics | undefined {
    return getSessionMetrics(sessionId);
  },

  /**
   * Get all active sessions
   */
  getActiveSessions(): string[] {
    return getActiveSessions();
  },

  /**
   * Get all session summaries
   */
  getSessionSummaries(): SessionMetrics[] {
    return getAllSessionSummaries();
  },

  /**
   * Check if telemetry is enabled
   */
  get isEnabled(): boolean {
    return getConfig().enabled;
  },

  /**
   * Check if tracing is enabled
   */
  get isTracingEnabled(): boolean {
    return getConfig().enabled && getConfig().tracingEnabled;
  },

  /**
   * Check if metrics are enabled
   */
  get isMetricsEnabled(): boolean {
    return getConfig().enabled && getConfig().metricsEnabled;
  },
};

// ============================================
// OBSERVABILITY
// ============================================

export {
  // Types
  type HealthStatus,
  type ComponentHealth,
  type SystemHealth,
  type AlertSeverity,
  type Alert,
  type AlertRule,
  type InsightCategory,
  type Insight,
  type PerformanceAnalysis,
  type DashboardWidget,
  type DashboardConfig,
  type SessionReport,
  // Health
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
  // Alerts
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
  // Insights
  insights,
  analyzePerformance,
  generateInsights,
  getInsightsByCategory,
  getHighImpactInsights,
  formatInsight,
  // Reports
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
  // Dashboard
  dashboard,
  startDashboard,
  ObservabilityDashboard,
  type DashboardProps,
  // Main singleton
  observability,
} from "./observability/index.js";

// Default export
export default telemetry;
