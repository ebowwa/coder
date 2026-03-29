/**
 * Thread-Level Evaluation Runner - Multi-turn conversation evaluation
 *
 * Implements N-1 testing pattern:
 * 1. Extract conversation prefix (first N-1 turns) from session
 * 2. Let agent generate final turn
 * 3. Compare against expected final turn using thread-level graders
 *
 * Evaluation dimensions:
 * - Context retention: Does agent remember earlier context?
 * - Task completion: Does agent complete multi-step tasks?
 * - Conversation coherence: Are responses coherent across turns?
 * - Error recovery: Does agent recover from errors?
 * - Tool efficiency: Are tools used efficiently across turns?
 *
 * @module eval/runners/thread
 */

import { homedir } from "os";
import { join } from "path";
import type {
  EvalTask,
  EvalResult,
  EvalTrace,
  EvalMetrics,
  ThreadLevelInput,
  SuccessCriteriaConfig,
  CriterionResult,
} from "../types.js";
import type {
  LoadedSession,
  SessionEntry,
  SessionMetadata,
  SessionToolUse,
} from "../../schemas/sessions.zod.js";
import type { Message } from "../../schemas/api.zod.js";
import { evaluateCriteria } from "../graders/code-based.js";
import { runLLMJudge, type LLMJudgeConfig, evaluateTrajectory } from "../graders/llm-judge.js";
import {
  loadSession,
  listSessions,
  sessionToTrace,
  sessionToAgentLoopResult,
} from "./offline.js";
import { createMessageStream } from "../../core/api-client-impl.js";

// ============================================
// THREAD EVALUATION TYPES
// ============================================

/**
 * Thread evaluation dimension
 */
export type ThreadEvalDimension =
  | "context_retention"
  | "task_completion"
  | "conversation_coherence"
  | "error_recovery"
  | "tool_efficiency"
  | "goal_alignment";

/**
 * Extracted thread from a session for N-1 testing
 */
export interface ThreadTask {
  /** Unique task ID */
  id: string;
  /** Source session ID */
  sessionId: string;
  /** Session metadata */
  metadata: SessionMetadata;

  /** Conversation prefix (first N-1 turns) */
  prefix: Message[];
  /** Tool uses in the prefix */
  prefixToolUses: SessionToolUse[];

  /** Expected final turn (the Nth turn to predict) */
  expectedTurn: Message;
  /** Expected tool uses in final turn */
  expectedToolUses: SessionToolUse[];

  /** Human-provided evaluation criteria */
  evaluationCriteria?: string;
  /** Tags for categorization */
  tags: string[];
  /** Difficulty level (1-5) */
  difficulty?: number;
  /** Category/domain */
  category?: string;
}

/**
 * Result of thread evaluation
 */
export interface ThreadEvalResult extends EvalResult {
  /** Thread task that was evaluated */
  threadTask: ThreadTask;

  /** Predicted final turn from agent */
  predictedTurn: Message;
  /** Predicted tool uses */
  predictedToolUses: SessionToolUse[];

  /** Dimension scores */
  dimensionScores: Record<ThreadEvalDimension, number>;

  /** Context retention analysis */
  contextAnalysis?: {
    /** Key facts from prefix */
    keyFacts: string[];
    /** Facts retained in prediction */
    retainedFacts: string[];
    /** Facts forgotten in prediction */
    forgottenFacts: string[];
    /** Retention score (0-1) */
    retentionScore: number;
  };

  /** Conversation flow analysis */
  flowAnalysis?: {
    /** Number of turns */
    turnCount: number;
    /** Topic consistency score (0-1) */
    topicConsistency: number;
    /** Response coherence score (0-1) */
    coherenceScore: number;
  };
}

/**
 * Configuration for thread evaluation
 */
