/**
 * Endpoints - HTTP server (Bun.serve)
 * Serves Frontend (React app) and API routes
 *
 * Imports business logic from source/
 */

import { handleRequest, routes } from "./routes.ts";
import { websocket } from "./websocket.ts";
import type { WebSocketData } from "@codespaces/terminal/types";

// Import cleanup functions for background jobs
import { cleanupStaleSessions } from "@codespaces/terminal";

// Import metrics function dynamically to avoid module issues
async function collectSSHPoolMetrics() {
  const { insertSSHPoolMetric } = await import("../../src/lib/metrics.ts");
  try {
    insertSSHPoolMetric();
    console.log("[Metrics] SSH pool metrics metrics collected");
  } catch (err) {
    console.error("[Metrics] Failed to collect SSH pool metrics:", err);
  }
}

const port = parseInt(process.env.PORT || "3000");

// Collect SSH pool metrics every 5 minutes for monitoring
setInterval(
  () => {
    collectSSHPoolMetrics();
  },
  5 * 60 * 1000,
); // 5 minutes

// Clean up stale terminal sessions every 5 minutes
setInterval(
  () => {
    cleanupStaleSessions(30 * 60 * 1000); // 30 minutes
  },
  5 * 60 * 1000,
);

Bun.serve({
  port,
  idleTimeout: 255, // Maximum timeout (~4.25 min) for long-running SSH connections

  routes,

  async fetch(req, server) {
    const url = new URL(req.url);

    // Handle WebSocket upgrade for terminal
    if (url.pathname === "/api/terminal/ws") {
      const upgraded = server.upgrade(req, {
        data: {
          sessionId: null,
          host: null,
          user: "root",
          connectedAt: Date.now(),
        } as WebSocketData,
      });
      if (upgraded) {
        return undefined; // Connection upgraded successfully
      }
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    return handleRequest(req);
  },

  websocket,

  // Global error handler for server-level errors
  error(error) {
    console.error("[Server] Unhandled error:", error);
    // Return a generic error response
    return new Response("Internal Server Error", { status: 500 });
  },

  development: {
    hmr: true,
  },
});

console.log(`Endpoints @ http://localhost:${port}`);
