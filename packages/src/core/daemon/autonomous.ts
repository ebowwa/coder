/**
 * Autonomous Daemon - Self-directing coder that runs continuously
 *
 * Unlike the supervisor+worker architecture, this runs coder's agent loop
 * directly in continuous mode. The daemon:
 * - Has a role/jurisdiction (not a single goal)
 * - Finds its own work within its jurisdiction
 * - Maintains context/memory between turns
 * - Runs the agent loop continuously
 *
 * The supervisor becomes just a thin safety net:
 * - Singleton lock (prevent duplicates)
 * - Crash recovery (optional)
 * - Health monitoring (optional)
 */

import { EventEmitter } from "events"
import { homedir } from "os"
import { join } from "path"
import { existsSync, mkdirSync, writeFileSync, readFileSync, appendFileSync } from "fs"
import { agentLoop, type AgentLoopOptions, type AgentLoopResult } from "../agent-loop/index.js"
import { SingletonLock, type LockInfo } from "@ebowwa/daemons"
import type { Message } from "../../schemas/index.js"

// ============================================
// TYPES
// ============================================

export type DaemonRole =
  | "maintainer"    // Monitors health, fixes bugs, keeps code clean
  | "developer"     // Implements features, refactors, adds tests
  | "reviewer"      // Reviews code, finds issues, suggests improvements
  | "watcher"       // Monitors for changes, alerts on issues
  | "researcher"    // Explores codebase, documents findings
  | "custom"        // Custom role with user-defined behavior

export interface AutonomousDaemonConfig {
  /** Role defines the daemon's purpose and behavior */
  role: DaemonRole
  /** Jurisdiction - the directory/domain this daemon is responsible for */
  jurisdiction: string
  /** Custom role prompt (for role: "custom") */
  customRolePrompt?: string
  /** Working directory */
  workingDirectory: string
  /** Model to use */
  model?: string
  /** Permission mode */
  permissionMode?: string
  /** Enable singleton lock (prevent multiple daemons for same directory) */
  enableLock?: boolean
  /** Auto-commit changes */
  autoCommit?: boolean
  /** Commit interval in ms */
  commitInterval?: number
  /** Turn cooldown in ms (prevent rapid-fire turns) */
  turnCooldown?: number
  /** Max turns before pause (0 = unlimited) */
  maxTurnsPerSession?: number
  /** Enable status file updates */
  enableStatus?: boolean
  /** Session ID */
  sessionId?: string
  /** API key */
  apiKey: string
  /** Tools available to the daemon */
  tools?: any[]
  /** Hook manager */
  hookManager?: any
  /** MCP client */
  mcpClient?: any
  /** Original goal (optional - for context) */
  goal?: string
}

export interface DaemonStatus {
  sessionId: string
  role: DaemonRole
  jurisdiction: string
  status: "starting" | "working" | "paused" | "completed" | "failed" | "shutdown"
  turns: number
  tokens: number
  cost: number
  startTime: number
  lastActivity: number
  currentTask?: string
  /** Current activity type for observability */
  currentActivity?: ActivityType
  /** Time spent per activity type (in ms) */
  activityTime: Record<ActivityType, number>
  /** Tokens used per activity type */
  activityTokens: Record<ActivityType, number>
  /** Brief description of what's being worked on */
  currentWork?: string
  /** Recently read files */
  filesRead: string[]
  /** Recently modified/created files */
  filesModified: string[]
  recentActions: string[]
  errors: number
}

/**
 * Activity types for observability - what the daemon is doing right now
 */
export type ActivityType =
  | "starting"      // Daemon is initializing
  | "reading"       // Reading files (Read tool)
  | "thinking"      // Model is generating (API call in progress)
  | "editing"       // Editing files (Edit tool)
  | "creating"      // Creating new files (Write tool)
  | "deleting"      // Deleting files (Bash rm, etc.)
  | "searching"     // Searching code (Grep, Glob)
  | "executing"     // Running shell commands (Bash)
  | "committing"    // Git operations
  | "testing"       // Running tests
  | "waiting"       // Cooldown between turns
  | "error"         // Error occurred
  | "shutdown"      // Daemon is shutting down

/**
 * Map tool names to activity types
 */
const TOOL_TO_ACTIVITY: Record<string, ActivityType> = {
  Read: "reading",
  Write: "creating",
  Edit: "editing",
  MultiEdit: "editing",
  Bash: "executing",
  Grep: "searching",
  Glob: "searching",
  LSP: "reading",
}

// ============================================
// ROLE DEFINITIONS WITH SKILLS
// ============================================

/**
 * Skills that a daemon can possess - learned capabilities for how to do things
 */
export type DaemonSkill =
  // Code manipulation
  | "edit-code"        // Make targeted code changes
  | "create-file"      // Create new files
  | "delete-file"      // Remove files
  | "refactor"         // Restructure code without changing behavior
  // Testing
  | "run-tests"        // Execute test suites
  | "write-tests"      // Create new tests
  | "debug-tests"      // Fix failing tests
  // Git operations
  | "commit"           // Create git commits
  | "review-diff"      // Review changes
  | "branch"           // Manage branches
  // Analysis
  | "search-code"      // Find code patterns
  | "read-code"        // Understand code
  | "analyze-deps"     // Analyze dependencies
  // Communication
  | "report"           // Generate reports
  | "document"         // Create documentation
  | "alert"            // Send alerts
  // Execution
  | "run-commands"     // Execute shell commands
  | "install-deps"     // Install dependencies

/**
 * Role definition with associated skills
 */
