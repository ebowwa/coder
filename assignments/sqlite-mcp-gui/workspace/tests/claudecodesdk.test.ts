/**
 * Claude Agent SDK Client Tests
 *
 * Tests for the Claude Agent SDK client wrapper.
 *
 * These tests require:
 * - Claude Code CLI to be installed
 * - ANTHROPIC_API_KEY environment variable
 * - Run with: doppler run --project seed --config prd bun test client.test.ts
 */

import { describe, test, expect, beforeAll } from "bun:test";
import { promises as fs } from "fs";
import path from "path";
import { query } from "@anthropic-ai/claude-agent-sdk";
import {
  ClaudeAgentClient,
  createCodeAnalyzer,
  createRefactoringAgent,
  createDocumentationAgent,
  type SDKMessage,
} from "../src/lib/claudecodesdk/client.js";

// Test directory
const TEST_DIR = path.join(process.cwd(), "test-temp");

describe("ClaudeAgentClient", () => {
  let testDirExists = false;

  beforeAll(async () => {
    // Create test directory
    try {
      await fs.mkdir(TEST_DIR, { recursive: true });
      testDirExists = true;

      // Create a test file with bugs
      await fs.writeFile(
        path.join(TEST_DIR, "utils.ts"),
        `export function calculateAverage(numbers: number[]): number {
  let total = 0;
  for (const num of numbers) {
    total += num;
  }
  return total / numbers.length;  // Bug: division by zero
}

export function getUserName(user: any): string {
  return user["name"].toUpperCase();  // Bug: crashes when user is null
}
`
      );
    } catch (error) {
      console.warn("Could not create test directory:", error);
    }
  });

  describe("constructor", () => {
    test("should create client with default config", () => {
      const client = new ClaudeAgentClient();
      expect(client).toBeInstanceOf(ClaudeAgentClient);
    });

    test("should create client with custom config", () => {
      const client = new ClaudeAgentClient({
        cwd: "/tmp",
        permissionMode: "bypassPermissions",
        maxBudgetUsd: 1.0,
      });
      expect(client).toBeInstanceOf(ClaudeAgentClient);
    });
  });

  describe("withConfig", () => {
    test("should create new client with merged config", () => {
      const client1 = new ClaudeAgentClient({
        cwd: "/tmp",
        maxBudgetUsd: 1.0,
      });

      const client2 = client1.withConfig({
        maxBudgetUsd: 2.0,
      });

      expect(client1).toBeInstanceOf(ClaudeAgentClient);
      expect(client2).toBeInstanceOf(ClaudeAgentClient);
      expect(client1).not.toBe(client2);
    });
  });

  describe("extractTextFromMessage", () => {
    test("should extract text from assistant message", () => {
      const client = new ClaudeAgentClient();

      const mockMessage = {
        type: "assistant",
        uuid: "test-uuid",
        session_id: "test-session",
        message: {
          content: [
            { type: "text", text: "Hello, world!" },
            { type: "text", text: "How are you?" },
          ],
          role: "assistant",
          id: "msg-id",
        },
        parent_tool_use_id: null,
      } as SDKMessage;

      const texts = client.extractTextFromMessage(mockMessage as any);
      expect(texts).toEqual(["Hello, world!", "How are you?"]);
    });

    test("should return empty array for message with no text", () => {
      const client = new ClaudeAgentClient();

      const mockMessage = {
        type: "assistant",
        uuid: "test-uuid",
        session_id: "test-session",
        message: {
          content: [],
          role: "assistant",
          id: "msg-id",
        },
        parent_tool_use_id: null,
      } as SDKMessage;

      const texts = client.extractTextFromMessage(mockMessage as any);
      expect(texts).toEqual([]);
    });
  });

  describe("extractToolUsesFromMessage", () => {
    test("should extract tool uses from assistant message", () => {
      const client = new ClaudeAgentClient();

      const mockMessage = {
        type: "assistant",
        uuid: "test-uuid",
        session_id: "test-session",
        message: {
          content: [
            {
              type: "tool_use",
              id: "tool-1",
              name: "Read",
              input: { file_path: "/test/file.txt" },
            },
            {
              type: "tool_use",
              id: "tool-2",
              name: "Bash",
              input: { command: "ls -la" },
            },
          ],
          role: "assistant",
          id: "msg-id",
        },
        parent_tool_use_id: null,
      } as SDKMessage;

      const tools = client.extractToolUsesFromMessage(mockMessage as any);
      expect(tools).toHaveLength(2);
      expect(tools[0]).toEqual({
        name: "Read",
        input: { file_path: "/test/file.txt" },
      });
      expect(tools[1]).toEqual({
        name: "Bash",
        input: { command: "ls -la" },
      });
    });
  });
});

