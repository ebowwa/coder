/**
 * Core Types for CRM System
 *
 * Defines all TypeScript interfaces for the CRM data model.
 * Supports contacts, deals, activities, media, notes, and tags.
 */

// ============================================================================
// Base Types
// ============================================================================

/** Unique identifier type */
export type UUID = string;

/** ISO 8601 timestamp string */
export type Timestamp = string;

/** Generic metadata object */
export interface Metadata {
  [key: string]: string | number | boolean | null | Metadata | Metadata[];
}

/** Base entity with common fields */
export interface BaseEntity {
  id: UUID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// Contact Types
// ============================================================================

/** Contact phone number with type */
export interface PhoneNumber {
  number: string;
  type: 'mobile' | 'home' | 'work' | 'other';
  primary: boolean;
}

/** Contact email address with type */
export interface EmailAddress {
  email: string;
  type: 'personal' | 'work' | 'other';
  primary: boolean;
}

/** Contact address */
export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  type: 'home' | 'work' | 'billing' | 'shipping' | 'other';
}

/** Social media profile */
export interface SocialProfile {
  platform: 'linkedin' | 'twitter' | 'facebook' | 'instagram' | 'github' | 'other';
  handle: string;
  url?: string;
}

/** Custom field value */
export interface CustomField {
  key: string;
  value: string | number | boolean | Date | null;
  type: 'string' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect';
}

/** Contact source tracking */
export type ContactSource =
  | 'organic'
  | 'referral'
  | 'advertisement'
  | 'social_media'
  | 'email_campaign'
  | 'website'
  | 'event'
  | 'cold_outreach'
  | 'partner'
  | 'other';

/** Contact status in the pipeline */
export type ContactStatus =
  | 'lead'
  | 'prospect'
  | 'qualified'
  | 'customer'
  | 'churned'
  | 'archived';

/**
 * Contact entity representing a person or organization in the CRM
 */
export interface Contact extends BaseEntity {
  /** Full name of the contact */
  name: string;

  /** First name */
  firstName?: string;

  /** Last name */
  lastName?: string;

  /** Email addresses (supports multiple) */
  emails: EmailAddress[];

  /** Phone numbers (supports multiple) */
  phones: PhoneNumber[];

  /** Physical addresses */
  addresses: Address[];

  /** Company/organization name */
  company?: string;

  /** Job title/position */
  title?: string;

  /** Department within company */
  department?: string;

  /** Social media profiles */
  socialProfiles: SocialProfile[];

  /** Website URL */
  website?: string;

  /** Tags for categorization */
  tags: string[];

  /** Custom fields for extensibility */
  customFields: CustomField[];

  /** Contact source/origin */
  source?: ContactSource;

  /** Current status in the pipeline */
  status: ContactStatus;

  /** Assigned owner/user ID */
  ownerId?: UUID;

  /** Profile picture URL or media ID */
  avatar?: string;

  /** Preferred contact method */
  preferredContact?: 'email' | 'phone' | 'sms' | 'none';

  /** Language preference (ISO code) */
  language?: string;

  /** Timezone (IANA format) */
  timezone?: string;

  /** Notes specific to contact preferences */
  preferences?: string;

  /** Lead score (0-100) */
  leadScore?: number;

  /** Do not contact flag */
  doNotContact: boolean;

  /** Last contact timestamp */
  lastContactedAt?: Timestamp;

  /** Next follow-up timestamp */
  nextFollowUpAt?: Timestamp;
}

// ============================================================================
// Deal Types
// ============================================================================

/** Deal stage in the pipeline */
export type DealStage =
  | 'prospecting'
  | 'qualification'
  | 'needs_analysis'
  | 'proposal'
  | 'negotiation'
  | 'closed_won'
  | 'closed_lost';

/** Deal priority level */
export type DealPriority = 'low' | 'medium' | 'high' | 'urgent';

/** Currency codes (ISO 4217 subset) */
export type Currency =
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'CAD'
  | 'AUD'
  | 'JPY'
  | 'CNY'
  | 'INR'
  | 'BRL'
  | 'MXN';

/** Product/line item in a deal */
export interface DealLineItem {
  id: UUID;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  discountType?: 'percentage' | 'fixed';
  total: number;
}

/** Competitor information */
export interface Competitor {
  name: string;
  strengths?: string[];
  weaknesses?: string[];
  notes?: string;
}

/**
 * Deal entity representing a sales opportunity
 */
export interface Deal extends BaseEntity {
  /** Deal title/name */
  title: string;

  /** Associated contact ID */
  contactId: UUID;

  /** Associated company ID (if different from contact) */
  companyId?: UUID;

  /** Deal value (monetary) */
  value: number;

  /** Currency of the deal value */
  currency: Currency;

  /** Current pipeline stage */
  stage: DealStage;

