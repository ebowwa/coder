/**
 * FSM Actions - Reusable action factories for state transitions
 *
 * Actions execute side effects during state transitions.
 * They can be synchronous or asynchronous.
 *
 * @module fsm/actions
 */

import type { FSMContext, Action } from "./types.js";

// ============================================
// BASIC ACTIONS
// ============================================

/**
 * No-op action (does nothing)
 */
export function noop(): Action {
  return () => {};
}

/**
 * Log a message to console
 */
export function log<TContext>(
  message: string | ((ctx: FSMContext<TContext>) => string)
): Action<TContext> {
  return (context: FSMContext<TContext>) => {
    const msg = typeof message === "function" ? message(context) : message;
    console.log(`[FSM] ${msg}`);
  };
}

/**
 * Log the full context for debugging
 */
export function logContext<TContext>(): Action<TContext> {
  return (context: FSMContext<TContext>) => {
    console.log("[FSM Context]", JSON.stringify(context.state, null, 2));
  };
}

/**
 * Log state transition
 */
export function logTransition<TContext>(): Action<TContext> {
  return (context: FSMContext<TContext>) => {
    console.log(
      `[FSM] Transition: ${context.previousState} -> ${context.event.type}`
    );
  };
}

// ============================================
// CONTEXT UPDATE ACTIONS
// ============================================

/**
 * Assign partial updates to context
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

/**
 * Increment a numeric context property
 */
export function increment<TContext>(
  key: keyof TContext,
  amount: number = 1
): Action<TContext> {
  return (context: FSMContext<TContext>) => {
    const current = context.state[key];
    const numCurrent = typeof current === "number" ? current : 0;
    (context.state as Record<string, unknown>)[key as string] =
      numCurrent + amount;
  };
}

/**
 * Decrement a numeric context property
 */
export function decrement<TContext>(
  key: keyof TContext,
  amount: number = 1
): Action<TContext> {
  return increment(key, -amount);
}

/**
 * Set a context property to a value
 */
export function set<TContext, K extends keyof TContext>(
  key: K,
  value: TContext[K] | ((ctx: FSMContext<TContext>) => TContext[K])
): Action<TContext> {
  return (context: FSMContext<TContext>) => {
    const finalValue =
      typeof value === "function"
        ? (value as (ctx: FSMContext<TContext>) => TContext[K])(context)
        : value;
    (context.state as Record<string, unknown>)[key as string] = finalValue;
  };
}

/**
 * Delete a context property
 */
export function unset<TContext>(key: keyof TContext): Action<TContext> {
  return (context: FSMContext<TContext>) => {
    delete (context.state as Record<string, unknown>)[key as string];
  };
}

/**
 * Reset context to initial values
 */
export function resetContext<TContext>(
  initialValues: TContext
): Action<TContext> {
  return (context: FSMContext<TContext>) => {
    for (const key of Object.keys(context.state as object)) {
      delete (context.state as Record<string, unknown>)[key];
    }
    Object.assign(context.state as Record<string, unknown>, initialValues as Record<string, unknown>);
  };
}

// ============================================
// ARRAY/MAP CONTEXT ACTIONS
// ============================================

/**
 * Push a value to an array context property
 */
export function push<TContext, K extends keyof TContext>(
  key: K,
  value:
    | TContext[K] extends (infer V)[] ? V : never
    | ((ctx: FSMContext<TContext>) => TContext[K] extends (infer V)[] ? V : never)
): Action<TContext> {
  return (context: FSMContext<TContext>) => {
    const arr = (context.state as Record<string, unknown>)[key as string];
    if (!Array.isArray(arr)) {
      (context.state as Record<string, unknown>)[key as string] = [];
    }
    const finalValue =
      typeof value === "function"
        ? (value as (ctx: FSMContext<TContext>) => unknown)(context)
        : value;
    ((context.state as Record<string, unknown>)[key as string] as unknown[]).push(
      finalValue
    );
  };
}

/**
 * Pop a value from an array context property
 */
