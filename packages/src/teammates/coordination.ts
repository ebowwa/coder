/**
 * Coordination Callbacks - Inter-agent communication and progress reporting
 *
 * Features:
 * - Progress reporting callbacks
 * - File locking/claiming
 * - Status change notifications
 * - Heartbeat system
 */

import { TeammateManager } from "./index.js";
import type { Teammate, TeammateStatus, TeammateMessage } from "../types/index.js";
import { writeFileSync, existsSync, rmSync, readFileSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";

// ============================================
// TYPES
// ============================================

export type CoordinationEventType =
  | "progress"
  | "status_change"
  | "file_claim"
  | "file_release"
  | "heartbeat"
  | "task_start"
  | "task_progress"
  | "task_complete"
  | "task_failed"
  | "blocked"
  | "unblocked";

export interface CoordinationEvent {
  type: CoordinationEventType;
  teammateId: string;
  teammateName: string;
  teamName: string;
  timestamp: number;
  payload: Record<string, unknown>;
}

export interface ProgressReport {
  /** Current step description */
  step: string;
  /** Current step number */
  stepNumber: number;
  /** Total steps (if known) */
  totalSteps?: number;
  /** Percentage complete (0-100) */
  percentage?: number;
  /** Files being worked on */
  files?: string[];
  /** Any blockers encountered */
  blockers?: string[];
  /** ETA in seconds */
  eta?: number;
}

export interface FileClaim {
  /** File path being claimed */
  filePath: string;
  /** Teammate ID claiming the file */
  teammateId: string;
  /** Teammate name */
  teammateName: string;
  /** When the claim was made */
  claimedAt: number;
  /** Optional expiration time */
  expiresAt?: number;
  /** Reason for claim */
  reason?: string;
}

export type CoordinationCallback = (event: CoordinationEvent) => void;

export interface CoordinationConfig {
  /** Enable progress reporting */
  enableProgressReporting?: boolean;
  /** Enable file locking */
  enableFileLocking?: boolean;
  /** Enable heartbeat */
  enableHeartbeat?: boolean;
  /** Heartbeat interval in ms (default: 30000) */
  heartbeatInterval?: number;
  /** Callback for coordination events */
  onCoordinationEvent?: CoordinationCallback;
  /** Callback for status changes from other teammates */
  onStatusChange?: (teammateId: string, oldStatus: TeammateStatus, newStatus: TeammateStatus) => void;
  /** Callback when a teammate reports progress */
  onProgress?: (teammateId: string, progress: ProgressReport) => void;
  /** Callback when a file is claimed */
  onFileClaimed?: (claim: FileClaim) => void;
  /** Callback when a file is released */
  onFileReleased?: (filePath: string, teammateId: string) => void;
}

// ============================================
// COORDINATION MANAGER
// ============================================

export class CoordinationManager {
  private manager: TeammateManager;
  private storagePath: string;
  private claimsPath: string;
  private claims = new Map<string, FileClaim>();
  private heartbeatTimer: Timer | null = null;
  private config: CoordinationConfig;
  private teammateId: string | null = null;
  private teamName: string | null = null;

  constructor(manager: TeammateManager, config: CoordinationConfig = {}) {
    this.manager = manager;
    this.config = config;
    this.storagePath = join(process.env.HOME || "", ".claude", "teams");
    this.claimsPath = join(this.storagePath, "_coordination", "claims");
    this.ensureClaimsDirectory();
    this.loadExistingClaims();
  }

  private ensureClaimsDirectory(): void {
    if (!existsSync(this.claimsPath)) {
      mkdirSync(this.claimsPath, { recursive: true });
    }
  }

  private loadExistingClaims(): void {
    this.reloadClaims();
  }

  /**
   * Reload claims from disk - useful for synchronizing between instances
   */
  reloadClaims(): void {
    if (!existsSync(this.claimsPath)) return;

    // Clear current claims (we'll reload from disk)
    this.claims.clear();

    try {
      const files = readdirSync(this.claimsPath).filter(f => f.endsWith(".json"));

      for (const file of files) {
        try {
          const content = readFileSync(join(this.claimsPath, file), "utf-8");
          const claim = JSON.parse(content) as FileClaim;

          // Check if claim has expired
          if (claim.expiresAt && claim.expiresAt < Date.now()) {
            this.deleteClaimFile(claim.filePath);
            continue;
          }

          this.claims.set(this.normalizePath(claim.filePath), claim);
        } catch {
          // Skip malformed claim files
        }
      }
    } catch {
      // Directory may not exist
    }
  }

  private normalizePath(filePath: string): string {
    return filePath.replace(/\\/g, "/").toLowerCase();
  }

  private getClaimFilePath(filePath: string): string {
    const normalized = this.normalizePath(filePath);
    const hash = this.hashPath(normalized);
    return join(this.claimsPath, `${hash}.json`);
  }

  private hashPath(path: string): string {
    // Simple hash for file path
    let hash = 0;
    for (let i = 0; i < path.length; i++) {
      const char = path.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private deleteClaimFile(filePath: string): void {
    const claimPath = this.getClaimFilePath(filePath);
    if (existsSync(claimPath)) {
      rmSync(claimPath);
    }
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Initialize coordination for a teammate
   */
  initialize(teammateId: string, teamName: string): void {
    this.teammateId = teammateId;
    this.teamName = teamName;

    if (this.config.enableHeartbeat) {
      this.startHeartbeat();
    }
  }

  /**
   * Shutdown coordination
   */
  shutdown(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // Release all claims
    if (this.teammateId) {
      this.releaseAllClaims();
    }
  }

  // ============================================
  // HEARTBEAT
  // ============================================

  private startHeartbeat(): void {
    const interval = this.config.heartbeatInterval || 30000;

    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, interval);

    // Send initial heartbeat
    this.sendHeartbeat();
  }

  private sendHeartbeat(): void {
    if (!this.teammateId || !this.teamName) return;

    this.emitEvent({
      type: "heartbeat",
      teammateId: this.teammateId,
      teammateName: this.getTeammateName(),
      teamName: this.teamName,
      timestamp: Date.now(),
      payload: {},
    });
  }

  // ============================================
  // PROGRESS REPORTING
  // ============================================

  /**
   * Report progress to the team
   */
  reportProgress(progress: ProgressReport): void {
    if (!this.teammateId || !this.teamName) return;

    this.emitEvent({
      type: "task_progress",
      teammateId: this.teammateId,
      teammateName: this.getTeammateName(),
      teamName: this.teamName,
      timestamp: Date.now(),
      payload: { progress },
    });

    // Broadcast progress message to teammates
    this.manager.broadcast(
      this.teamName,
      `[PROGRESS] ${progress.step} (${progress.stepNumber}${progress.totalSteps ? `/${progress.totalSteps}` : ""})${progress.percentage ? ` - ${progress.percentage}%` : ""}`,
      this.teammateId
    );
  }

  /**
   * Report task start
   */
  reportTaskStart(taskId: string, taskDescription: string): void {
    if (!this.teammateId || !this.teamName) return;

    this.emitEvent({
      type: "task_start",
      teammateId: this.teammateId,
      teammateName: this.getTeammateName(),
      teamName: this.teamName,
      timestamp: Date.now(),
      payload: { taskId, taskDescription },
    });

    this.manager.broadcast(
      this.teamName,
      `[STARTED] ${taskDescription} (${taskId})`,
      this.teammateId
    );
  }

  /**
   * Report that you're blocked
   */
  reportBlocked(reason: string, blockedBy?: string): void {
    if (!this.teammateId || !this.teamName) return;

    this.emitEvent({
      type: "blocked",
      teammateId: this.teammateId,
      teammateName: this.getTeammateName(),
      teamName: this.teamName,
      timestamp: Date.now(),
      payload: { reason, blockedBy },
    });

    this.manager.broadcast(
      this.teamName,
      `[BLOCKED] ${reason}${blockedBy ? ` (waiting on: ${blockedBy})` : ""}`,
      this.teammateId
    );
  }

  /**
   * Report that you're unblocked
   */
  reportUnblocked(): void {
    if (!this.teammateId || !this.teamName) return;

    this.emitEvent({
      type: "unblocked",
      teammateId: this.teammateId,
      teammateName: this.getTeammateName(),
      teamName: this.teamName,
      timestamp: Date.now(),
      payload: {},
    });

    this.manager.broadcast(
      this.teamName,
      `[UNBLOCKED] Resuming work`,
      this.teammateId
    );
  }

  // ============================================
  // FILE LOCKING
  // ============================================

  /**
   * Check if a specific file is claimed on disk (by another teammate)
   */
  private checkClaimOnDisk(filePath: string): FileClaim | null {
    const claimPath = this.getClaimFilePath(filePath);
    if (!existsSync(claimPath)) return null;

    try {
      const content = readFileSync(claimPath, "utf-8");
      const claim = JSON.parse(content) as FileClaim;

      // Check if expired
      if (claim.expiresAt && claim.expiresAt < Date.now()) {
        this.deleteClaimFile(filePath);
        return null;
      }

      // Only return if it's claimed by someone else
      if (claim.teammateId !== this.teammateId) {
        return claim;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Claim exclusive access to a file
   */
  claimFile(filePath: string, reason?: string, expiresIn?: number): boolean {
    if (!this.config.enableFileLocking) return true;
    if (!this.teammateId) return false;

    const normalized = this.normalizePath(filePath);

    // Check in-memory claims first
    const existing = this.claims.get(normalized);

    // Check if already claimed by someone else in memory
    if (existing && existing.teammateId !== this.teammateId) {
      // Check if expired
      if (existing.expiresAt && existing.expiresAt < Date.now()) {
        this.claims.delete(normalized);
        this.deleteClaimFile(filePath);
      } else {
        return false; // Claimed by another
      }
    }

    // Also check on disk in case another process claimed it
    const diskClaim = this.checkClaimOnDisk(filePath);
    if (diskClaim) {
      // Update our memory with the disk claim
      this.claims.set(normalized, diskClaim);
      return false; // Claimed by another on disk
    }

    const claim: FileClaim = {
      filePath,
      teammateId: this.teammateId,
      teammateName: this.getTeammateName(),
      claimedAt: Date.now(),
      expiresAt: expiresIn ? Date.now() + expiresIn : undefined,
      reason,
    };

    this.claims.set(normalized, claim);

    // Persist claim
    const claimPath = this.getClaimFilePath(filePath);
    writeFileSync(claimPath, JSON.stringify(claim, null, 2));

    this.emitEvent({
      type: "file_claim",
      teammateId: this.teammateId,
      teammateName: this.getTeammateName(),
      teamName: this.teamName || "",
      timestamp: Date.now(),
      payload: { claim },
    });

    return true;
  }

  /**
   * Release a file claim
   */
  releaseFile(filePath: string): void {
    if (!this.teammateId) return;

    const normalized = this.normalizePath(filePath);
    const claim = this.claims.get(normalized);

    if (claim && claim.teammateId === this.teammateId) {
      this.claims.delete(normalized);
      this.deleteClaimFile(filePath);

      this.emitEvent({
        type: "file_release",
        teammateId: this.teammateId,
        teammateName: this.getTeammateName(),
        teamName: this.teamName || "",
        timestamp: Date.now(),
        payload: { filePath },
      });
    }
  }

  /**
   * Release all file claims for this teammate
   */
  releaseAllClaims(): void {
    if (!this.teammateId) return;

    const myClaims = Array.from(this.claims.entries())
      .filter(([_, claim]) => claim.teammateId === this.teammateId);

    for (const [normalized, _] of myClaims) {
      this.claims.delete(normalized);
    }

    // Clean up claim files on disk
    try {
      const files = readdirSync(this.claimsPath).filter(f => f.endsWith(".json"));

      for (const file of files) {
        try {
          const content = readFileSync(join(this.claimsPath, file), "utf-8");
          const claim = JSON.parse(content) as FileClaim;
          if (claim.teammateId === this.teammateId) {
            rmSync(join(this.claimsPath, file));
          }
        } catch {
          // Skip
        }
      }
    } catch {
      // Directory may not exist
    }
  }

  /**
   * Check if a file is claimed by another teammate
   */
  isFileClaimed(filePath: string): boolean {
    const normalized = this.normalizePath(filePath);

    // First check in-memory claims
    const claim = this.claims.get(normalized);

    if (claim) {
      // Check if expired
      if (claim.expiresAt && claim.expiresAt < Date.now()) {
        this.claims.delete(normalized);
        this.deleteClaimFile(filePath);
        return false;
      }

      // Return true only if claimed by someone else
      if (claim.teammateId !== this.teammateId) {
        return true;
      }
    }

    // Also check disk for claims by other processes
    const diskClaim = this.checkClaimOnDisk(filePath);
    if (diskClaim) {
      // Update memory with disk claim
      this.claims.set(normalized, diskClaim);
      return true;
    }

    return false;
  }

  /**
   * Get the claim on a file (if any)
   */
  getFileClaim(filePath: string): FileClaim | undefined {
    const normalized = this.normalizePath(filePath);
    const claim = this.claims.get(normalized);

    if (!claim) return undefined;

    // Check if expired
    if (claim.expiresAt && claim.expiresAt < Date.now()) {
      this.claims.delete(normalized);
      this.deleteClaimFile(filePath);
      return undefined;
    }

    return claim;
  }

  /**
   * Get all files claimed by a specific teammate
   */
  getTeammateClaims(teammateId: string): FileClaim[] {
    return Array.from(this.claims.values())
      .filter(claim => claim.teammateId === teammateId);
  }

  /**
   * Get all active claims
   */
  getAllClaims(): FileClaim[] {
    return Array.from(this.claims.values());
  }

  // ============================================
  // EVENT EMISSION
  // ============================================

  private emitEvent(event: CoordinationEvent): void {
    if (this.config.onCoordinationEvent) {
      this.config.onCoordinationEvent(event);
    }

    // Emit specific callbacks
    switch (event.type) {
      case "status_change":
        if (this.config.onStatusChange) {
          const { teammateId, oldStatus, newStatus } = event.payload as {
            teammateId: string;
            oldStatus: TeammateStatus;
            newStatus: TeammateStatus;
          };
          this.config.onStatusChange(teammateId, oldStatus, newStatus);
        }
        break;

      case "task_progress":
        if (this.config.onProgress) {
          const { progress } = event.payload as { progress: ProgressReport };
          this.config.onProgress(event.teammateId, progress);
        }
        break;

      case "file_claim":
        if (this.config.onFileClaimed) {
          const { claim } = event.payload as { claim: FileClaim };
          this.config.onFileClaimed(claim);
        }
        break;

      case "file_release":
        if (this.config.onFileReleased) {
          const { filePath } = event.payload as { filePath: string };
          this.config.onFileReleased(filePath, event.teammateId);
        }
        break;
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  private getTeammateName(): string {
    if (!this.teammateId) return "unknown";
    const teammate = this.manager.getTeammate(this.teammateId);
    return teammate?.name || this.teammateId;
  }
}

// ============================================
// COORDINATION HELPER FUNCTIONS
// ============================================

/**
 * Create a coordination-aware message
 */
export function createCoordinationMessage(
  type: CoordinationEventType,
  content: string
): string {
  return `[COORD:${type.toUpperCase()}] ${content}`;
}

/**
 * Parse a coordination message
 */
export function parseCoordinationMessage(message: string): {
  isCoordination: boolean;
  type?: CoordinationEventType;
  content?: string;
} {
  const match = message.match(/^\[COORD:([A-Z_]+)\]\s*(.*)$/);
  if (!match) {
    return { isCoordination: false };
  }

  const typeStr = match[1]!.toLowerCase() as CoordinationEventType;
  return {
    isCoordination: true,
    type: typeStr,
    content: match[2]!,
  };
}
