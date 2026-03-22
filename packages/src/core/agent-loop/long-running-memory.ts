/**
 * Long-Running Memory System - Persistent memory for days/weeks of autonomous work
 *
 * This system provides:
 * - Decision tracking with reasoning
 * - Discovery/findings persistence
 * - Goal evolution over time
 * - Verification history for regression detection
 *
 * @module long-running-memory
 */

import { homedir } from "os";
import { join, dirname } from "path";
import { mkdir, readFile, writeFile, access, readdir as readdirCb } from "fs/promises";
import { existsSync } from "fs";

// ============================================
// TYPES
// ============================================

/**
 * A key decision made during the loop
 */
export interface Decision {
  /** Unique ID */
  id: string;
  /** Timestamp when decision was made */
  timestamp: number;
  /** The decision made */
  decision: string;
  /** Why this decision was made */
  reasoning: string;
  /** Alternatives considered */
  alternatives?: string[];
  /** Context at time of decision */
  context?: string;
  /** Turn number when made */
  turnNumber: number;
  /** Whether this decision was later revised */
  revised?: boolean;
  /** ID of decision that replaced this (if revised) */
  revisedBy?: string;
}

/**
 * A discovery or finding during work
 */
export interface Discovery {
  /** Unique ID */
  id: string;
  /** Timestamp */
  timestamp: number;
  /** What was discovered */
  finding: string;
  /** Category of discovery */
  category: "architecture" | "bug" | "optimization" | "pattern" | "dependency" | "config" | "other";
  /** Importance level */
  importance: "critical" | "high" | "medium" | "low";
  /** Related file paths */
  relatedFiles?: string[];
  /** Turn number when discovered */
  turnNumber: number;
  /** Whether this discovery was acted upon */
  actedUpon?: boolean;
}

/**
 * A goal state snapshot
 */
export interface GoalSnapshot {
  /** Unique ID */
  id: string;
  /** Timestamp */
  timestamp: number;
  /** The goal at this point */
  goal: string;
  /** Goal type */
  type: "original" | "refined" | "subtask" | "recovery" | "milestone";
  /** Turn number */
  turnNumber: number;
  /** Progress toward this goal (0-100) */
  progress?: number;
  /** Whether this goal was completed */
  completed?: boolean;
  /** What triggered this goal */
  trigger?: string;
}

/**
 * Verification result from tests/lint/build
 */
export interface VerificationResult {
  /** Unique ID */
  id: string;
  /** Timestamp */
  timestamp: number;
  /** Type of verification */
  type: "test" | "lint" | "build" | "typecheck" | "custom";
  /** Whether verification passed */
  passed: boolean;
  /** Summary of results */
  summary: string;
  /** Details (e.g., failing tests) */
  details?: string[];
  /** Turn number */
  turnNumber: number;
  /** Files affected */
  filesAffected?: string[];
}

/**
 * Milestone checkpoint
 */
export interface MilestoneCheckpoint {
  /** Unique ID */
  id: string;
  /** Timestamp */
  timestamp: number;
  /** Milestone type */
  type: "commit" | "test_pass" | "feature_complete" | "error_resolved" | "goal_complete" | "manual";
  /** Description */
  description: string;
  /** Turn number */
  turnNumber: number;
  /** Files changed at this milestone */
  filesChanged?: string[];
  /** Goal at this milestone */
  goal?: string;
  /** Whether this is a recovery point */
  isRecoveryPoint: boolean;
}

/**
 * Complete long-running memory state
 */
export interface LongRunningMemory {
  /** Session ID */
  sessionId: string;
  /** When memory was created */
  createdAt: number;
  /** When memory was last updated */
  updatedAt: number;
  /** Original goal */
  originalGoal: string;
  /** Current goal */
  currentGoal: string;
  /** All decisions made */
  decisions: Decision[];
  /** All discoveries */
  discoveries: Discovery[];
  /** Goal evolution */
  goalHistory: GoalSnapshot[];
  /** Verification history */
  verifications: VerificationResult[];
  /** Milestone checkpoints */
  milestones: MilestoneCheckpoint[];
  /** Summary for context injection */
  summary: string;
  /** Total turns completed */
  totalTurns: number;
  /** Total cost so far */
  totalCost: number;
}

