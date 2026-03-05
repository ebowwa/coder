/**
 * SSH Connection Pool Manager
 * Maintains persistent SSH connections for reuse across commands
 */

import { NodeSSH } from 'node-ssh'
import path from 'node:path'
import type { SSHOptions } from './types.js'

interface PooledConnection {
  ssh: NodeSSH
  lastUsed: number
  host: string
  port: number
  user: string
  id: string // Unique identifier for this connection instance
}

/**
 * Connection pool configuration
 */
interface PoolConfig {
  /** Maximum number of connections to keep alive across all hosts */
  maxConnections: number
  /** Maximum number of connections per host (for parallel execution) */
  maxConnectionsPerHost: number
  /** Idle timeout in milliseconds (default: 5 minutes) */
  idleTimeout: number
  /** Connection timeout in milliseconds (default: 10 seconds) */
  connectionTimeout: number
  /** Keep alive interval in milliseconds (default: 30 seconds) */
  keepAliveInterval: number
}

const DEFAULT_CONFIG: PoolConfig = {
  maxConnections: 50,
  maxConnectionsPerHost: 5, // Allow up to 5 connections per host for parallel ops
  idleTimeout: 5 * 60 * 1000,  // 5 minutes
  connectionTimeout: 10 * 1000, // 10 seconds
  keepAliveInterval: 30 * 1000, // 30 seconds
}

/**
 * SSH Connection Pool Class
 */
export class SSHConnectionPool {
  private connections = new Map<string, PooledConnection[]>()
  private config: PoolConfig
  private cleanupInterval: ReturnType<typeof setInterval> | null = null
  private nextId = 0 // Counter for generating unique connection IDs

  constructor(config: Partial<PoolConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.startCleanup()
  }

  /**
   * Generate a unique key for the connection (host-based)
   */
  private getKey(host: string, port: number, user: string): string {
    return `${user}@${host}:${port}`
  }

  /**
   * Get all connections for a given host
   */
  private getConnectionsList(key: string): PooledConnection[] {
    let list = this.connections.get(key)
    if (!list) {
      list = []
      this.connections.set(key, list)
    }
    return list
  }

  /**
   * Get or create a connection (returns least recently used connection)
   */
  async getConnection(options: SSHOptions): Promise<NodeSSH> {
    const connections = await this.getConnections(options, 1)
    return connections[0]
  }

  /**
   * Get or create a connection using password authentication
   */
  async getConnectionWithPassword(
    host: string,
    user: string,
    password: string,
    port: number = 22,
  ): Promise<NodeSSH> {
    return this.getConnection({ host, user, password, port })
  }

  /**
   * Get or create multiple connections for parallel execution
   * @param options - SSH connection options
   * @param count - Number of connections to retrieve
   * @returns Array of SSH connections
   */
  async getConnections(options: SSHOptions, count: number): Promise<NodeSSH[]> {
    const { host, user = 'root', port = 22, keyPath, password } = options
    const key = this.getKey(host, port, user)
    const list = this.getConnectionsList(key)
    const now = Date.now()
    const result: NodeSSH[] = []

    // Try to reuse existing connections that are alive and recently used
    for (let i = list.length - 1; i >= 0 && result.length < count; i--) {
      const existing = list[i]

      // If used recently (within 30 seconds), reuse without verification
      if (now - existing.lastUsed < 30000) {
        existing.lastUsed = now
        result.push(existing.ssh)
        list.splice(i, 1)
        continue
      }

      // Verify connection is still alive (for idle connections)
      try {
        await existing.ssh.execCommand('echo', ['ok'])
        existing.lastUsed = now
        result.push(existing.ssh)
        list.splice(i, 1)
      } catch {
        // Connection is dead, remove and dispose
        list.splice(i, 1)
        try {
          await existing.ssh.dispose()
        } catch {
          // Ignore dispose errors
        }
      }
    }

    // Put back the connections we're reusing at the end (most recently used)
    for (const conn of result) {
      const pooled = list.find(c => c.ssh === conn)
      if (pooled) {
        // Move to end of list (most recently used)
        list.splice(list.indexOf(pooled), 1)
        list.push(pooled)
      }
    }

    // Create new connections if needed
    while (result.length < count) {
      // Check pool size limit
      if (this.getTotalConnectionCount() >= this.config.maxConnections) {
        await this.evictOldest()
      }

      // Check per-host limit
      const currentHostCount = list.length + result.length
      if (currentHostCount >= this.config.maxConnectionsPerHost) {
        // Can't create more connections for this host
        break
      }

      // Create new connection
      const ssh = await this.createConnection(host, port, user, keyPath, password)

      // Add to result and pool
      result.push(ssh)
      list.push({
        ssh,
        lastUsed: now,
        host,
        port,
        user,
        id: `${key}-${this.nextId++}`,
      })
    }

    return result
  }

