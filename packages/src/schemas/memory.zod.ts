/**
 * Auto-Memory System Schemas
 * Zod schemas for auto-memory and persistent memory
 */

import { z } from "zod";

// ============================================
// MEMORY CONFIG SCHEMAS
// ============================================

export const MemoryConfigSchema = z.object({
  enabled: z.boolean(),
  persistPath: z.string(),
  maxFileSize: z.number(),
  maxMemoryFiles: z.number(),
});

// ============================================
// MEMORY FILE SCHEMAS
// ============================================

export const MemoryFileSchema = z.object({
  path: z.string(),
  content: z.string(),
  lastModified: z.number(),
  size: z.number(),
});

// ============================================
// MEMORY ENTRY SCHEMAS
// ============================================

export const MemoryEntrySchema = z.object({
  key: z.string(),
  value: z.unknown(),
  timestamp: z.number(),
  ttl: z.number().optional(),
  tags: z.array(z.string()).optional(),
});

// ============================================
// MEMORY STORE SCHEMAS
// ============================================

export const MemoryStoreSchema = z.object({
  entries: z.record(MemoryEntrySchema),
  metadata: z.object({
    created: z.number(),
    lastAccessed: z.number(),
    totalEntries: z.number(),
    totalSize: z.number(),
  }),
});

// ============================================
// AUTO-MEMORY SETTINGS SCHEMAS
// ============================================

export const AutoMemorySettingsSchema = z.object({
  enabled: z.boolean(),
  autoSave: z.boolean(),
  autoLoad: z.boolean(),
  compressionEnabled: z.boolean(),
  encryptionEnabled: z.boolean(),
  maxEntries: z.number(),
  pruneThreshold: z.number(),
});

// ============================================
// MEMORY OPERATION SCHEMAS
// ============================================

export const MemoryOperationSchema = z.enum([
  "get",
  "set",
  "delete",
  "clear",
  "list",
  "has",
  "prune",
]);

export const MemoryOperationResultSchema = z.object({
  success: z.boolean(),
  operation: MemoryOperationSchema,
  key: z.string().optional(),
  value: z.unknown().optional(),
  error: z.string().optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type MemoryConfig = z.infer<typeof MemoryConfigSchema>;
export type MemoryFile = z.infer<typeof MemoryFileSchema>;
export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;
export type MemoryStore = z.infer<typeof MemoryStoreSchema>;
export type AutoMemorySettings = z.infer<typeof AutoMemorySettingsSchema>;
export type MemoryOperation = z.infer<typeof MemoryOperationSchema>;
export type MemoryOperationResult = z.infer<typeof MemoryOperationResultSchema>;
