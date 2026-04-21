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
} from "../packages/src/interfaces/ui/index.js";

describe("Spinner", () => {
  beforeEach(() => {
    resetSpinner();
  });

  afterEach(() => {
    resetSpinner();
  });

  test("creates spinner with default options", () => {
    const spinner = new Spinner();
    expect(spinner).toBeInstanceOf(Spinner);
  });

  test("starts and stops spinner", () => {
    const spinner = new Spinner();
    const result = spinner.start("Loading...");
    expect(result).toBe(spinner); // fluent API

    spinner.stop();
    // stop returns this
    expect(spinner.stop()).toBe(spinner);
  });

  test("updates text", () => {
    const spinner = new Spinner();
    const result = spinner.update("Updated text");
    expect(result).toBe(spinner); // fluent API
  });

  test("fluent API chains", () => {
    const spinner = new Spinner();
    const result = spinner.start("Init").update("Changed").stop();
    expect(result).toBe(spinner);
  });

  test("succeed, fail, warn, info stop the spinner", () => {
    const spinner = new Spinner();
    spinner.start("Test");
    expect(spinner.succeed("Done")).toBe(spinner);

    const spinner2 = new Spinner();
    spinner2.start("Test");
    expect(spinner2.fail("Error")).toBe(spinner2);

    const spinner3 = new Spinner();
    spinner3.start("Test");
    expect(spinner3.warn("Warning")).toBe(spinner3);

    const spinner4 = new Spinner();
    spinner4.start("Test");
    expect(spinner4.info("Info")).toBe(spinner4);
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

  test("setColor changes color", () => {
    const spinner = new Spinner();
    const result = spinner.setColor("red");
    expect(result).toBe(spinner);
  });
});
