# Node Agent - TL;DR

**What:** Build autonomous AI coding agents that run on Hetzner VPS nodes while you sleep.

---

## The Problem

Ralph loops = 1 per directory. To run multiple agents in parallel, you need:
- Git worktrees (isolated directories)
- Node Agent (API to manage worktrees + Ralph loops on each VPS)
- Orchestrator (your dashboard to deploy and monitor)

---

## The Architecture

```
Your Laptop (Cheapspaces Dashboard)
    │
    │ Tailscale VPN
    ▼
Hetzner VPS → Node Agent (:8911) → Git Worktrees → Ralph Loops (Claude Code)
```

---

## The Process

### One-Time Per Node
```bash
ssh root@vps-ip
git clone https://github.com/ebowwa/seed && cd seed
bash ./setup.sh
sudo tailscale up    # Get IP like 100.x.x.x
doppler login
gh auth login
```

### Per Task (From Dashboard)
1. Create worktree → `POST /api/worktrees`
2. Start Ralph loop → `POST /api/ralph-loops`
3. Monitor status → `GET /api/ralph-loops/:id`
4. Ralph runs autonomously → Claude works, commits, iterates
5. Task complete → See results in dashboard

---

## Node Agent API

| Endpoint | Does What |
|----------|-----------|
| `GET /api/status` | Node health, capacity, active loops |
| `POST /api/worktrees` | Create git worktree for isolated work |
| `DELETE /api/worktrees/:id` | Remove worktree |
| `POST /api/ralph-loops` | Start Ralph loop (creates state file + claude process) |
| `GET /api/ralph-loops/:id` | Get loop status (iteration, commits) |
| `DELETE /api/ralph-loops/:id` | Stop loop (kill process + delete state file) |

---

## How Ralph Loop Works

1. Create `.claude/ralph-loop.local.md`:
```yaml
---
active: true
iteration: 0
max_iterations: 100
completion_promise: "DONE"
---

Your task here
```

2. Start `doppler run --project seed --config prd -- claude`

3. Ralph plugin detects state file, engages
4. On exit attempt → stop hook blocks exit → increments iteration → feeds prompt back
5. Repeats until completion promise or max_iterations

---

## Key Files

| Doc | Purpose |
|-----|---------|
| `NODE-AGENT.md` | Full architecture, API spec |
| `NODE-AGENT-FLOW.md` | End-to-end process with auth steps |
| `NODE-AGENT-THOUGHTS.md` | Uncertainties, what needs testing |

---

## Status & Next Steps

**Implementation:** ✅ Complete (PR #20 created)

**Testing:**
- ✅ Local HTTP server tested (all 9 endpoints working)
- ⏳ VPS deployment testing (pending setup.sh integration)
- ⏳ Ralph loop E2E testing (pending VPS)

**Next Steps:**
1. ⏳ Integrate `install_node_agent.sh` into seed/setup.sh
2. ⏳ Deploy to test VPS and verify
3. ⏳ Build orchestration layer in dashboard
4. ⏳ Test end-to-end flow

---

**Bottom Line:** Local dashboard manages VPS nodes that run autonomous Claude Code loops in isolated git worktrees. You wake up to completed work.
