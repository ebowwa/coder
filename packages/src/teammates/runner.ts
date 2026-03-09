/**
 * TeammateModeRunner - Manages teammate mode lifecycle
 *
 * Responsibilities:
 * - Load team config from TeammateManager
 * - Poll for incoming messages from file-based inbox
 * - Inject messages into conversation via callback
 * - Report idle status to team
 * - Coordinate with task system
 */

import { TeammateManager, generateTeammateId } from "./index.js";
import type { Teammate, Team, TeammateMessage, TeammateStatus } from "../types/index.js";

// ============================================
// TYPES
// ============================================

export interface TeammateModeConfig {
  /** Team name to join */
  teamName: string;
  /** Agent ID (if resuming) */
  agentId?: string;
  /** Agent display name */
  agentName?: string;
  /** Agent color for UI */
  agentColor?: string;
  /** Prompt/instructions for this teammate */
  prompt?: string;
  /** Working directory */
  workingDirectory: string;
  /** Message injection callback */
  onMessage?: (message: TeammateMessage) => void;
  /** Idle callback */
  onIdle?: () => void;
  /** Polling interval in ms (default: 2000) */
  pollInterval?: number;
}

export interface TeammateModeState {
  /** Whether teammate mode is active */
  active: boolean;
  /** Current teammate instance */
  teammate: Teammate | null;
  /** Team instance */
  team: Team | null;
  /** Message polling timer */
  pollTimer: Timer | null;
  /** Last activity timestamp */
  lastActivity: number;
  /** Current status */
  status: TeammateStatus;
  /** Pending messages waiting to be processed */
  pendingMessages: TeammateMessage[];
}

// ============================================
// TEAMMATE MODE RUNNER
// ============================================

export class TeammateModeRunner {
  private manager: TeammateManager;
  private config: TeammateModeConfig;
  private state: TeammateModeState;
  private idleCheckTimer: Timer | null = null;
  private readonly IDLE_TIMEOUT = 60000; // 60 seconds of no activity = idle

  constructor(config: TeammateModeConfig) {
    this.config = config;
    this.manager = new TeammateManager();
    this.state = {
      active: false,
      teammate: null,
      team: null,
      pollTimer: null,
      lastActivity: Date.now(),
      status: "pending",
      pendingMessages: [],
    };
  }

  // ============================================
  // LIFECYCLE
  // ============================================

  /**
   * Start teammate mode
   * Creates or resumes teammate, joins team, starts polling
   */
  async start(): Promise<Teammate> {
    if (this.state.active) {
      throw new Error("Teammate mode already active");
    }

    // Load or create team
    let team = this.manager.getTeam(this.config.teamName);
    if (!team) {
      // Create team if it doesn't exist
      team = this.manager.createTeam({
        name: this.config.teamName,
        description: `Team ${this.config.teamName}`,
        teammates: [],
        taskListId: `${this.config.teamName}-tasks`,
        coordination: {
          dependencyOrder: [],
          communicationProtocol: "broadcast",
          taskAssignmentStrategy: "manual",
        },
      });
    }
    this.state.team = team;

    // Create or resume teammate
    let teammate: Teammate;
    if (this.config.agentId) {
      // Resume existing teammate
      const existing = this.manager.getTeammate(this.config.agentId);
      if (!existing) {
        throw new Error(`Teammate not found: ${this.config.agentId}`);
      }
      teammate = existing;
    } else {
      // Create new teammate
      teammate = {
        teammateId: this.config.agentId || generateTeammateId(),
        name: this.config.agentName || `agent-${Date.now().toString(36)}`,
        teamName: this.config.teamName,
        color: this.config.agentColor || "blue",
        prompt: this.config.prompt || "",
        planModeRequired: false,
        insideTmux: !!process.env.TMUX,
        status: "pending",
      };

      // Add to team
      this.manager.addTeammate(this.config.teamName, teammate);
    }

    this.state.teammate = teammate;
    this.state.active = true;
    this.state.status = "in_progress";
    this.state.lastActivity = Date.now();

    // Update status
    this.manager.updateTeammateStatus(teammate.teammateId, "in_progress");

    // Start message polling
    this.startPolling();

    // Start idle check
    this.startIdleCheck();

    return teammate;
  }

  /**
   * Stop teammate mode
   * Stops polling, updates status, cleans up
   */
  async stop(): Promise<void> {
    if (!this.state.active) return;

    // Stop polling
    this.stopPolling();
    this.stopIdleCheck();

    // Update status to idle
    if (this.state.teammate) {
      this.manager.updateTeammateStatus(this.state.teammate.teammateId, "idle");
    }

    // Persist team state
    if (this.state.team) {
      await this.manager.persistAllTeams();
    }

    this.state.active = false;
    this.state.status = "idle";
  }

  // ============================================
  // MESSAGE POLLING
  // ============================================

  private startPolling(): void {
    if (this.state.pollTimer) return;

    const interval = this.config.pollInterval || 2000;

    this.state.pollTimer = setInterval(() => {
      this.pollMessages();
    }, interval);

    // Also poll immediately
    this.pollMessages();
  }

  private stopPolling(): void {
    if (this.state.pollTimer) {
      clearInterval(this.state.pollTimer);
      this.state.pollTimer = null;
    }
  }

  private pollMessages(): void {
    if (!this.state.teammate) return;

    // Check for new messages
    const messages = this.manager.getMessages(this.state.teammate.teammateId);

    for (const message of messages) {
      // Track activity
      this.state.lastActivity = Date.now();

      // Add to pending
      this.state.pendingMessages.push(message);

      // Notify via callback
      if (this.config.onMessage) {
        this.config.onMessage(message);
      }
    }
  }

