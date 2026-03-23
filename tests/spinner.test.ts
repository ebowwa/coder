/**
 * Tests for Spinner component
 * 
 * NOTE: Spinner class has been removed and replaced with @ebowwa/tui-core/algorithms
 * These tests are temporarily disabled pending refactor to use new spinner implementation
 */

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
// Spinner imports disabled - functionality moved to @ebowwa/tui-core
import {
  spinnerFrames,
  dotSpinnerFrames,
  arrowSpinnerFrames,
  createSpinnerIterator,
} from "../packages/src/interfaces/ui/terminal/tui/spinner.js";
import {
  LoadingState,
  setLoading,
  stopLoading,
  startTool,
  endTool,
} from "../packages/src/interfaces/ui/terminal/shared/loading-state.js";

describe("Spinner", () => {
  // NOTE: Spinner class tests temporarily disabled - functionality moved to @ebowwa/tui-core
  
  test("has spinner frames defined", () => {
    expect(spinnerFrames.length).toBeGreaterThan(0);
    expect(dotSpinnerFrames.length).toBeGreaterThan(0);
    expect(arrowSpinnerFrames.length).toBeGreaterThan(0);
  });

  test("createSpinnerIterator works", () => {
    const iterator = createSpinnerIterator(spinnerFrames);
    const frame1 = iterator.next();
    const frame2 = iterator.next();
    
    expect(frame1.value).toBeDefined();
    expect(frame2.value).toBeDefined();
    expect(typeof frame1.value).toBe("string");
    expect(typeof frame2.value).toBe("string");
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
