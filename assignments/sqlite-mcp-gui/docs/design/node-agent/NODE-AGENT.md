# Node Agent Architecture

**Status:** Design Phase
**Last Updated:** 2026-01-16
**Purpose:** Autonomous agent orchestration for multi-node Ralph loop execution

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Ralph Loop Mechanics](#ralph-loop-mechanics)
4. [Node Agent API](#node-agent-api)
5. [Integration with Seed Repo](#integration-with-seed-repo)
6. [Deployment](#deployment)
7. [Security](#security)

---

## Overview

### The Problem

Ralph loops are limited to **one per directory** due to the hardcoded state file path `.claude/ralph-loop.local.md`. To run multiple autonomous agents in parallel, we need:

1. **Git worktrees** - Isolated working directories for each agent
2. **Node Agent** - HTTP API to manage worktrees and Ralph loops on each VPS
3. **Orchestration Layer** - Central dashboard to deploy and monitor across nodes

### The Solution

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Cheapspaces Dashboard                           │
│  - Deploy tasks to nodes                                           │
│  - Monitor all Ralph loops in real-time                            │
│  - Aggregate status across nodes                                   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS over Tailscale
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│              VPS Node 1              VPS Node 2              VPS N   │
│  ┌─────────────────────┐    ┌─────────────────────┐    ┌──────────┐ │
│  │   Node Agent (8911) │    │   Node Agent (8911) │    │  Agent   │ │
│  │  - HTTP API server  │    │  - HTTP API server  │    │          │ │
│  │  - Worktree mgmt    │    │  - Worktree mgmt    │    │          │ │
│  │  - Ralph loop mgmt  │    │  - Ralph loop mgmt  │    │          │ │
│  └─────────────────────┘    └─────────────────────┘    └──────────┘ │
│           │                         │                         │       │
│           ▼                         ▼                         ▼       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │              Git Worktrees (isolated agents)                  │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │ │
│  │  │ worktree-1   │  │ worktree-2   │  │ worktree-3   │        │ │
│  │  │ (frontend)   │  │ (backend)    │  │ (testing)    │        │ │
│  │  │ .claude/     │  │ .claude/     │  │ .claude/     │        │ │
│  │  │ ralph-loop...│  │ ralph-loop...│  │ ralph-loop...│        │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘        │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Architecture

### Node Agent Responsibilities

| Responsibility | Description |
|----------------|-------------|
| **Worktree Management** | Create, list, delete git worktrees |
| **Ralph Loop Lifecycle** | Start, monitor, stop Ralph loops |
| **Process Management** | Manage background Claude Code processes |
| **Status Reporting** | Report node health, capacity, active loops |
| **Log Streaming** | Stream Ralph loop logs in real-time |

### Tech Stack

- **Runtime:** Bun (fast TypeScript execution)
- **HTTP Server:** Bun.serve() (built-in, no Express)
- **Language:** TypeScript
- **Process Management:** Child processes with PID tracking
- **State Storage:** File-based (`.claude/ralph-loop.local.md`, SQLite for metadata)

---

## Ralph Loop Mechanics

### How Ralph Loops Work

```
User starts Ralph loop
          │
          ▼
┌─────────────────────────────────┐
│  1. Create .claude/ralph-loop.  │
│     local.md with:              │
│     - active: true              │
│     - iteration: 0              │
│     - max_iterations: N         │
│     - prompt: "your task"       │
└─────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────┐
│  2. Start Claude Code process:  │
│     doppler run --project seed  │
│     --config prd -- claude      │
└─────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────┐
│  3. Ralph plugin detects state  │
│     file and engages            │
└─────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────┐
│  4. On each exit attempt:       │
│     - Stop hook runs            │
│     - Reads state file          │
│     - If complete → exit        │
│     - If not complete →         │
│       increment iteration       │
│       feed prompt back          │
└─────────────────────────────────┘
          │
          ▼
         Loop
```

### State File Format

```yaml
# .claude/ralph-loop.local.md
---
active: true
iteration: 0
max_iterations: 100
completion_promise: "DONE"
started_at: "2026-01-16T12:00:00Z"
---

Implement authentication feature with OAuth2
```

### Stop Hook Logic

The `stop-hook.sh` (built into Ralph plugin):

```bash
# Pseudocode of stop-hook.sh
if [[ ! -f .claude/ralph-loop.local.md ]]; then
  exit 0  # No active loop, allow exit
fi

# Parse YAML frontmatter
iteration=$(grep "^iteration:" .claude/ralph-loop.local.md | cut -d: -f2)
max_iterations=$(grep "^max_iterations:" .claude/ralph-loop.local.md | cut -d: -f2)
completion_promise=$(grep "^completion_promise:" .claude/ralph-loop.local.md | cut -d: -f2)
prompt=$(sed -n '/^---$/,$p' .claude/ralph-loop.local.md | tail -n +2)

# Check completion promise
if [[ "$completion_promise" != "null" ]]; then
  last_output=$(get_last_claude_message)
  if [[ "$last_output" == *"$completion_promise"* ]]; then
    rm .claude/ralph-loop.local.md
    exit 0  # Complete!
  fi
fi

# Check max iterations
if [[ $max_iterations -gt 0 ]] && [[ $iteration -ge $max_iterations ]]; then
  rm .claude/ralph-loop.local.md
  exit 0  # Max iterations reached
fi

# Continue loop
next_iteration=$((iteration + 1))
update_state_file $next_iteration
echo "{\"decision\": \"block\", \"reason\": \"$prompt\"}"
```

---

## Node Agent API

### Base URL

```
http://<node-tailscale-ip>:8911
```

### Endpoints

#### Health & Status

```http
GET /api/status
```

**Response:**
```json
{
  "node_id": "node-1",
  "hostname": "hetzner-node-1",
  "tailscale_ip": "100.x.x.x",
  "capacity": {
    "cpu_percent": 45,
    "memory_percent": 62,
    "disk_percent": 71
  },
  "worktrees": [
    {
      "id": "worktree-frontend",
      "branch": "feature/auth",
      "commit": "abc123",
      "path": "/home/user/repos/main-repo/.git/worktrees/frontend"
    }
  ],
  "ralph_loops": [
    {
      "id": "loop-frontend",
      "worktree_id": "worktree-frontend",
      "iteration": 23,
      "max_iterations": 100,
      "status": "running",
      "started_at": "2026-01-16T12:00:00Z"
    }
  ]
}
```

---

#### Worktree Management

```http
# List all worktrees
GET /api/worktrees

# Create worktree
POST /api/worktrees
Content-Type: application/json

{
  "id": "worktree-frontend",
  "branch": "feature/auth",
  "commit": "abc123",
  "repository_path": "/home/user/repos/main-repo"
}

# Delete worktree
DELETE /api/worktrees/:id
```

**POST Response:**
```json
{
  "id": "worktree-frontend",
  "branch": "feature/auth",
  "path": "/home/user/repos/main-repo/.git/worktrees/frontend",
  "created_at": "2026-01-16T12:00:00Z"
}
```

---

#### Ralph Loop Management

```http
# List all Ralph loops
GET /api/ralph-loops

# Create Ralph loop
POST /api/ralph-loops
Content-Type: application/json

{
  "worktree_id": "worktree-frontend",
  "prompt": "Implement OAuth2 authentication with Google provider",
  "max_iterations": 100,
  "completion_promise": "Authentication complete and tests passing",
  "claude_settings": {
    "model": "glm-4.7",
    "permissions": [
      "Bash(git:*)",
      "Bash(bun:*)",
      "Bash(npm:*)",
      "Bash(curl:*)"
    ]
  }
}

# Get Ralph loop status
GET /api/ralph-loops/:id

# Stop Ralph loop
DELETE /api/ralph-loops/:id

# Get Ralph loop logs (streaming)
GET /api/ralph-loops/:id/logs
```

**POST Response:**
```json
{
  "id": "loop-frontend",
  "worktree_id": "worktree-frontend",
  "status": "starting",
  "prompt": "Implement OAuth2 authentication...",
  "max_iterations": 100,
  "completion_promise": "Authentication complete and tests passing",
  "started_at": "2026-01-16T12:00:00Z",
  "process_id": "pid-12345"
}
```

**GET Status Response:**
```json
{
  "id": "loop-frontend",
  "worktree_id": "worktree-frontend",
  "status": "running",
  "iteration": 23,
  "max_iterations": 100,
  "completion_promise": "Authentication complete and tests passing",
  "started_at": "2026-01-16T12:00:00Z",
  "last_activity": "2026-01-16T14:32:15Z",
  "recent_commits": [
    {"hash": "def456", "message": "Add OAuth2 callback handler"},
    {"hash": "ghi789", "message": "Configure Google OAuth2 app"}
  ]
}
```

---

### Error Responses

All endpoints return standard error responses:

```json
{
  "error": {
    "code": "WORKTREE_NOT_FOUND",
    "message": "Worktree 'worktree-frontend' does not exist",
    "details": {}
  }
}
```

**Error Codes:**
- `WORKTREE_NOT_FOUND` - Worktree doesn't exist
- `WORKTREE_ALREADY_EXISTS` - Worktree with this ID already exists
- `RALPH_LOOP_NOT_FOUND` - Ralph loop doesn't exist
- `RALPH_LOOP_ALREADY_RUNNING` - A loop is already running in this worktree
- `PROCESS_START_FAILED` - Failed to start Claude Code process
- `GIT_OPERATION_FAILED` - Git worktree operation failed
- `INVALID_REQUEST` - Invalid request body

---

## Integration with Seed Repo

### Seed Repo Structure

```
seed/
├── setup.sh                    # Main setup script
├── chat.sh                     # Run Claude with Doppler
├── .claude/
│   ├── settings.node.json      # Z.ai configuration
│   └── ralph-loop.local.md     # Ralph loop state (created at runtime)
├── node-agent/                 # NEW: Node Agent
│   ├── package.json
│   ├── src/
│   │   ├── index.ts            # HTTP server entry point
│   │   ├── routes/
│   │   │   ├── status.ts       # GET /api/status
│   │   │   ├── worktrees.ts    # Worktree CRUD
│   │   │   └── ralph-loops.ts  # Ralph loop lifecycle
│   │   ├── services/
│   │   │   ├── git.ts          # Git worktree operations
│   │   │   ├── claude.ts       # Claude Code process management
│   │   │   └── monitor.ts      # State file monitoring
│   │   └── types/
│   │       └── index.ts        # TypeScript types
│   └── systemd/
│       └── node-agent.service  # systemd service file
└── ...
```

### Installation in setup.sh

Add to `setup.sh` after Claude Code installation:

```bash
# Node Agent Installation
install_node_agent() {
    print_info "Installing Node Agent..."

    cd "$HOME/seed"
    mkdir -p node-agent

    # Copy/build node-agent files
    # (These will be in the seed repo)

    # Install dependencies
    cd node-agent
    bun install

    # Build TypeScript
    bun run build

    # Create systemd service
    sudo cp systemd/node-agent.service /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable node-agent
    sudo systemctl start node-agent

    print_success "Node Agent installed and started on port 8911"
}
```

### systemd Service

```ini
# /etc/systemd/system/node-agent.service
[Unit]
Description=Node Agent for Ralph Loop Orchestration
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/seed/node-agent
Environment="NODE_ENV=production"
Environment="DOPPLER_PROJECT=seed"
Environment="DOPPLER_CONFIG=prd"
ExecStart=/home/ubuntu/.bun/bin/bun run src/index.ts
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

---

## Deployment

### Initial Node Setup

1. **Provision Hetzner VPS**
2. **SSH into node**
3. **Clone seed repo:** `git clone https://github.com/ebowwa/seed && cd seed`
4. **Run setup:** `bash ./setup.sh`
5. **Verify Node Agent:** `curl http://localhost:8911/api/status`

### From Dashboard

1. **Register node** with Tailscale IP
2. **Test connection** to Node Agent API
3. **Deploy worktrees** to node
4. **Start Ralph loops** with tasks

---

## Security

### Authentication

**Option 1: Tailscale Network Only**
- Node Agent listens on Tailscale interface only
- No authentication needed (network-level security)

**Option 2: API Key Authentication**
```bash
curl -H "Authorization: Bearer <api-key>" \
  http://node-ip:8911/api/status
```

### Authorization

**Permissions model:**
- Dashboard can deploy/monitor loops
- Nodes cannot access other nodes
- Each worktree is isolated

### Process Isolation

- Each Ralph loop runs in separate worktree
- Background processes tracked by PID
- Failed processes are cleaned up

### Rate Limiting

- Max concurrent loops per node (configurable)
- Max iterations per loop (safety limit)
- Process timeout (kill stuck loops)

---

## Implementation Phases

### Phase 1: Core API (Current)
- [ ] Node Agent HTTP server
- [ ] Worktree management endpoints
- [ ] Ralph loop lifecycle endpoints
- [ ] Status reporting

### Phase 2: Orchestration
- [ ] Dashboard integration
- [ ] Multi-node management
- [ ] Task queue system

### Phase 3: Advanced Features
- [ ] Log streaming
- [ ] Metrics/telemetry
- [ ] Auto-scaling

---

## References

- [Ralph Loop Research](./stack/claudecode/ralph-loop/RALPH-LOOP-RESEARCH.md)
- [Git Worktree Isolation](./stack/git/GIT-WORKTREE-ISOLATION.md)
- [Multi-Node Orchestration](./stack/claudecode/ralph-loop/MULTI-NODE-ORCHESTRATION.md)
- [Seed Repo](https://github.com/ebowwa/seed)
