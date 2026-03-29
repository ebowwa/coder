/**
 * Evaluation Types - Core types for agent evaluation
 *
 * Implements the Agent Evaluation Readiness Checklist:
 * - Unambiguous success criteria
 * - Capability vs regression eval separation
 * - Multi-level evaluation (run, trace, thread)
 *
 * @module eval/types
 */

import { z } from "zod";
import type { Message, ToolUseBlock, ToolResult } from "../schemas/index.js";
import type { AgentLoopResult } from "../schemas/agent-loop.zod.js";
import type { AgentLoopState, AgentLoopEvent } from "../core/agent-loop/loop-fsm.js";

// ============================================
// SUCCESS CRITERIA TYPES
// ============================================

/**
 * Condition operator for comparing values
 */
export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "matches"
  | "matches_any"
  | "contains_any"
  | "sequence"
  | "count"
  | "count_min"
  | "count_max"
  | "greater_than"
  | "less_than"
  | "exists"
  | "not_exists"
  | "is_valid_json"
  | "is_valid_typescript"
  | "file_exists"
  | "file_contains";

/**
 * Condition object format (used by task definitions)
 */
export interface ConditionObject {
  operator: ConditionOperator;
}

/**
 * Single success criterion - atomic, unambiguous check
 */
export interface SuccessCriterion {
  /** Unique identifier */
  id: string;
  /** Human-readable description */
  description?: string;
  /** Category for grouping (e.g., "file_operations", "tool_selection") */
  category?: string;
  /** What to check */
  target: SuccessTarget;
  /** How to check - supports both string and object format */
  condition: ConditionOperator | ConditionObject;
  /** Expected value (for comparison operators) */
  expected?: string | number | boolean | object;
  /** Weight for partial credit (default: 1) */
  weight?: number;
  /** Whether this criterion is required (default: true) */
  required?: boolean;
  /** Priority for ordering (used by some task formats) */
  priority?: number;
}

/**
 * What the criterion targets
 */
export type SuccessTarget =
  | { type: "final_response" } // Check the agent's final text response
  | { type: "tool_call"; toolName?: string; index?: number } // Check specific tool call
  | { type: "tool_calls" } // Check all tool calls (array)
  | { type: "tool_calls_sequence" } // Check tool call sequence (names)
  | { type: "tool_call_count" } // Check tool call count
  | { type: "tool_result"; toolId?: string } // Check tool results
  | { type: "file_path"; path: string } // Check file existence/content
  | { type: "file_content"; path: string } // Check file content
  | { type: "file_changes" } // Check file changes array
  | { type: "state_change"; key: string } // Check state mutations
  | { type: "state_changes" } // Check all state changes
  | { type: "error_count" } // Check error count
  | { type: "trajectory"; pathPattern: string } // Check execution path
  | { type: "metric"; name: string } // Check metrics (cost, turns, etc.)
  | { type: "fsm_state" } // Check final FSM state
  | { type: "custom"; evaluator: string }; // Custom evaluator function

/**
 * Result of evaluating a single criterion
 */
export interface CriterionResult {
  criterionId: string;
  passed: boolean;
  reason: string;
  actual?: unknown;
  expected?: unknown;
  durationMs: number;
}

/**
 * Success criteria configuration
 */
export interface SuccessCriteriaConfig {
  /** List of criteria to check */
  criteria: SuccessCriterion[];
  /** How to combine criteria results */
  aggregation: "all" | "any" | "weighted_average" | "custom";
  /** Minimum score to pass (for weighted_average) */
  passingThreshold?: number;
  /** Custom aggregation function name */
  customAggregator?: string;
}

// ============================================
// EVALUATION TASK TYPES
// ============================================

/**
 * Evaluation level - matches the checklist's three levels
 */
export type EvaluationLevel = "run" | "trace" | "thread";

/**
 * Evaluation type - capability vs regression
 */
export type EvaluationType = "capability" | "regression";

/**
 * Agent type specialization
 */
export type AgentType = "coding" | "conversational" | "research" | "general";

/**
 * Task difficulty for capability evals
 */
export type TaskDifficulty = "trivial" | "easy" | "medium" | "hard" | "expert";

/**
 * Evaluation task definition
 */
