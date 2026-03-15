/**
 * Agent Tool - Spawn subagents with templates (Claude Code parity)
 *
 * This tool enables spawning specialized subagents with:
 * - Template-based configuration (MCP servers, CLAUDE.md, permissions)
 * - Tool restrictions (allowedTools/disallowedTools)
 * - Worktree isolation for safe parallel work
 * - Multiple agent types (general-purpose, Explore, Plan, claude-code-guide)
 *
 * Usage:
 *   Agent({
 *     description: "Find all TypeScript files",
 *     prompt: "Search the codebase...",
 *     subagent_type: "Explore",
 *     isolation: "worktree"
 *   })
 */

import type { ToolDefinition, ToolResult } from "../../schemas/index.js";
import type { AgentType, ToolRestrictions } from "../../schemas/teammates.zod.js";
import type { ChildProcess, SpawnOptions } from "child_process";
import { TeammateManager, generateTeammateId } from "../../teammates/index.js";
import { templateManager } from "../presets/index.js";
import { spawn, execSync } from "child_process";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

// ============================================
// AGENT TOOL TYPES
// ============================================

export interface AgentToolInput {
  /** Short description of what the agent will do */
  description: string;
  /** The task prompt for the agent */
  prompt: string;
  /** Agent type: general-purpose, Explore, Plan, claude-code-guide */
  subagent_type?: AgentType;
  /** Template name to use (developer, quant, robotics, infrastructure) */
  template?: string;
  /** Isolation mode: worktree for safe parallel work */
  isolation?: "worktree" | "none";
  /** Resume a previous agent by ID */
  resume?: string;
  /** Model override */
  model?: string;
  /** Run in background (don't wait for completion) */
  run_in_background?: boolean;
}

export interface AgentToolResult extends ToolResult {
  /** Agent ID for tracking */
  agentId?: string;
  /** Session ID if spawned */
  sessionId?: string;
  /** Worktree path if isolated */
  worktreePath?: string;
}

// ============================================
// AGENT TYPE TOOL RESTRICTIONS (Claude Code parity)
// ============================================

const AGENT_TYPE_RESTRICTIONS: Record<AgentType, ToolRestrictions> = {
  "general-purpose": {
    // No restrictions - full tool access
  },
  "Explore": {
    allowedTools: ["Glob", "Grep", "Read", "Bash"],
  },
  "Plan": {
    allowedTools: ["Glob", "Grep", "Read", "LSP"],
  },
  "claude-code-guide": {
    // Full access for helping users
  },
};

// ============================================
// AGENT TOOL IMPLEMENTATION
// ============================================

/**
 * Create the Agent tool definition
 */
