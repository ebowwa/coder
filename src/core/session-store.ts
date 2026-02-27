/**
 * Session Store - Persistent conversation history
 * Saves to ~/.claude/sessions/{session-id}.jsonl
 */

import { homedir } from "os";
import { join } from "path";
import type {
  Message,
  QueryMetrics,
  ContentBlock,
  ToolUseBlock,
  ToolResultBlock,
} from "../types/index.js";

// ============================================
// SESSION TYPES
// ============================================

export interface SessionMetadata {
  id: string;
  created: number;
  updated: number;
  model: string;
  workingDirectory: string;
  agentName?: string;
  agentColor?: string;
  teamName?: string;
}

export interface SessionMessage {
  type: "message";
  timestamp: number;
  data: Message;
}

export interface SessionToolUse {
  type: "tool_use";
  timestamp: number;
  toolId: string;
  toolName: string;
  input: Record<string, unknown>;
  result?: string;
  isError?: boolean;
}

export interface SessionMetrics {
  type: "metrics";
  timestamp: number;
  data: QueryMetrics;
}

export interface SessionContext {
  type: "context";
  timestamp: number;
  workingDirectory: string;
  gitBranch?: string;
  systemPrompt?: string;
}

export type SessionEntry =
  | SessionMetadata
  | SessionMessage
  | SessionToolUse
  | SessionMetrics
  | SessionContext;

export interface SessionSummary {
  id: string;
  created: number;
  updated: number;
  model: string;
  messageCount: number;
  totalCost: number;
  totalTokens: { input: number; output: number };
  firstMessage?: string;
  workingDirectory: string;
}

export interface LoadedSession {
  metadata: SessionMetadata;
  messages: Message[];
  tools: SessionToolUse[];
  metrics: QueryMetrics[];
  context: SessionContext | null;
}

// ============================================
// SESSION STORE CLASS
// ============================================

export class SessionStore {
  private sessionsDir: string;
  private currentSessionId: string | null = null;
  private currentSessionFile: string | null = null;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(sessionsDir?: string) {
    this.sessionsDir = sessionsDir ?? join(homedir(), ".claude", "sessions");
  }

  /**
   * Initialize the sessions directory
   */
  async init(): Promise<void> {
    try {
      await Bun.write(join(this.sessionsDir, ".gitkeep"), "");
    } catch {
      // Directory might already exist
    }
  }

