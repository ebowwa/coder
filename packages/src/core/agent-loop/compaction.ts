/**
 * Compaction Handler - Context compaction strategies
 */

import type { Message } from "../../schemas/index.js";
import {
  needsCompaction,
  compactMessages,
  getCompactionStats,
  type CompactionResult,
} from "../context-compaction.js";
import type { LoopState } from "./loop-state.js";

/**
 * Compaction options
 */
export interface CompactionOptions {
  /** Number of initial messages to preserve (0 = none) */
  keepFirst?: number;
  /** Number of recent messages to preserve */
  keepLast?: number;
  /** Preserve tool use/result pairs */
  preserveToolPairs?: boolean;
}

/** Default compaction options for proactive compaction */
export const DEFAULT_PROACTIVE_OPTIONS: CompactionOptions = {
  keepFirst: 0,  // Don't preserve first message - summary covers it
  keepLast: 3,   // Only keep last 3 messages for more aggressive compaction
  preserveToolPairs: true,
};

/** Default compaction options for reactive compaction (on max_tokens) */
export const DEFAULT_REACTIVE_OPTIONS: CompactionOptions = {
  keepFirst: 0,  // Don't preserve first message
  keepLast: 3,   // More aggressive - only keep last 3
  preserveToolPairs: true,
};

/**
 * Check if compaction is needed and apply it proactively
 * @returns true if compaction was applied
 */
export async function handleProactiveCompaction(
  state: LoopState,
  maxTokens: number,
  options: CompactionOptions = DEFAULT_PROACTIVE_OPTIONS
): Promise<boolean> {
  if (!needsCompaction(state.messages, maxTokens)) {
    return false;
  }

  const compactionResult = await compactMessages(state.messages, maxTokens, {
    keepFirst: options.keepFirst ?? 0,
    keepLast: options.keepLast ?? 3,
    preserveToolPairs: options.preserveToolPairs ?? true,
  });

  return state.applyCompaction(compactionResult, getCompactionStats);
}

/**
 * Handle reactive compaction when max_tokens is hit
 * @returns true if compaction was applied and loop should continue
 */
export async function handleReactiveCompaction(
  state: LoopState,
  maxTokens: number,
  options: CompactionOptions = DEFAULT_REACTIVE_OPTIONS
): Promise<boolean> {
  const compactionResult = await compactMessages(state.messages, maxTokens, {
    keepFirst: options.keepFirst ?? 0,
    keepLast: options.keepLast ?? 3,
    preserveToolPairs: options.preserveToolPairs ?? true,
  });

  return state.applyCompaction(compactionResult, getCompactionStats);
}

/**
 * Check if messages need compaction
 */
export { needsCompaction };

/**
 * Get token estimate for messages
 */
export { estimateMessagesTokens } from "../context-compaction.js";
