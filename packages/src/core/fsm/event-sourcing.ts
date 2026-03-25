/**
 * Event Sourcing System
 *
 * Provides append-only event log with replay and snapshot capabilities.
 * Enables time-travel debugging and full audit trail for state machines.
 *
 * @module fsm/event-sourcing
 */

// ============================================
// TYPES
// ============================================

/**
 * Types of events that can occur in the state machine
 */
export type StateEventType =
  | "turn_start"
  | "turn_complete"
  | "tool_used"
  | "tool_result"
  | "compaction_start"
  | "compaction_complete"
  | "state_transition"
  | "guard_failed"
  | "action_executed"
  | "error"
  | "pause"
  | "resume"
  | "checkpoint"
  | "cost_update"
  | "message_added"
  | "custom";

/**
 * A single event in the event log
 */
export interface StateEvent<P = unknown> {
  /** Unique event ID */
  id: string;
  /** Type of event */
  type: StateEventType | string;
  /** When the event occurred (Unix timestamp) */
  timestamp: number;
  /** Event payload data */
  payload: P;
  /** Optional: state snapshot at this point */
  snapshot?: unknown;
  /** Optional: correlation ID for tracing */
  correlationId?: string;
  /** Optional: causation ID (what caused this event) */
  causationId?: string;
  /** Optional: metadata */
  metadata?: Record<string, unknown>;
}

/**
 * A snapshot of state at a point in time
 */
export interface StateSnapshot<S = unknown> {
  /** Snapshot ID */
  id: string;
  /** Event index this snapshot was taken after */
  afterEventIndex: number;
  /** When the snapshot was taken */
  timestamp: number;
  /** The state at this point */
  state: S;
  /** Optional: checksum for integrity verification */
  checksum?: string;
}

/**
 * Configuration for EventStore
 */
export interface EventStoreConfig {
  /** Maximum events to keep in memory (0 = unlimited) */
  maxEvents?: number;
  /** Interval for creating snapshots (in events) */
  snapshotInterval?: number;
  /** Whether to include snapshots in events */
  includeSnapshots?: boolean;
  /** Custom event ID generator */
  idGenerator?: () => string;
}

/**
 * Options for recording an event
 */
export interface RecordEventOptions {
  /** Include a snapshot with this event */
  includeSnapshot?: boolean;
  /** Correlation ID for tracing */
  correlationId?: string;
  /** Causation ID (what caused this event) */
  causationId?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Result of replaying events
 */
export interface ReplayResult<S> {
  /** Final state after replay */
  state: S;
  /** Number of events replayed */
  eventsReplayed: number;
  /** Events that were skipped */
  skippedEvents: number[];
  /** Any errors during replay */
  errors: Array<{ eventIndex: number; error: Error }>;
}

/**
 * Statistics about the event store
 */
export interface EventStoreStats {
  /** Total events in the log */
  totalEvents: number;
  /** Total snapshots */
  totalSnapshots: number;
  /** Memory usage estimate (bytes) */
  estimatedMemoryUsage: number;
  /** Oldest event timestamp */
  oldestEvent?: number;
  /** Newest event timestamp */
  newestEvent?: number;
  /** Event counts by type */
  eventCounts: Record<string, number>;
}

// ============================================
// EVENT STORE
// ============================================

let eventCounter = 0;

/**
 * Default event ID generator
 */
function defaultIdGenerator(): string {
  return `evt_${Date.now()}_${++eventCounter}`;
}

/**
 * Simple hash function for checksums
 */
function simpleHash(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(16);
}

/**
 * EventStore - Append-only event log with replay and snapshots
 *
 * @example
 * ```typescript
 * const store = new EventStore<LoopState>();
 *
 * // Record events
 * store.record("turn_complete", { turnNumber: 1, cost: 0.01 });
 * store.record("tool_used", { toolName: "Read", fileId: "abc" });
 *
 * // Replay to specific point
 * const result = store.replay(initialState, 0, 10, reducer);
 *
 * // Get event log
 * const events = store.getEvents();
 * ```
 */
export class EventStore<S = unknown> {
  private events: StateEvent[] = [];
  private snapshots: StateSnapshot<S>[] = [];
  private config: Required<EventStoreConfig>;

