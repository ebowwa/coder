/**
 * SSH and SCP Routes
 * Handles SSH connections, testing, fingerprint retrieval, and file transfers
 */

import { Hono } from "hono";
import {
  SSHConnectionRequestSchema,
  SSHTestRequestSchema,
  SSHFingerprintRequestSchema,
  SCPUploadRequestSchema,
  SCPDownloadRequestSchema,
} from "@ebowwa/codespaces-types/runtime/api";
import {
  testSSHConnection,
  getSSHFingerprint,
  scpUpload,
  scpDownload,
} from "@codespaces/terminal";
import {
  syncNodesToSSHConfig,
  listSSHConfigEntries,
  validateSSHConnection,
  ensureCorrectSSHKey,
} from "@codespaces/terminal/config";
import { getMetadata, getAllMetadata } from "../lib/metadata";
import { validateRequest, runAppleScript } from "./utils";
import type { HetznerClient } from "../lib/hetzner";

/**
 * Register all SSH and SCP routes
 */
export function registerSSHRoutes(app: Hono, hetznerClient?: HetznerClient | null) {
  /**
   * POST /api/ssh - Open SSH connection in Terminal
   */
  app.post("/api/ssh", async (c) => {
    const body = await c.req.json();
    const validation = validateRequest(SSHConnectionRequestSchema, body);

    if (!validation.success) {
      return c.json({ success: false, error: validation.error }, 400);
    }

    const { host, user = "root" } = validation.data;

    // AppleScript to open Terminal and run SSH command
    const script = `
      tell application "Terminal"
        activate
        do script "ssh ${user}@${host}"
      end tell
    `;

    try {
      await runAppleScript(script);
      return c.json({ success: true });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * POST /api/ssh/test - Test SSH connection
   */
  app.post("/api/ssh/test", async (c) => {
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
  app.post("/api/ssh/fingerprint", async (c) => {
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
  app.post("/api/scp/upload", async (c) => {
    const contentType = c.req.header("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // Handle FormData upload
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
        // Save uploaded file to temp location
        const tempDir = "/tmp/cheapspaces-uploads";
        await Bun.spawn(["mkdir", "-p", tempDir], {
          stdout: "pipe",
          stderr: "pipe",
        });

        const tempPath = `${tempDir}/${Date.now()}-${file.name}`;

        // Convert file to buffer and write using Bun.file
        const fileBuffer = await file.arrayBuffer();
        const blob = new Blob([fileBuffer], { type: file.type });
        await Bun.write(tempPath, blob);

        // Extract user from formData if provided
        const user = (formData.get("user") as string) || "root";
        const recursive = (formData.get("recursive") as string) === "true";
        const preserve = (formData.get("preserve") as string) === "true";

        // Upload via SCP
        await scpUpload({
          host,
          user,
          source: tempPath,
          destination,
          recursive,
          preserve,
        });

        // Clean up temp file
        await Bun.spawn(["rm", "-f", tempPath], {
          stdout: "pipe",
          stderr: "pipe",
        });

        return c.json({ success: true });
      } catch (error) {
        return c.json({ success: false, error: String(error) }, 500);
      }
    } else {
      // Handle JSON upload (local file path)
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
        await scpUpload({
          host,
          user,
          source,
          destination,
          recursive,
          preserve,
        });
        return c.json({ success: true });
      } catch (error) {
        return c.json({ success: false, error: String(error) }, 500);
      }
    }
  });

  /**
   * POST /api/scp/download - Download file via SCP
   */
  app.post("/api/scp/download", async (c) => {
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
   * POST /api/ssh/config/sync - Sync all nodes to ~/.ssh/config
   * Adds SSH aliases for easy access: ssh node-<id> or ssh <name>
   */
  app.post("/api/ssh/config/sync", async (c) => {
    if (!hetznerClient) {
      return c.json({ success: false, error: "Hetzner client not configured" }, 500);
    }

    try {
      // Get all servers from Hetzner
      const servers = await hetznerClient.listServers();

      // Get metadata for SSH key paths
      const allMetadata = getAllMetadata();
      const metadataMap = new Map(allMetadata.map((m) => [m.id, m]));

      // Build nodes list
      const nodes = servers
        .filter((s) => s.public_net.ipv4?.ip) // Only servers with IPs
        .map((s) => {
          const id = s.id.toString();
          const metadata = metadataMap.get(id);
          return {
            id,
            name: s.name,
            ip: s.public_net.ipv4!.ip,
            keyPath: metadata?.sshKeyPath || "",
          };
        })
        .filter((n) => n.keyPath); // Only nodes with key paths

      if (nodes.length === 0) {
        return c.json({
          success: true,
          message: "No nodes with SSH key paths found",
          results: [],
        });
      }

      // Sync to SSH config
      const results = await syncNodesToSSHConfig(nodes, { validateSSH: false });

      const added = results.filter((r) => r.status === "added").length;
      const updated = results.filter((r) => r.status === "updated").length;
      const skipped = results.filter((r) => r.status === "skipped").length;

      return c.json({
        success: true,
        message: `Synced ${nodes.length} nodes: ${added} added, ${updated} updated, ${skipped} unchanged`,
        results,
      });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * GET /api/ssh/config - List all managed SSH config entries
   */
  app.get("/api/ssh/config", async (c) => {
    try {
      const entries = listSSHConfigEntries();
      return c.json({
        success: true,
        entries,
        usage: entries.map((e) => `ssh node-${e.id}  # or: ssh ${e.name.replace(/[^a-zA-Z0-9_-]/g, "-")}`),
      });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * POST /api/ssh/validate/:id - Validate SSH connection for a node
   */
  app.post("/api/ssh/validate/:id", async (c) => {
    const id = c.req.param("id");

    if (!hetznerClient) {
      return c.json({ success: false, error: "Hetzner client not configured" }, 500);
    }

    try {
      // Get server info
      const server = await hetznerClient.getServer(id);
      if (!server) {
        return c.json({ success: false, error: "Server not found" }, 404);
      }

      const ip = server.public_net.ipv4?.ip;
      if (!ip) {
        return c.json({ success: false, error: "Server has no IPv4 address" }, 400);
      }

      // Get SSH key path from metadata
      const metadata = getMetadata(id);
      if (!metadata?.sshKeyPath) {
        return c.json({ success: false, error: "No SSH key path in metadata" }, 400);
      }

      // Ensure correct key is loaded
      await ensureCorrectSSHKey(metadata.sshKeyPath);

      // Validate connection
      const result = await validateSSHConnection(ip, metadata.sshKeyPath);

      return c.json({
        success: result.success,
        ip,
        keyPath: metadata.sshKeyPath,
        error: result.error,
        diagnostics: result.diagnostics,
      });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });
}
