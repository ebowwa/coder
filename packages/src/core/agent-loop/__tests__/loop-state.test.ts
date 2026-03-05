/**
 * LoopState Tests - State management for the agent loop
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { LoopState, createInitialCacheMetrics } from "../loop-state.js";
import type { Message, ToolUseBlock, CacheMetrics } from "../../../types/index.js";

describe("createInitialCacheMetrics", () => {
  it("should create initial cache metrics with zeros", () => {
    const metrics = createInitialCacheMetrics();

    expect(metrics.cacheHits).toBe(0);
    expect(metrics.cacheMisses).toBe(0);
    expect(metrics.totalCacheReadTokens).toBe(0);
    expect(metrics.totalCacheWriteTokens).toBe(0);
    expect(metrics.cacheHitRate).toBe(0);
    expect(metrics.estimatedSavingsUSD).toBe(0);
  });
});

describe("LoopState", () => {
  let state: LoopState;
  let initialMessages: Message[];

  beforeEach(() => {
    initialMessages = [
      { role: "user", content: [{ type: "text", text: "Hello" }] },
    ];
    state = new LoopState(initialMessages);
  });

  describe("constructor", () => {
    it("should initialize with provided messages", () => {
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0]?.role).toBe("user");
    });

    it("should create a copy of initial messages", () => {
      // Modify original array
      initialMessages.push({ role: "user", content: [{ type: "text", text: "New" }] });

      // State should not be affected
      expect(state.messages).toHaveLength(1);
    });

    it("should initialize all counters to zero", () => {
      expect(state.metrics).toEqual([]);
      expect(state.allToolsUsed).toEqual([]);
      expect(state.totalCost).toBe(0);
      expect(state.totalDuration).toBe(0);
      expect(state.turnNumber).toBe(0);
      expect(state.previousCost).toBe(0);
      expect(state.compactionCount).toBe(0);
      expect(state.totalTokensCompacted).toBe(0);
    });

    it("should initialize cache metrics", () => {
      expect(state.cacheMetrics.cacheHits).toBe(0);
      expect(state.cacheMetrics.cacheMisses).toBe(0);
    });
  });

  describe("latestMetrics", () => {
    it("should return undefined when no metrics exist", () => {
      expect(state.latestMetrics).toBeUndefined();
    });

    it("should return the last metrics entry", () => {
      state.addTurnResult({
        message: { content: [], stop_reason: "end_turn", id: "msg1" },
        usage: { input_tokens: 100, output_tokens: 50 },
        costUSD: 0.01,
        durationMs: 1000,
        model: "claude-sonnet-4-6",
        messageCount: 1,
      });

      state.addTurnResult({
        message: { content: [], stop_reason: "end_turn", id: "msg2" },
        usage: { input_tokens: 200, output_tokens: 100 },
        costUSD: 0.02,
        durationMs: 2000,
        model: "claude-sonnet-4-6",
        messageCount: 2,
      });

      expect(state.latestMetrics?.usage.input_tokens).toBe(200);
      expect(state.latestMetrics?.requestId).toBe("msg2");
    });
  });

  describe("currentUsage", () => {
    it("should return zero usage when no metrics exist", () => {
      expect(state.currentUsage).toEqual({
        input_tokens: 0,
        output_tokens: 0,
      });
    });

    it("should return usage from latest metrics", () => {
      state.addTurnResult({
        message: { content: [], stop_reason: "end_turn", id: "msg1" },
        usage: { input_tokens: 500, output_tokens: 250 },
        costUSD: 0.05,
        durationMs: 1500,
        model: "claude-sonnet-4-6",
        messageCount: 1,
      });

      expect(state.currentUsage.input_tokens).toBe(500);
      expect(state.currentUsage.output_tokens).toBe(250);
    });
  });

  describe("addTurnResult", () => {
    it("should add metrics entry with correct values", () => {
      const result = state.addTurnResult({
        message: { content: [], stop_reason: "end_turn", id: "msg1" },
        usage: { input_tokens: 100, output_tokens: 50 },
        costUSD: 0.01,
        durationMs: 1000,
        model: "claude-sonnet-4-6",
        messageCount: 1,
      });

      expect(result.model).toBe("claude-sonnet-4-6");
      expect(result.messageCount).toBe(1);
      expect(result.messageTokens).toBe(150);
      expect(result.costUSD).toBe(0.01);
      expect(result.stopReason).toBe("end_turn");
      expect(result.requestId).toBe("msg1");
    });

    it("should accumulate total cost", () => {
      state.addTurnResult({
        message: { content: [], stop_reason: "end_turn", id: "msg1" },
        usage: { input_tokens: 100, output_tokens: 50 },
        costUSD: 0.01,
        durationMs: 1000,
        model: "claude-sonnet-4-6",
        messageCount: 1,
      });

      state.addTurnResult({
        message: { content: [], stop_reason: "end_turn", id: "msg2" },
        usage: { input_tokens: 100, output_tokens: 50 },
        costUSD: 0.02,
        durationMs: 1000,
        model: "claude-sonnet-4-6",
        messageCount: 2,
      });

      expect(state.totalCost).toBe(0.03);
      expect(state.previousCost).toBe(0.01);
    });

    it("should accumulate duration", () => {
      state.addTurnResult({
        message: { content: [], stop_reason: "end_turn", id: "msg1" },
        usage: { input_tokens: 100, output_tokens: 50 },
        costUSD: 0.01,
        durationMs: 1000,
        model: "claude-sonnet-4-6",
        messageCount: 1,
      });

      state.addTurnResult({
        message: { content: [], stop_reason: "end_turn", id: "msg2" },
        usage: { input_tokens: 100, output_tokens: 50 },
        costUSD: 0.01,
        durationMs: 500,
        model: "claude-sonnet-4-6",
        messageCount: 2,
      });

      expect(state.totalDuration).toBe(1500);
    });

    it("should aggregate cache metrics", () => {
      state.addTurnResult({
        message: { content: [], stop_reason: "end_turn", id: "msg1" },
        usage: { input_tokens: 100, output_tokens: 50 },
        cacheMetrics: {
          cacheHits: 5,
          cacheMisses: 2,
          totalCacheReadTokens: 1000,
          totalCacheWriteTokens: 500,
          cacheHitRate: 0.714,
          estimatedSavingsUSD: 0.05,
        },
        costUSD: 0.01,
        durationMs: 1000,
        model: "claude-sonnet-4-6",
        messageCount: 1,
      });

      state.addTurnResult({
        message: { content: [], stop_reason: "end_turn", id: "msg2" },
        usage: { input_tokens: 100, output_tokens: 50 },
        cacheMetrics: {
          cacheHits: 3,
          cacheMisses: 1,
          totalCacheReadTokens: 600,
          totalCacheWriteTokens: 200,
          cacheHitRate: 0.75,
          estimatedSavingsUSD: 0.03,
        },
        costUSD: 0.01,
        durationMs: 1000,
        model: "claude-sonnet-4-6",
        messageCount: 2,
      });

      expect(state.cacheMetrics.cacheHits).toBe(8);
      expect(state.cacheMetrics.cacheMisses).toBe(3);
      expect(state.cacheMetrics.totalCacheReadTokens).toBe(1600);
      expect(state.cacheMetrics.totalCacheWriteTokens).toBe(700);
      expect(state.cacheMetrics.estimatedSavingsUSD).toBe(0.08);
      // Hit rate should be recalculated: 8/(8+3) = 0.727...
      expect(state.cacheMetrics.cacheHitRate).toBeCloseTo(0.727, 2);
    });

    it("should handle missing cache metrics", () => {
      state.addTurnResult({
        message: { content: [], stop_reason: "end_turn", id: "msg1" },
        usage: { input_tokens: 100, output_tokens: 50 },
        costUSD: 0.01,
        durationMs: 1000,
        model: "claude-sonnet-4-6",
        messageCount: 1,
      });

      // Cache metrics should remain at initial values
      expect(state.cacheMetrics.cacheHits).toBe(0);
      expect(state.cacheMetrics.cacheMisses).toBe(0);
    });
  });

  describe("addAssistantMessage", () => {
    it("should add assistant message to history", () => {
      state.addAssistantMessage([{ type: "text", text: "Hello!" }]);

      expect(state.messages).toHaveLength(2);
      expect(state.messages[1]?.role).toBe("assistant");
    });

    it("should preserve message order", () => {
      state.addAssistantMessage([{ type: "text", text: "First" }]);
      state.addAssistantMessage([{ type: "text", text: "Second" }]);

      expect(state.messages).toHaveLength(3);
      expect(state.messages[1]?.content[0]).toEqual({ type: "text", text: "First" });
      expect(state.messages[2]?.content[0]).toEqual({ type: "text", text: "Second" });
    });
  });

  describe("addUserMessage", () => {
    it("should add user message with tool results", () => {
      state.addUserMessage([{
        type: "tool_result",
        tool_use_id: "tool1",
        content: "result",
      }]);

      expect(state.messages).toHaveLength(2);
      expect(state.messages[1]?.role).toBe("user");
    });
  });

  describe("trackToolUse", () => {
    it("should track tool use blocks", () => {
      const toolBlocks: ToolUseBlock[] = [
        { type: "tool_use", id: "tool1", name: "Read", input: { file_path: "/test" } },
        { type: "tool_use", id: "tool2", name: "Write", input: { file_path: "/test2" } },
      ];

      state.trackToolUse(toolBlocks);

      expect(state.allToolsUsed).toHaveLength(2);
      expect(state.allToolsUsed[0]?.name).toBe("Read");
      expect(state.allToolsUsed[1]?.name).toBe("Write");
    });

    it("should accumulate tool uses across multiple calls", () => {
      state.trackToolUse([{ type: "tool_use", id: "tool1", name: "Read", input: {} }]);
      state.trackToolUse([{ type: "tool_use", id: "tool2", name: "Write", input: {} }]);

      expect(state.allToolsUsed).toHaveLength(2);
    });
  });

  describe("applyCompaction", () => {
    it("should not apply compaction when didCompact is false", () => {
      const result = state.applyCompaction(
        {
          messages: state.messages,
          messagesRemoved: 0,
          tokensBefore: 100,
          tokensAfter: 100,
          didCompact: false,
        },
        () => ({ reductionPercent: 0, tokensSaved: 0 })
      );

      expect(result).toBe(false);
      expect(state.compactionCount).toBe(0);
    });

    it("should not apply compaction when tokensAfter >= tokensBefore", () => {
      const result = state.applyCompaction(
        {
          messages: state.messages,
          messagesRemoved: 0,
          tokensBefore: 100,
          tokensAfter: 150, // Worse than before
          didCompact: true,
        },
        () => ({ reductionPercent: 0, tokensSaved: 0 })
      );

      expect(result).toBe(false);
      expect(state.compactionCount).toBe(0);
    });

    it("should apply compaction and update state", () => {
      const newMessages: Message[] = [
        { role: "user", content: [{ type: "text", text: "Compacted" }] },
      ];

      const result = state.applyCompaction(
        {
          messages: newMessages,
          messagesRemoved: 1,
          tokensBefore: 1000,
          tokensAfter: 500,
          didCompact: true,
        },
        () => ({ reductionPercent: 50, tokensSaved: 500 })
      );

      expect(result).toBe(true);
      expect(state.compactionCount).toBe(1);
      expect(state.totalTokensCompacted).toBe(500);
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0]?.content[0]).toEqual({ type: "text", text: "Compacted" });
    });

    it("should accumulate compaction counts", () => {
      state.applyCompaction(
        {
          messages: state.messages,
          messagesRemoved: 1,
          tokensBefore: 1000,
          tokensAfter: 500,
          didCompact: true,
        },
        () => ({ reductionPercent: 50, tokensSaved: 500 })
      );

      state.applyCompaction(
        {
          messages: state.messages,
          messagesRemoved: 1,
          tokensBefore: 500,
          tokensAfter: 250,
          didCompact: true,
        },
        () => ({ reductionPercent: 50, tokensSaved: 250 })
      );

      expect(state.compactionCount).toBe(2);
      expect(state.totalTokensCompacted).toBe(750);
    });
  });

  describe("incrementTurn", () => {
    it("should increment turn counter and return new value", () => {
      expect(state.turnNumber).toBe(0);

      const turn1 = state.incrementTurn();
      expect(turn1).toBe(1);
      expect(state.turnNumber).toBe(1);

      const turn2 = state.incrementTurn();
      expect(turn2).toBe(2);
      expect(state.turnNumber).toBe(2);
    });
  });

  describe("toResult", () => {
    it("should convert state to AgentLoopResult", () => {
      state.addTurnResult({
        message: { content: [], stop_reason: "end_turn", id: "msg1" },
        usage: { input_tokens: 100, output_tokens: 50 },
        costUSD: 0.01,
        durationMs: 1000,
        model: "claude-sonnet-4-6",
        messageCount: 1,
      });

      const result = state.toResult();

      expect(result.messages).toHaveLength(1);
      expect(result.metrics).toHaveLength(1);
      expect(result.totalCost).toBe(0.01);
      expect(result.totalDuration).toBe(1000);
      expect(result.compactionCount).toBe(0);
      expect(result.totalTokensCompacted).toBe(0);
      expect(result.totalCacheMetrics).toBeDefined();
    });
  });
});
