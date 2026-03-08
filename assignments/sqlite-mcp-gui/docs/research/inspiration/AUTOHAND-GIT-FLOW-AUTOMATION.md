# Autohand Git Flow Automation

Documentation source: https://autohand.ai/docs/guides/git-flow-automation

## Overview

Autohand solves the problem of applying changes across hundreds of files by creating isolated Git worktrees for each task, allowing multiple agents to work simultaneously without conflicts.

### The Problem

When migrating large codebases (e.g., 500 files from CommonJS to ESM), sequential execution becomes a bottleneck:
- File locks prevent concurrent modifications
- Partial failures leave inconsistent states
- No isolation between changes
- Difficult rollbacks

### The Solution: Git Worktrees

Each agent gets its own worktree (separate working directory) with its own branch, sharing the same Git history:

```
┌─────────────────────────────────────────────────────────────────┐
│                      Autohand Orchestrator                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐       ┌──────────┐   │
│  │ Agent 1  │  │ Agent 2  │  │ Agent 3  │  ...  │ Agent N  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘       └────┬─────┘   │
└───────┼─────────────┼─────────────┼─────────────────┼──────────┘
        │             │             │                 │
        ▼             ▼             ▼                 ▼
   ┌─────────┐   ┌─────────┐   ┌─────────┐       ┌─────────┐
   │Worktree │   │Worktree │   │Worktree │       │Worktree │
   │  001    │   │  002    │   │  003    │  ...  │   N     │
   │ branch: │   │ branch: │   │ branch: │       │ branch: │
   │ task-1  │   │ task-2  │   │ task-3  │       │ task-n  │
   └────┬────┘   └────┬────┘   └────┬────┘       └────┬────┘
        │             │             │                 │
        └─────────────┴──────┬──────┴─────────────────┘
                             ▼
                    ┌────────────────┐
                    │  Main Branch   │
                    │   (merge)      │
                    └────────────────┘
```

## Key Capabilities

| Capability | Description |
| --- | --- |
| Parallel execution | Run 100+ agents concurrently in isolated worktrees |
| Task dependencies | Define execution order when tasks depend on each other |
| Automatic branching | Each task gets its own feature branch |
| Per-task testing | Run tests in each worktree before merge |
| Conflict detection | Identify overlapping changes before merge |
| AI-assisted resolution | Automatically resolve conflicts using semantic understanding |
| Selective rollback | Discard individual tasks without affecting others |
| Resume from failure | Continue execution after fixing failed tasks |

## Architecture

### Orchestrator Components

1. **Task Queue** - Prioritized queue with dependency resolution
2. **Agent Pool** - Bounded by `max_concurrent` setting
3. **Worktree Manager** - Creates, tracks, and cleans up Git worktrees
4. **Merge Coordinator** - Handles conflicts and merging

### Task Lifecycle

```
PENDING ──▶ QUEUED ──▶ RUNNING ──▶ TESTING ──▶ COMPLETED
    │          │          │           │            │
    │          │          ▼           ▼            ▼
    │          │       FAILED     FAILED       MERGED
    │          │          │           │
    │          ▼          ▼           ▼
    └───────── BLOCKED (dependency not met)
               CANCELLED (user cancelled)
               SKIPPED (condition not met)
```

## Task Definition

### Basic Structure

```yaml
# tasks.yaml
version: "1.0"
name: ESM Migration
description: Migrate CommonJS modules to ES Modules

defaults:
  model: claude-sonnet
  timeout: 5m
  retries: 2

tasks:
  - id: migrate-utils
    description: Migrate utility modules
    files:
      - src/utils/**/*.js
    prompt: |
      Convert this CommonJS module to ES Module syntax.
      Replace require() with import statements.
      Replace module.exports with export statements.
```

### Task Options

| Option | Type | Description |
| --- | --- | --- |
| `id` | string | Unique identifier for the task |
| `description` | string | Human-readable description for logs and PRs |
| `files` | array | Glob patterns for files to process |
| `prompt` | string | Instructions for the AI agent |
| `depends_on` | array | Task IDs that must complete first |
| `priority` | number | Execution priority (higher runs first) |
| `condition` | string | Shell command that must exit 0 to run task |
| `timeout` | duration | Maximum execution time per task |
| `retries` | number | Retry count on failure |
| `test` | object | Test configuration for validation |

### Task Dependencies

```yaml
tasks:
  - id: update-types
    description: Update TypeScript type definitions
    files: ["src/types/**/*.ts"]
    prompt: Update type definitions for new API schema
    priority: 100  # Run first

  - id: update-api-client
    description: Update API client implementation
    files: ["src/api/**/*.ts"]
    prompt: Update API client to match new types
    depends_on: [update-types]  # Wait for types

  - id: update-components
    description: Update React components
    files: ["src/components/**/*.tsx"]
    prompt: Update components to use new API client
    depends_on: [update-api-client]
```

### Conditional Execution

