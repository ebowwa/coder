/**
 * SSH Config Manager
 *
 * Manages ~/.ssh/config entries for easy node access.
 * When a node is created, adds an alias so you can:
 *   ssh node-<id>    or    ssh <name>
 * Instead of:
 *   ssh -i ~/.../key -o StrictHostKeyChecking=no root@167.235.236.8
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, realpathSync } from "fs";
import { join, dirname, isAbsolute, resolve } from "path";

const SSH_CONFIG_PATH = join(process.env.HOME || "~", ".ssh", "config");

// Marker comments to identify our managed entries
const BLOCK_START = "# >>> hetzner-codespaces managed";
const BLOCK_END = "# <<< hetzner-codespaces managed";

/**
 * Resolve a path to absolute, handling relative paths
 */
function resolveKeyPath(keyPath: string): string {
  if (isAbsolute(keyPath)) {
    return keyPath;
  }

  // Try to resolve relative to current working directory
  const resolved = resolve(process.cwd(), keyPath);

  // If file exists at resolved path, use it
  if (existsSync(resolved)) {
    try {
      return realpathSync(resolved);
    } catch {
      return resolved;
    }
  }

  // Return as-is if we can't resolve it
  return keyPath;
}

export interface SSHConfigEntry {
  id: string;
  name: string;
  host: string;
  user?: string;
  keyPath: string;
  port?: number;
}

/**
 * Read the current SSH config file
 */
function readSSHConfig(): string {
  if (!existsSync(SSH_CONFIG_PATH)) {
    return "";
  }
  return readFileSync(SSH_CONFIG_PATH, "utf-8");
}

/**
 * Write to SSH config file, ensuring proper permissions
 */
function writeSSHConfig(content: string): void {
  const sshDir = dirname(SSH_CONFIG_PATH);

  // Ensure ~/.ssh exists with correct permissions
  if (!existsSync(sshDir)) {
    mkdirSync(sshDir, { mode: 0o700, recursive: true });
  }

  writeFileSync(SSH_CONFIG_PATH, content, { mode: 0o600 });
}

/**
 * Extract our managed block from SSH config
 */
function extractManagedBlock(config: string): { before: string; managed: string; after: string } {
  const startIdx = config.indexOf(BLOCK_START);
  const endIdx = config.indexOf(BLOCK_END);

  if (startIdx === -1 || endIdx === -1) {
    return { before: config, managed: "", after: "" };
  }

  return {
    before: config.substring(0, startIdx),
    managed: config.substring(startIdx, endIdx + BLOCK_END.length + 1),
    after: config.substring(endIdx + BLOCK_END.length + 1),
  };
}

/**
 * Parse managed block into entries
 */
function parseManagedEntries(managed: string): Map<string, SSHConfigEntry> {
  const entries = new Map<string, SSHConfigEntry>();

  // Match Host blocks within managed section
  const hostRegex = /# node-id: (\S+)\nHost ([^\n]+)\n([\s\S]*?)(?=# node-id:|$)/g;
  let match;

  while ((match = hostRegex.exec(managed)) !== null) {
    const id = match[1];
    const hosts = match[2].trim();
    const body = match[3];

    // Parse body for HostName, User, IdentityFile, Port
    const hostMatch = body.match(/HostName\s+(\S+)/);
    const userMatch = body.match(/User\s+(\S+)/);
    const keyMatch = body.match(/IdentityFile\s+(\S+)/);
    const portMatch = body.match(/Port\s+(\d+)/);

    if (hostMatch && keyMatch) {
      entries.set(id, {
        id,
        name: hosts.split(/\s+/)[1] || hosts, // Second alias is usually the name
        host: hostMatch[1],
        user: userMatch?.[1] || "root",
        keyPath: keyMatch[1],
        port: portMatch ? parseInt(portMatch[1]) : 22,
      });
    }
  }

  return entries;
}

/**
 * Generate SSH config block for an entry
 */
function generateEntryBlock(entry: SSHConfigEntry): string {
  // Create aliases: node-<id> and <name> (sanitized)
  const sanitizedName = entry.name.replace(/[^a-zA-Z0-9_-]/g, "-");
  const aliases = `node-${entry.id} ${sanitizedName}`;

  // Resolve key path to absolute
  const absoluteKeyPath = resolveKeyPath(entry.keyPath);

  return `# node-id: ${entry.id}
Host ${aliases}
  HostName ${entry.host}
  User ${entry.user || "root"}
  IdentityFile "${absoluteKeyPath}"
  Port ${entry.port || 22}
  StrictHostKeyChecking no
  UserKnownHostsFile /dev/null
  LogLevel ERROR
  IdentitiesOnly yes

`;
}

