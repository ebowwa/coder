/**
 * Agent Loop - Turn-based processing system
 *
 * This file re-exports from the modular agent-loop/ directory.
 * The implementation is now split into composable modules:
 * - types.ts - Type definitions
 * - loop-state.ts - State management
 * - turn-executor.ts - Single turn execution
 * - tool-executor.ts - Tool execution with hooks/permissions
 * - compaction.ts - Context compaction
 * - message-builder.ts - API message construction
 * - formatters.ts - Display utilities
 * - result-conditions.ts - Verified loop control (Ralph Loop pattern)
 */

// Re-export everything from the modular structure
export { agentLoop } from "./agent-loop/index.js";
export type { AgentLoopOptions, AgentLoopResult } from "./agent-loop/types.js";
export { formatCost, formatMetrics, formatCostBrief, formatCacheMetrics } from "./agent-loop/formatters.js";

// Re-export result conditions system (verified loop control - fully dynamic)
export {
  type ResultCondition,
  type ResultConditionsConfig,
  type ConditionCheckResult,
  type ConditionAction,
  checkResultConditions,
  checkAllResults,
  createConfig as createResultConditionsConfig,
  EXAMPLE_CONDITIONS,
} from "./agent-loop/result-conditions.js";

// Re-export continuation system (autonomous loops - Ralph-style)
export {
  type ContinuationConfig,
  type ContinuationCondition,
  type ContinuationContext,
  type ContinuationCheckResult,
  type ContinuationAction,
  RALPH_CONTINUATION_CONFIG,
  DEFAULT_CONTINUATION_CONFIG,
  DEFAULT_CONTINUATION_PROMPT,
  DEFAULT_STUCK_PROMPT,
  checkContinuation,
  buildContinuationMessage,
  createContinuationConfig,
} from "./agent-loop/continuation.js";
