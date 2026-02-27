/**
 * Teammate System - Multi-agent coordination
 * Based on Claude Code binary analysis
 */

import type { Teammate, Team, TeammateMessage, TeammateStatus } from "../types/index.js";
import { spawn } from "child_process";
import { mkdirSync, rmSync, existsSync, readFileSync } from "fs";
import { join } from "path";

// ============================================
// TEAMMATE MANAGER
// ============================================

export class TeammateManager {
  private teams = new Map<string, Team>();
  private teammates = new Map<string, Teammate>();
  private messageQueue = new Map<string, TeammateMessage[]>();
  private storagePath: string;

  constructor(storagePath = "~/.claude/teams") {
    this.storagePath = storagePath.replace("~", process.env.HOME || "");
    // Ensure storage directory exists
    if (!existsSync(this.storagePath)) {
      mkdirSync(this.storagePath, { recursive: true });
    }
    // Load existing teams from disk
    this.loadTeams();
  }

  // ============================================
  // TEAM MANAGEMENT
  // ============================================

  createTeam(config: Omit<Team, "status">): Team {
    const team: Team = {
      ...config,
      status: "active",
    };

    this.teams.set(config.name, team);

    // Store teammates
    for (const teammate of config.teammates) {
      this.teammates.set(teammate.teammateId, teammate);
    }

    // Persist to disk (fire and forget)
    this.persistTeam(team).catch((err) => {
      console.error(`Failed to persist team ${config.name}:`, err);
    });

    return team;
  }

  getTeam(name: string): Team | undefined {
    return this.teams.get(name);
  }

  listTeams(): Team[] {
    return Array.from(this.teams.values());
  }

  deleteTeam(name: string): void {
    const team = this.teams.get(name);
    if (team) {
      // Remove teammates and their message queues
      for (const teammate of team.teammates) {
        this.teammates.delete(teammate.teammateId);
        this.messageQueue.delete(teammate.teammateId);
      }
      this.teams.delete(name);

      // Delete team directory from disk
      const teamDir = join(this.storagePath, name);
      try {
        rmSync(teamDir, { recursive: true, force: true });
      } catch (err) {
        console.error(`Failed to delete team directory ${teamDir}:`, err);
      }
    }
  }

  // ============================================
  // TEAMMATE MANAGEMENT
  // ============================================

  getTeammate(id: string): Teammate | undefined {
    return this.teammates.get(id);
  }

  updateTeammateStatus(id: string, status: TeammateStatus): void {
    const teammate = this.teammates.get(id);
    if (teammate) {
      teammate.status = status;
    }
  }

  // ============================================
  // SPAWNING
  // ============================================

  async spawnTeammate(
    teammate: Teammate,
    options: {
      session?: string;
      workingDir?: string;
    } = {}
  ): Promise<void> {
    const { session, workingDir = process.cwd() } = options;

    // Check if inside tmux
    const insideTmux = !!process.env.TMUX;

    if (!insideTmux) {
      // Spawn in new terminal
      await this.spawnInTerminal(teammate, { session, workingDir });
    } else {
      // Spawn in tmux pane
      await this.spawnInTmux(teammate, { session, workingDir });
    }

    this.updateTeammateStatus(teammate.teammateId, "in_progress");
  }

  private async spawnInTerminal(
    teammate: Teammate,
    options: { session?: string; workingDir: string }
  ): Promise<void> {
    // Build claude command
    const args = [
      "bun",
      "run",
      "src/cli.ts",
      "--teammate-mode",
      "--agent-id",
      teammate.teammateId,
      "--agent-name",
      teammate.name,
      "--team-name",
      teammate.teamName,
      "--agent-color",
      teammate.color,
    ];

    if (teammate.planModeRequired) {
      args.push("--permission-mode", "plan");
    }

    // Use AppleScript on macOS to open new Terminal
    if (process.platform === "darwin") {
      const script = `
        tell application "Terminal"
          do script "cd ${options.workingDir} && ${args.join(" ")}"
          activate
        end tell
      `;

      spawn("osascript", ["-e", script]);
    } else {
      // Linux: use xterm or similar
      spawn("xterm", ["-e", args.join(" ")]);
    }
  }

