#!/usr/bin/env bun
// Run with: doppler run --project seed --config prd -- bun run tools/generate-icons.ts

/**
 * Generate App Icons with Google Gemini 2.5 Flash Image
 *
 * This script uses Google's Gemini 2.5 Flash Image model to generate PNG icons
 * and images for the Cheapspaces web application.
 *
 * Gemini 2.5 Flash Image is Google's fast, efficient image generation model
 * optimized for high-volume tasks. It generates ~1024px resolution images with
 * support for various aspect ratios.
 *
 * Generated assets:
 * - favicon-16x16.png: Browser tab icon (small)
 * - favicon-32x32.png: Browser tab icon (standard)
 * - apple-touch-icon.png: iOS home screen icon
 * - og-image.png: Social sharing preview (21:9 aspect ratio)
 *
 * All images are saved to the public/ directory for static serving.
 *
 * API: https://ai.google.dev/gemini-api/docs/image-generation
 * Model: gemini-2.5-flash-image
 */

import { promises as fs } from "node:fs";

// Get Google API key from environment (required for Gemini API access)
const API_KEY = process.env.GOOGLE_API_KEY;

if (!API_KEY) {
  console.error("❌ GOOGLE_API_KEY environment variable not set\n");
  console.error("Run with Doppler:");
  console.error(
    "  doppler run --project seed --config prd -- bun run tools/generate-icons.ts\n",
  );
  console.error("Or export manually:");
  console.error("  export GOOGLE_API_KEY=your-key-here\n");
  process.exit(1);
}

/**
 * Generate an image using Gemini 2.5 Flash Image model
 *
 * @param prompt - Text description of the image to generate
 * @param aspectRatio - Aspect ratio for the output (e.g., "1:1", "21:9")
 * @param output - File path where the PNG will be saved
 */
async function generateImage(
  prompt: string,
  aspectRatio: string,
  output: string,
): Promise<void> {
  // Call Gemini API with text prompt and image generation config
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": API_KEY!,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }], // Text prompt describing desired image
          },
        ],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"], // Request both image and text output
          imageConfig: {
            aspectRatio: aspectRatio, // Control output dimensions
          },
        },
      }),
    },
  );

  const data = await response.json();

  // Extract base64-encoded image from API response
  if (data.candidates?.[0]?.content?.parts) {
    for (const part of data.candidates[0].content.parts) {
      if (part.inlineData?.data) {
        // Decode base64 and save as PNG file
        const imageData = part.inlineData.data;
        await fs.writeFile(output, Buffer.from(imageData, "base64"));
        console.log(`✓ Generated ${output}`);
        return;
      }
    }
    console.error(`✗ No image data in response for ${output}`);
  } else {
    console.error(
      `✗ Failed to generate ${output}:`,
      JSON.stringify(data, null, 2),
    );
  }
}

// Image generation prompts with aspect ratios and output paths
const prompts = [
  {
    prompt:
      "A minimal 1:1 square app icon for 'Cheapspaces' - a Hetzner cloud server management tool. Use a blue (#3b82f6) background with a white cloud/server icon. Include a small green accent dot. Flat design, no text, simple geometric shapes.",
    aspectRatio: "1:1",
    output: "public/favicon-32x32.png",
  },
  {
    prompt:
      "A minimal 1:1 square favicon for 'Cheapspaces' - a server management tool. Blue background, white cloud/server symbol, tiny green accent. Very simple, readable at small size.",
    aspectRatio: "1:1",
    output: "public/favicon-16x16.png",
  },
  {
    prompt:
      "A 1:1 square iOS app icon for 'Cheapspaces' - Hetzner server management. Blue gradient background, modern white cloud/server illustration with depth, green status indicator. Clean, professional, rounded corners.",
    aspectRatio: "1:1",
    output: "public/apple-touch-icon.png",
  },
  {
    prompt:
      "A 21:9 wide Open Graph social sharing image for 'Cheapspaces'. Modern dark theme (#0f172a background). Include: 1) A large stylized blue app icon on the left (cloud/server shape with green dot), 2) Text 'Cheapspaces' in large white bold font on the right, 3) Tagline 'Hetzner Development Environments' in smaller gray text, 4) 'Fast • Affordable • AI-Powered' at bottom. Professional developer tool aesthetic.",
    aspectRatio: "21:9",
    output: "public/og-image.png",
  },
];

// Generate all images sequentially
console.log("Generating images with Gemini 2.5 Flash Image...\n");

