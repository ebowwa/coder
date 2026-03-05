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
 */

// Re-export everything from the modular structure
export { agentLoop } from "./agent-loop/index.js";
export type { AgentLoopOptions, AgentLoopResult } from "./agent-loop/types.js";
export { formatCost, formatMetrics, formatCostBrief, formatCacheMetrics } from "./agent-loop/formatters.js";