/**
 * Rebuild the managed block from entries
 */
function buildManagedBlock(entries: Map<string, SSHConfigEntry>): string {
  if (entries.size === 0) {
    return "";
  }

  let block = `${BLOCK_START}\n`;
  block += "# Auto-generated SSH aliases for Hetzner nodes\n";
  block += "# Do not edit manually - changes will be overwritten\n\n";

  for (const entry of entries.values()) {
    block += generateEntryBlock(entry);
  }

  block += `${BLOCK_END}\n`;
  return block;
}

/**
 * Add or update an SSH config entry for a node
 */
export function addSSHConfigEntry(entry: SSHConfigEntry): void {
  const config = readSSHConfig();
  const { before, managed, after } = extractManagedBlock(config);

  // Parse existing entries
  const entries = parseManagedEntries(managed);

  // Add/update entry
  entries.set(entry.id, entry);

  // Rebuild config
  const newManaged = buildManagedBlock(entries);
  const newConfig = before.trimEnd() + "\n\n" + newManaged + after.trimStart();

  writeSSHConfig(newConfig);

  console.log(`[SSH Config] Added alias: ssh node-${entry.id} / ssh ${entry.name.replace(/[^a-zA-Z0-9_-]/g, "-")}`);
}

/**
 * Remove an SSH config entry for a node
 */
export function removeSSHConfigEntry(id: string): void {
  const config = readSSHConfig();
  const { before, managed, after } = extractManagedBlock(config);

  // Parse existing entries
  const entries = parseManagedEntries(managed);

  // Remove entry
  if (!entries.has(id)) {
    return; // Nothing to remove
  }

  entries.delete(id);

  // Rebuild config
  const newManaged = buildManagedBlock(entries);
  const newConfig = before.trimEnd() + (newManaged ? "\n\n" + newManaged : "") + after.trimStart();

  writeSSHConfig(newConfig);

  console.log(`[SSH Config] Removed alias for node-${id}`);
}

/**
 * Update IP address for an existing node (e.g., after rebuild)
 */
export function updateSSHConfigHost(id: string, newHost: string): void {
  const config = readSSHConfig();
  const { before, managed, after } = extractManagedBlock(config);

  // Parse existing entries
  const entries = parseManagedEntries(managed);

  // Update entry
  const entry = entries.get(id);
  if (!entry) {
    console.warn(`[SSH Config] No entry found for node-${id}`);
    return;
  }

  entry.host = newHost;
  entries.set(id, entry);

  // Rebuild config
  const newManaged = buildManagedBlock(entries);
  const newConfig = before.trimEnd() + "\n\n" + newManaged + after.trimStart();

  writeSSHConfig(newConfig);

  console.log(`[SSH Config] Updated node-${id} host to ${newHost}`);
}

/**
 * List all managed SSH config entries
 */
export function listSSHConfigEntries(): SSHConfigEntry[] {
  const config = readSSHConfig();
  const { managed } = extractManagedBlock(config);
  const entries = parseManagedEntries(managed);
  return Array.from(entries.values());
}

/**
 * Validate SSH connection works with the configured key
 * Returns true if connection succeeds, throws on failure with diagnostic info
 */
export async function validateSSHConnection(
  host: string,
  keyPath: string,
  user: string = "root",
  timeoutSeconds: number = 10
): Promise<{ success: boolean; error?: string; diagnostics?: string }> {
  try {
    // Test connection with explicit key and bypass agent
    // Bun.$ automatically escapes arguments to prevent shell injection
    const result = await Bun.$`ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=${timeoutSeconds} -o IdentitiesOnly=yes -o BatchMode=yes -i ${keyPath} ${user}@${host} echo CONNECTION_OK`.quiet();
    const stdout = result.stdout.toString();

    if (stdout.includes("CONNECTION_OK")) {
      return { success: true };
    }

    return {
      success: false,
      error: "Connection established but test command failed",
      diagnostics: stdout
    };
  } catch (error: any) {
    // Gather diagnostic info
    let diagnostics = "";

    // Check if key file exists
    if (!existsSync(keyPath)) {
      diagnostics += `Key file missing: ${keyPath}\n`;
    }

    // Check ssh-agent keys
    try {
      const agentResult = await Bun.$`ssh-add -l`.quiet();
      diagnostics += `ssh-agent keys:\n${agentResult.stdout.toString()}\n`;
    } catch {
      diagnostics += "ssh-agent: no keys loaded\n";
    }

    return {
      success: false,
      error: error.message || String(error),
      diagnostics,
    };
  }
}

