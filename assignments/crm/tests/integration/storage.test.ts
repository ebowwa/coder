/**
 * Integration Tests for CRM Storage Client
 * Tests for insert, get, update, delete, list operations and index lookups
 */

import { describe, test, beforeAll, afterAll, expect } from 'bun:test';
import { CRMStorageClient } from '../../src/mcp/storage/client.js';
import type { Contact, Deal, Activity } from '../../src/core/types.js';
import type { StorageConfig } from '../../src/mcp/storage/types.js';
import { rmSync, mkdirSync, existsSync } from 'node:fs';

const TEST_DB_PATH = './test-db-storage';

describe('CRMStorageClient', () => {
  let client: CRMStorageClient;
  let config: StorageConfig;

  beforeAll(async () => {
    // Clean up any existing test database
    if (existsSync(TEST_DB_PATH)) {
      rmSync(TEST_DB_PATH, { recursive: true, force: true });
    }
    mkdirSync(TEST_DB_PATH, { recursive: true });

    config = {
      path: TEST_DB_PATH,
      mapSize: 10 * 1024 * 1024, // 10MB for tests
      maxDbs: 20,
    };

    client = new CRMStorageClient(config);
    await client.initialize();
  });

  afterAll(async () => {
    await client.close();
    // Clean up test database
    if (existsSync(TEST_DB_PATH)) {
      rmSync(TEST_DB_PATH, { recursive: true, force: true });
    }
  });

  describe('insert', () => {
    test('should insert a contact with auto-generated id and timestamps', async () => {
      const contactData = {
        name: 'John Doe',
        emails: [{ email: 'john@example.com', type: 'personal', primary: true }],
        phones: [],
        addresses: [],
        socialProfiles: [],
        tags: ['vip'],
        customFields: [],
        status: 'lead' as const,
        doNotContact: false,
      };

      const contact = await client.insert<Contact>('contacts', contactData);

      expect(contact.id).toBeDefined();
      expect(contact.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(contact.name).toBe('John Doe');
      expect(contact.createdAt).toBeDefined();
      expect(contact.updatedAt).toBeDefined();
      expect(contact.emails[0].email).toBe('john@example.com');
    });

    test('should insert a deal with auto-generated id and timestamps', async () => {
      const dealData = {
        title: 'Enterprise License',
        contactId: crypto.randomUUID(),
        value: 50000,
        currency: 'USD' as const,
        stage: 'prospecting' as const,
        probability: 20,
        expectedClose: new Date().toISOString(),
        notes: 'Big opportunity',
        tags: [],
        competitors: [],
        lineItems: [],
        customFields: [],
        totalValue: 50000,
      };

      const deal = await client.insert<Deal>('deals', dealData);

      expect(deal.id).toBeDefined();
      expect(deal.title).toBe('Enterprise License');
      expect(deal.value).toBe(50000);
      expect(deal.stage).toBe('prospecting');
    });

    test('should insert an activity', async () => {
      const activityData = {
        type: 'call' as const,
        title: 'Discovery Call',
        description: 'Initial discovery call with prospect',
        timestamp: new Date().toISOString(),
        metadata: {
          outcome: 'connected' as const,
          direction: 'outbound' as const,
        },
        tags: [],
        customFields: [],
      };

      const activity = await client.insert<Activity>('activities', activityData);

      expect(activity.id).toBeDefined();
      expect(activity.type).toBe('call');
      expect(activity.title).toBe('Discovery Call');
    });
  });

  describe('insertWithId', () => {
    test('should insert entity with specific id', async () => {
      const specificId = crypto.randomUUID();
      const contactData: Contact = {
        id: specificId,
        name: 'Jane Smith',
        emails: [{ email: 'jane@example.com', type: 'work', primary: true }],
        phones: [],
        addresses: [],
        socialProfiles: [],
        tags: [],
        customFields: [],
        status: 'prospect',
        doNotContact: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const contact = await client.insertWithId<Contact>('contacts', contactData);

      expect(contact.id).toBe(specificId);
      expect(contact.name).toBe('Jane Smith');
    });

    test('should throw DuplicateError for existing id', async () => {
      const existingId = crypto.randomUUID();
      const contactData: Contact = {
        id: existingId,
        name: 'Existing Contact',
        emails: [{ email: 'existing@example.com', type: 'work', primary: true }],
        phones: [],
        addresses: [],
        socialProfiles: [],
        tags: [],
        customFields: [],
        status: 'lead',
        doNotContact: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await client.insertWithId<Contact>('contacts', contactData);

      // Try to insert again with same id
      const duplicateData = { ...contactData, name: 'Duplicate' };

      await expect(
        client.insertWithId('contacts', duplicateData)
      ).rejects.toThrow('already exists');
    });
  });

  describe('get', () => {
    test('should retrieve an existing entity', async () => {
      const contact = await client.insert<Contact>('contacts', {
        name: 'Get Test',
        emails: [{ email: 'get@example.com', type: 'work', primary: true }],
        phones: [],
        addresses: [],
        socialProfiles: [],
        tags: [],
        customFields: [],
        status: 'lead',
        doNotContact: false,
      });

      const retrieved = client.get<Contact>('contacts', contact.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(contact.id);
      expect(retrieved?.name).toBe('Get Test');
    });

    test('should return null for non-existent entity', () => {
      const fakeId = crypto.randomUUID();
      const result = client.get<Contact>('contacts', fakeId);
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    test('should update an existing entity', async () => {
      const contact = await client.insert<Contact>('contacts', {
        name: 'Update Test',
        emails: [{ email: 'update@example.com', type: 'work', primary: true }],
        phones: [],
        addresses: [],
        socialProfiles: [],
        tags: [],
        customFields: [],
        status: 'lead',
        doNotContact: false,
      });

      const updated = await client.update<Contact>('contacts', contact.id, {
        name: 'Updated Name',
        status: 'qualified',
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.status).toBe('qualified');
      expect(updated.emails[0].email).toBe('update@example.com'); // Preserved
    });

    test('should throw NotFoundError for non-existent entity', async () => {
      const fakeId = crypto.randomUUID();

      await expect(
        client.update('contacts', fakeId, { name: 'New Name' })
      ).rejects.toThrow('not found');
    });

    test('should update updatedAt timestamp', async () => {
      const contact = await client.insert<Contact>('contacts', {
        name: 'Timestamp Test',
        emails: [{ email: 'ts@example.com', type: 'work', primary: true }],
        phones: [],
        addresses: [],
        socialProfiles: [],
        tags: [],
        customFields: [],
        status: 'lead',
        doNotContact: false,
      });

      const originalUpdatedAt = contact.updatedAt;

      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      const updated = await client.update<Contact>('contacts', contact.id, {
        name: 'Timestamp Test Updated',
      });

      expect(updated.updatedAt).not.toBe(originalUpdatedAt);
    });
  });

  describe('delete', () => {
    test('should delete an existing entity', async () => {
      const contact = await client.insert<Contact>('contacts', {
        name: 'Delete Test',
        emails: [{ email: 'delete@example.com', type: 'work', primary: true }],
        phones: [],
        addresses: [],
        socialProfiles: [],
        tags: [],
        customFields: [],
        status: 'lead',
        doNotContact: false,
      });

      const result = await client.delete('contacts', contact.id);

      expect(result).toBe(true);

      const retrieved = client.get<Contact>('contacts', contact.id);
      expect(retrieved).toBeNull();
    });

    test('should return false for non-existent entity', async () => {
      const fakeId = crypto.randomUUID();
      const result = await client.delete('contacts', fakeId);
      expect(result).toBe(false);
    });
  });

  describe('exists', () => {
    test('should return true for existing entity', async () => {
      const contact = await client.insert<Contact>('contacts', {
        name: 'Exists Test',
        emails: [{ email: 'exists@example.com', type: 'work', primary: true }],
        phones: [],
        addresses: [],
        socialProfiles: [],
        tags: [],
        customFields: [],
        status: 'lead',
        doNotContact: false,
      });

      expect(client.exists('contacts', contact.id)).toBe(true);
    });

    test('should return false for non-existent entity', () => {
      const fakeId = crypto.randomUUID();
      expect(client.exists('contacts', fakeId)).toBe(false);
    });
  });

  describe('list', () => {
    test('should list entities with pagination', async () => {
      // Insert multiple contacts
      for (let i = 0; i < 15; i++) {
        await client.insert<Contact>('contacts', {
          name: `List Test ${i}`,
          emails: [{ email: `list${i}@example.com`, type: 'work', primary: true }],
          phones: [],
          addresses: [],
          socialProfiles: [],
          tags: [],
          customFields: [],
          status: 'lead',
          doNotContact: false,
        });
      }

      const page1 = client.list<Contact>('contacts', { limit: 5, offset: 0 });
      const page2 = client.list<Contact>('contacts', { limit: 5, offset: 5 });

      expect(page1.length).toBeLessThanOrEqual(5);
      expect(page2.length).toBeLessThanOrEqual(5);
    });

    test('should return all entities when limit not specified', () => {
      const results = client.list<Contact>('contacts');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('count', () => {
    test('should count entities in collection', async () => {
      const initialCount = client.count('contacts');

      await client.insert<Contact>('contacts', {
        name: 'Count Test',
        emails: [{ email: 'count@example.com', type: 'work', primary: true }],
        phones: [],
        addresses: [],
        socialProfiles: [],
        tags: [],
        customFields: [],
        status: 'lead',
        doNotContact: false,
      });

      const newCount = client.count('contacts');
      expect(newCount).toBe(initialCount + 1);
    });
  });

  describe('findByIndex', () => {
    test('should find contacts by email index', async () => {
      const email = 'indexed@example.com';
      const contact = await client.insert<Contact>('contacts', {
        name: 'Indexed Contact',
        emails: [{ email, type: 'work', primary: true }],
        phones: [],
        addresses: [],
        socialProfiles: [],
        tags: [],
        customFields: [],
        status: 'lead',
        doNotContact: false,
      });

      const results = client.findByIndex<Contact>('contacts_by_email', email.toLowerCase());

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(c => c.id === contact.id)).toBe(true);
    });

    test('should find deals by stage index', async () => {
      const contactId = crypto.randomUUID();
      const deal = await client.insert<Deal>('deals', {
        title: 'Index Test Deal',
        contactId,
        value: 10000,
        currency: 'USD',
        stage: 'proposal',
        probability: 50,
        expectedClose: new Date().toISOString(),
        notes: '',
        tags: [],
        competitors: [],
        lineItems: [],
        customFields: [],
        totalValue: 10000,
      });

      const results = client.findByIndex<Deal>('deals_by_stage', 'proposal');

      expect(results.some(d => d.id === deal.id)).toBe(true);
    });

    test('should throw error for non-existent index', () => {
      expect(() => {
        client.findByIndex('nonexistent_index', 'key');
      }).toThrow('Index not found');
    });
  });

  describe('search', () => {
    test('should search entities by field value', async () => {
      await client.insert<Contact>('contacts', {
        name: 'Search Test Unique',
        emails: [{ email: 'search-unique@example.com', type: 'work', primary: true }],
        phones: [],
        addresses: [],
        socialProfiles: [],
        tags: ['search-tag'],
        customFields: [],
        status: 'lead',
        doNotContact: false,
      });

      const results = client.search<Contact>('contacts', 'status', 'lead');

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(c => c.status === 'lead')).toBe(true);
    });
  });

  describe('getStats', () => {
    test('should return storage statistics', () => {
      const stats = client.getStats();

      expect(stats).toHaveProperty('contacts');
      expect(stats).toHaveProperty('deals');
      expect(stats).toHaveProperty('activities');
      expect(stats).toHaveProperty('media');
      expect(stats).toHaveProperty('notes');
      expect(stats).toHaveProperty('tags');
      expect(stats).toHaveProperty('companies');
      expect(stats).toHaveProperty('pipelines');

      expect(typeof stats.contacts).toBe('number');
      expect(typeof stats.deals).toBe('number');
    });
  });
});
