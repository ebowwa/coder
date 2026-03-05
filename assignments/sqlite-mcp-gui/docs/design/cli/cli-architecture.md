# Cheapspaces CLI Architecture Notes

## Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: CLI Wrapper (What Continue provides)              │
│  - MCP plugin system                                        │
│  - Session persistence (JSON files)                         │
│  - TUI/Ink rendering                                        │
│  - Command argument parsing (Commander.js)                  │
│  - Headless mode detection                                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: OpenAI Protocol (What cheapspaces already has)    │
│  - GLM-4.7 client (OpenAI-compatible via Z.AI)              │
│  - Error handling (Timeout, Auth, RateLimit, Network)        │
│  - Retry logic (3x with exponential backoff)                │
│  - AbortController cancellation                             │
│  - 30s timeout                                              │
└─────────────────────────────────────────────────────────────┘
```

## Overview

**Cheapspaces** is a development environment management tool for Hetzner Cloud servers. It currently runs as a web application (Bun.serve + React) but functions as a dev tool for:

- Creating/managing Hetzner development environments
- SSH operations and file transfers
- Resource monitoring and metrics collection
- AI-powered insights via GLM-4.7

This document maps patterns from `tools/ANALYSIS.md` (study of autohand-commander and continue) to **Layer 2** (CLI wrapper) that could be added on top of the existing **Layer 1** (OpenAI protocol client).

---

## Pattern Mapping: ANALYSIS.md → Cheapspaces

| Pattern | Layer | Current Status | Notes |
|---------|-------|----------------|-------|
| **Provider Abstraction** | 1 | ✅ Done | GLM client uses OpenAI protocol |
| **AsyncGenerator Streaming** | 1 | ❌ Missing | SSE protocol not implemented |
| **Retry Logic** | 1 | ✅ Excellent | 3 retries with backoff |
| **Error Types** | 1 | ✅ Excellent | Timeout, Auth, RateLimit, Network |
| **Service Container** | 2 | ❌ Missing | Singletons used instead |
| **Headless + TUI Modes** | 2 | ❌ Missing | Web UI only |
| **Session Persistence** | 2 | ❌ Missing | No AI chat history |
| **Config Merging** | 2 | ⚠️ Partial | Env vars only |
| **MCP Plugins** | 2 | ⚠️ Types only | No implementation |

---

## Current Architecture

```
cheapspaces (Bun.serve on port 3000)
├── Frontend: React 18 (34 components)
├── Backend: Hono API framework
├── Database: SQLite (metadata + metrics)
└── AI: GLM-4.7 via Z.AI

app/
├── frontend/
│   ├── App.tsx                    # Main React component
│   ├── components/                # 34 React components
│   │   ├── AIAssistant.tsx        # AI chat panel
│   │   └── AIResourceInsights.tsx # Per-environment insights
│   ├── hooks/
│   └── utils/
├── server/
│   ├── index.ts                   # Hono API server (850 lines)
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── client.ts          # GLM-4.7 client (OpenAI-compatible)
│   │   │   ├── prompts.ts         # Composable prompt system
│   │   │   └── types.ts           # OpenAI protocol types
│   │   ├── hetzner/               # Hetzner Cloud API client
│   │   ├── ssh/                   # SSH operations (modular)
│   │   ├── metrics.ts             # Time-series storage
│   │   └── resources.ts           # Resource parsing
│   └── api.ts                     # API route definitions
└── shared/
    ├── types.ts                   # Shared frontend/server types
    ├── constants.ts
    └── validation.ts
```

---

## GLM-4.7 Integration Status

### What Works ✅

**Location:** `app/server/lib/ai/client.ts`

- OpenAI-compatible API client for Z.AI's GLM-4.7
- Base URL: `https://api.z.ai/api/coding/paas/v4`
- Supported models: GLM-4.7, GLM-4.6, GLM-4.5, GLM-4.5-air
- **Error Handling:** GLMTimeoutError, GLMAuthError, GLMRateLimitError, GLMNetworkError
- **Retry Logic:** 3 retries with exponential backoff (1s → 2s → 4s, max 10s)
- **Timeout:** 30 seconds default
- **Cancellation:** AbortController support

### Current AI Endpoints (9 total)

```
POST /api/ai/generate              - Simple text generation
POST /api/ai/chat                  - Multi-turn conversations
POST /api/ai/suggest/name          - Server name suggestions
POST /api/ai/suggest/server-type   - Server type recommendations
POST /api/ai/analyze/resources     - Current resource analysis
POST /api/ai/analyze/historical    - Historical trend analysis
POST /api/ai/troubleshoot/ssh      - SSH troubleshooting
POST /api/ai/suggest/actions       - Server action recommendations
GET  /api/ai/capabilities          - Feature availability check
```

