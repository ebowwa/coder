# Long-Running Loops Implementation Plan

> **Status:** Planning
> **Created:** 2026-03-16
> **Focus:** Enhance session persistence for resume with QC built into the process

---

## 1. Executive Summary

Enable Coder's agent loop to run for extended periods (hours/days) with:
- **Automatic state persistence** at configurable intervals
- **Resume capability** from interrupted/crashed loops
- **QC checkpoints** integrated into the loop lifecycle
- **Background handling** preparation (future)

---

## 2. Current Architecture

### 2.1 Agent Loop (`packages/src/core/agent-loop/`)

```
agentLoop(initialMessages, options)
  └── LoopState (in-memory only)
      ├── messages: Message[]
      ├── metrics: QueryMetrics[]
      ├── totalCost, turnNumber, compactionCount
      └── (no persistence)
```

**Problem:** Loop state is lost on crash/interrupt. Only messages are persisted via `SessionStore`.

### 2.2 Session Store (`packages/src/core/sessions/`)

```
SessionStore
  ├── SessionPersistence (JSONL file I/O)
  ├── SessionMetadataManager
  └── SessionExporter

Entry Types:
  - metadata, message, tool_use, metrics, context, checkpoint
```

**Problem:** Session store saves messages but NOT loop state (turn number, costs, compaction info).

### 2.3 Workflow Persistence (`packages/src/circuit/persistence.ts`)

```
WorkflowRegistry
  ├── save(id): SerializedWorkflow
  ├── load(id): Workflow
  └── autoSaveInterval

SerializedWorkflow:
  - config, state, currentCycle
  - steps[], connections[], loops[]
```

**Gap:** Workflow persistence exists but is NOT connected to agent loop.

---

## 3. Proposed Architecture

### 3.1 New Component: LoopPersistence

```
packages/src/core/agent-loop/
├── index.ts              # Main agentLoop()
├── loop-state.ts         # LoopState class
├── loop-persistence.ts   # NEW: Persistence layer
├── loop-serializer.ts    # NEW: Serialization format
└── types.ts              # Types
```

### 3.2 Loop Persistence Module

```typescript
// loop-persistence.ts

interface PersistedLoopState {
  version: 1;
  sessionId: string;
  timestamp: number;

  // Core state
  messages: Message[];
  metrics: QueryMetrics[];
  allToolsUsed: ToolUseBlock[];

  // Counters
  totalCost: number;
  previousCost: number;
  totalDuration: number;
  turnNumber: number;
  compactionCount: number;
  totalTokensCompacted: number;
  retryCount: number;

  // Cache metrics
  cacheMetrics: CacheMetrics;

  // Template info
  templateName: string | null;
  loopBehavior: LoopBehavior;

  // Session timing
  sessionStartTime: number;

  // QC checkpoints
  checkpoints: LoopCheckpoint[];
}

interface LoopCheckpoint {
  id: string;
  turnNumber: number;
  timestamp: number;
  type: 'auto' | 'manual' | 'qc';
  summary: string;
  fileSnapshots?: Record<string, string>;  // Optional file state
}

interface LoopPersistenceConfig {
  enabled: boolean;
  autoSaveInterval: number;      // ms, default 30000 (30s)
  maxCheckpoints: number;        // default 10
  includeFileSnapshots: boolean; // default false (expensive)
  storageDir: string;            // default ~/.claude/loops/
}
```

### 3.3 Integration with Agent Loop

```typescript
// Enhanced agentLoop signature
export async function agentLoop(
  initialMessages: Message[],
  options: AgentLoopOptions & {
    // NEW: Persistence options
    persistence?: LoopPersistenceConfig;
    resumeFrom?: {
      sessionId: string;
      checkpointId?: string;  // Resume from specific checkpoint
    };
  }
): Promise<AgentLoopResult>
```

### 3.4 Persistence Flow

```
agentLoop() with persistence
  │
  ├── [Resume?] Load PersistedLoopState
  │     └── Restore LoopState from serialized data
  │
  ├── while (shouldContinue)
  │     ├── executeTurn()
  │     │
  │     ├── [Auto-save?] Save state if interval elapsed
  │     │     └── write ~/.claude/loops/{sessionId}/state.json
  │     │
  │     └── [QC Check?] Create checkpoint if conditions met
  │           └── write ~/.claude/loops/{sessionId}/checkpoints/{id}.json
  │
  └── [End] Final save + cleanup
        └── write final state
```

