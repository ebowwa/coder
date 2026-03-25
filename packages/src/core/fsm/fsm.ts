/**
 * FSM Implementation - Finite State Machine with declarative DSL
 *
 * @module fsm/fsm
 */

import type {
  FSMConfig,
  FSMContext,
  FSMEvent,
  FSMState,
  FSMEventType,
  FSMEventEmission,
  TransitionResult,
  StateChangeCallback,
  Guard,
  Action,
  GuardResult,
  TransitionConfig,
} from "./types.js";

// ============================================
// FSM CLASS
// ============================================

/**
 * Creates and manages a finite state machine
 *
 * @example
 * ```typescript
 * const machine = createFSM({
 *   id: "agent-loop",
 *   initial: "idle",
 *   states: {
 *     idle: {
 *       on: {
 *         START: { target: "processing" }
 *       }
 *     },
 *     processing: {
 *       entry: [(ctx) => console.log("Entered processing")],
 *       on: {
 *         COMPLETE: { target: "done" },
 *         ERROR: { target: "error", guard: (ctx) => ctx.state.canRetry }
 *       },
 *       exit: [(ctx) => console.log("Left processing")]
 *     },
 *     done: { final: true },
 *     error: { final: true }
 *   }
 * });
 *
 * machine.send({ type: "START" });
 * console.log(machine.current); // "processing"
 * ```
 */
export class FSM<TContext = unknown> {
  private config: FSMConfig<TContext>;
  private _state: FSMState<TContext>;
  private listeners: Map<FSMEventType, Set<StateChangeCallback<TContext>>> =
    new Map();
  private eventHistory: FSMEvent[] = [];
  private maxHistoryLength: number = 100;

  constructor(config: FSMConfig<TContext>) {
    this.config = config;

    // Initialize state - deep copy context to prevent shared state
    this._state = {
      value: config.initial,
      context:
        config.context !== undefined
          ? JSON.parse(JSON.stringify(config.context))
          : ({} as TContext),
      history: [config.initial],
      done: false,
    };

    // Check if initial state is final
    const initialConfig = this.config.states[config.initial];
    if (initialConfig?.final) {
      this._state.done = true;
    }

    // Execute initial state entry action
    this.executeEntryAction(config.initial, {
      state: this._state.context,
      event: { type: "init", timestamp: Date.now() },
      timestamp: Date.now(),
    });
  }

  // ============================================
  // PROPERTIES
  // ============================================

  /** Current state name */
  get current(): string {
    return this._state.value;
  }

  /** Current context */
  get context(): TContext {
    return this._state.context;
  }

  /** Full state object */
  get state(): FSMState<TContext> {
    return {
      ...this._state,
      context: JSON.parse(JSON.stringify(this._state.context)),
    };
  }

  /** Whether the machine is done */
  get done(): boolean {
    return this._state.done;
  }

  /** State history */
  get history(): readonly string[] {
    return [...this._state.history];
  }

  /** Event history */
  get events(): readonly FSMEvent[] {
    return [...this.eventHistory];
  }

  /** Machine ID */
  get id(): string {
    return this.config.id;
  }

  // ============================================
  // TRANSITIONS
  // ============================================

  /**
   * Send an event to the machine
   */
  send<P = unknown>(event: FSMEvent<P> | string): TransitionResult<TContext> {
    // Normalize event
    const normalizedEvent: FSMEvent =
      typeof event === "string"
        ? { type: event, timestamp: Date.now() }
        : { ...event, timestamp: event.timestamp ?? Date.now() };

    // Track event
    this.eventHistory.push(normalizedEvent);
    if (this.eventHistory.length > this.maxHistoryLength) {
      this.eventHistory.shift();
    }

    // If done, ignore events
    if (this._state.done) {
      return this.createResult(
        false,
        this._state.value,
        this._state.value,
        normalizedEvent,
        [],
        [],
        undefined,
        new Error("Machine is in final state")
      );
    }

    const currentState = this._state.value;
    const stateConfig = this.config.states[currentState];

    // Check if there's a handler for this event
    if (!stateConfig?.on?.[normalizedEvent.type]) {
      // No handler for this event in current state
      if (this.config.verbose) {
        console.log(
          `[FSM ${this.config.id}] No handler for event '${normalizedEvent.type}' in state '${currentState}'`
        );
      }
      return this.createResult(
        false,
        currentState,
        currentState,
        normalizedEvent,
        [],
        []
      );
    }

    // Get transition config(s)
    const transitions = stateConfig.on[normalizedEvent.type];
    const transitionArray = ((Array.isArray(transitions) ? transitions : [transitions]) as TransitionConfig<TContext>[]).filter((t): t is TransitionConfig<TContext> => t !== undefined);

    // Track all guards checked
    const allGuardsChecked: Array<{
      guard: string;
      passed: boolean;
      reason?: string;
    }> = [];

    // Try each transition in order
    for (const transition of transitionArray) {
      const result = this.tryTransition(
        currentState,
        transition,
        normalizedEvent,
        allGuardsChecked
      );
      if (result.transitioned) {
        return result;
      }
    }

    // No transition succeeded
    return this.createResult(
      false,
      currentState,
      currentState,
      normalizedEvent,
      allGuardsChecked,
      []
    );
  }

