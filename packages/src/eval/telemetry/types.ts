/**
 * Telemetry Types - Comprehensive observability for evals
 *
 * Provides rich metrics, tracing, and observability capabilities
 * for understanding and improving agent performance.
 *
 * @module eval/telemetry/types
 */

// ============================================
// TIMING METRICS
// ============================================

/**
 * Detailed timing breakdown for a single turn
 */
export interface TurnTiming {
  /** Turn number (0-indexed) */
  turn: number;
  /** Total turn duration in ms */
  durationMs: number;
  /** Time to first token in ms */
  ttftMs: number;
  /** Time from first to last token (generation time) */
  generationMs: number;
  /** Time spent in tool execution */
  toolExecutionMs: number;
  /** Time spent in state transitions */
  transitionMs: number;
  /** Tokens generated this turn */
  tokensGenerated: number;
  /** Tokens per second generation rate */
  tokensPerSecond: number;
  /** API latency (network + queue time) */
  apiLatencyMs: number;
}

/**
 * Latency percentiles for performance analysis
 */
export interface LatencyPercentiles {
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  max: number;
}

// ============================================
// TOOL METRICS
// ============================================

/**
 * Metrics for a single tool invocation
 */
export interface ToolInvocationMetrics {
  /** Tool name */
  tool: string;
  /** Unique call ID */
  callId: string;
  /** Turn when called */
  turn: number;
  /** Timestamp of call */
  timestamp: number;
  /** Execution duration in ms */
  durationMs: number;
  /** Whether call succeeded */
  success: boolean;
  /** Error type if failed */
  errorType?: string;
  /** Error message if failed */
  errorMessage?: string;
  /** Input size (bytes or items) */
  inputSize?: number;
  /** Output size (bytes or items) */
  outputSize?: number;
  /** Whether result was cached */
  cached?: boolean;
  /** Whether the result was an error */
  isError?: boolean;
  /** Retry count */
  retries?: number;
}

/**
 * Aggregated tool statistics
 */
export interface ToolStatistics {
  /** Tool name */
  tool: string;
  /** Total invocations */
  invocations: number;
  /** Success count */
  successes: number;
  /** Failure count */
  failures: number;
  /** Success rate (0-1) */
  successRate: number;
  /** Average duration */
  avgDurationMs: number;
  /** Duration percentiles */
  durationPercentiles: LatencyPercentiles;
  /** Total time spent in this tool */
  totalTimeMs: number;
  /** Percentage of total execution time */
  timePercentage: number;
  /** Average input size */
  avgInputSize?: number;
  /** Average output size */
  avgOutputSize?: number;
  /** Cache hit rate (0-1) */
  cacheHitRate?: number;
  /** Error breakdown by type */
  errorsByType: Record<string, number>;
}

// ============================================
// ERROR METRICS
// ============================================

/**
 * Categorized error types
 */
export type ErrorCategory =
  | "api_error"
  | "rate_limit"
  | "timeout"
  | "tool_error"
  | "validation_error"
  | "file_not_found"
  | "permission_denied"
  | "syntax_error"
  | "network_error"
  | "context_overflow"
  | "unknown";

/**
 * Detailed error record
 */
export interface ErrorRecord {
  /** Unique error ID */
  id: string;
  /** Error category */
  category: ErrorCategory;
  /** Error type (class name) */
  type: string;
  /** Error message */
  message: string;
  /** Stack trace (sanitized) */
  stack?: string;
  /** Turn when error occurred */
  turn: number;
  /** Tool that caused error (if applicable) */
  tool?: string;
  /** Timestamp */
  timestamp: number;
  /** Whether error was recovered */
  recovered: boolean;
  /** Recovery strategy used */
  recoveryStrategy?: string;
  /** Time to recovery in ms */
  recoveryTimeMs?: number;
  /** Retry count before recovery/failure */
  retryCount: number;
}

/**
 * Error statistics summary
 */
export interface ErrorStatistics {
  /** Total errors */
  totalErrors: number;
  /** Recovered errors */
  recoveredErrors: number;
  /** Recovery rate (0-1) */
  recoveryRate: number;
  /** Errors by category */
  byCategory: Record<ErrorCategory, number>;
  /** Errors by tool */
  byTool: Record<string, number>;
  /** Errors by turn (distribution) */
  byTurn: number[];
  /** Average recovery time */
  avgRecoveryTimeMs: number;
  /** Average retry count */
  avgRetryCount: number;
}

// ============================================
// STATE TRANSITION METRICS
// ============================================

/**
 * FSM state metrics
 */
export interface StateMetrics {
  /** State name */
  state: string;
  /** Times entered */
  entries: number;
  /** Times exited */
  exits: number;
  /** Total time spent in state (ms) */
  totalTimeMs: number;
  /** Average dwell time (ms) */
  avgDwellMs: number;
  /** Dwell time percentiles */
  dwellPercentiles: LatencyPercentiles;
  /** Percentage of total time */
  timePercentage: number;
}

