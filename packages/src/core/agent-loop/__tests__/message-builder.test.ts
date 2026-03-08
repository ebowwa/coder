/**
 * Message Builder Tests - API message construction with reminder injection
 */

import { describe, it, expect } from "bun:test";
import { buildAPIMessages, injectReminderIntoContent } from "../message-builder.js";
import type { Message, ContentBlock } from "../../../types/index.js";

describe("injectReminderIntoContent", () => {
  it("should append reminder to existing text block", () => {
    const content: ContentBlock[] = [
      { type: "text", text: "Original text" },
    ];

    const result = injectReminderIntoContent(content, "System reminder");

    expect(result).toHaveLength(1);
    expect(result[0]?.type).toBe("text");
    expect((result[0] as any).text).toBe("Original text\n\nSystem reminder");
  });

  it("should not mutate original content array", () => {
    const content: ContentBlock[] = [
      { type: "text", text: "Original text" },
    ];

    injectReminderIntoContent(content, "System reminder");

    expect((content[0] as any).text).toBe("Original text");
  });

  it("should add new text block if last block is not text", () => {
    const content: ContentBlock[] = [
      { type: "image", source: { type: "base64", data: "abc", media_type: "image/png" } },
    ];

    const result = injectReminderIntoContent(content, "System reminder");

    expect(result).toHaveLength(2);
    expect(result[0]?.type).toBe("image");
    expect(result[1]?.type).toBe("text");
    expect((result[1] as any).text).toBe("\n\nSystem reminder");
  });

  it("should add new text block if content is empty", () => {
    const content: ContentBlock[] = [];

    const result = injectReminderIntoContent(content, "System reminder");

    expect(result).toHaveLength(1);
    expect(result[0]?.type).toBe("text");
    expect((result[0] as any).text).toBe("\n\nSystem reminder");
  });

  it("should handle multiple content blocks", () => {
    const content: ContentBlock[] = [
      { type: "tool_use", id: "tool1", name: "Read", input: {} },
      { type: "text", text: "After tool" },
    ];

    const result = injectReminderIntoContent(content, "Reminder");

    expect(result).toHaveLength(2);
    expect((result[1] as any).text).toBe("After tool\n\nReminder");
  });

  it("should handle tool_result as last block", () => {
    const content: ContentBlock[] = [
      { type: "tool_result", tool_use_id: "tool1", content: "result" },
    ];

    const result = injectReminderIntoContent(content, "Reminder");

    expect(result).toHaveLength(2);
    expect(result[0]?.type).toBe("tool_result");
    expect(result[1]?.type).toBe("text");
  });
});

describe("buildAPIMessages", () => {
  it("should return messages unchanged when no reminder", () => {
    const messages: Message[] = [
      { role: "user", content: [{ type: "text", text: "Hello" }] },
    ];

    const result = buildAPIMessages(messages, "System prompt");

    expect(result).toEqual(messages);
  });

  it("should return messages unchanged when empty", () => {
    const result = buildAPIMessages([], "System prompt", "Reminder");

    expect(result).toEqual([]);
  });

  it("should inject reminder into last user message", () => {
    const messages: Message[] = [
      { role: "user", content: [{ type: "text", text: "Hello" }] },
    ];

    const result = buildAPIMessages(messages, "System prompt", "Important reminder");

    expect(result).toHaveLength(1);
    expect(result[0]?.role).toBe("user");
    const textBlock = result[0]?.content[0] as any;
    expect(textBlock.text).toContain("Hello");
    expect(textBlock.text).toContain("Important reminder");
  });

  it("should not mutate original messages", () => {
    const messages: Message[] = [
      { role: "user", content: [{ type: "text", text: "Hello" }] },
    ];

    buildAPIMessages(messages, "System prompt", "Reminder");

    expect((messages[0]?.content[0] as any).text).toBe("Hello");
  });

  it("should find last user message in mixed conversation", () => {
    const messages: Message[] = [
      { role: "user", content: [{ type: "text", text: "First user" }] },
      { role: "assistant", content: [{ type: "text", text: "Response" }] },
      { role: "user", content: [{ type: "text", text: "Second user" }] },
    ];

    const result = buildAPIMessages(messages, "System prompt", "Reminder");

    expect(result).toHaveLength(3);
    // First user message should be unchanged
    expect((result[0]?.content[0] as any).text).toBe("First user");
    // Last user message should have reminder
    const lastUserText = (result[2]?.content[0] as any).text;
    expect(lastUserText).toContain("Second user");
    expect(lastUserText).toContain("Reminder");
  });

  it("should handle user message with tool results", () => {
    const messages: Message[] = [
      {
        role: "user",
        content: [
          { type: "tool_result", tool_use_id: "tool1", content: "Result 1" },
          { type: "tool_result", tool_use_id: "tool2", content: "Result 2" },
        ],
      },
    ];

    const result = buildAPIMessages(messages, "System prompt", "Reminder");

    expect(result).toHaveLength(1);
    // Should add reminder as new text block since last block is tool_result
    expect(result[0]?.content).toHaveLength(3);
    expect(result[0]?.content[2]?.type).toBe("text");
  });

  it("should handle complex user message", () => {
    const messages: Message[] = [
      {
        role: "user",
        content: [
          { type: "text", text: "Query text" },
          { type: "image", source: { type: "base64", data: "img", media_type: "image/png" } },
        ],
      },
    ];

    const result = buildAPIMessages(messages, "System prompt", "Reminder");

    // Reminder should be added as new block since last is image
    expect(result[0]?.content).toHaveLength(3);
    expect(result[0]?.content[0]?.type).toBe("text");
    expect(result[0]?.content[1]?.type).toBe("image");
    expect(result[0]?.content[2]?.type).toBe("text");
  });

  it("should handle assistant-only conversation", () => {
    const messages: Message[] = [
      { role: "assistant", content: [{ type: "text", text: "Hello" }] },
    ];

    const result = buildAPIMessages(messages, "System prompt", "Reminder");

    // No user message to inject into, return unchanged
    expect(result).toEqual(messages);
  });

  it("should handle multiline reminder", () => {
    const messages: Message[] = [
      { role: "user", content: [{ type: "text", text: "Hello" }] },
    ];

    const multilineReminder = `Line 1
Line 2
Line 3`;

    const result = buildAPIMessages(messages, "System prompt", multilineReminder);

    const text = (result[0]?.content[0] as any).text;
    expect(text).toContain("Line 1");
    expect(text).toContain("Line 2");
    expect(text).toContain("Line 3");
  });

  it("should preserve message order", () => {
    const messages: Message[] = [
      { role: "user", content: [{ type: "text", text: "1" }] },
      { role: "assistant", content: [{ type: "text", text: "2" }] },
      { role: "user", content: [{ type: "text", text: "3" }] },
      { role: "assistant", content: [{ type: "text", text: "4" }] },
      { role: "user", content: [{ type: "text", text: "5" }] },
    ];

    const result = buildAPIMessages(messages, "System prompt", "Reminder");

    expect(result[0]?.role).toBe("user");
    expect(result[1]?.role).toBe("assistant");
    expect(result[2]?.role).toBe("user");
    expect(result[3]?.role).toBe("assistant");
    expect(result[4]?.role).toBe("user");

    // Only last user should have reminder
    expect((result[0]?.content[0] as any).text).toBe("1");
    expect((result[2]?.content[0] as any).text).toBe("3");
    expect((result[4]?.content[0] as any).text).toContain("5");
    expect((result[4]?.content[0] as any).text).toContain("Reminder");
  });
});
