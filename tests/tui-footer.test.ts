#!/usr/bin/env bun
/**
 * Tests for TUI Footer Component
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  TUIFooter,
  getTUIFooter,
  enableTUIFooter,
  disableTUIFooter,
  ANSI,
  type TUIFooterOptions,
} from "../packages/src/interfaces/ui/terminal/tui/tui-footer.js";
import type { PermissionMode } from "../packages/src/schemas/index.js";

describe("TUI Footer", () => {
  describe("ANSI Escape Codes", () => {
    test("SAVE_CURSOR is correct", () => {
      expect(ANSI.SAVE_CURSOR).toBe("\x1b[s");
    });

    test("RESTORE_CURSOR is correct", () => {
      expect(ANSI.RESTORE_CURSOR).toBe("\x1b[u");
    });

    test("CLEAR_LINE is correct", () => {
      expect(ANSI.CLEAR_LINE).toBe("\x1b[2K");
    });

    test("MOVE_TO generates correct sequence", () => {
      expect(ANSI.MOVE_TO(10, 5)).toBe("\x1b[10;5H");
    });

    test("MOVE_TO_BOTTOM generates sequence that moves to bottom", () => {
      // Uses 999;1H to go to bottom, then moves up by offset
      expect(ANSI.MOVE_TO_BOTTOM(0)).toBe("\x1b[999;1H\x1b[1A");
      expect(ANSI.MOVE_TO_BOTTOM(2)).toBe("\x1b[999;1H\x1b[3A");
    });
  });

  describe("TUIFooter Singleton", () => {
    beforeEach(() => {
      TUIFooter.reset();
    });

    afterEach(() => {
      TUIFooter.reset();
    });

    test("getInstance returns singleton", () => {
      const instance1 = TUIFooter.getInstance();
      const instance2 = TUIFooter.getInstance();
      expect(instance1).toBe(instance2);
    });

    test("reset creates new instance", () => {
      const instance1 = TUIFooter.getInstance();
      TUIFooter.reset();
      const instance2 = TUIFooter.getInstance();
      expect(instance1).not.toBe(instance2);
    });

    test("getTUIFooter returns same instance", () => {
      const instance1 = getTUIFooter();
      const instance2 = getTUIFooter();
      expect(instance1).toBe(instance2);
    });
  });

  describe("TUIFooter Enable/Disable", () => {
    beforeEach(() => {
      TUIFooter.reset();
    });

    afterEach(() => {
      TUIFooter.reset();
    });

    test("enable sets isEnabled to true", () => {
      const footer = TUIFooter.getInstance();
      expect(footer.isEnabled()).toBe(false);
      footer.enable();
      expect(footer.isEnabled()).toBe(true);
    });

    test("disable sets isEnabled to false", () => {
      const footer = TUIFooter.getInstance();
      footer.enable();
      expect(footer.isEnabled()).toBe(true);
      footer.disable();
      expect(footer.isEnabled()).toBe(false);
    });

    test("enableTUIFooter convenience function works", () => {
      const footer = enableTUIFooter();
      expect(footer.isEnabled()).toBe(true);
    });

    test("disableTUIFooter convenience function works", () => {
      enableTUIFooter();
      disableTUIFooter();
      expect(getTUIFooter().isEnabled()).toBe(false);
    });
  });

  describe("TUIFooter Terminal Size", () => {
    beforeEach(() => {
      TUIFooter.reset();
    });

    afterEach(() => {
      TUIFooter.reset();
    });

    test("getTerminalSize returns dimensions", () => {
      const footer = TUIFooter.getInstance();
      const size = footer.getTerminalSize();
      expect(size).toHaveProperty("width");
      expect(size).toHaveProperty("height");
      expect(typeof size.width).toBe("number");
      expect(typeof size.height).toBe("number");
    });

    test("enable updates terminal size", () => {
      const footer = TUIFooter.getInstance();
      footer.enable();
      const size = footer.getTerminalSize();
      // Should have actual terminal dimensions or defaults
      expect(size.width).toBeGreaterThan(0);
      expect(size.height).toBeGreaterThan(0);
    });
  });

  describe("TUIFooter Render", () => {
    beforeEach(() => {
      TUIFooter.reset();
    });

    afterEach(() => {
      TUIFooter.reset();
    });

    test("render does nothing when disabled", () => {
      const footer = TUIFooter.getInstance();
      // Not enabled, so render should do nothing
      expect(() => {
        footer.render({
          permissionMode: "default",
          tokensUsed: 1000,
          model: "claude-sonnet-4-6",
        });
      }).not.toThrow();
    });

    test("render works when enabled", () => {
      const footer = TUIFooter.getInstance();
      footer.enable();

      expect(() => {
        footer.render({
          permissionMode: "default",
          tokensUsed: 1000,
          model: "claude-sonnet-4-6",
        });
      }).not.toThrow();
    });

    test("render with all permission modes", () => {
      const footer = TUIFooter.getInstance();
      footer.enable();

      const modes: PermissionMode[] = [
        "default",
        "acceptEdits",
        "bypassPermissions",
        "plan",
        "dontAsk",
      ];

      for (const mode of modes) {
        expect(() => {
          footer.render({
            permissionMode: mode,
            tokensUsed: 0,
            model: "claude-sonnet-4-6",
          });
        }).not.toThrow();
      }
    });

    test("render with different token counts", () => {
      const footer = TUIFooter.getInstance();
      footer.enable();

      const tokenCounts = [0, 100, 1000, 50000, 100000, 150000, 180000, 195000];

      for (const tokens of tokenCounts) {
        expect(() => {
          footer.render({
            permissionMode: "default",
            tokensUsed: tokens,
            model: "claude-sonnet-4-6",
          });
        }).not.toThrow();
      }
    });

    test("renderLoading with spinner", () => {
      const footer = TUIFooter.getInstance();
      footer.enable();

      expect(() => {
        footer.renderLoading({
          permissionMode: "default",
          tokensUsed: 0,
          model: "claude-sonnet-4-6",
          isLoading: true,
        });
      }).not.toThrow();
    });
  });

  describe("TUIFooter Spinner", () => {
    beforeEach(() => {
      TUIFooter.reset();
    });

    afterEach(() => {
      TUIFooter.reset();
    });

    test("startSpinner begins animation", () => {
      const footer = TUIFooter.getInstance();
      footer.enable();

      expect(() => {
        footer.startSpinner({
          permissionMode: "default",
          tokensUsed: 0,
          model: "claude-sonnet-4-6",
          isLoading: true,
        });
      }).not.toThrow();

      footer.stopSpinner();
    });

    test("stopSpinner stops animation", () => {
      const footer = TUIFooter.getInstance();
      footer.enable();

      footer.startSpinner({
        permissionMode: "default",
        tokensUsed: 0,
        model: "claude-sonnet-4-6",
        isLoading: true,
      });

      expect(() => {
        footer.stopSpinner();
      }).not.toThrow();
    });
  });

  describe("TUIFooter Clear", () => {
    beforeEach(() => {
      TUIFooter.reset();
    });

    afterEach(() => {
      TUIFooter.reset();
    });

    test("clear works when enabled", () => {
      const footer = TUIFooter.getInstance();
      footer.enable();

      expect(() => {
        footer.clear();
      }).not.toThrow();
    });

    test("clear does nothing when disabled", () => {
      const footer = TUIFooter.getInstance();
      // Not enabled

      expect(() => {
        footer.clear();
      }).not.toThrow();
    });
  });

  describe("TUIFooter Update Methods", () => {
    beforeEach(() => {
      TUIFooter.reset();
    });

    afterEach(() => {
      TUIFooter.reset();
    });

    test("updateTokens updates token count", () => {
      const footer = TUIFooter.getInstance();
      footer.enable();

      // First render to set lastOptions
      footer.render({
        permissionMode: "default",
        tokensUsed: 0,
        model: "claude-sonnet-4-6",
      });

      expect(() => {
        footer.updateTokens(5000);
      }).not.toThrow();
    });

    test("setLoading updates loading state", () => {
      const footer = TUIFooter.getInstance();
      footer.enable();

      // First render to set lastOptions
      footer.render({
        permissionMode: "default",
        tokensUsed: 0,
        model: "claude-sonnet-4-6",
      });

      expect(() => {
        footer.setLoading(true);
      }).not.toThrow();

      footer.stopSpinner();

      expect(() => {
        footer.setLoading(false);
      }).not.toThrow();
    });
  });
});
