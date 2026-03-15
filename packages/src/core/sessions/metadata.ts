/**
 * Session Metadata - Manage session metadata and summaries
 */

import type {
  SessionMetadata,
  SessionSummary,
  SessionEntry,
  SessionMessage,
  SessionMetrics,
  SessionFilter,
} from "./types.js";
import type { ContentBlock, Message } from "../../schemas/index.js";
import { SessionPersistence } from "./persistence.js";

export class SessionMetadataManager {
  private persistence: SessionPersistence;

  constructor(persistence: SessionPersistence) {
    this.persistence = persistence;
  }

  /**
   * Generate a new session ID
   */
  generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 8);
    return `${timestamp}-${random}`;
  }

  /**
   * Create metadata for a new session
   */
  createMetadata(options: {
    id?: string;
    model: string;
    workingDirectory: string;
    agentName?: string;
    agentColor?: string;
    teamName?: string;
  }): SessionMetadata {
    return {
      type: "metadata",
      id: options.id ?? this.generateId(),
      created: Date.now(),
      updated: Date.now(),
      model: options.model,
      workingDirectory: options.workingDirectory,
      agentName: options.agentName,
      agentColor: options.agentColor,
      teamName: options.teamName,
      totalCost: 0,
      totalTokens: { input: 0, output: 0 },
    };
  }

  /**
   * Update metadata timestamps
   */
  touch(metadata: SessionMetadata): SessionMetadata {
    return {
      ...metadata,
      updated: Date.now(),
    };
  }

  /**
   * Merge updated fields into metadata
   */
  merge(
    metadata: SessionMetadata,
    updates: Partial<SessionMetadata>
  ): SessionMetadata {
    return {
      ...metadata,
      ...updates,
      updated: Date.now(),
    };
  }

  /**
   * Get summary from session entries
   */
  async getSummary(sessionId: string): Promise<SessionSummary | null> {
    const entries = await this.persistence.read(sessionId);
    return this.entriesToSummary(sessionId, entries);
  }

  /**
   * Convert entries to summary
   */
  entriesToSummary(
    sessionId: string,
    entries: SessionEntry[]
  ): SessionSummary | null {
    let metadata: SessionMetadata | null = null;
    let messageCount = 0;
    let totalCost = 0;
    let totalInput = 0;
    let totalOutput = 0;
    let firstMessage: string | undefined;
    let lastActivity: number | undefined;

    for (const entry of entries) {
      // All entries have a type field now
      if ("type" in entry) {
        switch (entry.type) {
          case "metadata":
            metadata = entry as SessionMetadata;
            break;
          case "message":
            messageCount++;
            lastActivity = entry.timestamp;
            const msg = (entry as SessionMessage).data as Message;
            if (!firstMessage && msg.role === "user") {
              // Handle string content directly
              if (typeof msg.content === "string") {
                firstMessage = msg.content.slice(0, 100);
                if (msg.content.length > 100) {
                  firstMessage += "...";
                }
              } else if (Array.isArray(msg.content)) {
                // Handle array content blocks
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
            }
            break;

          case "metrics":
            const metrics = (entry as SessionMetrics).data;
            totalCost += metrics.costUSD;
            totalInput += metrics.usage.input_tokens;
            totalOutput += metrics.usage.output_tokens;
            lastActivity = entry.timestamp;
            break;

          case "tool_use":
          case "context":
          case "checkpoint":
            lastActivity = entry.timestamp;
            break;
        }
      }
    }

    if (!metadata) {
      return null;
    }

    return {
      id: sessionId,
      created: metadata.created,
      updated: metadata.updated,
      lastActivity,
      model: metadata.model,
      messageCount,
      totalCost,
      totalTokens: { input: totalInput, output: totalOutput },
      firstMessage,
      workingDirectory: metadata.workingDirectory,
      metadata: {
        agentName: metadata.agentName,
        agentColor: metadata.agentColor,
        teamName: metadata.teamName,
      },
    };
  }

  /**
   * Filter sessions based on criteria
   */
  filterSessions(
    sessions: SessionSummary[],
    filter: SessionFilter
  ): SessionSummary[] {
    return sessions.filter((session) => {
      // Filter by model
      if (filter.model && session.model !== filter.model) {
        return false;
      }

      // Filter by working directory
      if (
        filter.workingDirectory &&
        session.workingDirectory !== filter.workingDirectory
      ) {
        return false;
      }

      // Filter by minimum messages
      if (filter.minMessages && session.messageCount < filter.minMessages) {
        return false;
      }

      // Filter by age (maxAge = maximum age in ms)
      if (filter.maxAge) {
        const age = Date.now() - session.created;
        if (age > filter.maxAge) {
          return false;
        }
      }

      // Filter by timestamp (since = minimum created timestamp)
      if (filter.since && session.created < filter.since) {
        return false;
      }

      return true;
    });
  }

  /**
   * Sort sessions by various criteria
   */
  sortSessions(
    sessions: SessionSummary[],
    sortBy: "created" | "updated" | "lastActivity" | "messageCount" | "cost" = "lastActivity",
    order: "asc" | "desc" = "desc"
  ): SessionSummary[] {
    return [...sessions].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "created":
          comparison = a.created - b.created;
          break;
        case "updated":
          comparison = a.updated - b.updated;
          break;
        case "lastActivity":
          comparison = (a.lastActivity ?? a.updated) - (b.lastActivity ?? b.updated);
          break;
        case "messageCount":
          comparison = a.messageCount - b.messageCount;
          break;
        case "cost":
          comparison = a.totalCost - b.totalCost;
          break;
      }

      return order === "desc" ? -comparison : comparison;
    });
  }

  /**
   * Find empty sessions (no messages)
   */
  findEmptySessions(sessions: SessionSummary[]): SessionSummary[] {
    return sessions.filter((s) => s.messageCount === 0);
  }

  /**
   * Find sessions by partial ID match
   */
  findById(sessions: SessionSummary[], partialId: string): SessionSummary | undefined {
    return sessions.find((s) => s.id.startsWith(partialId) || s.id.includes(partialId));
  }

  /**
   * Get unique models from sessions
   */
  getUniqueModels(sessions: SessionSummary[]): string[] {
    const models = new Set(sessions.map((s) => s.model));
    return [...models].sort();
  }

  /**
   * Get unique working directories from sessions
   */
  getUniqueDirectories(sessions: SessionSummary[]): string[] {
    const dirs = new Set(sessions.map((s) => s.workingDirectory));
    return [...dirs].sort();
  }

  /**
   * Calculate aggregate statistics
   */
  calculateStats(sessions: SessionSummary[]): {
    totalSessions: number;
    totalMessages: number;
    totalCost: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    averageMessagesPerSession: number;
    averageCostPerSession: number;
  } {
    const totalSessions = sessions.length;
    const totalMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0);
    const totalCost = sessions.reduce((sum, s) => sum + s.totalCost, 0);
    const totalInputTokens = sessions.reduce(
      (sum, s) => sum + s.totalTokens.input,
      0
    );
    const totalOutputTokens = sessions.reduce(
      (sum, s) => sum + s.totalTokens.output,
      0
    );

    return {
      totalSessions,
      totalMessages,
      totalCost,
      totalInputTokens,
      totalOutputTokens,
      averageMessagesPerSession: totalSessions > 0 ? totalMessages / totalSessions : 0,
      averageCostPerSession: totalSessions > 0 ? totalCost / totalSessions : 0,
    };
  }
}
