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
