# Claude Code Remake

A reimplementation of Claude Code CLI in TypeScript + Rust.

## Project Overview

This is a from-scratch rebuild of the Claude Code CLI tool, designed to be:
- **Transparent**: All code is readable TypeScript/Rust
- **Modular**: Clean separation between components
- **Extensible**: MCP-first architecture for tool integration

## Architecture

```
src/
├── cli.ts              # Main entry point, REPL loop
├── index.ts            # Library exports
├── core/
│   ├── api-client.ts       # Anthropic API interface
│   ├── api-client-impl.ts  # Streaming implementation
│   ├── agent-loop.ts       # Agentic loop (think → act → observe)
│   ├── checkpoints.ts      # Save/restore conversation + files
│   ├── claude-md.ts        # Project instructions loader
│   ├── context-compaction.ts # Context window management
│   ├── git-status.ts       # Git state detection
│   ├── permissions.ts      # Permission modes (default, acceptEdits, bypass)
│   ├── retry.ts            # Exponential backoff for API
│   ├── session-store.ts    # Session persistence (JSONL)
│   └── system-reminders.ts # Dynamic context injection
├── mcp/
│   └── client.ts           # MCP client (stdio, HTTP, SSE, WS)
├── tools/
│   └── index.ts            # Built-in tools (Read, Edit, Write, Bash, etc.)
├── hooks/
│   └── index.ts            # Hook system (PreToolUse, PostToolUse, etc.)
├── skills/
│   └── index.ts            # Skills system
├── teammates/
│   └── index.ts            # Multi-agent coordination
├── types/
│   └── index.ts            # All TypeScript interfaces
└── native/
    └── index.ts            # Rust FFI bindings

rust/src/
├── lib.rs              # NAPI exports
├── search.rs           # Ripgrep-based file search
├── tokens.rs           # Token counting
├── diff.rs             # Diff calculation
└── compact.rs          # Content compaction
```

## Key Systems

### 1. MCP Integration
- Transports: stdio, HTTP, SSE, WebSocket
- Tool naming: `mcp__<server>__<tool_name>`
- Config: `~/.claude.json` or `--mcp-config`

### 2. Checkpoint System
- Captures: chat messages + file snapshots + git state
- Navigation: `/undo`, `/redo`, `/cps-status`
- Storage: `~/.claude/checkpoints/<session>.json`

### 3. CLAUDE.md Loading
- Global: `~/.claude/CLAUDE.md`
- Project: `.claude/CLAUDE.md` (preferred) or `./CLAUDE.md`
- Merged into system prompt

### 4. Config Loading
Files loaded at startup:
- `~/.claude.json` - Main config (MCP servers, project settings)
- `~/.claude/settings.json` - Hooks, permissions
- `~/.claude/keybindings.json` - Keybindings
- `.claude/settings.json` - Project-level overrides (if exists)

Config merging:
- Settings: project-level overrides global
- MCP servers: global + project-specific
- Hooks: loaded from settings, registered with HookManager

### 4. Permission Modes
- `default` - Prompts for dangerous operations
- `acceptEdits` - Auto-accept file edits
- `bypassPermissions` - No prompts (dangerous!)
- `plan` - Planning mode
- `dontAsk` - Deny if not pre-approved

## Commands

```bash
# Development
bun run dev          # Watch mode
bun run cli          # Run CLI directly
bun run build        # Build TS + Rust

# Build steps
bun run build:ts     # Bun bundle
bun run build:native # Cargo release

# Testing
bun test
```

## CLI Usage

```bash
# Start interactive
bun run src/cli.ts

# Single query
bun run src/cli.ts -q "read package.json"

# With options
bun run src/cli.ts \
  --model claude-sonnet-4-6 \
  --permission-mode acceptEdits \
  --max-tokens 8192

# Resume session
bun run src/cli.ts --resume <session-id>

# List sessions
bun run src/cli.ts --sessions
```

## REPL Commands

```
/help                  Show commands
/status                Show session info
/cost                  Show usage/cost
/checkpoint <label>    Save checkpoint
/checkpoints           List checkpoints
/restore <id>          Restore checkpoint (asks about files)
/restore-chat <id>     Restore chat only
/undo                  Go back
/redo                  Go forward
/cps-status            Navigation status
/clear                 Clear screen
/exit                  Exit
```

## Coding Conventions

### TypeScript
- Use ESM imports with `.js` extension: `import { x } from "./module.js"`
- Async/await over raw promises
- Zod for runtime validation
- Prefer `Bun.file()` over `fs` module

### Rust (Native Module)
- NAPI-RS for Node bindings
- Performance-critical only: search, tokens, diff
- Keep FFI interface simple

### File Structure
- One concept per file
- Types in `types/index.ts`
- Handlers near their definitions

## API Key

Set via environment:
```bash
export ANTHROPIC_API_KEY="sk-..."
```

Or use Doppler:
```bash
doppler run -- bun run src/cli.ts
```

## Models

| Model | Use Case |
|-------|----------|
| claude-opus-4-6 | Complex reasoning |
| claude-sonnet-4-6 | Default, balanced |
| claude-haiku-4-5 | Fast, simple tasks |

## Cost Tracking

Pricing per million tokens:
- Opus: $15 input / $75 output
- Sonnet: $3 input / $15 output
- Haiku: $0.80 input / $4 output

Cache pricing:
- Write: 1.25x input
- Read: 0.10x input

## Important Notes

- This is a **reimplementation** - not affiliated with Anthropic
- Types based on binary analysis of Claude Code v2.1.50
- MCP tools are prefixed with `mcp__` to avoid collisions
- Checkpoints include file snapshots for full restore capability
