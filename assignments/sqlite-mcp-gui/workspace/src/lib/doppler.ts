/**
 * Doppler CLI integration
 * Handles doppler login flow and secrets management
 *
 * Uses composable deviceAuth from @packages/installations
 */

import type { SSHOptions } from "./ssh/types.js";
import {
  deviceAuth,
  isAuthed,
  stripAnsi,
  dopplerConfig,
  type DeviceAuthResult,
} from "@ebowwa/seedinstallation/device-auth";

/**
 * Parsed doppler login information
 */
export interface DopplerLoginInfo {
  /** The full authentication URL */
  authUrl: string;
  /** The authentication code (e.g., "ABCD-1234-EFGH-5678") */
  authCode: string;
  /** Status of the login flow */
  status: "pending" | "authenticated" | "error";
  /** Additional message from doppler */
  message?: string;
  /** Raw output for debugging */
  rawOutput: string;
}

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
 * Execute doppler login on a remote server via SSH.
 * Uses the composable deviceAuth function from installations package.
 *
 * @param host - Server hostname or IP
 * @param options - SSH connection options
 * @param maxAttempts - Max poll attempts (default: 60)
 * @returns Parsed login information with URL and code
 */
export async function dopplerLoginRemote(
  host: string,
  options: Partial<SSHOptions> = {},
  maxAttempts: number = 60,
): Promise<DopplerLoginInfo> {
  const context = toExecContext(host, options);

  const result: DeviceAuthResult = await deviceAuth(dopplerConfig, {
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
 * Check if doppler is authenticated on a remote server.
 * Uses the composable isAuthed function from installations package.
 *
 * @param host - Server hostname or IP
 * @param options - SSH connection options
 * @returns True if authenticated
 */
export async function checkDopplerAuth(
  host: string,
  options: Partial<SSHOptions> = {},
): Promise<boolean> {
  const context = toExecContext(host, options);

  return await isAuthed(dopplerConfig, { context, timeout: 5000, quiet: true });
}

/**
 * Regex patterns for parsing doppler login output
 * (kept for backward compatibility if anyone parses manually)
 */
export const DOPPLER_PATTERNS = {
  url: /https:\/\/(?:cli|dashboard)\.doppler\.com\/[a-z\-\/]+/i,
  authCode: /(?:Your authentication code is:|Your auth code is:)\s*([A-Z0-9_]+(?:-[A-Z0-9_]+)*)/i,
  authCodeAlt: /^([a-z]+_[a-z]+_[a-z]+_[a-z]+)$/im,
  success: /authenticated|success|welcome/i,
  error: /error|failed|denied/i,
  browserPrompt: /open the authorization page in your browser/i,
  waiting: /waiting/i,
};

/**
 * Parse doppler login output to extract URL and code
 * @param output - Raw output from `doppler login` command
 * @returns Parsed login information
 */
export function parseDopplerLoginOutput(output: string): DopplerLoginInfo {
  const cleanOutput = stripAnsi(output);

  const urlMatch = cleanOutput.match(DOPPLER_PATTERNS.url);
  const authUrl = urlMatch ? urlMatch[0] : "";

  let authCode = "";
  const codeMatch = cleanOutput.match(DOPPLER_PATTERNS.authCode);
  if (codeMatch) {
    authCode = codeMatch[1];
  } else {
    const lines = cleanOutput.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.toLowerCase().includes("your auth code is")) {
        for (let j = i + 1; j < lines.length; j++) {
          const codeLine = lines[j].trim();
          if (codeLine && !codeLine.startsWith("http") && codeLine.length > 5) {
            authCode = codeLine;
            break;
          }
        }
        break;
      }
    }
    if (!authCode) {
      const altMatch = cleanOutput.match(DOPPLER_PATTERNS.authCodeAlt);
      if (altMatch) {
        authCode = altMatch[1];
      }
    }
  }

  let status: "pending" | "authenticated" | "error" = "pending";
  if (DOPPLER_PATTERNS.success.test(cleanOutput)) {
    status = "authenticated";
  } else if (DOPPLER_PATTERNS.error.test(cleanOutput)) {
    status = "error";
  } else if (DOPPLER_PATTERNS.waiting.test(cleanOutput) && authCode) {
    status = "pending";
  }

  const lines = cleanOutput.split("\n").filter(line => line.trim());
  const message = lines.find(line =>
    DOPPLER_PATTERNS.error.test(line) ||
    DOPPLER_PATTERNS.success.test(line) ||
    DOPPLER_PATTERNS.waiting.test(line)
  )?.trim();

  return {
    authUrl,
    authCode,
    status,
    message,
    rawOutput: cleanOutput,
  };
}

/**
 * Get doppler token status on a remote server
 * @param host - Server hostname or IP
 * @param options - SSH connection options
 * @returns Status object with authentication state
 */
export async function getDopplerStatus(
  host: string,
  options: Partial<SSHOptions> = {},
): Promise<{
  authenticated: boolean;
  configured: boolean;
  hasToken: boolean;
}> {
  const { exec } = await import("../../../../packages/src/installations/sudo.js");
  const context = toExecContext(host, options);

  try {
    const dopplerCheck = await exec(["which", "doppler"], { context, timeout: 5000, quiet: true });
    if (!dopplerCheck.ok) {
      return { authenticated: false, configured: false, hasToken: false };
    }

    const tokenResult = await exec(["bash", "-lc", "doppler configure get token --scope / 2>/dev/null || echo 'NO_TOKEN'"], { context, timeout: 5000 });
    const hasToken = tokenResult.ok && !tokenResult.stdout.includes("NO_TOKEN") && tokenResult.stdout.length > 10;

    const authResult = await exec(["bash", "-lc", "doppler me 2>/dev/null && echo 'AUTH_OK' || echo 'NOT_AUTH'"], { context, timeout: 5000 });
    const authenticated = authResult.ok && authResult.stdout.includes("AUTH_OK");

    const configResult = await exec(["bash", "-lc", "doppler configure get project 2>/dev/null || echo 'NO_PROJECT'"], { context, timeout: 5000 });
    const configured = configResult.ok && !configResult.stdout.includes("NO_PROJECT");

    return { authenticated, configured, hasToken };
  } catch {
    return { authenticated: false, configured: false, hasToken: false };
  }
}

/**
 * Run a command with doppler secrets on a remote server
 * @param host - Server hostname or IP
 * @param project - Doppler project name
 * @param config - Doppler config name (e.g., "prd", "dev")
 * @param command - Command to run with secrets injected
 * @param options - SSH connection options
 * @returns Command output
 */
export async function dopplerRun(
  host: string,
  project: string,
  config: string,
  command: string,
  options: Partial<SSHOptions> = {},
): Promise<string> {
  const { exec } = await import("../../../../packages/src/installations/sudo.js");
  const context = toExecContext(host, options);

  const result = await exec(
    ["bash", "-lc", `doppler run --project "${project}" --config "${config}" -- ${command}`],
    { context, timeout: 30000 },
  );

  return result.stdout;
}
