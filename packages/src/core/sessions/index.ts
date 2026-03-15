/**
 * Session Store - Composable session management
 * Composes persistence, metadata, and export modules
 */

import { homedir } from "os";
import { join } from "path";
import type {
  Message,
  QueryMetrics,
  ContentBlock,
  ToolUseBlock,
  ToolResultBlock,
} from "../../schemas/index.js";
import type {
  SessionMetadata,
  SessionMessage,
  SessionToolUse,
  SessionMetrics,
  SessionContext,
  SessionEntry,
  SessionCheckpoint,
  LoadedSession,
  SessionSummary,
  SessionFilter,
  SessionEventHandler,
  ExportFormat,
} from "./types.js";
import { SessionPersistence } from "./persistence.js";
import { SessionMetadataManager } from "./metadata.js";
import { SessionExporter } from "./export.js";

// Re-export types for convenience
export * from "./types.js";
export { SessionPersistence } from "./persistence.js";
export { SessionMetadataManager } from "./metadata.js";
export { SessionExporter } from "./export.js";

/**
 * Main SessionStore class
 * Composes persistence, metadata, and export functionality
 */
export class SessionStore {
  private persistence: SessionPersistence;
  private metadataManager: SessionMetadataManager;
  private exporter: SessionExporter;

  private currentSessionId: string | null = null;
  private currentMetadata: SessionMetadata | null = null;
  private eventHandlers: Set<SessionEventHandler> = new Set();

