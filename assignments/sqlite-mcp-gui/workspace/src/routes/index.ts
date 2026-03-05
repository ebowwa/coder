/**
 * Routes barrel export
 * Centralizes all route registration functions for the application
 */

import { Hono } from "hono";
import type { GLMClient } from "@codespaces/ai";
import type { HetznerClient } from "../lib/hetzner";
import { registerEnvironmentRoutes } from "./environments";
import { registerSSHRoutes } from "./ssh";
import { registerDopplerRoutes } from "./doppler";
import { registerGitHubRoutes } from "./github";
import { registerFilesRoutes } from "./files";
import { registerMacOSRoutes } from "./macos";
import { registerTerminalRoutes } from "./terminal";
import { registerAIRoutes } from "./ai";
import { registerHetznerRoutes } from "./hetzner";
import { registerMetricsRoutes } from "./metrics";
import { registerActivitiesRoutes } from "./activities";
import { registerAdminRoutes } from "./admin";
import { registerCostsRoutes } from "./costs";

export { registerEnvironmentRoutes } from "./environments";
export { registerSSHRoutes } from "./ssh";
export { registerDopplerRoutes } from "./doppler";
export { registerGitHubRoutes } from "./github";
export { registerFilesRoutes } from "./files";
export { registerMacOSRoutes } from "./macos";
export { registerTerminalRoutes } from "./terminal";
export { registerAIRoutes } from "./ai";
export { registerHetznerRoutes } from "./hetzner";
export { registerMetricsRoutes } from "./metrics";
export { registerActivitiesRoutes } from "./activities";
export { registerAdminRoutes } from "./admin";
export { registerCostsRoutes } from "./costs";

/**
 * Register all application routes
 * @param app - Hono application instance
 * @param hetznerClient - Hetzner API client (null in mock mode)
 * @param glmClient - GLM AI client (null if not configured)
 */
export function registerAllRoutes(
  app: Hono,
  hetznerClient: HetznerClient | null,
  glmClient: GLMClient | null,
): void {
  registerEnvironmentRoutes(app, hetznerClient);
  registerSSHRoutes(app, hetznerClient);
  registerDopplerRoutes(app);
  registerGitHubRoutes(app);
  registerFilesRoutes(app);
  registerMacOSRoutes(app);
  registerTerminalRoutes(app, hetznerClient);
  registerAIRoutes(app, glmClient);
  registerHetznerRoutes(app, hetznerClient);
  registerMetricsRoutes(app);
  registerActivitiesRoutes(app);
  registerAdminRoutes(app);
  registerCostsRoutes(app, hetznerClient);
}
