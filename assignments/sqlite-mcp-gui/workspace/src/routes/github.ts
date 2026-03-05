/**
 * GitHub Routes
 * Handles GitHub CLI integration for authentication
 *
 * NOTE: The keyPath fix in packages/src/installations/sudo.ts (buildSshPrefix)
 * ensures SSH authentication works correctly with keyPath from metadata.
 * All routes here use keyPath via getKeyPathByEnvironmentId() or metadata?.sshKeyPath.
 */

import { Hono } from "hono";
import type { Context } from "hono";
import {
  parseGitHubLoginOutput,
  githubLoginRemote,
  checkGitHubAuth,
  getGitHubStatus,
  ghRun,
} from "../lib/github";
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
 * Register all GitHub routes
 */
export function registerGitHubRoutes(app: Hono) {
  /**
   * POST /api/github/login - Start GitHub login flow on remote server
   * Request body: { host: string, keyPath?: string }
   * Returns: { authUrl: string, authCode: string, status: string }
   */
  app.post("/api/github/login", async (c: Context) => {
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
      const result = await githubLoginRemote(host, options, 10);

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
      console.error("[GitHub] Login error:", error);
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
   * POST /api/github/status - Check GitHub authentication status
   * Request body: { host: string, keyPath?: string }
   * Returns: { authenticated: boolean, username?: string, host?: string }
   */
  app.post("/api/github/status", async (c: Context) => {
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
      const status = await getGitHubStatus(host, options);

      return c.json({ success: true, data: status });
    } catch (error) {
      console.error("[GitHub] Status check error:", error);
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
   * POST /api/github/run - Run a gh command on remote server
   * Request body: { host: string, command: string, keyPath?: string }
   * Returns: { output: string }
   */
  app.post("/api/github/run", async (c: Context) => {
    try {
      const body = await c.req.json();
      const { host, command, environmentId } = body;
      let { keyPath } = body;

      if (!host || !command) {
        return c.json(
          { success: false, error: "host and command are required" },
          400,
        );
      }

      // Auto-lookup keyPath from metadata if not provided
      if (!keyPath && environmentId) {
        keyPath = getKeyPathByEnvironmentId(environmentId);
      }

      const options = keyPath ? { keyPath } : {};
      const output = await ghRun(host, command, options);

      return c.json({ success: true, data: { output } });
    } catch (error) {
      console.error("[GitHub] Run error:", error);
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
