/**
 * Checkpoint Manager - Reference-based checkpoint system
 *
 * Lightweight checkpoints that reference data instead of duplicating:
 * - Messages: Reference by index (stored in JSONL sessions)
 * - Files: Hash only (content recoverable from git)
 * - Git state: Full state (lightweight metadata)
 *
 * Old: 582MB per checkpoint
 * New: ~1KB per checkpoint
 */

import { randomUUID } from "crypto";
import { createHash } from "crypto";
import { execSync } from "child_process";
import type {
  FileReference,
  GitState,
  Checkpoint,
  CheckpointMetadata,
  LegacyCheckpoint,
  LegacyFileSnapshot,
} from "../schemas/index.js";

// Re-export types for backward compatibility
export type { FileReference, GitState, Checkpoint, CheckpointMetadata } from "../schemas/index.js";

const CHECKPOINTS_DIR = process.env.CLAUDE_CHECKPOINTS_DIR || `${process.env.HOME}/.claude/checkpoints`;

// ============================================
// HASH UTILITIES
// ============================================

/**
 * Generate SHA-256 hash for file content
 */
function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

/**
 * Hash a file by path
 */
async function hashFile(filePath: string): Promise<string | null> {
  try {
    const file = Bun.file(filePath);
    if (await file.exists()) {
      const content = await file.text();
      return hashContent(content);
    }
  } catch (error) {
    // File not readable - this is expected for deleted/removed files
    // Log at debug level for troubleshooting
    if (process.env.DEBUG_CHECKPOINTS) {
      console.error("[checkpoints] Could not hash file " + filePath + ": " + (error as Error).message);
    }
  }
  return null;
}

// ============================================
// GIT STATE
// ============================================

/**
 * Get current git state (lightweight - no file contents)
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

// ============================================
// FILE REFERENCES (Hash-only, no content)
// ============================================

/**
 * Capture file references (hashes only, no content)
 */
async function captureFileReferences(
  workingDir: string,
  filePaths: string[]
): Promise<FileReference[]> {
  const references: FileReference[] = [];

  for (const filePath of filePaths) {
    const fullPath = `${workingDir}/${filePath}`;
    const hash = await hashFile(fullPath);
    if (hash) {
      references.push({
        path: filePath,
        hash,
      });
    }
  }

  return references;
}

// ============================================
// CHECKPOINT STORAGE
// ============================================

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
      const data = JSON.parse(content);

      // Handle both array format and object format
      const checkpointList = Array.isArray(data) ? data : Object.values(data);

      for (const checkpoint of checkpointList) {
        // Migrate legacy checkpoints to new format
        const migrated = migrateLegacyCheckpoint(checkpoint);
        checkpoints.set(migrated.id, migrated);
      }
    }
  } catch (error) {
    // Log error for debugging but don't fail
    console.error("[checkpoints] Error loading checkpoints from " + sessionId + ": " + (error as Error).message);
  }

  return checkpoints;
}

/**
 * Migrate legacy checkpoint to reference-based format
 */
