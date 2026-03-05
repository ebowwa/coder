/**
 * Agent Loop Index Tests - Main entry point and exports
 */

import { describe, it, expect } from "bun:test";
import {
  agentLoop,
  formatCost,
  formatMetrics,
  formatCostBrief,
  formatCacheMetrics,
  LoopState,
  executeTools,
  buildAPIMessages,
  injectReminderIntoContent,
  handleProactiveCompaction,
  handleReactiveCompaction,
  needsCompaction,
  estimateMessagesTokens,
  DEFAULT_PROACTIVE_OPTIONS,
  DEFAULT_REACTIVE_OPTIONS,
} from "../index.js";
import type { AgentLoopOptions, AgentLoopResult } from "../index.js";

describe("exports", () => {
  it("should export agentLoop function", () => {
    expect(typeof agentLoop).toBe("function");
  });

  it("should export formatter functions", () => {
    expect(typeof formatCost).toBe("function");
    expect(typeof formatMetrics).toBe("function");
    expect(typeof formatCostBrief).toBe("function");
    expect(typeof formatCacheMetrics).toBe("function");
  });

  it("should export LoopState class", () => {
    expect(LoopState).toBeDefined();
    expect(typeof LoopState).toBe("function");
  });

  it("should export executeTools function", () => {
    expect(typeof executeTools).toBe("function");
  });

  it("should export message builder functions", () => {
    expect(typeof buildAPIMessages).toBe("function");
    expect(typeof injectReminderIntoContent).toBe("function");
  });

  it("should export compaction functions and constants", () => {
    expect(typeof handleProactiveCompaction).toBe("function");
    expect(typeof handleReactiveCompaction).toBe("function");
    expect(typeof needsCompaction).toBe("function");
    expect(typeof estimateMessagesTokens).toBe("function");
    expect(DEFAULT_PROACTIVE_OPTIONS).toBeDefined();
    expect(DEFAULT_REACTIVE_OPTIONS).toBeDefined();
  });
});

describe("AgentLoopOptions type", () => {
  it("should have required apiKey field", () => {
    const options: AgentLoopOptions = {
      apiKey: "test-key",
      systemPrompt: "Test prompt",
      tools: [],
      permissionMode: "bypassPermissions",
      workingDirectory: "/test",
    };

    expect(options.apiKey).toBe("test-key");
  });

  it("should have optional fields with defaults", () => {
    const options: AgentLoopOptions = {
      apiKey: "test-key",
      systemPrompt: "Test prompt",
      tools: [],
      permissionMode: "default",
      workingDirectory: "/test",
    };

    // Optional fields should be accessible
    expect(options.model).toBeUndefined();
    expect(options.maxTokens).toBeUndefined();
    expect(options.hookManager).toBeUndefined();
  });
});

describe("AgentLoopResult type", () => {
  it("should contain all expected fields", () => {
    // Create a result via LoopState to verify type compatibility
    const state = new LoopState([]);
    const result: AgentLoopResult = state.toResult();

    expect(result.messages).toBeDefined();
    expect(result.metrics).toBeDefined();
    expect(typeof result.totalCost).toBe("number");
    expect(typeof result.totalDuration).toBe("number");
    expect(result.totalCacheMetrics).toBeDefined();
    expect(typeof result.compactionCount).toBe("number");
    expect(typeof result.totalTokensCompacted).toBe("number");
  });
});

describe("agentLoop function signature", () => {
  it("should accept AgentLoopOptions and return Promise<AgentLoopResult>", () => {
    // Type check only - don't actually run it
    const checkSignature = async (): Promise<void> => {
      const options: AgentLoopOptions = {
        apiKey: "test",
        systemPrompt: "test",
        tools: [],
        permissionMode: "bypassPermissions",
        workingDirectory: "/test",
      };

      // This would actually call the API, so we just verify the type
      const _typeCheck: () => Promise<AgentLoopResult> = () => agentLoop([], options);

      // Verify the function exists and has correct signature
      expect(typeof agentLoop).toBe("function");
    };

    // Just verify no type errors
    expect(checkSignature).toBeDefined();
  });
});

describe("re-exports from submodules", () => {
  it("should re-export LoopState correctly", () => {
    const state = new LoopState([
      { role: "user", content: [{ type: "text", text: "test" }] },
    ]);

    expect(state.messages).toHaveLength(1);
    expect(state.turnNumber).toBe(0);
  });

  it("should re-export formatters with correct behavior", () => {
    expect(formatCost(0.005)).toBe("$0.0050");
    expect(formatCost(1.5)).toBe("$1.50");
  });

  it("should re-export message builder functions", () => {
    const messages = [
      { role: "user" as const, content: [{ type: "text" as const, text: "Hello" }] },
    ];

    const result = buildAPIMessages(messages, "System", "Reminder");

    expect(result).toHaveLength(1);
    expect((result[0]?.content[0] as any).text).toContain("Reminder");
  });

  it("should re-export compaction constants", () => {
    expect(DEFAULT_PROACTIVE_OPTIONS.keepFirst).toBe(0);
    expect(DEFAULT_PROACTIVE_OPTIONS.keepLast).toBe(3);
    expect(DEFAULT_REACTIVE_OPTIONS.keepFirst).toBe(0);
    expect(DEFAULT_REACTIVE_OPTIONS.keepLast).toBe(3);
  });
});
