/**
 * Skill System - Custom agent behaviors
 * Based on Claude Code binary analysis
 */

import type { SkillDefinition, ClaudeModel } from "../types/index.js";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join, extname } from "path";

export interface SkillFile {
  path: string;
  name: string;
  description: string;
  prompt: string;
  tools?: string[];
  model?: ClaudeModel;
  color?: string;
  source: "built-in" | "project" | "user";
}

// ============================================
// SKILL PARSER
// ============================================

/**
 * Parse a SKILL.md file with YAML frontmatter
 */
export function parseSkillFile(path: string, source: "built-in" | "project" | "user" = "project"): SkillFile | null {
  if (!existsSync(path)) {
    return null;
  }

  const content = readFileSync(path, "utf-8");
  const name = path.split("/").pop()?.replace(/\.md$/i, "") || "unknown";

  // Parse YAML frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!frontmatterMatch) {
    // No frontmatter - use entire content as prompt
    return {
      path,
      name,
      description: "",
      prompt: content.trim(),
      source,
    };
  }

  const frontmatter = frontmatterMatch[1] ?? "";
  const body = frontmatterMatch[2] ?? "";
  const metadata = parseYAML(frontmatter);

  return {
    path,
    name: (metadata.name as string) || name,
    description: (metadata.description as string) || "",
    prompt: body.trim(),
    tools: metadata.tools as string[] | undefined,
    model: metadata.model as string | undefined,
    color: metadata.color as string | undefined,
    source,
  };
}

/**
 * Simple YAML parser for frontmatter
 */
function parseYAML(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yaml.split("\n");

  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.*)$/);
    if (match) {
      const key = match[1];
      if (!key) continue;
      const value = match[2] ?? "";

      // Parse arrays
      if (value.startsWith("[")) {
        try {
          result[key] = JSON.parse(value);
        } catch {
          result[key] = value;
        }
      }
      // Parse booleans
      else if (value === "true") {
        result[key] = true;
      } else if (value === "false") {
        result[key] = false;
      }
      // Parse numbers
      else if (/^\d+$/.test(value)) {
        result[key] = parseInt(value, 10);
      } else if (/^\d+\.\d+$/.test(value)) {
        result[key] = parseFloat(value);
      }
      // Strings
      else {
        result[key] = value;
      }
    }
  }

  return result;
}

// ============================================
// SKILL LOADER
// ============================================

export class SkillManager {
  private skills = new Map<string, SkillFile>();

  /**
   * Load skills from a directory
   */
  loadFromDirectory(dir: string, source: "built-in" | "project" | "user" = "project"): number {
    if (!existsSync(dir)) {
      return 0;
    }

    let count = 0;
    const files = readdirSync(dir);

    for (const file of files) {
      if (file.endsWith(".md")) {
        const skill = parseSkillFile(join(dir, file), source);
        if (skill) {
          this.skills.set(skill.name, skill);
          count++;
        }
      }
    }

    return count;
  }

  /**
   * Get a skill by name
   */
  get(name: string): SkillFile | undefined {
    return this.skills.get(name);
  }

  /**
   * Get all skills
   */
  getAll(): SkillFile[] {
    return Array.from(this.skills.values());
  }

  /**
   * Check if skill exists
   */
  has(name: string): boolean {
    return this.skills.has(name);
  }

  /**
   * Get skill names
   */
  getNames(): string[] {
    return Array.from(this.skills.keys());
  }
}

// ============================================
// SKILL PROMPT BUILDER
// ============================================

/**
 * Build the skill prompt that gets injected into system prompt
 */
export function buildSkillPrompt(skill: SkillFile): string {
  return `
<skill-loading>
You are operating with the "${skill.name}" skill loaded.

${skill.description ? `Description: ${skill.description}\n` : ""}
${skill.prompt}
</skill-loading>
`.trim();
}

// ============================================
// BUILT-IN SKILLS
// ============================================

export const builtInSkills: SkillFile[] = [
  {
    path: "built-in://commit",
    name: "commit",
    description: "Create a git commit with the staged changes",
    prompt: `Analyze the staged changes and create a git commit.

Steps:
1. Run \`git diff --staged\` to see staged changes
2. Run \`git log --oneline -5\` to understand commit message style
3. Create a commit message following conventional commits format
4. Include "Co-Authored-By: Claude <noreply@anthropic.com>" if applicable
5. Run \`git commit\` with the message`,
    tools: ["Bash"],
    model: "sonnet",
    source: "built-in",
  },
  {
    path: "built-in://review-pr",
    name: "review-pr",
    description: "Review a pull request",
    prompt: `Review the current pull request and provide feedback.

Steps:
1. Use \`gh pr view\` to get PR details
2. Use \`gh pr diff\` to see the changes
3. Analyze the code for:
   - Bugs and potential issues
   - Code quality and style
   - Test coverage
   - Documentation
4. Provide constructive feedback
5. Approve or request changes as appropriate`,
    tools: ["Bash"],
    model: "sonnet",
    source: "built-in",
  },
  {
    path: "built-in://mcp-builder",
    name: "mcp-builder",
    description: "Guide for creating MCP servers",
    prompt: `Help the user build MCP (Model Context Protocol) servers.

MCP servers enable LLMs to interact with external services through well-designed tools.

Key concepts:
1. Use FastMCP (Python) or MCP SDK (TypeScript)
2. Define tools with clear input schemas
3. Return structured content
4. Handle errors gracefully

Transport types:
- stdio: Local process communication
- HTTP: REST API with JSON-RPC
- SSE: Server-Sent Events for streaming
- WebSocket: Bidirectional communication`,
    tools: ["Read", "Write", "Edit", "Bash"],
    model: "sonnet",
    source: "built-in",
  },
  {
    path: "built-in://claude-hooks",
    name: "claude-hooks",
    description: "Guide for Claude Code hooks",
    prompt: `Help the user configure Claude Code hooks.

Hooks are user-defined shell commands that execute at specific points during Claude Code's lifecycle.

Available events:
- PreToolUse: Before a tool executes
- PostToolUse: After a tool succeeds
- PostToolUseFailure: After a tool fails
- Stop: When agent stops
- UserPromptSubmit: When user submits prompt
- SessionStart/SessionEnd: Session lifecycle

Exit codes:
- 0: Allow execution
- 1: Deny and show stderr
- 2: Block silently`,
    tools: ["Read", "Write", "Edit"],
    model: "sonnet",
    source: "built-in",
  },
];

// ============================================
// SKILL INVOCATION
// ============================================

/**
 * Check if a message is a skill invocation
 */
export function isSkillInvocation(message: string): string | null {
  const match = message.match(/^\/(\w+)(?:\s+(.*))?$/);
  return match?.[1] ?? null;
}

/**
 * Get skill invocation arguments
 */
export function getSkillArgs(message: string): string {
  const match = message.match(/^\/\w+\s+(.*)$/);
  return match?.[1] ?? "";
}
