import { Hono } from "hono";
import type { HetznerClient } from "../../lib/hetzner";
import { registerSessionRoutes } from "./sessions";
import { registerTmuxRoutes } from "./tmux";

export function registerTerminalRoutes(app: Hono, hetznerClient: HetznerClient | null = null) {
  registerSessionRoutes(app);
  registerTmuxRoutes(app, hetznerClient);
}

export { registerSessionRoutes } from "./sessions";
export { registerTmuxRoutes } from "./tmux";
