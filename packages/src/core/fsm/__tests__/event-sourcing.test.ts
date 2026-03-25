/**
 * Tests for Event Sourcing System
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  EventStore,
  createEventStore,
  createEvent,
  type StateEvent,
  type StateSnapshot,
  type StateEventType,
} from "../event-sourcing.js";

// ============================================
// TEST TYPES
// ============================================

interface TestState {
  count: number;
  total: number;
  history: string[];
}

interface TurnPayload {
  turnNumber: number;
  cost: number;
}

interface ToolPayload {
  toolName: string;
  success: boolean;
}

// ============================================
// HELPERS
// ============================================

const initialState: TestState = {
  count: 0,
  total: 0,
  history: [],
};

function testReducer(state: TestState, event: StateEvent): TestState {
  switch (event.type) {
    case "turn_complete":
      const turn = event.payload as TurnPayload;
      return {
        ...state,
        count: state.count + 1,
        total: state.total + turn.cost,
        history: [...state.history, `turn_${turn.turnNumber}`],
      };
    case "tool_used":
      const tool = event.payload as ToolPayload;
      return {
        ...state,
        history: [...state.history, `tool_${tool.toolName}`],
      };
    case "reset":
      return initialState;
    default:
      return state;
  }
}

// ============================================
// TESTS
// ============================================

describe("EventStore", () => {
  let store: EventStore<TestState>;

  beforeEach(() => {
    store = new EventStore<TestState>();
  });

  afterEach(() => {
    store.clear();
  });

  // ============================================
  // RECORDING
  // ============================================

  describe("record", () => {
    test("should record an event", () => {
      const event = store.record("turn_complete", { turnNumber: 1, cost: 0.01 });

      expect(event.id).toBeDefined();
      expect(event.type).toBe("turn_complete");
      expect(event.timestamp).toBeGreaterThan(0);
      expect(event.payload).toEqual({ turnNumber: 1, cost: 0.01 });
    });

    test("should record multiple events", () => {
      store.record("turn_complete", { turnNumber: 1, cost: 0.01 });
      store.record("turn_complete", { turnNumber: 2, cost: 0.02 });
      store.record("tool_used", { toolName: "Read", success: true });

      expect(store.eventCount).toBe(3);
    });

    test("should include correlation ID", () => {
      const event = store.record("turn_complete", { turnNumber: 1, cost: 0.01 }, {
        correlationId: "corr_123",
      });

      expect(event.correlationId).toBe("corr_123");
    });

    test("should include causation ID", () => {
      const event = store.record("turn_complete", { turnNumber: 1, cost: 0.01 }, {
        causationId: "cause_456",
      });

      expect(event.causationId).toBe("cause_456");
    });

    test("should include metadata", () => {
      const event = store.record("turn_complete", { turnNumber: 1, cost: 0.01 }, {
        metadata: { source: "test", priority: "high" },
      });

      expect(event.metadata).toEqual({ source: "test", priority: "high" });
    });

    test("should enforce max events limit", () => {
      const limitedStore = new EventStore<TestState>({ maxEvents: 5 });

      for (let i = 0; i < 10; i++) {
        limitedStore.record("turn_complete", { turnNumber: i, cost: 0.01 });
      }

      expect(limitedStore.eventCount).toBe(5);
      // Should keep the most recent events
      const events = limitedStore.getEvents();
      expect((events[0].payload as TurnPayload).turnNumber).toBe(5);
    });
  });

  // ============================================
  // QUERYING
  // ============================================

  describe("getEvents", () => {
    beforeEach(() => {
      store.record("turn_complete", { turnNumber: 1, cost: 0.01 });
      store.record("tool_used", { toolName: "Read", success: true });
      store.record("turn_complete", { turnNumber: 2, cost: 0.02 });
      store.record("tool_used", { toolName: "Write", success: true });
    });

    test("should get all events", () => {
      const events = store.getEvents();
      expect(events.length).toBe(4);
    });

    test("should get events by type", () => {
      const turnEvents = store.getEventsByType("turn_complete");
      expect(turnEvents.length).toBe(2);

      const toolEvents = store.getEventsByType("tool_used");
      expect(toolEvents.length).toBe(2);
    });

    test("should get event by ID", () => {
      const recorded = store.record("turn_complete", { turnNumber: 3, cost: 0.03 });
      const found = store.getEventById(recorded.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(recorded.id);
    });

    test("should get event by index", () => {
      store.record("turn_complete", { turnNumber: 1, cost: 0.01 });
      const event = store.getEventAtIndex(0);

      expect(event).toBeDefined();
      expect(event?.type).toBe("turn_complete");
    });

    test("should get last N events", () => {
      const lastTwo = store.getLastEvents(2);
      expect(lastTwo.length).toBe(2);
      expect(lastTwo[0].type).toBe("turn_complete");
      expect(lastTwo[1].type).toBe("tool_used");
    });
  });

  describe("getEventsByTimeRange", () => {
    test("should get events in time range", async () => {
      const before = Date.now();
      store.record("turn_complete", { turnNumber: 1, cost: 0.01 });
      await new Promise((r) => setTimeout(r, 10));
      const mid = Date.now();
      store.record("turn_complete", { turnNumber: 2, cost: 0.02 });
      await new Promise((r) => setTimeout(r, 10));
      const after = Date.now();

      const events = store.getEventsByTimeRange(mid, after);
      expect(events.length).toBe(1);
      expect((events[0].payload as TurnPayload).turnNumber).toBe(2);
    });
  });

  // ============================================
  // REPLAY
  // ============================================

  describe("replay", () => {
    beforeEach(() => {
      store.record("turn_complete", { turnNumber: 1, cost: 0.01 });
      store.record("turn_complete", { turnNumber: 2, cost: 0.02 });
      store.record("tool_used", { toolName: "Read", success: true });
      store.record("turn_complete", { turnNumber: 3, cost: 0.03 });
    });

    test("should replay all events", () => {
      const result = store.replay(initialState, 0, 3, testReducer);

      expect(result.eventsReplayed).toBe(4);
      expect(result.state.count).toBe(3);
      expect(result.state.total).toBe(0.06);
      expect(result.state.history.length).toBe(4);
    });

    test("should replay from specific index", () => {
      const result = store.replay(initialState, 2, 3, testReducer);

      expect(result.eventsReplayed).toBe(2);
      expect(result.state.count).toBe(1); // Only turn 3
    });

    test("should handle errors during replay", () => {
      store.record("error_trigger" as any, { willFail: true });

      const result = store.replay(
        initialState,
        0,
        store.eventCount - 1,
        (state, event) => {
          if (event.type === "error_trigger") {
            throw new Error("Intentional test error");
          }
          return testReducer(state, event);
        }
      );

      expect(result.errors.length).toBe(1);
      expect(result.skippedEvents.length).toBe(1);
    });
  });

  // ============================================
  // SNAPSHOTS
  // ============================================

  describe("snapshots", () => {
    test("should add snapshot", () => {
      const state: TestState = { count: 5, total: 0.1, history: [] };
      store.record("turn_complete", { turnNumber: 1, cost: 0.01 });
      const snapshot = store.addSnapshot(state);

      expect(snapshot.id).toBeDefined();
      expect(snapshot.state).toEqual(state);
      expect(snapshot.afterEventIndex).toBe(0);
    });

    test("should record with snapshot", () => {
      const state: TestState = { count: 5, total: 0.1, history: [] };
      const { event, snapshot } = store.recordWithSnapshot(
        "turn_complete",
        { turnNumber: 5, cost: 0.05 },
        state
      );

      expect(event).toBeDefined();
      expect(snapshot).toBeDefined();
      expect(snapshot.state).toEqual(state);
    });

    test("should create snapshot at interval", () => {
      const intervalStore = new EventStore<TestState>({ snapshotInterval: 3 });

      for (let i = 0; i < 10; i++) {
        const state: TestState = { count: i, total: i * 0.01, history: [] };
        intervalStore.record("turn_complete", { turnNumber: i, cost: 0.01 });
        intervalStore.maybeSnapshot(state);
      }

      // Snapshots at 0, 3, 6, 9
      expect(intervalStore.snapshotCount).toBeGreaterThanOrEqual(3);
    });

    test("should verify snapshot integrity", () => {
      const state: TestState = { count: 5, total: 0.1, history: ["a", "b"] };
      store.record("turn_complete", { turnNumber: 1, cost: 0.01 });
      const snapshot = store.addSnapshot(state);

      expect(store.verifySnapshot(snapshot)).toBe(true);

      // Tamper with snapshot
      const tamperedSnapshot = { ...snapshot, state: { ...state, count: 999 } };
      expect(store.verifySnapshot(tamperedSnapshot)).toBe(false);
    });

    test("should use snapshot for faster replay", () => {
      // Record many events with snapshots at specific points
      for (let i = 0; i < 100; i++) {
        const state: TestState = { count: i, total: i * 0.01, history: [] };
        store.record("turn_complete", { turnNumber: i, cost: 0.01 });
        // Add snapshot at index 49 (right before where we'll start replay)
        if (i === 49) {
          store.addSnapshot(state);
        }
      }

      // Replay from index 50 should use snapshot at index 49
      const result = store.replay(initialState, 50, 99, testReducer);

      // Should have used snapshot, only replaying 50 events (50-99)
      // instead of 100 events (0-99)
      expect(result.eventsReplayed).toBeLessThanOrEqual(50);
    });
  });

  // ============================================
  // TIME TRAVEL
  // ============================================

  describe("time travel", () => {
    beforeEach(() => {
      for (let i = 0; i < 5; i++) {
        store.record("turn_complete", { turnNumber: i + 1, cost: 0.01 * (i + 1) });
      }
    });

    test("should get state at specific index", () => {
      const state = store.getStateAt(2, initialState, testReducer);

      // After 3 events (indices 0, 1, 2)
      expect(state.count).toBe(3);
    });

    test("should step forward", () => {
      let state = initialState;
      let currentIndex = -1;

      // Step to first event
      const result = store.stepForward(state, currentIndex, testReducer);
      expect(result.event).toBeDefined();
      expect(result.state.count).toBe(1);
    });

    test("should step backward", () => {
      // First, get to a known state
      let result = store.replay(initialState, 0, 3, testReducer);

      // Step back one
      const backResult = store.stepBackward(initialState, 4, testReducer);
      expect(backResult.event).toBeDefined();
      expect(backResult.state.count).toBe(4); // One less
    });

    test("should return null when no more events to step to", () => {
      const result = store.stepForward(initialState, 100, testReducer);
      expect(result.event).toBeNull();
    });
  });

  // ============================================
  // STATISTICS
  // ============================================

  describe("getStats", () => {
    test("should return statistics", () => {
      store.record("turn_complete", { turnNumber: 1, cost: 0.01 });
      store.record("turn_complete", { turnNumber: 2, cost: 0.02 });
      store.record("tool_used", { toolName: "Read", success: true });
      store.addSnapshot({ count: 2, total: 0.03, history: [] });

      const stats = store.getStats();

      expect(stats.totalEvents).toBe(3);
      expect(stats.totalSnapshots).toBe(1);
      expect(stats.eventCounts["turn_complete"]).toBe(2);
      expect(stats.eventCounts["tool_used"]).toBe(1);
      expect(stats.estimatedMemoryUsage).toBeGreaterThan(0);
    });
  });

  // ============================================
  // SERIALIZATION
  // ============================================

  describe("serialize/deserialize", () => {
    test("should serialize and deserialize", () => {
      store.record("turn_complete", { turnNumber: 1, cost: 0.01 });
      store.record("tool_used", { toolName: "Read", success: true });
      store.addSnapshot({ count: 1, total: 0.01, history: [] });

      const serialized = store.serialize();
      const restored = EventStore.deserialize<TestState>(serialized);

      expect(restored.eventCount).toBe(2);
      expect(restored.snapshotCount).toBe(1);
      expect(restored.getEvents()[0].type).toBe("turn_complete");
    });
  });

  // ============================================
  // PRUNING
  // ============================================

  describe("prune", () => {
    test("should prune old events", () => {
      for (let i = 0; i < 100; i++) {
        store.record("turn_complete", { turnNumber: i, cost: 0.01 });
      }

      const removed = store.prune(50);

      expect(removed).toBe(50);
      expect(store.eventCount).toBe(50);
    });

    test("should adjust snapshot indices after pruning", () => {
      for (let i = 0; i < 100; i++) {
        store.record("turn_complete", { turnNumber: i, cost: 0.01 });
        if (i === 75) {
          store.addSnapshot({ count: 75, total: 0.75, history: [] });
        }
      }

      store.prune(50);

      // Snapshot should now point to adjusted index
      const snapshots = store.getSnapshots();
      expect(snapshots[0].afterEventIndex).toBe(25); // 75 - 50
    });
  });

  // ============================================
  // CLEAR
  // ============================================

  describe("clear", () => {
    test("should clear all events and snapshots", () => {
      store.record("turn_complete", { turnNumber: 1, cost: 0.01 });
      store.addSnapshot({ count: 1, total: 0.01, history: [] });

      store.clear();

      expect(store.eventCount).toBe(0);
      expect(store.snapshotCount).toBe(0);
    });
  });
});

// ============================================
// FACTORY FUNCTION TESTS
// ============================================

describe("createEventStore", () => {
  test("should create store with config", () => {
    const store = createEventStore<TestState>({ maxEvents: 100, snapshotInterval: 10 });
    expect(store).toBeInstanceOf(EventStore);
  });
});

describe("createEvent", () => {
  test("should create event object", () => {
    const event = createEvent("turn_complete", { turnNumber: 1, cost: 0.01 });

    expect(event.id).toBeDefined();
    expect(event.type).toBe("turn_complete");
    expect(event.payload).toEqual({ turnNumber: 1, cost: 0.01 });
  });

  test("should create event with options", () => {
    const event = createEvent("turn_complete", { turnNumber: 1, cost: 0.01 }, {
      correlationId: "corr_123",
      metadata: { source: "test" },
    });

    expect(event.correlationId).toBe("corr_123");
    expect(event.metadata).toEqual({ source: "test" });
  });
});
