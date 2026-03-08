# Node Agent - Complete Process Flow

**Last Updated:** 2026-01-16

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        YOUR DESKTOP/LAPTOP                                │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                    Cheapspaces App (Orchestrator)                     │ │
│  │  - React UI running in browser                                      │ │
│  │  - Hono backend on localhost:3000                                    │ │
│  │  - Manages Hetzner API + orchestrates nodes                         │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          │ HTTPS over Tailscale VPN
                                          │ (secure, private network)
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              HETZNER CLOUD                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   VPS Node 1 │  │   VPS Node 2 │  │   VPS Node 3 │  │   VPS Node N │    │
│  │              │  │              │  │              │  │              │    │
│  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ │    │
│  │ │  Node    │ │  │ │  Node    │ │  │ │  Node    │ │  │ │  Node    │ │    │
│  │ │  Agent   │ │  │ │  Agent   │ │  │ │  Agent   │ │  │ │  Agent   │ │    │
│  │ │  (8911)  │ │  │ │  (8911)  │ │  │ │  (8911)  │ │  │ │  (8911)  │ │    │
│  │ └────┬─────┘ │  │ └────┬─────┘ │  │ └────┬─────┘ │  │ └────┬─────┘ │    │
│  │      │       │  │      │       │  │      │       │  │      │       │    │
│  │      ▼       │  │      ▼       │  │      ▼       │  │      ▼       │    │
│  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │    │
│  │ │Git Work-│ │  │ │Git Work-│ │  │ │Git Work-│ │  │ │Git Work-│ │    │
│  │ │  trees  │ │  │ │  trees  │ │  │ │  trees  │ │  │ │  trees  │ │    │
│  │ └─────────┘ │  │ └─────────┘ │  │ └─────────┘ │  │ └─────────┘ │    │
│  │              │  │              │  │              │  │              │    │
│  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │    │
│  │ │Ralph    │ │  │ │Ralph    │ │  │ │Ralph    │ │  │ │Ralph    │ │    │
│  │ │ Loops   │ │  │ │ Loops   │ │  │ │ Loops   │ │  │ │ Loops   │ │    │
│  │ └─────────┘ │  │ └─────────┘ │  │ └─────────┘ │  │ └─────────┘ │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## End-to-End Process Flow

