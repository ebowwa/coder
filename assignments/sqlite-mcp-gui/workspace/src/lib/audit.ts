/**
 * Config audit system for Cheapspaces
 * Aligns with seed's HealthResult / HealthIssue pattern
 */

import { existsSync, accessSync, constants, readdirSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { resolveApiToken, isAuthenticated } from "./hetzner/auth";
import { AIEnvSchema } from "@ebowwa/codespaces-types/runtime/env";

const HETZNER_API_URL = "https://api.hetzner.cloud/v1";
const AI_API_URL = "https://api.z.ai";
const NETWORK_TIMEOUT_MS = 3000;

export interface AuditIssue {
  code: string;
  message: string;
  detail?: string;
  severity: "error" | "warning" | "info";
}

export interface AuditResult {
  ok: boolean;
  issues: AuditIssue[];
  timestamp: string;
}

function auditHetznerToken(
  env: Record<string, string | undefined>,
  issues: AuditIssue[],
): void {
  const token = resolveApiToken(env.HETZNER_API_TOKEN);
  if (!isAuthenticated(token)) {
    issues.push({
      code: "hetzner-token-missing",
      message: "No Hetzner API token found",
      detail: "Set HETZNER_API_TOKEN env var or configure hcloud CLI",
      severity: "error",
    });
  }
}

async function auditHetznerTokenRemote(issues: AuditIssue[]): Promise<void> {
  const token = resolveApiToken();
  if (!isAuthenticated(token)) return; // already caught by sync check

  try {
    const res = await fetch(`${HETZNER_API_URL}/servers?per_page=1`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
    });
    if (res.status === 401 || res.status === 403) {
      issues.push({
        code: "hetzner-token-invalid",
        message: "Hetzner API token exists but was rejected",
        detail: `API returned ${res.status}`,
        severity: "error",
      });
    }
  } catch {
    // Network issue handled by auditNetwork
  }
}

function auditAIKeys(
  env: Record<string, string | undefined>,
  issues: AuditIssue[],
): void {
  const result = AIEnvSchema.safeParse(env);
  if (!result.success) {
    issues.push({
      code: "ai-key-missing",
      message: "No AI API key configured",
      detail:
        "Set one of Z_AI_API_KEY, ZAI_API_KEY, or GLM_API_KEY for AI features",
      severity: "warning",
    });
  }
}

function auditBunRuntime(issues: AuditIssue[]): void {
  const bunVersion = (process.versions as Record<string, string>).bun;
  if (!bunVersion) {
    issues.push({
      code: "bun-runtime-missing",
      message: "Not running under Bun runtime",
      detail: "Cheapspaces requires Bun. Install from https://bun.sh",
      severity: "error",
    });
    return;
  }

  const major = parseInt(bunVersion.split(".")[0], 10);
  if (major < 1) {
    issues.push({
      code: "bun-version-old",
      message: `Bun version ${bunVersion} is outdated`,
      detail: "Bun >= 1.0 is recommended",
      severity: "warning",
    });
  }
}

function auditDatabase(issues: AuditIssue[]): void {
  const dbDir = resolve("./db");
  if (!existsSync(dbDir)) {
    // Create the directory if it doesn't exist
    try {
      mkdirSync(dbDir, { recursive: true });
      console.log(`[Audit] Created database directory: ${dbDir}`);
    } catch {
      issues.push({
        code: "db-dir-missing",
        message: "Database directory ./db/ does not exist and could not be created",
        detail: "Failed to create ./db/ directory for persistent storage",
        severity: "error",
      });
      return;
    }
  }

  try {
    accessSync(dbDir, constants.W_OK);
  } catch {
    issues.push({
      code: "db-dir-not-writable",
      message: "Database directory ./db/ is not writable",
      detail: "Check file permissions on the ./db/ directory",
      severity: "error",
    });
  }
}

function auditSSHKeys(
  env: Record<string, string | undefined>,
  issues: AuditIssue[],
): void {
  const sshKeysDir = env.HETZNER_SSH_KEYS_DIR;
  if (!sshKeysDir) return;

  if (!existsSync(sshKeysDir)) {
    issues.push({
      code: "ssh-keys-dir-missing",
      message: `SSH keys directory not found: ${sshKeysDir}`,
      detail: "HETZNER_SSH_KEYS_DIR is set but the directory does not exist",
      severity: "warning",
    });
    return;
  }

  try {
    const files = readdirSync(sshKeysDir);
    if (files.length === 0) {
      issues.push({
        code: "ssh-keys-dir-empty",
        message: "SSH keys directory exists but contains no keys",
        detail: `Directory: ${sshKeysDir}`,
        severity: "info",
      });
    }
  } catch {
    issues.push({
      code: "ssh-keys-dir-missing",
      message: `Cannot read SSH keys directory: ${sshKeysDir}`,
      severity: "warning",
    });
  }
}

async function auditPort(
  env: Record<string, string | undefined>,
  issues: AuditIssue[],
): Promise<void> {
  const port = parseInt(env.PORT || "3000", 10);
  try {
    const server = Bun.listen({
      hostname: "127.0.0.1",
      port,
      socket: {
        data() {},
      },
    });
    server.stop();
  } catch {
    issues.push({
      code: "port-in-use",
      message: `Port ${port} appears to be in use`,
      detail: "Another process may already be bound to this port",
      severity: "warning",
    });
  }
}

async function auditNetwork(issues: AuditIssue[]): Promise<void> {
  try {
    await fetch(HETZNER_API_URL, {
      method: "HEAD",
      signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
    });
  } catch {
    issues.push({
      code: "network-hetzner-unreachable",
      message: "Cannot reach api.hetzner.cloud",
      detail: "Check network connectivity or firewall rules",
      severity: "warning",
    });
  }

  try {
    await fetch(AI_API_URL, {
      method: "HEAD",
      signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
    });
  } catch {
    issues.push({
      code: "network-ai-unreachable",
      message: "Cannot reach api.z.ai",
      detail: "AI features may not work without connectivity",
      severity: "info",
    });
  }
}

export async function auditConfig(
  env: Record<string, string | undefined> = process.env as Record<
    string,
    string | undefined
  >,
): Promise<AuditResult> {
  const issues: AuditIssue[] = [];

  auditHetznerToken(env, issues);
  auditAIKeys(env, issues);
  auditBunRuntime(issues);
  auditDatabase(issues);
  auditSSHKeys(env, issues);

  await Promise.all([
    auditHetznerTokenRemote(issues),
    auditPort(env, issues),
    auditNetwork(issues),
  ]);

  return {
    ok: issues.filter((i) => i.severity === "error").length === 0,
    issues,
    timestamp: new Date().toISOString(),
  };
}
