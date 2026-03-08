import { test, expect, describe } from "bun:test";
import {
  IMAGE_EXTENSIONS,
  BINARY_EXCLUSIONS,
  detectMimeType,
  isImageExtension,
  isBinaryExclusion,
  readImageFile,
  toImageBlock,
  formatImageResult,
} from "./image.js";
import type { MediaType } from "../types/index.js";

describe("Image Extensions", () => {
  test("IMAGE_EXTENSIONS contains supported formats", () => {
    expect(IMAGE_EXTENSIONS.has("png")).toBe(true);
    expect(IMAGE_EXTENSIONS.has("jpg")).toBe(true);
    expect(IMAGE_EXTENSIONS.has("jpeg")).toBe(true);
    expect(IMAGE_EXTENSIONS.has("gif")).toBe(true);
    expect(IMAGE_EXTENSIONS.has("webp")).toBe(true);
  });

  test("IMAGE_EXTENSIONS does not contain unsupported formats", () => {
    expect(IMAGE_EXTENSIONS.has("bmp")).toBe(false);
    expect(IMAGE_EXTENSIONS.has("svg")).toBe(false);
    expect(IMAGE_EXTENSIONS.has("pdf")).toBe(false);
  });
});

describe("Binary Exclusions", () => {
  test("BINARY_EXCLUSIONS contains common binary formats", () => {
    expect(BINARY_EXCLUSIONS.has("exe")).toBe(true);
    expect(BINARY_EXCLUSIONS.has("zip")).toBe(true);
    expect(BINARY_EXCLUSIONS.has("mp4")).toBe(true);
    expect(BINARY_EXCLUSIONS.has("doc")).toBe(true);
  });

  test("PDF is NOT in binary exclusions (handled separately)", () => {
    // PDF files can be read with page limits, not in exclusions
    expect(BINARY_EXCLUSIONS.has("pdf")).toBe(false);
  });
});

describe("isImageExtension", () => {
  test("returns true for image extensions", () => {
    expect(isImageExtension("png")).toBe(true);
    expect(isImageExtension("jpg")).toBe(true);
    expect(isImageExtension(".jpeg")).toBe(true);
    expect(isImageExtension("GIF")).toBe(true);
  });

  test("returns false for non-image extensions", () => {
    expect(isImageExtension("txt")).toBe(false);
    expect(isImageExtension("pdf")).toBe(false);
    expect(isImageExtension("exe")).toBe(false);
  });
});

describe("isBinaryExclusion", () => {
  test("returns true for binary exclusions", () => {
    expect(isBinaryExclusion("exe")).toBe(true);
    expect(isBinaryExclusion("zip")).toBe(true);
    expect(isBinaryExclusion("mp4")).toBe(true);
  });

  test("returns false for text files", () => {
    expect(isBinaryExclusion("txt")).toBe(false);
    expect(isBinaryExclusion("md")).toBe(false);
  });
});

describe("detectMimeType", () => {
  test("detects PNG magic bytes", () => {
    // PNG magic bytes: 89 50 4E 47
    const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    expect(detectMimeType(pngHeader)).toBe("image/png");
  });

  test("detects JPEG magic bytes", () => {
    // JPEG magic bytes: FF D8 FF
    const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
    expect(detectMimeType(jpegHeader)).toBe("image/jpeg");
  });

  test("detects GIF magic bytes", () => {
    // GIF magic bytes: 47 49 46 38
    const gifHeader = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    expect(detectMimeType(gifHeader)).toBe("image/gif");
  });

  test("detects WEBP magic bytes", () => {
    // WEBP: RIFF....WEBP
    const webpHeader = Buffer.from([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x00, 0x00, 0x00, 0x00, // size
      0x57, 0x45, 0x42, 0x50, // WEBP
    ]);
    expect(detectMimeType(webpHeader)).toBe("image/webp");
  });

  test("returns null for unknown data", () => {
    const unknownData = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    expect(detectMimeType(unknownData)).toBe(null);
  });

  test("returns null for empty buffer", () => {
    expect(detectMimeType(Buffer.alloc(0))).toBe(null);
  });
});

describe("toImageBlock", () => {
  test("converts ImageFileResult to ImageBlock", () => {
    const result = {
      type: "image" as const,
      base64: "dGVzdCBkYXRh", // "test data" in base64
      mediaType: "image/png" as MediaType,
      originalSize: 1000,
      dimensions: {
        originalWidth: 100,
        originalHeight: 100,
        displayWidth: 100,
        displayHeight: 100,
      },
    };

    const block = toImageBlock(result);

    expect(block.type).toBe("image");
    expect(block.source.type).toBe("base64");
    expect(block.source.data).toBe("dGVzdCBkYXRh");
    expect(block.source.media_type).toBe("image/png");
  });
});

describe("formatImageResult", () => {
  test("formats image result with dimensions", () => {
    const result = {
      type: "image" as const,
      base64: "dGVzdA==",
      mediaType: "image/png" as MediaType,
      originalSize: 1024,
      dimensions: {
        originalWidth: 100,
        originalHeight: 200,
        displayWidth: 100,
        displayHeight: 200,
      },
    };

    const formatted = formatImageResult(result);
    expect(formatted).toContain("image/png");
    expect(formatted).toContain("100x200");
    expect(formatted).toContain("1.0KB");
  });

  test("formats image result without dimensions", () => {
    const result = {
      type: "image" as const,
      base64: "dGVzdA==",
      mediaType: "image/jpeg" as MediaType,
      originalSize: 2048,
      dimensions: {},
    };

    const formatted = formatImageResult(result);
    expect(formatted).toContain("image/jpeg");
    expect(formatted).toContain("2.0KB");
  });
});

describe("readImageFile", () => {
  test("throws error for non-existent file", async () => {
    try {
      await readImageFile("/non/existent/file.png");
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});
