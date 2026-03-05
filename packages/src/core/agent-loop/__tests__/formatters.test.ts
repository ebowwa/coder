/**
 * Formatters Tests - Cost and metrics display utilities
 */

import { describe, it, expect } from "bun:test";
import {
  formatCost,
  formatMetrics,
  formatCostBrief,
  formatCacheMetrics,
} from "../formatters.js";
import type { QueryMetrics, CacheMetrics } from "../../../types/index.js";

describe("formatCost", () => {
  it("should format small costs with 4 decimal places", () => {
    expect(formatCost(0.001)).toBe("$0.0010");
    expect(formatCost(0.0099)).toBe("$0.0099");
    expect(formatCost(0.005)).toBe("$0.0050");
  });

  it("should format larger costs with 2 decimal places", () => {
    expect(formatCost(0.01)).toBe("$0.01");
    expect(formatCost(0.5)).toBe("$0.50");
    expect(formatCost(1.0)).toBe("$1.00");
    expect(formatCost(10.99)).toBe("$10.99");
    expect(formatCost(100.0)).toBe("$100.00");
  });

  it("should handle zero cost", () => {
    expect(formatCost(0)).toBe("$0.0000");
  });

  it("should handle very large costs", () => {
    expect(formatCost(1000.0)).toBe("$1000.00");
    expect(formatCost(9999.99)).toBe("$9999.99");
  });
});

describe("formatMetrics", () => {
  it("should format basic metrics without cache", () => {
    const metrics: QueryMetrics = {
      model: "claude-sonnet-4-6",
      messageCount: 5,
      messageTokens: 1500,
      usage: { input_tokens: 1000, output_tokens: 500 },
      durationMs: 2000,
      ttftMs: 150,
      costUSD: 0.05,
      stopReason: "end_turn",
      requestId: "req-123",
    };

    const result = formatMetrics(metrics);

    expect(result).toContain("Cost: $0.05");
    expect(result).toContain("1,000 input");
    expect(result).toContain("500 output");
    expect(result).not.toContain("Cache:");
  });

  it("should format metrics with cache information", () => {
    const metrics: QueryMetrics = {
      model: "claude-sonnet-4-6",
      messageCount: 5,
      messageTokens: 1500,
      usage: {
        input_tokens: 1000,
        output_tokens: 500,
        cache_read_input_tokens: 800,
        cache_creation_input_tokens: 200,
      },
      durationMs: 2000,
      ttftMs: 150,
      costUSD: 0.03,
      stopReason: "end_turn",
      requestId: "req-123",
    };

    const result = formatMetrics(metrics);

    expect(result).toContain("Cost: $0.03");
    expect(result).toContain("800 read");
    expect(result).toContain("200 write");
    expect(result).toContain("Cache:");
  });

  it("should handle small costs with 4 decimals", () => {
    const metrics: QueryMetrics = {
      model: "claude-sonnet-4-6",
      messageCount: 1,
      messageTokens: 100,
      usage: { input_tokens: 50, output_tokens: 50 },
      durationMs: 500,
      ttftMs: 100,
      costUSD: 0.005,
      stopReason: "end_turn",
      requestId: "req-1",
    };

    const result = formatMetrics(metrics);
    expect(result).toContain("$0.0050");
  });

  it("should format large token counts with locale separators", () => {
    const metrics: QueryMetrics = {
      model: "claude-sonnet-4-6",
      messageCount: 100,
      messageTokens: 500000,
      usage: { input_tokens: 400000, output_tokens: 100000 },
      durationMs: 10000,
      ttftMs: 500,
      costUSD: 5.0,
      stopReason: "end_turn",
      requestId: "req-123",
    };

    const result = formatMetrics(metrics);

    expect(result).toContain("400,000 input");
    expect(result).toContain("100,000 output");
  });
});

describe("formatCostBrief", () => {
  it("should format brief cost with total tokens", () => {
    const metrics: QueryMetrics = {
      model: "claude-sonnet-4-6",
      messageCount: 5,
      messageTokens: 1500,
      usage: { input_tokens: 1000, output_tokens: 500 },
      durationMs: 2000,
      ttftMs: 150,
      costUSD: 0.05,
      stopReason: "end_turn",
      requestId: "req-123",
    };

    const result = formatCostBrief(metrics);

    expect(result).toContain("Cost: $0.05");
    expect(result).toContain("1,500"); // Total tokens
    expect(result).not.toContain("input");
    expect(result).not.toContain("output");
  });

  it("should handle small costs", () => {
    const metrics: QueryMetrics = {
      model: "claude-sonnet-4-6",
      messageCount: 1,
      messageTokens: 100,
      usage: { input_tokens: 50, output_tokens: 50 },
      durationMs: 500,
      ttftMs: 100,
      costUSD: 0.001,
      stopReason: "end_turn",
      requestId: "req-1",
    };

    const result = formatCostBrief(metrics);
    expect(result).toContain("$0.0010");
  });
});

describe("formatCacheMetrics", () => {
  it("should format cache metrics with all fields", () => {
    const cacheMetrics: CacheMetrics = {
      cacheHits: 50,
      cacheMisses: 10,
      totalCacheReadTokens: 50000,
      totalCacheWriteTokens: 5000,
      cacheHitRate: 0.833,
      estimatedSavingsUSD: 0.25,
    };

    const result = formatCacheMetrics(cacheMetrics);

    expect(result).toContain("83.3% hit rate");
    expect(result).toContain("50,000 read");
    expect(result).toContain("5,000 written");
    expect(result).toContain("Saved: $0.25");
  });

  it("should handle zero cache activity", () => {
    const cacheMetrics: CacheMetrics = {
      cacheHits: 0,
      cacheMisses: 0,
      totalCacheReadTokens: 0,
      totalCacheWriteTokens: 0,
      cacheHitRate: 0,
      estimatedSavingsUSD: 0,
    };

    const result = formatCacheMetrics(cacheMetrics);

    expect(result).toContain("0.0% hit rate");
    expect(result).toContain("0 read");
    expect(result).toContain("0 written");
    expect(result).toContain("Saved: $0.0000");
  });

  it("should handle 100% hit rate", () => {
    const cacheMetrics: CacheMetrics = {
      cacheHits: 100,
      cacheMisses: 0,
      totalCacheReadTokens: 100000,
      totalCacheWriteTokens: 0,
      cacheHitRate: 1.0,
      estimatedSavingsUSD: 1.50,
    };

    const result = formatCacheMetrics(cacheMetrics);

    expect(result).toContain("100.0% hit rate");
    expect(result).toContain("100,000 read");
    expect(result).toContain("Saved: $1.50");
  });

  it("should format large numbers with separators", () => {
    const cacheMetrics: CacheMetrics = {
      cacheHits: 1000,
      cacheMisses: 100,
      totalCacheReadTokens: 1000000,
      totalCacheWriteTokens: 100000,
      cacheHitRate: 0.909,
      estimatedSavingsUSD: 10.0,
    };

    const result = formatCacheMetrics(cacheMetrics);

    expect(result).toContain("1,000,000 read");
    expect(result).toContain("100,000 written");
    expect(result).toContain("90.9% hit rate");
  });
});
