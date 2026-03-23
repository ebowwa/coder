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
  private singletonLock: SingletonLock | null = null
  private currentLoopPromise: Promise<AgentLoopResult> | null = null
  private messages: Message[] = []
  private statusFilePath: string
  private logFilePath: string

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

    // Ensure log directory exists
    const logDir = join(daemonDir, "logs")
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true })
    }

    // Initialize status
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
      continuation: {
        enabled: true,
        conditions: [],
        maxContinuations: 100,
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
        this.emit("output", text)
      },
      onToolUse: (toolUse) => {
        this.logEvent("tool:use", { tool: toolUse.name, input: toolUse.input })
        this.emit("tool", { tool: toolUse.name, input: toolUse.input })
      },
      onToolResult: (result) => {
        const success = result && result.result && !result.result.is_error
        this.logEvent("tool:result", { tool: result.id, success })
        this.emit("toolResult", { tool: result.id, result: result.result })
      },
      onMetrics: (metrics) => {
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
    // Only stop on explicit shutdown signal
    if (this.isShuttingDown) return false
    if (!this.isRunning) return false
    // Max turns is optional - 0 or undefined means unlimited
    // When set, it's a soft limit for planning, not a hard stop
    return true
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
