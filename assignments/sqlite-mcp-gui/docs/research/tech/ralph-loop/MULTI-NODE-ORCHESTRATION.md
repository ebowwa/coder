# Multi-Node Orchestration: Complete Architecture

**Date:** 2026-01-14
**Status:** Architecture Design Document
**Foundation:** Built on existing Hetzner VPS wrapper + Ralph loop research

---

## Executive Summary

We have the foundation for a complete **multi-node Ralph loop orchestration platform**. This document outlines how to extend our existing Hetzner VPS infrastructure to manage not just servers, but the entire hierarchy:

```
Nodes (VPS) → Projects → Worktrees → Branches → Ralph Loops
```

---

## What We Already Have

### 1. Hetzner VPS Infrastructure (`app/server/lib/hetzner/`)

```typescript
// ✓ Already built
HetznerClient {
  createServer(options)
  getServer(id)
  deleteServer(id)
  listServers()
}

ActionOperations {
  waitForAction(id)
  getActionStatus(id)
  listActions(serverId)
}
```

### 2. Git Worktree Research (`docs/GIT-WORKTREE-ISOLATION.md`)

- ✓ Complete understanding of worktree isolation
- ✓ Documented workflows for creating/managing worktrees
- ✓ Understanding of .git/worktrees/ metadata structure

### 3. Ralph Loop Research (`docs/stack/claudecode/ralph-loop/`)

- ✓ Single-directory limitation confirmed
- ✓ Worktree workaround documented
- ✓ Multi-node architecture designed

### 4. Action Polling (`app/browser-client/lib/hetznerActionPolling.ts`)

- ✓ Real-time status updates for VPS actions
- ✓ Can be extended for Ralph loop status polling

---