  constructor(config: EventStoreConfig = {}) {
    this.config = {
      maxEvents: config.maxEvents ?? 10000,
      snapshotInterval: config.snapshotInterval ?? 100,
      includeSnapshots: config.includeSnapshots ?? true,
      idGenerator: config.idGenerator ?? defaultIdGenerator,
    };
  }

  // ============================================
  // RECORDING
  // ============================================

  /**
   * Record a new event
   *
   * @param type - Event type
   * @param payload - Event payload
   * @param options - Recording options
   * @returns The recorded event
   */
  record<P>(
    type: StateEventType | string,
    payload: P,
    options: RecordEventOptions = {}
  ): StateEvent<P> {
    const event: StateEvent<P> = {
      id: this.config.idGenerator(),
      type,
      timestamp: Date.now(),
      payload,
      correlationId: options.correlationId,
      causationId: options.causationId,
      metadata: options.metadata,
    };

    // Add snapshot if requested
    if (options.includeSnapshot && this.config.includeSnapshots) {
      // Snapshot will be added by caller via addSnapshot()
    }

    this.events.push(event as StateEvent);

    // Enforce max events limit
    if (this.config.maxEvents > 0 && this.events.length > this.config.maxEvents) {
      this.events.shift();
      // Adjust snapshot indices
      for (const snapshot of this.snapshots) {
        snapshot.afterEventIndex = Math.max(0, snapshot.afterEventIndex - 1);
      }
    }

    return event;
  }

  /**
   * Add a snapshot at the current position
   *
   * @param state - The state to snapshot
   * @param eventId - Optional event ID this snapshot follows
   * @returns The created snapshot
   */
  addSnapshot(state: S, eventId?: string): StateSnapshot<S> {
    const afterEventIndex = eventId
      ? this.events.findIndex((e) => e.id === eventId)
      : this.events.length - 1;

    const snapshot: StateSnapshot<S> = {
      id: `snap_${Date.now()}_${this.snapshots.length}`,
      afterEventIndex: Math.max(0, afterEventIndex),
      timestamp: Date.now(),
      state,
      checksum: simpleHash(JSON.stringify(state)),
    };

    this.snapshots.push(snapshot);
    return snapshot;
  }

  /**
   * Record an event with an automatic snapshot
   */
  recordWithSnapshot<P>(
    type: StateEventType | string,
    payload: P,
    state: S,
    options: RecordEventOptions = {}
  ): { event: StateEvent<P>; snapshot: StateSnapshot<S> } {
    const event = this.record(type, payload, options);
    const snapshot = this.addSnapshot(state, event.id);
    return { event, snapshot };
  }

  // ============================================
  // QUERYING
  // ============================================

  /**
   * Get all events
   */
  getEvents(): readonly StateEvent[] {
    return [...this.events];
  }

  /**
   * Get events by type
   */
  getEventsByType(type: StateEventType | string): StateEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  /**
   * Get events in a time range
   */
  getEventsByTimeRange(start: number, end: number): StateEvent[] {
    return this.events.filter((e) => e.timestamp >= start && e.timestamp <= end);
  }

  /**
   * Get events by correlation ID
   */
  getEventsByCorrelationId(correlationId: string): StateEvent[] {
    return this.events.filter((e) => e.correlationId === correlationId);
  }

  /**
   * Get a single event by ID
   */
  getEventById(id: string): StateEvent | undefined {
    return this.events.find((e) => e.id === id);
  }

  /**
   * Get event at index
   */
  getEventAtIndex(index: number): StateEvent | undefined {
    return this.events[index];
  }

  /**
   * Get the last N events
   */
  getLastEvents(count: number): StateEvent[] {
    return this.events.slice(-count);
  }