export interface ThreadEvalConfig {
  /** API key for running agent */
  apiKey: string;
  /** Model to use */
  model: string;
  /** Base URL for API */
  baseUrl?: string;
  /** Sessions directory */
  sessionsDir?: string;
  /** Working directory */
  workingDir?: string;
  /** LLM judge config */
  llmJudge?: LLMJudgeConfig;
  /** Dimensions to evaluate */
  dimensions?: ThreadEvalDimension[];
  /** Timeout per thread (ms) */
  timeoutMs?: number;
  /** Whether to run agent or just grade existing sessions */
  runAgent?: boolean;
  /** Maximum turns to include in prefix */
  maxPrefixTurns?: number;
  /** Minimum turns required */
  minTurns?: number;
  /** Debug mode */
  debug?: boolean;
}

/**
 * Configuration for dataset construction
 */
export interface ThreadDatasetConfig {
  /** Sessions directory */
  sessionsDir?: string;
  /** Minimum turns required */
  minTurns?: number;
  /** Maximum turns to include */
  maxTurns?: number;
  /** Filter by model */
  model?: string;
  /** Filter by working directory */
  workingDirectory?: string;
  /** Only include sessions with errors */
  withErrorsOnly?: boolean;
  /** Only include sessions with tools */
  withToolsOnly?: boolean;
  /** Random sample size */
  sampleSize?: number;
  /** Default tags */
  defaultTags?: string[];
}

// ============================================
// THREAD EXTRACTION
// ============================================

/**
 * Extract a thread task from a loaded session
 * Uses N-1 pattern: prefix is first N-1 turns, expected is last turn
 */
export function extractThreadTask(
  session: LoadedSession,
  options?: { maxPrefixTurns?: number; defaultTags?: string[] }
): ThreadTask | null {
  const messages = session.messages;
  const tools = session.tools;

  // Need at least 2 user messages (for prefix + final turn)
  const userMessages = messages.filter((m) => m.role === "user");
  if (userMessages.length < 2) {
    return null;
  }

  // Find turn boundaries (user messages mark new turns)
  const turnBoundaries: number[] = [];
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === "user") {
      turnBoundaries.push(i);
    }
  }

  // If we have N turns, use first N-1 as prefix
  const lastTurnStart = turnBoundaries[turnBoundaries.length - 1];
  if (lastTurnStart === 0) {
    return null; // Only one turn
  }

  // Split into prefix and expected
  const prefixMessages = messages.slice(0, lastTurnStart);
  const expectedMessages = messages.slice(lastTurnStart);

  // Get corresponding tool uses
  const lastMessageTime = (expectedMessages[0] as { timestamp?: number })?.timestamp ?? 0;
  const prefixToolUses = tools.filter((t) => t.timestamp < lastMessageTime);
  const expectedToolUses = tools.filter((t) => t.timestamp >= lastMessageTime);

  // Determine difficulty based on complexity
  const difficulty = calculateDifficulty(prefixMessages, prefixToolUses);

  // Determine category from working directory or content
  const category = inferCategory(session.metadata.workingDirectory, prefixMessages);

  return {
    id: `thread-${session.metadata.id}`,
    sessionId: session.metadata.id,
    metadata: session.metadata,
    prefix: prefixMessages,
    prefixToolUses,
    expectedTurn: expectedMessages[0] as Message,
    expectedToolUses,
    tags: options?.defaultTags ?? [],
    difficulty,
    category,
  };
}

/**
 * Calculate difficulty based on complexity
 */
function calculateDifficulty(messages: Message[], tools: SessionToolUse[]): number {
  // Factors that increase difficulty:
  // - More turns
  // - More tools
  // - File modifications
  // - Error handling

  const turnCount = messages.filter((m) => m.role === "user").length;
  const toolCount = tools.length;
  const errorCount = tools.filter((t) => t.isError).length;
  const fileOps = tools.filter((t) =>
    ["Write", "Edit", "Read", "Glob", "Grep"].includes(t.toolName)
  ).length;

  let score = 0;
  score += Math.min(turnCount * 0.5, 2); // Max 2 for turns
  score += Math.min(toolCount * 0.2, 2); // Max 2 for tools
  score += Math.min(errorCount * 0.5, 1); // Max 1 for errors
  score += Math.min(fileOps * 0.1, 1); // Max 1 for file ops

  return Math.min(Math.round(score) + 1, 5); // Scale to 1-5
}

