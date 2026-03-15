/**
 * Web Search and Fetch Schemas
 * Zod schemas for web search and fetch operations
 */

import { z } from "zod";

// ============================================
// WEB SEARCH CONFIG SCHEMAS
// ============================================

export const WebSearchConfigSchema = z.object({
  enabled: z.boolean(),
  provider: z.enum(["google", "bing", "duckduckgo", "custom"]).optional(),
  maxResults: z.number().optional(),
  timeout: z.number().optional(),
  allowedDomains: z.array(z.string()).optional(),
  blockedDomains: z.array(z.string()).optional(),
});

// ============================================
// WEB SEARCH RESULT SCHEMAS
// ============================================

export const WebSearchResultSchema = z.object({
  title: z.string(),
  url: z.string(),
  snippet: z.string().optional(),
  source: z.string().optional(),
  relevance: z.number().optional(),
});

// ============================================
// WEB FETCH CONFIG SCHEMAS
// ============================================

export const WebFetchConfigSchema = z.object({
  timeout: z.number().optional(),
  maxBytes: z.number().optional(),
  followRedirects: z.boolean().optional(),
  userAgent: z.string().optional(),
  headers: z.record(z.string()).optional(),
});

// ============================================
// WEB FETCH RESULT SCHEMAS
// ============================================

export const WebFetchResultSchema = z.object({
  url: z.string(),
  content: z.string(),
  mimeType: z.string().optional(),
  statusCode: z.number(),
  headers: z.record(z.string()).optional(),
  size: z.number().optional(),
  durationMs: z.number().optional(),
});

// ============================================
// WEB CONTENT SCHEMAS
// ============================================

export const WebContentTypeSchema = z.enum([
  "html",
  "markdown",
  "text",
  "json",
]);

export const WebContentOptionsSchema = z.object({
  format: WebContentTypeSchema.optional(),
  extractMainContent: z.boolean().optional(),
  includeLinks: z.boolean().optional(),
  includeImages: z.boolean().optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type WebSearchConfig = z.infer<typeof WebSearchConfigSchema>;
export type WebSearchResult = z.infer<typeof WebSearchResultSchema>;
export type WebFetchConfig = z.infer<typeof WebFetchConfigSchema>;
export type WebFetchResult = z.infer<typeof WebFetchResultSchema>;
export type WebContentType = z.infer<typeof WebContentTypeSchema>;
export type WebContentOptions = z.infer<typeof WebContentOptionsSchema>;