```yaml
tasks:
  - id: update-legacy-module
    description: Update legacy authentication
    files: ["src/legacy/**/*.js"]
    prompt: Migrate legacy auth to new system
    condition: "test -d src/legacy"  # Only if directory exists

  - id: generate-openapi
    description: Regenerate OpenAPI client
    files: ["src/api/generated/**/*"]
    prompt: Regenerate API client from schema
    condition: "git diff --name-only HEAD~1 | grep -q openapi.yaml"
```

### Per-Task Testing

```yaml
tasks:
  - id: refactor-auth
    files: ["src/auth/**/*.ts"]
    prompt: Refactor authentication module
    test:
      commands:
        - npm run typecheck
        - npm test -- --testPathPattern=auth
      required: true
      timeout: 5m
      retry_on_flaky: true
      coverage:
        enabled: true
        min_percent: 80
        fail_on_decrease: true
```

## Configuration

### Resource Management

```yaml
# .autohand/config.yaml
orchestrator:
  max_concurrent: 50

  agent:
    memory_limit: 2GB
    cpu_limit: 2

  api:
    requests_per_minute: 100
    retry_on_rate_limit: true
    retry_delay: 60s

  disk:
    min_free_space: 10GB
    cleanup_threshold: 5GB
    worktree_size_limit: 1GB
```

**Disk space planning:** Each worktree is a full copy of your working directory. For a 500MB codebase with 100 concurrent tasks, plan for 50GB+ of disk space.

## Commands

| Command | Description |
| --- | --- |
| `autohand parallel run` | Execute tasks from YAML file |
| `autohand parallel status` | View execution status and progress |
| `autohand parallel logs` | Stream logs from task |
| `autohand parallel pause` | Pause execution |
| `autohand parallel resume` | Resume paused execution |
| `autohand parallel cancel` | Cancel running tasks |
| `autohand parallel retry` | Retry failed tasks |
| `autohand parallel conflicts` | Analyze potential conflicts |
| `autohand parallel resolve` | Resolve conflicts |
| `autohand parallel merge` | Merge completed tasks |
| `autohand parallel cleanup` | Remove worktrees and branches |
| `autohand parallel rollback` | Rollback changes |
| `autohand parallel metrics` | View execution metrics |

### Running Tasks

```bash
# Execute all tasks
autohand parallel run --tasks tasks.yaml

# Limit concurrency
autohand parallel run --tasks tasks.yaml --concurrency 20

# Dry run
autohand parallel run --tasks tasks.yaml --dry-run
```

### Monitoring

```bash
# Real-time status
autohand parallel status --watch

# View logs for specific task
autohand parallel logs migrate-utils-023

# Follow logs
autohand parallel logs migrate-utils-023 --follow
```

## Pause, Resume, and Continue

### Execution Control

```bash
# Pause execution (finishes running tasks, won't start new ones)
autohand parallel pause

# Resume execution
autohand parallel resume

# Cancel all running tasks
autohand parallel cancel --all

# Cancel specific task
autohand parallel cancel migrate-legacy-auth
```

### Retry Failed Tasks

```bash
# Retry all failed tasks
autohand parallel retry --failed

# Retry specific task
autohand parallel retry migrate-legacy-auth

# Retry with increased timeout
autohand parallel retry migrate-legacy-auth --timeout 10m
```

### Resume from Failure

When tasks fail, you can fix the underlying issue and continue:

```bash
# 1. Check what failed
autohand parallel status

# 2. View failure logs
autohand parallel logs migrate-legacy-auth --follow

# 3. Fix the issue (manual intervention)
# - Update the task definition
# - Fix the code
# - Resolve dependencies

# 4. Resume execution
autohand parallel resume
```

### Execution Modes

Configure how the orchestrator handles failures:

```yaml
# .autohand/config.yaml
execution:
  # How to handle task failures
  on_failure: continue    # continue, pause, or abort

  # Whether to run tests automatically
  auto_test: true

  # Notification settings
  notify:
    on_complete: true
    on_failure: true
    channels:
      - slack:#dev-automation
```

### Incremental Execution with Checkpoints

Save progress periodically and resume from checkpoints:

```bash
# Save checkpoint periodically
autohand parallel run --tasks tasks.yaml --checkpoint-interval 5m

# Resume from last checkpoint
autohand parallel resume --from-checkpoint

# Resume from specific checkpoint
autohand parallel resume --checkpoint abc123-checkpoint-5

# List available checkpoints
autohand parallel checkpoints --list

# Create manual checkpoint
autohand parallel checkpoint create --name "before-risky-changes"
```

### Session Management

```bash
# List all sessions
autohand parallel sessions

# Show session details
autohand parallel sessions --show abc123

# Attach to running session
autohand parallel attach --session abc123

# Continue from previous session
autohand parallel continue --session abc123
```

### Progress Persistence

Execution state is automatically persisted:

```yaml
# .autohand/config.yaml
persistence:
  # Where to store execution state
  state_file: .autohand/state.json

  # Auto-save interval
  save_interval: 30s

  # What to persist
  include:
    - task_status
    - worktree_locations
    - completed_tasks
    - failed_tasks
    - metrics

  # Recovery behavior
  on_crash:
    auto_resume: false      # Require manual confirmation
    save_crash_dump: true
    notify: true
```

