# @ebowwa/claude-code-remake

A reimplementation of Claude Code CLI using TypeScript + Bun + Rust.

Based on binary analysis of Claude Code v2.1.50 (~92% feature parity).

## Features

- **API Client**: SSE streaming for Anthropic API with cost calculation
- **Agent Loop**: Turn-based processing with tool execution
- **Built-in Tools**: Read, Write, Edit, Bash, Glob, Grep
- **MCP Client**: Model Context Protocol support (stdio, HTTP, SSE, WebSocket)
- **Hook System**: 10 lifecycle events for customization
- **Skill System**: YAML frontmatter skills with `/skillname` invocation
- **Teammate System**: Multi-agent coordination with tmux backend
- **Native Module**: Rust-based performance for search, tokens, diff, compact

## Installation

```bash
bun install
bun run build
```

## Usage

### CLI

```bash
# Interactive mode
bun run cli

# Single query
bun run cli "What files are in this directory?"

# With specific model
bun run cli -m claude-opus-4-6 "Explain this codebase"

# With permission mode
bun run cli --permission-mode acceptEdits "Add a test"
```

### Programmatic

```typescript
import { createMessageStream, agentLoop, tools } from "@ebowwa/claude-code-remake";

// Stream API messages
const result = await createMessageStream(messages, {
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: "claude-sonnet-4-6",
  onToken: (text) => process.stdout.write(text),
});

// Run agent loop
const agentResult = await agentLoop(messages, {
  apiKey: process.env.ANTHROPIC_API_KEY,
  systemPrompt: "You are a helpful assistant.",
  tools: [tools.ReadTool, tools.WriteTool, tools.BashTool],
  permissionMode: "default",
  workingDirectory: process.cwd(),
});
```

## Project Structure

```
claude-code-remake/
├── src/
│   ├── types/          # TypeScript type definitions
│   ├── core/           # API client, agent loop
│   ├── tools/          # Built-in tools (Read, Write, Edit, Bash, etc.)
│   ├── mcp/            # MCP client implementation
│   ├── hooks/          # Hook system for lifecycle events
│   ├── skills/         # Skill parsing and invocation
│   ├── teammates/      # Multi-agent coordination
│   ├── native/         # Native module loader
│   └── cli.ts          # CLI entry point
├── rust/
│   └── src/
│       ├── search.rs   # Ripgrep-based file search
│       ├── tokens.rs   # Token counting
│       ├── diff.rs     # Diff calculation
│       └── compact.rs  # Content compaction
├── native/             # Compiled native modules
└── dist/               # Build output
```

## Configuration

### Environment Variables

- `ANTHROPIC_API_KEY` - API key for Claude

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `-m, --model` | Model to use | claude-sonnet-4-6 |
| `-p, --permission-mode` | Permission mode | default |
| `--max-tokens` | Maximum output tokens | 4096 |
| `--system-prompt` | Override system prompt | - |
| `--mcp-config` | MCP server configuration | - |

## Development

```bash
# Build TypeScript
bun run build:ts

# Build Rust native module
bun run build:native

# Full build
bun run build

# Development mode with watch
bun run dev
```

## License

MIT
