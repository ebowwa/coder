/**
 * Image Processing Module
 */

import type { MediaType, ImageBlock } from "../types/index.js";

// Lazy-load sharp to handle environments where it's not available
type SharpModule = typeof import("sharp");

let _sharp: SharpModule | null = null;
let _sharpAvailable: boolean | null = null;

async function getSharp(): Promise<SharpModule> {
  if (_sharp !== null) return _sharp;

  if (_sharpAvailable === false) {
    throw new Error("sharp module not available - image processing disabled");
  }

  try {
    // Dynamic import returns module with default export
    const module = await import("sharp");
    _sharp = module.default || module;
    _sharpAvailable = true;
    return _sharp;
  } catch (e) {
    _sharpAvailable = false;
    _sharp = null;
    throw new Error("sharp module not available - image processing disabled");
  }
}

export function isSharpAvailable(): boolean {
  return _sharpAvailable === true;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Supported image extensions
 */
export const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp"]);

/**
 * Binary file exclusions (CI8 set in binary)
 * These are NOT processed as images - treated as binary
 */
export const BINARY_EXCLUSIONS = new Set([
  // Audio/Video
  "mp3", "wav", "flac", "ogg", "aac", "m4a", "wma", "aiff", "opus",
  "mp4", "avi", "mov", "wmv", "flv", "mkv", "webm", "m4v", "mpeg", "mpg",
  // Archives
  "zip", "rar", "tar", "gz", "bz2", "7z", "xz", "z", "tgz", "iso",
  // Executables
  "exe", "dll", "so", "dylib", "app", "msi", "deb", "rpm", "bin",
  // Databases
  "dat", "db", "sqlite", "sqlite3", "mdb", "idx",
  // Documents
  "doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp",
  // Fonts
  "ttf", "otf", "woff", "woff2", "eot",
  // Design files
  "psd", "ai", "eps", "sketch", "fig", "xd",
  // 3D
  "blend", "obj", "3ds", "max",
  // Compiled code
  "class", "jar", "war", "pyc", "pyo", "rlib",
  // Other
  "swf", "fla"
]);

/**
 * Size limits (from binary)
 */
export const MAX_IMAGE_TOKENS = 25000;        // muA() default
export const MAX_FILE_SIZE = 5242880;         // 5MB a2T
export const MAX_DIMENSION = 3932160;         // MP total pixels

/**
 * Resize fallback settings (from binary)
 */
export const FALLBACK_MAX_DIMENSION = 400;
export const FALLBACK_JPEG_QUALITY = 20;

// ============================================
// MIME TYPE DETECTION (ObT function in binary)
// ============================================

/**
 * Magic byte signatures for image formats
 */
const MAGIC_SIGNATURES: Array<{ signature: number[]; mimeType: MediaType }> = [
  // PNG: 89 50 4E 47
  { signature: [0x89, 0x50, 0x4E, 0x47], mimeType: "image/png" },
  // JPEG: FF D8 FF
  { signature: [0xFF, 0xD8, 0xFF], mimeType: "image/jpeg" },
  // GIF: 47 49 46 38
  { signature: [0x47, 0x49, 0x46, 0x38], mimeType: "image/gif" },
  // WEBP: 52 49 46 46 ... 57 45 42 50 (at offset 8)
  { signature: [0x52, 0x49, 0x46, 0x46], mimeType: "image/webp" },
];

/**
 * Detect MIME type from file magic bytes (ObT function in binary)
 * Not just extension-based - inspects file header
 */
export function detectMimeType(bytes: Buffer): MediaType | null {
  if (bytes.length < 4) return null;

  for (const { signature, mimeType } of MAGIC_SIGNATURES) {
    let matches = true;
    for (let i = 0; i < signature.length; i++) {
      if (bytes[i] !== signature[i]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      // Special case for WEBP - verify RIFF...WEBP pattern
      if (mimeType === "image/webp") {
        if (bytes.length >= 12 &&
            bytes[8] === 0x57 && bytes[9] === 0x45 &&
            bytes[10] === 0x42 && bytes[11] === 0x50) {
          return "image/webp";
        }
        continue;
      }
      return mimeType;
    }
  }

  return null;
}

// ============================================
// IMAGE READING (bwA function in binary)
// ============================================

export interface ImageFileResult {
  type: "image";
  base64: string;
  mediaType: MediaType;
  originalSize: number;
  dimensions?: {
    originalWidth?: number;
    originalHeight?: number;
    displayWidth?: number;
    displayHeight?: number;
  };
}

/**
 * Read and process an image file (bwA function in binary)
 *
 * Flow:
 * 1. Read file as bytes
 * 2. Detect MIME type from magic bytes
 * 3. Process with sharp library
 * 4. Check token limit and resize if needed
 * 5. Return base64-encoded result
 */
export async function readImageFile(
  filePath: string,
  maxTokens: number = MAX_IMAGE_TOKENS,
  signal?: AbortSignal
): Promise<ImageFileResult> {
  // 1. Read file as bytes
  const file = Bun.file(filePath);
  const bytes = Buffer.from(await file.arrayBuffer());

  if (bytes.length === 0) {
    throw new Error(`Image file is empty: ${filePath}`);
  }

  // Check file size limit
  if (bytes.length > MAX_FILE_SIZE) {
    throw new Error(`Image file too large: ${filePath} (${(bytes.length / 1024 / 1024).toFixed(2)}MB > 5MB limit)`);
  }

  // 2. Detect MIME type from magic bytes (ObT function)
  const detectedMimeType = detectMimeType(bytes);
  if (!detectedMimeType) {
    throw new Error(`Unsupported image format: ${filePath}`);
  }

  // 3. Process with sharp library
  const sharpLib = await getSharp();
  let image = sharpLib(bytes);
  const metadata = await image.metadata();

  const dimensions = {
    originalWidth: metadata.width,
    originalHeight: metadata.height,
  };

  // Check dimension limits
  const totalPixels = (metadata.width || 0) * (metadata.height || 0);
  if (totalPixels > MAX_DIMENSION) {
    // Need to resize
    const scale = Math.sqrt(MAX_DIMENSION / totalPixels);
    const newWidth = Math.round((metadata.width || 1) * scale);
    const newHeight = Math.round((metadata.height || 1) * scale);

    image = sharpLib(bytes).resize(newWidth, newHeight, {
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  // 4. Get processed buffer
  let outputFormat = metadata.format || "jpeg";
  let outputBuffer: Buffer;

  // Determine output format based on input
  if (outputFormat === "png") {
    outputBuffer = await image.png().toBuffer();
  } else if (outputFormat === "webp") {
    outputBuffer = await image.webp().toBuffer();
  } else if (outputFormat === "gif") {
    outputBuffer = await image.gif().toBuffer();
  } else {
    // Default to JPEG for everything else
    outputBuffer = await image.jpeg({ quality: 85 }).toBuffer();
    outputFormat = "jpeg";
  }

  // 5. Check token limit and resize if needed
  const base64 = outputBuffer.toString("base64");
  const estimatedTokens = Math.ceil(base64.length * 0.125);

  if (estimatedTokens > maxTokens) {
    // Resize to fit within token limit
    try {
      const resizedBuffer = await resizeForTokenLimit(bytes, maxTokens);
      const resizedBase64 = resizedBuffer.toString("base64");

      // Get final dimensions
      const finalMeta = await sharpLib(resizedBuffer).metadata();

      return {
        type: "image",
        base64: resizedBase64,
        mediaType: "image/jpeg", // Resized images are always JPEG
        originalSize: bytes.length,
        dimensions: {
          originalWidth: metadata.width,
          originalHeight: metadata.height,
          displayWidth: finalMeta.width,
          displayHeight: finalMeta.height,
        },
      };
    } catch (resizeErr) {
      // Final fallback: aggressive resize with sharp
      const smallImage = await sharpLib(bytes)
        .resize(FALLBACK_MAX_DIMENSION, FALLBACK_MAX_DIMENSION, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: FALLBACK_JPEG_QUALITY })
        .toBuffer();

      const finalMeta = await sharpLib(smallImage).metadata();

      return {
        type: "image",
        base64: smallImage.toString("base64"),
        mediaType: "image/jpeg",
        originalSize: bytes.length,
        dimensions: {
          originalWidth: metadata.width,
          originalHeight: metadata.height,
          displayWidth: finalMeta.width,
          displayHeight: finalMeta.height,
        },
      };
    }
  }

  // Map format to MediaType
  const mediaType: MediaType = outputFormat === "jpeg" ? "image/jpeg" :
                               outputFormat === "png" ? "image/png" :
                               outputFormat === "gif" ? "image/gif" :
                               outputFormat === "webp" ? "image/webp" :
                               "image/jpeg";

  return {
    type: "image",
    base64,
    mediaType,
    originalSize: bytes.length,
    dimensions: {
      originalWidth: metadata.width,
      originalHeight: metadata.height,
      displayWidth: metadata.width,
      displayHeight: metadata.height,
    },
  };
}

/**
 * Resize image to fit within token limit
 */
async function resizeForTokenLimit(
  bytes: Buffer,
  maxTokens: number
): Promise<Buffer> {
  const sharpLib = await getSharp();

  // Target ~80% of max tokens for safety margin
  const targetBase64Length = Math.floor((maxTokens * 0.8) / 0.125);
  const targetBufferSize = Math.floor(targetBase64Length * 0.75); // base64 is ~4/3 of binary

  const image = sharpLib(bytes);
  const metadata = await image.metadata();

  // Calculate scale factor needed
  const currentSize = bytes.length;
  if (currentSize <= targetBufferSize) {
    return bytes;
  }

  const scaleFactor = Math.sqrt(targetBufferSize / currentSize);
  const newWidth = Math.round((metadata.width || 1) * scaleFactor);
  const newHeight = Math.round((metadata.height || 1) * scaleFactor);

  // Resize and convert to JPEG
  return sharpLib(bytes)
    .resize(newWidth, newHeight, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 70 })
    .toBuffer();
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if a file extension is a supported image
 */
export function isImageExtension(extension: string): boolean {
  const ext = extension.toLowerCase().replace(/^\./, "");
  return IMAGE_EXTENSIONS.has(ext);
}

/**
 * Check if a file extension should be treated as binary (not image)
 */
export function isBinaryExclusion(extension: string): boolean {
  const ext = extension.toLowerCase().replace(/^\./, "");
  return BINARY_EXCLUSIONS.has(ext);
}

/**
 * Convert ImageFileResult to API ImageBlock format
 */
export function toImageBlock(result: ImageFileResult): ImageBlock {
  return {
    type: "image",
    source: {
      type: "base64",
      data: result.base64,
      media_type: result.mediaType,
    },
  };
}

/**
 * Format image result for tool output
 */
export function formatImageResult(result: ImageFileResult): string {
  const dims = result.dimensions;
  const dimStr = dims?.originalWidth && dims?.originalHeight
    ? ` (${dims.originalWidth}x${dims.originalHeight}${dims.displayWidth !== dims.originalWidth ? ` → ${dims.displayWidth}x${dims.displayHeight}` : ''})`
    : '';

  return `[Image: ${result.mediaType}${dimStr}, ${(result.originalSize / 1024).toFixed(1)}KB original]`;
}
