import type { Contact } from '../types';

// In-memory storage (would be replaced with database in production)
export const contactsStore = new Map<string, Contact>();

// Helper to generate IDs
export function generateId(): string {
  return crypto.randomUUID();
}

// List contacts with optional filters
export async function listContacts(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const search = url.searchParams.get('search') || '';
  const status = url.searchParams.get('status') || '';

  let results = Array.from(contactsStore.values());

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

// Create a new contact
export async function createContact(request: Request): Promise<Response> {
  try {
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

    contactsStore.set(id, contact);

    return Response.json({ success: true, data: contact });
  } catch (error) {
    return Response.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

// Get a single contact
export async function getContact(request: Request, params: Record<string, string>): Promise<Response> {
  const contact = contactsStore.get(params.id);
  if (!contact) {
    return Response.json({ success: false, error: 'Contact not found' }, { status: 404 });
  }
  return Response.json({ success: true, data: contact });
}

// Update a contact
export async function updateContact(request: Request, params: Record<string, string>): Promise<Response> {
  const contact = contactsStore.get(params.id);
  if (!contact) {
    return Response.json({ success: false, error: 'Contact not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const updated: Contact = {
      ...contact,
      ...body,
      id: contact.id,
      createdAt: contact.createdAt,
      updatedAt: new Date().toISOString(),
    };

    contactsStore.set(params.id, updated);

    return Response.json({ success: true, data: updated });
  } catch (error) {
    return Response.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

// Delete a contact
export async function deleteContact(request: Request, params: Record<string, string>): Promise<Response> {
  const contact = contactsStore.get(params.id);
  if (!contact) {
    return Response.json({ success: false, error: 'Contact not found' }, { status: 404 });
  }

  contactsStore.delete(params.id);

  return Response.json({ success: true });
}