  /** Win probability percentage (0-100) */
  probability: number;

  /** Expected close date */
  expectedClose: Timestamp;

  /** Actual close date (if closed) */
  actualClose?: Timestamp;

  /** Deal priority */
  priority: DealPriority;

  /** Line items/products */
  lineItems: DealLineItem[];

  /** Discount applied to total */
  discount?: number;

  /** Discount type */
  discountType?: 'percentage' | 'fixed';

  /** Total deal value after discounts */
  totalValue: number;

  /** Detailed notes/description */
  notes: string;

  /** Tags for categorization */
  tags: string[];

  /** Competitors in this deal */
  competitors: Competitor[];

  /** Reason for loss (if lost) */
  lossReason?: string;

  /** Next steps/action items */
  nextSteps?: string[];

  /** Assigned owner/user ID */
  ownerId?: UUID;

  /** Source of the deal */
  source?: string;

  /** Custom fields */
  customFields: CustomField[];

  /** Last activity timestamp */
  lastActivityAt?: Timestamp;
}

// ============================================================================
// Activity Types
// ============================================================================

/** Activity type classification */
export type ActivityType =
  | 'call'
  | 'email'
  | 'meeting'
  | 'task'
  | 'note'
  | 'sms'
  | 'video_call'
  | 'demo'
  | 'proposal_sent'
  | 'contract_sent'
  | 'follow_up'
  | 'social_media'
  | 'event'
  | 'other';

/** Call outcome */
export type CallOutcome =
  | 'connected'
  | 'voicemail'
  | 'no_answer'
  | 'busy'
  | 'wrong_number'
  | 'disconnected';

/** Meeting outcome */
export type MeetingOutcome =
  | 'completed'
  | 'rescheduled'
  | 'cancelled'
  | 'no_show';

/** Email status */
export type EmailStatus =
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'replied'
  | 'bounced'
  | 'unsubscribed';

/** Call-specific metadata */
export interface CallMetadata {
  outcome: CallOutcome;
  recording?: string;
  transcription?: string;
  fromNumber?: string;
  toNumber?: string;
  direction: 'inbound' | 'outbound';
}

/** Meeting-specific metadata */
export interface MeetingMetadata {
  outcome: MeetingOutcome;
  location?: string;
  meetingUrl?: string;
  calendarEventId?: string;
  attendees?: string[];
  recording?: string;
  notes?: string;
}

/** Email-specific metadata */
export interface EmailMetadata {
  status: EmailStatus;
  subject: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  templateId?: string;
  trackingOpens: boolean;
  trackingClicks: boolean;
}

/** Task-specific metadata */
export interface TaskMetadata {
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  dueDate?: Timestamp;
  reminderAt?: Timestamp;
  priority: 'low' | 'medium' | 'high';
  assigneeId?: UUID;
  checklist?: { item: string; completed: boolean }[];
}

/**
 * Activity entity representing interactions with contacts/deals
 */
export interface Activity extends BaseEntity {
  /** Associated contact ID */
  contactId?: UUID;

  /** Associated deal ID */
  dealId?: UUID;

  /** Activity type */
  type: ActivityType;

  /** Activity title/subject */
  title: string;

  /** Detailed description */
  description: string;

  /** Activity timestamp */
  timestamp: Timestamp;

  /** Duration in seconds (for calls, meetings) */
  duration?: number;

  /** Activity-specific metadata */
  metadata: CallMetadata | MeetingMetadata | EmailMetadata | TaskMetadata | Metadata;

  /** User who created the activity */
  createdBy?: UUID;

  /** Tags for categorization */
  tags: string[];

  /** Custom fields */
  customFields: CustomField[];
}

// ============================================================================
// Media Types
// ============================================================================

/** Media type classification */
export type MediaType =
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'spreadsheet'
  | 'presentation'
  | 'pdf'
  | 'archive'
  | 'other';

/** Common MIME types for media */
export type MimeType =
  // Images
  | 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'image/webp'
  | 'image/svg+xml'
  | 'image/bmp'
  // Videos
  | 'video/mp4'
  | 'video/webm'
  | 'video/quicktime'
  | 'video/x-msvideo'
  // Audio
  | 'audio/mpeg'
  | 'audio/wav'
  | 'audio/ogg'
  | 'audio/webm'
  // Documents
  | 'application/pdf'
  | 'application/msword'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'application/vnd.ms-excel'
  | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  | 'application/vnd.ms-powerpoint'
  | 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  | 'text/plain'
  | 'text/csv'
  // Archives
  | 'application/zip'
  | 'application/x-rar-compressed'
  | 'application/x-7z-compressed'
  // Other
  | string;

/** Image-specific metadata */
export interface ImageMetadata {
  width?: number;
  height?: number;
  orientation?: 'landscape' | 'portrait' | 'square';
  colorSpace?: string;
  hasAlpha?: boolean;
}

