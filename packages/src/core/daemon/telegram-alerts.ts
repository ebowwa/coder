/**
 * Telegram Alerts - Send notifications via Telegram MCP
 *
 * Uses the configured Telegram MCP server to send alerts about:
 * - Blockers detected
 * - Session complete
 * - Stuck states
 * - Progress milestones
 */

import type { PersistedDaemonState } from "./daemon-state.js"

export interface TelegramAlertConfig {
  /** Telegram chat ID to send alerts to */
  chatId: string
  /** Enable/disable specific alert types */
  alertOnBlocker: boolean
  alertOnComplete: boolean
  alertOnStuck: boolean
  alertOnProgress: boolean
  /** Only send alerts every N turns */
  progressInterval: number
}

export const DEFAULT_TELEGRAM_CONFIG: TelegramAlertConfig = {
  chatId: "",
  alertOnBlocker: true,
  alertOnComplete: true,
  alertOnStuck: true,
  alertOnProgress: false,
  progressInterval: 10,
}

export class TelegramAlerter {
  private config: TelegramAlertConfig
  private lastProgressAlertTurn: number = 0

  constructor(config: Partial<TelegramAlertConfig> = {}) {
    this.config = { ...DEFAULT_TELEGRAM_CONFIG, ...config }
  }

  /**
   * Send an alert via Telegram MCP
   */
  async sendAlert(
    type: "blocker" | "complete" | "stuck" | "progress",
    message: string,
    state: PersistedDaemonState
  ): Promise<void> {
    // Check if this alert type is enabled
    if (type === "blocker" && !this.config.alertOnBlocker) return
    if (type === "complete" && !this.config.alertOnComplete) return
    if (type === "stuck" && !this.config.alertOnStuck) return
    if (type === "progress" && !this.config.alertOnProgress) return

    // For progress alerts, check interval
    if (type === "progress") {
      if (state.turns - this.lastProgressAlertTurn < this.config.progressInterval) {
        return
      }
      this.lastProgressAlertTurn = state.turns
    }

    // Format the alert message
    const emoji = {
      blocker: "🚫",
      complete: "✅",
      stuck: "⏸",
      progress: "📊",
    }[type]

    const alertMessage = [
      `${emoji} **Coder Daemon ${type.toUpperCase()}**`,
      ``,
      `${message}`,
      ``,
      `Session: ${state.sessionId.slice(0, 8)}`,
      `Goal: ${state.goal}`,
      `Turns: ${state.turns} | Errors: ${state.errors}`,
      `Duration: ${formatDuration(state.startTime)}`,
      `Status: ${state.status}`,
    ].join("\n")

    // Use Telegram MCP to send the message
    // Note: This requires the Telegram MCP server to be configured
    // The MCP tool would be: mcp__telegram__telegram_send_message
    console.log(`[Telegram Alert] ${type}: ${message}`)

    // In a real implementation, this would call the MCP tool
    // For now, we just log it since the MCP client needs to be passed in
  }

  /**
   * Send blocker alert
   */
  async sendBlockerAlert(message: string, state: PersistedDaemonState): Promise<void> {
    await this.sendAlert("blocker", message, state)
  }

  /**
   * Send completion alert
   */
  async sendCompleteAlert(message: string, state: PersistedDaemonState): Promise<void> {
    await this.sendAlert("complete", message, state)
  }

  /**
   * Send stuck alert
   */
  async sendStuckAlert(message: string, state: PersistedDaemonState): Promise<void> {
    await this.sendAlert("stuck", message, state)
  }

  /**
   * Send progress alert
   */
  async sendProgressAlert(message: string, state: PersistedDaemonState): Promise<void> {
    await this.sendAlert("progress", message, state)
  }
}

function formatDuration(startTime: string): string {
  const start = new Date(startTime)
  const now = new Date()
  const diff = now.getTime() - start.getTime()

  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}
