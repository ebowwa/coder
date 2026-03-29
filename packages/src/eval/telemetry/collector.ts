/**
 * Telemetry Collector - Gathers comprehensive metrics during eval execution
 *
 * Collects timing, tool usage, errors, state transitions, costs, and quality
 * metrics for detailed observability and analysis.
 *
 * @module eval/telemetry/collector
 */

import type {
  SessionTelemetry,
  SuiteTelemetry,
  TurnTiming,
  ToolInvocationMetrics,
  ToolStatistics,
  ErrorRecord,
  ErrorCategory,
  ErrorStatistics,
  StateMetrics,
  TransitionRecord,
  TransitionPathAnalysis,
  CostBreakdown,
  CostEfficiency,
  QualityMetrics,
  LatencyPercentiles,
} from "./types.js";
import type { EvalResult, EvalTrace, EvalSuiteResult } from "../types.js";
import type { AgentLoopResult } from "../../schemas/agent-loop.zod.js";
import type { ToolUseBlock } from "../../schemas/index.js";

/** Metrics for a single turn - simplified interface */
interface TurnMetrics {
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
  durationMs?: number;
  ttftMs?: number;
}

// ============================================
// TELEMETRY COLLECTOR
// ============================================

/**
 * Collects telemetry data during eval execution
 */
export class TelemetryCollector {
  private turnTimings: TurnTiming[] = [];
  private toolInvocations: ToolInvocationMetrics[] = [];
  private errors: ErrorRecord[] = [];
  private stateTransitions: TransitionRecord[] = [];
  private startTime: number = 0;
  private turnStartTime: number = 0;
  private lastTokenCount: number = 0;
  private lastState: string = "";
  private lastStateTime: number = 0;

  constructor(
    private readonly sessionId: string,
    private readonly taskId: string,
    private readonly model: string
  ) {}

  /**
   * Start collection for a session
   */
  startCollection(): void {
    this.startTime = Date.now();
    this.turnTimings = [];
    this.toolInvocations = [];
    this.errors = [];
    this.stateTransitions = [];
    this.lastTokenCount = 0;
  }

  /**
   * Record the start of a turn
   */
  startTurn(turn: number): void {
    this.turnStartTime = Date.now();
  }

  /**
   * Record turn completion with metrics
   */
  recordTurn(turn: number, metric: TurnMetrics): void {
    const now = Date.now();
    const durationMs = now - this.turnStartTime;

    const tokensGenerated = (metric.usage?.output_tokens ?? 0) - this.lastTokenCount;
    const generationMs = metric.durationMs ?? durationMs;
    const tokensPerSecond = generationMs > 0 ? (tokensGenerated / generationMs) * 1000 : 0;

    this.turnTimings.push({
      turn,
      durationMs,
      ttftMs: metric.ttftMs ?? 0,
      generationMs,
      toolExecutionMs: 0, // Calculated later
      transitionMs: 0, // Calculated later
      tokensGenerated,
      tokensPerSecond,
      apiLatencyMs: metric.durationMs ?? durationMs,
    });

    this.lastTokenCount = metric.usage?.output_tokens ?? 0;
  }

  /**
   * Record a tool invocation
   */
  recordToolCall(
    tool: string,
    callId: string,
    turn: number,
    input: unknown,
    result: unknown,
    durationMs: number,
    success: boolean,
    error?: Error
  ): void {
    const invocation: ToolInvocationMetrics = {
      tool,
      callId,
      turn,
      timestamp: Date.now(),
      durationMs,
      success,
      errorType: error?.constructor?.name,
      errorMessage: error?.message?.slice(0, 200),
      inputSize: this.estimateSize(input),
      outputSize: this.estimateSize(result),
    };

    this.toolInvocations.push(invocation);

    // Update turn's tool execution time
    const turnTiming = this.turnTimings.find((t) => t.turn === turn);
    if (turnTiming) {
      turnTiming.toolExecutionMs += durationMs;
    }
  }

