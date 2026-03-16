/**
 * Zod Validation Schemas for CRM System
 *
 * Provides runtime validation for all CRM types.
 * Import and use schemas to validate data at boundaries.
 */

import { z } from 'zod';

// ============================================================================
// Base Schemas
// ============================================================================

/** UUID validation */
export const uuidSchema = z.string().uuid();

/** Timestamp validation (ISO 8601) */
export const timestampSchema = z.string().datetime();

/** Metadata schema for flexible key-value objects */
export const metadataSchema: z.ZodType<Record<string, unknown>> = z.record(
  z.string(),
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.lazy(() => metadataSchema),
    z.array(z.lazy(() => metadataSchema)),
  ])
);

// ============================================================================
// Contact Schemas
// ============================================================================

export const phoneNumberTypeSchema = z.enum(['mobile', 'home', 'work', 'other']);

export const emailTypeSchema = z.enum(['personal', 'work', 'other']);

export const addressTypeSchema = z.enum(['home', 'work', 'billing', 'shipping', 'other']);

export const socialPlatformSchema = z.enum([
  'linkedin',
  'twitter',
  'facebook',
  'instagram',
  'github',
  'other',
]);

export const customFieldTypeSchema = z.enum(['string', 'number', 'boolean', 'date', 'select', 'multiselect']);

export const contactSourceSchema = z.enum([
  'organic',
  'referral',
  'advertisement',
  'social_media',
  'email_campaign',
  'website',
  'event',
  'cold_outreach',
  'partner',
  'other',
]);

export const contactStatusSchema = z.enum([
  'lead',
  'prospect',
  'qualified',
  'customer',
  'churned',
  'archived',
]);

export const phoneNumberSchema = z.object({
  number: z.string().min(1).max(50),
  type: phoneNumberTypeSchema,
  primary: z.boolean().default(false),
});

export const emailSchema = z.object({
  email: z.string().email(),
  type: emailTypeSchema,
  primary: z.boolean().default(false),
});

export const addressSchema = z.object({
  street: z.string().min(1).max(500),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  postalCode: z.string().min(1).max(20),
  country: z.string().min(2).max(100),
  type: addressTypeSchema,
});

export const socialProfileSchema = z.object({
  platform: socialPlatformSchema,
  handle: z.string().min(1).max(100),
  url: z.string().url().optional(),
});

export const customFieldSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.union([z.string(), z.number(), z.boolean(), z.coerce.date(), z.null()]),
  type: customFieldTypeSchema,
});

export const contactSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(500),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  emails: z.array(emailSchema).default([]),
  phones: z.array(phoneNumberSchema).default([]),
  addresses: z.array(addressSchema).default([]),
  company: z.string().max(200).optional(),
  title: z.string().max(200).optional(),
  department: z.string().max(100).optional(),
  socialProfiles: z.array(socialProfileSchema).default([]),
  website: z.string().url().optional(),
  tags: z.array(z.string().max(100)).default([]),
  customFields: z.array(customFieldSchema).default([]),
  source: contactSourceSchema.optional(),
  status: contactStatusSchema.default('lead'),
  ownerId: uuidSchema.optional(),
  avatar: z.string().optional(),
  preferredContact: z.enum(['email', 'phone', 'sms', 'none']).optional(),
  language: z.string().max(10).optional(),
  timezone: z.string().max(100).optional(),
  preferences: z.string().max(2000).optional(),
  leadScore: z.number().int().min(0).max(100).optional(),
  doNotContact: z.boolean().default(false),
  lastContactedAt: timestampSchema.optional(),
  nextFollowUpAt: timestampSchema.optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

// Contact creation schema (without id, timestamps)
export const createContactSchema = contactSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Contact update schema (partial, with required id)
export const updateContactSchema = contactSchema.partial().required({ id: true });

// ============================================================================
// Deal Schemas
// ============================================================================

export const dealStageSchema = z.enum([
  'prospecting',
  'qualification',
  'needs_analysis',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
]);

