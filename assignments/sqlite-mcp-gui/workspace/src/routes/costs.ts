import { Hono } from "hono";
import type { HetznerClient } from "../lib/hetzner";

/**
 * Register all cost-related routes
 * @param app - Hono application instance
 * @param hetznerClient - Hetzner API client (null in mock mode)
 */
export function registerCostsRoutes(
  app: Hono,
  hetznerClient: HetznerClient | null,
) {
  /**
   * GET /api/environments/costs - Get cost breakdown for all environments
   *
   * Returns monthly and hourly costs based on server types and running status
   */
  app.get("/api/environments/costs", async (c) => {
    if (!hetznerClient) {
      // Mock mode - return empty costs
      return c.json({
        success: true,
        costs: {
          totalMonthly: 0,
          totalHourly: 0,
          runningCount: 0,
          stoppedCount: 0,
          breakdown: [],
        },
      });
    }

    try {
      // Get all servers
      const servers = await hetznerClient.listServers();

      // Get all server types with pricing
      const serverTypes = await hetznerClient.pricing.listServerTypes();

      // Create a price lookup map
      const priceMap = new Map<string, { monthly: number; hourly: number }>();
      serverTypes.forEach((type) => {
        if (type.prices && type.prices[0]) {
          // Hetzner API returns prices in cents, convert to euros
          const monthly = type.prices[0].price_monthly / 100;
          priceMap.set(type.name, {
            monthly,
            hourly: monthly / 730, // 730 hours per month average
          });
        }
      });

      // Build cost breakdown for each server
      const breakdown = servers.map((server) => {
        const prices = priceMap.get(server.server_type.name) || {
          monthly: 5.0,
          hourly: 5.0 / 730,
        };
        const isRunning = server.status === "running";

        return {
          environmentId: server.id.toString(),
          environmentName: server.name,
          serverType: server.server_type.name,
          status: server.status,
          priceMonthly: isRunning ? prices.monthly : 0,
          priceHourly: isRunning ? prices.hourly : 0,
        };
      });

      // Calculate totals
      const runningEnvs = breakdown.filter((e) => e.status === "running");
      const totalMonthly = runningEnvs.reduce((sum, e) => sum + e.priceMonthly, 0);
      const totalHourly = runningEnvs.reduce((sum, e) => sum + e.priceHourly, 0);

      return c.json({
        success: true,
        costs: {
          totalMonthly,
          totalHourly,
          runningCount: runningEnvs.length,
          stoppedCount: servers.length - runningEnvs.length,
          breakdown,
        },
      });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });
}
