/**
 * Daemon Supervisor
 *
 * Manages autonomous coder execution with:
 * - Singleton lock (prevents multiple daemons)
 * - Auto-restart on failure (with error classification)
 * - Worker health monitoring
 * - Watch for stuck states
 * - Auto-commit progress
 * - Send alerts on blockers
 * - Continuous loop mode (24/7 operation)
 */

import { spawn, ChildProcess } from "node:child_process"
import { EventEmitter } from "events"
import type { DaemonConfig } from "./types.js"
import { DEFAULT_DAEMON_CONFIG } from "./types.js"
import { DaemonState } from "./daemon-state.js"
import type { PersistedDaemonState } from "./daemon-state.js"
import {
  AutoRestartManager,
  Watchdog,
  SingletonLock,
  ErrorClassifier,
  WorkerHealthMonitor,
  createObservabilityStack,
  type ObservabilityStack,
  type ClassifiedError,
} from "@ebowwa/daemons"
import { ChannelAlerter } from "./channel-alerts.js"
import { AutoCommitter } from "./auto-commit.js"
import { DaemonTelemetry } from "./telemetry.js"

export class DaemonSupervisor extends EventEmitter {
  private config: DaemonConfig
  private state: DaemonState
  private childProcess: ChildProcess | null = null
  private autoRestart: AutoRestartManager
  private watchdog: Watchdog<PersistedDaemonState>
  private alerter: ChannelAlerter | null = null
  private committer: AutoCommitter
  private telemetry: DaemonTelemetry
  private isShuttingDown: boolean = false
  private singletonLock: SingletonLock
  private errorClassifier: ErrorClassifier
  private healthMonitor: WorkerHealthMonitor
  private permanentFailureCount: number = 0
  private lastClassifiedError: ClassifiedError | null = null
  private observability: ObservabilityStack | null = null

