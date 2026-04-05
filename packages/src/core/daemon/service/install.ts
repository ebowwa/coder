/**
 * Service Installer - Registers the coder daemon with the platform's process manager.
 *
 * macOS: writes ~/Library/LaunchAgents/com.ebowwa.coder-daemon.plist, then loads it
 * Linux: writes ~/.config/systemd/user/coder-daemon.service, then enables+starts it
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  generateLaunchdPlist,
  generateSystemdUnit,
  getLaunchdPlistPath,
  getSystemdUnitPath,
  type ServiceConfig,
} from "./templates.js";

interface InstallResult {
  success: boolean;
  message: string;
  path: string;
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

function ensureLogDir(): void {
  const logDir = join(homedir(), ".claude", "daemon", "logs");
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }
}

/**
 * Resolve the coder binary path.
 * Checks common locations: bun global, local node_modules, PATH.
 */
async function resolveCoderBin(): Promise<string> {
  // Check if we're running from a known path
  const candidates = [
    join(process.cwd(), "node_modules", ".bin", "coder"),
    join(homedir(), ".bun", "bin", "coder"),
  ];

  for (const c of candidates) {
    if (existsSync(c)) return c;
  }

  // Fall back to `which coder`
  const { stdout, exitCode } = await shell(["which", "coder"]);
  if (exitCode === 0 && stdout) return stdout;

  // Last resort: use the current process as reference
  return process.argv[1] || "coder";
}

export async function installService(config: Omit<ServiceConfig, "coderBin">): Promise<InstallResult> {
  ensureLogDir();
  const coderBin = await resolveCoderBin();
  const fullConfig: ServiceConfig = { ...config, coderBin };

  if (process.platform === "darwin") {
    return installLaunchd(fullConfig);
  } else if (process.platform === "linux") {
    return installSystemd(fullConfig);
  }

  return {
    success: false,
    message: `Unsupported platform: ${process.platform}. Only macOS (launchd) and Linux (systemd) are supported.`,
    path: "",
  };
}

async function installLaunchd(config: ServiceConfig): Promise<InstallResult> {
  const plistPath = getLaunchdPlistPath();
  const plistContent = generateLaunchdPlist(config);

  // Ensure directory exists
  const dir = dirname(plistPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Unload if already installed (ignore errors)
  await shell(["launchctl", "unload", plistPath]).catch(() => {});

  // Write plist
  writeFileSync(plistPath, plistContent, "utf-8");

  // Load the service
  const { exitCode, stderr } = await shell(["launchctl", "load", plistPath]);

  if (exitCode !== 0) {
    return {
      success: false,
      message: `Failed to load launchd service: ${stderr}`,
      path: plistPath,
    };
  }

  return {
    success: true,
    message: `Daemon installed and started via launchd.\n  Plist: ${plistPath}\n  Logs: ~/.claude/daemon/logs/service.log\n  Stop: coder --daemon-uninstall`,
    path: plistPath,
  };
}

async function installSystemd(config: ServiceConfig): Promise<InstallResult> {
  const unitPath = getSystemdUnitPath();
  const unitContent = generateSystemdUnit(config);

  // Ensure directory exists
  const dir = dirname(unitPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Write unit file
  writeFileSync(unitPath, unitContent, "utf-8");

  // Reload systemd, enable and start
  const reload = await shell(["systemctl", "--user", "daemon-reload"]);
  if (reload.exitCode !== 0) {
    return {
      success: false,
      message: `Failed to reload systemd: ${reload.stderr}`,
      path: unitPath,
    };
  }

  const enable = await shell(["systemctl", "--user", "enable", "--now", "coder-daemon.service"]);
  if (enable.exitCode !== 0) {
    return {
      success: false,
      message: `Failed to enable+start systemd service: ${enable.stderr}`,
      path: unitPath,
    };
  }

  return {
    success: true,
    message: `Daemon installed and started via systemd.\n  Unit: ${unitPath}\n  Logs: journalctl --user -u coder-daemon\n  Stop: coder --daemon-uninstall`,
    path: unitPath,
  };
}
