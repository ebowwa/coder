/**
 * Git Status - Retrieve repository status information
 * Uses Bun subprocess to run git commands
 */

import type { GitStatus } from "../types/index.js";

/**
 * Run a git command and return its output
 */
async function runGitCommand(
  args: string[],
  cwd: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(["git", ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
}

/**
 * Check if the directory is a git repository
 */
async function isGitRepository(workingDirectory: string): Promise<boolean> {
  const { exitCode } = await runGitCommand(
    ["rev-parse", "--git-dir"],
    workingDirectory
  );
  return exitCode === 0;
}

/**
 * Get the current branch name
 */
async function getBranch(workingDirectory: string): Promise<string> {
  const { stdout, exitCode } = await runGitCommand(
    ["rev-parse", "--abbrev-ref", "HEAD"],
    workingDirectory
  );

  if (exitCode !== 0) {
    return "HEAD";
  }

  return stdout || "HEAD";
}

/**
 * Get ahead/behind counts compared to upstream
 */
async function getAheadBehind(
  workingDirectory: string
): Promise<{ ahead: number; behind: number }> {
  const { stdout, exitCode } = await runGitCommand(
    ["rev-list", "--left-right", "--count", "@{upstream}...HEAD"],
    workingDirectory
  );

  if (exitCode !== 0 || !stdout) {
    return { ahead: 0, behind: 0 };
  }

  const parts = stdout.split(/\s+/);
  if (parts.length >= 2 && parts[0] !== undefined && parts[1] !== undefined) {
    return {
      ahead: parseInt(parts[0], 10) || 0,
      behind: parseInt(parts[1], 10) || 0,
    };
  }

  return { ahead: 0, behind: 0 };
}

/**
 * Parse git status porcelain output
 * Format: XY PATH where X is staged status, Y is unstaged status
 *
 * Status codes:
 * - ' ' (space): unmodified
 * - 'M': modified
 * - 'A': added (staged)
 * - 'D': deleted
 * - 'R': renamed
 * - 'C': copied
 * - 'U': unmerged (conflict)
 * - '?': untracked
 * - '!': ignored
 */
async function getFileStatus(
  workingDirectory: string
): Promise<{
  staged: string[];
  unstaged: string[];
  untracked: string[];
  conflicted: string[];
}> {
  const { stdout, exitCode } = await runGitCommand(
    ["status", "--porcelain"],
    workingDirectory
  );

  if (exitCode !== 0 || !stdout) {
    return {
      staged: [],
      unstaged: [],
      untracked: [],
      conflicted: [],
    };
  }

  const staged: string[] = [];
  const unstaged: string[] = [];
  const untracked: string[] = [];
  const conflicted: string[] = [];

  const lines = stdout.split("\n");

  for (const line of lines) {
    if (!line) continue;

    // Porcelain format: XY PATH or XY ORIG_PATH -> PATH
    const x = line[0]; // Staged status
    const y = line[1]; // Unstaged status
    let path = line.substring(3);

    // Handle renamed files (format: "R  old -> new")
    if (path.includes(" -> ")) {
      const splitPath = path.split(" -> ");
      path = splitPath[1] ?? splitPath[0] ?? path;
    }

    // Check for conflicts (U or both A/A, D/D, etc.)
    const isConflicted =
      x === "U" ||
      y === "U" ||
      (x === "A" && y === "A") ||
      (x === "D" && y === "D") ||
      x === "A" && y === "U" ||
      x === "U" && y === "A" ||
      x === "D" && y === "U" ||
      x === "U" && y === "D";

    if (isConflicted) {
      conflicted.push(path);
      continue;
    }

    // Untracked files
    if (x === "?" && y === "?") {
      untracked.push(path);
      continue;
    }

    // Staged changes (X is not space or ?)
    if (x !== " " && x !== "?" && x !== "!") {
      staged.push(path);
    }

    // Unstaged changes (Y is not space or ?)
    if (y !== " " && y !== "?" && y !== "!") {
      // Don't double-add if already in staged
      if (!staged.includes(path)) {
        unstaged.push(path);
      }
    }
  }

  return { staged, unstaged, untracked, conflicted };
}

/**
 * Get comprehensive git status for a working directory
 *
 * @param workingDirectory - The directory to check git status for
 * @returns GitStatus object if in a git repository, null otherwise
 */
export async function getGitStatus(
  workingDirectory: string
): Promise<GitStatus | null> {
  try {
    // First check if this is a git repository
    const isRepo = await isGitRepository(workingDirectory);
    if (!isRepo) {
      return null;
    }

    // Run all status queries in parallel for better performance
    const [branch, aheadBehind, fileStatus] = await Promise.all([
      getBranch(workingDirectory),
      getAheadBehind(workingDirectory),
      getFileStatus(workingDirectory),
    ]);

    return {
      branch,
      ahead: aheadBehind.ahead,
      behind: aheadBehind.behind,
      staged: fileStatus.staged,
      unstaged: fileStatus.unstaged,
      untracked: fileStatus.untracked,
      conflicted: fileStatus.conflicted,
    };
  } catch (error) {
    // Log error for debugging but return null gracefully
    console.error("Error getting git status:", error);
    return null;
  }
}

/**
 * Check if there are any uncommitted changes
 */
export function hasUncommittedChanges(status: GitStatus): boolean {
  return (
    status.staged.length > 0 ||
    status.unstaged.length > 0 ||
    status.untracked.length > 0 ||
    status.conflicted.length > 0
  );
}

/**
 * Check if the repository is clean (no changes and synced with upstream)
 */
export function isRepositoryClean(status: GitStatus): boolean {
  return !hasUncommittedChanges(status) && status.ahead === 0 && status.behind === 0;
}

/**
 * Get a human-readable summary of the git status
 */
export function getGitStatusSummary(status: GitStatus): string {
  const parts: string[] = [];

  parts.push(`branch: ${status.branch}`);

  if (status.ahead > 0 || status.behind > 0) {
    const sync: string[] = [];
    if (status.ahead > 0) sync.push(`ahead ${status.ahead}`);
    if (status.behind > 0) sync.push(`behind ${status.behind}`);
    parts.push(`(${sync.join(", ")})`);
  }

  const changes: string[] = [];
  if (status.staged.length > 0) changes.push(`${status.staged.length} staged`);
  if (status.unstaged.length > 0) changes.push(`${status.unstaged.length} unstaged`);
  if (status.untracked.length > 0) changes.push(`${status.untracked.length} untracked`);
  if (status.conflicted.length > 0) changes.push(`${status.conflicted.length} conflicted`);

  if (changes.length > 0) {
    parts.push(`[${changes.join(", ")}]`);
  }

  return parts.join(" ");
}
