# Coder TypeScript Source Map

> Comprehensive map of ALL TypeScript source code in `packages/src/`
> Generated: 2026-03-03

---

## Table of Contents

1. [Entry Points](#1-entry-points)
2. [Core Systems](#2-core-systems)
3. [Sessions Module](#3-sessions-module)
4. [MCP Integration](#4-mcp-integration)
5. [Ecosystem](#5-ecosystem)
   - [Tools](#51-tools)
   - [Hooks](#52-hooks)
   - [Skills](#53-skills)
6. [Teammates](#6-teammates)
7. [Types](#7-types)
8. [Native Interface](#8-native-interface)
9. [UI Components](#9-ui-components)
10. [Dependencies Graph](#10-dependencies-graph)
11. [Issues & Gaps](#11-issues--gaps)

---

## 1. Entry Points

### `/packages/src/index.ts`
**Purpose**: Main library entry point, re-exports all modules.

**Key Exports**:
```typescript
// Types
export * from "./types/index.js";

// Core systems
export * from "./core/api-client.js";
export * from "./core/agent-loop.js";
export * from "./core/permissions.js";
export * from "./core/session-store.js";

// Ecosystem
export * from "./ecosystem/tools/index.js";
export * from "./ecosystem/hooks/index.js";
export * from "./ecosystem/skills/index.js";

// Teammates
export * from "./teammates/index.js";

// Native
export * from "./native/index.js";

// UI
export * from "./interfaces/ui/index.js";
```

**Dependencies**: All internal modules
**Patterns**: Facade pattern - single entry point for library consumers

---

### `/packages/src/types/index.ts` (723 lines)
**Purpose**: Central type definitions for entire codebase.

**Key Types**:

| Type Category | Key Types |
|---------------|-----------|
| **Messages** | `Message`, `ContentBlock`, `TextBlock`, `ImageBlock`, `ToolUseBlock`, `ToolResultBlock`, `ThinkingBlock` |
| **Tools** | `ToolDefinition`, `JSONSchema`, `ToolHandler`, `ToolContext`, `ToolResult` |
| **Permissions** | `PermissionMode`, `PermissionDecision`, `PermissionRequest`, `RiskLevel` |
| **Hooks** | `HookEvent`, `HookDefinition`, `HookInput`, `HookOutput`, `PromptEvaluator` |
| **Skills** | `SkillDefinition`, `SkillFile` |
| **Teammates** | `Teammate`, `Team`, `TeammateMessage`, `TeammateState` |
| **API** | `APIRequest`, `APIResponse`, `UsageMetrics`, `CacheMetrics` |
| **Thinking** | `ExtendedThinkingConfig`, `EFFORT_TO_BUDGET` mapping |

**Important Constants**:
```typescript
export const EFFORT_TO_BUDGET: Record<ThinkingEffort, number> = {
  low: 1024,
  medium: 8192,
  high: 32768,
};
```

**Dependencies**: None (base types)
**Patterns**: Single source of truth for types, namespace organization

---

## 2. Core Systems

### `/packages/src/core/api-client.ts`
**Purpose**: API client interface definition.

**Key Exports**:
- `APIClient` interface
- `createAPIClient()` factory

---

### `/packages/src/core/api-client-impl.ts` (603 lines)
**Purpose**: SSE streaming implementation for LLM APIs.

**Key Functions**:

| Function | Purpose |
|----------|---------|
| `createMessageStream()` | Main streaming function with retry logic |
| `buildSystemPrompt()` | Constructs system prompt with cache control |
| `buildCachedMessages()` | Applies cache_control to messages |
| `calculateCost()` | Computes API cost from usage |
| `calculateCacheMetrics()` | Cache hit/miss statistics |

**Cache Control Support**:
```typescript
// TTL-based caching
cache_control: { type: "ephemeral" }
cache_control: { type: "ephemeral", ttl: "1h" | "5m" }

// Extended thinking
budget_tokens: number
```

**Dependencies**: `types/index.ts`, `retry.ts`, `models.ts`
**Patterns**: Async generator, SSE parsing, exponential backoff

---

### `/packages/src/core/agent-loop.ts` (136 lines)
**Purpose**: Agentic loop orchestration.

**Key Function**:
```typescript
export async function agentLoop(options: AgentLoopOptions): Promise<void>
```

**Modular Structure** (in `core/agent-loop/`):
- `loop-state.ts` - State management
- `turn-executor.ts` - Turn processing
- `tool-executor.ts` - Tool invocation
- `compaction.ts` - Context compaction triggers
- `message-builder.ts` - Message construction
- `formatters.ts` - Output formatting

**Dependencies**: All core modules, hooks, tools
**Patterns**: State machine, turn-based processing

---

### `/packages/src/core/permissions.ts` (432 lines)
**Purpose**: Interactive permission system with risk assessment.

**Key Class**: `PermissionManager`

**Key Methods**:
| Method | Purpose |
|--------|---------|
| `requestPermission()` | Interactive permission prompt |
| `assessRiskLevel()` | Classifies tool risk (low/medium/high/critical) |
| `generateDescription()` | Human-readable operation descriptions |

**Permission Modes**:
```typescript
type PermissionMode =
  | "default"          // Prompt for risky operations
  | "acceptEdits"      // Auto-accept file edits
  | "bypassPermissions" // No prompts (dangerous!)
  | "plan"             // Planning mode
  | "interactive";     // Force interactive
```

**Tool Categories**:
```typescript
const TOOL_CATEGORIES = {
  readOnly: ["Read", "Glob", "Grep", "ListMcpResourcesTool"],
  fileEdit: ["Write", "Edit", "MultiEdit", "NotebookEdit"],
  system: ["Bash", "Skill"],
  network: ["WebSearch", "WebFetch"],
};
```

**Dependencies**: `types/index.ts`, `config-loader.ts`
**Patterns**: Strategy pattern for risk levels, caching

---

### `/packages/src/core/checkpoints.ts` (607 lines)
**Purpose**: Save/restore conversation states with file snapshots.

**Key Functions**:
| Function | Purpose |
|----------|---------|
| `createCheckpoint()` | Save current state |
| `restoreCheckpoint()` | Restore to saved state |
| `applyCheckpoint()` | Apply restored state |
| `undoCheckpoint()` | Navigate backward |
| `redoCheckpoint()` | Navigate forward |

**Data Structure**:
```typescript
interface Checkpoint {
  id: string;
  label?: string;
  timestamp: number;
  messages: Message[];
  files: FileSnapshot[];
  gitState?: GitState;
}
```

**Dependencies**: `types/index.ts`, `git-status.ts`, `native/index.ts` (hashing)
**Patterns**: Memento pattern, undo/redo stack

---

### `/packages/src/core/claude-md.ts` (273 lines)
**Purpose**: Project instructions loading from CLAUDE.md files.

**Key Functions**:
| Function | Purpose |
|----------|---------|
| `loadClaudeMd()` | Load from global + project locations |
| `buildClaudeMdPrompt()` | System prompt section builder |
| `generateSystemSignature()` | Environment info generation |

**File Locations**:
1. `~/.claude/CLAUDE.md` (global)
2. `.claude/CLAUDE.md` (project - preferred)
3. `./CLAUDE.md` (project root)

**Dependencies**: `types/index.ts`, `config-loader.ts`
**Patterns**: File system traversal, content merging

---

### `/packages/src/core/context-compaction.ts` (579 lines)
**Purpose**: Token management with LLM summarization.

**Key Functions**:
| Function | Purpose |
|----------|---------|
| `estimateTokens()` | ~4 chars per token heuristic |
| `compactMessages()` | Strategy-based compaction |
| `summarizeWithLLM()` | LLM-based summarization |
| `needsCompaction()` | Proactive compaction check |

**Compaction Strategies**:
```typescript
type CompactionStrategy =
  | "keepFirst"      // Keep first N messages
  | "keepLast"       // Keep last N messages
  | "summarize"      // LLM summarization
  | "toolPairs";     // Preserve tool use/result pairs
```

**Dependencies**: `types/index.ts`, `api-client.ts`, `native/index.ts`
**Patterns**: Strategy pattern, LLM-as-service

---

### `/packages/src/core/git-status.ts`
**Purpose**: Git repository status detection.

**Key Functions**:
- `getGitStatus()` - Full git status
- `isGitRepo()` - Check if in git repo
- `getBranch()` - Current branch name
- `isDirty()` - Check for uncommitted changes

**Dependencies**: Bun subprocess API
**Patterns**: Subprocess wrapping

---

### `/packages/src/core/config-loader.ts` (325 lines)
**Purpose**: Configuration file loading from multiple sources.

**Key Functions**:
| Function | Purpose |
|----------|---------|
| `loadMainConfig()` | Load `~/.claude.json` |
| `loadSettings()` | Load `~/.claude/settings.json` |
| `loadKeybindings()` | Load keybindings config |
| `loadProjectSettings()` | Load project-level overrides |
| `loadAllConfigs()` | Load all at once |
| `getMergedSettings()` | Merge global + project |
| `getAllMCPServers()` | Get all MCP servers |

**Config Sources**:
```typescript
CONFIG_PATHS = {
  main: "~/.claude.json",
  settings: "~/.claude/settings.json",
  keybindings: "~/.claude/keybindings.json",
  projectSettings: ".claude/settings.json",
};
```

**Dependencies**: `fs/promises`, `types/index.ts`
**Patterns**: Configuration cascade, file-based config

---

### `/packages/src/core/system-reminders.ts`
**Purpose**: Dynamic context injection (token warnings, cost tracking).

**Key Functions**:
- `generateTokenWarning()` - Token limit warnings
- `generateCostReport()` - Usage/cost summary
- `generateToolSummary()` - Tool usage statistics

**Dependencies**: `types/index.ts`, `models.ts`
**Patterns**: Dynamic prompt augmentation

---

### `/packages/src/core/retry.ts`
**Purpose**: Exponential backoff with jitter.

**Key Function**:
```typescript
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T>
```

**Options**:
```typescript
interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  jitter: boolean;
}
```

**Dependencies**: None
**Patterns**: Exponential backoff, jitter

---

### `/packages/src/core/models.ts` (431 lines)
**Purpose**: Model definitions, pricing, and capabilities.

**Key Exports**:
| Export | Purpose |
|--------|---------|
| `MODELS` | Complete model registry |
| `calculateCost()` | Cost calculation |
| `supportsExtendedThinking()` | Check thinking support |
| `resolveModelAlias()` | Alias resolution |

**Model Registry Structure**:
```typescript
interface ModelInfo {
  id: string;
  alias?: string;
  contextWindow: number;
  maxOutput: number;
  pricing: {
    inputPerMillion: number;
    outputPerMillion: number;
    cacheWritePerMillion?: number;
    cacheReadPerMillion?: number;
  };
  supportsVision: boolean;
  supportsExtendedThinking: boolean;
}
```

**Dependencies**: None
**Patterns**: Registry pattern, configuration object

---

## 3. Sessions Module

### `/packages/src/core/sessions/index.ts` (588 lines)
**Purpose**: Composable session management.

**Key Class**: `SessionStore`

**Key Methods**:
| Method | Purpose |
|--------|---------|
| `createSession()` | Create new or reuse empty session |
| `resumeSession()` | Resume existing session |
| `saveMessage()` | Save message to session |
| `saveToolUse()` | Save tool use record |
| `saveMetrics()` | Save query metrics |
| `listSessions()` | List recent sessions |
| `exportSession()` | Export to JSONL/JSON/Markdown |

**Composed Modules**:
- `SessionPersistence` - JSONL file handling
- `SessionMetadataManager` - Metadata management
- `SessionExporter` - Export functionality

**Session Entry Types**:
```typescript
type SessionEntry =
  | SessionMetadata
  | SessionMessage
  | SessionToolUse
  | SessionMetrics
  | SessionContext
  | SessionCheckpoint;
```

**Dependencies**: `types/index.ts`, persistence/metadata/export modules
**Patterns**: Composition pattern, event handling, JSONL persistence

---

## 4. MCP Integration

### `/packages/src/interfaces/mcp/client.ts` (390 lines)
**Purpose**: MCP protocol implementation.

**Key Class**: `MCPClientImpl`

**Key Methods**:
| Method | Purpose |
|--------|---------|
| `connect()` | Establish connection |
| `disconnect()` | Close connection |
| `callTool()` | Invoke MCP tool |
| `request()` | JSON-RPC request |
| `notify()` | JSON-RPC notification |
| `listTools()` | Discover tools |

**Transport Support**:
```typescript
type Transport =
  | "stdio"    // Local process
  | "http"     // REST API
  | "sse"      // Server-Sent Events
  | "websocket"; // WebSocket
```

**Tool Naming**:
```
mcp__<server>__<tool_name>
```

**Dependencies**: `types/index.ts`, Bun subprocess/HTTP APIs
**Patterns**: JSON-RPC 2.0, transport abstraction

---

## 5. Ecosystem

### 5.1 Tools

### `/packages/src/ecosystem/tools/index.ts` (1878 lines)
**Purpose**: Built-in tools for file operations, search, and task management.

**Tool Registry**:

| Tool | Purpose | Risk Level |
|------|---------|------------|
| `ReadTool` | Read file contents | Low |
| `WriteTool` | Write/create files | Medium |
| `EditTool` | String replacement edits | Medium |
| `MultiEditTool` | Multiple edits in one operation | Medium |
| `BashTool` | Execute shell commands | High |
| `GlobTool` | Pattern-based file matching | Low |
| `GrepTool` | Regex search (ripgrep-based) | Low |
| `TaskTool` | Spawn subagents | Medium |
| `TaskOutputTool` | Get task output | Low |
| `TaskStopTool` | Stop running task | Low |
| `AskUserQuestionTool` | Interactive prompts | Low |
| `EnterPlanModeTool` | Enter planning mode | Low |
| `ExitPlanModeTool` | Exit planning mode | Low |
| `SkillTool` | Invoke skill | Medium |
| `NotebookEditTool` | Edit Jupyter notebooks | Medium |
| `AnalyzeImageTool` | Image analysis | Low |
| `TempGlmVisionTool` | GLM vision (temporary) | Low |

**Tool Definition Pattern**:
```typescript
const ToolDefinition = {
  name: "ToolName",
  description: "...",
  inputSchema: JSONSchema,
  handler: async (input, context) => ToolResult,
};
```

**Dependencies**: `types/index.ts`, `native/index.ts`, `permissions.ts`
**Patterns**: Plugin architecture, handler pattern

---

### 5.2 Hooks

### `/packages/src/ecosystem/hooks/index.ts` (342 lines)
**Purpose**: Lifecycle event handlers.

**Key Class**: `HookManager`

**Hook Events**:
```typescript
type HookEvent =
  | "SessionStart"
  | "SessionEnd"
  | "PreToolUse"
  | "PostToolUse"
  | "PostToolUseFailure"
  | "Stop"
  | "UserPromptSubmit";
```

**Hook Types**:
1. **Shell Command** - Execute shell script
2. **In-Process** - Direct function call
3. **LLM Prompt** - Evaluated by LLM

**Exit Codes**:
```typescript
// 0 = Allow execution
// 1 = Deny and show stderr
// 2 = Block silently
```

**Key Methods**:
| Method | Purpose |
|--------|---------|
| `registerHook()` | Register hook definition |
| `executeHooks()` | Execute hooks for event |
| `evaluatePromptHook()` | LLM-based evaluation |

**Dependencies**: `types/index.ts`, `api-client.ts`
**Patterns**: Observer pattern, shell execution, LLM-as-judge

---

### 5.3 Skills

### `/packages/src/ecosystem/skills/index.ts` (296 lines)
**Purpose**: Custom agent behaviors with YAML frontmatter.

**Key Class**: `SkillManager`

**Key Functions**:
| Function | Purpose |
|----------|---------|
| `parseSkillFile()` | Parse SKILL.md with frontmatter |
| `buildSkillPrompt()` | Generate skill prompt |
| `isSkillInvocation()` | Detect `/skill` commands |
| `getSkillArgs()` | Extract skill arguments |

**Skill File Format**:
```markdown
---
name: commit
description: Create git commit
tools: [Bash]
model: sonnet
---

Analyze staged changes and create commit...
```

**Built-in Skills**:
- `commit` - Git commit creation
- `review-pr` - Pull request review
- `mcp-builder` - MCP server guide
- `hooks` - Coder hooks guide

**Dependencies**: `fs`, `types/index.ts`
**Patterns**: YAML frontmatter parsing, slash commands

---

## 6. Teammates

### `/packages/src/teammates/index.ts` (983 lines)
**Purpose**: Multi-agent coordination with file-based messaging.

**Key Class**: `TeammateManager`

**Key Methods**:
| Method | Purpose |
|--------|---------|
| `spawnTeammate()` | Create new teammate |
| `broadcast()` | Send to all teammates |
| `sendDirect()` | Send to specific teammate |
| `getMessages()` | Get inbox messages |
| `updateState()` | Update teammate state |
| `spawnTeam()` | Spawn full team |

**Communication Model**:
```
~/.claude/teammates/
├── {session-id}/
│   ├── {teammate-id}.json    # Inbox
│   └── state.json            # Team state
```

**Teammate Templates**:
```typescript
const TEMPLATES = {
  architect: { role: "Architecture Designer", ... },
  implementer: { role: "Code Implementer", ... },
  reviewer: { role: "Code Reviewer", ... },
  tester: { role: "Test Engineer", ... },
};
```

**Dependencies**: `types/index.ts`, `config-loader.ts`, tmux/terminal
**Patterns**: Actor model, file-based messaging, template pattern

---

## 7. Types

### `/packages/src/types/index.ts`
*See Section 1 for full details.*

**Type Categories**:
1. **Message Types** - Message, ContentBlock variants
2. **Tool Types** - ToolDefinition, JSONSchema, ToolResult
3. **Permission Types** - PermissionMode, RiskLevel
4. **Hook Types** - HookEvent, HookDefinition
5. **API Types** - APIRequest, APIResponse, UsageMetrics
6. **Session Types** - SessionMetadata, SessionEntry
7. **Teammate Types** - Teammate, Team, TeammateMessage

---

## 8. Native Interface

### `/packages/src/native/index.ts` (2345 lines)
**Purpose**: Rust-compiled native modules with JS fallbacks.

**Native Functions** (from Rust):

| Category | Functions |
|----------|-----------|
| **Grep** | `grepSearch`, `grepQuick`, `grepFiles`, `grepCount` |
| **Hash** | `hashContentXxhash3`, `hashContentSha256`, `contentChanged` |
| **Highlight** | `highlight_code`, `highlight_diff`, `highlight_markdown` |
| **Tokens** | `countTokens`, `estimateTokens`, `estimateBlocksFromJson` |
| **Diff** | `calculateDiff` |
| **Compact** | `compactContent` |
| **Structure** | `extractCodeStructure`, `extractSymbols`, `detectLanguage` |
| **Multi-Edit** | `validateMultiEdits`, `applyMultiEdits` |
| **Terminal** | `setupRawMode`, `restoreTerminal`, `readKey` |

**JS Fallbacks**:
- Pure JS implementations for when native module unavailable
- Regex-based highlighting
- Heuristic token estimation
- Simple diff algorithm

**Cognitive Security Module**:
```typescript
// Action classification
Action.classify(input, context): ActionClassification

// Intent verification
Intent.verify(action, signature): IntentResult

// Data flow policies
Flow.check(data, policy): FlowResult
```

**Quant Functions** (experimental):
```typescript
// AMM calculations
AMM.calculatePriceImpact(swap, pool): PriceImpact

// LMSR market maker
LMSR.price(query, outcome): number

// Arbitrage detection
Arbitrage.find(pools): Opportunity[]
```

**Dependencies**: Rust native module (`native/*.node`)
**Patterns**: FFI, graceful degradation, feature detection

---

## 9. UI Components

### `/packages/src/interfaces/ui/index.ts` (162 lines)
**Purpose**: Terminal UI components.

**Key Components**:

| Component | Purpose |
|-----------|---------|
| `Spinner` | Loading indicator with frames |
| `LoadingState` | Full loading state display |
| `StatusLine` | Status bar for terminal |
| `TUIFooter` | Footer with keybindings |

**Utilities**:
```typescript
formatElapsedTime(ms: number): string
createProgressCallback(): ProgressCallback
```

**Dependencies**: `chalk` (colors), `readline`
**Patterns**: Component pattern, terminal escape codes

---

## 10. Dependencies Graph

```
index.ts
├── types/index.ts (base - no deps)
├── core/
│   ├── models.ts (no deps)
│   ├── retry.ts (no deps)
│   ├── git-status.ts (subprocess)
│   ├── config-loader.ts → types
│   ├── permissions.ts → types, config-loader
│   ├── claude-md.ts → types, config-loader
│   ├── api-client-impl.ts → types, retry, models
│   ├── context-compaction.ts → types, api-client, native
│   ├── checkpoints.ts → types, git-status, native
│   ├── agent-loop.ts → ALL core modules
│   └── sessions/ → types, persistence modules
├── interfaces/
│   ├── mcp/client.ts → types
│   └── ui/index.ts → types
├── ecosystem/
│   ├── hooks/index.ts → types, api-client
│   ├── skills/index.ts → types
│   └── tools/index.ts → types, native, permissions
├── teammates/index.ts → types, config-loader
└── native/index.ts → Rust module (optional)
```

---

## 11. Issues & Gaps

### Critical
1. **No CLI entry point** - `cli.ts` mentioned but not in packages/src/
2. **Missing agent-loop submodules** - Referenced but may not exist:
   - `core/agent-loop/loop-state.ts`
   - `core/agent-loop/turn-executor.ts`
   - `core/agent-loop/tool-executor.ts`
   - `core/agent-loop/compaction.ts`
   - `core/agent-loop/message-builder.ts`
   - `core/agent-loop/formatters.ts`

### Medium Priority
1. **Session persistence** - Uses Bun.file() but should handle errors better
2. **Native module loading** - No explicit error handling for missing modules
3. **Hook timeout** - Default 60s may be too long for some operations

### Low Priority
1. **Type duplication** - Some types re-defined in multiple files
2. **Cognitive security** - Experimental, may need more testing
3. **Quant functions** - Marked as experimental, unclear production readiness

### Suggestions
1. Add explicit error boundaries for native module loading
2. Consider extracting cognitive security to separate package
3. Document agent-loop submodule architecture
4. Add CLI entry point to packages/src/

---

## File Statistics

| Directory | Files | Total Lines |
|-----------|-------|-------------|
| `core/` | 12+ | ~4,000 |
| `types/` | 1 | 723 |
| `interfaces/mcp/` | 1 | 390 |
| `interfaces/ui/` | 1 | 162 |
| `ecosystem/tools/` | 1 | 1,878 |
| `ecosystem/hooks/` | 1 | 342 |
| `ecosystem/skills/` | 1 | 296 |
| `teammates/` | 1 | 983 |
| `native/` | 1 | 2,345 |
| `sessions/` | 4+ | ~800 |

**Total Estimated Lines**: ~12,000+ lines of TypeScript

---

*End of TypeScript Source Map*
