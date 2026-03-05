/**
 * Activities routes
 * Handles user activity tracking for audit trail and analytics
 */

import { Hono } from "hono";
import type { Hono as HonoType } from "hono";
import {
  AddActivityRequestSchema,
  ActivitiesQueryParamsSchema,
  CleanupActivitiesRequestSchema,
} from "@ebowwa/codespaces-types/runtime/api";
import {
  addActivity,
  getActivities,
  getActivityStatistics,
  deleteOldActivities,
} from "../lib/activities";

function validateRequest<T>(
  schema: { safeParse: (data: unknown) => { success?: boolean; data?: T; error?: any } },
  data: unknown,
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return {
      success: false,
      error: result.error.issues
        .map((e: any) => `${e.path.join(".")}: ${e.message}`)
        .join(", "),
    };
  }
}

/**
 * Register all activities-related routes
 */
export function registerActivitiesRoutes(app: HonoType): void {
  /**
   * GET /api/activities
   * Get activities with optional filtering
   * Query params: environmentId, limit, hours, since, until, action
   */
  app.get("/api/activities", async (c) => {
    try {
      const environmentId = c.req.query("environmentId");
      const limit = c.req.query("limit");
      const hours = c.req.query("hours");
      const since = c.req.query("since");
      const until = c.req.query("until");
      const action = c.req.query("action");

      const options: Partial<{
        environmentId: string;
        limit: number;
        hours: number;
        since: string;
        until: string;
        action: string;
      }> = {};

      if (environmentId) options.environmentId = environmentId;
      if (limit) options.limit = parseInt(limit, 10);
      if (hours) options.hours = parseInt(hours, 10);
      if (since) options.since = since;
      if (until) options.until = until;
      if (action) options.action = action;

      const activities = getActivities(options);
      return c.json({ success: true, activities });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * POST /api/activities
   * Add a new activity entry
   * Logs a user action or system event for audit trail
   */
  app.post("/api/activities", async (c) => {
    try {
      const body = await c.req.json();
      const validation = validateRequest(AddActivityRequestSchema, body);

      if (!validation.success) {
        return c.json({ success: false, error: validation.error }, 400);
      }

      const activityId = addActivity(validation.data);
      return c.json({ success: true, id: activityId });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * GET /api/activities/statistics
   * Get activity statistics
   * Query params: environmentId, hours, since, until, action
   */
  app.get("/api/activities/statistics", async (c) => {
    try {
      const environmentId = c.req.query("environmentId");
      const hours = c.req.query("hours");
      const since = c.req.query("since");
      const until = c.req.query("until");
      const action = c.req.query("action");

      const options: Partial<{
        environmentId: string;
        hours: number;
        since: string;
        until: string;
        action: string;
      }> = {};

      if (environmentId) options.environmentId = environmentId;
      if (hours) options.hours = parseInt(hours, 10);
      if (since) options.since = since;
      if (until) options.until = until;
      if (action) options.action = action;

      const stats = getActivityStatistics(options);
      return c.json({ success: true, statistics: stats });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * DELETE /api/activities/cleanup
   * Delete old activities
   * Query params: environmentId (optional), keepHours (default: 720)
   */
  app.delete("/api/activities/cleanup", async (c) => {
    try {
      const environmentId = c.req.query("environmentId");
      const keepHours = c.req.query("keepHours");

      const deleted = deleteOldActivities(
        environmentId || undefined,
        keepHours ? parseInt(keepHours, 10) : 720,
      );
      return c.json({ success: true, deleted });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });
}
