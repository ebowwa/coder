/**
 * Evaluation Module - Agent evaluation infrastructure
 *
 * Implements the Agent Evaluation Readiness Checklist:
 * - Unambiguous success criteria (code-based + LLM judge)
 * - Capability vs regression eval separation
 * - Multi-level evaluation (run, trace, thread)
 *
 * @module eval
 */

// ============================================
// TYPES
// ============================================

export type {
  // Success Criteria
  ConditionOperator,
  SuccessCriterion,
  SuccessTarget,
  SuccessCriteriaConfig,
  CriterionResult,

  // Evaluation Tasks
  EvaluationLevel,
  EvaluationType,
  AgentType,
  TaskDifficulty,
  EvalTask,
  EvalTaskInput,
  RunLevelInput,
  TraceLevelInput,
  ThreadLevelInput,
  ReferenceSolution,

  // Evaluation Results
  EvalResult,
  EvalTrace,
  EvalMetrics,

  // Evaluation Suites
  EvalSuite,
  EvalSuiteConfig,
  EvalSuiteResult,

  // Graders
  GraderType,
  GraderConfig,
  GraderFunction,
} from "./types.js";

export {
  // Zod schemas
  ConditionOperatorSchema,
  SuccessTargetSchema,
  SuccessCriterionSchema,
  SuccessCriteriaConfigSchema,
  EvaluationLevelSchema,
  EvaluationTypeSchema,
  AgentTypeSchema,
  TaskDifficultySchema,
  EvalTaskSchema,
  EvalSuiteSchema,
} from "./types.js";

// ============================================
// GRADERS
// ============================================

export {
  // Code-based graders
  evaluateCriterion,
  evaluateCriteria,
  getSupportedOperators,
  graderRegistry,
  extractValue,
} from "./graders/code-based.js";

export {
  // LLM judge
  runLLMJudge,
  evaluateTrajectory,
  evaluateCriterionWithLLM,
  calculateCalibration,
  DEFAULT_JUDGE_SYSTEM_PROMPT,
  TRAJECTORY_JUDGE_PROMPT,
  type LLMJudgeResult,
  type LLMJudgeConfig,
  type CalibrationExample,
} from "./graders/llm-judge.js";

// ============================================
// RUNNERS
// ============================================

export {
  // Offline runner
  sessionToTrace,
  sessionToAgentLoopResult,
  evaluateSessionTask,
  runOfflineSuite,
  loadSession,
  loadSessions,
  listSessions,
  generateReport,
  type OfflineEvalConfig,
  type SessionEvalResult,
} from "./runners/offline.js";

// ============================================
// THREAD-LEVEL RUNNER
// ============================================

export {
  // Thread-level evaluation (N-1 testing pattern)
  extractThreadTask,
  buildThreadDataset,
  evaluateThreadTask,
  runThreadEvaluation,
  generateThreadReport,
  // Types
  type ThreadEvalDimension,
  type ThreadTask,
  type ThreadEvalResult,
  type ThreadDatasetConfig,
  type ThreadEvalConfig,
} from "./runners/thread.js";

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Quick evaluation of a single session against criteria
 */
import { loadSession, listSessions } from "./runners/offline.js";
import { evaluateCriteria } from "./graders/code-based.js";
import { sessionToTrace, sessionToAgentLoopResult } from "./runners/offline.js";
import type { SuccessCriteriaConfig } from "./types.js";

export async function quickEval(
  sessionId: string,
  criteria: SuccessCriteriaConfig,
  options?: { sessionsDir?: string; workingDir?: string }
): Promise<{
  passed: boolean;
  score: number;
  reason: string;
}> {
  const session = await loadSession(sessionId, options?.sessionsDir);
  if (!session) {
    return { passed: false, score: 0, reason: "Session not found" };
  }

  const trace = sessionToTrace(session);
  const result = sessionToAgentLoopResult(session, trace);

  return evaluateCriteria(
    criteria,
    result,
    trace,
    options?.workingDir ?? session.metadata.workingDirectory
  );
}

/**
 * Batch evaluate multiple sessions
 */
export async function batchEval(
  criteria: SuccessCriteriaConfig,
  options?: { sessionsDir?: string; limit?: number }
): Promise<Map<string, { passed: boolean; score: number; reason: string }>> {
  const results = new Map<string, { passed: boolean; score: number; reason: string }>();

  const sessionIds = await listSessions(options?.sessionsDir);
  const toEval = options?.limit ? sessionIds.slice(0, options.limit) : sessionIds;

  for (const sessionId of toEval) {
    results.set(sessionId, await quickEval(sessionId, criteria, options));
  }

  return results;
}

// ============================================
// TELEMETRY
// ============================================

export type {
  // Telemetry types
  SessionTelemetry,
  SuiteTelemetry,
  TurnTiming,
  LatencyPercentiles,
  ToolInvocationMetrics,
  ToolStatistics,
  ErrorCategory,
  ErrorRecord,
  ErrorStatistics,
  StateMetrics,
  TransitionRecord,
  TransitionPathAnalysis,
  CostBreakdown,
  CostEfficiency,
  QualityMetrics,
  ExportFormat,
  ExportOptions,
} from "./telemetry/index.js";

export {
  TelemetryCollector,
  buildSuiteTelemetry,
} from "./telemetry/index.js";
