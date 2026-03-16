// CRM Types

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  title?: string;
  status: 'lead' | 'prospect' | 'customer' | 'churned';
  tags: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Deal {
  id: string;
  contactId: string;
  title: string;
  value: number;
  currency: string;
  stage: DealStage;
  probability: number;
  expectedCloseDate?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export type DealStage = 'discovery' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';

export interface Activity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'deal' | 'contact';
  description: string;
  contactId?: string;
  dealId?: string;
  userId: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface Media {
  id: string;
  filename: string;
  mimetype: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  contactId?: string;
  dealId?: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface DashboardStats {
  totalContacts: number;
  activeDeals: number;
  pipelineValue: number;
  wonThisMonth: number;
  activitiesToday: number;
  conversionRate: number;
}

export interface WSMessage {
  type: 'connected' | 'activity' | 'deal_update' | 'contact_update' | 'media_upload';
  payload?: unknown;
  timestamp: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