### Phase 1: Initial Setup (One-Time)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Step 1: Provision Hetzner VPS                                         │
│  ───────────────────────────────────────────────────────────────────  │
│  Dashboard → "Create Server" → Select server type → Create             │
│                              ↓                                         │
│  Hetzner creates VPS with IP (e.g., 65.108.57.185)                   │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Step 2: SSH Into New VPS & Run Setup                                  │
│  ───────────────────────────────────────────────────────────────────  │
│  ssh root@65.108.57.185                                                │
│  git clone https://github.com/ebowwa/seed && cd seed                   │
│  bash ./setup.sh                                                       │
│                              ↓                                         │
│  Setup installs:                                                       │
│  ✅ Claude Code CLI (with Z.ai)                                       │
│  ✅ Doppler (secrets management)                                       │
│  ✅ GitHub CLI                                                         │
│  ✅ Tailscale                                                          │
│  ✅ Vision + Web Search MCP servers                                    │
│  ✅ Node Agent (NEW - to be added)                                    │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Step 3: Manual Authentication (Required)                              │
│  ───────────────────────────────────────────────────────────────────  │
│  On VPS - Run these interactive commands:                             │
│                                                                              │
│  1. Tailscale Login:                                                    │
│     sudo tailscale up                                                   │
│     → Opens browser, authenticate, then note Tailscale IP              │
│     → e.g., 100.x.x.x                                                   │
│                                                                              │
│  2. Doppler Login:                                                      │
│     doppler login                                                        │
│     → Opens browser for authentication                                  │
│     → Select your project (seed) and config (prd)                       │
│                                                                              │
│  3. GitHub Login:                                                        │
│     gh auth login                                                         │
│     → Follow prompts (What account? → GitHub.com → HTTPS → Login)      │
│                                                                              │
│  ✅ All three authenticated and ready                                     │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Step 4: Register Node in Dashboard                                    │
│  ───────────────────────────────────────────────────────────────────  │
│  In Dashboard: "Add Node" → Enter details:                             │
│  - Name: node-1 (or descriptive name)                                   │
│  - Tailscale IP: 100.x.x.x                                              │
│  - SSH Key: (for direct terminal access, optional)                     │
│                              ↓                                         │
│  Dashboard connects to http://100.x.x.x:8911/api/status              │
│  Node appears in dashboard as "online"                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Phase 2: Deploy a Task (Repeatable)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Step 1: Create Task in Dashboard                                      │
│  ───────────────────────────────────────────────────────────────────  │
│  Dashboard → "New Task"                                                │
│  - Task: "Implement OAuth2 authentication"                             │
│  - Repository: https://github.com/you/main-repo                       │
│  - Branch: feature/auth                                               │
│  - Assign to: Node 1                                                   │
│                              ↓                                         │
│  Dashboard POSTs to Node Agent:                                       │
│  POST http://100.x.x.x:8911/api/worktrees                             │
│  {                                                                    │
│    "id": "worktree-auth",                                             │
│    "branch": "feature/auth",                                          │
│    "repository_url": "https://github.com/you/main-repo"               │
│  }                                                                    │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Step 2: Node Agent Creates Worktree                                   │
│  ───────────────────────────────────────────────────────────────────  │
│  Node Agent (on VPS):                                                  │
│  1. cd ~/repos                                                         │
│  2. git clone https://github.com/you/main-repo (if not exists)         │
│  3. git worktree add main-repo-worktree-auth feature/auth              │
│  4. Creates .claude/settings.local.json with permissions              │
│  5. Returns: {"id": "worktree-auth", "path": "...", "status": "ready"} │
│                              ↓                                         │
│  Dashboard receives response and shows "Worktree created"              │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Step 3: Start Ralph Loop                                              │
│  ───────────────────────────────────────────────────────────────────  │
│  Dashboard → "Start Ralph Loop" on the worktree                        │
│                              ↓                                         │
│  Dashboard POSTS to Node Agent:                                       │
│  POST http://100.x.x.x:8911/api/ralph-loops                            │
│  {                                                                    │
│    "worktree_id": "worktree-auth",                                    │
│    "prompt": "Implement OAuth2 authentication with Google...",         │
│    "max_iterations": 100,                                              │
│    "completion_promise": "Authentication complete and tests passing"  │
│  }                                                                    │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Step 4: Node Agent Starts Ralph Loop                                  │
│  ───────────────────────────────────────────────────────────────────  │
│  Node Agent (on VPS):                                                  │
│  1. cd ~/repos/main-repo-worktree-auth                                │
│  2. Create .claude/ralph-loop.local.md:                                │
│      ---                                                               │
│      active: true                                                      │
│      iteration: 0                                                      │
│      max_iterations: 100                                               │
│      completion_promise: "Authentication complete..."                 │
│      started_at: "2026-01-16T12:00:00Z"                                │
│      ---                                                               │
│      Implement OAuth2 authentication with Google...                    │
│  3. Start background process:                                         │
│     doppler run --project seed --config prd -- claude < /dev/null &  │
│     PID=$!                                                              │
│     echo $PID > ~/.node-agent/pids/loop-auth.pid                      │
│  4. Return: {"id": "loop-auth", "status": "running", "pid": 12345}     │
│                              ↓                                         │
│  Dashboard shows "Ralph loop running" with live iteration counter      │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Step 5: Ralph Loop Runs Autonomously                                  │
│  ───────────────────────────────────────────────────────────────────  │
│  Claude Code process (in worktree):                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 1. Ralph plugin detects .claude/ralph-loop.local.md              │   │
│  │ 2. Reads the prompt from the file                              │   │
│  │ 3. Starts working on the task                                  │   │
│  │ 4. Makes code changes, runs tests, commits                      │   │
│  │ 5. Tries to exit → Stop hook blocks exit                        │   │
│  │ 6. Increments iteration counter in state file                   │   │
│  │ 7. Feeds same prompt back with new context                      │   │
│  │ 8. Loop continues until completion promise or max_iterations    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              ↓                                         │
│  Node Agent monitors .claude/ralph-loop.local.md for progress          │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Step 6: Dashboard Polls for Status (Real-Time Updates)               │
│  ───────────────────────────────────────────────────────────────────  │
│  Every 5 seconds, Dashboard polls:                                     │
│  GET http://100.x.x.x:8911/api/ralph-loops/loop-auth                   │
│                              ↓                                         │
│  Node Agent reads state file and returns:                              │
│  {                                                                    │
│    "id": "loop-auth",                                                  │
│    "iteration": 23,                                                    │
│    "status": "running",                                                │
│    "last_commit": "abc123",                                            │
│    "recent_activity": "Added OAuth2 callback handler"                 │
│  }                                                                    │
│                              ↓                                         │
│  Dashboard updates UI with progress                                    │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Step 7: Task Complete                                                 │
│  ───────────────────────────────────────────────────────────────────  │
│  Ralph loop detects completion promise or reaches max_iterations       │
│  Stop hook allows exit, removes .claude/ralph-loop.local.md            │
│  Claude Code process exits                                             │
│                              ↓                                         │
│  Node Agent detects process is gone, marks loop as "complete"          │
│  Dashboard shows "Task complete - 42 iterations, 8 commits"            │
│  User clicks "View Results" → Dashboard shows commits, logs            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Authentication Automation (Optional)

