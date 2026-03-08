/**
 * SSH Key Manager - Single Source of Truth
 *
 * Consolidates SSH key creation, upload, and management for Hetzner.
 * Replaces duplicate ensureSSHKey() functions in api.ts and crud.ts.
 *
 * FEATURES:
 * - Create or reuse local SSH key pairs
 * - Upload public key to Hetzner if not exists
 * - Handle fingerprint format conversion (SHA256 <-> MD5)
 * - Provide consistent API for all SSH key operations
 * - OS-specific user data directory for portable key storage
 *
 * ENVIRONMENT VARIABLES:
 * - HETZNER_SSH_KEYS_DIR: Override default SSH keys directory
 */

import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import type { HetznerClient } from "../hetzner/client.js";
import type { HetznerSSHKey } from "../hetzner/types.js";
import { getLocalKeyFingerprint } from "./fingerprint.js";

// TypeScript declaration for environment variable
declare module "bun" {
  interface Env {
    HETZNER_SSH_KEYS_DIR?: string;
  }
}

/**
 * Get OS-specific user data directory for SSH keys
 * - macOS: ~/Library/Application Support/com.hetzner.codespaces/ssh-keys/
 * - Linux: ~/.config/com.hetzner.codespaces/ssh-keys/
 * - Windows: %APPDATA%\com.hetzner.codespaces\ssh-keys\
 *
 * Can be overridden via .env file:
 *   HETZNER_SSH_KEYS_DIR=/custom/path
 */
export function getDefaultKeysDir(): string {
  // Allow override via environment variable (Bun reads .env automatically)
  const envDir = Bun.env.HETZNER_SSH_KEYS_DIR || process.env.HETZNER_SSH_KEYS_DIR;
  if (envDir) {
    return envDir;
  }

  const home = process.env.HOME || process.env.USERPROFILE || "~";
  const appName = "com.hetzner.codespaces";

  if (process.platform === "darwin") {
    return join(home, "Library", "Application Support", appName, "ssh-keys");
  } else if (process.platform === "linux") {
    return join(home, ".config", appName, "ssh-keys");
  } else if (process.platform === "win32") {
    const appData = process.env.APPDATA || join(home, "AppData", "Roaming");
    return join(appData, appName, "ssh-keys");
  }

  // Universal fallback
  return join(home, `.${appName}`, "ssh-keys");
}

/**
 * SSH Key information returned by the manager
 */
export interface SSHKeyInfo {
  keyId: number;
  keyPath: string;
  fingerprint: string;
  name: string;
}

/**
 * Configuration for SSH key manager
 */
export interface SSHKeyManagerConfig {
  keyName?: string;
  keysDir?: string;  // Optional: defaults to OS-specific user data directory
}

/**
 * Default SSH key configuration
 */
const DEFAULT_KEY_NAME = "hetzner-codespaces-default";

/**
 * Fingerprint format types
 */
export type FingerprintFormat = "md5" | "sha256";

/**
 * Convert SSH key fingerprint between formats
 * Hetzner uses MD5 with colons, modern tools use SHA256
 */
export async function convertFingerprintFormat(
  publicKeyPath: string,
  format: FingerprintFormat
): Promise<string> {
  const flag = format === "md5" ? ["-E", "md5"] : [];
  // Bun.$ automatically escapes arguments to prevent shell injection
  const result = await Bun.$`ssh-keygen -l -f ${publicKeyPath} ${flag}`.quiet();
  const stdout = result.stdout.toString();

  // Extract fingerprint from output
  // MD5 format: "256 MD5:13:ac:a1:ea:4e:ce:9e:8c:32:1a:9e:23:d8:1c:e4:93 comment (ED25519)"
  // SHA256 format: "256 SHA256:+JgBxEtEo1NSfUtA+Lcy7hZrh7nb6j/oo6hmP7x8Hjw comment (ED25519)"
  const parts = stdout.trim().split(/\s+/);
  let fingerprint = parts[1];

  // Remove "MD5:" prefix if present (Hetzner API returns it without prefix)
  if (fingerprint.startsWith("MD5:")) {
    fingerprint = fingerprint.replace("MD5:", "");
  }

  return fingerprint;
}

/**
 * Get SSH key fingerprint in the format expected by Hetzner API (MD5 with colons)
 */
async function getHetznerFingerprint(publicKeyPath: string): Promise<string> {
  return convertFingerprintFormat(publicKeyPath, "md5");
}

/**
 * Get SSH key fingerprint in modern SHA256 format (for local use)
 */
async function getLocalFingerprint(publicKeyPath: string): Promise<string> {
  return convertFingerprintFormat(publicKeyPath, "sha256");
}

/**
 * Create a new SSH key pair
 */
async function createKeyPair(keyPath: string, keyName: string): Promise<void> {
  console.log(`[SSH] Generating new SSH key pair: ${keyPath}`);
  // Bun.$ automatically escapes arguments to prevent shell injection
  await Bun.$`ssh-keygen -t ed25519 -f ${keyPath} -N "" -C ${keyName}`.quiet();
}

/**
 * Find SSH key in Hetzner by fingerprint
 */
