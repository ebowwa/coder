# Node Agent - Thoughts & Uncertainties

**Last Updated:** 2026-01-16
**Purpose:** Track what we know, what we're uncertain about, and what needs verification

---

## Testing Results (2026-01-16)

### Local Testing Complete ✅

**Environment:** macOS (localhost)
**Date:** 2026-01-16

| Test | Result | Notes |
|------|--------|-------|
| HTTP server startup | ✅ Pass | Started on port 8911 |
| GET /api/status | ✅ Pass | Returns node info, Tailscale IP detected (100.117.206.105) |
| GET /api/worktrees | ✅ Pass | Returns empty array (no worktrees) |
| GET /api/ralph-loops | ✅ Pass | Returns empty array (no loops) |
| Error handling | ✅ Pass | Proper error codes, 404 works |
| CORS headers | ✅ Pass | OPTIONS preflight works |
| Response format | ✅ Pass | JSON output correct |

**Bug Fixed:** Response handling in `jsonResponse()` - headers now properly merged.

### Still Needs Testing ⏳

| Test | Environment | Priority |
|------|-------------|----------|
| Git worktree creation | VPS with real git repo | High |
| Ralph loop start/stop | VPS with Claude Code | High |
| Worktree permissions | VPS | High |
| Process cleanup on crash | VPS | Medium |
| Real Claude behavior | VPS | High |

---

## Known Facts ✓

| Fact | Source | Confidence |
|------|--------|------------|
| Ralph loop state is stored in `.claude/ralph-loop.local.md` | Ralph Loop Research | High |
| One Ralph loop per directory due to hardcoded state file path | GitHub issue #15885 | High |
| Git worktrees provide isolated working directories | Git Worktree Isolation doc | High |
| Seed repo installs Claude Code with Z.ai configuration | `setup.sh` review | High |
| Seed repo's `settings.node.json` has MCP servers but NO permissions | Seed repo inspection | High |
| Ralph loop is invoked via `/ralph-loop` skill in Claude Code | Ralph Loop Research | High |
| Stop hook reads state file to decide whether to continue | Ralph Loop Research | High |

---

## Uncertainties ⚠️

### Question: Where do permissions live for Ralph loops in worktrees?

**My Assumption:**
Each worktree needs its own `.claude/settings.local.json` with Ralph loop permissions scoped to that task.

**Why This Might Be Wrong:**
- Maybe permissions are inherited from the parent repo?
- Maybe Claude Code uses a global `.claude` from home directory?
- Maybe the seed repo's base settings are sufficient?

**What Needs Verification:**
1. Create a git worktree
2. Run `claude` inside the worktree
3. Check if it reads worktree's `.claude/settings.local.json` or parent's
4. Test if Ralph loop works without worktree-specific permissions

---

### Question: How does Claude Code resolve `.claude` directory in worktrees?

**Scenario:**
```
~/repos/main-repo/          # Main repo
  ├─ .claude/
  │   └─ settings.json
  └─ .git/worktrees/
      └── feature-auth/
          └── .claude/
              └─ settings.local.json  # Does this get read?
```

**Uncertainty:**
- When running `claude` from `~/repos/main-repo/.git/worktrees/feature-auth/`, does it read:
  - A) `~/repos/main-repo/.git/worktrees/feature-auth/.claude/settings.local.json`
  - B) `~/.claude/settings.json`
  - C) Both, with some merge/priority logic?

**Test Needed:**
```bash
# Create worktree
cd ~/repos/main-repo
git worktree add ../worktree-test feature-branch

# Add conflicting settings
cd ../worktree-test
mkdir .claude
echo '{"test": "worktree"}' > .claude/settings.local.json

# Run Claude and check which settings it uses
claude /show-settings  # Does this command exist?
# Or check logs/debug output
```

---

### Question: What permissions does Node Agent need to add?

**Assumed Per-Worktree Permissions:**
```json
{
  "permissions": {
    "allow": [
      "Skill(ralph-loop:ralph-loop)",
      "Bash(git:*)",
      "Bash(bun:*)",
      "Bash(npm:*)"
    ]
  }
}
```

**Questions:**
- Are these sufficient? Too broad?
- Should each worktree have different permissions based on task?
- What about file system permissions - can Ralph loop write anywhere in worktree?
- Should we add `Bash(doppler run:*)` or is that inherited?

**What We Know:**
- The cheapspaces app has extensive permissions (60+ allowed operations)
- The seed repo has NO permissions defined in base settings
- Ralph loop needs at minimum: git + build tool access

---

## Implementation Decisions Needed

### Decision 1: Permissions Strategy

**Option A: Per-Worktree Permissions**
- Node Agent creates `.claude/settings.local.json` in each worktree
- Pros: Fine-grained control, isolated
- Cons: More complexity, need to decide what perms to grant

**Option B: Inherited Permissions**
- Use global `~/.claude/settings.json` for all worktrees
- Pros: Simpler, one config
- Cons: All loops have same permissions (over-privileged?)

**Option C: Template-Based**
- Node Agent has permission templates (frontend, backend, testing)
- Apply appropriate template based on task type
- Pros: Balance of control and simplicity
- Cons: Need to define templates

**Recommendation:** Start with Option B (global), move to A/C if needed

---

### Decision 2: State Management

**Question:** How does Node Agent track running Ralph loops?

**Options:**
1. **In-memory only** - Lost on restart, simple
2. **SQLite database** - Persistent, queryable
3. **File-based** - JSON files in `~/.node-agent/`
4. **Read from `.claude/ralph-loop.local.md`** - Source of truth, no dup tracking

**Recommendation:** Option 4 (read state files) + Option 2 (SQLite for metadata like PIDs, start time)

---

### Decision 3: Process Management

**Question:** How to start/stop Claude Code processes for Ralph loops?

**Approach:**
```bash
# Start
cd /path/to/worktree
doppler run --project seed --config prd -- claude < /dev/null > /dev/null 2>&1 &
echo $! > ~/.node-agent/pids/<loop-id>.pid

# Stop
kill $(cat ~/.node-agent/pids/<loop-id>.pid)
```

**Questions:**
- Should we use `nohup` instead of backgrounding?
- Should we use systemd user services for each loop?
- How to detect if process died unexpectedly?
- What about stdout/stderr - where do logs go?

**Recommendation:** Start with background + PID file, add proper logging later

---

## Open Questions for Implementation

| Question | Priority | How to Answer |
|----------|----------|---------------|
| Where does Claude read `.claude` settings in worktrees? | High | Manual test |
| What are minimum permissions for Ralph loop? | High | Start minimal, add as needed |
| How to handle process crashes? | Medium | Monitor, restart, alert |
| Should we limit concurrent loops per node? | Medium | Configurable, default to 4 |
| How to authenticate API requests? | Low | Tailscale isolation first |

---

## Next Steps Before Implementation

1. **Verify worktree settings behavior**
   ```bash
   # On a test machine:
   git clone https://github.com/ebowwa/seed
   cd seed
   git worktree add ../test-worktree -b test-branch
   cd ../test-worktree
   mkdir .claude
   echo '{"test": "value"}' > .claude/settings.local.json
   claude --help  # Check what it logs about settings
   ```

2. **Test Ralph loop in worktree**
   ```bash
   # In the worktree:
   echo '/ralph-loop "echo test"' | claude
   # See if it creates .claude/ralph-loop.local.md
   # Check if it respects permissions
   ```

3. **Document findings** and update this doc

---

## Notes

- This is a living document - update as we learn
- When in doubt, test manually before building automation
- The seed repo setup is our source of truth for what's installed
- The Ralph loop research doc is our source of truth for how it works
