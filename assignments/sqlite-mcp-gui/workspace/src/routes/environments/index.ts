/**
 * Environment routes barrel export
 * Aggregates all environment-related route modules
 */

import { Hono } from "hono";
import type { HetznerClient } from "../../lib/hetzner";

import { registerCRUDRoutes } from "./crud";
import { registerResourcesRoutes } from "./resources";
import { registerMetadataRoutes } from "./metadata";
import { registerActivityRoutes } from "./activity";
import { registerMetricsRoutes } from "./metrics";
import { registerIntegrationRoutes } from "./integration";

/**
 * Register all environment routes
 * This is the main entry point for environment-related routes
 */
export function registerEnvironmentRoutes(
  app: Hono,
  hetznerClient: HetznerClient | null,
): void {
  registerCRUDRoutes(app, hetznerClient);
  registerResourcesRoutes(app, hetznerClient);
  registerMetadataRoutes(app);
  registerActivityRoutes(app);
  registerMetricsRoutes(app);
  registerIntegrationRoutes(app, hetznerClient);
}

// Re-export individual registrars for direct imports if needed
export { registerCRUDRoutes } from "./crud";
export { registerResourcesRoutes } from "./resources";
export { registerMetadataRoutes } from "./metadata";
export { registerActivityRoutes } from "./activity";
export { registerMetricsRoutes } from "./metrics";
export { registerIntegrationRoutes } from "./integration";
