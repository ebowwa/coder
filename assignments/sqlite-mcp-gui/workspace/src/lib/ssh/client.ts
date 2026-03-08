/**
 * Core SSH client for executing commands on remote servers
 * Uses persistent connection pool for efficient reuse
 * Uses base64 encoding to avoid shell escaping issues
 */

import { z } from 'zod'
import type { SSHOptions } from "./types.js";
import { SSHError } from "./error.js";
import { SSHOptionsSchema, SSHCommandSchema } from "@ebowwa/codespaces-types/runtime/ssh"
import { getSSHPool } from './pool.js'

/**
 * Execute a command on a remote server via SSH
 * Uses persistent connection pool for better performance
 * @param command - Shell command to execute
 * @param options - SSH connection options
 * @returns Command output as string
 */
export async function execSSH(
  command: string,
  options: SSHOptions,
): Promise<string> {
  // Validate inputs with Zod
  const validatedCommand = SSHCommandSchema.safeParse(command)
  if (!validatedCommand.success) {
    throw new Error(`Invalid SSH command: ${validatedCommand.error.issues.map(i => i.message).join(', ')}`)
  }

  const validatedOptions = SSHOptionsSchema.safeParse(options)
  if (!validatedOptions.success) {
    throw new Error(`Invalid SSH options: ${validatedOptions.error.issues.map(i => i.message).join(', ')}`)
  }

  const { host, user = "root", timeout = 5, port = 22, keyPath, password } = validatedOptions.data;

  try {
    // Get connection pool
    const pool = getSSHPool()

    // Execute command directly via SSH - the pool handles proper escaping
    const output = await pool.exec(validatedCommand.data, {
      host,
      user,
      timeout,
      port,
      keyPath,
      password,
    })

    return output || "0";
  } catch (error) {
    throw new SSHError(`SSH command failed: ${validatedCommand.data}`, error);
  }
}
