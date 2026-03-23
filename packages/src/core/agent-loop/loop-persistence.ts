/**
 * Loop Persistence - Persistence layer for LoopState
 *
 * Provides save/load capabilities for agent loop state to enable
 * long-running loops with resume capability.
 *
 * Storage format:
 * ~/.claude/loops/
 * ├── {sessionId}/
 * │   ├── state.json         # Current loop state
 * │   ├── manifest.json      # Metadata about the loop
 * │   └── checkpoints/
 * │       ├── cp_{turn}_{timestamp}.json
 * │       └── ...
 *
 * @module loop-persistence
 */

import { homedir } from "os";
import { join, dirname } from "path";
import { mkdir, readFile, writeFile, access, unlink, readdir as readdirCb } from "fs/promises";
import { existsSync } from "fs";
import type { Message, QueryMetrics, ToolUseBlock, CacheMetrics } from "../../schemas/index.js";
import type { LoopBehavior } from "../../ecosystem/presets/types.js";
import type { LoopStateOptions } from "./loop-state.js";
import {
  type PersistedLoopState,
  type LoopCheckpoint,
  type LoopManifest,
  type SerializationOptions,
  SERIALIZER_VERSION,
  generateCheckpointId,
  validatePersistedState,
  validateCheckpoint,
  pruneCheckpoints,
  createStateSummary,
} from "./loop-serializer.js";

// Re-export types for consumers
export type { PersistedLoopState, LoopCheckpoint, LoopManifest, SerializationOptions };

// ============================================
// TYPES
// ============================================

/**
 * Configuration for loop persistence
 */
export interface LoopPersistenceConfig {
  /** Enable persistence (default: true) */
  enabled: boolean;
  /** Auto-save interval in milliseconds (default: 30000 = 30s) */
  autoSaveInterval: number;
  /** Maximum checkpoints to keep (default: 10) */
  maxCheckpoints: number;
  /** Include file snapshots in checkpoints (default: false - expensive) */
  includeFileSnapshots: boolean;
  /** Storage directory (default: ~/.claude/loops/) */
  storageDir: string;
}

/**
 * Default persistence configuration
 */
export const DEFAULT_PERSISTENCE_CONFIG: LoopPersistenceConfig = {
  enabled: true,
  autoSaveInterval: 30000, // 30 seconds
  maxCheckpoints: 10,
  includeFileSnapshots: false,
  storageDir: join(homedir(), ".claude", "loops"),
};

/**
 * Result of loop recovery operation
 */
export interface LoopRecoveryResult {
  /** Whether recovery was successful */
  success: boolean;
  /** Recovered state (if successful) */
  state?: PersistedLoopState;
  /** Error message (if failed) */
  error?: string;
  /** Session ID of the recovered loop */
  sessionId: string;
}

// ============================================
// LOOP PERSISTENCE CLASS
// ============================================

/**
 * LoopPersistence provides persistence operations for agent loop state
 *
 * Usage:
 * ```typescript
 * const persistence = new LoopPersistence(config);
 *
 * // Start a new loop
 * await persistence.startLoop(sessionId, initialState);
 *
 * // Auto-save during loop execution
 * await persistence.save(sessionId, currentState);
 *
 * // Create checkpoint
 * const checkpoint = await persistence.createCheckpoint(sessionId, state, 'auto');
 *
 * // Resume interrupted loop
 * const recovered = await persistence.recoverLoop(sessionId);
 *
 * // End loop
 * await persistence.endLoop(sessionId, result);
 * ```
 */