/**
 * State transition record
 */
export interface TransitionRecord {
  /** From state */
  from: string;
  /** To state */
  to: string;
  /** Event that triggered transition */
  event: string;
  /** Timestamp */
  timestamp: number;
  /** Duration in from state (ms) */
  dwellMs: number;
  /** Turn when transition occurred */
  turn: number;
}

/**
 * Transition path analysis
 */
export interface TransitionPathAnalysis {
  /** Most common paths (from->to) with counts */
  commonPaths: Array<{ path: string; count: number; percentage: number }>;
  /** Average path length */
  avgPathLength: number;
  /** Cycles detected */
  cycles: Array<{ path: string[]; count: number }>;
  /** Terminal states reached */
  terminalStates: Record<string, number>;
  /** Unexpected transitions */
  unexpectedTransitions: Array<{ from: string; to: string; count: number }>;
}

// ============================================
// COST METRICS
// ============================================

/**
 * Detailed cost breakdown
 */
export interface CostBreakdown {
  /** Input token cost */
  inputTokenCost: number;
  /** Output token cost */
  outputTokenCost: number;
  /** Cache read cost (discounted) */
  cacheReadCost: number;
  /** Cache write cost */
  cacheWriteCost: number;
  /** Tool execution overhead cost estimate */
  toolOverheadCost: number;
  /** Total cost */
  totalCost: number;
  /** Cost per turn */
  costPerTurn: number;
  /** Cost per tool call */
  costPerToolCall: number;
  /** Cost per successful task */
  costPerSuccess: number;
}

/**
 * Cost efficiency metrics
 */
export interface CostEfficiency {
  /** Tokens per dollar */
  tokensPerDollar: number;
  /** Successful turns per dollar */
  turnsPerDollar: number;
  /** Successful tasks per dollar */
  tasksPerDollar: number;
  /** Tool calls per dollar */
  toolCallsPerDollar: number;
  /** Cost efficiency score (0-1) */
  efficiencyScore: number;
  /** Comparison to baseline (1.0 = baseline) */
  relativeToBaseline: number;
}

// ============================================
// QUALITY METRICS
// ============================================

/**
 * Response quality metrics
 */
export interface QualityMetrics {
  /** Average response length (chars) */
  avgResponseLength: number;
  /** Response length distribution */
  responseLengthDistribution: {
    min: number;
    max: number;
    mean: number;
    stdDev: number;
  };
  /** Code blocks in responses */
  codeBlockMetrics: {
    total: number;
    avgPerResponse: number;
    languages: Record<string, number>;
  };
  /** Response coherence score (LLM-judged, 0-1) */
  coherenceScore?: number;
  /** Response relevance score (LLM-judged, 0-1) */
  relevanceScore?: number;
  /** Task completion efficiency (ideal/actual steps) */
  completionEfficiency: number;
  /** Overhead ratio (non-essential steps / total) */
  overheadRatio: number;
}

// ============================================
// SESSION METRICS
// ============================================

/**
 * Per-session telemetry data
 */
export interface SessionTelemetry {
  /** Session ID */
  sessionId: string;
  /** Task ID */
  taskId: string;
  /** Suite ID */
  suiteId?: string;
  /** Model used */
  model: string;
  /** Start timestamp */
  startTime: number;
  /** End timestamp */
  endTime: number;
  /** Total duration */
  durationMs: number;
  /** Whether session passed */
  passed: boolean;
  /** Score (0-1) */
  score: number;
  /** Turn count */
  turns: number;
  /** Turn timing breakdown */
  turnTimings: TurnTiming[];
  /** Tool invocations */
  toolInvocations: ToolInvocationMetrics[];
  /** Tool statistics */
  toolStatistics: ToolStatistics[];
  /** Errors */
  errors: ErrorRecord[];
  /** Error statistics */
  errorStatistics: ErrorStatistics;
  /** State transitions */
  stateTransitions: TransitionRecord[];
  /** State metrics */
  stateMetrics: StateMetrics[];
  /** Transition analysis */
  transitionAnalysis: TransitionPathAnalysis;
  /** Cost breakdown */
  cost: CostBreakdown;
  /** Cost efficiency */
  costEfficiency: CostEfficiency;
  /** Quality metrics */
  quality: QualityMetrics;
  /** Token usage */
  tokens: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
  };
  /** Compaction events */
  compactionEvents: Array<{
    turn: number;
    tokensBefore: number;
    tokensAfter: number;
    compressionRatio: number;
  }>;
  /** Environment info */
  environment: {
    platform: string;
    nodeVersion: string;
    coderVersion: string;
    gitCommit?: string;
    gitBranch?: string;
  };
}

