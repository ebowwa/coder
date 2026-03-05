/**
 * GitHub CLI integration
 * Handles gh auth login flow and status checking
 *
 * Uses composable deviceAuth from @packages/installations
 */

import type { SSHOptions } from "./ssh/types.js";
import {
  deviceAuth,
  isAuthed,
  stripAnsi,
  githubConfig,
  type DeviceAuthResult,
} from "@ebowwa/seedinstallation/device-auth";

/**
 * Parsed GitHub login information
 */
export interface GitHubLoginInfo {
  /** The authentication URL (https://github.com/login/device) */
  authUrl: string;
  /** The one-time code (e.g., "7672-DB42") */
  authCode: string;
  /** Status of the login flow */
  status: "pending" | "authenticated" | "error";
  /** Additional message */
  message?: string;
  /** Raw output for debugging */
  rawOutput: string;
}

/**
 * GitHub auth status
 */
export interface GitHubStatus {
  /** Whether user is authenticated */
  authenticated: boolean;
  /** GitHub username if authenticated */
  username?: string;
  /** Which scopes are available */
  scopes?: string[];
  /** GitHub host (github.com or enterprise) */
  host?: string;
}

/**
 * Regex patterns for parsing gh auth login output
 * (kept for backward compatibility if anyone parses manually)
 */
export const GITHUB_PATTERNS = {
  code: /one-time code:\s*([A-Z0-9]{4}-[A-Z0-9]{4})/i,
  url: /(https:\/\/github\.com\/login\/device)/i,
  success: /Logged in (?:as|to)|Authentication complete/i,
  error: /error|failed|denied/i,
};

/**
 * Convert SSHOptions to ExecContext for installations package
 */
function toExecContext(host: string, options: Partial<SSHOptions> = {}) {
  return {
    type: "ssh" as const,
    host,
    user: options.user ?? "root",
    port: options.port ?? 22,
    key: options.keyPath,
  };
}

/**
 * Parse gh auth login output to extract URL and code
 * @param output - Raw output from `gh auth login` command
 * @returns Parsed login information
 */
export function parseGitHubLoginOutput(output: string): GitHubLoginInfo {
  const cleanOutput = stripAnsi(output);

  const codeMatch = cleanOutput.match(GITHUB_PATTERNS.code);
  const authCode = codeMatch ? codeMatch[1] : "";

  const urlMatch = cleanOutput.match(GITHUB_PATTERNS.url);
  const authUrl = urlMatch ? urlMatch[1] : "";

  let status: "pending" | "authenticated" | "error" = "pending";
  if (GITHUB_PATTERNS.success.test(cleanOutput)) {
    status = "authenticated";
  } else if (GITHUB_PATTERNS.error.test(cleanOutput)) {
    status = "error";
  }

  return {
    authUrl,
    authCode,
    status,
    rawOutput: cleanOutput,
  };
}

/**
 * Run gh auth login on a remote server and extract auth URL/code.
 * Uses the composable deviceAuth function from installations package.
 * The login process runs in background so user can complete auth in browser.
 *
 * @param host - Server hostname or IP
 * @param options - SSH connection options
 * @param maxAttempts - Max poll attempts (default: 60)
 * @returns Parsed login information with URL and code
 */
export async function githubLoginRemote(
  host: string,
  options: Partial<SSHOptions> = {},
  maxAttempts: number = 60,
): Promise<GitHubLoginInfo> {
  const context = toExecContext(host, options);

  const result: DeviceAuthResult = await deviceAuth(githubConfig, {
    context,
    maxAttempts,
    intervalMs: 2000,
    timeout: 5000,
  });

  return {
    authUrl: result.url ?? "",
    authCode: result.code ?? "",
    status: result.success ? "authenticated" : "error",
    message: result.status,
    rawOutput: result.status ?? "",
  };
}

/**
 * Check if gh is authenticated on a remote server.
 * Uses the composable isAuthed function from installations package.
 *
 * @param host - Server hostname or IP
 * @param options - SSH connection options
 * @returns True if authenticated
 */
export async function checkGitHubAuth(
  host: string,
  options: Partial<SSHOptions> = {},
): Promise<boolean> {
  const context = toExecContext(host, options);

  return await isAuthed(githubConfig, { context, timeout: 5000, quiet: true });
}

/**
 * Get GitHub authentication status on a remote server
 * @param host - Server hostname or IP
 * @param options - SSH connection options
 * @returns Status object with authentication state and user info
 */
export async function getGitHubStatus(
  host: string,
  options: Partial<SSHOptions> = {},
): Promise<GitHubStatus> {
  const { exec } = await import("../../../../packages/src/installations/sudo.js");
  const context = toExecContext(host, options);

  try {
    const ghCheck = await exec(["which", "gh"], { context, timeout: 5000, quiet: true });
    if (!ghCheck.ok) {
      return { authenticated: false };
    }

    const authResult = await exec(["gh", "auth", "status"], { context, timeout: 5000 });
    const output = authResult.stdout + "\n" + authResult.stderr;

    const authenticated = output.includes("Logged in to");

    const usernameMatch = output.match(/account\s+(\S+)/);
    const username = usernameMatch ? usernameMatch[1] : undefined;

    const hostMatch = output.match(/Logged in to\s+(\S+)/);
    const ghHost = hostMatch ? hostMatch[1] : undefined;

    const scopesMatch = output.match(/Token scopes:\s*(.+)/);
    const scopes = scopesMatch ? scopesMatch[1].split(",").map(s => s.trim()) : undefined;

    return {
      authenticated,
      username,
      host: ghHost,
      scopes,
    };
  } catch {
    return { authenticated: false };
  }
}

/**
 * Run a gh command on a remote server
 * @param host - Server hostname or IP
 * @param command - gh command to run (without 'gh' prefix)
 * @param options - SSH connection options
 * @returns Command output
 */
export async function ghRun(
  host: string,
  command: string,
  options: Partial<SSHOptions> = {},
): Promise<string> {
  const { exec } = await import("../../../../packages/src/installations/sudo.js");
  const context = toExecContext(host, options);

  const result = await exec(["gh", ...command.split(" ")], { context, timeout: 30000 });

  return result.stdout;
}
