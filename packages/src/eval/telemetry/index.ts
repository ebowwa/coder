/**
 * Telemetry Module - Comprehensive observability for evals
 *
 * Provides rich metrics, tracing, and observability capabilities
 * for understanding and improving agent performance.
 *
 * @module eval/telemetry
 */

// Types
export type {
  // Timing
  TurnTiming,
  LatencyPercentiles,

  // Tools
  ToolInvocationMetrics,
  ToolStatistics,

  // Errors
  ErrorCategory,
  ErrorRecord,
  ErrorStatistics,

  // State
  StateMetrics,
  TransitionRecord,
  TransitionPathAnalysis,

  // Cost
  CostBreakdown,
  CostEfficiency,

  // Quality
  QualityMetrics,

  // Session/Suite
  SessionTelemetry,
  SuiteTelemetry,

  // Historical
  HistoricalComparison,

  // Export
  ExportFormat,
  ExportOptions,
} from "./types.js";

// Collector
export { TelemetryCollector, buildSuiteTelemetry } from "./collector.js";
