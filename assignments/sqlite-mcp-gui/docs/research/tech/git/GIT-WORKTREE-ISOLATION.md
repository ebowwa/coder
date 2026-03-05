# Git Worktree Isolation

**Each agent works in an isolated workspace. Experiment freely without risking your main branch.**

---

## Table of Contents

1. [The Core Concept: One Database, Many Views](#the-core-concept-one-database-many-views)
2. [Architectural Isolation: Under the Hood](#architectural-isolation-under-the-hood)
3. [Dimensions of Isolation](#dimensions-of-isolation)
4. [The Shared Elements](#the-shared-elements-the-glue)
5. [Practical Workflow: The "Agent" Use Case](#practical-workflow-the-agent-use-case)
6. [Critical Safety Features & Pitfalls](#critical-safety-features--pitfalls)
7. [Summary of Isolation](#summary-of-isolation)
8. [TL;DR](#tldr-one-repository-multiple-isolated-workspaces)
9. [Worktrees vs. VPS Nodes](#worktrees-vs-vps-nodes)

---

## The Core Concept: One Database, Many Views

The `git worktree` command allows you to have multiple working trees attached to a single repository. This creates "siloed" environments where you can work on different branches simultaneously, perform long-running experiments, or run tests—all without stashing, committing, or risking the stability of your main development workspace.

### Standard Git (Single Workspace)

```
┌─────────────────────────────────┐
│  1 Repository folder            │
│  ├─ .git (database)             │
│  └─ Your working files          │
│                                 │
│  1 HEAD (one branch at a time)  │
└─────────────────────────────────┘
```

**The Problem:** If you are working on `feature-A` and need to urgently fix `main`, you must:
- `git stash` your changes
- `git checkout main`
- Fix and commit the bug
- `git checkout feature-A`
- `git stash pop`

This is error-prone and clutters your history with temporary "WIP" commits.

### Git Worktree (Multi-Workspace)

```
┌──────────────────────────────────────────────────────────┐
│  1 Repository folder (Main)                               │
│  ├─ .git (database) ─────────────────────────────┐       │
│  └─ Your working files (branch: main)            │       │
│                                                   │       │
│  N Working Directories (linked siblings)          │       │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │       │
│  │ worktree-A  │  │ worktree-B  │  │ worktree-C│ │◄─────┘
│  │ (feature-A) │  │ (experiment)│  │ (hotfix)  │ │
│  │ .git file   │  │ .git file   │  │ .git file│ │
│  └─────────────┘  └─────────────┘  └───────────┘ │
│                                                   │
│  All share the same .git database (objects,      │
│  refs, config) but have isolated working files   │
└───────────────────────────────────────────────────┘
```

**The Result:** Each sibling directory looks like a full repo, but they all share the same underlying database (`.git`).

---

## Architectural Isolation: Under the Hood

The "extreme" isolation comes from how Git manages the filesystem and the `.git` directory structure.

### The `.git` File vs. Directory

**In a standard repo:** You have a `.git` folder.

**In a linked worktree:** You have a `.git` text file.

If you inspect a file inside a worktree, it looks like this:

```text
gitdir: /path/to/main/repository/.git/worktrees/feature-x
```

This tiny file is the "anchor." It tells Git: "My database isn't here; it's over in the main repo, specifically inside the `worktrees` metadata folder."

### The `.git/worktrees/` Directory

Inside your main repository's `.git` folder, a new directory appears: `worktrees/`.

For every worktree you create, a subdirectory is created here. If you create a worktree named `experiment`, the structure looks like this:

```
/main-repo/.git/worktrees/experiment/
├── commondir          # Points to /main-repo/.git
├── gitdir             # Points to /main-repo/.git/worktrees/experiment
├── HEAD               # The active branch for THIS worktree only
├── index              # The Staging Area for THIS worktree only
├── locked             # Optional lock file
└── logs/
    ├── HEAD
    └── refs/
        └── heads/
            └── experiment
```

**This is the source of the isolation:**

- **Isolated HEAD:** The `HEAD` file in this folder allows the worktree to be on branch `experiment` while the main repo is on branch `main`.
- **Isolated index (Staging Area):** This is critical. The `index` file stores what is about to be committed. Because the worktree has its own index file inside `.git/worktrees/experiment/`, running `git add` in the worktree does not affect the staging area of the main repo or any other worktree.
- **Shared commondir:** This points to the main `.git` folder. This ensures that when you actually commit, the objects (blobs, trees, commits) are written to the shared database.

---

## Dimensions of Isolation

When an agent (human or AI) works in a worktree, they are isolated in **four specific dimensions**:

### A. Filesystem Isolation (The Sandbox)

The files in a worktree are physical copies on your disk (using hardlinks where possible to save space, but logically distinct).

**Scenario:** You have `main.c` in the Main Worktree. You create a Worktree for `refactor`. Both contain `main.c`.

**Action:** You delete `main.c` in `refactor`.

**Result:** The `main.c` in the Main Worktree remains untouched. There is **zero risk** of accidental file deletion or overwriting in your main workspace.

### B. Branch/Checkout Isolation

You can have the exact same branch checked out in multiple worktrees ONLY IF you accept that commits might move the branch pointer. However, Git typically enforces branch uniqueness across worktrees to prevent confusion.

**Standard Mode:**
- Worktree A is on `main`
- Worktree B is on `feature-1`

**Isolation:** If you run `git status` in Worktree A, it reports "On branch main". In Worktree B, it reports "On branch feature-1". They are completely separate contexts.

### C. Staging Area (Index) Isolation

This is the most powerful aspect for experimentation.

**Scenario:** You are debugging in Worktree B. You run `git add .` to stage a potential fix.

**Isolation:** You switch to Worktree A (Main) to check an email. You run `git status`.

**Result:** Worktree A shows a clean working directory. The staged changes in Worktree B are invisible to Worktree A. You do not need to stash or commit to switch contexts.

### D. Build Artifact Isolation (Implicit)

Since the working directories are different folders on your disk, your build tools (`node_modules`, `target/`, `bin/`, `.vscode/`) are physically separated.

**Benefit:** You can run a production build in the Main Worktree and a debug build in the Experiment Worktree simultaneously without them overwriting each other's temporary files or locking resources.

---

## The Shared Elements (The "Glue")

To maintain sanity, not everything is isolated. Some things must be shared, or else you would essentially have two unrelated repos.

| Shared Element | Description |
|----------------|-------------|
| **Object Database** (`.git/objects`) | All commits, file contents, and trees are shared. This is efficient. If `main` and `feature` share 99% of the same code, they don't duplicate the storage on disk. |
| **Refs** (Branches) | If you create a new commit in the feature worktree, the branch pointer moves. You will see this new branch in the main worktree (though you won't see the file changes until you checkout that branch). |
| **Configuration** (`.git/config`) | Remotes, user details, and aliases are shared. |

---

## Practical Workflow: The "Agent" Use Case

Here is how you utilize this isolation to "Experiment freely without risking your main branch."

### Step 1: The Setup

You are in your main project folder: `/project-main`. You are on branch `main`. You need to test a dangerous script.

```bash
git worktree add ../project-sandbox experiment-1
```

**What happened?**
- Git created a folder `../project-sandbox`
- It checked out the branch `experiment-1` (creating it if it didn't exist)
- It is linked to your main repo

### Step 2: The Experiment

You `cd ../project-sandbox`. You run a script that reformats all your code and deletes 50 files. You realize the script was bad.

```bash
git reset --hard HEAD
```

**Isolation Proof:** All files are restored. You go back to `/project-main`. Your files there were never touched. You never risked the main branch.

### Step 3: Simultaneous Context Switching

You are waiting for a 2-hour build to finish in `/project-sandbox`.

You `cd` back to `/project-main` and continue coding on a different feature.

You do not have to wait for the first process to finish, nor do you have to stash your changes.

### Step 4: Clean Up

Once the experiment is done:

```bash
cd ..
git worktree remove project-sandbox
```

This deletes the folder and updates the internal metadata. The history of the `experiment-1` branch remains in the `.git` database, but the workspace is gone.

---

## Critical Safety Features & Pitfalls

Git enforces strict rules to prevent data loss in this multi-worktree environment.

### The "Checked Out Elsewhere" Lock

This is the ultimate safety mechanism for your main branch.

**Scenario:** You are on branch `main` in Worktree A. You go to Worktree B and try `git checkout main`.

**Git's Response:**
```
fatal: 'main' is already checked out at '/path/to/worktree-a'
```

**Why:** Git prevents you from checking out the same branch in two places. If you could, committing in Worktree A would move the HEAD, and Worktree B would become out of sync immediately, leading to potential file corruption or confused states.

**Exception:** You can force a checkout of a commit (detached HEAD) in multiple places, but not a branch name.

### Shared Stash Confusion

**Warning:** While branches are isolated, the Stash is not perfectly isolated in older versions of Git.

- The stash is a ref (`refs/stash`). It is global to the repository.
- If you `git stash` in Worktree A, you might see that stash appear in Worktree B.
- This can lead to applying a stash meant for one context onto another. (Always name your stashes or check the list carefully).

### Hooks Behavior

Git hooks live in `.git/hooks/`. Since the `.git` folder is shared, **hooks are shared**.

If you have a `pre-commit` hook that runs linting, it will run for commits in every worktree. This is usually desired behavior but worth noting.

---

## Summary of Isolation

| Feature | Isolation Level | Explanation |
|---------|----------------|-------------|
| **Working Files** | Total | Deleting/modifying files in Worktree A has zero effect on Worktree B. |
| **Staging Area (Index)** | Total | `git add` in Worktree A does not stage files in Worktree B. |
| **HEAD (Current Branch)** | Protected | Two worktrees cannot be on the same branch simultaneously. |
| **Configuration** | Shared | User names, remotes, and aliases are global. |
| **History (Objects)** | Shared | Commits created in A are immediately visible in B (via fetch/log). |
| **Build Artifacts** | Total | `node_modules` or `target` folders are physically separated. |

---

## TL;DR: One Repository, Multiple Isolated Workspaces

**What it is:** `git worktree` creates separate "sibling" folders linked to your main repo. They share the same history (`.git` database) but have different working files.

**What is Isolated:**
- **Filesystem:** You can delete or mess up files in the worktree folder, and your main folder remains 100% untouched.
- **Staging Area:** Running `git add` in one folder does not affect the other.

**What is Shared:**
- Commit history and configuration (remotes, user info).

**Key Safety:** You cannot have the same branch checked out in two folders simultaneously.

**The Benefit:** Work on a "hotfix" in one folder while an experimental build runs in another, without ever needing `git stash` or `git commit` on your main branch.

---

## Worktrees vs. VPS Nodes

Git worktree and VPS nodes solve two different types of isolation problems.

**Think of it like this:** Git Worktree isolates your **Logic**; VPS nodes isolate your **Physics**.

### Why You Still Need VPS Nodes

#### 1. Resource Contention (The "CPU/RAM" Problem)

**Git Worktree:** All your worktrees live on the same physical machine (your laptop).
- **The Limit:** If you start a heavy database migration, a massive build, or a machine learning training job in Worktree A, your CPU and RAM spike.
- **The Consequence:** Worktree B (where you are trying to code) will lag, your browser will choke, and your fan will sound like a jet engine.

**VPS Nodes:**
- **The Solution:** If you run that heavy job on VPS Node A, your local machine (and Worktree B) remains unaffected. You get dedicated resources.

#### 2. Operating System & Environment Isolation

**Git Worktree:** Shares the OS.
- **The Limit:** If your main OS is macOS, but you need to test on Ubuntu. Or if Worktree A requires Python 3.11 and Worktree B requires Python 3.8 (and they conflict at the system level).
- **The Consequence:** You can install different versions using tools like `pyenv` or `nvm`, but sometimes system-level libraries or kernel features matter.

**VPS Nodes:**
- **The Solution:** You can spin up an Ubuntu VPS, a Debian VPS, and a CentOS VPS. They are completely isolated environments down to the kernel.

#### 3. Network & IP Isolation

**Git Worktree:** Shares the IP address.
- **The Limit:** If you are working on a feature that interacts with an external API that has rate limits based on IP, or if you need to simulate two different servers talking to each other (e.g., a web server and a worker node) on different IPs.

**VPS Nodes:**
- **The Solution:** Each VPS has its own public IP. You can truly simulate distributed systems, test firewall rules, or bypass rate limits imposed on your home IP.

#### 4. The "Nuclear" Safety Option

**Git Worktree:** While isolated from a Git perspective, it is still on your local drive.
- **The Risk:** If you are running a script that accidentally tries to format the disk, or if you accidentally type `rm -rf /` (and your sudo privileges are active), you might brick your main OS.

**VPS Nodes:**
- **The Solution:** VPSs are disposable. If a test goes catastrophically wrong and destroys the OS, you just click "Destroy/Rebuild" in your hosting panel and have a fresh one in 30 seconds. No risk to your personal laptop.

### The Ideal Workflow: Hybrid

The best setup is often combining both:

**Local (Git Worktree):**
- You use worktrees on your laptop for coding
- You write the logic, fix the UI, and write unit tests here
- You can switch tasks instantly without stashing

**Remote (VPS):**
- When you are ready to run the integration test, the heavy build, or the long-running process
- You push that specific branch to the remote and let the VPS handle the grunt work

### Summary

| Use Case | Recommended Tool |
|----------|------------------|
| Too many code changes in progress at once | Git Worktree |
| Too much computing load or conflicting environments | VPS Nodes |

---

## Conclusion

Git Worktree isolation allows you to treat your repository like a multi-headed organism. By decoupling the **Working Directory** and the **Index** from the **Shared Database**, you provide agents (or yourself) with a "sandbox" where the cost of failure is zero. You can destroy files, mess up the index, and abandon branches without ever needing to run `git stash` or `git reset --hard` on your primary, stable workspace.

When combined with VPS nodes for resource-intensive or environment-specific tasks, you have a comprehensive isolation strategy that covers both logical and physical separation—enabling true parallel development without compromise.
