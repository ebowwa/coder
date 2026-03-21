/**
 * MCP Client Telemetry Tests
 *
 * Tests for MCP connection tracking, tool call instrumentation,
 * and connection lifecycle management.
 */

import { describe, it, expect, beforeEach, afterEach, spyOn, mock } from "bun:test";
import {
  trackMCPConnectionStart,
  trackMCPConnectionSuccess,
  trackMCPConnectionFailure,
  trackMCPToolCall,
  trackMCPDisconnection,
  getActiveMCPConnections,
  getMCPConnectionSummary,
} from "../instrumentation/mcp-client.js";
import { resetMetricsRegistry, getMetricsRegistry } from "../metrics.js";

// Mock the logger to avoid console noise in tests
const loggerSpy = {
  debug: spyOn(console, "log").mockImplementation(() => {}),
  info: spyOn(console, "info").mockImplementation(() => {}),
  error: spyOn(console, "error").mockImplementation(() => {}),
  warn: spyOn(console, "warn").mockImplementation(() => {}),
};

describe("MCP Client Telemetry", () => {
  beforeEach(() => {
    // Reset metrics registry before each test
    resetMetricsRegistry();
  });

  afterEach(() => {
    // Clean up any active connections
    const connections = getActiveMCPConnections();
    for (const conn of connections) {
      trackMCPDisconnection(conn.serverName);
    }
  });

  describe("trackMCPConnectionStart", () => {
    it("should track a new MCP connection", () => {
      trackMCPConnectionStart("test-server", "stdio");

      const connections = getActiveMCPConnections();
      expect(connections.length).toBe(1);
      expect(connections[0]?.serverName).toBe("test-server");
      expect(connections[0]?.transport).toBe("stdio");
      expect(connections[0]?.toolCalls).toBe(0);
      expect(connections[0]?.errors).toBe(0);
    });

    it("should track multiple connections", () => {
      trackMCPConnectionStart("server-1", "stdio");
      trackMCPConnectionStart("server-2", "http");
      trackMCPConnectionStart("server-3", "sse");

      const connections = getActiveMCPConnections();
      expect(connections.length).toBe(3);

      const names = connections.map((c) => c.serverName);
      expect(names).toContain("server-1");
      expect(names).toContain("server-2");
      expect(names).toContain("server-3");
    });

    it("should support all transport types", () => {
      const transports: Array<"stdio" | "http" | "sse" | "ws"> = ["stdio", "http", "sse", "ws"];

      for (const transport of transports) {
        trackMCPConnectionStart(`server-${transport}`, transport);
      }

      const connections = getActiveMCPConnections();
      expect(connections.length).toBe(4);

      for (const transport of transports) {
        const conn = connections.find((c) => c.serverName === `server-${transport}`);
        expect(conn?.transport).toBe(transport);
      }
    });

    it("should overwrite existing connection with same name", () => {
      trackMCPConnectionStart("test-server", "stdio");
      trackMCPConnectionStart("test-server", "http");

      const connections = getActiveMCPConnections();
      expect(connections.length).toBe(1);
      expect(connections[0]?.transport).toBe("http");
    });
  });

  describe("trackMCPConnectionSuccess", () => {
    it("should update connection on success", () => {
      trackMCPConnectionStart("test-server", "stdio");
      trackMCPConnectionSuccess("test-server");

      // Connection should still exist
      const connections = getActiveMCPConnections();
      expect(connections.length).toBe(1);
      expect(connections[0]?.serverName).toBe("test-server");
    });

    it("should handle success for non-existent connection", () => {
      // Should not throw
      trackMCPConnectionSuccess("unknown-server");

      const connections = getActiveMCPConnections();
      expect(connections.length).toBe(0);
    });
  });

  describe("trackMCPConnectionFailure", () => {
    it("should remove connection on failure", () => {
      trackMCPConnectionStart("test-server", "stdio");
      trackMCPConnectionFailure("test-server", new Error("Connection failed"));

      const connections = getActiveMCPConnections();
      expect(connections.length).toBe(0);
    });

    it("should handle failure with non-Error object", () => {
      trackMCPConnectionStart("test-server", "stdio");
      trackMCPConnectionFailure("test-server", "string error");

      const connections = getActiveMCPConnections();
      expect(connections.length).toBe(0);
    });

    it("should handle failure for non-existent connection", () => {
      // Should not throw
      trackMCPConnectionFailure("unknown-server", new Error("Failed"));
    });
  });

  describe("trackMCPToolCall", () => {
    it("should track successful tool call", async () => {
      trackMCPConnectionStart("test-server", "stdio");

      const result = await trackMCPToolCall("test-server", "test-tool", async () => {
        return { data: "success" };
      });

      expect(result).toEqual({ data: "success" });

      const connections = getActiveMCPConnections();
      expect(connections[0]?.toolCalls).toBe(1);
      expect(connections[0]?.lastLatency).toBeDefined();
      expect(connections[0]?.lastLatency).toBeGreaterThanOrEqual(0);
    });

    it("should track tool call errors", async () => {
      trackMCPConnectionStart("test-server", "stdio");

      try {
        await trackMCPToolCall("test-server", "failing-tool", async () => {
          throw new Error("Tool failed");
        });
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect((error as Error).message).toBe("Tool failed");
      }

      const connections = getActiveMCPConnections();
      expect(connections[0]?.errors).toBe(1);
      expect(connections[0]?.toolCalls).toBe(0);
    });

    it("should track multiple tool calls", async () => {
      trackMCPConnectionStart("test-server", "stdio");

      await trackMCPToolCall("test-server", "tool-1", async () => "result-1");
      await trackMCPToolCall("test-server", "tool-2", async () => "result-2");
      await trackMCPToolCall("test-server", "tool-3", async () => "result-3");

      const connections = getActiveMCPConnections();
      expect(connections[0]?.toolCalls).toBe(3);
    });

    it("should work with tool call on non-existent server", async () => {
      // Should still execute the function
      const result = await trackMCPToolCall("unknown-server", "test-tool", async () => {
        return "success";
      });

      expect(result).toBe("success");
    });

    it("should record metrics for tool calls", async () => {
      trackMCPConnectionStart("test-server", "stdio");

      await trackMCPToolCall("test-server", "test-tool", async () => "result");

      const metrics = getMetricsRegistry().export();
      const durationMetric = metrics.find(
        (m) => m.name === "coder.mcp.tool.duration_ms"
      );
      const callsMetric = metrics.find(
        (m) => m.name === "coder.mcp.tool.calls_total"
      );

      expect(durationMetric).toBeDefined();
      expect(callsMetric).toBeDefined();
    });
  });

  describe("trackMCPDisconnection", () => {
    it("should remove connection on disconnect", () => {
      trackMCPConnectionStart("test-server", "stdio");
      trackMCPDisconnection("test-server");

      const connections = getActiveMCPConnections();
      expect(connections.length).toBe(0);
    });

    it("should handle disconnect for non-existent connection", () => {
      // Should not throw
      trackMCPDisconnection("unknown-server");
    });

    it("should preserve connection stats until disconnect", async () => {
      trackMCPConnectionStart("test-server", "stdio");

      await trackMCPToolCall("test-server", "tool-1", async () => "result");
      await trackMCPToolCall("test-server", "tool-2", async () => "result");

      try {
        await trackMCPToolCall("test-server", "failing-tool", async () => {
          throw new Error("fail");
        });
      } catch {}

      const beforeDisconnect = getActiveMCPConnections();
      expect(beforeDisconnect[0]?.toolCalls).toBe(2);
      expect(beforeDisconnect[0]?.errors).toBe(1);

      trackMCPDisconnection("test-server");

      const afterDisconnect = getActiveMCPConnections();
      expect(afterDisconnect.length).toBe(0);
    });
  });

  describe("getActiveMCPConnections", () => {
    it("should return empty array when no connections", () => {
      const connections = getActiveMCPConnections();
      expect(connections).toEqual([]);
    });

    it("should return all active connections", () => {
      trackMCPConnectionStart("server-1", "stdio");
      trackMCPConnectionStart("server-2", "http");

      const connections = getActiveMCPConnections();
      expect(connections.length).toBe(2);
    });
  });

  describe("getMCPConnectionSummary", () => {
    it("should return summary with no connections", () => {
      const summary = getMCPConnectionSummary();

      expect(summary.active_count).toBe(0);
      expect(summary.connections).toEqual([]);
    });

    it("should return summary with connections", async () => {
      trackMCPConnectionStart("server-1", "stdio");
      trackMCPConnectionStart("server-2", "http");

      await trackMCPToolCall("server-1", "tool", async () => "result");

      const summary = getMCPConnectionSummary();

      expect(summary.active_count).toBe(2);
      expect(Array.isArray(summary.connections)).toBe(true);

      const server1Conn = (summary.connections as Array<Record<string, unknown>>).find(
        (c) => c.server_name === "server-1"
      );
      expect(server1Conn?.tool_calls).toBe(1);

      const server2Conn = (summary.connections as Array<Record<string, unknown>>).find(
        (c) => c.server_name === "server-2"
      );
      expect(server2Conn?.tool_calls).toBe(0);
    });

    it("should include uptime in summary", async () => {
      trackMCPConnectionStart("test-server", "stdio");

      // Wait a bit for uptime to be measurable
      await new Promise((resolve) => setTimeout(resolve, 10));

      const summary = getMCPConnectionSummary();
      const conn = (summary.connections as Array<Record<string, unknown>>)[0];

      expect(conn?.uptime_ms).toBeDefined();
      expect((conn?.uptime_ms as number)).toBeGreaterThan(0);
    });
  });

  describe("connection lifecycle", () => {
    it("should track complete lifecycle", async () => {
      // Start
      trackMCPConnectionStart("test-server", "stdio");
      let connections = getActiveMCPConnections();
      expect(connections.length).toBe(1);
      expect(connections[0]?.toolCalls).toBe(0);

      // Success
      trackMCPConnectionSuccess("test-server");
      connections = getActiveMCPConnections();
      expect(connections.length).toBe(1);

      // Tool calls
      await trackMCPToolCall("test-server", "tool-1", async () => "result");
      await trackMCPToolCall("test-server", "tool-2", async () => "result");
      connections = getActiveMCPConnections();
      expect(connections[0]?.toolCalls).toBe(2);

      // Disconnect
      trackMCPDisconnection("test-server");
      connections = getActiveMCPConnections();
      expect(connections.length).toBe(0);
    });

    it("should handle failure lifecycle", () => {
      // Start
      trackMCPConnectionStart("test-server", "http");
      let connections = getActiveMCPConnections();
      expect(connections.length).toBe(1);

      // Failure
      trackMCPConnectionFailure("test-server", new Error("Connection refused"));
      connections = getActiveMCPConnections();
      expect(connections.length).toBe(0);
    });

    it("should handle multiple servers with different lifecycles", async () => {
      // Server 1: successful lifecycle
      trackMCPConnectionStart("server-1", "stdio");
      trackMCPConnectionSuccess("server-1");
      await trackMCPToolCall("server-1", "tool", async () => "result");

      // Server 2: failed lifecycle
      trackMCPConnectionStart("server-2", "http");
      trackMCPConnectionFailure("server-2", new Error("Failed"));

      // Server 3: just started
      trackMCPConnectionStart("server-3", "sse");

      const connections = getActiveMCPConnections();
      expect(connections.length).toBe(2); // server-1 and server-3

      const names = connections.map((c) => c.serverName);
      expect(names).toContain("server-1");
      expect(names).toContain("server-3");
      expect(names).not.toContain("server-2");

      // server-1 should have tool calls
      const server1 = connections.find((c) => c.serverName === "server-1");
      expect(server1?.toolCalls).toBe(1);
    });
  });
});