export const dealPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

export const currencySchema = z.enum([
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
  'JPY',
  'CNY',
  'INR',
  'BRL',
  'MXN',
]);

export const discountTypeSchema = z.enum(['percentage', 'fixed']);

export const dealLineItemSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  discount: z.number().nonnegative().optional(),
  discountType: discountTypeSchema.optional(),
  total: z.number().nonnegative(),
});

export const competitorSchema = z.object({
  name: z.string().min(1).max(200),
  strengths: z.array(z.string()).optional(),
  weaknesses: z.array(z.string()).optional(),
  notes: z.string().max(2000).optional(),
});

export const dealSchema = z.object({
  id: uuidSchema,
  title: z.string().min(1).max(500),
  contactId: uuidSchema,
  companyId: uuidSchema.optional(),
  value: z.number().nonnegative(),
  currency: currencySchema.default('USD'),
  stage: dealStageSchema.default('prospecting'),
  probability: z.number().int().min(0).max(100).default(0),
  expectedClose: timestampSchema,
  actualClose: timestampSchema.optional(),
  priority: dealPrioritySchema.default('medium'),
  lineItems: z.array(dealLineItemSchema).default([]),
  discount: z.number().nonnegative().optional(),
  discountType: discountTypeSchema.optional(),
  totalValue: z.number().nonnegative(),
  notes: z.string().max(10000).default(''),
  tags: z.array(z.string().max(100)).default([]),
  competitors: z.array(competitorSchema).default([]),
  lossReason: z.string().max(1000).optional(),
  nextSteps: z.array(z.string()).optional(),
  ownerId: uuidSchema.optional(),
  source: z.string().max(200).optional(),
  customFields: z.array(customFieldSchema).default([]),
  lastActivityAt: timestampSchema.optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const createDealSchema = dealSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateDealSchema = dealSchema.partial().required({ id: true });

// ============================================================================
// Activity Schemas
// ============================================================================

export const activityTypeSchema = z.enum([
  'call',
  'email',
  'meeting',
  'task',
  'note',
  'sms',
  'video_call',
  'demo',
  'proposal_sent',
  'contract_sent',
  'follow_up',
  'social_media',
  'event',
  'other',
]);

export const callOutcomeSchema = z.enum([
  'connected',
  'voicemail',
  'no_answer',
  'busy',
  'wrong_number',
  'disconnected',
]);

export const meetingOutcomeSchema = z.enum([
  'completed',
  'rescheduled',
  'cancelled',
  'no_show',
]);

export const emailStatusSchema = z.enum([
  'sent',
  'delivered',
  'opened',
  'clicked',
  'replied',
  'bounced',
  'unsubscribed',
]);

export const taskStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'cancelled',
]);

export const taskPrioritySchema = z.enum(['low', 'medium', 'high']);

export const callDirectionSchema = z.enum(['inbound', 'outbound']);

export const callMetadataSchema = z.object({
  outcome: callOutcomeSchema,
  recording: z.string().optional(),
  transcription: z.string().optional(),
  fromNumber: z.string().max(50).optional(),
  toNumber: z.string().max(50).optional(),
  direction: callDirectionSchema,
});

export const meetingMetadataSchema = z.object({
  outcome: meetingOutcomeSchema,
  location: z.string().max(500).optional(),
  meetingUrl: z.string().url().optional(),
  calendarEventId: z.string().optional(),
  attendees: z.array(z.string()).optional(),
  recording: z.string().optional(),
  notes: z.string().max(10000).optional(),
});

export const emailMetadataSchema = z.object({
  status: emailStatusSchema,
  subject: z.string().min(1).max(500),
  from: z.string().email(),
  to: z.array(z.string().email()).min(1),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  templateId: z.string().optional(),
  trackingOpens: z.boolean().default(true),
  trackingClicks: z.boolean().default(true),
});

export const checklistItemSchema = z.object({
  item: z.string().min(1).max(500),
  completed: z.boolean().default(false),
});