export interface EvalTask {
  /** Unique task identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Detailed description */
  description: string;
  /** Category for grouping */
  category: string;
  /** Evaluation level */
  level: EvaluationLevel;
  /** Evaluation type */
  type: EvaluationType;
  /** Agent type this task is designed for */
  agentType: AgentType;
  /** Difficulty level (for capability evals) */
  difficulty?: TaskDifficulty;
  /** Input messages/prompt */
  input: EvalTaskInput;
  /** Success criteria */
  successCriteria: SuccessCriteriaConfig;
  /** Reference solution (proves task is solvable) */
  referenceSolution?: ReferenceSolution;
  /** Metadata */
  metadata?: {
    tags?: string[];
    source?: "handwritten" | "dogfood" | "benchmark" | "production" | "session-derived";
    createdAt?: string;
    updatedAt?: string;
    author?: string;
    version?: string;
  };
}

/**
 * Task input - varies by evaluation level
 */
export type EvalTaskInput =
  | RunLevelInput
  | TraceLevelInput
  | ThreadLevelInput;

/**
 * Run-level input: single step
 */
export interface RunLevelInput {
  level: "run";
  /** Available tools */
  tools?: string[];
  /** Current state/context */
  context?: Record<string, unknown>;
  /** The decision point */
  prompt: string;
  /** Setup steps to execute before the task */
  setupSteps?: Array<string | { action: string; path: string; content?: string }>;
}

/**
 * Trace-level input: full turn
 */
export interface TraceLevelInput {
  level: "trace";
  /** Initial messages (optional - will be derived from prompt if not provided) */
  messages?: Message[];
  /** Available tools */
  tools?: string[];
  /** Working directory context */
  workingDirectory?: string;
  /** Git status context */
  gitStatus?: { branch: string; clean: boolean };
  /** Prompt (required if messages not provided) */
  prompt?: string;
  /** Setup steps to execute before the task */
  setupSteps?: Array<string | { action: string; path: string; content?: string }>;
}

/**
 * Thread-level input: multi-turn conversation
 */
export interface ThreadLevelInput {
  level: "thread";
  /** Conversation prefix (N-1 turns) - optional, derived from prompt if not provided */
  conversationPrefix?: Message[];
  /** The final turn prompt - optional if prompt is provided */
  finalPrompt?: string;
  /** Expected context retention */
  expectedContext?: string[];
  /** Prompt (used as finalPrompt if conversationPrefix empty) */
  prompt?: string;
}

/**
 * Reference solution - proves task is solvable
 */
export interface ReferenceSolution {
  /** Expected tool calls (for run-level) */
  expectedToolCalls?: Array<{
    name: string;
    input: Record<string, unknown>;
  }>;
  /** Expected final response */
  expectedResponse?: string;
  /** Expected file changes */
  expectedFiles?: Array<{
    path: string;
    content?: string;
    exists: boolean;
  }>;
  /** Steps to complete the task */
  steps?: string[];
  /** Human-verified solution */
  verifiedBy?: string;
  /** Verification date */
  verifiedAt?: string;
}

// ============================================
// EVALUATION RESULT TYPES
// ============================================

/**
 * Result of evaluating a task
 */
export interface EvalResult {
  /** Task that was evaluated */
  taskId: string;
  /** Whether the task passed */
  passed: boolean;
  /** Score (0-1 for partial credit) */
  score: number;
  /** Individual criterion results */
  criteriaResults: CriterionResult[];
  /** Reason for pass/fail */
  reason: string;
  /** Execution trace */
  trace?: EvalTrace;
  /** Session ID */
  sessionId?: string;
  /** Metrics collected during execution */
  metrics: EvalMetrics;
  /** Timestamp */
  timestamp: number;
  /** Model used */
  model: string;
}

/**
 * Execution trace for analysis
 */