### What's Missing ❌

#### 1. Streaming Responses

**Current:** All AI requests are blocking (await full response)

**Continue Pattern:**
```typescript
async function* streamChatResponse(
  chatHistory,
  model,
  llmApi,
  abortController,
): AsyncGenerator<string> {
  for await (const chunk of llmApi.chatCompletionStream({ ... })) {
    yield chunk.content;
  }
}
```

**Note:** The `ChatCompletionOptions` type already has `stream?: boolean` defined, but it's not being used.

#### 2. Session Persistence

**Current:** No AI chat history saved between sessions

**Continue Pattern:**
```typescript
interface Session {
  id: string                    // UUID
  messages: ChatHistoryItem[]   // Full conversation
  title?: string                 // Auto-generated from first message
  createdAt: number
  updatedAt: number
  apiConfig?: LLMConfig          // Provider/model used
}

// Saved to ~/.continue/sessions/*.json
// Resume with --resume, list with ls, fork with --fork
```

---

## MCP (Model Context Protocol) Integration

### Current Status: Types Only

**Location:** `app/shared/types.ts`

```typescript
interface ClaudeCodePlugin {
  enabled: boolean
  name?: string
  commands?: ClaudeCodeCommand[]
  agents?: ClaudeCodeAgent[]
  skills?: ClaudeCodeSkill[]
  hooks?: ClaudeCodeHook[]
  mcpServers?: Array<{
    name: string
    command: string
    args?: string[]
    env?: Record<string, string>
  }>
  config?: Record<string, unknown>
}
```

### Potential MCP Tools for Cheapspaces

| Tool | Purpose | Implementation |
|------|---------|----------------|
| `hetzner_create` | Create new server | Wrap `HetznerClient.createServer()` |
| `hetzner_delete` | Delete server | Wrap `HetznerClient.deleteServer()` |
| `hetzner_power` | Power on/off | Wrap `powerOn()` / `powerOff()` |
| `ssh_exec` | Execute remote command | Wrap `execSSH()` |
| `ssh_upload` | Upload file via SCP | Wrap `scpUpload()` |
| `ssh_download` | Download file via SCP | Wrap `scpDownload()` |
| `resources_get` | Get resource usage | Wrap `getResources()` |

### Continue MCP Pattern to Follow

**Key Files from `tools/continue`:**
- `core/context/mcp/MCPManagerSingleton.ts` - Singleton managing all MCP connections
- `core/context/mcp/MCPConnection.ts` - Individual MCP server connection
- `packages/config-yaml/src/schemas/mcp/index.ts` - MCP config schema

**Server Types:**
```typescript
// Stdio-based (local processes)
type StdioMcpServer = {
  command: string
  args: string[]
  env: Record<string, string>
  cwd?: string
}

// HTTP/SSE-based (remote servers)
type SseMcpServer = {
  url: string
  type: "sse" | "streamable-http"
  apiKey?: string
}
```

---

## Headless/CLI Mode Potential

### Current: Web UI Only

```typescript
// index.ts - Always serves web UI
Bun.serve({
  port: 3000,
  routes: { "/": index },
  development: { hmr: true },
});
```

### Could Add: CLI Mode Detection

```typescript
// Pseudo-code for CLI mode
if (isHeadlessMode()) {
  // Direct stdout/stderr for CI/CD, pipes
  const result = await runCommand(process.argv.slice(2));
  console.log(formatOutput(result));
} else if (isTTYless()) {
  // Non-interactive: JSON output
  const result = await runCommand(process.argv.slice(2));
  console.log(JSON.stringify(result));
} else {
  // Interactive TUI or Web UI
  Bun.serve({ routes: { "/": index } });
}
```

### Continue's Detection Pattern

```typescript
function isHeadlessMode(): boolean {
  return process.env.CONTINUE_HEADLESS === "true";
}

function isTTYless(): boolean {
  return !process.stdout.isTTY;
}
```

---

## Configuration Architecture

### Current: Environment Variables Only

```bash
# Required for Hetzner functionality
HETZNER_API_TOKEN=xxx

# Optional for AI features
Z_AI_API_KEY=xxx  # (or ZAI_API_KEY, GLM_API_KEY)

# Server configuration
PORT=3000  # Default
```

### Continue Pattern: Multi-Layer YAML

**Precedence (highest to lowest):**
1. Runtime overrides (CLI flags)
2. Project-local config (`.continue/config.yml`)
3. User global config (`~/.continue/config.yml`)
4. System defaults

