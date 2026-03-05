import { Hono } from "hono";
import { getActiveSSHConnections } from "@codespaces/terminal";
import { getTokenFromCLI } from "../lib/hetzner/auth";
import { getGLMClient } from "@codespaces/ai";
import { auditConfig, type AuditResult } from "../lib/audit";

// Initialize GLM-4.7 client if API key is available
const glmClient = getGLMClient();

const HEALTH_CACHE_TTL_MS = 30_000;
let healthCache: { result: AuditResult; expiresAt: number } | null = null;

async function getCachedAudit(): Promise<AuditResult> {
  const now = Date.now();
  if (healthCache && now < healthCache.expiresAt) {
    return healthCache.result;
  }
  const result = await auditConfig();
  healthCache = { result, expiresAt: now + HEALTH_CACHE_TTL_MS };
  return result;
}

/**
 * Register all admin and system routes
 * @param app - Hono application instance
 */
export function registerAdminRoutes(app: Hono) {
  /**
   * GET /api/health - Health check
   */
  app.get("/api/health", async (c) => {
    const sshPool = getActiveSSHConnections();
    const audit = await getCachedAudit();
    return c.json({
      status: audit.ok ? "ok" : "degraded",
      platform: process.platform,
      ai: glmClient ? "available" : "unavailable",
      sshPool: {
        activeConnections: sshPool.activeConnections,
        totalCreated: sshPool.totalCreated,
        totalClosed: sshPool.totalClosed,
      },
      audit: {
        ok: audit.ok,
        issues: audit.issues.length,
        errors: audit.issues.filter((i) => i.severity === "error").length,
        warnings: audit.issues.filter((i) => i.severity === "warning").length,
      },
    });
  });

  /**
   * GET /api/audit - Full config audit results
   */
  app.get("/api/audit", async (c) => {
    const result = await auditConfig();
    return c.json(result);
  });

  /**
   * GET /api/auth/status - Get current authentication status
   */
  app.get("/api/auth/status", (c) => {
    const envToken = process.env.HETZNER_API_TOKEN || "";
    const cliToken = getTokenFromCLI();

    return c.json({
      success: true,
      authenticated: !!(envToken || cliToken),
      auth: {
        method: envToken ? "env" : cliToken ? "cli" : "none",
        hasEnvToken: !!envToken,
        hasCliToken: !!cliToken,
        cliConfigPath: cliToken ? "~/.config/hcloud/cli.toml" : null,
      },
    });
  });

  /**
   * GET /api/admin/ssh-pool - SSH connection pool monitoring
   * Returns detailed statistics about active SSH connections
   */
  app.get("/api/admin/ssh-pool", (c) => {
    const stats = getActiveSSHConnections();
    return c.json({
      success: true,
      ...stats,
    });
  });
}
