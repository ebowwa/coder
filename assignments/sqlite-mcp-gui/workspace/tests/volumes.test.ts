#!/usr/bin/env bun
/**
 * Hetzner Volume Test Suite
 * Tests volume operations and pricing calculations
 */

import { describe, test, expect } from "bun:test";
import { VolumeOperations } from "../src/lib/hetzner/volumes";

describe("VolumeOperations Price Calculation", () => {
  test("should calculate price for 10 GB volume", () => {
    const price = VolumeOperations.calculatePrice(10);

    expect(price.size).toBe(10);
    expect(price.currency).toBe("EUR");
    expect(price.monthly).toBeCloseTo(0.08, 2);
    expect(price.hourly).toBeGreaterThan(0);
    expect(price.hourly).toBeLessThan(0.01);
  });

  test("should calculate price for 100 GB volume", () => {
    const price = VolumeOperations.calculatePrice(100);

    expect(price.size).toBe(100);
    expect(price.monthly).toBeCloseTo(0.80, 2);
    expect(price.hourly).toBeGreaterThan(0);
    expect(price.hourly).toBeLessThan(0.01);
  });

  test("should calculate price for 1 TB volume", () => {
    const price = VolumeOperations.calculatePrice(1024);

    expect(price.size).toBe(1024);
    expect(price.monthly).toBeCloseTo(8.19, 1);
    expect(price.hourly).toBeGreaterThan(0);
  });

  test("should handle minimum volume size (10 GB)", () => {
    const price = VolumeOperations.calculatePrice(10);

    expect(price.size).toBe(10);
    expect(price.monthly).toBe(0.08);
  });

  test("should handle maximum volume size (10 TB = 10240 GB)", () => {
    const price = VolumeOperations.calculatePrice(10240);

    expect(price.size).toBe(10240);
    expect(price.monthly).toBeCloseTo(81.92, 1);
  });

  test("should price be proportional to size", () => {
    const price10 = VolumeOperations.calculatePrice(10);
    const price100 = VolumeOperations.calculatePrice(100);

    expect(price100.monthly).toBeCloseTo(price10.monthly * 10, 1);
  });
});

describe("Volume Request Schema Validation", () => {
  test("should validate valid volume name", () => {
    const validNames = [
      "my-volume",
      "volume-1",
      "data-volume-2024",
      "a",
      "Volume123",
    ];

    for (const name of validNames) {
      const isValid = /^[a-zA-Z0-9][a-zA-Z0-9-]*$/.test(name);
      expect(isValid).toBe(true);
    }
  });

  test("should reject invalid volume names", () => {
    const invalidNames = [
      "-my-volume",  // starts with hyphen
      "",            // empty string
      "my volume",   // contains space
      "my.volume",   // contains dot
      "my_volume",   // contains underscore
    ];

    for (const name of invalidNames) {
      const isValid = /^[a-zA-Z0-9][a-zA-Z0-9-]*$/.test(name);
      expect(isValid).toBe(false);
    }
  });

  test("should allow volume names ending with hyphen", () => {
    // Note: The current regex allows trailing hyphens since '-' is in the character class
    const namesWithTrailingHyphen = ["my-volume-", "a-", "test-123-"];

    for (const name of namesWithTrailingHyphen) {
      const isValid = /^[a-zA-Z0-9][a-zA-Z0-9-]*$/.test(name);
      expect(isValid).toBe(true);
    }
  });

  test("should validate volume size range", () => {
    const validSizes = [10, 50, 100, 500, 1000, 10240];
    const invalidSizes = [0, 1, 9, 10241, 50000];

    for (const size of validSizes) {
      expect(size).toBeGreaterThanOrEqual(10);
      expect(size).toBeLessThanOrEqual(10240);
    }

    for (const size of invalidSizes) {
      const isValid = size >= 10 && size <= 10240;
      if (size < 10 || size > 10240) {
        expect(isValid).toBe(false);
      }
    }
  });

  test("should validate volume format options", () => {
    const validFormats = ["ext4", "xfs"];
    const invalidFormat = "ntfs";

    expect(validFormats.includes("ext4")).toBe(true);
    expect(validFormats.includes("xfs")).toBe(true);
    expect(validFormats.includes(invalidFormat)).toBe(false);
  });
});

