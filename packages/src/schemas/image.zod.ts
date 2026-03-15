/**
 * Image Processing Schemas
 * Zod schemas for image handling and processing
 */

import { z } from "zod";

// ============================================
// MEDIA TYPE SCHEMAS
// ============================================

export const MediaTypeSchema = z.enum([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

// ============================================
// IMAGE BLOCK SCHEMAS
// ============================================

export const ImageSourceSchema = z.union([
  z.object({ type: z.literal("base64"), media_type: MediaTypeSchema, data: z.string() }),
  z.object({ type: z.literal("url"), url: z.string() }),
  z.object({ type: z.literal("file"), file_id: z.string() }),
]);

export const ImageBlockSchema = z.object({
  type: z.literal("image"),
  source: ImageSourceSchema,
  alt_text: z.string().optional(),
});

// ============================================
// IMAGE PROCESSING SCHEMAS
// ============================================

export const ImageProcessingConfigSchema = z.object({
  maxWidth: z.number().optional(),
  maxHeight: z.number().optional(),
  quality: z.number().min(1).max(100).optional(),
  format: MediaTypeSchema.optional(),
  preserveMetadata: z.boolean().optional(),
});

export const ImageProcessingResultSchema = z.object({
  data: z.string(),
  mimeType: MediaTypeSchema,
  width: z.number(),
  height: z.number(),
  sizeBytes: z.number(),
  originalFormat: MediaTypeSchema.optional(),
});

// ============================================
// IMAGE VALIDATION SCHEMAS
// ============================================

export const ImageValidationConfigSchema = z.object({
  maxSizeBytes: z.number(),
  allowedFormats: z.array(MediaTypeSchema),
  minWidth: z.number().optional(),
  minHeight: z.number().optional(),
  maxWidth: z.number().optional(),
  maxHeight: z.number().optional(),
});

export const ImageValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});

// ============================================
// IMAGE CAPTURE SCHEMAS
// ============================================

export const ImageCaptureConfigSchema = z.object({
  fullPage: z.boolean().optional(),
  format: z.enum(["png", "jpeg"]).optional(),
  quality: z.number().min(1).max(100).optional(),
  clip: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }).optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type MediaType = z.infer<typeof MediaTypeSchema>;
export type ImageSource = z.infer<typeof ImageSourceSchema>;
export type ImageBlock = z.infer<typeof ImageBlockSchema>;
export type ImageProcessingConfig = z.infer<typeof ImageProcessingConfigSchema>;
export type ImageProcessingResult = z.infer<typeof ImageProcessingResultSchema>;
export type ImageValidationConfig = z.infer<typeof ImageValidationConfigSchema>;
export type ImageValidationResult = z.infer<typeof ImageValidationResultSchema>;
export type ImageCaptureConfig = z.infer<typeof ImageCaptureConfigSchema>;
