# @ebowwa/coder

An AI-powered terminal coding assistant built with TypeScript + Bun + Rust.

## Installation

```bash
# Install globally
npm install -g @ebowwa/coder

# Or with bun
bun add -g @ebowwa/coder
```

## Usage

### CLI

```bash
# Interactive mode
coder

# Single query
coder "What files are in this directory?"

# With specific model
coder -m glm-5 "Explain this codebase"

# With permission mode
coder --permission-mode acceptEdits "Add a test"
```

### Programmatic

```typescript
import { createMessageStream, agentLoop, tools } from "@ebowwa/coder";

// Stream API messages
const result = await createMessageStream(messages, {
  apiKey: process.env.API_KEY,
  model: "glm-5",
  onToken: (text) => process.stdout.write(text),
});

// Run agent loop
const agentResult = await agentLoop(messages, {
  apiKey: process.env.API_KEY,
  systemPrompt: "You are a helpful assistant.",
  tools: [tools.ReadTool, tools.WriteTool, tools.BashTool],
  permissionMode: "default",
  workingDirectory: process.cwd(),
});
```

## Features

- **API Client**: SSE streaming with cost calculation
- **Agent Loop**: Turn-based processing with tool execution
- **Built-in Tools**: Read, Write, Edit, Bash, Glob, Grep
- **MCP Client**: Model Context Protocol support (stdio, HTTP, SSE, WebSocket)
- **Hook System**: 10 lifecycle events for customization
- **Skill System**: YAML frontmatter skills with `/skillname` invocation
- **Teammate System**: Multi-agent coordination with tmux backend
- **Native Module**: Rust-based performance for critical operations

## Native Modules (Rust)

The `@ebowwa/coder-native` package provides high-performance operations:

| Module | Description |
|--------|-------------|
| **grep** | Ripgrep-based file search with regex support |
| **hash** | xxHash3/SHA-256 content hashing |
| **highlight** | Syntax highlighting with syntect |
| **structure** | Tree-sitter code structure parsing |
| **patterns** | Tool usage pattern analysis |
| **multi_edit** | Batch file editing with validation |

## Project Structure

```
coder/
├── packages/
│   ├── src/
│   │   ├── types/          # TypeScript type definitions
│   │   ├── core/           # API client, agent loop, checkpoints
│   │   ├── tools/          # Built-in tools (Read, Write, Edit, Bash, etc.)
│   │   ├── mcp/            # MCP client implementation
│   │   ├── hooks/          # Hook system for lifecycle events
│   │   ├── skills/         # Skill parsing and invocation
│   │   ├── teammates/      # Multi-agent coordination
│   │   ├── native/         # Native module loader
│   │   └── interfaces/     # CLI and UI interfaces
│   └── rust/
│       └── src/
│           ├── grep.rs     # Ripgrep-based file search
│           ├── hash.rs     # Content hashing (xxHash3, SHA-256)
│           ├── highlight.rs # Syntax highlighting
│           ├── structure.rs # Tree-sitter parsing
│           ├── patterns.rs  # Tool pattern analysis
│           ├── multi_edit.rs # Batch file operations
│           └── diff.rs     # Diff calculation
├── native/             # Compiled native modules
└── dist/               # Build output
```

## Configuration

### Environment Variables

- `API_KEY` - API key for your LLM provider

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `-m, --model` | Model to use | glm-5 |
| `-p, --permission-mode` | Permission mode | default |
| `--max-tokens` | Maximum output tokens | 4096 |
| `--system-prompt` | Override system prompt | - |
| `--mcp-config` | MCP server configuration | - |

## Development

```bash
# Install dependencies
bun install

# Build TypeScript
bun run build:ts

# Build Rust native module
bun run build:native

# Full build
bun run build

# Development mode with watch
bun run dev

# Run tests
bun test
```

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [@ebowwa/coder](https://www.npmjs.com/package/@ebowwa/coder) | 0.2.1 | Main CLI package |
| [@ebowwa/coder-native](https://www.npmjs.com/package/@ebowwa/coder-native) | 0.2.1 | Native Rust modules |

## License

MIT
