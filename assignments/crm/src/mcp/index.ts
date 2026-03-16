/**
 * MCP module exports
 */

export { CRMStorageClient } from './storage/client.js';
export type { StorageConfig, EntityType, StorageStats } from './storage/types.js';
export { CRMError, ValidationError, NotFoundError, DuplicateError } from './storage/types.js';

export { ToolHandlers } from './tools/handlers.js';
export { TOOL_DEFINITIONS } from './tools/definitions.js';
export { getToolDefinition, listToolNames } from './tools/definitions.js';
export type { ToolInput, ToolOutput } from './tools/types.js';
export type * from './tools/types.js';

export { StdioServer } from './transports/stdio.js';

export { createServer } from './server.js';