export interface EvalTrace {
  /** Session identifier */
  sessionId?: string;
  /** Trace timestamp */
  timestamp?: Date | number;
  /** Evaluation level */
  level?: EvaluationLevel;
  /** Input that generated this trace */
  input?: EvalTaskInput;
  /** Output from execution */
  output?: {
    response?: string;
    toolCalls?: Array<{
      name: string;
      input: unknown;
      output?: unknown;
      isError?: boolean;
    }>;
  };
  /** FSM state transitions */
  stateTransitions: Array<{
    from: AgentLoopState;
    to: AgentLoopState;
    event: AgentLoopEvent;
    timestamp: number;
  }>;
  /** Tool calls made */
  toolCalls: Array<{
    id: string;
    name: string;
    input: unknown;
    result?: ToolResult;
    output?: unknown;
    success: boolean;
    isError?: boolean;
    timestamp: number;
  }>;
  /** Files modified */
  fileChanges: Array<{
    path: string;
    action: "create" | "modify" | "delete";
    before?: string;
    after?: string;
  }>;
  /** Final response */
  finalResponse?: string;
  /** Error if any */
  error?: {
    message: string;
    stack?: string;
    recoverable: boolean;
  };
  /** Metrics collected during trace */
  metrics?: {
    durationMs?: number;
    tokenUsage?: {
      input: number;
      output: number;
      total?: number;
    };
    costUSD?: number;
  };
}

/**
 * Loaded session from storage (for analysis)
 */
export interface LoadedSession {
  metadata: {
    sessionId?: string;
    model?: string;
    workingDirectory?: string;
    startTime?: string;
    costUSD?: number;
    durationMs?: number;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    [key: string]: unknown;
  };
  messages: Array<{
    role?: string;
    content?: string | unknown[];
    [key: string]: unknown;
  }>;
  tools: Array<{
    name?: string;
    toolName?: string;
    input?: unknown;
    output?: unknown;
    isError?: boolean;
    [key: string]: unknown;
  }>;
  metrics: Array<{
    costUSD?: number;
    durationMs?: number;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
    };
    messageTokens?: number;
    [key: string]: unknown;
  }>;
  context: Record<string, unknown>;
  checkpoints: Array<unknown>;
}

/**
 * Metrics collected during evaluation
 */
export interface EvalMetrics {
  /** Total turns taken */
  turns: number;
  /** Total tokens used */
  tokens: { input: number; output: number };
  /** Total cost in USD */
  costUSD: number;
  /** Total duration in ms */
  durationMs: number;
  /** Time to first token */
  ttftMs: number;
  /** Number of tool calls */
  toolCallCount: number;
  /** Number of errors */
  errorCount: number;
  /** Compaction events */
  compactionCount: number;
  /** Efficiency ratio: actual/ideal steps */
  efficiencyRatio?: number;
}

// ============================================
// EVALUATION SUITE TYPES
// ============================================

/**
 * Collection of related tasks
 */
export interface EvalSuite {
  /** Suite identifier */
  id: string;
  /** Suite name */
  name: string;
  /** Description */
  description: string;
  /** Suite type */
  type: EvaluationType;
  /** Tasks in this suite */
  tasks: EvalTask[];
  /** Suite configuration */
  config: EvalSuiteConfig;
}

/**
 * Suite configuration
 */
export interface EvalSuiteConfig {
  /** Number of trials per task (for non-determinism) */
  trialsPerTask?: number;
  /** Whether to run in parallel */
  parallel?: boolean;
  /** Maximum concurrent tasks */
  maxConcurrent?: number;
  /** Timeout per task in ms */
  timeoutMs?: number;
  /** Whether to capture traces */
  captureTraces?: boolean;
  /** Whether to persist results */
  persistResults?: boolean;
  /** Output directory for results */
  outputDir?: string;
}

/**
 * Suite execution result
 */
export interface EvalSuiteResult {
  /** Suite that was run */
  suiteId: string;
  /** Overall pass rate */
  passRate: number;
  /** Average score */
  avgScore: number;
  /** Individual task results */
  taskResults: EvalResult[];
  /** Aggregated metrics */
  aggregatedMetrics: {
    totalCost: number;
    totalDuration: number;
    totalTokens: { input: number; output: number };
    avgTurns: number;
    avgToolCalls: number;
    errorRate: number;
  };
  /** Execution timestamp */
  timestamp: number;
  /** Git commit hash */
  commitHash?: string;
  /** Model version */
  model: string;
  /** Suite-level telemetry (if collection enabled) */
  telemetry?: import("./telemetry/types.js").SuiteTelemetry;
}

// ============================================
// GRADER TYPES
// ============================================

/**
 * Grader type
 */
export type GraderType = "code-based" | "llm-judge" | "human" | "pairwise";

/**
 * Grader configuration
 */
