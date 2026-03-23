/**
 * Daemon Mode Types
 *
 * Types for autonomous, self-healing coder execution
 */

import type { PermissionMode } from "../../schemas/index.js"

/**
 * Daemon configuration
 */
export interface DaemonConfig {
  /** Enable daemon mode */
  enabled: boolean

  /** Goal/prompt to work on autonomously */
  goal: string

  /** Working directory */
  workingDirectory: string

  /** Model to use */
  model?: string

  /** Permission mode */
  permissionMode?: PermissionMode

  /** Max restart attempts before giving up */
  maxRestarts: number

  /** Base delay between restarts (ms) */
  restartDelay: number

  /** Max delay between restarts (ms) */
  restartMaxDelay: number

  /** Factor to multiply delay by each attempt */
  restartDelayFactor: number

  /** Max consecutive errors before stopping */
  maxConsecutiveErrors: number

  /** Max total errors before stopping */
  maxTotalErrors: number

  /** Watchdog interval (ms) */
  watchdogInterval: number

  /** Watchdog timeout (ms) - if no progress for this long, consider stuck */
  watchdogTimeout: number

  /** Auto-commit progress */
  autoCommit: boolean

  /** Auto-commit interval (ms) */
  autoCommitInterval: number

  /** Auto-commit message prefix */
  autoCommitMessage: string

  /** Enable Telegram alerts */
  enableTelegram: boolean

  /** Telegram chat ID */
  telegramChatId?: string

  /** Alert on blocker detected */
  alertOnBlocker: boolean

  /** Alert on completion */
  alertOnComplete: boolean

  /** Alert on stuck state */
  alertOnStuck: boolean

  /** Alert on progress milestones */
  alertOnProgress: boolean

  /** Webhook URL for alerts */
  webhookUrl?: string

  /** Enable webhook alerts */
  enableWebhook: boolean

  // --- NEW SAFEGUARDS ---

  /** Enable continuous loop mode (24/7 operation) */
  continuousLoop: boolean

  /** Delay between goal completions in continuous mode (ms) */
  loopDelay: number

  /** Time to wait for worker startup (ms) */
  workerStartupTimeout: number

  /** Max time without output before considering worker unhealthy (ms) */
  workerNoOutputTimeout: number

  /** Enable singleton lock (prevent multiple daemons) */
  enableSingletonLock: boolean

  /** Max permanent failures before giving up */
  maxPermanentFailures: number
}

/**
 * Default daemon configuration
 */
export const DEFAULT_DAEMON_CONFIG: DaemonConfig = {
  enabled: true,
  goal: "",
  workingDirectory: process.cwd(),
  model: "glm-5",
  permissionMode: "bypassPermissions",
  maxRestarts: 10,
  restartDelay: 5000,
  restartMaxDelay: 300000,
  restartDelayFactor: 2,
  maxConsecutiveErrors: 5,
  maxTotalErrors: 100,
  watchdogInterval: 30000,
  watchdogTimeout: 300000,
  autoCommit: true,
  autoCommitInterval: 60000,
  autoCommitMessage: "chore: auto-save progress",
  enableTelegram: false,
  telegramChatId: undefined,
  alertOnBlocker: true,
  alertOnComplete: true,
  alertOnStuck: true,
  alertOnProgress: false,
  webhookUrl: undefined,
  enableWebhook: false,
  // NEW SAFEGUARDS
  continuousLoop: false,
  loopDelay: 60000,
  workerStartupTimeout: 30000,
  workerNoOutputTimeout: 120000,
  enableSingletonLock: true,
  maxPermanentFailures: 2,
}