  /**
   * Get pending messages and clear queue
   */
  getPendingMessages(): TeammateMessage[] {
    const messages = [...this.state.pendingMessages];
    this.state.pendingMessages = [];
    return messages;
  }

  /**
   * Check if there are pending messages
   */
  hasPendingMessages(): boolean {
    return this.state.pendingMessages.length > 0;
  }

  /**
   * Peek at pending messages without clearing
   */
  peekPendingMessages(): TeammateMessage[] {
    return [...this.state.pendingMessages];
  }

  // ============================================
  // IDLE DETECTION
  // ============================================

  private startIdleCheck(): void {
    if (this.idleCheckTimer) return;

    this.idleCheckTimer = setInterval(() => {
      this.checkIdle();
    }, 10000); // Check every 10 seconds
  }

  private stopIdleCheck(): void {
    if (this.idleCheckTimer) {
      clearInterval(this.idleCheckTimer);
      this.idleCheckTimer = null;
    }
  }

  private checkIdle(): void {
    if (!this.state.teammate) return;

    const now = Date.now();
    const timeSinceActivity = now - this.state.lastActivity;

    if (timeSinceActivity > this.IDLE_TIMEOUT && this.state.status !== "idle") {
      // Transition to idle
      this.state.status = "idle";
      this.manager.updateTeammateStatus(this.state.teammate.teammateId, "idle");

      // Notify via callback
      if (this.config.onIdle) {
        this.config.onIdle();
      }
    }
  }

  /**
   * Report activity (resets idle timer)
   */
  reportActivity(): void {
    this.state.lastActivity = Date.now();

    if (this.state.status !== "in_progress" && this.state.teammate) {
      this.state.status = "in_progress";
      this.manager.updateTeammateStatus(this.state.teammate.teammateId, "in_progress");
    }
  }

  // ============================================
  // MESSAGING
  // ============================================

  /**
   * Send a direct message to another teammate
   */
  sendDirectMessage(toId: string, content: string): void {
    if (!this.state.teammate) {
      throw new Error("Teammate mode not active");
    }

    this.manager.sendDirect(toId, this.state.teammate.teammateId, content);
    this.reportActivity();
  }

  /**
   * Broadcast a message to all teammates
   */
  broadcast(content: string): void {
    if (!this.state.teammate) {
      throw new Error("Teammate mode not active");
    }

    this.manager.broadcast(this.config.teamName, content, this.state.teammate.teammateId);
    this.reportActivity();
  }

  /**
   * Inject a user message (for external integration)
   */
  injectUserMessage(content: string): void {
    if (!this.state.teammate) {
      throw new Error("Teammate mode not active");
    }

    this.manager.injectUserMessageToTeammate(this.state.teammate.teammateId, content);
  }

  // ============================================
  // STATUS & INFO
  // ============================================

  /**
   * Get current teammate info
   */
  getTeammate(): Teammate | null {
    return this.state.teammate;
  }

  /**
   * Get team info
   */
  getTeam(): Team | null {
    return this.state.team;
  }

  /**
   * Get current status
   */
  getStatus(): TeammateStatus {
    return this.state.status;
  }

  /**
   * Update status
   */
  updateStatus(status: TeammateStatus): void {
    this.state.status = status;
    if (this.state.teammate) {
      this.manager.updateTeammateStatus(this.state.teammate.teammateId, status);
    }
  }

  /**
   * Check if teammate mode is active
   */
  isActive(): boolean {
    return this.state.active;
  }

  /**
   * Get inbox statistics
   */
  getInboxStats(): { pending: number; processed: number } {
    if (!this.state.teammate) {
      return { pending: 0, processed: 0 };
    }
    return this.manager.getInboxStats(this.state.teammate.teammateId);
  }

  // ============================================
  // TEAM OPERATIONS
  // ============================================

  /**
   * Get all teammates in the team
   */
  getTeamMembers(): Teammate[] {
    if (!this.state.team) return [];
    return this.state.team.teammates;
  }

  /**
   * Wait for all teammates to become idle
   */
  async waitForTeamIdle(options?: { timeout?: number; pollInterval?: number }): Promise<{
    success: boolean;
    timedOut: boolean;
    statuses: Record<string, TeammateStatus>;
  }> {
    if (!this.state.team) {
      return { success: false, timedOut: false, statuses: {} };
    }

    return this.manager.waitForTeammatesToBecomeIdle(this.config.teamName, options);
  }

  // ============================================
  // TASK INTEGRATION
  // ============================================

  /**
   * Report task completion
   */
  reportTaskComplete(taskId: string, taskSubject: string): void {
    this.updateStatus("completed");
    this.broadcast(`Task completed: ${taskSubject} (${taskId})`);
  }

  /**
   * Report task failure
   */
  reportTaskFailed(taskId: string, taskSubject: string, error: string): void {
    this.updateStatus("failed");
    this.broadcast(`Task failed: ${taskSubject} (${taskId}) - ${error}`);
  }

  /**
   * Request task assignment
   */
  requestTask(): void {
    this.broadcast("Ready for task assignment");
    this.updateStatus("idle");
  }
}

// ============================================
// SINGLETON FOR GLOBAL ACCESS
// ============================================

let globalRunner: TeammateModeRunner | null = null;

/**
 * Get the global teammate mode runner (if active)
 */
export function getTeammateRunner(): TeammateModeRunner | null {
  return globalRunner;
}

/**
 * Set the global teammate mode runner
 */
export function setTeammateRunner(runner: TeammateModeRunner | null): void {
  globalRunner = runner;
}

/**
 * Check if teammate mode is globally active
 */
export function isTeammateModeActive(): boolean {
  return globalRunner !== null && globalRunner.isActive();
}
