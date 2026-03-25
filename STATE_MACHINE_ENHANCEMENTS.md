# State Machine Enhancements for Coder

> Enhancing the state machine architecture with formal patterns, event sourcing, and visualization.

## Overview

Current state machines:
- `LoopState` - Turn-based agent loop
- `DaemonState` - Background daemon lifecycle
- `TUIState` - Terminal UI state
- `WorkflowEngine` - Graph-based workflow engine

---

## Phase 1: Foundation

### 1.1 Event Sourcing System
- [x] Create `packages/src/core/fsm/event-sourcing.ts`
  - [x] Define `StateEvent` interface
  - [x] Implement `EventStore` class with append-only log
  - [x] Add event replay functionality
  - [x] Add snapshot support for fast recovery
- [x] Create `packages/src/core/fsm/__tests__/event-sourcing.test.ts`
  - [x] Test event recording
  - [x] Test event replay
  - [x] Test snapshot creation/restoration
- [ ] Integrate with `LoopState`
  - [ ] Add `recordEvent()` to turn execution
  - [ ] Add `replayTo(eventIndex)` method
  - [ ] Add `getEventLog()` for debugging

### 1.2 Formal FSM DSL
- [x] Create `packages/src/core/fsm/types.ts`
  - [x] Define `StateMachineConfig<S, E>` interface
  - [x] Define `StateConfig`, `TransitionConfig` types
  - [x] Define `StateContext`, `Guard`, `Action` types
- [x] Create `packages/src/core/fsm/fsm.ts`
  - [x] Implement `createFSM()` factory
  - [x] Implement `transition(event)` method
  - [x] Implement guard condition checking
  - [x] Implement entry/exit actions
- [x] Create `packages/src/core/fsm/__tests__/fsm.test.ts`
  - [x] Test basic transitions
  - [x] Test guard conditions
  - [x] Test entry/exit actions
  - [x] Test invalid transitions

### 1.3 State Guards & Actions
- [x] Create `packages/src/core/fsm/guards.ts`
  - [x] Define common guard factories
  - [x] Implement `maxTurnsGuard()`
  - [x] Implement `costThresholdGuard()`
  - [x] Implement `timeoutGuard()`
- [x] Create `packages/src/core/fsm/actions.ts`
  - [x] Define common action factories
  - [x] Implement `logAction()`
  - [x] Implement `persistAction()`
  - [x] Implement `notifyAction()`
- [x] Create `packages/src/core/fsm/__tests__/guards.test.ts`
- [x] Create `packages/src/core/fsm/__tests__/actions.test.ts`

---

## Phase 2: Integration

### 2.1 Refactor LoopState to FSM
- [x] Create `packages/src/core/agent-loop/loop-fsm.ts`
  - [x] Define agent loop states: idle, processing, tool_execution, compaction, paused, completed, error
  - [x] Define events: start, turn_complete, tool_needed, tool_result, compact, pause, resume, stop, error
  - [x] Create FSM config with guards and actions
- [x] Create `packages/src/core/agent-loop/__tests__/loop-fsm.test.ts`
  - [x] Test all state transitions
  - [x] Test guard conditions
  - [x] Test error handling
- [x] Create `packages/src/core/agent-loop/fsm-integration.ts`
  - [x] Create FSMIntegratedLoopState class
  - [x] Bridge FSM with LoopState
  - [x] Emit events for observability
  - [x] Maintain backward compatibility
- [x] Create `packages/src/core/agent-loop/__tests__/fsm-integration.test.ts`
  - [x] Test FSM + LoopState integration
  - [x] Test event tracking
  - [x] Test combined state
- [x] Update `packages/src/core/agent-loop/index.ts`
  - [x] Export FSM integration module
  - [x] Migrate agentLoop() to use FSMIntegratedLoopState
  - [x] Add FSM event emission at key points (START, TURN_COMPLETE, ERROR, STOP, CANCEL)

### 2.2 Integrate WorkflowEngine with LoopState
- [x] Create `packages/src/core/agent-loop/workflow-integration.ts`
  - [x] Define workflow steps for agent loop
  - [x] Create bidirectional sync between FSM and Workflow
  - [x] Implement message passing between systems
- [x] Create `packages/src/core/agent-loop/__tests__/workflow-integration.test.ts`
  - [x] Test FSM step processor
  - [x] Test sync manager
  - [x] Test workflow factory
  - [x] Test event converters

### 2.3 Unified State Manager
- [ ] Create `packages/src/core/fsm/state-manager.ts`
  - [ ] Implement `StateManager` class
  - [ ] Support multiple state machines
  - [ ] Implement cross-machine event propagation
  - [ ] Add global event bus
- [ ] Create `packages/src/core/fsm/__tests__/state-manager.test.ts`

---

## Phase 3: Advanced Features

### 3.1 Hierarchical State Machines
- [ ] Create `packages/src/core/fsm/hierarchical.ts`
  - [ ] Define `HierarchicalStateConfig` interface
  - [ ] Support nested states
  - [ ] Implement state entry/exit for hierarchies
  - [ ] Support history states (deep/shallow)
- [ ] Create `packages/src/core/fsm/__tests__/hierarchical.test.ts`
  - [ ] Test nested state transitions
  - [ ] Test history states
  - [ ] Test parallel regions within hierarchy

### 3.2 Parallel State Regions
- [ ] Create `packages/src/core/fsm/parallel.ts`
  - [ ] Define `ParallelRegionConfig` interface
  - [ ] Implement concurrent state execution
  - [ ] Implement region synchronization
  - [ ] Support region-local events
