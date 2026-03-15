/**
 * Voice Schemas
 * Zod schemas for voice input/output
 */

import { z } from "zod";

// ============================================
// VOICE CONFIG SCHEMAS
// ============================================

export const VoiceConfigSchema = z.object({
  enabled: z.boolean(),
  sampleRate: z.number().optional(),
  channels: z.number().optional(),
  encoding: z.enum(["pcm_f32le", "pcm_s16le"]).optional(),
});

// ============================================
// VOICE INPUT SCHEMAS
// ============================================

export const VoiceInputResultSchema = z.object({
  transcript: z.string(),
  confidence: z.number().optional(),
  durationMs: z.number().optional(),
  language: z.string().optional(),
});

// ============================================
// VOICE OUTPUT SCHEMAS
// ============================================

export const VoiceOutputConfigSchema = z.object({
  voice: z.string().optional(),
  speed: z.number().optional(),
  pitch: z.number().optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type VoiceConfig = z.infer<typeof VoiceConfigSchema>;
export type VoiceInputResult = z.infer<typeof VoiceInputResultSchema>;
export type VoiceOutputConfig = z.infer<typeof VoiceOutputConfigSchema>;
