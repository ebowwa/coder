# Documentation Accuracy Summary

**Date:** 2026-01-19
**Task:** Review all documentation for accuracy against current codebase

---

## Executive Summary

**Current Product:** Hetzner VPS Manager with Terminal Access
**Vision Product:** Multi-Agent Orchestration Platform (competitor to Ariana)

**Gap:** The product vision describes features that **don't exist yet**. The `/design/node-agent/` and `/product/` docs describe a future product, not the current one.

---

## By Category

### ✅ `/implementation/` - Accurate (3 sections, 4 files)

| Section | Status | Notes |
|---------|--------|-------|
| `/implementation/terminal/` | ✅ Working | **tmux-based** terminal sessions with auto-installation and persistent sessions |
| `/implementation/vps-management/` | ✅ Working | Dynamic data loading (server types, locations) implemented |
| `/implementation/ssh-operations/` | ✅ Working | SSH resource commands tested and working |

**Key Detail:** Terminal sessions use **tmux** (not raw SSH) with:
- Automatic tmux installation (apt/yum/dnf/apk support)
- Persistent sessions: `tmux new-session -A -s codespaces-{host}`
- Session cleanup: Auto-removes sessions >30 days old
- Scrollback: 10,000 lines per session (~1MB)

### ✅ `/design/node-agent/` - Built and Deployed (7 files)

| File | Describes | Reality |
|------|-----------|---------|
| `NODE-AGENT.md` | Node Agent API with 8 endpoints | ✅ **IMPLEMENTED** - in `/seed/node-agent/` |
| `NODE-AGENT-TLDR.md` | "Implementation: ✅ Complete" | ✅ **DEPLOYED** - integrated into setup.sh |
| `NODE-AGENT-FLOW.md` | End-to-end flow | ✅ Working via feat/node-agent branch |
| `NODE-AGENT-INTEGRATION.md` | Integration specs | ✅ **COMPLETE** - setup.sh integrated (commit 2966cf6) |
| `NODE-AGENT-THOUGHTS.md` | Design uncertainties | N/A (design notes) |
| `NODE-AGENT-REVIEW.md` | Review notes | N/A (review notes) |
| `node-bootstrapping.md` | Cloud-init bootstrap | ⏳ Not implemented (future) |

**Status:**
- ✅ **Code Complete:** Node Agent implemented at `/seed/node-agent/`
  - 8 endpoints: `/api/status`, `/api/worktrees` (CRUD), `/api/ralph-loops` (CRUD + logs)
  - Bun HTTP server on port 8911
  - Git worktree operations
  - Ralph loop lifecycle management
  - systemd service integration
- ✅ **Setup Integration:** `install_node_agent()` added to setup.sh (commit 2966cf6)
  - Added to VPS `TOOLS_TO_INSTALL` array
  - VPS-only installation with systemd service
  - Auto-starts on VPS provision
- ⏳ **Deployed via feat/node-agent branch**
  - `app/backend/shared/lib/seed/install.ts` clones this branch
  - setup.sh installs and starts node-agent automatically
  - Not yet merged to main

**What exists in main app:** `GET /api/environments/:id/node-agent` checks if port 8911 is responding. Once feat/node-agent is merged, this will return "online" for new VPSs.

### ℹ️ `/design/orchestration/` - Research (1 file)

| File | Type | Status |
|------|------|--------|
| `multi-agent-orchestration.md` | Architectural research | Correct - it's a guide, not implementation spec |

### ℹ️ `/design/scaling/` - Research (1 file)

| File | Type | Status |
|------|------|--------|
| `hetzner-quota-strategies.md` | Future planning | Correct - describes scaling options not yet needed |

### ⚠️ `/product/` - Vision Only (3 files)

| File | Describes | Reality |
|------|-----------|---------|
| `vision.md` | Multi-Agent Orchestration Platform | Product is currently a VPS manager |
| `roadmap-ideas.md` | genesis + inevitable | Raw brainstorming notes |
| `automation-strategy.md` | Claude Code automation | Future features |

### ✅ `/changelog/` - Historical (2 files)

| File | Type | Status |
|------|------|--------|
| `refactors/hetzner-types-refactor.md` | Completed refactor | Accurate historical record |
| `fixes/hardcoded-data-fix.md` | Completed fix | Accurate historical record |

### ℹ️ `/research/` - Reference Material (19 files)

External technology research (Bun, Claude Code, Git, Hetzner, etc.) - correctly categorized as reference material.

---

## What Actually Exists

### 48 Working Endpoints