  /**
   * Generate a new session ID
   */
  generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 8);
    return `${timestamp}-${random}`;
  }

  /**
   * Create a new session
   */
  async createSession(options: {
    model: string;
    workingDirectory: string;
    agentName?: string;
    agentColor?: string;
    teamName?: string;
  }): Promise<string> {
    await this.init();

    const sessionId = this.generateSessionId();
    this.currentSessionId = sessionId;
    this.currentSessionFile = join(this.sessionsDir, `${sessionId}.jsonl`);

    const metadata: SessionMetadata = {
      id: sessionId,
      created: Date.now(),
      updated: Date.now(),
      model: options.model,
      workingDirectory: options.workingDirectory,
      agentName: options.agentName,
      agentColor: options.agentColor,
      teamName: options.teamName,
    };

    await this.appendEntry(metadata);

    // Write context entry
    const context: SessionContext = {
      type: "context",
      timestamp: Date.now(),
      workingDirectory: options.workingDirectory,
    };
    await this.appendEntry(context);

    return sessionId;
  }

  /**
   * Resume an existing session
   */
  async resumeSession(sessionId: string): Promise<LoadedSession | null> {
    const sessionFile = join(this.sessionsDir, `${sessionId}.jsonl`);

    try {
      const content = await Bun.file(sessionFile).text();
      if (!content) {
        return null;
      }

      const lines = content.trim().split("\n");
      const entries: SessionEntry[] = [];

      for (const line of lines) {
        try {
          entries.push(JSON.parse(line) as SessionEntry);
        } catch {
          // Skip malformed lines
        }
      }

      return this.parseSessionEntries(entries);
    } catch {
      return null;
    }
  }

  /**
   * Parse session entries into structured session
   */
  private parseSessionEntries(entries: SessionEntry[]): LoadedSession {
    let metadata: SessionMetadata | null = null;
    const messages: Message[] = [];
    const tools: SessionToolUse[] = [];
    const metrics: QueryMetrics[] = [];
    let context: SessionContext | null = null;

    for (const entry of entries) {
      // Metadata doesn't have a type field
      if (!("type" in entry) && "id" in entry && "created" in entry) {
        metadata = entry as SessionMetadata;
        continue;
      }

      // Other entries have a type field
      if ("type" in entry) {
        const typedEntry = entry as SessionMessage | SessionToolUse | SessionMetrics | SessionContext;
        switch (typedEntry.type) {
          case "message":
            messages.push((typedEntry as SessionMessage).data);
            break;
          case "tool_use":
            tools.push(typedEntry as SessionToolUse);
            break;
          case "metrics":
            metrics.push((typedEntry as SessionMetrics).data);
            break;
          case "context":
            context = typedEntry as SessionContext;
            break;
        }
      }
    }

    if (!metadata) {
      // Create default metadata if missing
      metadata = {
        id: "unknown",
        created: Date.now(),
        updated: Date.now(),
        model: "claude-sonnet-4-6",
        workingDirectory: process.cwd(),
      };
    }

    return {
      metadata,
      messages,
      tools,
      metrics,
      context,
    };
  }

  /**
   * Append an entry to the current session
   */
  private async appendEntry(entry: SessionEntry | SessionMetadata): Promise<void> {
    if (!this.currentSessionFile) {
      return;
    }

    // Queue writes to ensure they happen in order
    this.writeQueue = this.writeQueue.then(async () => {
      const line = JSON.stringify(entry) + "\n";
      const file = Bun.file(this.currentSessionFile!);
      const existing = await file.exists() ? await file.text() : "";
      await Bun.write(this.currentSessionFile!, existing + line);
    });

    await this.writeQueue;
  }

  /**
   * Save a message to the session
   */
  async saveMessage(message: Message): Promise<void> {
    const entry: SessionMessage = {
      type: "message",
      timestamp: Date.now(),
      data: message,
    };
    await this.appendEntry(entry);
    await this.updateTimestamp();
  }

  /**
   * Save a tool use to the session
   */
  async saveToolUse(
    toolId: string,
    toolName: string,
    input: Record<string, unknown>,
    result?: string,
    isError?: boolean
  ): Promise<void> {
    const entry: SessionToolUse = {
      type: "tool_use",
      timestamp: Date.now(),
      toolId,
      toolName,
      input,
      result,
      isError,
    };
    await this.appendEntry(entry);
  }

  /**
   * Save metrics to the session
   */
  async saveMetrics(metrics: QueryMetrics): Promise<void> {
    const entry: SessionMetrics = {
      type: "metrics",
      timestamp: Date.now(),
      data: metrics,
    };
    await this.appendEntry(entry);
  }

  /**
   * Update session timestamp
   */
  private async updateTimestamp(): Promise<void> {
    // Update the metadata file's updated timestamp
    // This is done by rewriting the first line
    if (!this.currentSessionFile || !this.currentSessionId) {
      return;
    }

    // For simplicity, we'll just note the update in a separate call
    // The full implementation would rewrite the metadata line
  }

  /**
   * List recent sessions
   */
  async listSessions(limit: number = 20): Promise<SessionSummary[]> {
    await this.init();

    const dir = Bun.file(this.sessionsDir);
    const sessions: SessionSummary[] = [];

    try {
      // Read directory contents using glob
      const glob = new Bun.Glob("*.jsonl");
      const files = [...glob.scanSync(this.sessionsDir)];

      // Sort by modification time (newest first)
      const fileStats = await Promise.all(
        files.map(async (file) => {
          const fullPath = join(this.sessionsDir, file);
          const stat = await Bun.file(fullPath).stat();
          return { file, fullPath, mtime: stat?.mtime ?? new Date(0) };
        })
      );

      fileStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      // Parse each session file for summary
      for (const { file, fullPath } of fileStats.slice(0, limit)) {
        const sessionId = file.replace(".jsonl", "");
        const summary = await this.getSessionSummary(sessionId, fullPath);
        if (summary) {
          sessions.push(summary);
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }

    return sessions;
  }

  /**
   * Get a summary of a specific session
   */
  private async getSessionSummary(
    sessionId: string,
    filePath?: string
  ): Promise<SessionSummary | null> {
    const sessionFile = filePath ?? join(this.sessionsDir, `${sessionId}.jsonl`);

    try {
      const content = await Bun.file(sessionFile).text();
      if (!content) {
        return null;
      }

      const lines = content.trim().split("\n");
      let metadata: SessionMetadata | null = null;
      let messageCount = 0;
      let totalCost = 0;
      let totalInput = 0;
      let totalOutput = 0;
      let firstMessage: string | undefined;

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);

          // Check for metadata (no type field but has id)
          if (entry.id && entry.created) {
            metadata = entry;
          } else if (entry.type === "message") {
            messageCount++;
            const msg = entry.data as Message;
            if (!firstMessage && msg.role === "user") {
              const textBlock = msg.content.find(
                (b: ContentBlock) => b.type === "text"
              );
              if (textBlock && "text" in textBlock) {
                firstMessage = textBlock.text.slice(0, 100);
                if (textBlock.text.length > 100) {
                  firstMessage += "...";
                }
              }
            }
          } else if (entry.type === "metrics") {
            totalCost += entry.data.costUSD;
            totalInput += entry.data.usage.input_tokens;
            totalOutput += entry.data.usage.output_tokens;
          }
        } catch {
          // Skip malformed lines
        }
      }

      if (!metadata) {
        return null;
      }

      return {
        id: sessionId,
        created: metadata.created,
        updated: metadata.updated,
        model: metadata.model,
        messageCount,
        totalCost,
        totalTokens: { input: totalInput, output: totalOutput },
        firstMessage,
        workingDirectory: metadata.workingDirectory,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get the current session ID
   */
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  /**
   * Export session to a file
   */
  async exportSession(
    sessionId: string,
    format: "jsonl" | "json" | "markdown",
    outputPath?: string
  ): Promise<string> {
    const session = await this.resumeSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    let content: string;
    let defaultExt: string;

    switch (format) {
      case "jsonl": {
        const sessionFile = join(this.sessionsDir, `${sessionId}.jsonl`);
        content = await Bun.file(sessionFile).text();
        defaultExt = "jsonl";
        break;
      }

      case "json": {
        content = JSON.stringify(session, null, 2);
        defaultExt = "json";
        break;
      }

      case "markdown": {
        content = this.sessionToMarkdown(session);
        defaultExt = "md";
        break;
      }

      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    const outputPath_ =
      outputPath ?? join(process.cwd(), `session-${sessionId}.${defaultExt}`);
    await Bun.write(outputPath_, content);

    return outputPath_;
  }

  /**
   * Convert session to markdown format
   */
  private sessionToMarkdown(session: LoadedSession): string {
    const lines: string[] = [];

    // Header
    lines.push(`# Session: ${session.metadata.id}`);
    lines.push("");
    lines.push(`**Created:** ${new Date(session.metadata.created).toISOString()}`);
    lines.push(`**Model:** ${session.metadata.model}`);
    lines.push(`**Working Directory:** ${session.metadata.workingDirectory}`);
    lines.push("");

    // Messages
    lines.push("## Conversation");
    lines.push("");

    for (const message of session.messages) {
      const role = message.role === "user" ? "**User**" : "**Claude**";
      lines.push(`### ${role}`);
      lines.push("");

      for (const block of message.content) {
        if (block.type === "text") {
          lines.push(block.text);
          lines.push("");
        } else if (block.type === "tool_use") {
          const tool = block as ToolUseBlock;
          lines.push(`\`\`\`tool:${tool.name}`);
          lines.push(JSON.stringify(tool.input, null, 2));
          lines.push("```");
          lines.push("");
        } else if (block.type === "tool_result") {
          const result = block as ToolResultBlock;
          lines.push(`**Result**${result.is_error ? " (error)" : ""}:`);
          lines.push("```");
          lines.push(
            typeof result.content === "string"
              ? result.content
              : JSON.stringify(result.content, null, 2)
          );
          lines.push("```");
          lines.push("");
        }
      }
    }

    // Metrics summary
    if (session.metrics.length > 0) {
      lines.push("## Metrics");
      lines.push("");

      const totalCost = session.metrics.reduce((sum, m) => sum + m.costUSD, 0);
      const totalInput = session.metrics.reduce(
        (sum, m) => sum + m.usage.input_tokens,
        0
      );
      const totalOutput = session.metrics.reduce(
        (sum, m) => sum + m.usage.output_tokens,
        0
      );

      lines.push(`- **Total Cost:** $${totalCost.toFixed(4)}`);
      lines.push(`- **Total Input Tokens:** ${totalInput.toLocaleString()}`);
      lines.push(`- **Total Output Tokens:** ${totalOutput.toLocaleString()}`);
      lines.push(`- **API Calls:** ${session.metrics.length}`);
    }

    return lines.join("\n");
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    const sessionFile = join(this.sessionsDir, `${sessionId}.jsonl`);
    try {
      const file = Bun.file(sessionFile);
      if (await file.exists()) {
        // Bun doesn't have a direct delete, use fs
        const { unlink } = await import("fs/promises");
        await unlink(sessionFile);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format a session summary for display
 */
export function formatSessionSummary(session: SessionSummary): string {
  const created = new Date(session.created);
  const updated = new Date(session.updated);
  const age = formatRelativeTime(updated);

  const lines: string[] = [];

  // Session ID and age
  lines.push(`\x1b[1m${session.id}\x1b[0m (${age})`);

  // Model and message count
  lines.push(`  Model: ${session.model} | Messages: ${session.messageCount}`);

  // Cost and tokens
  const cost = session.totalCost < 0.01
    ? `$${session.totalCost.toFixed(4)}`
    : `$${session.totalCost.toFixed(2)}`;
  lines.push(`  Cost: ${cost} | Tokens: ${session.totalTokens.input.toLocaleString()} in, ${session.totalTokens.output.toLocaleString()} out`);

  // First message preview
  if (session.firstMessage) {
    lines.push(`  Preview: ${session.firstMessage}`);
  }

  // Working directory
  lines.push(`  Directory: ${session.workingDirectory}`);

  return lines.join("\n");
}

/**
 * Format relative time
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

/**
 * Print sessions list for CLI
 */
export function printSessionsList(sessions: SessionSummary[]): void {
  if (sessions.length === 0) {
    console.log("No sessions found.");
    console.log("\nStart a new conversation to create a session.");
    return;
  }

  console.log(`\x1b[1mRecent Sessions (${sessions.length})\x1b[0m\n`);

  for (const session of sessions) {
    console.log(formatSessionSummary(session));
    console.log("");
  }

  console.log("To resume a session:");
  console.log("  claude-remake --resume <session-id>");
}
