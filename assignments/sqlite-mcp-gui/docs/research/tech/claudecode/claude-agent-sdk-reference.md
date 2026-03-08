# Claude Agent SDK (Node.js/TypeScript) - Complete Reference

> The Claude Agent SDK enables you to programmatically build AI agents with Claude Code's capabilities. Create autonomous agents that can understand codebases, edit files, run commands, and execute complex workflows.

**Package**: `@anthropic-ai/claude-agent-sdk`
**Version**: 0.1.72
**Repository**: [github.com/anthropics/claude-agent-sdk-typescript](https://github.com/anthropics/claude-agent-sdk-typescript)
**Weekly Downloads**: ~1M
**Dependencies**: 0 (zero dependencies)

---

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Prerequisites](#prerequisites)
4. [Quickstart](#quickstart)
5. [Core Concepts: The Agent Loop](#core-concepts-the-agent-loop)
6. [API Reference](#api-reference)
7. [Types Reference](#types-reference)
8. [Built-in Tools](#built-in-tools)
9. [Code Examples](#code-examples)
10. [Permission Modes](#permission-modes)
11. [Hooks](#hooks)
12. [MCP Integration](#mcp-integration)
13. [Sessions](#sessions)
14. [Best Practices](#best-practices)
15. [Resources](#resources)

---

## Overview

The **Claude Agent SDK** (formerly Claude Code SDK) is a TypeScript/Node.js SDK that gives AI agents access to a "computer" - file system, terminal, web - enabling autonomous execution of complex workflows.

### Key Design Principle

> Give Claude access to the same tools that humans use every day - finding files, writing code, running commands, debugging, and iterating until successful.

### What You Can Build

- **Finance Agents**: Portfolio analysis, investment evaluation, API access, calculations
- **Personal Assistant Agents**: Travel booking, calendar management, appointment scheduling, briefs
- **Customer Support Agents**: Handle ambiguous requests, data collection, API connections, human escalation
- **Deep Research Agents**: Document analysis, information synthesis, cross-referencing, report generation
- **Coding Agents**: Code generation, file editing, testing, debugging

### The Agent Loop

```
┌─────────────────────────────────────────────────────┐
│  1. GATHER CONTEXT                                  │
│  ├─ Agentic Search (file system, grep, bash)       │
│  ├─ Semantic Search (vector-based)                  │
│  ├─ Subagents (parallel processing)                 │
│  └─ Compaction (auto-summarization)                 │
└─────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│  2. TAKE ACTION                                     │
│  ├─ Tools (primary building blocks)                 │
│  ├─ Bash & Scripts (general-purpose access)         │
│  ├─ Code Generation (precise, reusable)             │
│  └─ MCP Integration (external services)             │
└─────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│  3. VERIFY WORK                                     │
│  ├─ Rules-based Feedback (linting, validation)      │
│  ├─ Visual Feedback (screenshots, renders)          │
│  └─ LLM as Judge (secondary model evaluation)       │
└─────────────────────────────────────────────────────┘
                       ↓
                    REPEAT
```

---

## Installation

```bash
npm install @anthropic-ai/claude-agent-sdk
# or
bun install @anthropic-ai/claude-agent-sdk
# or
pnpm install @anthropic-ai/claude-agent-sdk
# or
yarn add @anthropic-ai/claude-agent-sdk
```

---

## Prerequisites

- **Node.js 18+** (or Bun, Deno)
- **Claude Code** installed (the SDK uses it as runtime)
- **Anthropic API key** (or authenticate via `claude` CLI)

### Install Claude Code

The Agent SDK uses Claude Code as its runtime.

**macOS/Linux/WSL (Homebrew)**:
```bash
brew install claude-ai/tap/claude
```

**macOS/Linux/WSL (npm)**:
```bash
npm install -g @anthropic-ai/claude-code
```

After installing, run `claude` in your terminal and follow the prompts to authenticate.

---

## Quickstart

### Step 1: Create a Project

```bash
mkdir my-agent && cd my-agent
npm install @anthropic-ai/claude-agent-sdk
```

### Step 2: Create a Buggy File

Create `utils.ts`:
```typescript
export function calculateAverage(numbers: number[]): number {
  let total = 0;
  for (const num of numbers) {
    total += num;
  }
  return total / numbers.length;  // Bug: division by zero when empty
}

export function getUserName(user: any): string {
  return user["name"].toUpperCase();  // Bug: crashes when user is null
}
```

### Step 3: Create Your Agent

Create `agent.ts`:
```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

async function main() {
  for await (const message of query({
    prompt: "Review utils.ts for bugs that would cause crashes. Fix any issues you find.",
    options: {
      allowedTools: ["Read", "Edit", "Glob"],
      permissionMode: "acceptEdits"  // Auto-approve file edits
    }
  })) {
    if (message.type === 'assistant') {
      for (const block of message.message.content) {
        if (block.type === 'text') {
          console.log(block.text);  // Claude's reasoning
        } else if (block.type === 'tool_use') {
          console.log(`Tool: ${block.name}`);  // Tool being called
        }
      }
    } else if (message.type === 'result') {
      console.log(`Done: ${message.subtype}`);
    }
  }
}

main();
```

### Step 4: Run Your Agent

```bash
# Using Node
npx tsx agent.ts

# Using Bun
bun run agent.ts
```

Your agent will:
1. **Read** `utils.ts` to understand the code
2. **Analyze** the logic and identify edge cases
3. **Edit** the file to add proper error handling

---

## API Reference

### Main Functions

#### `query()`

The primary function for interacting with Claude. Creates an async generator that streams messages as they arrive.

```typescript
function query({
  prompt,
  options
}: {
  prompt: string | AsyncIterable<SDKUserMessage>;
  options?: Options;
}): Query
```

**Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `prompt` | `string \| AsyncIterable<SDKUserMessage>` | The input prompt as a string or async iterable for streaming mode |
| `options` | `Options` | Optional configuration object |

**Returns**: A `Query` object that extends `AsyncGenerator<SDKMessage, void>` with additional methods.

#### `tool()`

Creates a type-safe MCP tool definition for use with SDK MCP servers.

```typescript
function tool<Schema extends ZodRawShape>(
  name: string,
  description: string,
  inputSchema: Schema,
  handler: (args: z.infer<ZodObject<Schema>>, extra: unknown) => Promise<CallToolResult>
): SdkMcpToolDefinition<Schema>
```

**Example**:
```typescript
import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

const weatherTool = tool(
  "get_weather",
  "Get current weather for a location",
  z.object({
    location: z.string().describe("City name or zip code"),
    unit: z.enum(["celsius", "fahrenheit"]).default("celsius")
  }),
  async (args) => {
    // Tool implementation
    const response = await fetch(`https://api.weather.com/${args.location}`);
    const data = await response.json();
    return {
      content: [{ type: "text", text: JSON.stringify(data) }]
    };
  }
);
```

#### `createSdkMcpServer()`

Creates an MCP server instance that runs in the same process as your application.

```typescript
function createSdkMcpServer(options: {
  name: string;
  version?: string;
  tools?: Array<SdkMcpToolDefinition<any>>;
}): McpSdkServerConfigWithInstance
```

**Example**:
```typescript
import { createSdkMcpServer, tool, query } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

const mcpServer = createSdkMcpServer({
  name: "my-server",
  version: "1.0.0",
  tools: [weatherTool]
});

async function main() {
  for await (const message of query({
    prompt: "What's the weather like in San Francisco?",
    options: {
      mcpServers: {
        weather: {
          type: "sdk",
          name: "my-server",
          instance: mcpServer.instance
        }
      }
    }
  })) {
    console.log(message);
  }
}
```

---

## Types Reference

### Options

Configuration object for the `query()` function.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `abortController` | `AbortController` | `new AbortController()` | Controller for cancelling operations |
| `additionalDirectories` | `string[]` | `[]` | Additional directories Claude can access |
| `agents` | `Record<string, AgentDefinition>` | `undefined` | Programmatically define subagents |
| `allowedTools` | `string[]` | All tools | List of allowed tool names |
| `allowDangerouslySkipPermissions` | `boolean` | `false` | Enable bypassing permissions (required for `bypassPermissions` mode) |
| `betas` | `SdkBeta[]` | `[]` | Enable beta features |
| `canUseTool` | `CanUseTool` | `undefined` | Custom permission function for tool usage |
| `continue` | `boolean` | `false` | Continue the most recent conversation |
| `cwd` | `string` | `process.cwd()` | Current working directory |
| `disallowedTools` | `string[]` | `[]` | List of disallowed tool names |
| `enableFileCheckpointing` | `boolean` | `false` | Enable file change tracking for rewinding |
| `env` | `Dict<string>` | `process.env` | Environment variables |
| `executable` | `'bun' \| 'deno' \| 'node'` | Auto-detected | JavaScript runtime to use |
| `executableArgs` | `string[]` | `[]` | Arguments to pass to the executable |
| `extraArgs` | `Record<string, string \| null>` | `{}` | Additional arguments |
| `fallbackModel` | `string` | `undefined` | Model to use if primary fails |
| `forkSession` | `boolean` | `false` | Fork to new session when resuming |
| `hooks` | `Partial<Record<HookEvent, HookCallbackMatcher[]>>` | `{}` | Hook callbacks for events |
| `includePartialMessages` | `boolean` | `false` | Include partial message events |
| `maxBudgetUsd` | `number` | `undefined` | Maximum budget in USD |
| `maxThinkingTokens` | `number` | `undefined` | Maximum tokens for thinking |
| `maxTurns` | `number` | `undefined` | Maximum conversation turns |
| `mcpServers` | `Record<string, McpServerConfig>` | `{}` | MCP server configurations |
| `model` | `string` | CLI default | Claude model to use |
| `outputFormat` | `{ type: 'json_schema', schema: JSONSchema }` | `undefined` | Define output format for results |
| `pathToClaudeCodeExecutable` | `string` | Built-in | Path to Claude Code executable |
| `permissionMode` | `PermissionMode` | `'default'` | Permission mode |
| `permissionPromptToolName` | `string` | `undefined` | MCP tool name for permission prompts |
| `plugins` | `SdkPluginConfig[]` | `[]` | Load custom plugins |
| `resume` | `string` | `undefined` | Session ID to resume |
| `resumeSessionAt` | `string` | `undefined` | Resume at specific message UUID |
| `sandbox` | `SandboxSettings` | `undefined` | Configure sandbox behavior |
| `settingSources` | `SettingSource[]` | `[]` | Which filesystem settings to load |
| `stderr` | `(data: string) => void` | `undefined` | Callback for stderr output |
| `strictMcpConfig` | `boolean` | `false` | Enforce strict MCP validation |
| `systemPrompt` | `string \| { type: 'preset'; preset: 'claude_code'; append?: string }` | `undefined` | System prompt configuration |
| `tools` | `string[] \| { type: 'preset'; preset: 'claude_code' }` | `undefined` | Tool configuration |

### Query Interface

```typescript
interface Query extends AsyncGenerator<SDKMessage, void> {
  interrupt(): Promise<void>;
  rewindFiles(userMessageUuid: string): Promise<void>;
  setPermissionMode(mode: PermissionMode): Promise<void>;
  setModel(model?: string): Promise<void>;
  setMaxThinkingTokens(maxThinkingTokens: number | null): Promise<void>;
  supportedCommands(): Promise<SlashCommand[]>;
  supportedModels(): Promise<ModelInfo[]>;
  mcpServerStatus(): Promise<McpServerStatus[]>;
  accountInfo(): Promise<AccountInfo>;
}
```

### AgentDefinition

```typescript
type AgentDefinition = {
  description: string;    // Natural language description of when to use this agent
  tools?: string[];       // Array of allowed tool names (inherits all if omitted)
  prompt: string;         // The agent's system prompt
  model?: 'sonnet' | 'opus' | 'haiku' | 'inherit';  // Model override
}
```

### SettingSource

Controls which filesystem-based configuration sources the SDK loads.

```typescript
type SettingSource = 'user' | 'project' | 'local';
```

| Value | Description | Location |
|-------|-------------|----------|
| `'user'` | Global user settings | `~/.claude/settings.json` |
| `'project'` | Shared project settings (version controlled) | `.claude/settings.json` |
| `'local'` | Local project settings (gitignored) | `.claude/settings.local.json` |

**Default behavior**: When `settingSources` is omitted, the SDK does **not** load any filesystem settings (provides isolation).

**Loading CLAUDE.md**:
```typescript
const result = query({
  prompt: "Add a feature following project conventions",
  options: {
    systemPrompt: { type: 'preset', preset: 'claude_code' },
    settingSources: ['project'],  // Loads CLAUDE.md
    allowedTools: ['Read', 'Write', 'Edit']
  }
});
```

### PermissionMode

```typescript
type PermissionMode =
  | 'default'           // Standard permission behavior
  | 'acceptEdits'       // Auto-accept file edits
  | 'bypassPermissions' // Bypass all permission checks
  | 'plan';             // Planning mode - no execution
```

### SdkBeta

Available beta features.

```typescript
type SdkBeta = 'context-1m-2025-08-07';
```

| Value | Description | Compatible Models |
|-------|-------------|-------------------|
| `'context-1m-2025-08-07'` | Enables 1 million token context window | Claude Sonnet 4, Claude Sonnet 4.5 |

### SandboxSettings

```typescript
type SandboxSettings = {
  enabled?: boolean;                          // Enable sandbox mode
  autoAllowBashIfSandboxed?: boolean;         // Auto-approve bash when sandboxed
  excludedCommands?: string[];                // Commands that bypass sandbox
  allowUnsandboxedCommands?: boolean;         // Model can request unsandboxed
  network?: NetworkSandboxSettings;           // Network configuration
  ignoreViolations?: SandboxIgnoreViolations; // Violations to ignore
  enableWeakerNestedSandbox?: boolean;        // Weaker nested sandbox
}
```

### NetworkSandboxSettings

```typescript
type NetworkSandboxSettings = {
  allowLocalBinding?: boolean;    // Allow binding to local ports
  allowUnixSockets?: string[];     // Unix socket paths to allow
  allowAllUnixSockets?: boolean;   // Allow all Unix sockets
  httpProxyPort?: number;          // HTTP proxy port
  socksProxyPort?: number;         // SOCKS proxy port
}
```

### McpServerConfig

```typescript
type McpServerConfig =
  | McpStdioServerConfig      // stdio-based MCP server
  | McpSSEServerConfig        // Server-Sent Events
  | McpHttpServerConfig       // HTTP-based
  | McpSdkServerConfigWithInstance;  // In-process SDK server
```

**Stdio**:
```typescript
type McpStdioServerConfig = {
  type?: 'stdio';
  command: string;
  args?: string[];
  env?: Record<string, string>;
}
```

**SSE**:
```typescript
type McpSSEServerConfig = {
  type: 'sse';
  url: string;
  headers?: Record<string, string>;
}
```

**HTTP**:
```typescript
type McpHttpServerConfig = {
  type: 'http';
  url: string;
  headers?: Record<string, string>;
}
```

**SDK**:
```typescript
type McpSdkServerConfigWithInstance = {
  type: 'sdk';
  name: string;
  instance: McpServer;
}
```

---

## Message Types

### SDKMessage

Union type of all possible messages.

```typescript
type SDKMessage =
  | SDKAssistantMessage
  | SDKUserMessage
  | SDKUserMessageReplay
  | SDKResultMessage
  | SDKSystemMessage
  | SDKPartialAssistantMessage
  | SDKCompactBoundaryMessage;
```

### SDKAssistantMessage

```typescript
type SDKAssistantMessage = {
  type: 'assistant';
  uuid: UUID;
  session_id: string;
  message: APIAssistantMessage;  // From Anthropic SDK
  parent_tool_use_id: string | null;
}
```

### SDKUserMessage

```typescript
type SDKUserMessage = {
  type: 'user';
  uuid?: UUID;
  session_id: string;
  message: APIUserMessage;  // From Anthropic SDK
  parent_tool_use_id: string | null;
}
```

### SDKResultMessage

```typescript
type SDKResultMessage =
  | {
      type: 'result';
      subtype: 'success';
      uuid: UUID;
      session_id: string;
      duration_ms: number;
      duration_api_ms: number;
      is_error: boolean;
      num_turns: number;
      result: string;
      total_cost_usd: number;
      usage: NonNullableUsage;
      modelUsage: { [modelName: string]: ModelUsage };
      permission_denials: SDKPermissionDenial[];
      structured_output?: unknown;
    }
  | {
      type: 'result';
      subtype: 'error_max_turns' | 'error_during_execution' | 'error_max_budget_usd';
      uuid: UUID;
      session_id: string;
      duration_ms: number;
      total_cost_usd: number;
      errors: string[];
      // ... other fields
    };
```

### SDKSystemMessage

```typescript
type SDKSystemMessage = {
  type: 'system';
  subtype: 'init';
  uuid: UUID;
  session_id: string;
  apiKeySource: ApiKeySource;
  cwd: string;
  tools: string[];
  mcp_servers: { name: string; status: string; }[];
  model: string;
  permissionMode: PermissionMode;
  slash_commands: string[];
  output_style: string;
}
```

### SDKCompactBoundaryMessage

```typescript
type SDKCompactBoundaryMessage = {
  type: 'system';
  subtype: 'compact_boundary';
  uuid: UUID;
  session_id: string;
  compact_metadata: {
    trigger: 'manual' | 'auto';
    pre_tokens: number;
  };
}
```

---

## Built-in Tools

### Tool Categories

| Category | Tools | Purpose |
|----------|-------|---------|
| **File System** | `Read`, `Write`, `Edit`, `Glob`, `Grep` | File operations |
| **Terminal** | `Bash`, `BashOutput`, `KillBash` | Command execution |
| **Web** | `WebSearch`, `WebFetch` | Web access |
| **Notebook** | `NotebookEdit` | Jupyter notebooks |
| **Agent** | `Task`, `AskUserQuestion` | Subagents & interaction |
| **State** | `TodoWrite` | Task tracking |
| **Planning** | `ExitPlanMode` | Planning workflow |
| **MCP** | `ListMcpResources`, `ReadMcpResource` | MCP integration |

### Tool Input Types

#### Read

Read files from the local filesystem.

```typescript
interface FileReadInput {
  file_path: string;     // Absolute path to the file
  offset?: number;       // Line number to start reading
  limit?: number;        // Number of lines to read
}
```

**Output**:
```typescript
type ReadOutput = TextFileOutput | ImageFileOutput | PDFFileOutput | NotebookFileOutput;

interface TextFileOutput {
  content: string;           // File contents with line numbers
  total_lines: number;       // Total number of lines
  lines_returned: number;    // Lines actually returned
}
```

#### Write

Write a file to the local filesystem.

```typescript
interface FileWriteInput {
  file_path: string;    // Absolute path
  content: string;      // Content to write
}
```

**Output**:
```typescript
interface WriteOutput {
  message: string;      // Success message
  bytes_written: number;
  file_path: string;
}
```

#### Edit

Perform exact string replacements in files.

```typescript
interface FileEditInput {
  file_path: string;     // Absolute path
  old_string: string;    // Text to replace
  new_string: string;    // Replacement text
  replace_all?: boolean; // Replace all occurrences
}
```

**Output**:
```typescript
interface EditOutput {
  message: string;       // Confirmation message
  replacements: number;  // Number of replacements made
  file_path: string;
}
```

#### Glob

Fast file pattern matching.

```typescript
interface GlobInput {
  pattern: string;       // Glob pattern (e.g., "**/*.ts")
  path?: string;         // Directory to search (defaults to cwd)
}
```

**Output**:
```typescript
interface GlobOutput {
  matches: string[];     // Matching file paths
  count: number;
  search_path: string;
}
```

#### Grep

Powerful regex search built on ripgrep.

```typescript
interface GrepInput {
  pattern: string;                    // Regex pattern
  path?: string;                      // Search path
  glob?: string;                      // File filter (e.g., "*.js")
  type?: string;                      // File type (e.g., "js", "py")
  output_mode?: 'content' | 'files_with_matches' | 'count';
  '-i'?: boolean;                     // Case insensitive
  '-n'?: boolean;                     // Show line numbers
  '-B'?: number;                      // Lines before match
  '-A'?: number;                      // Lines after match
  '-C'?: number;                      // Lines before and after
  head_limit?: number;                // Limit output
  multiline?: boolean;                // Multiline mode
}
```

**Output**:
```typescript
type GrepOutput = GrepContentOutput | GrepFilesOutput | GrepCountOutput;

interface GrepContentOutput {
  matches: Array<{
    file: string;
    line_number?: number;
    line: string;
    before_context?: string[];
    after_context?: string[];
  }>;
  total_matches: number;
}
```

#### Bash

Execute bash commands in a persistent shell session.

```typescript
interface BashInput {
  command: string;                   // Command to execute
  timeout?: number;                  // Timeout in milliseconds (max 600000)
  description?: string;              // Description of command
  run_in_background?: boolean;       // Run in background
}
```

**Output**:
```typescript
interface BashOutput {
  output: string;        // Combined stdout and stderr
  exitCode: number;      // Exit code
  killed?: boolean;      // Whether killed due to timeout
  shellId?: string;      // Shell ID for background processes
}
```

#### BashOutput

Retrieve output from a running background shell.

```typescript
interface BashOutputInput {
  bash_id: string;       // ID of the background shell
  filter?: string;       // Regex to filter output lines
}
```

**Output**:
```typescript
interface BashOutputToolOutput {
  output: string;        // New output since last check
  status: 'running' | 'completed' | 'failed';
  exitCode?: number;
}
```

#### KillBash

Kill a running background bash shell.

```typescript
interface KillShellInput {
  shell_id: string;      // ID of the shell to kill
}
```

#### NotebookEdit

Edit cells in Jupyter notebook files.

```typescript
interface NotebookEditInput {
  notebook_path: string;           // Absolute path to .ipynb
  cell_id?: string;                // Cell ID to edit
  new_source: string;              // New cell source
  cell_type?: 'code' | 'markdown'; // Cell type
  edit_mode?: 'replace' | 'insert' | 'delete';
}
```

**Output**:
```typescript
interface NotebookEditOutput {
  message: string;
  edit_type: 'replaced' | 'inserted' | 'deleted';
  cell_id?: string;
  total_cells: number;
}
```

#### WebSearch

Search the web.

```typescript
interface WebSearchInput {
  query: string;                    // Search query
  allowed_domains?: string[];        // Only include these domains
  blocked_domains?: string[];        // Never include these domains
}
```

**Output**:
```typescript
interface WebSearchOutput {
  results: Array<{
    title: string;
    url: string;
    snippet: string;
    metadata?: Record<string, any>;
  }>;
  total_results: number;
  query: string;
}
```

#### WebFetch

Fetch and process content from a URL.

```typescript
interface WebFetchInput {
  url: string;              // URL to fetch
  prompt: string;           // Prompt to run on fetched content
}
```

**Output**:
```typescript
interface WebFetchOutput {
  response: string;         // AI model's response
  url: string;              // URL that was fetched
  final_url?: string;       // URL after redirects
  status_code?: number;     // HTTP status code
}
```

#### Task

Launch a subagent for complex tasks.

```typescript
interface AgentInput {
  description: string;      // Short (3-5 word) description
  prompt: string;           // Task for the agent
  subagent_type: string;    // Type of specialized agent
}
```

**Output**:
```typescript
interface TaskOutput {
  result: string;           // Final result from subagent
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  total_cost_usd?: number;
  duration_ms?: number;
}
```

#### AskUserQuestion

Ask the user clarifying questions.

```typescript
interface AskUserQuestionInput {
  questions: Array<{
    question: string;       // Complete question (ends with ?)
    header: string;         // Short label (max 12 chars)
    options: Array<{
      label: string;        // Display text (1-5 words)
      description: string;  // Explanation
    }>;
    multiSelect: boolean;   // Allow multiple selections
  }>;
  answers?: Record<string, string>;  // User's answers
}
```

#### TodoWrite

Manage a structured task list.

```typescript
interface TodoWriteInput {
  todos: Array<{
    content: string;        // Task description
    status: 'pending' | 'in_progress' | 'completed';
    activeForm: string;     // Present continuous form
  }>;
}
```

**Output**:
```typescript
interface TodoWriteOutput {
  message: string;
  stats: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
  };
}
```

#### ExitPlanMode

Exit planning mode and prompt for approval.

```typescript
interface ExitPlanModeInput {
  plan: string;             // The plan to run
}
```

#### ListMcpResources

List available MCP resources.

```typescript
interface ListMcpResourcesInput {
  server?: string;          // Server name to filter by
}
```

**Output**:
```typescript
interface ListMcpResourcesOutput {
  resources: Array<{
    uri: string;
    name: string;
    description?: string;
    mimeType?: string;
    server: string;
  }>;
  total: number;
}
```

#### ReadMcpResource

Read a specific MCP resource.

```typescript
interface ReadMcpResourceInput {
  server: string;           // MCP server name
  uri: string;              // Resource URI
}
```

**Output**:
```typescript
interface ReadMcpResourceOutput {
  contents: Array<{
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: string;
  }>;
  server: string;
}
```

---

## Code Examples

### 1. Basic "Hello World"

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

async function main() {
  for await (const message of query({
    prompt: "Say hello world",
  })) {
    if (message.type === 'assistant') {
      console.log(message.message);
    }
  }
}

main();
```

### 2. File Operations with Auto-Approval

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

async function main() {
  for await (const message of query({
    prompt: "Review utils.ts for bugs and fix them",
    options: {
      allowedTools: ["Read", "Edit", "Glob"],
      permissionMode: "acceptEdits",  // Auto-approve file edits
      cwd: process.cwd()
    }
  })) {
    if (message.type === 'assistant') {
      for (const block of message.message.content) {
        if (block.type === 'text') console.log(block.text);
        if (block.type === 'tool_use') console.log(`Tool: ${block.name}`);
      }
    } else if (message.type === 'result') {
      console.log(`Done: ${message.subtype}`);
      console.log(`Cost: $${message.total_cost_usd}`);
      console.log(`Duration: ${message.duration_ms}ms`);
    }
  }
}

main();
```

### 3. Multi-Agent Workflow

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

async function main() {
  for await (const message of query({
    prompt: "Analyze this codebase and write a comprehensive report",
    options: {
      agents: {
        "code-analyzer": {
          description: "Analyzes code structure and patterns",
          tools: ["Read", "Grep", "Glob"],
          prompt: "You are a code analysis expert. Focus on architecture, patterns, and potential issues."
        },
        "documentation-writer": {
          description: "Writes technical documentation",
          tools: ["Read", "Write"],
          prompt: "You are a technical writer. Create clear, comprehensive documentation."
        }
      }
    }
  })) {
    console.log(message);
  }
}

main();
```

### 4. Custom MCP Tools

```typescript
import { tool, createSdkMcpServer, query } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

// Define custom tool
const calculatorTool = tool(
  "calculate",
  "Perform mathematical calculations",
  z.object({
    expression: z.string().describe("Math expression to evaluate (e.g., '2 + 2')")
  }),
  async (args) => {
    try {
      // Safe evaluation of math expressions
      const result = Function('"use strict"; return (' + args.expression + ')')();
      return {
        content: [{ type: "text", text: String(result) }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error}` }],
        isError: true
      };
    }
  }
);

// Create MCP server
const mcpServer = createSdkMcpServer({
  name: "calculator-server",
  version: "1.0.0",
  tools: [calculatorTool]
});

async function main() {
  for await (const message of query({
    prompt: "What is 123 * 456?",
    options: {
      mcpServers: {
        calculator: {
          type: "sdk",
          name: "calculator-server",
          instance: mcpServer.instance
        }
      }
    }
  })) {
    console.log(message);
  }
}

main();
```

### 5. Web Research Agent

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

async function main() {
  for await (const message of query({
    prompt: "Research the latest AI trends and write a summary report to report.md",
    options: {
      allowedTools: ["WebSearch", "WebFetch", "Write", "Read"],
      permissionMode: "acceptEdits"
    }
  })) {
    if (message.type === 'assistant') {
      for (const block of message.message.content) {
        if (block.type === 'text') console.log(block.text);
        if (block.type === 'tool_use') console.log(`→ ${block.name}`);
      }
    } else if (message.type === 'result') {
      console.log(`\n✓ ${message.subtype}`);
      console.log(`Cost: $${message.total_cost_usd.toFixed(4)}`);
    }
  }
}

main();
```

### 6. Session Management (Multi-turn)

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

async function main() {
  let sessionId: string | undefined;

  // First query
  console.log("Phase 1: Analysis");
  for await (const message of query({
    prompt: "Analyze my project structure",
  })) {
    if (message.type === 'system' && message.session_id) {
      sessionId = message.session_id;
    }
    if (message.type === 'assistant') {
      for (const block of message.message.content) {
        if (block.type === 'text') console.log(block.text);
      }
    }
  }

  // Resume session
  if (sessionId) {
    console.log("\nPhase 2: Implementation");
    for await (const message of query({
      prompt: "Now add unit tests to the files you analyzed",
      options: {
        resume: sessionId  // Continue from previous session
      }
    })) {
      if (message.type === 'assistant') {
        for (const block of message.message.content) {
          if (block.type === 'text') console.log(block.text);
        }
      }
    }
  }
}

main();
```

### 7. With Hooks

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

async function main() {
  for await (const message of query({
    prompt: "Refactor the codebase",
    options: {
      allowedTools: ["Read", "Edit", "Glob"],
      permissionMode: "acceptEdits",
      hooks: {
        PreToolUse: [{
          hooks: [async (input) => {
            console.log(`→ Tool: ${input.tool_name}`);
            return { continue: true };
          }]
        }],
        PostToolUse: [{
          hooks: [async (input) => {
            console.log(`✓ Done: ${input.tool_name}`);
            return { continue: true };
          }]
        }],
        SessionStart: [{
          hooks: [async (input) => {
            console.log(`Session started: ${input.session_id}`);
            return { continue: true };
          }]
        }]
      }
    }
  })) {
    if (message.type === 'result') {
      console.log(`\n${message.subtype}: ${message.result}`);
    }
  }
}

main();
```

### 8. With Budget Limit

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

async function main() {
  for await (const message of query({
    prompt: "Comprehensive code review of the entire project",
    options: {
      maxBudgetUsd: 1.00,  // Stop after $1.00
      maxTurns: 50,        // Maximum 50 turns
      allowedTools: ["Read", "Grep", "Glob", "WebSearch"]
    }
  })) {
    if (message.type === 'result') {
      if (message.subtype === 'error_max_budget_usd') {
        console.log('Budget limit reached!');
      }
      console.log(`Final cost: $${message.total_cost_usd}`);
      console.log(`Turns: ${message.num_turns}`);
    }
  }
}

main();
```

### 9. Structured Output

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

async function main() {
  for await (const message of query({
    prompt: "Analyze the security vulnerabilities in this code",
    options: {
      outputFormat: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: {
            vulnerabilities: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  file: { type: 'string' },
                  line: { type: 'number' }
                },
                required: ['severity', 'title', 'description']
              }
            }
          },
          required: ['vulnerabilities']
        }
      }
    }
  })) {
    if (message.type === 'result' && message.structured_output) {
      console.log(JSON.stringify(message.structured_output, null, 2));
    }
  }
}

main();
```

### 10. Sandbox Configuration

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

async function main() {
  for await (const message of query({
    prompt: "Build and test the application",
    options: {
      sandbox: {
        enabled: true,
        autoAllowBashIfSandboxed: true,
        excludedCommands: ["docker"],  // Docker runs unsandboxed
        network: {
          allowLocalBinding: true,     // Allow dev servers
          allowUnixSockets: ["/var/run/docker.sock"]
        }
      },
      allowedTools: ["Read", "Write", "Edit", "Bash", "Glob"]
    }
  })) {
    console.log(message);
  }
}

main();
```

### 11. Custom Permission Handler

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

async function main() {
  for await (const message of query({
    prompt: "Review and fix the code",
    options: {
      permissionMode: "default",
      canUseTool: async (toolName, input, { signal }) => {
        // Auto-approve Read operations
        if (toolName === 'Read') {
          return { behavior: 'allow', updatedInput: input };
        }

        // Ask for Edit operations
        if (toolName === 'Edit') {
          console.log(`Edit requested: ${(input as any).file_path}`);
          // In a real app, you'd prompt the user here
          return { behavior: 'allow', updatedInput: input };
        }

        // Deny everything else
        return { behavior: 'deny', message: 'Tool not allowed' };
      }
    }
  })) {
    console.log(message);
  }
}

main();
```

### 12. Loading Project Settings (CLAUDE.md)

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

async function main() {
  for await (const message of query({
    prompt: "Add a new user profile feature following project conventions",
    options: {
      // Load CLAUDE.md and project settings
      systemPrompt: {
        type: 'preset',
        preset: 'claude_code'
      },
      settingSources: ['project'],  // Loads .claude/settings.json and CLAUDE.md
      allowedTools: ['Read', 'Write', 'Edit', 'Glob'],
      permissionMode: 'acceptEdits'
    }
  })) {
    console.log(message);
  }
}

main();
```

---

## Permission Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| `default` | Requires `canUseTool` callback for approval | Custom approval flows |
| `acceptEdits` | Auto-approves file edits, asks for other actions | Trusted development workflows |
| `bypassPermissions` | Runs without prompts (requires `allowDangerouslySkipPermissions: true`) | CI/CD pipelines, automation |
| `plan` | Planning mode - no execution | Planning sessions |

### Example: Permission Modes

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

// CI/CD Mode - fully automated
for await (const message of query({
  prompt: "Run all tests and fix failures",
  options: {
    permissionMode: "bypassPermissions",
    allowDangerouslySkipPermissions: true
  }
})) {
  // ...
}

// Development Mode - auto-approve edits
for await (const message of query({
  prompt: "Refactor this module",
  options: {
    permissionMode: "acceptEdits"
  }
})) {
  // ...
}

// Custom Mode - manual approval
for await (const message of query({
  prompt: "Make changes",
  options: {
    permissionMode: "default",
    canUseTool: async (tool, input) => {
      const approval = await askUser(tool, input);
      return approval
        ? { behavior: 'allow', updatedInput: input }
        : { behavior: 'deny', message: 'User denied' };
    }
  }
})) {
  // ...
}
```

---

## Hooks

Hooks allow you to run custom code before or after specific events.

### Hook Events

```typescript
type HookEvent =
  | 'PreToolUse'              // Before tool execution
  | 'PostToolUse'             // After successful tool execution
  | 'PostToolUseFailure'      // After tool execution fails
  | 'Notification'            // Notifications
  | 'UserPromptSubmit'        // User submits a prompt
  | 'SessionStart'            // Session starts
  | 'SessionEnd'              // Session ends
  | 'Stop'                    // Agent stops
  | 'SubagentStart'           // Subagent starts
  | 'SubagentStop'            // Subagent stops
  | 'PreCompact'              // Before context compaction
  | 'PermissionRequest';      // Permission requested
```

### Hook Callback

```typescript
type HookCallback = (
  input: HookInput,
  toolUseID: string | undefined,
  options: { signal: AbortSignal }
) => Promise<HookJSONOutput>;
```

### Example: Comprehensive Hooks

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

async function main() {
  const toolLog: Array<{tool: string, startTime: number, endTime?: number}> = [];

  for await (const message of query({
    prompt: "Refactor the codebase",
    options: {
      hooks: {
        SessionStart: [{
          hooks: [async (input) => {
            console.log(`🚀 Session: ${input.session_id}`);
            console.log(`📁 CWD: ${input.cwd}`);
            return { continue: true };
          }]
        }],

        PreToolUse: [{
          hooks: [async (input) => {
            const entry = { tool: input.tool_name, startTime: Date.now() };
            toolLog.push(entry);
            console.log(`→ ${input.tool_name}`);
            return { continue: true };
          }]
        }],

        PostToolUse: [{
          hooks: [async (input) => {
            const entry = toolLog.find(e => e.tool === input.tool_name);
            if (entry) entry.endTime = Date.now();
            const duration = entry ? (entry.endTime - entry.startTime) : 0;
            console.log(`✓ ${input.tool_name} (${duration}ms)`);
            return { continue: true };
          }]
        }],

        PostToolUseFailure: [{
          hooks: [async (input) => {
            console.error(`✗ ${input.tool_name} failed: ${input.error}`);
            return { continue: true };
          }]
        }],

        SessionEnd: [{
          hooks: [async (input) => {
            const totalTime = toolLog.reduce((sum, e) =>
              sum + (e.endTime ? (e.endTime - e.startTime) : 0), 0);
            console.log(`\n📊 Session ended: ${input.reason}`);
            console.log(`⏱️  Total tool time: ${totalTime}ms`);
            console.log(`🔧 Tools used: ${toolLog.map(e => e.tool).join(', ')}`);
            return { continue: true };
          }]
        }]
      }
    }
  })) {
    if (message.type === 'result') {
      console.log(`\n${message.subtype}`);
    }
  }
}

main();
```

---

## MCP Integration

### What is MCP?

The Model Context Protocol (MCP) provides standardized integrations to external services, handling authentication and API calls automatically.

### Pre-built Integrations

- **Slack**: Search messages, send messages
- **GitHub**: Issues, PRs, repositories
- **Google Drive**: Files, documents
- **Asana**: Tasks, projects
- And many more...

### Example: GitHub Integration

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

async function main() {
  for await (const message of query({
    prompt: "List open PRs in the anthropic/claude-agent-sdk-typescript repo and summarize them",
    options: {
      mcpServers: {
        github: {
          type: 'stdio',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-github']
        }
      }
    }
  })) {
    console.log(message);
  }
}

main();
```

### Example: Multiple MCP Servers

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

async function main() {
  for await (const message of query({
    prompt: "Check GitHub issues and update our Asana tasks accordingly",
    options: {
      mcpServers: {
        github: {
          type: 'stdio',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-github']
        },
        asana: {
          type: 'stdio',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-asana'],
          env: {
            ASANA_ACCESS_TOKEN: process.env.ASANA_TOKEN!
          }
        }
      }
    }
  })) {
    console.log(message);
  }
}

main();
```

### Example: Custom MCP Server with Tools

```typescript
import { createSdkMcpServer, tool, query } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

// Define custom tools
const weatherTool = tool(
  "get_weather",
  "Get current weather for a location",
  z.object({
    location: z.string(),
    unit: z.enum(["celsius", "fahrenheit"]).default("celsius")
  }),
  async ({ location, unit }) => {
    const response = await fetch(`https://api.weather.com/${location}?unit=${unit}`);
    const data = await response.json();
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
    };
  }
);

const forecastTool = tool(
  "get_forecast",
  "Get weather forecast for next 7 days",
  z.object({
    location: z.string()
  }),
  async ({ location }) => {
    const response = await fetch(`https://api.weather.com/${location}/forecast`);
    const data = await response.json();
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
    };
  }
);

// Create SDK MCP server
const weatherServer = createSdkMcpServer({
  name: "weather-service",
  version: "1.0.0",
  tools: [weatherTool, forecastTool]
});

async function main() {
  for await (const message of query({
    prompt: "What's the weather like in San Francisco? What about the forecast?",
    options: {
      mcpServers: {
        weather: {
          type: "sdk",
          name: "weather-service",
          instance: weatherServer.instance
        }
      }
    }
  })) {
    console.log(message);
  }
}

main();
```

---

## Sessions

### Session Management

The SDK automatically manages sessions, allowing multi-turn conversations with context persistence.

### Getting Session ID

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

async function main() {
  let sessionId: string | undefined;

  for await (const message of query({
    prompt: "Analyze my project"
  })) {
    if (message.type === 'system') {
      sessionId = message.session_id;
      console.log(`Session ID: ${sessionId}`);
    }
    if (message.type === 'result') {
      console.log(`Cost: $${message.total_cost_usd}`);
    }
  }

  return sessionId;
}

main();
```

### Resuming Sessions

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

async function main(sessionId: string) {
  for await (const message of query({
    prompt: "Now add tests to what you analyzed",
    options: {
      resume: sessionId  // Resume from previous session
    }
  })) {
    console.log(message);
  }
}

// Usage
const sessionId = await getPreviousSessionId();
if (sessionId) {
  main(sessionId);
}
```

### Forking Sessions

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

async function main(sessionId: string) {
  for await (const message of query({
    prompt: "Try a different approach",
    options: {
      resume: sessionId,
      forkSession: true  // Create new branch instead of continuing original
    }
  })) {
    console.log(message);
  }
}

main();
```

### File Checkpointing (Rewind)

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

async function main() {
  const queryInstance = query({
    prompt: "Make some changes",
    options: {
      enableFileCheckpointing: true  // Enable file change tracking
    }
  });

  let userMessageUuid: string | undefined;

  for await (const message of queryInstance) {
    if (message.type === 'user') {
      userMessageUuid = message.uuid;
    }
    if (message.type === 'result') {
      console.log(`Done: ${message.result}`);

      // Rewind files to before the user's message
      if (userMessageUuid) {
        await queryInstance.rewindFiles(userMessageUuid);
        console.log("Files rewound!");
      }
    }
  }
}

main();
```

---

## Best Practices

### 1. Start with Agentic Search

Use file system search (`Glob`, `Grep`, `Read`) before semantic search. It's more accurate and transparent.

```typescript
// Good - file system search
for await (const message of query({
  prompt: "Find all TypeScript files with 'TODO' comments",
  options: {
    allowedTools: ["Glob", "Grep", "Read"]
  }
})) {
  // ...
}
```

### 2. Design Primary Tools Carefully

Tools should be the main actions your agent takes. They are prominent in Claude's context window.

```typescript
// Good - focused, primary tools
const tools = [
  "fetchInbox",      // Primary email action
  "searchEmails",    // Primary search action
  "sendEmail"        // Primary send action
];

// Avoid - too granular
const tools = [
  "connectToImap",
  "authenticate",
  "fetchHeaders",
  "fetchBody",
  "parseEmail"
  // Too many low-level operations
];
```

### 3. Use Code Generation

Express complex operations as code - it's precise, composable, and reusable.

```typescript
for await (const message of query({
  prompt: "Create a script to process this CSV data and generate visualizations",
  options: {
    allowedTools: ["Read", "Write", "Bash", "Edit"]
  }
})) {
  // Claude will write Python/TypeScript code that's reusable
}
```

### 4. Provide Concrete Feedback

Give agents clear ways to evaluate their work (linting, tests, visual verification).

```typescript
for await (const message of query({
  prompt: "Write TypeScript code with tests. Run tests and fix failures.",
  options: {
    allowedTools: ["Read", "Write", "Edit", "Bash"],
    hooks: {
      PostToolUse: [{
        hooks: [async (input) => {
          if (input.tool_name === 'Bash') {
            // Check if tests passed
            if (input.tool_response.includes('FAILED')) {
              return {
                continue: true,
                suppressOutput: false,
                systemMessage: "Some tests failed. Please fix them and re-run."
              };
            }
          }
          return { continue: true };
        }]
      }]
    }
  }
})) {
  // ...
}
```

### 5. Test Iteratively

Build test sets based on real usage patterns and monitor where agents fail.

```typescript
const testCases = [
  { prompt: "Refactor this function", expected: "success" },
  { prompt: "Fix the bug", expected: "success" },
  { prompt: "Add tests", expected: "success" }
];

for (const testCase of testCases) {
  const result = await runAgent(testCase.prompt);
  console.assert(
    result.subtype === testCase.expected,
    `Failed: ${testCase.prompt}`
  );
}
```

### 6. Use Subagents for Parallelization

Spin up multiple subagents for tasks that can run in parallel with isolated contexts.

```typescript
for await (const message of query({
  prompt: "Analyze the entire codebase and write a comprehensive report",
  options: {
    agents: {
      "frontend-analyzer": {
        description: "Analyzes frontend code",
        tools: ["Read", "Grep", "Glob"],
        prompt: "Focus on React/TypeScript patterns"
      },
      "backend-analyzer": {
        description: "Analyzes backend code",
        tools: ["Read", "Grep", "Glob"],
        prompt: "Focus on API design and database patterns"
      },
      "security-analyzer": {
        description: "Analyzes security",
        tools: ["Read", "Grep"],
        prompt: "Focus on vulnerabilities and best practices"
      }
    }
  }
})) {
  // Subagents run in parallel
}
```

### 7. Set Budgets and Limits

Protect against runaway costs in production.

```typescript
for await (const message of query({
  prompt: "Comprehensive analysis",
  options: {
    maxBudgetUsd: 5.00,    // $5 limit
    maxTurns: 100,        // 100 turn limit
    maxThinkingTokens: 50000  // Limit thinking
  }
})) {
  // ...
}
```

### 8. Use Structured Output

Get type-safe responses for programmatic use.

```typescript
for await (const message of query({
  prompt: "Extract all API endpoints from this codebase",
  options: {
    outputFormat: {
      type: 'json_schema',
      schema: {
        type: 'object',
        properties: {
          endpoints: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                path: { type: 'string' },
                method: { type: 'string' },
                handler: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }
})) {
  if (message.type === 'result' && message.structured_output) {
    const endpoints = message.structured_output as { endpoints: Array<any> };
    // Use endpoints programmatically
  }
}
```

---

## Resources

### Official Documentation

| Resource | URL |
|----------|-----|
| **Agent SDK Overview** | [platform.claude.com/docs/en/agent-sdk](https://platform.claude.com/docs/en/agent-sdk) |
| **TypeScript Reference** | [platform.claude.com/docs/en/agent-sdk/typescript](https://platform.claude.com/docs/en/agent-sdk/typescript) |
| **Quickstart** | [platform.claude.com/docs/en/agent-sdk/quickstart](https://platform.claude.com/docs/en/agent-sdk/quickstart) |
| **Python SDK** | [platform.claude.com/docs/en/agent-sdk/python](https://platform.claude.com/docs/en/agent-sdk/python) |
| **Migration Guide** | [platform.claude.com/docs/en/agent-sdk/migration-guide](https://platform.claude.com/docs/en/agent-sdk/migration-guide) |

### GitHub Repositories

| Repository | URL |
|------------|-----|
| **TypeScript SDK** | [github.com/anthropics/claude-agent-sdk-typescript](https://github.com/anthropics/claude-agent-sdk-typescript) |
| **Python SDK** | [github.com/anthropics/claude-agent-sdk-python](https://github.com/anthropics/claude-agent-sdk-python) |
| **Demos** | [github.com/anthropics/claude-agent-sdk-demos](https://github.com/anthropics/claude-agent-sdk-demos) |

### Community

| Resource | URL |
|----------|-----|
| **Discord** | [discord.gg/anthropic](https://discord.gg/anthropic) |
| **npm Package** | [npmjs.com/package/@anthropic-ai/claude-agent-sdk](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk) |

### Additional Reading

- [Building agents with the Claude Agent SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)
- [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [MCP Documentation](https://modelcontextprotocol.io/)

---

## License and Terms

Use of the SDK is governed by Anthropic's [Commercial Terms of Service](https://www.anthropic.com/legal/terms), including when using it to power products for your own customers.

---

## Data Collection

When you use the Claude Agent SDK, Anthropic collects:
- Usage data (code acceptance/rejections)
- Associated conversation data
- User feedback via `/bug` command

**Privacy safeguards**:
- Limited retention periods for sensitive information
- Restricted access to user session data
- Clear policies against using feedback for model training

See [Privacy Policy](https://www.anthropic.com/legal/privacy) for details.

---

*Generated from official Anthropic documentation and resources.*
