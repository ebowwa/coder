/**
 * Tests for MCP tools
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { CRMStorage, Contact, Deal, Activity, Media, Tag } from '../../src/core/types.js';

import {
  uuidSchema,
  timestampSchema,
  contactSchema,
  createContactSchema,
  updateContactSchema,
  dealSchema,
  createDealSchema,
  updateDealSchema,
  activitySchema,
  createActivitySchema,
  mediaSchema,
  createMediaSchema,
  tagSchema,
  createTagSchema,
  contactFilterSchema,
  dealFilterSchema,
  paginationSchema,
  dateRangeSchema,
} from '../../src/core/schemas.js';

// ============================================================================
// Mock Storage Implementation
// ============================================================================

class MockStorage implements CRMStorage {
  private contacts = new Map<string, Contact>();
  private deals = new Map<string, Deal>();
  private activities = new Map<string, Activity>();
  private media = new Map<string, Media>();
  private tags = new Map<string, Tag>();

  // Contacts
  async getContact(id: string): Promise<Contact | null> {
    return this.contacts.get(id) ?? null;
  }

  async listContacts(options?: { limit?: number; offset?: number; query?: string }): Promise<Contact[]> {
    let results = Array.from(this.contacts.values());
    if (options?.query) {
      const q = options.query.toLowerCase();
      results = results.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.emails.some(e => e.email.toLowerCase().includes(q))
      );
    }
    return results.slice(options?.offset ?? 0, options?.limit ?? 100);
  }

  async createContact(data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contact> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const contact: Contact = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.contacts.set(id, contact);
    return contact;
  }

  async updateContact(id: string, data: Partial<Contact>): Promise<Contact | null> {
    const existing = this.contacts.get(id);
    if (!existing) return null;

    const updated: Contact = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.contacts.set(id, updated);
    return updated;
  }

  async deleteContact(id: string): Promise<boolean> {
    return this.contacts.delete(id);
  }

  // Deals
  async getDeal(id: string): Promise<Deal | null> {
    return this.deals.get(id) ?? null;
  }

  async listDeals(options?: { limit?: number; offset?: number; contactId?: string; stage?: string }): Promise<Deal[]> {
    let results = Array.from(this.deals.values());
    if (contactId) {
      results = results.filter(d => d.contactId === contactId);
    }
    if (stage) {
      results = results.filter(d => d.stage === stage);
    }
    return results.slice(options?.offset ?? 0, options?.limit ?? 100);
  }

  async createDeal(data: Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Deal> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const deal: Deal = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.deals.set(id, deal);
    return deal;
  }

  async updateDeal(id: string, data: Partial<Deal>): Promise<Deal | null> {
    const existing = this.deals.get(id);
    if (!existing) return null;

    const updated: Deal = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.deals.set(id, updated);
    return updated;
  }

  async deleteDeal(id: string): Promise<boolean> {
    return this.deals.delete(id);
  }

  // Activities
  async getActivity(id: string): Promise<Activity | null> {
    return this.activities.get(id) ?? null;
  }

  async listActivities(options?: { limit?: number; offset?: number; contactId?: string; dealId?: string }): Promise<Activity[]> {
    let results = Array.from(this.activities.values());
    if (contactId) {
      results = results.filter(a => a.contactId === contactId);
    }
    if (dealId) {
      results = results.filter(a => a.dealId === dealId);
    }
    return results.slice(options?.offset ?? 0, options?.limit ?? 100);
  }

  async createActivity(data: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>): Promise<Activity> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const activity: Activity = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.activities.set(id, activity);
    return activity;
  }

  // Media
  async getMedia(id: string): Promise<Media | null> {
    return this.media.get(id) ?? null;
  }

  async listMedia(options?: { limit?: number; offset?: number; entityId?: string }): Promise<Media[]> {
    let results = Array.from(this.media.values());
    if (entityId) {
      results = results.filter(m => m.entityId === entityId);
    }
    return results.slice(options?.offset ?? 0, options?.limit ?? 100);
  }

  async uploadMedia(data: Omit<Media, 'id' | 'createdAt' | 'updatedAt'>): Promise<Media> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const media: Media = {
      ...data,
      id,
      createdAt: now,
    };
    this.media.set(id, media);
    return media;
  }

  async deleteMedia(id: string): Promise<boolean> {
    return this.media.delete(id);
  }

  // Search
  async search(query: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const q = query.toLowerCase();

    // Search contacts
    for (const contact of this.contacts.values()) {
      if (
        contact.name.toLowerCase().includes(q) ||
        contact.emails.some(e => e.email.toLowerCase().includes(q))
      ) {
        results.push({
          type: 'contact',
          id: contact.id,
          score: 1,
          data: contact,
        });
      }
    }

    // Search deals
    for (const deal of this.deals.values()) {
      if (deal.title.toLowerCase().includes(q)) {
        results.push({
          type: 'deal',
          id: deal.id,
          score: 1,
          data: deal,
        });
      }
    }

    return results;
  }

  // Stats
  async getStats(): Promise<{
    contacts: number;
    deals: number;
    activities: number;
    media: number;
  }> {
    return {
      contacts: this.contacts.size,
      deals: this.deals.size,
      activities: this.activities.size,
      media: this.media.size,
    };
  }
}

// ============================================================================
// MCP Tool Handlers Tests
// ============================================================================

describe('MCP Tool Handlers', () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
  });

  describe('Contact Tools', () => {
    test('should create a contact', async () => {
      const contact = await storage.createContact({
        name: 'Test User',
        emails: [{ email: 'test@example.com', type: 'work', primary: true }],
        phones: [],
        addresses: [],
        socialProfiles: [],
        tags: [],
        customFields: [],
        status: 'lead',
        doNotContact: false,
      });

      expect(contact).toBeDefined();
      expect(contact.id).toBeDefined();
      expect(contact.name).toBe('Test User');
      expect(contact.status).toBe('lead');
    });

    test('should get a contact by id', async () => {
      const created = await storage.createContact({
        name: 'Find Me',
        emails: [],
        phones: [],
        addresses: [],
        socialProfiles: [],
        tags: [],
        customFields: [],
        status: 'prospect',
        doNotContact: false,
      });

      const found = await storage.getContact(created.id);
      expect(found).toBeDefined();
      expect(found?.name).toBe('Find Me');
    });

    test('should return null for non-existent contact', async () => {
      const found = await storage.getContact('non-existent-id');
      expect(found).toBeNull();
    });

    test('should list contacts', async () => {
      await storage.createContact({
        name: 'User One',
        emails: [],
        phones: [],
        addresses: [],
        socialProfiles: [],
        tags: [],
        customFields: [],
        status: 'customer',
        doNotContact: false,
      });
      await storage.createContact({
        name: 'User Two',
        emails: [],
        phones: [],
        addresses: [],
        socialProfiles: [],
        tags: [],
        customFields: [],
        status: 'lead',
        doNotContact: false,
      });

      const contacts = await storage.listContacts();
      expect(contacts.length).toBeGreaterThanOrEqual(2);
    });

    test('should filter contacts by status', async () => {
      // Clear existing
      storage.listContacts().then(contacts => contacts.forEach(c => storage.deleteContact(c.id)));

      await storage.createContact({
        name: 'Customer One',
        emails: [],
        phones: [],
        addresses: [],
        socialProfiles: [],
        tags: [],
        customFields: [],
        status: 'customer',
        doNotContact: false,
      });
      await storage.createContact({
        name: 'Lead One',
        emails: [],
        phones: [],
        addresses: [],
        socialProfiles: [],
        tags: [],
        customFields: [],
        status: 'lead',
        doNotContact: false,
      });

      const contacts = await storage.listContacts();
      const customers = contacts.filter(c => c.status === 'customer');
      expect(customers.length).toBe(1);
    });

    test('should update a contact', async () => {
      const created = await storage.createContact({
        name: 'Update Me',
        emails: [],
        phones: [],
        addresses: [],
        socialProfiles: [],
        tags: [],
        customFields: [],
        status: 'lead',
        doNotContact: false,
      });

      const updated = await storage.updateContact(created.id, {
        name: 'Updated Name',
        status: 'customer',
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.status).toBe('customer');
    });

    test('should delete a contact', async () => {
      const created = await storage.createContact({
        name: 'Delete Me',
        emails: [],
        phones: [],
        addresses: [],
        socialProfiles: [],
        tags: [],
        customFields: [],
        status: 'lead',
        doNotContact: false,
      });

      const deleted = await storage.deleteContact(created.id);
      expect(deleted).toBe(true);

      const found = await storage.getContact(created.id);
      expect(found).toBeNull();
    });
  });

  describe('Deal Tools', () => {
    test('should create a deal', async () => {
      const contact = await storage.createContact({
        name: 'Deal Contact',
        emails: [],
        phones: [],
        addresses: [],
        socialProfiles: [],
        tags: [],
        customFields: [],
        status: 'customer',
        doNotContact: false,
      });

      const deal = await storage.createDeal({
        title: 'Test Deal',
        contactId: contact.id,
        value: 10000,
        currency: 'USD',
        stage: 'prospecting',
        probability: 50,
        expectedClose: '2024-12-31T23:59:59Z',
        lineItems: [],
        notes: '',
        tags: [],
        competitors: [],
        customFields: [],
        totalValue: 10000,
      });

      expect(deal).toBeDefined();
      expect(deal.id).toBeDefined();
      expect(deal.title).toBe('Test Deal');
    });

    test('should get a deal by id', async () => {
      const contact = await storage.createContact({
        name: 'Deal Contact 2',
        emails: [],
        phones: [],
        addresses: [],
        socialProfiles: [],
        tags: [],
        customFields: [],
        status: 'customer',
        doNotContact: false,
      });

      const created = await storage.createDeal({
        title: 'Find Deal',
        contactId: contact.id,
        value: 5000,
        currency: 'USD',
        stage: 'proposal',
        probability: 75,
        expectedClose: '2024-06-30T23:59:59Z',
        lineItems: [],
        notes: '',
        tags: [],
        competitors: [],
        customFields: [],
        totalValue: 5000,
      });

      const found = await storage.getDeal(created.id);
      expect(found).toBeDefined();
      expect(found?.title).toBe('Find Deal');
    });

    test('should update deal stage', async () => {
      const contact = await storage.createContact({
        name: 'Deal Contact 3',
        emails: [],
        phones: [],
        addresses: [],
        socialProfiles: [],
        tags: [],
        customFields: [],
        status: 'customer',
        doNotContact: false,
      });

      const created = await storage.createDeal({
        title: 'Update Deal',
        contactId: contact.id,
        value: 20000,
        currency: 'USD',
        stage: 'prospecting',
        probability: 25,
        expectedClose: '2024-06-30T23:59:59Z',
        lineItems: [],
        notes: '',
        tags: [],
        competitors: [],
        customFields: [],
        totalValue: 20000,
      });

      const updated = await storage.updateDeal(created.id, {
        stage: 'closed_won',
        probability: 100,
      });

      expect(updated).toBeDefined();
      expect(updated?.stage).toBe('closed_won');
      expect(updated?.probability).toBe(100);
    });

  });

});

// ============================================================================
// Search Tests
// ============================================================================

describe('Search', () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
  });

  test('should search across contacts and deals', async () => {
    await storage.createContact({
      name: 'John Smith',
      emails: [{ email: 'john@smith.com', type: 'work', primary: true }],
      phones: [],
      addresses: [],
      socialProfiles: [],
      tags: [],
      customFields: [],
      status: 'customer',
      doNotContact: false,
    });

    const contact = await storage.createContact({
      name: 'Jane Doe',
      emails: [{ email: 'jane@doe.com', type: 'work', primary: true }],
      phones: [],
      addresses: [],
      socialProfiles: [],
      tags: [],
      customFields: [],
      status: 'prospect',
      doNotContact: false,
    });

    await storage.createDeal({
      title: 'Jane Doe Deal',
      contactId: contact.id,
      value: 15000,
      currency: 'USD',
      stage: 'proposal',
      probability: 80,
      expectedClose: '2024-03-15T23:59:59Z',
      lineItems: [],
      notes: '',
      tags: [],
      competitors: [],
      customFields: [],
      totalValue: 15000,
    });

    const results = await storage.search('jane');
    expect(results.length).toBe(2); // Contact and Deal

    expect(results.some(r => r.type === 'contact')).toBe(true);
    expect(results.some(r => r.type === 'deal')).toBe(true);
  });
});