export interface RoleDefinition {
  prompt: string
  /** Primary skills this role uses most often */
  primarySkills: DaemonSkill[]
  /** Secondary skills this role can use */
  secondarySkills?: DaemonSkill[]
  /** Skills this role should NOT use without explicit instruction */
  restrictedSkills?: DaemonSkill[]
}

const ROLE_DEFINITIONS: Record<DaemonRole, RoleDefinition> = {
  maintainer: {
    primarySkills: ["run-tests", "edit-code", "debug-tests", "commit", "search-code"],
    secondarySkills: ["read-code", "analyze-deps", "document", "run-commands"],
    restrictedSkills: ["create-file", "delete-file"], // Be conservative
    prompt: `You are a code maintainer daemon. Your purpose (Meeseeks life goal) is to:

Keep the codebase healthy, stable, and working.

Your primary skills (how you achieve this):
- run-tests: Execute tests to verify nothing is broken
- edit-code: Fix bugs, update dependencies, remove dead code
- debug-tests: Investigate and fix failing tests
- commit: Commit your fixes with clear messages
- search-code: Find issues to fix

Workflow:
1. Run tests to find failures
2. Search for problematic patterns (TODOs, deprecated code, unused imports)
3. Fix issues conservatively - prefer editing over creating/deleting
4. Commit your changes
5. Look for the next issue

You are autonomous and self-directing. Focus on stability over new features.

Your jurisdiction is: {jurisdiction}`,
  },

  developer: {
    primarySkills: ["edit-code", "create-file", "write-tests", "refactor", "commit"],
    secondarySkills: ["read-code", "search-code", "document", "run-commands", "install-deps"],
    prompt: `You are a developer daemon. Your purpose (Meeseeks life goal) is to:

Build valuable features and improve code quality.

Your primary skills (how you achieve this):
- edit-code: Implement features, fix bugs
- create-file: Create new modules, components, tests
- write-tests: Ensure your code works
- refactor: Improve code structure
- commit: Commit your work

Workflow:
1. Understand what needs to be built
2. Design the approach
3. Implement with tests
4. Refactor for quality
5. Commit your changes
6. Find the next opportunity

You are autonomous and self-directing. Balance new features with code quality.

Your jurisdiction is: {jurisdiction}`,
  },

  reviewer: {
    primarySkills: ["read-code", "search-code", "review-diff", "report"],
    secondarySkills: ["run-tests", "edit-code", "document"],
    restrictedSkills: ["commit", "create-file", "delete-file"], // Review only, don't modify
    prompt: `You are a code reviewer daemon. Your purpose (Meeseeks life goal) is to:

Find issues and suggest improvements without modifying code directly.

Your primary skills (how you achieve this):
- read-code: Understand the codebase
- search-code: Find patterns and issues
- review-diff: Review recent changes
- report: Document findings

Workflow:
1. Review recent git activity
2. Search for problematic patterns
3. Analyze code quality
4. Generate actionable reports
5. Find the next area to review

You are autonomous and self-directing. Focus on finding actionable improvements.
You should NOT commit or modify files directly - report issues instead.

Your jurisdiction is: {jurisdiction}`,
  },

  watcher: {
    primarySkills: ["search-code", "read-code", "analyze-deps", "alert", "report"],
    secondarySkills: ["run-tests", "review-diff"],
    restrictedSkills: ["edit-code", "commit", "create-file"], // Observe only
    prompt: `You are a watcher daemon. Your purpose (Meeseeks life goal) is to:

Monitor the codebase and alert on issues before they become critical.

Your primary skills (how you achieve this):
- search-code: Find concerning patterns
- read-code: Understand changes
- analyze-deps: Check for vulnerable/outdated dependencies
- alert: Send notifications on issues
- report: Document findings

Workflow:
1. Establish baseline metrics
2. Monitor for changes
3. Detect anomalies
4. Alert on issues
5. Continue monitoring

You are autonomous and observant. You should NOT modify files - observe and report.

Your jurisdiction is: {jurisdiction}`,
  },

  researcher: {
    primarySkills: ["search-code", "read-code", "document", "report"],
    secondarySkills: ["run-tests", "analyze-deps"],
    restrictedSkills: ["edit-code", "commit", "create-file"], // Research only
    prompt: `You are a researcher daemon. Your purpose (Meeseeks life goal) is to:

Explore and document the codebase - build understanding for others.

Your primary skills (how you achieve this):
- search-code: Find patterns and relationships
- read-code: Understand implementation
- document: Create knowledge base entries
- report: Summarize findings

Workflow:
1. Map the high-level architecture
2. Identify key components and relationships
3. Document patterns and conventions
4. Create searchable knowledge
5. Find the next area to research

You are autonomous and thorough. You should NOT modify files - document findings.

Your jurisdiction is: {jurisdiction}`,
  },

  custom: {
    primarySkills: ["edit-code", "run-tests", "commit", "search-code", "read-code"],
    prompt: `{customPrompt}`,
  },
}

