# @ebowwa/crm

MCP server, CRM types, schemas, CLI, web interface, and native Rust module for high-performance search.

## Features

- **MCP Server** - Model Context Protocol server for AI integration
- **CLI Tool** - Interactive command-line interface
- **Web Interface** - Bun.serve() with React frontend
- **Native Module** - Rust-based search with Tantivy (optional)
- **TypeScript Types** - Full type definitions with Zod validation

## Installation

```bash
bun add @ebowwa/crm
```

## Usage

### MCP Server

```bash
# Run the MCP server
bunx crm-mcp

# Or programmatically
import { startMcpServer } from '@ebowwa/crm';
await startMcpServer();
```

### CLI Tool

```bash
# Interactive mode
bunx crm-mcp --interactive

# Direct commands
bunx crm-mcp contact list
bunx crm-mcp deal create --title "New Deal" --value 10000
```

### Web Interface

```bash
# Start web server (default: http://localhost:3001)
bunx crm-mcp --web

# Custom port
bunx crm-mcp --web --port 8080
```

### Types & Schemas

```typescript
import {
  Contact,
  contactSchema,
  Deal,
  dealSchema,
  Activity,
  activitySchema
} from '@ebowwa/crm/core';

// Validation
const result = contactSchema.safeParse(data);
if (result.success) {
  console.log('Valid contact:', result.data);
}
```

### Native Search Module

```typescript
import {
  CrmSearchIndex,
  CrmIndexManager,
  isNativeAvailable
} from '@ebowwa/crm/native';

// Check if native module is available
if (isNativeAvailable()) {
  const index = new CrmSearchIndex('/path/to/index');

  // Add documents
  index.addDocument({
    id: 'contact-1',
    entityType: 'contact',
    name: 'John Doe',
    email: 'john@example.com',
    tags: ['vip'],
  });

  index.commit();

  // Search
  const results = index.search({
    query: 'john',
    entityTypes: ['contact'],
    limit: 10,
  });
}
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard/stats` | GET | Dashboard statistics |
| `/api/contacts` | GET/POST | Contact CRUD |
| `/api/deals` | GET/POST | Deal CRUD |
| `/api/activities` | GET/POST | Activity CRUD |
| `/api/companies` | GET/POST | Company CRUD |

## Project Structure

```
crm/
├── src/
│   ├── core/           # Types and schemas
│   ├── mcp/            # MCP server implementation
│   ├── cli/            # CLI commands
│   └── web/            # Web interface
├── native/             # Native module loader + fallbacks
├── rust/               # Rust native module source
├── tests/              # Test files
└── dist/               # Compiled output
```

## Development

```bash
# Install dependencies
bun install

# Build TypeScript
bun run build

# Build native module (optional)
bun run build:native

# Run tests
bun test

# Start development server
bun run dev
```

## License

MIT
