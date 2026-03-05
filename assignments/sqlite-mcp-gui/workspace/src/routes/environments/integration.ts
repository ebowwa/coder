/**
 * Integration routes for external services
 * - Node Agent status check
 * - Seed installation
 * - Seed status
 * - Login commands
 * - Plugins configuration
 *
 * NOTE: The keyPath fix in packages/src/installations/sudo.ts (buildSshPrefix)
 * ensures SSH authentication works correctly with keyPath from metadata.
 * All SSH connections here use metadata?.sshKeyPath via execViaTmux.
 */

import { Hono } from "hono";

import type { HetznerClient } from "../../lib/hetzner";
import { execViaTmux } from "../../lib/ssh";
import { getMetadata, updatePlugins } from "../../lib/metadata";
import {
  installSeed,
  generateLoginCommands,
  getSeedStatus,
} from "../../lib/seed/install";

import { UpdatePluginsRequestSchema } from "@ebowwa/codespaces-types/runtime/api";
import { validateRequest } from "../utils";

/**
 * Register integration routes for external services
 */
export function registerIntegrationRoutes(
  app: Hono,
  hetznerClient: HetznerClient | null,
): void {
  /**
   * GET /api/environments/:id/node-agent - Get Node Agent status from remote server
   */
  app.get("/api/environments/:id/node-agent", async (c) => {
    const id = c.req.param("id");
    if (!id) {
      return c.json({ success: false, error: "ID is required" }, 400);
    }

    if (!hetznerClient) {
      return c.json(
        { success: false, error: "Hetzner client not available" },
        500,
      );
    }

    try {
      const serverId = parseInt(id, 10);
      if (isNaN(serverId)) {
        return c.json({ success: false, error: "Invalid server ID" }, 400);
      }

      console.log(`[Node Agent] Fetching server ${serverId}...`);
      const server = await hetznerClient.getServer(serverId);
      console.log(
        `[Node Agent] Server:`,
        server
          ? `${server.name} (${server.public_net.ipv4?.ip || "no IP"})`
          : "null",
      );

      if (!server || !server.public_net.ipv4?.ip) {
        return c.json(
          { success: false, error: "Server not found or no IP" },
          404,
        );
      }

      const host = server.public_net.ipv4.ip;

      // Try Tailscale IP from metadata if available (faster than SSH)
      // // TODO: Consider making Tailscale the primary connection method for lower latency
      const metadata = getMetadata(id);
      const tailscaleHostname =
        metadata?.permissions?.logins?.tailscale?.hostname;

      if (tailscaleHostname) {
        try {
          const response = await fetch(
            `http://${tailscaleHostname}.tail-scale-alias.ts.net:8911/api/status`,
            {
              signal: AbortSignal.timeout(5000),
            },
          );

          if (response.ok) {
            const status = await response.json();
            return c.json({
              success: true,
              nodeAgent: {
                running: true,
                port: 8911,
                status,
                lastChecked: new Date().toISOString(),
              },
            });
          }
        } catch {
          // Tailscale connection failed, fall through to SSH check
        }
      }

      // Try SSH to check if Node Agent is running and fetch actual status
      // Use bun instead of curl since it may not be installed on minimal images
      let running = false;
      let sshError = undefined;
      let actualStatus = null;

      // Get SSH key path and password from metadata for authentication
      // If no keyPath is provided, the SSH client will try SSH agent automatically
      // If password is available, it will be used for password authentication
      const keyPath = metadata?.sshKeyPath;
      const password = (metadata as any)?.sshPassword;

      try {
        // Use execViaTmux to execute command through persistent tmux session
        // This consolidates SSH connections - uses existing tmux session instead of creating new connection
        const statusOutput = await execViaTmux(
          '/root/.bun/bin/bun -e "try { const r = await fetch(\\"http://localhost:8911/api/status\\"); const t = await r.text(); console.log(\\"STATUS_OK\\" + t); } catch(e) { console.log(\\"STATUS_ERR\\"); }"',
          {
            host,
            user: "root",
            timeout: 10,
            keyPath,
            password,
          },
        );

        console.log("[Node Agent] Raw output:", statusOutput.substring(0, 200));

        running = statusOutput.startsWith("STATUS_OK");

        // Parse actual status if Node Agent is running
        if (running) {
          try {
            actualStatus = JSON.parse(statusOutput.substring(9) || "{}");

            // Log console logs from node-agent
            if (actualStatus.console_logs && actualStatus.console_logs.length > 0) {
              const recentLogs = actualStatus.console_logs.slice(-5);
              console.log(`[Node Agent] Recent console logs (${actualStatus.console_logs.length} total):`);
              for (const log of recentLogs) {
                const levelIcon = log.level === "error" ? "❌" : log.level === "success" ? "✅" : log.level === "warning" ? "⚠️" : "ℹ️";
                console.log(`  ${levelIcon} [${log.timestamp.slice(11, 19)}] ${log.message}`);
              }
            }
          } catch {
            actualStatus = null;
          }
        }
      } catch (error) {
        // SSH failure means node is unreachable, not that Node Agent is down
        sshError = String(error);
        console.error("[Node Agent] SSH error:", sshError);
        // Extract just the error message, not the full command
        const match = sshError.match(/SSHError: (.+?)(?: \||$)/);
        if (match) {
          sshError = match[1];
        }
      }

      return c.json({
        success: true,
        nodeAgent: {
          running,
          port: 8911,
          status: running
            ? (actualStatus || {
                node_id: server.name,
                hostname: server.name,
                tailscale_ip: tailscaleHostname || "unknown",
                capacity: {
                  cpu_percent: 0,
                  memory_percent: 0,
                  disk_percent: 0,
                },
                worktrees: [],
                ralph_loops: [],
              })
            : undefined,
          lastChecked: new Date().toISOString(),
          error: running ? undefined : sshError || "Node Agent not accessible",
        },
      });
    } catch (error) {
      console.error("[Node Agent] Outer catch - Error:", error);
      return c.json({
        success: true,
        nodeAgent: {
          running: false,
          port: 8911,
          lastChecked: new Date().toISOString(),
          error: "Failed to check Node Agent status",
        },
      });
    }
  });

  /**
   * POST /api/environments/:id/seed/install - Install seed on environment
   */
  app.post("/api/environments/:id/seed/install", async (c) => {
    const id = c.req.param("id");
    if (!id) {
      return c.json({ success: false, error: "ID is required" }, 400);
    }

    if (!hetznerClient) {
      return c.json(
        { success: false, error: "Hetzner client not available" },
        500,
      );
    }

    try {
      const serverId = parseInt(id, 10);
      if (isNaN(serverId)) {
        return c.json({ success: false, error: "Invalid server ID" }, 400);
      }

      const server = await hetznerClient.getServer(serverId);

      if (!server || !server.public_net.ipv4?.ip) {
        return c.json(
          { success: false, error: "Server not found or no IP" },
          404,
        );
      }

      const host = server.public_net.ipv4.ip;

      // Get SSH key path from metadata
      const metadata = getMetadata(id);
      const keyPath = metadata?.sshKeyPath;

      // Run seed installation
      const result = await installSeed(
        host,
        keyPath ? { keyPath } : {},
        (msg) => console.log(`[Seed Install] ${msg}`),
      );

      return c.json({ success: result.success, ...result });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: String(error),
          cloned: false,
          setupRun: false,
          seedPath: "/root/seed",
          output: [],
        },
        500,
      );
    }
  });

  /**
   * GET /api/environments/:id/seed/status - Get seed installation status
   */
  app.get("/api/environments/:id/seed/status", async (c) => {
    const id = c.req.param("id");
    if (!id) {
      return c.json({ success: false, error: "ID is required" }, 400);
    }

    if (!hetznerClient) {
      return c.json(
        { success: false, error: "Hetzner client not available" },
        500,
      );
    }

    try {
      const serverId = parseInt(id, 10);
      if (isNaN(serverId)) {
        return c.json({ success: false, error: "Invalid server ID" }, 400);
      }

      const server = await hetznerClient.getServer(serverId);

      if (!server || !server.public_net.ipv4?.ip) {
        return c.json(
          { success: false, error: "Server not found or no IP" },
          404,
        );
      }

      const status = await getSeedStatus(server.public_net.ipv4.ip);

      return c.json({ success: true, ...status });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * GET /api/environments/:id/login - Get login commands for environment
   */
  app.get("/api/environments/:id/login", async (c) => {
    const id = c.req.param("id");
    if (!id) {
      return c.json({ success: false, error: "ID is required" }, 400);
    }

    if (!hetznerClient) {
      return c.json(
        { success: false, error: "Hetzner client not available" },
        500,
      );
    }

    try {
      const serverId = parseInt(id, 10);
      if (isNaN(serverId)) {
        return c.json({ success: false, error: "Invalid server ID" }, 400);
      }

      const server = await hetznerClient.getServer(serverId);

      if (!server) {
        return c.json({ success: false, error: "Server not found" }, 404);
      }

      const commands = generateLoginCommands(
        id,
        server.public_net.ipv4?.ip || null,
        "root",
      );

      return c.json({ success: true, commands });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * PUT /api/environments/:id/plugins - Update plugins configuration
   */
  app.put("/api/environments/:id/plugins", async (c) => {
    const id = c.req.param("id");
    if (!id) {
      return c.json({ success: false, error: "ID is required" }, 400);
    }

    try {
      const body = await c.req.json();
      const validation = validateRequest(UpdatePluginsRequestSchema, body);

      if (!validation.success) {
        return c.json({ success: false, error: validation.error }, 400);
      }

      updatePlugins(
        id,
        (validation.data.plugins || {}) as Record<
          string,
          { enabled: boolean; config?: Record<string, unknown> }
        >,
      );
      return c.json({ success: true });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });
}