export function createAgentTool(
  teammateManager: TeammateManager,
  options: {
    workingDirectory: string;
    teamName?: string;
    apiKey: string;
  }
): ToolDefinition {
  return {
    name: "Agent",
    description: `Launch a new agent to handle complex, multi-step tasks autonomously.

The Agent tool launches specialized agents (subprocesses) that autonomously handle complex tasks.

When to Use:
- Complex, multi-step tasks that benefit from autonomous handling
- Research tasks requiring multiple rounds of searching/reading
- Parallel execution of independent tasks
- Tasks requiring isolated workspaces

Agent Types:
- general-purpose: Full tool access for any task
- Explore: Read-only exploration (Glob, Grep, Read, Bash only)
- Plan: Planning agent for implementation strategy (Glob, Grep, Read, LSP)
- claude-code-guide: Help with Claude Code features

Templates:
- developer: Coding assistant with git, npm, hetzner MCP servers
- quant: Trading agent with prediction-markets MCP server
- robotics: Fleet operator with hetzner, tailscale MCP servers
- infrastructure: VPS/cloud management with hetzner MCP server

Isolation:
- "worktree": Creates git worktree for safe parallel work
- "none": Uses current working directory

IMPORTANT: This tool spawns autonomous agents. Use run_in_background=true for fire-and-forget tasks.`,

    input_schema: {
      type: "object",
      properties: {
        description: {
          type: "string",
          description: "Short (3-5 word) description of what the agent will do",
        },
        prompt: {
          type: "string",
          description: "The task for the agent to perform",
        },
        subagent_type: {
          type: "string",
          enum: ["general-purpose", "Explore", "Plan", "claude-code-guide"],
          description: "Type of agent to spawn",
        },
        template: {
          type: "string",
          description: "Template name (developer, quant, robotics, infrastructure)",
        },
        isolation: {
          type: "string",
          enum: ["worktree", "none"],
          description: "Isolation mode (default: none)",
        },
        resume: {
          type: "string",
          description: "Resume a previous agent by ID",
        },
        model: {
          type: "string",
          description: "Model override",
        },
        run_in_background: {
          type: "boolean",
          description: "Run in background without waiting",
        },
      },
      required: ["description", "prompt"],
    },

    handler: async (input: AgentToolInput): Promise<AgentToolResult> => {
      const {
        description,
        prompt,
        subagent_type = "general-purpose",
        template,
        isolation = "none",
        resume,
        model,
        run_in_background = false,
      } = input;

      // Generate agent ID
      const agentId = resume || generateTeammateId();

      // Get tool restrictions from agent type
      const typeRestrictions = AGENT_TYPE_RESTRICTIONS[subagent_type];

      // Get template if specified
      let templateConfig = template ? templateManager.get(template) : null;

      // Merge restrictions
      const toolRestrictions: ToolRestrictions = {
        allowedTools: [
          ...(typeRestrictions.allowedTools ?? []),
          ...(templateConfig?.permissions?.allowedTools ?? []),
        ],
        disallowedTools: [
          ...(typeRestrictions.disallowedTools ?? []),
          ...(templateConfig?.permissions?.disallowedTools ?? []),
        ],
      };

      // Setup worktree if isolation requested
      let worktreePath: string | undefined;
      if (isolation === "worktree") {
        worktreePath = await setupWorktree(agentId, options.workingDirectory);
      }

      // Build spawn command
      const spawnArgs = buildSpawnArgs({
        agentId,
        description,
        prompt,
        subagent_type,
        template,
        toolRestrictions,
        worktreePath,
        model,
        teamName: options.teamName,
        apiKey: options.apiKey,
      });

      // Spawn agent
      if (run_in_background) {
        spawnBackgroundAgent(spawnArgs, worktreePath || options.workingDirectory);
        return {
          content: `Agent spawned in background:\n- Agent ID: ${agentId}\n- Type: ${subagent_type}\n- Worktree: ${worktreePath || "none"}`,
          agentId,
          worktreePath,
        };
      }

      // Foreground execution (wait for completion)
      const result = await executeAgentForeground(spawnArgs, worktreePath || options.workingDirectory);

      return {
        content: result,
        agentId,
        worktreePath,
      };
    },
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Setup git worktree for isolated agent work
 */
async function setupWorktree(agentId: string, baseDir: string): Promise<string | undefined> {
  try {
    // Check if in git repo
    execSync("git rev-parse --git-dir", { cwd: baseDir, stdio: "pipe" });

    const branchName = `agent/${agentId}`;
    const worktreePath = join(baseDir, ".worktrees", agentId);

    // Ensure .worktrees directory exists
    const worktreesDir = join(baseDir, ".worktrees");
    if (!existsSync(worktreesDir)) {
      mkdirSync(worktreesDir, { recursive: true });
    }

    // Create worktree
    execSync(`git worktree add -b ${branchName} ${worktreePath}`, {
      cwd: baseDir,
      stdio: "pipe",
    });

    return worktreePath;
  } catch {
    // Not a git repo or worktree creation failed
    return undefined;
  }
}

/**
 * Build spawn arguments for agent
 */
function buildSpawnArgs(config: {
  agentId: string;
  description: string;
  prompt: string;
  subagent_type: AgentType;
  template?: string;
  toolRestrictions: ToolRestrictions;
  worktreePath?: string;
  model?: string;
  teamName?: string;
  apiKey: string;
}): string[] {
  const args = [
    "bun",
    "run",
    "src/interfaces/ui/terminal/cli/index.ts",
    "--teammate-mode",
    "--agent-id",
    config.agentId,
    "--agent-name",
    config.description,
    "--agent-type",
    config.subagent_type,
  ];

  if (config.teamName) {
    args.push("--team-name", config.teamName);
  }

  if (config.template) {
    args.push("--template", config.template);
  }

  if (config.toolRestrictions.allowedTools?.length) {
    args.push("--allowed-tools", config.toolRestrictions.allowedTools.join(","));
  }

  if (config.toolRestrictions.disallowedTools?.length) {
    args.push("--disallowed-tools", config.toolRestrictions.disallowedTools.join(","));
  }

  if (config.model) {
    args.push("--model", config.model);
  }

  // Add the prompt as query
  args.push("-q", config.prompt);

  return args;
}

/**
 * Spawn agent in background
 */
function spawnBackgroundAgent(args: string[], workingDir: string): void {
  if (process.platform === "darwin") {
    const script = `
      tell application "Terminal"
        do script "cd ${workingDir} && ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY || ''} ${args.join(" ")}"
        activate
      end tell
    `;
    spawn("osascript", ["-e", script]);
  } else {
    spawn("xterm", ["-e", args.join(" ")]);
  }
}

/**
 * Execute agent in foreground and wait for result
 */
async function executeAgentForeground(args: string[], workingDir: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
    };

    const command = args[0] || "bun";
    const commandArgs = args.slice(1);

    const proc = spawn(command, commandArgs, {
      cwd: workingDir,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("close", (code: number | null) => {
      if (code === 0) {
        resolve(stdout || "Agent completed successfully");
      } else {
        resolve(`Agent exited with code ${code}\n\nOutput:\n${stdout}\n\nErrors:\n${stderr}`);
      }
    });

    proc.on("error", (err: Error) => {
      reject(err);
    });
  });
}

// ============================================
// EXPORTS
// ============================================

export default createAgentTool;
