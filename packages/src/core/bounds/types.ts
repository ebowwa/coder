/**
 * Bounds - Boundary Enforcement Types
 *
 * "The harness defines the boundaries, the agent converges faster
 * because the solution space is constrained."
 *
 * This module provides mechanical enforcement of constraints,
 * not declarative suggestions. Failures become signals that
 * improve the environment.
 */

// ============================================
// BOUNDARY DEFINITIONS
// ============================================

/**
 * Severity levels for boundary violations
 */
export type BoundarySeverity = "warn" | "block" | "fatal";

/**
 * Context provided to boundary checks
 */
export interface BoundaryContext {
  /** Tool being executed */
  tool_name: string;
  /** Tool input parameters */
  tool_input: Record<string, unknown>;
  /** Working directory for file operations */
  workingDirectory: string;
  /** Session ID for context */
  sessionId?: string;
  /** Timestamp of the check */
  timestamp: number;
  /** Previous tool results in this turn (for context-aware checks) */
  previousResults?: Array<{
    tool_name: string;
    tool_input: Record<string, unknown>;
    result?: unknown;
    isError?: boolean;
  }>;
}

/**
 * Result of a boundary check - violation if not null
 */
export interface BoundaryViolation {
  /** ID of the boundary that was violated */
  boundaryId: string;
  /** Human-readable reason for the violation */
  reason: string;
  /** Suggested fix for the violation */
  suggestion?: string;
  /** Can this be automatically fixed? */
  autoFixable?: boolean;
  /** Auto-fix action if available */
  autoFix?: () => Promise<void>;
  /** Additional context for debugging */
  context?: Record<string, unknown>;
}

/**
 * A boundary definition - a mechanical constraint on agent behavior
 */
export interface Boundary {
  /** Unique identifier for this boundary */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this boundary enforces */
  description: string;
  /** Check if this boundary is violated. Returns null if OK */
  check: (context: BoundaryContext) => BoundaryViolation | null | Promise<BoundaryViolation | null>;
  /** Generate a patch suggestion from a failure signal */
  patchFromSignal?: (signal: FailureSignal) => BoundaryPatch | null;
  /** Severity level */
  severity: BoundarySeverity;
  /** Is this a learned boundary (from failures)? */
  learned?: boolean;
  /** Tags for categorization */
  tags?: string[];
  /** Is this boundary enabled? */
  enabled?: boolean;
}

// ============================================
// FAILURE SIGNALS
// ============================================

/**
 * Types of errors that can generate signals
 */
export type ErrorType = "parse" | "runtime" | "validation" | "timeout" | "permission" | "unknown";

/**
 * A structured signal extracted from a failure
 */
export interface FailureSignal {
  /** Unique identifier for this signal */
  id: string;
  /** When this signal was generated */
  timestamp: number;
  /** Tool that failed */
  tool_name: string;
  /** Tool input that caused the failure */
  tool_input: Record<string, unknown>;
  /** Error message */
  error: string;
  /** Classified error type */
  errorType: ErrorType;
  /** Stack trace or additional debug info */
  debugInfo?: string;
  /** Working directory context */
  workingDirectory?: string;
  /** Session ID */
  sessionId?: string;
  /** Additional context */
  context?: Record<string, unknown>;
  /** Has this signal been processed into a patch? */
  processed?: boolean;
}

// ============================================
// BOUNDARY PATCHES
// ============================================

/**
 * Source of a boundary patch
 */
export type PatchSource = "manual" | "signal" | "builtin";

/**
 * A patch that modifies or adds a boundary
 */
export interface BoundaryPatch {
  /** Unique identifier for this patch */
  id: string;
  /** Boundary ID this patch affects */
  boundaryId: string;
  /** Source of this patch */
  source: PatchSource;
  /** Signal ID that generated this patch (if source is 'signal') */
  sourceSignalId?: string;
  /** The patch content - partial boundary to merge */
  patch: Partial<Boundary> | NewBoundaryPatch;
  /** When this patch was created */
  createdAt: number;
  /** Is this patch applied? */
  applied?: boolean;
}

/**
 * Patch that creates a new boundary
 */
export interface NewBoundaryPatch {
  type: "new";
  boundary: Boundary;
}

// ============================================
// REGISTRY TYPES
// ============================================

/**
 * Statistics about the boundary registry
 */
export interface BoundaryStats {
  /** Total number of boundaries */
  total: number;
  /** Number of enabled boundaries */
  enabled: number;
  /** Number of learned boundaries */
  learned: number;
  /** Number of pending patches */
  pendingPatches: number;
  /** Number of processed signals */
  processedSignals: number;
}

/**
 * Configuration for the boundary registry
 */
export interface BoundaryRegistryConfig {
  /** Path to persist learned boundaries */
  persistencePath?: string;
  /** Auto-save on changes */
  autoSave?: boolean;
  /** Maximum number of signals to retain */
  maxSignals?: number;
  /** Enable signal processing */
  enableSignalProcessing?: boolean;
}

/**
 * Result of checking all boundaries
 */
export interface BoundaryCheckResult {
  /** All violations found */
  violations: BoundaryViolation[];
  /** Were there any blocking violations? */
  blocked: boolean;
  /** Were there any fatal violations? */
  fatal: boolean;
  /** Warnings (non-blocking violations) */
  warnings: BoundaryViolation[];
}

// ============================================
// ENFORCER TYPES
// ============================================

/**
 * Hook handler type for integration with HookManager
 */
export type BoundsHookHandler = (
  input: BoundsHookInput
) => Promise<BoundsHookOutput>;

/**
 * Input to bounds hooks
 */
export interface BoundsHookInput {
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_result?: unknown;
  tool_result_is_error?: boolean;
  error?: string;
  session_id?: string;
  working_directory?: string;
}

/**
 * Output from bounds hooks
 */
export interface BoundsHookOutput {
  decision: "allow" | "deny" | "block";
  reason?: string;
  violations?: BoundaryViolation[];
  modified_input?: Record<string, unknown>;
}
