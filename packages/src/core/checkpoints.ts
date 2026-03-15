/**
 * Checkpoint Manager - Save and restore conversation states
 * Captures both chat context AND code/file changes
 */

import { randomUUID } from "crypto";
import { execSync } from "child_process";
import type {
  Message,
  FileSnapshot,
  GitState,
  Checkpoint,
  CheckpointStore,
  CheckpointMetadata,
} from "../schemas/index.js";

// Re-export types for backward compatibility
export type { FileSnapshot, GitState, Checkpoint, CheckpointStore } from "../schemas/index.js";

const CHECKPOINTS_DIR = process.env.CLAUDE_CHECKPOINTS_DIR || `${process.env.HOME}/.claude/checkpoints`;

/**
 * Generate a simple hash for file content
 */
function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

/**
 * Get current git state
 */
function getGitState(workingDir: string): GitState | undefined {
  try {
    // Check if we're in a git repo
    execSync("git rev-parse --is-inside-work-tree", {
      cwd: workingDir,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    });

    const branch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: workingDir,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();

    // Get ahead/behind counts
    let ahead = 0;
    let behind = 0;
    try {
      const counts = execSync("git rev-list --left-right --count @{upstream}...HEAD 2>/dev/null || echo '0 0'", {
        cwd: workingDir,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"]
      }).trim().split(/\s+/);
      behind = parseInt(counts[0] || "0", 10);
      ahead = parseInt(counts[1] || "0", 10);
    } catch {
      // No upstream
    }

    const status = execSync("git status --porcelain", {
      cwd: workingDir,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();

    const staged: string[] = [];
    const unstaged: string[] = [];
    const untracked: string[] = [];

    for (const line of status.split("\n")) {
      if (!line.trim()) continue;
      const indexStatus = line[0];
      const workTreeStatus = line[1];
      const filePath = line.slice(3);

      if (indexStatus === "?" && workTreeStatus === "?") {
        untracked.push(filePath);
      } else if (indexStatus !== " " && indexStatus !== "?") {
        staged.push(filePath);
      } else if (workTreeStatus !== " ") {
        unstaged.push(filePath);
      }
    }

    return { branch, ahead, behind, staged, unstaged, untracked };
  } catch (error) {
    // Not in a git repo or git not available
    return undefined;
  }
}

/**
 * Create a git stash with checkpoint info
 */
function createCheckpointStash(workingDir: string, checkpointId: string): string | undefined {
  try {
    const stashName = `claude-checkpoint-${checkpointId}`;
    execSync(`git stash push -m "${stashName}" --include-untracked 2>/dev/null || true`, {
      cwd: workingDir,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    });
    return stashName;
  } catch {
    return undefined;
  }
}

/**
 * Capture file snapshots for modified files
 */
async function captureFileSnapshots(
  workingDir: string,
  filePaths: string[]
): Promise<FileSnapshot[]> {
  const snapshots: FileSnapshot[] = [];

  for (const filePath of filePaths) {
    try {
      const fullPath = `${workingDir}/${filePath}`;
      const file = Bun.file(fullPath);

      if (await file.exists()) {
        const content = await file.text();
        snapshots.push({
          path: filePath,
          content,
          hash: hashContent(content),
        });
      }
    } catch {
      // Skip files that can't be read
    }
  }

  return snapshots;
}

/**
 * Restore files from snapshots
 */
async function restoreFileSnapshots(
  workingDir: string,
  snapshots: FileSnapshot[]
): Promise<{ restored: number; failed: number }> {
  let restored = 0;
  let failed = 0;

  for (const snapshot of snapshots) {
    try {
      const fullPath = `${workingDir}/${snapshot.path}`;
      await Bun.write(fullPath, snapshot.content);
      restored++;
    } catch {
      failed++;
    }
  }

  return { restored, failed };
}

/**
 * Ensure checkpoints directory exists
 */
async function ensureCheckpointsDir(): Promise<void> {
  const dir = Bun.file(CHECKPOINTS_DIR);
  if (!(await dir.exists())) {
    await Bun.write(CHECKPOINTS_DIR + "/.gitkeep", "");
  }
}

/**
 * Get checkpoint file path for a session
 */
function getCheckpointFilePath(sessionId: string): string {
  return `${CHECKPOINTS_DIR}/${sessionId}.json`;
}

/**
 * Load checkpoints for a session
 */
export async function loadCheckpoints(sessionId: string): Promise<Map<string, Checkpoint>> {
  const checkpoints = new Map<string, Checkpoint>();

  try {
    const filePath = getCheckpointFilePath(sessionId);
    const file = Bun.file(filePath);

    if (await file.exists()) {
      const content = await file.text();
      const data = JSON.parse(content) as Checkpoint[];

      for (const checkpoint of data) {
        checkpoints.set(checkpoint.id, checkpoint);
      }
    }
  } catch (error) {
    // Return empty map on error
  }

  return checkpoints;
}

/**
 * Save checkpoints for a session
 */
export async function saveCheckpoints(
  sessionId: string,
  checkpoints: Map<string, Checkpoint>
): Promise<void> {
  await ensureCheckpointsDir();

  const filePath = getCheckpointFilePath(sessionId);
  const data = Array.from(checkpoints.values());

  await Bun.write(filePath, JSON.stringify(data, null, 2));
}

/**
 * Create a new checkpoint with file snapshots
 */
export async function createCheckpoint(
  sessionId: string,
  messages: Message[],
  options: {
    label?: string;
    description?: string;
    model?: string;
    workingDirectory?: string;
    totalCost?: number;
    trackFiles?: boolean;
  } = {}
): Promise<Checkpoint> {
  const checkpoints = await loadCheckpoints(sessionId);
  const workingDir = options.workingDirectory || process.cwd();

  // Capture git state
  const gitState = getGitState(workingDir);

  // Capture file snapshots for all changed files
  let fileSnapshots: FileSnapshot[] = [];
  if (options.trackFiles !== false && gitState) {
    const changedFiles = [
      ...gitState.staged,
      ...gitState.unstaged,
      ...gitState.untracked,
    ];
    fileSnapshots = await captureFileSnapshots(workingDir, changedFiles);
  }

  const checkpoint: Checkpoint = {
    id: randomUUID().slice(0, 8),
    sessionId,
    timestamp: Date.now(),
    label: options.label || `Checkpoint ${checkpoints.size + 1}`,
    description: options.description,
    messages: JSON.parse(JSON.stringify(messages)), // Deep copy
    files: fileSnapshots,
    gitState,
    metadata: {
      model: options.model,
      workingDirectory: workingDir,
      totalCost: options.totalCost || 0,
      messageCount: messages.length,
      fileCount: fileSnapshots.length,
    },
  };

  checkpoints.set(checkpoint.id, checkpoint);
  await saveCheckpoints(sessionId, checkpoints);

  return checkpoint;
}

/**
 * Restore a checkpoint (returns the checkpoint, doesn't apply it)
 */
export async function restoreCheckpoint(
  sessionId: string,
  checkpointId: string
): Promise<Checkpoint | null> {
  const checkpoints = await loadCheckpoints(sessionId);
  return checkpoints.get(checkpointId) || null;
}

/**
 * Apply a checkpoint - restore files and return messages
 */
export async function applyCheckpoint(
  checkpoint: Checkpoint,
  options: {
    restoreFiles?: boolean;
    restoreMessages?: boolean;
    workingDirectory?: string;
  } = {}
): Promise<{
  messages: Message[];
  filesRestored: number;
  filesFailed: number;
}> {
  const workingDir = options.workingDirectory || checkpoint.metadata.workingDirectory || process.cwd();

  let filesRestored = 0;
  let filesFailed = 0;

  // Restore files if requested
  if (options.restoreFiles !== false && checkpoint.files.length > 0) {
    const result = await restoreFileSnapshots(workingDir, checkpoint.files);
    filesRestored = result.restored;
    filesFailed = result.failed;
  }

  return {
    messages: options.restoreMessages !== false ? checkpoint.messages : [],
    filesRestored,
    filesFailed,
  };
}

/**
 * Delete a checkpoint
 */
export async function deleteCheckpoint(
  sessionId: string,
  checkpointId: string
): Promise<boolean> {
  const checkpoints = await loadCheckpoints(sessionId);

  if (checkpoints.has(checkpointId)) {
    checkpoints.delete(checkpointId);
    await saveCheckpoints(sessionId, checkpoints);
    return true;
  }

  return false;
}

/**
 * List all checkpoints for a session
 */
export async function listCheckpoints(sessionId: string): Promise<Checkpoint[]> {
  const checkpoints = await loadCheckpoints(sessionId);
  return Array.from(checkpoints.values()).sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Format checkpoint for display
 */
export function formatCheckpoint(checkpoint: Checkpoint, verbose = false): string {
  const date = new Date(checkpoint.timestamp);
  const timeStr = date.toLocaleTimeString();
  const dateStr = date.toLocaleDateString();

  let output = `\x1b[33m${checkpoint.id}\x1b[0m `;
  output += `\x1b[1m${checkpoint.label}\x1b[0m `;
  output += `\x1b[90m(${dateStr} ${timeStr})\x1b[0m`;

  // Show file count if there are files
  if (checkpoint.files.length > 0) {
    output += ` \x1b[32m[${checkpoint.files.length} files]\x1b[0m`;
  }

  // Show git branch if available
  if (checkpoint.gitState) {
    output += ` \x1b[34m(${checkpoint.gitState.branch})\x1b[0m`;
  }

  if (verbose) {
    output += `\n  Messages: ${checkpoint.metadata.messageCount}`;
    output += `\n  Files: ${checkpoint.metadata.fileCount}`;
    output += `\n  Cost: $${checkpoint.metadata.totalCost.toFixed(4)}`;
    if (checkpoint.gitState) {
      const changes = checkpoint.gitState.staged.length +
                      checkpoint.gitState.unstaged.length +
                      checkpoint.gitState.untracked.length;
      output += `\n  Git changes: ${changes}`;
    }
    if (checkpoint.description) {
      output += `\n  ${checkpoint.description}`;
    }
  }

  return output;
}

/**
 * Print checkpoints list
 */
export function printCheckpointsList(checkpoints: Checkpoint[]): void {
  if (checkpoints.length === 0) {
    console.log("\x1b[90mNo checkpoints saved.\x1b[0m");
    console.log("\x1b[90mUse /checkpoint <label> to create one.\x1b[0m");
    return;
  }

  console.log(`\n\x1b[1mCheckpoints (${checkpoints.length}):\x1b[0m`);
  console.log("\x1b[90m─────────────────────────────────────────────────\x1b[0m");

  for (const checkpoint of checkpoints) {
    console.log(formatCheckpoint(checkpoint));
  }

  console.log("\x1b[90m─────────────────────────────────────────────────\x1b[0m");
  console.log("\x1b[90m/restore <id>        - Restore checkpoint (files + chat)\x1b[0m");
  console.log("\x1b[90m/restore-chat <id>   - Restore chat only (no files)\x1b[0m");
  console.log("\x1b[90m/checkpoint <label>  - Create new checkpoint\x1b[0m");
}

/**
 * Clear all checkpoints for a session
 */
export async function clearCheckpoints(sessionId: string): Promise<number> {
  const checkpoints = await loadCheckpoints(sessionId);
  const count = checkpoints.size;
  checkpoints.clear();
  await saveCheckpoints(sessionId, checkpoints);
  return count;
}

/**
 * Get checkpoint summary for status display
 */
export function getCheckpointSummary(checkpoint: Checkpoint): string {
  const parts: string[] = [];

  if (checkpoint.files.length > 0) {
    parts.push(`${checkpoint.files.length} files`);
  }

  parts.push(`${checkpoint.metadata.messageCount} msgs`);

  if (checkpoint.gitState) {
    const changes = checkpoint.gitState.staged.length +
                    checkpoint.gitState.unstaged.length +
                    checkpoint.gitState.untracked.length;
    if (changes > 0) {
      parts.push(`${changes} changes`);
    }
  }

  return parts.join(" | ");
}

// ============================================
// CHECKPOINT NAVIGATION (UNDO/REDO)
// ============================================

interface CheckpointNavigation {
  sessionId: string;
  checkpointIds: string[];      // Ordered list of checkpoint IDs
  currentIndex: number;          // Current position in the list (-1 = none)
  undoneIds: string[];           // Checkpoints that were undone (for redo)
}

const NAVIGATION_FILE = (sessionId: string) => `${CHECKPOINTS_DIR}/${sessionId}-nav.json`;

/**
 * Get checkpoint navigation state
 */
async function getNavigation(sessionId: string): Promise<CheckpointNavigation> {
  try {
    const file = Bun.file(NAVIGATION_FILE(sessionId));
    if (await file.exists()) {
      return JSON.parse(await file.text()) as CheckpointNavigation;
    }
  } catch {
    // Return fresh navigation
  }
  return { sessionId, checkpointIds: [], currentIndex: -1, undoneIds: [] };
}

/**
 * Save checkpoint navigation state
 */
async function saveNavigation(nav: CheckpointNavigation): Promise<void> {
  await ensureCheckpointsDir();
  await Bun.write(NAVIGATION_FILE(nav.sessionId), JSON.stringify(nav, null, 2));
}

/**
 * Register a new checkpoint (called after createCheckpoint)
 */
export async function registerCheckpoint(sessionId: string, checkpointId: string): Promise<void> {
  const nav = await getNavigation(sessionId);

  // If we're not at the end, truncate the list (new checkpoint = no redo)
  if (nav.currentIndex < nav.checkpointIds.length - 1) {
    nav.checkpointIds = nav.checkpointIds.slice(0, nav.currentIndex + 1);
  }

  nav.checkpointIds.push(checkpointId);
  nav.currentIndex = nav.checkpointIds.length - 1;
  nav.undoneIds = []; // Clear redo stack

  await saveNavigation(nav);
}

/**
 * Undo - go back to previous checkpoint
 */
export async function undoCheckpoint(
  sessionId: string
): Promise<{ checkpoint: Checkpoint | null; canRedo: boolean }> {
  const nav = await getNavigation(sessionId);
  const checkpoints = await loadCheckpoints(sessionId);

  if (nav.currentIndex <= 0) {
    return { checkpoint: null, canRedo: false };
  }

  // Save current to redo stack
  const currentId = nav.checkpointIds[nav.currentIndex];
  if (currentId) {
    nav.undoneIds.push(currentId);
  }

  // Move back
  nav.currentIndex--;
  const prevId = nav.checkpointIds[nav.currentIndex];

  await saveNavigation(nav);

  const checkpoint = prevId ? checkpoints.get(prevId) || null : null;
  return { checkpoint, canRedo: nav.undoneIds.length > 0 };
}

/**
 * Redo - go forward to next checkpoint
 */
export async function redoCheckpoint(
  sessionId: string
): Promise<{ checkpoint: Checkpoint | null; canRedo: boolean }> {
  const nav = await getNavigation(sessionId);
  const checkpoints = await loadCheckpoints(sessionId);

  if (nav.undoneIds.length === 0) {
    return { checkpoint: null, canRedo: false };
  }

  // Pop from redo stack
  const nextId = nav.undoneIds.pop()!;
  nav.currentIndex++;

  await saveNavigation(nav);

  const checkpoint = checkpoints.get(nextId) || null;
  return { checkpoint, canRedo: nav.undoneIds.length > 0 };
}

/**
 * Get navigation status
 */
export async function getNavigationStatus(sessionId: string): Promise<{
  total: number;
  current: number;
  canUndo: boolean;
  canRedo: boolean;
  currentId?: string;
}> {
  const nav = await getNavigation(sessionId);

  return {
    total: nav.checkpointIds.length,
    current: nav.currentIndex + 1, // 1-indexed for display
    canUndo: nav.currentIndex > 0,
    canRedo: nav.undoneIds.length > 0,
    currentId: nav.checkpointIds[nav.currentIndex],
  };
}
