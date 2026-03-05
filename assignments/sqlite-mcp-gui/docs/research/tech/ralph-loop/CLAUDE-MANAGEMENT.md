# Managing .claude/ Across Nodes

**Date:** 2026-01-14
**Concept:** Centralized management of distributed Ralph loops

---

## The Insight

If we're running Ralph loops across multiple nodes, we need to manage the `.claude/` directories across all of them.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         THE PROBLEM                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Node 1 (Laptop)                  Node 2 (Home Server)                       │
│  ~/code/project/.claude/         ~/code/project/.claude/                    │
│  ├── ralph-loop.local.md          ├── ralph-loop.local.md                   │
│  ├── settings.local.json          ├── settings.local.json                   │
│  └── hooks/                        └── hooks/                                 │
│                                                                              │
│  ❌ No way to see all loops from one place                                   │
│  ❌ Config management is manual                                               │
│  ❌ Need to SSH into each node to check status                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         THE SOLUTION                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │              CENTRAL .CLAUDE/ MANAGEMENT                            │   │
│  │                                                                  │   │
│  │  Agent Manager (your app)                                         │   │
│  │  ├── Connects to all nodes                                        │   │
│  │  ├── Reads .claude/ralph-loop.local.md from each                   │   │
│  │  ├── Aggregates status in one dashboard                            │   │
│  │  └── Manages configs, hooks, permissions across nodes              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐         │
│  │  Laptop   │      │  Home    │      │ Hetzner  │      │   AWS    │         │
│  │          │      │  Server  │      │   VPS    │      │   GPU    │         │
│  └─────┬────┘      └─────┬────┘      └─────┬────┘      └─────┬────┘         │
│        │                 │                 │                 │               │
│        └─────────────────┴─────────────────┴─────────────────┘               │
│                              │                                             │
│                              ▼                                             │
│                    ┌───────────────┐                                      │
│                    │  DASHBOARD    │                                      │
│                    │               │                                      │
│                    │  Node: Status │                                      │
│                    │  ─────────────│                                      │
│                    │  Laptop: 🟢   │ (2 loops running)                   │
│                    │  Home:   🟡   │ (1 loop idle)                      │
│                    │  Hetzner: 🔴  │ (no loops)                         │
│                    │  AWS:    🟢   │ (4 loops running)                  │
│                    └───────────────┘                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## What .claude/ Management Looks Like

### 1. Discovery: Find All .claude/ Directories

```bash
# For each node, scan for active Ralph loops
find ~ -name "ralph-loop.local.md" -type f 2>/dev/null

# Output:
# /home/user/code/project-frontend/.claude/ralph-loop.local.md
# /home/user/code/project-backend/.claude/ralph-loop.local.md
# /home/user/code/project-testing/.claude/ralph-loop.local.md
```

### 2. Read State: Parse Each ralph-loop.local.md

```yaml
# /home/user/code/project-frontend/.claude/ralph-loop.local.md
---
active: true
iteration: 47
max_iterations: 0
completion_promise: "DONE"
started_at: "2026-01-14T10:30:00Z"
---

Build React components with dark mode support
```

```typescript
interface RalphLoopState {
  node: string;              // "laptop", "home-server", etc.
  directory: string;         // "/home/user/code/project-frontend"
  active: boolean;
  iteration: number;
  maxIterations: number;
  completionPromise: string | null;
  startedAt: string;
  prompt: string;
  lastActivity?: string;     // Timestamp from file mtime
}
```

### 3. Aggregation: One View of All Loops

```typescript
interface MultiNodeRalphStatus {
  nodes: {
    [nodeName: string]: {
      loops: RalphLoopState[];
      totalRunning: number;
      totalIdle: number;
    }
  }
}

// Example output:
{
  laptop: {
    loops: [
      { directory: "project-frontend", active: true, iteration: 47 },
      { directory: "project-backend", active: true, iteration: 23 }
    ],
    totalRunning: 2,
    totalIdle: 0
  },
  homeServer: {
    loops: [
      { directory: "website-blog", active: true, iteration: 156 }
    ],
    totalRunning: 1,
    totalIdle: 0
  },
  hetznerVps: {
    loops: [],
    totalRunning: 0,
    totalIdle: 0
  }
}
```

---

## Architecture: How to Build This

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MULTI-NODE CLAUDE MANAGER                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    NODE AGENT (runs on each machine)                 │   │
│  │                                                                     │   │
│  │  - Lightweight process                                              │   │
│  │  - Watches .claude/ directories                                      │   │
│  │  - Exposes HTTP API for status                                       │   │
│  │  - Receives commands (start/stop/monitor)                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│                              │                                               │
│                              │ HTTP/REST                                    │
│                              ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                   CENTRAL MANAGER (your app)                         │   │
│  │                                                                     │   │
│  │  - Connects to all node agents                                       │   │
│  │  - Aggregates Ralph loop states                                     │   │
│  │  - Provides dashboard UI                                             │   │
│  │  - Manages configs, syncs settings                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Node Agent API Specification

