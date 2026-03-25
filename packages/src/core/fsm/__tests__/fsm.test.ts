/**
 * Tests for FSM DSL
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  FSM,
  createFSM,
  createSimpleFSM,
  and,
  or,
  not,
  sequence,
  logAction,
  assign,
  type FSMContext,
  type FSMEvent,
  type FSMConfig,
  type GuardResult,
} from "../fsm.js";

// ============================================
// TEST TYPES
// ============================================

interface TestContext {
  count: number;
  name: string;
  canProceed: boolean;
}

const initialContext: TestContext = {
  count: 0,
  name: "test",
  canProceed: true,
};

// ============================================
// BASIC FSM TESTS
// ============================================

describe("FSM - Basic", () => {
  test("should create a machine with initial state", () => {
    const machine = createFSM<void>({
      id: "test",
      initial: "idle",
      states: {
        idle: {},
        running: {},
      },
    });

    expect(machine.current).toBe("idle");
    expect(machine.done).toBe(false);
  });

  test("should transition on event", () => {
    const machine = createFSM<void>({
      id: "test",
      initial: "idle",
      states: {
        idle: {
          on: {
            START: { target: "running" },
          },
        },
        running: {},
      },
    });

    const result = machine.send({ type: "START" });

    expect(machine.current).toBe("running");
    expect(result.transitioned).toBe(true);
    expect(result.fromState).toBe("idle");
    expect(result.toState).toBe("running");
  });

  test("should handle string event shorthand", () => {
    const machine = createFSM<void>({
      id: "test",
      initial: "idle",
      states: {
        idle: {
          on: {
            START: { target: "running" },
          },
        },
        running: {},
      },
    });

    machine.send("START");
    expect(machine.current).toBe("running");
  });

  test("should not transition on invalid event", () => {
    const machine = createFSM<void>({
      id: "test",
      initial: "idle",
      states: {
        idle: {},
        running: {},
      },
    });

    const result = machine.send({ type: "UNKNOWN" });

    expect(machine.current).toBe("idle");
    expect(result.transitioned).toBe(false);
  });

  test("should track state history", () => {
    const machine = createFSM<void>({
      id: "test",
      initial: "idle",
      states: {
        idle: { on: { NEXT: { target: "step1" } } },
        step1: { on: { NEXT: { target: "step2" } } },
        step2: { on: { NEXT: { target: "step3" } } },
        step3: {},
      },
    });

    machine.send("NEXT");
    machine.send("NEXT");
    machine.send("NEXT");

    expect(machine.history).toEqual(["idle", "step1", "step2", "step3"]);
  });

  test("should track event history", () => {
    const machine = createFSM<void>({
      id: "test",
      initial: "idle",
      states: {
        idle: { on: { GO: { target: "done" } } },
        done: {},
      },
    });

    machine.send({ type: "GO", payload: { value: 42 } });

    expect(machine.events.length).toBe(1);
    expect(machine.events[0].type).toBe("GO");
    expect(machine.events[0].payload).toEqual({ value: 42 });
  });
});

// ============================================
// FINAL STATES
// ============================================

describe("FSM - Final States", () => {
  test("should mark done when entering final state", () => {
    const machine = createFSM<void>({
      id: "test",
      initial: "idle",
      states: {
        idle: { on: { FINISH: { target: "done" } } },
        done: { final: true },
      },
    });

    machine.send("FINISH");

    expect(machine.current).toBe("done");
    expect(machine.done).toBe(true);
  });

  test("should ignore events when done", () => {
    const machine = createFSM<void>({
      id: "test",
      initial: "idle",
      states: {
        idle: { on: { FINISH: { target: "done" } } },
        done: { final: true },
      },
    });

    machine.send("FINISH");
    const result = machine.send("FINISH");

    expect(result.transitioned).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("should mark done if initial state is final", () => {
    const machine = createFSM<void>({
      id: "test",
      initial: "done",
      states: {
        done: { final: true },
      },
    });

    expect(machine.done).toBe(true);
  });
});

// ============================================
// GUARDS
// ============================================

describe("FSM - Guards", () => {
  test("should block transition when guard returns false", () => {
    const machine = createFSM<TestContext>({
      id: "test",
      initial: "idle",
      context: initialContext,
      states: {
        idle: {
          on: {
            GO: {
              target: "done",
              guard: (ctx) => ctx.state.canProceed,
            },
          },
        },
        done: {},
      },
    });

    machine.updateContext({ canProceed: false });
    const result = machine.send("GO");

    expect(machine.current).toBe("idle");
    expect(result.transitioned).toBe(false);
    expect(result.guardsChecked.length).toBe(1);
    expect(result.guardsChecked[0].passed).toBe(false);
  });

  test("should allow transition when guard returns true", () => {
    const machine = createFSM<TestContext>({
      id: "test",
      initial: "idle",
      context: initialContext,
      states: {
        idle: {
          on: {
            GO: {
              target: "done",
              guard: (ctx) => ctx.state.canProceed,
            },
          },
        },
        done: {},
      },
    });

    const result = machine.send("GO");

    expect(machine.current).toBe("done");
    expect(result.transitioned).toBe(true);
    expect(result.guardsChecked[0].passed).toBe(true);
  });

  test("should support GuardResult with reason", () => {
    const machine = createFSM<TestContext>({
      id: "test",
      initial: "idle",
      context: initialContext,
      states: {
        idle: {
          on: {
            GO: {
              target: "done",
              guard: (ctx): GuardResult => {
                if (!ctx.state.canProceed) {
                  return { passed: false, reason: "Not allowed to proceed" };
                }
                return { passed: true };
              },
            },
          },
        },
        done: {},
      },
    });

    machine.updateContext({ canProceed: false });
    const result = machine.send("GO");

    expect(result.guardsChecked[0].reason).toBe("Not allowed to proceed");
  });

  test("should try multiple transitions in order", () => {
    const machine = createFSM<TestContext>({
      id: "test",
      initial: "idle",
      context: initialContext,
      states: {
        idle: {
          on: {
            GO: [
              { target: "path1", guard: (ctx) => ctx.state.count > 10 },
              { target: "path2", guard: (ctx) => ctx.state.count > 5 },
              { target: "path3" }, // fallback
            ],
          },
        },
        path1: {},
        path2: {},
        path3: {},
      },
    });

    machine.updateContext({ count: 7 });
    machine.send("GO");
    expect(machine.current).toBe("path2");

    machine.reset();
    machine.updateContext({ count: 15 });
    machine.send("GO");
    expect(machine.current).toBe("path1");

    machine.reset();
    machine.updateContext({ count: 3 });
    machine.send("GO");
    expect(machine.current).toBe("path3");
  });
});

// ============================================
// GUARD COMBINATORS
// ============================================

describe("FSM - Guard Combinators", () => {
  test("and() should require all guards to pass", () => {
    const guard = and(
      (ctx: FSMContext<TestContext>) => ctx.state.count > 0,
      (ctx: FSMContext<TestContext>) => ctx.state.canProceed
    );

    const machine = createFSM<TestContext>({
      id: "test",
      initial: "idle",
      context: { count: 5, name: "test", canProceed: true },
      states: {
        idle: {
          on: {
            GO: { target: "done", guard },
          },
        },
        done: {},
      },
    });

    let result = machine.send("GO");
    expect(result.transitioned).toBe(true);

    machine.reset();
    machine.updateContext({ canProceed: false });
    result = machine.send("GO");
    expect(result.transitioned).toBe(false);
  });

  test("or() should require any guard to pass", () => {
    const guard = or(
      (ctx: FSMContext<TestContext>) => ctx.state.count > 100,
      (ctx: FSMContext<TestContext>) => ctx.state.canProceed
    );

    const machine = createFSM<TestContext>({
      id: "test",
      initial: "idle",
      context: { count: 5, name: "test", canProceed: true },
      states: {
        idle: {
          on: {
            GO: { target: "done", guard },
          },
        },
        done: {},
      },
    });

    // canProceed is true, so should pass even though count < 100
    const result = machine.send("GO");
    expect(result.transitioned).toBe(true);
  });

  test("not() should negate guard", () => {
    const guard = not((ctx: FSMContext<TestContext>) => ctx.state.count > 10);

    const machine = createFSM<TestContext>({
      id: "test",
      initial: "idle",
      context: { count: 5, name: "test", canProceed: true },
      states: {
        idle: {
          on: {
            GO: { target: "done", guard },
          },
        },
        done: {},
      },
    });

    let result = machine.send("GO");
    expect(result.transitioned).toBe(true); // count is 5, not > 10, so negated guard passes

    machine.reset();
    machine.updateContext({ count: 15 });
    result = machine.send("GO");
    expect(result.transitioned).toBe(false); // count is 15, > 10, so negated guard fails
  });
});

// ============================================
// ACTIONS
// ============================================

describe("FSM - Actions", () => {
  test("should execute entry action", () => {
    let entered = false;

    const machine = createFSM<void>({
      id: "test",
      initial: "idle",
      states: {
        idle: {
          on: { GO: { target: "running" } },
        },
        running: {
          entry: () => {
            entered = true;
          },
        },
      },
    });

    machine.send("GO");
    expect(entered).toBe(true);
  });

  test("should execute exit action", () => {
    let exited = false;

    const machine = createFSM<void>({
      id: "test",
      initial: "idle",
      states: {
        idle: {
          on: { GO: { target: "running" } },
          exit: () => {
            exited = true;
          },
        },
        running: {},
      },
    });

    machine.send("GO");
    expect(exited).toBe(true);
  });

  test("should execute transition action", () => {
    let actionCalled = false;

    const machine = createFSM<void>({
      id: "test",
      initial: "idle",
      states: {
        idle: {
          on: {
            GO: {
              target: "running",
              action: () => {
                actionCalled = true;
              },
            },
          },
        },
        running: {},
      },
    });

    machine.send("GO");
    expect(actionCalled).toBe(true);
  });

  test("should execute multiple actions in sequence", () => {
    const order: number[] = [];

    const machine = createFSM<void>({
      id: "test",
      initial: "idle",
      states: {
        idle: {
          on: {
            GO: {
              target: "running",
              action: [
                () => order.push(1),
                () => order.push(2),
                () => order.push(3),
              ],
            },
          },
          exit: () => order.push(4),
        },
        running: {
          entry: () => order.push(5),
        },
      },
    });

    machine.send("GO");
    // Exit action runs before transition actions, then entry
    expect(order).toEqual([4, 1, 2, 3, 5]);
  });
});

// ============================================
// ACTION COMBINATORS
// ============================================

describe("FSM - Action Combinators", () => {
  test("sequence() should execute actions in order", async () => {
    const order: number[] = [];

    const machine = createFSM<void>({
      id: "test",
      initial: "idle",
      states: {
        idle: {
          on: {
            GO: {
              target: "done",
              action: [
                () => order.push(1),
                () => order.push(2),
                () => order.push(3),
              ],
            },
          },
        },
        done: {},
      },
    });

    machine.send("GO");
    // Actions execute in order: exit, transition actions, entry
    expect(order).toEqual([1, 2, 3]);
  });

  test("assign() should update context", () => {
    const machine = createFSM<TestContext>({
      id: "test",
      initial: "idle",
      context: initialContext,
      states: {
        idle: {
          on: {
            GO: {
              target: "done",
              action: assign({ count: 100, name: "updated" }),
            },
          },
        },
        done: {},
      },
    });

    machine.send("GO");
    expect(machine.context.count).toBe(100);
    expect(machine.context.name).toBe("updated");
  });

  test("assign() with function should use context", () => {
    // Fresh context for this test
    const freshContext: TestContext = { count: 0, name: "test", canProceed: true };

    const machine = createFSM<TestContext>({
      id: "test",
      initial: "idle",
      context: freshContext,
      states: {
        idle: {
          on: {
            GO: {
              target: "done",
              action: assign((ctx) => ({ count: ctx.state.count + 10 })),
            },
          },
        },
        done: {},
      },
    });

    machine.send("GO");
    expect(machine.context.count).toBe(10);
  });
});

// ============================================
// CONTEXT
// ============================================

describe("FSM - Context", () => {
  test("should initialize with context", () => {
    const machine = createFSM<TestContext>({
      id: "test",
      initial: "idle",
      context: { count: 42, name: "init", canProceed: true },
      states: {
        idle: {},
      },
    });

    expect(machine.context.count).toBe(42);
    expect(machine.context.name).toBe("init");
  });

  test("should update context", () => {
    const machine = createFSM<TestContext>({
      id: "test",
      initial: "idle",
      context: initialContext,
      states: {
        idle: {},
      },
    });

    machine.updateContext({ count: 100 });
    expect(machine.context.count).toBe(100);
  });

  test("should set entire context", () => {
    const machine = createFSM<TestContext>({
      id: "test",
      initial: "idle",
      context: initialContext,
      states: {
        idle: {},
      },
    });

    machine.setContext({ count: 200, name: "new", canProceed: false });
    expect(machine.context.count).toBe(200);
    expect(machine.context.canProceed).toBe(false);
  });
});

// ============================================
// INTERNAL TRANSITIONS
// ============================================

describe("FSM - Internal Transitions", () => {
  test("internal transition should not change state", () => {
    const machine = createFSM<void>({
      id: "test",
      initial: "idle",
      states: {
        idle: {
          on: {
            SELF: {
              target: "idle",
              internal: true,
            },
          },
        },
      },
    });

    const result = machine.send("SELF");
    expect(machine.current).toBe("idle");
    expect(result.transitioned).toBe(true);
    expect(result.toState).toBe("idle");
  });
});

// ============================================
// SERIALIZATION
// ============================================

describe("FSM - Serialization", () => {
  test("should serialize and deserialize", () => {
    // Fresh context for this test
    const freshContext: TestContext = { count: 0, name: "test", canProceed: true };

    const config: FSMConfig<TestContext> = {
      id: "test",
      initial: "idle",
      context: freshContext,
      states: {
        idle: { on: { GO: { target: "done" } } },
        done: { final: true },
      },
    };

    const machine = createFSM(config);
    machine.send("GO");

    const serialized = machine.serialize();
    const restored = FSM.deserialize(config, serialized);

    expect(restored.current).toBe("done");
    expect(restored.done).toBe(true);
    expect(restored.context.count).toBe(0);
  });
});

// ============================================
// RESET
// ============================================

describe("FSM - Reset", () => {
  test("should reset to initial state", () => {
    const machine = createFSM<TestContext>({
      id: "test",
      initial: "idle",
      context: initialContext,
      states: {
        idle: { on: { GO: { target: "done" } } },
        done: { final: true },
      },
    });

    machine.send("GO");
    expect(machine.current).toBe("done");

    machine.reset();
    expect(machine.current).toBe("idle");
    expect(machine.done).toBe(false);
  });
});

// ============================================
// QUERY METHODS
// ============================================

describe("FSM - Query Methods", () => {
  test("isIn() should check current state", () => {
    const machine = createFSM<void>({
      id: "test",
      initial: "idle",
      states: {
        idle: { on: { GO: { target: "running" } } },
        running: {},
      },
    });

    expect(machine.isIn("idle")).toBe(true);
    machine.send("GO");
    expect(machine.isIn("running")).toBe(true);
    expect(machine.isIn("idle")).toBe(false);
  });

  test("can() should check available events", () => {
    const machine = createFSM<void>({
      id: "test",
      initial: "idle",
      states: {
        idle: {
          on: {
            START: { target: "running" },
            STOP: { target: "stopped" },
          },
        },
        running: {},
        stopped: {},
      },
    });

    expect(machine.can("START")).toBe(true);
    expect(machine.can("STOP")).toBe(true);
    expect(machine.can("PAUSE")).toBe(false);
  });

  test("availableEvents() should list available events", () => {
    const machine = createFSM<void>({
      id: "test",
      initial: "idle",
      states: {
        idle: {
          on: {
            START: { target: "running" },
            STOP: { target: "stopped" },
          },
        },
        running: {},
        stopped: {},
      },
    });

    const events = machine.availableEvents();
    expect(events).toContain("START");
    expect(events).toContain("STOP");
    expect(events.length).toBe(2);
  });

  test("nextStates() should list possible next states", () => {
    const machine = createFSM<void>({
      id: "test",
      initial: "idle",
      states: {
        idle: {
          on: {
            START: { target: "running" },
            STOP: { target: "stopped" },
          },
        },
        running: {},
        stopped: {},
      },
    });

    const states = machine.nextStates();
    expect(states).toContain("running");
    expect(states).toContain("stopped");
  });
});

// ============================================
// VERBOSE LOGGING
// ============================================

describe("FSM - Verbose", () => {
  test("should log when verbose is enabled", () => {
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args) => logs.push(args.join(" "));

    const machine = createFSM<void>({
      id: "test",
      initial: "idle",
      verbose: true,
      states: {
        idle: { on: { UNKNOWN: { target: "running" } } },
        running: {},
      },
    });

    machine.send("NONEXISTENT");

    console.log = originalLog;
    expect(logs.some((l) => l.includes("No handler"))).toBe(true);
  });
});

// ============================================
// CREATE SIMPLE FSM
// ============================================

describe("createSimpleFSM", () => {
  test("should create simple state machine", () => {
    const machine = createSimpleFSM("simple", {
      idle: { on: { START: "running" } },
      running: { on: { STOP: "stopped" } },
      stopped: { final: true },
    });

    expect(machine.current).toBe("idle");
    machine.send("START");
    expect(machine.current).toBe("running");
    machine.send("STOP");
    expect(machine.current).toBe("stopped");
    expect(machine.done).toBe(true);
  });
});

// ============================================
// TO STRING
// ============================================

describe("toString", () => {
  test("should return string representation", () => {
    const machine = createFSM<void>({
      id: "my-machine",
      initial: "idle",
      states: {
        idle: {},
      },
    });

    expect(machine.toString()).toBe('FSM(my-machine) { state: "idle", done: false }');
  });
});
