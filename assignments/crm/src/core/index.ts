/**
 * Core exports for CRM types and schemas
 */

// Re-export all types
export type {
  // Base types
  UUID,
  Timestamp,
  Metadata,
  BaseEntity,
  // Contact types
  PhoneNumber,
  EmailAddress,
  Address,
  SocialProfile,
  CustomField,
  ContactSource,
  ContactStatus,
  Contact,
  // Deal types
  DealStage,
  DealPriority,
  Currency,
  DealLineItem,
  Competitor,
  Deal,
  // Activity types
  ActivityType,
  CallOutcome,
  MeetingOutcome,
  EmailStatus,
  CallMetadata,
  MeetingMetadata,
  EmailMetadata,
  TaskMetadata,
  Activity,
  // Media types
  MediaType,
  MimeType,
  ImageMetadata,
  VideoMetadata,
  AudioMetadata,
  DocumentMetadata,
  Media,
  // Note types
  NoteVisibility,
  Note,
  // Tag types
  TagCategory,
  Tag,
  // Company types
  CompanySize,
  Industry,
  Company,
  // Pipeline types
  PipelineStage,
  Pipeline,
  // Search & Filter types
  SortDirection,
  SortOptions,
  PaginationOptions,
  PaginatedResponse,
  DateRange,
  ContactFilter,
  DealFilter,
  ActivityFilter,
  // Analytics types
  AggregationPeriod,
  MetricDataPoint,
  DashboardMetric,
  // Export types
  ExportFormat,
  ExportStatus,
  ExportJob,
  // Integration types
  IntegrationProvider,
  IntegrationStatus,
  Integration,
  // Telemetry types
  TelemetryEventType,
  TelemetryEvent,
} from './types.js';

// Re-export all schemas
export {
  // Base schemas
  uuidSchema,
  timestampSchema,
  metadataSchema,
  // Contact schemas
  phoneNumberTypeSchema,
  emailTypeSchema,
  addressTypeSchema,
  socialPlatformSchema,
  customFieldTypeSchema,
  contactSourceSchema,
  contactStatusSchema,
  phoneNumberSchema,
  emailSchema,
  addressSchema,
  socialProfileSchema,
  customFieldSchema,
  contactSchema,
  createContactSchema,
  updateContactSchema,
  // Deal schemas
  dealStageSchema,
  dealPrioritySchema,
  currencySchema,
  discountTypeSchema,
  dealLineItemSchema,
  competitorSchema,
  dealSchema,
  createDealSchema,
  updateDealSchema,
  // Activity schemas
  activityTypeSchema,
  callOutcomeSchema,
  meetingOutcomeSchema,
  emailStatusSchema,
  taskStatusSchema,
  taskPrioritySchema,
  callDirectionSchema,
  callMetadataSchema,
  meetingMetadataSchema,
  emailMetadataSchema,
  checklistItemSchema,
  taskMetadataSchema,
  activityMetadataSchema,
  activitySchema,
  createActivitySchema,
  updateActivitySchema,
  // Media schemas
  mediaTypeSchema,
  mimeTypeSchema,
  mediaEntityTypeSchema,
  imageMetadataSchema,
  videoMetadataSchema,
  audioMetadataSchema,
  documentMetadataSchema,
  mediaSchema,
  createMediaSchema,
  updateMediaSchema,
  // Note schemas
  noteVisibilitySchema,
  noteFormatSchema,
  noteSchema,
  createNoteSchema,
  updateNoteSchema,
  // Tag schemas
  tagCategorySchema,
  tagSchema,
  createTagSchema,
  updateTagSchema,
  // Company schemas
  companySizeSchema,
  industrySchema,
  companySchema,
  createCompanySchema,
  updateCompanySchema,
  // Pipeline schemas
  pipelineStageSchema,
  pipelineSchema,
  // Filter schemas
  sortDirectionSchema,
  paginationSchema,
  dateRangeSchema,
  contactFilterSchema,
  dealFilterSchema,
  activityFilterSchema,
  // Helper schemas
  paginatedResponseSchema,
  // Export & Integration schemas
  exportFormatSchema,
  exportStatusSchema,
  exportJobSchema,
  integrationProviderSchema,
  integrationStatusSchema,
  integrationSchema,
  // Telemetry schemas
  telemetryEventTypeSchema,
  telemetryEventSchema,
} from './schemas.js';