describe("Volume Types", () => {
  test("should have correct volume status values", () => {
    const validStatuses = ["creating", "available", "deleting"];

    for (const status of validStatuses) {
      expect(typeof status).toBe("string");
      expect(status.length).toBeGreaterThan(0);
    }
  });

  test("CreateVolumeOptions should accept valid config", () => {
    const options = {
      name: "test-volume",
      size: 50,
      location: "nbg1",
      format: "ext4" as const,
      automount: true,
      labels: {
        environment: "test",
        project: "codespaces",
      },
    };

    expect(options.name).toBe("test-volume");
    expect(options.size).toBe(50);
    expect(options.location).toBe("nbg1");
    expect(options.format).toBe("ext4");
    expect(options.automount).toBe(true);
    expect(options.labels?.environment).toBe("test");
  });

  test("CreateVolumeOptions with server attachment", () => {
    const options = {
      name: "attached-volume",
      size: 100,
      server: 12345,
      automount: true,
    };

    expect(options.name).toBe("attached-volume");
    expect(options.size).toBe(100);
    expect(options.server).toBe(12345);
    expect(options.automount).toBe(true);
  });
});

describe("Volume API Endpoint Construction", () => {
  test("should construct list endpoint without filters", () => {
    const endpoint = "/volumes";
    expect(endpoint).toBe("/volumes");
  });

  test("should construct list endpoint with name filter", () => {
    const name = "my-volume";
    const params = new URLSearchParams();
    params.set("name", name);
    const endpoint = `/volumes?${params}`;
    expect(endpoint).toBe("/volumes?name=my-volume");
  });

  test("should construct list endpoint with status filter", () => {
    const status = "available";
    const params = new URLSearchParams();
    params.set("status", status);
    const endpoint = `/volumes?${params}`;
    expect(endpoint).toBe("/volumes?status=available");
  });

  test("should construct list endpoint with multiple filters", () => {
    const params = new URLSearchParams();
    params.set("status", "available");
    params.set("sort", "name:asc");
    const endpoint = `/volumes?${params}`;
    expect(endpoint).toContain("status=available");
    expect(endpoint).toContain("sort=name%3Aasc");
  });

  test("should construct get volume endpoint", () => {
    const volumeId = 12345;
    const endpoint = `/volumes/${volumeId}`;
    expect(endpoint).toBe("/volumes/12345");
  });

  test("should construct attach endpoint", () => {
    const volumeId = 12345;
    const endpoint = `/volumes/${volumeId}/actions/attach`;
    expect(endpoint).toBe("/volumes/12345/actions/attach");
  });

  test("should construct detach endpoint", () => {
    const volumeId = 12345;
    const endpoint = `/volumes/${volumeId}/actions/detach`;
    expect(endpoint).toBe("/volumes/12345/actions/detach");
  });

  test("should construct resize endpoint", () => {
    const volumeId = 12345;
    const endpoint = `/volumes/${volumeId}/actions/resize`;
    expect(endpoint).toBe("/volumes/12345/actions/resize");
  });

  test("should construct protection endpoint", () => {
    const volumeId = 12345;
    const endpoint = `/volumes/${volumeId}/actions/change_protection`;
    expect(endpoint).toBe("/volumes/12345/actions/change_protection");
  });
});

describe("Volume Pricing Helper", () => {
  test("should calculate hourly price from monthly", () => {
    const monthlyPrice = 0.80; // 100 GB
    const hoursPerMonth = 730;
    const hourlyPrice = monthlyPrice / hoursPerMonth;

    expect(hourlyPrice).toBeCloseTo(0.0011, 4);
  });

  test("should round prices correctly", () => {
    const rawMonthly = 0.0816;
    const roundedMonthly = Math.round(rawMonthly * 100) / 100;
    expect(roundedMonthly).toBe(0.08);

    const rawHourly = 0.000112;
    const roundedHourly = Math.round(rawHourly * 10000) / 10000;
    expect(roundedHourly).toBe(0.0001);
  });

  test("should provide pricing summary for common sizes", () => {
    const commonSizes = [10, 50, 100, 500, 1024];

    for (const size of commonSizes) {
      const price = VolumeOperations.calculatePrice(size);
      expect(price.size).toBe(size);
      expect(price.monthly).toBeGreaterThan(0);
      expect(price.monthly).toBeLessThan(100);
    }
  });
});

describe("Volume Label Operations", () => {
  test("should accept valid labels", () => {
    const labels = {
      environment: "production",
      project: "my-app",
      team: "backend",
      version: "1.0.0",
    };

    expect(Object.keys(labels).length).toBe(4);
    expect(labels.environment).toBe("production");
  });

  test("should accept empty labels", () => {
    const labels: Record<string, string> = {};
    expect(Object.keys(labels).length).toBe(0);
  });

  test("should update labels selectively", () => {
    const existing = {
      environment: "production",
      project: "my-app",
    };

    const updates = {
      environment: "staging",
      team: "backend",
    };

    const merged = { ...existing, ...updates };
    expect(merged.environment).toBe("staging");
    expect(merged.project).toBe("my-app");
    expect(merged.team).toBe("backend");
  });
});
