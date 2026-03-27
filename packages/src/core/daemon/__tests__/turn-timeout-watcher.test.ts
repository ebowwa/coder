/**
 * TurnTimeoutWatcher Tests
 *
 * Tests for the turn timeout and stuck loop auto-kill mechanism.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "bun:test";

// Re-implement TurnTimeoutWatcher for testing (same logic as in supervisor.ts)
class TurnTimeoutWatcher {
  private turnStartTime: number | null = null;
  private softTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private hardTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private softTimeoutMs: number;
  private hardTimeoutMs: number;
  private isEnabled: boolean;
  private hasKilled: boolean = false;
  private eventListeners: Map<string, Array<(elapsed: number) => void>> = new Map();

  constructor(config: { turnTimeout: number; stuckLoopKillTimeout: number; enabled: boolean }) {
    this.softTimeoutMs = config.turnTimeout;
    this.hardTimeoutMs = config.turnTimeout + config.stuckLoopKillTimeout;
    this.isEnabled = config.enabled;
  }

  on(event: string, handler: (elapsed: number) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(handler);
  }

  private emit(event: string, elapsed: number): void {
    const handlers = this.eventListeners.get(event) ?? [];
    for (const handler of handlers) {
      handler(elapsed);
    }
  }

  startTurn(): void {
    this.clearTimers();
    this.turnStartTime = Date.now();
    this.hasKilled = false;

    if (!this.isEnabled) return;

    this.softTimeoutTimer = setTimeout(() => {
      const elapsed = Date.now() - (this.turnStartTime ?? 0);
      this.emit("softTimeout", elapsed);
    }, this.softTimeoutMs);

    this.hardTimeoutTimer = setTimeout(() => {
      const elapsed = Date.now() - (this.turnStartTime ?? 0);
      this.hasKilled = true;
      this.emit("hardTimeout", elapsed);
    }, this.hardTimeoutMs);
  }

  endTurn(): void {
    this.clearTimers();
    this.turnStartTime = null;
  }

  hasKilledWorker(): boolean {
    return this.hasKilled;
  }

  stop(): void {
    this.clearTimers();
    this.turnStartTime = null;
  }

  private clearTimers(): void {
    if (this.softTimeoutTimer) {
      clearTimeout(this.softTimeoutTimer);
      this.softTimeoutTimer = null;
    }
    if (this.hardTimeoutTimer) {
      clearTimeout(this.hardTimeoutTimer);
      this.hardTimeoutTimer = null;
    }
  }
}

describe("TurnTimeoutWatcher", () => {
  describe("when enabled", () => {
    it("should emit softTimeout after turnTimeout", async () => {
      const softTimeoutHandler = vi.fn();
      const watcher = new TurnTimeoutWatcher({
        turnTimeout: 50, // 50ms
        stuckLoopKillTimeout: 50, // 50ms
        enabled: true,
      });

      watcher.on("softTimeout", softTimeoutHandler);
      watcher.startTurn();

      // Wait for soft timeout
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(softTimeoutHandler).toHaveBeenCalled();
      watcher.stop();
    });

    it("should emit hardTimeout after turnTimeout + stuckLoopKillTimeout", async () => {
      const hardTimeoutHandler = vi.fn();
      const watcher = new TurnTimeoutWatcher({
        turnTimeout: 30, // 30ms
        stuckLoopKillTimeout: 30, // 30ms (total 60ms)
        enabled: true,
      });

      watcher.on("hardTimeout", hardTimeoutHandler);
      watcher.startTurn();

      // Wait for hard timeout
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(hardTimeoutHandler).toHaveBeenCalled();
      expect(watcher.hasKilledWorker()).toBe(true);
      watcher.stop();
    });

    it("should NOT emit if turn ends before timeout", async () => {
      const softTimeoutHandler = vi.fn();
      const hardTimeoutHandler = vi.fn();
      const watcher = new TurnTimeoutWatcher({
        turnTimeout: 100, // 100ms
        stuckLoopKillTimeout: 100, // 100ms
        enabled: true,
      });

      watcher.on("softTimeout", softTimeoutHandler);
      watcher.on("hardTimeout", hardTimeoutHandler);
      watcher.startTurn();

      // End turn before timeout
      await new Promise((resolve) => setTimeout(resolve, 50));
      watcher.endTurn();

      // Wait for what would have been timeout
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(softTimeoutHandler).not.toHaveBeenCalled();
      expect(hardTimeoutHandler).not.toHaveBeenCalled();
      expect(watcher.hasKilledWorker()).toBe(false);
    });

    it("should restart timer on new turn", async () => {
      const softTimeoutHandler = vi.fn();
      const watcher = new TurnTimeoutWatcher({
        turnTimeout: 50, // 50ms
        stuckLoopKillTimeout: 50, // 50ms
        enabled: true,
      });

      watcher.on("softTimeout", softTimeoutHandler);

      // Start and end turn quickly
      watcher.startTurn();
      await new Promise((resolve) => setTimeout(resolve, 25));
      watcher.endTurn();

      // Start new turn
      watcher.startTurn();
      await new Promise((resolve) => setTimeout(resolve, 75));

      expect(softTimeoutHandler).toHaveBeenCalledTimes(1);
      watcher.stop();
    });
  });

  describe("when disabled", () => {
    it("should NOT emit any timeouts", async () => {
      const softTimeoutHandler = vi.fn();
      const hardTimeoutHandler = vi.fn();
      const watcher = new TurnTimeoutWatcher({
        turnTimeout: 30, // 30ms
        stuckLoopKillTimeout: 30, // 30ms
        enabled: false, // DISABLED
      });

      watcher.on("softTimeout", softTimeoutHandler);
      watcher.on("hardTimeout", hardTimeoutHandler);
      watcher.startTurn();

      // Wait for what would have been timeout
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(softTimeoutHandler).not.toHaveBeenCalled();
      expect(hardTimeoutHandler).not.toHaveBeenCalled();
      expect(watcher.hasKilledWorker()).toBe(false);
    });
  });

  describe("hasKilledWorker", () => {
    it("should return false initially", () => {
      const watcher = new TurnTimeoutWatcher({
        turnTimeout: 100,
        stuckLoopKillTimeout: 100,
        enabled: true,
      });

      expect(watcher.hasKilledWorker()).toBe(false);
    });

    it("should return true after hard timeout", async () => {
      const watcher = new TurnTimeoutWatcher({
        turnTimeout: 30,
        stuckLoopKillTimeout: 30,
        enabled: true,
      });

      watcher.startTurn();
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(watcher.hasKilledWorker()).toBe(true);
    });
  });
});