---

## 4. Implementation Phases

### Phase 1: Core Persistence (MVP)

**Goal:** Basic save/resume of loop state

**Files to Create/Modify:**
1. `loop-serializer.ts` - Serialization format and utilities
2. `loop-persistence.ts` - Persistence layer (save/load)
3. `loop-state.ts` - Add `serialize()` and `deserialize()` methods
4. `index.ts` - Integrate persistence into `agentLoop()`

**Storage Format:**
```
~/.claude/loops/
├── {sessionId}/
│   ├── state.json         # Current loop state
│   ├── checkpoints/
│   │   ├── cp_{turn}_{timestamp}.json
│   │   └── ...
│   └── manifest.json      # Metadata about the loop
```

### Phase 2: Resume Capability

**Goal:** Resume interrupted loops

**CLI Changes:**
```bash
# Resume last interrupted loop
coder --resume-last

# Resume specific session
coder --resume <session-id>

# Resume from checkpoint
coder --resume <session-id> --checkpoint <checkpoint-id>
```

**Detection of Interrupted Loops:**
- Check for loops without `endedAt` in manifest
- On startup, prompt user to resume interrupted loops

### Phase 3: QC Checkpoints

**Goal:** Quality control checkpoints integrated into loop

**QC Checkpoint Triggers:**
- Cost threshold reached (e.g., every $1)
- Turn milestone (e.g., every 50 turns)
- Time milestone (e.g., every 10 minutes)
- Manual trigger via `/checkpoint` command
- After significant file changes

**QC Checkpoint Content:**
```typescript
interface QCCheckpoint extends LoopCheckpoint {
  type: 'qc';

  // QC-specific data
  qc: {
    filesModified: string[];
    testsRun?: { passed: number; failed: number };
    lintStatus?: 'pass' | 'fail' | 'skip';
    gitStatus: {
      branch: string;
      dirty: boolean;
      uncommitted: string[];
    };
    costSoFar: number;
    duration: number;
  };

  // Optional: AI-generated summary
  summary: string;
}
```

### Phase 4: Background Handling Prep

**Goal:** Prepare for daemon-mode execution (future)

**Considerations:**
- Detach from terminal (daemonize)
- Heartbeat/status endpoint
- Graceful shutdown handling
- Resource monitoring

---

## 5. API Design

### 5.1 LoopPersistence Class

```typescript
export class LoopPersistence {
  constructor(config: LoopPersistenceConfig);

  // State management
  save(sessionId: string, state: LoopState): Promise<void>;
  load(sessionId: string): Promise<PersistedLoopState | null>;

  // Checkpoints
  createCheckpoint(sessionId: string, state: LoopState, type: 'auto' | 'manual' | 'qc'): Promise<LoopCheckpoint>;
  listCheckpoints(sessionId: string): Promise<LoopCheckpoint[]>;
  loadCheckpoint(sessionId: string, checkpointId: string): Promise<PersistedLoopState | null>;
  deleteCheckpoint(sessionId: string, checkpointId: string): Promise<boolean>;

  // Lifecycle
  startLoop(sessionId: string, state: LoopState): Promise<void>;
  endLoop(sessionId: string, result: AgentLoopResult): Promise<void>;

  // Recovery
  findInterruptedLoops(): Promise<string[]>;
  recoverLoop(sessionId: string): Promise<PersistedLoopState | null>;

  // Cleanup
  pruneOldLoops(maxAge: number): Promise<number>;
}
```

### 5.2 Extended LoopState

```typescript
// Add to LoopState class
class LoopState {
  // ... existing methods ...

  // NEW: Serialization
  serialize(): PersistedLoopState;
  static deserialize(data: PersistedLoopState): LoopState;

  // NEW: Checkpoint creation
  createCheckpoint(type: 'auto' | 'manual' | 'qc'): LoopCheckpoint;

  // NEW: Restore from checkpoint
  restoreFromCheckpoint(checkpoint: LoopCheckpoint): void;
}
```

### 5.3 Extended AgentLoopOptions