/**
 * Infer category from working directory and content
 */
function inferCategory(
  workingDir: string,
  messages: Message[]
): string {
  if (workingDir.includes("mcp") || workingDir.includes("MCP")) {
    return "mcp";
  }
  if (workingDir.includes("test") || workingDir.includes("__tests__")) {
    return "testing";
  }
  if (workingDir.includes("docs") || workingDir.includes("README")) {
    return "documentation";
  }
  if (workingDir.includes("src")) {
    return "development";
  }
  return "general";
}

/**
 * Build a thread dataset from sessions
 */
export async function buildThreadDataset(
  config: ThreadDatasetConfig
): Promise<ThreadTask[]> {
  const sessionsDir = config.sessionsDir ?? join(homedir(), ".claude", "sessions");
  const sessionIds = await listSessions(sessionsDir);
  const tasks: ThreadTask[] = [];

  const minTurns = config.minTurns ?? 2;
  const maxTurns = config.maxTurns ?? 20;

  for (const sessionId of sessionIds) {
    const session = await loadSession(sessionId, sessionsDir);
    if (!session) continue;

    // Apply filters
    const messageCount = session.messages.filter((m) => m.role === "user").length;
    if (messageCount < minTurns || messageCount > maxTurns) continue;

    if (config.model && session.metadata.model !== config.model) continue;

    if (config.workingDirectory &&
        !session.metadata.workingDirectory.includes(config.workingDirectory)) {
      continue;
    }

    if (config.withErrorsOnly && !session.tools.some((t) => t.isError)) {
      continue;
    }

    if (config.withToolsOnly && session.tools.length === 0) {
      continue;
    }

    const task = extractThreadTask(session, { defaultTags: config.defaultTags });
    if (task) {
      tasks.push(task);
    }
  }

  // Apply sampling if specified
  if (config.sampleSize && config.sampleSize < tasks.length) {
    // Simple random sample (could use seeded random for reproducibility)
    const shuffled = tasks.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, config.sampleSize);
  }

  return tasks;
}

// ============================================
// THREAD-LEVEL GRADERS
// ============================================

/**
 * Evaluate context retention
 */
async function evaluateContextRetention(
  task: ThreadTask,
  predictedTurn: Message,
  config: ThreadEvalConfig
): Promise<{ score: number; analysis: ThreadEvalResult["contextAnalysis"] }> {
  // Extract key facts from prefix
  const prefixText = task.prefix
    .map((m) => {
      if (typeof m.content === "string") return m.content;
      if (Array.isArray(m.content)) {
        return m.content
          .filter((b): b is { type: "text"; text: string } => b.type === "text")
          .map((b) => b.text)
          .join("\n");
      }
      return "";
    })
    .join("\n");

  const predictedText =
    typeof predictedTurn.content === "string"
      ? predictedTurn.content
      : Array.isArray(predictedTurn.content)
        ? predictedTurn.content
            .filter((b): b is { type: "text"; text: string } => b.type === "text")
            .map((b) => b.text)
            .join("\n")
        : "";

  // Use LLM to evaluate context retention
  const prompt = `Analyze whether the agent's response retains context from the conversation.

## Conversation Context (First N-1 Turns)
${prefixText.slice(0, 4000)}

## Agent's Response (Predicted Final Turn)
${predictedText.slice(0, 2000)}

## Task
Extract 3-5 key facts from the conversation context and check if they are addressed/retained in the response.

Return JSON:
{
  "keyFacts": ["fact1", "fact2", ...],
  "retainedFacts": ["fact1", ...],
  "forgottenFacts": ["fact2", ...],
  "retentionScore": 0.0-1.0
}`;

  try {
    let response = "";
    await createMessageStream(
      [{ role: "user", content: prompt }],
      {
        model: config.model,
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        maxTokens: 500,
        onToken: (token) => {
          response += token;
        },
      }
    );

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as {
        keyFacts: string[];
        retainedFacts: string[];
        forgottenFacts: string[];
        retentionScore: number;
      };
      return {
        score: parsed.retentionScore,
        analysis: {
          keyFacts: parsed.keyFacts,
          retainedFacts: parsed.retainedFacts,
          forgottenFacts: parsed.forgottenFacts,
          retentionScore: parsed.retentionScore,
        },
      };
    }
  } catch (error) {
    if (config.debug) {
      console.error("[ThreadEval] Context retention error:", error);
    }
  }

  return { score: 0.5, analysis: undefined };
}