describe("Agent Factories", () => {
  test("createCodeAnalyzer should create analyzer client", () => {
    const analyzer = createCodeAnalyzer("/tmp");
    expect(analyzer).toBeInstanceOf(ClaudeAgentClient);
  });

  test("createRefactoringAgent should create refactoring client", () => {
    const refactoring = createRefactoringAgent("/tmp");
    expect(refactoring).toBeInstanceOf(ClaudeAgentClient);
  });

  test("createDocumentationAgent should create documentation client", () => {
    const docs = createDocumentationAgent("/tmp");
    expect(docs).toBeInstanceOf(ClaudeAgentClient);
  });
});

describe("Integration Tests (requires API key)", () => {
  test("should run simple query", async () => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn("Skipping integration test: ANTHROPIC_API_KEY not set");
      return;
    }

    const messages: SDKMessage[] = [];
    const client = new ClaudeAgentClient({
      permissionMode: "acceptEdits",
    });

    const result = await client.run("Say 'Hello, integration test!'", (msg) => {
      messages.push(msg);
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.sessionId).toBeTruthy();
    expect(messages.length).toBeGreaterThan(0);
  }, 30000);

  test("should analyze code and fix bugs", async () => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || !testDirExists) {
      console.warn("Skipping integration test: prerequisites not met");
      return;
    }

    const messages: SDKMessage[] = [];
    const client = new ClaudeAgentClient({
      cwd: TEST_DIR,
      permissionMode: "acceptEdits",
      allowedTools: ["Read", "Edit", "Glob"],
      maxTurns: 20,
    });

    const result = await client.run(
      "Review utils.ts for bugs that would cause crashes. Fix any issues you find.",
      (msg) => {
        messages.push(msg);
      }
    );

    expect(result).toBeDefined();
    expect(result.sessionId).toBeTruthy();

    // Check that tools were used
    const toolUses = messages.flatMap((msg) => {
      if (msg.type === "assistant") {
        const client = new ClaudeAgentClient();
        return client.extractToolUsesFromMessage(msg as any);
      }
      return [];
    });

    const toolNames = toolUses.map((t) => t.name);
    expect(toolNames).toContain("Read");
  }, 60000);

  test("should stream messages", async () => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn("Skipping integration test: ANTHROPIC_API_KEY not set");
      return;
    }

    const client = new ClaudeAgentClient({
      permissionMode: "acceptEdits",
    });

    const messages: SDKMessage[] = [];
    const stream = client.stream("Count to 5");

    for await (const msg of stream) {
      messages.push(msg);
    }

    expect(messages.length).toBeGreaterThan(0);
    expect(messages.some((m) => m.type === "result")).toBe(true);
  }, 30000);
});

describe("Direct SDK Tests", () => {
  test("should have query function available", () => {
    expect(query).toBeDefined();
    expect(typeof query).toBe("function");
  });

  test("query should return async generator", async () => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn("Skipping test: ANTHROPIC_API_KEY not set");
      return;
    }

    const agent = query({
      prompt: "Say 'test'",
      options: {
        permissionMode: "acceptEdits",
      },
    });

    expect(agent).toHaveProperty("next");
    expect(typeof agent.next).toBe("function");

    // Consume one message
    const first = await agent.next();
    expect(first).toHaveProperty("done");

    // Interrupt the agent
    await agent.return?.();
  }, 30000);
});