for (const { prompt, aspectRatio, output } of prompts) {
  await generateImage(prompt, aspectRatio, output);
}

console.log("\nDone!");

/**
 * ============================================================================
 * GOOGLE GEMINI IMAGE GENERATION API REFERENCE
 * ============================================================================
 *
 * For future API route implementation: /api/generate-image
 *
 * AVAILABLE MODELS (2025)
 * ---------------------
 *
 * 1. gemini-2.5-flash-image (Nano Banana) - STABLE
 *    - Model ID: gemini-2.5-flash-image
 *    - Purpose: Fast, efficient image generation for high-volume tasks
 *    - Resolution: ~1024px
 *    - Pricing: ~$0.039 per image
 *    - Use case: Quick generations, batch processing, simple prompts
 *
 * 2. gemini-3-pro-image-preview (Nano Banana Pro) - PREVIEW
 *    - Model ID: gemini-3-pro-image-preview
 *    - Purpose: Highest quality with advanced reasoning
 *    - Resolution: Up to 4K
 *    - Context: 65K input / 32K output tokens
 *    - Use case: Professional assets, complex generations, multi-turn editing
 *
 * DEPRECATED (retire Oct 31, 2025)
 * - gemini-2.0-flash-preview-image-generation
 * - gemini-2.5-flash-image-preview
 *
 * API ENDPOINT
 * ------------
 * POST https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent?key={API_KEY}
 *
 * HEADERS
 * -------
 * Content-Type: application/json
 * x-goog-api-key: {API_KEY}
 *
 * REQUEST BODY
 * ------------
 * {
 *   "contents": [{
 *     "parts": [{ "text": "Your prompt here" }]
 *   }],
 *   "generationConfig": {
 *     "responseModalities": ["IMAGE", "TEXT"],  // or ["IMAGE"] only
 *     "imageConfig": {
 *       "aspectRatio": "1:1",  // Options: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9
 *       "imageSize": "1K"      // Options for gemini-3-pro-image-preview only: 1K, 2K, 4K
 *     }
 *   }
 * }
 *
 * ASPECT RATIOS
 * -------------
 * - 1:1  (square)
 * - 2:3  (portrait)
 * - 3:2  (landscape)
 * - 3:4  (portrait tall)
 * - 4:3  (landscape wide)
 * - 4:5  (portrait taller)
 * - 5:4  (landscape wider)
 * - 9:16 (mobile/story)
 * - 16:9 (widescreen)
 * - 21:9 (ultrawide)
 *
 * IMAGE SIZES (gemini-3-pro-image-preview only)
 * ---------------------------------------------
 * - 1K  = ~1024px (default)
 * - 2K  = ~2048px
 * - 4K  = ~4096px
 *
 * RESPONSE FORMAT
 * ---------------
 * {
 *   "candidates": [{
 *     "content": {
 *       "parts": [
 *         { "inlineData": { "data": "base64_encoded_image", "mimeType": "image/png" } },
 *         { "text": "Optional text description" }
 *       ]
 *     }
 *   }]
 * }
 *
 * IMAGE EDITING
 * -------------
 * To edit images, include base64-encoded images in the request:
 * {
 *   "contents": [
 *     { "parts": [{ "text": "Prompt describing edits" }] },
 *     { "parts": [{ "inlineData": { "data": "base64_image", "mimeType": "image/png" } }] }
 *   ]
 * }
 *
 * LIMITATIONS
 * -----------
 * - All images include invisible SynthID watermarks
 * - gemini-2.5-flash-image: up to 3 input images
 * - gemini-3-pro-image-preview: up to 14 input images (5 with high fidelity)
 *
 * FEATURES
 * --------
 * - Text-to-image generation
 * - Image editing with text prompts
 * - Multi-reference image editing
 * - Google Search grounding (real-time info)
 * - Thinking mode (gemini-3-pro-image-preview only)
 *
 * PRICING (as of 2025)
 * --------------------
 * gemini-2.5-flash-image:
 * - Input: $0.30 per 1M tokens
 * - Image output: $30 per 1M tokens (~$0.039 per 1024x1024 image)
 *
 * DOCUMENTATION LINKS
 * -------------------
 * - Models overview: https://ai.google.dev/gemini-api/docs/models
 * - Image generation guide: https://ai.google.dev/gemini-api/docs/image-generation
 * - Gemini 3 guide: https://ai.google.dev/gemini-api/docs/gemini-3
 * - Pricing: https://ai.google.dev/gemini-api/docs/pricing
 *
 * ============================================================================
 */
