/**
 * SSH command execution functions
 */

import type { SSHOptions } from "./types.js";
import { execSSH } from "./client.js";
import { getSSHPool } from "./pool.js";

/**
 * Execute multiple SSH commands in parallel using multiple connections
 *
 * DESIGN DECISION: Multiple Connections vs Single Connection
 * ===========================================================
 *
 * We use MULTIPLE SSH connections to avoid channel saturation issues.
 * SSH servers typically limit concurrent channels per connection (~10).
 * When executing 9+ commands in parallel, we can exceed this limit.
 *
 * Solution: Distribute commands across multiple pooled connections.
 * Each connection handles a subset of commands, staying within channel limits.
 *
 * DESIGN DECISION: Promise.allSettled() vs Promise.all()
 * ======================================================
 *
 * We use Promise.allSettled() instead of Promise.all() for a critical reason:
 * Resource monitoring should be RESILIENT. If one command fails (e.g., GPU
 * query on a CPU-only server), we still want results from all other commands.
 *
 * Example scenario:
 * - CPU, memory, disk commands: succeed
 * - GPU command: fails (no NVIDIA GPU)
 * - Network command: succeeds
 *
 * With Promise.all(): entire batch fails, no metrics collected
 * With Promise.allSettled(): we get 6/7 metrics, GPU returns "0" fallback
 *
 * ERROR HANDLING:
 * ==============
 * 1. Individual command failures are logged to console
 * 2. Failed commands return "0" as fallback (matches execSSH default)
 * 3. The function always completes successfully (never throws)
 * 4. Calling code can check for "0" values to detect failures
 */
export async function execSSHParallel(
  commands: Record<string, string>,
  options: SSHOptions,
): Promise<Record<string, string>> {
  const entries = Object.entries(commands);
  const pool = getSSHPool();

  // Determine optimal number of connections (3-4 connections is a good balance)
  // This avoids SSH channel limits while maintaining parallelism
  const numCommands = entries.length;
  const numConnections = Math.min(numCommands, 4); // Max 4 connections

  // Get multiple connections from the pool
  const connections = await pool.getConnections(options, numConnections);

  // Distribute commands across connections (round-robin)
  const connectionPromises = connections.map((ssh, connIndex) => {
    // Assign commands to this connection
    const assignedCommands = entries.filter((_, i) => i % numConnections === connIndex);

    // Execute all assigned commands on this connection
    return Promise.allSettled(
      assignedCommands.map(async ([key, cmd]) => {
        try {
          const result = await ssh.execCommand(cmd, {
            execOptions: {
              timeout: (options.timeout || 5) * 1000,
            },
          });

          // If we have stderr but no stdout, the command failed
          if (result.stderr && !result.stdout) {
            throw new Error(result.stderr);
          }

          return [key, result.stdout.trim()] as const;
        } catch (error) {
          // Log the error with full details including cause
          console.error(
            `[execSSHParallel] Command "${key}" failed:`,
            error instanceof Error ? error.message : error,
          );
          // Log the underlying cause if available
          if (error instanceof Error && error.cause) {
            console.error(
              `[execSSHParallel] Command "${key}" cause:`,
              error.cause,
            );
          }
          return [key, "0"] as const; // Fallback value
        }
      })
    );
  });

  // Wait for all connections to complete their assigned commands
  const allSettledResults = await Promise.all(connectionPromises);

  // Flatten results from all connections
  const results: Array<[string, string]> = [];
  for (const connResults of allSettledResults) {
    for (const result of connResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      }
      // Rejected promises are already logged and return "0" above
    }
  }

  return Object.fromEntries(results);
}

/**
 * Test SSH connection to a remote server
 * @param options - SSH connection options
 * @returns True if connection successful
 */
export async function testSSHConnection(options: SSHOptions): Promise<boolean> {
  try {
    await execSSH('echo "connection_test"', options);
    return true;
  } catch {
    return false;
  }
}