/**
 * Evaluate task completion across turns
 */
async function evaluateTaskCompletion(
  task: ThreadTask,
  predictedTurn: Message,
  predictedToolUses: SessionToolUse[],
  config: ThreadEvalConfig
): Promise<number> {
  // Check if expected tools were used
  const expectedToolNames = task.expectedToolUses.map((t) => t.toolName);
  const predictedToolNames = predictedToolUses.map((t) => t.toolName);

  // Calculate overlap
  let matchedTools = 0;
  for (const expected of expectedToolNames) {
    if (predictedToolNames.includes(expected)) {
      matchedTools++;
    }
  }

  const toolScore = expectedToolNames.length > 0
    ? matchedTools / expectedToolNames.length
    : 1;

  // Check if response addresses the expected content
  const expectedText =
    typeof task.expectedTurn.content === "string"
      ? task.expectedTurn.content
      : Array.isArray(task.expectedTurn.content)
        ? task.expectedTurn.content
            .filter((b): b is { type: "text"; text: string } => b.type === "text")
            .map((b) => b.text)
            .join("\n")
        : "";

  const predictedText =
    typeof predictedTurn.content === "string"
      ? predictedTurn.content
      : Array.isArray(predictedTurn.content)
        ? predictedTurn.content
            .filter((b): b is { type: "text"; text: string } => b.type === "text")
            .map((b) => b.text)
            .join("\n")
        : "";

  // Simple keyword overlap for content matching
  const expectedKeywords = extractKeywords(expectedText);
  const predictedKeywords = new Set(extractKeywords(predictedText));

  let keywordMatches = 0;
  for (const kw of expectedKeywords) {
    if (predictedKeywords.has(kw)) {
      keywordMatches++;
    }
  }

  const contentScore = expectedKeywords.length > 0
    ? keywordMatches / expectedKeywords.length
    : 1;

  // Weighted average
  return toolScore * 0.4 + contentScore * 0.6;
}

/**
 * Extract significant keywords from text
 */
function extractKeywords(text: string): string[] {
  // Simple keyword extraction (could be improved with NLP)
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "must", "shall", "can", "need", "dare",
    "to", "of", "in", "for", "on", "with", "at", "by", "from", "as",
    "into", "through", "during", "before", "after", "above", "below",
    "this", "that", "these", "those", "i", "you", "he", "she", "it",
    "we", "they", "what", "which", "who", "whom", "whose", "where",
    "when", "why", "how", "all", "each", "every", "both", "few",
    "more", "most", "other", "some", "such", "no", "nor", "not",
    "only", "own", "same", "so", "than", "too", "very", "just",
    "and", "but", "or", "if", "then", "else", "when", "up", "down",
    "let", "me", "my", "your", "use", "using", "used",
  ]);

  const words = text.toLowerCase().split(/\W+/);
  const keywords: string[] = [];

  for (const word of words) {
    if (word.length > 3 && !stopWords.has(word)) {
      keywords.push(word);
    }
  }

  // Return unique keywords, limited to top 20
  return [...new Set(keywords)].slice(0, 20);
}

/**
 * Evaluate conversation coherence
 */