/**
 * Configuration for long-running memory
 */
export interface LongRunningMemoryConfig {
  /** Storage directory */
  storageDir: string;
  /** Maximum decisions to keep */
  maxDecisions: number;
  /** Maximum discoveries to keep */
  maxDiscoveries: number;
  /** Maximum verifications to keep */
  maxVerifications: number;
  /** Maximum milestones to keep */
  maxMilestones: number;
}

/**
 * Default configuration
 */
export const DEFAULT_LONG_RUNNING_CONFIG: LongRunningMemoryConfig = {
  storageDir: join(homedir(), ".claude", "loops"),
  maxDecisions: 100,
  maxDiscoveries: 50,
  maxVerifications: 20,
  maxMilestones: 50,
};

// ============================================
// LONG-RUNNING MEMORY MANAGER
// ============================================

/**
 * Manages long-term memory for autonomous loops
 */
export class LongRunningMemoryManager {
  private config: LongRunningMemoryConfig;
  private memory: Map<string, LongRunningMemory> = new Map();

  constructor(config: Partial<LongRunningMemoryConfig> = {}) {
    this.config = { ...DEFAULT_LONG_RUNNING_CONFIG, ...config };
  }

  /**
   * Initialize or load memory for a session
   */
  async initialize(
    sessionId: string,
    originalGoal: string
  ): Promise<LongRunningMemory> {
    // Try to load existing
    const existing = await this.load(sessionId);
    if (existing) {
      return existing;
    }

    // Create new
    const memory: LongRunningMemory = {
      sessionId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      originalGoal,
      currentGoal: originalGoal,
      decisions: [],
      discoveries: [],
      goalHistory: [{
        id: `goal_${Date.now()}`,
        timestamp: Date.now(),
        goal: originalGoal,
        type: "original",
        turnNumber: 0,
        progress: 0,
      }],
      verifications: [],
      milestones: [],
      summary: `Started: ${originalGoal}`,
      totalTurns: 0,
      totalCost: 0,
    };

    await this.save(sessionId, memory);
    this.memory.set(sessionId, memory);
    return memory;
  }

  /**
   * Record a decision
   */
  async recordDecision(
    sessionId: string,
    decision: Omit<Decision, "id" | "timestamp">
  ): Promise<void> {
    const memory = await this.getOrCreate(sessionId);

    const newDecision: Decision = {
      ...decision,
      id: `dec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    };

    memory.decisions.push(newDecision);
    memory.updatedAt = Date.now();

    // Prune if needed
    if (memory.decisions.length > this.config.maxDecisions) {
      // Keep most recent and most important (those not revised)
      memory.decisions = memory.decisions
        .filter(d => !d.revised)
        .slice(-this.config.maxDecisions);
    }

    await this.save(sessionId, memory);
  }

  /**
   * Record a discovery
   */
  async recordDiscovery(
    sessionId: string,
    discovery: Omit<Discovery, "id" | "timestamp">
  ): Promise<void> {
    const memory = await this.getOrCreate(sessionId);

    const newDiscovery: Discovery = {
      ...discovery,
      id: `disc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    };

    memory.discoveries.push(newDiscovery);
    memory.updatedAt = Date.now();

    // Prune by importance
    if (memory.discoveries.length > this.config.maxDiscoveries) {
      const importanceOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      memory.discoveries.sort((a, b) =>
        importanceOrder[a.importance] - importanceOrder[b.importance] ||
        b.timestamp - a.timestamp
      );
      memory.discoveries = memory.discoveries.slice(0, this.config.maxDiscoveries);
    }

    await this.save(sessionId, memory);
  }

