/**
 * Session Persistence - File operations for session storage
 * Handles JSONL file I/O with atomic writes and queue management
 */

import { homedir } from "os";
import { join } from "path";
import type {
  SessionEntry,
  SessionMetadata,
  ISessionPersistence,
} from "./types.js";

export class SessionPersistence implements ISessionPersistence {
  private sessionsDir: string;
  private writeQueues: Map<string, Promise<void>> = new Map();

  constructor(sessionsDir?: string) {
    this.sessionsDir = sessionsDir ?? join(homedir(), ".claude", "sessions");
  }

  /**
   * Get the sessions directory path
   */
  getSessionsDir(): string {
    return this.sessionsDir;
  }

  /**
   * Get the file path for a session
   */
  getSessionPath(sessionId: string): string {
    return join(this.sessionsDir, `${sessionId}.jsonl`);
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
   * Check if a session file exists
   */
  async exists(sessionId: string): Promise<boolean> {
    const file = Bun.file(this.getSessionPath(sessionId));
    return file.exists();
  }

  /**
   * Read all entries from a session file
   */
  async read(sessionId: string): Promise<SessionEntry[]> {
    const sessionFile = this.getSessionPath(sessionId);

    try {
      const content = await Bun.file(sessionFile).text();
      if (!content) {
        return [];
      }

      const entries: SessionEntry[] = [];
      const lines = content.trim().split("\n");

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          entries.push(JSON.parse(line) as SessionEntry);
        } catch {
          // Skip malformed lines
        }
      }

      return entries;
    } catch {
      return [];
    }
  }

  /**
   * Append an entry to a session file (queued for atomic writes)
   */
  async append(
    sessionId: string,
    entry: SessionEntry | SessionMetadata
  ): Promise<void> {
    const sessionFile = this.getSessionPath(sessionId);

    // Queue writes per session to ensure order
    const existingQueue = this.writeQueues.get(sessionId) || Promise.resolve();

    const newQueue = existingQueue.then(async () => {
      const line = JSON.stringify(entry) + "\n";
      const file = Bun.file(sessionFile);
      const existing = (await file.exists()) ? await file.text() : "";
      await Bun.write(sessionFile, existing + line);
    });

    this.writeQueues.set(sessionId, newQueue);

    try {
      await newQueue;
    } finally {
      // Clean up completed queue
      if (this.writeQueues.get(sessionId) === newQueue) {
        this.writeQueues.delete(sessionId);
      }
    }
  }

  /**
   * Write all entries to a session file (replaces existing)
   */
  async writeAll(sessionId: string, entries: SessionEntry[]): Promise<void> {
    const sessionFile = this.getSessionPath(sessionId);
    const content = entries.map((e) => JSON.stringify(e)).join("\n") + "\n";
    await Bun.write(sessionFile, content);
  }

  /**
   * Delete a session file
   */
  async delete(sessionId: string): Promise<boolean> {
    const sessionFile = this.getSessionPath(sessionId);

    try {
      const file = Bun.file(sessionFile);
      if (await file.exists()) {
        const { unlink } = await import("fs/promises");
        await unlink(sessionFile);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * List all session files in the directory
   */
  async listFiles(): Promise<string[]> {
    await this.init();

    try {
      const glob = new Bun.Glob("*.jsonl");
      const files = [...glob.scanSync(this.sessionsDir)];
      return files.map((f) => f.replace(".jsonl", ""));
    } catch {
      return [];
    }
  }

  /**
   * Get file stats for a session
   */
  async getStats(sessionId: string): Promise<{
    exists: boolean;
    size: number;
    mtime: Date | null;
  }> {
    const sessionFile = this.getSessionPath(sessionId);

    try {
      const file = Bun.file(sessionFile);
      const stat = await file.stat();

      return {
        exists: true,
        size: stat?.size ?? 0,
        mtime: stat?.mtime ?? null,
      };
    } catch {
      return { exists: false, size: 0, mtime: null };
    }
  }

  /**
   * Get modification times for multiple sessions
   */
  async getModificationTimes(sessionIds: string[]): Promise<Map<string, Date>> {
    const times = new Map<string, Date>();

    await Promise.all(
      sessionIds.map(async (id) => {
        const stats = await this.getStats(id);
        if (stats.exists && stats.mtime) {
          times.set(id, stats.mtime);
        }
      })
    );

    return times;
  }

  /**
   * Read the first line (metadata) of a session file
   */
  async readMetadata(sessionId: string): Promise<SessionMetadata | null> {
    const entries = await this.read(sessionId);

    for (const entry of entries) {
      // Metadata has explicit type field now
      if ("type" in entry && entry.type === "metadata") {
        return entry as SessionMetadata;
      }
    }

    return null;
  }

  /**
   * Read the last N entries from a session file
   */
  async readLast(sessionId: string, count: number): Promise<SessionEntry[]> {
    const entries = await this.read(sessionId);
    return entries.slice(-count);
  }

  /**
   * Count entries in a session file
   */
  async countEntries(sessionId: string): Promise<number> {
    const entries = await this.read(sessionId);
    return entries.length;
  }
}

// Singleton instance for convenience
let defaultPersistence: SessionPersistence | null = null;

export function getSessionPersistence(
  sessionsDir?: string
): SessionPersistence {
  if (!defaultPersistence) {
    defaultPersistence = new SessionPersistence(sessionsDir);
  }
  return defaultPersistence;
}
