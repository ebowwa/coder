/**
 * Metrics-related routes
 * Handles resource metrics and SSH pool monitoring
 */

import { Hono } from "hono";
import type { Context } from "hono";

import {
  InsertMetricRequestSchema,
} from "@ebowwa/codespaces-types/runtime/api";

import {
  insertMetric,
  getSSHPoolMetrics,
  getSSHPoolSummary,
} from "../lib/metrics";

import {
  getActiveSSHConnections,
} from "@codespaces/terminal";

import {
  validateRequest,
} from "./utils";

/**
 * Register all metrics routes
 */
export function registerMetricsRoutes(app: Hono): void {
  /**
   * POST /api/metrics - Manually insert a metric (for testing)
   */
  app.post("/api/metrics", async (c: Context) => {
    try {
      const body = await c.req.json();
      const validation = validateRequest(InsertMetricRequestSchema, body);

      if (!validation.success) {
        return c.json({ success: false, error: validation.error }, 400);
      }

      const {
        environmentId,
        cpuPercent,
        memoryPercent,
        memoryUsed,
        memoryTotal,
        diskPercent,
        diskUsed,
        diskTotal,
        gpuPercent,
        gpuMemoryUsed,
        gpuMemoryTotal,
      } = validation.data;

      const metricId = insertMetric({
        environmentId: environmentId.toString(),
        cpuPercent,
        memoryPercent,
        memoryUsed,
        memoryTotal,
        diskPercent,
        diskUsed,
        diskTotal,
        gpuPercent,
        gpuMemoryUsed,
        gpuMemoryTotal,
      });

      return c.json({ success: true, id: metricId });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * GET /api/admin/ssh-pool - SSH connection pool monitoring
   * Returns detailed statistics about active SSH connections
   */
  app.get("/api/admin/ssh-pool", (c: Context) => {
    const stats = getActiveSSHConnections();
    return c.json({
      success: true,
      ...stats,
    });
  });

  /**
   * GET /api/admin/ssh-pool/metrics - SSH pool metrics history
   * Query params: hours (default 24), limit
   */
  app.get("/api/admin/ssh-pool/metrics", (c: Context) => {
    const { hours, limit } = c.req.query();

    const metrics = getSSHPoolMetrics({
      hours: hours ? parseInt(hours as string) : 24,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    return c.json({
      success: true,
      metrics,
    });
  });

  /**
   * GET /api/admin/ssh-pool/summary - SSH pool metrics summary
   * Query params: hours (default 24)
   */
  app.get("/api/admin/ssh-pool/summary", (c: Context) => {
    const { hours } = c.req.query();

    const summary = getSSHPoolSummary(hours ? parseInt(hours as string) : 24);

    if (!summary) {
      return c.json({ success: false, error: "No metrics data available" }, 404);
    }

    return c.json({
      success: true,
      summary,
    });
  });
}