export class LoopPersistence {
  private config: LoopPersistenceConfig;
  private lastSaveTime: Map<string, number> = new Map();
  private autoSaveTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config?: Partial<LoopPersistenceConfig>) {
    this.config = { ...DEFAULT_PERSISTENCE_CONFIG, ...config };
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Initialize the storage directory
   */
  async init(): Promise<void> {
    await this.ensureDir(this.config.storageDir);
  }

  /**
   * Get the storage directory path
   */
  getStorageDir(): string {
    return this.config.storageDir;
  }

  /**
   * Get the session-specific directory path
   */
  private getSessionDir(sessionId: string): string {
    return join(this.config.storageDir, sessionId);
  }

  /**
   * Get the state file path
   */
  private getStatePath(sessionId: string): string {
    return join(this.getSessionDir(sessionId), "state.json");
  }

  /**
   * Get the manifest file path
   */
  private getManifestPath(sessionId: string): string {
    return join(this.getSessionDir(sessionId), "manifest.json");
  }

  /**
   * Get the checkpoints directory path
   */
  private getCheckpointsDir(sessionId: string): string {
    return join(this.getSessionDir(sessionId), "checkpoints");
  }

  /**
   * Ensure a directory exists
   */
  private async ensureDir(dir: string): Promise<void> {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  /**
   * Save loop state to disk
   */
  async save(sessionId: string, state: PersistedLoopState): Promise<void> {
    if (!this.config.enabled) return;

    await this.init();
    const sessionDir = this.getSessionDir(sessionId);

    const statePath = this.getStatePath(sessionId);
    const data = JSON.stringify(state, null, 2);

    // Atomic write with auto-healing: write to temp file then rename
    const tempPath = `${statePath}.tmp`;

    const doSave = async (): Promise<void> => {
      await this.ensureDir(sessionDir);
      await writeFile(tempPath, data, "utf-8");
      await unlink(statePath).catch(() => {}); // Ignore if doesn't exist
      await this.renameFile(tempPath, statePath);
    };

    try {
      await doSave();
    } catch (error) {
      // Auto-heal: if ENOENT, directory might have been deleted - recreate and retry
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        await this.init(); // Recreate base directory
        await doSave();
      } else {
        throw error;
      }
    }

    // Update last save time
    this.lastSaveTime.set(sessionId, Date.now());

    // Update manifest
    await this.updateManifest(sessionId, {
      updatedAt: Date.now(),
      totalTurns: state.turnNumber,
      totalCost: state.totalCost,
      checkpointCount: state.checkpoints.length,
    });
  }

  /**
   * Load loop state from disk
   */
  async load(sessionId: string): Promise<PersistedLoopState | null> {
    if (!this.config.enabled) return null;

    const statePath = this.getStatePath(sessionId);

    try {
      const data = await readFile(statePath, "utf-8");
      const parsed = JSON.parse(data);

      if (!validatePersistedState(parsed)) {
        console.error(`Invalid persisted state for session ${sessionId}`);
        return null;
      }

      return parsed;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  /**
   * Check if auto-save should occur based on interval
   */
  shouldAutoSave(sessionId: string): boolean {
    if (!this.config.enabled) return false;

    const lastSave = this.lastSaveTime.get(sessionId) ?? 0;
    const elapsed = Date.now() - lastSave;

    return elapsed >= this.config.autoSaveInterval;
  }

  /**
   * Start auto-save timer for a session
   */
  startAutoSaveTimer(
    sessionId: string,
    getState: () => PersistedLoopState
  ): void {
    if (!this.config.enabled || this.autoSaveTimers.has(sessionId)) return;

    const timer = setInterval(async () => {
      try {
        const state = getState();
        await this.save(sessionId, state);
      } catch (error) {
        console.error(`Auto-save failed for ${sessionId}:`, error);
      }
    }, this.config.autoSaveInterval);

    this.autoSaveTimers.set(sessionId, timer);
  }

  /**
   * Stop auto-save timer for a session
   */
  stopAutoSaveTimer(sessionId: string): void {
    const timer = this.autoSaveTimers.get(sessionId);
    if (timer) {
      clearInterval(timer);
      this.autoSaveTimers.delete(sessionId);
    }
  }

  // ============================================
  // CHECKPOINTS
  // ============================================

  /**
   * Create a checkpoint
   */
  async createCheckpoint(
    sessionId: string,
    state: PersistedLoopState,
    type: "auto" | "manual" | "qc",
    summary: string = "",
    options?: SerializationOptions
  ): Promise<LoopCheckpoint> {
    await this.init();

    const checkpointsDir = this.getCheckpointsDir(sessionId);
    await this.ensureDir(checkpointsDir);

    const checkpoint: LoopCheckpoint = {
      id: generateCheckpointId(state.turnNumber),
      turnNumber: state.turnNumber,
      timestamp: Date.now(),
      type,
      summary: summary || `Checkpoint at turn ${state.turnNumber}`,
    };

    // Optionally include file snapshots
    if (options?.includeFileSnapshots ?? this.config.includeFileSnapshots) {
      // This would be implemented by the caller
      // checkpoint.fileSnapshots = await this.captureFileSnapshots();
    }

    // Save checkpoint
    const checkpointPath = join(checkpointsDir, `${checkpoint.id}.json`);
    await writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2), "utf-8");

    // Add to state checkpoints list
    const updatedState = {
      ...state,
      checkpoints: pruneCheckpoints(
        [...state.checkpoints, checkpoint],
        options?.maxCheckpoints ?? this.config.maxCheckpoints
      ),
    };

    // Save updated state
    await this.save(sessionId, updatedState);

    return checkpoint;
  }

  /**
   * List all checkpoints for a session
   */
  async listCheckpoints(sessionId: string): Promise<LoopCheckpoint[]> {
    const state = await this.load(sessionId);
    return state?.checkpoints ?? [];
  }

  /**
   * Load state from a specific checkpoint
   */
  async loadCheckpoint(
    sessionId: string,
    checkpointId: string
  ): Promise<PersistedLoopState | null> {
    const state = await this.load(sessionId);
    if (!state) return null;

    // Find the checkpoint
    const checkpoint = state.checkpoints.find(cp => cp.id === checkpointId);
    if (!checkpoint) {
      return null;
    }

    // Return state as it was at that checkpoint
    // For now, we return the current state - in the future we could
    // store full state snapshots per checkpoint
    return state;
  }

  /**
   * Delete a checkpoint
   */
  async deleteCheckpoint(
    sessionId: string,
    checkpointId: string
  ): Promise<boolean> {
    const state = await this.load(sessionId);
    if (!state) return false;

    const index = state.checkpoints.findIndex(cp => cp.id === checkpointId);
    if (index === -1) return false;

    // Remove from array
    state.checkpoints.splice(index, 1);

    // Delete checkpoint file
    const checkpointPath = join(
      this.getCheckpointsDir(sessionId),
      `${checkpointId}.json`
    );
    await unlink(checkpointPath).catch(() => {});

    // Save updated state
    await this.save(sessionId, state);

    return true;
  }

  // ============================================
  // LIFECYCLE
  // ============================================

  /**
   * Start a new loop - create initial state and manifest
   */
  async startLoop(
    sessionId: string,
    initialState: PersistedLoopState,
    metadata?: {
      workingDirectory?: string;
      model?: string;
    }
  ): Promise<void> {
    await this.init();

    const sessionDir = this.getSessionDir(sessionId);
    await this.ensureDir(sessionDir);
    await this.ensureDir(this.getCheckpointsDir(sessionId));

    // Save initial state
    await this.save(sessionId, initialState);

    // Create manifest
    const manifest: LoopManifest = {
      sessionId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      interrupted: false,
      templateName: initialState.templateName,
      totalTurns: 0,
      totalCost: 0,
      checkpointCount: 0,
      workingDirectory: metadata?.workingDirectory ?? process.cwd(),
      model: metadata?.model ?? "unknown",
    };

    await this.saveManifest(sessionId, manifest);
  }

  /**
   * End a loop - mark as completed
   */
  async endLoop(
    sessionId: string,
    result?: {
      endReason?: string;
    }
  ): Promise<void> {
    const state = await this.load(sessionId);
    if (!state) return;

    // Update state
    const finalState: PersistedLoopState = {
      ...state,
      interrupted: false,
      endedAt: Date.now(),
      endReason: result?.endReason,
    };

    await this.save(sessionId, finalState);

    // Update manifest
    await this.updateManifest(sessionId, {
      endedAt: Date.now(),
      interrupted: false,
      totalTurns: state.turnNumber,
      totalCost: state.totalCost,
      checkpointCount: state.checkpoints.length,
    });

    // Stop auto-save timer
    this.stopAutoSaveTimer(sessionId);
  }

  // ============================================
  // RECOVERY
  // ============================================

  /**
   * Find all interrupted loops (loops without endedAt)
   */
  async findInterruptedLoops(): Promise<string[]> {
    await this.init();

    const sessionDirs = await this.listDirectories(this.config.storageDir);
    const interrupted: string[] = [];

    for (const sessionId of sessionDirs) {
      const manifest = await this.loadManifest(sessionId);
      if (manifest?.interrupted && !manifest.endedAt) {
        interrupted.push(sessionId);
      }
    }

    return interrupted;
  }

  /**
   * Recover an interrupted loop
   */
  async recoverLoop(sessionId: string): Promise<LoopRecoveryResult> {
    const state = await this.load(sessionId);

    if (!state) {
      return {
        success: false,
        error: "No saved state found",
        sessionId,
      };
    }

    return {
      success: true,
      state,
      sessionId,
    };
  }

  /**
   * Get the most recent interrupted loop
   */
  async getMostRecentInterruptedLoop(): Promise<string | null> {
    const interrupted = await this.findInterruptedLoops();

    if (interrupted.length === 0) {
      return null;
    }

    // Find the most recent by updatedAt
    let mostRecent: string | null = null;
    let mostRecentTime = 0;

    for (const sessionId of interrupted) {
      const manifest = await this.loadManifest(sessionId);
      if (manifest && manifest.updatedAt > mostRecentTime) {
        mostRecentTime = manifest.updatedAt;
        mostRecent = sessionId;
      }
    }

    return mostRecent;
  }

  // ============================================
  // CLEANUP
  // ============================================

  /**
   * Prune old loops based on age
   */
  async pruneOldLoops(maxAge: number): Promise<number> {
    await this.init();

    const sessionDirs = await this.listDirectories(this.config.storageDir);
    const cutoff = Date.now() - maxAge;
    let deleted = 0;

    for (const sessionId of sessionDirs) {
      const manifest = await this.loadManifest(sessionId);

      // Only delete completed loops that are older than maxAge
      if (manifest && manifest.endedAt && manifest.endedAt < cutoff) {
        await this.deleteLoop(sessionId);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Delete a loop entirely
   */
  async deleteLoop(sessionId: string): Promise<boolean> {
    const sessionDir = this.getSessionDir(sessionId);

    try {
      await this.deleteDirectory(sessionDir);
      return true;
    } catch {
      return false;
    }
  }

  // ============================================
  // MANIFEST MANAGEMENT
  // ============================================

  /**
   * Save manifest file
   */
  private async saveManifest(
    sessionId: string,
    manifest: LoopManifest
  ): Promise<void> {
    const manifestPath = this.getManifestPath(sessionId);
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  }

  /**
   * Load manifest file
   */
  async loadManifest(sessionId: string): Promise<LoopManifest | null> {
    const manifestPath = this.getManifestPath(sessionId);

    try {
      const data = await readFile(manifestPath, "utf-8");
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * Update manifest with partial data
   */
  private async updateManifest(
    sessionId: string,
    updates: Partial<LoopManifest>
  ): Promise<void> {
    const manifest = await this.loadManifest(sessionId);
    if (!manifest) return;

    const updated = { ...manifest, ...updates };
    await this.saveManifest(sessionId, updated);
  }

  // ============================================
  // UTILITY
  // ============================================

  /**
   * Check if a loop exists
   */
  async exists(sessionId: string): Promise<boolean> {
    const statePath = this.getStatePath(sessionId);
    try {
      await access(statePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get summary of a persisted loop
   */
  async getSummary(sessionId: string): Promise<ReturnType<typeof createStateSummary> | null> {
    const state = await this.load(sessionId);
    if (!state) return null;

    return createStateSummary(state);
  }

  /**
   * Rename file (cross-platform helper)
   */
  private async renameFile(oldPath: string, newPath: string): Promise<void> {
    // Bun's file system doesn't have rename, use fs
    const { rename } = await import("fs/promises");
    await rename(oldPath, newPath);
  }

  /**
   * List directories in a path
   */
  private async listDirectories(dir: string): Promise<string[]> {
    try {
      const entries = await readdirCb(dir, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
    } catch {
      return [];
    }
  }

  /**
   * Delete a directory recursively
   */
  private async deleteDirectory(dir: string): Promise<void> {
    const { rm } = await import("fs/promises");
    await rm(dir, { recursive: true });
  }
}

// Default export
export default LoopPersistence;
