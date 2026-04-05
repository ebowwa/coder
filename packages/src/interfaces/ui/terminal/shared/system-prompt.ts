/**
 * System Prompt Building
 * Shared between CLI and TUI modes
 *
 * Uses centralized prompts from core/prompts/ for consistency.
 */

import { loadClaudeMd, buildClaudeMdPrompt } from "../../../../core/claude-md.js";
import { getGitStatus } from "../../../../core/git-status.js";
import { buildBaseSystemPrompt } from "../../../../ecosystem/prompts/index.js";

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
 *
 * Uses centralized prompts from core/prompts/ for the base identity,
 * principles, directives, and behavioral patterns.
 */
export async function buildDefaultSystemPrompt(
  workingDirectory: string,
  options?: {
    gitStatus?: GitStatusInfo | null;
    teammateMode?: boolean;
    agentId?: string;
    agentName?: string;
    teamName?: string;
    presetClaudeMd?: string;
  }
): Promise<string> {
  // Start with the centralized base prompt (identity, principles, directives, etc.)
  let prompt = buildBaseSystemPrompt();

  // Add working directory context
  prompt += `\n\n# Environment\n\nWorking directory: ${workingDirectory}`;

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

  // Add preset CLAUDE.md if provided (from preset configuration)
  if (options?.presetClaudeMd) {
    prompt += `\n\n# Preset Configuration\n\n${options.presetClaudeMd}`;
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
    presetClaudeMd?: string;
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
    presetClaudeMd: options?.presetClaudeMd,
  });

  // Append additional prompt if provided
  if (options?.appendSystemPrompt) {
    prompt += `\n\n${options.appendSystemPrompt}`;
  }

  return prompt;
}