// Legacy prompts for backward compatibility
const ROLE_PROMPTS: Record<DaemonRole, string> = {
  maintainer: `You are a code maintainer daemon. Your role is to:

1. Monitor the health of your assigned codebase
2. Fix bugs and issues as you find them
3. Keep code clean and well-organized
4. Ensure tests pass
5. Update dependencies when safe
6. Remove dead code and unused imports
7. Add missing error handling

You are autonomous and self-directing. After completing a task, look for the next
thing that needs attention. Focus on stability and code quality over new features.

Your jurisdiction is: {jurisdiction}

Start by assessing the current state of your codebase, then prioritize and address issues.`,

  developer: `You are a developer daemon. Your role is to:

1. Implement new features and improvements
2. Refactor code for better maintainability
3. Add comprehensive tests
4. Improve performance where beneficial
5. Update documentation to match code changes

You are autonomous and self-directing. After completing a task, look for the next
opportunity to add value. Balance new features with code quality.

Your jurisdiction is: {jurisdiction}

Start by understanding what's already implemented, then identify opportunities for improvement.`,

  reviewer: `You are a code reviewer daemon. Your role is to:

1. Review recent changes for quality issues
2. Find potential bugs and edge cases
3. Identify security vulnerabilities
4. Suggest improvements and best practices
5. Ensure code follows project conventions
6. Check for missing tests and documentation

You are autonomous and self-directing. Focus on finding actionable improvements
rather than just reporting issues.

Your jurisdiction is: {jurisdiction}

Start by reviewing recent git activity and identifying areas that need attention.`,

  watcher: `You are a watcher daemon. Your role is to:

1. Monitor the codebase for changes
2. Detect potential issues early
3. Alert on security concerns
4. Track technical debt accumulation
5. Observe test coverage trends
6. Report on code health metrics

You are autonomous and self-directing. Be observant and proactive in identifying
potential problems before they become critical.

Your jurisdiction is: {jurisdiction}

Start by establishing a baseline of the current state, then monitor for changes.`,

  researcher: `You are a researcher daemon. Your role is to:

1. Explore and understand the codebase structure
2. Document findings and patterns
3. Identify relationships between components
4. Research best practices and alternatives
5. Create knowledge base entries
6. Answer questions about the codebase

You are autonomous and self-directing. Build understanding systematically and
document your discoveries for future reference.

Your jurisdiction is: {jurisdiction}

Start by mapping out the high-level architecture, then dive into specific areas.`,

  custom: `{customPrompt}`,
}

// ============================================
// AUTONOMOUS DAEMON CLASS
// ============================================

export class AutonomousDaemon extends EventEmitter {
  private config: AutonomousDaemonConfig
  private sessionId: string
  private status: DaemonStatus
  private isRunning: boolean = false
  private isShuttingDown: boolean = false
  private gracefulShutdownRequested: boolean = false
  private singletonLock: SingletonLock | null = null
  private currentLoopPromise: Promise<AgentLoopResult> | null = null
  private messages: Message[] = []
  private statusFilePath: string
  private logFilePath: string
  private injectFilePath: string
  private currentActivityStart: number = Date.now()
  private lastActivityType: ActivityType = "starting"
  /** Activity to attribute next token usage to */
  private pendingActivityToken: ActivityType = "thinking"
  /** Queue of injected messages to process */
  private injectedMessages: string[] = []

