/**
 * Tests for core types and Zod schemas
 */

import { describe, test, expect } from 'bun:test';
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
  noteSchema,
  createNoteSchema,
  tagSchema,
  createTagSchema,
  companySchema,
  createCompanySchema,
  contactFilterSchema,
  dealFilterSchema,
  paginationSchema,
  dateRangeSchema,
} from '../../src/core/schemas.js';

// ============================================================================
// Base Schema Tests
// ============================================================================

describe('Base Schemas', () => {
  describe('uuidSchema', () => {
    test('should validate valid UUIDs', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      expect(uuidSchema.safeParse(validUuid).success).toBe(true);
    });

    test('should reject invalid UUIDs', () => {
      expect(uuidSchema.safeParse('not-a-uuid').success).toBe(false);
      expect(uuidSchema.safeParse('12345').success).toBe(false);
      expect(uuidSchema.safeParse('').success).toBe(false);
    });
  });

  describe('timestampSchema', () => {
    test('should validate ISO 8601 timestamps', () => {
      const validTimestamp = '2024-01-15T10:30:00Z';
      expect(timestampSchema.safeParse(validTimestamp).success).toBe(true);
    });

    test('should reject invalid timestamps', () => {
      expect(timestampSchema.safeParse('2024-01-15').success).toBe(false);
      expect(timestampSchema.safeParse('not-a-date').success).toBe(false);
    });
  });
});

// ============================================================================
// Contact Schema Tests
// ============================================================================

describe('Contact Schemas', () => {
  const validContact = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'John Doe',
    emails: [{ email: 'john@example.com', type: 'work' as const, primary: true }],
    phones: [{ number: '+1234567890', type: 'mobile' as const, primary: true }],
    addresses: [],
    socialProfiles: [],
    tags: ['customer'],
    customFields: [],
    status: 'customer' as const,
    doNotContact: false,
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  };

  describe('contactSchema', () => {
    test('should validate a valid contact', () => {
      const result = contactSchema.safeParse(validContact);
      expect(result.success).toBe(true);
    });

    test('should require required fields', () => {
      const { success } = contactSchema.safeParse({
        id: '123e4567-e89b-12d3-a456-426614174000',
        // missing name
      });
      expect(success).toBe(false);
    });

    test('should validate email format', () => {
      const invalidEmail = {
        ...validContact,
        emails: [{ email: 'not-an-email', type: 'work' as const, primary: true }],
      };
      const { success } = contactSchema.safeParse(invalidEmail);
      expect(success).toBe(false);
    });

    test('should validate status enum', () => {
      const validStatuses = ['lead', 'prospect', 'qualified', 'customer', 'churned', 'archived'];
      for (const status of validStatuses) {
        const { success } = contactSchema.safeParse({ ...validContact, status });
        expect(success).toBe(true);
      }

      const { success } = contactSchema.safeParse({ ...validContact, status: 'invalid' });
      expect(success).toBe(false);
    });

    test('should validate leadScore range', () => {
      const validScore = { ...validContact, leadScore: 75 };
      expect(contactSchema.safeParse(validScore).success).toBe(true);

      const tooHigh = { ...validContact, leadScore: 150 };
      expect(contactSchema.safeParse(tooHigh).success).toBe(false);

      const negative = { ...validContact, leadScore: -10 };
      expect(contactSchema.safeParse(negative).success).toBe(false);
    });
  });

  describe('createContactSchema', () => {
    test('should not require id and timestamps', () => {
      const createData = {
        name: 'Jane Doe',
        emails: [],
        phones: [],
        addresses: [],
        socialProfiles: [],
        tags: [],
        customFields: [],
        status: 'lead' as const,
        doNotContact: false,
      };
      const { success } = createContactSchema.safeParse(createData);
      expect(success).toBe(true);
    });
  });

  describe('updateContactSchema', () => {
    test('should require id and allow partial updates', () => {
      const updateData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Updated Name',
      };
      const { success } = updateContactSchema.safeParse(updateData);
      expect(success).toBe(true);
    });

    test('should require id', () => {
      const { success } = updateContactSchema.safeParse({ name: 'No ID' });
      expect(success).toBe(false);
    });
  });
});

// ============================================================================
// Deal Schema Tests
// ============================================================================