/**
 * Ensure SSH key is loaded correctly and agent doesn't interfere
 * Clears wrong keys from agent and adds the correct one
 */
export async function ensureCorrectSSHKey(keyPath: string): Promise<void> {
  try {
    // Get fingerprint of our key
    // Bun.$ automatically escapes arguments to prevent shell injection
    const fpResult = await Bun.$`ssh-keygen -lf ${keyPath}.pub`.quiet();
    const ourFp = fpResult.stdout.toString().split(/\s+/)[1];

    // Check what's in the agent
    let agentList = "";
    try {
      const agentResult = await Bun.$`ssh-add -l`.quiet();
      agentList = agentResult.stdout.toString();
    } catch {
      agentList = "";
    }

    // If our key isn't in the agent, add it
    if (!agentList.includes(ourFp)) {
      // Clear agent and add our key
      try {
        await Bun.$`ssh-add -D`.quiet();
      } catch {}
      await Bun.$`ssh-add ${keyPath}`.quiet();
      console.log(`[SSH] Added key to ssh-agent: ${keyPath}`);
    }
  } catch (error) {
    // Non-fatal - we can still use the key file directly
    console.warn(`[SSH] Could not configure ssh-agent: ${error}`);
  }
}

/**
 * Wait for SSH to become ready on a new server
 * Polls until connection succeeds or timeout
 */
export async function waitForSSHReady(
  host: string,
  keyPath: string,
  options: {
    user?: string;
    maxAttempts?: number;
    intervalMs?: number;
    onAttempt?: (attempt: number, maxAttempts: number) => void;
  } = {}
): Promise<{ success: boolean; attempts: number; error?: string }> {
  const {
    user = "root",
    maxAttempts = 30,      // 30 attempts
    intervalMs = 5000,     // 5 seconds between attempts = 2.5 min max wait
    onAttempt,
  } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    onAttempt?.(attempt, maxAttempts);

    const result = await validateSSHConnection(host, keyPath, user, 5);

    if (result.success) {
      return { success: true, attempts: attempt };
    }

    // Check for fatal errors (not just "connection refused")
    if (result.error?.includes("Permission denied")) {
      // Key mismatch - won't resolve by waiting
      return {
        success: false,
        attempts: attempt,
        error: `SSH key rejected: ${result.error}\n${result.diagnostics || ""}`,
      };
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  return {
    success: false,
    attempts: maxAttempts,
    error: `SSH not ready after ${maxAttempts} attempts (${(maxAttempts * intervalMs) / 1000}s)`,
  };
}

/**
 * Sync result for a single node
 */
export interface SyncResult {
  id: string;
  name: string;
  ip: string;
  status: "added" | "updated" | "skipped" | "error";
  error?: string;
  sshReady?: boolean;
}

/**
 * Sync all existing Hetzner nodes to SSH config
 * Call this to add aliases for nodes created before this feature
 */
export async function syncNodesToSSHConfig(
  nodes: Array<{
    id: string;
    name: string;
    ip: string;
    keyPath: string;
  }>,
  options: {
    validateSSH?: boolean;
    onProgress?: (result: SyncResult) => void;
  } = {}
): Promise<SyncResult[]> {
  const { validateSSH = false, onProgress } = options;
  const results: SyncResult[] = [];

  // Get current entries
  const existingEntries = listSSHConfigEntries();
  const existingIds = new Set(existingEntries.map((e) => e.id));

  for (const node of nodes) {
    const result: SyncResult = {
      id: node.id,
      name: node.name,
      ip: node.ip,
      status: "added",
    };

    try {
      // Check if already exists
      if (existingIds.has(node.id)) {
        const existing = existingEntries.find((e) => e.id === node.id);
        if (existing?.host === node.ip) {
          result.status = "skipped";
        } else {
          // IP changed, update it
          updateSSHConfigHost(node.id, node.ip);
          result.status = "updated";
        }
      } else {
        // Add new entry
        addSSHConfigEntry({
          id: node.id,
          name: node.name,
          host: node.ip,
          user: "root",
          keyPath: node.keyPath,
        });
        result.status = "added";
      }

      // Optionally validate SSH works
      if (validateSSH && result.status !== "skipped") {
        const sshResult = await validateSSHConnection(node.ip, node.keyPath);
        result.sshReady = sshResult.success;
        if (!sshResult.success) {
          result.error = sshResult.error;
        }
      }
    } catch (error) {
      result.status = "error";
      result.error = String(error);
    }

    results.push(result);
    onProgress?.(result);
  }

  return results;
}
