/**
 * Version Changelog Schemas
 * Zod schemas for version tracking and changelog
 */

import { z } from "zod";

// ============================================
// VERSION INFO SCHEMAS
// ============================================

export const VersionInfoSchema = z.object({
  version: z.string(),
  releaseDate: z.string(),
  binarySize: z.union([z.string(), z.number()]),
  documentedSystems: z.number().optional(),
});

// ============================================
// VERSION CHANGES SCHEMAS
// ============================================

export const SlashCommandChangeSchema = z.object({
  command: z.string(),
  description: z.string(),
});

export const ApiFeatureChangeSchema = z.object({
  feature: z.string(),
  description: z.string(),
});

export const EnvironmentVariableChangeSchema = z.object({
  var: z.string(),
  description: z.string(),
});

export const BinaryStructureSchema = z.object({
  format: z.string(),
  entryPoint: z.string(),
  embeddedModules: z.array(z.string()),
});

export const VersionChangesSchema = z.object({
  versionBump: z.string().optional(),
  newSlashCommands: z.array(SlashCommandChangeSchema).optional(),
  removedSlashCommands: z.array(SlashCommandChangeSchema).optional(),
  newModelIdentifiers: z.array(z.string()).optional(),
  newApiFeatures: z.array(ApiFeatureChangeSchema).optional(),
  newEnvironmentVariables: z.array(EnvironmentVariableChangeSchema).optional(),
  retainedFeatures: z.array(z.string()).optional(),
  binaryStructure: BinaryStructureSchema.optional(),
});

// ============================================
// BINARY FORMAT SCHEMAS
// ============================================

export const BinaryFormatSchema = z.object({
  compiler: z.literal("Bun"),
  type: z.literal("standalone executable"),
  embeddedRuntimes: z.array(z.string()),
  webAssemblyModules: z.array(z.string()),
  nativeModules: z.array(z.string()),
});

// ============================================
// API BETA HEADERS SCHEMAS
// ============================================

export const BetaHeadersSchema = z.object({
  fastMode: z.string(),
  redactThinking: z.string(),
  mode: z.array(z.string()),
  adaptiveThinking: z.string(),
  context1m: z.string(),
});

// ============================================
// VERSION HISTORY SCHEMAS
// ============================================

export const VersionHistorySchema = z.array(VersionInfoSchema);

// ============================================
// TYPE EXPORTS
// ============================================

export type VersionInfo = z.infer<typeof VersionInfoSchema>;
export type SlashCommandChange = z.infer<typeof SlashCommandChangeSchema>;
export type ApiFeatureChange = z.infer<typeof ApiFeatureChangeSchema>;
export type EnvironmentVariableChange = z.infer<typeof EnvironmentVariableChangeSchema>;
export type BinaryStructure = z.infer<typeof BinaryStructureSchema>;
export type VersionChanges = z.infer<typeof VersionChangesSchema>;
export type BinaryFormat = z.infer<typeof BinaryFormatSchema>;
export type BetaHeaders = z.infer<typeof BetaHeadersSchema>;
export type VersionHistory = z.infer<typeof VersionHistorySchema>;
