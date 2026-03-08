/**
 * System Prompt Building
 * Shared between CLI and TUI modes
 */

import { loadClaudeMd, buildClaudeMdPrompt } from "../../../../core/claude-md.js";
import { getGitStatus } from "../../../../core/git-status.js";

// ============================================
// GIT STATUS TYPE
// ============================================

export interface GitStatusInfo {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  unstaged: string[];
  untracked: string[];
}

// ============================================
// SYSTEM PROMPT BUILDER
// ============================================

/**
 * Build the default system prompt with optional git status and CLAUDE.md content
 */
export async function buildDefaultSystemPrompt(
  workingDirectory: string,
  options?: {
    gitStatus?: GitStatusInfo | null;
    teammateMode?: boolean;
    agentId?: string;
    agentName?: string;
    teamName?: string;
  }
): Promise<string> {
  let prompt = `You are Coder, an AI coding assistant.

You help users with software engineering tasks:
- Reading, writing, and editing code
- Running commands and scripts
- Searching and exploring codebases
- Debugging and fixing issues

Guidelines:
1. Be helpful, direct, and thorough
2. Explain your reasoning when asked
3. Follow user preferences and project conventions
4. Use tools effectively to accomplish tasks
5. Ask clarifying questions when needed

Available tools:
- Read: Read file contents
- Write: Write new files
- Edit: Make precise edits to files
- Bash: Execute shell commands
- Glob: Find files by pattern
- Grep: Search file contents

Working directory: ${workingDirectory}`;

  // Add git status information if available
  if (options?.gitStatus) {
    const { branch, ahead, behind, staged, unstaged, untracked } = options.gitStatus;
    prompt += `\n\nGit Status:`;
    prompt += `\nBranch: ${branch}`;
    if (ahead > 0 || behind > 0) {
      prompt += ` (${ahead} ahead, ${behind} behind)`;
    }
    if (staged.length > 0 || unstaged.length > 0 || untracked.length > 0) {
      prompt += `\nChanges: ${staged.length} staged, ${unstaged.length} unstaged, ${untracked.length} untracked`;
    }
  }

  // Load CLAUDE.md files
  const claudeMdContent = await buildClaudeMdPrompt();
  if (claudeMdContent) {
    prompt += `\n\n${claudeMdContent}`;
  }

  // Teammate mode adjustments
  if (options?.teammateMode && options.teamName) {
    prompt += `\n\nYou are running as a teammate agent in the "${options.teamName}" team.`;
    prompt += `\nAgent ID: ${options.agentId}`;
    prompt += `\nAgent Name: ${options.agentName}`;
  }

  return prompt;
}

/**
 * Get git status for the working directory
 */
export async function fetchGitStatus(workingDirectory: string): Promise<GitStatusInfo | null> {
  try {
    const status = await getGitStatus(workingDirectory);
    return status;
  } catch {
    return null;
  }
}

/**
 * Build complete system prompt with all options
 */
export async function buildCompleteSystemPrompt(
  workingDirectory: string,
  options?: {
    systemPrompt?: string;
    appendSystemPrompt?: string;
    teammateMode?: boolean;
    agentId?: string;
    agentName?: string;
    teamName?: string;
  }
): Promise<string> {
  // Use custom system prompt if provided
  if (options?.systemPrompt) {
    let prompt = options.systemPrompt;
    if (options.appendSystemPrompt) {
      prompt += `\n\n${options.appendSystemPrompt}`;
    }
    return prompt;
  }

  // Get git status
  const gitStatus = await fetchGitStatus(workingDirectory);

  // Build default prompt
  let prompt = await buildDefaultSystemPrompt(workingDirectory, {
    gitStatus,
    teammateMode: options?.teammateMode,
    agentId: options?.agentId,
    agentName: options?.agentName,
    teamName: options?.teamName,
  });

  // Append additional prompt if provided
  if (options?.appendSystemPrompt) {
    prompt += `\n\n${options.appendSystemPrompt}`;
  }

  return prompt;
}
