/**
 * File-related routes
 * Handles file listing and preview operations on remote servers
 */

import { Hono } from "hono";
import type { Context } from "hono";
import {
  FilesListRequestSchema,
  FilesPreviewRequestSchema,
} from "@ebowwa/codespaces-types/runtime/api";
import { listFiles, previewFile } from "@codespaces/terminal";
import { validateRequest } from "./utils";

/**
 * Register all file-related routes
 */
export function registerFilesRoutes(app: Hono): void {
  /**
   * POST /api/files/list - List files on remote server
   */
  app.post("/api/files/list", async (c: Context) => {
    const body = await c.req.json();
    const validation = validateRequest(FilesListRequestSchema, body);

    if (!validation.success) {
      return c.json({ success: false, error: validation.error }, 400);
    }

    const { host, user = "root", path = "." } = validation.data;

    try {
      const files = await listFiles(path, { host, user });
      return c.json({ success: true, files });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * POST /api/files/preview - Preview file content
   */
  app.post("/api/files/preview", async (c: Context) => {
    const body = await c.req.json();
    const validation = validateRequest(FilesPreviewRequestSchema, body);

    if (!validation.success) {
      return c.json({ success: false, error: validation.error }, 400);
    }

    const { host, user = "root", path } = validation.data;

    try {
      const preview = await previewFile(path, { host, user });
      return c.json({ success: preview.type !== "error", ...preview });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });
}
