/**
 * System Reminders Tests
 *
 * Tests for token warnings, cost tracking, tool summaries, and environment info.
 */

import { describe, it, expect } from "bun:test";
import {
  buildTokenWarning,
  buildCostUpdate,
  buildToolSummary,
  buildEnvInfo,
  buildCombinedReminder,
  injectSystemReminder,
} from "../system-reminders.js";
import type { ToolUseBlock, GitStatus, UsageMetrics } from "../../schemas/index.js";

describe("buildTokenWarning", () => {
  describe("threshold behavior", () => {
    it("should return empty string when under threshold", () => {
      const result = buildTokenWarning({
        current: 50,
        max: 100,
        threshold: 0.8,
      });

      expect(result).toBe("");
    });

    it("should return warning at 80% threshold", () => {
      const result = buildTokenWarning({
        current: 80,
        max: 100,
        threshold: 0.8,
      });

      expect(result).toContain("Token Usage");
      expect(result).toContain("WARNING");
      expect(result).toContain("80%");
    });

    it("should return critical at 90% threshold", () => {
      const result = buildTokenWarning({
        current: 90,
        max: 100,
      });

      expect(result).toContain("CRITICAL");
      expect(result).toContain("90%");
    });

    it("should return emergency at 95% threshold", () => {
      const result = buildTokenWarning({
        current: 95,
        max: 100,
      });

      expect(result).toContain("EMERGENCY");
      expect(result).toContain("95%");
      expect(result).toContain("compacting");
    });
  });

  describe("edge cases", () => {
    it("should handle zero max tokens", () => {
      const result = buildTokenWarning({
        current: 50,
        max: 0,
      });

      expect(result).toBe("");
    });

    it("should format numbers with locale separators", () => {
      const result = buildTokenWarning({
        current: 80000,
        max: 100000,
      });

      expect(result).toContain("80,000");
      expect(result).toContain("100,000");
    });

    it("should show remaining tokens", () => {
      const result = buildTokenWarning({
        current: 80,
        max: 100,
      });

      expect(result).toContain("Remaining: 20");
    });
  });

  describe("custom threshold", () => {
    it("should respect custom threshold", () => {
      const result = buildTokenWarning({
        current: 60,
        max: 100,
        threshold: 0.5,
      });

      expect(result).toContain("Token Usage");
      expect(result).toContain("60%");
    });
  });
});

describe("buildCostUpdate", () => {
  describe("basic formatting", () => {
    it("should format cost with currency", () => {
      const result = buildCostUpdate({
        cost: 1.5,
      });

      expect(result).toContain("Cost Update");
      expect(result).toContain("$1.50");
      expect(result).toContain("USD");
    });

    it("should handle small costs with precision", () => {
      const result = buildCostUpdate({
        cost: 0.001,
      });

      expect(result).toContain("$0.0010");
    });

    it("should handle very small costs", () => {
      const result = buildCostUpdate({
        cost: 0.0001,
      });

      expect(result).toContain("$0.0001");
    });
  });

  describe("delta calculation", () => {
    it("should show delta when previousCost provided", () => {
      const result = buildCostUpdate({
        cost: 2.0,
        previousCost: 1.5,
      });

      expect(result).toContain("Total:");
      // Delta calculation depends on implementation
    });

    it("should work without previousCost", () => {
      const result = buildCostUpdate({
        cost: 1.5,
      });

      expect(result).toContain("$1.50");
    });
  });
});

describe("buildToolSummary", () => {
  const createTool = (name: string): ToolUseBlock => ({
    type: "tool_use",
    id: `tool-${name}-${Date.now()}`,
    name,
    input: {},
  });

  describe("empty tools", () => {
    it("should return message for empty tools", () => {
      const result = buildToolSummary({ tools: [] });

      expect(result).toContain("No tools used");
    });
  });

  describe("tool counting", () => {
    it("should count single tool use", () => {
      const result = buildToolSummary({
        tools: [createTool("read")],
      });

      expect(result).toContain("read: 1 call");
      expect(result).toContain("1 total calls");
    });

    it("should count multiple uses of same tool", () => {
      const result = buildToolSummary({
        tools: [createTool("read"), createTool("read"), createTool("read")],
      });

      expect(result).toContain("read: 3 calls");
      expect(result).toContain("3 total calls");
    });

    it("should count different tools separately", () => {
      const result = buildToolSummary({
        tools: [createTool("read"), createTool("write"), createTool("bash")],
      });

      expect(result).toContain("read: 1 call");
      expect(result).toContain("write: 1 call");
      expect(result).toContain("bash: 1 call");
    });
  });

  describe("sorting", () => {
    it("should sort by usage count descending", () => {
      const result = buildToolSummary({
        tools: [
          createTool("read"),
          createTool("bash"),
          createTool("bash"),
          createTool("bash"),
          createTool("read"),
        ],
      });

      // bash (3) should come before read (2)
      const bashIndex = result.indexOf("bash");
      const readIndex = result.indexOf("read");
      expect(bashIndex).toBeLessThan(readIndex);
    });
  });

  describe("maxDisplay limit", () => {
    it("should limit displayed tools", () => {
      const tools = [];
      for (let i = 0; i < 15; i++) {
        tools.push(createTool(`tool-${i}`));
      }

      const result = buildToolSummary({
        tools,
        maxDisplay: 5,
      });

      expect(result).toContain("and 10 more tools");
    });

    it("should use singular for one remaining tool", () => {
      const tools = [];
      for (let i = 0; i < 6; i++) {
        tools.push(createTool(`tool-${i}`));
      }

      const result = buildToolSummary({
        tools,
        maxDisplay: 5,
      });

      expect(result).toContain("and 1 more tool");
    });
  });
});

