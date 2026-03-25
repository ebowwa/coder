/**
 * FSM (Finite State Machine) Module
 *
 * Provides state machine patterns for Coder's agent loop:
 * - Event Sourcing: Append-only event log with replay
 * - FSM DSL: Declarative state machine configuration
 * - Guards & Actions: Reusable transition logic
 *
 * @module fsm
 */

// Event Sourcing
export {
  EventStore,
  createEventStore,
  createEvent,
  type StateEvent,
  type StateEventType,
  type StateSnapshot,
  type EventStoreConfig,
  type RecordEventOptions,
  type ReplayResult,
  type EventStoreStats,
} from "./event-sourcing.js";

// FSM Types
export type {
  FSMContext,
  FSMEvent,
  FSMState,
  FSMConfig,
  FSMEventType,
  FSMEventEmission,
  StateConfig,
  TransitionConfig,
  TransitionResult,
  StateChangeCallback,
  Guard,
  Action,
  GuardResult,
} from "./types.js";

// FSM Implementation
export {
  FSM,
  createFSM,
  createSimpleFSM,
  and,
  or,
  not,
  sequence as sequenceActions,
  logAction,
  assign,
} from "./fsm.js";

// Guards
export {
  always,
  never,
  notGuard,
  equals,
  satisfies,
  isTruthy,
  isFalsy,
  isDefined,
  greaterThan,
  lessThan,
  inRange,
  maxTurnsGuard,
  costThresholdGuard,
  timeoutGuard,
  toolAllowedGuard,
  errorCountGuard,
  allGuards,
  anyGuard,
  conditionalGuard,
  customGuard,
  evaluateGuard,
  debounceGuard,
  createGuard,
  memoizeGuard,
} from "./guards.js";

// Actions
export {
  noop,
  log,
  logContext,
  logTransition,
  assign as assignContext,
  increment,
  decrement,
  set,
  unset,
  resetContext,
  push,
  pop,
  delay,
  asyncAction,
  persistContext,
  loadContext,
  emit,
  callback,
  when,
  ifElse,
  sequence,
  parallel,
  retry,
  timeout,
  trackToolUse,
  updateCost,
  incrementTurn,
  recordError,
  setCheckpoint,
  createAction,
} from "./actions.js";
