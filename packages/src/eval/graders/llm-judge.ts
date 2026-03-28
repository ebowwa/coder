/**
 * LLM-as-Judge Grader - Subjective evaluation using LLM
 *
 * Implements LLM-based grading for:
 * - Code quality assessment
 * - Response helpfulness
 * - Task completion quality
 * - Trajectory evaluation
 *
 * @module eval/graders/llm-judge
 */

import type {
  SuccessCriterion,
  CriterionResult,
  EvalTask,
  EvalTrace,
  GraderConfig,
} from "../types.js";
import type { AgentLoopResult } from "../../schemas/agent-loop.zod.js";
import type { TextBlock } from "../../schemas/index.js";
import { createMessageStream } from "../../core/api-client-impl.js";

// ============================================
// JUDGE PROMPTS
// ============================================

const DEFAULT_JUDGE_SYSTEM_PROMPT = `You are an expert code evaluator. Your job is to evaluate AI-generated code and responses.

Evaluate the output on these dimensions:
1. **Correctness**: Does the code do what was asked?
2. **Quality**: Is the code well-structured, readable, and follows best practices?
3. **Completeness**: Did the AI complete the full task?
4. **Safety**: Does the code avoid security vulnerabilities?

You MUST respond with ONLY a valid JSON object in this exact format:
{
  "passed": true | false,
  "score": 0.0 - 1.0,
  "reasoning": "Brief explanation of the score",
  "criteria": {
    "correctness": 0.0 - 1.0,
    "quality": 0.0 - 1.0,
    "completeness": 0.0 - 1.0,
    "safety": 0.0 - 1.0
  }
}

Be strict but fair. A score of 0.7+ indicates acceptable quality.`;

const TRAJECTORY_JUDGE_PROMPT = `You are an expert AI agent evaluator. Your job is to evaluate the trajectory (execution path) an AI agent took to complete a task.

Evaluate the trajectory on these dimensions:
1. **Efficiency**: Did the agent take unnecessary steps?
2. **Tool Selection**: Did the agent choose appropriate tools?
3. **Error Recovery**: How did the agent handle errors?
4. **Progress**: Did the agent make steady progress?

You MUST respond with ONLY a valid JSON object in this exact format:
{
  "passed": true | false,
  "score": 0.0 - 1.0,
  "reasoning": "Brief explanation of the score",
  "criteria": {
    "efficiency": 0.0 - 1.0,
    "tool_selection": 0.0 - 1.0,
    "error_recovery": 0.0 - 1.0,
    "progress": 0.0 - 1.0
  }
}

A valid trajectory doesn't need to be optimal, just reasonable.`;

// ============================================
// TYPES
// ============================================

export interface LLMJudgeResult {
  passed: boolean;
  score: number;
  reasoning: string;
  criteria: Record<string, number>;
}

export interface LLMJudgeConfig extends GraderConfig {
  type: "llm-judge";
  model: string;
  apiKey: string;
  baseUrl?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  includeReasoning?: boolean;
}

// ============================================
// JUDGE FUNCTIONS
// ============================================

/**
 * Extract text content from agent result
 */
function extractFinalResponse(result: AgentLoopResult): string {
  // Get last assistant message
  const messages = result.messages;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg?.role === "assistant" && Array.isArray(msg.content)) {
      const textContent = msg.content
        .filter((b): b is TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      return textContent;
    }
  }
  return "";
}

/**
 * Format trace for evaluation
 */
function formatTraceForJudge(trace: EvalTrace): string {
  const parts: string[] = [];

  parts.push("## State Transitions");
  parts.push(
    trace.stateTransitions
      .map((t) => `${t.from} → ${t.to} (${new Date(t.timestamp).toISOString()})`)
      .join("\n")
  );

  parts.push("\n## Tool Calls");
  parts.push(
    trace.toolCalls
      .map((tc) => `- ${tc.name}: ${tc.success ? "✓" : "✗"}`)
      .join("\n")
  );

  if (trace.fileChanges.length > 0) {
    parts.push("\n## File Changes");
    parts.push(
      trace.fileChanges
        .map((fc) => `- ${fc.action}: ${fc.path}`)
        .join("\n")
    );
  }

  if (trace.error) {
    parts.push("\n## Error");
    parts.push(`${trace.error.message}`);
  }

  return parts.join("\n");
}

/**
 * Run LLM judge evaluation
 */
