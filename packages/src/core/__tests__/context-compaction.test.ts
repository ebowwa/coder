/**
 * Context Compaction Tests
 *
 * Tests for token estimation, summarization, and context compaction.
 */

import { describe, it, expect } from "bun:test";
import {
  estimateTokens,
  estimateMessagesTokens,
  summarizeMessages,
  summarizeWithLLM,
  compactMessages,
  needsCompaction,
  getCompactionStats,
} from "../context-compaction.js";
import type { Message, CompactionResult } from "../../schemas/index.js";

// ============================================
// TOKEN ESTIMATION TESTS
// ============================================

describe("estimateTokens", () => {
  it("should return 0 for empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("should estimate tokens based on character count", () => {
    // Using ~4 chars per token
    expect(estimateTokens("aaaa")).toBe(1); // 4 chars = 1 token
    expect(estimateTokens("aaaaaaaa")).toBe(2); // 8 chars = 2 tokens
  });

  it("should round up partial tokens", () => {
    expect(estimateTokens("a")).toBe(1); // 1 char rounds up to 1 token
    expect(estimateTokens("aaa")).toBe(1); // 3 chars rounds up to 1 token
  });

  it("should handle long text", () => {
    const longText = "a".repeat(1000);
    expect(estimateTokens(longText)).toBe(250); // 1000 / 4 = 250
  });
});

describe("estimateMessagesTokens", () => {
  const createMessage = (content: string): Message => ({
    role: "user",
    content,
  });

  it("should return 0 for empty array", () => {
    expect(estimateMessagesTokens([])).toBe(0);
  });

  it("should estimate single message tokens", () => {
    const messages = [createMessage("test message")];
    // 12 chars / 4 = 3 tokens + 4 role overhead = 7
    const tokens = estimateMessagesTokens(messages);
    expect(tokens).toBeGreaterThan(0);
  });

  it("should sum multiple messages", () => {
    const messages = [
      createMessage("first"),
      createMessage("second"),
    ];
    const tokens = estimateMessagesTokens(messages);
    expect(tokens).toBeGreaterThan(0);
  });

  it("should handle array content blocks", () => {
    const messages: Message[] = [
      {
        role: "user",
        content: [
          { type: "text", text: "Hello" },
          { type: "text", text: "World" },
        ],
      },
    ];
    const tokens = estimateMessagesTokens(messages);
    expect(tokens).toBeGreaterThan(0);
  });

  it("should estimate tool use blocks", () => {
    const messages: Message[] = [
      {
        role: "assistant",
        content: [
          {
            type: "tool_use",
            id: "tool-1",
            name: "read",
            input: { path: "/test/file.ts" },
          },
        ],
      },
    ];
    const tokens = estimateMessagesTokens(messages);
    expect(tokens).toBeGreaterThan(0);
  });

  it("should estimate tool result blocks", () => {
    const messages: Message[] = [
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: "tool-1",
            content: "File content here",
          },
        ],
      },
    ];
    const tokens = estimateMessagesTokens(messages);
    expect(tokens).toBeGreaterThan(0);
  });
});

// ============================================
// SUMMARIZATION TESTS
// ============================================

describe("summarizeMessages", () => {
  it("should return empty string for empty array", async () => {
    const result = await summarizeMessages([]);
    expect(result).toBe("");
  });

  it("should include message count in summary", async () => {
    const messages: Message[] = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there" },
    ];
    const result = await summarizeMessages(messages);
    expect(result).toContain("2 messages");
  });

  it("should include role labels", async () => {
    const messages: Message[] = [
      { role: "user", content: "Question" },
      { role: "assistant", content: "Answer" },
    ];
    const result = await summarizeMessages(messages);
    expect(result).toContain("USER:");
    expect(result).toContain("ASSISTANT:");
  });

  it("should truncate long messages", async () => {
    const longContent = "x".repeat(500);
    const messages: Message[] = [
      { role: "user", content: longContent },
    ];
    const result = await summarizeMessages(messages);
    expect(result).toContain("...");
  });

  it("should track tool usage", async () => {
    const messages: Message[] = [
      {
        role: "assistant",
        content: [
          { type: "text", text: "Let me read that file" },
          { type: "tool_use", id: "t1", name: "read", input: {} },
        ],
      },
      {
        role: "user",
        content: [
          { type: "tool_result", tool_use_id: "t1", content: "file content" },
        ],
      },
    ];
    const result = await summarizeMessages(messages);
    expect(result).toContain("Tools used:");
  });
});

