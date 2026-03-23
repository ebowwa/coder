/**
 * Agent Analytics - Deep observability for AI agent behavior
 *
 * Tracks:
 * - Agent decision-making patterns
 * - Loop iteration analysis
 * - Tool selection reasoning
 * - Planning/refinement patterns
 * - Context window analytics
 * - Multi-agent coordination
 *
 * @module telemetry/observability/agent-analytics
 */

import { z } from "zod";

// ============================================
// DECISION TRACKING SCHEMAS
// ============================================

export const DecisionTypeSchema = z.enum([
  "tool_selection",
  "continuation",
  "compaction",
  "error_recovery",
  "planning",
  "refinement",
]);

export const DecisionOutcomeSchema = z.enum([
  "success",
  "failure",
  "retry",
  "abort",
  "delegated",
]);

export const AgentDecisionSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  sessionId: z.string(),
  turnNumber: z.number(),
  type: DecisionTypeSchema,
  context: z.record(z.unknown()),
  reasoning: z.string().optional(),
  options: z.array(z.object({
    id: z.string(),
    description: z.string(),
    score: z.number().optional(),
    selected: z.boolean(),
  })),
  outcome: DecisionOutcomeSchema,
  durationMs: z.number(),
  confidence: z.number().min(0).max(1).optional(),
});

// ============================================
// LOOP ITERATION ANALYTICS
// ============================================

export const LoopStopReasonSchema = z.enum([
  "tool_end_turn",
  "max_turns",
  "error",
  "user_interrupt",
  "stop_sequence",
  "result_condition",
  "completion_detected",
  "resource_limit",
]);

