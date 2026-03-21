/**
 * MCP Client Instrumentation - MCP connection telemetry
 * @module telemetry/instrumentation/mcp-client
 */

import { startSpan, type SpanBuilder } from "../tracer.js";
import { metrics } from "../metrics.js";
import { logger } from "../logger.js";

/**
 * MCP connection metrics
 */
interface MCPConnectionMetrics {
  serverName: string;
  transport: string;
  connectedAt: number;
  toolCalls: number;
  errors: number;
  lastLatency?: number;
}

/**
 * Active MCP connections
 */
const activeConnections = new Map<string, MCPConnectionMetrics>();

/**
 * Track MCP connection start
 */
export function trackMCPConnectionStart(
  serverName: string,
  transport: "stdio" | "http" | "sse" | "ws"
): void {
  const span = startSpan("coder.mcp.connect", "client");

  span
    .setAttribute("server_name", serverName)
    .setAttribute("transport", transport)
    .addEvent("mcp.connection_started");

  const startTime = performance.now();

  activeConnections.set(serverName, {
    serverName,
    transport,
    connectedAt: Date.now(),
    toolCalls: 0,
    errors: 0,
  });

  logger.debug("MCP connection started", {
    server_name: serverName,
    transport,
  });

  span.end();
}

/**
 * Track MCP connection success
 */
export function trackMCPConnectionSuccess(serverName: string): void {
  const connection = activeConnections.get(serverName);
  if (!connection) return;

  const span = startSpan("coder.mcp.connected", "client");
  span
    .setAttribute("server_name", serverName)
    .setAttribute("transport", connection.transport)
    .addEvent("mcp.connection_established")
    .setStatus("ok");
  span.end();

  logger.info("MCP connection established", {
    server_name: serverName,
    transport: connection.transport,
  });
}

/**
 * Track MCP connection failure
 */
export function trackMCPConnectionFailure(serverName: string, error: Error | unknown): void {
  const connection = activeConnections.get(serverName);

  const span = startSpan("coder.mcp.connect_failed", "client");
  span
    .setAttribute("server_name", serverName)
    .setAttribute("transport", connection?.transport ?? "unknown")
    .addEvent("mcp.connection_failed")
    .recordError(error);
  span.end();

  // Clean up
  activeConnections.delete(serverName);

  logger.error("MCP connection failed", error, {
    server_name: serverName,
    transport: connection?.transport,
  });
}

/**
 * Track MCP tool call
 */
export async function trackMCPToolCall<T>(
  serverName: string,
  toolName: string,
  fn: () => Promise<T>
): Promise<T> {
  const connection = activeConnections.get(serverName);
  const span = startSpan(`coder.mcp.tool.${toolName}`, "client");

  span
    .setAttribute("server_name", serverName)
    .setAttribute("tool_name", toolName)
    .addEvent("mcp.tool_call_started");

  const startTime = performance.now();

  try {
    const result = await fn();

    const duration = performance.now() - startTime;

    if (connection) {
      connection.toolCalls++;
      connection.lastLatency = duration;
    }

    metrics.recordHistogram("coder.mcp.tool.duration_ms", duration, {
      server_name: serverName,
      tool_name: toolName,
    });

    metrics.incrementCounter("coder.mcp.tool.calls_total", 1, {
      server_name: serverName,
      tool_name: toolName,
    });

    span
      .setAttributes({
        duration_ms: duration,
      })
      .addEvent("mcp.tool_call_completed")
      .setStatus("ok");

    logger.debug("MCP tool call completed", {
      server_name: serverName,
      tool_name: toolName,
      duration_ms: Math.round(duration),
    });

    span.end();
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;

    if (connection) {
      connection.errors++;
    }

    metrics.incrementCounter("coder.mcp.tool.errors_total", 1, {
      server_name: serverName,
      tool_name: toolName,
    });

    span
      .setAttribute("duration_ms", duration)
      .addEvent("mcp.tool_call_failed")
      .recordError(error);

    logger.error("MCP tool call failed", error, {
      server_name: serverName,
      tool_name: toolName,
      duration_ms: Math.round(duration),
    });

    span.end();
    throw error;
  }
}

/**
 * Track MCP disconnection
 */
export function trackMCPDisconnection(serverName: string): void {
  const connection = activeConnections.get(serverName);
  if (!connection) return;

  const duration = Date.now() - connection.connectedAt;

  const span = startSpan("coder.mcp.disconnect", "client");
  span
    .setAttribute("server_name", serverName)
    .setAttribute("transport", connection.transport)
    .setAttribute("connection_duration_ms", duration)
    .setAttribute("total_tool_calls", connection.toolCalls)
    .setAttribute("total_errors", connection.errors)
    .addEvent("mcp.disconnected")
    .setStatus("ok");
  span.end();

  activeConnections.delete(serverName);

  logger.info("MCP disconnected", {
    server_name: serverName,
    transport: connection.transport,
    duration_ms: Math.round(duration),
    tool_calls: connection.toolCalls,
    errors: connection.errors,
  });
}

/**
 * Get active MCP connections
 */
export function getActiveMCPConnections(): MCPConnectionMetrics[] {
  return Array.from(activeConnections.values());
}

/**
 * Get MCP connection summary
 */
export function getMCPConnectionSummary(): Record<string, unknown> {
  const connections = getActiveMCPConnections();
  return {
    active_count: connections.length,
    connections: connections.map((c) => ({
      server_name: c.serverName,
      transport: c.transport,
      tool_calls: c.toolCalls,
      errors: c.errors,
      uptime_ms: Date.now() - c.connectedAt,
    })),
  };
}