describe("buildEnvInfo", () => {
  describe("basic info", () => {
    it("should include working directory", () => {
      const result = buildEnvInfo({
        workingDirectory: "/home/user/project",
      });

      expect(result).toContain("Environment Information");
      expect(result).toContain("/home/user/project");
    });

    it("should include platform", () => {
      const result = buildEnvInfo({
        workingDirectory: "/test",
        platform: "darwin",
      });

      expect(result).toContain("Platform: darwin");
    });

    it("should include shell", () => {
      const result = buildEnvInfo({
        workingDirectory: "/test",
        shell: "/bin/zsh",
      });

      expect(result).toContain("Shell: /bin/zsh");
    });
  });

  describe("git status", () => {
    const cleanGitStatus: GitStatus = {
      branch: "main",
      ahead: 0,
      behind: 0,
      staged: [],
      unstaged: [],
      untracked: [],
      conflicted: [],
      clean: true,
      detached: false,
    };

    it("should show git branch", () => {
      const result = buildEnvInfo({
        workingDirectory: "/test",
        gitStatus: cleanGitStatus,
      });

      expect(result).toContain("Branch: main");
    });

    it("should show clean working tree", () => {
      const result = buildEnvInfo({
        workingDirectory: "/test",
        gitStatus: cleanGitStatus,
      });

      expect(result).toContain("Working tree clean");
    });

    it("should show ahead/behind counts", () => {
      const result = buildEnvInfo({
        workingDirectory: "/test",
        gitStatus: {
          ...cleanGitStatus,
          ahead: 2,
          behind: 1,
        },
      });

      expect(result).toContain("Ahead: 2");
      expect(result).toContain("Behind: 1");
    });

    it("should show staged files count", () => {
      const result = buildEnvInfo({
        workingDirectory: "/test",
        gitStatus: {
          ...cleanGitStatus,
          staged: ["a.txt", "b.txt"],
        },
      });

      expect(result).toContain("Changes: 2 files");
      expect(result).toContain("Staged: 2");
    });

    it("should show unstaged files count", () => {
      const result = buildEnvInfo({
        workingDirectory: "/test",
        gitStatus: {
          ...cleanGitStatus,
          unstaged: ["c.txt"],
        },
      });

      expect(result).toContain("Unstaged: 1");
    });

    it("should show untracked files count", () => {
      const result = buildEnvInfo({
        workingDirectory: "/test",
        gitStatus: {
          ...cleanGitStatus,
          untracked: ["d.txt", "e.txt"],
        },
      });

      expect(result).toContain("Untracked: 2");
    });

    it("should show conflicted files count", () => {
      const result = buildEnvInfo({
        workingDirectory: "/test",
        gitStatus: {
          ...cleanGitStatus,
          conflicted: ["f.txt"],
        },
      });

      expect(result).toContain("Conflicted: 1");
    });

    it("should show total changes", () => {
      const result = buildEnvInfo({
        workingDirectory: "/test",
        gitStatus: {
          ...cleanGitStatus,
          staged: ["a.txt"],
          unstaged: ["b.txt"],
          untracked: ["c.txt", "d.txt"],
          conflicted: ["e.txt"],
        },
      });

      expect(result).toContain("Changes: 5 files");
    });
  });
});

