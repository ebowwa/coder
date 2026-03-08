import type { Hono } from "hono";
import type { HetznerClient } from "../../lib/hetzner";
import {
  TmuxSendCommandSchema,
  TmuxSplitPaneSchema,
  TmuxCapturePaneSchema,
  TmuxGetHistorySchema,
  TmuxSwitchWindowSchema,
  TmuxSwitchPaneSchema,
  TmuxRenameWindowSchema,
  TmuxKillPaneSchema,
} from "@ebowwa/codespaces-types/runtime/api";
import {
  sendCommandToPane,
  splitPane,
  listSessionWindows,
  listWindowPanes,
  capturePane,
  getPaneHistory,
  switchWindow,
  switchPane,
  renameWindow,
  killPane,
  getDetailedSessionInfo,
  generateSessionName,
} from "@codespaces/terminal/tmux";
import { validateRequest } from "../utils";
import { addActivity } from "../../lib/activities";

/**
 * Environment info lookup by IP
 */
interface EnvInfo {
  id: string;
  name: string;
}

// Cache for environment lookups to avoid repeated Hetzner API calls
const envCache = new Map<string, EnvInfo>();
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Helper to look up environment by IP address
 */
async function getEnvByIp(ip: string, hetznerClient: HetznerClient | null): Promise<EnvInfo | null> {
  if (!hetznerClient) {
    return null;
  }

  // Check cache first
  const now = Date.now();
  if (now - cacheTimestamp < CACHE_TTL && envCache.has(ip)) {
    return envCache.get(ip)!;
  }

  // Refresh cache if expired
  if (now - cacheTimestamp >= CACHE_TTL) {
    envCache.clear();
    try {
      const servers = await hetznerClient.listServers();
      for (const server of servers) {
        const serverIp = server.public_net.ipv4.ip;
        envCache.set(serverIp, {
          id: server.id.toString(),
          name: server.name,
        });
      }
      cacheTimestamp = now;
    } catch (error) {
      console.error("[TmuxRoutes] Failed to fetch servers for cache:", error);
    }
  }

  return envCache.get(ip) || null;
}

/**
 * Helper function to get SSH options from a session ID
 * Parses session ID to extract host and user, retrieves SSH key path
 */
async function getSSHOpsFromSession(sessionId: string): Promise<{
  host: string;
  user: string;
  keyPath?: string;
} | null> {
  // Session IDs are in format: term-{host}-{timestamp}-{random}
  const match = sessionId.match(/^term-([^-]+)-/);
  if (!match) {
    return null;
  }

  const host = match[1].replace(/_/g, ".");
  const user = "root";

  // Try to get the key path from metadata if available
  // We need to find the environment ID for this host
  // For now, we'll return the basic options
  return { host, user };
}

/**
 * Register all tmux-related routes
 */
