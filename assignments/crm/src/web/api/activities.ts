import type { Activity } from '../types';
import { generateId } from './contacts';
import { contactsStore } from './contacts';
import { dealsStore } from './deals';

// In-memory storage (would be replaced with database in production)
export const activitiesStore: Activity[] = [];

// List activities
export async function listActivities(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '100');
  const type = url.searchParams.get('type') || '';

  let results = activitiesStore.slice(0, limit);

  if (type) {
    results = results.filter(a => a.type === type);
  }

  return Response.json({ success: true, data: results });
}

// Create activity
export async function createActivity(data: Omit<Activity['id']>): Promise<Activity> {
  const id = generateId();
  const activity: Activity = {
    id,
    type: data.type || 'note',
    description: data.description,
    contactId: data.contactId,
    dealId: data.dealId,
    userId: data.userId || 'system',
    timestamp: new Date().toISOString(),
    metadata: data.metadata,
  };

  activitiesStore.unshift(activity);

  return activity;
}