  /**
   * Create a new SSH connection
   * Tries key-based auth first, then password auth, then SSH agent
   */
  private async createConnection(
    host: string,
    port: number,
    user: string,
    keyPath?: string,
    password?: string,
  ): Promise<NodeSSH> {
    const ssh = new NodeSSH()

    const baseConfig: any = {
      host,
      port,
      username: user,
      readyTimeout: this.config.connectionTimeout,
      keepaliveInterval: this.config.keepAliveInterval,
    }

    // Try authentication methods in order: key, password, agent
    const authMethods: Array<{ name: string; config: any }> = []

    // 1. Key-based authentication (if keyPath provided)
    if (keyPath) {
      // Resolve relative paths to absolute to ensure key is found from any working directory
      let resolvedKeyPath = keyPath
      if (!path.isAbsolute(keyPath)) {
        // Legacy relative paths like "../.ssh-keys/..." - resolve from project root
        // import.meta.dir = workspace/src/lib/ssh, project root is 4 levels up
        const projectRoot = path.resolve(import.meta.dir, '../../../..')
        if (keyPath.includes('.ssh-keys')) {
          // Extract just the filename from the path and look in project .ssh-keys
          const keyName = path.basename(keyPath)
          resolvedKeyPath = path.join(projectRoot, '.ssh-keys', keyName)
        } else {
          resolvedKeyPath = path.resolve(keyPath)
        }
      }
      authMethods.push({
        name: 'key',
        config: { ...baseConfig, privateKeyPath: resolvedKeyPath },
      })
    }

    // 2. Password authentication (if password provided)
    if (password) {
      authMethods.push({
        name: 'password',
        config: { ...baseConfig, password },
      })
    }

    // 3. SSH agent (fallback if available)
    if (process.env.SSH_AUTH_SOCK) {
      authMethods.push({
        name: 'agent',
        config: { ...baseConfig, agent: process.env.SSH_AUTH_SOCK },
      })
    }

    // If no auth methods available, try with empty config (will fail)
    if (authMethods.length === 0) {
      authMethods.push({
        name: 'default',
        config: baseConfig,
      })
    }

    // Try each authentication method
    const errors: string[] = []
    for (const method of authMethods) {
      try {
        await ssh.connect(method.config)

        // Attach error handler to underlying ssh2 client to catch keepalive and other errors
        // The NodeSSH instance exposes the underlying ssh2 Client via the 'ssh' property
        if ((ssh as any).ssh) {
          const underlyingClient = (ssh as any).ssh;
          const connectionKey = this.getKey(host, port, user);

          underlyingClient.on('error', (err: Error) => {
            // Handle keepalive timeouts gracefully - these are network issues, not fatal errors
            const isKeepalive = err.message.includes('Keepalive') || (err as any).level === 'client-timeout';

            if (isKeepalive) {
              console.warn(`[SSH Pool] Keepalive timeout for ${user}@${host}:${port} - removing stale connection`);
            } else {
              console.error(`[SSH Pool] Connection error for ${user}@${host}:${port}:`, err.message);
            }

            // Remove failed connection from pool
            const list = this.connections.get(connectionKey);
            if (list) {
              const index = list.findIndex(c => c.ssh === ssh);
              if (index !== -1) {
                const removed = list.splice(index, 1)[0];
                // Dispose connection
                ssh.dispose().catch(() => {
                  // Ignore dispose errors
                });
                console.log(`[SSH Pool] Removed errored connection ${removed.id} from pool (will reconnect on next use)`);
                // Clean up empty lists
                if (list.length === 0) {
                  this.connections.delete(connectionKey);
                }
              }
            }
          });

          // Also handle 'close' event for unexpected disconnections
          underlyingClient.on('close', () => {
            const list = this.connections.get(connectionKey);
            if (list) {
              const index = list.findIndex(c => c.ssh === ssh);
              if (index !== -1) {
                const removed = list.splice(index, 1)[0];
                console.log(`[SSH Pool] Connection ${removed.id} closed unexpectedly (will reconnect on next use)`);
                if (list.length === 0) {
                  this.connections.delete(connectionKey);
                }
              }
            }
          });
        }

        return ssh
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error)
        errors.push(`${method.name}: ${errMsg}`)
        // Try next method
      }
    }