```typescript
interface AgentLoopOptions {
  // ... existing options ...

  // NEW: Persistence configuration
  persistence?: {
    enabled: boolean;
    autoSaveInterval?: number;      // default 30000ms
    maxCheckpoints?: number;        // default 10
    includeFileSnapshots?: boolean; // default false
  };

  // NEW: Resume from previous state
  resumeFrom?: {
    sessionId: string;
    checkpointId?: string;
  };
}
```

---

## 6. QC Integration

### 6.1 QC Check Function

```typescript
interface QCCheckResult {
  shouldCheckpoint: boolean;
  reasons: string[];
  suggestedType: 'auto' | 'qc';
}

function shouldCreateQCCheckpoint(
  state: LoopState,
  lastCheckpoint: LoopCheckpoint | null,
  config: QCConfig
): QCCheckResult
```

### 6.2 QC Check Triggers

| Trigger | Default Threshold | Configurable |
|---------|-------------------|--------------|
| Cost | $1.00 | Yes |
| Turns | 50 | Yes |
| Duration | 10 minutes | Yes |
| Files changed | 10 files | Yes |
| Manual | N/A | `/checkpoint` |

### 6.3 QC Checkpoint Actions

When a QC checkpoint is created:
1. Save current loop state
2. Run optional validation (tests, lint)
3. Capture git status
4. Generate summary (optional AI-generated)
5. Emit `qc_checkpoint` event

---

## 7. CLI Commands

### 7.1 Resume Commands

```bash
# List resumable loops
coder --loops

# Resume last interrupted loop
coder --resume-last

# Resume specific loop
coder --resume <session-id>

# Resume from checkpoint
coder --resume <session-id> --checkpoint <cp-id>

# Create checkpoint during session
/checkpoint [label]

# List checkpoints in current session
/checkpoints
```

### 7.2 Status Commands

```bash
# Show current loop status
/loop-status

# Show persistence status
/persistence-status
```

---

## 8. File Structure

```
packages/src/core/agent-loop/
├── index.ts                 # Main agentLoop (modified)
├── loop-state.ts            # LoopState class (modified)
├── loop-persistence.ts      # NEW: Persistence layer
├── loop-serializer.ts       # NEW: Serialization format
├── qc-checkpoint.ts         # NEW: QC checkpoint logic
└── types.ts                 # Types (modified)

packages/src/core/sessions/
├── index.ts                 # SessionStore (unchanged)
├── persistence.ts           # SessionPersistence (unchanged)
└── ...

~/.claude/loops/
├── {sessionId}/
│   ├── state.json           # Current state
│   ├── manifest.json        # Metadata
│   └── checkpoints/
│       ├── cp_001_1709123456789.json
│       └── ...
```

---

## 9. Testing Strategy

### 9.1 Unit Tests

- `loop-serializer.test.ts` - Serialization/deserialization
- `loop-persistence.test.ts` - Save/load operations
- `loop-state.test.ts` - Checkpoint creation/restore

### 9.2 Integration Tests

- Resume from interrupted loop
- Auto-save during execution
- QC checkpoint creation
- Multiple checkpoint restore

### 9.3 QC Tests

- Verify state consistency after save/load
- Verify checkpoint integrity
- Verify resume produces same results as fresh start

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Disk I/O latency | Async saves, batch writes |
| State corruption | Checksums, atomic writes |
| Large state files | Compression, incremental saves |
| Resume divergence | Strict serialization, version pinning |

---

## 11. Success Metrics

- [ ] Can save loop state mid-execution
- [ ] Can resume from interrupted loop
- [ ] QC checkpoints created automatically
- [ ] Manual checkpoints via `/checkpoint`
- [ ] State consistent after save/load cycle
- [ ] No performance degradation > 5%

---

## 12. Next Steps

1. **Start with Phase 1** - Core persistence
   - Create `loop-serializer.ts`
   - Create `loop-persistence.ts`
   - Modify `loop-state.ts`
   - Integrate into `agentLoop()`

2. **Then Phase 2** - Resume capability
   - Add CLI `--resume` flags
   - Add interrupted loop detection
   - Add recovery flow

3. **Then Phase 3** - QC checkpoints
   - Create `qc-checkpoint.ts`
   - Add trigger logic
   - Add `/checkpoint` command

4. **QC Throughout** - Test each phase before moving to next

---

*This plan is ready for review. Once approved, implementation begins with Phase 1.*