  constructor(sessionsDir?: string) {
    const dir = sessionsDir ?? join(homedir(), ".claude", "sessions");
    this.persistence = new SessionPersistence(dir);
    this.metadataManager = new SessionMetadataManager(this.persistence);
    this.exporter = new SessionExporter(this.persistence);
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Initialize the sessions directory
   */
  async init(): Promise<void> {
    await this.persistence.init();
  }

  /**
   * Get the sessions directory path
   */
  getSessionsDir(): string {
    return this.persistence.getSessionsDir();
  }

  /**
   * Get the file path for a specific session
   */
  getSessionPath(sessionId: string): string {
    return this.persistence.getSessionPath(sessionId);
  }

  // ============================================
  // EVENT HANDLING
  // ============================================

  /**
   * Subscribe to session events
   */
  onEvent(handler: SessionEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  /**
   * Emit a session event
   */
  private async emit(
    type: SessionEventHandler extends (event: infer E) => void ? E : never
  ): Promise<void> {
    const event = { ...type, timestamp: type.timestamp ?? Date.now() };

    await Promise.all(
      [...this.eventHandlers].map((handler) => handler(event))
    );
  }

  // ============================================
  // SESSION CREATION & MANAGEMENT
  // ============================================

  /**
   * Create a new session (or reuse existing empty session)
   */
  async createSession(options: {
    model: string;
    workingDirectory: string;
    agentName?: string;
    agentColor?: string;
    teamName?: string;
  }): Promise<string> {
    await this.init();

    // Try to find an existing empty session to reuse
    const sessions = await this.listSessions(20);
    const emptySession = sessions.find((s) => s.messageCount === 0);

    if (emptySession) {
      // Reuse the empty session
      this.currentSessionId = emptySession.id;
      this.currentMetadata = this.metadataManager.createMetadata({
        id: emptySession.id,
        ...options,
      });

      await this.persistence.append(emptySession.id, this.currentMetadata);

      await this.emit({
        type: "resumed",
        sessionId: emptySession.id,
        timestamp: Date.now(),
        data: { reused: true },
      });

      return emptySession.id;
    }

    // No empty session found, create new
    const sessionId = this.metadataManager.generateId();
    this.currentSessionId = sessionId;
    this.currentMetadata = this.metadataManager.createMetadata({
      id: sessionId,
      ...options,
    });

    await this.persistence.append(sessionId, this.currentMetadata);

    // Write context entry
    const context: SessionContext = {
      type: "context",
      timestamp: Date.now(),
      workingDirectory: options.workingDirectory,
    };
    await this.persistence.append(sessionId, context);

    await this.emit({
      type: "created",
      sessionId,
      timestamp: Date.now(),
      data: this.currentMetadata,
    });

    return sessionId;
  }

  /**
   * Resume an existing session
   */
  async resumeSession(sessionId: string): Promise<LoadedSession | null> {
    const entries = await this.persistence.read(sessionId);

    if (entries.length === 0) {
      return null;
    }

    const session = this.parseEntries(entries);
    session.metadata.id = sessionId; // Ensure ID is set

    this.currentSessionId = sessionId;
    this.currentMetadata = session.metadata;

    await this.emit({
      type: "resumed",
      sessionId,
      timestamp: Date.now(),
      data: session.metadata,
    });

    return session;
  }

  /**
   * Parse session entries into structured session
   */
  private parseEntries(entries: SessionEntry[]): LoadedSession {
    let metadata: SessionMetadata | null = null;
    const messages: Message[] = [];
    const tools: SessionToolUse[] = [];
    const metrics: QueryMetrics[] = [];
    let context: SessionContext | null = null;
    const checkpoints: SessionCheckpoint[] = [];

    for (const entry of entries) {
      // All entries have explicit type field now
      switch (entry.type) {
        case "metadata":
          metadata = entry as SessionMetadata;
          break;
        case "message":
          messages.push((entry as SessionMessage).data);
          break;
        case "tool_use":
          tools.push(entry as SessionToolUse);
          break;
        case "metrics":
          metrics.push((entry as SessionMetrics).data);
          break;
        case "context":
          context = entry as SessionContext;
          break;
        case "checkpoint":
          checkpoints.push(entry as SessionCheckpoint);
          break;
      }
    }

    if (!metadata) {
      metadata = this.metadataManager.createMetadata({
        model: "claude-sonnet-4-6",
        workingDirectory: process.cwd(),
      });
    }

    return {
      metadata,
      messages,
      tools,
      metrics,
      context,
      checkpoints,
    };
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    const deleted = await this.persistence.delete(sessionId);

    if (deleted) {
      await this.emit({
        type: "deleted",
        sessionId,
        timestamp: Date.now(),
      });

      if (this.currentSessionId === sessionId) {
        this.currentSessionId = null;
        this.currentMetadata = null;
      }
    }

    return deleted;
  }

  // ============================================
  // DATA SAVING
  // ============================================

  /**
   * Save a message to the current session
   */
  async saveMessage(message: Message): Promise<void> {
    if (!this.currentSessionId) {
      throw new Error("No active session");
    }

    const entry: SessionMessage = {
      type: "message",
      timestamp: Date.now(),
      data: message,
    };

    await this.persistence.append(this.currentSessionId, entry);

    await this.emit({
      type: "message_saved",
      sessionId: this.currentSessionId,
      timestamp: Date.now(),
      data: message,
    });
  }

  /**
   * Save a tool use to the current session
   */
  async saveToolUse(
    toolId: string,
    toolName: string,
    input: Record<string, unknown>,
    result?: string,
    isError?: boolean
  ): Promise<void> {
    if (!this.currentSessionId) {
      throw new Error("No active session");
    }

    const entry: SessionToolUse = {
      type: "tool_use",
      timestamp: Date.now(),
      toolId,
      toolName,
      input,
      result,
      isError,
    };

    await this.persistence.append(this.currentSessionId, entry);
  }

  /**
   * Save metrics to the current session
   */
  async saveMetrics(metrics: QueryMetrics): Promise<void> {
    if (!this.currentSessionId) {
      throw new Error("No active session");
    }

    const entry: SessionMetrics = {
      type: "metrics",
      timestamp: Date.now(),
      data: metrics,
    };

    await this.persistence.append(this.currentSessionId, entry);

    // Update running totals in metadata
    if (this.currentMetadata) {
      this.currentMetadata.totalCost =
        (this.currentMetadata.totalCost ?? 0) + metrics.costUSD;
      this.currentMetadata.totalTokens = {
        input:
          (this.currentMetadata.totalTokens?.input ?? 0) +
          metrics.usage.input_tokens,
        output:
          (this.currentMetadata.totalTokens?.output ?? 0) +
          metrics.usage.output_tokens,
      };
    }

    await this.emit({
      type: "metrics_saved",
      sessionId: this.currentSessionId,
      timestamp: Date.now(),
      data: metrics,
    });
  }

  // ============================================
  // LISTING & QUERYING
  // ============================================

  /**
   * List recent sessions
   */
  async listSessions(limit: number = 20, filter?: SessionFilter): Promise<SessionSummary[]> {
    await this.init();

    const files = await this.persistence.listFiles();

    // Get modification times for sorting
    const modTimes = await this.persistence.getModificationTimes(files);

    // Sort by modification time (newest first)
    const sortedFiles = files.sort((a, b) => {
      const timeA = modTimes.get(a)?.getTime() ?? 0;
      const timeB = modTimes.get(b)?.getTime() ?? 0;
      return timeB - timeA;
    });

    // Parse summaries
    const sessions: SessionSummary[] = [];

    for (const sessionId of sortedFiles.slice(0, limit * 2)) {
      const summary = await this.metadataManager.getSummary(sessionId);
      if (summary) {
        sessions.push(summary);
      }
    }

    // Apply filter if provided
    const filtered = filter
      ? this.metadataManager.filterSessions(sessions, filter)
      : sessions;

    // Sort by last activity
    const sorted = this.metadataManager.sortSessions(
      filtered,
      "lastActivity",
      "desc"
    );

    return sorted.slice(0, limit);
  }

  /**
   * Get session summary by ID
   */
  async getSessionSummary(sessionId: string): Promise<SessionSummary | null> {
    return this.metadataManager.getSummary(sessionId);
  }

  /**
   * Find empty sessions
   */
  async findEmptySessions(): Promise<SessionSummary[]> {
    const sessions = await this.listSessions(100);
    return this.metadataManager.findEmptySessions(sessions);
  }

  /**
   * Clean up empty sessions (delete them)
   */
  async cleanupEmptySessions(): Promise<number> {
    const empty = await this.findEmptySessions();
    let deleted = 0;

    for (const session of empty) {
      // Don't delete the current session even if empty
      if (session.id === this.currentSessionId) {
        continue;
      }

      const success = await this.deleteSession(session.id);
      if (success) {
        deleted++;
      }
    }

    return deleted;
  }

  // ============================================
  // EXPORT
  // ============================================

  /**
   * Export session to a file
   */
  async exportSession(
    sessionId: string,
    format: ExportFormat,
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
        const sessionFile = this.persistence.getSessionPath(sessionId);
        content = await Bun.file(sessionFile).text();
        defaultExt = "jsonl";
        break;
      }

      case "json": {
        content = this.exporter.export(session, "json");
        defaultExt = "json";
        break;
      }

      case "markdown": {
        content = this.exporter.export(session, "markdown");
        defaultExt = "md";
        break;
      }

      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    const finalPath =
      outputPath ?? join(process.cwd(), `session-${sessionId}.${defaultExt}`);
    await Bun.write(finalPath, content);

    return finalPath;
  }

  // ============================================
  // CURRENT SESSION ACCESSORS
  // ============================================

  /**
   * Get the current session ID
   */
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  /**
   * Get the current session metadata
   */
  getCurrentMetadata(): SessionMetadata | null {
    return this.currentMetadata;
  }

  /**
   * Update current session metadata
   */
  updateMetadata(updates: Partial<SessionMetadata>): void {
    if (this.currentMetadata) {
      this.currentMetadata = this.metadataManager.merge(
        this.currentMetadata,
        updates
      );
    }
  }

  // ============================================
  // UTILITY
  // ============================================

  /**
   * Check if a session exists
   */
  async sessionExists(sessionId: string): Promise<boolean> {
    return this.persistence.exists(sessionId);
  }

  /**
   * Get session statistics
   */
  async getStats(): Promise<{
    totalSessions: number;
    totalMessages: number;
    totalCost: number;
    emptySessions: number;
  }> {
    const sessions = await this.listSessions(1000);
    const stats = this.metadataManager.calculateStats(sessions);
    const empty = this.metadataManager.findEmptySessions(sessions);

    return {
      totalSessions: stats.totalSessions,
      totalMessages: stats.totalMessages,
      totalCost: stats.totalCost,
      emptySessions: empty.length,
    };
  }
}

// ============================================
// HELPER FUNCTIONS (for CLI compatibility)
// ============================================

/**
 * Format a session summary for display
 */
export function formatSessionSummary(session: SessionSummary): string {
  return SessionExporter.formatSummary(session);
}

/**
 * Print sessions list for CLI
 */
export function printSessionsList(sessions: SessionSummary[]): void {
  SessionExporter.printList(sessions);
}

// Default export for convenience
export default SessionStore;
