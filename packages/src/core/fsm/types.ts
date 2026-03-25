/**
 * FSM Types - Type definitions for finite state machine
 *
 * Provides a declarative DSL for defining state machines with:
 * - Explicit state transitions
 * - Guard conditions
 * - Entry/exit actions
 * - Hierarchical states
 *
 * @module fsm/types
 */

// ============================================
// CORE TYPES
// ============================================

/**
 * Context passed to guards and actions
 */
export interface FSMContext<TState = unknown> {
  /** Current state data */
  state: TState;
  /** Event that triggered the transition */
  event: FSMEvent;
  /** Previous state (before transition) */
  previousState?: string;
  /** Timestamp of transition */
  timestamp: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * An event that can trigger state transitions
 */
export interface FSMEvent<P = unknown> {
  /** Event type/name */
  type: string;
  /** Event payload */
  payload?: P;
  /** Timestamp */
  timestamp?: number;
  /** Source of the event */
  source?: string;
}

/**
 * Result of a guard condition check
 */
export interface GuardResult {
  /** Whether the guard passed */
  passed: boolean;
  /** Optional reason if guard failed */
  reason?: string;
}

/**
 * Guard function - determines if a transition is allowed
 */
export type Guard<TState = unknown> =
  | ((context: FSMContext<TState>) => boolean | GuardResult)
  | null;

/**
 * Action function - executes side effects during transitions
 */
export type Action<TState = unknown> = (
  context: FSMContext<TState>
) => void | Promise<void>;

/**
 * Transition configuration
 */
export interface TransitionConfig<TState = unknown> {
  /** Target state to transition to */
  target: string;
  /** Guard condition(s) - all must pass for transition to occur */
  guard?: Guard<TState> | Guard<TState>[];
  /** Action(s) to execute during transition */
  action?: Action<TState> | Action<TState>[];
  /** Whether this transition is internal (no state change, just actions) */
  internal?: boolean;
}

/**
 * State configuration
 */
export interface StateConfig<TState = unknown> {
  /** Entry action(s) - executed when entering this state */
  entry?: Action<TState> | Action<TState>[];
  /** Exit action(s) - executed when leaving this state */
  exit?: Action<TState> | Action<TState>[];
  /** Event handlers - maps event types to transitions */
  on?: Record<string, TransitionConfig<TState> | TransitionConfig<TState>[]>;
  /** Parent state (for hierarchical states) */
  parent?: string;
  /** Initial sub-state (for compound states) */
  initial?: string;
  /** Whether this is a final/terminal state */
  final?: boolean;
  /** History mode for this state */
  history?: "none" | "shallow" | "deep";
}

/**
 * State machine configuration
 */
export interface FSMConfig<TState = unknown> {
  /** Unique identifier for this machine */
  id: string;
  /** Initial state */
  initial: string;
  /** State definitions */
  states: Record<string, StateConfig<TState>>;
  /** Global actions executed on every transition */
  actions?: {
    beforeTransition?: Action<TState>;
    afterTransition?: Action<TState>;
    onGuardFailed?: Action<TState>;
    onInvalidTransition?: Action<TState>;
  };
  /** Context data available to guards/actions */
  context?: TState;
  /** Whether to log transitions (for debugging) */
  verbose?: boolean;
}

/**
 * Current state of the machine
 */
export interface FSMState<TState = unknown> {
  /** Current state name */
  value: string;
  /** Context data */
  context: TState;
  /** State history (for history states) */
  history: string[];
  /** Whether the machine is done */
  done: boolean;
  /** Current error if any */
  error?: Error;
}

/**
 * Result of a transition attempt
 */
export interface TransitionResult<TState = unknown> {
  /** Whether the transition occurred */
  transitioned: boolean;
  /** State before transition */
  fromState: string;
  /** State after transition (same as from if not transitioned) */
  toState: string;
  /** Event that triggered the attempt */
  event: FSMEvent;
  /** Guards that were checked */
  guardsChecked: Array<{ guard: string; passed: boolean; reason?: string }>;
  /** Actions that were executed */
  actionsExecuted: string[];
  /** Error if any */
  error?: Error;
  /** New machine state */
  state: FSMState<TState>;
}

/**
 * Callback for state changes
 */
export type StateChangeCallback<TState = unknown> = (
  newState: FSMState<TState>,
  previousState: FSMState<TState>,
  event: FSMEvent
) => void;

// ============================================
// HIERARCHICAL STATE TYPES
// ============================================

/**
 * Configuration for hierarchical states
 */
export interface HierarchicalStateConfig<TState = unknown>
  extends StateConfig<TState> {
  /** Nested states */
  states?: Record<string, StateConfig<TState>>;
}

/**
 * State node in hierarchy
 */
export interface StateNode<TState = unknown> {
  /** State name */
  name: string;
  /** Parent state */
  parent?: StateNode<TState>;
  /** Child states */
  children: StateNode<TState>[];
  /** Whether this is an active state */
  active: boolean;
  /** Configuration */
  config: StateConfig<TState>;
}

// ============================================
// PARALLEL STATE TYPES
// ============================================

/**
 * Configuration for parallel regions
 */
export interface ParallelRegionConfig<TState = unknown> {
  /** Region ID */
  id: string;
  /** States in this region */
  states: Record<string, StateConfig<TState>>;
  /** Initial state for this region */
  initial: string;
}

/**
 * State of a parallel region
 */
export interface ParallelRegionState<TState = unknown> {
  /** Region ID */
  id: string;
  /** Current state in this region */
  current: string;
  /** Region context (can be subset of main context) */
  context?: Partial<TState>;
}

// ============================================
// EVENT EMITTER TYPES
// ============================================

/**
 * Events emitted by the state machine
 */
export type FSMEventType =
  | "transition"
  | "enter"
  | "exit"
  | "guard_failed"
  | "action_error"
  | "done";

/**
 * FSM event emission
 */
export interface FSMEventEmission<TState = unknown> {
  type: FSMEventType;
  state: FSMState<TState>;
  event?: FSMEvent;
  data?: unknown;
  timestamp: number;
}