async function evaluateCoherence(
  task: ThreadTask,
  predictedTurn: Message,
  config: ThreadEvalConfig
): Promise<{ score: number; analysis: ThreadEvalResult["flowAnalysis"] }> {
  const turnCount = task.prefix.filter((m) => m.role === "user").length + 1;

  // Simple coherence heuristics
  const predictedText =
    typeof predictedTurn.content === "string"
      ? predictedTurn.content
      : Array.isArray(predictedTurn.content)
        ? predictedTurn.content
            .filter((b): b is { type: "text"; text: string } => b.type === "text")
            .map((b) => b.text)
            .join("\n")
        : "";

  // Check for coherence indicators
  const coherenceIndicators = [
    // References to previous context
    /\b(as (I|we) (mentioned|discussed|said))\b/i,
    /\b(previously|earlier|above)\b/i,
    /\b(to (continue|follow up|build on))\b/i,
    // Logical connectors
    /\b(therefore|thus|so|hence|accordingly)\b/i,
    /\b(however|but|although|while)\b/i,
    /\b(furthermore|moreover|additionally)\b/i,
    // Task progress markers
    /\b(now|next|then|finally)\b/i,
    /\b(step \d|phase \d)\b/i,
  ];

  let coherenceScore = 0.5; // Base score

  for (const pattern of coherenceIndicators) {
    if (pattern.test(predictedText)) {
      coherenceScore += 0.1;
    }
  }

  // Cap at 1.0
  coherenceScore = Math.min(coherenceScore, 1.0);

  // Topic consistency - check if predicted turn relates to last user message
  const lastUserMessage = task.prefix.filter((m) => m.role === "user").pop();
  if (lastUserMessage) {
    const lastUserText =
      typeof lastUserMessage.content === "string"
        ? lastUserMessage.content
        : Array.isArray(lastUserMessage.content)
          ? lastUserMessage.content
              .filter((b): b is { type: "text"; text: string } => b.type === "text")
              .map((b) => b.text)
              .join("\n")
          : "";

    const lastKeywords = new Set(extractKeywords(lastUserText));
    const predictedKeywords = new Set(extractKeywords(predictedText));

    let matches = 0;
    for (const kw of lastKeywords) {
      if (predictedKeywords.has(kw)) {
        matches++;
      }
    }

    const topicConsistency = lastKeywords.size > 0 ? matches / lastKeywords.size : 0.5;
    coherenceScore = coherenceScore * 0.6 + topicConsistency * 0.4;
  }

  return {
    score: coherenceScore,
    analysis: {
      turnCount,
      topicConsistency: coherenceScore,
      coherenceScore,
    },
  };
}

/**
 * Evaluate error recovery (if session had errors)
 */
async function evaluateErrorRecovery(
  task: ThreadTask,
  predictedTurn: Message,
  config: ThreadEvalConfig
): Promise<number> {
  const hasErrors = task.prefixToolUses.some((t) => t.isError);

  if (!hasErrors) {
    return 1; // No errors to recover from
  }

  // Check if predicted turn acknowledges/handles errors
  const predictedText =
    typeof predictedTurn.content === "string"
      ? predictedTurn.content
      : Array.isArray(predictedTurn.content)
        ? predictedTurn.content
            .filter((b): b is { type: "text"; text: string } => b.type === "text")
            .map((b) => b.text)
            .join("\n")
        : "";

  const errorHandlingIndicators = [
    /\b(error|failed|mistake|wrong|issue|problem)\b/i,
    /\b(fix|resolve|correct|retry|alternative)\b/i,
    /\b(let me (try|attempt|fix))\b/i,
    /\b(sorry|apologize|my apologies)\b/i,
  ];

  let score = 0;
  for (const pattern of errorHandlingIndicators) {
    if (pattern.test(predictedText)) {
      score += 0.25;
    }
  }

  return Math.min(score, 1);
}

/**
 * Evaluate tool efficiency across turns
 */
function evaluateToolEfficiency(
  task: ThreadTask,
  predictedToolUses: SessionToolUse[]
): number {
  const expectedCount = task.expectedToolUses.length;
  const predictedCount = predictedToolUses.length;

  if (expectedCount === 0 && predictedCount === 0) {
    return 1; // Both used no tools efficiently
  }

  if (expectedCount === 0) {
    return 0.5; // Used tools when none expected
  }

  // Efficiency = similarity in tool count (not too many, not too few)
  const ratio = predictedCount / expectedCount;
  if (ratio >= 0.8 && ratio <= 1.2) {
    return 1; // Very close
  } else if (ratio >= 0.5 && ratio <= 2) {
    return 0.7; // Acceptable
  } else {
    return 0.4; // Too many or too few
  }
}

