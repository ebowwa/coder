/**
 * Tests for FSM Guards
 */

import { describe, test, expect, beforeEach } from "bun:test";
import {
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
} from "../guards.js";
import type { FSMContext } from "../types.js";

// ============================================
// TEST TYPES
// ============================================

interface TestContext {
  count: number;
  name: string;
  flag: boolean;
  maybeValue?: string;
  allowedTools?: string[];
  disallowedTools?: string[];
  turnNumber?: number;
  totalCost?: number;
  sessionStartTime?: number;
  errorCount?: number;
}

const createContext = (
  overrides: Partial<TestContext> = {}
): FSMContext<TestContext> => ({
  state: { count: 5, name: "test", flag: true, ...overrides },
  event: { type: "TEST" },
  timestamp: Date.now(),
});

// ============================================
// BASIC GUARDS
// ============================================

describe("Basic Guards", () => {
  test("always() should always pass", () => {
    const guard = always();
    const result = evaluateGuard(guard, createContext());
    expect(result.passed).toBe(true);
  });

  test("never() should always fail", () => {
    const guard = never();
    const result = evaluateGuard(guard, createContext());
    expect(result.passed).toBe(false);
  });

  test("never() should include reason", () => {
    const guard = never("Custom reason");
    const result = evaluateGuard(guard, createContext());
    expect(result.reason).toBe("Custom reason");
  });

  test("notGuard() should negate a guard", () => {
    const context = createContext();

    const passingGuard = always();
    expect(evaluateGuard(notGuard(passingGuard), context).passed).toBe(false);

    const failingGuard = never();
    expect(evaluateGuard(notGuard(failingGuard), context).passed).toBe(true);
  });
});

// ============================================
// CONTEXT-BASED GUARDS
// ============================================

describe("Context-Based Guards", () => {
  test("equals() should check equality", () => {
    const guard = equals("count", 5);
    const context = createContext();

    expect(evaluateGuard(guard, context).passed).toBe(true);

    context.state.count = 10;
    expect(evaluateGuard(guard, context).passed).toBe(false);
  });

  test("satisfies() should use predicate", () => {
    const guard = satisfies("count", (n) => n > 3);
    const context = createContext({ count: 5 });

    expect(evaluateGuard(guard, context).passed).toBe(true);

    context.state.count = 2;
    expect(evaluateGuard(guard, context).passed).toBe(false);
  });

  test("isTruthy() should check truthiness", () => {
    const guard = isTruthy("flag");
    const context = createContext({ flag: true });

    expect(evaluateGuard(guard, context).passed).toBe(true);

    context.state.flag = false;
    expect(evaluateGuard(guard, context).passed).toBe(false);
  });

  test("isFalsy() should check falsiness", () => {
    const guard = isFalsy("flag");
    const context = createContext({ flag: false });

    expect(evaluateGuard(guard, context).passed).toBe(true);

    context.state.flag = true;
    expect(evaluateGuard(guard, context).passed).toBe(false);
  });

  test("isDefined() should check for undefined/null", () => {
    const guard = isDefined("maybeValue");
    const context = createContext({ maybeValue: "exists" });

    expect(evaluateGuard(guard, context).passed).toBe(true);

    context.state.maybeValue = undefined;
    expect(evaluateGuard(guard, context).passed).toBe(false);

    context.state.maybeValue = null;
    expect(evaluateGuard(guard, context).passed).toBe(false);
  });
});

// ============================================
// NUMERIC GUARDS
// ============================================

describe("Numeric Guards", () => {
  test("greaterThan() should check > threshold", () => {
    const guard = greaterThan("count", 3);
    const context = createContext({ count: 5 });

    expect(evaluateGuard(guard, context).passed).toBe(true);

    context.state.count = 3;
    expect(evaluateGuard(guard, context).passed).toBe(false);
  });

  test("lessThan() should check < threshold", () => {
    const guard = lessThan("count", 10);
    const context = createContext({ count: 5 });

    expect(evaluateGuard(guard, context).passed).toBe(true);

    context.state.count = 10;
    expect(evaluateGuard(guard, context).passed).toBe(false);
  });

  test("inRange() should check inclusive range", () => {
    const guard = inRange("count", 1, 10);
    const context = createContext();

    context.state.count = 5;
    expect(evaluateGuard(guard, context).passed).toBe(true);

    context.state.count = 1;
    expect(evaluateGuard(guard, context).passed).toBe(true);

    context.state.count = 10;
    expect(evaluateGuard(guard, context).passed).toBe(true);

    context.state.count = 0;
    expect(evaluateGuard(guard, context).passed).toBe(false);

    context.state.count = 11;
    expect(evaluateGuard(guard, context).passed).toBe(false);
  });
});

// ============================================
// AGENT-SPECIFIC GUARDS
// ============================================

