/**
 * Activity tracking routes for user activity logging
 * - Update activity tracking
 * - Get activities for environment
 * - Delete all activities for environment
 */

import { Hono } from "hono";

import {
  addActivity,
  getActivitiesForEnvironment,
  deleteActivitiesForEnvironment,
} from "../../lib/activities";
import { updateActivity, getMetadata } from "../../lib/metadata";

import { UpdateActivityRequestSchema } from "@ebowwa/codespaces-types/runtime/api";
import { validateRequest } from "../utils";

/**
 * Register activity tracking routes
 */
export function registerActivityRoutes(app: Hono): void {
  /**
   * PUT /api/environments/:id/activity - Update activity tracking
   */
  app.put("/api/environments/:id/activity", async (c) => {
    const id = c.req.param("id");
    if (!id) {
      return c.json({ success: false, error: "ID is required" }, 400);
    }

    try {
      const body = await c.req.json();
      const validation = validateRequest(UpdateActivityRequestSchema, body);

      if (!validation.success) {
        return c.json({ success: false, error: validation.error }, 400);
      }

      updateActivity(id, validation.data);

      // Also track this activity in the activities log
      try {
        // Get environment name for better tracking
        const metadata = getMetadata(id);
        const environmentName = metadata?.project || id;

        // Determine action type based on what was updated
        const actions: string[] = [];
        if (validation.data.hoursActive !== undefined) {
          actions.push("hours_updated");
        }
        if (validation.data.lastActive !== undefined) {
          actions.push("last_active_updated");
        }
        if (validation.data.activePorts !== undefined) {
          actions.push("ports_updated");
        }

        // Log activity
        for (const action of actions) {
          addActivity({
            environmentId: id,
            action,
            environmentName,
            details: body.details || undefined,
          });
        }
      } catch (trackError) {
        // Log but don't fail the request if tracking fails
        console.error("Failed to track activity:", trackError);
      }

      return c.json({ success: true });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * GET /api/environments/:id/activities - Get activities for a specific environment
   * Query params: limit, hours, since, until, action
   */
  app.get("/api/environments/:id/activities", async (c) => {
    const id = c.req.param("id");
    if (!id) {
      return c.json({ success: false, error: "ID is required" }, 400);
    }

    try {
      const limit = c.req.query("limit");
      const hours = c.req.query("hours");
      const since = c.req.query("since");
      const until = c.req.query("until");
      const action = c.req.query("action");

      const options: Partial<{
        limit: number;
        hours: number;
        since: string;
        until: string;
        action: string;
      }> = {};

      if (limit) options.limit = parseInt(limit, 10);
      if (hours) options.hours = parseInt(hours, 10);
      if (since) options.since = since;
      if (until) options.until = until;
      if (action) options.action = action;

      const activities = getActivitiesForEnvironment(id, options);
      return c.json({ success: true, activities });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * DELETE /api/environments/:id/activities - Delete all activities for an environment
   */
  app.delete("/api/environments/:id/activities", async (c) => {
    const id = c.req.param("id");
    if (!id) {
      return c.json({ success: false, error: "ID is required" }, 400);
    }

    try {
      const deleted = deleteActivitiesForEnvironment(id);
      return c.json({ success: true, deleted });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });
}
