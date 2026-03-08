# Coder

An AI-powered terminal coding assistant built with TypeScript + Rust.

## Project Structure

```
packages/
├── src/                    # TypeScript source (main codebase)
└── rust/                   # Rust native module source

native/                     # Compiled .node binaries
dist/                       # Bundled JS output (published to npm)
tests/                      # Test files
assignments/                # Side projects (not main product)
```

## Development

```bash
bun run dev              # Watch mode (packages/src/interfaces/ui/terminal/cli/index.ts)
bun run build            # Build TS + Rust
bun test                 # Run tests

# Using Coder (after build/install)
doppler run -- coder -q "read package.json"
doppler run -- coder --model glm-5 -q "list files"
```

## Build Pipeline

```bash
bun run build:native     # Rust → native/*.node (via napi-rs)
bun run build:ts         # packages/src → dist/ (bundled)
```

## Runtime Stack

- **Runtime**: Bun (not Node.js)
- **Package manager**: bun install
- **Test runner**: bun test
- **Bundler**: bun build
- **Secrets**: Doppler

## Native Modules (Rust)

Performance-critical operations in `packages/rust/src/`:
- **grep.rs** - ripgrep-based file search
- **hash.rs** - xxHash3/SHA-256 for caching
- **highlight.rs** - Syntax highlighting (syntect)
- **tokens.rs** - Token counting/estimation
- **diff.rs** - Diff calculation
- **compact.rs** - Context compaction
- **structure.rs** - Tree-sitter code parsing
- **multi_edit.rs** - Atomic multi-file editing
- **patterns.rs** - Tool pattern analysis
- **tool_pairs.rs** - Tool use/result extraction
- **input.rs** - Terminal input handling
- **tui.rs** - Native TUI rendering
- **cognitive_security/** - Security modules (action, intent, flow)

## Focus

**ONLY WORK ON CODER** - the product.
- This session should ONLY edit files in `packages/`, `native/`, `tests/`, and root config files
- **DO NOT edit `assignments/`** in this session - use Coder CLI to develop those:
  ```bash
  doppler run -- coder -q "work on assignments/dapp" --model glm-5
  ```
- We use Coder to develop assignments so we can oversee and enhance Coder itself

For detailed architecture, see `.claude/CLAUDE.md`.