export const LoopIterationSchema = z.object({
  turnNumber: z.number(),
  startTime: z.number(),
  endTime: z.number().optional(),
  durationMs: z.number().optional(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  toolsUsed: z.array(z.string()),
  stopReason: LoopStopReasonSchema.optional(),
  shouldContinue: z.boolean(),
  costUSD: z.number(),
  /** Why the loop decided to continue or stop */
  continuationReason: z.string().optional(),
  /** Detected task progress this turn */
  progressIndicator: z.string().optional(),
  /** Whether this turn made meaningful progress */
  productiveTurn: z.boolean().optional(),
});

export const LoopAnalyticsSchema = z.object({
  sessionId: z.string(),
  totalTurns: z.number(),
  productiveTurns: z.number(),
  stalledTurns: z.number(),
  avgTurnDurationMs: z.number(),
  avgTimeBetweenTurnsMs: z.number(),
  tokenGrowthRate: z.number(), // tokens per turn
  costAccumulationRate: z.number(), // USD per turn
  toolDiversity: z.number(), // unique tools / total calls
  stopReasonDistribution: z.record(z.number()),
  loopEfficiency: z.number(), // productiveTurns / totalTurns
});

// ============================================
// TOOL SELECTION ANALYTICS
// ============================================

export const ToolSelectionContextSchema = z.object({
  taskType: z.string(), // e.g., "file_read", "code_edit", "search"
  availableTools: z.array(z.string()),
  selectedTools: z.array(z.string()),
  rejectedTools: z.array(z.string()).optional(),
  reasoning: z.string().optional(),
  confidence: z.number().optional(),
});

export const ToolUsagePatternSchema = z.object({
  tool: z.string(),
  totalCalls: z.number(),
  successfulCalls: z.number(),
  failedCalls: z.number(),
  avgDurationMs: z.number(),
  p50DurationMs: z.number(),
  p95DurationMs: z.number(),
  p99DurationMs: z.number(),
  avgInputSize: z.number().optional(),
  avgOutputSize: z.number().optional(),
  commonErrors: z.array(z.object({
    message: z.string(),
    count: z.number(),
  })),
  // Sequential patterns
  oftenFollowedBy: z.array(z.string()),
  oftenPrecededBy: z.array(z.string()),
  // Task associations
  taskTypes: z.record(z.number()), // taskType -> count
});

// ============================================
// PLANNING & REFINEMENT ANALYTICS
// ============================================

export const PlanStepStatusSchema = z.enum([
  "pending",
  "in_progress",
  "completed",
  "skipped",
  "failed",
]);

export const PlanAnalyticsSchema = z.object({
  sessionId: z.string(),
  planGenerated: z.boolean(),
  totalSteps: z.number(),
  completedSteps: z.number(),
  skippedSteps: z.number(),
  failedSteps: z.number(),
  avgStepDurationMs: z.number(),
  planAdherenceRate: z.number(), // completed / total
  replanCount: z.number(),
  planDeviationCount: z.number(),
});

export const RefinementLevelAnalyticsSchema = z.object({
  level: z.number(),
  entryCount: z.number(),
  avgDurationMs: z.number(),
  successRate: z.number(),
  commonIssues: z.array(z.string()),
});

// ============================================
// CONTEXT WINDOW ANALYTICS
// ============================================

export const CompactionTriggerSchema = z.enum([
  "proactive_threshold",
  "reactive_overflow",
  "manual",
  "error_recovery",
]);

export const CompactionAnalyticsSchema = z.object({
  sessionId: z.string(),
  totalCompactions: z.number(),
  tokensCompacted: z.number(),
  tokensPreserved: z.number(),
  avgCompactionRatio: z.number(), // tokensAfter / tokensBefore
  avgCompactionDurationMs: z.number(),
  compactionByTrigger: z.record(z.number()),
  // Strategy effectiveness
  strategiesUsed: z.record(z.object({
    count: z.number(),
    avgRatio: z.number(),
    avgDurationMs: z.number(),
  })),
  // What was compacted
  messageTypesCompacted: z.record(z.number()),
  // Impact on subsequent turns
  postCompactionPerformance: z.object({
    avgTTFTImprovement: z.number(), // ms improvement
    avgTokenReduction: z.number(),
  }),
});

export const ContextGrowthSchema = z.object({
  sessionId: z.string(),
  measurements: z.array(z.object({
    turnNumber: z.number(),
    totalTokens: z.number(),
    contextWindowPercent: z.number(),
    messageCount: z.number(),
    timestamp: z.number(),
  })),
  growthRate: z.number(), // tokens per turn
  projectedExhaustionTurn: z.number().optional(), // when context will fill
});

// ============================================
// MULTI-AGENT COORDINATION
// ============================================

export const TeammateRoleSchema = z.enum([
  "worker",
  "coordinator",
  "specialist",
  "reviewer",
]);

export const TeammateSpawnSchema = z.object({
  teammateId: z.string(),
  role: TeammateRoleSchema,
  parentId: z.string().optional(),
  sessionId: z.string(),
  spawnTime: z.number(),
  endTime: z.number().optional(),
  tasksAssigned: z.number(),
  tasksCompleted: z.number(),
  tokensUsed: z.number(),
  costUSD: z.number(),
  spawnReason: z.string(),
});

export const InterAgentMessageSchema = z.object({
  fromId: z.string(),
  toId: z.string(),
  timestamp: z.number(),
  type: z.enum(["task", "result", "query", "coordination", "error"]),
  sizeBytes: z.number(),
  latencyMs: z.number().optional(),
});

export const TeamCoordinationSchema = z.object({
  sessionId: z.string(),
  totalTeammates: z.number(),
  maxDepth: z.number(), // hierarchy depth
  totalMessages: z.number(),
  avgMessageLatencyMs: z.number(),
  coordinationOverhead: z.number(), // ms spent coordinating
  loadBalance: z.number(), // std dev of work distribution (lower = more balanced)
  deadlockCount: z.number(),
  retryCount: z.number(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type DecisionType = z.infer<typeof DecisionTypeSchema>;
export type DecisionOutcome = z.infer<typeof DecisionOutcomeSchema>;
export type AgentDecision = z.infer<typeof AgentDecisionSchema>;
export type LoopStopReason = z.infer<typeof LoopStopReasonSchema>;
export type LoopIteration = z.infer<typeof LoopIterationSchema>;
export type LoopAnalytics = z.infer<typeof LoopAnalyticsSchema>;
export type ToolSelectionContext = z.infer<typeof ToolSelectionContextSchema>;
export type ToolUsagePattern = z.infer<typeof ToolUsagePatternSchema>;
export type PlanStepStatus = z.infer<typeof PlanStepStatusSchema>;
export type PlanAnalytics = z.infer<typeof PlanAnalyticsSchema>;
export type RefinementLevelAnalytics = z.infer<typeof RefinementLevelAnalyticsSchema>;
export type CompactionTrigger = z.infer<typeof CompactionTriggerSchema>;
export type CompactionAnalytics = z.infer<typeof CompactionAnalyticsSchema>;
export type ContextGrowth = z.infer<typeof ContextGrowthSchema>;
export type TeammateRole = z.infer<typeof TeammateRoleSchema>;
export type TeammateSpawn = z.infer<typeof TeammateSpawnSchema>;
export type InterAgentMessage = z.infer<typeof InterAgentMessageSchema>;
export type TeamCoordination = z.infer<typeof TeamCoordinationSchema>;

// ============================================
// AGENT ANALYTICS ENGINE
// ============================================

/**
 * AgentAnalyticsEngine - Comprehensive agent behavior analytics
 */
export class AgentAnalyticsEngine {
  private sessionId: string;
  private decisions: AgentDecision[] = [];
  private loopIterations: LoopIteration[] = [];
  private toolPatterns: Map<string, ToolUsagePattern> = new Map();
  private compactionEvents: CompactionAnalytics[] = [];
  private contextGrowth: ContextGrowth | null = null;
  private teammates: Map<string, TeammateSpawn> = new Map();
  private messages: InterAgentMessage[] = [];

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.contextGrowth = {
      sessionId,
      measurements: [],
      growthRate: 0,
    };
  }

  // ============================================
  // DECISION TRACKING
  // ============================================

  recordDecision(decision: Omit<AgentDecision, "id" | "timestamp" | "sessionId">): string {
    const id = `decision-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fullDecision: AgentDecision = {
      ...decision,
      id,
      timestamp: Date.now(),
      sessionId: this.sessionId,
    };
    this.decisions.push(fullDecision);
    return id;
  }

  getDecisionAnalytics(): {
    byType: Record<DecisionType, number>;
    byOutcome: Record<DecisionOutcome, number>;
    avgConfidence: number;
    avgDurationMs: number;
  } {
    const byType: Record<DecisionType, number> = {
      tool_selection: 0,
      continuation: 0,
      compaction: 0,
      error_recovery: 0,
      planning: 0,
      refinement: 0,
    };
    const byOutcome: Record<DecisionOutcome, number> = {
      success: 0,
      failure: 0,
      retry: 0,
      abort: 0,
      delegated: 0,
    };

    let totalConfidence = 0;
    let confidenceCount = 0;
    let totalDuration = 0;

    for (const d of this.decisions) {
      byType[d.type]++;
      byOutcome[d.outcome]++;
      totalDuration += d.durationMs;
      if (d.confidence !== undefined) {
        totalConfidence += d.confidence;
        confidenceCount++;
      }
    }

    return {
      byType,
      byOutcome,
      avgConfidence: confidenceCount > 0 ? totalConfidence / confidenceCount : 0,
      avgDurationMs: this.decisions.length > 0 ? totalDuration / this.decisions.length : 0,
    };
  }

  // ============================================
  // LOOP ANALYTICS
  // ============================================

  recordLoopIteration(iteration: Omit<LoopIteration, "turnNumber"> & { turnNumber: number }): void {
    // Calculate if turn was productive
    const productive = this.isProductiveTurn(iteration);
    this.loopIterations.push({
      ...iteration,
      productiveTurn: productive,
    });
  }

  private isProductiveTurn(iteration: LoopIteration): boolean {
    // A turn is productive if:
    // 1. It produced output tokens
    // 2. It used tools (not just end_turn)
    // 3. The cost was reasonable for the output
    const hasOutput = iteration.outputTokens > 0;
    const usedTools = iteration.toolsUsed.length > 0 &&
      !iteration.toolsUsed.every(t => t === "end_turn");
    const reasonableCost = iteration.costUSD < 1.0; // Less than $1 per turn

    return hasOutput && usedTools && reasonableCost;
  }

  getLoopAnalytics(): LoopAnalytics {
    const turns = this.loopIterations;
    const totalTurns = turns.length;
    const productiveTurns = turns.filter(t => t.productiveTurn).length;
    const stalledTurns = totalTurns - productiveTurns;

    // Calculate averages
    const durations = turns.filter(t => t.durationMs).map(t => t.durationMs!);
    const avgTurnDurationMs = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    // Time between turns
    const timeBetween: number[] = [];
    for (let i = 1; i < turns.length; i++) {
      const prevTurn = turns[i - 1];
      const currTurn = turns[i];
      if (prevTurn?.endTime && currTurn?.startTime) {
        timeBetween.push(currTurn.startTime - prevTurn.endTime);
      }
    }
    const avgTimeBetweenTurnsMs = timeBetween.length > 0
      ? timeBetween.reduce((a, b) => a + b, 0) / timeBetween.length
      : 0;

    // Token growth rate
    const tokenGrowthRate = this.calculateTokenGrowthRate();

    // Cost accumulation rate
    const totalCost = turns.reduce((sum, t) => sum + t.costUSD, 0);
    const costAccumulationRate = totalTurns > 0 ? totalCost / totalTurns : 0;

    // Tool diversity
    const allTools = turns.flatMap(t => t.toolsUsed);
    const uniqueTools = new Set(allTools);
    const toolDiversity = allTools.length > 0 ? uniqueTools.size / allTools.length : 0;

    // Stop reason distribution
    const stopReasonDistribution: Record<string, number> = {};
    for (const t of turns) {
      if (t.stopReason) {
        stopReasonDistribution[t.stopReason] = (stopReasonDistribution[t.stopReason] || 0) + 1;
      }
    }

    return {
      sessionId: this.sessionId,
      totalTurns,
      productiveTurns,
      stalledTurns,
      avgTurnDurationMs,
      avgTimeBetweenTurnsMs,
      tokenGrowthRate,
      costAccumulationRate,
      toolDiversity,
      stopReasonDistribution,
      loopEfficiency: totalTurns > 0 ? productiveTurns / totalTurns : 0,
    };
  }

  private calculateTokenGrowthRate(): number {
    const turns = this.loopIterations;
    if (turns.length < 2) return 0;

    const firstHalf = turns.slice(0, Math.floor(turns.length / 2));
    const secondHalf = turns.slice(Math.floor(turns.length / 2));

    const firstAvg = firstHalf.reduce((sum, t) => sum + t.inputTokens, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, t) => sum + t.inputTokens, 0) / secondHalf.length;

    return secondAvg - firstAvg; // Tokens added per half-session
  }

  // ============================================
  // TOOL ANALYTICS
  // ============================================

  recordToolCall(
    tool: string,
    durationMs: number,
    success: boolean,
    inputSize?: number,
    outputSize?: number,
    error?: string,
    taskType?: string
  ): void {
    let pattern = this.toolPatterns.get(tool);
    if (!pattern) {
      pattern = {
        tool,
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        avgDurationMs: 0,
        p50DurationMs: 0,
        p95DurationMs: 0,
        p99DurationMs: 0,
        commonErrors: [],
        oftenFollowedBy: [],
        oftenPrecededBy: [],
        taskTypes: {},
      };
      this.toolPatterns.set(tool, pattern);
    }

    pattern.totalCalls++;
    if (success) {
      pattern.successfulCalls++;
    } else {
      pattern.failedCalls++;
      if (error) {
        const existing = pattern.commonErrors.find(e => e.message === error);
        if (existing) {
          existing.count++;
        } else {
          pattern.commonErrors.push({ message: error, count: 1 });
        }
      }
    }

    // Update averages
    pattern.avgDurationMs = (pattern.avgDurationMs * (pattern.totalCalls - 1) + durationMs) / pattern.totalCalls;

    if (inputSize !== undefined) {
      pattern.avgInputSize = pattern.avgInputSize
        ? (pattern.avgInputSize * (pattern.totalCalls - 1) + inputSize) / pattern.totalCalls
        : inputSize;
    }
    if (outputSize !== undefined) {
      pattern.avgOutputSize = pattern.avgOutputSize
        ? (pattern.avgOutputSize * (pattern.totalCalls - 1) + outputSize) / pattern.totalCalls
        : outputSize;
    }

    if (taskType) {
      pattern.taskTypes[taskType] = (pattern.taskTypes[taskType] || 0) + 1;
    }
  }

  getToolPatterns(): ToolUsagePattern[] {
    return Array.from(this.toolPatterns.values());
  }

  // ============================================
  // CONTEXT GROWTH
  // ============================================

  recordContextMeasurement(
    turnNumber: number,
    totalTokens: number,
    contextWindowSize: number,
    messageCount: number
  ): void {
    if (!this.contextGrowth) {
      this.contextGrowth = {
        sessionId: this.sessionId,
        measurements: [],
        growthRate: 0,
      };
    }

    this.contextGrowth.measurements.push({
      turnNumber,
      totalTokens,
      contextWindowPercent: (totalTokens / contextWindowSize) * 100,
      messageCount,
      timestamp: Date.now(),
    });

    // Update growth rate
    if (this.contextGrowth.measurements.length >= 2) {
      const recent = this.contextGrowth.measurements.slice(-5);
      let totalGrowth = 0;
      for (let i = 1; i < recent.length; i++) {
        const curr = recent[i];
        const prev = recent[i - 1];
        if (curr && prev) {
          totalGrowth += curr.totalTokens - prev.totalTokens;
        }
      }
      this.contextGrowth.growthRate = totalGrowth / (recent.length - 1);

      // Project context exhaustion
      const last = recent[recent.length - 1];
      if (last) {
        const remaining = contextWindowSize - last.totalTokens;
        if (this.contextGrowth.growthRate > 0) {
          const turnsUntilExhaustion = remaining / this.contextGrowth.growthRate;
          this.contextGrowth.projectedExhaustionTurn = last.turnNumber + turnsUntilExhaustion;
        }
      }
    }
  }

  getContextGrowth(): ContextGrowth | null {
    return this.contextGrowth;
  }

  // ============================================
  // MULTI-AGENT COORDINATION
  // ============================================

  recordTeammateSpawn(spawn: Omit<TeammateSpawn, "spawnTime">): void {
    this.teammates.set(spawn.teammateId, {
      ...spawn,
      spawnTime: Date.now(),
    });
  }

  recordTeammateEnd(teammateId: string, tasksCompleted: number, tokensUsed: number, costUSD: number): void {
    const teammate = this.teammates.get(teammateId);
    if (teammate) {
      teammate.endTime = Date.now();
      teammate.tasksCompleted = tasksCompleted;
      teammate.tokensUsed = tokensUsed;
      teammate.costUSD = costUSD;
    }
  }

  recordInterAgentMessage(msg: Omit<InterAgentMessage, "timestamp">): void {
    this.messages.push({
      ...msg,
      timestamp: Date.now(),
    });
  }

  getTeamCoordination(): TeamCoordination {
    const teammates = Array.from(this.teammates.values());
    const messages = this.messages;

    // Calculate average message latency
    const latencies = messages.filter(m => m.latencyMs).map(m => m.latencyMs!);
    const avgMessageLatencyMs = latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0;

    // Calculate load balance (std dev of work distribution)
    const taskCounts = teammates.map(t => t.tasksAssigned);
    const avgTasks = taskCounts.reduce((a, b) => a + b, 0) / (taskCounts.length || 1);
    const variance = taskCounts.reduce((sum, c) => sum + Math.pow(c - avgTasks, 2), 0) / (taskCounts.length || 1);
    const loadBalance = Math.sqrt(variance);

    return {
      sessionId: this.sessionId,
      totalTeammates: teammates.length,
      maxDepth: this.calculateHierarchyDepth(teammates),
      totalMessages: messages.length,
      avgMessageLatencyMs,
      coordinationOverhead: this.calculateCoordinationOverhead(teammates, messages),
      loadBalance,
      deadlockCount: 0, // Would need deadlock detection
      retryCount: messages.filter(m => m.type === "error").length,
    };
  }

  private calculateHierarchyDepth(teammates: TeammateSpawn[]): number {
    const children = new Map<string, string[]>();
    for (const t of teammates) {
      if (t.parentId) {
        const existing = children.get(t.parentId) || [];
        children.set(t.parentId, [...existing, t.teammateId]);
      }
    }

    const getDepth = (id: string, visited: Set<string>): number => {
      if (visited.has(id)) return 0;
      visited.add(id);
      const kids = children.get(id) || [];
      if (kids.length === 0) return 1;
      return 1 + Math.max(...kids.map(k => getDepth(k, visited)));
    };

    const roots = teammates.filter(t => !t.parentId);
    if (roots.length === 0) return 0;
    return Math.max(...roots.map(r => getDepth(r.teammateId, new Set())));
  }

  private calculateCoordinationOverhead(teammates: TeammateSpawn[], messages: InterAgentMessage[]): number {
    // Estimate coordination overhead as time spent on coordination messages
    const coordinationMessages = messages.filter(m => m.type === "coordination");
    // Assume average coordination takes 50ms
    return coordinationMessages.length * 50;
  }

  // ============================================
  // EXPORT
  // ============================================

  export(): {
    sessionId: string;
    decisions: AgentDecision[];
    loopAnalytics: LoopAnalytics;
    toolPatterns: ToolUsagePattern[];
    contextGrowth: ContextGrowth | null;
    teamCoordination: TeamCoordination | null;
  } {
    return {
      sessionId: this.sessionId,
      decisions: this.decisions,
      loopAnalytics: this.getLoopAnalytics(),
      toolPatterns: this.getToolPatterns(),
      contextGrowth: this.contextGrowth,
      teamCoordination: this.teammates.size > 0 ? this.getTeamCoordination() : null,
    };
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let _engine: AgentAnalyticsEngine | null = null;

export function getAgentAnalytics(sessionId?: string): AgentAnalyticsEngine {
  if (!_engine && sessionId) {
    _engine = new AgentAnalyticsEngine(sessionId);
  }
  if (!_engine) {
    throw new Error("AgentAnalyticsEngine not initialized. Call getAgentAnalytics(sessionId) first.");
  }
  return _engine;
}

export function resetAgentAnalytics(): void {
  _engine = null;
}

export function createAgentAnalytics(sessionId: string): AgentAnalyticsEngine {
  _engine = new AgentAnalyticsEngine(sessionId);
  return _engine;
}
