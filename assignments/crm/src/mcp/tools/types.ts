/**
 * MCP Tool type definitions for CRM
 */

import type {
  Contact,
  Deal,
  Activity,
  Media,
  Note,
  Tag,
  Company,
  ContactFilter,
  DealFilter,
  ActivityFilter,
  PaginationOptions,
} from '../../core/types.js';

/** Tool input types */
export interface ToolInput {
  [key: string]: unknown;
}

/** Tool output response */
export interface ToolOutput<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Contact Tool Types
// ============================================================================

export interface CreateContactInput {
  name: string;
  firstName?: string;
  lastName?: string;
  emails?: Array<{ email: string; type: string; primary: boolean }>;
  phones?: Array<{ number: string; type: string; primary: boolean }>;
  company?: string;
  title?: string;
  tags?: string[];
  source?: string;
  status?: string;
  customFields?: Array<{ key: string; value: unknown; type: string }>;
}

export interface UpdateContactInput {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  emails?: Array<{ email: string; type: string; primary: boolean }>;
  phones?: Array<{ number: string; type: string; primary: boolean }>;
  company?: string;
  title?: string;
  tags?: string[];
  status?: string;
  customFields?: Array<{ key: string; value: unknown; type: string }>;
}

export interface GetContactInput {
  id: string;
}

export interface ListContactsInput extends PaginationOptions, Partial<ContactFilter> {}

export interface DeleteContactInput {
  id: string;
}

export interface SearchContactsInput {
  query: string;
  limit?: number;
}

// ============================================================================
// Deal Tool Types
// ============================================================================

export interface CreateDealInput {
  title: string;
  contactId: string;
  value: number;
  currency?: string;
  stage?: string;
  probability?: number;
  expectedClose: string;
  notes?: string;
  tags?: string[];
}

export interface UpdateDealInput {
  id: string;
  title?: string;
  value?: number;
  stage?: string;
  probability?: number;
  expectedClose?: string;
  notes?: string;
  tags?: string[];
}

export interface GetDealInput {
  id: string;
}

export interface ListDealsInput extends PaginationOptions, Partial<DealFilter> {}

export interface DeleteDealInput {
  id: string;
}

export interface GetDealsByStageInput {
  stage: string;
  limit?: number;
}

// ============================================================================
// Activity Tool Types
// ============================================================================

export interface CreateActivityInput {
  contactId?: string;
  dealId?: string;
  type: string;
  title: string;
  description?: string;
  timestamp?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export interface UpdateActivityInput {
  id: string;
  title?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export interface GetActivityInput {
  id: string;
}

export interface ListActivitiesInput extends PaginationOptions, Partial<ActivityFilter> {}

export interface DeleteActivityInput {
  id: string;
}

// ============================================================================
// Media Tool Types
// ============================================================================

export interface CreateMediaInput {
  entityType: string;
  entityId: string;
  type: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  metadata?: Record<string, unknown>;
  altText?: string;
  caption?: string;
}

export interface GetMediaInput {
  id: string;
}

export interface ListMediaInput {
  entityType?: string;
  entityId?: string;
  limit?: number;
  offset?: number;
}

export interface DeleteMediaInput {
  id: string;
}

// ============================================================================
// Note Tool Types
// ============================================================================

export interface CreateNoteInput {
  contactId?: string;
  dealId?: string;
  content: string;
  format?: string;
  title?: string;
  visibility?: string;
  tags?: string[];
}

export interface UpdateNoteInput {
  id: string;
  content?: string;
  title?: string;
  visibility?: string;
  tags?: string[];
}

export interface GetNoteInput {
  id: string;
}

export interface ListNotesInput {
  contactId?: string;
  dealId?: string;
  limit?: number;
  offset?: number;
}

export interface DeleteNoteInput {
  id: string;
}

// ============================================================================
// Tag Tool Types
// ============================================================================

export interface CreateTagInput {
  name: string;
  label: string;
  color: string;
  category?: string;
  description?: string;
}

export interface UpdateTagInput {
  id: string;
  label?: string;
  color?: string;
  description?: string;
}

export interface GetTagInput {
  id: string;
}

export interface ListTagsInput {
  category?: string;
  limit?: number;
}

export interface DeleteTagInput {
  id: string;
}

// ============================================================================
// Company Tool Types
// ============================================================================

export interface CreateCompanyInput {
  name: string;
  website?: string;
  industry?: string;
  size?: string;
  tags?: string[];
}

export interface UpdateCompanyInput {
  id: string;
  name?: string;
  website?: string;
  industry?: string;
  size?: string;
  tags?: string[];
}

export interface GetCompanyInput {
  id: string;
}

export interface ListCompaniesInput extends PaginationOptions {
  industry?: string;
}

export interface DeleteCompanyInput {
  id: string;
}

// ============================================================================
// Stats Tool Types
// ============================================================================

export interface GetStatsInput {}

export interface GetDashboardInput {
  period?: string;
}

// ============================================================================
// Tool Output Types
// ============================================================================

export interface ContactOutput {
  contact: Contact;
}

export interface ContactListOutput {
  contacts: Contact[];
  total: number;
  page: number;
  limit: number;
}

export interface DealOutput {
  deal: Deal;
}

export interface DealListOutput {
  deals: Deal[];
  total: number;
  page: number;
  limit: number;
}

export interface ActivityOutput {
  activity: Activity;
}

export interface ActivityListOutput {
  activities: Activity[];
  total: number;
  page: number;
  limit: number;
}

export interface MediaOutput {
  media: Media;
}

export interface MediaListOutput {
  media: Media[];
  total: number;
}

export interface NoteOutput {
  note: Note;
}

export interface NoteListOutput {
  notes: Note[];
  total: number;
}

export interface TagOutput {
  tag: Tag;
}

export interface TagListOutput {
  tags: Tag[];
  total: number;
}

export interface CompanyOutput {
  company: Company;
}

export interface CompanyListOutput {
  companies: Company[];
  total: number;
  page: number;
  limit: number;
}

export interface StatsOutput {
  contacts: number;
  deals: number;
  activities: number;
  media: number;
  notes: number;
  tags: number;
  companies: number;
  pipelines: number;
}

export interface DashboardOutput {
  stats: StatsOutput;
  dealsByStage: Record<string, number>;
  recentActivities: Activity[];
  upcomingFollowUps: Contact[];
}
