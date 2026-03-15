/**
 * Teammate System - Multi-agent coordination
 *
 * Messaging Architecture:
 * - File-based inbox system for cross-process communication
 * - Messages stored as JSON files in ~/.claude/teams/{team}/inboxes/{teammateId}/
 * - pending/ for unread messages, processed/ for read messages
 *
 * Claude Code Parity Features:
 * - Template-based spawning: Load MCP servers + CLAUDE.md + permissions from templates
 * - Tool restrictions: allowedTools/disallowedTools per teammate
 * - Worktree isolation: Optional git worktree for safe parallel work
 * - Agent types: general-purpose, Explore, Plan, claude-code-guide
 */

import type { Teammate, Team, TeammateMessage, TeammateStatus, ToolRestrictions, TeammateWorktreeConfig, AgentType } from "../schemas/index.js";
import type { TeammateTemplate } from "../ecosystem/presets/types.js";
import { spawn } from "child_process";
import { mkdirSync, rmSync, existsSync, readFileSync, readdirSync, renameSync, writeFileSync, statSync } from "fs";
import { join, basename } from "path";
import { templateManager } from "../ecosystem/presets/index.js";
import { execSync } from "child_process";

// ============================================
// FILE-BASED INBOX TYPES
// ============================================

/**
 * Message type enum matching TeammateMessageSchema
 */
type MessageType = "task" | "status" | "query" | "response" | "notification" | "broadcast" | "direct";

/**
 * Message priority enum matching TeammateMessageSchema
 */
type MessagePriority = "low" | "normal" | "high";

/**
 * Stored message in file-based inbox system
 * Contains all fields from TeammateMessage plus storage metadata
 */
interface StoredMessage {
  // Core message fields (from TeammateMessage)
  id: string;
  from: string;
  to?: string | string[];
  type: MessageType;
  content: string;
  timestamp: number;
  priority?: MessagePriority;
  // Storage metadata
  teamName: string;
  createdAt: number;
  readAt?: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the ID of a teammate (handles both id and teammateId fields)
 */
function getTeammateId(teammate: Teammate): string {
  return teammate.id || teammate.teammateId || teammate.name;
}

// ============================================
// TEAMMATE MANAGER
// ============================================

export class TeammateManager {
  private teams = new Map<string, Team>();
  private teammates = new Map<string, Teammate>();
  private storagePath: string;

  constructor(storagePath = "~/.claude/teams") {
    this.storagePath = storagePath.replace("~", process.env.HOME || "");
    // Ensure storage directory exists
    if (!existsSync(this.storagePath)) {
      mkdirSync(this.storagePath, { recursive: true });
    }
    // Load existing teams from disk
    this.loadTeams();
    // Ensure inbox directories exist for all teammates
    this.ensureInboxDirectories();
  }

  // ============================================
  // INBOX PATH HELPERS
  // ============================================

  private getInboxPath(teamName: string, teammateId: string): string {
    return join(this.storagePath, teamName, "inboxes", teammateId);
  }

  private getPendingPath(teamName: string, teammateId: string): string {
    return join(this.getInboxPath(teamName, teammateId), "pending");
  }

  private getProcessedPath(teamName: string, teammateId: string): string {
    return join(this.getInboxPath(teamName, teammateId), "processed");
  }

  private ensureInboxDirectories(): void {
    for (const team of this.teams.values()) {
      for (const teammate of team.teammates) {
        const pendingPath = this.getPendingPath(team.name, getTeammateId(teammate));
        const processedPath = this.getProcessedPath(team.name, getTeammateId(teammate));

        if (!existsSync(pendingPath)) {
          mkdirSync(pendingPath, { recursive: true });
        }
        if (!existsSync(processedPath)) {
          mkdirSync(processedPath, { recursive: true });
        }
      }
    }
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
      this.teammates.set(getTeammateId(teammate), teammate);
    }

