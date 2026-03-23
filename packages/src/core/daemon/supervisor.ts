/**
 * Daemon Supervisor
 *
 * Manages autonomous coder execution with:
 * - Auto-restart on failure
 * - Watch for stuck states
 * - Auto-commit progress
 * - Send alerts on blockers
 */

import { spawn, ChildProcess } from "node:child_process"
import { EventEmitter } from "events"
import type { DaemonConfig } from "./types.js"
import { DEFAULT_DAEMON_CONFIG } from "./types.js"
import { DaemonState } from "./daemon-state.js"
import type { PersistedDaemonState } from "./daemon-state.js"
import { AutoRestartManager } from "./auto-restart.js"
import { Watchdog } from "./watchdog.js"
import { TelegramAlerter } from "./telegram-alerts.js"
import { AutoCommitter } from "./auto-commit.js"
import { DaemonTelemetry } from "./telemetry.js"

export class DaemonSupervisor extends EventEmitter {
  private config: DaemonConfig
  private state: DaemonState
  private childProcess: ChildProcess | null = null
  private autoRestart: AutoRestartManager
  private watchdog: Watchdog
  private telegram: TelegramAlerter | null = null
  private committer: AutoCommitter
  private telemetry: DaemonTelemetry
  private isShuttingDown: boolean = false

  constructor(config: Partial<DaemonConfig> = {}) {
    super()
    this.config = { ...DEFAULT_DAEMON_CONFIG, ...config }
    this.state = new DaemonState(this.config)
    this.autoRestart = new AutoRestartManager({
      maxRestarts: this.config.maxRestarts,
      baseDelay: this.config.restartDelay,
      maxDelay: this.config.restartMaxDelay,
      delayFactor: this.config.restartDelayFactor,
    })
    this.watchdog = new Watchdog({
      checkInterval: this.config.watchdogInterval,
      stuckTimeout: this.config.watchdogTimeout,
    })
    this.committer = new AutoCommitter(this.config.workingDirectory, {
      enabled: this.config.autoCommit,
      commitInterval: this.config.autoCommitInterval,
    })
    this.telemetry = new DaemonTelemetry()

    if (this.config.enableTelegram && this.config.telegramChatId) {
      this.telegram = new TelegramAlerter({
        chatId: this.config.telegramChatId,
      })
    }

    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    // Watchdog events
    this.watchdog.on("stuck", async (reason: string) => {
      await this.handleStuckState(reason)
    })

    // Auto-restart events
    this.autoRestart.on("restart", () => {
      this.restart()
    })

    this.autoRestart.on("maxRestartsReached", () => {
      this.handleMaxRestartsReached()
    })

    // Process signals
    process.on("SIGTERM", () => this.shutdown())
    process.on("SIGINT", () => this.shutdown())
  }

  /**
   * Start the daemon
   */
  async start(): Promise<void> {
    this.state.update({ status: "running", pid: process.pid })

    // Start components
    this.committer.start(this.state.serialize())
    this.telemetry.start(this.state.serialize())
    this.watchdog.startMonitoring(this.state.serialize())

    this.emit("started", this.state.sessionId)

    // If we have a goal, start working on it
    if (this.config.goal) {
      await this.spawnWorker()
    }
  }

  /**
   * Spawn a worker process
   */
  private async spawnWorker(): Promise<void> {
    if (this.isShuttingDown) return

    const args = [
      "-p", this.config.permissionMode || "bypassPermissions",
      "-q", this.config.goal,
    ]

    if (this.config.model) {
      args.push("--model", this.config.model)
    }

    this.childProcess = spawn("coder", args, {
      cwd: this.config.workingDirectory,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    })

    this.childProcess.on("exit", async (code, signal) => {
      await this.handleWorkerExit(code, signal)
    })

    this.childProcess.on("error", async (error) => {
      await this.handleWorkerError(error)
    })

    // Pipe output
    this.childProcess.stdout?.on("data", (data) => {
      this.emit("output", data.toString())
      this.watchdog.recordProgress()
    })

    this.childProcess.stderr?.on("data", (data) => {
      this.emit("error", data.toString())
    })
  }

  /**
   * Handle worker exit
   */
  private async handleWorkerExit(code: number | null, signal: string | null): Promise<void> {
    if (this.isShuttingDown) return

    if (code === 0) {
      // Successful completion
      this.state.update({ status: "completed" })
      await this.handleCompletion()
    } else {
      // Failure - attempt restart
      await this.autoRestart.handleFailure(new Error(`Process exited with code ${code}, signal ${signal}`))
    }
  }

  /**
   * Handle worker error
   */
  private async handleWorkerError(error: Error): Promise<void> {
    if (this.isShuttingDown) return

    this.state.update({ errors: this.state.errors + 1 })
    await this.autoRestart.handleFailure(error)
  }

  /**
   * Handle stuck state
   */
  private async handleStuckState(reason: string): Promise<void> {
    this.state.update({ status: "restarting" })

    if (this.telegram) {
      await this.telegram.sendStuckAlert(reason, this.state.serialize())
    }

    this.emit("stuck", reason)
    await this.autoRestart.handleFailure(new Error(`Stuck: ${reason}`))
  }

  /**
   * Handle completion
   */
  private async handleCompletion(): Promise<void> {
    // Final commit
    await this.committer.commit()

    if (this.telegram) {
      await this.telegram.sendCompleteAlert(
        "Goal completed successfully",
        this.state.serialize()
      )
    }

    this.emit("completed")
    this.shutdown()
  }

  /**
   * Handle max restarts reached
   */
  private async handleMaxRestartsReached(): Promise<void> {
    this.state.update({ status: "failed" })

    if (this.telegram) {
      await this.telegram.sendBlockerAlert(
        "Max restart attempts reached. Manual intervention required.",
        this.state.serialize()
      )
    }

    this.emit("failed", "Max restarts reached")
    this.shutdown()
  }

  /**
   * Restart the worker
   */
  private async restart(): Promise<void> {
    this.state.update({
      status: "restarting",
      restartCount: this.state.restartCount + 1,
    })

    // Kill existing process
    if (this.childProcess) {
      this.childProcess.kill("SIGTERM")
      this.childProcess = null
    }

    // Commit before restart
    await this.committer.commit()

    this.emit("restarting", this.state.restartCount)

    // Start new worker
    await this.spawnWorker()
    this.state.update({ status: "running" })
  }

  /**
   * Shutdown the daemon
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) return
    this.isShuttingDown = true

    // Stop components
    this.watchdog.stopMonitoring()
    this.committer.stop()
    this.telemetry.stop()

    // Kill worker
    if (this.childProcess) {
      this.childProcess.kill("SIGTERM")
    }

    this.emit("shutdown")
  }

  /**
   * Get daemon status
   */
  getStatus(): {
    sessionId: string
    status: string
    goal: string
    turns: number
    errors: number
    restartCount: number
    uptime: number
  } {
    return {
      sessionId: this.state.sessionId,
      status: this.state.status,
      goal: this.state.goal,
      turns: this.state.turns,
      errors: this.state.errors,
      restartCount: this.state.restartCount,
      uptime: Date.now() - new Date(this.state.startTime).getTime(),
    }
  }
}
