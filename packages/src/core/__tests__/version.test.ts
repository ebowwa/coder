import { describe, test, expect } from "bun:test";
import { getVersion, getBuildTime, VERSION, BUILD_TIME } from "../version.js";

describe("version", () => {
  test("getVersion returns a string", () => {
    const version = getVersion();
    expect(typeof version).toBe("string");
    expect(version.length).toBeGreaterThan(0);
  });

  test("getVersion caches result", () => {
    const v1 = getVersion();
    const v2 = getVersion();
    expect(v1).toBe(v2);
  });

  test("VERSION constant matches getVersion", () => {
    expect(VERSION).toBe(getVersion());
  });

  test("getBuildTime returns ISO format string", () => {
    const buildTime = getBuildTime();
    expect(typeof buildTime).toBe("string");
    expect(buildTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  test("BUILD_TIME constant is set", () => {
    expect(typeof BUILD_TIME).toBe("string");
    expect(BUILD_TIME.length).toBeGreaterThan(0);
  });
});
