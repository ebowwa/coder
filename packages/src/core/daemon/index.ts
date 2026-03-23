/**
 * Daemon Mode - Re-export all daemon components
 */

export type { DaemonConfig } from "./types.js"
export { DEFAULT_DAEMON_CONFIG } from "./types.js"
export { DaemonSupervisor } from "./supervisor.js"
export { AutoRestartManager } from "./auto-restart.js"
export { Watchdog } from "./watchdog.js"
export { TelegramAlerter } from "./telegram-alerts.js"
export { AutoCommitter } from "./auto-commit.js"
export { DaemonState } from "./daemon-state.js"
export type { PersistedDaemonState } from "./daemon-state.js"
export { DaemonTelemetry } from "./telemetry.js"
export type { DaemonCliOptions } from "./cli.js"
export { parseDaemonArgs, handleDaemonCommands, createDaemonConfigFromOptions, loadDaemonConfigFile } from "./cli.js"
