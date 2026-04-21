/**
 * Skill System - Custom agent behaviors
 *
 * Sources:
 * 1. Built-in skills (hardcoded)
 * 2. Project skills (.coder/skills/*.md)
 * 3. Marketplace skills (API with skills-2025-10-02 beta header)
 */

import type { SkillDefinition, ClaudeModel } from "../../schemas/index.js";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join, extname } from "path";

// Re-export marketplace client types and classes
export type {
  MarketplaceSkill,
  SkillVersion,
  ListSkillsOptions,
  ListSkillsResponse,
} from "./skills-client.js";

export {
  SkillsClient,
  SkillsCache,
  SkillResolver,
} from "./skills-client.js";

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
  private marketplaceClient: InstanceType<typeof import("./skills-client.js").SkillsClient> | null = null;

  /**
   * Enable marketplace integration with API key
   */
  enableMarketplace(apiKey: string, baseUrl?: string): void {
    const { SkillsClient } = require("./skills-client.js");
    this.marketplaceClient = new SkillsClient(apiKey, baseUrl);
  }

  /**
   * Register a skill programmatically (used by ecosystem plugins)
   */
  register(skill: SkillFile): void {
    this.skills.set(skill.name, skill);
  }

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
   * Load built-in skills
   */
  loadBuiltIn(): void {
    for (const skill of builtInSkills) {
      this.skills.set(skill.name, skill);
    }
  }

  /**
   * Get a skill by name (checks local first, then marketplace)
   */
  async getAsync(name: string): Promise<SkillFile | undefined> {
    // Check local cache first
    const local = this.skills.get(name);
    if (local) return local;

    // Try marketplace
    if (this.marketplaceClient) {
      try {
        const { SkillsCache } = require("./skills-client.js");
        const cache = new SkillsCache();
        const cached = cache.get(name);
        if (cached) {
          return this.marketplaceSkillToLocal(cached);
        }

        const marketplace = await this.marketplaceClient.getByName(name);
        if (marketplace) {
          cache.set(marketplace);
          return this.marketplaceSkillToLocal(marketplace);
        }
      } catch (error) {
        console.error(`Failed to fetch skill "${name}" from marketplace:`, error);
      }
    }

    return undefined;
  }

  /**
   * Get a skill by name (sync - local only)
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

  /**
   * Search marketplace for skills
   */
  async searchMarketplace(query: string): Promise<SkillFile[]> {
    if (!this.marketplaceClient) return [];

    try {
      const { skills } = await this.marketplaceClient.list({ search: query });
      return skills.map(s => this.marketplaceSkillToLocal(s));
    } catch (error) {
      console.error("Failed to search marketplace:", error);
      return [];
    }
  }

  /**
   * Convert marketplace skill to local format
   */
  private marketplaceSkillToLocal(skill: import("./skills-client.js").MarketplaceSkill): SkillFile {
    return {
      path: `marketplace://${skill.id}`,
      name: skill.name,
      description: skill.description,
      prompt: skill.prompt,
      tools: skill.tools,
      model: skill.model,
      source: "built-in", // Treat marketplace as built-in
    };
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
    path: "built-in://hooks",
    name: "hooks",
    description: "Guide for Coder hooks",
    prompt: `Help the user configure Coder hooks.

Hooks are user-defined shell commands that execute at specific points during Coder's lifecycle.

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
  {
    path: "built-in://publish",
    name: "publish",
    description: "Development workflow: validate, bump, build, publish, install",
    prompt: `Execute the @ebowwa/coder development and publishing workflow.

## Workflow Steps (in order)

1. **Validate TypeScript**
   \`\`\`bash
   bunx tsc --noEmit
   \`\`\`
   Fix any errors before proceeding.

2. **Bump Version**
   \`\`\`bash
   npm version patch --no-git-tag-version   # 0.7.93 → 0.7.94
   npm version minor --no-git-tag-version   # 0.7.93 → 0.8.0
   npm version major --no-git-tag-version   # 0.7.93 → 1.0.0
   \`\`\`

3. **Build**
   \`\`\`bash
   bun run build
   \`\`\`
   This runs: build:native → build:ts → build:types → link

4. **Publish to npm**
   \`\`\`bash
   npm publish --access public
   \`\`\`

5. **Install Globally**
   \`\`\`bash
   npm install -g @ebowwa/coder@latest
   # or specific version
   npm install -g @ebowwa/coder@0.7.94
   \`\`\`

6. **Verify**
   \`\`\`bash
   coder --version
   \`\`\`

## Package Structure
- \`packages/src/\` - Source code (maintained)
- \`dist/\` - Distribution (generated, published)
- \`native/\` - Compiled Rust binaries

## Key Rules
- NEVER use workspace:* dependencies
- ALWAYS include both src/ and dist/ in packages
- Source code must never be deleted
- Scope: @ebowwa/* for all packages

## Summary Table
| Step | Command | Purpose |
|------|---------|---------|
| Validate | \`bunx tsc --noEmit\` | Check TypeScript |
| Bump | \`npm version patch\` | Increment version |
| Build | \`bun run build\` | Compile all |
| Publish | \`npm publish --access public\` | Push to npm |
| Install | \`npm install -g @ebowwa/coder\` | Global access |
| Verify | \`coder --version\` | Confirm version |`,
    tools: ["Bash", "Read"],
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
