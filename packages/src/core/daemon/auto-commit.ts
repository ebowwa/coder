/**
 * Auto-Commit - Periodically commits progress during autonomous work
 *
 * Commits changes at configurable intervals to preserve work in case of failure.
 */

import { spawn } from "node:child_process"
import type { PersistedDaemonState } from "./daemon-state.js"

export interface AutoCommitConfig {
  /** Enable auto-commit */
  enabled: boolean
  /** Interval between commits in ms */
  commitInterval: number
  /** Commit message prefix */
  messagePrefix: string
  /** Only commit if there are changes */
  onlyIfChanges: boolean
  /** Include telemetry in commit */
  includeTelemetry: boolean
}

export const DEFAULT_AUTO_COMMIT_CONFIG: AutoCommitConfig = {
  enabled: true,
  commitInterval: 60000,
  messagePrefix: "chore: auto-save progress",
  onlyIfChanges: true,
  includeTelemetry: false,
}

export class AutoCommitter {
  private config: AutoCommitConfig
  private commitTimer: ReturnType<typeof setInterval> | null = null
  private state: PersistedDaemonState | null = null
  private workingDirectory: string
  private lastCommitTime: number = 0
  private commitCount: number = 0

  constructor(workingDirectory: string, config: Partial<AutoCommitConfig> = {}) {
    this.workingDirectory = workingDirectory
    this.config = { ...DEFAULT_AUTO_COMMIT_CONFIG, ...config }
  }

  /**
   * Start auto-commit timer
   */
  start(state: PersistedDaemonState): void {
    this.state = state
    this.lastCommitTime = Date.now()

    if (this.config.enabled) {
      this.commitTimer = setInterval(() => {
        this.commit()
      }, this.config.commitInterval)
    }
  }

  /**
   * Stop auto-commit timer
   */
  stop(): void {
    if (this.commitTimer) {
      clearInterval(this.commitTimer)
      this.commitTimer = null
    }
  }

  /**
   * Perform a commit
   */
  async commit(): Promise<{ success: boolean; message: string }> {
    if (!this.state) {
      return { success: false, message: "No state set" }
    }

    try {
      // Check git status first
      const statusResult = await this.runGit(["status", "--porcelain"])
      const hasChanges = statusResult.stdout.trim().length > 0

      if (this.config.onlyIfChanges && !hasChanges) {
        return { success: true, message: "No changes to commit" }
      }

      // Stage all changes
      await this.runGit(["add", "-A"])

      // Create commit message with turn info
      const turnInfo = `turn ${this.state.turns}`
      const message = `${this.config.messagePrefix} [${turnInfo}] (${new Date().toISOString()})`

      // Commit
      await this.runGit(["commit", "-m", message])

      this.commitCount++
      this.lastCommitTime = Date.now()

      return { success: true, message: `Committed: ${message}` }
    } catch (error) {
      return { success: false, message: `Commit failed: ${error}` }
    }
  }

  /**
   * Run a git command
   */
  private async runGit(args: string[]): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const proc = spawn("git", args, {
        cwd: this.workingDirectory,
        env: { ...process.env },
      })

      let stdout = ""
      let stderr = ""

      proc.stdout.on("data", (data) => {
        stdout += data.toString()
      })

      proc.stderr.on("data", (data) => {
        stderr += data.toString()
      })

      proc.on("close", (code) => {
        if (code === 0) {
          resolve({ stdout, stderr })
        } else {
          reject(new Error(`git ${args.join(" ")} failed with code ${code}: ${stderr}`))
        }
      })
    })
  }

  /**
   * Get commit statistics
   */
  getStats(): {
    commitCount: number
    lastCommitTime: number
  } {
    return {
      commitCount: this.commitCount,
      lastCommitTime: this.lastCommitTime,
    }
  }
}
