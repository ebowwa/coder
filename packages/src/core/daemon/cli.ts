/**
 * Daemon CLI Integration
 *
 * Adds daemon mode commands to the coder CLI:
 * - --daemon: Start daemon mode
 * - --daemon-status: Check daemon status
 * - --daemon-stop: Stop daemon
 * - --daemon-config <file>: Load daemon config
 */

import type { DaemonConfig } from "./types.js"
import { DEFAULT_DAEMON_CONFIG } from "./types.js"
import { readFileSync, existsSync } from "fs"

/**
 * Parse daemon-related CLI arguments
 */
export interface DaemonCliOptions {
  daemon: boolean
  daemonStatus: boolean
  daemonStop: boolean
  daemonConfig: string
  daemonAutoCommit: boolean
  daemonWatchdog: boolean
  daemonTelegram: boolean
  daemonMaxRestarts: number
  daemonGoal: string
}

export function parseDaemonArgs(argv: string[]): DaemonCliOptions {
  const options: DaemonCliOptions = {
    daemon: false,
    daemonStatus: false,
    daemonStop: false,
    daemonConfig: "",
    daemonAutoCommit: true,
    daemonWatchdog: true,
    daemonTelegram: false,
    daemonMaxRestarts: 10,
    daemonGoal: "",
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]

    switch (arg) {
      case "--daemon":
        options.daemon = true
        break
      case "--daemon-status":
        options.daemonStatus = true
        break
      case "--daemon-stop":
        options.daemonStop = true
        break
      case "--daemon-config":
        options.daemonConfig = argv[++i] || ""
        break
      case "--daemon-auto-commit":
        options.daemonAutoCommit = true
        break
      case "--no-daemon-auto-commit":
        options.daemonAutoCommit = false
        break
      case "--daemon-watchdog":
        options.daemonWatchdog = true
        break
      case "--no-daemon-watchdog":
        options.daemonWatchdog = false
        break
      case "--daemon-telegram":
        options.daemonTelegram = true
        break
      case "--daemon-max-restarts": {
        const value = argv[++i]
        if (value) {
          options.daemonMaxRestarts = parseInt(value) || 10
        }
        break
      }
      case "--daemon-goal":
        options.daemonGoal = argv[++i] || ""
        break
    }
  }

  return options
}

/**
 * Handle daemon CLI commands
 */
export async function handleDaemonCommands(options: DaemonCliOptions): Promise<void> {
  if (options.daemonStatus) {
    await printDaemonStatus()
    process.exit(0)
  }

  if (options.daemonStop) {
    await stopDaemon()
    process.exit(0)
  }
}

/**
 * Create daemon config from CLI options
 */
export function createDaemonConfigFromOptions(
  options: DaemonCliOptions,
  baseConfig: Partial<DaemonConfig>
): DaemonConfig {
  const config: DaemonConfig = {
    ...DEFAULT_DAEMON_CONFIG,
    ...baseConfig,
    autoCommit: options.daemonAutoCommit,
    watchdogInterval: options.daemonWatchdog ? 30000 : 0,
    enableTelegram: options.daemonTelegram,
    maxRestarts: options.daemonMaxRestarts,
  }

  if (options.daemonGoal) {
    config.goal = options.daemonGoal
  }

  return config
}

/**
 * Load daemon config from file
 */
export function loadDaemonConfigFile(path: string): Partial<DaemonConfig> | null {
  if (!existsSync(path)) {
    return null
  }

  try {
    const content = readFileSync(path, "utf-8")
    return JSON.parse(content) as Partial<DaemonConfig>
  } catch {
    return null
  }
}

/**
 * Print daemon status
 */
async function printDaemonStatus(): Promise<void> {
  const { DaemonState } = await import("./daemon-state.js")
  const state = DaemonState.load()

  if (!state) {
    console.log("No active daemon session found")
    return
  }

  console.log("Daemon Status:")
  console.log(`  Session: ${state.sessionId}`)
  console.log(`  Status: ${state.status}`)
  console.log(`  Goal: ${state.goal}`)
  console.log(`  PID: ${state.pid ?? "none"}`)
  console.log(`  Turns: ${state.turns}`)
  console.log(`  Restarts: ${state.restartCount}`)
  console.log(`  Errors: ${state.errors}`)
  console.log(`  Started: ${state.startTime}`)
  console.log(`  Last Activity: ${state.lastActivity}`)
}

/**
 * Stop running daemon
 */
async function stopDaemon(): Promise<void> {
  const { DaemonState } = await import("./daemon-state.js")
  const state = DaemonState.load()

  if (!state || !state.pid) {
    console.log("No active daemon session found")
    return
  }

  try {
    process.kill(state.pid, "SIGTERM")
    console.log(`Sent SIGTERM to daemon process ${state.pid}`)
  } catch (error) {
    console.log(`Failed to stop daemon: ${error}`)
  }
}
