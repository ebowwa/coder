/**
 * MCP Tool definitions for CRM operations
 * Defines the schema for each tool exposed via MCP
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

/** Tool definitions for all CRM MCP tools */
export const TOOL_DEFINITIONS: Tool[] = [
  // ============================================================================
  // Contact Tools
  // ============================================================================

  {
    name: 'crm_create_contact',
    description: 'Create a new contact in the CRM',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Full name of the contact',
        },
        firstName: {
          type: 'string',
          description: 'First name',
        },
        lastName: {
          type: 'string',
          description: 'Last name',
        },
        emails: {
          type: 'array',
          description: 'Email addresses',
          items: {
            type: 'object',
            properties: {
              email: { type: 'string' },
              type: { type: 'string', enum: ['personal', 'work', 'other'] },
              primary: { type: 'boolean' },
            },
            required: ['email'],
          },
        },
        phones: {
          type: 'array',
          description: 'Phone numbers',
          items: {
            type: 'object',
            properties: {
              number: { type: 'string' },
              type: { type: 'string', enum: ['mobile', 'home', 'work', 'other'] },
              primary: { type: 'boolean' },
            },
            required: ['number'],
          },
        },
        company: {
          type: 'string',
          description: 'Company name',
        },
        title: {
          type: 'string',
          description: 'Job title',
        },
        tags: {
          type: 'array',
          description: 'Tags for categorization',
          items: { type: 'string' },
        },
        source: {
          type: 'string',
          enum: ['organic', 'referral', 'advertisement', 'social_media', 'email_campaign', 'website', 'event', 'cold_outreach', 'partner', 'other'],
        },
        status: {
          type: 'string',
          enum: ['lead', 'prospect', 'qualified', 'customer', 'churned', 'archived'],
          default: 'lead',
        },
        customFields: {
          type: 'array',
          description: 'Custom fields',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              value: {},
              type: { type: 'string', enum: ['string', 'number', 'boolean', 'date', 'select', 'multiselect'] },
            },
          },
        },
      },
      required: ['name'],
    },
  },

  {
    name: 'crm_get_contact',
    description: 'Get a contact by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Contact ID (UUID)',
        },
      },
      required: ['id'],
    },
  },

  {
    name: 'crm_update_contact',
    description: 'Update an existing contact',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Contact ID to update',
        },
        name: { type: 'string', description: 'Full name' },
        firstName: { type: 'string', description: 'First name' },
        lastName: { type: 'string', description: 'Last name' },
        emails: { type: 'array', description: 'Email addresses', items: { type: 'object' } },
        phones: { type: 'array', description: 'Phone numbers', items: { type: 'object' } },
        company: { type: 'string', description: 'Company name' },
        title: { type: 'string', description: 'Job title' },
        tags: { type: 'array', items: { type: 'string' } },
        status: {
          type: 'string',
          enum: ['lead', 'prospect', 'qualified', 'customer', 'churned', 'archived'],
        },
        customFields: { type: 'array', items: { type: 'object' } },
      },
      required: ['id'],
    },
  },

  {
    name: 'crm_delete_contact',
    description: 'Delete a contact by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Contact ID to delete',
        },
      },
      required: ['id'],
    },
  },

  {
    name: 'crm_list_contacts',
    description: 'List contacts with optional filtering and pagination',
    inputSchema: {
      type: 'object',
      properties: {
        search: {
          type: 'string',
          description: 'Search query for name, email, company',
        },
        status: {
          type: 'array',
          description: 'Filter by status',
          items: { type: 'string', enum: ['lead', 'prospect', 'qualified', 'customer', 'churned', 'archived'] },
        },
        tags: {
          type: 'array',
          description: 'Filter by tags',
          items: { type: 'string' },
        },
        source: {
          type: 'array',
          description: 'Filter by source',
          items: { type: 'string' },
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 20)',
        },
        offset: {
          type: 'number',
          description: 'Number of results to skip',
        },
      },
    },
  },

  {
    name: 'crm_search_contacts',
    description: 'Search contacts by email address',
    inputSchema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          description: 'Email address to search for',
        },
      },
      required: ['email'],
    },
  },

  // ============================================================================
  // Deal Tools
  // ============================================================================

  {
    name: 'crm_create_deal',
    description: 'Create a new deal/opportunity',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Deal title',
        },
        contactId: {
          type: 'string',
          description: 'Associated contact ID',
        },
        value: {
          type: 'number',
          description: 'Deal value',
        },
        currency: {
          type: 'string',
          enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'BRL', 'MXN'],
          default: 'USD',
        },
        stage: {
          type: 'string',
          enum: ['prospecting', 'qualification', 'needs_analysis', 'proposal', 'negotiation', 'closed_won', 'closed_lost'],
          default: 'prospecting',
        },
        probability: {
          type: 'number',
          description: 'Win probability (0-100)',
          minimum: 0,
          maximum: 100,
        },
        expectedClose: {
          type: 'string',
          description: 'Expected close date (ISO 8601)',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          default: 'medium',
        },
        notes: {
          type: 'string',
          description: 'Deal notes',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['title', 'contactId', 'value', 'expectedClose'],
    },
  },

  {
    name: 'crm_get_deal',
    description: 'Get a deal by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Deal ID (UUID)',
        },
      },
      required: ['id'],
    },
  },

  {
    name: 'crm_update_deal',
    description: 'Update an existing deal',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Deal ID to update',
        },
        title: { type: 'string' },
        value: { type: 'number' },
        stage: {
          type: 'string',
          enum: ['prospecting', 'qualification', 'needs_analysis', 'proposal', 'negotiation', 'closed_won', 'closed_lost'],
        },
        probability: { type: 'number', minimum: 0, maximum: 100 },
        expectedClose: { type: 'string' },
        actualClose: { type: 'string' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
        notes: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['id'],
    },
  },

  {
    name: 'crm_delete_deal',
    description: 'Delete a deal by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Deal ID to delete',
        },
      },
      required: ['id'],
    },
  },

  {
    name: 'crm_list_deals',
    description: 'List deals with optional filtering',
    inputSchema: {
      type: 'object',
      properties: {
        contactId: {
          type: 'string',
          description: 'Filter by contact ID',
        },
        stage: {
          type: 'array',
          description: 'Filter by stage',
          items: { type: 'string' },
        },
        priority: {
          type: 'array',
          items: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
        },
        minValue: {
          type: 'number',
          description: 'Minimum deal value',
        },
        maxValue: {
          type: 'number',
          description: 'Maximum deal value',
        },
        limit: { type: 'number' },
        offset: { type: 'number' },
      },
    },
  },

  {
    name: 'crm_get_deals_by_stage',
    description: 'Get all deals in a specific pipeline stage',
    inputSchema: {
      type: 'object',
      properties: {
        stage: {
          type: 'string',
          enum: ['prospecting', 'qualification', 'needs_analysis', 'proposal', 'negotiation', 'closed_won', 'closed_lost'],
        },
      },
      required: ['stage'],
    },
  },

  // ============================================================================
  // Activity Tools
  // ============================================================================

  {
    name: 'crm_create_activity',
    description: 'Log a new activity (call, email, meeting, task, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        contactId: {
          type: 'string',
          description: 'Associated contact ID',
        },
        dealId: {
          type: 'string',
          description: 'Associated deal ID',
        },
        type: {
          type: 'string',
          enum: ['call', 'email', 'meeting', 'task', 'note', 'sms', 'video_call', 'demo', 'proposal_sent', 'contract_sent', 'follow_up', 'social_media', 'event', 'other'],
        },
        title: {
          type: 'string',
          description: 'Activity title',
        },
        description: {
          type: 'string',
          description: 'Activity description',
        },
        timestamp: {
          type: 'string',
          description: 'Activity timestamp (ISO 8601)',
        },
        duration: {
          type: 'number',
          description: 'Duration in seconds',
        },
        metadata: {
          type: 'object',
          description: 'Activity-specific metadata',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['type', 'title'],
    },
  },

  {
    name: 'crm_get_activity',
    description: 'Get an activity by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Activity ID',
        },
      },
      required: ['id'],
    },
  },

  {
    name: 'crm_list_activities',
    description: 'List activities with optional filtering',
    inputSchema: {
      type: 'object',
      properties: {
        contactId: {
          type: 'string',
          description: 'Filter by contact ID',
        },
        dealId: {
          type: 'string',
          description: 'Filter by deal ID',
        },
        type: {
          type: 'array',
          description: 'Filter by activity type',
          items: { type: 'string' },
        },
        limit: { type: 'number' },
        offset: { type: 'number' },
      },
    },
  },

  {
    name: 'crm_delete_activity',
    description: 'Delete an activity by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Activity ID to delete',
        },
      },
      required: ['id'],
    },
  },

  // ============================================================================
  // Media Tools
  // ============================================================================

  {
    name: 'crm_upload_media',
    description: 'Register a media file (image, video, audio, document) attached to an entity',
    inputSchema: {
      type: 'object',
      properties: {
        entityType: {
          type: 'string',
          enum: ['contact', 'deal', 'activity', 'note', 'company'],
        },
        entityId: {
          type: 'string',
          description: 'ID of the entity this media belongs to',
        },
        type: {
          type: 'string',
          enum: ['image', 'video', 'audio', 'document', 'spreadsheet', 'presentation', 'pdf', 'archive', 'other'],
        },
        filename: {
          type: 'string',
          description: 'Original filename',
        },
        mimeType: {
          type: 'string',
          description: 'MIME type',
        },
        size: {
          type: 'number',
          description: 'File size in bytes',
        },
        url: {
          type: 'string',
          description: 'Storage URL or path',
        },
        thumbnailUrl: {
          type: 'string',
          description: 'Thumbnail URL (for images/videos)',
        },
        altText: {
          type: 'string',
          description: 'Alt text for accessibility',
        },
        caption: {
          type: 'string',
          description: 'Caption/description',
        },
        isPublic: {
          type: 'boolean',
          default: false,
        },
      },
      required: ['entityType', 'entityId', 'type', 'filename', 'mimeType', 'size', 'url'],
    },
  },

  {
    name: 'crm_get_media',
    description: 'Get media by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Media ID',
        },
      },
      required: ['id'],
    },
  },

  {
    name: 'crm_list_media',
    description: 'List media for an entity',
    inputSchema: {
      type: 'object',
      properties: {
        entityType: {
          type: 'string',
          enum: ['contact', 'deal', 'activity', 'note', 'company'],
        },
        entityId: {
          type: 'string',
          description: 'Entity ID to get media for',
        },
        type: {
          type: 'string',
          enum: ['image', 'video', 'audio', 'document', 'spreadsheet', 'presentation', 'pdf', 'archive', 'other'],
        },
      },
      required: ['entityId'],
    },
  },

  {
    name: 'crm_delete_media',
    description: 'Delete media by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Media ID to delete',
        },
      },
      required: ['id'],
    },
  },

  // ============================================================================
  // Note Tools
  // ============================================================================

  {
    name: 'crm_create_note',
    description: 'Create a note attached to a contact or deal',
    inputSchema: {
      type: 'object',
      properties: {
        contactId: {
          type: 'string',
          description: 'Contact ID',
        },
        dealId: {
          type: 'string',
          description: 'Deal ID',
        },
        content: {
          type: 'string',
          description: 'Note content (supports markdown)',
        },
        format: {
          type: 'string',
          enum: ['plain', 'markdown', 'html'],
          default: 'markdown',
        },
        title: {
          type: 'string',
          description: 'Note title',
        },
        visibility: {
          type: 'string',
          enum: ['private', 'team', 'public'],
          default: 'team',
        },
        pinned: {
          type: 'boolean',
          default: false,
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['content'],
    },
  },

  {
    name: 'crm_get_note',
    description: 'Get a note by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Note ID',
        },
      },
      required: ['id'],
    },
  },

  {
    name: 'crm_update_note',
    description: 'Update an existing note',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Note ID to update',
        },
        content: { type: 'string' },
        title: { type: 'string' },
        visibility: { type: 'string', enum: ['private', 'team', 'public'] },
        pinned: { type: 'boolean' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['id'],
    },
  },

  {
    name: 'crm_delete_note',
    description: 'Delete a note by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Note ID to delete',
        },
      },
      required: ['id'],
    },
  },

  {
    name: 'crm_list_notes',
    description: 'List notes for a contact or deal',
    inputSchema: {
      type: 'object',
      properties: {
        contactId: {
          type: 'string',
          description: 'Filter by contact ID',
        },
        dealId: {
          type: 'string',
          description: 'Filter by deal ID',
        },
        limit: { type: 'number' },
        offset: { type: 'number' },
      },
    },
  },

  // ============================================================================
  // Tag Tools
  // ============================================================================

  {
    name: 'crm_create_tag',
    description: 'Create a new tag for categorization',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Tag name (slug-friendly)',
          pattern: '^[a-z0-9-]+$',
        },
        label: {
          type: 'string',
          description: 'Display label',
        },
        color: {
          type: 'string',
          description: 'Color (hex or named)',
        },
        category: {
          type: 'string',
          enum: ['general', 'industry', 'source', 'status', 'priority', 'product', 'region', 'custom'],
          default: 'general',
        },
        description: {
          type: 'string',
          description: 'Tag description',
        },
        icon: {
          type: 'string',
          description: 'Icon (emoji or icon name)',
        },
        parentId: {
          type: 'string',
          description: 'Parent tag ID (for hierarchical tags)',
        },
      },
      required: ['name', 'label', 'color'],
    },
  },

  {
    name: 'crm_get_tag',
    description: 'Get a tag by ID or name',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Tag ID',
        },
        name: {
          type: 'string',
          description: 'Tag name',
        },
      },
    },
  },

  {
    name: 'crm_list_tags',
    description: 'List all tags',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['general', 'industry', 'source', 'status', 'priority', 'product', 'region', 'custom'],
        },
      },
    },
  },

  {
    name: 'crm_delete_tag',
    description: 'Delete a tag by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Tag ID to delete',
        },
      },
      required: ['id'],
    },
  },

  // ============================================================================
  // Company Tools
  // ============================================================================

  {
    name: 'crm_create_company',
    description: 'Create a company/organization',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Company name',
        },
        website: {
          type: 'string',
          description: 'Website URL',
        },
        industry: {
          type: 'string',
          enum: ['technology', 'finance', 'healthcare', 'education', 'retail', 'manufacturing', 'consulting', 'marketing', 'legal', 'real_estate', 'construction', 'transportation', 'hospitality', 'energy', 'telecommunications', 'government', 'non_profit', 'other'],
        },
        size: {
          type: 'string',
          enum: ['sole_proprietor', 'startup', 'small', 'medium', 'large', 'enterprise'],
        },
        employeeCount: {
          type: 'number',
          description: 'Number of employees',
        },
        annualRevenue: {
          type: 'number',
          description: 'Annual revenue',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['name'],
    },
  },

  {
    name: 'crm_get_company',
    description: 'Get a company by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Company ID',
        },
      },
      required: ['id'],
    },
  },

  {
    name: 'crm_update_company',
    description: 'Update a company',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Company ID to update',
        },
        name: { type: 'string' },
        website: { type: 'string' },
        industry: { type: 'string' },
        size: { type: 'string' },
        employeeCount: { type: 'number' },
        annualRevenue: { type: 'number' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['id'],
    },
  },

  {
    name: 'crm_delete_company',
    description: 'Delete a company by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Company ID to delete',
        },
      },
      required: ['id'],
    },
  },

  {
    name: 'crm_list_companies',
    description: 'List companies with optional filtering',
    inputSchema: {
      type: 'object',
      properties: {
        search: {
          type: 'string',
          description: 'Search query for company name',
        },
        industry: {
          type: 'string',
          enum: ['technology', 'finance', 'healthcare', 'education', 'retail', 'manufacturing', 'consulting', 'marketing', 'legal', 'real_estate', 'construction', 'transportation', 'hospitality', 'energy', 'telecommunications', 'government', 'non_profit', 'other'],
        },
        size: {
          type: 'array',
          items: { type: 'string', enum: ['sole_proprietor', 'startup', 'small', 'medium', 'large', 'enterprise'] },
        },
        limit: { type: 'number' },
        offset: { type: 'number' },
      },
    },
  },

  // ============================================================================
  // Stats & Dashboard Tools
  // ============================================================================

  {
    name: 'crm_get_stats',
    description: 'Get CRM statistics (counts of all entity types)',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  {
    name: 'crm_get_dashboard',
    description: 'Get dashboard data with deals by stage and recent activities',
    inputSchema: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['day', 'week', 'month', 'quarter', 'year'],
          default: 'month',
        },
      },
    },
  },
];

/**
 * Get tool definition by name
 */
export function getToolDefinition(name: string): Tool | undefined {
  return TOOL_DEFINITIONS.find((t) => t.name === name);
}

/**
 * List all tool names
 */
export function listToolNames(): string[] {
  return TOOL_DEFINITIONS.map((t) => t.name);
}