```
VPS Management:
├── GET    /api/environments           - List servers
├── POST   /api/environments           - Create server
├── DELETE /api/environments/:id       - Delete server
├── POST   /api/environments/:id/start - Start server
└── POST   /api/environments/:id/stop  - Stop server

Resource Monitoring:
└── GET    /api/environments/:id/resources - CPU, memory, disk, etc. (SSH)

Terminal:
├── GET    /api/terminal/sessions      - List sessions
├── GET    /api/terminal/sessions/:id  - Get session
└── DELETE /api/terminal/sessions/:id  - Delete session

Dynamic Data:
├── GET    /api/server-types           - From Hetzner API
└── GET    /api/locations              - From Hetzner API

SSH Operations:
├── POST   /api/ssh                    - SSH command execution
├── POST   /api/ssh/test               - Test SSH connection
├── POST   /api/ssh/fingerprint        - Get SSH fingerprint
├── POST   /api/scp/upload            - Upload file via SCP
├── POST   /api/scp/download          - Download file via SCP
├── POST   /api/files/list            - List files
└── POST   /api/files/preview         - Preview file

AI Suggestions:
├── POST   /api/ai/generate           - Generate response
├── POST   /api/ai/chat               - Chat interface
├── POST   /api/ai/suggest/name       - Suggest server name
├── POST   /api/ai/suggest/server-type - Suggest server type
├── POST   /api/ai/analyze/resources  - Analyze resource usage
├── POST   /api/ai/troubleshoot/ssh   - SSH troubleshooting
├── POST   /api/ai/suggest/actions    - Suggest actions
└── POST   /api/ai/status/message     - Status messages

Node Agent (Status Check Only):
└── GET    /api/environments/:id/node-agent - Check if agent running

Metadata & Config:
├── GET    /api/environments/:id/metadata    - Get metadata
├── PUT    /api/environments/:id/metadata    - Update metadata
├── DELETE /api/environments/:id/metadata    - Delete metadata
├── PUT    /api/environments/:id/activity    - Update activity
└── PUT    /api/environments/:id/plugins     - Update plugins

Metrics:
├── GET    /api/environments/:id/metrics           - Get metrics
├── GET    /api/environments/:id/metrics/summary   - Metrics summary
└── POST   /api/metrics                             - Store metrics

SSH Keys:
├── GET    /api/ssh-keys              - List keys
├── GET    /api/ssh-keys/:id          - Get key
├── POST   /api/ssh-keys              - Create key
└── DELETE /api/ssh-keys/:id          - Delete key

Admin & Health:
├── GET    /api/health                - Health check
├── GET    /api/auth/status           - Auth status
├── GET    /api/admin/ssh-pool        - SSH pool status
├── GET    /api/admin/ssh-pool/metrics - SSH pool metrics
└── GET    /api/admin/ssh-pool/summary - SSH pool summary
```

---

## Missing from Vision

The product vision describes these features that **don't exist**:

```
Job Management:
├── POST   /api/jobs                  - Create job
├── GET    /api/jobs                  - List jobs
├── GET    /api/jobs/:id              - Get job status
└── POST   /api/jobs/:id/cancel       - Cancel job

Worktree Operations:
├── POST   /api/worktrees             - Create worktree
├── GET    /api/worktrees             - List worktrees
├── DELETE /api/worktrees/:id         - Delete worktree

Ralph Loops:
├── POST   /api/ralph-loops           - Start Ralph loop
├── GET    /api/ralph-loops/:id       - Get loop status
├── DELETE /api/ralph-loops/:id       - Stop loop

Orchestration:
└── Orchestrator layer (coordinates multiple agents)

Token Budget:
└── Token tracking and optimization
```

---

## Recommendations

1. **Mark `/design/node-agent/` as "Planned" or "Future"**
   - These docs describe features that haven't been built
   - Consider adding a status header to each file: "Status: 🟡 Designed, Not Implemented"

2. **Update `/product/vision.md`**
   - Add a "Current Status" section explaining what exists vs what's planned
   - Distinguish between "current product" (VPS manager) and "vision" (multi-agent platform)

3. **Create `/product/current.md`**
   - Document what the product actually does today
   - Include the 48 working endpoints
   - Describe current user workflows

4. **Create `/product/roadmap.md`**
   - Move from vision/ideas to actionable roadmap
   - Prioritize: Node Agent → Orchestrator → Multi-agent coordination

5. **Consider splitting `/design/`**:
   - `/design/planned/` - Features designed but not built (node-agent)
   - `/research/` - Architectural research (orchestration, scaling)

---

**Conclusion:** Documentation is well-organized but **misleading** about current capabilities. The vision docs describe a future product that doesn't exist yet.