export const taskMetadataSchema = z.object({
  status: taskStatusSchema,
  dueDate: timestampSchema.optional(),
  reminderAt: timestampSchema.optional(),
  priority: taskPrioritySchema,
  assigneeId: uuidSchema.optional(),
  checklist: z.array(checklistItemSchema).optional(),
});

// Discriminated union for activity metadata
export const activityMetadataSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('call'), ...callMetadataSchema.shape }),
  z.object({ type: z.literal('meeting'), ...meetingMetadataSchema.shape }),
  z.object({ type: z.literal('email'), ...emailMetadataSchema.shape }),
  z.object({ type: z.literal('task'), ...taskMetadataSchema.shape }),
]).or(metadataSchema);

export const activitySchema = z.object({
  id: uuidSchema,
  contactId: uuidSchema.optional(),
  dealId: uuidSchema.optional(),
  type: activityTypeSchema,
  title: z.string().min(1).max(500),
  description: z.string().max(10000).default(''),
  timestamp: timestampSchema,
  duration: z.number().int().nonnegative().optional(),
  metadata: metadataSchema,
  createdBy: uuidSchema.optional(),
  tags: z.array(z.string().max(100)).default([]),
  customFields: z.array(customFieldSchema).default([]),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const createActivitySchema = activitySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateActivitySchema = activitySchema.partial().required({ id: true });

// ============================================================================
// Media Schemas
// ============================================================================

export const mediaTypeSchema = z.enum([
  'image',
  'video',
  'audio',
  'document',
  'spreadsheet',
  'presentation',
  'pdf',
  'archive',
  'other',
]);

export const mimeTypeSchema = z.string().max(200);

export const mediaEntityTypeSchema = z.enum([
  'contact',
  'deal',
  'activity',
  'note',
  'company',
]);

export const imageMetadataSchema = z.object({
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  orientation: z.enum(['landscape', 'portrait', 'square']).optional(),
  colorSpace: z.string().max(50).optional(),
  hasAlpha: z.boolean().optional(),
});

export const videoMetadataSchema = z.object({
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  duration: z.number().nonnegative().optional(),
  frameRate: z.number().positive().optional(),
  codec: z.string().max(50).optional(),
  bitrate: z.number().nonnegative().optional(),
  hasAudio: z.boolean().optional(),
});

export const audioMetadataSchema = z.object({
  duration: z.number().nonnegative().optional(),
  sampleRate: z.number().positive().optional(),
  channels: z.number().int().positive().optional(),
  bitrate: z.number().nonnegative().optional(),
  codec: z.string().max(50).optional(),
});

export const documentMetadataSchema = z.object({
  pageCount: z.number().int().positive().optional(),
  author: z.string().max(200).optional(),
  title: z.string().max(500).optional(),
  subject: z.string().max(500).optional(),
  keywords: z.array(z.string()).optional(),
  createdAt: timestampSchema.optional(),
  modifiedAt: timestampSchema.optional(),
});

export const mediaSchema = z.object({
  id: uuidSchema,
  entityType: mediaEntityTypeSchema,
  entityId: uuidSchema,
  type: mediaTypeSchema,
  filename: z.string().min(1).max(500),
  mimeType: mimeTypeSchema,
  size: z.number().int().nonnegative(),
  url: z.string().min(1).max(2000),
  thumbnailUrl: z.string().max(2000).optional(),
  metadata: metadataSchema,
  altText: z.string().max(500).optional(),
  caption: z.string().max(1000).optional(),
  isPublic: z.boolean().default(false),
  downloadCount: z.number().int().nonnegative().default(0),
  uploadedBy: uuidSchema.optional(),
  expiresAt: timestampSchema.optional(),
  createdAt: timestampSchema,
});

export const createMediaSchema = mediaSchema.omit({
  id: true,
  createdAt: true,
  downloadCount: true,
});

export const updateMediaSchema = mediaSchema.partial().required({ id: true });

// ============================================================================
// Note Schemas
// ============================================================================

export const noteVisibilitySchema = z.enum(['private', 'team', 'public']);

export const noteFormatSchema = z.enum(['plain', 'markdown', 'html']);

export const noteSchema = z.object({
  id: uuidSchema,
  contactId: uuidSchema.optional(),
  dealId: uuidSchema.optional(),
  activityId: uuidSchema.optional(),
  content: z.string().min(1).max(100000),
  format: noteFormatSchema.default('markdown'),
  title: z.string().max(500).optional(),
  visibility: noteVisibilitySchema.default('team'),
  createdBy: uuidSchema.optional(),
  pinned: z.boolean().default(false),
  tags: z.array(z.string().max(100)).default([]),
  mediaIds: z.array(uuidSchema).default([]),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const createNoteSchema = noteSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateNoteSchema = noteSchema.partial().required({ id: true });

// ============================================================================
// Tag Schemas
// ============================================================================

export const tagCategorySchema = z.enum([
  'general',
  'industry',
  'source',
  'status',
  'priority',
  'product',
  'region',
  'custom',
]);

export const tagSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Tag name must be lowercase alphanumeric with hyphens'),
  label: z.string().min(1).max(100),
  color: z.string().max(20).regex(/^#?[0-9a-fA-F]{3,6}$|^[a-zA-Z]+$/, 'Invalid color format'),
  category: tagCategorySchema.default('general'),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  usageCount: z.number().int().nonnegative().default(0),
  parentId: uuidSchema.optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const createTagSchema = tagSchema.omit({
  id: true,
  usageCount: true,
  createdAt: true,
  updatedAt: true,
});

export const updateTagSchema = tagSchema.partial().required({ id: true });

// ============================================================================
// Company Schemas
// ============================================================================

export const companySizeSchema = z.enum([
  'sole_proprietor',
  'startup',
  'small',
  'medium',
  'large',
  'enterprise',
]);

export const industrySchema = z.enum([
  'technology',
  'finance',
  'healthcare',
  'education',
  'retail',
  'manufacturing',
  'consulting',
  'marketing',
  'legal',
  'real_estate',
  'construction',
  'transportation',
  'hospitality',
  'energy',
  'telecommunications',
  'government',
  'non_profit',
  'other',
]);

export const companySchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(200),
  website: z.string().url().optional(),
  industry: industrySchema.optional(),
  size: companySizeSchema.optional(),
  employeeCount: z.number().int().nonnegative().optional(),
  annualRevenue: z.number().nonnegative().optional(),
  currency: currencySchema.optional(),
  address: addressSchema.optional(),
  phone: z.string().max(50).optional(),
  emailDomain: z.string().max(200).optional(),
  linkedInUrl: z.string().url().optional(),
  tags: z.array(z.string().max(100)).default([]),
  customFields: z.array(customFieldSchema).default([]),
  ownerId: uuidSchema.optional(),
  notes: z.string().max(10000).optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const createCompanySchema = companySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateCompanySchema = companySchema.partial().required({ id: true });

// ============================================================================
// Pipeline Schemas
// ============================================================================

export const pipelineStageSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(100),
  order: z.number().int().nonnegative(),
  probability: z.number().int().min(0).max(100),
  color: z.string().max(20),
  description: z.string().max(500).optional(),
});

export const pipelineSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  stages: z.array(pipelineStageSchema).min(1),
  isDefault: z.boolean().default(false),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

// ============================================================================
// Filter Schemas
// ============================================================================

export const sortDirectionSchema = z.enum(['asc', 'desc']);

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().nonnegative().optional(),
});

export const dateRangeSchema = z.object({
  start: timestampSchema,
  end: timestampSchema,
}).refine(
  (data) => new Date(data.start) <= new Date(data.end),
  { message: 'Start date must be before or equal to end date' }
);

export const contactFilterSchema = z.object({
  search: z.string().max(500).optional(),
  status: z.array(contactStatusSchema).optional(),
  tags: z.array(z.string()).optional(),
  source: z.array(contactSourceSchema).optional(),
  ownerId: uuidSchema.optional(),
  companyId: uuidSchema.optional(),
  createdAt: dateRangeSchema.optional(),
  updatedAt: dateRangeSchema.optional(),
  lastContactedAt: dateRangeSchema.optional(),
  nextFollowUpAt: dateRangeSchema.optional(),
  hasEmail: z.boolean().optional(),
  hasPhone: z.boolean().optional(),
  leadScoreMin: z.number().int().min(0).max(100).optional(),
  leadScoreMax: z.number().int().min(0).max(100).optional(),
  doNotContact: z.boolean().optional(),
});

export const dealFilterSchema = z.object({
  search: z.string().max(500).optional(),
  contactId: uuidSchema.optional(),
  companyId: uuidSchema.optional(),
  stage: z.array(dealStageSchema).optional(),
  priority: z.array(dealPrioritySchema).optional(),
  ownerId: uuidSchema.optional(),
  tags: z.array(z.string()).optional(),
  createdAt: dateRangeSchema.optional(),
  updatedAt: dateRangeSchema.optional(),
  expectedClose: dateRangeSchema.optional(),
  valueMin: z.number().nonnegative().optional(),
  valueMax: z.number().nonnegative().optional(),
  probabilityMin: z.number().int().min(0).max(100).optional(),
  probabilityMax: z.number().int().min(0).max(100).optional(),
});

export const activityFilterSchema = z.object({
  contactId: uuidSchema.optional(),
  dealId: uuidSchema.optional(),
  type: z.array(activityTypeSchema).optional(),
  createdBy: uuidSchema.optional(),
  timestamp: dateRangeSchema.optional(),
  tags: z.array(z.string()).optional(),
});

// ============================================================================
// Paginated Response Schema
// ============================================================================

export function paginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
    hasMore: z.boolean(),
  });
}