    // Create inbox directories for all teammates
    for (const teammate of config.teammates) {
      const pendingPath = this.getPendingPath(config.name, getTeammateId(teammate));
      const processedPath = this.getProcessedPath(config.name, getTeammateId(teammate));

      if (!existsSync(pendingPath)) {
        mkdirSync(pendingPath, { recursive: true });
      }
      if (!existsSync(processedPath)) {
        mkdirSync(processedPath, { recursive: true });
      }
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
        this.teammates.delete(getTeammateId(teammate));
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

  /**
   * Add a new teammate to an existing team
   */
  addTeammate(teamName: string, teammate: Teammate): boolean {
    const team = this.teams.get(teamName);
    if (!team) return false;

    // Add to team
    team.teammates.push(teammate);
    this.teammates.set(getTeammateId(teammate), teammate);

    // Create inbox directories
    const pendingPath = this.getPendingPath(teamName, getTeammateId(teammate));
    const processedPath = this.getProcessedPath(teamName, getTeammateId(teammate));

    if (!existsSync(pendingPath)) {
      mkdirSync(pendingPath, { recursive: true });
    }
    if (!existsSync(processedPath)) {
      mkdirSync(processedPath, { recursive: true });
    }

    // Persist updated team
    this.persistTeam(team).catch((err) => {
      console.error(`Failed to persist team ${teamName}:`, err);
    });

    return true;
  }

  /**
   * Remove a teammate from a team
   */
  removeTeammate(teamName: string, teammateId: string): boolean {
    const team = this.teams.get(teamName);
    if (!team) return false;

    // Remove from team
    const index = team.teammates.findIndex(t => t.teammateId === teammateId);
    if (index === -1) return false;

    team.teammates.splice(index, 1);
    this.teammates.delete(teammateId);

    // Keep inbox directory for history (don't delete)

    // Persist updated team
    this.persistTeam(team).catch((err) => {
      console.error(`Failed to persist team ${teamName}:`, err);
    });

    return true;
  }

  // ============================================
  // SPAWNING
  // ============================================

  /**
   * Spawn a teammate with optional template support
   * Templates auto-populate MCP servers, CLAUDE.md, and tool restrictions
   */
  async spawnTeammate(
    teammate: Teammate,
    options: {
      session?: string;
      workingDir?: string;
      /** Enable worktree isolation for safe parallel work */
      useWorktree?: boolean;
    } = {}
  ): Promise<void> {
    const { session, workingDir = process.cwd(), useWorktree } = options;

    // Apply template if specified
    if (teammate.template) {
      await this.applyTemplateToTeammate(teammate);
    }

    // Apply agent type tool restrictions (Claude Code parity)
    if (teammate.agentType) {
      this.applyAgentTypeRestrictions(teammate);
    }

    // Setup worktree isolation if requested
    let actualWorkingDir = workingDir;
    if (useWorktree || teammate.worktree?.enabled) {
      actualWorkingDir = await this.setupWorktree(teammate, workingDir);
    }

    // Check if inside tmux
    const insideTmux = !!process.env.TMUX;

    if (!insideTmux) {
      // Spawn in new terminal
      await this.spawnInTerminal(teammate, { session, workingDir: actualWorkingDir });
    } else {
      // Spawn in tmux pane
      await this.spawnInTmux(teammate, { session, workingDir: actualWorkingDir });
    }

    this.updateTeammateStatus(getTeammateId(teammate), "in_progress");
  }

  /**
   * Spawn a teammate from a template (Claude Code parity)
   * Auto-loads MCP servers, CLAUDE.md, and permissions from the template
   */
  async spawnFromTemplate(
    templateName: string,
    options: {
      name?: string;
      teamName: string;
      task?: string;
      session?: string;
      workingDir?: string;
      useWorktree?: boolean;
    }
  ): Promise<Teammate | null> {
    const template = templateManager.get(templateName);
    if (!template) {
      console.error(`Template not found: ${templateName}`);
      return null;
    }

    // Create teammate from template
    const teammate: Teammate = {
      id: generateTeammateId(),
      name: options.name || template.name,
      role: template.name,
      description: template.description,
      teamName: options.teamName,
      template: templateName,
      status: "pending",
      prompt: options.task,
      mcpServers: template.mcpServers,
      claudeMd: template.claudeMd,
      toolRestrictions: template.permissions,
      allowedTools: template.permissions?.allowedTools,
      disallowedTools: template.permissions?.disallowedTools,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Add to team
    this.addTeammate(options.teamName, teammate);

    // Spawn
    await this.spawnTeammate(teammate, {
      session: options.session,
      workingDir: options.workingDir,
      useWorktree: options.useWorktree,
    });

    return teammate;
  }

  /**
   * Apply template to an existing teammate
   */
  private async applyTemplateToTeammate(teammate: Teammate): Promise<void> {
    const template = templateManager.get(teammate.template!);
    if (!template) return;

    // Merge MCP servers
    if (template.mcpServers) {
      teammate.mcpServers = {
        ...teammate.mcpServers,
        ...template.mcpServers,
      };
    }

    // Merge CLAUDE.md
    if (template.claudeMd && !teammate.claudeMd) {
      teammate.claudeMd = template.claudeMd;
    }

    // Merge tool restrictions
    if (template.permissions) {
      teammate.toolRestrictions = {
        allowedTools: [
          ...(teammate.toolRestrictions?.allowedTools ?? []),
          ...(template.permissions.allowedTools ?? []),
        ],
        disallowedTools: [
          ...(teammate.toolRestrictions?.disallowedTools ?? []),
          ...(template.permissions.disallowedTools ?? []),
        ],
      };
      teammate.allowedTools = teammate.toolRestrictions.allowedTools;
      teammate.disallowedTools = teammate.toolRestrictions.disallowedTools;
    }
  }

  /**
   * Apply tool restrictions based on agent type (Claude Code parity)
   */
  private applyAgentTypeRestrictions(teammate: Teammate): void {
    const restrictions: Record<AgentType, string[]> = {
      // General-purpose: Full tool access (no restrictions)
      "general-purpose": [],

      // Explore: Read-only, can only use Glob, Grep, Read, Bash (read-only)
      "Explore": ["Glob", "Grep", "Read", "Bash"],

      // Plan: Can use Glob, Grep, Read, LSP for analysis
      "Plan": ["Glob", "Grep", "Read", "LSP"],

      // claude-code-guide: Full tool access for helping users
      "claude-code-guide": [],
    };

    const allowed = restrictions[teammate.agentType!];
    if (allowed.length > 0) {
      teammate.allowedTools = allowed;
      teammate.toolRestrictions = {
        ...teammate.toolRestrictions,
        allowedTools: allowed,
      };
    }
  }

  /**
   * Setup git worktree for isolated agent work (Claude Code parity)
   */
  private async setupWorktree(teammate: Teammate, baseDir: string): Promise<string> {
    const worktreeConfig: TeammateWorktreeConfig = teammate.worktree || { enabled: true, createBranch: true };
    const branchName = worktreeConfig.branch || `agent/${teammate.name}-${getTeammateId(teammate).slice(0, 8)}`;
    const worktreePath = worktreeConfig.path || join(baseDir, `.worktrees`, getTeammateId(teammate));

    try {
      // Check if we're in a git repo
      execSync("git rev-parse --git-dir", { cwd: baseDir, stdio: "pipe" });

      // Create worktree
      const createBranchFlag = worktreeConfig.createBranch ? "-b" : "";
      const cmd = worktreeConfig.createBranch
        ? `git worktree add ${createBranchFlag} ${branchName} ${worktreePath}`
        : `git worktree add ${worktreePath} ${branchName}`;

      execSync(cmd, { cwd: baseDir, stdio: "pipe" });

      // Store worktree info
      teammate.worktree = {
        ...worktreeConfig,
        enabled: true,
        branch: branchName,
        path: worktreePath,
      };

      return worktreePath;
    } catch (error) {
      console.error(`Failed to create worktree for ${teammate.name}:`, error);
      return baseDir; // Fallback to base directory
    }
  }

  /**
   * Cleanup worktree after teammate is done
   */
  async cleanupWorktree(teammate: Teammate): Promise<void> {
    if (!teammate.worktree?.path) return;

    try {
      execSync(`git worktree remove ${teammate.worktree.path}`, { stdio: "pipe" });
    } catch {
      // Worktree may have uncommitted changes, force remove
      try {
        execSync(`git worktree remove --force ${teammate.worktree.path}`, { stdio: "pipe" });
      } catch {
        // Ignore errors
      }
    }
  }

  /**
   * Check if a tool is allowed for a teammate
   */
  isToolAllowed(teammateId: string, toolName: string): boolean {
    const teammate = this.teammates.get(teammateId);
    if (!teammate) return true; // No teammate = no restrictions

    const restrictions = teammate.toolRestrictions;
    if (!restrictions) return true;

    // Check disallowed first
    if (restrictions.disallowedTools?.includes(toolName)) {
      return false;
    }

    // If allowedTools is set, tool must be in the list
    if (restrictions.allowedTools && restrictions.allowedTools.length > 0) {
      return restrictions.allowedTools.includes(toolName);
    }

    return true;
  }

  /**
   * Get tool restrictions for a teammate
   */
  getToolRestrictions(teammateId: string): ToolRestrictions | null {
    const teammate = this.teammates.get(teammateId);
    return teammate?.toolRestrictions || null;
  }

  private async spawnInTerminal(
    teammate: Teammate,
    options: { session?: string; workingDir: string }
  ): Promise<void> {
    // Build claude command with template support
    const args = [
      "bun",
      "run",
      "src/interfaces/ui/terminal/cli/index.ts",
      "--teammate-mode",
      "--agent-id",
      getTeammateId(teammate),
      "--agent-name",
      teammate.name,
      "--team-name",
      teammate.teamName,
      "--agent-color",
      teammate.color || "blue",
    ];

    // Add template reference if available
    if (teammate.template) {
      args.push("--template", teammate.template);
    }

    // Add allowed tools if restricted
    if (teammate.allowedTools?.length) {
      args.push("--allowed-tools", teammate.allowedTools.join(","));
    }

    // Add agent type if set
    if (teammate.agentType) {
      args.push("--agent-type", teammate.agentType);
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

    // Build command with template support
    const args = [
      "bun",
      "run",
      "src/interfaces/ui/terminal/cli/index.ts",
      "--teammate-mode",
      "--agent-id",
      getTeammateId(teammate),
      "--agent-name",
      teammate.name,
      "--team-name",
      teammate.teamName,
      "--agent-color",
      teammate.color || "blue",
    ];

    // Add template reference if available
    if (teammate.template) {
      args.push("--template", teammate.template);
    }

    // Add allowed tools if restricted
    if (teammate.allowedTools?.length) {
      args.push("--allowed-tools", teammate.allowedTools.join(","));
    }

    // Add agent type if set
    if (teammate.agentType) {
      args.push("--agent-type", teammate.agentType);
    }

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
  // MESSAGING (FILE-BASED)
  // ============================================

  /**
   * Get the team name for a teammate
   */
  private getTeamNameForTeammate(teammateId: string): string | undefined {
    const teammate = this.teammates.get(teammateId);
    return teammate?.teamName;
  }

  /**
   * Write a message to a teammate's file-based inbox
   */
  private writeMessageToInbox(
    teamName: string,
    toId: string,
    msg: StoredMessage
  ): void {
    const pendingPath = this.getPendingPath(teamName, toId);

    // Ensure inbox exists
    if (!existsSync(pendingPath)) {
      mkdirSync(pendingPath, { recursive: true });
    }

    // Write message as JSON file
    const msgPath = join(pendingPath, `${msg.id}.json`);
    writeFileSync(msgPath, JSON.stringify(msg, null, 2));
  }

  /**
   * Read all pending messages from a teammate's inbox
   */
  private readPendingMessages(teamName: string, teammateId: string): StoredMessage[] {
    const pendingPath = this.getPendingPath(teamName, teammateId);
    const messages: StoredMessage[] = [];

    if (!existsSync(pendingPath)) {
      return messages;
    }

    try {
      const files = readdirSync(pendingPath)
        .filter(f => f.endsWith('.json'))
        .sort(); // Oldest first (by filename timestamp)

      for (const file of files) {
        try {
          const msgPath = join(pendingPath, file);
          const content = readFileSync(msgPath, 'utf-8');
          const msg = JSON.parse(content) as StoredMessage;
          messages.push(msg);
        } catch {
          // Skip malformed messages
        }
      }
    } catch {
      // Directory read error
    }

    return messages;
  }

  /**
   * Move a message from pending to processed
   */
  private markMessageProcessed(teamName: string, teammateId: string, msgId: string): void {
    const pendingPath = this.getPendingPath(teamName, teammateId);
    const processedPath = this.getProcessedPath(teamName, teammateId);

    const pendingFile = join(pendingPath, `${msgId}.json`);
    const processedFile = join(processedPath, `${msgId}.json`);

    if (existsSync(pendingFile)) {
      // Ensure processed directory exists
      if (!existsSync(processedPath)) {
        mkdirSync(processedPath, { recursive: true });
      }

      // Update message with readAt timestamp
      try {
        const content = readFileSync(pendingFile, 'utf-8');
        const msg = JSON.parse(content) as StoredMessage;
        msg.readAt = Date.now();
        writeFileSync(processedFile, JSON.stringify(msg, null, 2));
        rmSync(pendingFile);
      } catch {
        // If update fails, just move the file
        try {
          renameSync(pendingFile, processedFile);
        } catch {
          // Ignore move errors
        }
      }
    }
  }

  /**
   * Broadcast a message to all teammates in a team
   */
  broadcast(teamName: string, message: string, fromId?: string): void {
    const team = this.teams.get(teamName);
    if (!team) return;

    const baseMsg: Omit<StoredMessage, 'id' | 'teamName' | 'createdAt'> = {
      type: "broadcast",
      from: fromId || "system",
      content: message,
      timestamp: Date.now(),
    };

    // Write message to each teammate's inbox
    for (const teammate of team.teammates) {
      // Don't send to sender
      if (fromId && getTeammateId(teammate) === fromId) continue;

      const msg: StoredMessage = {
        ...baseMsg,
        id: this.generateMessageId(),
        teamName,
        createdAt: Date.now(),
        to: getTeammateId(teammate),
      };

      this.writeMessageToInbox(teamName, getTeammateId(teammate), msg);
    }
  }

  /**
   * Send a direct message to a specific teammate
   */
  sendDirect(toId: string, fromId: string, message: string): void {
    const teamName = this.getTeamNameForTeammate(toId);
    if (!teamName) return;

    const msg: StoredMessage = {
      id: this.generateMessageId(),
      type: "direct",
      from: fromId,
      to: toId,
      content: message,
      timestamp: Date.now(),
      teamName,
      createdAt: Date.now(),
    };

    this.writeMessageToInbox(teamName, toId, msg);
  }

  /**
   * Inject a message as if it came from the user (for teammate integration)
   * This integrates messages into conversation flow
   */
  injectUserMessageToTeammate(toId: string, message: string): void {
    const teamName = this.getTeamNameForTeammate(toId);
    if (!teamName) return;

    const msg: StoredMessage = {
      id: this.generateMessageId(),
      type: "notification", // Use notification type for injected messages
      from: "user",
      to: toId,
      content: message,
      timestamp: Date.now(),
      teamName,
      createdAt: Date.now(),
    };

    this.writeMessageToInbox(teamName, toId, msg);
  }

  /**
   * Retrieve and mark all messages as processed for a teammate
   * Returns messages in chronological order (oldest first)
   */
  getMessages(teammateId: string): TeammateMessage[] {
    const teamName = this.getTeamNameForTeammate(teammateId);
    if (!teamName) return [];

    const storedMsgs = this.readPendingMessages(teamName, teammateId);

    // Mark all as processed
    for (const msg of storedMsgs) {
      this.markMessageProcessed(teamName, teammateId, msg.id);
    }

    // Convert to TeammateMessage format
    return storedMsgs.map(msg => ({
      type: msg.type,
      from: msg.from,
      to: msg.to,
      content: msg.content,
      timestamp: msg.timestamp,
    }));
  }

  /**
   * Check if a teammate has pending messages
   */
  hasMessages(teammateId: string): boolean {
    const teamName = this.getTeamNameForTeammate(teammateId);
    if (!teamName) return false;

    const pendingPath = this.getPendingPath(teamName, teammateId);

    if (!existsSync(pendingPath)) return false;

    try {
      const files = readdirSync(pendingPath);
      return files.some(f => f.endsWith('.json'));
    } catch {
      return false;
    }
  }

  /**
   * Peek at messages without marking them as processed
   */
  peekMessages(teammateId: string): TeammateMessage[] {
    const teamName = this.getTeamNameForTeammate(teammateId);
    if (!teamName) return [];

    const storedMsgs = this.readPendingMessages(teamName, teammateId);

    return storedMsgs.map(msg => ({
      type: msg.type,
      from: msg.from,
      to: msg.to,
      content: msg.content,
      timestamp: msg.timestamp,
    }));
  }

  /**
   * Clear all pending messages for a teammate (move to processed)
   */
  clearMessages(teammateId: string): void {
    const teamName = this.getTeamNameForTeammate(teammateId);
    if (!teamName) return;

    const pendingPath = this.getPendingPath(teamName, teammateId);

    if (!existsSync(pendingPath)) return;

    const storedMsgs = this.readPendingMessages(teamName, teammateId);
    for (const msg of storedMsgs) {
      this.markMessageProcessed(teamName, teammateId, msg.id);
    }
  }

  /**
   * Get count of pending messages for a teammate
   */
  getMessageCount(teammateId: string): number {
    const teamName = this.getTeamNameForTeammate(teammateId);
    if (!teamName) return 0;

    const pendingPath = this.getPendingPath(teamName, teammateId);

    if (!existsSync(pendingPath)) return 0;

    try {
      const files = readdirSync(pendingPath);
      return files.filter(f => f.endsWith('.json')).length;
    } catch {
      return 0;
    }
  }

  /**
   * Get processed messages (history) for a teammate
   */
  getProcessedMessages(teammateId: string, limit = 100): StoredMessage[] {
    const teamName = this.getTeamNameForTeammate(teammateId);
    if (!teamName) return [];

    const processedPath = this.getProcessedPath(teamName, teammateId);
    const messages: StoredMessage[] = [];

    if (!existsSync(processedPath)) {
      return messages;
    }

    try {
      const files = readdirSync(processedPath)
        .filter(f => f.endsWith('.json'))
        .sort()
        .reverse() // Newest first
        .slice(0, limit);

      for (const file of files) {
        try {
          const msgPath = join(processedPath, file);
          const content = readFileSync(msgPath, 'utf-8');
          messages.push(JSON.parse(content) as StoredMessage);
        } catch {
          // Skip malformed
        }
      }
    } catch {
      // Directory read error
    }

    return messages;
  }

  /**
   * Clean up old processed messages (older than maxAgeMs)
   */
  cleanupProcessedMessages(teammateId: string, maxAgeMs = 7 * 24 * 60 * 60 * 1000): number {
    const teamName = this.getTeamNameForTeammate(teammateId);
    if (!teamName) return 0;

    const processedPath = this.getProcessedPath(teamName, teammateId);
    const cutoff = Date.now() - maxAgeMs;
    let deleted = 0;

    if (!existsSync(processedPath)) return 0;

    try {
      const files = readdirSync(processedPath).filter(f => f.endsWith('.json'));

      for (const file of files) {
        try {
          const msgPath = join(processedPath, file);
          const content = readFileSync(msgPath, 'utf-8');
          const msg = JSON.parse(content) as StoredMessage;

          if (msg.readAt && msg.readAt < cutoff) {
            rmSync(msgPath);
            deleted++;
          }
        } catch {
          // Skip errors
        }
      }
    } catch {
      // Directory read error
    }

    return deleted;
  }

  /**
   * Wait for all teammates in a team to become idle
   * Returns when all teammates have status 'idle', 'completed', or 'failed'
   */
  async waitForTeammatesToBecomeIdle(
    teamName: string,
    options: { timeout?: number; pollInterval?: number } = {}
  ): Promise<{ success: boolean; timedOut: boolean; statuses: Record<string, TeammateStatus> }> {
    const { timeout = 60000, pollInterval = 1000 } = options;
    const startTime = Date.now();
    const idleStatuses: TeammateStatus[] = ['idle', 'completed', 'failed'];

    while (true) {
      const team = this.teams.get(teamName);
      if (!team) {
        return { success: false, timedOut: false, statuses: {} };
      }

      const statuses: Record<string, TeammateStatus> = {};
      let allIdle = true;

      for (const teammate of team.teammates) {
        const status = teammate.status ?? "pending";
        statuses[getTeammateId(teammate)] = status;
        if (!idleStatuses.includes(status)) {
          allIdle = false;
        }
      }

      if (allIdle) {
        return { success: true, timedOut: false, statuses };
      }

      // Check timeout
      if (Date.now() - startTime > timeout) {
        return { success: false, timedOut: true, statuses };
      }

      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  /**
   * Get inbox statistics for a teammate
   */
  getInboxStats(teammateId: string): {
    pending: number;
    processed: number;
    oldestPending?: number;
    newestPending?: number;
  } {
    const teamName = this.getTeamNameForTeammate(teammateId);
    if (!teamName) return { pending: 0, processed: 0 };

    const pendingPath = this.getPendingPath(teamName, teammateId);
    const processedPath = this.getProcessedPath(teamName, teammateId);

    let pending = 0;
    let processed = 0;
    let oldestPending: number | undefined;
    let newestPending: number | undefined;

    // Count pending
    if (existsSync(pendingPath)) {
      try {
        const files = readdirSync(pendingPath).filter(f => f.endsWith('.json'));
        pending = files.length;

        for (const file of files) {
          try {
            const msgPath = join(pendingPath, file);
            const content = readFileSync(msgPath, 'utf-8');
            const msg = JSON.parse(content) as StoredMessage;

            if (!oldestPending || msg.createdAt < oldestPending) {
              oldestPending = msg.createdAt;
            }
            if (!newestPending || msg.createdAt > newestPending) {
              newestPending = msg.createdAt;
            }
          } catch {
            // Skip
          }
        }
      } catch {
        // Skip
      }
    }

    // Count processed
    if (existsSync(processedPath)) {
      try {
        const files = readdirSync(processedPath).filter(f => f.endsWith('.json'));
        processed = files.length;
      } catch {
        // Skip
      }
    }

    return { pending, processed, oldestPending, newestPending };
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
            this.teammates.set(getTeammateId(teammate), teammate);
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
    role: "architect",
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
    role: "implementer",
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
    role: "reviewer",
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
    role: "tester",
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

// Export types
export type { StoredMessage };