export function pop<TContext>(key: keyof TContext): Action<TContext> {
  return (context: FSMContext<TContext>) => {
    const arr = (context.state as Record<string, unknown>)[key as string];
    if (Array.isArray(arr)) {
      arr.pop();
    }
  };
}

// ============================================
// ASYNC ACTIONS
// ============================================

/**
 * Delay execution
 */
export function delay(ms: number): Action {
  return async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  };
}

/**
 * Run an async action with error handling
 */
export function asyncAction<TContext>(
  action: (context: FSMContext<TContext>) => Promise<void>,
  onError?: (error: Error, context: FSMContext<TContext>) => void
): Action<TContext> {
  return async (context: FSMContext<TContext>) => {
    try {
      await action(context);
    } catch (error) {
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)), context);
      } else {
        console.error("[FSM] Async action error:", error);
      }
    }
  };
}

// ============================================
// PERSISTENCE ACTIONS
// ============================================

/**
 * Save context to localStorage (browser) or file (node)
 */
export function persistContext<TContext>(
  key: string,
  storage?: {
    getItem: (key: string) => string | null | Promise<string | null>;
    setItem: (key: string, value: string) => void | Promise<void>;
  }
): Action<TContext> {
  return async (context: FSMContext<TContext>) => {
    const data = JSON.stringify(context.state);

    if (storage) {
      await storage.setItem(key, data);
    } else if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, data);
    } else {
      console.warn("[FSM] persistContext: No storage available");
    }
  };
}

/**
 * Load context from storage
 */
export function loadContext<TContext>(
  key: string,
  storage?: {
    getItem: (key: string) => string | null | Promise<string | null>;
    setItem: (key: string, value: string) => void | Promise<void>;
  }
): Action<TContext> {
  return async (context: FSMContext<TContext>) => {
    let data: string | null = null;

    if (storage) {
      data = await storage.getItem(key);
    } else if (typeof localStorage !== "undefined") {
      data = localStorage.getItem(key);
    }

    if (data) {
      try {
        const parsed = JSON.parse(data);
        Object.assign(context.state as Record<string, unknown>, parsed);
      } catch {
        console.warn("[FSM] loadContext: Failed to parse stored data");
      }
    }
  };
}

// ============================================
// NOTIFICATION ACTIONS
// ============================================

/**
 * Emit a custom event
 */
export function emit<TContext>(
  eventName: string,
  detail?: unknown | ((ctx: FSMContext<TContext>) => unknown)
): Action<TContext> {
  return (context: FSMContext<TContext>) => {
    const eventDetail =
      typeof detail === "function"
        ? (detail as (ctx: FSMContext<TContext>) => unknown)(context)
        : detail;

    if (typeof process !== "undefined" && process.emit) {
      process.emit(eventName, eventDetail);
    } else if (typeof globalThis !== "undefined" && "window" in globalThis) {
      (globalThis as unknown as { dispatchEvent: (event: Event) => boolean }).dispatchEvent(
        new CustomEvent(eventName, { detail: eventDetail })
      );
    }
  };
}

/**
 * Call a callback function
 */
export function callback<TContext>(
  fn: (context: FSMContext<TContext>) => void | Promise<void>
): Action<TContext> {
  return async (context: FSMContext<TContext>) => {
    await fn(context);
  };
}

// ============================================
// CONDITIONAL ACTIONS
// ============================================

/**
 * Execute action only if condition is met
 */
export function when<TContext>(
  condition: (context: FSMContext<TContext>) => boolean,
  action: Action<TContext>
): Action<TContext> {
  return async (context: FSMContext<TContext>) => {
    if (condition(context)) {
      await action(context);
    }
  };
}

/**
 * Execute action if condition is met, otherwise execute else action
 */
export function ifElse<TContext>(
  condition: (context: FSMContext<TContext>) => boolean,
  thenAction: Action<TContext>,
  elseAction?: Action<TContext>
): Action<TContext> {
  return async (context: FSMContext<TContext>) => {
    if (condition(context)) {
      await thenAction(context);
    } else if (elseAction) {
      await elseAction(context);
    }
  };
}

