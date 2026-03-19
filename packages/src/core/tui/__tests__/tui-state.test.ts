/**
 * Tests for TUIState class
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { TUIState } from "../tui-state.js";

describe("TUIState", () => {
  let state: TUIState;
  const mockCallbacks = {
    onMessage: () => {},
    onClear: () => {},
    onExit: () => {},
    onModelChange: () => {},
    onCostUpdate: () => {},
    showSystemMessage: () => {},
  };

  beforeEach(() => {
    state = new TUIState(mockCallbacks);
  });

  test("should initialize with default model", () => {
    expect(state.getModel()).toBe("claude-sonnet-4-6");
  });

  test("should start with zero messages", () => {
    expect(state.getMessageCount()).toBe(0);
    expect(state.getApiMessageCount()).toBe(0);
  });

  test("should start with zero tokens", () => {
    expect(state.getTokenCount()).toBe(0);
  });

  test("should start with zero cost", () => {
    expect(state.getTotalCost()).toBe(0);
  });

  test("should add message and trigger callback", () => {
    let called = false;
    const cb = { ...mockCallbacks, onMessage: () => { called = true; } };
    const stateWithCb = new TUIState(cb);

    stateWithCb.addMessage({
      id: "test-1",
      role: "user",
      content: "Hello",
      timestamp: Date.now(),
    });

    expect(stateWithCb.getMessageCount()).toBe(1);
    expect(called).toBe(true);
  });

  test("should clear messages", () => {
    state.addMessage({
      id: "test-1",
      role: "user",
      content: "Hello",
      timestamp: Date.now(),
    });
    state.addApiMessage({
      role: "user",
      content: [{ type: "text", text: "Test" }],
    });

    expect(state.getMessageCount()).toBe(1);
    expect(state.getApiMessageCount()).toBe(1);

    state.clearMessages();

    expect(state.getMessageCount()).toBe(0);
    expect(state.getApiMessageCount()).toBe(0);
  });

  test("should update token count", () => {
    state.updateTokenCount(100);
    expect(state.getTokenCount()).toBe(100);
  });

  test("should add cost", () => {
    let costUpdated = false;
    const cb = { ...mockCallbacks, onCostUpdate: () => { costUpdated = true; } };
    const stateWithCb = new TUIState(cb);

    stateWithCb.addCost(0.5);
    expect(stateWithCb.getTotalCost()).toBe(0.5);
    expect(costUpdated).toBe(true);
  });

  test("should set model", () => {
    let modelChanged = false;
    const cb = { ...mockCallbacks, onModelChange: () => { modelChanged = true; } };
    const stateWithCb = new TUIState(cb);

    stateWithCb.setModel("claude-opus-4-6");
    expect(stateWithCb.getModel()).toBe("claude-opus-4-6");
    expect(modelChanged).toBe(true);
  });

  test("should serialize and deserialize", () => {
    state.addMessage({
      id: "test-1",
      role: "user",
      content: "Hello",
      timestamp: Date.now(),
    });
    state.addApiMessage({
      role: "user",
      content: [{ type: "text", text: "Test" }],
    });
    state.updateTokenCount(100);
    state.addCost(0.5);

    const snapshot = state.serialize();
    expect(snapshot.messages.length).toBe(1);
    expect(snapshot.apiMessages.length).toBe(1);
    expect(snapshot.tokenCount).toBe(100);
    expect(snapshot.totalCost).toBe(0.5);

    const restored = TUIState.deserialize(snapshot, mockCallbacks);
    expect(restored.getMessageCount()).toBe(1);
    expect(restored.getApiMessageCount()).toBe(1);
    expect(restored.getTokenCount()).toBe(100);
    expect(restored.getTotalCost()).toBe(0.5);
  });

  test("should provide status summary", () => {
    state.addMessage({
      id: "test-1",
      role: "user",
      content: "Hello",
      timestamp: Date.now(),
    });
    state.addApiMessage({
      role: "user",
      content: [{ type: "text", text: "Test" }],
    });

    const summary = state.getStatusSummary();
    expect(summary.messageCount).toBe(1);
    expect(summary.apiMessageCount).toBe(1);
    expect(summary.model).toBeDefined();
    expect(summary.sessionDuration).toBeGreaterThanOrEqual(0);
  });
});