The manual auth steps can be automated with pre-configured tokens/keys:

### Tailscale Auth Key

```bash
# Generate auth key from Tailscale admin console
# https://login.tailscale.com/admin/settings/keys

# On VPS, use auth key for non-interactive login:
sudo tailscale up --authkey <tskey-auth-key>
```

### Doppler Service Token

```bash
# Generate service token from Doppler dashboard
# https://dashboard.doppler.com/org/workplace/projects

# On VPS, configure with token (non-interactive):
doppler configure set token <doppler-token> --scope /
doppler configure set project seed --scope /
```

### GitHub Personal Access Token

```bash
# Generate PAT from GitHub settings
# https://github.com/settings/tokens

# On VPS, use token for non-interactive login:
echo "https://<github-pat>@github.com" > ~/.git-credentials
chmod 600 ~/.git-credentials

# Or for GitHub CLI:
echo "<github-pat>" | gh auth login --with-token
```

**Trade-off:** Automation vs security. Auth keys enable zero-touch setup but require careful key management.

---

## Quick Reference: Node Setup Commands

```bash
# SSH into new VPS
ssh root@65.108.57.185

# Clone and run setup
git clone https://github.com/ebowwa/seed && cd seed
bash ./setup.sh

# Manual auth (or use tokens for automation)
sudo tailscale up                    # Note the Tailscale IP
doppler login                         # Authenticate with browser
gh auth login                         # Authenticate with GitHub

# Verify everything works
tailscale status                      # Should show connected
doppler whoami                        # Should show your user
gh auth status                        # Should show "Logged in as..."
doppler run --project seed --config prd -- claude /status  # Test Claude
```

---

## API Communication Flow

### Dashboard → Node Agent (Commands)

```http
# Create worktree
POST https://node-tailscale-ip:8911/api/worktrees
Authorization: Bearer <dashboard-api-key>
Content-Type: application/json

{
  "id": "worktree-feature-x",
  "branch": "feature/x",
  "repository_url": "https://github.com/user/repo"
}

# Start Ralph loop
POST https://node-tailscale-ip:8911/api/ralph-loops
Authorization: Bearer <dashboard-api-key>
Content-Type: application/json

{
  "worktree_id": "worktree-feature-x",
  "prompt": "Implement feature X with tests",
  "max_iterations": 100,
  "completion_promise": "Feature X complete and all tests passing"
}

# Stop Ralph loop
DELETE https://node-tailscale-ip:8911/api/ralph-loops/loop-id
Authorization: Bearer <dashboard-api-key>
```

### Node Agent → Dashboard (Status)

```http
# Node Agent pushes status updates (optional webhook)
POST https://dashboard-webhook-url/loops/loop-id/status
X-Node-Id: node-1
X-Api-Key: <node-api-key>

{
  "iteration": 23,
  "status": "running",
  "last_commit": "abc123",
  "last_activity": "Added OAuth callback handler"
}
```

---

## File System Layout (On VPS Node)

```
~/
├── seed/                              # Seed repo (base setup)
│   ├── setup.sh
│   ├── chat.sh
│   └── .claude/
│       ├── settings.node.json
│       └── ralph-loop.local.md       # (if running loop in seed)
│
├── repos/                             # Git repositories
│   ├── main-repo/                     # Main repository
│   │   ├── .git/                      # Git database
│   │   └── .claude/
│   │       └── settings.local.json
│   │
│   └── .git/worktrees/                # Worktree directories
│       ├── worktree-auth/             # Worktree for auth feature
│       │   ├── .claude/
│       │   │   ├── ralph-loop.local.md    # Ralph loop state
│       │   │   └── settings.local.json    # Worktree permissions
│       │   ├── src/
│       │   └── [project files]
│       │
│       └── worktree-payments/         # Worktree for payments
│           ├── .claude/
│           │   ├── ralph-loop.local.md
│           │   └── settings.local.json
│           ├── src/
│           └── [project files]
│
└── .node-agent/                       # Node Agent data
    ├── pids/                          # Process IDs
    │   ├── loop-auth.pid
    │   └── loop-payments.pid
    └── logs/                          # Loop logs
        ├── loop-auth.log
        └── loop-payments.log
```

