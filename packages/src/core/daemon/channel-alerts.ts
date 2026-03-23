/**
 * Channel Alerts - Multi-channel notifications for daemon mode
 *
 * Uses @ebowwa/channel-core for channel routing with:
 * - Priority message queue
 * - Rate limiting
 * - Retry with exponential backoff
 * - Dead letter queue for failed alerts
 *
 * Supported channels:
 * - Telegram (via @ebowwa/channel-telegram)
 * - Extensible to Discord, Slack, etc.
 */

import type { PersistedDaemonState } from "./daemon-state.js"
import {
  ChannelRouter,
  createChannelRouter,
  type RoutedMessage,
  type RouterStats,
  type BroadcastResult,
  DEFAULT_ROUTER_CONFIG,
} from "@ebowwa/channel-core"

export type AlertType = "blocker" | "complete" | "stuck" | "progress" | "error" | "health"

export interface ChannelAlertConfig {
  /** Enable alerts */
  enabled: boolean
  /** Telegram configuration */
  telegram?: {
    botToken: string
    chatId: string
    allowedUsers?: number[]
    allowedChats?: number[]
  }
  /** Webhook URL for generic alerts */
  webhookUrl?: string
  /** Alert type filters */
  alertOn: {
    blocker: boolean
    complete: boolean
    stuck: boolean
    progress: boolean
    error: boolean
    health: boolean
  }
  /** Minimum interval between progress alerts (turns) */
  progressInterval: number
  /** Rate limit: max alerts per minute */
  rateLimitPerMinute: number
  /** Enable quiet hours (no alerts during this time) */
  quietHours?: {
    start: string // "22:00"
    end: string   // "08:00"
    timezone: string
  }
}

export const DEFAULT_CHANNEL_ALERT_CONFIG: ChannelAlertConfig = {
  enabled: true,
  alertOn: {
    blocker: true,
    complete: true,
    stuck: true,
    progress: false,
    error: true,
    health: false,
  },
  progressInterval: 10,
  rateLimitPerMinute: 5,
}

export interface AlertMessage {
  type: AlertType
  title: string
  body: string
  state: PersistedDaemonState
  timestamp: Date
  priority: "high" | "normal" | "low"
}

export class ChannelAlerter {
  private config: ChannelAlertConfig
  private router: ChannelRouter | null = null
  private lastProgressAlertTurn: number = 0
  private alertCount: number = 0
  private lastAlertTime: number = 0
  private isInitialized: boolean = false

  constructor(config: Partial<ChannelAlertConfig> = {}) {
    this.config = { ...DEFAULT_CHANNEL_ALERT_CONFIG, ...config }
  }

  /**
   * Initialize the channel router
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true
    if (!this.config.enabled) return false

    try {
      // Create channel router
      this.router = createChannelRouter({
        ...DEFAULT_ROUTER_CONFIG,
      })

      // Register Telegram channel if configured
      if (this.config.telegram) {
        await this.registerTelegramChannel()
      }

      // Set message handler (alerts don't need incoming message handling)
      this.router.setHandler(async (routed: RoutedMessage) => {
        // Just acknowledge incoming messages
        return {
          content: { text: "Alert channel active" },
          replyTo: routed.message,
        }
      })

      this.isInitialized = true
      return true
    } catch (error) {
      console.error("[ChannelAlerts] Failed to initialize:", error)
      return false
    }
  }

  /**
   * Register Telegram channel
   */
  private async registerTelegramChannel(): Promise<void> {
    if (!this.config.telegram || !this.router) return

    try {
      // Dynamic import for optional dependency
      const { createTelegramChannel } = await import("@ebowwa/channel-telegram")

      const channel = createTelegramChannel({
        botToken: this.config.telegram.botToken,
        testChatId: this.config.telegram.chatId,
        allowedUsers: this.config.telegram.allowedUsers,
        allowedChats: this.config.telegram.allowedChats,
      })

      this.router.register(channel)
      console.log("[ChannelAlerts] Telegram channel registered")
    } catch (error) {
      console.error("[ChannelAlerts] Failed to register Telegram channel:", error)
      console.error("[ChannelAlerts] Make sure @ebowwa/channel-telegram is installed")
    }
  }

  /**
   * Start the alert system
   */
  async start(): Promise<void> {
    if (!this.router) {
      await this.initialize()
    }

    if (this.router) {
      await this.router.start()
      console.log("[ChannelAlerts] Started")
    }
  }

  /**
   * Stop the alert system
   */
  async stop(): Promise<void> {
    if (this.router) {
      await this.router.stop()
      console.log("[ChannelAlerts] Stopped")
    }
  }

  /**
   * Send an alert through configured channels
   */
  async sendAlert(alert: AlertMessage): Promise<BroadcastResult | null> {
    // Check if alert type is enabled
    if (!this.config.alertOn[alert.type]) {
      return null
    }

    // Check rate limit
    if (!this.checkRateLimit()) {
      console.log("[ChannelAlerts] Rate limited, skipping alert")
      return null
    }

    // Check quiet hours
    if (this.isInQuietHours()) {
      console.log("[ChannelAlerts] Quiet hours, skipping alert")
      return null
    }

    // For progress alerts, check interval
    if (alert.type === "progress") {
      if (alert.state.turns - this.lastProgressAlertTurn < this.config.progressInterval) {
        return null
      }
      this.lastProgressAlertTurn = alert.state.turns
    }

    // Initialize if needed
    if (!this.router) {
      const initialized = await this.initialize()
      if (!initialized) {
        console.log("[ChannelAlerts] Not initialized, logging alert instead")
        this.logAlert(alert)
        return null
      }
    }

    // Format the message
    const message = this.formatAlert(alert)

    // Track alert
    this.alertCount++
    this.lastAlertTime = Date.now()

    try {
      // Broadcast to all registered channels
      const result = await this.router!.broadcast({
        content: { text: message },
        metadata: {
          alertType: alert.type,
          priority: alert.priority,
          sessionId: alert.state.sessionId,
        },
      })

      if (result.delivered > 0) {
        console.log(`[ChannelAlerts] Alert delivered to ${result.delivered} channel(s)`)
      } else {
        console.log("[ChannelAlerts] Alert not delivered to any channel")
      }

      return result
    } catch (error) {
      console.error("[ChannelAlerts] Failed to send alert:", error)
      this.logAlert(alert)
      return null
    }
  }

