# @ebowwa/coder-native

Native Rust modules for [@ebowwa/coder](https://github.com/ebowwa/coder).

## Features

- **Fast Search**: Ripgrep-based file and content search
- **Token Counting**: Efficient token counting for LLM contexts
- **Diff Calculation**: Fast diff generation and application
- **Content Compaction**: Smart content compaction for context windows

## Installation

```bash
bun add @ebowwa/coder-native
# or
npm install @ebowwa/coder-native
```

## Supported Platforms

- macOS x64 (Intel)
- macOS arm64 (Apple Silicon)
- Linux x64 (GNU)
- Windows x64 (MSVC)

## Usage

```javascript
const native = require('@ebowwa/coder-native');

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
