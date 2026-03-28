# Coder Memory

Project memory and implementation notes for Coder.

## Topics

- [Telemetry & Observability](./telemetry-implementation.md) - Comprehensive telemetry system with health checks, alerts, insights, and dashboards

## Key Patterns

### Package Structure
- `@ebowwa/coder` - Main package
- Source in `packages/src/`
- Native Rust modules in `packages/rust/`
- Built output in `dist/` and `native/`

### Development Commands
```bash
bun run dev          # Watch mode
bun run build        # Build TS + Rust
bun run cli          # Run CLI directly
bun test             # Run tests
```

### Eval System
- Located in `packages/src/eval/`
- CLI: `coder --eval` (list suites), `coder --eval <suite>` (run), `coder --eval analyze` (session analysis)
- Run tests: `bun test packages/src/eval/`
- Session logs: `~/.claude/sessions/*.jsonl`
- Task categories: file_operations, tool_selection, error_handling, multi_step_workflows, context_compaction, import_detection, bash_execution, file_writing, code_review
- 8 Suites: capability-core, capability-tools, capability-errors, capability-bash, capability-file-writing, capability-code-review, capability-workflows, regression-core
- 25+ tasks derived from real session data
- Three evaluation levels: run (single-step), trace (full-turn), thread (multi-turn)
- See `CLAUDE.md` for eval setup and CLI commands

### Git Workflow
- Default branch: `dev`
- Stable releases: `main`
- Feature branches: `feat/*` from `dev`
- PRs target `dev`

### Technology Stack
- Runtime: Bun
- Secrets: Doppler
- TypeScript: ESM with `.js` extension imports
- Rust: napi-rs for native modules