export interface GraderConfig {
  /** Grader type */
  type: GraderType;
  /** Grader name/identifier */
  name: string;
  /** For LLM judge: model to use */
  model?: string;
  /** For LLM judge: system prompt */
  systemPrompt?: string;
  /** For LLM judge: temperature */
  temperature?: number;
  /** Timeout in ms */
  timeoutMs?: number;
  /** Whether to include reasoning in output */
  includeReasoning?: boolean;
}

/**
 * Grader function signature
 */
export type GraderFunction = (
  task: EvalTask,
  result: AgentLoopResult,
  trace: EvalTrace
) => Promise<CriterionResult>;

// ============================================
// ZOD SCHEMAS
// ============================================

export const ConditionOperatorSchema = z.enum([
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "matches",
  "matches_any",
  "contains_any",
  "sequence",
  "count",
  "count_min",
  "count_max",
  "greater_than",
  "less_than",
  "exists",
  "not_exists",
  "is_valid_json",
  "is_valid_typescript",
  "file_exists",
  "file_contains",
]);

export const SuccessTargetSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("final_response") }),
  z.object({ type: z.literal("tool_call"), toolName: z.string().optional(), index: z.number().optional() }),
  z.object({ type: z.literal("tool_calls") }),
  z.object({ type: z.literal("tool_calls_sequence") }),
  z.object({ type: z.literal("tool_call_count") }),
  z.object({ type: z.literal("tool_result"), toolId: z.string().optional() }),
  z.object({ type: z.literal("file_path"), path: z.string() }),
  z.object({ type: z.literal("file_content"), path: z.string() }),
  z.object({ type: z.literal("file_changes") }),
  z.object({ type: z.literal("state_change"), key: z.string() }),
  z.object({ type: z.literal("state_changes") }),
  z.object({ type: z.literal("error_count") }),
  z.object({ type: z.literal("trajectory"), pathPattern: z.string() }),
  z.object({ type: z.literal("metric"), name: z.string() }),
  z.object({ type: z.literal("fsm_state") }),
  z.object({ type: z.literal("custom"), evaluator: z.string() }),
]);

export const SuccessCriterionSchema = z.object({
  id: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  target: SuccessTargetSchema,
  condition: z.union([ConditionOperatorSchema, z.object({ operator: ConditionOperatorSchema })]),
  expected: z.union([z.string(), z.number(), z.boolean(), z.object({})]).optional(),
  weight: z.number().default(1),
  required: z.boolean().default(true),
  priority: z.number().optional(),
});

export const SuccessCriteriaConfigSchema = z.object({
  criteria: z.array(SuccessCriterionSchema),
  aggregation: z.enum(["all", "any", "weighted_average", "custom"]),
  passingThreshold: z.number().optional(),
  customAggregator: z.string().optional(),
});

export const EvaluationLevelSchema = z.enum(["run", "trace", "thread"]);
export const EvaluationTypeSchema = z.enum(["capability", "regression"]);
export const AgentTypeSchema = z.enum(["coding", "conversational", "research", "general"]);
export const TaskDifficultySchema = z.enum(["trivial", "easy", "medium", "hard", "expert"]);

export const EvalTaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  level: EvaluationLevelSchema,
  type: EvaluationTypeSchema,
  agentType: AgentTypeSchema,
  difficulty: TaskDifficultySchema.optional(),
  input: z.custom<EvalTaskInput>(),
  successCriteria: SuccessCriteriaConfigSchema,
  referenceSolution: z.custom<ReferenceSolution>().optional(),
  metadata: z.object({
    tags: z.array(z.string()).optional(),
    source: z.enum(["handwritten", "dogfood", "benchmark", "production", "session-derived"]).optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    author: z.string().optional(),
    version: z.string().optional(),
  }).optional(),
});

export const EvalSuiteSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: EvaluationTypeSchema,
  tasks: z.array(EvalTaskSchema),
  config: z.object({
    trialsPerTask: z.number().default(1),
    parallel: z.boolean().default(false),
    maxConcurrent: z.number().default(1),
    timeoutMs: z.number().default(120000),
    captureTraces: z.boolean().default(true),
    persistResults: z.boolean().default(true),
    outputDir: z.string().optional(),
  }),
});

// All types are already exported above with their interface definitions
// No additional re-exports needed