## Conflict Resolution

### Conflict Detection

```bash
autohand parallel conflicts --analyze
```

### Prevention Strategies

```yaml
# .autohand/config.yaml
conflicts:
  prevention:
    auto_split: true
    file_locking: true
    optimize_merge_order: true
    protected_paths:
      - package.json
      - package-lock.json
      - yarn.lock
      - .env*
```

### Resolution Strategies

```bash
# Automatic resolution using AI
autohand parallel resolve --auto

# Interactive resolution
autohand parallel resolve --interactive

# Apply specific strategy
autohand parallel resolve --strategy ours
autohand parallel resolve --strategy theirs
autohand parallel resolve --strategy union
```

## Merging to Main

### Merge Strategies

| Strategy | Use case | Commit history |
| --- | --- | --- |
| `sequential` | When order matters | One merge commit per task |
| `batch` | Fast merge of non-conflicting changes | Single merge commit |
| `squash` | Clean history | One commit per task |
| `rebase` | Linear history | Rebased commits |
| `pr` | Code review required | Creates pull requests |

### Merge Commands

```bash
# Merge all completed tasks
autohand parallel merge --to main

# Preview merge
autohand parallel merge --to main --dry-run

# Create PRs
autohand parallel merge --strategy pr --draft

# Merge, push, and cleanup
autohand parallel merge --to main --push --cleanup
```

## Safety and Guardrails

### Protected Paths

```yaml
# .autohand/config.yaml
safety:
  protected_paths:
    readonly:
      - .github/workflows/*
      - .env*
      - secrets/*
    require_approval:
      - package.json
      - tsconfig.json
    flag_for_review:
      - src/core/*
      - src/auth/*
```

### Change Limits

```yaml
safety:
  limits:
    max_files_per_task: 50
    max_lines_changed: 1000
    max_files_deleted: 5
    max_total_files: 500
    on_limit_exceeded: abort
```

### Approval Gates

```yaml
safety:
  approval:
    require_before_merge: true
    methods:
      - slack_reaction
      - github_review
      - cli_confirm
    auto_approve:
      enabled: true
      conditions:
        - "files_changed < 10"
        - "no_protected_paths"
        - "all_tests_pass"
```

### Rollback

```bash
# Rollback specific task
autohand parallel rollback task-001

# Rollback merged changes
autohand parallel rollback --merged --session abc123

# Rollback with PR
autohand parallel rollback --merged --pr
```

## Advanced Patterns

### Monorepo Support

```yaml
# tasks.yaml
packages:
  - name: web
    path: packages/web
    test: npm test
  - name: api
    path: packages/api
    test: npm test

tasks:
  - id: update-shared-types
    package: shared
    files: ["src/**/*.ts"]
    prompt: Update shared type definitions

  - id: update-web-client
    package: web
    files: ["src/**/*.tsx"]
    prompt: Update web client
    depends_on: [update-shared-types]
```

### Cross-Repository Execution

```yaml
repositories:
  - name: frontend
    url: [email protected]:company/frontend.git
    branch: main
  - name: backend
    url: [email protected]:company/backend.git
    branch: main

tasks:
  - id: update-api-schema
    repository: backend
    files: ["src/api/schema.ts"]
    prompt: Update API schema

  - id: regenerate-client
    repository: frontend
    files: ["src/api/generated/*"]
    prompt: Regenerate API client
    depends_on: [update-api-schema]
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/parallel-migration.yml
name: Parallel Migration

on:
  workflow_dispatch:
    inputs:
      tasks_file:
        default: 'tasks.yaml'
      concurrency:
        default: '20'

jobs:
  execute:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Install Autohand
        run: npm install -g @autohand/cli

      - name: Run parallel tasks
        env:
          AUTOHAND_API_KEY: ${{ secrets.AUTOHAND_API_KEY }}
        run: |
          autohand parallel run \
            --tasks ${{ inputs.tasks_file }} \
            --concurrency ${{ inputs.concurrency }}

      - name: Create pull requests
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          autohand parallel merge --strategy pr --draft
```

## Troubleshooting

| Issue | Cause | Solution |
| --- | --- | --- |
| Worktree creation fails | Insufficient disk space | Free up disk or reduce concurrency |
| Tasks timeout frequently | Complex files or slow API | Increase timeout or reduce file scope |
| Many conflicts detected | Overlapping file patterns | Split tasks to reduce overlap |
| Tests fail in worktree | Missing dependencies | Add setup step to install deps |
| API rate limited | Too many concurrent requests | Reduce concurrency or add delay |

### Debug Mode

```bash
# Enable verbose logging
autohand parallel run --tasks tasks.yaml --debug

# Trace specific task
autohand parallel run --tasks tasks.yaml --trace task-001

# Inspect worktree state
autohand parallel inspect task-001
```

### Recovery Procedures

```bash
# If execution is stuck
autohand parallel status --diagnostics
autohand parallel cancel --force

# If worktrees are corrupted
autohand parallel cleanup --force --all
git worktree prune

# Reset to clean state
autohand parallel reset --hard
```