// ============================================
// COMBINATOR ACTIONS
// ============================================

/**
 * Execute multiple actions in sequence
 */
export function sequence<TContext>(...actions: Action<TContext>[]): Action<TContext> {
  return async (context: FSMContext<TContext>) => {
    for (const action of actions) {
      await action(context);
    }
  };
}

/**
 * Execute multiple actions in parallel
 */
export function parallel<TContext>(...actions: Action<TContext>[]): Action<TContext> {
  return async (context: FSMContext<TContext>) => {
    await Promise.all(actions.map((action) => action(context)));
  };
}

/**
 * Execute action with retry on failure
 */
export function retry<TContext>(
  action: Action<TContext>,
  options: {
    maxRetries?: number;
    delay?: number;
    backoff?: number;
  } = {}
): Action<TContext> {
  const { maxRetries = 3, delay: initialDelay = 100, backoff = 2 } = options;

  return async (context: FSMContext<TContext>) => {
    let lastError: Error | undefined;
    let currentDelay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await action(context);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, currentDelay));
          currentDelay *= backoff;
        }
      }
    }

    throw lastError;
  };
}

/**
 * Execute action with timeout
 */
export function timeout<TContext>(
  action: Action<TContext>,
  ms: number
): Action<TContext> {
  return async (context: FSMContext<TContext>) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ms);

    try {
      await Promise.race([
        action(context),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Action timed out after ${ms}ms`)), ms)
        ),
      ]);
    } finally {
      clearTimeout(timeoutId);
    }
  };
}

// ============================================
// AGENT-SPECIFIC ACTIONS
// ============================================

/**
 * Track tool usage in context
 */
export function trackToolUse<
  TContext extends { toolsUsed?: Array<{ name: string; timestamp: number }> }
>(toolName: string): Action<TContext> {
  return (context: FSMContext<TContext>) => {
    if (!context.state.toolsUsed) {
      context.state.toolsUsed = [];
    }
    context.state.toolsUsed.push({
      name: toolName,
      timestamp: Date.now(),
    });
  };
}

/**
 * Update cost tracking in context
 */
export function updateCost<
  TContext extends { totalCost?: number; lastCost?: number }
>(cost: number): Action<TContext> {
  return (context: FSMContext<TContext>) => {
    context.state.lastCost = cost;
    context.state.totalCost = (context.state.totalCost ?? 0) + cost;
  };
}

/**
 * Increment turn counter
 */
export function incrementTurn<
  TContext extends { turnNumber?: number }
>(): Action<TContext> {
  return (context: FSMContext<TContext>) => {
    context.state.turnNumber = (context.state.turnNumber ?? 0) + 1;
  };
}

/**
 * Record error in context
 */
export function recordError<
  TContext extends { errors?: Array<{ message: string; timestamp: number }> }
>(error: Error | string): Action<TContext> {
  return (context: FSMContext<TContext>) => {
    if (!context.state.errors) {
      context.state.errors = [];
    }
    context.state.errors.push({
      message: error instanceof Error ? error.message : error,
      timestamp: Date.now(),
    });
  };
}

/**
 * Set checkpoint marker
 */
export function setCheckpoint<
  TContext extends { checkpoints?: Array<{ id: string; timestamp: number; state: string }> }
>(checkpointId: string): Action<TContext> {
  return (context: FSMContext<TContext>) => {
    if (!context.state.checkpoints) {
      context.state.checkpoints = [];
    }
    context.state.checkpoints.push({
      id: checkpointId,
      timestamp: Date.now(),
      state: context.previousState ?? "unknown",
    });
  };
}

// ============================================
// UTILITY FACTORY
// ============================================

/**
 * Create a custom action with full context access
 */
export function createAction<TContext>(
  fn: (context: FSMContext<TContext>) => void | Promise<void>
): Action<TContext> {
  return fn;
}
