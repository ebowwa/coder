/**
 * Watchdog - Monitors for stuck states
 *
 * Detects when the agent loop is not making progress and can
 * trigger recovery actions like restart, alert, or continue.
 */

import type { PersistedDaemonState } from "./daemon-state.js"
import { EventEmitter } from "events"

export interface WatchdogConfig {
  /** How often to check for progress */
  checkInterval: number
  /** Max time without progress before considering stuck */
  stuckTimeout: number
  /** Max time without tool calls before considering stuck */
  noToolCallTimeout: number
  /** Callback when stuck state detected */
  onStuck?: (state: PersistedDaemonState, reason: string) => void
  /** Callback when progress detected */
  onProgress?: (state: PersistedDaemonState) => void
}

export const DEFAULT_WATCHDOG_CONFIG: WatchdogConfig = {
  checkInterval: 30000,
  stuckTimeout: 300000,
  noToolCallTimeout: 180000,
}

export class Watchdog extends EventEmitter {
  private config: WatchdogConfig
  private state: PersistedDaemonState | null = null
  private checkTimer: ReturnType<typeof setInterval> | null = null
  private lastProgressTime: number = 0
  private lastToolCallTime: number = 0
  private isMonitoring: boolean = false

  constructor(config: Partial<WatchdogConfig> = {}) {
    super()
    this.config = { ...DEFAULT_WATCHDOG_CONFIG, ...config }
  }

  /**
   * Start monitoring
   */
  startMonitoring(state: PersistedDaemonState): void {
    this.state = state
    this.isMonitoring = true
    this.lastProgressTime = Date.now()
    this.lastToolCallTime = Date.now()

    this.checkTimer = setInterval(() => {
      this.check()
    }, this.config.checkInterval)
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer)
      this.checkTimer = null
    }
    this.isMonitoring = false
  }

  /**
   * Record progress (called on activity)
   */
  recordProgress(): void {
    this.lastProgressTime = Date.now()
    this.lastToolCallTime = Date.now()

    if (this.state) {
      this.emit("progress", this.state)
    }
  }

  /**
   * Record tool call
   */
  recordToolCall(): void {
    this.lastToolCallTime = Date.now()
    this.recordProgress()
  }

  /**
   * Check for stuck state
   */
  private check(): void {
    if (!this.state || !this.isMonitoring) return

    const now = Date.now()
    const timeSinceProgress = now - this.lastProgressTime
    const timeSinceToolCall = now - this.lastToolCallTime

    // Check for stuck state
    if (timeSinceProgress > this.config.stuckTimeout) {
      const reason = `No progress for ${Math.round(timeSinceProgress / 1000)}s`
      this.emit("stuck", this.state, reason)
      return
    }

    if (timeSinceToolCall > this.config.noToolCallTimeout) {
      const reason = `No tool calls for ${Math.round(timeSinceToolCall / 1000)}s`
      this.emit("stuck", this.state, reason)
      return
    }

    // Emit progress event
    this.emit("progress", this.state)
  }

  /**
   * Get current watchdog status
   */
  getStatus(): {
    isMonitoring: boolean
    lastProgressTime: number
    lastToolCallTime: number
    timeSinceProgress: number | null
    timeSinceToolCall: number | null
  } {
    const now = Date.now()
    return {
      isMonitoring: this.isMonitoring,
      lastProgressTime: this.lastProgressTime,
      lastToolCallTime: this.lastToolCallTime,
      timeSinceProgress: this.lastProgressTime ? now - this.lastProgressTime : null,
      timeSinceToolCall: this.lastToolCallTime ? now - this.lastToolCallTime : null,
    }
  }
}
