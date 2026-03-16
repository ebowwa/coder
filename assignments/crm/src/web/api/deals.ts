import type { Deal } from '../types';
import { generateId } from './contacts';

// In-memory storage (would be replaced with database in production)
export const dealsStore = new Map<string, Deal>();

// List deals with optional filters
export async function listDeals(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const stage = url.searchParams.get('stage') || '';
  const contactId = url.searchParams.get('contactId') || '';

  let results = Array.from(dealsStore.values());

  if (stage) {
    results = results.filter(d => d.stage === stage);
  }

  if (contactId) {
    results = results.filter(d => d.contactId === contactId);
  }

  // Sort by value descending
  results.sort((a, b) => b.value - a.value);

  return Response.json({ success: true, data: results });
}

// Create a new deal
export async function createDeal(request: Request): Promise<Response> {
  try {
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

    dealsStore.set(id, deal);

    return Response.json({ success: true, data: deal });
  } catch (error) {
    return Response.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

// Get a single deal
export async function getDeal(request: Request, params: Record<string, string>): Promise<Response> {
  const deal = dealsStore.get(params.id);
  if (!deal) {
    return Response.json({ success: false, error: 'Deal not found' }, { status: 404 });
  }
  return Response.json({ success: true, data: deal });
}

// Update a deal
export async function updateDeal(request: Request, params: Record<string, string>): Promise<Response> {
  const deal = dealsStore.get(params.id);
  if (!deal) {
    return Response.json({ success: false, error: 'Deal not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const updated: Deal = {
      ...deal,
      ...body,
      id: deal.id,
      createdAt: deal.createdAt,
      updatedAt: new Date().toISOString(),
    };

    dealsStore.set(params.id, updated);

    return Response.json({ success: true, data: updated });
  } catch (error) {
    return Response.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

// Delete a deal
export async function deleteDeal(request: Request, params: Record<string, string>): Promise<Response> {
  const deal = dealsStore.get(params.id);
  if (!deal) {
    return Response.json({ success: false, error: 'Deal not found' }, { status: 404 });
  }

  dealsStore.delete(params.id);

  return Response.json({ success: true });
}