  /**
   * Get total event count
   */
  get eventCount(): number {
    return this.events.length;
  }

  /**
   * Get total snapshot count
   */
  get snapshotCount(): number {
    return this.snapshots.length;
  }

  // ============================================
  // REPLAY
  // ============================================

  /**
   * Replay events from a starting point to rebuild state
   *
   * @param initialState - The state to start from
   * @param fromIndex - Starting event index (default: 0)
   * @param toIndex - Ending event index (default: all events)
   * @param reducer - Function to apply events to state
   * @returns Replay result with final state
   */
  replay(
    initialState: S,
    fromIndex: number = 0,
    toIndex: number = this.events.length - 1,
    reducer: (state: S, event: StateEvent) => S
  ): ReplayResult<S> {
    const result: ReplayResult<S> = {
      state: initialState,
      eventsReplayed: 0,
      skippedEvents: [],
      errors: [],
    };

    // Find closest snapshot before fromIndex for optimization
    const snapshot = this.findClosestSnapshot(fromIndex);
    let startIndex = fromIndex;
    let state = initialState;

    if (snapshot && snapshot.afterEventIndex >= fromIndex - this.config.snapshotInterval) {
      // Use snapshot as starting point
      state = snapshot.state;
      startIndex = snapshot.afterEventIndex + 1;
    }

    // Replay events
    for (let i = startIndex; i <= Math.min(toIndex, this.events.length - 1); i++) {
      const event = this.events[i];
      if (!event) {
        result.skippedEvents.push(i);
        continue;
      }

      try {
        state = reducer(state, event);
        result.eventsReplayed++;
      } catch (error) {
        result.errors.push({
          eventIndex: i,
          error: error instanceof Error ? error : new Error(String(error)),
        });
        result.skippedEvents.push(i);
      }
    }

    result.state = state;
    return result;
  }

  /**
   * Replay from a specific event ID
   */
  replayFromEvent(
    initialState: S,
    fromEventId: string,
    reducer: (state: S, event: StateEvent) => S
  ): ReplayResult<S> {
    const fromIndex = this.events.findIndex((e) => e.id === fromEventId);
    if (fromIndex === -1) {
      return {
        state: initialState,
        eventsReplayed: 0,
        skippedEvents: [],
        errors: [{ eventIndex: -1, error: new Error(`Event not found: ${fromEventId}`) }],
      };
    }
    return this.replay(initialState, fromIndex, this.events.length - 1, reducer);
  }

  /**
   * Find the closest snapshot before an event index
   */
  private findClosestSnapshot(beforeIndex: number): StateSnapshot<S> | undefined {
    let closest: StateSnapshot<S> | undefined;
    for (const snapshot of this.snapshots) {
      if (snapshot.afterEventIndex < beforeIndex) {
        if (!closest || snapshot.afterEventIndex > closest.afterEventIndex) {
          closest = snapshot;
        }
      }
    }
    return closest;
  }

  // ============================================
  // TIME TRAVEL
  // ============================================

  /**
   * Get state at a specific point in time (requires snapshots or replay)
   */
  getStateAt<P>(
    eventIndex: number,
    initialState: S,
    reducer: (state: S, event: StateEvent) => S
  ): S {
    const result = this.replay(initialState, 0, eventIndex, reducer);
    return result.state;
  }

  /**
   * Step forward one event from current state
   */
  stepForward<P>(
    currentState: S,
    currentEventIndex: number,
    reducer: (state: S, event: StateEvent) => S
  ): { state: S; event: StateEvent | null } {
    const nextEvent = this.events[currentEventIndex + 1];
    if (!nextEvent) {
      return { state: currentState, event: null };
    }
    return {
      state: reducer(currentState, nextEvent),
      event: nextEvent,
    };
  }

