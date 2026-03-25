/**
 * FSM Guards - Reusable guard factories for state transitions
 *
 * Guards determine if a transition should occur based on context.
 * All guards return either a boolean or a GuardResult object.
 *
 * @module fsm/guards
 */

import type { FSMContext, Guard, GuardResult } from "./types.js";

// ============================================
// BASIC GUARDS
// ============================================

/**
 * Always allow the transition
 */
export function always(): Guard {
  return () => ({ passed: true });
}

/**
 * Always deny the transition
 */
export function never(reason?: string): Guard {
  return () => ({ passed: false, reason: reason ?? "Transition not allowed" });
}

/**
 * Negate a guard
 */
export function notGuard(guard: Guard): Guard {
  return (context) => {
    const result = evaluateGuard(guard, context);
    return {
      passed: !result.passed,
      reason: result.passed
        ? "Condition was true, but negated"
        : result.reason,
    };
  };
}

// ============================================
// CONTEXT-BASED GUARDS
// ============================================

/**
 * Guard that checks if a context property equals a value
 */
export function equals<TContext, K extends keyof TContext>(
  key: K,
  value: TContext[K]
): Guard<TContext> {
  return (context: FSMContext<TContext>) => ({
    passed: context.state[key] === value,
    reason: `Expected ${String(key)} to be ${String(value)}, got ${String(context.state[key])}`,
  });
}

/**
 * Guard that checks if a context property matches a predicate
 */
export function satisfies<TContext, K extends keyof TContext>(
  key: K,
  predicate: (value: TContext[K]) => boolean,
  reason?: string
): Guard<TContext> {
  return (context: FSMContext<TContext>) => ({
    passed: predicate(context.state[key]),
    reason,
  });
}

/**
 * Guard that checks if a context property is truthy
 */
export function isTruthy<TContext>(key: keyof TContext): Guard<TContext> {
  return (context: FSMContext<TContext>) => ({
    passed: !!context.state[key],
    reason: `${String(key)} is not truthy`,
  });
}

/**
 * Guard that checks if a context property is falsy
 */
export function isFalsy<TContext>(key: keyof TContext): Guard<TContext> {
  return (context: FSMContext<TContext>) => ({
    passed: !context.state[key],
    reason: `${String(key)} is not falsy`,
  });
}

/**
 * Guard that checks if a context property is defined (not undefined/null)
 */
export function isDefined<TContext>(key: keyof TContext): Guard<TContext> {
  return (context: FSMContext<TContext>) => ({
    passed: context.state[key] !== undefined && context.state[key] !== null,
    reason: `${String(key)} is not defined`,
  });
}

// ============================================
// NUMERIC GUARDS
// ============================================

/**
 * Guard that checks if a numeric property is greater than a value
 */
export function greaterThan<TContext>(
  key: keyof TContext,
  threshold: number
): Guard<TContext> {
  return (context: FSMContext<TContext>) => {
    const value = context.state[key];
    const numValue = typeof value === "number" ? value : 0;
    return {
      passed: numValue > threshold,
      reason: `${String(key)} (${numValue}) is not greater than ${threshold}`,
    };
  };
}

/**
 * Guard that checks if a numeric property is less than a value
 */
export function lessThan<TContext>(
  key: keyof TContext,
  threshold: number
): Guard<TContext> {
  return (context: FSMContext<TContext>) => {
    const value = context.state[key];
    const numValue = typeof value === "number" ? value : 0;
    return {
      passed: numValue < threshold,
      reason: `${String(key)} (${numValue}) is not less than ${threshold}`,
    };
  };
}

/**
 * Guard that checks if a numeric property is within a range
 */
export function inRange<TContext>(
  key: keyof TContext,
  min: number,
  max: number
): Guard<TContext> {
  return (context: FSMContext<TContext>) => {
    const value = context.state[key];
    const numValue = typeof value === "number" ? value : 0;
    const passed = numValue >= min && numValue <= max;
    return {
      passed,
      reason: passed
        ? undefined
        : `${String(key)} (${numValue}) is not in range [${min}, ${max}]`,
    };
  };
}

// ============================================
// AGENT-SPECIFIC GUARDS
// ============================================

/**
 * Guard that checks if turn limit is not exceeded
 */
export function maxTurnsGuard<TContext extends { turnNumber?: number }>(
  maxTurns: number
): Guard<TContext> {
  return (context: FSMContext<TContext>) => {
    const turnNumber = context.state.turnNumber ?? 0;
    const passed = turnNumber < maxTurns;
    return {
      passed,
      reason: passed
        ? undefined
        : `Turn limit exceeded: ${turnNumber} >= ${maxTurns}`,
    };
  };
}

/**
 * Guard that checks if cost threshold is not exceeded
 */
export function costThresholdGuard<TContext extends { totalCost?: number }>(
  maxCost: number
): Guard<TContext> {
  return (context: FSMContext<TContext>) => {
    const totalCost = context.state.totalCost ?? 0;
    const passed = totalCost < maxCost;
    return {
      passed,
      reason: passed
        ? undefined
        : `Cost threshold exceeded: $${totalCost.toFixed(4)} >= $${maxCost}`,
    };
  };
}

/**
 * Guard that checks if session timeout is not exceeded
 */
export function timeoutGuard<TContext extends { sessionStartTime?: number }>(
  timeoutMs: number
): Guard<TContext> {
  return (context: FSMContext<TContext>) => {
    const startTime = context.state.sessionStartTime ?? Date.now();
    const elapsed = Date.now() - startTime;
    const passed = elapsed < timeoutMs;
    return {
      passed,
      reason: passed
        ? undefined
        : `Session timeout exceeded: ${elapsed}ms >= ${timeoutMs}ms`,
    };
  };
}

