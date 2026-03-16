/**
 * CRM MCP Server factory
 */

import { CRMStorageClient } from './storage/client.js';
import type { StorageConfig } from './storage/types.js';
import { StdioServer } from './transports/stdio.js';

/**
 * Create and initialize a CRM MCP server
 */
export async function createServer(options: {
  dbPath: string;
  mapSize?: number;
  maxDbs?: number;
}): Promise<StdioServer> {
  const storage = new CRMStorageClient({
    path: options.dbPath,
    mapSize: options.mapSize,
    maxDbs: options.maxDbs,
  });

  await storage.initialize();

  return new StdioServer(storage);
}
