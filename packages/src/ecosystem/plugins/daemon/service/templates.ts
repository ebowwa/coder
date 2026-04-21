/**
 * Service Templates - Platform-native service definition generators.
 *
 * Generates launchd plist (macOS) and systemd unit (Linux) files
 * for persistent daemon operation across reboots and crashes.
 */

import { homedir } from "node:os";
import { join } from "node:path";

export interface ServiceConfig {
  role: string;
  jurisdiction: string;
  model?: string;
  cooldown?: number;
  goal?: string;
  /** Path to the coder binary (resolved at install time) */
  coderBin: string;
}

const LOG_DIR = join(homedir(), ".claude", "daemon", "logs");
const PID_FILE = join(homedir(), ".claude", "daemon", "coder.pid");

/**
 * macOS LaunchAgent plist XML.
 * KeepAlive ensures launchd restarts the daemon if it crashes.
 * StandardOutPath/StandardErrorPath route logs to a rotatable file.
 */
export function generateLaunchdPlist(config: ServiceConfig): string {
  const args = buildCoderArgs(config);
  const logPath = join(LOG_DIR, "service.log");
  const errPath = join(LOG_DIR, "service-error.log");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.ebowwa.coder-daemon</string>

  <key>ProgramArguments</key>
  <array>
    <string>doppler</string>
    <string>run</string>
    <string>--</string>
${args.map(a => `    <string>${escapeXml(a)}</string>`).join("\n")}
  </array>

  <key>WorkingDirectory</key>
  <string>${escapeXml(config.jurisdiction)}</string>

  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key>
    <false/>
  </dict>

  <key>ThrottleInterval</key>
  <integer>30</integer>

  <key>StandardOutPath</key>
  <string>${escapeXml(logPath)}</string>

  <key>StandardErrorPath</key>
  <string>${escapeXml(errPath)}</string>

  <key>RunAtLoad</key>
  <true/>

  <key>ProcessType</key>
  <string>Background</string>
</dict>
</plist>`;
}

/**
 * Linux systemd user unit file.
 * Restart=always with RestartSec=30 for crash recovery.
 * WatchdogSec=300 expects a heartbeat every 5 minutes.
 */
export function generateSystemdUnit(config: ServiceConfig): string {
  const args = buildCoderArgs(config);
  const execLine = `doppler run -- ${args.join(" ")}`;

  return `[Unit]
Description=Coder Autonomous Daemon (${config.role})
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=${execLine}
WorkingDirectory=${config.jurisdiction}
Restart=always
RestartSec=30
WatchdogSec=300
Environment=HOME=${homedir()}

StandardOutput=append:${join(LOG_DIR, "service.log")}
StandardError=append:${join(LOG_DIR, "service-error.log")}

[Install]
WantedBy=default.target`;
}

function buildCoderArgs(config: ServiceConfig): string[] {
  const args = [
    config.coderBin,
    "--daemon",
    "--daemon-role", config.role,
    "--daemon-jurisdiction", config.jurisdiction,
    "--long-running",
    "--permission-mode", "bypassPermissions",
  ];

  if (config.model) {
    args.push("--model", config.model);
  }
  if (config.cooldown) {
    args.push("--daemon-cooldown", String(config.cooldown));
  }
  if (config.goal) {
    args.push("--daemon-goal", config.goal);
  }

  return args;
}

export function getLaunchdPlistPath(): string {
  return join(homedir(), "Library", "LaunchAgents", "com.ebowwa.coder-daemon.plist");
}

export function getSystemdUnitPath(): string {
  return join(homedir(), ".config", "systemd", "user", "coder-daemon.service");
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
