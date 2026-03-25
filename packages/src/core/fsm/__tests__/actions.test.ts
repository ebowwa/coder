/**
 * Tests for FSM Actions
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  noop,
  log,
  logContext,
  logTransition,
  assign,
  increment,
  decrement,
  set,
  unset,
  resetContext,
  push,
  pop,
  delay,
  asyncAction,
  sequence,
  parallel,
  when,
  ifElse,
  retry,
  trackToolUse,
  updateCost,
  incrementTurn,
  recordError,
  setCheckpoint,
  createAction,
} from "../actions.js";
import type { FSMContext } from "../types.js";

// ============================================
// TEST TYPES
// ============================================

interface TestContext {
  count: number;
  name: string;
  items: string[];
  totalCost?: number;
  lastCost?: number;
  turnNumber?: number;
  toolsUsed?: Array<{ name: string; timestamp: number }>;
  errors?: Array<{ message: string; timestamp: number }>;
  checkpoints?: Array<{ id: string; timestamp: number; state: string }>;
}

const createContext = (
  overrides: Partial<TestContext> = {}
): FSMContext<TestContext> => ({
  state: {
    count: 0,
    name: "initial",
    items: [],
    ...overrides,
  },
  event: { type: "TEST" },
  timestamp: Date.now(),
});

// ============================================
// BASIC ACTIONS
// ============================================

describe("Basic Actions", () => {
  test("noop() should do nothing", async () => {
    const context = createContext();
    await noop()(context);
    expect(context.state.count).toBe(0);
  });

  test("log() should log message", async () => {
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args) => logs.push(args.join(" "));

    await log("Test message")(createContext());

    console.log = originalLog;
    expect(logs[0]).toContain("Test message");
  });

  test("log() with function should evaluate", async () => {
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args) => logs.push(args.join(" "));

    await log((ctx) => `Count is ${ctx.state.count}`)(createContext({ count: 5 }));

    console.log = originalLog;
    expect(logs[0]).toContain("Count is 5");
  });
});

// ============================================
// CONTEXT UPDATE ACTIONS
// ============================================

describe("Context Update Actions", () => {
  test("assign() should merge updates", async () => {
    const context = createContext();
    await assign({ count: 10, name: "updated" })(context);

    expect(context.state.count).toBe(10);
    expect(context.state.name).toBe("updated");
  });

  test("assign() with function should use context", async () => {
    const context = createContext({ count: 5 });
    await assign((ctx) => ({ count: ctx.state.count * 2 }))(context);

    expect(context.state.count).toBe(10);
  });

  test("increment() should add to number", async () => {
    const context = createContext({ count: 5 });
    await increment("count")(context);
    expect(context.state.count).toBe(6);

    await increment("count", 10)(context);
    expect(context.state.count).toBe(16);
  });

  test("decrement() should subtract from number", async () => {
    const context = createContext({ count: 10 });
    await decrement("count")(context);
    expect(context.state.count).toBe(9);

    await decrement("count", 5)(context);
    expect(context.state.count).toBe(4);
  });

  test("set() should set value", async () => {
    const context = createContext();
    await set("name", "new value")(context);
    expect(context.state.name).toBe("new value");
  });

  test("set() with function should evaluate", async () => {
    const context = createContext({ count: 5 });
    await set("count", (ctx) => ctx.state.count * 3)(context);
    expect(context.state.count).toBe(15);
  });

  test("unset() should delete property", async () => {
    const context = createContext({ count: 5, name: "test" } as TestContext);
    expect("count" in context.state).toBe(true);

    await unset("count")(context);
    expect("count" in context.state).toBe(false);
  });

  test("resetContext() should reset to initial", async () => {
    const context = createContext({ count: 100, name: "modified" });
    await resetContext({ count: 0, name: "initial", items: [] })(context);

    expect(context.state.count).toBe(0);
    expect(context.state.name).toBe("initial");
  });
});

// ============================================
// ARRAY ACTIONS
// ============================================

describe("Array Actions", () => {
  test("push() should add to array", async () => {
    const context = createContext({ items: ["a"] });
    await push("items", "b")(context);

    expect(context.state.items).toEqual(["a", "b"]);
  });

  test("push() with function should evaluate value", async () => {
    const context = createContext({ items: [], count: 5 });
    await push("items", (ctx) => `item_${ctx.state.count}`)(context);

    expect(context.state.items).toEqual(["item_5"]);
  });

  test("push() should create array if not exists", async () => {
    const context = createContext({} as TestContext);
    await push("items", "first")(context);

    expect(context.state.items).toEqual(["first"]);
  });

  test("pop() should remove from array", async () => {
    const context = createContext({ items: ["a", "b", "c"] });
    await pop("items")(context);

    expect(context.state.items).toEqual(["a", "b"]);
  });

  test("pop() should handle empty array", async () => {
    const context = createContext({ items: [] });
    await pop("items")(context);

    expect(context.state.items).toEqual([]);
  });
});

// ============================================
// ASYNC ACTIONS
// ============================================

describe("Async Actions", () => {
  test("delay() should wait", async () => {
    const start = Date.now();
    await delay(50)(createContext());
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(40);
  });

  test("asyncAction() should handle success", async () => {
    let called = false;
    const action = asyncAction(async () => {
      called = true;
    });

    await action(createContext());
    expect(called).toBe(true);
  });

  test("asyncAction() should handle error", async () => {
    const errors: Error[] = [];
    const action = asyncAction(
      async () => {
        throw new Error("Test error");
      },
      (error) => errors.push(error)
    );

    await action(createContext());
    expect(errors.length).toBe(1);
    expect(errors[0].message).toBe("Test error");
  });
});

// ============================================
// COMBINATOR ACTIONS
// ============================================

describe("Combinator Actions", () => {
  test("sequence() should execute in order", async () => {
    const order: number[] = [];
    const context = createContext();

    await sequence(
      () => order.push(1),
      () => order.push(2),
      () => order.push(3)
    )(context);

    expect(order).toEqual([1, 2, 3]);
  });

  test("parallel() should execute concurrently", async () => {
    const results: number[] = [];
    const context = createContext();
    const start = Date.now();

    // Execute two actions in parallel with delays
    await parallel(
      async () => {
        await delay(50);
        results.push(1);
      },
      async () => {
        await delay(50);
        results.push(2);
      }
    )(context);

    const elapsed = Date.now() - start;

    // Both should complete
    expect(results.length).toBe(2);
    expect(results).toContain(1);
    expect(results).toContain(2);
    // Total time should be ~50ms, not ~100ms if sequential
    expect(elapsed).toBeLessThan(100);
  });

  test("when() should conditionally execute", async () => {
    const context = createContext({ count: 10 });
    let executed = false;

    await when(
      (ctx) => ctx.state.count > 5,
      () => { executed = true; }
    )(context);

    expect(executed).toBe(true);

    executed = false;
    context.state.count = 3;

    await when(
      (ctx) => ctx.state.count > 5,
      () => { executed = true; }
    )(context);

    expect(executed).toBe(false);
  });

  test("ifElse() should branch correctly", async () => {
    const context = createContext();
    let result = "";

    await ifElse(
      (ctx) => ctx.state.count > 0,
      () => { result = "positive"; },
      () => { result = "non-positive"; }
    )(context);

    expect(result).toBe("non-positive");

    context.state.count = 5;

    await ifElse(
      (ctx) => ctx.state.count > 0,
      () => { result = "positive"; },
      () => { result = "non-positive"; }
    )(context);

    expect(result).toBe("positive");
  });

  test("retry() should retry on failure", async () => {
    let attempts = 0;
    const context = createContext();

    const action = retry(
      async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error("Not yet");
        }
      },
      { maxRetries: 3, delay: 10 }
    );

    await action(context);
    expect(attempts).toBe(3);
  });

  test("retry() should fail after max retries", async () => {
    let attempts = 0;
    const context = createContext();

    const action = retry(
      async () => {
        attempts++;
        throw new Error("Always fails");
      },
      { maxRetries: 2, delay: 10 }
    );

    await expect(action(context)).rejects.toThrow("Always fails");
    expect(attempts).toBe(3); // Initial + 2 retries
  });
});

// ============================================
// AGENT-SPECIFIC ACTIONS
// ============================================

describe("Agent-Specific Actions", () => {
  test("trackToolUse() should add to toolsUsed", async () => {
    const context = createContext();
    await trackToolUse("Read")(context);

    expect(context.state.toolsUsed).toBeDefined();
    expect(context.state.toolsUsed!.length).toBe(1);
    expect(context.state.toolsUsed![0].name).toBe("Read");
  });

  test("updateCost() should update cost tracking", async () => {
    const context = createContext();
    await updateCost(0.05)(context);

    expect(context.state.lastCost).toBe(0.05);
    expect(context.state.totalCost).toBe(0.05);

    await updateCost(0.03)(context);
    expect(context.state.lastCost).toBe(0.03);
    expect(context.state.totalCost).toBe(0.08);
  });

  test("incrementTurn() should increment turn counter", async () => {
    const context = createContext();

    await incrementTurn()(context);
    expect(context.state.turnNumber).toBe(1);

    await incrementTurn()(context);
    expect(context.state.turnNumber).toBe(2);
  });

  test("recordError() should add to errors", async () => {
    const context = createContext();

    await recordError("First error")(context);
    expect(context.state.errors!.length).toBe(1);
    expect(context.state.errors![0].message).toBe("First error");

    await recordError(new Error("Second error"))(context);
    expect(context.state.errors!.length).toBe(2);
    expect(context.state.errors![1].message).toBe("Second error");
  });

  test("setCheckpoint() should add checkpoint", async () => {
    const context = createContext();
    context.previousState = "state1";

    await setCheckpoint("cp_001")(context);

    expect(context.state.checkpoints!.length).toBe(1);
    expect(context.state.checkpoints![0].id).toBe("cp_001");
    expect(context.state.checkpoints![0].state).toBe("state1");
  });
});

// ============================================
// CREATE ACTION
// ============================================

describe("createAction", () => {
  test("should create custom action", async () => {
    const context = createContext();

    const action = createAction((ctx) => {
      ctx.state.count = 100;
      ctx.state.name = "custom";
    });

    await action(context);

    expect(context.state.count).toBe(100);
    expect(context.state.name).toBe("custom");
  });

  test("should support async custom action", async () => {
    const context = createContext();

    const action = createAction(async (ctx) => {
      await delay(10);
      ctx.state.count = 50;
    });

    await action(context);

    expect(context.state.count).toBe(50);
  });
});