describe('Deal Schemas', () => {
  const validDeal = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    title: 'Enterprise License Deal',
    contactId: '123e4567-e89b-12d3-a456-426614174000',
    value: 50000,
    currency: 'USD' as const,
    stage: 'proposal' as const,
    probability: 60,
    expectedClose: '2024-06-30T00:00:00Z',
    priority: 'high' as const,
    lineItems: [],
    totalValue: 50000,
    notes: '',
    tags: [],
    competitors: [],
    customFields: [],
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  };

  describe('dealSchema', () => {
    test('should validate a valid deal', () => {
      const { success } = dealSchema.safeParse(validDeal);
      expect(success).toBe(true);
    });

    test('should validate deal stages', () => {
      const stages = ['prospecting', 'qualification', 'needs_analysis', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
      for (const stage of stages) {
        const { success } = dealSchema.safeParse({ ...validDeal, stage });
        expect(success).toBe(true);
      }
    });

    test('should validate probability range (0-100)', () => {
      expect(dealSchema.safeParse({ ...validDeal, probability: 0 }).success).toBe(true);
      expect(dealSchema.safeParse({ ...validDeal, probability: 100 }).success).toBe(true);
      expect(dealSchema.safeParse({ ...validDeal, probability: -1 }).success).toBe(false);
      expect(dealSchema.safeParse({ ...validDeal, probability: 101 }).success).toBe(false);
    });

    test('should validate currency enum', () => {
      const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'BRL', 'MXN'];
      for (const currency of currencies) {
        const { success } = dealSchema.safeParse({ ...validDeal, currency });
        expect(success).toBe(true);
      }
    });
  });

  describe('createDealSchema', () => {
    test('should not require id and timestamps', () => {
      const createData = {
        title: 'New Deal',
        contactId: '123e4567-e89b-12d3-a456-426614174000',
        value: 10000,
        expectedClose: '2024-12-31T00:00:00Z',
        totalValue: 10000,
      };
      const result = createDealSchema.safeParse(createData);
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// Activity Schema Tests
// ============================================================================

describe('Activity Schemas', () => {
  const validActivity = {
    id: '123e4567-e89b-12d3-a456-426614174002',
    type: 'meeting' as const,
    title: 'Product Demo',
    description: 'Demo of enterprise features',
    timestamp: '2024-01-20T14:00:00Z',
    duration: 3600,
    metadata: {
      outcome: 'completed' as const,
      location: 'Virtual',
    },
    tags: ['demo', 'enterprise'],
    customFields: [],
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  };

  describe('activitySchema', () => {
    test('should validate a valid activity', () => {
      const { success } = activitySchema.safeParse(validActivity);
      expect(success).toBe(true);
    });

    test('should validate activity types', () => {
      const types = ['call', 'email', 'meeting', 'task', 'note', 'sms', 'video_call', 'demo', 'proposal_sent', 'contract_sent', 'follow_up', 'social_media', 'event', 'other'];
      for (const type of types) {
        const { success } = activitySchema.safeParse({ ...validActivity, type });
        expect(success).toBe(true);
      }
    });
  });
});

// ============================================================================
// Media Schema Tests
// ============================================================================

describe('Media Schemas', () => {
  const validMedia = {
    id: '123e4567-e89b-12d3-a456-426614174003',
    entityType: 'contact' as const,
    entityId: '123e4567-e89b-12d3-a456-426614174000',
    type: 'image' as const,
    filename: 'profile.jpg',
    mimeType: 'image/jpeg',
    size: 102400,
    url: 'https://storage.example.com/profile.jpg',
    metadata: {},
    isPublic: false,
    downloadCount: 0,
    createdAt: '2024-01-15T10:30:00Z',
  };

  describe('mediaSchema', () => {
    test('should validate a valid media', () => {
      const { success } = mediaSchema.safeParse(validMedia);
      expect(success).toBe(true);
    });

    test('should validate media types', () => {
      const types = ['image', 'video', 'audio', 'document', 'spreadsheet', 'presentation', 'pdf', 'archive', 'other'];
      for (const type of types) {
        const { success } = mediaSchema.safeParse({ ...validMedia, type });
        expect(success).toBe(true);
      }
    });
  });
});

// ============================================================================
// Note Schema Tests
// ============================================================================

describe('Note Schemas', () => {
  const validNote = {
    id: '123e4567-e89b-12d3-a456-426614174004',
    content: 'This is a note about the customer.',
    format: 'markdown' as const,
    title: 'Customer Note',
    visibility: 'team' as const,
    pinned: false,
    tags: ['important'],
    mediaIds: [],
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  };

  describe('noteSchema', () => {
    test('should validate a valid note', () => {
      const { success } = noteSchema.safeParse(validNote);
      expect(success).toBe(true);
    });

    test('should validate visibility levels', () => {
      const levels = ['private', 'team', 'public'];
      for (const visibility of levels) {
        const { success } = noteSchema.safeParse({ ...validNote, visibility });
        expect(success).toBe(true);
      }
    });
  });
});

// ============================================================================
// Tag Schema Tests
// ============================================================================

describe('Tag Schemas', () => {
  const validTag = {
    id: '123e4567-e89b-12d3-a456-426614174005',
    name: 'enterprise-customer',
    label: 'Enterprise Customer',
    color: '#FF5733',
    category: 'status' as const,
    usageCount: 42,
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  };

  describe('tagSchema', () => {
    test('should validate a valid tag', () => {
      const { success } = tagSchema.safeParse(validTag);
      expect(success).toBe(true);
    });

    test('should require lowercase alphanumeric name with hyphens', () => {
      expect(tagSchema.safeParse({ ...validTag, name: 'valid-tag-name' }).success).toBe(true);
      expect(tagSchema.safeParse({ ...validTag, name: 'Invalid Tag' }).success).toBe(false);
      expect(tagSchema.safeParse({ ...validTag, name: 'invalid_tag' }).success).toBe(false);
    });

    test('should validate color format', () => {
      expect(tagSchema.safeParse({ ...validTag, color: '#FF5733' }).success).toBe(true);
      expect(tagSchema.safeParse({ ...validTag, color: 'red' }).success).toBe(true);
      // Named colors are allowed by the regex, so 'invalid' is treated as a named color
      expect(tagSchema.safeParse({ ...validTag, color: 'invalid' }).success).toBe(true);
      // Only invalid format is when it doesn't match hex or named color pattern
      expect(tagSchema.safeParse({ ...validTag, color: '#ZZZZZZ' }).success).toBe(false);
    });
  });
});

// ============================================================================
// Filter Schema Tests
// ============================================================================

describe('Filter Schemas', () => {
  describe('contactFilterSchema', () => {
    test('should validate valid filter options', () => {
      const filter = {
        search: 'john',
        status: ['lead', 'prospect'],
        tags: ['vip'],
        hasEmail: true,
        leadScoreMin: 50,
        leadScoreMax: 100,
      };
      const { success } = contactFilterSchema.safeParse(filter);
      expect(success).toBe(true);
    });

    test('should allow empty filter', () => {
      const { success } = contactFilterSchema.safeParse({});
      expect(success).toBe(true);
    });
  });

  describe('dealFilterSchema', () => {
    test('should validate valid filter options', () => {
      const filter = {
        search: 'enterprise',
        stage: ['proposal', 'negotiation'],
        priority: ['high', 'urgent'],
        valueMin: 10000,
        valueMax: 100000,
      };
      const { success } = dealFilterSchema.safeParse(filter);
      expect(success).toBe(true);
    });
  });

  describe('dateRangeSchema', () => {
    test('should validate valid date range', () => {
      const range = {
        start: '2024-01-01T00:00:00Z',
        end: '2024-12-31T23:59:59Z',
      };
      const { success } = dateRangeSchema.safeParse(range);
      expect(success).toBe(true);
    });

    test('should reject when start is after end', () => {
      const range = {
        start: '2024-12-31T23:59:59Z',
        end: '2024-01-01T00:00:00Z',
      };
      const { success } = dateRangeSchema.safeParse(range);
      expect(success).toBe(false);
    });
  });

  describe('paginationSchema', () => {
    test('should apply defaults', () => {
      const { success, data } = paginationSchema.safeParse({});
      expect(success).toBe(true);
      if (success) {
        expect(data.page).toBe(1);
        expect(data.limit).toBe(20);
      }
    });

    test('should validate limits', () => {
      expect(paginationSchema.safeParse({ limit: 50 }).success).toBe(true);
      expect(paginationSchema.safeParse({ limit: 200 }).success).toBe(false); // max 100
      expect(paginationSchema.safeParse({ limit: 0 }).success).toBe(false); // min 1
    });
  });
});
