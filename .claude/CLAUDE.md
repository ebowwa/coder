# Coder

An AI-powered terminal coding assistant built with TypeScript + Rust.

## Project Overview

Coder is designed to be:
- **Transparent**: All code is readable TypeScript/Rust
- **Modular**: Clean separation between components
- **Extensible**: MCP-first architecture for tool integration

## Architecture

```
packages/
├── src/                            # TypeScript source code
│   ├── index.ts                    # Library exports
│   │
│   ├── core/                       # Core systems
│   │   ├── api-client.ts           # LLM API interface
│   │   ├── api-client-impl.ts      # Streaming implementation
│   │   ├── agent-loop/             # Agentic loop (modular)
│   │   │   ├── index.ts            # Main entry
│   │   │   ├── types.ts            # Loop types
│   │   │   ├── loop-state.ts       # State management
│   │   │   ├── turn-executor.ts    # Single turn execution
│   │   │   ├── tool-executor.ts    # Tool execution with hooks
│   │   │   ├── compaction.ts       # Context compaction
│   │   │   ├── message-builder.ts  # API message construction
│   │   │   └── formatters.ts       # Display utilities
│   │   ├── checkpoints.ts          # Save/restore conversation + files
│   │   ├── claude-md.ts            # Project instructions loader
│   │   ├── config-loader.ts        # Config file loading
│   │   ├── context-compaction.ts   # Context window management
│   │   ├── git-status.ts           # Git state detection
│   │   ├── models.ts               # Model aliases/pricing
│   │   ├── permissions.ts          # Permission modes
│   │   ├── retry.ts                # Exponential backoff for API
│   │   ├── session-store.ts        # Session persistence (JSONL)
│   │   ├── sessions/               # Session management (modular)
│   │   ├── stream-highlighter.ts   # Output highlighting
│   │   ├── system-reminders.ts     # Dynamic context injection
│   │   └── cognitive-security/     # Security middleware
│   │
│   ├── ecosystem/                  # Extension systems
│   │   ├── tools/index.ts          # Built-in tools
│   │   ├── hooks/index.ts          # Hook system
│   │   └── skills/index.ts         # Skills system
│   │
│   ├── interfaces/                 # Interface layers
│   │   ├── mcp/client.ts           # MCP client (stdio, HTTP, SSE, WS)
│   │   └── ui/                     # UI components
│   │       ├── index.ts            # UI exports
│   │       ├── spinner.ts          # Loading indicators
│   │       └── terminal/           # Terminal interfaces
│   │           ├── cli/            # CLI entry point
│   │           ├── shared/         # Shared terminal utils
│   │           └── tui/            # TUI components
│   │
│   ├── native/index.ts             # Native module loader + fallbacks
│   ├── teammates/index.ts          # Multi-agent coordination
│   └── types/index.ts              # All TypeScript interfaces
│
└── rust/                           # Rust native module source
    └── src/
        ├── lib.rs                  # NAPI exports
        ├── grep.rs                 # Native ripgrep
        ├── hash.rs                 # xxHash3/SHA-256
        ├── highlight.rs            # Syntax highlighting
        ├── diff.rs                 # Diff calculation
        ├── multi_edit.rs           # Atomic multi-file editing
        ├── patterns.rs             # Tool pattern analysis
        ├── structure.rs            # Tree-sitter parsing
        ├── tool_pairs.rs           # Tool pair analysis
        ├── tool_use.rs             # Tool use counting
        ├── input.rs                # Terminal input handling
        ├── tui.rs                  # Native TUI rendering
        └── cognitive_security/     # Security modules
            ├── mod.rs
            ├── action/             # Action classification
            ├── intent/             # Intent signing/verification
            └── flow/               # Data flow tracking

native/                             # Compiled Rust binaries (committed)
├── index.d.ts                      # TypeScript declarations
├── index.js                        # JS loader wrapper
└── index.{platform}.{arch}.node    # Platform-specific binaries

dist/                       # Bundled JS output (published to npm)
├── cli.js                  # Entry point for `coder` bin
└── index.js                # Library exports

tests/                      # Test files
assignments/                # Side projects (not main product)
directives/                 # Intent directive examples
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

### 5. Permission Modes
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
# Development (watch mode)
bun run dev

# Using Coder (after build/install)
doppler run -- coder                    # Interactive mode
doppler run -- coder -q "read package.json"
doppler run -- coder --model glm-5 -q "list files"
doppler run -- coder --resume <session-id>
doppler run -- coder --sessions
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
export API_KEY="your-key-here"
```

Or use Doppler (recommended):
```bash
doppler run -- coder
```

## Focus

**ONLY WORK ON CODER** - the product.
- This session should ONLY edit files in `packages/`, `native/`, `tests/`, and root config files
- **DO NOT edit `assignments/`** in this session - use Coder CLI to develop those:
  ```bash
  doppler run -- coder -q "work on assignments/dapp" --model glm-5
  ```