/**
 * Evaluate goal alignment
 */
async function evaluateGoalAlignment(
  task: ThreadTask,
  predictedTurn: Message,
  config: ThreadEvalConfig
): Promise<number> {
  // Check if the predicted turn stays aligned with the original goal
  const firstUserMessage = task.prefix.find((m) => m.role === "user");
  if (!firstUserMessage) return 0.5;

  const goalText =
    typeof firstUserMessage.content === "string"
      ? firstUserMessage.content
      : Array.isArray(firstUserMessage.content)
        ? firstUserMessage.content
            .filter((b): b is { type: "text"; text: string } => b.type === "text")
            .map((b) => b.text)
            .join("\n")
        : "";

  const predictedText =
    typeof predictedTurn.content === "string"
      ? predictedTurn.content
      : Array.isArray(predictedTurn.content)
        ? predictedTurn.content
            .filter((b): b is { type: "text"; text: string } => b.type === "text")
            .map((b) => b.text)
            .join("\n")
        : "";

  // Keyword overlap for goal alignment
  const goalKeywords = new Set(extractKeywords(goalText));
  const predictedKeywords = new Set(extractKeywords(predictedText));

  if (goalKeywords.size === 0) return 0.5;

  let matches = 0;
  for (const kw of goalKeywords) {
    if (predictedKeywords.has(kw)) {
      matches++;
    }
  }

  return matches / goalKeywords.size;
}

// ============================================
// THREAD EVALUATION RUNNER
// ============================================

/**
 * Run thread-level evaluation on a single task
 */
export async function evaluateThreadTask(
  task: ThreadTask,
  config: ThreadEvalConfig
): Promise<ThreadEvalResult> {
  const startTime = Date.now();
  const dimensions = config.dimensions ?? [
    "context_retention",
    "task_completion",
    "conversation_coherence",
    "tool_efficiency",
    "goal_alignment",
  ];

  let predictedTurn: Message;
  let predictedToolUses: SessionToolUse[];

  if (config.runAgent) {
    // Run the agent with the prefix to get prediction
    const result = await runAgentForThread(task, config);
    predictedTurn = result.message;
    predictedToolUses = result.toolUses;
  } else {
    // Use the expected turn as prediction (offline evaluation)
    predictedTurn = task.expectedTurn;
    predictedToolUses = task.expectedToolUses;
  }

  // Evaluate dimensions
  const dimensionScores: Record<ThreadEvalDimension, number> = {
    context_retention: 0,
    task_completion: 0,
    conversation_coherence: 0,
    error_recovery: 0,
    tool_efficiency: 0,
    goal_alignment: 0,
  };

  let contextAnalysis: ThreadEvalResult["contextAnalysis"];
  let flowAnalysis: ThreadEvalResult["flowAnalysis"];

  // Run dimension evaluations
  if (dimensions.includes("context_retention")) {
    const result = await evaluateContextRetention(task, predictedTurn, config);
    dimensionScores.context_retention = result.score;
    contextAnalysis = result.analysis;
  }

  if (dimensions.includes("task_completion")) {
    dimensionScores.task_completion = await evaluateTaskCompletion(
      task,
      predictedTurn,
      predictedToolUses,
      config
    );
  }

  if (dimensions.includes("conversation_coherence")) {
    const result = await evaluateCoherence(task, predictedTurn, config);
    dimensionScores.conversation_coherence = result.score;
    flowAnalysis = result.analysis;
  }

  if (dimensions.includes("error_recovery")) {
    dimensionScores.error_recovery = await evaluateErrorRecovery(task, predictedTurn, config);
  }

  if (dimensions.includes("tool_efficiency")) {
    dimensionScores.tool_efficiency = evaluateToolEfficiency(task, predictedToolUses);
  }

  if (dimensions.includes("goal_alignment")) {
    dimensionScores.goal_alignment = await evaluateGoalAlignment(task, predictedTurn, config);
  }

  // Calculate overall score
  const scoresToAverage = dimensions.map((d) => dimensionScores[d]);
  const overallScore = scoresToAverage.reduce((a, b) => a + b, 0) / scoresToAverage.length;

  // Build criteria results for compatibility
  const criteriaResults: CriterionResult[] = dimensions.map((dim) => ({
    criterionId: dim,
    passed: dimensionScores[dim] >= 0.7,
    reason: `${dim}: ${(dimensionScores[dim] * 100).toFixed(1)}%`,
    actual: dimensionScores[dim],
    expected: 0.7,
    durationMs: 0,
  }));

  // Build metrics
  const metrics: EvalMetrics = {
    turns: task.prefix.filter((m) => m.role === "user").length + 1,
    tokens: { input: 0, output: 0 }, // Would need to track from API
    costUSD: 0,
    durationMs: Date.now() - startTime,
    ttftMs: 0,
    toolCallCount: predictedToolUses.length,
    errorCount: predictedToolUses.filter((t) => t.isError).length,
    compactionCount: 0,
    efficiencyRatio: dimensionScores.tool_efficiency,
  };

  return {
    taskId: task.id,
    passed: overallScore >= 0.7,
    score: overallScore,
    criteriaResults,
    reason: `Overall thread score: ${(overallScore * 100).toFixed(1)}%`,
    trace: {
      stateTransitions: [],
      toolCalls: predictedToolUses.map((t) => ({
        id: t.toolId,
        name: t.toolName,
        input: t.input,
        result: t.result ? { content: t.result } : undefined,
        success: !t.isError,
        timestamp: t.timestamp,
      })),
      fileChanges: [],
      finalResponse:
        typeof predictedTurn.content === "string"
          ? predictedTurn.content
          : Array.isArray(predictedTurn.content)
            ? predictedTurn.content
                .filter((b): b is { type: "text"; text: string } => b.type === "text")
                .map((b) => b.text)
                .join("\n")
            : "",
    },
    metrics,
    timestamp: Date.now(),
    model: config.model,
    sessionId: task.sessionId,

    // Thread-specific fields
    threadTask: task,
    predictedTurn,
    predictedToolUses,
    dimensionScores,
    contextAnalysis,
    flowAnalysis,
  };
}

