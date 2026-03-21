/**
 * Task Sync - Bidirectional sync between Teammate tasks and WASM Todo Engine
 *
 * This module provides:
 * - Sync teammate.tasks[] to TodoItem[] on spawn
 * - Sync TodoItem[] back to teammate.tasks[] on shutdown
 * - Track task completion status
 * - Support for task priority inference
 *
 * @module @ebowwa/coder/teammates/task-sync
 */

import type { Teammate, TeammateStatus, TodoItem, TodoPriority, TodoStatus } from "../schemas/index.js";

// ============================================
// TYPES
// ============================================

/**
 * Sync result for a single teammate
 */
export interface TeammateSyncResult {
  /** Teammate ID */
  teammateId: string;
  /** Number of tasks synced to todo engine */
  syncedToEngine: number;
  /** Number of tasks synced from engine */
  syncedFromEngine: number;
  /** Errors during sync */
  errors: string[];
}

/**
 * Sync options
 */
export interface TaskSyncOptions {
  /** Overwrite existing tasks (default: false, merges) */
  overwrite?: boolean;
  /** Default priority for new tasks */
  defaultPriority?: TodoPriority;
  /** Tag to add to all synced tasks */
  tag?: string;
}

/**
 * Task status mapping
 */
export const TASK_STATUS_MAP: Record<TeammateStatus, TodoStatus> = {
  pending: "pending",
  in_progress: "in_progress",
  completed: "completed",
  failed: "failed",
  idle: "pending",
};

// ============================================
// TASK SYNC MANAGER (Stub Implementation)
// ============================================

/**
 * Manages bidirectional sync between teammate tasks and WASM todo engine
 *
 * Note: This is a stub implementation. Full implementation requires
 * the WASM todo engine module to be available.
 */
export class TaskSyncManager {
  /** Map of teammate ID to their todo IDs */
  private taskMap = new Map<string, Set<string>>();

  /**
   * Initialize the task sync manager
   */
  async init(): Promise<void> {
    // Stub - would initialize WASM todo engine
  }

  // ============================================
  // SPAWN SYNC (Teammate -> Todo Engine)
  // ============================================

  /**
   * Sync teammate tasks to the WASM todo engine
   * Call this when a teammate is spawned
   */
  async syncTeammateSpawn(
    teammate: Teammate,
    options: TaskSyncOptions = {}
  ): Promise<TeammateSyncResult> {
    const teammateId = this.getTeammateId(teammate);

    const result: TeammateSyncResult = {
      teammateId,
      syncedToEngine: 0,
      syncedFromEngine: 0,
      errors: [],
    };

    const tasks = teammate.tasks ?? [];

    // Stub: Would create todo items for each task
    const newTaskIds = new Set<string>();
    for (const _task of tasks) {
      newTaskIds.add(`stub-${Date.now()}`);
      result.syncedToEngine++;
    }

    this.taskMap.set(teammateId, newTaskIds);

    return result;
  }

  // ============================================
  // SHUTDOWN SYNC (Todo Engine -> Teammate)
  // ============================================

  /**
   * Sync todo items back to teammate tasks
   * Call this when a teammate is shutting down
   */
  async syncTeammateShutdown(teammate: Teammate): Promise<TeammateSyncResult> {
    const teammateId = this.getTeammateId(teammate);

    const result: TeammateSyncResult = {
      teammateId,
      syncedToEngine: 0,
      syncedFromEngine: 0,
      errors: [],
    };

    const taskIds = this.taskMap.get(teammateId);
    if (!taskIds || taskIds.size === 0) {
      return result;
    }

    // Stub: Would collect task statuses from todo engine
    result.syncedFromEngine = taskIds.size;

    return result;
  }

  // ============================================
  // TASK STATUS UPDATES
  // ============================================

  /**
   * Mark a task as in progress
   */
  async startTask(_teammateId: string, _taskTitle: string): Promise<TodoItem | null> {
    // Stub implementation
    return null;
  }

  /**
   * Mark a task as completed
   */
  async completeTask(_teammateId: string, _taskTitle: string): Promise<TodoItem | null> {
    // Stub implementation
    return null;
  }

  /**
   * Get all tasks for a teammate
   */
  async getTeammateTasks(_teammateId: string): Promise<TodoItem[]> {
    // Stub implementation
    return [];
  }

  /**
   * Get task statistics for a teammate
   */
  async getTeammateStats(teammateId: string): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  }> {
    const taskIds = this.taskMap.get(teammateId);
    const total = taskIds?.size ?? 0;

    return {
      total,
      pending: total,
      inProgress: 0,
      completed: 0,
    };
  }

  // ============================================
  // BULK OPERATIONS
  // ============================================

  /**
   * Sync all teammates in a team
   */
  async syncTeamSpawn(
    teammates: Teammate[],
    options: TaskSyncOptions = {}
  ): Promise<TeammateSyncResult[]> {
    const results: TeammateSyncResult[] = [];

    for (const teammate of teammates) {
      const result = await this.syncTeammateSpawn(teammate, options);
      results.push(result);
    }

    return results;
  }

  /**
   * Sync all teammates shutdown
   */
  async syncTeamShutdown(teammates: Teammate[]): Promise<TeammateSyncResult[]> {
    const results: TeammateSyncResult[] = [];

    for (const teammate of teammates) {
      const result = await this.syncTeammateShutdown(teammate);
      results.push(result);
    }

    return results;
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Get the ID of a teammate (handles both id and teammateId fields)
   */
  private getTeammateId(teammate: Teammate): string {
    return teammate.id ?? teammate.teammateId ?? teammate.name;
  }

  /**
   * Clear all tasks for a teammate
   */
  async clearTeammateTasks(teammateId: string): Promise<void> {
    this.taskMap.delete(teammateId);
  }

  /**
   * Export teammate tasks to JSON
   */
  async exportTeammateTasks(teammateId: string): Promise<string> {
    const tasks = await this.getTeammateTasks(teammateId);
    return JSON.stringify(
      {
        teammateId,
        tasks,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let defaultManager: TaskSyncManager | null = null;

/**
 * Get the default task sync manager instance
 */
export async function getTaskSyncManager(): Promise<TaskSyncManager> {
  if (!defaultManager) {
    defaultManager = new TaskSyncManager();
    await defaultManager.init();
  }
  return defaultManager;
}

/**
 * Create a new task sync manager instance
 */
export function createTaskSyncManager(): TaskSyncManager {
  return new TaskSyncManager();
}
