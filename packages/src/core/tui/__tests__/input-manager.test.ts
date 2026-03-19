/**
 * Tests for InputManager class
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { InputManager } from "../input-manager.js";

describe("InputManager", () => {
  let manager: InputManager;

  beforeEach(() => {
    manager = new InputManager();
  });

  // ============================================
  // HISTORY MANAGEMENT
  // ============================================

  test("should add input to history", () => {
    manager.addToHistory("first command");
    manager.addToHistory("second command");

    const history = manager.getHistory();
    expect(history.length).toBe(2);
    // History is stored in chronological order (oldest to newest)
    expect(history[0]).toBe("first command");
    expect(history[1]).toBe("second command");
  });

  test("should not add empty input to history", () => {
    manager.addToHistory("");
    manager.addToHistory("   ");

    expect(manager.getHistory().length).toBe(0);
  });

  test("should not add duplicates to history", () => {
    manager.addToHistory("command");
    manager.addToHistory("command");
    manager.addToHistory("command");

    expect(manager.getHistory().length).toBe(1);
  });

  test("should respect max history size", () => {
    const smallManager = new InputManager({ maxHistorySize: 3 });

    for (let i = 0; i < 5; i++) {
      smallManager.addToHistory(`command ${i}`);
    }

    const history = smallManager.getHistory();
    expect(history.length).toBe(3);
  });

  // ============================================
  // NAVIGATION
  // ============================================

  test("should navigate up through history", () => {
    manager.addToHistory("first");
    manager.addToHistory("second");
    manager.addToHistory("third");

    // Start with empty input
    const result1 = manager.navigateUp("");
    expect(result1.navigated).toBe(true);
    expect(result1.value).toBe("first"); // Oldest entry (index 0)
  });

  test("should navigate down through history", () => {
    manager.addToHistory("first");
    manager.addToHistory("second");

    // Navigate up first
    manager.navigateUp("");
    manager.navigateUp("first");

    // Then navigate down
    const result1 = manager.navigateDown();
    expect(result1.navigated).toBe(true);
    expect(result1.value).toBe("first");

    const result2 = manager.navigateDown();
    expect(result2.navigated).toBe(true);
    expect(result2.value).toBe(""); // Back to saved input
  });

  test("should save current input when navigating", () => {
    manager.addToHistory("history item");

    const result = manager.navigateUp("current draft");
    expect(result.navigated).toBe(true);

    // Navigate back down should restore saved input
    const savedResult = manager.navigateDown();
    expect(savedResult.value).toBe("current draft");
    expect(savedResult.navigated).toBe(true);
  });

  test("should return current input when no history", () => {
    const result = manager.navigateUp("test");
    expect(result.navigated).toBe(false);
    expect(result.value).toBe("test");
  });

  test("should reset navigation state", () => {
    manager.addToHistory("item");
    manager.navigateUp("");

    expect(manager.isNavigating()).toBe(true);

    manager.resetNavigation();

    expect(manager.isNavigating()).toBe(false);
    expect(manager.getHistoryIndex()).toBe(-1);
  });

  // ============================================
  // CURSOR MOVEMENT
  // ============================================

  test("should move cursor left", () => {
    expect(manager.moveCursorLeft(5)).toBe(4);
    expect(manager.moveCursorLeft(1)).toBe(0);
    expect(manager.moveCursorLeft(0)).toBe(0); // Boundary
  });

  test("should move cursor right", () => {
    expect(manager.moveCursorRight(0, 10)).toBe(1);
    expect(manager.moveCursorRight(9, 10)).toBe(10); // Boundary
  });

  test("should move cursor to start", () => {
    expect(manager.moveToStart()).toBe(0);
  });

  test("should move cursor to end", () => {
    expect(manager.moveToEnd(10)).toBe(10);
  });

  test("should move cursor left by word", () => {
    const text = "hello world test";
    expect(manager.moveWordLeft(text, 11)).toBe(6);  // "test" -> "world "
    expect(manager.moveWordLeft(text, 6)).toBe(0);   // "world" -> start
    expect(manager.moveWordLeft(text, 0)).toBe(0);
  });

  test("should move cursor right by word", () => {
    const text = "hello world test";
    expect(manager.moveWordRight(text, 0)).toBe(6);  // "hello" -> "world"
    expect(manager.moveWordRight(text, 6)).toBe(12); // "world " -> "test"
    expect(manager.moveWordRight(text, 11)).toBe(16); // End of text
  });

  // ============================================
  // TEXT EDITING
  // ============================================

  test("should insert character", () => {
    const result = manager.insertChar("hello", 0, "X");
    expect(result.text).toBe("Xhello");
    expect(result.pos).toBe(1);
  });

  test("should insert character in middle", () => {
    const result = manager.insertChar("hello", 2, "X");
    expect(result.text).toBe("heXllo");
    expect(result.pos).toBe(3);
  });

  test("should delete character before cursor", () => {
    const result = manager.deleteCharBefore("hello", 2);
    expect(result.text).toBe("hllo");
    expect(result.pos).toBe(1);
  });

  test("should not delete at start of line", () => {
    const result = manager.deleteCharBefore("hello", 0);
    expect(result.text).toBe("hello");
    expect(result.pos).toBe(0);
  });

  test("should delete character at cursor", () => {
    const result = manager.deleteCharAt("hello", 1);
    expect(result.text).toBe("hllo");
    expect(result.pos).toBe(1);
  });

  test("should not delete at end of line", () => {
    const result = manager.deleteCharAt("hello", 5);
    expect(result.text).toBe("hello");
    expect(result.pos).toBe(5);
  });

  test("should delete to start of line", () => {
    const result = manager.deleteToStart("hello world", 6);
    expect(result.text).toBe("world");
    expect(result.pos).toBe(0);
  });

  test("should delete to end of line", () => {
    const result = manager.deleteToEnd("hello world", 5);
    expect(result.text).toBe("hello");
    expect(result.pos).toBe(5);
  });

  test("should delete word before cursor", () => {
    const result = manager.deleteWordBefore("hello world test", 11);
    expect(result.text).toBe("hello  test");
    expect(result.pos).toBe(6);
  });

  // ============================================
  // UTILITY METHODS
  // ============================================

  test("should check if navigating", () => {
    expect(manager.isNavigating()).toBe(false);
    manager.addToHistory("item");
    manager.navigateUp("");
    expect(manager.isNavigating()).toBe(true);
  });

  test("should clear history", () => {
    manager.addToHistory("item1");
    manager.addToHistory("item2");
    manager.navigateUp("");

    manager.clearHistory();

    expect(manager.getHistory().length).toBe(0);
    expect(manager.isNavigating()).toBe(false);
  });
});