  /**
   * Step backward (requires replay from earlier snapshot)
   */
  stepBackward<P>(
    initialState: S,
    currentEventIndex: number,
    reducer: (state: S, event: StateEvent) => S
  ): { state: S; event: StateEvent | null } {
    if (currentEventIndex <= 0) {
      return { state: initialState, event: null };
    }
    const result = this.replay(initialState, 0, currentEventIndex - 1, reducer);
    const prevEvent = this.events[currentEventIndex - 1];
    return { state: result.state, event: prevEvent || null };
  }

  // ============================================
  // SNAPSHOTS
  // ============================================

  /**
   * Get all snapshots
   */
  getSnapshots(): readonly StateSnapshot<S>[] {
    return [...this.snapshots];
  }

  /**
   * Get snapshot by ID
   */
  getSnapshotById(id: string): StateSnapshot<S> | undefined {
    return this.snapshots.find((s) => s.id === id);
  }

  /**
   * Create a snapshot at current position if interval is met
   */
  maybeSnapshot(state: S): StateSnapshot<S> | null {
    if (this.events.length % this.config.snapshotInterval === 0) {
      return this.addSnapshot(state);
    }
    return null;
  }

  /**
   * Verify snapshot integrity
   */
  verifySnapshot(snapshot: StateSnapshot<S>): boolean {
    if (!snapshot.checksum) return true;
    const computed = simpleHash(JSON.stringify(snapshot.state));
    return computed === snapshot.checksum;
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get statistics about the event store
   */
  getStats(): EventStoreStats {
    const eventCounts: Record<string, number> = {};

    for (const event of this.events) {
      eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
    }

    // Estimate memory usage
    const eventsSize = JSON.stringify(this.events).length;
    const snapshotsSize = JSON.stringify(this.snapshots).length;

    return {
      totalEvents: this.events.length,
      totalSnapshots: this.snapshots.length,
      estimatedMemoryUsage: eventsSize + snapshotsSize,
      oldestEvent: this.events[0]?.timestamp,
      newestEvent: this.events[this.events.length - 1]?.timestamp,
      eventCounts,
    };
  }

  // ============================================
  // SERIALIZATION
  // ============================================

  /**
   * Serialize the event store to JSON
   */
  serialize(): { events: StateEvent[]; snapshots: StateSnapshot<S>[] } {
    return {
      events: [...this.events],
      snapshots: [...this.snapshots],
    };
  }

  /**
   * Deserialize from JSON
   */
  static deserialize<S>(data: {
    events: StateEvent[];
    snapshots: StateSnapshot<S>[];
  }): EventStore<S> {
    const store = new EventStore<S>();
    store.events = data.events;
    store.snapshots = data.snapshots;
    return store;
  }

  /**
   * Clear all events and snapshots
   */
  clear(): void {
    this.events = [];
    this.snapshots = [];
    eventCounter = 0;
  }

  /**
   * Prune old events (keeping recent ones)
   */
  prune(keepCount: number): number {
    if (this.events.length <= keepCount) return 0;

    const removeCount = this.events.length - keepCount;
    this.events = this.events.slice(-keepCount);

    // Adjust and prune snapshots
    this.snapshots = this.snapshots
      .map((s) => ({
        ...s,
        afterEventIndex: Math.max(-1, s.afterEventIndex - removeCount),
      }))
      .filter((s) => s.afterEventIndex >= 0);

    return removeCount;
  }
}

// ============================================
// FACTORY FUNCTIONS
// ============================================

/**
 * Create a new event store
 */
export function createEventStore<S = unknown>(config?: EventStoreConfig): EventStore<S> {
  return new EventStore<S>(config);
}

/**
 * Create a state event
 */
export function createEvent<P>(
  type: StateEventType | string,
  payload: P,
  options: RecordEventOptions = {}
): StateEvent<P> {
  return {
    id: defaultIdGenerator(),
    type,
    timestamp: Date.now(),
    payload,
    correlationId: options.correlationId,
    causationId: options.causationId,
    metadata: options.metadata,
  };
}
