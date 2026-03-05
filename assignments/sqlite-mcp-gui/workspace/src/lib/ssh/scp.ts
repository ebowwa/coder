/**
 * SCP/SFTP file transfer operations
 * Uses SSH connection pool and SFTP for efficient transfers
 */

import { z } from 'zod'
import type { SCPOptions } from "./types.js";
import { SSHError } from "./error.js";
import { SCPOptionsSchema } from "@ebowwa/codespaces-types/runtime/ssh"
import { getSSHPool } from './pool.js'

/**
 * Upload a file to remote server via SFTP
 * @param options - SCP options including source and destination
 * @returns True if successful
 */
export async function scpUpload(options: SCPOptions): Promise<boolean> {
  // Validate inputs with Zod
  const validated = SCPOptionsSchema.safeParse(options)
  if (!validated.success) {
    throw new Error(`Invalid SCP options: ${validated.error.issues.map(i => i.message).join(', ')}`)
  }

  const {
    host,
    user = "root",
    timeout = 30,
    port = 22,
    keyPath,
    source,
    destination,
    recursive = false,
    preserve = false,
  } = validated.data;

  try {
    const pool = getSSHPool()
    const ssh = await pool.getConnection({ host, user, port, keyPath, timeout })

    // Use SFTP for file transfer
    await ssh.putFile(source, destination, null, {
      mode: recursive ? 'recursive' : undefined,
    })

    return true
  } catch (error) {
    throw new SSHError(`SFTP upload failed: ${source} -> ${destination}`, error);
  }
}

/**
 * Download a file from remote server via SFTP
 * @param options - SCP options including source (remote) and destination (local)
 * @returns True if successful
 */
export async function scpDownload(options: SCPOptions): Promise<boolean> {
  // Validate inputs with Zod
  const validated = SCPOptionsSchema.safeParse(options)
  if (!validated.success) {
    throw new Error(`Invalid SCP options: ${validated.error.issues.map(i => i.message).join(', ')}`)
  }

  const {
    host,
    user = "root",
    timeout = 30,
    port = 22,
    keyPath,
    source,
    destination,
    recursive = false,
    preserve = false,
  } = validated.data;

  try {
    const pool = getSSHPool()
    const ssh = await pool.getConnection({ host, user, port, keyPath, timeout })

    // Use SFTP for file transfer
    await ssh.getFile(destination, source, null, {
      mode: recursive ? 'recursive' : undefined,
    })

    return true
  } catch (error) {
    throw new SSHError(
      `SFTP download failed: ${source} -> ${destination}`,
      error,
    );
  }
}

/**
 * Upload a directory to remote server via SFTP
 * @param options - SCP options with source directory
 * @returns True if successful
 */
export async function scpUploadDirectory(options: SCPOptions): Promise<boolean> {
  return scpUpload({ ...options, recursive: true })
}

/**
 * Download a directory from remote server via SFTP
 * @param options - SCP options with source directory
 * @returns True if successful
 */
export async function scpDownloadDirectory(options: SCPOptions): Promise<boolean> {
  return scpDownload({ ...options, recursive: true })
}