  /**
   * Try a specific transition
   */
  private tryTransition(
    fromState: string,
    transition: TransitionConfig<TContext>,
    event: FSMEvent,
    guardsChecked: Array<{ guard: string; passed: boolean; reason?: string }>
  ): TransitionResult<TContext> {
    const actionsExecuted: string[] = [];

    // Build context
    const context: FSMContext<TContext> = {
      state: this._state.context,
      event,
      previousState: fromState,
      timestamp: Date.now(),
    };

    // Check guard(s)
    if (transition.guard) {
      const guards = Array.isArray(transition.guard)
        ? transition.guard
        : [transition.guard];

      for (let i = 0; i < guards.length; i++) {
        const guard = guards[i];
        if (!guard) continue;

        const guardResult = this.checkGuard(guard, context);
        guardsChecked.push({
          guard: `guard_${i}`,
          passed: guardResult.passed,
          reason: guardResult.reason,
        });

        if (!guardResult.passed) {
          // Guard failed, don't transition
          return this.createResult(
            false,
            fromState,
            fromState,
            event,
            guardsChecked,
            actionsExecuted
          );
        }
      }
    }

    const targetState = transition.internal ? fromState : transition.target;

    // Execute global beforeTransition action
    if (this.config.actions?.beforeTransition) {
      try {
        this.config.actions.beforeTransition(context);
        actionsExecuted.push("beforeTransition");
      } catch (error) {
        this.emit("action_error", context, event, {
          action: "beforeTransition",
          error,
        });
      }
    }

    // Execute exit action of current state (if not internal)
    if (!transition.internal) {
      this.executeExitAction(fromState, context);
      actionsExecuted.push(`exit:${fromState}`);
    }

    // Execute transition action
    if (transition.action) {
      const actions = Array.isArray(transition.action)
        ? transition.action
        : [transition.action];

      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        if (!action) continue;
        try {
          action(context);
          actionsExecuted.push(`transition_action_${i}`);
        } catch (error) {
          this.emit("action_error", context, event, {
            action: `transition_action_${i}`,
            error,
          });
        }
      }
    }

    // Update state (if not internal)
    if (!transition.internal) {
      const previousState = this._state;
      this._state = {
        value: targetState,
        context: this._state.context,
        history: [...this._state.history, targetState],
        done: this.config.states[targetState]?.final ?? false,
      };

      // Execute entry action of new state
      this.executeEntryAction(targetState, context);
      actionsExecuted.push(`entry:${targetState}`);

      // Emit state change
      this.emit("transition", context, event, {
        from: fromState,
        to: targetState,
      });
    }

    // Execute global afterTransition action
    if (this.config.actions?.afterTransition) {
      try {
        this.config.actions.afterTransition(context);
        actionsExecuted.push("afterTransition");
      } catch (error) {
        this.emit("action_error", context, event, {
          action: "afterTransition",
          error,
        });
      }
    }

    // Emit done if final
    if (this._state.done) {
      this.emit("done", context, event, undefined);
    }

