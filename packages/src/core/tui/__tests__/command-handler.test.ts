/**
 * Tests for CommandHandler class
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { CommandHandler, HELP_TEXT } from "../command-handler.js";
import { TUIState } from "../tui-state.js";

describe("CommandHandler", () => {
  let handler: CommandHandler;
  let state: TUIState;
  const mockCallbacks = {
    onMessage: () => {},
    onClear: () => {},
    onExit: () => {},
    onModelChange: () => {},
    onCostUpdate: () => {},
    showSystemMessage: () => {},
  };

  const mockContext = {
    sessionId: "test-session-123",
    workingDirectory: "/test/dir",
    permissionMode: "default" as const,
    model: "claude-sonnet-4-6",
    tokenCount: 100,
    totalCost: 0.5,
  };

  beforeEach(() => {
    state = new TUIState(mockCallbacks);
    handler = new CommandHandler(state, mockCallbacks);
  });

  test("should detect commands", () => {
    expect(handler.isCommand("/help")).toBe(true);
    expect(handler.isCommand("/clear")).toBe(true);
    expect(handler.isCommand("/exit")).toBe(true);
    expect(handler.isCommand("regular message")).toBe(false);
    expect(handler.isCommand("  /help  ")).toBe(true); // trimmed starts /
  });

  test("should handle /help command", async () => {
    const result = await handler.handle("/help", mockContext);
    expect(result.handled).toBe(true);
    expect(result.message).toBeDefined();
    expect(result.message?.content).toContain("Commands:");
  });

  test("should handle /clear command", async () => {
    // Add a message first
    state.addMessage({
      id: "test-1",
      role: "user",
      content: "Hello",
      timestamp: Date.now(),
    });

    const result = await handler.handle("/clear", mockContext);
    expect(result.handled).toBe(true);
    expect(result.action).toBe("clear");
  });

  test("should handle /exit command", async () => {
    const result = await handler.handle("/exit", mockContext);
    expect(result.handled).toBe(true);
    expect(result.exit).toBe(true);
  });

  test("should handle /quit command", async () => {
    const result = await handler.handle("/quit", mockContext);
    expect(result.handled).toBe(true);
    expect(result.exit).toBe(true);
  });

  test("should handle /model without args (show current)", async () => {
    const result = await handler.handle("/model", mockContext);
    expect(result.handled).toBe(true);
    expect(result.message?.content).toContain("Current model:");
  });

  test("should handle /model with valid model name", async () => {
    const result = await handler.handle("/model claude-opus-4-6", mockContext);
    expect(result.handled).toBe(true);
    expect(result.action).toBe("model-switch");
    expect(result.actionData).toBe("claude-opus-4-6");
  });

  test("should handle /model with invalid model name", async () => {
    const result = await handler.handle("/model invalid-model", mockContext);
    expect(result.handled).toBe(true);
    expect(result.message?.subType).toBe("error");
  });

  test("should handle /status command", async () => {
    const result = await handler.handle("/status", mockContext);
    expect(result.handled).toBe(true);
    expect(result.message?.content).toContain("Session Status:");
  });

  test("should handle /cost command", async () => {
    const result = await handler.handle("/cost", mockContext);
    expect(result.handled).toBe(true);
    expect(result.message?.content).toContain("Session Cost:");
  });

  test("should handle /compact command", async () => {
    const result = await handler.handle("/compact", mockContext);
    expect(result.handled).toBe(true);
    expect(result.action).toBe("compact");
  });

  test("should handle unknown command", async () => {
    const result = await handler.handle("/unknown-command", mockContext);
    expect(result.handled).toBe(true);
    expect(result.message?.subType).toBe("error");
    expect(result.message?.content).toContain("Unknown command:");
  });

  test("HELP_TEXT should contain all commands", () => {
    expect(HELP_TEXT).toContain("/help");
    expect(HELP_TEXT).toContain("/clear");
    expect(HELP_TEXT).toContain("/model");
    expect(HELP_TEXT).toContain("/status");
    expect(HELP_TEXT).toContain("/cost");
    expect(HELP_TEXT).toContain("/exit");
  });
});
