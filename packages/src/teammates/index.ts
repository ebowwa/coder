/**
 * Teammate System - Multi-agent coordination
 *
 * Messaging Architecture:
 * - File-based inbox system for cross-process communication
 * - Messages stored as JSON files in ~/.claude/teams/{team}/inboxes/{teammateId}/
 * - pending/ for unread messages, processed/ for read messages
 */

import type { Teammate, Team, TeammateMessage, TeammateStatus } from "../types/index.js";
import { spawn } from "child_process";
import { mkdirSync, rmSync, existsSync, readFileSync, readdirSync, renameSync, writeFileSync, statSync } from "fs";
import { join, basename } from "path";
import {
  parseTeam,
  parseTeammate,
  parseTeammateMessage,
  parseStoredMessage,
  safeParseTeam,
  safeParseTeammate,
  safeParseTeammateMessage,
  safeParseStoredMessage,
  ValidationError,
  sanitizeForFilePath,
} from "./schemas.js";

// ============================================
// FILE-BASED INBOX TYPES
// ============================================

interface StoredMessage extends TeammateMessage {
  id: string;
  teamName: string;
  createdAt: number;
  readAt?: number;
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

  /**
   * Get safe directory name for a team (prevents ENAMETOOLONG)
   */
  private getSafeTeamDir(teamName: string): string {
    return sanitizeForFilePath(teamName);
  }

  /**
   * Get safe directory name for a teammate (prevents ENAMETOOLONG)
   */
  private getSafeTeammateDir(teammateId: string): string {
    return sanitizeForFilePath(teammateId);
  }

  private getInboxPath(teamName: string, teammateId: string): string {
    const safeTeamName = this.getSafeTeamDir(teamName);
    const safeTeammateId = this.getSafeTeammateDir(teammateId);
    return join(this.storagePath, safeTeamName, "inboxes", safeTeammateId);
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
        const pendingPath = this.getPendingPath(team.name, teammate.teammateId);
        const processedPath = this.getProcessedPath(team.name, teammate.teammateId);

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
      this.teammates.set(teammate.teammateId, teammate);
    }

    // Create inbox directories for all teammates
    for (const teammate of config.teammates) {
      const pendingPath = this.getPendingPath(config.name, teammate.teammateId);
      const processedPath = this.getProcessedPath(config.name, teammate.teammateId);

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
        this.teammates.delete(teammate.teammateId);
      }
      this.teams.delete(name);

      // Delete team directory from disk (use safe path)
      const teamDir = join(this.storagePath, this.getSafeTeamDir(name));
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
    this.teammates.set(teammate.teammateId, teammate);

    // Create inbox directories
    const pendingPath = this.getPendingPath(teamName, teammate.teammateId);
    const processedPath = this.getProcessedPath(teamName, teammate.teammateId);

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
      "src/interfaces/ui/terminal/cli/index.ts",
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
      "src/interfaces/ui/terminal/cli/index.ts",
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
   * Validates messages using Zod schema, skipping malformed ones
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

          // Parse JSON first, then validate
          let parsed: unknown;
          try {
            parsed = JSON.parse(content);
          } catch {
            continue; // Skip non-JSON files
          }

          const result = safeParseStoredMessage(parsed);

          if (result.success && result.data) {
            messages.push(result.data);
          } else {
            // Log validation error but skip this message
            console.error(`Failed to parse message from ${msgPath}:`, result.error);
          }
        } catch (err) {
          // Skip malformed messages
          console.error(`Error reading message file:`, err);
        }
      }
    } catch (err) {
      // Directory read error
      console.error(`Error reading pending messages:`, err);
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
      if (fromId && teammate.teammateId === fromId) continue;

      const msg: StoredMessage = {
        ...baseMsg,
        id: this.generateMessageId(),
        teamName,
        createdAt: Date.now(),
        to: teammate.teammateId,
      };

      this.writeMessageToInbox(teamName, teammate.teammateId, msg);
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
        statuses[teammate.teammateId] = teammate.status;
        if (!idleStatuses.includes(teammate.status)) {
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
    const teamDir = join(this.storagePath, this.getSafeTeamDir(team.name));
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
   * Validates all data using Zod schemas
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

          // Parse JSON first, then validate with Zod schema
          let parsed: unknown;
          try {
            parsed = JSON.parse(text);
          } catch (parseError) {
            console.error(`Failed to parse JSON from ${filePath}:`, parseError);
            continue;
          }

          // Validate using Zod schema
          const result = safeParseTeam(parsed);

          if (!result.success || !result.data) {
            // Log validation error but skip this config
            console.error(`Failed to load team config from ${filePath}:`, result.error);
            continue;
          }

          const team = result.data;
          this.teams.set(team.name, team);

          // Index teammates
          for (const teammate of team.teammates) {
            this.teammates.set(teammate.teammateId, teammate);
          }
        } catch (error) {
          // Silently skip malformed configs
          console.error(`Error reading team config:`, error);
        }
      }
    } catch (error) {
      // Storage path may not exist yet - that's okay
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error("Error loading teams:", error);
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

// Export types
export type { StoredMessage };

// Re-export runner module
export {
  TeammateModeRunner,
  getTeammateRunner,
  setTeammateRunner,
  isTeammateModeActive,
  type TeammateModeConfig,
  type TeammateModeState,
} from "./runner.js";

// Re-export coordination module
export {
  CoordinationManager,
  createCoordinationMessage,
  parseCoordinationMessage,
  type CoordinationEvent,
  type CoordinationEventType,
  type CoordinationCallback,
  type CoordinationConfig,
  type ProgressReport,
  type FileClaim,
} from "./coordination.js";
