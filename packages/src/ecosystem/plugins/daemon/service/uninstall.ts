/**
 * Service Uninstaller - Removes the coder daemon from the platform's process manager.
 *
 * macOS: unloads and deletes the launchd plist
 * Linux: stops, disables, and deletes the systemd unit
 */

import { existsSync, unlinkSync } from "node:fs";
import { getLaunchdPlistPath, getSystemdUnitPath } from "./templates.js";

interface UninstallResult {
  success: boolean;
  message: string;
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

export async function uninstallService(): Promise<UninstallResult> {
  if (process.platform === "darwin") {
    return uninstallLaunchd();
  } else if (process.platform === "linux") {
    return uninstallSystemd();
  }

  return {
    success: false,
    message: `Unsupported platform: ${process.platform}`,
  };
}

async function uninstallLaunchd(): Promise<UninstallResult> {
  const plistPath = getLaunchdPlistPath();

  if (!existsSync(plistPath)) {
    return { success: true, message: "No launchd service installed." };
  }

  // Unload the service
  const { exitCode, stderr } = await shell(["launchctl", "unload", plistPath]);

  // Remove the file regardless
  try {
    unlinkSync(plistPath);
  } catch {
    // File already gone
  }

  if (exitCode !== 0 && !stderr.includes("Could not find")) {
    return {
      success: false,
      message: `Warning: launchctl unload returned error: ${stderr}. Plist file removed.`,
    };
  }

  return {
    success: true,
    message: `Daemon service uninstalled.\n  Removed: ${plistPath}`,
  };
}

async function uninstallSystemd(): Promise<UninstallResult> {
  const unitPath = getSystemdUnitPath();

  if (!existsSync(unitPath)) {
    return { success: true, message: "No systemd service installed." };
  }

  // Stop and disable the service
  await shell(["systemctl", "--user", "stop", "coder-daemon.service"]);
  await shell(["systemctl", "--user", "disable", "coder-daemon.service"]);

  // Remove the file
  try {
    unlinkSync(unitPath);
  } catch {
    // File already gone
  }

  // Reload systemd
  await shell(["systemctl", "--user", "daemon-reload"]);

  return {
    success: true,
    message: `Daemon service uninstalled.\n  Removed: ${unitPath}`,
  };
}
