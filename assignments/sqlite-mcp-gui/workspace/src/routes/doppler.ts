/**
 * Doppler Routes
 * Handles Doppler CLI integration for secrets management
 *
 * NOTE: The keyPath fix in packages/src/installations/sudo.ts (buildSshPrefix)
 * ensures SSH authentication works correctly with keyPath from metadata.
 * All routes here use keyPath via getKeyPathByEnvironmentId().
 */

import { Hono } from "hono";
import type { Context } from "hono";
import {
  parseDopplerLoginOutput,
  dopplerLoginRemote,
  checkDopplerAuth,
  getDopplerStatus,
  dopplerRun,
} from "../lib/doppler";
import type { DopplerLoginInfo } from "../lib/doppler";
import { getAllMetadata } from "../lib/metadata";

/**
 * Lookup SSH key path from metadata by environment ID
 */
function getKeyPathByEnvironmentId(environmentId: string): string | undefined {
  const allMetadata = getAllMetadata();
  for (const meta of allMetadata) {
    if (meta.id === environmentId && meta.sshKeyPath) {
      return meta.sshKeyPath;
    }
  }
  // Fallback: return first available sshKeyPath
  for (const meta of allMetadata) {
    if (meta.sshKeyPath) {
      return meta.sshKeyPath;
    }
  }
  return undefined;
}

/**
 * Register all Doppler routes
 */
export function registerDopplerRoutes(app: Hono) {
  /**
   * POST /api/doppler/login - Start doppler login flow on remote server
   * Request body: { host: string, keyPath?: string }
   * Returns: { authUrl: string, authCode: string, status: string }
   */
  app.post("/api/doppler/login", async (c: Context) => {
    try {
      const body = await c.req.json();
      const { host, environmentId } = body;
      let { keyPath } = body;

      if (!host) {
        return c.json({ success: false, error: "host is required" }, 400);
      }

      // Auto-lookup keyPath from metadata if not provided
      if (!keyPath && environmentId) {
        keyPath = getKeyPathByEnvironmentId(environmentId);
      }

      const options = keyPath ? { keyPath } : {};
      const result = await dopplerLoginRemote(host, options, 10);

      return c.json({
        success: true,
        data: {
          authUrl: result.authUrl,
          authCode: result.authCode,
          status: result.status,
          message: result.message,
        },
      });
    } catch (error) {
      console.error("[Doppler] Login error:", error);
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  });

  /**
   * POST /api/doppler/status - Check doppler authentication status
   * Request body: { host: string, keyPath?: string }
   * Returns: { authenticated: boolean, configured: boolean, hasToken: boolean }
   */
  app.post("/api/doppler/status", async (c: Context) => {
    try {
      const body = await c.req.json();
      const { host, environmentId } = body;
      let { keyPath } = body;

      if (!host) {
        return c.json({ success: false, error: "host is required" }, 400);
      }

      // Auto-lookup keyPath from metadata if not provided
      if (!keyPath && environmentId) {
        keyPath = getKeyPathByEnvironmentId(environmentId);
      }

      const options = keyPath ? { keyPath } : {};
      const status = await getDopplerStatus(host, options);

      return c.json({ success: true, data: status });
    } catch (error) {
      console.error("[Doppler] Status check error:", error);
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  });

  /**
   * POST /api/doppler/run - Run a command with doppler secrets
   * Request body: { host: string, project: string, config: string, command: string, keyPath?: string }
   * Returns: { output: string }
   */
  app.post("/api/doppler/run", async (c: Context) => {
    try {
      const body = await c.req.json();
      const { host, project, config, command, keyPath } = body;

      if (!host || !project || !config || !command) {
        return c.json(
          { success: false, error: "host, project, config, and command are required" },
          400,
        );
      }

      const options = keyPath ? { keyPath } : {};
      const output = await dopplerRun(host, project, config, command, options);

      return c.json({ success: true, data: { output } });
    } catch (error) {
      console.error("[Doppler] Run error:", error);
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  });

  /**
   * POST /api/doppler/parse - Parse doppler login output (utility endpoint)
   * Request body: { output: string }
   * Returns: { authUrl: string, authCode: string, status: string }
   */
  app.post("/api/doppler/parse", async (c: Context) => {
    try {
      const body = await c.req.json();
      const { output } = body;

      if (!output) {
        return c.json({ success: false, error: "output is required" }, 400);
      }

      const result = parseDopplerLoginOutput(output);

      return c.json({ success: true, data: result });
    } catch (error) {
      console.error("[Doppler] Parse error:", error);
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  });
}
