/**
 * API routes for Hono
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { exec } from "child_process";
import { promisify } from "util";
import { z } from "zod";
import { HetznerClient } from "./lib/hetzner";
import { getTokenFromCLI } from "./lib/hetzner/auth";
import { ensureSSHKey, type SSHKeyInfo } from "./lib/ssh/manager";
import {
  execSSHParallel,
  scpUpload,
  scpDownload,
  testSSHConnection,
  getSSHFingerprint,
  listFiles,
  previewFile,
  PathTraversalError,
  getSecurityEvents,
} from "./lib/ssh";
import { RESOURCE_COMMANDS, parseResources } from "./lib/resources";
import {
  getMetadata,
  setMetadata,
  deleteMetadata,
  getAllMetadata,
  updateActivity,
  updatePlugins,
} from "./lib/metadata";
import {
  installSeed,
  getSeedStatus,
  generateLoginCommands,
} from "./lib/seed/install";
import { generateSeedBootstrap } from "./lib/bootstrap/cloud-init";
import {
  CreateEnvironmentRequestSchema,
  EnvironmentIdSchema,
  SSHConnectionRequestSchema,
  SSHTestRequestSchema,
  SSHFingerprintRequestSchema,
  SCPUploadRequestSchema,
  SCPDownloadRequestSchema,
  FilesListRequestSchema,
  FilesPreviewRequestSchema,
  UpdateMetadataRequestSchema,
  UpdateActivityRequestSchema,
  UpdatePluginsRequestSchema,
  VolumeIdSchema,
  CreateVolumeRequestSchema,
  UpdateVolumeRequestSchema,
  AttachVolumeRequestSchema,
  DetachVolumeRequestSchema,
  ResizeVolumeRequestSchema,
  VolumeProtectionRequestSchema,
} from "@ebowwa/codespaces-types/runtime/api";
import { EnvironmentStatus } from "@ebowwa/codespaces-types/compile";
import { tmuxApi } from "@codespaces/terminal/api";

const execAsync = promisify(exec);

/**
 * Map Hetzner server status to Environment status
 *
 * Hetzner API returns: "running" | "stopped" | "starting" | "stopping" | "initializing"
 * Environment uses: "running" | "stopped" | "creating" | "deleting"
 *
 * Mapping:
 * - "running" → "running"
 * - "stopped" → "stopped"
 * - "starting" → "creating"
 * - "stopping" → "deleting"
 * - "initializing" → "creating"
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
 * Helper function to validate request body against Zod schema
 */
function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return {
        success: false,
        error: result.error.issues
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", "),
      };
    }
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// Initialize Hetzner client if token is available
let hetznerClient: HetznerClient | null = null;
try {
  hetznerClient = new HetznerClient(process.env.HETZNER_API_TOKEN || "");
} catch {
  console.warn("Hetzner API token not configured - using mock mode");
}

const api = new Hono();
api.use("*", cors());

export { api };

/**
 * Execute AppleScript and return stdout
 */
