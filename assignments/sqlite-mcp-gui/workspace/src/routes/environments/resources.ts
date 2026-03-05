/**
 * Resource monitoring routes
 * - Get real-time CPU, memory, disk usage via SSH
 */

import { Hono } from "hono";

import type { HetznerClient } from "../../lib/hetzner";
import { execSSHParallel } from "../../lib/ssh";
import { RESOURCE_COMMANDS, parseResources } from "../../lib/resources";
import { getMetadata } from "../../lib/metadata";
import { insertMetric } from "../../lib/metrics";

/**
 * Register resource monitoring routes
 */
export function registerResourcesRoutes(
  app: Hono,
  hetznerClient: HetznerClient | null,
): void {
  /**
   * GET /api/environments/:id/resources - Get real resource usage via SSH
   * Also stores metrics for time series analysis
   */
  app.get("/api/environments/:id/resources", async (c) => {
    const id = c.req.param("id");

    if (!hetznerClient) {
      return c.json(
        { success: false, error: "Hetzner client not available" },
        500,
      );
    }

    try {
      const serverId = parseInt(id || "");
      const server = await hetznerClient.getServer(serverId);

      if (!server || !server.public_net.ipv4?.ip) {
        return c.json(
          { success: false, error: "Server not found or no IP" },
          404,
        );
      }

      // CRITICAL: Get SSH key path from metadata - required for authentication
      const metadata = getMetadata(id);
      const keyPath = metadata?.sshKeyPath;

      // Execute all resource commands in parallel via SSH with authentication key
      const rawResults = await execSSHParallel(RESOURCE_COMMANDS, {
        host: server.public_net.ipv4.ip,
        user: "root",
        timeout: 5,
        ...(keyPath && { keyPath }),
      });

      // Parse all resource outputs
      const resources = parseResources(
        rawResults as {
          cpu: string;
          memory: string;
          disk: string;
          gpu: string;
          network: string;
          loadavg: string;
          processes: string;
          connections: string;
        },
      );

      // Parse additional metrics for storage
      const networkParts = resources.network?.split(" ") || [];
      const loadavgParts = resources.loadavg?.split(" ") || [];

      // Store metric for time series (fire and forget)
      try {
        insertMetric({
          environmentId: id,
          cpuPercent: resources.cpu ?? 0,
          memoryPercent: resources.memory ?? 0,
          diskPercent: resources.disk ?? 0,
          networkRxBytes: networkParts[0]
            ? parseInt(networkParts[0])
            : undefined,
          networkTxBytes: networkParts[1]
            ? parseInt(networkParts[1])
            : undefined,
          loadAvg1m: loadavgParts[0] ? parseFloat(loadavgParts[0]) : undefined,
          loadAvg5m: loadavgParts[1] ? parseFloat(loadavgParts[1]) : undefined,
          loadAvg15m: loadavgParts[2] ? parseFloat(loadavgParts[2]) : undefined,
          activeProcesses: resources.processes
            ? parseInt(resources.processes)
            : undefined,
          activeConnections: resources.connections
            ? parseInt(resources.connections)
            : undefined,
          gpuPercent: resources.gpuPercent,
          gpuMemoryUsed: resources.gpuMemoryUsed
            ? Math.round(parseFloat(resources.gpuMemoryUsed) * 1024)
            : undefined,
          gpuMemoryTotal: resources.gpuMemoryTotal
            ? Math.round(parseFloat(resources.gpuMemoryTotal) * 1024)
            : undefined,
        });
      } catch (metricError) {
        // Don't fail the request if metric storage fails
        console.warn("Failed to store metric:", metricError);
      }

      return c.json({ success: true, resources });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });
}