    // All methods failed
    throw new Error(`SSH connection failed to ${host} (tried: ${authMethods.map(m => m.name).join(', ')}): ${errors.join('; ')}`)
  }

  /**
   * Get total number of connections across all hosts
   */
  private getTotalConnectionCount(): number {
    let count = 0
    for (const list of this.connections.values()) {
      count += list.length
    }
    return count
  }

  /**
   * Execute a command using a pooled connection
   *
   * ERROR HANDLING BEHAVIOR:
   * =========================
   * If result.stderr exists AND result.stdout is empty, we throw an error.
   * This is intentional - commands that fail should return fallback values
   * via shell redirection (e.g., `|| echo "0"` or `2>/dev/null`).
   *
   * Example of proper fallback handling:
   *   `type nvidia-smi 2>/dev/null && nvidia-smi ... || echo NOGPU`
   *
   * This ensures commands don't silently fail - they must handle their own
   * error cases and return sensible defaults.
   */
  async exec(command: string, options: SSHOptions): Promise<string> {
    const ssh = await this.getConnection(options)

    try {
      const result = await ssh.execCommand(command, {
        execOptions: {
          timeout: (options.timeout || 5) * 1000,
        },
      })

      // If we have stderr but no stdout, the command failed
      // Commands should handle their own fallbacks (|| echo fallback, 2>/dev/null, etc)
      if (result.stderr && !result.stdout) {
        // Include both stderr and stdout (if any) for better debugging
        const output = result.stdout ? `${result.stderr}\n${result.stdout}` : result.stderr;
        throw new Error(output);
      }

      return result.stdout.trim()
    } catch (error) {
      // Remove failed connection from pool (find and remove specific connection)
      const { host, user = 'root', port = 22 } = options
      const key = this.getKey(host, port, user)
      const list = this.connections.get(key)
      if (list) {
        const index = list.findIndex(c => c.ssh === ssh)
        if (index !== -1) {
          const removed = list.splice(index, 1)[0]
          try {
            await removed.ssh.dispose()
          } catch {
            // Ignore dispose errors
          }
        }
        // Clean up empty lists
        if (list.length === 0) {
          this.connections.delete(key)
        }
      }

      throw error
    }
  }

  /**
   * Check if a connection exists and is alive for a given host
   */
  async hasConnection(options: SSHOptions): Promise<boolean> {
    const { host, user = 'root', port = 22 } = options
    const key = this.getKey(host, port, user)
    const list = this.connections.get(key)

    if (!list || list.length === 0) {
      return false
    }

    // Check if any connection is alive
    for (let i = list.length - 1; i >= 0; i--) {
      const conn = list[i]
      try {
        await conn.ssh.execCommand('echo', ['ok'])
        return true
      } catch {
        // Remove dead connection
        list.splice(i, 1)
        try {
          await conn.ssh.dispose()
        } catch {
          // Ignore dispose errors
        }
      }
    }

    // Clean up empty list
    if (list.length === 0) {
      this.connections.delete(key)
    }

    return false
  }

  /**
   * Close a specific connection by SSH instance
   */
  private async closeConnectionInstance(ssh: NodeSSH): Promise<void> {
    for (const [key, list] of this.connections.entries()) {
      const index = list.findIndex(c => c.ssh === ssh)
      if (index !== -1) {
        const removed = list.splice(index, 1)[0]
        try {
          await removed.ssh.dispose()
        } catch {
          // Ignore dispose errors
        }
        // Clean up empty lists
        if (list.length === 0) {
          this.connections.delete(key)
        }
        return
      }
    }
  }

  /**
   * Close all connections for a specific host
   */
  async closeConnection(options: SSHOptions): Promise<void> {
    const { host, user = 'root', port = 22 } = options
    const key = this.getKey(host, port, user)
    const list = this.connections.get(key)

    if (list) {
      this.connections.delete(key)
      for (const conn of list) {
        try {
          await conn.ssh.dispose()
        } catch {
          // Ignore dispose errors
        }
      }
    }
  }

  /**
   * Evict the oldest connection from the pool
   */
  private async evictOldest(): Promise<void> {
    let oldest: { key: string; conn: PooledConnection; listIndex: number } | null = null

    for (const [key, list] of this.connections.entries()) {
      for (let i = 0; i < list.length; i++) {
        const conn = list[i]
        if (!oldest || conn.lastUsed < oldest.conn.lastUsed) {
          oldest = { key, conn, listIndex: i }
        }
      }
    }

    if (oldest) {
      const list = this.connections.get(oldest.key)
      if (list) {
        list.splice(oldest.listIndex, 1)
        // Clean up empty lists
        if (list.length === 0) {
          this.connections.delete(oldest.key)
        }
      }
      try {
        await oldest.conn.ssh.dispose()
      } catch {
        // Ignore dispose errors
      }
    }
  }

  /**
   * Clean up idle connections
   */
  private async cleanupIdle(): Promise<void> {
    const now = Date.now()

    for (const [key, list] of this.connections.entries()) {
      const toRemove: number[] = []

      for (let i = 0; i < list.length; i++) {
        if (now - list[i].lastUsed > this.config.idleTimeout) {
          toRemove.push(i)
        }
      }

      // Remove from end to preserve indices
      for (const index of toRemove.reverse()) {
        const conn = list.splice(index, 1)[0]
        try {
          await conn.ssh.dispose()
        } catch {
          // Ignore dispose errors
        }
      }

      // Clean up empty lists
      if (list.length === 0) {
        this.connections.delete(key)
      }
    }
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdle().catch(console.error)
    }, 60 * 1000)
  }

  /**
   * Stop cleanup interval
   */
  private stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  /**
   * Close all connections and stop cleanup
   */
  async closeAll(): Promise<void> {
    this.stopCleanup()

    const closePromises: Promise<void>[] = []
    for (const list of this.connections.values()) {
      for (const conn of list) {
        closePromises.push(
          (async () => {
            try {
              await conn.ssh.dispose()
            } catch {
              // Ignore dispose errors
            }
          })()
        )
      }
    }

    await Promise.all(closePromises)
    this.connections.clear()
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    totalConnections: number
    connections: Array<{
      host: string
      port: number
      user: string
      lastUsed: Date
      idleMs: number
      id: string
    }>
  } {
    const now = Date.now()
    const allConnections: Array<{
      host: string
      port: number
      user: string
      lastUsed: Date
      idleMs: number
      id: string
    }> = []

    for (const list of this.connections.values()) {
      for (const conn of list) {
        allConnections.push({
          host: conn.host,
          port: conn.port,
          user: conn.user,
          lastUsed: new Date(conn.lastUsed),
          idleMs: now - conn.lastUsed,
          id: conn.id,
        })
      }
    }

    return {
      totalConnections: allConnections.length,
      connections: allConnections,
    }
  }

  /**
   * Check if a host has an active connection
   */
  isConnected(host: string, user: string = 'root', port: number = 22): boolean {
    const key = this.getKey(host, port, user)
    const list = this.connections.get(key)
    return list !== undefined && list.length > 0
  }
}

// Global singleton instance
let globalPool: SSHConnectionPool | null = null

/**
 * Get the global connection pool instance
 */
export function getSSHPool(config?: Partial<PoolConfig>): SSHConnectionPool {
  if (!globalPool) {
    globalPool = new SSHConnectionPool(config)
  }
  return globalPool
}

/**
 * Close the global pool (for cleanup/shutdown)
 */
export async function closeGlobalSSHPool(): Promise<void> {
  if (globalPool) {
    await globalPool.closeAll()
    globalPool = null
  }
}

/**
 * Get active SSH connections (for monitoring)
 */
export function getActiveSSHConnections(): ReturnType<SSHConnectionPool['getStats']> {
  if (!globalPool) {
    return { totalConnections: 0, connections: [] }
  }
  return globalPool.getStats()
}