/**
 * Run the agent with a thread prefix to generate prediction
 */
async function runAgentForThread(
  task: ThreadTask,
  config: ThreadEvalConfig
): Promise<{ message: Message; toolUses: SessionToolUse[] }> {
  // Build messages from prefix
  const messages: Message[] = [...task.prefix];

  // Add the final user prompt (extracted from expected turn)
  const finalUserMessage = task.expectedTurn.role === "user"
    ? task.expectedTurn
    : task.prefix.filter((m) => m.role === "user").pop();

  if (finalUserMessage && !messages.includes(finalUserMessage)) {
    messages.push(finalUserMessage);
  }

  let responseText = "";
  const toolCalls: Array<{ name: string; input: Record<string, unknown> }> = [];

  // Run the API call
  await createMessageStream(messages, {
    model: config.model,
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    maxTokens: 4096,
    timeout: config.timeoutMs ?? 120000,
    onToken: (token) => {
      responseText += token;
    },
    // Note: Tool calling would need to be handled separately
    // This is a simplified version
  });

  // Build predicted message
  const predictedMessage: Message = {
    role: "assistant",
    content: responseText,
  };

  // Convert tool calls to SessionToolUse format
  const predictedToolUses: SessionToolUse[] = toolCalls.map((tc, i) => ({
    type: "tool_use" as const,
    timestamp: Date.now(),
    toolId: `predicted-${i}`,
    toolName: tc.name,
    input: tc.input,
  }));

  return {
    message: predictedMessage,
    toolUses: predictedToolUses,
  };
}

/**
 * Run thread evaluation on multiple tasks
 */
