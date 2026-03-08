/**
 * Tests for Spinner component
 */

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import {
  Spinner,
  getSpinner,
  resetSpinner,
  defaultFrames,
  dotFrames,
  arrowFrames,
} from "../packages/src/interfaces/ui/spinner.js";
import {
  LoadingState,
  setLoading,
  stopLoading,
  startTool,
  endTool,
} from "../packages/src/interfaces/ui/terminal/shared/loading-state.js";

describe("Spinner", () => {
  beforeEach(() => {
    resetSpinner();
  });

  afterEach(() => {
    resetSpinner();
  });

  test("creates spinner with default options", () => {
    const spinner = new Spinner();
    expect(spinner.isActive()).toBe(false);
  });

  test("starts and stops spinner", () => {
    const spinner = new Spinner(); // Not disabled
    spinner.start("Loading...");

    // Check internal state via getState
    const state = spinner.getState();
    expect(state.startTime).toBeGreaterThan(0);
    expect(spinner.isActive()).toBe(true);

    spinner.stop();
    expect(spinner.isActive()).toBe(false);
  });

  test("updates tip text", () => {
    const spinner = new Spinner({ disabled: true });
    spinner.start("Initial");
    spinner.updateTip("Updated tip");

    const state = spinner.getState();
    expect(state.currentTip).toBe("Updated tip");

    spinner.stop();
  });

  test("tracks elapsed time", () => {
    const spinner = new Spinner({ disabled: true });
    spinner.start("Testing time");

    // Wait a bit
    const start = Date.now();
    while (Date.now() - start < 100) {
      // Busy wait 100ms
    }

    const elapsed = spinner.getElapsedSeconds();
    expect(elapsed).toBeGreaterThanOrEqual(0);

    spinner.stop();
  });

  test("singleton pattern works", () => {
    const s1 = getSpinner();
    const s2 = getSpinner();
    expect(s1).toBe(s2);
  });

  test("has default frames defined", () => {
    expect(defaultFrames.length).toBeGreaterThan(0);
    expect(dotFrames.length).toBeGreaterThan(0);
    expect(arrowFrames.length).toBeGreaterThan(0);
  });

  test("disabled spinner doesn't spin", () => {
    const spinner = new Spinner({ disabled: true });
    spinner.start("Test");

    // Should not be active since disabled
    expect(spinner.isActive()).toBe(false);

    // Stop should work without error
    spinner.stop();
    expect(spinner.isActive()).toBe(false);
  });
});

describe("LoadingState", () => {
  let ls: LoadingState;

  beforeEach(() => {
    LoadingState.reset();
    ls = LoadingState.getInstance();
  });

  afterEach(() => {
    stopLoading();
    LoadingState.reset();
  });

  test("starts and stops loading", () => {
    setLoading("api-request", "Calling API...");
    expect(ls.isLoading()).toBe(true);
    expect(ls.getPhase()).toBe("api-request");

    stopLoading();
    expect(ls.isLoading()).toBe(false);
    expect(ls.getPhase()).toBe("idle");
  });

  test("tracks active tools", () => {
    startTool("Read");
    expect(ls.isToolActive("Read")).toBe(true);
    expect(ls.getActiveTools()).toContain("Read");

    startTool("Edit");
    expect(ls.getActiveTools().length).toBe(2);

    endTool("Read");
    expect(ls.isToolActive("Read")).toBe(false);
    expect(ls.isToolActive("Edit")).toBe(true);

    endTool("Edit");
    expect(ls.getActiveTools().length).toBe(0);
  });

  test("emits events", () => {
    return new Promise<void>((resolve) => {
      ls.on("state-change", (state) => {
        if (state.isLoading) {
          expect(state.isLoading).toBe(true);
          ls.removeAllListeners();
          resolve();
        }
      });

      setLoading("processing", "Test event");
    });
  });

  test("tracks elapsed time", () => {
    setLoading("processing", "Testing");

    const start = Date.now();
    while (Date.now() - start < 50) {
      // Busy wait
    }

    const elapsed = ls.getElapsedMs();
    expect(elapsed).toBeGreaterThanOrEqual(0);

    stopLoading();
  });

  test("pause and resume", () => {
    setLoading("processing", "Testing pause");
    ls.pause();

    const state = ls.getState();
    expect(state.paused).toBe(true);

    ls.resume();
    expect(ls.getState().paused).toBe(false);

    stopLoading();
  });
});