export function registerTmuxRoutes(app: Hono, hetznerClient: HetznerClient | null = null): void {
  /**
   * POST /api/tmux/send - Send command to a tmux pane
   */
  app.post("/api/tmux/send", async (c) => {
    const body = await c.req.json();
    const validation = validateRequest(TmuxSendCommandSchema, body);

    if (!validation.success) {
      return c.json({ success: false, error: validation.error }, 400);
    }

    const { sessionId, command, paneIndex } = validation.data;

    const sshOps = await getSSHOpsFromSession(sessionId);
    if (!sshOps) {
      return c.json({ success: false, error: "Invalid session ID" }, 400);
    }

    try {
      const sessionName = generateSessionName(sshOps.host, sshOps.user);

      const success = await sendCommandToPane(sessionName, command, paneIndex, sshOps);

      if (!success) {
        return c.json({ success: false, error: "Failed to send command" }, 500);
      }

      // Log activity
      const env = await getEnvByIp(sshOps.host, hetznerClient);
      if (env) {
        addActivity({
          environmentId: env.id,
          action: "tmux_command_sent",
          environmentName: env.name,
          details: `Command: ${command.slice(0, 100)}${command.length > 100 ? "..." : ""}`,
        });
      }

      return c.json({ success: true, message: "Command sent" });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * POST /api/tmux/split - Split a tmux pane
   */
  app.post("/api/tmux/split", async (c) => {
    const body = await c.req.json();
    const validation = validateRequest(TmuxSplitPaneSchema, body);

    if (!validation.success) {
      return c.json({ success: false, error: validation.error }, 400);
    }

    const { sessionId, direction, command } = validation.data;

    const sshOps = await getSSHOpsFromSession(sessionId);
    if (!sshOps) {
      return c.json({ success: false, error: "Invalid session ID" }, 400);
    }

    try {
      const sessionName = generateSessionName(sshOps.host, sshOps.user);

      const newPane = await splitPane(sessionName, direction, command || null, sshOps);

      if (!newPane) {
        return c.json({ success: false, error: "Failed to split pane" }, 500);
      }

      // Log activity
      const env = await getEnvByIp(sshOps.host, hetznerClient);
      if (env) {
        addActivity({
          environmentId: env.id,
          action: "tmux_pane_split",
          environmentName: env.name,
          details: `Split pane ${direction === "h" ? "horizontally" : "vertically"}${command ? ` with command: ${command.slice(0, 50)}...` : ""}`,
        });
      }

      return c.json({ success: true, newPane });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * GET /api/tmux/windows/:sessionId - List windows in a tmux session
   */
  app.get("/api/tmux/windows/:sessionId", async (c) => {
    const sessionId = c.req.param("sessionId");
    if (!sessionId) {
      return c.json({ success: false, error: "Session ID is required" }, 400);
    }

    const sshOps = await getSSHOpsFromSession(sessionId);
    if (!sshOps) {
      return c.json({ success: false, error: "Invalid session ID" }, 400);
    }

    try {
      const sessionName = generateSessionName(sshOps.host, sshOps.user);

      const windows = await listSessionWindows(sessionName, sshOps);

      return c.json({ success: true, windows });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * GET /api/tmux/panes/:sessionId - List panes in a tmux window
   * Query params: ?window=0
   */
  app.get("/api/tmux/panes/:sessionId", async (c) => {
    const sessionId = c.req.param("sessionId");
    const windowIndex = c.req.query("window") || "0";

    if (!sessionId) {
      return c.json({ success: false, error: "Session ID is required" }, 400);
    }

    const sshOps = await getSSHOpsFromSession(sessionId);
    if (!sshOps) {
      return c.json({ success: false, error: "Invalid session ID" }, 400);
    }

    try {
      const sessionName = generateSessionName(sshOps.host, sshOps.user);

      const panes = await listWindowPanes(sessionName, windowIndex, sshOps);

      return c.json({ success: true, panes });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * POST /api/tmux/capture - Capture current pane output
   */
  app.post("/api/tmux/capture", async (c) => {
    const body = await c.req.json();
    const validation = validateRequest(TmuxCapturePaneSchema, body);

    if (!validation.success) {
      return c.json({ success: false, error: validation.error }, 400);
    }

    const { sessionId, paneIndex } = validation.data;

    const sshOps = await getSSHOpsFromSession(sessionId);
    if (!sshOps) {
      return c.json({ success: false, error: "Invalid session ID" }, 400);
    }

    try {
      const sessionName = generateSessionName(sshOps.host, sshOps.user);

      const output = await capturePane(sessionName, paneIndex, sshOps);

      if (output === null) {
        return c.json({ success: false, error: "Failed to capture pane" }, 500);
      }

      return c.json({ success: true, output });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * POST /api/tmux/history - Get pane scrollback history
   */
  app.post("/api/tmux/history", async (c) => {
    const body = await c.req.json();
    const validation = validateRequest(TmuxGetHistorySchema, body);

    if (!validation.success) {
      return c.json({ success: false, error: validation.error }, 400);
    }

    const { sessionId, paneIndex, lines } = validation.data;

    const sshOps = await getSSHOpsFromSession(sessionId);
    if (!sshOps) {
      return c.json({ success: false, error: "Invalid session ID" }, 400);
    }

    try {
      const sessionName = generateSessionName(sshOps.host, sshOps.user);

      const history = await getPaneHistory(sessionName, paneIndex, lines, sshOps);

      if (history === null) {
        return c.json({ success: false, error: "Failed to get history" }, 500);
      }

      return c.json({ success: true, history });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * POST /api/tmux/switch-window - Switch to a window
   */
  app.post("/api/tmux/switch-window", async (c) => {
    const body = await c.req.json();
    const validation = validateRequest(TmuxSwitchWindowSchema, body);

    if (!validation.success) {
      return c.json({ success: false, error: validation.error }, 400);
    }

    const { sessionId, windowIndex } = validation.data;

    const sshOps = await getSSHOpsFromSession(sessionId);
    if (!sshOps) {
      return c.json({ success: false, error: "Invalid session ID" }, 400);
    }

    try {
      const sessionName = generateSessionName(sshOps.host, sshOps.user);

      const success = await switchWindow(sessionName, windowIndex, sshOps);

      if (!success) {
        return c.json({ success: false, error: "Failed to switch window" }, 500);
      }

      // Log activity
      const env = await getEnvByIp(sshOps.host, hetznerClient);
      if (env) {
        addActivity({
          environmentId: env.id,
          action: "tmux_window_switched",
          environmentName: env.name,
          details: `Switched to window ${windowIndex}`,
        });
      }

      return c.json({ success: true });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * POST /api/tmux/switch-pane - Switch to a pane
   */
  app.post("/api/tmux/switch-pane", async (c) => {
    const body = await c.req.json();
    const validation = validateRequest(TmuxSwitchPaneSchema, body);

    if (!validation.success) {
      return c.json({ success: false, error: validation.error }, 400);
    }

    const { sessionId, paneIndex } = validation.data;

    const sshOps = await getSSHOpsFromSession(sessionId);
    if (!sshOps) {
      return c.json({ success: false, error: "Invalid session ID" }, 400);
    }

    try {
      const sessionName = generateSessionName(sshOps.host, sshOps.user);

      const success = await switchPane(sessionName, paneIndex, sshOps);

      if (!success) {
        return c.json({ success: false, error: "Failed to switch pane" }, 500);
      }

      // Log activity
      const env = await getEnvByIp(sshOps.host, hetznerClient);
      if (env) {
        addActivity({
          environmentId: env.id,
          action: "tmux_pane_switched",
          environmentName: env.name,
          details: `Switched to pane ${paneIndex}`,
        });
      }

      return c.json({ success: true });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * POST /api/tmux/rename-window - Rename a window
   */
  app.post("/api/tmux/rename-window", async (c) => {
    const body = await c.req.json();
    const validation = validateRequest(TmuxRenameWindowSchema, body);

    if (!validation.success) {
      return c.json({ success: false, error: validation.error }, 400);
    }

    const { sessionId, windowIndex, newName } = validation.data;

    const sshOps = await getSSHOpsFromSession(sessionId);
    if (!sshOps) {
      return c.json({ success: false, error: "Invalid session ID" }, 400);
    }

    try {
      const sessionName = generateSessionName(sshOps.host, sshOps.user);

      const success = await renameWindow(sessionName, windowIndex, newName, sshOps);

      if (!success) {
        return c.json({ success: false, error: "Failed to rename window" }, 500);
      }

      // Log activity
      const env = await getEnvByIp(sshOps.host, hetznerClient);
      if (env) {
        addActivity({
          environmentId: env.id,
          action: "tmux_window_renamed",
          environmentName: env.name,
          details: `Renamed window ${windowIndex} to "${newName}"`,
        });
      }

      return c.json({ success: true });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * POST /api/tmux/kill-pane - Kill a pane
   */
  app.post("/api/tmux/kill-pane", async (c) => {
    const body = await c.req.json();
    const validation = validateRequest(TmuxKillPaneSchema, body);

    if (!validation.success) {
      return c.json({ success: false, error: validation.error }, 400);
    }

    const { sessionId, paneIndex } = validation.data;

    const sshOps = await getSSHOpsFromSession(sessionId);
    if (!sshOps) {
      return c.json({ success: false, error: "Invalid session ID" }, 400);
    }

    try {
      const sessionName = generateSessionName(sshOps.host, sshOps.user);

      const success = await killPane(sessionName, paneIndex, sshOps);

      if (!success) {
        return c.json({ success: false, error: "Failed to kill pane" }, 500);
      }

      // Log activity
      const env = await getEnvByIp(sshOps.host, hetznerClient);
      if (env) {
        addActivity({
          environmentId: env.id,
          action: "tmux_pane_killed",
          environmentName: env.name,
          details: `Killed pane ${paneIndex}`,
        });
      }

      return c.json({ success: true });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * GET /api/tmux/info/:sessionId - Get detailed tmux session info
   */
  app.get("/api/tmux/info/:sessionId", async (c) => {
    const sessionId = c.req.param("sessionId");
    if (!sessionId) {
      return c.json({ success: false, error: "Session ID is required" }, 400);
    }

    const sshOps = await getSSHOpsFromSession(sessionId);
    if (!sshOps) {
      return c.json({ success: false, error: "Invalid session ID" }, 400);
    }

    try {
      const sessionName = generateSessionName(sshOps.host, sshOps.user);

      const info = await getDetailedSessionInfo(sessionName, sshOps);

      if (info === null) {
        return c.json({ success: false, error: "Failed to get session info" }, 500);
      }

      return c.json({ success: true, info });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });
}