/** Video-specific metadata */
export interface VideoMetadata {
  width?: number;
  height?: number;
  duration?: number;
  frameRate?: number;
  codec?: string;
  bitrate?: number;
  hasAudio?: boolean;
}

/** Audio-specific metadata */
export interface AudioMetadata {
  duration?: number;
  sampleRate?: number;
  channels?: number;
  bitrate?: number;
  codec?: string;
}

/** Document-specific metadata */
export interface DocumentMetadata {
  pageCount?: number;
  author?: string;
  title?: string;
  subject?: string;
  keywords?: string[];
  createdAt?: Timestamp;
  modifiedAt?: Timestamp;
}

/**
 * Media entity representing files attached to CRM entities
 */
export interface Media extends BaseEntity {
  /** Entity type this media is attached to */
  entityType: 'contact' | 'deal' | 'activity' | 'note' | 'company';

  /** ID of the entity this media belongs to */
  entityId: UUID;

  /** Media type classification */
  type: MediaType;

  /** Original filename */
  filename: string;

  /** MIME type */
  mimeType: MimeType;

  /** File size in bytes */
  size: number;

  /** Storage URL or path */
  url: string;

  /** Thumbnail URL (for images/videos) */
  thumbnailUrl?: string;

  /** Media-specific metadata */
  metadata: ImageMetadata | VideoMetadata | AudioMetadata | DocumentMetadata | Metadata;

  /** Alt text for accessibility */
  altText?: string;

  /** Caption/description */
  caption?: string;

  /** Is this media public/external */
  isPublic: boolean;

  /** Download count */
  downloadCount: number;

  /** User who uploaded */
  uploadedBy?: UUID;

  /** Expiration date (for temporary files) */
  expiresAt?: Timestamp;
}

// ============================================================================
// Note Types
// ============================================================================

/** Note visibility level */
export type NoteVisibility = 'private' | 'team' | 'public';

/**
 * Note entity for freeform text attached to contacts/deals
 */
export interface Note extends BaseEntity {
  /** Associated contact ID */
  contactId?: UUID;

  /** Associated deal ID */
  dealId?: UUID;

  /** Associated activity ID */
  activityId?: UUID;

  /** Note content (supports markdown) */
  content: string;

  /** Content format */
  format: 'plain' | 'markdown' | 'html';

  /** Note title/subject */
  title?: string;

  /** Visibility level */
  visibility: NoteVisibility;

  /** User who created the note */
  createdBy?: UUID;

  /** Pinned/important flag */
  pinned: boolean;

  /** Tags for categorization */
  tags: string[];

  /** Attached media IDs */
  mediaIds: UUID[];
}

// ============================================================================
// Tag Types
// ============================================================================

/** Tag category */
export type TagCategory =
  | 'general'
  | 'industry'
  | 'source'
  | 'status'
  | 'priority'
  | 'product'
  | 'region'
  | 'custom';

/**
 * Tag entity for categorizing contacts and deals
 */
export interface Tag {
  /** Unique identifier */
  id: UUID;

  /** Tag name (slug-friendly) */
  name: string;

  /** Display label */
  label: string;

  /** Color (hex code or named color) */
  color: string;

  /** Tag category */
  category: TagCategory;

  /** Description */
  description?: string;

  /** Icon (emoji or icon name) */
  icon?: string;

  /** Usage count */
  usageCount: number;

  /** Parent tag ID (for hierarchical tags) */
  parentId?: UUID;

  /** Created timestamp */
  createdAt: Timestamp;

  /** Updated timestamp */
  updatedAt: Timestamp;
}

// ============================================================================
// Company Types (for B2B CRM)
// ============================================================================

/** Company size category */
export type CompanySize =
  | 'sole_proprietor'
  | 'startup'
  | 'small'
  | 'medium'
  | 'large'
  | 'enterprise';

/** Company industry classification */
export type Industry =
  | 'technology'
  | 'finance'
  | 'healthcare'
  | 'education'
  | 'retail'
  | 'manufacturing'
  | 'consulting'
  | 'marketing'
  | 'legal'
  | 'real_estate'
  | 'construction'
  | 'transportation'
  | 'hospitality'
  | 'energy'
  | 'telecommunications'
  | 'government'
  | 'non_profit'
  | 'other';

/**
 * Company entity for B2B relationships
 */
export interface Company extends BaseEntity {
  /** Company name */
  name: string;

  /** Website URL */
  website?: string;

  /** Industry classification */
  industry?: Industry;

  /** Company size category */
  size?: CompanySize;

  /** Employee count */
  employeeCount?: number;

  /** Annual revenue */
  annualRevenue?: number;

  /** Currency for revenue */
  currency?: Currency;

  /** Company address */
  address?: Address;

  /** Phone number */
  phone?: string;

  /** Email domain */
  emailDomain?: string;