  private async spawnInTmux(
    teammate: Teammate,
    options: { session?: string; workingDir: string }
  ): Promise<void> {
    const sessionName = options.session || process.env.TMUX?.split(",")[0]?.split(":")[0] || "claude";

    // Create new pane
    await this.tmuxCommand(["split-window", "-t", sessionName, "-c", options.workingDir]);

    // Get pane ID
    const paneId = await this.tmuxCommand(["display-message", "-p", "#{pane_id}"]);

    if (paneId) {
      teammate.paneId = paneId.trim();
    }

    // Send claude command
    const args = [
      "bun",
      "run",
      "src/cli.ts",
      "--teammate-mode",
      "--agent-id",
      teammate.teammateId,
      "--agent-name",
      teammate.name,
      "--team-name",
      teammate.teamName,
    ];

    await this.tmuxCommand(["send-keys", "-t", teammate.paneId || "", args.join(" "), "Enter"]);
  }

  private async tmuxCommand(args: string[]): Promise<string> {
    return new Promise((resolve) => {
      const proc = spawn("tmux", args);
      let output = "";

      proc.stdout?.on("data", (data: Buffer) => {
        output += data.toString();
      });

      proc.on("close", () => {
        resolve(output);
      });
    });
  }

  // ============================================
  // MESSAGING
  // ============================================

  broadcast(teamName: string, message: string, fromId?: string): void {
    const team = this.teams.get(teamName);
    if (!team) return;

    const msg: TeammateMessage = {
      type: "broadcast",
      from: fromId || "system",
      content: message,
      timestamp: Date.now(),
    };

    // Add message to each teammate's queue
    for (const teammate of team.teammates) {
      // Don't send to sender
      if (fromId && teammate.teammateId === fromId) continue;

      const queue = this.messageQueue.get(teammate.teammateId) || [];
      queue.push(msg);
      this.messageQueue.set(teammate.teammateId, queue);
    }
  }

  sendDirect(toId: string, fromId: string, message: string): void {
    const msg: TeammateMessage = {
      type: "direct",
      from: fromId,
      to: toId,
      content: message,
      timestamp: Date.now(),
    };

    // Add message to recipient's queue
    const queue = this.messageQueue.get(toId) || [];
    queue.push(msg);
    this.messageQueue.set(toId, queue);
  }

  /**
   * Retrieve and clear all messages for a teammate
   */
  getMessages(teammateId: string): TeammateMessage[] {
    const messages = this.messageQueue.get(teammateId) || [];
    this.messageQueue.delete(teammateId);
    return messages;
  }

  /**
   * Check if a teammate has pending messages
   */
  hasMessages(teammateId: string): boolean {
    const queue = this.messageQueue.get(teammateId);
    return queue !== undefined && queue.length > 0;
  }

  /**
   * Peek at messages without clearing them
   */
  peekMessages(teammateId: string): TeammateMessage[] {
    return this.messageQueue.get(teammateId) || [];
  }

  /**
   * Clear messages for a specific teammate
   */
  clearMessages(teammateId: string): void {
    this.messageQueue.delete(teammateId);
  }

  /**
   * Get count of pending messages for a teammate
   */
  getMessageCount(teammateId: string): number {
    return this.messageQueue.get(teammateId)?.length || 0;
  }

  // ============================================
  // PERSISTENCE
  // ============================================

  /**
   * Persist a team configuration to disk
   */
  private async persistTeam(team: Team): Promise<void> {
    const teamDir = join(this.storagePath, team.name);
    const configPath = join(teamDir, "config.json");

    // Ensure directory exists
    if (!existsSync(teamDir)) {
      mkdirSync(teamDir, { recursive: true });
    }

    // Write .gitkeep to ensure directory is tracked
    await Bun.write(join(teamDir, ".gitkeep"), "");

    // Build config object
    const config = {
      name: team.name,
      description: team.description,
      teammates: team.teammates,
      taskListId: team.taskListId,
      status: team.status,
      coordination: team.coordination,
      updatedAt: Date.now(),
    };

    // Write config as formatted JSON
    await Bun.write(configPath, JSON.stringify(config, null, 2));
  }