  /**
   * Update goal
   */
  async updateGoal(
    sessionId: string,
    newGoal: string,
    type: GoalSnapshot["type"],
    trigger?: string
  ): Promise<void> {
    const memory = await this.getOrCreate(sessionId);

    const snapshot: GoalSnapshot = {
      id: `goal_${Date.now()}`,
      timestamp: Date.now(),
      goal: newGoal,
      type,
      turnNumber: memory.totalTurns,
      trigger,
    };

    memory.goalHistory.push(snapshot);
    memory.currentGoal = newGoal;
    memory.updatedAt = Date.now();

    await this.save(sessionId, memory);
  }

  /**
   * Record verification result
   */
  async recordVerification(
    sessionId: string,
    result: Omit<VerificationResult, "id" | "timestamp">
  ): Promise<void> {
    const memory = await this.getOrCreate(sessionId);

    const verification: VerificationResult = {
      ...result,
      id: `ver_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    };

    memory.verifications.push(verification);
    memory.updatedAt = Date.now();

    // Prune
    if (memory.verifications.length > this.config.maxVerifications) {
      memory.verifications = memory.verifications.slice(-this.config.maxVerifications);
    }

    await this.save(sessionId, memory);
  }

  /**
   * Record a milestone
   */
  async recordMilestone(
    sessionId: string,
    milestone: Omit<MilestoneCheckpoint, "id" | "timestamp" | "isRecoveryPoint">
  ): Promise<void> {
    const memory = await this.getOrCreate(sessionId);

    const checkpoint: MilestoneCheckpoint = {
      ...milestone,
      id: `mile_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      isRecoveryPoint: milestone.type === "commit" || milestone.type === "feature_complete",
    };

    memory.milestones.push(checkpoint);
    memory.updatedAt = Date.now();

    // Prune but keep recovery points
    if (memory.milestones.length > this.config.maxMilestones) {
      const recoveryPoints = memory.milestones.filter(m => m.isRecoveryPoint);
      const nonRecovery = memory.milestones.filter(m => !m.isRecoveryPoint);

      // Keep all recovery points + recent non-recovery
      memory.milestones = [
        ...recoveryPoints,
        ...nonRecovery.slice(-(this.config.maxMilestones - recoveryPoints.length)),
      ];
    }

    await this.save(sessionId, memory);
  }

  /**
   * Update turn counter and cost
   */
  async updateProgress(sessionId: string, turns: number, cost: number): Promise<void> {
    const memory = await this.getOrCreate(sessionId);
    memory.totalTurns = turns;
    memory.totalCost = cost;
    memory.updatedAt = Date.now();
    await this.save(sessionId, memory);
  }