  constructor(config: Partial<DaemonConfig> = {}) {
    super()
    this.config = { ...DEFAULT_DAEMON_CONFIG, ...config }
    this.state = new DaemonState(this.config)
    this.singletonLock = new SingletonLock()
    this.errorClassifier = new ErrorClassifier()
    this.healthMonitor = new WorkerHealthMonitor({
      startupTimeout: 30000,
      checkInterval: 10000,
      noOutputTimeout: 120000,
    })
    this.autoRestart = new AutoRestartManager({
      maxRestarts: this.config.maxRestarts,
      baseDelay: this.config.restartDelay,
      maxDelay: this.config.restartMaxDelay,
      delayFactor: this.config.restartDelayFactor,
    })
    this.watchdog = new Watchdog<PersistedDaemonState>({
      checkInterval: this.config.watchdogInterval,
      stuckTimeout: this.config.watchdogTimeout,
    })
    this.committer = new AutoCommitter(this.config.workingDirectory, {
      enabled: this.config.autoCommit,
      commitInterval: this.config.autoCommitInterval,
    })
    this.telemetry = new DaemonTelemetry()

    // Initialize observability stack
    this.observability = createObservabilityStack(this.state.sessionId, {
      goal: this.config.goal,
      workingDirectory: this.config.workingDirectory,
      model: this.config.model,
    })

    if (this.config.enableTelegram || this.config.enableWebhook) {
      this.alerter = new ChannelAlerter({
        enabled: true,
        telegram: this.config.telegramChatId ? {
          botToken: process.env.TELEGRAM_BOT_TOKEN || "",
          chatId: this.config.telegramChatId,
        } : undefined,
        webhookUrl: this.config.webhookUrl,
        alertOn: {
          blocker: this.config.alertOnBlocker,
          complete: this.config.alertOnComplete,
          stuck: this.config.alertOnStuck,
          progress: this.config.alertOnProgress,
          error: true,
          health: false,
        },
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

    // Health monitor events
    this.healthMonitor.on("startupTimeout", (report) => {
      console.log(`\x1b[33m[Daemon] Worker startup timeout: ${report.message}\x1b[0m`)
    })

    this.healthMonitor.on("unhealthy", (report) => {
      console.log(`\x1b[33m[Daemon] Worker unhealthy: ${report.message}\x1b[0m`)
    })

    this.healthMonitor.on("firstOutput", () => {
      console.log(`\x1b[32m[Daemon] Worker is producing output\x1b[0m`)
    })

    // Process signals
    process.on("SIGTERM", () => this.shutdown())
    process.on("SIGINT", () => this.shutdown())
  }

  /**
   * Start the daemon
   * Returns false if another daemon is already running
   * @param force - Replace existing daemon if one is running
   */
  async start(force: boolean = false): Promise<boolean> {
    // Try to acquire singleton lock
    const lockStatus = this.singletonLock.acquire(
      this.state.sessionId,
      this.config.workingDirectory,
      this.config.goal,
      this.config.model || "unknown",
      { force }
    )

    if (!lockStatus.acquired) {
      // Print detailed info about existing daemon
      console.error(`\n\x1b[31m${lockStatus.message}\x1b[0m\n`)

      if (lockStatus.existingLock && lockStatus.existingProcessAlive) {
        console.error(`\x1b[90mTo replace it, use: coder --daemon --daemon-replace\x1b[0m`)
      }

      this.emit("failed", lockStatus.message)
      return false
    }

    console.log(`\x1b[32m[Daemon] Lock acquired: ${this.state.sessionId}\x1b[0m`)

    this.state.update({ status: "running", pid: process.pid })

    // Start components
    this.committer.start(this.state.serialize())
    this.telemetry.start(this.state.serialize())
    this.watchdog.startMonitoring(this.state.serialize())

    // Start alerter
    if (this.alerter) {
      await this.alerter.start()
    }

    this.emit("started", this.state.sessionId)

    // If we have a goal, start working on it
    if (this.config.goal) {
      await this.spawnWorker()
    }

    return true
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

    console.log(`\x1b[90m[Daemon] Spawning worker: coder ${args.join(" ")}\x1b[0m`)

    // Emit worker start event
    if (this.observability) {
      this.observability.eventBus.emitEvent({
        type: "worker:start",
        timestamp: Date.now(),
        sessionId: this.state.sessionId,
        data: { args, goal: this.config.goal, model: this.config.model }
      })
      if (this.observability.progressTracker) {
        this.observability.progressTracker.setStatus("starting", "Spawning worker process")
      }
    }

    // Use doppler run to ensure secrets are available to worker
    this.childProcess = spawn("doppler", ["run", "--", "coder", ...args], {
      cwd: this.config.workingDirectory,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    })

    // Start health monitoring
    if (this.childProcess.pid) {
      this.healthMonitor.startMonitoring(this.childProcess.pid)
    }

    this.childProcess.on("exit", async (code, signal) => {
      // Stop health monitoring
      this.healthMonitor.stopMonitoring()
      await this.handleWorkerExit(code, signal)
    })

    this.childProcess.on("error", async (error) => {
      this.healthMonitor.stopMonitoring()
      await this.handleWorkerError(error)
    })

    // Pipe output and record for health monitoring
    this.childProcess.stdout?.on("data", (data) => {
      const output = data.toString()
      this.emit("output", output)
      this.watchdog.recordProgress()
      this.healthMonitor.recordOutput(output)

      // Track file activity from output
      if (this.observability) {
        // Detect file reads
        const readMatch = output.match(/Reading file:?\s*(.+)/i) || output.match(/→\s*(.+\.ts|.+\.js|.+\.json|.+\.md)/)
        if (readMatch) {
          this.observability.fileTracker.trackRead(readMatch[1].trim(), "Read")
          this.observability.eventBus.emitEvent({
            type: "file:read",
            timestamp: Date.now(),
            sessionId: this.state.sessionId,
            data: { path: readMatch[1].trim(), action: "read" }
          })
        }

        // Detect file modifications
        const editMatch = output.match(/Editing file:?\s*(.+)/i) || output.match(/✎\s*(.+\.ts|.+\.js|.+\.json)/)
        if (editMatch) {
          this.observability.fileTracker.trackModify(editMatch[1].trim(), "Edit")
          this.observability.eventBus.emitEvent({
            type: "file:modify",
            timestamp: Date.now(),
            sessionId: this.state.sessionId,
            data: { path: editMatch[1].trim(), action: "modify" }
          })
        }

        // Track progress on each output
        if (this.observability.progressTracker) {
          this.observability.progressTracker.setStatus("working", "Processing...")
        }
      }
    })

    this.childProcess.stderr?.on("data", (data) => {
      const output = data.toString()
      this.emit("error", output)
      // Also record stderr as output for health monitoring
      this.healthMonitor.recordOutput(output)
    })
  }

  /**
   * Handle worker exit
   */
  private async handleWorkerExit(code: number | null, signal: string | null): Promise<void> {
    if (this.isShuttingDown) return

    // Get health report to understand why worker exited
    const healthReport = this.healthMonitor.getHealthReport()

    if (code === 0) {
      // Successful completion
      this.state.update({ status: "completed" })
      await this.handleCompletion()
      return
    }

    // Classify the error
    const error = new Error(`Process exited with code ${code}, signal ${signal}`)
    this.lastClassifiedError = this.errorClassifier.classify(error, code)

    console.log(`\x1b[33m[Daemon] Worker exited (${code}/${signal}): ${this.lastClassifiedError.message}\x1b[0m`)
    console.log(`\x1b[90m[Daemon] Error class: ${this.lastClassifiedError.class}, shouldRetry: ${this.lastClassifiedError.shouldRetry}\x1b[0m`)
    console.log(`\x1b[90m[Daemon] Health: ${healthReport.message}\x1b[0m`)

    // Track permanent failures
    if (this.lastClassifiedError.class === "permanent") {
      this.permanentFailureCount++

      // After 2 permanent failures in a row, give up
      if (this.permanentFailureCount >= 2) {
        await this.handlePermanentFailure(this.lastClassifiedError)
        return
      }
    } else {
      // Reset counter on non-permanent error
      this.permanentFailureCount = 0
    }

    // Check if we should retry based on classification
    if (!this.lastClassifiedError.shouldRetry) {
      await this.handlePermanentFailure(this.lastClassifiedError)
      return
    }

    // For rate limits, use the suggested delay
    if (this.lastClassifiedError.retryDelay) {
      console.log(`\x1b[90m[Daemon] Waiting ${this.lastClassifiedError.retryDelay / 1000}s before retry...\x1b[0m`)
      await new Promise(resolve => setTimeout(resolve, this.lastClassifiedError!.retryDelay))
    }

    // Attempt restart
    await this.autoRestart.handleFailure(error)
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

    if (this.alerter) {
      await this.alerter.sendStuckAlert(reason, this.state.serialize())
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

    // Emit completion event for observability
    if (this.observability) {
      this.observability.eventBus.emitEvent({
        type: "daemon:complete",
        timestamp: Date.now(),
        sessionId: this.state.sessionId,
        data: {
          turns: this.state.turns,
          errors: this.state.errors,
          restartCount: this.state.restartCount,
          uptime: Date.now() - new Date(this.state.startTime).getTime()
        }
      })
      if (this.observability.progressTracker) {
        this.observability.progressTracker.setStatus("completed", "Goal completed")
      }
    }

    if (this.alerter) {
      await this.alerter.sendCompleteAlert(
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

    if (this.alerter) {
      await this.alerter.sendBlockerAlert(
        "Max restart attempts reached. Manual intervention required.",
        this.state.serialize()
      )
    }

    this.emit("failed", "Max restarts reached")
    this.shutdown()
  }

  /**
   * Handle permanent failure (won't succeed on retry)
   */
  private async handlePermanentFailure(classified: ClassifiedError): Promise<void> {
    this.state.update({ status: "failed" })

    console.error(`\x1b[31m[Daemon] Permanent failure: ${classified.message}\x1b[0m`)
    console.error(`\x1b[90m[Daemon] This error cannot be fixed by retrying.\x1b[0m`)

    if (this.alerter) {
      await this.alerter.sendBlockerAlert(
        `Permanent failure: ${classified.message}`,
        this.state.serialize()
      )
    }

    this.emit("failed", classified.message)
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

    // Emit restart event for observability
    if (this.observability) {
      this.observability.eventBus.emitEvent({
        type: "daemon:restart",
        timestamp: Date.now(),
        sessionId: this.state.sessionId,
        data: { restartCount: this.state.restartCount }
      })
      if (this.observability.progressTracker) {
        this.observability.progressTracker.setStatus("restarting", `Restarting (attempt ${this.state.restartCount})`)
      }
    }

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

    console.log(`\x1b[90m[Daemon] Shutting down...\x1b[0m`)

    // Stop health monitoring
    this.healthMonitor.stopMonitoring()

    // Stop components
    this.watchdog.stopMonitoring()
    this.committer.stop()
    this.telemetry.stop()

    // Stop alerter
    if (this.alerter) {
      await this.alerter.stop()
    }

    // Kill worker
    if (this.childProcess) {
      this.childProcess.kill("SIGTERM")
    }

    // Release singleton lock
    this.singletonLock.release()

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

  /**
   * Get observability data for monitoring
   */
  getObservability(): {
    files: { read: number; modified: number; created: number }
    tools: { calls: number; successRate: number; avgDuration: number }
    progress: { turns: number; goalProgress: number } | null
    recentEvents: Array<{ type: string; timestamp: number }>
  } {
    if (!this.observability) {
      return {
        files: { read: 0, modified: 0, created: 0 },
        tools: { calls: 0, successRate: 0, avgDuration: 0 },
        progress: null,
        recentEvents: [],
      }
    }

    const fileSummary = this.observability.fileTracker.getSummary()
    const toolSummary = this.observability.toolLogger.getSummary()
    const progressMetrics = this.observability.progressTracker?.getMetrics()
    const recentEvents = this.observability.eventBus.getHistory(20)

    return {
      files: {
        read: fileSummary.reads,
        modified: fileSummary.modifies,
        created: fileSummary.creates,
      },
      tools: {
        calls: toolSummary.totalCalls,
        successRate: toolSummary.successRate,
        avgDuration: toolSummary.averageDuration,
      },
      progress: progressMetrics ? {
        turns: progressMetrics.turns,
        goalProgress: progressMetrics.goalProgress || 0,
      } : null,
      recentEvents: recentEvents.map(e => ({
        type: e.type,
        timestamp: e.timestamp,
      })),
    }
  }

  /**
   * Subscribe to real-time observability events
   */
  subscribeToEvents(
    handler: (event: { type: string; timestamp: number; data: unknown }) => void
  ): () => void {
    if (!this.observability) {
      return () => {}
    }
    return this.observability.eventBus.subscribe("*", handler)
  }

  /**
   * Get file activity log
   */
  getFileActivity(limit = 50): Array<{
    path: string
    action: string
    timestamp: number
    tool?: string
  }> {
    if (!this.observability) return []
    return this.observability.fileTracker.getActivities(limit).map(a => ({
      path: a.path,
      action: a.action,
      timestamp: a.timestamp,
      tool: a.tool,
    }))
  }

  /**
   * Get tool call log
   */
  getToolLog(limit = 50): Array<{
    tool: string
    durationMs: number
    success: boolean
    timestamp: number
  }> {
    if (!this.observability) return []
    return this.observability.toolLogger.getCompletedCalls(limit).map(c => ({
      tool: c.tool,
      durationMs: c.durationMs,
      success: c.success,
      timestamp: c.timestamp,
    }))
  }
}