export async function runLLMJudge(
  config: LLMJudgeConfig,
  task: EvalTask,
  result: AgentLoopResult,
  trace: EvalTrace
): Promise<LLMJudgeResult> {
  const systemPrompt = config.systemPrompt ?? DEFAULT_JUDGE_SYSTEM_PROMPT;
  const finalResponse = extractFinalResponse(result);
  const traceSummary = formatTraceForJudge(trace);

  const userPrompt = `## Task
${task.description}

## Expected Success Criteria
${task.successCriteria.criteria.map((c) => `- ${c.description}`).join("\n")}

## Agent Output
\`\`\`
${finalResponse.slice(0, 4000)}
\`\`\`

## Execution Trace
${traceSummary}

Evaluate this output.`;

  let responseText = "";

  try {
    await createMessageStream(
      [
        { role: "user", content: systemPrompt },
        { role: "assistant", content: "I will evaluate the output and respond with JSON." },
        { role: "user", content: userPrompt },
      ],
      {
        model: config.model,
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        maxTokens: config.maxTokens ?? 500,
        onToken: (token) => {
          responseText += token;
        },
      }
    );

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as LLMJudgeResult;
      return {
        passed: parsed.passed ?? parsed.score >= 0.7,
        score: parsed.score ?? 0,
        reasoning: parsed.reasoning ?? "",
        criteria: parsed.criteria ?? {},
      };
    }

    // Fallback if no JSON found
    return {
      passed: false,
      score: 0,
      reasoning: `Failed to parse LLM judge response: ${responseText.slice(0, 200)}`,
      criteria: {},
    };
  } catch (error) {
    return {
      passed: false,
      score: 0,
      reasoning: `LLM judge error: ${(error as Error).message}`,
      criteria: {},
    };
  }
}

/**
 * Evaluate trajectory using LLM judge
 */
export async function evaluateTrajectory(
  config: LLMJudgeConfig,
  task: EvalTask,
  trace: EvalTrace
): Promise<LLMJudgeResult> {
  const systemPrompt = TRAJECTORY_JUDGE_PROMPT;
  const traceSummary = formatTraceForJudge(trace);

  const userPrompt = `## Task
${task.description}

## Execution Trajectory
${traceSummary}

Evaluate the agent's trajectory.`;

  let responseText = "";

  try {
    await createMessageStream(
      [
        { role: "user", content: systemPrompt },
        { role: "assistant", content: "I will evaluate the trajectory and respond with JSON." },
        { role: "user", content: userPrompt },
      ],
      {
        model: config.model,
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        maxTokens: 500,
        onToken: (token) => {
          responseText += token;
        },
      }
    );

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as LLMJudgeResult;
      return {
        passed: parsed.passed ?? parsed.score >= 0.7,
        score: parsed.score ?? 0,
        reasoning: parsed.reasoning ?? "",
        criteria: parsed.criteria ?? {},
      };
    }

    return {
      passed: false,
      score: 0,
      reasoning: `Failed to parse trajectory evaluation: ${responseText.slice(0, 200)}`,
      criteria: {},
    };
  } catch (error) {
    return {
      passed: false,
      score: 0,
      reasoning: `Trajectory evaluation error: ${(error as Error).message}`,
      criteria: {},
    };
  }
}

/**
 * Create criterion result from LLM judge result
 */
export async function evaluateCriterionWithLLM(
  criterion: SuccessCriterion,
  config: LLMJudgeConfig,
  task: EvalTask,
  result: AgentLoopResult,
  trace: EvalTrace
): Promise<CriterionResult> {
  const start = Date.now();

  const judgeResult = await runLLMJudge(config, task, result, trace);

  return {
    criterionId: criterion.id,
    passed: judgeResult.passed,
    reason: judgeResult.reasoning,
    actual: judgeResult.score,
    expected: criterion.expected ?? "quality score >= 0.7",
    durationMs: Date.now() - start,
  };
}

// ============================================
// CALIBRATION SUPPORT
// ============================================

export interface CalibrationExample {
  task: EvalTask;
  result: AgentLoopResult;
  trace: EvalTrace;
  humanLabel: {
    passed: boolean;
    score: number;
    reasoning: string;
  };
}

/**
 * Calculate calibration metrics
 */
export function calculateCalibration(
  predictions: Array<{ predicted: number; actual: number }>
): {
  mae: number; // Mean absolute error
  correlation: number; // Pearson correlation
  accuracy: number; // Binary accuracy at 0.7 threshold
} {
  if (predictions.length === 0) {
    return { mae: 0, correlation: 0, accuracy: 0 };
  }

  // MAE
  const mae =
    predictions.reduce((sum, p) => sum + Math.abs(p.predicted - p.actual), 0) /
    predictions.length;

  // Pearson correlation
  const meanPred = predictions.reduce((s, p) => s + p.predicted, 0) / predictions.length;
  const meanActual = predictions.reduce((s, p) => s + p.actual, 0) / predictions.length;

  let num = 0;
  let denPred = 0;
  let denActual = 0;

  for (const p of predictions) {
    const diffPred = p.predicted - meanPred;
    const diffActual = p.actual - meanActual;
    num += diffPred * diffActual;
    denPred += diffPred * diffPred;
    denActual += diffActual * diffActual;
  }

  const correlation = num / Math.sqrt(denPred * denActual) || 0;

  // Binary accuracy
  const accuracy =
    predictions.filter(
      (p) => (p.predicted >= 0.7) === (p.actual >= 0.7)
    ).length / predictions.length;

  return { mae, correlation, accuracy };
}

// ============================================
// EXPORTS
// ============================================

export {
  DEFAULT_JUDGE_SYSTEM_PROMPT,
  TRAJECTORY_JUDGE_PROMPT,
};