- [ ] Create `packages/src/core/fsm/__tests__/parallel.test.ts`
  - [ ] Test parallel execution
  - [ ] Test synchronization points
  - [ ] Test cross-region communication

### 3.3 Time-Travel Debugging
- [ ] Create `packages/src/core/fsm/time-travel.ts`
  - [ ] Implement `TimeTravel` class
  - [ ] Support `jumpTo(eventIndex)`
  - [ ] Support `stepForward()`, `stepBackward()`
  - [ ] Implement diff visualization between states
- [ ] Create CLI command `/timetravel`
  - [ ] Show event history
  - [ ] Allow jumping to any point
  - [ ] Show state diff
- [ ] Create `packages/src/core/fsm/__tests__/time-travel.test.ts`

---

## Phase 4: Visualization & DX

### 4.1 State Visualization
- [ ] Create `packages/src/core/fsm/visualization.ts`
  - [ ] Implement `toMermaid()` generator
  - [ ] Implement `toDOT()` for GraphViz
  - [ ] Support live state highlighting
- [ ] Create `packages/src/core/fsm/__tests__/visualization.test.ts`
- [ ] Add `/visualize` CLI command
  - [ ] Output Mermaid diagram
  - [ ] Option to save as file

### 4.2 State Inspector
- [ ] Create `packages/src/core/fsm/inspector.ts`
  - [ ] Implement real-time state monitoring
  - [ ] Track transition metrics
  - [ ] Detect state anomalies
- [ ] Create `packages/src/interfaces/ui/terminal/tui/StateInspector.tsx`
  - [ ] TUI component for state visualization
  - [ ] Show current state, history, metrics
- [ ] Add `/inspect` CLI command

### 4.3 Debug Logging
- [ ] Create `packages/src/core/fsm/debug-logger.ts`
  - [ ] Structured logging for state transitions
  - [ ] Configurable log levels
  - [ ] Export to file for analysis
- [ ] Integrate with telemetry system

---

## Phase 5: Persistence & Recovery

### 5.1 Enhanced Persistence
- [ ] Update `packages/src/core/agent-loop/loop-persistence.ts`
  - [ ] Store event log alongside state
  - [ ] Support incremental snapshots
  - [ ] Implement compression for old events
- [ ] Create recovery utilities
  - [ ] Detect corrupted state
  - [ ] Rebuild from event log
  - [ ] Merge concurrent sessions

### 5.2 Crash Recovery
- [ ] Create `packages/src/core/fsm/crash-recovery.ts`
  - [ ] Detect unclean shutdown
  - [ ] Automatic state reconstruction
  - [ ] Conflict resolution for partial writes
- [ ] Create `packages/src/core/fsm/__tests__/crash-recovery.test.ts`

---

## Phase 6: Documentation & Examples

### 6.1 Documentation
- [ ] Create `docs/state-machine.md`
  - [ ] Architecture overview
  - [ ] API reference
  - [ ] Best practices
- [ ] Update `CLAUDE.md` with FSM patterns

### 6.2 Examples
- [ ] Create `examples/fsm-basic.ts`
- [ ] Create `examples/fsm-hierarchical.ts`
- [ ] Create `examples/fsm-parallel.ts`
- [ ] Create `examples/fsm-time-travel.ts`

---

## Progress Tracking

| Phase | Status | Started | Completed |
|-------|--------|---------|-----------|
| 1.1 Event Sourcing | Completed | 2026-03-23 | 2026-03-23 |
| 1.2 FSM DSL | Completed | 2026-03-23 | 2026-03-23 |
| 1.3 Guards & Actions | Completed | 2026-03-23 | 2026-03-23 |
| 2.1 LoopState FSM | Completed | 2026-03-23 | 2026-03-23 |
| 2.2 Workflow Integration | Completed | 2026-03-23 | 2026-03-23 |
| 2.3 State Manager | Not Started | - | - |
| **agentLoop Migration** | **Completed** | 2026-03-23 | 2026-03-24 |
| 3.1 Hierarchical FSM | Not Started | - | - |
| 3.2 Parallel Regions | Not Started | - | - |
| 3.3 Time-Travel | Not Started | - | - |
| 4.1 Visualization | Not Started | - | - |
| 4.2 State Inspector | Not Started | - | - |
| 4.3 Debug Logging | Not Started | - | - |
| 5.1 Enhanced Persistence | Not Started | - | - |
| 5.2 Crash Recovery | Not Started | - | - |
| 6.1 Documentation | Not Started | - | - |
| 6.2 Examples | Not Started | - | - |

---

## Running Tests

```bash
# Run all FSM tests
bun test packages/src/core/fsm/

# Run specific test file
bun test packages/src/core/fsm/__tests__/event-sourcing.test.ts

# Run with coverage
bun test --coverage packages/src/core/fsm/
```

---

## Architecture Decisions

### Why Event Sourcing?
- Full audit trail of all state changes
- Enables time-travel debugging
- Natural fit for persistence/recovery
- Composable with existing checkpoint system

### Why Formal FSM DSL?
- Explicit state transitions are easier to debug
- Guard conditions prevent invalid states
- Entry/exit actions enable clean separation
- Visualizable and documentable

### Why Hierarchical States?
- Complex behaviors need nested states
- Reduces state explosion
- Matches mental model of agent behavior
- Enables reusable state patterns

### Why Parallel Regions?
- Thinking, daemon, and UI run concurrently
- Clear separation of concerns
- Independent state management
- Synchronization when needed