async function runAppleScript(script: string): Promise<string> {
  const escapedScript = script.replace(/'/g, "'\\''");
  const cmd = `osascript -e '${escapedScript}'`;

  try {
    const { stdout } = await execAsync(cmd);
    return stdout.trim();
  } catch (error) {
    throw new Error(`AppleScript execution failed: ${error}`);
  }
}

/**
 * GET /api/environments - List all environments
 */
api.get("/environments", async (c) => {
  if (!hetznerClient) {
    return c.json({ success: true, environments: [] });
  }

  try {
    const servers = await hetznerClient.listServers();

    // Debug logging to file
    const debugLog = {
      timestamp: new Date().toISOString(),
      serversLength: servers.length,
      firstServer: servers[0]
        ? {
            id: servers[0].id,
            name: servers[0].name,
            public_net: servers[0].public_net,
            ipv4_mapped: servers[0].public_net.ipv4?.ip ?? null,
            ipv6_mapped: servers[0].public_net.ipv6?.ip ?? null,
            ipv6_exists: "ipv6" in servers[0].public_net,
            ipv6_value: servers[0].public_net.ipv6,
            ipv6_ip_value: servers[0].public_net.ipv6?.ip,
          }
        : null,
    };
    await Bun.write(
      "/tmp/hetzner-debug.json",
      JSON.stringify(debugLog, null, 2),
    );

    console.log("=== DEBUG servers.length:", servers.length, "===");

    // Debug: log raw server data from Hetzner
    if (servers.length > 0) {
      const s = servers[0];
      console.log("=== DEBUG Hetzner Response ===");
      console.log("Server ID:", s.id, "Name:", s.name);
      console.log("Full public_net:", JSON.stringify(s.public_net, null, 2));
      console.log("ipv6 exists?", "ipv6" in s.public_net);
      console.log("ipv6 object:", s.public_net.ipv6);
      console.log("ipv6.ip:", s.public_net.ipv6?.ip);

      // Test the actual mapping logic
      const testIpv4 = s.public_net.ipv4?.ip ?? null;
      const testIpv6 = s.public_net.ipv6?.ip ?? null;
      console.log("Test ipv4 mapping:", testIpv4);
      console.log("Test ipv6 mapping:", testIpv6);
      console.log("ipv6 type:", typeof s.public_net.ipv6);
      console.log(
        "ipv6 keys:",
        s.public_net.ipv6 ? Object.keys(s.public_net.ipv6) : "no ipv6 object",
      );
      console.log("===============================");
    }

    const environments = servers.map((server, index) => {
      console.log(`\n=== DEBUG: Raw server ${index} from Hetzner ===`);
      console.log("Full server object:", JSON.stringify(server, null, 2));
      console.log("server.datacenter:", JSON.stringify(server.datacenter, null, 2));
      console.log("server.datacenter.location:", JSON.stringify(server.datacenter?.location, null, 2));
      console.log("server.image exists:", server.image);
      console.log("server.image value:", server.image);
      console.log("typeof server.image:", typeof server.image);
      console.log(
        "server.image keys:",
        server.image ? Object.keys(server.image) : "N/A",
      );

      const metadata = getMetadata(server.id.toString());

      const imageData = server.image
        ? {
            id: server.image.id,
            name: server.image.name,
            description: server.image.description,
            type: server.image.type,
          }
        : {
            id: 0,
            name: "ubuntu-24.04",
            description: "Ubuntu 24.04 LTS",
            type: "system",
          };

      console.log("Mapped imageData:", imageData);

      return {
        id: server.id.toString(),
        name: server.name,
        status: mapHetznerStatusToEnvironment(server.status),
        serverId: server.id,
        serverType: server.server_type.name,
        image: imageData,
        location: server.datacenter.location,
        datacenter: server.datacenter,
        ipv4: server.public_net.ipv4?.ip ?? null,
        ipv6: server.public_net.ipv6?.ip ?? null,
        createdAt: server.created,
        lastUsed: null,
        tags: [],
        hoursActive: metadata?.hoursActive,
        lastActive: metadata?.lastActive,
        activePorts: metadata?.activePorts,
        description: metadata?.description,
        project: metadata?.project,
        owner: metadata?.owner,
        purpose: metadata?.purpose,
        environmentType: metadata?.environmentType,
        permissions: metadata?.permissions,
      };
    });

    console.log(
      "Sending environments to frontend:",
      JSON.stringify(
        environments.map((e) => ({
          id: e.id,
          name: e.name,
          ipv4: e.ipv4,
          ipv6: e.ipv6,
          location: e.location,
          datacenter: e.datacenter,
        })),
        null,
        2,
      ),
    );
    return c.json({ success: true, environments });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * POST /api/environments - Create a new environment
 */
api.post("/environments", async (c) => {
  const body = await c.req.json();
  const validation = validateRequest(CreateEnvironmentRequestSchema, body);

  if (!validation.success) {
    return c.json({ success: false, error: validation.error }, 400);
  }

  const { name, serverType, location, metadata } = {
    ...validation.data,
    metadata: body.metadata,
  };

  if (!hetznerClient) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const envId = Date.now().toString();
    const env = {
      id: envId,
      name,
      status: "running",
      serverId: Math.floor(Math.random() * 100000),
      serverType: serverType || "cpx11",
      image: {
        id: 0,
        name: "ubuntu-24.04",
        description: "Ubuntu 24.04 LTS",
        type: "system",
      },
      region: location || "nbg1",
      ipv4: "116.203.1.1",
      ipv6: null,
      createdAt: new Date().toISOString(),
      lastUsed: null,
      tags: [],
    };

    if (metadata) {
      setMetadata({ id: envId, ...metadata });
    }

    return c.json({ success: true, environment: { ...env, ...metadata } });
  }

  try {
    // Ensure SSH key exists for authentication
    const sshKeyInfo = await ensureSSHKey(hetznerClient);
    console.log(
      `[Environment] Creating server with SSH key: ${sshKeyInfo.name} (ID: ${sshKeyInfo.keyId})`,
    );

    // Try to create server with requested location
    // If location is incompatible with server type, let Hetzner auto-select
    let response;
    let locationNote = "";

    try {
      // Generate cloud-init bootstrap script for seed installation
      const cloudInitScript = generateSeedBootstrap();

      response = await hetznerClient.createServer({
        name,
        server_type: serverType,
        ssh_keys: [sshKeyInfo.keyId],
        ...(location && { location }),
        user_data: cloudInitScript,
      });
    } catch (error: any) {
      // Check if error is about location incompatibility
      const errorMsg = String(error?.message || error);
      if (location && errorMsg.includes("not available in")) {
        console.log(
          `[Environment] Server type '${serverType}' not available in '${location}', auto-selecting location`,
        );
        locationNote = `Auto-selected location - '${serverType}' not available in '${location}'`;
        // Retry without location to let Hetzner auto-select
        // Generate cloud-init bootstrap script for seed installation
        const cloudInitScript = generateSeedBootstrap();

        response = await hetznerClient.createServer({
          name,
          server_type: serverType,
          ssh_keys: [sshKeyInfo.keyId],
          user_data: cloudInitScript,
        });
      } else {
        throw error;
      }
    }

    // Extract action IDs for frontend polling
    const actionIds = [
      response.action.id,
      ...response.next_actions.map((a) => a.id),
    ];

    const env = {
      id: response.server.id.toString(),
      name: response.server.name,
      status: response.server.status,
      serverId: response.server.id,
      serverType: response.server.server_type.name,
      image: response.server.image
        ? {
            id: response.server.image.id,
            name: response.server.image.name,
            description: response.server.image.description,
            type: response.server.image.type,
          }
        : {
            id: 0,
            name: "ubuntu-24.04",
            description: "Ubuntu 24.04 LTS",
            type: "system",
          },
      location: response.server.datacenter.location,
      datacenter: response.server.datacenter,
      ipv4: response.server.public_net.ipv4?.ip || null,
      ipv6: response.server.public_net.ipv6?.ip || null,
      createdAt: response.server.created,
      lastUsed: null,
      tags: [],
    };

    // Save metadata with SSH key path for terminal sessions
    if (metadata) {
      setMetadata({ id: env.id, ...metadata });
    }
    // Always store SSH key path for terminal authentication
    setMetadata({ id: env.id, sshKeyPath: sshKeyInfo.keyPath });

    // Generate login commands for the new VPS
    const loginCommands = generateLoginCommands(env.id, env.ipv4);

    // ============================================================================
    // NOTE: Cloud-init is now used for seed installation (user_data parameter)
    // Seed will be installed automatically during first boot.
    // ============================================================================
    //
    // BACKGROUND INSTALL (PRESERVED FOR FALLBACK/RE-SYNC):
    // The following code can be re-enabled for terminal-triggered installation
    // or as a fallback if cloud-init fails. This is useful for:
    // - Re-running seed installation if cloud-init partially failed
    // - Manual seed updates without rebuilding the server
    // - Terminal-based seed synchronization
    //
    // Uncomment to enable background seed installation via SSH:
    //
    // setTimeout(async () => {
    //   try {
    //     // Wait for actions to complete (server boot)
    //     let allComplete = false;
    //     let attempts = 0;
    //     const maxAttempts = 60; // 2 minutes max
    //
    //     while (!allComplete && attempts < maxAttempts) {
    //       await new Promise((resolve) => setTimeout(resolve, 2000));
    //
    //       // Check all actions - must use Promise.all for async predicates
    //       const actionResults = await Promise.all(
    //         actionIds.map(async (id) => {
    //           try {
    //             const action = await hetznerClient?.actions.get(parseInt(id, 10));
    //             return action?.status === "success";
    //           } catch {
    //             return false;
    //           }
    //         }),
    //       );
    //       allComplete = actionResults.every((result) => result === true);
    //       attempts++;
    //     }
    //
    //     if (allComplete && env.ipv4) {
    //       console.log(`[Seed] Server ${env.id} ready, installing seed...`);
    //       const installResult = await installSeed(env.ipv4, { keyPath: sshKeyInfo.keyPath });
    //       console.log(`[Seed] Installation result for ${env.id}:`, installResult);
    //     }
    //   } catch (error) {
    //     console.error(`[Seed] Background installation failed for ${env.id}:`, error);
    //   }
    // }, 5000); // Start checking after 5 seconds
    //
    // ============================================================================

    // Return environment with action IDs for polling and login commands
    return c.json({
      success: true,
      environment: { ...env, ...metadata },
      login: loginCommands,
      actions: actionIds,
      nextPollAt: Date.now() + 2000, // Suggest polling in 2 seconds
      seedInstall: "cloud-init", // Indicate seed will be installed via cloud-init
      ...(locationNote && { notice: locationNote }),
    });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * DELETE /api/environments/:id - Delete an environment
 */
api.delete("/environments/:id", async (c) => {
  const validation = validateRequest(EnvironmentIdSchema, c.req.param("id"));

  if (!validation.success) {
    return c.json({ success: false, error: validation.error }, 400);
  }

  const id = validation.data;

  if (!hetznerClient) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return c.json({ success: true });
  }

  try {
    await hetznerClient.deleteServer(id);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * POST /api/environments/:id/start - Start an environment
 */
api.post("/environments/:id/start", async (c) => {
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
    const action = await hetznerClient.powerOn(id);
    return c.json({
      success: true,
      actionId: action.id,
      nextPollAt: Date.now() + 2000, // Suggest polling in 2 seconds
    });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * POST /api/environments/:id/stop - Stop an environment
 */
api.post("/environments/:id/stop", async (c) => {
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

/**
 * POST /api/screenshot - Take a screenshot
 */
api.post("/screenshot", async (c) => {
  const timestamp = Date.now();
  const screenshotPath = `/tmp/screenshot-${timestamp}.png`;

  const script = `do shell script "screencapture -x " & quoted form of "${screenshotPath}"`;

  try {
    await runAppleScript(script);
    return c.json({ success: true, path: screenshotPath });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * GET /api/macos/window/focused - Get focused window info with screenshot
 */
api.get("/macos/window/focused", async (c) => {
  const timestamp = Date.now();
  const screenshotPath = `/tmp/screenshot-${timestamp}.png`;

  const script = `
    tell application "System Events"
      set frontApp to name of first application process whose frontmost is true
      set frontWindow to missing value
      try
        set frontWindow to name of front window of application process frontApp
      end try
      return frontApp & "||" & frontWindow
    end tell
  `;

  const screenshotScript = `do shell script "screencapture -x " & quoted form of "${screenshotPath}"`;

  try {
    // Get window info
    const result = await runAppleScript(script);
    const [app, title] = result.split("||");

    // Take screenshot
    await runAppleScript(screenshotScript);

    // Read screenshot and convert to base64
    const { stdout: base64 } = await execAsync(`base64 -i "${screenshotPath}"`);
    const dataUrl = `data:image/png;base64,${base64.trim()}`;

    // Clean up temp file
    await execAsync(`rm "${screenshotPath}"`);

    return c.json({
      success: true,
      app,
      title: title || "",
      screenshot: dataUrl,
    });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * POST /api/ssh - Open SSH connection in Terminal
 */
api.post("/ssh", async (c) => {
  const body = await c.req.json();
  const validation = validateRequest(SSHConnectionRequestSchema, body);

  if (!validation.success) {
    return c.json({ success: false, error: validation.error }, 400);
  }

  const { host, user = "root" } = validation.data;

  const script = `tell application "Terminal" activate do script "ssh ${user}@${host}" end tell`;

  try {
    await runAppleScript(script);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * GET /api/environments/:id/resources - Get real resource usage via SSH
 */
api.get("/environments/:id/resources", async (c) => {
  const validation = validateRequest(EnvironmentIdSchema, c.req.param("id"));

  if (!validation.success) {
    return c.json({ success: false, error: validation.error }, 400);
  }

  const id = validation.data;

  if (!hetznerClient) {
    return c.json(
      { success: false, error: "Hetzner client not available" },
      500,
    );
  }

  try {
    const server = await hetznerClient.getServer(id);

    if (!server || !server.public_net.ipv4?.ip) {
      return c.json(
        { success: false, error: "Server not found or no IP" },
        404,
      );
    }

    // Get SSH key path from metadata - required for authentication
    const metadata = getMetadata(id);
    const keyPath = metadata?.sshKeyPath;
    console.log(`[Resources API] Server ${id}: keyPath="${keyPath}", metadata=`, metadata);

    // Execute resource commands via SSH with authentication key
    const rawResults = await execSSHParallel(RESOURCE_COMMANDS, {
      host: server.public_net.ipv4.ip,
      user: "root",
      timeout: 5,
      ...(keyPath && { keyPath }),
    });

    const resources = parseResources(
      rawResults as {
        cpu: string;
        memory: string;
        disk: string;
        gpu: string;
      },
    );

    return c.json({ success: true, resources });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * POST /api/ssh/test - Test SSH connection
 */
api.post("/ssh/test", async (c) => {
  const body = await c.req.json();
  const validation = validateRequest(SSHTestRequestSchema, body);

  if (!validation.success) {
    return c.json({ success: false, error: validation.error }, 400);
  }

  const { host, user = "root", port = 22 } = validation.data;

  try {
    const connected = await testSSHConnection({ host, user, port });
    return c.json({ success: connected, connected });
  } catch (error) {
    return c.json(
      { success: false, connected: false, error: String(error) },
      500,
    );
  }
});

/**
 * POST /api/ssh/fingerprint - Get SSH fingerprint
 */
api.post("/ssh/fingerprint", async (c) => {
  const body = await c.req.json();
  const validation = validateRequest(SSHFingerprintRequestSchema, body);

  if (!validation.success) {
    return c.json({ success: false, error: validation.error }, 400);
  }

  const { host, user = "root", port = 22 } = validation.data;

  try {
    const fingerprint = await getSSHFingerprint({ host, user, port });
    return c.json({ success: true, fingerprint });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * POST /api/scp/upload - Upload file via SCP
 */
api.post("/scp/upload", async (c) => {
  const contentType = c.req.header("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    const host = formData.get("host") as string;
    const destination = formData.get("destination") as string;

    if (!host || !destination || !file) {
      return c.json(
        { success: false, error: "Host, destination, and file are required" },
        400,
      );
    }

    try {
      const tempDir = "/tmp/cheapspaces-uploads";
      await Bun.spawn(["mkdir", "-p", tempDir], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const tempPath = `${tempDir}/${Date.now()}-${file.name}`;
      const fileBuffer = await file.arrayBuffer();
      const blob = new Blob([fileBuffer], { type: file.type });
      await Bun.write(tempPath, blob);

      const success = await scpUpload({ host, source: tempPath, destination });
      await Bun.spawn(["rm", tempPath], { stdout: "pipe", stderr: "pipe" });

      return c.json({ success });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  } else {
    const body = await c.req.json();
    const validation = validateRequest(SCPUploadRequestSchema, body);

    if (!validation.success) {
      return c.json({ success: false, error: validation.error }, 400);
    }

    const {
      host,
      user = "root",
      source,
      destination,
      recursive = false,
      preserve = false,
    } = validation.data;

    try {
      const success = await scpUpload({
        host,
        user,
        source,
        destination,
        recursive,
        preserve,
      });
      return c.json({ success });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  }
});

/**
 * POST /api/scp/download - Download file via SCP
 */
api.post("/scp/download", async (c) => {
  const body = await c.req.json();
  const validation = validateRequest(SCPDownloadRequestSchema, body);

  if (!validation.success) {
    return c.json({ success: false, error: validation.error }, 400);
  }

  const {
    host,
    user = "root",
    source,
    destination,
    recursive = false,
    preserve = false,
  } = validation.data;

  try {
    const success = await scpDownload({
      host,
      user,
      source,
      destination,
      recursive,
      preserve,
    });
    return c.json({ success });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * POST /api/files/list - List files on remote server
 */
api.post("/files/list", async (c) => {
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
    // SECURITY: Handle path traversal errors specially
    if (error instanceof PathTraversalError) {
      console.error(
        `[SECURITY] Path traversal blocked in /api/files/list:`,
        {
          host,
          user,
          attemptedPath: error.attemptedPath,
          reason: error.reason,
          timestamp: new Date().toISOString(),
        },
      );
      return c.json(
        {
          success: false,
          error: "Access denied: invalid path",
          code: "PATH_TRAVERSAL_BLOCKED",
        },
        403,
      );
    }
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * POST /api/files/preview - Preview file content
 */
api.post("/files/preview", async (c) => {
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
    // SECURITY: Handle path traversal errors specially
    if (error instanceof PathTraversalError) {
      console.error(
        `[SECURITY] Path traversal blocked in /api/files/preview:`,
        {
          host,
          user,
          attemptedPath: error.attemptedPath,
          reason: error.reason,
          timestamp: new Date().toISOString(),
        },
      );
      return c.json(
        {
          success: false,
          error: "Access denied: invalid path",
          code: "PATH_TRAVERSAL_BLOCKED",
        },
        403,
      );
    }
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * GET /api/health - Health check
 */
api.get("/health", (c) => {
  return c.json({ status: "ok", platform: process.platform });
});

/**
 * GET /api/auth/status - Get current authentication status
 */
api.get("/auth/status", (c) => {
  const envToken = process.env.HETZNER_API_TOKEN || "";
  const cliToken = getTokenFromCLI();

  return c.json({
    success: true,
    auth: {
      method: envToken ? "env" : cliToken ? "cli" : "none",
      hasEnvToken: !!envToken,
      hasCliToken: !!cliToken,
      cliConfigPath: cliToken ? "~/.config/hcloud/cli.toml" : null,
    },
  });
});

/**
 * GET /api/debug-servers - Debug endpoint to see raw Hetzner data
 */
api.get("/debug-servers", async (c) => {
  if (!hetznerClient) {
    return c.json(
      { success: false, error: "Hetzner client not available" },
      500,
    );
  }

  try {
    const servers = await hetznerClient.listServers();
    return c.json({ success: true, servers });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * GET /api/environments/:id/metadata - Get environment metadata
 */
api.get("/environments/:id/metadata", async (c) => {
  const id = c.req.param("id");
  if (!id) {
    return c.json({ success: false, error: "ID is required" }, 400);
  }

  try {
    const metadata = getMetadata(id);
    return c.json({ success: true, metadata: metadata || { id } });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * PUT /api/environments/:id/metadata - Update environment metadata
 */
api.put("/environments/:id/metadata", async (c) => {
  const id = c.req.param("id");
  if (!id) {
    return c.json({ success: false, error: "ID is required" }, 400);
  }

  try {
    const body = await c.req.json();
    const validation = validateRequest(UpdateMetadataRequestSchema, body);

    if (!validation.success) {
      return c.json({ success: false, error: validation.error }, 400);
    }

    const metadata = {
      id,
      ...validation.data,
      permissions: body.permissions,
    };

    setMetadata(metadata);
    return c.json({ success: true, metadata });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * DELETE /api/environments/:id/metadata - Delete environment metadata
 */
api.delete("/environments/:id/metadata", async (c) => {
  const id = c.req.param("id");
  if (!id) {
    return c.json({ success: false, error: "ID is required" }, 400);
  }

  try {
    deleteMetadata(id);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * PUT /api/environments/:id/activity - Update activity tracking
 */
api.put("/environments/:id/activity", async (c) => {
  const id = c.req.param("id");
  if (!id) {
    return c.json({ success: false, error: "ID is required" }, 400);
  }

  try {
    const body = await c.req.json();
    const validation = validateRequest(UpdateActivityRequestSchema, body);

    if (!validation.success) {
      return c.json({ success: false, error: validation.error }, 400);
    }

    updateActivity(id, validation.data);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * PUT /api/environments/:id/plugins - Update plugins configuration
 */
api.put("/environments/:id/plugins", async (c) => {
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

/**
 * GET /api/actions/:id - Get action status by ID
 */
api.get("/actions/:id", async (c) => {
  const id = c.req.param("id");
  if (!id) {
    return c.json({ success: false, error: "Action ID is required" }, 400);
  }

  if (!hetznerClient) {
    return c.json(
      { success: false, error: "Hetzner client not available" },
      500,
    );
  }

  try {
    const actionId = parseInt(id, 10);
    if (isNaN(actionId)) {
      return c.json({ success: false, error: "Invalid action ID" }, 400);
    }

    const action = await hetznerClient.actions.get(actionId);
    return c.json({ success: true, action });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * GET /api/server-types - List all available server types
 */
api.get("/server-types", async (c) => {
  if (!hetznerClient) {
    return c.json({ success: true, serverTypes: [] });
  }

  try {
    const serverTypes = await hetznerClient.pricing.listServerTypes();
    return c.json({ success: true, serverTypes });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * GET /api/environments/:id/node-agent - Get Node Agent status from remote server
 */
api.get("/environments/:id/node-agent", async (c) => {
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

    // Try to reach Node Agent on port 8911
    // First, check if we can reach it via SSH port forwarding or direct Tailscale IP
    const host = server.public_net.ipv4.ip;

    // For now, try to fetch from the Node Agent API directly
    // This requires either:
    // 1. Tailscale IP accessible from dashboard
    // 2. SSH port forwarding
    // 3. Node Agent listening on public IP (not recommended for security)

    // Try Tailscale IP from metadata if available
    const metadata = getMetadata(id);
    const tailscaleHostname =
      metadata?.permissions?.logins?.tailscale?.hostname;

    if (tailscaleHostname) {
      // Construct Tailscale IP (typically 100.x.x.x format)
      // For now, we'll try to fetch via the hostname
      try {
        const response = await fetch(
          `http://${tailscaleHostname}.tail-scale-alias.ts.net:8911/api/status`,
          {
            signal: AbortSignal.timeout(5000), // 5 second timeout
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

    // If Tailscale fails, use SSH to fetch Node Agent status directly
    const statusResult = await execSSHParallel(
      {
        "node-agent-status":
          "curl -s http://localhost:8911/api/status || echo 'offline'",
      },
      {
        host,
        user: "root",
        timeout: 5,
      },
    );

    const statusJson = statusResult["node-agent-status"]?.trim();
    let status: any = undefined;

    if (statusJson && statusJson !== "offline") {
      try {
        status = JSON.parse(statusJson);
      } catch {
        // JSON parse failed, status stays undefined
      }
    }

    const running = status !== undefined;

    return c.json({
      success: true,
      nodeAgent: {
        running,
        port: 8911,
        status,
        lastChecked: new Date().toISOString(),
        error: running ? undefined : "Node Agent not accessible",
      },
    });
  } catch (error) {
    return c.json({
      success: true,
      nodeAgent: {
        running: false,
        port: 8911,
        lastChecked: new Date().toISOString(),
        error: String(error),
      },
    });
  }
});

/**
 * POST /api/environments/:id/seed/install - Install seed repository on environment
 */
api.post("/environments/:id/seed/install", async (c) => {
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

    // Get server info to find IP address
    const server = await hetznerClient.getServer(serverId);
    if (!server || !server.public_net.ipv4?.ip) {
      return c.json(
        { success: false, error: "Server not found or no IP" },
        404,
      );
    }

    // Get SSH key path from metadata
    const metadata = getMetadata(id);
    const keyPath = metadata?.sshKeyPath;

    // Install seed
    const installResult = await installSeed(server.public_net.ipv4.ip, {
      keyPath,
    });

    return c.json({
      success: installResult.success,
      result: installResult,
    });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * GET /api/environments/:id/seed/status - Get seed installation status
 */
api.get("/environments/:id/seed/status", async (c) => {
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

    // Get server info to find IP address
    const server = await hetznerClient.getServer(serverId);
    if (!server || !server.public_net.ipv4?.ip) {
      return c.json(
        { success: false, error: "Server not found or no IP" },
        404,
      );
    }

    // Get seed status
    const status = await getSeedStatus(server.public_net.ipv4.ip);

    return c.json({
      success: true,
      status,
    });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * GET /api/locations - List all available locations
 */
api.get("/locations", async (c) => {
  if (!hetznerClient) {
    return c.json({ success: true, locations: [] });
  }

  try {
    const locations = await hetznerClient.pricing.listLocations();
    return c.json({ success: true, locations });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ============================================================================
// Volume Routes
// ============================================================================

/**
 * GET /api/volumes - List all volumes
 */
api.get("/volumes", async (c) => {
  if (!hetznerClient) {
    return c.json({ success: true, volumes: [] });
  }

  try {
    const volumes = await hetznerClient.volumes.list();
    return c.json({ success: true, volumes });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * GET /api/volumes/:id - Get a specific volume
 */
api.get("/volumes/:id", async (c) => {
  const validation = validateRequest(VolumeIdSchema, c.req.param("id"));

  if (!validation.success) {
    return c.json({ success: false, error: validation.error }, 400);
  }

  const id = validation.data;

  if (!hetznerClient) {
    return c.json({ success: false, error: "Hetzner client not available" }, 500);
  }

  try {
    const volume = await hetznerClient.volumes.get(id);
    return c.json({ success: true, volume });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * POST /api/volumes - Create a new volume
 */
api.post("/volumes", async (c) => {
  const body = await c.req.json();
  const validation = validateRequest(CreateVolumeRequestSchema, body);

  if (!validation.success) {
    return c.json({ success: false, error: validation.error }, 400);
  }

  const data = validation.data;

  if (!hetznerClient) {
    return c.json({ success: false, error: "Hetzner client not available" }, 500);
  }

  try {
    const result = await hetznerClient.volumes.create({
      name: data.name,
      size: data.size,
      server: data.server ? parseInt(data.server as unknown as string, 10) : undefined,
      location: data.location,
      format: data.format,
      automount: data.automount,
      labels: data.labels,
    });

    // Extract action IDs for frontend polling
    const actionIds = [
      result.action.id,
      ...result.next_actions.map((a) => a.id),
    ];

    return c.json({
      success: true,
      volume: result.volume,
      actions: actionIds,
      nextPollAt: Date.now() + 2000,
    });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * DELETE /api/volumes/:id - Delete a volume
 */
api.delete("/volumes/:id", async (c) => {
  const validation = validateRequest(VolumeIdSchema, c.req.param("id"));

  if (!validation.success) {
    return c.json({ success: false, error: validation.error }, 400);
  }

  const id = validation.data;

  if (!hetznerClient) {
    return c.json({ success: false, error: "Hetzner client not available" }, 500);
  }

  try {
    const action = await hetznerClient.volumes.delete(id);
    return c.json({
      success: true,
      actionId: action.id,
      nextPollAt: Date.now() + 2000,
    });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * POST /api/volumes/:id/attach - Attach a volume to a server
 */
api.post("/volumes/:id/attach", async (c) => {
  const idValidation = validateRequest(VolumeIdSchema, c.req.param("id"));
  if (!idValidation.success) {
    return c.json({ success: false, error: idValidation.error }, 400);
  }

  const volumeId = idValidation.data;
  const body = await c.req.json();
  const serverId = body.serverId;

  if (!serverId || typeof serverId !== "number") {
    return c.json({ success: false, error: "Server ID is required" }, 400);
  }

  const automount = body.automount ?? true;

  if (!hetznerClient) {
    return c.json({ success: false, error: "Hetzner client not available" }, 500);
  }

  try {
    const action = await hetznerClient.volumes.attach(volumeId, serverId, automount);
    return c.json({
      success: true,
      actionId: action.id,
      nextPollAt: Date.now() + 2000,
    });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * POST /api/volumes/:id/detach - Detach a volume from a server
 */
api.post("/volumes/:id/detach", async (c) => {
  const validation = validateRequest(VolumeIdSchema, c.req.param("id"));

  if (!validation.success) {
    return c.json({ success: false, error: validation.error }, 400);
  }

  const volumeId = validation.data;

  if (!hetznerClient) {
    return c.json({ success: false, error: "Hetzner client not available" }, 500);
  }

  try {
    const action = await hetznerClient.volumes.detach(volumeId);
    return c.json({
      success: true,
      actionId: action.id,
      nextPollAt: Date.now() + 2000,
    });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * POST /api/volumes/:id/resize - Resize a volume
 */
api.post("/volumes/:id/resize", async (c) => {
  const idValidation = validateRequest(VolumeIdSchema, c.req.param("id"));
  if (!idValidation.success) {
    return c.json({ success: false, error: idValidation.error }, 400);
  }

  const volumeId = idValidation.data;
  const body = await c.req.json();

  if (!body.size || typeof body.size !== "number") {
    return c.json({ success: false, error: "Size is required" }, 400);
  }

  const size = body.size;

  if (!hetznerClient) {
    return c.json({ success: false, error: "Hetzner client not available" }, 500);
  }

  try {
    const action = await hetznerClient.volumes.resize(volumeId, size);
    return c.json({
      success: true,
      actionId: action.id,
      nextPollAt: Date.now() + 2000,
    });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * PUT /api/volumes/:id - Update volume labels
 */
api.put("/volumes/:id", async (c) => {
  const idValidation = validateRequest(VolumeIdSchema, c.req.param("id"));
  if (!idValidation.success) {
    return c.json({ success: false, error: idValidation.error }, 400);
  }

  const volumeId = idValidation.data;
  const body = await c.req.json();
  const labels = body.labels;

  if (!labels || typeof labels !== "object") {
    return c.json({ success: false, error: "Labels are required" }, 400);
  }

  if (!hetznerClient) {
    return c.json({ success: false, error: "Hetzner client not available" }, 500);
  }

  try {
    const volume = await hetznerClient.volumes.updateLabels(volumeId, labels);
    return c.json({ success: true, volume });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * GET /api/volumes/price - Calculate volume pricing
 */
api.get("/volumes/price", async (c) => {
  const size = parseInt(c.req.query("size") || "10", 10);

  if (isNaN(size) || size < 10 || size > 10240) {
    return c.json({ success: false, error: "Size must be between 10 and 10240 GB" }, 400);
  }

  try {
    const { VolumeOperations } = await import("./lib/hetzner/volumes.js");
    const price = VolumeOperations.calculatePrice(size);
    return c.json({ success: true, price });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * Mount tmux manager API routes
 */
api.route("/tmux", tmuxApi);

/**
 * GET /api/security/events - Get recent security events
 */
api.get("/security/events", async (c) => {
  const limit = parseInt(c.req.query("limit") || "50", 10);
  const events = getSecurityEvents(Math.min(limit, 1000));

  return c.json({
    success: true,
    events,
    count: events.length,
    timestamp: new Date().toISOString(),
  });
});
