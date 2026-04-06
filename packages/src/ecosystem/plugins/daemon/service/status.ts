/**
 * Service Status - Query the platform process manager for real daemon state.
 *
 * macOS: queries launchctl for the service state
 * Linux: queries systemctl for the service state
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { getLaunchdPlistPath, getSystemdUnitPath } from "./templates.js";

export interface ServiceStatus {
  installed: boolean;
  running: boolean;
  pid: number | null;
  uptime: string | null;
  platform: string;
  servicePath: string;
  heartbeat: HeartbeatInfo | null;
}

interface HeartbeatInfo {
  pid: number;
  sessionId: string;
  timestamp: number;
  turns: number;
  heapMB: number;
  stale: boolean;
}

async function shell(cmd: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
}

function readHeartbeat(): HeartbeatInfo | null {
  const hbPath = join(homedir(), ".claude", "daemon", "heartbeat");
  if (!existsSync(hbPath)) return null;

  try {
    const data = JSON.parse(readFileSync(hbPath, "utf-8"));
    const ageMs = Date.now() - (data.timestamp || 0);
    return {
      pid: data.pid || 0,
      sessionId: data.sessionId || "unknown",
      timestamp: data.timestamp || 0,
      turns: data.turns || 0,
      heapMB: data.heapMB || 0,
      stale: ageMs > 5 * 60 * 1000, // Stale if older than 5 minutes
    };
  } catch {
    return null;
  }
}

export async function getServiceStatus(): Promise<ServiceStatus> {
  const heartbeat = readHeartbeat();

  if (process.platform === "darwin") {
    return getLaunchdStatus(heartbeat);
  } else if (process.platform === "linux") {
    return getSystemdStatus(heartbeat);
  }

  return {
    installed: false,
    running: false,
    pid: null,
    uptime: null,
    platform: process.platform,
    servicePath: "",
    heartbeat,
  };
}

async function getLaunchdStatus(heartbeat: HeartbeatInfo | null): Promise<ServiceStatus> {
  const plistPath = getLaunchdPlistPath();
  const installed = existsSync(plistPath);

  if (!installed) {
    return { installed: false, running: false, pid: null, uptime: null, platform: "darwin", servicePath: plistPath, heartbeat };
  }

  // Query launchctl for process info
  const { stdout, exitCode } = await shell(["launchctl", "list", "com.ebowwa.coder-daemon"]);

  if (exitCode !== 0) {
    return { installed: true, running: false, pid: null, uptime: null, platform: "darwin", servicePath: plistPath, heartbeat };
  }

  // Parse PID from launchctl output
  let pid: number | null = null;
  const pidMatch = stdout.match(/"PID"\s*=\s*(\d+)/);
  if (pidMatch) {
    pid = parseInt(pidMatch[1]!, 10);
  }

  return {
    installed: true,
    running: pid !== null,
    pid,
    uptime: heartbeat ? formatUptime(heartbeat.timestamp) : null,
    platform: "darwin",
    servicePath: plistPath,
    heartbeat,
  };
}

async function getSystemdStatus(heartbeat: HeartbeatInfo | null): Promise<ServiceStatus> {
  const unitPath = getSystemdUnitPath();
  const installed = existsSync(unitPath);

  if (!installed) {
    return { installed: false, running: false, pid: null, uptime: null, platform: "linux", servicePath: unitPath, heartbeat };
  }

  // Query systemctl for status
  const { stdout, exitCode } = await shell(["systemctl", "--user", "is-active", "coder-daemon.service"]);
  const running = exitCode === 0 && stdout.trim() === "active";

  let pid: number | null = null;
  if (running) {
    const pidResult = await shell(["systemctl", "--user", "show", "-p", "MainPID", "coder-daemon.service"]);
    const pidMatch = pidResult.stdout.match(/MainPID=(\d+)/);
    if (pidMatch && pidMatch[1] !== "0") {
      pid = parseInt(pidMatch[1]!, 10);
    }
  }

  return {
    installed: true,
    running,
    pid,
    uptime: heartbeat ? formatUptime(heartbeat.timestamp) : null,
    platform: "linux",
    servicePath: unitPath,
    heartbeat,
  };
}

function formatUptime(startTimestamp: number): string {
  const elapsed = Date.now() - startTimestamp;
  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Format a ServiceStatus object for terminal display.
 */
export function formatServiceStatus(status: ServiceStatus): string {
  const lines: string[] = [];
  const platform = status.platform === "darwin" ? "macOS (launchd)" : "Linux (systemd)";

  lines.push(`\x1b[36mDaemon Service Status\x1b[0m`);
  lines.push(`  Platform: ${platform}`);
  lines.push(`  Installed: ${status.installed ? "\x1b[32myes\x1b[0m" : "\x1b[90mno\x1b[0m"}`);

  if (!status.installed) {
    lines.push(`\n  Run \x1b[33mcoder --daemon-install\x1b[0m to install the service.`);
    return lines.join("\n");
  }

  const runningLabel = status.running ? "\x1b[32mrunning\x1b[0m" : "\x1b[31mstopped\x1b[0m";
  lines.push(`  Running: ${runningLabel}`);

  if (status.pid) {
    lines.push(`  PID: ${status.pid}`);
  }
  if (status.uptime) {
    lines.push(`  Uptime: ${status.uptime}`);
  }

  lines.push(`  Service file: ${status.servicePath}`);

  if (status.heartbeat) {
    const hb = status.heartbeat;
    const staleLabel = hb.stale ? " \x1b[31m(STALE)\x1b[0m" : "";
    const age = Math.round((Date.now() - hb.timestamp) / 1000);
    lines.push(`\n  \x1b[90mHeartbeat:\x1b[0m`);
    lines.push(`    Last beat: ${age}s ago${staleLabel}`);
    lines.push(`    Session: ${hb.sessionId}`);
    lines.push(`    Turns: ${hb.turns}`);
    lines.push(`    Heap: ${hb.heapMB}MB`);
  }

  return lines.join("\n");
}
