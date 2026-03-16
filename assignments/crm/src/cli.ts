#!/usr/bin/env node

import { createServer } from './mcp/index.js';

async function main() {
  const dbPath = process.env.CRM_DB_PATH ?? './crm.db';

  const server = await createServer({ dbPath });

  await server.start();
}
