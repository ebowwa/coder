/**
 * Daemon State - Persistent state for daemon sessions
 *
 * Stores daemon state to disk for recovery and monitoring.
 */

import { homedir } from "os"
import { join } from "path"
import type { DaemonConfig } from "./types.js"
import { writeFileSync, existsSync, mkdirSync } from "fs"

export interface PersistedDaemonState {
  sessionId: string
  goal: string
  status: "running" | "paused" | "completed" | "failed" | "restarting"
  startTime: string
  lastActivity: string
  pid?: number
  turns: number
  errors: number
  restartCount: number
  workingDirectory: string
  model: string
  config: Partial<DaemonConfig>
}

export class DaemonState {
  private static readonly STATE_DIR = join(homedir(), ".claude", "daemon")
  private static readonly STATE_FILE = join(DaemonState.STATE_DIR, "current.json")

  sessionId: string
  goal: string
  status: "running" | "paused" | "completed" | "failed" | "restarting" = "running"
  startTime: string
  lastActivity: string
  pid?: number
  turns: number = 0
  errors: number = 0
  restartCount: number = 0
  workingDirectory: string
  model: string
  config: Partial<DaemonConfig>

  constructor(config: DaemonConfig) {
    this.sessionId = `daemon-${Date.now().toString(36)}`
    this.goal = config.goal
    this.workingDirectory = config.workingDirectory
    this.model = config.model || "glm-5"
    this.config = config
    this.startTime = new Date().toISOString()
    this.lastActivity = this.startTime
  }

  /**
   * Update state
   */
  update(updates: Partial<PersistedDaemonState>): void {
    if (updates.turns !== undefined) this.turns = updates.turns
    if (updates.errors !== undefined) this.errors = updates.errors
    if (updates.restartCount !== undefined) this.restartCount = updates.restartCount
    if (updates.status !== undefined) this.status = updates.status
    if (updates.pid !== undefined) this.pid = updates.pid
    this.lastActivity = new Date().toISOString()
    this.save()
  }

  /**
   * Save state to disk
   */
  save(): void {
    if (!existsSync(DaemonState.STATE_DIR)) {
      mkdirSync(DaemonState.STATE_DIR, { recursive: true })
    }

    const state: PersistedDaemonState = {
      sessionId: this.sessionId,
      goal: this.goal,
      status: this.status,
      startTime: this.startTime,
      lastActivity: this.lastActivity,
      pid: this.pid,
      turns: this.turns,
      errors: this.errors,
      restartCount: this.restartCount,
      workingDirectory: this.workingDirectory,
      model: this.model,
      config: this.config,
    }

    writeFileSync(DaemonState.STATE_FILE, JSON.stringify(state, null, 2))
  }

  /**
   * Load state from disk
   */
  static load(): PersistedDaemonState | null {
    if (!existsSync(DaemonState.STATE_FILE)) {
      return null
    }

    try {
      const content = require("fs").readFileSync(DaemonState.STATE_FILE, "utf-8")
      return JSON.parse(content) as PersistedDaemonState
    } catch {
      return null
    }
  }

  /**
   * Clear state from disk
   */
  static clear(): void {
    if (existsSync(DaemonState.STATE_FILE)) {
      require("fs").unlinkSync(DaemonState.STATE_FILE)
    }
  }

  /**
   * Serialize for persistence
   */
  serialize(): PersistedDaemonState {
    return {
      sessionId: this.sessionId,
      goal: this.goal,
      status: this.status,
      startTime: this.startTime,
      lastActivity: this.lastActivity,
      pid: this.pid,
      turns: this.turns,
      errors: this.errors,
      restartCount: this.restartCount,
      workingDirectory: this.workingDirectory,
      model: this.model,
      config: this.config,
    }
  }
}
