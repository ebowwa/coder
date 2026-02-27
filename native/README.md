# @ebowwa/claude-code-native

Native Rust modules for [Claude Code Remake](https://github.com/ebowwa/codespaces).

## Features

- **Fast Search**: Ripgrep-based file and content search
- **Token Counting**: Efficient token counting for LLM contexts
- **Diff Calculation**: Fast diff generation and application
- **Content Compaction**: Smart content compaction for context windows

## Installation

```bash
bun add @ebowwa/claude-code-native
# or
npm install @ebowwa/claude-code-native
```

## Supported Platforms

- macOS x64 (Intel)
- macOS arm64 (Apple Silicon)
- Linux x64 (GNU)
- Windows x64 (MSVC)

## Usage

```javascript
const native = require('@ebowwa/claude-code-native');

// Search files
const results = native.searchFiles('pattern', '/path/to/search');

// Count tokens
const tokens = native.countTokens('some text content');

// Compute diff
const diff = native.computeDiff(oldText, newText);
```

## Building from Source

Requires Rust and Cargo:

```bash
cd rust
cargo build --release
```

## License

MIT
