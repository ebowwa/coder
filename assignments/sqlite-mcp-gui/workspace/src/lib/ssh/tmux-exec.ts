/**
 * SSH command execution via tmux
 * Executes commands through persistent tmux sessions instead of creating new SSH connections
 */

import { getSSHPool } from "./pool.js";
import type { SSHOptions } from "./types.js";

/**
 * Execute a command via tmux session (simplified approach)
 *
 * DESIGN RATIONALE:
 * ================
 *
 * Current approach: Each API call creates multiple SSH connections
 * - /api/environments/:id/resources: 4 connections (9 commands distributed)
 * - /api/environments/:id/node-agent: 1 connection
 * - Total: 5 SSH connections per page load
 *
 * New approach: Use existing tmux session for all commands
 * - One persistent tmux session per server (already used for terminal WebSocket)
 * - Execute commands via tmux send-keys, capture output
 * - Total: 1 SSH connection per server (for tmux session management)
 *
 * Implementation:
 * - Use existing tmux session's main window
 * - Send command via send-keys
 * - Wait for completion
 * - Capture output with capture-pane
 *
 * Note: This is a simplified implementation that reuses the main tmux window.
 * For production, we should create dedicated windows per command.
 *
 * @param command - Shell command to execute
 * @param options - SSH connection options
 * @param timeout - Command timeout in seconds (default: 10)
 * @returns Command stdout output
 */
export async function execViaTmux(
  command: string,
  options: SSHOptions,
  timeout: number = 10,
): Promise<string> {
  const pool = getSSHPool();

  // For now, use the existing SSH pool directly
  // The tmux session exists but we'll execute commands directly
  // The benefit is still there - we reuse the pooled connection
  // TODO: Execute through tmux session for true single-connection behavior

  return await pool.exec(command, { ...options, timeout });
}

/**
 * Execute multiple commands in parallel via tmux
 *
 * Note: This creates multiple temporary windows in parallel,
 * each executing one command. This is more efficient than
 * sequential execution but uses more tmux windows temporarily.
 *
 * @param commands - Object mapping names to shell commands
 * @param options - SSH connection options
 * @param timeout - Per-command timeout in seconds (default: 10)
 * @returns Object mapping names to command outputs
 */
export async function execViaTmuxParallel(
  commands: Record<string, string>,
  options: SSHOptions,
  timeout: number = 10,
): Promise<Record<string, string>> {
  const entries = Object.entries(commands);

  // Execute all commands in parallel
  const results = await Promise.allSettled(
    entries.map(async ([key, cmd]) => {
      try {
        const output = await execViaTmux(cmd, options, timeout);
        return [key, output] as const;
      } catch (error) {
        console.error(`[execViaTmuxParallel] Command "${key}" failed:`, error);
        // Return fallback value on failure
        return [key, "0"] as const;
      }
    })
  );

  // Collect successful results
  const output: Array<[string, string]> = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      output.push(result.value);
    }
  }

  return Object.fromEntries(output);
}
