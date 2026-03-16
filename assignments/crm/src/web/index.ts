import index from "./index.html";
import type { ServerWebSocket } from "bun";
import type { Contact, Deal, Activity, Media, WSMessage } from "./types";
import { CRMStorageClient } from "../mcp/storage/client.js";

// Persistent storage client
let storage: CRMStorageClient | null = null;

// Connected WebSocket clients
const connectedClients: Set<ServerWebSocket> = new Set();

/**
 * Initialize storage and return when ready
 */
async function getStorage(): Promise<CRMStorageClient> {
  if (!storage) {
    storage = new CRMStorageClient({
      path: process.env.CRM_DB_PATH || "./data/crm-web",
      mapSize: 512 * 1024 * 1024, // 512MB
      maxDbs: 20,
    });
    await storage.initialize();
    console.log("CRM storage initialized at", process.env.CRM_DB_PATH || "./data/crm-web");
  }
  return storage;
}

// WebSocket message broadcasting
function broadcast(message: WSMessage) {
  const payload = JSON.stringify({ ...message, timestamp: new Date().toISOString() });
  for (const client of connectedClients) {
    client.send(payload);
  }
}

// Helper to generate IDs
function generateId(): string {
  return crypto.randomUUID();
}

// API Handlers
async function listContacts(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const search = url.searchParams.get('search') || '';
  const status = url.searchParams.get('status') || '';

  const store = await getStorage();
  let results = store.list('contacts');

  if (search) {
    const searchLower = search.toLowerCase();
    results = results.filter((c: { name?: string; email?: string; company?: string }) =>
      (c.name?.toLowerCase() ?? '').includes(searchLower) ||
      (c.email?.toLowerCase() ?? '').includes(searchLower) ||
      (c.company?.toLowerCase() ?? '').includes(searchLower)
    );
  }

  if (status) {
    results = results.filter((c: { status?: string }) => c.status === status);
  }

  return Response.json({ success: true, data: results });
}

async function createContact(request: Request): Promise<Response> {
  const body = await request.json();
  const store = await getStorage();

  const contact = await store.insert('contacts', {
    name: body.name,
    email: body.email,
    phone: body.phone,
    company: body.company,
    title: body.title,
    status: body.status || 'lead',
    tags: body.tags || [],
    notes: body.notes,
  });

  // Create activity
  await store.insert('activities', {
    type: 'contact',
    description: `New contact created: ${contact.name}`,
    contactId: contact.id,
    userId: 'system',
  });

  broadcast({ type: 'contact_update', payload: contact });

  return Response.json({ success: true, data: contact });
}

async function getContact(request: Request, params: Record<string, string>): Promise<Response> {
  const store = await getStorage();
  const contact = store.get('contacts', params.id);
  if (!contact) {
    return Response.json({ success: false, error: 'Contact not found' }, { status: 404 });
  }
  return Response.json({ success: true, data: contact });
}

async function updateContact(request: Request, params: Record<string, string>): Promise<Response> {
  const store = await getStorage();
  const existing = store.get('contacts', params.id);
  if (!existing) {
    return Response.json({ success: false, error: 'Contact not found' }, { status: 404 });
  }

  const body = await request.json();
  const updated = await store.update('contacts', params.id, body);

  // Create activity
  await store.insert('activities', {
    type: 'contact',
    description: `Contact updated: ${updated.name}`,
    contactId: updated.id,
    userId: 'system',
  });

  broadcast({ type: 'contact_update', payload: updated });

  return Response.json({ success: true, data: updated });
}

async function deleteContact(request: Request, params: Record<string, string>): Promise<Response> {
  const store = await getStorage();
  const existing = store.get('contacts', params.id);
  if (!existing) {
    return Response.json({ success: false, error: 'Contact not found' }, { status: 404 });
  }

  await store.delete('contacts', params.id);

  broadcast({ type: 'contact_update', payload: { id: params.id, deleted: true } });

  return Response.json({ success: true });
}

async function listDeals(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const stage = url.searchParams.get('stage') || '';

  const store = await getStorage();
  let results = store.list('deals');

  if (stage) {
    results = results.filter((d: { stage?: string }) => d.stage === stage);
  }

  return Response.json({ success: true, data: results });
}

