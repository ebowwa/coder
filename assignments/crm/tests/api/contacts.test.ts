/**
 * Tests for API endpoints
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { listContacts, createContact, getContact, updateContact, deleteContact, contactsStore, generateId } from '../../src/web/api/contacts.js';
import type { Contact } from '../../src/web/types.js';

describe('Contacts API', () => {
  // Reset store before each test
  beforeEach(() => {
    contactsStore.clear();
  });

  describe('listContacts', () => {
    test('should return empty array when no contacts exist', async () => {
      const response = await listContacts(new Request('http://localhost/api/contacts'));
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
    });

    test('should return all contacts', async () => {
      // Create test contacts
      const contact1 = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        status: 'customer',
        tags: ['vip'],
        doNotContact: false,
      };
      const contact2 = {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+0987654321',
        status: 'prospect',
        tags: ['lead'],
        doNotContact: false,
      };

      await createContact(new Request('http://localhost/api/contacts', {
        method: 'POST',
        body: JSON.stringify(contact1),
        headers: { 'Content-Type': 'application/json' },
      }));

      await createContact(new Request('http://localhost/api/contacts', {
        method: 'POST',
        body: JSON.stringify(contact2),
        headers: { 'Content-Type': 'application/json' },
      }));

      const response = await listContacts(new Request('http://localhost/api/contacts'));
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(2);
    });

    test('should filter contacts by search term', async () => {
      const contact1 = {
        name: 'John Doe',
        email: 'john@example.com',
        company: 'Acme Corp',
        status: 'customer',
        doNotContact: false,
      };
      const contact2 = {
        name: 'Jane Smith',
        email: 'jane@smith.com',
        company: 'Tech Inc',
        status: 'customer',
        doNotContact: false,
      };

      await createContact(new Request('http://localhost/api/contacts', {
        method: 'POST',
        body: JSON.stringify(contact1),
        headers: { 'Content-Type': 'application/json' },
      }));

      await createContact(new Request('http://localhost/api/contacts', {
        method: 'POST',
        body: JSON.stringify(contact2),
        headers: { 'Content-Type': 'application/json' },
      }));

      const response = await listContacts(
        new Request('http://localhost/api/contacts?search=acme')
      );
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(1);
      expect(body.data[0].company).toBe('Acme Corp');
    });

    test('should filter contacts by status', async () => {
      const contact1 = {
        name: 'Lead User',
        email: 'lead@example.com',
        status: 'lead',
        doNotContact: false,
      };
      const contact2 = {
        name: 'Customer User',
        email: 'customer@example.com',
        status: 'customer',
        doNotContact: false,
      };

      await createContact(new Request('http://localhost/api/contacts', {
        method: 'POST',
        body: JSON.stringify(contact1),
        headers: { 'Content-Type': 'application/json' },
      }));

      await createContact(new Request('http://localhost/api/contacts', {
        method: 'POST',
        body: JSON.stringify(contact2),
        headers: { 'Content-Type': 'application/json' },
      }));

      const response = await listContacts(
        new Request('http://localhost/api/contacts?status=lead')
      );
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(1);
      expect(body.data[0].status).toBe('lead');
    });
  });

  describe('createContact', () => {
    test('should create a new contact', async () => {
      const contactData = {
        name: 'New User',
        email: 'new@example.com',
        phone: '+1111111111',
        company: 'New Corp',
        status: 'prospect',
        doNotContact: false,
      };

      const response = await createContact(new Request('http://localhost/api/contacts', {
        method: 'POST',
        body: JSON.stringify(contactData),
        headers: { 'Content-Type': 'application/json' },
      }));

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
      expect(body.data.name).toBe('New User');
      expect(body.data.email).toBe('new@example.com');
      expect(body.data.createdAt).toBeDefined();
      expect(body.data.updatedAt).toBeDefined();
    });

    test('should return error for invalid JSON', async () => {
      const response = await createContact(new Request('http://localhost/api/contacts', {
        method: 'POST',
        body: 'not json',
        headers: { 'Content-Type': 'application/json' },
      }));

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
      expect(response.status).toBe(400);
    });
  });

  describe('getContact', () => {
    test('should return a contact by id', async () => {
      // First create a contact
      const createResponse = await createContact(new Request('http://localhost/api/contacts', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Get Test',
          email: 'get@test.com',
          status: 'customer',
          doNotContact: false,
        }),
        headers: { 'Content-Type': 'application/json' },
      }));
      const { data: createdContact } = await createResponse.json();

      // Now get the contact
      const response = await getContact(
        new Request(`http://localhost/api/contacts/${createdContact.id}`),
        { id: createdContact.id }
      );
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(createdContact.id);
      expect(body.data.name).toBe('Get Test');
    });

    test('should return 404 for non-existent contact', async () => {
      const response = await getContact(
        new Request('http://localhost/api/contacts/non-existent-id'),
        { id: 'non-existent-id' }
      );
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Contact not found');
      expect(response.status).toBe(404);
    });
  });

  describe('updateContact', () => {
    test('should update an existing contact', async () => {
      // First create a contact
      const createResponse = await createContact(new Request('http://localhost/api/contacts', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Update Test',
          email: 'update@test.com',
          status: 'prospect',
          doNotContact: false,
        }),
        headers: { 'Content-Type': 'application/json' },
      }));
      const { data: createdContact } = await createResponse.json();

      // Now update the contact
      const updateResponse = await updateContact(
        new Request(`http://localhost/api/contacts/${createdContact.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: 'Updated Name',
            status: 'customer',
          }),
          headers: { 'Content-Type': 'application/json' },
        }),
        { id: createdContact.id }
      );
      const body = await updateResponse.json();
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Updated Name');
      expect(body.data.status).toBe('customer');
      expect(body.data.id).toBe(createdContact.id);
      expect(body.data.createdAt).toBe(createdContact.createdAt);
    });

    test('should return 404 for non-existent contact', async () => {
      const response = await updateContact(
        new Request('http://localhost/api/contacts/non-existent-id', {
          method: 'PUT',
          body: JSON.stringify({ name: 'New Name' }),
          headers: { 'Content-Type': 'application/json' },
        }),
        { id: 'non-existent-id' }
      );
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(response.status).toBe(404);
    });
  });

  describe('deleteContact', () => {
    test('should delete an existing contact', async () => {
      // First create a contact
      const createResponse = await createContact(new Request('http://localhost/api/contacts', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Delete Test',
          email: 'delete@test.com',
          status: 'customer',
          doNotContact: false,
        }),
        headers: { 'Content-Type': 'application/json' },
      }));
      const { data: createdContact } = await createResponse.json();

      // Now delete the contact
      const deleteResponse = await deleteContact(
        new Request(`http://localhost/api/contacts/${createdContact.id}`, {
          method: 'DELETE',
        }),
        { id: createdContact.id }
      );
      const body = await deleteResponse.json();
      expect(body.success).toBe(true);

      // Verify it's deleted
      const getResponse = await getContact(
        new Request(`http://localhost/api/contacts/${createdContact.id}`),
        { id: createdContact.id }
      );
      const getBody = await getResponse.json();
      expect(getBody.success).toBe(false);
      expect(getResponse.status).toBe(404);
    });

    test('should return 404 for non-existent contact', async () => {
      const response = await deleteContact(
        new Request('http://localhost/api/contacts/non-existent-id', {
          method: 'DELETE',
        }),
        { id: 'non-existent-id' }
      );
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(response.status).toBe(404);
    });
  });
});