```typescript
// GET /api/status
// Returns: All Ralph loops on this node
interface NodeStatusResponse {
  nodeName: string;
  loops: RalphLoopState[];
  systemInfo: {
    cpu: number;
    memory: number;
    activeRalphLoops: number;
  };
}

// GET /api/loops/:directory
// Returns: Status of specific Ralph loop
interface LoopStatusResponse {
  state: RalphLoopState;
  recentCommits?: string[];  // Git commits since loop started
  terminalOutput?: string;   // Recent terminal activity
}

// POST /api/loops
// Starts a new Ralph loop
interface StartLoopRequest {
  directory: string;
  prompt: string;
  maxIterations?: number;
  completionPromise?: string;
  branch?: string;
}

// DELETE /api/loops/:directory
// Stops a running Ralph loop
interface StopLoopResponse {
  success: boolean;
  iterationsCompleted: number;
  finalState: 'completed' | 'cancelled' | 'error';
}
```

---

## What This Enables

### Scenario: Monitor All Loops From One Dashboard

```
┌───────────────────────────────────────────────────────────────────────────┐
│                        RALPH LOOP DASHBOARD                              │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  GLOBAL STATUS                                                        │  │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  │
│  │  🟢 7 loops running across 3 nodes                                    │  │
│  │  📊 1,247 total iterations completed                                  │  │
│  │  ⏱️  Running for 14h 32m                                              │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  NODE: laptop (2 loops)                                               │  │
│  │  ├── project-frontend    🟢  iteration 47  "Build React components" │  │
│  │  └── project-backend     🟢  iteration 23  "Implement API"        │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  NODE: home-server (3 loops)                                          │  │
│  │  ├── website-blog         🟢  iteration 156 "Redesign blog"        │  │
│  │  ├── website-shop         🟢  iteration 89  "Add checkout"         │  │
│  │  └── website-mobile       🟡  iteration 12  "Fix mobile CSS"       │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  NODE: hetzner-vps (2 loops)                                          │  │
│  │  ├── saas-docs            🟢  iteration 203 "Write API docs"       │  │
│  │  └── saas-tests           🔴  iteration 45  "Tests failing"         │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
└───────────────────────────────────────────────────────────────────────────┘
```

### Scenario: Sync Settings Across Nodes

```typescript
// Update permissions on all nodes at once
interface SyncConfigRequest {
  configPath: string;  // ".claude/settings.local.json"
  nodes: string[];     // ["laptop", "home-server", "hetzner-vps"]
  config: {
    permissions: {
      allow: [
        "Skill(ralph-loop:ralph-loop)",
        "Bash(git:*)",
        // ...
      ]
    }
  }
}

// Result: All nodes have consistent Ralph loop permissions
```

---

## Implementation Approach

### Phase 1: Simple Scanner (Today)

```bash
# scripts/scan-ralph-loops.sh
#!/bin/bash

NODES=("laptop" "home-server" "hetzner-vps")

for node in "${NODES[@]}"; do
  echo "=== Node: $node ==="
  ssh $node "find ~ -name 'ralph-loop.local.md' -type f 2>/dev/null | while read file; do
    echo \"  \$(dirname \$file | xargs basename)\"
    echo \"    State: \$(grep '^active:' \$file)\"
    echo \"    Iteration: \$(grep '^iteration:' \$file)\"
  done"
done
```

### Phase 2: Node Agent (Next Week)

```typescript
// node-agent/src/server.ts
Bun.serve({
  port: 8911,
  routes: {
    "/api/status": {
      GET: () => {
        const loops = scanRalphLoops();
        return Response.json({ nodeName, loops });
      }
    },
    "/api/loops": {
      POST: async (req) => {
        const { directory, prompt } = await req.json();
        const loopId = await startRalphLoop(directory, prompt);
        return Response.json({ success: true, loopId });
      }
    }
  }
});
```

### Phase 3: Central Manager (Later)

```typescript
// manager/src/index.ts
class MultiNodeRalphManager {
  private nodes: Map<string, NodeAgentClient>;

  async getAllLoops(): Promise<RalphLoopState[]> {
    const states = await Promise.all(
      Array.from(this.nodes.values()).map(node => node.getStatus())
    );
    return states.flat();
  }

  async startLoop(config: LoopConfig): Promise<string> {
    const bestNode = this.selectBestNode();
    return await bestNode.startLoop(config);
  }

  private selectBestNode(): NodeAgentClient {
    // Find node with most available capacity
    return this.nodes.values()
      .filter(node => node.getCapacity() < 0.8)
      .sort((a, b) => a.getCapacity() - b.getCapacity())[0];
  }
}
```

---

## The Value Proposition

| Without .claude/ Management | With .claude/ Management |
|----------------------------|--------------------------|
| SSH into each node to check status | One dashboard shows all loops |
| Manual config sync across nodes | One click pushes to all nodes |
| Can't see which node has capacity | Auto-select best node for new loop |
| No visibility into loop health | Real-time monitoring + alerts |
| Hard to stop/start loops remotely | Control all loops from one place |

---

## Is This Worth Building?

```
Use Case: Personal productivity (1-5 nodes)
  Value: Medium
  Effort: Low-moderate
  Verdict: Nice to have, build if you need it

Use Case: Team coordination (10+ nodes, multiple developers)
  Value: High
  Effort: Moderate-high
  Verdict: This could be a product

Use Case: Ariana alternative feature
  Value: Core feature
  Effort: Essential
  Verdict: Must have for competitive parity
```

---

## The Real Question

**Are you building:**

| Option | What It Means |
|--------|---------------|
| **A personal tool** | Simple scanner script is probably enough |
| **A team product** | Need full .claude/ management platform |
| **An Ariana competitor** | This is table stakes, not a differentiator |

**Start simple. Add complexity only if you hit the pain point.**

---

**Document Last Updated:** 2026-01-14