describe("Agent-Specific Guards", () => {
  test("maxTurnsGuard() should check turn limit", () => {
    const guard = maxTurnsGuard(10);
    const context = createContext({ turnNumber: 5 });

    expect(evaluateGuard(guard, context).passed).toBe(true);

    context.state.turnNumber = 10;
    expect(evaluateGuard(guard, context).passed).toBe(false);

    context.state.turnNumber = 15;
    expect(evaluateGuard(guard, context).passed).toBe(false);
  });

  test("costThresholdGuard() should check cost limit", () => {
    const guard = costThresholdGuard(1.0);
    const context = createContext({ totalCost: 0.5 });

    expect(evaluateGuard(guard, context).passed).toBe(true);

    context.state.totalCost = 1.0;
    expect(evaluateGuard(guard, context).passed).toBe(false);

    context.state.totalCost = 2.0;
    expect(evaluateGuard(guard, context).passed).toBe(false);
  });

  test("timeoutGuard() should check session duration", () => {
    const guard = timeoutGuard(1000); // 1 second
    const now = Date.now();

    // Session started 500ms ago - should pass
    const context1 = createContext({ sessionStartTime: now - 500 });
    expect(evaluateGuard(guard, context1).passed).toBe(true);

    // Session started 2 seconds ago - should fail
    const context2 = createContext({ sessionStartTime: now - 2000 });
    expect(evaluateGuard(guard, context2).passed).toBe(false);
  });

  test("toolAllowedGuard() should check tool permissions", () => {
    const guard = toolAllowedGuard("Read");

    // No restrictions - should pass
    const context1 = createContext({});
    expect(evaluateGuard(guard, context1).passed).toBe(true);

    // In allowed list - should pass
    const context2 = createContext({ allowedTools: ["Read", "Write"] });
    expect(evaluateGuard(guard, context2).passed).toBe(true);

    // Not in allowed list - should fail
    const context3 = createContext({ allowedTools: ["Write"] });
    expect(evaluateGuard(guard, context3).passed).toBe(false);

    // In disallowed list - should fail
    const context4 = createContext({ disallowedTools: ["Read"] });
    expect(evaluateGuard(guard, context4).passed).toBe(false);

    // Wildcard in allowed list - should pass
    const context5 = createContext({ allowedTools: ["*"] });
    expect(evaluateGuard(guard, context5).passed).toBe(true);
  });

  test("errorCountGuard() should check error limit", () => {
    const guard = errorCountGuard(3);
    const context = createContext();

    context.state.errorCount = 2;
    expect(evaluateGuard(guard, context).passed).toBe(true);

    context.state.errorCount = 3;
    expect(evaluateGuard(guard, context).passed).toBe(false);

    context.state.errorCount = 5;
    expect(evaluateGuard(guard, context).passed).toBe(false);
  });
});

// ============================================
// COMBINATOR GUARDS
// ============================================

describe("Combinator Guards", () => {
  test("allGuards() should require all to pass", () => {
    const guard = allGuards(
      greaterThan("count", 0),
      lessThan("count", 10)
    );
    const context = createContext({ count: 5 });

    expect(evaluateGuard(guard, context).passed).toBe(true);

    context.state.count = 15;
    expect(evaluateGuard(guard, context).passed).toBe(false);

    context.state.count = -1;
    expect(evaluateGuard(guard, context).passed).toBe(false);
  });

  test("anyGuard() should require any to pass", () => {
    const guard = anyGuard(
      equals("count", 5),
      equals("count", 10)
    );
    const context = createContext();

    context.state.count = 5;
    expect(evaluateGuard(guard, context).passed).toBe(true);

    context.state.count = 10;
    expect(evaluateGuard(guard, context).passed).toBe(true);

    context.state.count = 7;
    expect(evaluateGuard(guard, context).passed).toBe(false);
  });
});

// ============================================
// CONDITIONAL GUARDS
// ============================================

describe("Conditional Guards", () => {
  test("conditionalGuard() should skip if condition not met", () => {
    const innerGuard = never("Should not be checked");
    const guard = conditionalGuard(
      (ctx) => ctx.state.count > 100,
      innerGuard
    );

    const context = createContext({ count: 5 });
    // Condition not met, inner guard skipped, should pass
    expect(evaluateGuard(guard, context).passed).toBe(true);

    context.state.count = 101;
    // Condition met, inner guard evaluated, should fail
    expect(evaluateGuard(guard, context).passed).toBe(false);
  });

  test("customGuard() should use custom predicate", () => {
    const guard = customGuard(
      (ctx) => ctx.state.name.startsWith("test"),
      "Name must start with 'test'"
    );

    const context1 = createContext({ name: "testing" });
    expect(evaluateGuard(guard, context1).passed).toBe(true);

    const context2 = createContext({ name: "other" });
    expect(evaluateGuard(guard, context2).passed).toBe(false);
    expect(evaluateGuard(guard, context2).reason).toBe("Name must start with 'test'");
  });
});

// ============================================
// DEBOUNCE GUARD
// ============================================

describe("Debounce Guard", () => {
  test("debounceGuard() should cache result", async () => {
    let callCount = 0;
    const innerGuard = customGuard(() => {
      callCount++;
      return true;
    });

    const guard = debounceGuard(innerGuard, 100);
    const context = createContext();

    // First call
    const result1 = evaluateGuard(guard, context);
    expect(result1.passed).toBe(true);
    expect(callCount).toBe(1);

    // Immediate second call - should use cached result
    const result2 = evaluateGuard(guard, context);
    expect(result2.passed).toBe(true);
    expect(callCount).toBe(1); // Not called again

    // Wait for debounce to expire
    await new Promise((r) => setTimeout(r, 150));

    // Third call - should re-evaluate
    const result3 = evaluateGuard(guard, context);
    expect(result3.passed).toBe(true);
    expect(callCount).toBe(2);
  });
});

// ============================================
// EVALUATE GUARD
// ============================================

describe("evaluateGuard", () => {
  test("should handle null guard", () => {
    const context = createContext();
    const result = evaluateGuard(null, context);
    expect(result.passed).toBe(true);
  });

  test("should handle undefined guard", () => {
    const context = createContext();
    const result = evaluateGuard(undefined, context);
    expect(result.passed).toBe(true);
  });

  test("should normalize boolean result", () => {
    const context = createContext();
    const result = evaluateGuard(() => true, context);
    expect(result.passed).toBe(true);
  });

  test("should preserve GuardResult", () => {
    const context = createContext();
    const result = evaluateGuard(() => ({ passed: false, reason: "test" }), context);
    expect(result.passed).toBe(false);
    expect(result.reason).toBe("test");
  });
});
