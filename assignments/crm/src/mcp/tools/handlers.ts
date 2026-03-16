/**
 * MCP Tool handlers for CRM operations
 */

import { CRMStorageClient } from '../storage/client.js';
import type { ToolInput, ToolOutput } from './types.js';
import { CRMError, NotFoundError } from '../storage/types.js';
import type { Contact, Deal, Activity, Media, Note, Tag, Company } from '../../core/types.js';

/**
 * Tool handlers class containing all MCP tool implementations
 */
export class ToolHandlers {
  constructor(private storage: CRMStorageClient) {}

  // ============================================================================
  // Contact Handlers
  // ============================================================================

  async createContact(input: ToolInput): Promise<ToolOutput> {
    try {
      const name = input.name as string | undefined;
      if (!name) {
        return { success: false, error: 'Contact name is required' };
      }

      const now = new Date().toISOString();
      const contact = await this.storage.insert<Contact>('contacts', {
        name,
        firstName: input.firstName as string | undefined,
        lastName: input.lastName as string | undefined,
        emails: (input.emails as Contact['emails']) ?? [],
        phones: (input.phones as Contact['phones']) ?? [],
        addresses: [],
        socialProfiles: [],
        company: input.company as string | undefined,
        title: input.title as string | undefined,
        department: undefined,
        website: undefined,
        tags: (input.tags as string[]) ?? [],
        customFields: [],
        source: input.source as Contact['source'],
        status: (input.status as Contact['status']) ?? 'lead',
        ownerId: undefined,
        avatar: undefined,
        preferredContact: undefined,
        language: undefined,
        timezone: undefined,
        preferences: undefined,
        leadScore: undefined,
        doNotContact: false,
        lastContactedAt: undefined,
        nextFollowUpAt: undefined,
      });

      return { success: true, data: contact };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getContact(input: ToolInput): Promise<ToolOutput> {
    try {
      const id = input.id as string | undefined;
      if (!id) {
        return { success: false, error: 'Contact ID is required' };
      }

      const contact = this.storage.get<Contact>('contacts', id);
      if (!contact) {
        return { success: false, error: `Contact not found: ${id}` };
      }

      return { success: true, data: contact };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateContact(input: ToolInput): Promise<ToolOutput> {
    try {
      const id = input.id as string | undefined;
      if (!id) {
        return { success: false, error: 'Contact ID is required' };
      }

      const updates: Partial<Contact> = {};
      if (input.name !== undefined) updates.name = input.name as string;
      if (input.firstName !== undefined) updates.firstName = input.firstName as string;
      if (input.lastName !== undefined) updates.lastName = input.lastName as string;
      if (input.emails !== undefined) updates.emails = input.emails as Contact['emails'];
      if (input.phones !== undefined) updates.phones = input.phones as Contact['phones'];
      if (input.company !== undefined) updates.company = input.company as string;
      if (input.title !== undefined) updates.title = input.title as string;
      if (input.tags !== undefined) updates.tags = input.tags as string[];
      if (input.status !== undefined) updates.status = input.status as Contact['status'];

      const contact = await this.storage.update<Contact>('contacts', id, updates);
      return { success: true, data: contact };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deleteContact(input: ToolInput): Promise<ToolOutput> {
    try {
      const id = input.id as string | undefined;
      if (!id) {
        return { success: false, error: 'Contact ID is required' };
      }

      const deleted = await this.storage.delete('contacts', id);
      return { success: true, data: { id, deleted } };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listContacts(input: ToolInput): Promise<ToolOutput> {
    try {
      const limit = (input.limit as number) ?? 20;
      const offset = (input.offset as number) ?? 0;

      const contacts = this.storage.list<Contact>('contacts', { limit, offset });
      const total = this.storage.count('contacts');

      return { success: true, data: { contacts, total } };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async searchContacts(input: ToolInput): Promise<ToolOutput> {
    try {
      const email = input.email as string | undefined;
      if (!email) {
        return { success: false, error: 'Email is required' };
      }

      const contacts = this.storage.findByIndex<Contact>('contacts_by_email', email.toLowerCase());
      return { success: true, data: { contacts } };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ============================================================================
  // Deal Handlers
  // ============================================================================

  async createDeal(input: ToolInput): Promise<ToolOutput> {
    try {
      const title = input.title as string | undefined;
      const contactId = input.contactId as string | undefined;
      const value = input.value as number | undefined;
      const expectedClose = input.expectedClose as string | undefined;

      if (!title) return { success: false, error: 'Deal title is required' };
      if (!contactId) return { success: false, error: 'Contact ID is required' };
      if (value === undefined) return { success: false, error: 'Deal value is required' };
      if (!expectedClose) return { success: false, error: 'Expected close date is required' };

      const deal = await this.storage.insert<Deal>('deals', {
        title,
        contactId,
        companyId: undefined,
        value,
        currency: (input.currency as Deal['currency']) ?? 'USD',
        stage: (input.stage as Deal['stage']) ?? 'prospecting',
        probability: (input.probability as number) ?? 0,
        expectedClose,
        actualClose: undefined,
        priority: (input.priority as Deal['priority']) ?? 'medium',
        lineItems: [],
        discount: undefined,
        discountType: undefined,
        totalValue: value,
        notes: (input.notes as string) ?? '',
        tags: (input.tags as string[]) ?? [],
        competitors: [],
        lossReason: undefined,
        nextSteps: undefined,
        ownerId: undefined,
        source: undefined,
        customFields: [],
        lastActivityAt: undefined,
      });

      return { success: true, data: deal };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getDeal(input: ToolInput): Promise<ToolOutput> {
    try {
      const id = input.id as string | undefined;
      if (!id) {
        return { success: false, error: 'Deal ID is required' };
      }

      const deal = this.storage.get<Deal>('deals', id);
      if (!deal) {
        return { success: false, error: `Deal not found: ${id}` };
      }

      return { success: true, data: deal };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateDeal(input: ToolInput): Promise<ToolOutput> {
    try {
      const id = input.id as string | undefined;
      if (!id) {
        return { success: false, error: 'Deal ID is required' };
      }

      const updates: Partial<Deal> = {};
      if (input.title !== undefined) updates.title = input.title as string;
      if (input.value !== undefined) updates.value = input.value as number;
      if (input.stage !== undefined) updates.stage = input.stage as Deal['stage'];
      if (input.probability !== undefined) updates.probability = input.probability as number;
      if (input.expectedClose !== undefined) updates.expectedClose = input.expectedClose as string;
      if (input.actualClose !== undefined) updates.actualClose = input.actualClose as string;
      if (input.priority !== undefined) updates.priority = input.priority as Deal['priority'];
      if (input.notes !== undefined) updates.notes = input.notes as string;
      if (input.tags !== undefined) updates.tags = input.tags as string[];

      const deal = await this.storage.update<Deal>('deals', id, updates);
      return { success: true, data: deal };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deleteDeal(input: ToolInput): Promise<ToolOutput> {
    try {
      const id = input.id as string | undefined;
      if (!id) {
        return { success: false, error: 'Deal ID is required' };
      }

      const deleted = await this.storage.delete('deals', id);
      return { success: true, data: { id, deleted } };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listDeals(input: ToolInput): Promise<ToolOutput> {
    try {
      const limit = (input.limit as number) ?? 20;
      const offset = (input.offset as number) ?? 0;

      const deals = this.storage.list<Deal>('deals', { limit, offset });
      const total = this.storage.count('deals');

      return { success: true, data: { deals, total } };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getDealsByStage(input: ToolInput): Promise<ToolOutput> {
    try {
      const stage = input.stage as string | undefined;
      if (!stage) {
        return { success: false, error: 'Stage is required' };
      }

      const deals = this.storage.findByIndex<Deal>('deals_by_stage', stage);
      return { success: true, data: { deals } };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ============================================================================
  // Activity Handlers
  // ============================================================================

  async createActivity(input: ToolInput): Promise<ToolOutput> {
    try {
      const type = input.type as string | undefined;
      const title = input.title as string | undefined;
      if (!type) return { success: false, error: 'Activity type is required' };
      if (!title) return { success: false, error: 'Activity title is required' };

      const activity = await this.storage.insert<Activity>('activities', {
        contactId: input.contactId as string | undefined,
        dealId: input.dealId as string | undefined,
        type: type as Activity['type'],
        title,
        description: (input.description as string) ?? '',
        timestamp: (input.timestamp as string) ?? new Date().toISOString(),
        duration: input.duration as number | undefined,
        metadata: (input.metadata as Activity['metadata']) ?? {},
        createdBy: undefined,
        tags: (input.tags as string[]) ?? [],
        customFields: [],
      });

      return { success: true, data: activity };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getActivity(input: ToolInput): Promise<ToolOutput> {
    try {
      const id = input.id as string | undefined;
      if (!id) {
        return { success: false, error: 'Activity ID is required' };
      }

      const activity = this.storage.get<Activity>('activities', id);
      if (!activity) {
        return { success: false, error: `Activity not found: ${id}` };
      }

      return { success: true, data: activity };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listActivities(input: ToolInput): Promise<ToolOutput> {
    try {
      const limit = (input.limit as number) ?? 20;
      const offset = (input.offset as number) ?? 0;

      const activities = this.storage.list<Activity>('activities', { limit, offset });
      const total = this.storage.count('activities');

      return { success: true, data: { activities, total } };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deleteActivity(input: ToolInput): Promise<ToolOutput> {
    try {
      const id = input.id as string | undefined;
      if (!id) {
        return { success: false, error: 'Activity ID is required' };
      }

      const deleted = await this.storage.delete('activities', id);
      return { success: true, data: { id, deleted } };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ============================================================================
  // Media Handlers
  // ============================================================================

  async uploadMedia(input: ToolInput): Promise<ToolOutput> {
    try {
      const entityType = input.entityType as Media['entityType'];
      const entityId = input.entityId as string;
      const type = input.type as Media['type'];
      const filename = input.filename as string;
      const mimeType = input.mimeType as string;
      const size = input.size as number;
      const url = input.url as string;

      if (!entityType || !entityId || !type || !filename || !mimeType || size === undefined || !url) {
        return { success: false, error: 'Missing required media fields' };
      }

      const media = await this.storage.insert<Media>('media', {
        entityType,
        entityId,
        type,
        filename,
        mimeType,
        size,
        url,
        thumbnailUrl: input.thumbnailUrl as string | undefined,
        metadata: (input.metadata as Media['metadata']) ?? {},
        altText: input.altText as string | undefined,
        caption: input.caption as string | undefined,
        isPublic: (input.isPublic as boolean) ?? false,
        downloadCount: 0,
        uploadedBy: undefined,
        expiresAt: undefined,
      });

      return { success: true, data: media };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getMedia(input: ToolInput): Promise<ToolOutput> {
    try {
      const id = input.id as string | undefined;
      if (!id) {
        return { success: false, error: 'Media ID is required' };
      }

      const media = this.storage.get<Media>('media', id);
      if (!media) {
        return { success: false, error: `Media not found: ${id}` };
      }

      return { success: true, data: media };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listMedia(input: ToolInput): Promise<ToolOutput> {
    try {
      const entityId = input.entityId as string;
      if (!entityId) {
        return { success: false, error: 'Entity ID is required' };
      }

      const media = this.storage.findByIndex<Media>('media_by_entity', entityId);
      return { success: true, data: { media } };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deleteMedia(input: ToolInput): Promise<ToolOutput> {
    try {
      const id = input.id as string | undefined;
      if (!id) {
        return { success: false, error: 'Media ID is required' };
      }

      const deleted = await this.storage.delete('media', id);
      return { success: true, data: { id, deleted } };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ============================================================================
  // Note Handlers
  // ============================================================================

  async createNote(input: ToolInput): Promise<ToolOutput> {
    try {
      const content = input.content as string;
      if (!content) {
        return { success: false, error: 'Note content is required' };
      }

      const note = await this.storage.insert<Note>('notes', {
        contactId: input.contactId as string | undefined,
        dealId: input.dealId as string | undefined,
        activityId: undefined,
        content,
        format: (input.format as Note['format']) ?? 'markdown',
        title: input.title as string | undefined,
        visibility: (input.visibility as Note['visibility']) ?? 'team',
        createdBy: undefined,
        pinned: (input.pinned as boolean) ?? false,
        tags: (input.tags as string[]) ?? [],
        mediaIds: [],
      });

      return { success: true, data: note };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getNote(input: ToolInput): Promise<ToolOutput> {
    try {
      const id = input.id as string | undefined;
      if (!id) {
        return { success: false, error: 'Note ID is required' };
      }

      const note = this.storage.get<Note>('notes', id);
      if (!note) {
        return { success: false, error: `Note not found: ${id}` };
      }

      return { success: true, data: note };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateNote(input: ToolInput): Promise<ToolOutput> {
    try {
      const id = input.id as string | undefined;
      if (!id) {
        return { success: false, error: 'Note ID is required' };
      }

      const updates: Partial<Note> = {};
      if (input.content !== undefined) updates.content = input.content as string;
      if (input.title !== undefined) updates.title = input.title as string;
      if (input.visibility !== undefined) updates.visibility = input.visibility as Note['visibility'];
      if (input.pinned !== undefined) updates.pinned = input.pinned as boolean;
      if (input.tags !== undefined) updates.tags = input.tags as string[];

      const note = await this.storage.update<Note>('notes', id, updates);
      return { success: true, data: note };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deleteNote(input: ToolInput): Promise<ToolOutput> {
    try {
      const id = input.id as string | undefined;
      if (!id) {
        return { success: false, error: 'Note ID is required' };
      }

      const deleted = await this.storage.delete('notes', id);
      return { success: true, data: { id, deleted } };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listNotes(input: ToolInput): Promise<ToolOutput> {
    try {
      const limit = (input.limit as number) ?? 20;
      const offset = (input.offset as number) ?? 0;

      const notes = this.storage.list<Note>('notes', { limit, offset });
      const total = this.storage.count('notes');

      return { success: true, data: { notes, total } };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ============================================================================
  // Tag Handlers
  // ============================================================================

  async createTag(input: ToolInput): Promise<ToolOutput> {
    try {
      const name = input.name as string;
      const label = input.label as string;
      const color = input.color as string;

      if (!name || !label || !color) {
        return { success: false, error: 'Tag name, label, and color are required' };
      }

      const tag = await this.storage.insert<Tag>('tags', {
        name,
        label,
        color,
        category: (input.category as Tag['category']) ?? 'general',
        description: input.description as string | undefined,
        icon: input.icon as string | undefined,
        usageCount: 0,
        parentId: input.parentId as string | undefined,
      });

      return { success: true, data: tag };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getTag(input: ToolInput): Promise<ToolOutput> {
    try {
      const id = input.id as string | undefined;
      const name = input.name as string | undefined;

      if (id) {
        const tag = this.storage.get<Tag>('tags', id);
        if (!tag) {
          return { success: false, error: `Tag not found: ${id}` };
        }
        return { success: true, data: tag };
      }

      if (name) {
        const tags = this.storage.search<Tag>('tags', 'name', name);
        if (tags.length === 0) {
          return { success: false, error: `Tag not found: ${name}` };
        }
        return { success: true, data: tags[0] };
      }

      return { success: false, error: 'Either id or name is required' };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listTags(input: ToolInput): Promise<ToolOutput> {
    try {
      let tags = this.storage.list<Tag>('tags', { limit: 100, offset: 0 });

      if (input.category && typeof input.category === 'string') {
        tags = tags.filter((t) => t.category === input.category);
      }

      return { success: true, data: { tags } };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deleteTag(input: ToolInput): Promise<ToolOutput> {
    try {
      const id = input.id as string | undefined;
      if (!id) {
        return { success: false, error: 'Tag ID is required' };
      }

      const deleted = await this.storage.delete('tags', id);
      return { success: true, data: { id, deleted } };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ============================================================================
  // Company Handlers
  // ============================================================================

  async createCompany(input: ToolInput): Promise<ToolOutput> {
    try {
      const name = input.name as string;
      if (!name) {
        return { success: false, error: 'Company name is required' };
      }

      const company = await this.storage.insert<Company>('companies', {
        name,
        website: input.website as string | undefined,
        industry: input.industry as Company['industry'],
        size: input.size as Company['size'],
        employeeCount: input.employeeCount as number | undefined,
        annualRevenue: input.annualRevenue as number | undefined,
        currency: undefined,
        address: undefined,
        phone: undefined,
        emailDomain: undefined,
        linkedInUrl: undefined,
        tags: (input.tags as string[]) ?? [],
        customFields: [],
        ownerId: undefined,
        notes: undefined,
      });

      return { success: true, data: company };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getCompany(input: ToolInput): Promise<ToolOutput> {
    try {
      const id = input.id as string | undefined;
      if (!id) {
        return { success: false, error: 'Company ID is required' };
      }

      const company = this.storage.get<Company>('companies', id);
      if (!company) {
        return { success: false, error: `Company not found: ${id}` };
      }

      return { success: true, data: company };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateCompany(input: ToolInput): Promise<ToolOutput> {
    try {
      const id = input.id as string | undefined;
      if (!id) {
        return { success: false, error: 'Company ID is required' };
      }

      const updates: Partial<Company> = {};
      if (input.name !== undefined) updates.name = input.name as string;
      if (input.website !== undefined) updates.website = input.website as string;
      if (input.industry !== undefined) updates.industry = input.industry as Company['industry'];
      if (input.size !== undefined) updates.size = input.size as Company['size'];
      if (input.employeeCount !== undefined) updates.employeeCount = input.employeeCount as number;
      if (input.annualRevenue !== undefined) updates.annualRevenue = input.annualRevenue as number;
      if (input.tags !== undefined) updates.tags = input.tags as string[];

      const company = await this.storage.update<Company>('companies', id, updates);
      return { success: true, data: company };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deleteCompany(input: ToolInput): Promise<ToolOutput> {
    try {
      const id = input.id as string | undefined;
      if (!id) {
        return { success: false, error: 'Company ID is required' };
      }

      const deleted = await this.storage.delete('companies', id);
      return { success: true, data: { id, deleted } };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listCompanies(input: ToolInput): Promise<ToolOutput> {
    try {
      const limit = (input.limit as number) ?? 20;
      const offset = (input.offset as number) ?? 0;

      let companies = this.storage.list<Company>('companies', { limit, offset });

      if (input.industry && typeof input.industry === 'string') {
        companies = companies.filter((c) => c.industry === input.industry);
      }

      const total = this.storage.count('companies');

      return { success: true, data: { companies, total } };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ============================================================================
  // Stats & Dashboard Handlers
  // ============================================================================

  async getStats(): Promise<ToolOutput> {
    try {
      const stats = this.storage.getStats();
      return { success: true, data: stats };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getDashboard(input: ToolInput): Promise<ToolOutput> {
    try {
      const stats = this.storage.getStats();

      // Get deals by stage
      const stages = ['prospecting', 'qualification', 'needs_analysis', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
      const dealsByStage: Record<string, number> = {};

      for (const stage of stages) {
        const deals = this.storage.findByIndex<Deal>('deals_by_stage', stage);
        dealsByStage[stage] = deals.length;
      }

      // Get recent activities
      const recentActivities = this.storage.list<Activity>('activities', { limit: 10, offset: 0 });

      return {
        success: true,
        data: {
          stats,
          dealsByStage,
          recentActivities,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ============================================================================
  // Error Handling
  // ============================================================================

  private handleError(error: unknown): ToolOutput {
    if (error instanceof CRMError) {
      return {
        success: false,
        error: error.message,
        metadata: { code: error.code },
      };
    }

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: String(error),
    };
  }
}
