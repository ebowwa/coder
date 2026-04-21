/**
 * Centralized System Prompts for Coder
 *
 * This module provides all prompt components used in build Coder's system prompt.
 * Extracted from Claude Code binary internals for consistency.
 */

// ============================================
// RE-EXPORTS
// ============================================

export {
  IDENTITY_PROMPT,
  CORE_PRINCIPLES,
  BEHAVIORAL_PATTERNS,
  DOING_TASKS_PROMPT,
  INTERNAL_PATTERNS,
} from "./identity.js";

export {
  type Directive,
  IMPORTANT_DIRECTIVES,
  GIT_WORKFLOW_DIRECTIVES,
  getDirectivesByCategory,
  getAllDirectives,
  getGitWorkflowDirectives,
  formatDirectivesForPrompt,
} from "./directives.js";

// Import for use in builders
import {
  IDENTITY_PROMPT,
  CORE_PRINCIPLES,
  BEHAVIORAL_PATTERNS,
  DOING_TASKS_PROMPT,
  INTERNAL_PATTERNS,
} from "./identity.js";
import {
  getAllDirectives,
  getGitWorkflowDirectives,
  formatDirectivesForPrompt,
} from "./directives.js";

// ============================================
// COMBINED BUILDERS
// ============================================

/**
 * Build the full identity section
 */
export function buildIdentitySection(): string {
  return IDENTITY_PROMPT;
}

/**
 * Build the core principles section
 */
export function buildCorePrinciplesSection(): string {
  return `# Core Principles

${CORE_PRINCIPLES.map((p: string) => `- ${p}`).join("\n")}`;
}

/**
 * Build the behavioral patterns section
 */
export function buildBehavioralPatternsSection(): string {
  const { avoidOverEngineering, toolUsage, outputStyle } = BEHAVIORAL_PATTERNS;

  const section = `# Behavioral Patterns

## Avoid Over-Engineering
${avoidOverEngineering.map((p: string) => `- ${p}`).join("\n")}

## Tool Usage
${toolUsage.map((p: string) => `- ${p}`).join("\n")}

## Output Style
${outputStyle.map((p: string) => `- ${p}`).join("\n")}
`;

  return section;
}

/**
 * Build the directives section
 */
export function buildDirectivesSection(): string {
  const allDirectives = getAllDirectives();
  return `# Important Directives

${allDirectives.join("\n")}`;
}

/**
 * Build the git workflow section
 */
export function buildGitWorkflowSection(): string {
  const gitDirectives = getGitWorkflowDirectives();
  return `# Git Workflow

${gitDirectives.join("\n")}`;
}

/**
 * Build the complete system prompt base (without dynamic content)
 */
export function buildBaseSystemPrompt(): string {
  const sections = [
    buildIdentitySection(),
    "",
    buildCorePrinciplesSection(),
    "",
    buildBehavioralPatternsSection(),
    "",
    DOING_TASKS_PROMPT,
    "",
    INTERNAL_PATTERNS,
    "",
    buildDirectivesSection(),
    "",
    buildGitWorkflowSection(),
  ];

  return sections.filter((s: string | object) => typeof s === "string" && s.length > 0).join("\n\n");
}
