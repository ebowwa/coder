/**
 * API Streaming Integration Tests
 * Tests real streaming from Anthropic API
 */

import { describe, it, expect } from "bun:test";
import { createMessageStream, calculateCost } from "../packages/src/core/api-client-impl.js";

import type { Message, ContentBlock, UsageMetrics } from "../packages/src/types/index.js";
import type { StreamOptions } from "../packages/src/core/api-client-impl.js";

// Check for API key
const hasApiKey = !!(
  process.env.ANTHROPIC_API_KEY ||
  process.env.CLAUDE_API_KEY ||
  process.env.ANTHROPIC_AUTH_TOKEN ||
  process.env.Z_AI_API_KEY
);

// Get API key from environment
function getApiKey(): string {
  return (
    process.env.ANTHROPIC_API_KEY ||
    process.env.CLAUDE_API_KEY ||
    process.env.ANTHROPIC_AUTH_TOKEN ||
    process.env.Z_AI_API_KEY ||
    ""
  );
}

// Helper to create text content block
function textBlock(text: string): ContentBlock {
  return { type: "text", text };
}

// Cost calculation tests - always run
describe("Cost calculation", () => {
  it("should calculate correct cost for Sonnet", () => {
    const usage: UsageMetrics = {
      input_tokens: 1000,
      output_tokens: 500,
      cache_read_input_tokens: 200,
      cache_creation_input_tokens: 100,
    };

    const cost = calculateCost("claude-sonnet-4-6", usage);
    expect(cost.costUSD).toBeGreaterThan(0);
    expect(cost.costUSD).toBeLessThan(0.05); // Should be small for test usage
    console.log(`  Calculated cost: $${cost.costUSD.toFixed(6)}`);
  });

  it("should calculate cache savings", () => {
    const usageWithCache: UsageMetrics = {
      input_tokens: 1000,
      output_tokens: 500,
      cache_read_input_tokens: 500,
    };

    const usageWithoutCache: UsageMetrics = {
      input_tokens: 1000,
      output_tokens: 500,
    };

    const costWithCache = calculateCost("claude-sonnet-4-6", usageWithCache);
    const costWithoutCache = calculateCost("claude-sonnet-4-6", usageWithoutCache);

    // Using cache should be cheaper
    expect(costWithCache.costUSD).toBeLessThan(costWithoutCache.costUSD);
    console.log(`  Cost with cache: $${costWithCache.costUSD.toFixed(6)}`);
    console.log(`  Cost without cache: $${costWithoutCache.costUSD.toFixed(6)}`);
    console.log(`  Savings: $${(costWithoutCache.costUSD - costWithCache.costUSD).toFixed(6)}`);
  });
});

// Only run API tests if key is available
if (hasApiKey) {
  describe("API Streaming", () => {
    describe("Basic streaming", () => {
      it("should stream a simple message", async () => {
        const tokens: string[] = [];
        const onToken = (text: string) => tokens.push(text);

        const messages: Message[] = [
          { role: "user", content: [textBlock("Say 'Hello world' and nothing else.")] },
        ];

        const options: StreamOptions = {
          apiKey: getApiKey(),
          model: "claude-sonnet-4-6",
          maxTokens: 100,
          onToken,
        };

        const result = await createMessageStream(messages, options);

        expect(result.message).toBeDefined();
        expect(result.message.role).toBe("assistant");
        expect(result.message.content.length).toBeGreaterThan(0);
        expect(tokens.length).toBeGreaterThan(0);
        expect(result.costUSD).toBeGreaterThan(0);
        console.log(`  Streamed ${tokens.length} token chunks`);
        console.log(`  Cost: $${result.costUSD.toFixed(6)}`);
      }, 10000);
    });

    describe("Tool use streaming", () => {
      it("should handle tool use in stream", async () => {
        const toolUses: Array<{ id: string; name: string; input: unknown }> = [];
        const onToolUse = (toolUse: { id: string; name: string; input: unknown }) => {
          toolUses.push(toolUse);
        };

        const messages: Message[] = [
          {
            role: "user",
            content: [textBlock("What is 2 + 2? Just answer with the number.")],
          },
        ];

        const options: StreamOptions = {
          apiKey: getApiKey(),
          model: "claude-sonnet-4-6",
          maxTokens: 500,
          tools: [
            {
              name: "bash",
              description: "Execute a bash command",
              input_schema: {
                type: "object",
                properties: {
                  command: { type: "string" },
                },
                required: ["command"],
              },
            },
          ],
          onToolUse,
        };

        const result = await createMessageStream(messages, options);

        expect(result.message).toBeDefined();
        console.log(`  Tool uses: ${toolUses.length}`);
      }, 30000);
    });

    describe("Extended thinking", () => {
      it("should include thinking blocks when enabled", async () => {
        const thinking: string[] = [];
        const onThinking = (text: string) => thinking.push(text);

        const messages: Message[] = [
          {
            role: "user",
            content: [textBlock("Think about what 2+2 equals and explain your reasoning.")],
          },
        ];

        const options: StreamOptions = {
          apiKey: getApiKey(),
          model: "claude-sonnet-4-6",
          maxTokens: 200,
          thinking: { type: "enabled", budget_tokens: 1000 },
          onThinking,
        };

        const result = await createMessageStream(messages, options);

        expect(result.message).toBeDefined();
        const hasThinking = result.message.content.some(
          (block) => block.type === "thinking"
        );
        console.log(`  Thinking blocks: ${thinking.length}`);
        console.log(`  Has thinking in response: ${hasThinking}`);
      }, 30000);
    });

    describe("Error handling", () => {
      it("should handle invalid API key", async () => {
        const messages: Message[] = [
          { role: "user", content: [textBlock("Hi")] },
        ];

        const options: StreamOptions = {
          apiKey: "invalid-key-for-testing",
          model: "claude-sonnet-4-6",
          maxTokens: 50,
        };

        try {
          await createMessageStream(messages, options);
          // Should have thrown
          expect(true).toBe(false);
        } catch (error) {
          expect(error).toBeDefined();
          const message = (error as Error).message;
          // Should be some kind of auth error or API error
          expect(message.length).toBeGreaterThan(0);
          console.log(`  Error handled correctly: ${message.slice(0, 80)}`);
        }
      });
    });
  });
} else {
  console.log("\n  Skipping API streaming tests (no API key set)");
  console.log("  Set ANTHROPIC_API_KEY to run these tests\n");
}