  /**
   * Send blocker alert
   */
  async sendBlockerAlert(message: string, state: PersistedDaemonState): Promise<void> {
    await this.sendAlert({
      type: "blocker",
      title: "Blocker Detected",
      body: message,
      state,
      timestamp: new Date(),
      priority: "high",
    })
  }

  /**
   * Send completion alert
   */
  async sendCompleteAlert(message: string, state: PersistedDaemonState): Promise<void> {
    await this.sendAlert({
      type: "complete",
      title: "Goal Completed",
      body: message,
      state,
      timestamp: new Date(),
      priority: "normal",
    })
  }

  /**
   * Send stuck alert
   */
  async sendStuckAlert(message: string, state: PersistedDaemonState): Promise<void> {
    await this.sendAlert({
      type: "stuck",
      title: "Daemon Stuck",
      body: message,
      state,
      timestamp: new Date(),
      priority: "high",
    })
  }

  /**
   * Send progress alert
   */
  async sendProgressAlert(message: string, state: PersistedDaemonState): Promise<void> {
    await this.sendAlert({
      type: "progress",
      title: "Progress Update",
      body: message,
      state,
      timestamp: new Date(),
      priority: "low",
    })
  }

  /**
   * Send error alert
   */
  async sendErrorAlert(message: string, state: PersistedDaemonState): Promise<void> {
    await this.sendAlert({
      type: "error",
      title: "Error Occurred",
      body: message,
      state,
      timestamp: new Date(),
      priority: "high",
    })
  }

  /**
   * Send health check alert
   */
  async sendHealthAlert(message: string, state: PersistedDaemonState): Promise<void> {
    await this.sendAlert({
      type: "health",
      title: "Health Check",
      body: message,
      state,
      timestamp: new Date(),
      priority: "low",
    })
  }

  /**
   * Get router statistics
   */
  getStats(): RouterStats | null {
    return this.router?.getStats() ?? null
  }

  /**
   * Get alert statistics
   */
  getAlertStats(): {
    alertCount: number
    lastAlertTime: number | null
    isInitialized: boolean
  } {
    return {
      alertCount: this.alertCount,
      lastAlertTime: this.lastAlertTime || null,
      isInitialized: this.isInitialized,
    }
  }

  // --- Private methods ---

  /**
   * Format alert message
   */
  private formatAlert(alert: AlertMessage): string {
    const emoji = {
      blocker: "🚫",
      complete: "✅",
      stuck: "⏸",
      progress: "📊",
      error: "❌",
      health: "💚",
    }[alert.type]

    const lines = [
      `${emoji} **${alert.title}**`,
      "",
      alert.body,
      "",
      `**Session:** \`${alert.state.sessionId.slice(0, 8)}...\``,
      `**Goal:** ${alert.state.goal.slice(0, 100)}${alert.state.goal.length > 100 ? "..." : ""}`,
      `**Status:** ${alert.state.status}`,
      `**Turns:** ${alert.state.turns} | **Errors:** ${alert.state.errors}`,
      `**Restarts:** ${alert.state.restartCount}`,
      `**Duration:** ${this.formatDuration(alert.state.startTime)}`,
      `**Working Dir:** ${alert.state.workingDirectory}`,
    ]

    return lines.join("\n")
  }

  /**
   * Format duration from start time
   */
  private formatDuration(startTime: string): string {
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

  /**
   * Check rate limit
   */
  private checkRateLimit(): boolean {
    const now = Date.now()
    const oneMinuteAgo = now - 60000

    // Reset counter if more than a minute has passed
    if (this.lastAlertTime < oneMinuteAgo) {
      this.alertCount = 0
    }

    return this.alertCount < this.config.rateLimitPerMinute
  }

  /**
   * Check if current time is in quiet hours
   */
  private isInQuietHours(): boolean {
    if (!this.config.quietHours) return false

    const now = new Date()
    const [startHour = 0, startMin = 0] = this.config.quietHours.start.split(":").map(Number)
    const [endHour = 0, endMin = 0] = this.config.quietHours.end.split(":").map(Number)

    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin

    if (startMinutes > endMinutes) {
      // Quiet hours span midnight (e.g., 22:00 - 08:00)
      return currentMinutes >= startMinutes || currentMinutes < endMinutes
    } else {
      // Quiet hours don't span midnight
      return currentMinutes >= startMinutes && currentMinutes < endMinutes
    }
  }

  /**
   * Log alert to console (fallback when channels unavailable)
   */
  private logAlert(alert: AlertMessage): void {
    const emoji = {
      blocker: "🚫",
      complete: "✅",
      stuck: "⏸",
      progress: "📊",
      error: "❌",
      health: "💚",
    }[alert.type]

    console.log(`\n${emoji} [${alert.type.toUpperCase()}] ${alert.title}`)
    console.log(`  ${alert.body}`)
    console.log(`  Session: ${alert.state.sessionId.slice(0, 8)}...`)
    console.log(`  Turns: ${alert.state.turns} | Errors: ${alert.state.errors}`)
    console.log(`  Duration: ${this.formatDuration(alert.state.startTime)}\n`)
  }
}
