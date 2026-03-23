# Policy System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          POLICY SYSTEM OVERVIEW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   HUMAN INTENT                                                              │
│       │                                                                     │
│       ▼                                                                     │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                         POLICY (Declarative)                        │  │
│   │                                                                     │  │
│   │  constraints:     "Never force push to main"                        │  │
│   │  permissions:     "Allow write to src/**"                           │  │
│   │  teaching:       "When asked to delete, explain why not"           │  │
│   │                                                                     │  │
│   │  Format: policy.yaml / policy.json                                 │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│       │                                                                     │
│       │ compile()                                                          │
│       ▼                                                                     │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                      COMPILED ARTIFACTS                              │  │
│   ├─────────────────────────────────────────────────────────────────────┤  │
│   │                                                                     │  │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │  │
│   │  │   BOUNDS     │  │ AGENT INTENT │  │  LOGIC SPEC  │              │  │
│   │  ├──────────────┤  ├──────────────┤  ├──────────────┤              │  │
│   │  │ Mechanical   │  │ Alignment    │  │ Procedural   │              │  │
│   │  │ enforcement  │  │ checking     │  │ definition   │              │  │
│   │  │              │  │              │  │              │              │  │
│   │  │ PreToolUse   │  │ goals[]      │  │ flows[]      │              │  │
│   │  │ PostToolUse  │  │ boundaries[] │  │ logic[]      │              │  │
│   │  └──────────────┘  └──────────────┘  └──────────────┘              │  │
│   │                                                                     │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│       │                  │                    │                            │
│       │                  │                    │                            │
│       ▼                  ▼                    ▼                            │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                    ENFORCEMENT LAYERS                                │  │
│   ├─────────────────────────────────────────────────────────────────────┤  │
│   │                                                                     │  │
│   │  ┌──────────────────────────────────────────────────────────────┐  │  │
│   │  │                    COGNITIVE SECURITY                         │  │  │
│   │  ├──────────────────────────────────────────────────────────────┤  │  │
│   │  │                                                              │  │  │
│   │  │  Hooks:                                                      │  │  │
│   │  │  • SessionStart → Load intent from policies                  │  │  │
│   │  │  • PreToolUse  → Check constraints + permissions             │  │  │
│   │  │  • PostToolUse → Learn from failures                         │  │  │
│   │  │  • UserPrompt  → Match teaching hints                        │  │  │
│   │  │  • SessionEnd  → Report statistics                           │  │  │
│   │  │                                                              │  │  │
│   │  │  Features:                                                   │  │  │
│   │  │  • Intent alignment checking                                 │  │  │
│   │  │  • Flow policy enforcement                                   │  │  │
│   │  │  • Taint tracking                                           │  │  │
│   │  │  • Leak prevention                                          │  │  │
│   │  │  • Auto-fix when possible                                   │  │  │
│   │  │  • Learning from failures                                   │  │  │
│   │  │                                                              │  │  │
│   │  └──────────────────────────────────────────────────────────────┘  │  │
│   │                                                                     │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## File Structure

```
packages/src/coder/packages/src/core/policy/
├── types.ts              # Type definitions
├── registry.ts           # Policy management and compilation
├── compiler.ts           # Policy → Bounds/Intent/LogicSpec compilation
├── hooks.ts              # Hook handlers for enforcement
├── builtins.ts           # Built-in policies (git, filesystem, network)
├── cognitive-integration.ts  # Bridge to cognitive security
├── examples.ts           # Usage examples
└── index.ts              # Public API
```

## Key Concepts

### 1. Constraints (What NOT to do)

```yaml
constraints:
  - id: never-force-main
    description: "Never force push to main"
    severity: fatal  # warn | block | fatal
    pattern:
      tool: Bash
      command_pattern: "git push.*--force.*main"
    suggestion: "Use --force-with-lease or create a feature branch"
```

### 2. Permissions (What IS allowed)

```yaml
permissions:
  - id: src-write
    domain: filesystem
    actions: [read, write, create, modify]
    paths: ["src/**", "tests/**"]
    requires_approval: never  # never | always | sensitive
```

### 3. Teaching (How to respond)

```yaml
teaching:
  - id: force-push-explanation
    trigger: ["force push", "push --force"]
    response: "Force pushing rewrites git history..."
    reason: "History rewriting is destructive"
    examples:
      - input: "force push to main"
        output: "I can't force push to main..."
        explanation: "Protecting shared branches"
```

## Integration Points

### With Bounds (`../bounds/`)
- Policies compile to `Boundary` objects
- Registered in `BoundaryRegistry`
- Enforced by `BoundaryEnforcer`

### With Cognitive Security (`../cognitive-security/`)
- Policies compile to `AgentIntent`
- Used for alignment checking
- Hooked into lifecycle events

### With Logic Spec (`cerebralvalley/logic-spec/`)
- Policies can generate `logic.yaml`
- Enables cross-language specification
- Supports procedural validation

## Usage

```typescript
import {
  getRegistry,
  quickSetup,
  initializePolicyBasedSecurity
} from "@ebowwa/coder/policy";

// Quick setup
await quickSetup("balanced");  // "strict" | "balanced" | "permissive"

// Or manual setup
const registry = getRegistry();
registry.registerAll(builtInPolicies);
await initializePolicyBasedSecurity();

// Custom policy
registry.register({
  meta: { name: "my-policy", version: "1.0.0", scope: "project" },
  constraints: [
    {
      id: "no-delete-dist",
      description: "Don't delete dist/ directory",
      severity: "block",
      pattern: { tool: "Bash", command_pattern: "rm.*dist" }
    }
  ]
});
```

## Severity Levels

| Level | Behavior |
|-------|----------|
| `warn` | Log warning, allow action |
| `block` | Block action, require user decision |
| `fatal` | Hard block, no override possible |

## Auto-Fix Actions

Policies can define auto-fix strategies:

```yaml
auto_fix:
  type: sanitize  # sanitize | redirect | reject | modify
  description: "Replace secret with env var"
  params:
    replacement: "process.env.SECRET_NAME"
```

## Learning

The system learns from failures:

1. Tool execution fails
2. Pattern extracted from error
3. Constraint generated
4. Added to learned constraints
5. Applied to future operations