export async function runThreadEvaluation(
  tasks: ThreadTask[],
  config: ThreadEvalConfig
): Promise<{
  results: ThreadEvalResult[];
  aggregateScores: Record<ThreadEvalDimension, number>;
  overallScore: number;
  passRate: number;
}> {
  const results: ThreadEvalResult[] = [];
  const dimensionTotals: Record<ThreadEvalDimension, number> = {
    context_retention: 0,
    task_completion: 0,
    conversation_coherence: 0,
    error_recovery: 0,
    tool_efficiency: 0,
    goal_alignment: 0,
  };

  for (const task of tasks) {
    try {
      const result = await evaluateThreadTask(task, config);
      results.push(result);

      // Accumulate dimension scores
      for (const dim of Object.keys(dimensionTotals) as ThreadEvalDimension[]) {
        dimensionTotals[dim] += result.dimensionScores[dim];
      }
    } catch (error) {
      if (config.debug) {
        console.error(`[ThreadEval] Error evaluating ${task.id}:`, error);
      }
    }
  }

  // Calculate averages
  const count = results.length || 1;
  const aggregateScores: Record<ThreadEvalDimension, number> = {
    context_retention: dimensionTotals.context_retention / count,
    task_completion: dimensionTotals.task_completion / count,
    conversation_coherence: dimensionTotals.conversation_coherence / count,
    error_recovery: dimensionTotals.error_recovery / count,
    tool_efficiency: dimensionTotals.tool_efficiency / count,
    goal_alignment: dimensionTotals.goal_alignment / count,
  };

  const overallScore =
    Object.values(aggregateScores).reduce((a, b) => a + b, 0) /
    Object.values(aggregateScores).length;

  const passRate = results.filter((r) => r.passed).length / count;

  return {
    results,
    aggregateScores,
    overallScore,
    passRate,
  };
}

/**
 * Generate a thread evaluation report
 */
export function generateThreadReport(
  evalResult: Awaited<ReturnType<typeof runThreadEvaluation>>
): string {
  const lines: string[] = [];

  lines.push("# Thread-Level Evaluation Report");
  lines.push("");
  lines.push(`**Generated**: ${new Date().toISOString()}`);
  lines.push(`**Tasks Evaluated**: ${evalResult.results.length}`);
  lines.push(`**Overall Score**: ${(evalResult.overallScore * 100).toFixed(1)}%`);
  lines.push(`**Pass Rate**: ${(evalResult.passRate * 100).toFixed(1)}%`);
  lines.push("");

  // Dimension scores
  lines.push("## Dimension Scores");
  lines.push("");

  const dimensionNames: Record<ThreadEvalDimension, string> = {
    context_retention: "Context Retention",
    task_completion: "Task Completion",
    conversation_coherence: "Conversation Coherence",
    error_recovery: "Error Recovery",
    tool_efficiency: "Tool Efficiency",
    goal_alignment: "Goal Alignment",
  };

  for (const [dim, score] of Object.entries(evalResult.aggregateScores)) {
    const name = dimensionNames[dim as ThreadEvalDimension] ?? dim;
    const bar = "█".repeat(Math.round(score * 10)) + "░".repeat(10 - Math.round(score * 10));
    lines.push(`- **${name}**: ${bar} ${(score * 100).toFixed(1)}%`);
  }
  lines.push("");

  // Individual results
  lines.push("## Individual Results");
  lines.push("");

  for (const result of evalResult.results) {
    const status = result.passed ? "✅" : "❌";
    lines.push(`### ${status} ${result.taskId}`);
    lines.push("");
    lines.push(`- **Session**: ${result.sessionId}`);
    lines.push(`- **Score**: ${(result.score * 100).toFixed(1)}%`);
    lines.push(`- **Category**: ${result.threadTask.category ?? "general"}`);
    lines.push(`- **Difficulty**: ${result.threadTask.difficulty ?? "unknown"}/5`);
    lines.push("");

    if (result.contextAnalysis) {
      lines.push("**Context Analysis**:");
      lines.push(`- Key Facts: ${result.contextAnalysis.keyFacts.length}`);
      lines.push(`- Retained: ${result.contextAnalysis.retainedFacts.length}`);
      lines.push(`- Forgotten: ${result.contextAnalysis.forgottenFacts.length}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}

// All exports are inline with function/type definitions
