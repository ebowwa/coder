/**
 * CRUD routes for environment lifecycle operations
 * - List all environments
 * - Create new environment
 * - Delete environment
 * - Start environment
 * - Stop environment
 */

import { Hono } from "hono";

import type { HetznerClient } from "../../lib/hetzner";
import { generateSeedBootstrap } from "../../lib/bootstrap/cloud-init";
import { getMetadata, setMetadata } from "../../lib/metadata";
import {
  generateLoginCommands,
} from "../../lib/seed/install";
import { EnvironmentStatus } from "@ebowwa/codespaces-types/compile";
import { ensureSSHKey, type SSHKeyInfo } from "../../lib/ssh/manager";
import {
  addSSHConfigEntry,
  removeSSHConfigEntry,
  validateSSHConnection,
  ensureCorrectSSHKey,
  waitForSSHReady,
} from "../../lib/ssh/config";

import {
  CreateEnvironmentRequestSchema,
  EnvironmentIdSchema,
} from "@ebowwa/codespaces-types/runtime/api";

import { validateRequest } from "../utils";

/**
 * Map Hetzner server status to Environment status
 *
 * Hetzner API returns: "running" | "stopped" | "starting" | "stopping" | "initializing"
 * Environment uses: "running" | "stopped" | "creating" | "deleting"
 *
 * Mapping:
 * - "running" -> "running"
 * - "stopped" -> "stopped"
 * - "starting" -> "creating"
 * - "stopping" -> "deleting"
 * - "initializing" -> "creating"
 */
function mapHetznerStatusToEnvironment(
  status: EnvironmentStatus,
):
  | EnvironmentStatus.Running
  | EnvironmentStatus.Stopped
  | EnvironmentStatus.Creating
  | EnvironmentStatus.Deleting {
  switch (status) {
    case EnvironmentStatus.Running:
      return EnvironmentStatus.Running;
    case EnvironmentStatus.Stopped:
      return EnvironmentStatus.Stopped;
    case EnvironmentStatus.Starting:
    case EnvironmentStatus.Initializing:
      return EnvironmentStatus.Creating;
    case EnvironmentStatus.Stopping:
      return EnvironmentStatus.Deleting;
    case EnvironmentStatus.Creating:
    case EnvironmentStatus.Deleting:
      // These are already Environment statuses
      return status;
    default:
      // Fallback for unknown statuses
      return EnvironmentStatus.Stopped;
  }
}

/**
 * Register CRUD routes for environment lifecycle operations
 */