function migrateLegacyCheckpoint(legacy: LegacyCheckpoint | Checkpoint): Checkpoint {
  // Check if already migrated (has messageIndex instead of messages)
  if ("messageIndex" in legacy && !("messages" in legacy)) {
    return legacy as Checkpoint;
  }

  // Convert legacy to new format
  const legacyCp = legacy as LegacyCheckpoint;

  // Convert file snapshots to file references
  const fileRefs: FileReference[] = [];
  if (legacyCp.files) {
    for (const file of legacyCp.files) {
      if ("content" in file && file.content) {
        // Legacy format - extract hash, discard content
        fileRefs.push({
          path: file.path,
          hash: file.hash,
        });
      } else {
        // Already reference format
        fileRefs.push(file as FileReference);
      }
    }
  }

  return {
    id: legacyCp.id,
    sessionId: legacyCp.sessionId,
    timestamp: legacyCp.timestamp,
    label: legacyCp.label,
    description: legacyCp.description,
    // Convert messages array to messageIndex
    messageIndex: Array.isArray(legacyCp.messages) ? legacyCp.messages.length : 0,
    files: fileRefs,
    gitState: legacyCp.gitState,
    metadata: legacyCp.metadata,
  };
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

// ============================================
// CHECKPOINT CREATION (Reference-based)
// ============================================

/**
 * Create a new checkpoint (reference-based, ~1KB)
 */
export async function createCheckpoint(
  sessionId: string,
  messages: unknown[],  // Accept any message format
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

  // Capture file references (hashes only, no content)
  let fileRefs: FileReference[] = [];
  if (options.trackFiles !== false && gitState) {
    const changedFiles = [
      ...gitState.staged,
      ...gitState.unstaged,
      ...gitState.untracked,
    ];
    fileRefs = await captureFileReferences(workingDir, changedFiles);
  }

  const checkpoint: Checkpoint = {
    id: randomUUID().slice(0, 8),
    sessionId,
    timestamp: Date.now(),
    label: options.label || `Checkpoint ${checkpoints.size + 1}`,
    description: options.description,
    // Reference: just the count, not full messages
    messageIndex: Array.isArray(messages) ? messages.length : 0,
    // Reference: just hashes, not content
    files: fileRefs,
    gitState,
    metadata: {
      model: options.model,
      workingDirectory: workingDir,
      totalCost: options.totalCost || 0,
      messageCount: Array.isArray(messages) ? messages.length : 0,
      fileCount: fileRefs.length,
    },
  };

  checkpoints.set(checkpoint.id, checkpoint);
  await saveCheckpoints(sessionId, checkpoints);

  return checkpoint;
}

// ============================================
// CHECKPOINT RESTORATION
// ============================================

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
 * Apply a checkpoint - restore files via git and return message index
 *
 * Note: Messages must be loaded from JSONL session store using messageIndex
 * Files must be restored via git checkout/reset
 */
export async function applyCheckpoint(
  checkpoint: Checkpoint,
  options: {
    restoreFiles?: boolean;
    workingDirectory?: string;
  } = {}
): Promise<{
  messageIndex: number;
  filesRestored: number;
  filesFailed: number;
  warning?: string;
}> {
  const workingDir = options.workingDirectory || checkpoint.metadata.workingDirectory || process.cwd();

  let filesRestored = 0;
  let filesFailed = 0;
  let warning: string | undefined;

  // Restore files via git if requested
  if (options.restoreFiles !== false && checkpoint.gitState) {
    const result = await restoreFilesViaGit(workingDir, checkpoint);
    filesRestored = result.restored;
    filesFailed = result.failed;
    warning = result.warning;
  }

  return {
    messageIndex: checkpoint.messageIndex,
    filesRestored,
    filesFailed,
    warning,
  };
}

/**
 * Restore files using git (not file contents)
 */
async function restoreFilesViaGit(
  workingDir: string,
  checkpoint: Checkpoint
): Promise<{ restored: number; failed: number; warning?: string }> {
  let restored = 0;
  let failed = 0;
  let warning: string | undefined;

  if (!checkpoint.gitState) {
    return { restored: 0, failed: 0, warning: "No git state in checkpoint" };
  }

  try {
    // Check if we can use git to restore
    execSync("git rev-parse --is-inside-work-tree", {
      cwd: workingDir,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    });

    // Restore staged files
    for (const file of checkpoint.gitState.staged) {
      try {
        execSync(`git checkout HEAD -- "${file}"`, {
          cwd: workingDir,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"]
        });
        restored++;
      } catch {
        failed++;
      }
    }

    // Restore unstaged files
    for (const file of checkpoint.gitState.unstaged) {
      try {
        execSync(`git checkout HEAD -- "${file}"`, {
          cwd: workingDir,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"]
        });
        restored++;
      } catch {
        failed++;
      }
    }

    // Remove untracked files (they weren't in git at checkpoint time)
    if (checkpoint.gitState.untracked.length > 0) {
      warning = `${checkpoint.gitState.untracked.length} untracked files existed at checkpoint time but cannot be restored (no git history)`;
    }

  } catch {
    return {
      restored: 0,
      failed: checkpoint.files.length,
      warning: "Not in a git repo - cannot restore files"
    };
  }

  return { restored, failed, warning };
}

// ============================================
// CHECKPOINT MANAGEMENT
// ============================================

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

  // Show message index
  output += ` \x1b[36m[msg #${checkpoint.messageIndex}]\x1b[0m`;

  // Show git branch if available
  if (checkpoint.gitState) {
    output += ` \x1b[34m(${checkpoint.gitState.branch})\x1b[0m`;
  }

  if (verbose) {
    output += `\n  Messages: ${checkpoint.metadata.messageCount} (restore to #${checkpoint.messageIndex})`;
    output += `\n  Files: ${checkpoint.metadata.fileCount} (hash refs only)`;
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

  parts.push(`msg #${checkpoint.messageIndex}`);

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

// ============================================
// AUTO-CLEANUP
// ============================================

/**
 * Clean up old checkpoints
 * @param maxAge Max age in milliseconds (default: 7 days)
 * @param maxPerSession Max checkpoints per session (default: 10)
 */
export async function cleanupOldCheckpoints(
  options: {
    maxAge?: number;
    maxPerSession?: number;
  } = {}
): Promise<{ deleted: number; kept: number }> {
  const maxAge = options.maxAge || 7 * 24 * 60 * 60 * 1000; // 7 days
  const maxPerSession = options.maxPerSession || 10;
  const now = Date.now();

  let deleted = 0;
  let kept = 0;

  try {
    const glob = new Bun.Glob("*.json");
    const files = [...glob.scanSync(CHECKPOINTS_DIR)];

    for (const file of files) {
      if (file.endsWith("-nav.json")) continue; // Skip navigation files

      const sessionId = file.replace(".json", "");
      const checkpoints = await loadCheckpoints(sessionId);
      const sorted = Array.from(checkpoints.values()).sort((a, b) => b.timestamp - a.timestamp);

      const toKeep = new Set<string>();

      for (let i = 0; i < sorted.length; i++) {
        const cp = sorted[i];
        if (!cp) continue;

        const age = now - cp.timestamp;

        // Keep if within age limit AND within count limit
        if (age < maxAge && i < maxPerSession) {
          toKeep.add(cp.id);
          kept++;
        } else {
          deleted++;
        }
      }

      // Save filtered checkpoints
      const filtered = new Map<string, Checkpoint>();
      for (const [id, cp] of checkpoints) {
        if (toKeep.has(id)) {
          filtered.set(id, cp);
        }
      }
      await saveCheckpoints(sessionId, filtered);
    }
  } catch {
    // Ignore cleanup errors
  }

  return { deleted, kept };
}
