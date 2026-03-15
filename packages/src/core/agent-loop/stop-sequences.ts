/**
 * Stop Sequences - User/AI controlled stop sequences
 *
 * No hardcoded categories. The user or AI decides what sequences to use.
 */

import type { Message, ToolUseBlock } from "../../schemas/index.js";

// ============================================
// TYPES
// ============================================

/**
 * Stop sequence configuration - fully user-defined
 */
export interface StopSequenceConfig {
  /** Stop sequences that will cause generation to stop */
  sequences: string[];
  /** Optional description of when to use these */
  reason?: string;
}

/**
 * Context available for deciding stop sequences
 */
export interface StopSequenceContext {
  messages: Message[];
  lastUserMessage?: string;
  toolsAvailable: string[];
  turnNumber: number;
  recentToolUses: ToolUseBlock[];
  workingDirectory: string;
}

/**
 * Options for getting stop sequences
 */
export interface StopSequenceOptions {
  /** User-defined sequences (required) */
  sequences?: string[];
  /** Config object with reason */
  config?: StopSequenceConfig;
  /** Include safety sequences (default: true) */
  includeSafety?: boolean;
  /** Maximum sequences to return (API limit: 10) */
  maxSequences?: number;
}

// ============================================
// SAFETY SEQUENCES
// ============================================

const SAFETY_SEQUENCES = [
  "\n\n\n\n",  // Four newlines - very clear boundary
];

// ============================================
// API
// ============================================

/**
 * Get stop sequences - user-controlled, no auto-detection
 */
export function getStopSequences(
  options: StopSequenceOptions = {}
): string[] {
  const {
    sequences = [],
    config,
    includeSafety = true,
    maxSequences = 10,
  } = options;

  const result: string[] = [];

  // Add user sequences
  if (config?.sequences) {
    result.push(...config.sequences);
  } else {
    result.push(...sequences);
  }

  // Add safety sequences
  if (includeSafety) {
    result.push(...SAFETY_SEQUENCES);
  }

  // Deduplicate and limit
  const unique = [...new Set(result)];
  return unique.slice(0, maxSequences);
}

/**
 * Create a stop sequence config
 */
export function createConfig(
  sequences: string[],
  reason?: string
): StopSequenceConfig {
  return { sequences, reason };
}

/**
 * Helper to create sequences from output markers
 *
 * @example
 * const seq = fromMarkers(["// END", "export default", "}"]);
 */
export function fromMarkers(markers: string[]): string[] {
  return markers.map(m => `\n\n${m}`);
}