## The Complete Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           YOUR APP (com.hetzner.codespaces)                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        BROWSER CLIENT                                │  │
│  │                                                                    │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │  │  DASHBOARD - Multi-Node Ralph Loop Manager                     │ │  │
│  │  │                                                                  │ │  │
│  │  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐      │ │  │
│  │  │  │ Node: laptop   │  │ Node: home     │  │ Node: hetzner │      │ │  │
│  │  │  │ 🟢 2 loops     │  │ 🟡 1 loop     │  │ 🔴 offline     │      │ │  │
│  │  │  └────────────────┘  └────────────────┘  └────────────────┘      │ │  │
│  │  │                                                                  │ │  │
│  │  │  ┌─────────────────────────────────────────────────────────────┐ │ │  │
│  │  │  │ ACTIONS: Create Worktree | Start Loop | Stop Loop | Sync  │ │ │  │
│  │  │  └─────────────────────────────────────────────────────────────┘ │ │  │
│  │  └─────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                    │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │  │  WORKTREE VIEW                                                 │ │  │
│  │  │                                                                  │ │  │
│  │  │  Project: com.hetzner.codespaces                                │ │  │
│  │  │  ├── codespaces-frontend  🟢 Ralph #47 (ui-redesign-v2)      │ │  │
│  │  │  ├── codespaces-backend   🟢 Ralph #23 (api-rewrite)         │ │  │
│  │  │  └── codespaces-testing   🟡 Ralph #12 (test-coverage)        │ │  │
│  │  └─────────────────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ════════════════════════════════════════════════════════════════════════════  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        SERVER API                                     │  │
│  │                                                                    │  │
│  │  /api/hetzner/*        → HetznerClient (existing)                 │  │
│  │  /api/nodes/*           → NodeManager (new)                         │  │
│  │  /api/worktrees/*       → WorktreeManager (new)                     │  │
│  │  /api/branches/*        → BranchManager (new)                       │  │
│  │  /api/ralph-loops/*     → RalphLoopManager (new)                   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP/WebSocket
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        NODE AGENT (runs on each VPS)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  AGENT SERVER (Port 8911)                                             │  │
│  │                                                                       │  │
│  │  POST /api/worktrees     → Create git worktree                       │  │
│  │  GET  /api/worktrees     → List all worktrees                         │  │
│  │  DELETE /api/worktrees/:id → Remove worktree                          │  │
│  │                                                                       │  │
│  │  POST /api/branches      → Create/checkout branch                     │  │
│  │  GET  /api/branches      → List branches in worktree                  │  │
│  │                                                                       │  │
│  │  POST /api/ralph-loops   → Start Ralph loop                           │  │
│  │  GET  /api/ralph-loops   → List all loops + status                     │  │
│  │  DELETE /api/ralph-loops/:id → Stop loop                              │  │
│  │                                                                       │  │
│  │  GET  /api/status        → Node health, capacity, running loops       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  WORKTREE OPERATIONS                                                   │  │
│  │                                                                       │  │
│  │  createWorktree(projectPath, branch, name)                           │  │
│  │  listWorktrees(projectPath)                                           │  │
│  │  removeWorktree(worktreePath)                                         │  │
│  │  getWorktreeStatus(worktreePath) → { branch, commits, ralphLoop }     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  RALPH LOOP OPERATIONS                                                │  │
│  │                                                                       │  │
│  │  startRalphLoop(worktreePath, prompt, options)                       │  │
│  │  stopRalphLoop(worktreePath)                                          │  │
│  │  getLoopStatus(worktreePath) → { active, iteration, promise }        │  │
│  │  listAllLoops() → [{ worktree, state, progress }]                    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Model: Complete State

```typescript
// ============================================================================
// NODE LAYER
// ============================================================================

interface Node {
  id: string;
  name: string;
  type: 'laptop' | 'home-server' | 'hetzner-vps' | 'custom';
  status: 'online' | 'offline' | 'error';
  connection: {
    host: string;
    port: number;
    authMethod: 'ssh-key' | 'password';
  };
  capacity: {
    cpu: number;        // 0-1 utilization
    memory: number;     // 0-1 utilization
    disk: number;        // 0-1 utilization
    activeLoops: number;
    maxLoops: number;
  };
  projects: Project[];
  createdAt: Date;
  lastSeen: Date;
}

// ============================================================================
// PROJECT LAYER
// ============================================================================

interface Project {
  id: string;
  name: string;
  nodeId: string;
  repositoryUrl: string;  // git@github.com:user/repo.git
  localPath: string;      // /home/user/code/project-name
  worktrees: Worktree[];
  branches: Branch[];
  createdAt: Date;
}

// ============================================================================
// WORKTREE LAYER
// ============================================================================

interface Worktree {
  id: string;
  projectId: string;
  nodeId: string;
  name: string;            // e.g., "project-frontend"
  path: string;            // /home/user/code/project-frontend
  branch: string;          // Current branch HEAD
  gitDir: string;          // .git file pointing to worktrees metadata
  ralphLoop?: RalphLoop;   // Active Ralph loop in this worktree
  status: 'active' | 'idle' | 'error';
  lastActivity: Date;
  createdAt: Date;
}

// ============================================================================
// BRANCH LAYER
// ============================================================================

interface Branch {
  id: string;
  projectId: string;
  worktreeId?: string;     // If checked out in a worktree
  name: string;
  commit: string;          // SHA
  author: string;
  message: string;
  createdAt: Date;
  isMerged: boolean;
}

// ============================================================================
// RALPH LOOP LAYER
// ============================================================================

interface RalphLoop {
  id: string;
  worktreeId: string;
  nodeId: string;
  projectId: string;
  statePath: string;       // /path/to/worktree/.claude/ralph-loop.local.md

  // Parsed from ralph-loop.local.md
  active: boolean;
  iteration: number;
  maxIterations: number;
  completionPromise: string | null;
  startedAt: Date;
  prompt: string;

  // Runtime status
  status: 'running' | 'completed' | 'failed' | 'paused';
  progress: number;        // 0-1
  lastOutput?: string;      // Recent terminal output
  recentCommits?: string[]; // Commits made by this loop

  // Resource tracking
  pid?: number;            // Claude Code process ID
  terminalId?: string;     // Terminal session ID
}

// ============================================================================
// AGGREGATED VIEWS
// ============================================================================

interface MultiNodeStatus {
  nodes: {
    [nodeId: string]: {
      node: Node;
      projects: Project[];
      totalLoops: number;
      activeLoops: number;
      capacity: number;    // 0-1, overall capacity
    }
  };
  summary: {
    totalNodes: number;
    onlineNodes: number;
    totalProjects: number;
    totalWorktrees: number;
    totalLoops: number;
    activeLoops: number;
  };
}
```

---

## API Endpoints

### Node Management

```typescript
// GET /api/nodes
// List all configured nodes
interface ListNodesResponse {
  nodes: Node[];
}

// POST /api/nodes
// Add a new node (VPS or local machine)
interface CreateNodeRequest {
  name: string;
  type: 'hetzner-vps' | 'custom';
  connection: {
    host: string;
    port: number;
    auth: SSHAuthConfig;
  };
}

// GET /api/nodes/:nodeId/status
// Get detailed status of a specific node
interface NodeStatusResponse {
  node: Node;
  projects: Project[];
  worktrees: Worktree[];
  loops: RalphLoop[];
  systemMetrics: {
    cpu: number;
    memory: number;
    disk: number;
  };
}

// DELETE /api/nodes/:nodeId
// Remove a node from management
```

### Worktree Management

```typescript
// GET /api/projects/:projectId/worktrees
// List all worktrees for a project
interface ListWorktreesResponse {
  worktrees: Worktree[];
}

// POST /api/projects/:projectId/worktrees
// Create a new worktree
interface CreateWorktreeRequest {
  name: string;              // e.g., "project-frontend"
  branch: string;            // Branch to checkout
  baseDirectory?: string;    // Parent directory (default: ../)
}

interface CreateWorktreeResponse {
  worktree: Worktree;
  path: string;
}

// DELETE /api/worktrees/:worktreeId
// Remove a worktree
interface RemoveWorktreeResponse {
  success: boolean;
  message?: string;
}

// GET /api/worktrees/:worktreeId/status
// Get detailed status of a worktree
interface WorktreeStatusResponse {
  worktree: Worktree;
  branch: string;
  recentCommits: string[];
  ralphLoop?: RalphLoop;
  fileCount: number;
  lastCommit: string;
}
```

### Branch Management

```typescript
// GET /api/worktrees/:worktreeId/branches
// List branches in a worktree
interface ListBranchesResponse {
  branches: Branch[];
  currentBranch: string;
}

// POST /api/worktrees/:worktreeId/branches
// Create or checkout a branch
interface CreateBranchRequest {
  name: string;
  startPoint?: string;     // Commit SHA or branch name
}

interface CreateBranchResponse {
  branch: Branch;
}

// POST /api/worktrees/:worktreeId/branches/merge
// Merge a branch into current worktree
interface MergeBranchRequest {
  sourceBranch: string;
  strategy?: 'merge' | 'rebase' | 'squash';
}
```

### Ralph Loop Management

```typescript
// GET /api/ralph-loops
// List all Ralph loops across all nodes
interface ListRalphLoopsResponse {
  loops: RalphLoop[];
  summary: {
    total: number;
    running: number;
    completed: number;
    failed: number;
  };
}

// POST /api/worktrees/:worktreeId/ralph-loops
// Start a Ralph loop in a worktree
interface StartRalphLoopRequest {
  prompt: string;
  maxIterations?: number;
  completionPromise?: string;
  branch?: string;          // Optional: create new branch first
}

interface StartRalphLoopResponse {
  loop: RalphLoop;
  pid: number;
}

// GET /api/ralph-loops/:loopId
// Get detailed status of a Ralph loop
interface RalphLoopStatusResponse {
  loop: RalphLoop;
  recentOutput: string[];
  fileChanges: FileChange[];
  commits: string[];
}

// DELETE /api/ralph-loops/:loopId
// Stop a Ralph loop
interface StopRalphLoopResponse {
  success: boolean;
  iterationsCompleted: number;
  finalState: 'completed' | 'cancelled' | 'error';
}

// POST /api/ralph-loops/:loopId/pause
// Pause a running loop

// POST /api/ralph-loops/:loopId/resume
// Resume a paused loop
```

### Sync Operations

```typescript
// POST /api/nodes/:nodeId/sync
// Sync configuration to a node
interface SyncNodeRequest {
  config: {
    sshKeys?: string[];
    claudeSettings?: Record<string, any>;
    environmentVariables?: Record<string, string>;
  };
}

// POST /api/projects/:projectId/sync
// Push project to all/specific nodes
interface SyncProjectRequest {
  nodes: string[];          // Node IDs to sync to
  branch?: string;
  createWorktrees?: boolean;
}
```

---

## Implementation Plan

### Phase 1: Node Agent (Week 1-2)

**Goal: Lightweight agent that runs on each VPS/node**

```bash
# Location: /opt/ralph-node-agent/
# Stack: Bun + TypeScript (same as main app)

# Core files:
├── src/
│   ├── server.ts          # HTTP API server
│   ├── worktree.ts        # Git worktree operations
│   ├── ralph.ts           # Ralph loop management
│   ├── node.ts            # Node status monitoring
│   └── index.ts
├── package.json
└── tsconfig.json

# Install on each node:
curl -fsSL https://your-domain.com/install-node-agent.sh | sudo bash
```

**Key Operations:**

```typescript
// worktree.ts
export class WorktreeManager {
  async create(projectPath: string, branch: string, name: string): Promise<Worktree> {
    const worktreePath = path.dirname(projectPath) + '/' + name;

    // Run: git worktree add <worktreePath> -b <branch>
    await $`git worktree add ${worktreePath} -b ${branch}`;

    return {
      id: generateId(),
      projectId: getProjectId(projectPath),
      name,
      path: worktreePath,
      branch,
      createdAt: new Date()
    };
  }

  async list(projectPath: string): Promise<Worktree[]> {
    // Run: git worktree list
    const result = await $`git worktree list`.quiet();
    // Parse and return worktrees
  }

  async remove(worktreePath: string): Promise<void> {
    await $`git worktree remove ${worktreePath}`;
  }
}

// ralph.ts
export class RalphLoopManager {
  async start(worktreePath: string, prompt: string, options: StartOptions): Promise<RalphLoop> {
    const statePath = path.join(worktreePath, '.claude', 'ralph-loop.local.md');

    // Create ralph-loop.local.md
    await this.createStateFile(statePath, prompt, options);

    // Start Claude Code with Ralph loop
    const pid = await this.startClaudeCode(worktreePath);

    return {
      id: generateId(),
      worktreeId: getWorktreeId(worktreePath),
      statePath,
      pid,
      active: true,
      iteration: 0,
      ...options
    };
  }

  async getStatus(worktreePath: string): Promise<RalphLoop> {
    const statePath = path.join(worktreePath, '.claude', 'ralph-loop.local.md');
    const content = await fs.readFile(statePath, 'utf-8');
    return this.parseStateFile(content);
  }

  async stop(worktreePath: string): Promise<void> {
    // Kill Claude Code process
    // Remove ralph-loop.local.md
    await fs.unlink(path.join(worktreePath, '.claude', 'ralph-loop.local.md'));
  }
}
```

### Phase 2: Server API Extensions (Week 2-3)

**Goal: Extend existing server with orchestration endpoints**

```typescript
// app/server/api.ts (existing file - add new routes)

import { NodeManager } from './lib/nodes/manager.js';
import { WorktreeManager } from './lib/worktrees/manager.js';
import { RalphLoopManager } from './lib/ralph/manager.js';

// Initialize managers
const nodeManager = new NodeManager(db);
const worktreeManager = new WorktreeManager(db);
const ralphLoopManager = new RalphLoopManager(db);

// Add new route groups
Bun.serve({
  routes: {
    // ... existing routes ...

    // Node routes
    '/api/nodes': nodeManager.routes(),

    // Worktree routes
    '/api/worktrees': worktreeManager.routes(),

    // Ralph loop routes
    '/api/ralph-loops': ralphLoopManager.routes(),
  }
});
```

### Phase 3: Dashboard UI (Week 3-4)

**Goal: Browser-based management interface**

```typescript
// app/browser-client/components/MultiNodeDashboard.tsx

export function MultiNodeDashboard() {
  const { data: nodes } = useNodes();
  const { data: loops } = useRalphLoops();

  return (
    <div className="dashboard">
      <NodeList nodes={nodes} />
      <WorktreeGrid />
      <RalphLoopMonitor />
      <ActionPanel
        actions={{
          createWorktree,
          startLoop,
          stopLoop,
          syncNode
        }}
      />
    </div>
  );
}
```

### Phase 4: Integration with Existing Hetzner Features (Week 4)

**Goal: Auto-provision nodes with worktrees**

```typescript
// When creating a new VPS, optionally set up worktrees:

interface CreateServerWithWorktreesOptions {
  name: string;
  serverType: string;
  image: string;

  // NEW: Auto-setup worktrees on the new server
  worktrees?: {
    repository: string;
    branches: string[];
    ralphLoops?: {
      worktree: string;
      prompt: string;
    }[];
  };
}

async function createServerWithWorktrees(options: CreateServerWithWorktreesOptions) {
  // 1. Create VPS (existing code)
  const server = await hetznerClient.createServer(options);

  // 2. SSH into new server
  await waitForSSH(server.public_net.ipv4.ip);

  // 3. Install node agent
  await installNodeAgent(server.public_net.ipv4.ip);

  // 4. Clone repository
  await executeOnServer(server, `git clone ${options.worktrees.repository}`);

  // 5. Create worktrees
  for (const branch of options.worktrees.branches) {
    await createWorktreeOnServer(server, branch);
  }

  // 6. Start Ralph loops
  for (const loopConfig of options.worktrees.ralphLoops || []) {
    await startRalphLoopOnServer(server, loopConfig);
  }

  return server;
}
```

---

## Real-World Usage Example

### Scenario: Overnight Full-Stack Development

```typescript
// User configures this in the dashboard:

const overnightJob = {
  name: "full-stack-iteration",
  nodes: [
    {
      name: "hetzner-frontend",
      type: "hetzner-vps",
      serverType: "cpx11",
      worktrees: {
        repository: "git@github.com:user/app.git",
        branches: ["main", "develop"],
        ralphLoops: [
          {
            worktree: "app-ui-redesign",
            prompt: "Redesign the dashboard using shadcn/ui components",
            branch: "feature/ui-redesign"
          }
        ]
      }
    },
    {
      name: "hetzner-backend",
      type: "hetzner-vps",
      serverType: "cpx21",
      worktrees: {
        repository: "git@github.com:user/app.git",
        branches: ["main"],
        ralphLoops: [
          {
            worktree: "app-api-refactor",
            prompt: "Refactor API to use new database schema",
            branch: "feature/api-refactor"
          }
        ]
      }
    },
    {
      name: "hetzner-testing",
      type: "hetzner-vps",
      serverType: "cpx11",
      worktrees: {
        repository: "git@github.com:user/app.git",
        branches: ["main"],
        ralphLoops: [
          {
            worktree: "app-integration-tests",
            prompt: "Get integration test coverage to 90%",
            branch: "feature/add-tests"
          }
        ]
      }
    }
  ]
};

// Click "Run Overnight" →
// - Spins up 3 VPSs
// - Creates worktrees on each
// - Starts 3 Ralph loops in parallel
// - Wake up to completed work
// - Auto-destroy VPSs (or keep for next iteration)
```

---

## Migration Path: From Existing to Enhanced

### What We Have Now

```
Current State:
├── Hetzner VPS management ✓
├── Action polling ✓
├── Server creation/destruction ✓
└── Resource monitoring ✓
```

### What We Add

```
Enhanced State:
├── Hetzner VPS management ✓ (existing)
├── Node agent deployment ← NEW
├── Git worktree management ← NEW
├── Branch operations ← NEW
├── Ralph loop orchestration ← NEW
├── Multi-node dashboard ← NEW
└── Auto-provisioning with worktrees ← NEW
```

### Backward Compatibility

```
✓ Existing Hetzner API unchanged
✓ Existing UI still works
✓ New features are additive
✓ Opt-in for advanced workflows
```

---

## Key Insights

### 1. This Is Ariana's Architecture

| Layer | Ariana | Our Implementation |
|-------|---------|-------------------|
| **Nodes** | Managed VPS | Hetzner VPS + custom nodes |
| **Worktrees** | Canvas system | Git worktrees |
| **Branches** | Git branches per canvas | Git branches per worktree |
| **Loops** | Ralph loops per canvas | Ralph loops per worktree |
| **Management** | Ariana dashboard | Our dashboard + API |

### 2. We Can Go Further

| Feature | Ariana | Our Potential |
|---------|--------|---------------|
| **Multi-cloud** | Hetzner only | Hetzner + AWS + GCP + custom |
| **Self-hosted nodes** | No | Add laptop/home server |
| **Pricing** | $4.99/mo | Free (DIY) or custom pricing |
| **Open source** | Partially | Can be fully open source |

### 3. The Real Value

```
It's not about managing .claude/ directories.
It's not about managing Git worktrees.
It's not about managing branches.

It's about orchestrating AUTONOMOUS AI DEVELOPMENT
across a distributed fleet of machines.

The .claude/, worktrees, and branches are just implementation details.
The product is: AI that codes while you sleep.
```

---

## Success Metrics

### Technical

- [ ] Node agent installs in < 30 seconds
- [ ] Worktree creation in < 5 seconds
- [ ] Ralph loop starts in < 10 seconds
- [ ] Dashboard updates in real-time (< 1s latency)
- [ ] Support 10+ nodes, 100+ worktrees, 1000+ loops

### User Experience

- [ ] One-click "overnight iteration" setup
- [ ] Wake up to completed work
- [ ] Easy rollback of bad experiments
- [ ] Clear visibility into all loop status
- [ ] Simple cost tracking per node/loop

### Business

- [ ] Alternative to Ariana at lower cost
- [ ] Can be offered as open-source + paid hosting
- [ ] Extensible to other cloud providers
- [ ] Team collaboration features

---

## Next Steps

### This Week

1. **Review and validate** this architecture with team
2. **Create proof-of-concept** node agent (single machine)
3. **Test worktree operations** via agent API
4. **Document** the API surface

### Next Two Weeks

1. **Build full node agent** with all operations
2. **Extend server API** with orchestration endpoints
3. **Build basic dashboard** UI
4. **Test with 2-3 nodes** running in parallel

### Next Month

1. **Integrate with existing Hetzner VPS flows**
2. **Add auto-provisioning** (create VPS + setup worktrees)
3. **Polish UI/UX** for production use
4. **Documentation** for self-hosting

---

## The Question

**Is this the product?**

Or is this a feature that helps you build something else?

The answer determines how much to invest.

---

**Document Last Updated:** 2026-01-14
**Status:** Ready for implementation