  /** LinkedIn company page */
  linkedInUrl?: string;

  /** Tags for categorization */
  tags: string[];

  /** Custom fields */
  customFields: CustomField[];

  /** Assigned owner/user ID */
  ownerId?: UUID;

  /** Notes about the company */
  notes?: string;
}

// ============================================================================
// Pipeline Types
// ============================================================================

/** Pipeline stage definition */
export interface PipelineStage {
  id: UUID;
  name: string;
  order: number;
  probability: number;
  color: string;
  description?: string;
}

/** Sales pipeline */
export interface Pipeline {
  id: UUID;
  name: string;
  description?: string;
  stages: PipelineStage[];
  isDefault: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// Search and Filter Types
// ============================================================================

/** Sort direction */
export type SortDirection = 'asc' | 'desc';

/** Generic sort options */
export interface SortOptions<T extends string = string> {
  field: T;
  direction: SortDirection;
}

/** Pagination options */
export interface PaginationOptions {
  page: number;
  limit: number;
  offset?: number;
}

/** Paginated response wrapper */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

/** Date range filter */
export interface DateRange {
  start: Timestamp;
  end: Timestamp;
}

/** Contact filter options */
export interface ContactFilter {
  search?: string;
  status?: ContactStatus[];
  tags?: string[];
  source?: ContactSource[];
  ownerId?: UUID;
  companyId?: UUID;
  createdAt?: DateRange;
  updatedAt?: DateRange;
  lastContactedAt?: DateRange;
  nextFollowUpAt?: DateRange;
  hasEmail?: boolean;
  hasPhone?: boolean;
  leadScoreMin?: number;
  leadScoreMax?: number;
  doNotContact?: boolean;
}

/** Deal filter options */
export interface DealFilter {
  search?: string;
  contactId?: UUID;
  companyId?: UUID;
  stage?: DealStage[];
  priority?: DealPriority[];
  ownerId?: UUID;
  tags?: string[];
  createdAt?: DateRange;
  updatedAt?: DateRange;
  expectedClose?: DateRange;
  valueMin?: number;
  valueMax?: number;
  probabilityMin?: number;
  probabilityMax?: number;
}

/** Activity filter options */
export interface ActivityFilter {
  contactId?: UUID;
  dealId?: UUID;
  type?: ActivityType[];
  createdBy?: UUID;
  timestamp?: DateRange;
  tags?: string[];
}

// ============================================================================
// Analytics Types
// ============================================================================

/** Metric aggregation period */
export type AggregationPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year';

/** Metric data point */
export interface MetricDataPoint {
  timestamp: Timestamp;
  value: number;
  label?: string;
}

/** Dashboard metric */
export interface DashboardMetric {
  id: string;
  name: string;
  description?: string;
  value: number;
  previousValue?: number;
  change?: number;
  changePercent?: number;
  trend?: 'up' | 'down' | 'stable';
  dataPoints: MetricDataPoint[];
  period: AggregationPeriod;
}

// ============================================================================
// Export Types
// ============================================================================

/** Export format options */
export type ExportFormat = 'csv' | 'xlsx' | 'json' | 'pdf';

/** Export job status */
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

/** Export job */
export interface ExportJob {
  id: UUID;
  entityType: 'contacts' | 'deals' | 'activities' | 'notes';
  format: ExportFormat;
  status: ExportStatus;
  filters?: Record<string, unknown>;
  fields?: string[];
  downloadUrl?: string;
  error?: string;
  createdAt: Timestamp;
  completedAt?: Timestamp;
  createdBy: UUID;
}

// ============================================================================
// Integration Types
// ============================================================================

/** Integration provider */
export type IntegrationProvider =
  | 'google'
  | 'microsoft'
  | 'slack'
  | 'mailchimp'
  | 'hubspot'
  | 'salesforce'
  | 'zapier'
  | 'custom';

/** Integration status */
export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'pending';

/** External integration */
export interface Integration {
  id: UUID;
  provider: IntegrationProvider;
  name: string;
  status: IntegrationStatus;
  configuredAt: Timestamp;
  lastSyncAt?: Timestamp;
  settings: Metadata;
  error?: string;
}

// ============================================================================
// Telemetry Types
// ============================================================================

/** Telemetry event type */
export type TelemetryEventType =
  | 'entity_created'
  | 'entity_updated'
  | 'entity_deleted'
  | 'entity_viewed'
  | 'search_performed'
  | 'export_created'
  | 'integration_sync'
  | 'error_occurred';

/** Telemetry event */
export interface TelemetryEvent {
  id: UUID;
  type: TelemetryEventType;
  entityType?: string;
  entityId?: UUID;
  userId?: UUID;
  timestamp: Timestamp;
  properties: Metadata;
  duration?: number;
  success: boolean;
  errorMessage?: string;
}