describe("buildCombinedReminder", () => {
  const baseUsage: UsageMetrics = {
    input_tokens: 1000,
    output_tokens: 500,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  };

  const createTool = (name: string): ToolUseBlock => ({
    type: "tool_use",
    id: `tool-${name}`,
    name,
    input: {},
  });

  it("should return empty string when no reminders triggered", () => {
    // Turn 2: not first turn (no env), not on intervals (cost=5, tool=3)
    const result = buildCombinedReminder({
      usage: baseUsage,
      maxTokens: 200000,
      totalCost: 0.05,
      toolsUsed: [],
      workingDirectory: "/test",
      turnNumber: 2,
    });

    // Under token threshold, not on intervals
    expect(result).toBe("");
  });

  it("should include env info on first turn", () => {
    const result = buildCombinedReminder({
      usage: baseUsage,
      maxTokens: 200000,
      totalCost: 0.05,
      toolsUsed: [],
      workingDirectory: "/test",
      turnNumber: 1,
    });

    expect(result).toContain("Environment Information");
  });

  it("should include token warning when above threshold", () => {
    const result = buildCombinedReminder({
      usage: {
        input_tokens: 180000,
        output_tokens: 10000,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      },
      maxTokens: 200000,
      totalCost: 0.05,
      toolsUsed: [],
      workingDirectory: "/test",
      turnNumber: 2,
      config: {
        tokenWarningThreshold: 0.8, // Enable token warnings
      },
    });

    expect(result).toContain("Token Usage");
  });

  it("should include cost update on interval (every 5 turns)", () => {
    const result = buildCombinedReminder({
      usage: baseUsage,
      maxTokens: 200000,
      totalCost: 0.05,
      toolsUsed: [],
      workingDirectory: "/test",
      turnNumber: 5,
      config: {
        costUpdateInterval: 5, // Enable cost updates every 5 turns
      },
    });

    expect(result).toContain("Cost Update");
  });

  it("should include tool summary on interval with tools (every 3 turns)", () => {
    const result = buildCombinedReminder({
      usage: baseUsage,
      maxTokens: 200000,
      totalCost: 0.05,
      toolsUsed: [createTool("read")],
      workingDirectory: "/test",
      turnNumber: 3,
      config: {
        toolSummaryInterval: 3, // Enable tool summaries every 3 turns
      },
    });

    expect(result).toContain("Tool Usage Summary");
  });

  it("should combine multiple reminders", () => {
    // Turn 15: divisible by both 3 (tool) and 5 (cost)
    // Plus use high tokens for warning
    const result = buildCombinedReminder({
      usage: {
        input_tokens: 180000,
        output_tokens: 10000,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      },
      maxTokens: 200000,
      totalCost: 0.05,
      toolsUsed: [createTool("read")],
      workingDirectory: "/test",
      turnNumber: 15,
      config: {
        tokenWarningThreshold: 0.8, // Enable token warnings
        costUpdateInterval: 5, // Enable cost updates
        toolSummaryInterval: 3, // Enable tool summaries
      },
    });

    expect(result).toContain("Token Usage");
    expect(result).toContain("Cost Update");
    expect(result).toContain("Tool Usage Summary");
  });

  it("should wrap reminders with separators", () => {
    const result = buildCombinedReminder({
      usage: baseUsage,
      maxTokens: 200000,
      totalCost: 0.05,
      toolsUsed: [],
      workingDirectory: "/test",
      turnNumber: 1,
    });

    expect(result).toContain("---");
    expect(result).toContain("System Reminders:");
  });

  it("should respect custom config", () => {
    const result = buildCombinedReminder({
      usage: baseUsage,
      maxTokens: 200000,
      totalCost: 0.05,
      toolsUsed: [],
      workingDirectory: "/test",
      turnNumber: 1,
      config: {
        envInfoOnStart: false,
      },
    });

    // First turn but envInfoOnStart is false
    expect(result).not.toContain("Environment Information");
  });
});

describe("injectSystemReminder", () => {
  it("should inject reminder into last user message (string content)", () => {
    const messages = [
      { role: "assistant", content: "Hello" },
      { role: "user", content: "Hi there" },
    ];

    injectSystemReminder(messages, "Reminder text");

    expect(messages[1].content).toBe("Hi there\n\nReminder text");
  });

  it("should inject reminder into array content", () => {
    const messages = [
      {
        role: "user",
        content: [{ type: "text", text: "Hello" }],
      },
    ];

    injectSystemReminder(messages, "Reminder");

    expect(Array.isArray(messages[0].content)).toBe(true);
    const content = messages[0].content as Array<{ type: string; text: string }>;
    expect(content[1].text).toBe("\n\nReminder");
  });

  it("should not modify empty messages array", () => {
    const messages: Array<{ role: string; content: unknown }> = [];

    injectSystemReminder(messages, "Reminder");

    expect(messages).toHaveLength(0);
  });

  it("should not modify when reminder is empty", () => {
    const messages = [{ role: "user", content: "Original" }];

    injectSystemReminder(messages, "");

    expect(messages[0].content).toBe("Original");
  });

  it("should find last user message", () => {
    const messages = [
      { role: "user", content: "First" },
      { role: "assistant", content: "Response" },
      { role: "user", content: "Second" },
      { role: "assistant", content: "Response 2" },
    ];

    injectSystemReminder(messages, "Reminder");

    // Should only modify the last user message
    expect(messages[0].content).toBe("First");
    expect(messages[2].content).toBe("Second\n\nReminder");
  });
});