---

## Process Management (On VPS Node)

### Starting a Ralph Loop

```bash
#!/bin/bash
# Node Agent internal logic

WORKTREE_PATH="/home/ubuntu/repos/.git/worktrees/worktree-auth"
PROMPT="Implement OAuth2 authentication..."
MAX_ITERATIONS=100
COMPLETION_PROMISE="DONE"

# Create Ralph loop state file
cat > "$WORKTREE_PATH/.claude/ralph-loop.local.md" <<EOF
---
active: true
iteration: 0
max_iterations: $MAX_ITERATIONS
completion_promise: $COMPLETION_PROMISE
started_at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
---

$PROMPT
EOF

# Start Claude Code in background
cd "$WORKTREE_PATH"
doppler run --project seed --config prd -- claude < /dev/null > /dev/null 2>&1 &
PID=$!

# Track PID
mkdir -p ~/.node-agent/pids
echo $PID > ~/.node-agent/pids/loop-auth.pid

echo "Started Ralph loop with PID: $PID"
```

### Monitoring a Ralph Loop

```bash
#!/bin/bash
# Node Agent polling logic

LOOP_ID="loop-auth"
STATE_FILE="$WORKTREE_PATH/.claude/ralph-loop.local.md"
PID_FILE="$HOME/.node-agent/pids/loop-auth.pid"

# Check if process is running
if [[ -f "$PID_FILE" ]]; then
    PID=$(cat "$PID_FILE")
    if ps -p $PID > /dev/null 2>&1; then
        STATUS="running"
    else
        STATUS="complete"  # Process exited
    fi
else
    STATUS="not_found"
fi

# Read state file for iteration count
if [[ -f "$STATE_FILE" ]]; then
    ITERATION=$(grep "^iteration:" "$STATE_FILE" | cut -d: -f2 | xargs)
    MAX_ITERATIONS=$(grep "^max_iterations:" "$STATE_FILE" | cut -d: -f2 | xargs)
    COMPLETION_PROMISE=$(grep "^completion_promise:" "$STATE_FILE" | cut -d: -f2 | xargs)
else
    STATUS="complete"  # State file was removed (loop finished)
fi

# Get recent commits (optional)
COMMITS=$(cd "$WORKTREE_PATH" && git log --oneline -5 2>/dev/null || echo "")

echo "{\"iteration\": $ITERATION, \"status\": \"$STATUS\", \"commits\": \"$COMMITS\"}"
```

### Stopping a Ralph Loop

```bash
#!/bin/bash
# Node Agent stop logic

LOOP_ID="loop-auth"
PID_FILE="$HOME/.node-agent/pids/loop-auth.pid"
WORKTREE_PATH="/home/ubuntu/repos/.git/worktrees/worktree-auth"

# Kill Claude Code process
if [[ -f "$PID_FILE" ]]; then
    PID=$(cat "$PID_FILE")
    kill $PID 2>/dev/null || true
    rm "$PID_FILE"
fi

# Remove Ralph loop state file (forces exit)
rm -f "$WORKTREE_PATH/.claude/ralph-loop.local.md"

echo "Stopped Ralph loop: $LOOP_ID"
```

---

## Security & Isolation

### Tailscale Network

```
Your Laptop (100.0.0.1) ←── Tailscale VPN ──→ VPS Node (100.0.0.10)
    │                                                    │
    └── All communication encrypted, private network ──┘
```

### Authentication (Optional)

If not using Tailscale-only security:

```bash
# Dashboard has API key
DASHBOARD_API_KEY="sk-..."

# Node Agent has API key
NODE_API_KEY="sk-..."

# Requests include both
curl -H "Authorization: Bearer $DASHBOARD_API_KEY" \
  -H "X-Node-API-Key: $NODE_API_KEY" \
  http://100.0.0.10:8911/api/status
```

---

## Summary

| Component | Runs On | Purpose |
|-----------|---------|---------|
| **Dashboard (Orchestrator)** | Your laptop | UI, Hetzner management, task deployment |
| **Node Agent** | Each VPS | Worktree management, Ralph loop lifecycle |
| **Ralph Loop** | In worktree on VPS | Autonomous Claude Code process |
| **Tailscale** | All devices | Private network, secure communication |

**Key Point:** The orchestrator is **offline/local** (your desktop), not a cloud service. You maintain full control.
