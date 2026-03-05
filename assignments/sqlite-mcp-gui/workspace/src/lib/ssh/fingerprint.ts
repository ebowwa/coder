/**
 * SSH fingerprint utilities with validation and recovery
 *
 * Migrated from child_process.exec → Bun.$ and Bun.spawn to prevent
 * shell injection. Bun.$ template literals treat interpolated values
 * as single escaped arguments (no word-splitting or glob expansion).
 * Bun.spawn is used where timeout support is needed (Bun.$ lacks it).
 * See: https://bun.sh/docs/runtime/shell
 */

import type { SSHOptions } from "./types.js";
import { spawn } from "child_process"; // still used by getRemoteFingerprint's keyscan fallback
import { readFile } from "fs/promises";

/**
 * Get SSH fingerprint from remote server
 * @param options - SSH connection options
 * @returns SSH fingerprint or null
 */
export async function getSSHFingerprint(
  options: SSHOptions,
): Promise<string | null> {
  const { host, port = 22 } = options;

  try {
    const proc = Bun.spawn(["ssh-keyscan", "-p", port.toString(), `${host}`], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const output = await new Response(proc.stdout).text();
    await proc.exited;

    // Parse fingerprint from output
    const lines = output.split("\n");
    for (const line of lines) {
      if (line.includes(host)) {
        const parts = line.split(" ");
        if (parts.length >= 3) {
          return parts[2]; // Return the fingerprint
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get SSH fingerprint from a local private key file
 * @param keyPath - Path to the private key file
 * @returns SSH fingerprint (SHA256 format) or null
 */
export async function getLocalKeyFingerprint(
  keyPath: string,
): Promise<string | null> {
  try {
    // Try ssh-keygen first (most reliable)
    // Bun.$ escapes ${keyPath} as a single arg — safe with spaces in paths
    try {
      const result = await Bun.$`ssh-keygen -lf ${keyPath}`.quiet();
      const stdout = result.stdout.toString();
      const match = stdout.match(/SHA256:(\S+)/i);
      if (match) {
        return match[1];
      }
    } catch {
      // ssh-keygen might not be available, try fallback
    }

    // Fallback: Try to extract from the key file directly
    const keyContent = await readFile(keyPath, "utf-8");

    // For ED25519 keys, the public key is embedded
    if (keyContent.includes("OPENSSH") && keyContent.includes("ssh-ed25519")) {
      // Extract the public key part
      const lines = keyContent.split("\n");
      for (const line of lines) {
        if (line.startsWith("ssh-ed25519")) {
          // Pipe public key line to ssh-keygen to calculate fingerprint.
          // Bun.$ treats ${line} as a single literal arg to echo (no word-splitting),
          // so the full key string "ssh-ed25519 AAAA... comment" pipes intact.
          const result = await Bun.$`echo ${line} | ssh-keygen -lf -`.quiet();
          const stdout = result.stdout.toString();
          const match = stdout.match(/SHA256:(\S+)/i);
          if (match) {
            return match[1];
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error("[Fingerprint] Failed to get local key fingerprint:", error);
    return null;
  }
}

/**
 * Convert MD5 fingerprint format to SHA256 format (for comparison)
 * Hetzner returns MD5 like "29:cd:c1:c3:84:eb:ca:31:a4:1f:94:69:0c:84:b3:56"
 * We need to handle both formats
 */
export function normalizeFingerprint(fingerprint: string): string {
  // Remove colons from MD5 format for easier comparison
  return fingerprint.replace(/:/g, "").toLowerCase();
}

/**
 * Validate that a local SSH key matches what's on a remote server
 * @param host - Server hostname or IP
 * @param keyPath - Path to local private key
 * @returns Validation result
 */
export async function validateSSHKeyMatch(
  host: string,
  keyPath: string,
): Promise<{
  valid: boolean;
  localFingerprint?: string;
  remoteFingerprint?: string;
  error?: string;
}> {
  try {
    // Get local fingerprint
    const localFingerprint = await getLocalKeyFingerprint(keyPath);
    if (!localFingerprint) {
      return {
        valid: false,
        error: "Could not read local SSH key fingerprint",
      };
    }

    // Get remote fingerprint
    const remoteFingerprint = await getSSHFingerprint({ host });
    if (!remoteFingerprint) {
      return {
        valid: false,
        error: "Could not get remote SSH fingerprint",
      };
    }

    // Normalize both for comparison
    const localNormalized = normalizeFingerprint(localFingerprint);
    const remoteNormalized = normalizeFingerprint(remoteFingerprint);

    const match = localNormalized === remoteNormalized ||
                   localFingerprint === remoteFingerprint ||
                   localFingerprint === remoteFingerprint.replace(/:/g, "");

    return {
      valid: match,
      localFingerprint: localFingerprint,
      remoteFingerprint: remoteFingerprint,
      error: match ? undefined : "Fingerprints do not match",
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check if we can SSH to a server with a given key
 * @param host - Server hostname or IP
 * @param keyPath - Path to SSH private key
 * @returns true if SSH works
 */
export async function testSSHKeyConnection(
  host: string,
  keyPath: string,
): Promise<boolean> {
  try {
    // Bun.spawn (not Bun.$) because we need timeout: 10000ms.
    // Bun.$ has no timeout support — see https://github.com/oven-sh/bun/issues/11868
    // ConnectTimeout=5 only covers TCP handshake; timeout covers the entire process
    // so a hung remote command won't block forever.
    const proc = Bun.spawn(
      ["ssh", "-F", "/dev/null", "-i", keyPath, "-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null", "-o", "ConnectTimeout=5", host, "echo", "ok"],
      { stdout: "ignore", stderr: "ignore", timeout: 10000 }
    );
    await proc.exited;
    return proc.exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * SSH Key Mismatch Error with recovery suggestions
 */
export class SSHKeyMismatchError extends Error {
  constructor(
    public host: string,
    public localFingerprint: string,
    public hetznerFingerprint: string,
    public keyPath: string,
  ) {
    const hetznerShort = hetznerFingerprint.split(":").slice(0, 4).join(":");
    const localShort = localFingerprint.slice(0, 16);

    super(
      `SSH key mismatch for ${host}\n` +
      `  Local key (${keyPath}):   ${localShort}...\n` +
      `  Hetzner key:            ${hetznerShort}...\n\n` +
      `The local private key doesn't match the public key on Hetzner.\n\n` +
      `RECOVERY OPTIONS:\n` +
      `1. Create a new SSH key and upload to Hetzner\n` +
      `2. Regenerate local key to match Hetzner's key\n` +
      `3. Use the correct key path for this server`
    );
    this.name = "SSHKeyMismatchError";
  }
}

/**
 * Comprehensive SSH key validation for server creation
 * @param host - Server hostname or IP
 * @param keyPath - Path to local SSH key
 * @param hetznerKeyId - SSH key ID on Hetzner (for comparison)
 * @returns Validation result with recovery suggestions
 */
export async function validateSSHKeyForServer(
  host: string,
  keyPath: string,
  hetznerKeyId?: string,
): Promise<{
  canConnect: boolean;
  fingerprintMatch: boolean;
  localFingerprint?: string;
  remoteFingerprint?: string;
  error?: string;
  recovery?: string[];
}> {
  const result: Awaited<ReturnType<typeof validateSSHKeyForServer>> = {
    canConnect: false,
    fingerprintMatch: false,
    recovery: [],
  };

  // Test if SSH works at all
  result.canConnect = await testSSHKeyConnection(host, keyPath);

  // Get fingerprints for comparison
  const validation = await validateSSHKeyMatch(host, keyPath);
  result.localFingerprint = validation.localFingerprint;
  result.remoteFingerprint = validation.remoteFingerprint;
  result.fingerprintMatch = validation.valid;

  if (!result.canConnect) {
    result.error = "Cannot connect to server with this key";
    result.recovery = [
      "1. Check if the server is fully initialized (may still be booting)",
      "2. Verify the SSH key was added to the server's ~/.ssh/authorized_keys",
      "3. Try a different SSH key or regenerate the key pair",
    ];
    return result;
  }

  if (!result.fingerprintMatch) {
    result.error = "SSH key fingerprint mismatch";
    result.recovery = [
      "1. Generate a new SSH key pair: `ssh-keygen -t ed25519 -f ~/.ssh/hetzner-new`",
      "2. Upload public key to Hetzner (via GUI or API)",
      "3. Update the server's metadata with the new key path",
      `4. Alternatively: The Hetzner key ID ${hetznerKeyId} may need key regeneration`,
    ];
    return result;
  }

  return result;
}
