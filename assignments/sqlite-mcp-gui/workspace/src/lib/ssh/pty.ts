/**
 * SSH PTY session manager for interactive terminal sessions
 * Handles bidirectional communication with remote shells
 */

import type { SSHOptions } from "./types.js";

interface PTYSession {
  id: string;
  host: string;
  user: string;
  proc: any;
  stdin: WritableStream<Uint8Array>;
  stdout: ReadableStream<Uint8Array>;
  stderr: ReadableStream<Uint8Array>;
  rows: number;
  cols: number;
  createdAt: number;
}

// Active PTY sessions storage
const activeSessions = new Map<string, PTYSession>();

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `pty-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Create a new SSH PTY session
 * Uses script or expect to wrap SSH with PTY allocation
 */
export async function createPTYSession(
  host: string,
  user: string = "root",
  options: {
    rows?: number;
    cols?: number;
    port?: number;
    keyPath?: string;
  } = {},
): Promise<{ sessionId: string; initialOutput: string }> {
  const { rows = 24, cols = 80, port = 22, keyPath } = options;
  const sessionId = generateSessionId();

  try {
    // Build SSH command with explicit PTY request
    const sshArgs = [
      "ssh",
      "-F",
      "/dev/null",  // Skip user SSH config to avoid conflicts
      "-o",
      "StrictHostKeyChecking=no",
      "-o",
      "UserKnownHostsFile=/dev/null",
      "-o",
      "ServerAliveInterval=30",
      "-o",
      "ServerAliveCountMax=3",
      "-p",
      port.toString(),
    ];

    if (keyPath) {
      // Ensure keyPath is properly escaped for SSH
      // Bun.spawn() passes args directly without shell, but SSH -i needs proper path handling
      // When keyPath contains spaces, we need to ensure it's a single argument
      sshArgs.push("-i", String(keyPath));
    }

    // Use script command to ensure PTY allocation
    // This creates a proper terminal session with full VT100 support
    sshArgs.push("-t", "-t");
    sshArgs.push(`${user}@${host}`);
    sshArgs.push("TERM=xterm-256color");
    sshArgs.push("script", "-q", "/dev/null", "/bin/bash");

    const proc = Bun.spawn(sshArgs, {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
      env: {
        ...process.env,
        COLUMNS: cols.toString(),
        LINES: rows.toString(),
        TERM: "xterm-256color",
      },
    });

    // Set up streams
    const stdin = proc.stdin as WritableStream<Uint8Array>;
    const stdout = proc.stdout as ReadableStream<Uint8Array>;
    const stderr = proc.stderr as ReadableStream<Uint8Array>;

    // Wait a moment for connection and initial output
    await new Promise((resolve) => setTimeout(resolve, 500));

    let initialOutput = "";

    // Read initial output (non-blocking)
    try {
      const reader = stdout.getReader();
      const { value, done } = await reader.read();
      if (value && !done) {
        initialOutput = new TextDecoder().decode(value);
      }
      reader.releaseLock();
    } catch {
      // Ignore initial read errors
    }

    // Store session
    const session: PTYSession = {
      id: sessionId,
      host,
      user,
      proc,
      stdin,
      stdout,
      stderr,
      rows,
      cols,
      createdAt: Date.now(),
    };

    activeSessions.set(sessionId, session);

    // Set up cleanup on process exit
    proc.exited.then(() => {
      activeSessions.delete(sessionId);
    });

    return { sessionId, initialOutput };
  } catch (error) {
    throw new Error(`Failed to create PTY session: ${error}`);
  }
}

/**
 * Write data to PTY session stdin
 */
export async function writeToPTY(
  sessionId: string,
  data: string,
): Promise<boolean> {
  const session = activeSessions.get(sessionId);
  if (!session) {
    return false;
  }

  try {
    const writer = session.stdin.getWriter();
    await writer.write(new TextEncoder().encode(data));
    writer.releaseLock();
    return true;
  } catch {
    return false;
  }
}

/**
 * Set PTY size (rows and columns)
 */
export async function setPTYSize(
  sessionId: string,
  rows: number,
  cols: number,
): Promise<boolean> {
  const session = activeSessions.get(sessionId);
  if (!session) {
    return false;
  }

  try {
    // Send SIGWINCH to resize the terminal
    // We need to use stty or similar command on remote side
    const resizeCmd = `\u001B[8;${rows};${cols}t`;
    const writer = session.stdin.getWriter();
    await writer.write(new TextEncoder().encode(resizeCmd));
    writer.releaseLock();

    session.rows = rows;
    session.cols = cols;
    return true;
  } catch {
    return false;
  }
}

/**
 * Read from PTY session stdout (non-blocking)
 */
export async function readFromPTY(
  sessionId: string,
  timeout: number = 100,
): Promise<string | null> {
  const session = activeSessions.get(sessionId);
  if (!session) {
    return null;
  }

  try {
    const reader = session.stdout.getReader();
    const { value, done } = await Promise.race([
      reader.read(),
      new Promise<{ value: Uint8Array | undefined; done: boolean }>((resolve) =>
        setTimeout(() => resolve({ value: undefined, done: false }), timeout),
      ),
    ]);
    reader.releaseLock();

    if (done) {
      return null; // Session closed
    }

    if (value) {
      return new TextDecoder().decode(value);
    }

    return "";
  } catch {
    return null;
  }
}

/**
 * Close PTY session
 */
export async function closePTYSession(sessionId: string): Promise<boolean> {
  const session = activeSessions.get(sessionId);
  if (!session) {
    return false;
  }

  try {
    // Send exit sequence to gracefully close
    const writer = session.stdin.getWriter();
    await writer.write(new TextEncoder().encode("exit\r\n"));
    writer.releaseLock();

    // Give it a moment to close gracefully
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Kill the process if still running
    try {
      session.proc.kill();
    } catch {
      // Process already terminated
    }

    activeSessions.delete(sessionId);
    return true;
  } catch {
    activeSessions.delete(sessionId);
    return false;
  }
}

/**
 * Get session info
 */
export function getPTYSession(sessionId: string): PTYSession | undefined {
  return activeSessions.get(sessionId);
}

/**
 * Get all active sessions
 */
export function getActivePTYSessions(): PTYSession[] {
  return Array.from(activeSessions.values());
}

/**
 * Clean up stale sessions (older than specified milliseconds)
 */
export function cleanupStaleSessions(maxAge: number = 3600000): void {
  const now = Date.now();
  for (const [id, session] of activeSessions.entries()) {
    if (now - session.createdAt > maxAge) {
      closePTYSession(id);
    }
  }
}
