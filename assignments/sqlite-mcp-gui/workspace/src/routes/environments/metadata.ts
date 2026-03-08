/**
 * Metadata routes for custom metadata storage and plugin configuration
 * - Get environment metadata
 * - Update environment metadata
 * - Delete environment metadata
 */

import { Hono } from "hono";

import { getMetadata, setMetadata, deleteMetadata } from "../../lib/metadata";

import { UpdateMetadataRequestSchema } from "@ebowwa/codespaces-types/runtime/api";
import { validateRequest } from "../utils";

/**
 * Register metadata routes
 */
export function registerMetadataRoutes(app: Hono): void {
  /**
   * GET /api/environments/:id/metadata - Get environment metadata
   */
  app.get("/api/environments/:id/metadata", async (c) => {
    const id = c.req.param("id");
    if (!id) {
      return c.json({ success: false, error: "ID is required" }, 400);
    }

    try {
      const metadata = getMetadata(id);
      return c.json({ success: true, metadata: metadata || { id } });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * PUT /api/environments/:id/metadata - Update environment metadata
   */
  app.put("/api/environments/:id/metadata", async (c) => {
    const id = c.req.param("id");
    if (!id) {
      return c.json({ success: false, error: "ID is required" }, 400);
    }

    try {
      const body = await c.req.json();
      const validation = validateRequest(UpdateMetadataRequestSchema, body);

      if (!validation.success) {
        return c.json({ success: false, error: validation.error }, 400);
      }

      const metadata = {
        id,
        ...validation.data,
        permissions: body.permissions,
      };

      setMetadata(metadata);
      return c.json({ success: true, metadata });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * DELETE /api/environments/:id/metadata - Delete environment metadata
   */
  app.delete("/api/environments/:id/metadata", async (c) => {
    const id = c.req.param("id");
    if (!id) {
      return c.json({ success: false, error: "ID is required" }, 400);
    }

    try {
      deleteMetadata(id);
      return c.json({ success: true });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });
}
