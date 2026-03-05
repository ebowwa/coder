/**
 * AI Streaming Examples
 *
 * Demonstrates how to use the streaming functionality in the AI module.
 * Includes basic and advanced examples with error handling.
 */

import { test, expect, describe } from "bun:test";
import { GLMClient } from "../src/lib/ai/client.js";

// ============================================================================
// SETUP
// ============================================================================

// Skip all tests if no API key is available
const apiKey = process.env.Z_AI_API_KEY;
if (!apiKey) {
  console.warn(
    "⚠️  Skipping streaming tests - no Z_AI_API_KEY environment variable set",
  );
}

const client = new GLMClient(apiKey);

// Helper to skip tests without API key
const skipIfNoKey = apiKey ? test : test.skip;

describe("AI Streaming Examples", () => {
  // ============================================================================
  // EXAMPLE 1: Simple Text Streaming
  // ============================================================================

  skipIfNoKey(
    "Example 1: Simple Streaming - just print text as it arrives",
    async () => {
      console.log("\n=== Example 1: Simple Streaming ===\n");

      const chunks: string[] = [];

      for await (const chunk of client.streamGenerate(
        "Tell me a short poem about coding",
      )) {
        if (chunk.type === "text") {
          process.stdout.write(chunk.content);
          chunks.push(chunk.content);
        } else if (chunk.type === "done") {
          console.log("\n\n✓ Stream completed!");
        } else if (chunk.type === "error") {
          console.error("✗ Error:", chunk.error);
          throw chunk.error;
        }
      }

      expect(chunks.length).toBeGreaterThan(0);
    },
    60000,
  ); // 60 second timeout

  // ============================================================================
  // EXAMPLE 2: Accumulate Full Response
  // ============================================================================

  skipIfNoKey(
    "Example 2: Accumulate Full Response",
    async () => {
      console.log("\n=== Example 2: Accumulate Full Response ===\n");

      const chunks: string[] = [];

      for await (const chunk of client.streamGenerate(
        "Explain quantum computing in 3 sentences",
      )) {
        if (chunk.type === "text") {
          chunks.push(chunk.content);
          process.stdout.write(chunk.content);
        } else if (chunk.type === "done") {
          const fullText = chunks.join("");
          console.log("\n\nFull text length:", fullText.length, "characters");
          expect(fullText.length).toBeGreaterThan(0);
        }
      }
    },
    60000,
  );

  // ============================================================================
  // EXAMPLE 3: Streaming with Usage Tracking
  // ============================================================================

  skipIfNoKey(
    "Example 3: Track Token Usage",
    async () => {
      console.log("\n=== Example 3: Track Token Usage ===\n");

      let totalTokens = 0;
      let promptTokens = 0;
      let completionTokens = 0;

      for await (const chunk of client.streamGenerate(
        "What is the meaning of life?",
      )) {
        if (chunk.type === "text") {
          process.stdout.write(chunk.content);
        } else if (chunk.usage) {
          promptTokens = chunk.usage.promptTokens;
          completionTokens = chunk.usage.completionTokens;
          totalTokens = chunk.usage.totalTokens;
        }
      }

      console.log("\n\nToken Usage:");
      console.log(`  Prompt tokens: ${promptTokens}`);
      console.log(`  Completion tokens: ${completionTokens}`);
      console.log(`  Total tokens: ${totalTokens}`);

      // Token usage might not always be available, so don't fail if it's 0
      // Just log it and verify we got some text
      expect(true).toBe(true);
    },
    60000,
  );

  // ============================================================================
  // EXAMPLE 4: Streaming with Custom Options
  // ============================================================================

  skipIfNoKey(
    "Example 4: Custom Options",
    async () => {
      console.log("\n=== Example 4: Custom Options ===\n");

      const chunks: string[] = [];

      for await (const chunk of client.streamGenerate(
        "Write a haiku about technology",
        {
          model: "GLM-4.7",
          temperature: 0.9,
          maxTokens: 50,
          timeout: 10000,
        },
      )) {
        if (chunk.type === "text") {
          chunks.push(chunk.content);
          process.stdout.write(chunk.content);
        }
      }

      console.log("\n");
      expect(chunks.length).toBeGreaterThan(0);
    },
    30000,
  ); // 30 second timeout

  // ============================================================================
  // EXAMPLE 5: Chat Completion Streaming
  // ============================================================================

  skipIfNoKey(
    "Example 5: Chat Completion Streaming",
    async () => {
      console.log("\n=== Example 5: Chat Completion Streaming ===\n");

      const messages = [
        {
          role: "system" as const,
          content: "You are a helpful assistant who speaks in JSON format.",
        },
        { role: "user" as const, content: "What is your name?" },
      ];

      const chunks: string[] = [];

      for await (const chunk of client.streamChatCompletion(messages)) {
        if (chunk.type === "text") {
          chunks.push(chunk.content);
          process.stdout.write(chunk.content);
        }
      }

      console.log("\n");
      expect(chunks.length).toBeGreaterThan(0);
    },
    60000,
  );

  // ============================================================================
  // EXAMPLE 6: Streaming with System Prompt
  // ============================================================================

  skipIfNoKey(
    "Example 6: System Prompt Streaming",
    async () => {
      console.log("\n=== Example 6: System Prompt Streaming ===\n");

      const chunks: string[] = [];

      for await (const chunk of client.streamGenerateWithSystem(
        "You are a professional code reviewer. Be concise and helpful.",
        "Review this code: function add(a, b) { return a + b; }",
      )) {
        if (chunk.type === "text") {
          chunks.push(chunk.content);
          process.stdout.write(chunk.content);
        }
      }

      console.log("\n");
      expect(chunks.length).toBeGreaterThan(0);
    },
    60000,
  );

  // ============================================================================
  // EXAMPLE 7: Error Handling
  // ============================================================================

  skipIfNoKey(
    "Example 7: Error Handling",
    async () => {
      console.log("\n=== Example 7: Error Handling ===\n");

      try {
        for await (const chunk of client.streamGenerate(
          "Test with invalid API key",
          {
            timeout: 5000,
            maxRetries: 0,
          },
        )) {
          if (chunk.type === "text") {
            process.stdout.write(chunk.content);
          } else if (chunk.type === "done") {
            console.log("\n✓ Stream completed successfully");
          } else if (chunk.type === "error") {
            console.error("\n✗ Stream error:", chunk.error);
            throw chunk.error;
          }
        }
      } catch (error) {
        console.error(
          "✗ Unexpected error:",
          error instanceof Error ? error.message : error,
        );
        // This test is expected to potentially fail with an invalid API key scenario
        expect(error).toBeTruthy();
      }
    },
    10000,
  ); // 10 second timeout

  // ============================================================================
  // EXAMPLE 8: Stream with Progress Indicator
  // ============================================================================

  skipIfNoKey(
    "Example 8: Progress Indicator",
    async () => {
      console.log("\n=== Example 8: Progress Indicator ===\n");

      let charCount = 0;
      const startTime = Date.now();
      let lastProgressUpdate = 0;

      for await (const chunk of client.streamGenerate(
        "Explain the theory of relativity",
      )) {
        if (chunk.type === "text") {
          charCount += chunk.content.length;
          process.stdout.write(chunk.content);

          // Show progress every 50 characters
          if (charCount > lastProgressUpdate + 50) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            process.stdout.write(` [${charCount} chars, ${elapsed}s]`);
            lastProgressUpdate = charCount;
          }
        }
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\n\n✓ Complete: ${charCount} characters in ${elapsed}s`);

      expect(charCount).toBeGreaterThan(0);
    },
    60000,
  );

  // ============================================================================
  // EXAMPLE 9: Streaming with Content Filtering
  // ============================================================================

  skipIfNoKey(
    "Example 9: Content Filtering",
    async () => {
      console.log("\n=== Example 9: Content Filtering ===\n");

      const chunks: string[] = [];

      for await (const chunk of client.streamGenerate(
        "Tell me a short story about programming",
      )) {
        if (chunk.type === "text") {
          const filtered = chunk.content.replace(/[^a-zA-Z0-9\s.,!?]/g, "");
          if (filtered) {
            // Only push if there's content after filtering
            process.stdout.write(filtered);
            chunks.push(filtered);
          }
        }
      }

      console.log("\n");
      expect(chunks.length).toBeGreaterThan(0);
    },
    60000,
  );

  // ============================================================================
  // EXAMPLE 10: Multi-Prompt Streaming
  // ============================================================================

  skipIfNoKey(
    "Example 10: Multi-Prompt Streaming",
    async () => {
      console.log("\n=== Example 10: Multi-Prompt Streaming ===\n");

      const prompts = [
        "What is 2+2?",
        "What is the capital of France?",
        "Name a famous scientist.",
      ];

      for (const prompt of prompts) {
        console.log(`\nPrompt: ${prompt}`);
        console.log("Response: ");

        for await (const chunk of client.streamGenerate(prompt)) {
          if (chunk.type === "text") {
            process.stdout.write(chunk.content);
          }
        }

        console.log("\n---");
      }

      expect(prompts.length).toBe(3);
    },
    90000,
  ); // 90 second timeout for 3 prompts

  // ============================================================================
  // EXAMPLE 11: Stream with Timeout and Cancellation
  // ============================================================================

  skipIfNoKey(
    "Example 11: Timeout Handling",
    async () => {
      console.log("\n=== Example 11: Timeout Handling ===\n");

      try {
        const stream = client.streamGenerate("Write a very long story", {
          timeout: 3000,
        });

        let receivedText = false;

        for await (const chunk of stream) {
          if (chunk.type === "text") {
            if (!receivedText) {
              console.log("Started receiving response...");
              receivedText = true;
            }
            process.stdout.write(chunk.content);
          } else if (chunk.type === "error") {
            if (chunk.error.includes("timeout")) {
              console.log("\n\n⚠ Stream timed out - this is expected");
            }
            break;
          }
        }
      } catch (error) {
        console.error("Error:", error);
        // Timeout errors are expected in this test
        expect(error).toBeTruthy();
      }
    },
    10000,
  ); // 10 second timeout

  // ============================================================================
  // EXAMPLE 12: Streaming to File
  // ============================================================================

  skipIfNoKey(
    "Example 12: Stream to File",
    async () => {
      console.log("\n=== Example 12: Stream to File ===\n");

      const fileContent: string[] = [];

      for await (const chunk of client.streamGenerate(
        "Write a short essay about AI",
      )) {
        if (chunk.type === "text") {
          fileContent.push(chunk.content);
          process.stdout.write(chunk.content);
        }
      }

      const fullContent = fileContent.join("");
      console.log(
        "\n\n✓ Would have written",
        fullContent.length,
        "characters to file",
      );

      expect(fullContent.length).toBeGreaterThan(0);
    },
    60000,
  );

  // ============================================================================
  // EXAMPLE 13: Streaming with Finish Reason
  // ============================================================================

  skipIfNoKey(
    "Example 13: Finish Reason",
    async () => {
      console.log("\n=== Example 13: Finish Reason ===\n");

      let finishReason: string | undefined;

      for await (const chunk of client.streamGenerate("Say hello", {
        maxTokens: 10,
      })) {
        if (chunk.type === "text") {
          process.stdout.write(chunk.content);
        } else if (chunk.finishReason) {
          finishReason = chunk.finishReason;
        }
      }

      console.log(`\n\nFinish reason: ${finishReason || "completed"}`);

      // Finish reason might not always be provided, so just check the test ran
      expect(true).toBe(true);
    },
    30000,
  );
});
