/**
 * SSH key generation helper for testing
 */

export interface SSHKeyPair {
  publicKey: string;
  privateKeyPath: string;
}

/**
 * Generate a new SSH key pair for testing
 * Uses ssh-keygen to create a temporary key
 */
export async function generateSSHKeyPair(name: string = "test-ssh-key"): Promise<SSHKeyPair> {
  const keyPath = `/tmp/${name}-${Date.now()}`;

  // Generate a new SSH key pair (no passphrase for testing)
  const proc = Bun.spawn(["ssh-keygen", "-t", "ed25519", "-f", keyPath, "-N", "", "-C", name], {
    stdout: "pipe",
    stderr: "pipe",
  });

  // Wait for process to complete
  await proc.exited;

  const stderr = await proc.stderr.text();
  if (proc.exitCode !== 0) {
    throw new Error(`ssh-keygen failed: ${stderr}`);
  }

  // Read the public key
  const publicKey = await Bun.file(`${keyPath}.pub`).text();

  return {
    publicKey: publicKey.trim(),
    privateKeyPath: keyPath,
  };
}

/**
 * Clean up a generated SSH key pair
 */
export async function cleanupSSHKeyPair(keyPath: string): Promise<void> {
  const proc = Bun.spawn(["rm", "-f", keyPath, `${keyPath}.pub`], {
    stdout: "pipe",
    stderr: "pipe",
  });
  await proc.exited;
}