  /**
   * Generate context summary for injection
   */
  generateContextSummary(sessionId: string): string {
    const memory = this.memory.get(sessionId);
    if (!memory) return "";

    const lines: string[] = [];

    // Original goal
    lines.push(`## Original Goal`);
    lines.push(memory.originalGoal);
    lines.push("");

    // Current state
    lines.push(`## Current State`);
    lines.push(`- Working for: ${this.formatDuration(Date.now() - memory.createdAt)}`);
    lines.push(`- Turns completed: ${memory.totalTurns}`);
    lines.push(`- Cost so far: $${memory.totalCost.toFixed(4)}`);
    lines.push("");

    // Current goal
    if (memory.currentGoal !== memory.originalGoal) {
      lines.push(`## Current Goal`);
      lines.push(memory.currentGoal);
      lines.push("");
    }

    // Recent decisions
    const recentDecisions = memory.decisions.slice(-5);
    if (recentDecisions.length > 0) {
      lines.push(`## Recent Decisions`);
      for (const d of recentDecisions) {
        lines.push(`- [Turn ${d.turnNumber}] ${d.decision}`);
        if (d.reasoning) {
          lines.push(`  Reason: ${d.reasoning}`);
        }
      }
      lines.push("");
    }

    // Key discoveries
    const keyDiscoveries = memory.discoveries
      .filter(d => d.importance === "critical" || d.importance === "high")
      .slice(-5);
    if (keyDiscoveries.length > 0) {
      lines.push(`## Key Discoveries`);
      for (const d of keyDiscoveries) {
        lines.push(`- [${d.importance}] ${d.finding}`);
      }
      lines.push("");
    }

    // Milestones
    const recentMilestones = memory.milestones.slice(-3);
    if (recentMilestones.length > 0) {
      lines.push(`## Recent Milestones`);
      for (const m of recentMilestones) {
        lines.push(`- [${m.type}] ${m.description}`);
      }
      lines.push("");
    }

    // Last verification
    const lastVerification = memory.verifications[memory.verifications.length - 1];
    if (lastVerification) {
      lines.push(`## Last Verification`);
      lines.push(`- Type: ${lastVerification.type}`);
      lines.push(`- Result: ${lastVerification.passed ? "PASSED" : "FAILED"}`);
      lines.push(`- ${lastVerification.summary}`);
      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * Get recovery context for auto-resume
   */
  getRecoveryContext(sessionId: string): string {
    const memory = this.memory.get(sessionId);
    if (!memory) return "";

    // Find last recovery point milestone
    const lastRecovery = [...memory.milestones]
      .reverse()
      .find(m => m.isRecoveryPoint);

    const lines: string[] = [];

    lines.push(`You are resuming a long-running autonomous session.`);
    lines.push("");
    lines.push(`**Session Duration**: ${this.formatDuration(Date.now() - memory.createdAt)}`);
    lines.push(`**Turns Completed**: ${memory.totalTurns}`);
    lines.push(`**Cost So Far**: $${memory.totalCost.toFixed(4)}`);
    lines.push("");
    lines.push(`**Original Goal**: ${memory.originalGoal}`);
    lines.push("");

    if (memory.currentGoal !== memory.originalGoal) {
      lines.push(`**Current Goal**: ${memory.currentGoal}`);
      lines.push("");
    }

    if (lastRecovery) {
      const timeSince = this.formatDuration(Date.now() - lastRecovery.timestamp);
      lines.push(`**Last Milestone** (${timeSince} ago):`);
      lines.push(`- Type: ${lastRecovery.type}`);
      lines.push(`- ${lastRecovery.description}`);
      if (lastRecovery.goal) {
        lines.push(`- Goal at that point: ${lastRecovery.goal}`);
      }
      lines.push("");
    }

    // Include recent decisions for context
    const recentDecisions = memory.decisions.slice(-3);
    if (recentDecisions.length > 0) {
      lines.push(`**Recent Decisions**:`);
      for (const d of recentDecisions) {
        lines.push(`- ${d.decision} (because: ${d.reasoning})`);
      }
      lines.push("");
    }

    lines.push(`Continue working toward the goal. Use actual commands to verify progress.`);

    return lines.join("\n");
  }

  /**
   * Get memory for session
   */
  getMemory(sessionId: string): LongRunningMemory | undefined {
    return this.memory.get(sessionId);
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private async getOrCreate(sessionId: string): Promise<LongRunningMemory> {
    let memory = this.memory.get(sessionId);
    if (!memory) {
      memory = await this.load(sessionId);
      if (!memory) {
        throw new Error(`Memory not initialized for session ${sessionId}`);
      }
      this.memory.set(sessionId, memory);
    }
    return memory;
  }

  private async load(sessionId: string): Promise<LongRunningMemory | undefined> {
    const filePath = join(this.config.storageDir, sessionId, "memory", "state.json");
    try {
      await access(filePath);
      const content = await readFile(filePath, "utf-8");
      return JSON.parse(content) as LongRunningMemory;
    } catch {
      return undefined;
    }
  }

  private async save(sessionId: string, memory: LongRunningMemory): Promise<void> {
    const dir = join(this.config.storageDir, sessionId, "memory");
    const filePath = join(dir, "state.json");

    await mkdir(dir, { recursive: true });
    await writeFile(filePath, JSON.stringify(memory, null, 2), "utf-8");
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m`;
    }
    return `${seconds}s`;
  }
}

// Types are already exported at their declaration sites
