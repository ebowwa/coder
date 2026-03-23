/**
 * Auto-Restart Manager
 *
 * Handles restart logic with exponential backoff for:
 * - API rate limits
 * - Network errors
 * - Transient failures
 */

import { EventEmitter } from "events"

export interface AutoRestartConfig {
  /** Maximum number of restart attempts before giving up */
  maxRestarts: number
  /** Base delay before first restart (ms) */
  baseDelay: number
  /** Maximum delay between restarts (ms) */
  maxDelay: number
  /** Factor to multiply delay by each attempt */
  delayFactor: number
  /** Maximum consecutive errors before stopping */
  maxConsecutiveErrors: number
}

export const DEFAULT_AUTO_RESTART_CONFIG: AutoRestartConfig = {
  maxRestarts: 10,
  baseDelay: 5000,
  maxDelay: 300000, // 5 minutes
  delayFactor: 2,
  maxConsecutiveErrors: 5,
}

export class AutoRestartManager extends EventEmitter {
  private config: AutoRestartConfig
  private restartCount: number = 0
  private consecutiveErrors: number = 0
  private restartTimer: ReturnType<typeof setTimeout> | null = null
  private currentDelay: number = 0

  constructor(config: Partial<AutoRestartConfig> = {}) {
    super()
    this.config = { ...DEFAULT_AUTO_RESTART_CONFIG, ...config }
    this.currentDelay = this.config.baseDelay
  }

  /**
   * Handle a failure and potentially schedule a restart
   */
  async handleFailure(error: Error): Promise<boolean> {
    this.consecutiveErrors++

    // Check if we should stop
    if (this.restartCount >= this.config.maxRestarts) {
      this.emit("maxRestartsReached")
      return false
    }

    if (this.consecutiveErrors >= this.config.maxConsecutiveErrors) {
      this.emit("maxErrorsReached")
      return false
    }

    // Calculate delay with exponential backoff and jitter
    const delay = this.calculateDelay()

    this.emit("retryScheduled", {
      attempt: this.restartCount + 1,
      delay,
      error: error.message,
    })

    // Schedule restart
    await this.scheduleRestart(delay)
    return true
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(): number {
    const { baseDelay, maxDelay, delayFactor } = this.config

    // Exponential backoff
    const exponentialDelay = baseDelay * Math.pow(delayFactor, this.restartCount)

    // Add jitter (random factor 0-1)
    const jitter = Math.random() * 0.3 * exponentialDelay

    // Cap at max delay
    return Math.min(exponentialDelay + jitter, maxDelay)
  }

  /**
   * Schedule a restart after delay
   */
  private async scheduleRestart(delay: number): Promise<void> {
    return new Promise((resolve) => {
      this.restartTimer = setTimeout(() => {
        this.restartCount++
        this.emit("restart")
        resolve()
      }, delay)
    })
  }

  /**
   * Reset error counters (call on success)
   */
  reset(): void {
    this.consecutiveErrors = 0
    this.currentDelay = this.config.baseDelay
  }

  /**
   * Cancel pending restart
   */
  cancel(): void {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer)
      this.restartTimer = null
    }
  }

  /**
   * Get current status
   */
  getStatus(): {
    restartCount: number
    consecutiveErrors: number
    currentDelay: number
    canRestart: boolean
  } {
    return {
      restartCount: this.restartCount,
      consecutiveErrors: this.consecutiveErrors,
      currentDelay: this.currentDelay,
      canRestart: this.restartCount < this.config.maxRestarts,
    }
  }
}