async function findKeyByFingerprint(
  hetznerClient: HetznerClient,
  fingerprint: string
): Promise<HetznerSSHKey | null> {
  const existingKeys = await hetznerClient.ssh_keys.list();
  return existingKeys.find((k) => k.fingerprint === fingerprint) || null;
}

/**
 * Upload new SSH key to Hetzner
 */
async function uploadKeyToHetzner(
  hetznerClient: HetznerClient,
  keyName: string,
  publicKey: string
): Promise<HetznerSSHKey> {
  console.log(`[SSH] Uploading SSH key to Hetzner: ${keyName}`);
  return await hetznerClient.ssh_keys.create({
    name: keyName,
    public_key: publicKey.trim(),
  });
}

/**
 * SSH Key Manager - Main class for managing SSH keys
 */
export class SSHKeyManager {
  private keyName: string;
  private keysDir: string;

  constructor(config: SSHKeyManagerConfig = {}) {
    this.keyName = config.keyName || DEFAULT_KEY_NAME;
    // Use provided keysDir or fall back to OS-specific default
    this.keysDir = config.keysDir || getDefaultKeysDir();
  }

  /**
   * Get the absolute path to the SSH keys directory
   */
  private getKeysDirPath(): string {
    return this.keysDir;
  }

  /**
   * Get the full path to the SSH key files (absolute path)
   */
  private getKeyPath(): string {
    return join(this.keysDir, this.keyName);
  }

  /**
   * Ensure SSH key exists locally and on Hetzner
   * This is the main entry point - replaces duplicate ensureSSHKey() functions
   *
   * @param hetznerClient - Hetzner API client
   * @returns SSH key information for server creation
   */
  async ensureSSHKey(hetznerClient: HetznerClient): Promise<SSHKeyInfo> {
    // Ensure .ssh-keys directory exists (use absolute path)
    const keysDirPath = this.getKeysDirPath();
    mkdirSync(keysDirPath, { recursive: true });

    const keyPath = this.getKeyPath();
    const publicKeyPath = `${keyPath}.pub`;

    // Check if key file exists locally
    let publicKey: string;
    let fingerprint: string;

    if (existsSync(publicKeyPath)) {
      // Read existing public key
      publicKey = await Bun.file(publicKeyPath).text();
      // Get fingerprint in Hetzner format (MD5 with colons)
      fingerprint = await getHetznerFingerprint(publicKeyPath);
    } else {
      // Generate new key pair
      await createKeyPair(keyPath, this.keyName);
      publicKey = await Bun.file(publicKeyPath).text();
      fingerprint = await getHetznerFingerprint(publicKeyPath);
    }

    // Check if key exists on Hetzner by fingerprint
    const existingKey = await findKeyByFingerprint(hetznerClient, fingerprint);

    if (existingKey) {
      console.log(
        `[SSH] Using existing Hetzner SSH key: ${existingKey.name} (ID: ${existingKey.id})`,
      );
      return {
        keyId: existingKey.id,
        keyPath,
        fingerprint,
        name: existingKey.name,
      };
    }

    // Upload new key to Hetzner
    try {
      const newKey = await uploadKeyToHetzner(hetznerClient, this.keyName, publicKey);
      console.log(`[SSH] SSH key uploaded: ${newKey.name} (ID: ${newKey.id})`);
      return {
        keyId: newKey.id,
        keyPath,
        fingerprint,
        name: newKey.name,
      };
    } catch (error: any) {
      // Handle "already exists" error - try to find by name
      if (
        error?.message?.includes("not unique") ||
        error?.message?.includes("already exists")
      ) {
        console.log(
          `[SSH] Key already exists in Hetzner, finding by name...`,
        );
        const keyByName = await hetznerClient.ssh_keys.findByName(this.keyName);

        if (keyByName) {
          console.log(
            `[SSH] Found existing key by name: ${keyByName.name} (ID: ${keyByName.id})`,
          );
          return {
            keyId: keyByName.id,
            keyPath,
            fingerprint: keyByName.fingerprint,
            name: keyByName.name,
          };
        }
      }
      throw error;
    }
  }

  /**
   * Get local key fingerprint in SHA256 format
   */
  async getLocalFingerprint(): Promise<string | null> {
    const keyPath = this.getKeyPath();
    return getLocalKeyFingerprint(keyPath);
  }

  /**
   * Get local key fingerprint in MD5 format (for Hetzner comparison)
   */
  async getHetznerFingerprint(): Promise<string> {
    const publicKeyPath = `${this.getKeyPath()}.pub`;
    return getHetznerFingerprint(publicKeyPath);
  }

  /**
   * Get the key path
   */
  getKeyPathValue(): string {
    return this.getKeyPath();
  }
}

/**
 * Convenience function - creates default manager and ensures SSH key
 * This is a drop-in replacement for the old ensureSSHKey() functions
 *
 * @param hetznerClient - Hetzner API client
 * @param config - Optional configuration
 * @returns SSH key information
 */
export async function ensureSSHKey(
  hetznerClient: HetznerClient,
  config?: SSHKeyManagerConfig
): Promise<SSHKeyInfo> {
  const manager = new SSHKeyManager(config);
  return manager.ensureSSHKey(hetznerClient);
}
