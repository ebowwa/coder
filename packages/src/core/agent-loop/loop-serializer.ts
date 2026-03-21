/**
 * Loop Serializer - Serialization format for LoopState persistence
 *
 * Provides a versioned serialization format for persisting agent loop state.
 * This enables resume capability for long-running loops.
 *
 * @module loop-serializer
 */

import type {
  Message,
  QueryMetrics,
  ToolUseBlock,
  CacheMetrics,
} from "../../schemas/index.js";
import type { LoopBehavior } from "../../ecosystem/presets/types.js";
import { createInitialCacheMetrics } from "./loop-state.js";

// ============================================
// TYPES
// ============================================

/**
 * Current serialization format version
 * Increment when making breaking changes to the format
 */
export const SERIALIZER_VERSION = 1;

/**
 * A checkpoint within a loop's execution
 */
export interface LoopCheckpoint {
  /** Unique checkpoint identifier */
  id: string;
  /** Turn number when checkpoint was created */
  turnNumber: number;
  /** Timestamp (epoch ms) when checkpoint was created */
  timestamp: number;
  /** Type of checkpoint */
  type: "auto" | "manual" | "qc";
  /** Human-readable summary of the checkpoint */
  summary: string;
  /** Optional file snapshots at this checkpoint */
  fileSnapshots?: Record<string, string>;
  /** Optional QC data for quality control checkpoints */
  qc?: {
    filesModified: string[];
    testsRun?: { passed: number; failed: number };
    lintStatus?: "pass" | "fail" | "skip";
    gitStatus: {
      branch: string;
      dirty: boolean;
      uncommitted: string[];
    };
    costSoFar: number;
    duration: number;
  };
}

/**
 * Persisted loop state - the full serialization format
 */
export interface PersistedLoopState {
  /** Serialization format version */
  version: number;
  /** Session ID this loop belongs to */
  sessionId: string;
  /** Timestamp when this state was persisted */
  timestamp: number;

  // Core state
  /** Conversation messages */
  messages: Message[];
  /** Query metrics for each turn */
  metrics: QueryMetrics[];
  /** All tool use blocks from the conversation */
  allToolsUsed: ToolUseBlock[];

  // Counters
  /** Total cost in USD */
  totalCost: number;
  /** Previous turn cost for delta calculation */
  previousCost: number;
  /** Total duration in milliseconds */
  totalDuration: number;
  /** Current turn number */
  turnNumber: number;
  /** Number of compaction operations performed */
  compactionCount: number;
  /** Total tokens saved by compaction */
  totalTokensCompacted: number;
  /** Retry count for error handling */
  retryCount: number;
  /** Consecutive continuation injections (for stuck detection) */
  consecutiveContinuations?: number;
  /** Whether context was just compacted (for goal reminder) */
  wasCompacted?: boolean;
  /** Names of tools used in recent turns (for cooldown detection) */
  recentToolNames?: string[];

  // Cache metrics
  /** Aggregated cache metrics */
  cacheMetrics: CacheMetrics;

  // Template info
  /** Template name if using a teammate template */
  templateName: string | null;
  /** Loop behavior settings (serialized) */
  loopBehavior: LoopBehavior;

  // Session timing
  /** When the session started (epoch ms) */
  sessionStartTime: number;

  // Checkpoints
  /** List of checkpoints created during the loop */
  checkpoints: LoopCheckpoint[];

  // Resume metadata
  /** Whether this loop was interrupted (no clean end) */
  interrupted?: boolean;
  /** Timestamp when loop ended cleanly (if applicable) */
  endedAt?: number;
  /** Final result message if loop ended */
  endReason?: string;
}

/**
 * Manifest file for loop metadata
 */
export interface LoopManifest {
  /** Session ID */
  sessionId: string;
  /** When the loop was created */
  createdAt: number;
  /** When the loop was last updated */
  updatedAt: number;
  /** When the loop ended (if applicable) */
  endedAt?: number;
  /** Whether the loop was interrupted */
  interrupted: boolean;
  /** Template name used */
  templateName: string | null;
  /** Total turns completed */
  totalTurns: number;
  /** Total cost in USD */
  totalCost: number;
  /** Number of checkpoints */
  checkpointCount: number;
  /** Working directory when loop started */
  workingDirectory: string;
  /** Model used */
  model: string;
}

/**
 * Serialization options
 */
export interface SerializationOptions {
  /** Include file snapshots in checkpoints (expensive) */
  includeFileSnapshots?: boolean;
  /** Maximum number of checkpoints to keep */
  maxCheckpoints?: number;
}

// ============================================
// SERIALIZATION UTILITIES
// ============================================

/**
 * Generate a unique checkpoint ID
 */
export function generateCheckpointId(turnNumber: number): string {
  const timestamp = Date.now();
  return `cp_${String(turnNumber).padStart(4, "0")}_${timestamp}`;
}

/**
 * Validate a persisted loop state
 */
export function validatePersistedState(
  data: unknown
): data is PersistedLoopState {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const state = data as Record<string, unknown>;

  // Check required fields
  if (typeof state.version !== "number") return false;
  if (typeof state.sessionId !== "string") return false;
  if (typeof state.timestamp !== "number") return false;
  if (!Array.isArray(state.messages)) return false;
  if (!Array.isArray(state.metrics)) return false;
  if (!Array.isArray(state.allToolsUsed)) return false;
  if (typeof state.totalCost !== "number") return false;
  if (typeof state.turnNumber !== "number") return false;

  return true;
}

/**
 * Validate a checkpoint
 */
export function validateCheckpoint(data: unknown): data is LoopCheckpoint {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const cp = data as Record<string, unknown>;

  if (typeof cp.id !== "string") return false;
  if (typeof cp.turnNumber !== "number") return false;
  if (typeof cp.timestamp !== "number") return false;
  if (!["auto", "manual", "qc"].includes(cp.type as string)) return false;
  if (typeof cp.summary !== "string") return false;

  return true;
}

/**
 * Migrate an older version state to current version
 */
export function migrateState(
  state: Record<string, unknown>
): PersistedLoopState {
  const version = state.version as number;

  // Currently only version 1 exists
  if (version === 1) {
    return state as unknown as PersistedLoopState;
  }

  // Future: add migration logic here
  throw new Error(`Unsupported serialization version: ${version}`);
}

/**
 * Create default cache metrics
 * @deprecated Use createInitialCacheMetrics from loop-state.ts
 */
export function createDefaultCacheMetrics(): CacheMetrics {
  return createInitialCacheMetrics();
}

/**
 * Prune old checkpoints to keep only the most recent ones
 */
export function pruneCheckpoints(
  checkpoints: LoopCheckpoint[],
  maxCount: number
): LoopCheckpoint[] {
  if (checkpoints.length <= maxCount) {
    return checkpoints;
  }

  // Sort by timestamp (newest first) and keep the most recent
  return [...checkpoints]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, maxCount);
}

/**
 * Create a summary of the persisted state for display
 */
export function createStateSummary(state: PersistedLoopState): {
  sessionId: string;
  turnNumber: number;
  totalCost: number;
  duration: string;
  checkpointCount: number;
  templateName: string | null;
  interrupted: boolean;
} {
  const durationMs = Date.now() - state.sessionStartTime;
  const duration = formatDuration(durationMs);

  return {
    sessionId: state.sessionId,
    turnNumber: state.turnNumber,
    totalCost: state.totalCost,
    duration,
    checkpointCount: state.checkpoints.length,
    templateName: state.templateName,
    interrupted: state.interrupted ?? false,
  };
}

/**
 * Format duration in human-readable format
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}
