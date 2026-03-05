/**
 * Metrics routes for historical metrics and activity analytics
 * - Get metrics history
 * - Get metrics summary with stats
 * - Get latest activity
 * - Get activity summary
 */

import { Hono } from "hono";

import { getMetrics, getMetricsSummary } from "../../lib/metrics";
import {
  getLatestActivity,
  getActivitySummary,
} from "../../lib/activities";

import { MetricsQuerySchema } from "@ebowwa/codespaces-types/runtime/api";
import { validateQuery } from "../utils";

/**
 * Register metrics and activity analytics routes
 */
export function registerMetricsRoutes(app: Hono): void {
  /**
   * GET /api/environments/:id/metrics - Get metrics history
   * Query params: ?hours=24&limit=100
   */
  app.get("/api/environments/:id/metrics", async (c) => {
    const id = c.req.param("id");
    const validation = validateQuery(MetricsQuerySchema, {
      hours: c.req.query("hours") || "24",
      limit: c.req.query("limit") || "100",
    });

    if (!validation.success) {
      return c.json({ success: false, error: validation.error }, 400);
    }

    const { hours, limit } = validation.data;

    try {
      const metrics = getMetrics(id, { hours, limit });
      return c.json({ success: true, metrics });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * GET /api/environments/:id/metrics/summary - Get metrics summary with stats
   * Query params: ?hours=24
   */
  app.get("/api/environments/:id/metrics/summary", async (c) => {
    const id = c.req.param("id");
    const validation = validateQuery(MetricsQuerySchema, {
      hours: c.req.query("hours") || "24",
      limit: "100", // Not used but required by schema
    });

    if (!validation.success) {
      return c.json({ success: false, error: validation.error }, 400);
    }

    const { hours } = validation.data;

    try {
      const summary = getMetricsSummary(id, hours);
      if (!summary) {
        return c.json({ success: false, error: "No metrics found" }, 404);
      }
      return c.json({ success: true, summary });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * GET /api/environments/:id/activities/latest - Get latest activity for an environment
   */
  app.get("/api/environments/:id/activities/latest", async (c) => {
    const id = c.req.param("id");
    if (!id) {
      return c.json({ success: false, error: "ID is required" }, 400);
    }

    try {
      const activity = getLatestActivity(id);
      if (!activity) {
        return c.json({ success: false, error: "No activities found" }, 404);
      }
      return c.json({ success: true, activity });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * GET /api/environments/:id/activities/summary - Get activity summary for an environment
   * Query params: hours (default: 24)
   */
  app.get("/api/environments/:id/activities/summary", async (c) => {
    const id = c.req.param("id");
    if (!id) {
      return c.json({ success: false, error: "ID is required" }, 400);
    }

    try {
      const hours = c.req.query("hours");
      const summary = getActivitySummary(id, hours ? parseInt(hours, 10) : 24);
      return c.json({ success: true, summary });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });
}
