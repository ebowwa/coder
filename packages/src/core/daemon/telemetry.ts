/**
 * Daemon Telemetry - Health metrics for daemon mode
 *
 * Tracks and reports on daemon health, performance, and progress.
 */

import type { PersistedDaemonState } from "./daemon-state.js"
import { appendFileSync, existsSync, mkdirSync } from "fs"
import { homedir } from "os"
import { join } from "path"

export interface DaemonMetrics {
  timestamp: string
  sessionId: string
  status: string
  turns: number
  errors: number
  restartCount: number
  memoryMB: number
  uptimeMs: number
  lastActivityMs: number
  toolCalls: number
  apiCalls: number
}

export interface DaemonHealthCheck {
  timestamp: string
  isHealthy: boolean
  issues: string[]
  recommendations: string[]
}

export class DaemonTelemetry {
  private metricsDir: string
  private metricsFile: string
  private state: PersistedDaemonState | null = null
  private metricsInterval: ReturnType<typeof setInterval> | null = null
  private startTime: number = 0
  private toolCallCount: number = 0
  private apiCallCount: number = 0

  constructor() {
    this.metricsDir = join(homedir(), ".claude", "daemon", "metrics")
    this.metricsFile = join(this.metricsDir, "daemon-metrics.jsonl")
  }

  /**
   * Start telemetry collection
   */
  start(state: PersistedDaemonState): void {
    this.state = state
    this.startTime = Date.now()
    this.toolCallCount = 0
    this.apiCallCount = 0

    if (!existsSync(this.metricsDir)) {
      mkdirSync(this.metricsDir, { recursive: true })
    }

    // Record metrics every minute
    this.metricsInterval = setInterval(() => {
      this.recordMetrics()
    }, 60000)

    // Record initial metrics
    this.recordMetrics()
  }

  /**
   * Stop telemetry collection
   */
  stop(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
      this.metricsInterval = null
    }
    // Record final metrics
    this.recordMetrics()
  }

  /**
   * Record tool call
   */
  recordToolCall(): void {
    this.toolCallCount++
  }

  /**
   * Record API call
   */
  recordApiCall(): void {
    this.apiCallCount++
  }

  /**
   * Record metrics to file
   */
  private recordMetrics(): void {
    if (!this.state) return

    const memUsage = process.memoryUsage()
    const metrics: DaemonMetrics = {
      timestamp: new Date().toISOString(),
      sessionId: this.state.sessionId,
      status: this.state.status,
      turns: this.state.turns,
      errors: this.state.errors,
      restartCount: this.state.restartCount,
      memoryMB: memUsage.heapUsed / (1024 * 1024),
      uptimeMs: Date.now() - this.startTime,
      lastActivityMs: Date.now() - new Date(this.state.lastActivity).getTime(),
      toolCalls: this.toolCallCount,
      apiCalls: this.apiCallCount,
    }

    // Append to metrics file
    appendFileSync(this.metricsFile, JSON.stringify(metrics) + "\n")
  }

  /**
   * Perform health check
   */
  performHealthCheck(): DaemonHealthCheck {
    const issues: string[] = []
    const recommendations: string[] = []

    if (!this.state) {
      return {
        timestamp: new Date().toISOString(),
        isHealthy: false,
        issues: ["No daemon state"],
        recommendations: ["Initialize daemon state"],
      }
    }

    // Check for high error rate
    if (this.state.errors > 10) {
      issues.push(`High error count: ${this.state.errors}`)
      recommendations.push("Review error logs and fix root cause")
    }

    // Check for high restart count
    if (this.state.restartCount > 5) {
      issues.push(`High restart count: ${this.state.restartCount}`)
      recommendations.push("Investigate stability issues")
    }

    // Check for stale activity
    const lastActivityMs = Date.now() - new Date(this.state.lastActivity).getTime()
    if (lastActivityMs > 300000) {
      issues.push(`No activity for ${Math.round(lastActivityMs / 1000)}s`)
      recommendations.push("Check if daemon is stuck")
    }

    // Check memory usage
    const memUsage = process.memoryUsage()
    if (memUsage.heapUsed > 500 * 1024 * 1024) {
      issues.push(`High memory usage: ${Math.round(memUsage.heapUsed / (1024 * 1024))}MB`)
      recommendations.push("Consider restarting daemon to free memory")
    }

    return {
      timestamp: new Date().toISOString(),
      isHealthy: issues.length === 0,
      issues,
      recommendations,
    }
  }

  /**
   * Get summary of current session
   */
  getSummary(): string {
    if (!this.state) return "No active daemon session"

    const uptime = Date.now() - this.startTime
    const memUsage = process.memoryUsage()

    return [
      `Daemon Session: ${this.state.sessionId}`,
      `Status: ${this.state.status}`,
      `Goal: ${this.state.goal}`,
      `Turns: ${this.state.turns} | Errors: ${this.state.errors}`,
      `Restarts: ${this.state.restartCount}`,
      `Uptime: ${Math.round(uptime / 1000)}s`,
      `Memory: ${Math.round(memUsage.heapUsed / (1024 * 1024))}MB`,
      `Tool Calls: ${this.toolCallCount} | API Calls: ${this.apiCallCount}`,
    ].join("\n")
  }
}