// ============================================
// AGGREGATE METRICS
// ============================================

/**
 * Suite-level aggregated telemetry
 */
export interface SuiteTelemetry {
  /** Suite ID */
  suiteId: string;
  /** Suite name */
  suiteName: string;
  /** Run timestamp */
  timestamp: number;
  /** Model used */
  model: string;
  /** Total tasks */
  totalTasks: number;
  /** Passed tasks */
  passedTasks: number;
  /** Pass rate */
  passRate: number;
  /** Average score */
  avgScore: number;
  /** Score distribution */
  scoreDistribution: {
    min: number;
    max: number;
    mean: number;
    stdDev: number;
    median: number;
  };
  /** Aggregate timing */
  timing: {
    totalDurationMs: number;
    avgTaskDurationMs: number;
    avgTurnDurationMs: number;
    avgTTFTms: number;
    ttftPercentiles: LatencyPercentiles;
  };
  /** Aggregate token usage */
  tokens: {
    totalInput: number;
    totalOutput: number;
    totalCacheRead: number;
    totalCacheWrite: number;
    avgInputPerTask: number;
    avgOutputPerTask: number;
    tokensPerSecond: number;
  };
  /** Aggregate costs */
  costs: {
    totalCost: number;
    avgCostPerTask: number;
    avgCostPerTurn: number;
    costPerSuccessfulTask: number;
  };
  /** Aggregate tool usage */
  tools: {
    totalInvocations: number;
    avgPerTask: number;
    successRate: number;
    byTool: Record<string, ToolStatistics>;
    mostUsed: Array<{ tool: string; count: number }>;
    leastSuccessful: Array<{ tool: string; successRate: number }>;
  };
  /** Aggregate errors */
  errors: {
    total: number;
    avgPerTask: number;
    recoveryRate: number;
    byCategory: Record<ErrorCategory, number>;
    byTool: Record<string, number>;
  };
  /** Aggregate state analysis */
  states: {
    stateMetrics: StateMetrics[];
    transitionAnalysis: TransitionPathAnalysis;
    avgStateTransitions: number;
  };
  /** Quality summary */
  quality: {
    avgCompletionEfficiency: number;
    avgOverheadRatio: number;
    coherenceScore?: number;
    relevanceScore?: number;
  };
  /** Per-task summaries */
  taskSummaries: Array<{
    taskId: string;
    passed: boolean;
    score: number;
    durationMs: number;
    turns: number;
    toolCalls: number;
    cost: number;
    errorCount: number;
  }>;
  /** Environment info */
  environment: {
    platform: string;
    nodeVersion: string;
    coderVersion: string;
    gitCommit?: string;
    gitBranch?: string;
  };
}

// ============================================
// TRENDING / HISTORICAL
// ============================================

/**
 * Historical comparison data
 */
export interface HistoricalComparison {
  /** Current run metrics */
  current: SuiteTelemetry;
  /** Previous run metrics */
  previous?: SuiteTelemetry;
  /** Baseline metrics (established benchmark) */
  baseline?: SuiteTelemetry;
  /** Delta from previous */
  deltaFromPrevious?: {
    passRate: number;
    avgScore: number;
    avgDuration: number;
    avgCost: number;
    avgToolCalls: number;
    errorRate: number;
  };
  /** Delta from baseline */
  deltaFromBaseline?: {
    passRate: number;
    avgScore: number;
    avgDuration: number;
    avgCost: number;
    avgToolCalls: number;
    errorRate: number;
  };
  /** Trend direction */
  trends: {
    passRate: "improving" | "stable" | "declining";
    performance: "improving" | "stable" | "declining";
    cost: "improving" | "stable" | "declining";
    quality: "improving" | "stable" | "declining";
  };
  /** Regressions detected */
  regressions: Array<{
    taskId: string;
    criterionId?: string;
    previousPassed: boolean;
    currentPassed: boolean;
    severity: "minor" | "major" | "critical";
  }>;
}

// ============================================
// EXPORT FORMATS
// ============================================

/**
 * Supported export formats
 */
export type ExportFormat = "json" | "csv" | "prometheus" | "opentelemetry" | "markdown";

/**
 * Export options
 */
export interface ExportOptions {
  /** Output format */
  format: ExportFormat;
  /** Include raw traces */
  includeTraces?: boolean;
  /** Include individual tool invocations */
  includeToolDetails?: boolean;
  /** Include error details */
  includeErrorDetails?: boolean;
  /** Include state transitions */
  includeStateDetails?: boolean;
  /** Pretty print (for JSON) */
  prettyPrint?: boolean;
  /** Prometheus metric prefix */
  prometheusPrefix?: string;
  /** OpenTelemetry service name */
  otlpServiceName?: string;
}