  /**
   * Record an error
   */
  recordError(
    error: Error,
    turn: number,
    tool?: string,
    recovered: boolean = false,
    recoveryStrategy?: string,
    retryCount: number = 0
  ): void {
    const category = this.categorizeError(error);

    const record: ErrorRecord = {
      id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      category,
      type: error.constructor.name,
      message: error.message?.slice(0, 500) ?? "Unknown error",
      stack: error.stack?.split("\n").slice(0, 5).join("\n"),
      turn,
      tool,
      timestamp: Date.now(),
      recovered,
      recoveryStrategy,
      retryCount,
    };

    this.errors.push(record);
  }

  /**
   * Record a state transition
   */
  recordStateTransition(
    from: string,
    to: string,
    event: string,
    turn: number
  ): void {
    const now = Date.now();
    const dwellMs = this.lastState ? now - this.lastStateTime : 0;

    this.stateTransitions.push({
      from,
      to,
      event,
      timestamp: now,
      dwellMs,
      turn,
    });

    // Update turn's transition time
    const turnTiming = this.turnTimings.find((t) => t.turn === turn);
    if (turnTiming && dwellMs > 0) {
      turnTiming.transitionMs += dwellMs;
    }

    this.lastState = to;
    this.lastStateTime = now;
  }

  /**
   * Build complete session telemetry
   */
  buildSessionTelemetry(
    result: EvalResult,
    agentResult?: AgentLoopResult
  ): SessionTelemetry {
    const endTime = Date.now();
    const trace = result.trace;

    // Extract additional data from trace if available
    if (trace) {
      this.extractFromTrace(trace);
    }

    // Calculate token totals
    const tokens = {
      input: result.metrics.tokens.input,
      output: result.metrics.tokens.output,
      cacheRead: 0,
      cacheWrite: 0,
      total: result.metrics.tokens.input + result.metrics.tokens.output,
    };

    if (agentResult) {
      tokens.cacheRead = agentResult.totalCacheMetrics.totalCacheReadTokens ?? 0;
      tokens.cacheWrite = agentResult.totalCacheMetrics.totalCacheWriteTokens ?? 0;
    }

    return {
      sessionId: this.sessionId,
      taskId: this.taskId,
      model: this.model,
      startTime: this.startTime,
      endTime,
      durationMs: endTime - this.startTime,
      passed: result.passed,
      score: result.score,
      turns: result.metrics.turns,
      turnTimings: this.turnTimings,
      toolInvocations: this.toolInvocations,
      toolStatistics: this.calculateToolStatistics(),
      errors: this.errors,
      errorStatistics: this.calculateErrorStatistics(),
      stateTransitions: this.stateTransitions,
      stateMetrics: this.calculateStateMetrics(),
      transitionAnalysis: this.analyzeTransitions(),
      cost: this.calculateCostBreakdown(result, tokens),
      costEfficiency: this.calculateCostEfficiency(result, tokens),
      quality: this.calculateQualityMetrics(result),
      tokens,
      compactionEvents: [], // Extracted from agent result if available
      environment: this.getEnvironmentInfo(),
    };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private extractFromTrace(trace: EvalTrace): void {
    // Extract tool calls from trace
    for (const tc of trace.toolCalls) {
      const existing = this.toolInvocations.find((i) => i.callId === tc.id);
      if (!existing) {
        this.toolInvocations.push({
          tool: tc.name,
          callId: tc.id,
          turn: 0, // Unknown
          timestamp: tc.timestamp,
          durationMs: 0,
          success: tc.success,
          isError: tc.isError,
        });
      }
    }

    // Extract state transitions
    for (const st of trace.stateTransitions) {
      const fromStr = typeof st.from === 'string' ? st.from : String(st.from);
      const toStr = typeof st.to === 'string' ? st.to : String(st.to);
      const eventStr = typeof st.event === 'string' ? st.event : (st.event as { type?: string }).type ?? String(st.event);
      const existing = this.stateTransitions.find(
        (t) => t.from === fromStr && t.to === toStr && t.event === eventStr
      );
      if (!existing) {
        this.recordStateTransition(fromStr, toStr, eventStr, 0);
      }
    }
  }

  private calculateToolStatistics(): ToolStatistics[] {
    const byTool = new Map<string, ToolInvocationMetrics[]>();

    for (const inv of this.toolInvocations) {
      const list = byTool.get(inv.tool) ?? [];
      list.push(inv);
      byTool.set(inv.tool, list);
    }

    const totalExecutionTime = this.toolInvocations.reduce(
      (sum, inv) => sum + inv.durationMs,
      0
    );

    const stats: ToolStatistics[] = [];

    for (const [tool, invocations] of byTool) {
      const successes = invocations.filter((i) => i.success).length;
      const failures = invocations.length - successes;
      const durations = invocations.map((i) => i.durationMs).sort((a, b) => a - b);
      const totalTime = durations.reduce((a, b) => a + b, 0);

      const errorsByType: Record<string, number> = {};
      for (const inv of invocations) {
        if (inv.errorType) {
          errorsByType[inv.errorType] = (errorsByType[inv.errorType] ?? 0) + 1;
        }
      }

      stats.push({
        tool,
        invocations: invocations.length,
        successes,
        failures,
        successRate: invocations.length > 0 ? successes / invocations.length : 0,
        avgDurationMs: durations.length > 0 ? totalTime / durations.length : 0,
        durationPercentiles: this.calculatePercentiles(durations),
        totalTimeMs: totalTime,
        timePercentage:
          totalExecutionTime > 0 ? (totalTime / totalExecutionTime) * 100 : 0,
        avgInputSize:
          invocations.filter((i) => i.inputSize !== undefined).length > 0
            ? invocations.reduce((sum, i) => sum + (i.inputSize ?? 0), 0) /
              invocations.length
            : undefined,
        avgOutputSize:
          invocations.filter((i) => i.outputSize !== undefined).length > 0
            ? invocations.reduce((sum, i) => sum + (i.outputSize ?? 0), 0) /
              invocations.length
            : undefined,
        errorsByType,
      });
    }

    return stats.sort((a, b) => b.invocations - a.invocations);
  }

  private calculateErrorStatistics(): ErrorStatistics {
    const recovered = this.errors.filter((e) => e.recovered).length;
    const byCategory: Record<ErrorCategory, number> = {
      api_error: 0,
      rate_limit: 0,
      timeout: 0,
      tool_error: 0,
      validation_error: 0,
      file_not_found: 0,
      permission_denied: 0,
      syntax_error: 0,
      network_error: 0,
      context_overflow: 0,
      unknown: 0,
    };

    const byTool: Record<string, number> = {};
    const byTurn: number[] = [];

    for (const err of this.errors) {
      if (err.category in byCategory) {
        byCategory[err.category]++;
      } else {
        byCategory.unknown++;
      }
      if (err.tool) {
        byTool[err.tool] = (byTool[err.tool] ?? 0) + 1;
      }
      const turnIndex = err.turn ?? 0;
      while (byTurn.length <= turnIndex) {
        byTurn.push(0);
      }
      byTurn[turnIndex] = (byTurn[turnIndex] ?? 0) + 1;
    }

    const recoveredErrors = this.errors.filter((e) => e.recovered);
    const avgRecoveryTimeMs =
      recoveredErrors.length > 0
        ? recoveredErrors.reduce((sum, e) => sum + (e.recoveryTimeMs ?? 0), 0) /
          recoveredErrors.length
        : 0;

    return {
      totalErrors: this.errors.length,
      recoveredErrors: recovered,
      recoveryRate: this.errors.length > 0 ? recovered / this.errors.length : 1,
      byCategory,
      byTool,
      byTurn,
      avgRecoveryTimeMs,
      avgRetryCount:
        this.errors.length > 0
          ? this.errors.reduce((sum, e) => sum + e.retryCount, 0) / this.errors.length
          : 0,
    };
  }

  private calculateStateMetrics(): StateMetrics[] {
    const byState = new Map<
      string,
      { entries: number; exits: number; dwellTimes: number[] }
    >();

    // Initialize all states
    for (const t of this.stateTransitions) {
      if (!byState.has(t.from)) {
        byState.set(t.from, { entries: 0, exits: 0, dwellTimes: [] });
      }
      if (!byState.has(t.to)) {
        byState.set(t.to, { entries: 0, exits: 0, dwellTimes: [] });
      }
    }

    // Count entries, exits, and dwell times
    for (const t of this.stateTransitions) {
      const fromState = byState.get(t.from)!;
      fromState.exits++;
      if (t.dwellMs > 0) {
        fromState.dwellTimes.push(t.dwellMs);
      }

      const toState = byState.get(t.to)!;
      toState.entries++;
    }

    const totalTime = this.stateTransitions.reduce((sum, t) => sum + t.dwellMs, 0);
    const metrics: StateMetrics[] = [];

    for (const [state, data] of byState) {
      const totalStateTime = data.dwellTimes.reduce((a, b) => a + b, 0);
      metrics.push({
        state,
        entries: data.entries,
        exits: data.exits,
        totalTimeMs: totalStateTime,
        avgDwellMs:
          data.dwellTimes.length > 0
            ? totalStateTime / data.dwellTimes.length
            : 0,
        dwellPercentiles: this.calculatePercentiles(data.dwellTimes),
        timePercentage: totalTime > 0 ? (totalStateTime / totalTime) * 100 : 0,
      });
    }

    return metrics.sort((a, b) => b.totalTimeMs - a.totalTimeMs);
  }

  private analyzeTransitions(): TransitionPathAnalysis {
    const pathCounts = new Map<string, number>();
    const cycles: Array<{ path: string[]; count: number }> = [];
    const terminalStates: Record<string, number> = {};
    const unexpectedTransitions: Array<{ from: string; to: string; count: number }> = [];

    // Expected transitions (FSM graph)
    const expectedTransitions = new Set([
      "idle->processing",
      "processing->tool_executing",
      "tool_executing->processing",
      "processing->responding",
      "responding->idle",
      "processing->idle",
    ]);

    for (const t of this.stateTransitions) {
      const path = `${t.from}->${t.to}`;
      pathCounts.set(path, (pathCounts.get(path) ?? 0) + 1);

      // Track terminal states
      const hasExits = this.stateTransitions.some((t2) => t2.from === t.to);
      if (!hasExits) {
        terminalStates[t.to] = (terminalStates[t.to] ?? 0) + 1;
      }

      // Track unexpected transitions
      if (!expectedTransitions.has(path)) {
        const existing = unexpectedTransitions.find(
          (u) => u.from === t.from && u.to === t.to
        );
        if (existing) {
          existing.count++;
        } else {
          unexpectedTransitions.push({ from: t.from, to: t.to, count: 1 });
        }
      }
    }

    // Detect cycles
    const visited = new Set<string>();
    for (const t of this.stateTransitions) {
      const cyclePath = this.findCycle(t.from, visited);
      if (cyclePath) {
        const existing = cycles.find(
          (c) => c.path.join("->") === cyclePath.join("->")
        );
        if (existing) {
          existing.count++;
        } else {
          cycles.push({ path: cyclePath, count: 1 });
        }
      }
    }

    const totalPaths = Array.from(pathCounts.values()).reduce((a, b) => a + b, 0);
    const commonPaths = Array.from(pathCounts.entries())
      .map(([path, count]) => ({
        path,
        count,
        percentage: totalPaths > 0 ? (count / totalPaths) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      commonPaths,
      avgPathLength: this.stateTransitions.length,
      cycles: cycles.slice(0, 5),
      terminalStates,
      unexpectedTransitions: unexpectedTransitions.sort((a, b) => b.count - a.count),
    };
  }

  private findCycle(
    start: string,
    globalVisited: Set<string>
  ): string[] | null {
    const visited = new Set<string>();
    const path: string[] = [];
    let current = start;

    while (current && !visited.has(current)) {
      if (globalVisited.has(current)) return null;
      visited.add(current);
      path.push(current);

      const next = this.stateTransitions.find((t) => t.from === current && !visited.has(t.to));
      current = next?.to ?? "";
    }

    if (current && visited.has(current)) {
      const cycleStart = path.indexOf(current);
      if (cycleStart >= 0) {
        const cycle = path.slice(cycleStart);
        cycle.forEach((s) => globalVisited.add(s));
        return cycle;
      }
    }

    return null;
  }

  private calculateCostBreakdown(
    result: EvalResult,
    tokens: { input: number; output: number; cacheRead: number; cacheWrite: number }
  ): CostBreakdown {
    // Model pricing (approximate, per million tokens)
    const pricing = {
      "glm-5": { input: 0.25, output: 1.0, cacheRead: 0.03, cacheWrite: 1.25 },
      "claude-sonnet-4-6": { input: 3.0, output: 15.0, cacheRead: 0.30, cacheWrite: 3.75 },
      "claude-opus-4-6": { input: 15.0, output: 75.0, cacheRead: 1.50, cacheWrite: 18.75 },
    };

    const modelPricing = pricing[this.model as keyof typeof pricing] ?? pricing["glm-5"];

    const inputTokenCost = (tokens.input / 1_000_000) * modelPricing.input;
    const outputTokenCost = (tokens.output / 1_000_000) * modelPricing.output;
    const cacheReadCost = (tokens.cacheRead / 1_000_000) * modelPricing.cacheRead;
    const cacheWriteCost = (tokens.cacheWrite / 1_000_000) * modelPricing.cacheWrite;

    const totalCost = result.metrics.costUSD;
    const turns = Math.max(result.metrics.turns, 1);
    const toolCalls = Math.max(result.metrics.toolCallCount, 1);

    return {
      inputTokenCost,
      outputTokenCost,
      cacheReadCost,
      cacheWriteCost,
      toolOverheadCost: 0, // Estimated separately
      totalCost,
      costPerTurn: totalCost / turns,
      costPerToolCall: totalCost / toolCalls,
      costPerSuccess: result.passed ? totalCost : totalCost, // No success cost if failed
    };
  }

  private calculateCostEfficiency(
    result: EvalResult,
    tokens: { total: number }
  ): CostEfficiency {
    const cost = result.metrics.costUSD || 0.01; // Avoid division by zero
    const totalTokens = tokens.total || 1;

    return {
      tokensPerDollar: totalTokens / cost,
      turnsPerDollar: result.metrics.turns / cost,
      tasksPerDollar: result.passed ? 1 / cost : 0,
      toolCallsPerDollar: result.metrics.toolCallCount / cost,
      efficiencyScore: result.passed ? result.score / cost : 0,
      relativeToBaseline: 1.0, // Would need baseline comparison
    };
  }

  private calculateQualityMetrics(result: EvalResult): QualityMetrics {
    const trace = result.trace;
    const responses = trace?.output?.response ?? "";
    const responseLength = responses.length;

    // Extract code blocks
    const codeBlockMatches = responses.match(/```[\s\S]*?```/g) ?? [];
    const codeBlocks = codeBlockMatches.length;

    // Extract languages
    const languages: Record<string, number> = {};
    for (const block of codeBlockMatches) {
      const langMatch = block.match(/```(\w+)/);
      if (langMatch && langMatch[1]) {
        const lang = langMatch[1];
        languages[lang] = (languages[lang] ?? 0) + 1;
      }
    }

    // Calculate efficiency
    const idealSteps = 1; // Minimum steps to complete
    const actualSteps = result.metrics.turns;
    const completionEfficiency = actualSteps > 0 ? idealSteps / actualSteps : 0;

    // Calculate overhead
    const essentialSteps = 1;
    const overheadRatio = actualSteps > 0 ? (actualSteps - essentialSteps) / actualSteps : 0;

    return {
      avgResponseLength: responseLength,
      responseLengthDistribution: {
        min: responseLength,
        max: responseLength,
        mean: responseLength,
        stdDev: 0,
      },
      codeBlockMetrics: {
        total: codeBlocks,
        avgPerResponse: codeBlocks,
        languages,
      },
      completionEfficiency,
      overheadRatio,
    };
  }

  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const name = error.constructor.name.toLowerCase();

    if (name.includes("rate") || message.includes("rate limit")) return "rate_limit";
    if (name.includes("timeout") || message.includes("timeout")) return "timeout";
    if (message.includes("enoent") || message.includes("not found")) return "file_not_found";
    if (message.includes("eacces") || message.includes("permission")) return "permission_denied";
    if (message.includes("syntax")) return "syntax_error";
    if (message.includes("network") || message.includes("econnrefused")) return "network_error";
    if (message.includes("context") || message.includes("token limit")) return "context_overflow";
    if (name.includes("validation")) return "validation_error";
    if (name.includes("api")) return "api_error";
    if (message.includes("tool")) return "tool_error";

    return "unknown";
  }

  private estimateSize(value: unknown): number {
    try {
      return JSON.stringify(value).length;
    } catch {
      return 0;
    }
  }

  private calculatePercentiles(values: number[]): LatencyPercentiles {
    if (values.length === 0) {
      return { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0, max: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const percentile = (p: number): number => {
      const idx = Math.ceil((p / 100) * sorted.length) - 1;
      return sorted[Math.max(0, idx)] ?? 0;
    };

    return {
      p50: percentile(50),
      p75: percentile(75),
      p90: percentile(90),
      p95: percentile(95),
      p99: percentile(99),
      max: sorted[sorted.length - 1] ?? 0,
    };
  }

  private getEnvironmentInfo(): SessionTelemetry["environment"] {
    return {
      platform: process.platform,
      nodeVersion: process.version,
      coderVersion: process.env.CODER_VERSION ?? "unknown",
      gitCommit: process.env.GIT_COMMIT,
      gitBranch: process.env.GIT_BRANCH,
    };
  }
}

// ============================================
// SUITE TELEMETRY BUILDER
// ============================================

/**
 * Build suite-level aggregated telemetry
 */
export function buildSuiteTelemetry(
  suiteId: string,
  suiteName: string,
  results: EvalResult[],
  model: string
): SuiteTelemetry {
  const passedTasks = results.filter((r) => r.passed).length;
  const scores = results.map((r) => r.score);
  const durations = results.map((r) => r.metrics.durationMs);
  const turns = results.map((r) => r.metrics.turns);
  const toolCalls = results.map((r) => r.metrics.toolCallCount);
  const costs = results.map((r) => r.metrics.costUSD);
  const errors = results.map((r) => r.metrics.errorCount);

  // Aggregate tool statistics
  const toolStats = new Map<string, { total: number; successes: number; durations: number[] }>();
  for (const r of results) {
    if (r.trace) {
      for (const tc of r.trace.toolCalls) {
        const stats = toolStats.get(tc.name) ?? { total: 0, successes: 0, durations: [] };
        stats.total++;
        if (tc.success) stats.successes++;
        toolStats.set(tc.name, stats);
      }
    }
  }

  // Sort and format tool usage
  const sortedTools = Array.from(toolStats.entries())
    .map(([tool, stats]) => ({
      tool,
      count: stats.total,
      successRate: stats.total > 0 ? stats.successes / stats.total : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Calculate percentiles
  const calcPercentiles = (values: number[]): LatencyPercentiles => {
    if (values.length === 0) return { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0, max: 0 };
    const sorted = [...values].sort((a, b) => a - b);
    const p = (percentile: number): number => sorted[Math.ceil((percentile / 100) * sorted.length) - 1] ?? 0;
    return { p50: p(50), p75: p(75), p90: p(90), p95: p(95), p99: p(99), max: sorted[sorted.length - 1] ?? 0 };
  };

  const totalCost = costs.reduce((a, b) => a + b, 0);
  const totalDuration = durations.reduce((a, b) => a + b, 0);
  const totalTokens = results.reduce(
    (sum, r) => sum + r.metrics.tokens.input + r.metrics.tokens.output,
    0
  );
  const totalToolCalls = toolCalls.reduce((a, b) => a + b, 0);
  const totalErrors = errors.reduce((a, b) => a + b, 0);

  return {
    suiteId,
    suiteName,
    timestamp: Date.now(),
    model,
    totalTasks: results.length,
    passedTasks,
    passRate: results.length > 0 ? passedTasks / results.length : 0,
    avgScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
    scoreDistribution: {
      min: scores.length > 0 ? Math.min(...scores) : 0,
      max: scores.length > 0 ? Math.max(...scores) : 0,
      mean: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      stdDev: 0,
      median: scores.length > 0 ? (scores.slice().sort((a, b) => a - b)[Math.floor(scores.length / 2)] ?? 0) : 0,
    },
    timing: {
      totalDurationMs: totalDuration,
      avgTaskDurationMs: durations.length > 0 ? totalDuration / durations.length : 0,
      avgTurnDurationMs: turns.length > 0 ? totalDuration / turns.reduce((a, b) => a + b, 0) : 0,
      avgTTFTms: 0, // Would need per-turn data
      ttftPercentiles: calcPercentiles([]),
    },
    tokens: {
      totalInput: results.reduce((sum, r) => sum + r.metrics.tokens.input, 0),
      totalOutput: results.reduce((sum, r) => sum + r.metrics.tokens.output, 0),
      totalCacheRead: 0,
      totalCacheWrite: 0,
      avgInputPerTask: results.length > 0
        ? results.reduce((sum, r) => sum + r.metrics.tokens.input, 0) / results.length
        : 0,
      avgOutputPerTask: results.length > 0
        ? results.reduce((sum, r) => sum + r.metrics.tokens.output, 0) / results.length
        : 0,
      tokensPerSecond: totalDuration > 0 ? (totalTokens / totalDuration) * 1000 : 0,
    },
    costs: {
      totalCost,
      avgCostPerTask: results.length > 0 ? totalCost / results.length : 0,
      avgCostPerTurn: turns.reduce((a, b) => a + b, 0) > 0
        ? totalCost / turns.reduce((a, b) => a + b, 0)
        : 0,
      costPerSuccessfulTask: passedTasks > 0 ? totalCost / passedTasks : 0,
    },
    tools: {
      totalInvocations: totalToolCalls,
      avgPerTask: results.length > 0 ? totalToolCalls / results.length : 0,
      successRate: totalToolCalls > 0
        ? sortedTools.reduce((sum, t) => sum + t.successRate * t.count, 0) / totalToolCalls
        : 1,
      byTool: {},
      mostUsed: sortedTools.slice(0, 5),
      leastSuccessful: sortedTools
        .filter((t) => t.count >= 2)
        .sort((a, b) => a.successRate - b.successRate)
        .slice(0, 5),
    },
    errors: {
      total: totalErrors,
      avgPerTask: results.length > 0 ? totalErrors / results.length : 0,
      recoveryRate: 1, // Would need detailed error tracking
      byCategory: {} as Record<ErrorCategory, number>,
      byTool: {},
    },
    states: {
      stateMetrics: [],
      transitionAnalysis: {
        commonPaths: [],
        avgPathLength: 0,
        cycles: [],
        terminalStates: {},
        unexpectedTransitions: [],
      },
      avgStateTransitions: 0,
    },
    quality: {
      avgCompletionEfficiency: results.length > 0
        ? results.reduce((sum, r) => sum + r.score, 0) / results.length
        : 0,
      avgOverheadRatio: 0,
    },
    taskSummaries: results.map((r) => ({
      taskId: r.taskId,
      passed: r.passed,
      score: r.score,
      durationMs: r.metrics.durationMs,
      turns: r.metrics.turns,
      toolCalls: r.metrics.toolCallCount,
      cost: r.metrics.costUSD,
      errorCount: r.metrics.errorCount,
    })),
    environment: {
      platform: process.platform,
      nodeVersion: process.version,
      coderVersion: process.env.CODER_VERSION ?? "unknown",
    },
  };
}