/**
 * Guard that checks if context window has capacity
 */
export function contextWindowGuard<
  TContext extends { estimatedTokens?: number }
>(contextWindow: number, threshold: number = 0.9): Guard<TContext> {
  return (context: FSMContext<TContext>) => {
    const tokens = context.state.estimatedTokens ?? 0;
    const limit = contextWindow * threshold;
    const passed = tokens < limit;
    return {
      passed,
      reason: passed
        ? undefined
        : `Context window near capacity: ${tokens} >= ${limit} (${threshold * 100}% of ${contextWindow})`,
    };
  };
}

/**
 * Guard that checks if a tool is allowed
 */
export function toolAllowedGuard<
  TContext extends { allowedTools?: string[]; disallowedTools?: string[] }
>(toolName: string): Guard<TContext> {
  return (context: FSMContext<TContext>) => {
    const { allowedTools, disallowedTools } = context.state;

    if (disallowedTools?.includes(toolName)) {
      return {
        passed: false,
        reason: `Tool '${toolName}' is in disallowed list`,
      };
    }

    if (allowedTools && !allowedTools.includes(toolName) && !allowedTools.includes("*")) {
      return {
        passed: false,
        reason: `Tool '${toolName}' is not in allowed list`,
      };
    }

    return { passed: true };
  };
}

/**
 * Guard that checks if error count is below threshold
 */
export function errorCountGuard<TContext extends { errorCount?: number }>(
  maxErrors: number
): Guard<TContext> {
  return (context: FSMContext<TContext>) => {
    const errorCount = context.state.errorCount ?? 0;
    const passed = errorCount < maxErrors;
    return {
      passed,
      reason: passed
        ? undefined
        : `Error limit exceeded: ${errorCount} >= ${maxErrors}`,
    };
  };
}

// ============================================
// COMBINATOR GUARDS
// ============================================

/**
 * Combine multiple guards with AND logic (all must pass)
 */
export function allGuards<TContext>(...guards: Guard<TContext>[]): Guard<TContext> {
  return (context: FSMContext<TContext>) => {
    for (let i = 0; i < guards.length; i++) {
      const result = evaluateGuard(guards[i], context);
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
 * Combine multiple guards with OR logic (any must pass)
 */
export function anyGuard<TContext>(...guards: Guard<TContext>[]): Guard<TContext> {
  return (context: FSMContext<TContext>) => {
    const failures: string[] = [];

    for (const guard of guards) {
      const result = evaluateGuard(guard, context);
      if (result.passed) {
        return { passed: true };
      }
      if (result.reason) {
        failures.push(result.reason);
      }
    }

    return {
      passed: false,
      reason: failures.length > 0 ? failures.join("; ") : "All guards failed",
    };
  };
}

/**
 * Chain guards with short-circuit evaluation
 */
export function chainGuards<TContext>(...guards: Guard<TContext>[]): Guard<TContext> {
  return allGuards(...guards);
}

// ============================================
// CONDITIONAL GUARDS
// ============================================

/**
 * Guard that only runs if a condition is met
 */
export function conditionalGuard<TContext>(
  condition: (context: FSMContext<TContext>) => boolean,
  guard: Guard<TContext>
): Guard<TContext> {
  return (context: FSMContext<TContext>) => {
    if (!condition(context)) {
      return { passed: true }; // Skip guard if condition not met
    }
    return evaluateGuard(guard, context);
  };
}

/**
 * Guard with a custom predicate
 */
export function customGuard<TContext>(
  predicate: (context: FSMContext<TContext>) => boolean | GuardResult,
  reason?: string
): Guard<TContext> {
  return (context: FSMContext<TContext>) => {
    const result = predicate(context);
    if (typeof result === "boolean") {
      return { passed: result, reason };
    }
    return result;
  };
}

// ============================================
// UTILITIES
// ============================================

/**
 * Evaluate a guard and normalize the result
 */
export function evaluateGuard<TContext>(
  guard: Guard<TContext> | null | undefined,
  context: FSMContext<TContext>
): GuardResult {
  if (!guard) {
    return { passed: true };
  }

  const result = guard(context);
  if (typeof result === "boolean") {
    return { passed: result };
  }
  return result;
}

/**
 * Create a guard from a simple boolean function
 */
export function createGuard<TContext>(
  fn: (context: FSMContext<TContext>) => boolean,
  reason?: string
): Guard<TContext> {
  return (context: FSMContext<TContext>) => ({
    passed: fn(context),
    reason,
  });
}

/**
 * Debounce a guard - only re-evaluate after interval
 */
export function debounceGuard<TContext>(
  guard: Guard<TContext>,
  intervalMs: number
): Guard<TContext> {
  let lastEvalTime = 0;
  let lastResult: GuardResult = { passed: true };

  return (context: FSMContext<TContext>) => {
    const now = Date.now();
    if (now - lastEvalTime >= intervalMs) {
      lastResult = evaluateGuard(guard, context);
      lastEvalTime = now;
    }
    return lastResult;
  };
}

/**
 * Memoize a guard result based on context state
 */
export function memoizeGuard<TContext>(
  guard: Guard<TContext>,
  keyFn: (context: FSMContext<TContext>) => string
): Guard<TContext> {
  const cache = new Map<string, { result: GuardResult; timestamp: number }>();
  const TTL = 1000; // 1 second cache

  return (context: FSMContext<TContext>) => {
    const key = keyFn(context);
    const cached = cache.get(key);
    const now = Date.now();

    if (cached && now - cached.timestamp < TTL) {
      return cached.result;
    }

    const result = evaluateGuard(guard, context);
    cache.set(key, { result, timestamp: now });
    return result;
  };
}