  /**
   * Load all teams from disk at startup
   * Uses synchronous operations for constructor compatibility
   */
  loadTeams(): void {
    // Use Bun's glob to find team configs
    const glob = new Bun.Glob("**/config.json");

    try {
      const files = Array.from(glob.scanSync(this.storagePath));
      for (const file of files) {
        try {
          const filePath = join(this.storagePath, file);
          const content = Bun.file(filePath);

          // Check if file exists and is readable (sync check via size)
          const size = content.size;
          if (size === 0) {
            continue;
          }

          // Read file synchronously using readFileSync
          // Bun.file().text() is async, so we use fs.readFileSync for sync operation
          const text = readFileSync(filePath, "utf-8");
          const config = JSON.parse(text);

          // Validate required fields - skip if missing teammates or name
          if (!config.name || !config.teammates || !Array.isArray(config.teammates)) {
            // Skip configs that don't match our expected structure
            continue;
          }

          const team: Team = {
            name: config.name,
            description: config.description || "",
            teammates: config.teammates,
            taskListId: config.taskListId || "",
            status: config.status || "active",
            coordination: config.coordination || {
              dependencyOrder: [],
              communicationProtocol: "broadcast",
              taskAssignmentStrategy: "manual",
            },
          };

          this.teams.set(team.name, team);

          // Index teammates
          for (const teammate of team.teammates) {
            this.teammates.set(teammate.teammateId, teammate);
          }
        } catch (error) {
          // Silently skip malformed configs
        }
      }
    } catch (error) {
      // Storage path may not exist yet - that's okay
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        // Ignore permission errors too
      }
    }
  }

  /**
   * Persist all teams to disk (useful for shutdown)
   */
  async persistAllTeams(): Promise<void> {
    const promises = Array.from(this.teams.values()).map((team) => this.persistTeam(team));
    await Promise.all(promises);
  }
}

// ============================================
// TEAMMATE TEMPLATES
// ============================================

export const teammateTemplates = {
  /**
   * Architect - Plans and designs
   */
  architect: (teamName: string): Omit<Teammate, "teammateId"> => ({
    name: "architect",
    teamName,
    color: "blue",
    prompt: `You are an architect on the ${teamName} team.
Your role is to design and plan the technical architecture.
Focus on:
- System design and component relationships
- API contracts and interfaces
- Data models and schemas
- Trade-offs and design decisions`,
    planModeRequired: true,
    status: "pending",
  }),

  /**
   * Implementer - Writes code
   */
  implementer: (teamName: string): Omit<Teammate, "teammateId"> => ({
    name: "implementer",
    teamName,
    color: "green",
    prompt: `You are an implementer on the ${teamName} team.
Your role is to write clean, working code based on the architecture.
Focus on:
- Implementing the designed architecture
- Writing tests
- Following coding standards
- Handling edge cases`,
    planModeRequired: false,
    status: "pending",
  }),

  /**
   * Reviewer - Reviews code
   */
  reviewer: (teamName: string): Omit<Teammate, "teammateId"> => ({
    name: "reviewer",
    teamName,
    color: "yellow",
    prompt: `You are a code reviewer on the ${teamName} team.
Your role is to review code changes and provide feedback.
Focus on:
- Code quality and readability
- Potential bugs and issues
- Performance considerations
- Test coverage`,
    planModeRequired: false,
    status: "pending",
  }),

  /**
   * Tester - Tests features
   */
  tester: (teamName: string): Omit<Teammate, "teammateId"> => ({
    name: "tester",
    teamName,
    color: "orange",
    prompt: `You are a tester on the ${teamName} team.
Your role is to ensure features work correctly.
Focus on:
- Writing comprehensive tests
- Finding edge cases
- Verifying requirements
- Reporting bugs`,
    planModeRequired: false,
    status: "pending",
  }),
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export function generateTeammateId(): string {
  return `teammate_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createTeammate(
  config: Omit<Teammate, "teammateId" | "status">
): Teammate {
  return {
    ...config,
    teammateId: generateTeammateId(),
    status: "pending",
  };
}