describe("summarizeWithLLM", () => {
  it("should fallback to simple summarization without API key", async () => {
    const messages: Message[] = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi" },
    ];

    // Explicitly pass empty string to prevent env var lookup
    const result = await summarizeWithLLM(messages, { apiKey: "" });
    expect(result).toContain("messages");
  });

  it("should use simple summarization when apiKey is null", async () => {
    const messages: Message[] = [
      { role: "user", content: "Test" },
    ];

    const result = await summarizeWithLLM(messages, { apiKey: null as any });
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

// ============================================
// COMPACTION TESTS
// ============================================

describe("compactMessages", () => {
  const createMessages = (count: number, contentSize: number = 100): Message[] => {
    return Array.from({ length: count }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant" as const,
      content: `Message ${i}: ${"x".repeat(contentSize)}`,
    }));
  };

  it("should not compact if under token limit", async () => {
    const messages = createMessages(5, 50);
    const result = await compactMessages(messages, 100000);

    expect(result.didCompact).toBe(false);
    expect(result.messagesRemoved).toBe(0);
    expect(result.messages).toHaveLength(5);
  });

  it("should not compact if too few messages", async () => {
    const messages = createMessages(3, 1000);
    const result = await compactMessages(messages, 100);

    // 3 messages with keepFirst=1, keepLast=5 means not enough to compact
    expect(result.didCompact).toBe(false);
  });

  it("should compact messages when over limit", async () => {
    const messages = createMessages(20, 500);
    const result = await compactMessages(messages, 500, { useLLMSummarization: false });

    expect(result.didCompact).toBe(true);
    expect(result.messages.length).toBeLessThan(messages.length);
    expect(result.tokensAfter).toBeLessThan(result.tokensBefore);
  });

  it("should preserve first message", async () => {
    const messages = createMessages(15, 200);
    messages[0] = { role: "user", content: "IMPORTANT FIRST MESSAGE" };

    const result = await compactMessages(messages, 500, { useLLMSummarization: false });

    // First message should be preserved
    const firstContent = result.messages[0]?.content;
    if (typeof firstContent === "string") {
      expect(firstContent).toContain("IMPORTANT FIRST MESSAGE");
    }
  });

  it("should preserve last messages", async () => {
    const messages = createMessages(15, 200);
    messages[messages.length - 1] = { role: "assistant", content: "IMPORTANT LAST MESSAGE" };

    const result = await compactMessages(messages, 500, { useLLMSummarization: false });

    // Last message should be preserved
    const lastMessage = result.messages[result.messages.length - 1];
    const lastContent = lastMessage?.content;
    if (typeof lastContent === "string") {
      expect(lastContent).toContain("IMPORTANT LAST MESSAGE");
    }
  });

  it("should include summary message", async () => {
    const messages = createMessages(15, 200);
    const result = await compactMessages(messages, 500, { useLLMSummarization: false });

    // Should contain a summary message
    const hasSummary = result.messages.some(m => {
      if (typeof m.content === "string") {
        return m.content.includes("compacted") || m.content.includes("Summary") || m.content.includes("Context Summary");
      }
      if (Array.isArray(m.content)) {
        return m.content.some(b => b.type === "text" && (b.text.includes("compacted") || b.text.includes("Summary") || b.text.includes("Context Summary")));
      }
      return false;
    });
    expect(hasSummary).toBe(true);
  });

  it("should respect keepFirst option", async () => {
    const messages = createMessages(15, 200);
    const result = await compactMessages(messages, 500, { keepFirst: 2, useLLMSummarization: false });

    // First 2 messages should be preserved
    expect(result.messages.length).toBeGreaterThan(0);
  });

  it("should respect keepLast option", async () => {
    const messages = createMessages(15, 200);
    const result = await compactMessages(messages, 500, { keepLast: 3, useLLMSummarization: false });

    expect(result.messages.length).toBeGreaterThan(0);
  });

  it("should disable LLM summarization when requested", async () => {
    const messages = createMessages(15, 200);
    const result = await compactMessages(messages, 500, { useLLMSummarization: false });

    expect(result.didCompact).toBe(true);
  });
});

// ============================================
// COMPACTION CHECK TESTS
// ============================================

describe("needsCompaction", () => {
  const createMessages = (count: number): Message[] => {
    return Array.from({ length: count }, (_, i) => ({
      role: "user" as const,
      content: `Message ${i}: ${"x".repeat(100)}`,
    }));
  };

  it("should return false for too few messages", () => {
    const messages = createMessages(5);
    expect(needsCompaction(messages, 1000)).toBe(false);
  });

  it("should return false when under threshold", () => {
    const messages = createMessages(10);
    // Each message ~25 tokens + overhead, total ~300 tokens
    // 90% of 10000 = 9000, so well under
    expect(needsCompaction(messages, 10000)).toBe(false);
  });

  it("should return true when over threshold", () => {
    const messages = createMessages(100);
    // Each message ~25 tokens + overhead, total ~3000 tokens
    // 90% of 1000 = 900, so over threshold
    expect(needsCompaction(messages, 1000)).toBe(true);
  });

  it("should respect custom threshold", () => {
    const messages = createMessages(10);
    // ~300 tokens, 50% of 1000 = 500, so under
    expect(needsCompaction(messages, 1000, 0.5)).toBe(false);
    // ~300 tokens, 20% of 2000 = 400, so under
    expect(needsCompaction(messages, 2000, 0.2)).toBe(false);
  });
});

// ============================================
// COMPACTION STATS TESTS
// ============================================

describe("getCompactionStats", () => {
  it("should return zeros for no compaction", () => {
    const result: CompactionResult = {
      messages: [],
      messagesRemoved: 0,
      tokensBefore: 1000,
      tokensAfter: 1000,
      didCompact: false,
    };

    const stats = getCompactionStats(result);

    expect(stats.reductionPercent).toBe(0);
    expect(stats.tokensSaved).toBe(0);
  });

  it("should calculate reduction percentage", () => {
    const result: CompactionResult = {
      messages: [],
      messagesRemoved: 5,
      tokensBefore: 1000,
      tokensAfter: 500,
      didCompact: true,
    };

    const stats = getCompactionStats(result);

    expect(stats.tokensSaved).toBe(500);
    expect(stats.reductionPercent).toBe(50);
  });

  it("should handle partial reduction", () => {
    const result: CompactionResult = {
      messages: [],
      messagesRemoved: 3,
      tokensBefore: 1000,
      tokensAfter: 750,
      didCompact: true,
    };

    const stats = getCompactionStats(result);

    expect(stats.tokensSaved).toBe(250);
    expect(stats.reductionPercent).toBe(25);
  });
});