  constructor(config: AutonomousDaemonConfig) {
    super()
    this.config = config
    this.sessionId = config.sessionId || `daemon-${Date.now().toString(36)}`

    // Setup paths
    const daemonDir = join(homedir(), ".claude", "daemon")
    if (!existsSync(daemonDir)) {
      mkdirSync(daemonDir, { recursive: true })
    }
    this.statusFilePath = join(daemonDir, "current.json")
    this.logFilePath = join(daemonDir, "logs", `${this.sessionId}.jsonl`)
    this.injectFilePath = join(daemonDir, "inject", `${this.sessionId}.txt`)

    // Ensure log directory exists
    const logDir = join(daemonDir, "logs")
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true })
    }
    // Ensure inject directory exists
    const injectDir = join(daemonDir, "inject")
    if (!existsSync(injectDir)) {
      mkdirSync(injectDir, { recursive: true })
    }

    // Initialize status
    const emptyActivityTracking: Record<ActivityType, number> = {
      starting: 0, reading: 0, thinking: 0, editing: 0, creating: 0,
      deleting: 0, searching: 0, executing: 0, committing: 0, testing: 0,
      waiting: 0, error: 0, shutdown: 0,
    }
    this.status = {
      sessionId: this.sessionId,
      role: config.role,
      jurisdiction: config.jurisdiction,
      status: "starting",
      turns: 0,
      tokens: 0,
      cost: 0,
      startTime: Date.now(),
      lastActivity: Date.now(),
      activityTime: { ...emptyActivityTracking },
      activityTokens: { ...emptyActivityTracking },
      currentWork: "",
      filesRead: [],
      filesModified: [],
      recentActions: [],
      errors: 0,
    }

    // Setup signal handlers
    process.on("SIGTERM", () => this.shutdown())
    process.on("SIGINT", () => this.shutdown())
  }

  /**
   * Start the autonomous daemon
   */
  async start(force: boolean = false): Promise<boolean> {
    // Acquire singleton lock if enabled
    if (this.config.enableLock !== false) {
      this.singletonLock = new SingletonLock()
      const lockStatus = this.singletonLock.acquire(
        this.sessionId,
        this.config.workingDirectory,
        this.getRoleDescription(),
        this.config.model || "unknown",
        { force }
      )

      if (!lockStatus.acquired) {
        console.error(`\n\x1b[31m${lockStatus.message}\x1b[0m\n`)
        this.emit("failed", lockStatus.message)
        return false
      }

      console.log(`\x1b[32m[Daemon] Lock acquired: ${this.sessionId}\x1b[0m`)
    }

    this.isRunning = true
    this.updateStatus("working")
    this.saveStatus()

    this.emit("started", this.sessionId)

    // Build initial prompt based on role
    const systemPrompt = this.buildRolePrompt()
    const initialPrompt = this.config.goal || this.getInitialPrompt()

    // Initialize messages with the role context
    this.messages = [{
      role: "user",
      content: initialPrompt,
    }]

    // Start the autonomous loop
    await this.runLoop(systemPrompt)

    return true
  }

  /**
   * Main autonomous loop - runs continuously until shutdown
   */
  private async runLoop(systemPrompt: string): Promise<void> {
    while (this.isRunning && !this.isShuttingDown) {
      try {
        this.updateStatus("working")
        this.logEvent("turn:start", { turn: this.status.turns + 1 })

        // Run one turn of the agent loop
        const result = await this.runTurn(systemPrompt)

        if (result) {
          // Calculate total tokens from metrics (usage.input_tokens + usage.output_tokens)
          const totalTokens = result.metrics.reduce((sum, m) => {
            const input = m.usage?.input_tokens || 0
            const output = m.usage?.output_tokens || 0
            return sum + input + output
          }, 0)

          // Update metrics
          this.status.turns++
          this.status.tokens += totalTokens
          this.status.cost += result.totalCost || 0
          this.status.lastActivity = Date.now()

          // Track what was done - extract summary from last assistant message
          const lastMessage = result.messages[result.messages.length - 1]
          if (lastMessage && lastMessage.role === "assistant") {
            const content = typeof lastMessage.content === "string" ? lastMessage.content : ""
            const summary = content.slice(0, 100) + (content.length > 100 ? "..." : "")
            this.addRecentAction(summary)
          }

          this.logEvent("turn:end", {
            turn: this.status.turns,
            tokens: totalTokens,
            cost: result.totalCost,
          })

          this.emit("turn", result)
        }

        // Check if we should continue
        if (!this.shouldContinue()) {
          break
        }

        // Cooldown between turns
        if (this.config.turnCooldown) {
          await this.sleep(this.config.turnCooldown)
        }

        // Check for injected messages and add to conversation
        const injectedMessage = this.checkInjectedMessages()
        if (injectedMessage) {
          // Handle special commands
          const cmd = injectedMessage.toLowerCase().trim()

          // Runtime control commands (role:, model:, goal:, cooldown:)
          const runtimeCommands = this.handleRuntimeControl(injectedMessage)
          if (runtimeCommands.handled) {
            continue
          }

          if (cmd === "shutdown" || cmd === "stop" || cmd === "exit" || cmd === "quit") {
            console.log(`\x1b[33m[Daemon] Received graceful shutdown command - asking model to wrap up\x1b[0m`)
            this.logEvent("inject:shutdown", { message: injectedMessage })
            // Tell the model to finish up gracefully
            this.messages.push({
              role: "user",
              content: [{
                type: "text",
                text: `[HUMAN INPUT] Please wrap up your current work. Finish what you're doing, provide a brief summary of what you accomplished, and then stop. This is a graceful shutdown request.`
              }],
            })
            // Set flag to stop after this turn completes
            this.gracefulShutdownRequested = true
          } else if (cmd === "pause" || cmd === "wait") {
            console.log(`\x1b[33m[Daemon] Pausing for 60 seconds...\x1b[0m`)
            this.logEvent("inject:pause", { message: injectedMessage })
            await this.sleep(60000)
            continue
          } else if (cmd === "status" || cmd === "report") {
            // Inject a request for status report
            const statusMsg = `[HUMAN INPUT] Please provide a brief status report: what have you accomplished, what are you working on, and what's next?`
            this.messages.push({
              role: "user",
              content: [{ type: "text", text: statusMsg }],
            })
            this.logEvent("inject:status", { message: injectedMessage })
          } else {
            // Regular message - add to conversation
            console.log(`\x1b[33m[Daemon] Processing injected message: ${injectedMessage.slice(0, 50)}...\x1b[0m`)
            this.messages.push({
              role: "user",
              content: [{ type: "text", text: `[HUMAN INPUT] ${injectedMessage}` }],
            })
            this.logEvent("inject:processed", { message: injectedMessage.slice(0, 100) })
          }
        }

        this.saveStatus()

      } catch (error) {
        this.status.errors++
        this.logEvent("error", { error: String(error) })
        this.emit("error", error)

        // Never stop on errors - just log and continue
        // The daemon only stops on explicit shutdown (--daemon-stop or SIGTERM)
        // Wait before retrying to avoid rapid error loops
        await this.sleep(5000)
      }
    }

    // Only set completed if we're shutting down explicitly
    // (isShuttingDown is set by shutdown() which is called by --daemon-stop or signals)
    if (this.isShuttingDown) {
      this.updateStatus("shutdown")
    }

    // Generate and print session summary
    this.printSessionSummary()

    this.saveStatus()
    await this.shutdown()
  }

  /**
   * Run a single turn of the agent loop
   */
  private async runTurn(systemPrompt: string): Promise<AgentLoopResult | null> {
    const options: AgentLoopOptions = {
      apiKey: this.config.apiKey,
      model: this.config.model as any,
      systemPrompt,
      tools: this.config.tools || [],
      permissionMode: this.config.permissionMode as any,
      workingDirectory: this.config.workingDirectory,
      sessionId: this.sessionId,
      // Enable continuation for autonomous operation (no limit - daemon runs until stopped)
      continuation: {
        enabled: true,
        conditions: [],
        maxContinuations: 0, // 0 = unlimited
        defaultPrompt: this.getContinuationPrompt(),
        stuckPrompt: "You seem to be stuck. Try a different approach or report your current status.",
        stuckThreshold: 3,
        includeReasoning: true,
      },
      persistence: {
        enabled: true,
      },
      hookManager: this.config.hookManager,
      onText: (text) => {
        this.updateActivity("thinking")
        // Model is generating text/reasoning - attribute tokens to thinking
        this.pendingActivityToken = "thinking"
        this.emit("output", text)
      },
      onToolUse: (toolUse) => {
        // Track activity type based on tool
        const input = (toolUse.input || {}) as Record<string, unknown>
        const activity = this.getActivityFromTool(toolUse.name, input)
        this.updateActivity(activity)
        // Set pending activity for token attribution (next API call processes this tool)
        this.pendingActivityToken = activity

        // Track file activity
        this.trackFileActivity(toolUse.name, input)

        // Update current work description based on activity
        this.updateCurrentWork(activity, input)

        this.logEvent("tool:use", { tool: toolUse.name, input: toolUse.input })
        this.emit("tool", { tool: toolUse.name, input: toolUse.input })
      },
      onToolResult: (result) => {
        const success = result && result.result && !result.result.is_error
        this.logEvent("tool:result", { tool: result.id, success })
        this.emit("toolResult", { tool: result.id, result: result.result })
      },
      onMetrics: (metrics) => {
        // Track tokens and cost in real-time
        const inputTokens = metrics.usage?.input_tokens || 0
        const outputTokens = metrics.usage?.output_tokens || 0
        const totalTokens = inputTokens + outputTokens
        this.status.tokens += totalTokens
        this.status.cost += metrics.costUSD || 0
        this.status.turns++ // Each API call is a "turn"
        this.status.lastActivity = Date.now()

        // Attribute tokens to the activity that triggered this API call
        // (the activity that was happening before the thinking started)
        const activityForTokens = this.pendingActivityToken || this.status.currentActivity || "thinking"
        if (this.status.activityTokens) {
          this.status.activityTokens[activityForTokens] =
            (this.status.activityTokens[activityForTokens] || 0) + totalTokens
        }

        this.saveStatus() // Persist for observability
        this.logEvent("turn:end", {
          turn: this.status.turns,
          tokens: totalTokens,
          cost: metrics.costUSD,
          activity: activityForTokens,
        })
        this.emit("metrics", metrics)
      },
    }

    this.currentLoopPromise = agentLoop(this.messages, options)

    try {
      const result = await this.currentLoopPromise

      // Update messages for next turn
      if (result.messages) {
        this.messages = result.messages
      }

      return result
    } catch (error) {
      this.currentLoopPromise = null
      throw error
    }
  }

  /**
   * Build the role-based system prompt
   */
  private buildRolePrompt(): string {
    let prompt = ROLE_PROMPTS[this.config.role]

    if (this.config.role === "custom" && this.config.customRolePrompt) {
      prompt = prompt.replace("{customPrompt}", this.config.customRolePrompt)
    }

    prompt = prompt.replace("{jurisdiction}", this.config.jurisdiction)

    // Add daemon-specific context
    const daemonContext = `

## Daemon Context

You are running as a daemon with session ID: ${this.sessionId}
Working directory: ${this.config.workingDirectory}
Current turn: ${this.status.turns + 1}
Total cost so far: $${this.status.cost.toFixed(4)}

You are autonomous and should continue working until explicitly told to stop.
After completing a task, assess what else needs attention in your jurisdiction.`

    return prompt + daemonContext
  }

  /**
   * Get initial prompt to start the daemon
   */
  private getInitialPrompt(): string {
    return `Begin your role as ${this.config.role}. Assess the current state of your jurisdiction and start working on the most important task you find.`
  }

  /**
   * Get continuation prompt for when model ends without tools
   */
  private getContinuationPrompt(): string {
    const recentActions = this.status.recentActions.slice(-3).join("\n- ")

    return `You ended your turn without taking further action. As an autonomous daemon, you should continue working.

Recent actions:
- ${recentActions || "None yet"}

What's the next most important thing to work on in your jurisdiction? If you're truly done with everything, you can say "STATUS: COMPLETE" and explain why.`
  }

  /**
   * Get role description for lock
   */
  private getRoleDescription(): string {
    return `${this.config.role} daemon for ${this.config.jurisdiction}`
  }

  /**
   * Check if daemon should continue running
   */
  private shouldContinue(): boolean {
    // Stop on explicit shutdown signal
    if (this.isShuttingDown) {
      console.log(`\x1b[33m[Daemon] shouldContinue: isShuttingDown=true, stopping\x1b[0m`)
      return false
    }
    // Stop after graceful shutdown was requested and model finished
    if (this.gracefulShutdownRequested) {
      console.log(`\x1b[33m[Daemon] shouldContinue: gracefulShutdownRequested=true, stopping\x1b[0m`)
      return false
    }
    if (!this.isRunning) {
      console.log(`\x1b[33m[Daemon] shouldContinue: isRunning=false, stopping\x1b[0m`)
      return false
    }
    // Max turns is optional - 0 or undefined means unlimited
    // When set, it's a soft limit for planning, not a hard stop
    console.log(`\x1b[90m[Daemon] shouldContinue: continuing (turns=${this.status.turns})\x1b[0m`)
    return true
  }

  /**
   * Inject a message to guide/redirect the daemon
   * The message will be processed on the next turn
   */
  injectMessage(message: string): void {
    this.injectedMessages.push(message)
    this.logEvent("inject", { message: message.slice(0, 100) })
    console.log(`\x1b[36m[Daemon] Message injected: ${message.slice(0, 50)}...\x1b[0m`)
  }

  /**
   * Inject a message via file (for CLI use)
   * Writes to ~/.claude/daemon/inject/{sessionId}.txt
   */
  static injectToFile(sessionId: string, message: string): void {
    const injectDir = join(homedir(), ".claude", "daemon", "inject")
    if (!existsSync(injectDir)) {
      mkdirSync(injectDir, { recursive: true })
    }
    const injectFile = join(injectDir, `${sessionId}.txt`)
    // Append with timestamp
    const timestampedMessage = `[${new Date().toISOString()}] ${message}\n`
    appendFileSync(injectFile, timestampedMessage, "utf-8")
    console.log(`\x1b[32mMessage injected to daemon ${sessionId}\x1b[0m`)
  }

  /**
   * Check for injected messages from file
   */
  private checkInjectedMessages(): string | null {
    // First check in-memory queue
    if (this.injectedMessages.length > 0) {
      return this.injectedMessages.shift() || null
    }

    // Then check file
    if (existsSync(this.injectFilePath)) {
      try {
        const content = readFileSync(this.injectFilePath, "utf-8")
        // Clear the file after reading
        writeFileSync(this.injectFilePath, "", "utf-8")
        // Get the last non-empty line
        const lines = content.split("\n").filter((l) => l.trim())
        const lastLine = lines[lines.length - 1]
        if (lastLine) {
          // Extract message (remove timestamp prefix if present)
          const match = lastLine.match(/^\[[^\]]+\]\s*(.+)$/)
          return (match && match[1]) ? match[1] : lastLine
        }
      } catch {
        // Ignore read errors
      }
    }
    return null
  }

  /**
   * Handle runtime control commands (role:, model:, goal:, cooldown:)
   * Returns { handled: true } if command was processed, { handled: false } otherwise
   */
  private handleRuntimeControl(message: string): { handled: boolean } {
    const trimmed = message.trim()
    const lower = trimmed.toLowerCase()

    // role:<role> - Switch daemon role at runtime
    const roleMatch = lower.match(/^role:(maintainer|developer|reviewer|watcher|researcher|custom)$/)
    if (roleMatch) {
      const newRole = roleMatch[1] as DaemonRole
      const oldRole = this.config.role
      this.config.role = newRole
      this.status.role = newRole
      console.log(`\x1b[36m[Daemon] Role switched: ${oldRole} → ${newRole}\x1b[0m`)
      this.logEvent("runtime:role", { from: oldRole, to: newRole })

      // Inject guidance for new role
      this.messages.push({
        role: "user",
        content: [{ type: "text", text: `[RUNTIME CONTROL] Your role has been changed from "${oldRole}" to "${newRole}". Adjust your behavior accordingly. Continue with your current task but apply the new role's perspective and priorities.` }],
      })
      return { handled: true }
    }

    // model:<model> - Switch model at runtime (next turn uses new model)
    const modelMatch = trimmed.match(/^model:(.+)$/i)
    if (modelMatch && modelMatch[1]) {
      const newModel = modelMatch[1].trim()
      const oldModel = this.config.model || "unknown"
      // Only update if different and valid
      if (newModel && newModel !== oldModel) {
        this.config.model = newModel
        console.log(`\x1b[36m[Daemon] Model switched: ${oldModel} → ${newModel}\x1b[0m`)
        this.logEvent("runtime:model", { from: oldModel, to: newModel })
        // Note: Model change takes effect on next turn (config.model is read each turn)
      }
      return { handled: true }
    }

    // goal:<goal> - Update daemon goal
    const goalMatch = trimmed.match(/^goal:(.+)$/i)
    if (goalMatch && goalMatch[1]) {
      const newGoal = goalMatch[1].trim()
      const oldGoal = this.config.goal
      this.config.goal = newGoal
      console.log(`\x1b[36m[Daemon] Goal updated: ${newGoal}\x1b[0m`)
      this.logEvent("runtime:goal", { from: oldGoal, to: newGoal })

      this.messages.push({
        role: "user",
        content: [{ type: "text", text: `[RUNTIME CONTROL] Your goal has been updated to: "${newGoal}". Adjust your priorities accordingly.` }],
      })
      return { handled: true }
    }

    // cooldown:<ms> - Change turn cooldown
    const cooldownMatch = lower.match(/^cooldown:(\d+)$/)
    if (cooldownMatch && cooldownMatch[1]) {
      const newCooldown = parseInt(cooldownMatch[1], 10)
      const oldCooldown = this.config.turnCooldown || 0
      this.config.turnCooldown = newCooldown
      console.log(`\x1b[36m[Daemon] Cooldown changed: ${oldCooldown}ms → ${newCooldown}ms\x1b[0m`)
      this.logEvent("runtime:cooldown", { from: oldCooldown, to: newCooldown })
      return { handled: true }
    }

    // help - Show available commands
    if (lower === "help" || lower === "commands") {
      console.log(`\x1b[36m[Daemon] Available runtime commands:\x1b[0m`)
      console.log(`  role:<role>      - Switch role (maintainer|developer|reviewer|watcher|researcher|custom)`)
      console.log(`  model:<model>    - Switch model (e.g., model:claude-opus-4-6, model:glm-5)`)
      console.log(`  goal:<goal>      - Update goal (e.g., goal:fix all tests)`)
      console.log(`  cooldown:<ms>    - Change cooldown (e.g., cooldown:10000)`)
      console.log(`  shutdown/stop    - Graceful shutdown`)
      console.log(`  pause/wait       - Pause for 60 seconds`)
      console.log(`  status/report    - Request status report`)
      this.logEvent("runtime:help", {})
      return { handled: true }
    }

    return { handled: false }
  }

  /**
   * Update daemon status
   */
  private updateStatus(status: DaemonStatus["status"], task?: string): void {
    this.status.status = status
    this.status.lastActivity = Date.now()
    if (task) {
      this.status.currentTask = task
    }
  }

  /**
   * Update current activity for observability
   */
  private updateActivity(activity: ActivityType, details?: string): void {
    const now = Date.now()

    // Track time spent in previous activity
    const timeSpent = now - this.currentActivityStart
    if (this.status.activityTime && this.lastActivityType) {
      this.status.activityTime[this.lastActivityType] =
        (this.status.activityTime[this.lastActivityType] || 0) + timeSpent
    }

    // Update to new activity
    this.lastActivityType = activity
    this.currentActivityStart = now
    this.status.currentActivity = activity
    this.status.lastActivity = now
    if (details) {
      this.status.currentTask = details
    }
    // Save status so observers can see current activity
    this.saveStatus()
  }

  /**
   * Determine activity type from tool name and input
   */
  private getActivityFromTool(toolName: string, input: Record<string, unknown>): ActivityType {
    // Direct mapping
    if (TOOL_TO_ACTIVITY[toolName]) {
      return TOOL_TO_ACTIVITY[toolName]
    }

    // Analyze Bash commands for more specific activity
    if (toolName === "Bash") {
      const command = String(input.command || "").toLowerCase()

      // Git operations
      if (command.includes("git ")) {
        if (command.includes("commit")) return "committing"
        if (command.includes("push") || command.includes("pull")) return "committing"
        if (command.includes("branch") || command.includes("checkout")) return "committing"
        return "committing"
      }

      // Test operations
      if (command.includes("test") || command.includes("jest") || command.includes("vitest") || command.includes("bun test")) {
        return "testing"
      }

      // Delete operations
      if (command.includes("rm ") || command.includes("rmdir") || command.includes("unlink")) {
        return "deleting"
      }

      // Create operations
      if (command.includes("mkdir") || command.includes("touch ")) {
        return "creating"
      }

      // Default for bash
      return "executing"
    }

    return "thinking"
  }

  /**
   * Track file activity (read/modified)
   */
  private trackFileActivity(toolName: string, input: Record<string, unknown>): void {
    const filePath = String(input.file_path || input.path || "")

    if (!filePath) return

    // Track reads
    if (toolName === "Read" || toolName === "Glob" || toolName === "Grep" || toolName === "LSP") {
      if (!this.status.filesRead.includes(filePath)) {
        this.status.filesRead.push(filePath)
        // Keep only last 20 files
        if (this.status.filesRead.length > 20) {
          this.status.filesRead.shift()
        }
      }
    }

    // Track modifications
    if (toolName === "Write" || toolName === "Edit" || toolName === "MultiEdit") {
      if (!this.status.filesModified.includes(filePath)) {
        this.status.filesModified.push(filePath)
        // Keep only last 20 files
        if (this.status.filesModified.length > 20) {
          this.status.filesModified.shift()
        }
      }
    }
  }

  /**
   * Update current work description based on activity
   */
  private updateCurrentWork(activity: ActivityType, input: Record<string, unknown>): void {
    const filePath = String(input.file_path || input.path || "")
    const command = String(input.command || "")
    const description = String(input.description || "")

    switch (activity) {
      case "reading":
        this.status.currentWork = filePath ? `Reading ${this.shortenPath(filePath)}` : "Reading files"
        break
      case "editing":
        this.status.currentWork = filePath ? `Editing ${this.shortenPath(filePath)}` : "Editing files"
        break
      case "creating":
        this.status.currentWork = filePath ? `Creating ${this.shortenPath(filePath)}` : "Creating files"
        break
      case "searching":
        this.status.currentWork = description || command ? `Searching: ${(description || command).slice(0, 40)}` : "Searching codebase"
        break
      case "executing":
        this.status.currentWork = description ? description.slice(0, 50) : (command ? command.slice(0, 40) : "Running commands")
        break
      case "testing":
        this.status.currentWork = "Running tests"
        break
      case "committing":
        this.status.currentWork = "Git operations"
        break
      case "thinking":
        this.status.currentWork = "Analyzing and planning"
        break
      default:
        this.status.currentWork = activity
    }
  }

  /**
   * Shorten a file path for display
   */
  private shortenPath(path: string): string {
    const cwd = this.config.workingDirectory
    if (path.startsWith(cwd)) {
      return "." + path.slice(cwd.length)
    }
    // Show last 3 parts of path
    const parts = path.split("/")
    if (parts.length > 3) {
      return ".../" + parts.slice(-3).join("/")
    }
    return path
  }

  /**
   * Add a recent action to the log
   */
  private addRecentAction(action: string): void {
    this.status.recentActions.push(action)
    // Keep only last 20 actions
    if (this.status.recentActions.length > 20) {
      this.status.recentActions = this.status.recentActions.slice(-20)
    }
  }

  /**
   * Save status to file
   */
  private saveStatus(): void {
    if (this.config.enableStatus !== false) {
      writeFileSync(this.statusFilePath, JSON.stringify(this.status, null, 2))
    }
  }

  /**
   * Log an event to the JSONL file
   */
  private logEvent(type: string, data: Record<string, unknown>): void {
    const event = {
      type,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      data,
    }
    appendFileSync(this.logFilePath, JSON.stringify(event) + "\n")
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Generate a summary of the daemon session
   */
  private printSessionSummary(): void {
    const duration = Date.now() - this.status.startTime
    const durationSec = Math.floor(duration / 1000)
    const durationMin = Math.floor(duration / 60)

    console.log(`\n\x1b[36m${"=".repeat(50)}${"="}`)
    console.log(`\x1b[36m Daemon Session Summary`)
    console.log(`\x1b[36m${"=".repeat(50)}${"="}\n`)

    console.log(`  Session: ${this.sessionId}`)
    console.log(`  Role: ${this.config.role}`)
    console.log(`  Duration: ${durationMin}m ${durationSec}s`)
    console.log(`  Turns: ${this.status.turns}`)
    console.log(`  Tokens: ${this.status.tokens.toLocaleString()}`)
    console.log(`  Cost: $${this.status.cost.toFixed(4)}`)

    console.log(`\n  \x1b[33mFiles Modified:\x1b[0m`)
    const modifiedCount = this.status.filesModified.length
    if (modifiedCount > 0) {
      this.status.filesModified.forEach(f => {
        console.log(`    - ${this.shortenPath(f)}`)
      })
    } else {
      console.log(`    (none)`)
    }

    console.log(`\n  \x1b[34mFiles Read:\x1b[0m`)
    const readCount = this.status.filesRead.length
    if (readCount > 0) {
      // Show last 10 files read
      const recentRead = this.status.filesRead.slice(-10)
      recentRead.forEach(f => {
        console.log(`    - ${this.shortenPath(f)}`)
      })
    } else {
      console.log(`    (none)`)
    }

    console.log(`\n  \x1b[90mActivity Breakdown:\x1b[0m`)
    const activities = Object.entries(this.status.activityTime)
      .filter(([_, time]) => time > 0)
      .sort((a, b) => b[1] - a[1])

    activities.forEach(([activity, time]) => {
      const tokens = this.status.activityTokens[activity as ActivityType] || 0
      const percent = duration > 0 ? Math.round((time / duration) * 100) : 0
      const emoji = this.getActivityEmoji(activity as ActivityType)
      const paddedActivity = activity.padEnd(12, " ")
      console.log(`  ${emoji} ${paddedActivity} ${Math.floor(time / 1000)}s (${percent}%) | ${tokens.toLocaleString()} tokens`)
    })

    console.log(`\n  \x1b[33mKey Accomplishments:\x1b[0m`)
    const accomplishments = this.extractAccomplishments()
    if (accomplishments.length > 0) {
      accomplishments.forEach(a => console.log(`  - ${a}`))
    } else {
      console.log(`  (session ended before explicit accomplishments)`)
    }

    console.log(`\n\x1b[36m${"=".repeat(50)}${"="}\n`)
  }

  /**
   * Extract accomplishments from recent actions
   */
  private extractAccomplishments(): string[] {
    const accomplishments: string[] = []
    const actions = this.status.recentActions.filter(a => a.trim())

    for (const action of actions) {
      // Look for completion indicators
      if (action.includes("completed") || action.includes("fixed") || action.includes("added") || action.includes("updated") || action.includes("removed")) {
        accomplishments.push(action.slice(0, 100))
      }
    }

    // Also check files modified for concrete accomplishments
    if (this.status.filesModified.length > 0) {
      accomplishments.push(`Modified ${this.status.filesModified.length} file(s)`)
    }

    return Array.from(new Set(accomplishments))
  }

  /**
   * Get emoji for activity type
   */
  private getActivityEmoji(activity: ActivityType): string {
    const emojis: Record<ActivityType, string> = {
      starting: "🚀",
      reading: "📖",
      thinking: "🧠",
      editing: "✏️",
      creating: "📝",
      deleting: "🗑️",
      searching: "🔍",
      executing: "⚡",
      committing: "📦",
      testing: "🧪",
      waiting: "⏳",
      error: "❌",
      shutdown: "🛑",
    }
    return emojis[activity] || "❓"
  }

  /**
   * Shutdown the daemon
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) return
    this.isShuttingDown = true
    this.isRunning = false

    console.log(`\x1b[90m[Daemon] Shutting down...\x1b[0m`)

    // Update status
    this.updateStatus("shutdown")
    this.saveStatus()

    // Release lock
    if (this.singletonLock) {
      this.singletonLock.release()
    }

    this.emit("shutdown")
  }

  /**
   * Get current status
   */
  getStatus(): DaemonStatus {
    return { ...this.status }
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the daemon status for a directory
 */
export function getDaemonStatusForDirectory(directory: string): LockInfo | null {
  const { running, lockInfo } = SingletonLock.checkDirectory(directory)
  return running && lockInfo ? lockInfo : null
}

/**
 * List all running daemons
 */
export function listAllDaemons(): LockInfo[] {
  return SingletonLock.listAll()
}

/**
 * Stop daemon for a directory
 */
export async function stopDaemonForDirectory(directory: string): Promise<boolean> {
  const { running, lockInfo } = SingletonLock.checkDirectory(directory)
  if (!running || !lockInfo) return false

  const lockFile = SingletonLock.getLockFilePath(directory)
  await SingletonLock.stopDaemon(lockFile)
  return true
}

/**
 * Get the role definition for a daemon role
 */
export function getRoleDefinition(role: DaemonRole): RoleDefinition {
  return ROLE_DEFINITIONS[role]
}

/**
 * Get the skills for a specific role
 */
export function getRoleSkills(role: DaemonRole): {
  primary: DaemonSkill[]
  secondary: DaemonSkill[]
  restricted: DaemonSkill[]
} {
  const def = ROLE_DEFINITIONS[role]
  return {
    primary: def.primarySkills,
    secondary: def.secondarySkills || [],
    restricted: def.restrictedSkills || [],
  }
}

/**
 * List all available daemon roles with their skills
 */
export function listRoles(): Array<{
  role: DaemonRole
  primarySkills: DaemonSkill[]
  secondarySkills: DaemonSkill[]
  restrictedSkills: DaemonSkill[]
}> {
  return Object.entries(ROLE_DEFINITIONS).map(([role, def]) => ({
    role: role as DaemonRole,
    primarySkills: def.primarySkills,
    secondarySkills: def.secondarySkills || [],
    restrictedSkills: def.restrictedSkills || [],
  }))
}
