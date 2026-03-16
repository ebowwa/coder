import index from "./index.html";
import type { ServerWebSocket } from "bun";
import type { Contact, Deal, Activity, Media, WSMessage } from "./types";

// In-memory storage (would be replaced with database)
const contacts: Map<string, Contact> = new Map();
const deals: Map<string, Deal> = new Map();
const activities: Activity[] = [];
const mediaFiles: Map<string, Media> = new Map();
const connectedClients: Set<ServerWebSocket> = new Set();

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

  let results = Array.from(contacts.values());

  if (search) {
    const searchLower = search.toLowerCase();
    results = results.filter(c =>
      c.name.toLowerCase().includes(searchLower) ||
      c.email.toLowerCase().includes(searchLower) ||
      c.company?.toLowerCase().includes(searchLower)
    );
  }

  if (status) {
    results = results.filter(c => c.status === status);
  }

  return Response.json({ success: true, data: results });
}

async function createContact(request: Request): Promise<Response> {
  const body = await request.json();
  const id = generateId();
  const now = new Date().toISOString();

  const contact: Contact = {
    id,
    name: body.name,
    email: body.email,
    phone: body.phone,
    company: body.company,
    title: body.title,
    status: body.status || 'lead',
    tags: body.tags || [],
    notes: body.notes,
    createdAt: now,
    updatedAt: now,
  };

  contacts.set(id, contact);

  // Create activity
  const activity: Activity = {
    id: generateId(),
    type: 'contact',
    description: `New contact created: ${contact.name}`,
    contactId: id,
    userId: 'system',
    timestamp: now,
  };
  activities.unshift(activity);

  broadcast({ type: 'contact_update', payload: contact });

  return Response.json({ success: true, data: contact });
}

async function getContact(request: Request, params: Record<string, string>): Promise<Response> {
  const contact = contacts.get(params.id);
  if (!contact) {
    return Response.json({ success: false, error: 'Contact not found' }, { status: 404 });
  }
  return Response.json({ success: true, data: contact });
}

async function updateContact(request: Request, params: Record<string, string>): Promise<Response> {
  const contact = contacts.get(params.id);
  if (!contact) {
    return Response.json({ success: false, error: 'Contact not found' }, { status: 404 });
  }

  const body = await request.json();
  const updated: Contact = {
    ...contact,
    ...body,
    id: contact.id,
    createdAt: contact.createdAt,
    updatedAt: new Date().toISOString(),
  };

  contacts.set(params.id, updated);

  const activity: Activity = {
    id: generateId(),
    type: 'contact',
    description: `Contact updated: ${updated.name}`,
    contactId: updated.id,
    userId: 'system',
    timestamp: updated.updatedAt,
  };
  activities.unshift(activity);

  broadcast({ type: 'contact_update', payload: updated });

  return Response.json({ success: true, data: updated });
}

async function deleteContact(request: Request, params: Record<string, string>): Promise<Response> {
  const contact = contacts.get(params.id);
  if (!contact) {
    return Response.json({ success: false, error: 'Contact not found' }, { status: 404 });
  }

  contacts.delete(params.id);

  broadcast({ type: 'contact_update', payload: { id: params.id, deleted: true } });

  return Response.json({ success: true });
}

async function listDeals(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const stage = url.searchParams.get('stage') || '';

  let results = Array.from(deals.values());

  if (stage) {
    results = results.filter(d => d.stage === stage);
  }

  return Response.json({ success: true, data: results });
}

async function createDeal(request: Request): Promise<Response> {
  const body = await request.json();
  const id = generateId();
  const now = new Date().toISOString();

  const deal: Deal = {
    id,
    contactId: body.contactId,
    title: body.title,
    value: body.value,
    currency: body.currency || 'USD',
    stage: body.stage || 'discovery',
    probability: body.probability || 10,
    expectedCloseDate: body.expectedCloseDate,
    description: body.description,
    createdAt: now,
    updatedAt: now,
  };

  deals.set(id, deal);

  const activity: Activity = {
    id: generateId(),
    type: 'deal',
    description: `New deal created: ${deal.title}`,
    dealId: id,
    userId: 'system',
    timestamp: now,
  };
  activities.unshift(activity);

  broadcast({ type: 'deal_update', payload: deal });

  return Response.json({ success: true, data: deal });
}

async function listActivities(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50');

  return Response.json({
    success: true,
    data: activities.slice(0, limit)
  });
}

async function uploadMedia(request: Request): Promise<Response> {
  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return Response.json({ success: false, error: 'No file provided' }, { status: 400 });
  }

  const id = generateId();
  const now = new Date().toISOString();

  // Store file (in production, this would go to S3, etc.)
  const buffer = await file.arrayBuffer();
  const uploadsDir = './uploads';
  await Bun.write(`${uploadsDir}/${id}-${file.name}`, buffer);

  const media: Media = {
    id,
    filename: file.name,
    mimetype: file.type,
    size: file.size,
    url: `/media/${id}`,
    contactId: formData.get('contactId') as string || undefined,
    dealId: formData.get('dealId') as string || undefined,
    uploadedBy: 'system',
    uploadedAt: now,
  };

  mediaFiles.set(id, media);

  broadcast({ type: 'media_upload', payload: media });

  return Response.json({ success: true, data: media });
}

async function getDashboardStats(): Promise<Response> {
  const totalContacts = contacts.size;
  const activeDeals = Array.from(deals.values()).filter(d =>
    !d.stage.startsWith('closed_')
  ).length;
  const pipelineValue = Array.from(deals.values())
    .filter(d => !d.stage.startsWith('closed_'))
    .reduce((sum, d) => sum + d.value, 0);
  const wonThisMonth = Array.from(deals.values())
    .filter(d => d.stage === 'closed_won')
    .reduce((sum, d) => sum + d.value, 0);

  return Response.json({
    success: true,
    data: {
      totalContacts,
      activeDeals,
      pipelineValue,
      wonThisMonth,
      activitiesToday: activities.filter(a =>
        new Date(a.timestamp).toDateString() === new Date().toDateString()
      ).length,
      conversionRate: totalContacts > 0 ? (activeDeals / totalContacts) * 100 : 0,
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