// ============================================================================
// Export & Integration Schemas
// ============================================================================

export const exportFormatSchema = z.enum(['csv', 'xlsx', 'json', 'pdf']);

export const exportStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed']);

export const exportJobSchema = z.object({
  id: uuidSchema,
  entityType: z.enum(['contacts', 'deals', 'activities', 'notes']),
  format: exportFormatSchema,
  status: exportStatusSchema,
  filters: z.record(z.unknown()).optional(),
  fields: z.array(z.string()).optional(),
  downloadUrl: z.string().url().optional(),
  error: z.string().optional(),
  createdAt: timestampSchema,
  completedAt: timestampSchema.optional(),
  createdBy: uuidSchema,
});

export const integrationProviderSchema = z.enum([
  'google',
  'microsoft',
  'slack',
  'mailchimp',
  'hubspot',
  'salesforce',
  'zapier',
  'custom',
]);

export const integrationStatusSchema = z.enum(['connected', 'disconnected', 'error', 'pending']);

export const integrationSchema = z.object({
  id: uuidSchema,
  provider: integrationProviderSchema,
  name: z.string().min(1).max(200),
  status: integrationStatusSchema,
  configuredAt: timestampSchema,
  lastSyncAt: timestampSchema.optional(),
  settings: metadataSchema,
  error: z.string().optional(),
});

// ============================================================================
// Telemetry Schemas
// ============================================================================

export const telemetryEventTypeSchema = z.enum([
  'entity_created',
  'entity_updated',
  'entity_deleted',
  'entity_viewed',
  'search_performed',
  'export_created',
  'integration_sync',
  'error_occurred',
]);

export const telemetryEventSchema = z.object({
  id: uuidSchema,
  type: telemetryEventTypeSchema,
  entityType: z.string().max(100).optional(),
  entityId: uuidSchema.optional(),
  userId: uuidSchema.optional(),
  timestamp: timestampSchema,
  properties: metadataSchema,
  duration: z.number().nonnegative().optional(),
  success: z.boolean(),
  errorMessage: z.string().optional(),
});