    return this.createResult(
      true,
      fromState,
      targetState,
      event,
      guardsChecked,
      actionsExecuted
    );
  }

  /**
   * Check a guard function
   */
  private checkGuard(
    guard: Guard<TContext> | null | undefined,
    context: FSMContext<TContext>
  ): GuardResult {
    if (!guard) {
      return { passed: true }; // No guard means pass
    }
    try {
      const result = guard(context);
      if (typeof result === "boolean") {
        return { passed: result };
      }
      return result;
    } catch (error) {
      return {
        passed: false,
        reason: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Execute entry action for a state
   */
  private executeEntryAction(
    stateName: string,
    context: FSMContext<TContext>
  ): void {
    const stateConfig = this.config.states[stateName];
    if (!stateConfig?.entry) return;

    const actions = Array.isArray(stateConfig.entry)
      ? stateConfig.entry
      : [stateConfig.entry];

    for (const action of actions) {
      try {
        action(context);
      } catch (error) {
        this.emit("action_error", context, context.event, {
          state: stateName,
          action: "entry",
          error,
        });
      }
    }

    this.emit("enter", context, context.event, { state: stateName });
  }

  /**
   * Execute exit action for a state
   */
  private executeExitAction(
    stateName: string,
    context: FSMContext<TContext>
  ): void {
    const stateConfig = this.config.states[stateName];
    if (!stateConfig?.exit) return;

    const actions = Array.isArray(stateConfig.exit)
      ? stateConfig.exit
      : [stateConfig.exit];

    for (const action of actions) {
      try {
        action(context);
      } catch (error) {
        this.emit("action_error", context, context.event, {
          state: stateName,
          action: "exit",
          error,
        });
      }
    }

    this.emit("exit", context, context.event, { state: stateName });
  }

  // ============================================
  // EVENT EMISSION
  // ============================================

  /**
   * Emit an event to listeners
   */
  private emit(
    type: FSMEventType,
    context: FSMContext<TContext>,
    event: FSMEvent | undefined,
    data: unknown
  ): void {
    const listeners = this.listeners.get(type);
    if (!listeners) return;

    const emission: FSMEventEmission<TContext> = {
      type,
      state: this.state,
      event,
      data,
      timestamp: Date.now(),
    };

    for (const listener of listeners) {
      try {
        listener(this.state, this.state, event!);
      } catch (error) {
        if (this.config.verbose) {
          console.error(`[FSM ${this.config.id}] Listener error:`, error);
        }
      }
    }
  }

  /**
   * Subscribe to state changes
   */
  on(
    eventType: FSMEventType,
    callback: StateChangeCallback<TContext>
  ): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  // ============================================
  // CONTEXT MANAGEMENT
  // ============================================

  /**
   * Update context with partial updates
   */
  updateContext(updates: Partial<TContext>): void {
    Object.assign(this._state.context as Record<string, unknown>, updates as Record<string, unknown>);
  }

  /**
   * Set entire context
   */
  setContext(context: TContext): void {
    this._state.context = context;
  }

  // ============================================
  // STATE QUERIES
  // ============================================

  /**
   * Check if machine is in a specific state
   */
  isIn(stateName: string): boolean {
    return this._state.value === stateName;
  }

  /**
   * Check if an event can be handled
   */
  can(eventType: string): boolean {
    const stateConfig = this.config.states[this._state.value];
    return !!stateConfig?.on?.[eventType];
  }

  /**
   * Get available events from current state
   */
  availableEvents(): string[] {
    const stateConfig = this.config.states[this._state.value];
    return stateConfig?.on ? Object.keys(stateConfig.on) : [];
  }

  /**
   * Get possible next states
   */
  nextStates(): string[] {
    const stateConfig = this.config.states[this._state.value];
    if (!stateConfig?.on) return [];

    const states = new Set<string>();
    for (const transitions of Object.values(stateConfig.on)) {
      const transitionArray = Array.isArray(transitions)
        ? transitions
        : [transitions];
      for (const t of transitionArray) {
        if (t.target) {
          states.add(t.target);
        }
      }
    }
    return Array.from(states);
  }

  // ============================================
  // UTILITIES
  // ============================================

  /**
   * Create a transition result object
   */
  private createResult(
    transitioned: boolean,
    fromState: string,
    toState: string,
    event: FSMEvent,
    guardsChecked: Array<{ guard: string; passed: boolean; reason?: string }>,
    actionsExecuted: string[],
    data?: unknown,
    error?: Error
  ): TransitionResult<TContext> {
    return {
      transitioned,
      fromState,
      toState,
      event,
      guardsChecked,
      actionsExecuted,
      error,
      state: this.state,
    };
  }

  /**
   * Reset machine to initial state
   */
  reset(): void {
    // Deep copy initial context
    const initialContext =
      this.config.context !== undefined
        ? JSON.parse(JSON.stringify(this.config.context))
        : ({} as TContext);

    this._state = {
      value: this.config.initial,
      context: initialContext,
      history: [this.config.initial],
      done: false,
    };

    this.eventHistory = [];

    // Execute initial state entry action
    this.executeEntryAction(this.config.initial, {
      state: this._state.context,
      event: { type: "reset", timestamp: Date.now() },
      timestamp: Date.now(),
    });
  }

  /**
   * Serialize machine state
   */
  serialize(): { state: FSMState<TContext>; events: FSMEvent[] } {
    return {
      state: this.state,
      events: [...this.eventHistory],
    };
  }

  /**
   * Restore machine state
   */
  static deserialize<T>(
    config: FSMConfig<T>,
    data: { state: FSMState<T>; events: FSMEvent[] }
  ): FSM<T> {
    const machine = new FSM<T>(config);
    machine._state = JSON.parse(JSON.stringify(data.state));
    machine.eventHistory = [...data.events];
    return machine;
  }

  /**
   * Get a string representation of the machine
   */
  toString(): string {
    return `FSM(${this.config.id}) { state: "${this._state.value}", done: ${this._state.done} }`;
  }
}

// ============================================
// FACTORY FUNCTIONS
// ============================================

/**
 * Create a new finite state machine
 */
export function createFSM<TContext = unknown>(
  config: FSMConfig<TContext>
): FSM<TContext> {
  return new FSM<TContext>(config);
}

/**
 * Create a simple state machine (no context)
 */
export function createSimpleFSM(
  id: string,
  states: Record<string, StateConfigSimple>
): FSM<void> {
  const initial = Object.keys(states)[0];
  if (!initial) {
    throw new Error("Must provide at least one state");
  }

  const normalizedStates: Record<string, import("./types.js").StateConfig<void>> =
    {};

  for (const [name, config] of Object.entries(states)) {
    normalizedStates[name] = {
      final: config.final,
      on: config.on
        ? Object.fromEntries(
            Object.entries(config.on).map(([event, target]) => [
              event,
              typeof target === "string"
                ? { target }
                : {
                    target: target.target,
                    guard: target.guard
                      ? () => target.guard!()
                      : undefined,
                  },
            ])
          )
        : undefined,
    };
  }

  return new FSM<void>({
    id,
    initial,
    states: normalizedStates,
  });
}

/**
 * Simplified state config for simple machines
 */
export interface StateConfigSimple {
  on?: Record<string, string | { target: string; guard?: () => boolean }>;
  final?: boolean;
}

// ============================================
// GUARD COMBINATORS
// ============================================

/**
 * Combine multiple guards with AND logic
 */
export function and<TContext>(...guards: Guard<TContext>[]): Guard<TContext> {
  return (context: FSMContext<TContext>): GuardResult => {
    for (let i = 0; i < guards.length; i++) {
      const guard = guards[i];
      if (!guard) continue;

      const rawResult = guard(context);
      const result: GuardResult =
        typeof rawResult === "boolean" ? { passed: rawResult } : rawResult;

      if (!result.passed) {
        return {
          passed: false,
          reason: result.reason ?? `Guard ${i} failed`,
        };
      }
    }
    return { passed: true };
  };
}

/**
 * Combine multiple guards with OR logic
 */
export function or<TContext>(...guards: Guard<TContext>[]): Guard<TContext> {
  return (context: FSMContext<TContext>): GuardResult => {
    for (let i = 0; i < guards.length; i++) {
      const guard = guards[i];
      if (!guard) continue;

      const rawResult = guard(context);
      const result: GuardResult =
        typeof rawResult === "boolean" ? { passed: rawResult } : rawResult;

      if (result.passed) {
        return { passed: true };
      }
    }
    return {
      passed: false,
      reason: "All guards failed",
    };
  };
}

/**
 * Negate a guard
 */
export function not<TContext>(guard: Guard<TContext>): Guard<TContext> {
  return (context: FSMContext<TContext>): GuardResult => {
    if (!guard) return { passed: true };

    const rawResult = guard(context);
    const result: GuardResult =
      typeof rawResult === "boolean" ? { passed: rawResult } : rawResult;

    return {
      passed: !result.passed,
      reason: result.passed ? undefined : "Negated guard passed",
    };
  };
}

// ============================================
// ACTION COMBINATORS
// ============================================

/**
 * Combine multiple actions into one
 */
export function sequence<TContext>(
  ...actions: Action<TContext>[]
): Action<TContext> {
  return async (context: FSMContext<TContext>) => {
    for (const action of actions) {
      await action(context);
    }
  };
}

/**
 * Log action for debugging
 */
export function logAction<TContext>(
  message: string | ((ctx: FSMContext<TContext>) => string)
): Action<TContext> {
  return (context: FSMContext<TContext>) => {
    const msg = typeof message === "function" ? message(context) : message;
    console.log(`[FSM] ${msg}`);
  };
}

/**
 * Assign context updates
 */
export function assign<TContext>(
  updates:
    | Partial<TContext>
    | ((ctx: FSMContext<TContext>) => Partial<TContext>)
): Action<TContext> {
  return (context: FSMContext<TContext>) => {
    const changes =
      typeof updates === "function" ? updates(context) : updates;
    Object.assign(context.state as Record<string, unknown>, changes as Record<string, unknown>);
  };
}
