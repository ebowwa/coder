# Ralph Loop - Single Directory Limitation Investigation

**Research Date:** 2026-01-14
**Purpose:** Comprehensive investigation of the single-directory limitation for Ralph Wiggum loops in Claude Code

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Confirmed Limitation](#confirmed-limitation)
3. [Root Cause Analysis](#root-cause-analysis)
4. [GitHub Issue #15885](#github-issue-15885)
5. [Official stop-hook.sh Implementation](#official-stop-hooksh-implementation)
6. [Workarounds & Solutions](#workarounds--solutions)
7. [Community Perspectives](#community-perspectives)
8. [Sources](#sources)

---

## Executive Summary

**Finding:** Each directory can only have **ONE active Ralph loop** at a time.

The Ralph Wiggum plugin in Claude Code uses a hardcoded state file path (`.claude/ralph-loop.local.md`), which prevents multiple Ralph loops from running simultaneously in the same directory. Multiple loops would conflict over the same state file, causing iteration counter corruption and stop hook ambiguity.

**Status:** This is an **open GitHub issue** (#15885) with no assigned developer or pull request as of January 2026.

---

## Confirmed Limitation

### Single-Loop-Per-Directory Constraint

| Factor | Details |
|--------|---------|
| **State file** | `.claude/ralph-loop.local.md` |
| **Location** | Fixed path in `.claude/` directory |
| **Format** | YAML frontmatter + Markdown prompt |
| **Scope** | One file per directory = One loop per directory |

### State File Structure

```yaml
---
active: true
iteration: 391
max_iterations: 0
completion_promise: null
started_at: "2026-01-13T12:26:55Z"
---

[Prompt text continues here...]
```

### Why Only One Loop Per Directory

1. **Single state file** - Loop state stored in a hardcoded path
2. **Conflict risk** - Multiple loops would overwrite each other's iteration counters
3. **Stop hook ambiguity** - The stop hook wouldn't know which loop to continue
4. **Race conditions** - Concurrent writes would corrupt the state file

### Visual: Why Multiple Terminals on Same Directory Fails

```
❌ DOESN'T WORK: Multiple terminals, same directory

┌─────────────────────────────────────────────────────────────┐
│                    /my-project/                              │
│                                                                 │
│  .claude/ralph-loop.local.md  ← SINGLE SHARED STATE FILE    │
│                                                                 │
┌────────────┐  ┌────────────┐  ┌────────────┐                  │
│ Terminal 1 │  │ Terminal 2 │  │ Terminal 3 │                  │
│            │  │            │  │            │                  │
│  Ralph     │  │  Ralph     │  │  Ralph     │                  │
│  Loop A    │  │  Loop B    │  │  Loop C    │                  │
│            │  │            │  │            │                  │
└─────┬──────┘  └─────┬──────┘  └─────┬──────┘                  │
      │               │               │                          │
      └───────────────┴───────────────┘                          │
                      │                                          │
                      ▼                                          │
            ALL WRITE TO SAME FILE!                              │
                      │                                          │
                      ▼                                          │
              ❌ CORRUPTION ❌                                   │
└─────────────────────────────────────────────────────────────┘

✅ WORKS: Multiple terminals, DIFFERENT directories

┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│  /project-frontend/ │  │  /project-backend/  │  │  /project-test/     │
│                                                                                     │
│  .claude/            │  │  .claude/            │  │  .claude/            │
│  ralph-loop.local.md │  │  ralph-loop.local.md │  │  ralph-loop.local.md │
│                                                                                     │
┌────────────┐        │  ┌────────────┐        │  ┌────────────┐        │
│ Terminal 1 │        │  │ Terminal 2 │        │  │ Terminal 3 │        │
│            │        │  │            │        │  │            │        │
│  Ralph     │        │  │  Ralph     │        │  │  Ralph     │        │
│  Loop A    │        │  │  Loop B    │        │  │  Loop C    │        │
│            │        │  │            │        │  │            │        │
└─────┬──────┘        │  └─────┬──────┘        │  └─────┬──────┘        │
      │               │         │               │         │               │
      ▼               │         ▼               │         ▼               │
  SEPARATE FILE       │     SEPARATE FILE       │     SEPARATE FILE       │
                      │                          │                      │
                      ▼                          ▼                      ▼
                    ✅ ISOLATED ✅ ✅ ISOLATED ✅ ✅ ISOLATED ✅
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

---

## Root Cause Analysis

### Hardcoded State File Path

From the official `stop-hook.sh` implementation:

```bash
# Location: anthropics/claude-code/plugins/ralph-wiggum/hooks/stop-hook.sh

RALPH_STATE_FILE=".claude/ralph-loop.local.md"

# Check if Ralph loop is active
if [[ ! -f "$RALPH_STATE_FILE" ]]; then
  exit 0  # No active loop, allow exit
fi

# Parse YAML frontmatter from state file
ITERATION=$(grep "^iteration:" "$RALPH_STATE_FILE" | sed 's/iteration: //')
MAX_ITERATIONS=$(grep "^max_iterations:" "$RALPH_STATE_FILE" | sed 's/max_iterations: //')
COMPLETION_PROMISE=$(grep "^completion_promise:" "$RALPH_STATE_FILE" | sed 's/completion_promise: //')
```

### Stop Hook Logic Flow

```
Claude tries to exit → Stop hook triggered
                          ↓
              Check if .claude/ralph-loop.local.md exists
                          ↓
              ┌─────────────────────────────────┐
              │                                 │
           NO (file missing)              YES (file exists)
              │                                 │
              ↓                                 ↓
        Allow normal exit              Parse state file
                                            ↓
                          Check completion promise / max_iterations
                                            ↓
                              ┌─────────────────────────────┐
                              │                             │
                        COMPLETE                    NOT COMPLETE
                              │                             │
                              ↓                             ↓
                  Remove state file              Increment iteration
                  Allow exit                     Feed prompt back again
                                                 (loop continues)
```

---

## GitHub Issue #15885

### Issue Metadata

| Field | Value |
|-------|-------|
| **Issue Number** | [#15885](https://github.com/anthropics/claude-code/issues/15885) |
| **Title** | "[FEATURE] Multiple ralph state files for ralph wiggum plugin" |
| **Opened** | December 31, 2025 |
| **Reporter** | @tvvignesh |
| **Status** | Open |
| **Assignee** | None |
| **Labels** | `enhancement`, `New feature or request` |
| **Priority** | Marked "Critical - Blocking my work" |
| **Category** | CLI commands and flags |

### Problem Statement (from issue)

> "As seen in the ralph-wiggum plugin code, I see that the ralph wiggum plugin supports a single state file for maintaining iterations, completion promise, etc. and I am unable to use it if I want to run multiple different ralph loops in parallel and if I try that, they end up interfering with one ralph loop which is currently in the ralph-loop.local.md file"

### Proposed Solution

> "Allow specifying a different state file as arg for every ralph loop so that different ralph loops can use different state files."

---

## Official stop-hook.sh Implementation

### Source Repository

- **Repository:** [anthropics/claude-code](https://github.com/anthropics/claude-code)
- **Path:** `plugins/ralph-wiggum/hooks/stop-hook.sh`
- **URL:** https://github.com/anthropics/claude-code/blob/main/plugins/ralph-wiggum/hooks/stop-hook.sh

### Key Functionality

The stop hook implements the following logic:

1. **Reads hook input** (advanced stop hook API via stdin)
2. **Checks for active loop** by testing if `.claude/ralph-loop.local.md` exists
3. **Parses YAML frontmatter** for iteration/max/completion_promise
4. **Validates numeric fields** (corruption detection)
5. **Checks max_iterations limit**
6. **Extracts transcript path** from hook input
7. **Reads last assistant message** from transcript (JSONL format)
8. **Checks for completion promise** in `<promise>` tags
9. **If complete** → removes state file, allows exit
10. **If not complete** → increments iteration, feeds same prompt back

### Critical Code Section

```bash
# Check for completion promise
if [[ "$COMPLETION_PROMISE" != "null" ]] && [[ -n "$COMPLETION_PROMISE" ]]; then
  PROMISE_TEXT=$(echo "$LAST_OUTPUT" | perl -0777 -pe 's/.*?<promise>(.*?)<\/promise>.*/$1/s')
  if [[ "$PROMISE_TEXT" = "$COMPLETION_PROMISE" ]]; then
    echo "✅ Ralph loop: Detected $COMPLETION_PROMISE"
    rm "$RALPH_STATE_FILE"
    exit 0  # Allow exit
  fi
fi

# Not complete - continue loop
NEXT_ITERATION=$((ITERATION + 1))

# Update state file with new iteration
sed -i.bak "s/^iteration: .*/iteration: $NEXT_ITERATION/" "$RALPH_STATE_FILE"

# Output JSON to block stop and feed prompt back
jq -n \
  --arg prompt "$PROMPT_TEXT" \
  --arg msg "$SYSTEM_MSG" \
  '{
    "decision": "block",
    "reason": $prompt,
    "systemMessage": $msg
  }'
```

---

## Workarounds & Solutions

### Current Workarounds Used by Community

| Workaround | Description | Pros | Cons |
|------------|-------------|------|------|
| **Git Worktrees** | Create isolated workspaces for each Ralph instance | Same codebase, isolated state | Multiple directory management |
| **Separate Directories** | Each loop runs in its own project directory | Complete isolation | Requires multiple codebase copies |
| **Agent Terminals** | Spawn multiple Claude Code instances from sidebar | Easy to set up | Still requires separate directories |
| **Multiple Terminals + Separate Dirs** | Run multiple terminal sessions, each in a different working directory | Simple, no special setup | Manual coordination required |

### ⚠️ Important: Multiple Terminals Alone Is NOT a Workaround

**Multiple terminals on the same machine pointing to the same directory will NOT work.**

All terminals would share the same `.claude/ralph-loop.local.md` file, causing:
- Iteration counter corruption
- Lost loop state
- Unpredictable behavior
- Race conditions on state file writes

**The key requirement is separate directories, not separate terminals.**

### Multi-Terminal Workflow Example

**Note:** This works because each terminal operates on a DIFFERENT directory.

```
# Terminal 1: Frontend work
cd ./project-frontend    # ← Different directory!
claude /ralph-loop "Build React components"

# Terminal 2: Backend work (different terminal OR new session)
cd ./project-backend     # ← Different directory!
claude /ralph-loop "Implement API endpoints"

# Terminal 3: Testing/QA (different terminal OR new session)
cd ./project-test        # ← Different directory!
claude /ralph-loop "Get tests to green"
```

**Using Git Worktrees for Same-Codebase Parallel Loops:**

```bash
# Setup: Create worktrees from main repository
git worktree add ../project-frontend -b frontend-work
git worktree add ../project-backend -b backend-work
git worktree add ../project-test -b testing-work

# Now each worktree has its own .claude/ directory
# and can run independent Ralph loops
```

### Advanced Multi-Agent Approaches

Based on community research:

1. **Ralph Playbook** ([ClaytonFarr/ralph-playbook](https://github.com/ClaytonFarr/ralph-playbook))
   - Two-mode system: PLANNING vs BUILDING
   - Single loop, switches modes based on plan existence

2. **Multi-Agent Ralph** ([alfredolopez80/multi-agent-ralph-loop](https://github.com/alfredolopez80/multi-agent-ralph-loop))
   - Advanced orchestration for parallel Ralph instances
   - Still requires separate directories per instance

3. **Ralph Orchestrator** ([mikeyobrien/ralph-orchestrator](https://github.com/mikeyobrien/ralph-orchestrator))
   - Tool for coordinating multiple Ralph loops
   - Addresses coordination challenges

---

## Community Perspectives

### Real-World Impact Stories

1. **$297 Autonomous Build**: A developer spent $297 on Claude API while Ralph ran overnight, completing a full project

2. **CURSED Programming Language**: Geoffrey Huntley used Ralph to build an entire programming language over 3 months of autonomous looping

3. **6 Codebases Migrated**: One report of migrating 6 codebases in a single overnight session (likely using multiple terminals/directories)

### Common Use Cases

| Use Case | Single Loop Sufficient? | Multiple Loops Needed? |
|----------|------------------------|------------------------|
| **Test-driven development** | ✅ Yes | ❌ No |
| **Code migration** | ✅ Yes | ❌ No |
| **Full-stack development** | ❌ No | ✅ Yes |
| **Parallel feature development** | ❌ No | ✅ Yes |
| **Microservices architecture** | ❌ No | ✅ Yes |
| **Overnight refinement** | ✅ Yes | ❌ No |

### Expert Recommendations

From the research:

> "The Ralph loop is confusing" - Common sentiment due to single-directory limitation

> "Use protection" - Run in isolated environments (Docker sandboxes) when running multiple loops

> "Steering Ralph" - Create signals via upstream (deterministic setup) and downstream (backpressure)

---

## Technical Details

### State File Locking (Not Implemented)

The current implementation does **NOT** implement file locking:

- No `flock` mechanism
- No atomic write operations
- No concurrent access protection
- Vulnerable to race conditions if multiple processes try to write

### Potential Race Conditions

```bash
# Scenario: Two Ralph loops start simultaneously

# Loop 1:
RALPH_STATE_FILE=".claude/ralph-loop.local.md"
echo "iteration: 1" > "$RALPH_STATE_FILE"

# Loop 2 (simultaneous):
RALPH_STATE_FILE=".claude/ralph-loop.local.md"
echo "iteration: 1" > "$RALPH_STATE_FILE"  # Overwrites Loop 1!

# Result: Only one loop's state persists, the other is lost
```

### Why Hardcoded Path Makes Sense (Originally)

The hardcoded path was likely chosen for:

1. **Simplicity** - Easy to understand and debug
2. **Discoverability** - Always know where the state file is
3. **Safety** - Prevents accidental loops in wrong directories
4. **Stop hook reliability** - Single source of truth

But it prevents legitimate use cases for parallel autonomous work.

---

## Future Possibilities

### Potential API Changes

If GitHub issue #15885 is implemented, we might see:

```bash
# Hypothetical future syntax:
/ralph-loop "Task 1" --state-file .claude/ralph-loop-task1.local.md
/ralph-loop "Task 2" --state-file .claude/ralph-loop-task2.local.md
/ralph-loop "Task 3" --state-file .claude/ralph-loop-task3.local.md
```

Or with task names:

```bash
/ralph-loop "Task 1" --task-name frontend
/ralph-loop "Task 2" --task-name backend
/ralph-loop "Task 3" --task-name testing

# State files would be:
# .claude/ralph-loop-frontend.local.md
# .claude/ralph-loop-backend.local.md
# .claude/ralph-loop-testing.local.md
```

### Alternative: Directory-Based State

```
.claude/
└── ralph-loops/
    ├── loop-1/
    │   └── state.md
    ├── loop-2/
    │   └── state.md
    └── loop-3/
        └── state.md
```

---

## Sources

### Primary Sources

1. **GitHub Issue #15885** - [Multiple ralph state files for ralph wiggum plugin](https://github.com/anthropics/claude-code/issues/15885)
   - Opened: December 31, 2025
   - Reporter: @tvvignesh
   - Status: Open

2. **Official stop-hook.sh** - [anthropics/claude-code/plugins/ralph-wiggum/hooks/stop-hook.sh](https://github.com/anthropics/claude-code/blob/main/plugins/ralph-wiggum/hooks/stop-hook.sh)
   - Official implementation of Ralph loop state management

3. **Local Research Document** - `docs/stack/claudecode/ralph-loop/RALPH-LOOP-RESEARCH.md`
   - 681 lines of comprehensive Ralph loop research
   - Created: January 13, 2026

### Community Resources

4. **Medium Article** - [How I'm Using Claude Code Parallel Agents to Blow Up My Workflows](https://medium.com/@joe.njenga/how-im-using-claude-code-parallel-agents-to-blow-up-my-workflows-460676bf38e8)
   - Discusses Git worktrees solution for parallel Claude instances

5. **Reddit Discussion** - [The Ralph-Wiggum Loop](https://www.reddit.com/r/ClaudeCode/comments/1q9qjk4/the_ralphwiggum_loop/)
   - Community experiences and workarounds

6. **AI Hero** - [Getting Started With Ralph](https://www.aihero.dev/getting-started-with-ralph)
   - Tutorial on Ralph loop basics

### Advanced Implementations

7. **Ralph Playbook** - [ClaytonFarr/ralph-playbook](https://github.com/ClaytonFarr/ralph-playbook)
   - Advanced methodology: PLANNING vs BUILDING modes

8. **Multi-Agent Ralph** - [alfredolopez80/multi-agent-ralph-loop](https://github.com/alfredolopez80/multi-agent-ralph-loop)
   - Orchestration for parallel Ralph instances

9. **Ralph Orchestrator** - [mikeyobrien/ralph-orchestrator](https://github.com/mikeyobrien/ralph-orchestrator)
   - Coordination tool for multiple Ralph loops

### Original Resources

10. **Original Guide** - [ghuntley/how-to-ralph-wiggum](https://github.com/ghuntley/how-to-ralph-wiggum)
    - Creator Geoffrey Huntley's original implementation

11. **Official Plugin** - [anthropics/claude-code/plugins/ralph-wiggum](https://github.com/anthropics/claude-code/tree/main/plugins/ralph-wiggum)
    - Official Ralph Wiggum plugin documentation

### Related Tools

12. **Alternative Implementation** - [frankbria/ralph-claude-code](https://github.com/frankbria/ralph-claude-code)
    - Autonomous AI development framework

13. **DevLoop Implementation** - [Ilm-Alan/claude-devloop](https://github.com/Ilm-Alan/claude-devloop)
    - Alternative loop implementation

---

## Conclusion

### Summary

The single-directory limitation in Ralph Wiggum loops is a **confirmed constraint** caused by the hardcoded state file path `.claude/ralph-loop.local.md`. This limitation is actively being discussed in the community (GitHub issue #15885, opened December 31, 2025) but has not yet been addressed by the Claude Code team.

### Critical Understanding

**Multiple terminals on the same machine does NOT solve the problem.**

The limitation is **per directory**, not per terminal. All terminals pointing to the same directory share the same state file and will conflict. The requirement is **separate directories**, not separate terminals.

### Impact

- **Blocks:** Parallel autonomous development in a single directory
- **Affects:** Full-stack development, microservices architectures, parallel feature development
- **Workarounds:** Git worktrees + separate directories, or physically separate project directories

### Recommendation

For developers needing parallel Ralph loops:
1. **Use Git worktrees** to create isolated working directories from the same repository
2. **Each worktree/directory gets its own** `.claude/ralph-loop.local.md` file
3. **Use Git branches within each worktree** for experimental work (Ariana-style)
4. **Run separate Claude Code sessions** in each worktree
5. **Monitor GitHub issue #15885** for official multi-loop support

**Ideal Workflow (Worktrees + Branches):**
```bash
# Setup: Create isolated worktrees
git worktree add ../project-frontend -b frontend-work
git worktree add ../project-backend -b backend-work

# Within each worktree, create experimental branches as needed
cd ../project-backend
git checkout -b feature-new-api  # Isolated experimentation

# Run Ralph loop in each worktree
claude /ralph-loop "Build feature"
```

### Quick Reference

| Scenario | Works? | Why? |
|----------|--------|------|
| Single terminal, single directory | ✅ Yes | Standard use case |
| Multiple terminals, same directory | ❌ No | Shared state file causes corruption |
| Multiple terminals, different directories | ✅ Yes | Separate state files |
| Git worktrees, one per terminal | ✅ Yes | Recommended approach |
| **Git worktrees + Git branches** | ✅✅ **IDEAL** | Maximum parallelism (see below) |

### Ideal: Combine Git Worktrees + Git Branches

For maximum parallelism and isolation, combine both approaches:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Main Repository                              │
│                    /my-project/                                  │
│                    master branch                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │ worktree-1/ │  │ worktree-2/ │  │ worktree-3/ │
    │             │  │             │  │             │
    │ .claude/    │  │ .claude/    │  │ .claude/    │
    │ ralph-loop  │  │ ralph-loop  │  │ ralph-loop  │
    │ .local.md   │  │ .local.md   │  │ .local.md   │
    │             │  │             │  │             │
    │ branch:     │  │ branch:     │  │ branch:     │
    │ frontend    │  │ backend     │  │ testing     │
    └─────────────┘  └─────────────┘  └─────────────┘
         │                 │                 │
         ▼                 ▼                 ▼
    Ralph Loop A      Ralph Loop B      Ralph Loop C
    (Frontend work)   (Backend work)    (Testing)
```

**Benefits of combining both:**

1. **Git Worktrees** → Separate `.claude/` directories (solves Ralph loop limitation)
2. **Git Branches** → Each worktree can have its own experimental branches
3. **Maximum Parallelism** → Each Ralph loop can iterate independently
4. **Easy Cleanup** → Delete worktree when done, no branch pollution

### What Problem Does Each Strategy Solve?

Look, different strokes for different folks. Here's what each approach actually gets you:

---

#### Git Worktrees = Multiple Agents, Zero Drama

**The vibe:** You want AI agents working on different parts of your codebase at the same time. Not taking turns. Not waiting. **Parallel.**

**What it solves:**

```
❌ WITHOUT: You start Ralph on frontend, then want to spin up backend agent...
   → Both agents fight over the same .claude/ralph-loop.local.md
   → Iteration counters clash
   → Chaos. Agent B overwrites Agent A's progress.
   → You lose work. Bad vibes.

✅ WITH WORKTREES:
   → ../project-frontend/.claude/ralph-loop.local.md (Agent A's state)
   → ../project-backend/.claude/ralph-loop.local.md (Agent B's state)
   → ../project-tests/.claude/ralph-loop.local.md (Agent C's state)
   → Everyone does their thing. Zero conflicts.
```

**Real talk:** You can't run multiple Ralph loops in one directory. Period. Worktrees give each agent their own room.

---

#### Git Branches = Fuck Around and Find Out (Safely)

**The vibe:** You want to try wild ideas without breaking your main code. Experiment. Iterate. If it sucks, ditch it.

**What it solves:**

```
❌ WITHOUT: Ralph starts refactoring your auth system...
   → 3 hours later it's a mess
   → You're not sure if it's better or worse
   → Main branch is now chaos
   → Stressful rollback. Bad vibes.

✅ WITH BRANCHES:
   → Ralph goes to town on "experiment-auth-v3"
   → You check it out later
   → It's brilliant? Merge it.
   → It's ass? Delete it. Main branch untouched.
   → Zero stress.
```

**Real talk:** Branches let your agent go down rabbit holes without nuking your working code.

---

#### Combining Both = Your Personal AI Team

**The vibe:** Imagine having 3 AI developers, each in their own room, each working on their own experiment, all at the same time. That's the combo.

```
Worktree + Branch = Isolated Experiment Space

┌─────────────────────────────────────────────────────────────┐
│  TERMINAL 1: Frontend Agent                                 │
│  Location: ../project-frontend (git worktree)               │
│  Branch: ui-redesign-v2                                     │
│  Task: "Make the dashboard look sick"                       │
│  Ralph iterates for 4 hours...                              │
│  Result: Either fire design or deleted branch. Safe either way. │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  TERMINAL 2: Backend Agent                                  │
│  Location: ../project-backend (git worktree)                │
│  Branch: api-rewrite-3x                                    │
│  Task: "Make the API 3x faster"                             │
│  Ralph iterates for 6 hours...                              │
│  Result: If it fails, frontend agent doesn't give a shit.   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  TERMINAL 3: Testing Agent                                  │
│  Location: ../project-tests (git worktree)                  │
│  Branch: test-coverage-push                                 │
│  Task: "Get coverage to 90%"                                │
│  Ralph iterates for 2 hours...                              │
│  Result: Validates everyone else's work independently.       │
└─────────────────────────────────────────────────────────────┘

Meanwhile, your main/branch is untouched. You're sleeping.
```

**What this actually gets you:**

| Want | Get |
|------|-----|
| "I want multiple AIs working at once" | Worktrees |
| "I want to try crazy ideas safely" | Branches |
| "I want both at the same time" | Worktrees + Branches |
| "I don't want to think about this too hard" | That's why you combine them |

**Concrete example:**

```bash
# Problem: Need to build frontend + backend + tests in parallel
# Each with experimental variations

# Worktree 1: Frontend (trying 2 different UI approaches)
git worktree add ../project-frontend -b frontend-work
cd ../project-frontend
git checkout -b ui-experiment-v1
# Ralph Loop A works on v1...

# Later: Try v2 in same worktree without affecting backend
git checkout -b ui-experiment-v2
# Ralph Loop A continues on v2...

# Worktree 2: Backend (trying new API design)
git worktree add ../project-backend -b backend-work
cd ../project-backend
# Ralph Loop B works completely independently

# Worktree 3: Testing (validating both frontend and backend)
git worktree add ../project-testing -b testing-work
cd ../project-testing
# Ralph Loop C validates integrated work
```

**Without combining both:**

```
❌ Multiple terminals, same directory
   → Agents fight over one state file
   → Corruption, lost work, bad vibes

❌ Single directory with branches
   → Only ONE Ralph loop at a time
   → Can't parallelize = wasted time

❌ Manual file copying
   → Error-prone mess
   → No Git history
   → Why are you doing this manually
```

**With both combined:**

```
✅ Multiple Ralph loops, actually running in parallel
✅ Each loop can go wild in its own branch
✅ One implodes? Others keep going
✅ Wake up to 3 completed experiments
✅ Keep the wins, trash the fails
✅ Git history stays clean
```

**The mindset shift:**

| Old way | New way |
|---------|---------|
| One agent at a time, serial execution | Multiple agents, parallel execution |
| Scared to let Ralph loose | Branches = safety net |
| "I'll try this idea tomorrow" | "All 3 ideas are running tonight" |
| Manual coordination | Git handles the isolation |

---

## The Full Hierarchy: Nodes → Projects → Worktrees → Branches

You're seeing the complete picture. This is a **4-layer isolation strategy**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LAYER 1: NODES (Machines)                          │
│                         Your compute infrastructure                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Laptop     │  │ Home Server  │  │ Hetzner VPS │  │   AWS GPU    │  │
│  │              │  │              │  │              │  │              │  │
│  │ 4 cores      │  │ 8 cores      │  │ 4 cores      │  │ 16 cores     │  │
│  │ Local dev    │  │ Always-on    │  │ Cheap cloud  │  │ Heavy AI     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                                              │
│  Each node = isolated machine, can run MULTIPLE PROJECTS                    │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                         LAYER 2: PROJECTS (Codebases)                       │
│                         Different repos on each node                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  On Laptop:                        On Home Server:                          │
│  ├── com.hetzner.codespaces      ├── personal-website                      │
│  ├── portfolio-v2                  ├── game-engine                           │
│  └── dotfiles                      └── home-automation                       │
│                                                                              │
│  Each project = different codebase, has MULTIPLE WORKTREES                │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                         LAYER 3: WORKTREES (Ralph Rooms)                    │
│                         Each Ralph gets a personal workspace                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Project: com.hetzner.codespaces                                            │
│  ├── codespaces-frontend/  ← Ralph A's personal room                       │
│  │   └── .claude/ralph-loop.local.md (unique to this worktree)             │
│  ├── codespaces-backend/   ← Ralph B's personal room                       │
│  │   └── .claude/ralph-loop.local.md (unique to this worktree)             │
│  └── codespaces-testing/   ← Ralph C's personal room                       │
│      └── .claude/ralph-loop.local.md (unique to this worktree)             │
│                                                                              │
│  Each worktree = isolated directory, has MULTIPLE BRANCHES                 │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                         LAYER 4: BRANCHES (Experiments)                      │
│                         Trashable rooms within each worktree                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Inside codespaces-frontend/ worktree:                                      │
│  ├── ui-redesign-v2          (Ralph A tries wild UI ideas)                 │
│  ├── dark-mode-experiment    (Ralph A fucks around with themes)            │
│  └── mobile-responsive       (Ralph A fixes mobile layout)                  │
│                                                                              │
│  Each branch = safe experimentation space                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### What Each Layer Solves

| Layer | Problem | Solution |
|-------|---------|----------|
| **Nodes** | "My laptop can only run 2-3 Ralph loops" | Distribute across all your machines |
| **Projects** | "I need agents working on different codebases" | Run different repos on different nodes |
| **Worktrees** | "Only ONE Ralph loop per directory" | Each Ralph gets own `.claude/ralph-loop.local.md` |
| **Branches** | "I want to try wild ideas safely" | Experiment fails? Delete branch |

### Real-World Multi-Node Setup

```bash
# ═══════════════════════════════════════════════════════════════════════════
# NODE 1: Your Laptop (Local development, 4 Ralph loops)
# ═══════════════════════════════════════════════════════════════════════════

cd ~/code/com.hetzner.codespaces

# Create worktrees for this project
git worktree add ../codespaces-frontend -b frontend-work
git worktree add ../codespaces-backend -b backend-work
git worktree add ../codespaces-testing -b testing-work

# Terminal 1-3: Each Ralph gets its own worktree
cd ../codespaces-frontend && claude /ralph-loop "Build React components"
cd ../codespaces-backend && claude /ralph-loop "Implement API"
cd ../codespaces-testing && claude /ralph-loop "Add tests"


# ═══════════════════════════════════════════════════════════════════════════
# NODE 2: Home Server (Always-on, 24/7 Ralph loops, 8 Ralph loops)
# ═══════════════════════════════════════════════════════════════════════════

ssh home-server

cd ~/code/personal-website

git worktree add ../website-blog -b blog-redesign
git worktree add ../website-shop -b shop-features
git worktree add ../website-mobile -b mobile-responsive

# These run 24/7 on your home server
cd ../website-blog && claude /ralph-loop "Redesign blog layout"
cd ../website-shop && claude /ralph-loop "Build checkout flow"
cd ../website-mobile && claude /ralph-loop "Fix mobile CSS"


# ═══════════════════════════════════════════════════════════════════════════
# NODE 3: Cloud VPS (Cheap background work, 4 Ralph loops)
# ═══════════════════════════════════════════════════════════════════════════

ssh hetzner-vps

cd ~/code/saas-app

git worktree add ../saas-docs -b documentation
git worktree add ../saas-tests -b test-coverage
git worktree add ../saas-refactor -b code-cleanup

# Run long-running tasks on cheap cloud compute
cd ../saas-docs && claude /ralph-loop "Write API docs"
cd ../saas-tests && claude /ralph-loop "Get coverage to 90%"
cd ../saas-refactor && claude /ralph-loop "Clean up technical debt"
```

### The Math: How Many Ralph Loops?

```
Your Distributed AI Network:

┌─────────────┬──────────┬─────────────┬────────────────────────────────┐
│ Node        │ Cores    │ Comfortable │ Use Case                      │
├─────────────┼──────────┼─────────────┼────────────────────────────────┤
│ Laptop      │ 4        │ ~4 loops    │ Active development, testing    │
│ Home Server │ 8        │ ~8 loops    │ 24/7 background work          │
│ Hetzner VPS │ 4        │ ~4 loops    │ Cheap long-running tasks      │
│ AWS GPU     │ 16       │ ~16 loops   │ Heavy AI/model training       │
├─────────────┼──────────┼─────────────┼────────────────────────────────┤
│ TOTAL       │ 32       │ ~32 loops   │ Your personal AI cluster      │
└─────────────┴──────────┴─────────────┴────────────────────────────────┘

Wake up to 32 completed experiments.
```

### This Is What Ariana Commercial Does

| Layer | Ariana ($4.99/mo) | Your DIY Version |
|-------|-------------------|------------------|
| **Nodes** | Spawns Hetzner VPS automatically | Use your existing machines |
| **Projects** | Each agent gets workspace | Git worktrees per project |
| **Worktrees** | Built-in isolation | Manual git worktree add |
| **Branches** | Canvas pattern | Git branches |
| **Cost** | $4.99/mo for 300 agents | Free (your hardware) |

### Why Bother With All These Layers?

| Single Layer | Full Hierarchy |
|--------------|----------------|
| "I can run 1 Ralph loop" | "I can run 32 Ralph loops across my fleet" |
| "Everything on my laptop" | "Distribute work across all my compute" |
| "One bad loop = crashed laptop" | "Isolation prevents cascade failures" |
| "Limited by local resources" | "Scale by adding more nodes" |

**Setup Commands:**

```bash
# Create worktrees for different concerns
git worktree add ../project-frontend -b frontend-work
git worktree add ../project-backend -b backend-work
git worktree add ../project-testing -b testing-work

# Each worktree can now have its own Ralph loop
# AND its own experimental branches

# Terminal 1: Frontend
cd ../project-frontend
claude /ralph-loop "Build React components"

# Terminal 2: Backend
cd ../project-backend
git checkout -b experimental-api  # Experimental branch within worktree!
claude /ralph-loop "Implement new API endpoints"

# Terminal 3: Testing
cd ../project-testing
claude /ralph-loop "Get tests to green"
```

**This approach mirrors Ariana's architecture:**

| Ariana Component | Git Worktrees + Branches Equivalent |
|------------------|-----------------------------------|
| Agent VPS isolation | Git worktree (separate `.claude/`) |
| Canvas Git branches | Git branches within each worktree |
| Copy Pool Manager | Worktree reuse + branch switching |

**When to use this combined approach:**
- Full-stack development (frontend + backend + testing in parallel)
- Multiple features being developed simultaneously
- Experimental work that shouldn't pollute main branches
- Team workflows where each developer needs isolated loops

---

**Document Last Updated:** 2026-01-14
**Total Sources:** 13 primary resources
**GitHub Issue Status:** Open (#15885)