async function createDeal(request: Request): Promise<Response> {
  const body = await request.json();
  const store = await getStorage();

  const deal = await store.insert('deals', {
    contactId: body.contactId,
    title: body.title,
    value: body.value,
    currency: body.currency || 'USD',
    stage: body.stage || 'discovery',
    probability: body.probability || 10,
    expectedCloseDate: body.expectedCloseDate,
    description: body.description,
  });

  // Create activity
  await store.insert('activities', {
    type: 'deal',
    description: `New deal created: ${deal.title}`,
    dealId: deal.id,
    userId: 'system',
  });

  broadcast({ type: 'deal_update', payload: deal });

  return Response.json({ success: true, data: deal });
}

async function listActivities(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50');

  const store = await getStorage();
  const activities = store.list('activities', { limit });

  return Response.json({
    success: true,
    data: activities
  });
}

async function uploadMedia(request: Request): Promise<Response> {
  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return Response.json({ success: false, error: 'No file provided' }, { status: 400 });
  }

  const store = await getStorage();

  // Store file (in production, this would go to S3, etc.)
  const buffer = await file.arrayBuffer();
  const uploadsDir = './uploads';
  await Bun.write(`${uploadsDir}/${crypto.randomUUID()}-${file.name}`, buffer);

  const media = await store.insert('media', {
    filename: file.name,
    mimetype: file.type,
    size: file.size,
    url: `/media/${crypto.randomUUID()}`,
    contactId: formData.get('contactId') as string || undefined,
    dealId: formData.get('dealId') as string || undefined,
    uploadedBy: 'system',
  });

  broadcast({ type: 'media_upload', payload: media });

  return Response.json({ success: true, data: media });
}

async function getDashboardStats(): Promise<Response> {
  const store = await getStorage();
  const stats = store.getStats();
  const deals = store.list('deals');
  const activities = store.list('activities', { limit: 1000 });

  const activeDeals = deals.filter((d: { stage?: string }) =>
    !d.stage?.startsWith('closed_')
  ).length;

  const pipelineValue = deals
    .filter((d: { stage?: string }) => !d.stage?.startsWith('closed_'))
    .reduce((sum: number, d: { value?: number }) => sum + (d.value || 0), 0);

  const wonThisMonth = deals
    .filter((d: { stage?: string }) => d.stage === 'closed_won')
    .reduce((sum: number, d: { value?: number }) => sum + (d.value || 0), 0);

  const activitiesToday = activities.filter((a: { timestamp?: string }) =>
    a.timestamp && new Date(a.timestamp).toDateString() === new Date().toDateString()
  ).length;

  return Response.json({
    success: true,
    data: {
      totalContacts: stats.contacts,
      activeDeals,
      pipelineValue,
      wonThisMonth,
      activitiesToday,
      conversionRate: stats.contacts > 0 ? (activeDeals / stats.contacts) * 100 : 0,
    }
  });
}

// WebSocket handler
const websocketHandler = {
  open(ws: ServerWebSocket) {
    connectedClients.add(ws);
    ws.send(JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() }));
    console.log('WebSocket client connected');
  },
  message(ws: ServerWebSocket, message: string | Buffer) {
    // Handle incoming WebSocket messages
    try {
      const data = JSON.parse(message.toString());
      console.log('WebSocket message:', data);
      // Echo back or broadcast as needed
    } catch (e) {
      console.error('Invalid WebSocket message:', e);
    }
  },
  close(ws: ServerWebSocket) {
    connectedClients.delete(ws);
    console.log('WebSocket client disconnected');
  },
};

// Server
const server = Bun.serve({
  port: 3001,
  routes: {
    "/": index,
    "/api/contacts": {
      GET: listContacts,
      POST: createContact,
    },
    "/api/contacts/:id": {
      GET: getContact,
      PUT: updateContact,
      DELETE: deleteContact,
    },
    "/api/deals": {
      GET: listDeals,
      POST: createDeal,
    },
    "/api/activities": {
      GET: listActivities,
    },
    "/api/media": {
      POST: uploadMedia,
    },
    "/api/dashboard/stats": {
      GET: getDashboardStats,
    },
  },
  websocket: websocketHandler,
  development: {
    hmr: true,
    console: true,
  },
});

// Ensure uploads directory exists
Bun.file('./uploads').exists().then(async (exists) => {
  if (!exists) {
    await Bun.write('./uploads/.gitkeep', '');
  }
});

console.log(`CRM Web Interface running at http://localhost:${server.port}`);
console.log('WebSocket endpoint: ws://localhost:3001/ws');
