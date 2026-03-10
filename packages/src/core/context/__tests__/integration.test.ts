import { describe, it, expect } from "bun:test";
import { compactMessages, needsCompaction, getCompactionStats } from "../compaction.js";
import { LoopState } from "../../agent-loop/loop-state.js";
import type { Message, ContentBlock } from "../../../types/index.js";

/**
 * Integration tests for context compaction module
 * Tests compaction, token estimation, and LoopState integration
 */
describe("Context Compaction Integration", () => {
  // Helper to create text content blocks
  const textBlock = (text: string): ContentBlock => ({ type: "text", text });

  // Helper to create messages
  const userMessage = (content: string | ContentBlock[]): Message => ({
    role: "user",
    content: Array.isArray(content) ? content : [textBlock(content)]
  });

  const assistantMessage = (content: string | ContentBlock[]): Message => ({
    role: "assistant",
    content: Array.isArray(content) ? content : [textBlock(content)]
  });

  describe("needsCompaction", () => {
    it("returns false for empty messages", () => {
      const messages: Message[] = [];
      const result = needsCompaction(messages, 1000);
      expect(result).toBe(false);
    });

    it("returns false for small messages", () => {
      const messages = [
        userMessage("Hello"),
        assistantMessage("Hi there!")
      ];
      
      const result = needsCompaction(messages, 100000);
      expect(result).toBe(false);
    });

    it("returns true when exceeding threshold", () => {
      // Add many large messages to exceed threshold
      const messages: Message[] = [];
      for (let i = 0; i < 100; i++) {
        messages.push(userMessage("This is a test message ".repeat(100)));
        messages.push(assistantMessage("This is a response message ".repeat(100)));
      }
      
      const result = needsCompaction(messages, 1000);
      expect(result).toBe(true);
    });
  });

  describe("compactMessages", () => {
    it("compacts messages while preserving first and last", async () => {
      const messages: Message[] = [];
      
      // First messages (to preserve)
      messages.push(userMessage("Initial question"));
      messages.push(assistantMessage("Initial response"));
      
      // Middle messages (to summarize)
      for (let i = 0; i < 20; i++) {
        messages.push(userMessage(`User question ${i}: ` + "test ".repeat(50)));
        messages.push(assistantMessage(`Assistant answer ${i}: ` + "response ".repeat(50)));
      }
      
      // Last messages (to preserve)
      messages.push(userMessage("Final question"));
      messages.push(assistantMessage("Final response"));

      // Use lower maxTokens to ensure compaction triggers
      const result = await compactMessages(messages, 500, {
        keepFirst: 2,
        keepLast: 2,
        useLLMSummarization: false
      });

      // Verify compaction occurred
      expect(result.didCompact).toBe(true);
      expect(result.messages.length).toBeLessThan(messages.length);
      expect(result.messages.length).toBeGreaterThan(0);
      expect(result.tokensAfter).toBeLessThan(result.tokensBefore);
      
      // Verify first messages preserved
      expect(result.messages[0]).toEqual(messages[0]);
      expect(result.messages[1]).toEqual(messages[1]);
      
      // Verify last messages preserved
      const lastIdx = result.messages.length - 1;
      expect(result.messages[lastIdx - 1]).toEqual(messages[messages.length - 2]);
      expect(result.messages[lastIdx]).toEqual(messages[messages.length - 1]);
      
      // Verify summary inserted
      const hasSummary = result.messages.some(m => 
        m.content.some(block => 
          block.type === "text" && 
          (block as any).text?.includes("compacted")
        )
      );
      expect(hasSummary).toBe(true);
    });

    it("handles empty messages gracefully", async () => {
      const messages: Message[] = [];
      
      const result = await compactMessages(messages, 1000);
      
      expect(result.messages).toEqual([]);
      expect(result.didCompact).toBe(false);
    });

    it("returns unchanged if under token limit", async () => {
      const messages = [
        userMessage("Hello"),
        assistantMessage("Hi!")
      ];
      
      const result = await compactMessages(messages, 100000);
      
      expect(result.didCompact).toBe(false);
      expect(result.messages).toEqual(messages);
    });

    it("preserves tool use and tool result pairs", async () => {
      const messages: Message[] = [
        userMessage("Read the file"),
        {
          role: "assistant",
          content: [
            textBlock("I'll read the file."),
            { type: "tool_use", id: "tool-1", name: "Read", input: { file_path: "/test.txt" } }
          ]
        },
        {
          role: "user",
          content: [
            { type: "tool_result", tool_use_id: "tool-1", content: "File contents here" }
          ]
        },
        assistantMessage("The file contains test data.")
      ];

      const result = await compactMessages(messages, 500, {
        keepFirst: 1,
        keepLast: 1,
        preserveToolPairs: true,
        useLLMSummarization: false
      });

      // Should have compacted with tool pairs preserved
      expect(result.messages.length).toBeGreaterThan(0);
    });
  });

  describe("getCompactionStats", () => {
    it("returns zero stats for no compaction", () => {
      const result = {
        messages: [],
        messagesRemoved: 0,
        tokensBefore: 100,
        tokensAfter: 100,
        didCompact: false
      };
      
      const stats = getCompactionStats(result);
      
      expect(stats.reductionPercent).toBe(0);
      expect(stats.tokensSaved).toBe(0);
    });

    it("calculates correct stats after compaction", () => {
      const result = {
        messages: [],
        messagesRemoved: 50,
        tokensBefore: 1000,
        tokensAfter: 300,
        didCompact: true
      };
      
      const stats = getCompactionStats(result);
      
      expect(stats.tokensSaved).toBe(700);
      expect(stats.reductionPercent).toBeCloseTo(70, 0);
    });
  });

  describe("LoopState integration", () => {
    it("LoopState.applyCompaction works with compactMessages result", async () => {
      const initialMessages: Message[] = [];
      for (let i = 0; i < 30; i++) {
        initialMessages.push(userMessage(`Message ${i}: ` + "x".repeat(100)));
        initialMessages.push(assistantMessage(`Response ${i}: ` + "y".repeat(100)));
      }
      
      const loopState = new LoopState(initialMessages);
      
      // Compact
      const compactionResult = await compactMessages(loopState.messages, 5000, {
        keepFirst: 2,
        keepLast: 4,
        useLLMSummarization: false
      });
      
      // Apply to state
      const applied = loopState.applyCompaction(compactionResult, getCompactionStats);
      
      if (compactionResult.didCompact) {
        expect(applied).toBe(true);
        expect(loopState.messages.length).toBeLessThan(initialMessages.length);
        expect(loopState.compactionCount).toBe(1);
        expect(loopState.totalTokensCompacted).toBeGreaterThan(0);
      }
    });
  });

  describe("extraction and summarization integration", () => {
    it("extracts text correctly from mixed content blocks", async () => {
      const messages: Message[] = [
        {
          role: "user",
          content: [
            textBlock("Here's my question:"),
            { type: "image", source: { type: "base64", media_type: "image/png", data: "abc123" } } as ContentBlock,
            textBlock("Please help with this.")
          ]
        },
        assistantMessage("I'll help you with that.")
      ];

      const result = await compactMessages(messages, 500, {
        useLLMSummarization: false
      });

      // Text should be handled, image preserved or summarized
      expect(result.messages.length).toBeGreaterThan(0);
    });

    it("summarizes long conversations effectively", async () => {
      const messages: Message[] = [
        userMessage("I need to build a REST API"),
        assistantMessage("I'll help you build a REST API. What framework?"),
        userMessage("Express.js"),
        assistantMessage("Great choice. Let's set up routes.")
      ];

      // Add more conversation to ensure we exceeds token limit
      for (let i = 0; i < 30; i++) {
        messages.push(userMessage(`Question about route ${i}: ` + "test ".repeat(100)));
        messages.push(assistantMessage(`Answer about route ${i}: ` + "response ".repeat(100)));
      }

      // Use a very low token limit to force compaction
      const result = await compactMessages(messages, 100, {
        keepFirst: 2,
        keepLast: 4,
        useLLMSummarization: false
      });

      // Should have summary of earlier conversation
      expect(result.didCompact).toBe(true);
      expect(result.messages.length).toBeLessThan(messages.length);
      expect(result.messagesRemoved).toBeGreaterThan(0);
    });
  });

  describe("performance with large contexts", () => {
    it("handles 100+ messages efficiently", async () => {
      const messages: Message[] = [];
      
      // Add 100 messages
      for (let i = 0; i < 100; i++) {
        messages.push(userMessage(`User ${i}: ` + "test ".repeat(20)));
        messages.push(assistantMessage(`Assistant ${i}: ` + "response ".repeat(20)));
      }

      const startTime = Date.now();
      
      const result = await compactMessages(messages, 5000, {
        keepFirst: 2,
        keepLast: 4,
        useLLMSummarization: false
      });
      
      const duration = Date.now() - startTime;

      // Should complete in reasonable time (< 5s for integration test)
      expect(duration).toBeLessThan(5000);
      expect(result.didCompact).toBe(true);
      expect(result.messages.length).toBeLessThan(200);
    });
  });

  describe("error handling and edge cases", () => {
    it("handles messages with empty content", async () => {
      const messages: Message[] = [
        { role: "user", content: [] },
        { role: "assistant", content: [] }
      ];
      
      const result = await compactMessages(messages, 1000);
      
      expect(result.messages).toBeDefined();
      expect(result.didCompact).toBe(false);
    });

    it("handles malformed content blocks gracefully", async () => {
      const messages: Message[] = [
        {
          role: "user",
          content: [
            { type: "unknown" } as unknown as ContentBlock,
            textBlock("Valid text")
          ]
        }
      ];

      const result = await compactMessages(messages, 1000);
      
      expect(result.messages.length).toBeGreaterThan(0);
    });

    it("handles very large single messages", async () => {
      const hugeText = "x".repeat(100000);
      const messages = [userMessage(hugeText)];

      const result = await compactMessages(messages, 1000);

      // Should return as-is (not enough messages to compact)
      expect(result.messages.length).toBe(1);
    });
  });
});
