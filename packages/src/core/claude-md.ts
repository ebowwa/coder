/**
 * CLAUDE.md Support - Load project-specific instructions
 *
 * Loads CLAUDE.md files from:
 * 1. ~/.claude/CLAUDE.md (global user preferences)
 * 2. .claude/CLAUDE.md (project-specific, preferred)
 * 3. CLAUDE.md (root level, fallback)
 *
 * Content is merged in order: global → project
 */

import { readFile, access } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

// ===== System Signature Types =====

export interface SystemSignature {
  version: string;
  projectId: string;
  sessionId: string;
  timestamp: number;
  environment: EnvironmentInfo;
  gitStatus: GitStatusInfo;
  tools: ToolsInfo;
}

export interface EnvironmentInfo {
  platform: string;
  nodeVersion: string;
  shell: string;
  homeDir: string;
}

export interface GitStatusInfo {
  branch: string;
  hasChanges: boolean;
  staged: number;
  unstaged: number;
  untracked: number;
}

export interface ToolsInfo {
  available: string[];
  mcpServers: string[];
}

export interface ClaudeMdConfig {
  globalPath: string;
  projectPath: string;
  rootPath: string;
}

const DEFAULT_CONFIG: ClaudeMdConfig = {
  globalPath: `${process.env.HOME}/.claude/CLAUDE.md`,
  projectPath: ".claude/CLAUDE.md",
  rootPath: "CLAUDE.md",
};

/**
 * Check if a file exists and is readable
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Load CLAUDE.md content from a single file
 */
async function loadClaudeMdFile(path: string): Promise<string | null> {
  try {
    if (await fileExists(path)) {
      const content = await readFile(path, "utf-8");
      return content.trim();
    }
  } catch (error) {
    // File not readable, skip
  }
  return null;
}

/**
 * Load all CLAUDE.md files and merge them
 *
 * Priority (later overrides earlier):
 * 1. Global (~/.claude/CLAUDE.md)
 * 2. Project (.claude/CLAUDE.md or ./CLAUDE.md)
 */
export async function loadClaudeMd(
  workingDirectory: string = process.cwd(),
  config: Partial<ClaudeMdConfig> = {}
): Promise<{
  global: string | null;
  project: string | null;
  merged: string;
  sources: string[];
}> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const sources: string[] = [];
  let globalContent: string | null = null;
  let projectContent: string | null = null;

  // Load global CLAUDE.md
  const globalPath = cfg.globalPath;
  globalContent = await loadClaudeMdFile(globalPath);
  if (globalContent) {
    sources.push(globalPath);
  }

  // Load project CLAUDE.md (prefer .claude/CLAUDE.md over root CLAUDE.md)
  const projectPath = join(workingDirectory, cfg.projectPath);
  const rootPath = join(workingDirectory, cfg.rootPath);

  projectContent = await loadClaudeMdFile(projectPath);
  if (projectContent) {
    sources.push(projectPath);
  } else {
    // Fallback to root CLAUDE.md
    projectContent = await loadClaudeMdFile(rootPath);
    if (projectContent) {
      sources.push(rootPath);
    }
  }

  // Merge content
  const parts: string[] = [];

  if (globalContent) {
    parts.push(`# Global Instructions\n\n${globalContent}`);
  }

  if (projectContent) {
    parts.push(`# Project Instructions\n\n${projectContent}`);
  }

  return {
    global: globalContent,
    project: projectContent,
    merged: parts.join("\n\n---\n\n"),
    sources,
  };
}

/**
 * Build system prompt section from CLAUDE.md
 */
export async function buildClaudeMdPrompt(
  workingDirectory: string = process.cwd()
): Promise<string> {
  const { merged, sources } = await loadClaudeMd(workingDirectory);

  if (!merged) {
    return "";
  }

  const header = sources.length > 0
    ? `Loaded from: ${sources.join(", ")}`
    : "";

  return `
## Project Instructions

${header}

${merged}
`;
}

/**
 * Generate a system signature for the current environment
 */
export function generateSystemSignature(
  workingDirectory: string = process.cwd(),
  gitStatus?: Partial<GitStatusInfo>,
  availableTools?: string[],
  mcpServers?: string[]
): SystemSignature {
  return {
    version: "1.0.0",
    projectId: randomUUID(),
    sessionId: randomUUID(),
    timestamp: Date.now(),
    environment: {
      platform: process.platform,
      nodeVersion: process.version,
      shell: process.env.SHELL || "unknown",
      homeDir: process.env.HOME || "",
    },
    gitStatus: {
      branch: gitStatus?.branch || "unknown",
      hasChanges: gitStatus?.hasChanges ?? false,
      staged: gitStatus?.staged ?? 0,
      unstaged: gitStatus?.unstaged ?? 0,
      untracked: gitStatus?.untracked ?? 0,
    },
    tools: {
      available: availableTools || [],
      mcpServers: mcpServers || [],
    },
  };
}

/**
 * Format a system signature as a readable string
 */
export function formatSystemSignature(signature: SystemSignature): string {
  return `
System Signature
================
Version: ${signature.version}
Project ID: ${signature.projectId}
Session ID: ${signature.sessionId}
Timestamp: ${new Date(signature.timestamp).toISOString()}

Environment:
  Platform: ${signature.environment.platform}
  Node: ${signature.environment.nodeVersion}
  Shell: ${signature.environment.shell}

Git Status:
  Branch: ${signature.gitStatus.branch}
  Changes: ${signature.gitStatus.hasChanges ? "Yes" : "No"}
  Staged: ${signature.gitStatus.staged}
  Unstaged: ${signature.gitStatus.unstaged}
  Untracked: ${signature.gitStatus.untracked}

Tools:
  Available: ${signature.tools.available.length}
  MCP Servers: ${signature.tools.mcpServers.length}
`;
}

/**
 * Watch for CLAUDE.md changes (returns cleanup function)
 */
export function watchClaudeMd(
  workingDirectory: string,
  onChange: () => void
): () => void {
  const { watch } = require("fs");
  const watchers: ReturnType<typeof watch>[] = [];

  const paths = [
    `${process.env.HOME}/.claude/CLAUDE.md`,
    `${workingDirectory}/.claude/CLAUDE.md`,
    `${workingDirectory}/CLAUDE.md`,
  ];

  for (const path of paths) {
    try {
      const watcher = watch(path, (eventType: string) => {
        if (eventType === "change") {
          onChange();
        }
      });
      watchers.push(watcher);
    } catch {
      // File doesn't exist, skip watching
    }
  }

  return () => {
    for (const watcher of watchers) {
      watcher.close();
    }
  };
}
