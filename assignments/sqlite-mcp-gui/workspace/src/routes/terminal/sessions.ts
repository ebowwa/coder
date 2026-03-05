import { Hono } from "hono";
import {
  getAllSessionInfo,
  getSessionInfo,
  closeSession,
} from "@codespaces/terminal";

/**
 * Register all terminal session management routes
 */
export function registerSessionRoutes(app: Hono) {
  /**
   * GET /api/terminal/sessions - List all terminal sessions
   */
  app.get("/api/terminal/sessions", (c) => {
    const sessions = getAllSessionInfo();

    return c.json({
      success: true,
      sessions,
      count: sessions.length,
    });
  });

  /**
   * GET /api/terminal/sessions/:id - Get specific session info
   */
  app.get("/api/terminal/sessions/:id", (c) => {
    const session = getSessionInfo(c.req.param("id"));

    if (!session) {
      return c.json({ success: false, error: "Session not found" }, 404);
    }

    return c.json({
      success: true,
      session,
    });
  });

  /**
   * DELETE /api/terminal/sessions/:id - Close a specific session
   */
  app.delete("/api/terminal/sessions/:id", (c) => {
    const sessionId = c.req.param("id");
    const closed = closeSession(sessionId);

    if (!closed) {
      return c.json(
        { success: false, error: "Session not found or already closed" },
        404,
      );
    }

    return c.json({
      success: true,
      message: "Session closed",
    });
  });
}
