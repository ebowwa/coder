/**
 * Tests for Aggressive Telemetry - Always-on observability
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  setSession,
  turnStart,
  turnEnd,
  apiCall,
  toolCall,
  error,
  contextUpdate,
  memoryUpdate,
  getState,
  getRealtimeMetrics,
  getAlerts,
  reset,
  wrapAsync,
  wrapSync,
} from "../auto-telemetry.js";

describe("Aggressive Telemetry", () => {
  beforeEach(() => {
    reset();
  });

  afterEach(() => {
    reset();
  });

  describe("Session Management", () => {
    it("should auto-initialize on import", () => {
      const state = getState();
      expect(state).not.toBeNull();
      expect(state?.sessionId).toBeDefined();
      expect(state?.startTime).toBeGreaterThan(0);
    });

    it("should set custom session ID", () => {
      setSession("test-session-123");
      const state = getState();
      expect(state?.sessionId).toBe("test-session-123");
    });
  });

  describe("Turn Tracking", () => {
    it("should track turn start", () => {
      turnStart();
      const state = getState();
      expect(state?.turns).toBe(1);
      expect(state?.currentTurn).not.toBeNull();
    });

    it("should track turn end with tokens", () => {
      turnStart();
      turnEnd(1000, { input: 100, output: 50 });
      const state = getState();
      expect(state?.turns).toBe(1);
      expect(state?.tokens.input).toBe(100);
      expect(state?.tokens.output).toBe(50);
      expect(state?.currentTurn).toBeNull();
    });

    it("should track multiple turns", () => {
      turnStart();
      turnEnd(1000, { input: 100, output: 50 });
      turnStart();
      turnEnd(2000, { input: 200, output: 100 });
      const state = getState();
      expect(state?.turns).toBe(2);
      expect(state?.tokens.input).toBe(300);
      expect(state?.tokens.output).toBe(150);
    });
  });

  describe("API Call Tracking", () => {
    it("should track successful API calls", () => {
      apiCall(500, true, { input: 100, output: 50 });
      const state = getState();
      expect(state?.apiCalls).toBe(1);
      expect(state?.tokens.input).toBe(100);
      expect(state?.tokens.output).toBe(50);
    });

    it("should alert on high latency", () => {
      apiCall(10000, true); // 10s > 5s threshold
      const alerts = getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].type).toBe("high_latency");
    });
  });

  describe("Tool Call Tracking", () => {
    it("should track successful tool calls", () => {
      turnStart();
      toolCall("Read", 150, true);
      const state = getState();
      expect(state?.toolCalls).toBe(1);
      expect(state?.currentTurn?.toolsUsed).toContain("Read");
    });

    it("should track failed tool calls", () => {
      turnStart();
      toolCall("Bash", 500, false, "Command failed");
      const state = getState();
      expect(state?.toolCalls).toBe(1);
      expect(state?.errors).toBe(1);
    });

    it("should increment error count on failures", () => {
      toolCall("Read", 100, true);
      toolCall("Bash", 100, false, "Error");
      const state = getState();
      expect(state?.errors).toBe(1);
    });
  });

  describe("Error Tracking", () => {
    it("should track errors", () => {
      error("TestError", "Something went wrong", { turn: 1 });
      const state = getState();
      expect(state?.errors).toBeGreaterThan(0);
    });

    it("should trigger error alert", () => {
      error("CriticalError", "Critical failure");
      const alerts = getAlerts();
      expect(alerts.some(a => a.type === "error")).toBe(true);
    });
  });

  describe("Context Tracking", () => {
    it("should track context usage", () => {
      contextUpdate(50000, 200000);
      const state = getState();
      expect(state?.currentContextPercent).toBe(25);
    });

    it("should alert on context near full", () => {
      contextUpdate(180000, 200000); // 90%
      const alerts = getAlerts();
      expect(alerts.some(a => a.type === "context_full")).toBe(true);
    });
  });

  describe("Memory Tracking", () => {
    it("should track memory usage", () => {
      memoryUpdate(256);
      const state = getState();
      expect(state?.currentMemoryMB).toBe(256);
    });

    it("should alert on high memory", () => {
      memoryUpdate(600); // 600MB > 500MB threshold
      const alerts = getAlerts();
      expect(alerts.some(a => a.type === "high_memory")).toBe(true);
    });
  });

  describe("Real-time Metrics", () => {
    it("should return comprehensive metrics", () => {
      setSession("test-session");
      turnStart();
      turnEnd(500, { input: 100, output: 50 });
      toolCall("Read", 100, true);

      const metrics = getRealtimeMetrics();
      expect(metrics).not.toBeNull();
      expect(metrics?.sessionId).toBe("test-session");
      expect(metrics?.turns).toBe(1);
      expect(metrics?.tokens.input).toBe(100);
      expect(metrics?.tokens.output).toBe(50);
    });
  });

  describe("Function Wrapping", () => {
    it("should wrap async functions with telemetry", async () => {
      const asyncFn = async (x: number) => {
        await new Promise(r => setTimeout(r, 10));
        return x * 2;
      };

      const wrapped = wrapAsync(asyncFn, "testAsync");
      const result = await wrapped(5);

      expect(result).toBe(10);
    });

    it("should wrap sync functions with telemetry", () => {
      const syncFn = (x: number) => x * 2;
      const wrapped = wrapSync(syncFn, "testSync");
      const result = wrapped(5);

      expect(result).toBe(10);
    });
  });

  describe("Reset Functionality", () => {
    it("should reset all state", () => {
      setSession("test-session");
      turnStart();
      turnEnd(500, { input: 100, output: 50 });
      toolCall("Read", 100, true);

      reset();

      const state = getState();
      expect(state?.turns).toBe(0);
      expect(state?.apiCalls).toBe(0);
      expect(state?.toolCalls).toBe(0);
    });
  });
});
