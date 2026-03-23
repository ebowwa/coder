/**
 * Daemon Mode - Re-export all daemon components
 */

export type { DaemonConfig } from "./types.js"
export { DEFAULT_DAEMON_CONFIG } from "./types.js"
export { DaemonSupervisor } from "./supervisor.js"

// Re-export from @ebowwa/daemons for convenience
export {
  AutoRestartManager,
  Watchdog,
  SingletonLock,
  ErrorClassifier,
  WorkerHealthMonitor,
} from "@ebowwa/daemons"

// Coder-specific components (not in @ebowwa/daemons)
export { ChannelAlerter } from "./channel-alerts.js"
export type { ChannelAlertConfig, AlertType, AlertMessage } from "./channel-alerts.js"
export { AutoCommitter } from "./auto-commit.js"
export { DaemonState } from "./daemon-state.js"
export type { PersistedDaemonState } from "./daemon-state.js"
export { DaemonTelemetry } from "./telemetry.js"

// CLI utilities
export type { DaemonCliOptions } from "./cli.js"
export { parseDaemonArgs, handleDaemonCommands, createDaemonConfigFromOptions, loadDaemonConfigFile } from "./cli.js"
