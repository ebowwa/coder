/**
 * Bun-powered backend server for AppleScript execution
 * Handles macOS automation requests from the web UI
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { HetznerClient } from "./lib/hetzner";
import { getGLMClient } from "@codespaces/ai";
import { registerAllRoutes } from "./routes";
import { auditConfig } from "./lib/audit";

// Initialize Hetzner client if token is available
let hetznerClient: HetznerClient | null = null;
try {
  const client = new HetznerClient(process.env.HETZNER_API_TOKEN);
  if (client.isAuthenticated) {
    hetznerClient = client;
    console.log("✓ Hetzner API authenticated");
  } else {
    console.warn("Hetzner API token not configured - using mock mode");
  }
} catch {
  console.warn("Hetzner API token not configured - using mock mode");
}

// Initialize GLM-4.7 client if API key is available
const glmClient = getGLMClient();

const app = new Hono();

app.use("*", cors());

// Register all application routes
registerAllRoutes(app, hetznerClient, glmClient);

// Run config audit at startup (non-blocking)
auditConfig().then((result) => {
  if (result.ok) {
    console.log("✓ Config audit passed");
  } else {
    const errors = result.issues.filter((i) => i.severity === "error");
    const warnings = result.issues.filter((i) => i.severity === "warning");
    if (errors.length > 0) {
      console.warn(`Config audit: ${errors.length} error(s)`);
      for (const e of errors) console.warn(`  ✗ ${e.message}`);
    }
    if (warnings.length > 0) {
      console.warn(`Config audit: ${warnings.length} warning(s)`);
      for (const w of warnings) console.warn(`  ! ${w.message}`);
    }
  }
}).catch((err) => {
  console.error("Config audit failed:", err);
});

export default {
  fetch: app.fetch,
};
