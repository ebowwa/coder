/**
 * Integration Tests for CRM Web API
 * Tests GET/POST endpoints for contacts, deals, activities
 *
 * IMPORTANT: These tests require the web server to be running with the test database:
 *   CRM_DB_PATH=./test-db-api bun run src/web/index.ts
 *
 * Or run the full integration test script:
 *   bun run tests/integration/run-api-tests.sh
 */

import { describe, test, beforeAll, afterAll, expect } from 'bun:test';
import { rmSync, mkdirSync, existsSync } from 'node:fs';

const TEST_DB_PATH = './test-db-api';
const API_BASE = 'http://localhost:3001/api'; // Default port from web/index.ts

// Track created IDs for cleanup and dependent tests
let createdContactIds: string[] = [];
let createdDealIds: string[] = [];

describe('CRM Web API', () => {
  beforeAll(async () => {
    // Clean up any existing test database
    if (existsSync(TEST_DB_PATH)) {
      rmSync(TEST_DB_PATH, { recursive: true, force: true });
    }
    mkdirSync(TEST_DB_PATH, { recursive: true });

    // Note: For proper integration tests, start the server separately:
    // CRM_DB_PATH=./test-db-api bun run src/web/index.ts
    // Or use a test harness that starts/stops the server
  });

  afterAll(async () => {
    // Clean up test database
    if (existsSync(TEST_DB_PATH)) {
      rmSync(TEST_DB_PATH, { recursive: true, force: true });
    }
  });

  describe('Contacts API', () => {
    test('POST /api/contacts - should create a new contact', async () => {
      const response = await fetch(`${API_BASE}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'API Test Contact',
          emails: [{ email: 'api-test@example.com', type: 'work', primary: true }],
          phones: [],
          addresses: [],
          socialProfiles: [],
          tags: ['api-test', 'integration'],
          customFields: [],
          status: 'lead',
          doNotContact: false,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.id).toBeDefined();
      expect(data.data.name).toBe('API Test Contact');

      // Track created contact for cleanup
      createdContactIds.push(data.data.id);
    });

    test('GET /api/contacts - should list all contacts', async () => {
      const response = await fetch(`${API_BASE}/contacts`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('GET /api/contacts - should filter by search term', async () => {
      const response = await fetch(`${API_BASE}/contacts?search=API%20Test`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('GET /api/contacts - should filter by status', async () => {
      const response = await fetch(`${API_BASE}/contacts?status=lead`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      // All returned contacts should have status 'lead'
      for (const contact of data.data) {
        expect(contact.status).toBe('lead');
      }
    });

    test('GET /api/contacts/:id - should get a single contact', async () => {
      // First create a contact
      const createResponse = await fetch(`${API_BASE}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Single Contact Test',
          emails: [{ email: 'single@example.com', type: 'work', primary: true }],
          phones: [],
          addresses: [],
          socialProfiles: [],
          tags: [],
          customFields: [],
          status: 'prospect',
          doNotContact: false,
        }),
      });
      const createData = await createResponse.json();
      const contactId = createData.data.id;

      // Now get it
      const response = await fetch(`${API_BASE}/contacts/${contactId}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(contactId);
      expect(data.data.name).toBe('Single Contact Test');
    });

    test('GET /api/contacts/:id - should return 404 for non-existent contact', async () => {
      const fakeId = crypto.randomUUID();
      const response = await fetch(`${API_BASE}/contacts/${fakeId}`);

      expect(response.status).toBe(404);
    });

    test('PUT /api/contacts/:id - should update a contact', async () => {
      // First create a contact
      const createResponse = await fetch(`${API_BASE}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Update Test Contact',
          emails: [{ email: 'update-test@example.com', type: 'work', primary: true }],
          phones: [],
          addresses: [],
          socialProfiles: [],
          tags: [],
          customFields: [],
          status: 'lead',
          doNotContact: false,
        }),
      });
      const createData = await createResponse.json();
      const contactId = createData.data.id;

      // Now update it
      const response = await fetch(`${API_BASE}/contacts/${contactId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'qualified',
          tags: ['updated', 'vip'],
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('qualified');
      expect(data.data.tags).toContain('updated');
    });

    test('DELETE /api/contacts/:id - should delete a contact', async () => {
      // First create a contact
      const createResponse = await fetch(`${API_BASE}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Delete Test Contact',
          emails: [{ email: 'delete-test@example.com', type: 'work', primary: true }],
          phones: [],
          addresses: [],
          socialProfiles: [],
          tags: [],
          customFields: [],
          status: 'lead',
          doNotContact: false,
        }),
      });
      const createData = await createResponse.json();
      const contactId = createData.data.id;

      // Now delete it
      const response = await fetch(`${API_BASE}/contacts/${contactId}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(200);
      expect((await response.json()).success).toBe(true);

      // Verify deleted
      const getResponse = await fetch(`${API_BASE}/contacts/${contactId}`);
      expect(getResponse.status).toBe(404);
    });
  });

  describe('Deals API', () => {
    test('POST /api/deals - should create a new deal', async () => {
      // First ensure we have a contact
      const contactResponse = await fetch(`${API_BASE}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Deal Contact',
          emails: [{ email: 'deal-contact@example.com', type: 'work', primary: true }],
          phones: [],
          addresses: [],
          socialProfiles: [],
          tags: [],
          customFields: [],
          status: 'lead',
          doNotContact: false,
        }),
      });
      const contactData = await contactResponse.json();
      const contactId = contactData.data.id;

      const response = await fetch(`${API_BASE}/deals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: contactId,
          title: 'Enterprise License Deal',
          value: 75000,
          currency: 'USD',
          stage: 'discovery',
          probability: 30,
          expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          description: 'Large enterprise deal',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBeDefined();
      expect(data.data.title).toBe('Enterprise License Deal');
      expect(data.data.value).toBe(75000);
      expect(data.data.stage).toBe('discovery');
    });

    test('GET /api/deals - should list all deals', async () => {
      const response = await fetch(`${API_BASE}/deals`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('GET /api/deals - should filter by stage', async () => {
      const response = await fetch(`${API_BASE}/deals?stage=discovery`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('Activities API', () => {
    test('GET /api/activities - should list activities', async () => {
      const response = await fetch(`${API_BASE}/activities`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('GET /api/activities - should respect limit parameter', async () => {
      const response = await fetch(`${API_BASE}/activities?limit=5`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.length).toBeLessThanOrEqual(5);
    });

    test('GET /api/activities - should filter by type', async () => {
      const response = await fetch(`${API_BASE}/activities?type=contact`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('Dashboard API', () => {
    test('GET /api/dashboard/stats - should return dashboard statistics', async () => {
      const response = await fetch(`${API_BASE}/dashboard/stats`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('totalContacts');
      expect(data.data).toHaveProperty('activeDeals');
      expect(data.data).toHaveProperty('pipelineValue');
      expect(data.data).toHaveProperty('wonThisMonth');
      expect(data.data).toHaveProperty('activitiesToday');
      expect(data.data).toHaveProperty('conversionRate');

      expect(typeof data.data.totalContacts).toBe('number');
      expect(typeof data.data.activeDeals).toBe('number');
      expect(typeof data.data.pipelineValue).toBe('number');
    });
  });

  describe('Media API', () => {
    test('POST /api/media - should upload a file', async () => {
      const formData = new FormData();
      const testContent = 'Test file content';
      const blob = new Blob([testContent], { type: 'text/plain' });
      formData.append('file', blob, 'test-document.txt');

      const response = await fetch(`${API_BASE}/media`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.filename).toBe('test-document.txt');
      // Mimetype may include charset
      expect(data.data.mimetype).toMatch(/^text\/plain/);
      expect(data.data.size).toBe(testContent.length);
    });

    test('POST /api/media - should reject missing file', async () => {
      const formData = new FormData();
      // No file appended

      const response = await fetch(`${API_BASE}/media`, {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(400);
    });
  });
});