**Example config.yml:**
```yaml
models:
  - name: GLM-4.7
    provider: glm
    apiKey: ${Z_AI_API_KEY}
    apiBase: https://api.z.ai/api/coding/paas/v4/

mcpServers:
  - name: hetzner
    command: node
    args: ["./mcp-hetzner/index.js"]
```

---

## Error Handling Comparison

### Continue's Approach

- BaseLLM classes delegate retry logic to individual providers
- OpenAI/Anthropic providers rely on SDK-level retries
- HTTP requests use standard `fetch` with AbortController
- Service-level states: idle → loading → ready → error

### Our GLM Client (Already Superior)

```typescript
// app/server/lib/ai/client.ts

// 30s default timeout
// 3 retries with exponential backoff (1s → 2s → 4s, max 10s)
// Specific error types: GLMTimeoutError, GLMAuthError, GLMRateLimitError, GLMNetworkError
// AbortController for cancellation
```

**Conclusion:** Keep our GLM client's retry logic. It's already better than Continue's basic approach.

---

## Recommended Improvements

### Priority 1: Add Streaming (Layer 1 - OpenAI Protocol)

**Layer:** 1 (OpenAI protocol, not CLI wrapper)
**Impact:** Major UX improvement for all users (web + CLI)
**Effort:** Low - types already defined

```typescript
// app/server/lib/ai/client.ts
async *streamGenerate(
  prompt: string,
  options?: ChatCompletionOptions
): AsyncGenerator<string> {
  const response = await fetch(this.apiBase, {
    method: "POST",
    headers: { Authorization: `Bearer ${this.apiKey}` },
    body: JSON.stringify({
      model: this.model,
      messages: [{ role: "user", content: prompt }],
      stream: true,  // Enable streaming
    }),
  });

  for await (const line of response.body!) {
    const chunk = parseSSERow(line);
    if (chunk?.choices?.[0]?.delta?.content) {
      yield chunk.choices[0].delta.content;
    }
  }
}
```

**Note:** Streaming is part of the OpenAI protocol (SSE responses), not a CLI wrapper feature.

### Priority 2: CLI Entry Point (Layer 2)

**Layer:** 2 (CLI wrapper)
**Impact:** Enable headless mode for CI/CD and terminal users
**Effort:** Medium

```typescript
// bin/cheapspaces.ts
#!/usr/bin/env bun

import { program } from "commander";
import { createEnv, listEnvs, deleteEnv } from "../app/server/commands";

program
  .name("cheapspaces")
  .description("Hetzner development environment manager");

program.command("list").action(listEnvs);
program.command("create").action(createEnv);
program.command("delete <id>").action(deleteEnv);

program.parse();
```

### Priority 3: Session Persistence (Layer 2)

**Layer:** 2 (CLI wrapper)
**Impact:** Multi-turn conversations, resume capability
**Effort:** Medium

```typescript
// app/server/lib/sessions.ts
interface Session {
  id: string;
  messages: ChatMessage[];
  title?: string;
  createdAt: number;
  updatedAt: number;
}

export class SessionManager {
  private dir = `${homedir()}/.cheapspaces/sessions`;

  save(session: Session): void {
    writeFile(`${this.dir}/${session.id}.json`, JSON.stringify(session));
  }

  load(id: string): Session | null {
    // Load from JSON file
  }

  list(): Session[] {
    // List all sessions
  }
}
```

### Priority 4: MCP Integration (Layer 2)

**Layer:** 2 (CLI wrapper - plugin system)
**Impact:** Extensible plugin system
**Effort:** High

Reference `tools/continue/core/context/mcp/` for implementation pattern.

---

## Files to Study from tools/continue

| File | Purpose | Why Study |
|------|---------|-----------|
| `packages/openai-adapters/src/apis/base.ts` | BaseLlmApi interface | Universal contract |
| `extensions/cli/src/stream/streamChatResponse.ts` | Streaming logic | Core chat flow |
| `extensions/cli/src/services/ServiceContainer.ts` | Dependency injection | Service lifecycle |
| `extensions/cli/src/config.ts` | API construction | Provider instantiation |
| `core/context/mcp/MCPManagerSingleton.ts` | MCP plugin system | Extensibility |
| `extensions/cli/src/ui/TUIChat.tsx` | TUI chat UI | Ink-based interface |

---

## Related Documentation

- `tools/ANALYSIS.md` - Detailed analysis of autohand-commander and continue
- `docs/RALPH-LOOP-RESEARCH.md` - Ralph Loop plugin research
- `genesis.md` - Project origin and goals