export function registerCRUDRoutes(
  app: Hono,
  hetznerClient: HetznerClient | null,
): void {
  /**
   * GET /api/environments - List all environments
   */
  app.get("/api/environments", async (c) => {
    if (!hetznerClient) {
      // Mock mode - return empty list
      return c.json({ success: true, environments: [] });
    }

    try {
      const servers = await hetznerClient.listServers();
      const environments = servers.map((server) => {
        const envId = server.id.toString();
        const metadata = getMetadata(envId);
        return {
          id: envId,
          name: server.name,
          status: mapHetznerStatusToEnvironment(server.status),
          serverId: server.id,
          serverType: server.server_type.name,
          image: server.image
            ? {
                id: server.image.id,
                name: server.image.name,
                description: server.image.description,
                type: server.image.type,
              }
            : undefined,
          location: server.datacenter.location,
          datacenter: server.datacenter,
          ipv4: server.public_net.ipv4.ip,
          ipv6: server.public_net.ipv6?.ip ?? null,
          createdAt: server.created,
          lastUsed: null,
          tags: [],
          bootstrapStatus: metadata?.bootstrapStatus,
        };
      });

      return c.json({ success: true, environments });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * POST /api/environments - Create a new environment
   */
  app.post("/api/environments", async (c) => {
    const body = await c.req.json();
    const validation = validateRequest(CreateEnvironmentRequestSchema, body);

    if (!validation.success) {
      return c.json({ success: false, error: validation.error }, 400);
    }

    const {
      name,
      serverType,
      location: requestedLocation,
      sshKeys,
    } = validation.data;

    // Auto-select compatible location if server type not available in requested location
    let effectiveLocation = requestedLocation;
    let locationNotice: string | undefined;

    if (requestedLocation && hetznerClient) {
      try {
        const serverTypes = await hetznerClient.pricing.listServerTypes();
        const selectedServerType = serverTypes.find(
          (st) => st.name === serverType,
        );

        if (selectedServerType) {
          const isAvailable = selectedServerType.prices?.some(
            (price) => price.location === requestedLocation,
          );

          if (!isAvailable) {
            const availableLocations = selectedServerType.prices
              ?.map((p) => p.location)
              .filter((loc): loc is string => loc !== null);

            if (availableLocations && availableLocations.length > 0) {
              const preferredOrder = ["fsn1", "nbg1", "hel1"];
              effectiveLocation =
                preferredOrder.find((loc) =>
                  availableLocations.includes(loc),
                ) || availableLocations[0];

              console.log(
                `[POST /api/environments] Auto-selected location "${effectiveLocation}" - server type "${serverType}" not available in "${requestedLocation}"`,
              );
              locationNotice = `Auto-selected location: ${effectiveLocation} (${serverType} not available in ${requestedLocation})`;
            }
          }
        }
      } catch (error) {
        console.error(
          "[POST /api/environments] Failed to validate server type/location:",
          error,
        );
      }
    }

    if (!hetznerClient) {
      // Mock mode - simulate creation
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return c.json({
        success: true,
        environment: {
          id: Date.now().toString(),
          name,
          status: "running",
          serverId: Math.floor(Math.random() * 100000),
          serverType: serverType,
          ipv4: "116.203.1.1",
          createdAt: new Date().toISOString(),
          lastUsed: null,
          tags: [],
          image: undefined,
        },
      });
    }

    try {
      // Ensure SSH key exists for authentication
      const sshKeyInfo = await ensureSSHKey(hetznerClient);
      console.log(
        `[Environment] Creating server with SSH key: ${sshKeyInfo.name} (ID: ${sshKeyInfo.keyId})`,
      );

      // Generate cloud-init bootstrap script for seed installation
      const cloudInitScript = generateSeedBootstrap();

      const response = await hetznerClient.createServer({
        name,
        server_type: serverType,
        location: effectiveLocation,
        ssh_keys: [sshKeyInfo.keyId],
        user_data: cloudInitScript,
      });
      // Store SSH key path for terminal sessions
      const envId = response.server.id.toString();
      const serverIp = response.server.public_net.ipv4?.ip || "";
      setMetadata({ id: envId, sshKeyPath: sshKeyInfo.keyPath, bootstrapStatus: "bootstrapping" });

      // Add SSH config entry for easy access: ssh node-<id> or ssh <name>
      if (serverIp) {
        try {
          addSSHConfigEntry({
            id: envId,
            name: response.server.name,
            host: serverIp,
            user: "root",
            keyPath: sshKeyInfo.keyPath,
          });

          // Ensure the correct SSH key is in the agent
          await ensureCorrectSSHKey(sshKeyInfo.keyPath);
        } catch (err) {
          console.warn(`[SSH Config] Failed to add alias: ${err}`);
          // Non-fatal - continue with creation
        }
      }

      // Generate login commands for the new server
      const loginCommands = generateLoginCommands(
        envId,
        response.server.public_net.ipv4?.ip || null,
        "root",
      );

      // Background watcher: poll bootstrap status and update metadata when complete
      if (serverIp) {
        (async () => {
          try {
            // Wait for SSH to become ready (polls every 5s, max 2.5 min)
            const sshResult = await waitForSSHReady(serverIp, sshKeyInfo.keyPath, {
              maxAttempts: 30,
              intervalMs: 5000,
              onAttempt: (attempt, max) => {
                console.log(`[Bootstrap ${envId}] SSH poll ${attempt}/${max}...`);
              },
            });

            if (!sshResult.success) {
              console.error(`[Bootstrap ${envId}] SSH never became ready: ${sshResult.error}`);
              setMetadata({ id: envId, sshKeyPath: sshKeyInfo.keyPath, bootstrapStatus: "failed" });
              return;
            }

            console.log(`[Bootstrap ${envId}] SSH ready, polling cloud-init status...`);

            // Poll /root/.bootstrap-status for completion (every 10s, up to 10 min)
            const { execSSH } = await import("../../lib/ssh/client.js");
            const maxPollAttempts = 60;
            const pollIntervalMs = 10000;

            for (let i = 0; i < maxPollAttempts; i++) {
              try {
                const result = await execSSH(
                  "cat /root/.bootstrap-status 2>/dev/null || echo 'status=missing'",
                  { host: serverIp, user: "root", keyPath: sshKeyInfo.keyPath, timeout: 10 },
                );

                const output = (typeof result === "string" ? result : String(result)).trim();
                const statusLines = output.split("\n").filter((l: string) => l.startsWith("status="));
                const lastStatus = statusLines.length > 0 ? statusLines[statusLines.length - 1] : "";

                if (lastStatus === "status=complete") {
                  console.log(`[Bootstrap ${envId}] Complete`);
                  setMetadata({ id: envId, sshKeyPath: sshKeyInfo.keyPath, bootstrapStatus: "ready" });
                  return;
                }

                if (lastStatus === "status=missing") {
                  // No cloud-init on this server — mark as ready
                  console.log(`[Bootstrap ${envId}] No bootstrap-status file, marking ready`);
                  setMetadata({ id: envId, sshKeyPath: sshKeyInfo.keyPath, bootstrapStatus: "ready" });
                  return;
                }
              } catch (pollErr) {
                console.log(`[Bootstrap ${envId}] Poll attempt ${i + 1} failed: ${pollErr instanceof Error ? pollErr.message : String(pollErr)}`);
              }

              await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
            }

            // Timed out
            console.error(`[Bootstrap ${envId}] Timed out after ${maxPollAttempts * pollIntervalMs / 1000}s`);
            setMetadata({ id: envId, sshKeyPath: sshKeyInfo.keyPath, bootstrapStatus: "failed" });
          } catch (err) {
            console.error(`[Bootstrap ${envId}] Watcher error:`, err);
            setMetadata({ id: envId, sshKeyPath: sshKeyInfo.keyPath, bootstrapStatus: "failed" });
          }
        })();
      }

      return c.json({
        success: true,
        environment: {
          id: envId,
          name: response.server.name,
          status: response.server.status,
          serverId: response.server.id,
          serverType: response.server.server_type.name,
          location: response.server.datacenter.location,
          datacenter: response.server.datacenter,
          ipv4: response.server.public_net.ipv4?.ip || null,
          ipv6: response.server.public_net.ipv6?.ip || null,
          createdAt: response.server.created,
          lastUsed: null,
          tags: [],
          image: response.server.image
            ? {
                id: response.server.image.id,
                name: response.server.image.name,
                description: response.server.image.description,
                type: response.server.image.type,
              }
            : undefined,
        },
        loginCommands,
        ...(locationNotice && { notice: locationNotice }),
      });
    } catch (error) {
      console.error("[POST /api/environments] Failed to create server:", {
        name,
        serverType,
        location: effectiveLocation,
        sshKeys,
        error: String(error),
      });
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * DELETE /api/environments/:id - Delete an environment
   */
  app.delete("/api/environments/:id", async (c) => {
    const validation = validateRequest(EnvironmentIdSchema, c.req.param("id"));

    if (!validation.success) {
      return c.json({ success: false, error: validation.error }, 400);
    }

    const id = validation.data;

    if (!hetznerClient) {
      // Mock mode - simulate deletion
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return c.json({ success: true });
    }

    try {
      await hetznerClient.deleteServer(id);

      // Clean up SSH config entry
      try {
        removeSSHConfigEntry(id);
      } catch (err) {
        console.warn(`[SSH Config] Failed to remove alias: ${err}`);
      }

      return c.json({ success: true });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * POST /api/environments/:id/start - Start an environment
   */
  app.post("/api/environments/:id/start", async (c) => {
    const validation = validateRequest(EnvironmentIdSchema, c.req.param("id"));

    if (!validation.success) {
      return c.json({ success: false, error: validation.error }, 400);
    }

    const id = validation.data;

    if (!hetznerClient) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return c.json({ success: true });
    }

    try {
      await hetznerClient.powerOn(id);
      return c.json({ success: true });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * POST /api/environments/:id/stop - Stop an environment
   */
  app.post("/api/environments/:id/stop", async (c) => {
    const validation = validateRequest(EnvironmentIdSchema, c.req.param("id"));

    if (!validation.success) {
      return c.json({ success: false, error: validation.error }, 400);
    }

    const id = validation.data;

    if (!hetznerClient) {
      return c.json({ success: true });
    }

    try {
      await hetznerClient.powerOff(id);
      return c.json({ success: true });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });
}
