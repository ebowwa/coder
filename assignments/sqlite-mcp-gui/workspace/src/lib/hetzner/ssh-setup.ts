/**
 * SSH Key Management for Hetzner
 *
 * This module ensures SSH keys are properly configured between:
 * 1. Local machine (~/.ssh/)
 * 2. Hetzner Cloud API
 *
 * PROBLEM:
 * - Creating random keys in Hetzner doesn't work because we need the matching private key locally
 * - Password auth is unreliable and often disabled
 * - IP reuse causes known_hosts conflicts
 *
 * SOLUTION:
 * - Always use existing local keys or create new key pairs
 * - Upload public key to Hetzner, keep private key local
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import crypto from "crypto";

interface SSHKey {
  id: number;
  name: string;
  fingerprint: string;
  public_key: string;
}

interface LocalKeyPair {
  name: string;
  publicKey: string;
  privateKeyPath: string;
}

const HETZNER_SSH_DIR = join(process.env.HOME || "", ".ssh");
const HETZNER_KEY_PREFIX = "hetzner-codespaces";

/**
 * Get or create a local SSH key pair for Hetzner
 * Returns the key name to use with Hetzner API
 */
export async function getOrCreateHetznerSSHKey(): Promise<LocalKeyPair> {
  // Check for existing Hetzner keys
  const existingKey = findExistingHetznerKey();
  if (existingKey) {
    console.log(`✓ Using existing SSH key: ${existingKey.name}`);
    return existingKey;
  }

  // Create new key pair
  console.log("Creating new SSH key pair for Hetzner...");
  return createNewKeyPair();
}

/**
 * Find existing Hetzner SSH key in local ~/.ssh/
 */
function findExistingHetznerKey(): LocalKeyPair | null {
  const privateKeyPath = join(HETZNER_SSH_DIR, `${HETZNER_KEY_PREFIX}`);
  const publicKeyPath = `${privateKeyPath}.pub`;

  if (!existsSync(privateKeyPath) || !existsSync(publicKeyPath)) {
    return null;
  }

  const publicKey = readFileSync(publicKeyPath, "utf-8").trim();

  return {
    name: HETZNER_KEY_PREFIX,
    publicKey,
    privateKeyPath,
  };
}

/**
 * Create a new SSH key pair for Hetzner
 */
function createNewKeyPair(): LocalKeyPair {
  const keyName = `${HETZNER_KEY_PREFIX}-${Date.now()}`;
  const privateKeyPath = join(HETZNER_SSH_DIR, keyName);
  const publicKeyPath = `${privateKeyPath}.pub`;

  // Generate new ed25519 key pair
  try {
    // Bun.spawn automatically escapes arguments to prevent shell injection
    Bun.spawnSync(["ssh-keygen", "-t", "ed25519", "-f", privateKeyPath, "-N", "", "-C", keyName], {
      stdout: "ignore",
      stderr: "ignore",
    });

    // Set proper permissions
    Bun.spawnSync(["chmod", "600", privateKeyPath], { stdout: "ignore", stderr: "ignore" });
    Bun.spawnSync(["chmod", "644", publicKeyPath], { stdout: "ignore", stderr: "ignore" });

    const publicKey = readFileSync(publicKeyPath, "utf-8").trim();

    console.log(`✓ Created new SSH key: ${keyName}`);
    console.log(`  Private: ${privateKeyPath}`);
    console.log(`  Public:  ${publicKeyPath}`);

    return {
      name: keyName,
      publicKey,
      privateKeyPath,
    };
  } catch (error) {
    throw new Error(`Failed to create SSH key: ${error}`);
  }
}

/**
 * Ensure SSH key exists in Hetzner
 * Returns the SSH key name to use when creating servers
 */
export async function ensureHetznerSSHKey(
  hetznerAPI: (endpoint: string, method: string, body?: unknown) => Promise<Response>
): Promise<string> {
  // 1. Get or create local key pair
  const localKey = await getOrCreateHetznerSSHKey();

  // 2. Check if key exists in Hetzner
  const existingKeys = await hetznerAPI("/ssh_keys", "GET", null)
    .then((r) => r.json())
    .then((data) => data.ssh_keys as SSHKey[]);

  // 3. Find matching key by public key
  const matchingKey = existingKeys.find((k) => k.public_key.trim() === localKey.publicKey.trim());

  if (matchingKey) {
    console.log(`✓ SSH key already exists in Hetzner: ${matchingKey.name} (${matchingKey.id})`);
    return matchingKey.name; // Use existing key name
  }

  // 4. Upload new key to Hetzner
  console.log(`Uploading SSH key to Hetzner: ${localKey.name}...`);
  const createResponse = await hetznerAPI("/ssh_keys", "POST", {
    name: localKey.name,
    public_key: localKey.publicKey,
  });

  if (!createResponse.ok) {
    const error = await createResponse.text();
    throw new Error(`Failed to upload SSH key to Hetzner: ${error}`);
  }

  const createdKey = (await createResponse.json()) as SSHKey;
  console.log(`✓ SSH key uploaded: ${createdKey.name} (${createdKey.id})`);

  return createdKey.name;
}

/**
 * Clear known_hosts entry for an IP (to fix IP reuse issues)
 */
export function clearKnownHosts(ip: string): void {
  try {
    // Bun.spawn automatically escapes arguments to prevent shell injection
    Bun.spawnSync(["ssh-keygen", "-R", ip], { stdout: "ignore", stderr: "ignore" });
    console.log(`✓ Cleared known_hosts entry for ${ip}`);
  } catch {
    // Ignore if entry doesn't exist
  }
}

/**
 * Test SSH connection to a server
 */
export async function testSSHConnection(
  ip: string,
  privateKeyPath: string,
  username: string = "root"
): Promise<boolean> {
  try {
    // Bun.spawn automatically escapes arguments to prevent shell injection
    const proc = Bun.spawn([
      "ssh",
      "-F", "/dev/null",
      "-o", "StrictHostKeyChecking=no",
      "-o", "UserKnownHostsFile=/dev/null",
      "-o", "ConnectTimeout=10",
      "-i", privateKeyPath,
      `${username}@${ip}`,
      "echo", "connected"
    ], {
      stdout: "ignore",
      stderr: "ignore",
    });

    // Wait for process to complete with timeout
    const timeout = setTimeout(() => proc.kill(), 15000);
    await proc.exited;
    clearTimeout(timeout);

    return proc.exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * Full workflow: Prepare SSH keys before creating servers
 */
export async function prepareSSHKeys(
  hetznerAPI: (endpoint: string, method: string, body?: unknown) => Promise<Response>
): Promise<{
  sshKeyName: string;
  privateKeyPath: string;
}> {
  const sshKeyName = await ensureHetznerSSHKey(hetznerAPI);
  const localKey = await getOrCreateHetznerSSHKey();

  return {
    sshKeyName,
    privateKeyPath: localKey.privateKeyPath,
  };
}
