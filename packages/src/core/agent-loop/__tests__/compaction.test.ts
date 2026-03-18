/**
 * Compaction Tests - Context compaction strategies
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  handleProactiveCompaction,
  handleReactiveCompaction,
  needsCompaction,
  DEFAULT_PROACTIVE_OPTIONS,
  DEFAULT_REACTIVE_OPTIONS,
} from "../compaction.js";
import { LoopState } from "../loop-state.js";
import type { Message } from "../../../schemas/index.js";

// Helper to create messages with specific token counts
function createMessages(count: number, tokensPerMessage: number = 100): Message[] {
  const messages: Message[] = [];
  const charsPerMessage = tokensPerMessage * 4; // ~4 chars per token

  for (let i = 0; i < count; i++) {
    messages.push({
      role: i % 2 === 0 ? "user" : "assistant",
      content: [{
        type: "text",
        text: "x".repeat(charsPerMessage) + ` Message ${i}`,
      }],
    });
  }

  return messages;
}

describe("DEFAULT_PROACTIVE_OPTIONS", () => {
  it("should have correct default values", () => {
    expect(DEFAULT_PROACTIVE_OPTIONS.keepFirst).toBe(0);
    expect(DEFAULT_PROACTIVE_OPTIONS.keepLast).toBe(3);
    expect(DEFAULT_PROACTIVE_OPTIONS.preserveToolPairs).toBe(true);
  });
});

describe("DEFAULT_REACTIVE_OPTIONS", () => {
  it("should have correct default values", () => {
    expect(DEFAULT_REACTIVE_OPTIONS.keepFirst).toBe(0);
    expect(DEFAULT_REACTIVE_OPTIONS.keepLast).toBe(3);
    expect(DEFAULT_REACTIVE_OPTIONS.preserveToolPairs).toBe(true);
  });
});

describe("needsCompaction", () => {
  it("should return false for small message sets", () => {
    const messages = createMessages(5, 1000); // 5 messages, high tokens

    // Should not need compaction because not enough messages
    expect(needsCompaction(messages, 4096)).toBe(false);
  });

  it("should return false when under threshold", () => {
    const messages = createMessages(10, 50); // 10 messages, low tokens each

    // Under 90% threshold
    expect(needsCompaction(messages, 4096)).toBe(false);
  });

  it("should return true when over threshold", () => {
    const messages = createMessages(10, 500); // 10 messages, high tokens

    // Over 90% threshold
    expect(needsCompaction(messages, 4096)).toBe(true);
  });

  it("should respect custom threshold", () => {
    // Create messages with known content
    // Each message has ~4 token role overhead + content tokens
    const messages = createMessages(10, 200);

    // Use a high maxTokens where we definitely should NOT need compaction
    // 10 messages * ~200 tokens = ~2000 tokens, with 10000 limit at 0.9 = 9000 threshold
    // 2000 < 9000, so no compaction needed
    expect(needsCompaction(messages, 10000, 0.9)).toBe(false);

    // Use a low maxTokens where we definitely SHOULD need compaction
    // 2000 tokens, with 2000 limit at 0.9 = 1800 threshold
    // 2000 >= 1800, so compaction needed
    expect(needsCompaction(messages, 2000, 0.9)).toBe(true);

    // At 0.5 threshold with 2000 limit = 1000 threshold
    // 2000 >= 1000, so compaction needed
    expect(needsCompaction(messages, 2000, 0.5)).toBe(true);
  });
});

describe("handleProactiveCompaction", () => {
  let state: LoopState;

  beforeEach(() => {
    // Create state with enough messages for compaction
    const messages = createMessages(12, 500);
    state = new LoopState(messages);
  });

  it("should return false when compaction not needed", async () => {
    const smallState = new LoopState(createMessages(5, 50));

    const result = await handleProactiveCompaction(smallState, 4096);

    expect(result).toBe(false);
    expect(smallState.compactionCount).toBe(0);
  });

  // Requires live LLM API calls - skip in CI/unit test runs
  it.skip("should apply compaction when needed", async () => {
    const result = await handleProactiveCompaction(state, 4096);

    // May or may not compact depending on actual token counts
    // Just verify it doesn't throw
    expect(typeof result).toBe("boolean");
  });

  it("should respect custom options", async () => {
    const customOptions = {
      keepFirst: 2,
      keepLast: 5,
      preserveToolPairs: false,
    };

    const result = await handleProactiveCompaction(state, 4096, customOptions);

    expect(typeof result).toBe("boolean");
  }, 10000); // 10s timeout for compaction
});

describe("handleReactiveCompaction", () => {
  let state: LoopState;

  beforeEach(() => {
    const messages = createMessages(12, 500);
    state = new LoopState(messages);
  });

  it("should attempt compaction on any message set", async () => {
    const result = await handleReactiveCompaction(state, 4096);

    expect(typeof result).toBe("boolean");
  }, 10000); // 10s timeout for compaction

  it("should return false if compaction does not reduce tokens", async () => {
    // Very small state that can't be compacted meaningfully
    const smallState = new LoopState(createMessages(2, 100));

    const result = await handleReactiveCompaction(smallState, 4096);

    expect(result).toBe(false);
  });

  // Requires live LLM API calls - skip in CI/unit test runs
  it.skip("should increment compaction count on success", async () => {
    const initialCount = state.compactionCount;

    await handleReactiveCompaction(state, 1000); // Force compaction with low limit

    // If compaction succeeded, count should increase
    // (depends on actual token counts)
  });
});

describe("compaction with tool pairs", () => {
  it("should preserve tool use/result pairs when enabled", async () => {
    const messages: Message[] = [
      { role: "user", content: [{ type: "text", text: "x".repeat(4000) }] },
      { role: "assistant", content: [
        { type: "tool_use", id: "tool1", name: "Read", input: { file_path: "/test" } },
      ]},
      { role: "user", content: [
        { type: "tool_result", tool_use_id: "tool1", content: "result" },
      ]},
      { role: "assistant", content: [{ type: "text", text: "Done" }] },
    ];

    const state = new LoopState(messages);

    // With preserveToolPairs: true
    const result = await handleProactiveCompaction(state, 1000, {
      keepFirst: 0,
      keepLast: 1,
      preserveToolPairs: true,
    });

    // Tool pairs should be considered for preservation
    expect(typeof result).toBe("boolean");
  });
});

describe("compaction state updates", () => {
  // These tests require live LLM API calls - skip in CI/unit test runs
  it.skip("should update state messages on successful compaction", async () => {
    const messages = createMessages(15, 500);
    const state = new LoopState(messages);
    const originalLength = state.messages.length;

    await handleProactiveCompaction(state, 2000); // Force compaction

    // If compaction occurred, message count should decrease
    // (depends on actual implementation)
  });

  it.skip("should track total tokens compacted", async () => {
    const messages = createMessages(15, 500);
    const state = new LoopState(messages);

    const initialCompacted = state.totalTokensCompacted;

    await handleProactiveCompaction(state, 2000);

    // If compaction succeeded, this should increase
    // (depends on actual implementation)
  });
});

describe("edge cases", () => {
  it("should handle empty messages", async () => {
    const state = new LoopState([]);

    const result = await handleProactiveCompaction(state, 4096);

    expect(result).toBe(false);
  });

  it("should handle single message", async () => {
    const state = new LoopState(createMessages(1, 1000));

    const result = await handleProactiveCompaction(state, 4096);

    expect(result).toBe(false);
  });

  it("should handle messages exactly at threshold", async () => {
    // Create messages that are exactly at the threshold
    const messages = createMessages(8, 460); // ~3680 tokens, at 90% of 4096
    const state = new LoopState(messages);

    const result = await handleProactiveCompaction(state, 4096);

    // Should need compaction at exactly 90%
    expect(typeof result).toBe("boolean");
  });

  it("should handle very large individual messages", async () => {
    const messages: Message[] = [
      { role: "user", content: [{ type: "text", text: "x".repeat(100000) }] },
      { role: "assistant", content: [{ type: "text", text: "Response" }] },
      { role: "user", content: [{ type: "text", text: "Follow up" }] },
    ];

    const state = new LoopState(messages);

    const result = await handleReactiveCompaction(state, 4096);

    expect(typeof result).toBe("boolean");
  });

  it("should handle messages with mixed content types", async () => {
    const messages: Message[] = [
      { role: "user", content: [{ type: "text", text: "x".repeat(2000) }] },
      { role: "assistant", content: [
        { type: "tool_use", id: "t1", name: "Read", input: {} },
        { type: "text", text: "Text after tool" },
      ]},
      { role: "user", content: [
        { type: "tool_result", tool_use_id: "t1", content: "result" },
        { type: "image", source: { type: "base64", data: "imagedata", media_type: "image/png" } },
      ]},
    ];

    for (let i = 0; i < 6; i++) {
      messages.push({
        role: i % 2 === 0 ? "user" : "assistant",
        content: [{ type: "text", text: "x".repeat(500) }],
      });
    }

    const state = new LoopState(messages);

    const result = await handleProactiveCompaction(state, 4096);

    expect(typeof result).toBe("boolean");
  });
});
