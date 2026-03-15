#!/usr/bin/env bun
/**
 * Tests for Status Line Component
 */

import { describe, test, expect } from "bun:test";
import {
  VERSION,
  renderStatusLine,
  renderCompactStatusLine,
  renderMinimalStatusLine,
  renderFooterStatus,
  renderAutoCompactWarning,
  calculateContextInfo,
  formatPermissionMode,
  formatTokenCount,
  formatContextPercent,
  getContextWindow,
  shouldShowAutoCompactWarning,
  getModelDisplayName,
  getPermissionModeDisplay,
  type StatusLineOptions,
} from "../packages/src/interfaces/ui/terminal/shared/status-line.js";
import type { PermissionMode } from "../packages/src/schemas/index.js";

describe("Status Line", () => {
  describe("VERSION", () => {
    test("VERSION is defined", () => {
      expect(VERSION).toBeDefined();
      expect(typeof VERSION).toBe("string");
    });
  });

  describe("getContextWindow", () => {
    test("returns correct context window for known models", () => {
      expect(getContextWindow("claude-opus-4-6")).toBe(200_000);
      expect(getContextWindow("claude-sonnet-4-6")).toBe(200_000);
      expect(getContextWindow("claude-haiku-4-5")).toBe(200_000);
    });

    test("returns default context window for unknown models", () => {
      expect(getContextWindow("unknown-model")).toBe(200_000);
    });
  });

  describe("calculateContextInfo", () => {
    test("returns 100% when no tokens used", () => {
      const info = calculateContextInfo(0, "claude-sonnet-4-6");
      expect(info.percentRemaining).toBe(100);
      expect(info.tokenDisplay).toBe("0 tokens");
      expect(info.isLow).toBe(false);
      expect(info.isCritical).toBe(false);
    });

    test("returns correct percentage for partial usage", () => {
      const info = calculateContextInfo(100_000, "claude-sonnet-4-6"); // 50% used
      expect(info.percentRemaining).toBeCloseTo(50, 0);
      expect(info.isLow).toBe(false);
      expect(info.isCritical).toBe(false);
    });

    test("detects low context", () => {
      const info = calculateContextInfo(180_000, "claude-sonnet-4-6"); // ~10% remaining
      expect(info.percentRemaining).toBeLessThan(15);
      expect(info.isLow).toBe(true);
      expect(info.isCritical).toBe(false);
    });

    test("detects critical context", () => {
      const info = calculateContextInfo(192_000, "claude-sonnet-4-6"); // ~4% remaining
      expect(info.percentRemaining).toBeLessThan(8);
      expect(info.isCritical).toBe(true);
    });
  });

  describe("formatTokenCount", () => {
    test("formats small numbers", () => {
      expect(formatTokenCount(0)).toBe("0 tokens");
      expect(formatTokenCount(100)).toBe("100 tokens");
      expect(formatTokenCount(999)).toBe("999 tokens");
    });

    test("formats thousands", () => {
      expect(formatTokenCount(1000)).toBe("1.0k tokens");
      expect(formatTokenCount(5000)).toBe("5.0k tokens");
      expect(formatTokenCount(50000)).toBe("50.0k tokens");
    });

    test("formats millions", () => {
      expect(formatTokenCount(1_000_000)).toBe("1.00M tokens");
      expect(formatTokenCount(2_500_000)).toBe("2.50M tokens");
    });
  });

  describe("formatContextPercent", () => {
    test("formats normal percentage", () => {
      const result = formatContextPercent(50);
      expect(result).toContain("50");
    });

    test("formats low percentage with warning", () => {
      const result = formatContextPercent(10);
      expect(result).toContain("10");
    });

    test("formats critical percentage with error color", () => {
      const result = formatContextPercent(3);
      expect(result).toContain("3");
    });
  });

  describe("getPermissionModeDisplay", () => {
    test("returns display for all permission modes", () => {
      const modes: PermissionMode[] = [
        "default",
        "acceptEdits",
        "bypassPermissions",
        "plan",
        "dontAsk",
      ];

      for (const mode of modes) {
        const display = getPermissionModeDisplay(mode);
        expect(display).toBeDefined();
        expect(display.symbol).toBeDefined();
        expect(display.label).toBeDefined();
        expect(display.color).toBeDefined();
      }
    });
  });

  describe("formatPermissionMode", () => {
    test("formats bypassPermissions with cycle hint", () => {
      const result = formatPermissionMode("bypassPermissions");
      expect(result).toContain("bypass permissions");
      expect(result).toContain("shift+tab");
    });

    test("formats acceptEdits with cycle hint", () => {
      const result = formatPermissionMode("acceptEdits");
      expect(result).toContain("accept edits");
      expect(result).toContain("shift+tab");
    });

    test("formats default mode without cycle hint", () => {
      const result = formatPermissionMode("default");
      expect(result).toContain("default");
      expect(result).not.toContain("shift+tab");
    });
  });

  describe("getModelDisplayName", () => {
    test("returns display name for known models", () => {
      expect(getModelDisplayName("claude-opus-4-6")).toBe("Opus 4.6");
      expect(getModelDisplayName("claude-sonnet-4-6")).toBe("Sonnet 4.6");
      expect(getModelDisplayName("claude-haiku-4-5")).toBe("Haiku 4.5");
    });

    test("returns original name for unknown models", () => {
      expect(getModelDisplayName("custom-model")).toBe("custom-model");
    });
  });

  describe("renderStatusLine", () => {
    test("renders basic status line", () => {
      const options: StatusLineOptions = {
        permissionMode: "default",
        tokensUsed: 0,
        maxTokens: 200_000,
        model: "claude-sonnet-4-6",
        terminalWidth: 120, // Wide enough for full format
      };

      const result = renderStatusLine(options);
      expect(result).toContain("Context left until auto-compact");
      expect(result).toContain("100%");
      expect(result).toContain("0 tokens");
      expect(result).toContain("default");
    });

    test("renders bypass permissions status", () => {
      const options: StatusLineOptions = {
        permissionMode: "bypassPermissions",
        tokensUsed: 0,
        maxTokens: 200_000,
        model: "claude-sonnet-4-6",
      };

      const result = renderStatusLine(options);
      expect(result).toContain("bypass permissions");
      expect(result).toContain("shift+tab");
    });

    test("renders with verbose mode including version", () => {
      const options: StatusLineOptions = {
        permissionMode: "default",
        tokensUsed: 0,
        maxTokens: 200_000,
        model: "claude-sonnet-4-6",
        verbose: true,
        terminalWidth: 150, // Wide enough for version
      };

      const result = renderStatusLine(options);
      expect(result).toContain("currentVersion");
      expect(result).toContain(VERSION);
    });

    test("renders loading indicator", () => {
      const options: StatusLineOptions = {
        permissionMode: "default",
        tokensUsed: 0,
        maxTokens: 200_000,
        model: "claude-sonnet-4-6",
        isLoading: true,
      };

      const result = renderStatusLine(options);
      expect(result).toContain("⠋");
    });

    test("truncates for narrow terminals", () => {
      const options: StatusLineOptions = {
        permissionMode: "bypassPermissions",
        tokensUsed: 0,
        maxTokens: 200_000,
        model: "claude-sonnet-4-6",
        terminalWidth: 40,
      };

      const result = renderStatusLine(options);
      // Should be compact for narrow terminals
      expect(result.length).toBeLessThan(100);
    });
  });

  describe("renderCompactStatusLine", () => {
    test("renders compact format", () => {
      const options: StatusLineOptions = {
        permissionMode: "bypassPermissions",
        tokensUsed: 5000,
        maxTokens: 200_000,
        model: "claude-sonnet-4-6",
      };

      const result = renderCompactStatusLine(options);
      expect(result).toContain("%");
      // Compact format shows percentage and tokens, not permission mode
      expect(result).toMatch(/\d/); // Contains numbers
    });
  });

  describe("renderMinimalStatusLine", () => {
    test("renders empty string (permission mode not shown)", () => {
      const result = renderMinimalStatusLine("bypassPermissions");
      // Minimal status line intentionally returns empty (permission mode no longer shown)
      expect(result).toBe("");
    });
  });

  describe("renderFooterStatus", () => {
    test("renders footer format", () => {
      const options: StatusLineOptions = {
        permissionMode: "bypassPermissions",
        tokensUsed: 0,
        maxTokens: 200_000,
        model: "claude-sonnet-4-6",
      };

      const result = renderFooterStatus(options);
      expect(result).toContain("Context");
      expect(result).toContain("bypass");
    });
  });

  describe("shouldShowAutoCompactWarning", () => {
    test("returns true for low context", () => {
      const info = calculateContextInfo(180_000, "claude-sonnet-4-6");
      expect(shouldShowAutoCompactWarning(info)).toBe(true);
    });

    test("returns false for normal context", () => {
      const info = calculateContextInfo(100_000, "claude-sonnet-4-6");
      expect(shouldShowAutoCompactWarning(info)).toBe(false);
    });
  });

  describe("renderAutoCompactWarning", () => {
    test("renders critical warning", () => {
      const info = calculateContextInfo(195_000, "claude-sonnet-4-6");
      const warning = renderAutoCompactWarning(info);
      expect(warning).toContain("critical");
      expect(warning).toContain("Auto-compact");
    });

    test("renders low warning", () => {
      // Use 175,000 tokens which leaves 12.5% - in the low range (8-15%)
      const info = calculateContextInfo(175_000, "claude-sonnet-4-6");
      const warning = renderAutoCompactWarning(info);
      expect(warning).toContain("low");
    });

    test("returns empty string for normal context", () => {
      const info = calculateContextInfo(100_000, "claude-sonnet-4-6");
      const warning = renderAutoCompactWarning(info);
      expect(warning).toBe("");
    });
  });
});
