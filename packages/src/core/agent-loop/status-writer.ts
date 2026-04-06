/**
 * StatusWriter — telemetry recorder for the agent loop.
 *
 * Tracks API latency, token usage, tool executions, file operations,
 * and MCP calls. Optionally persists to disk for crash recovery.
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from "fs";
import { dirname } from "path";

export interface StatusEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
}

interface PersistedStats {
  totalInputTokens: number;
  totalOutputTokens: number;
  apiLatencies: number[];
  fileReads: string[];
  fileEdits: string[];
  fileCreates: string[];
  mcpCalls: Array<{ server: string; tool: string; durationMs: number; isError: boolean }>;
  toolUses: Array<{ name: string; durationMs: number; success: boolean; error?: string }>;
  events: StatusEvent[];
  startedAt: number;
  lastPersistedAt: number;
}

export class StatusWriter {
  private events: StatusEvent[] = [];
  private totalInputTokens = 0;
  private totalOutputTokens = 0;
  private apiLatencies: number[] = [];
  private fileReads = new Set<string>();
  private fileEdits = new Set<string>();
  private fileCreates = new Set<string>();
  private mcpCalls: Array<{
    server: string;
    tool: string;
    durationMs: number;
    isError: boolean;
  }> = [];
  private toolUses: Array<{
    name: string;
    durationMs: number;
    success: boolean;
    error?: string;
  }> = [];
  private startedAt = Date.now();
  private persistPath: string | null;
  private persistTimer: ReturnType<typeof setInterval> | null = null;

  constructor(persistPath?: string) {
    this.persistPath = persistPath ?? null;
    if (this.persistPath) {
      this.tryRestore();
      this.persistTimer = setInterval(() => this.persistToDisk(), 10_000);
    }
  }

  recordApiLatency(ms: number): void {
    this.apiLatencies.push(ms);
  }

  updateTokens(input: number, output: number): void {
    this.totalInputTokens += input;
    this.totalOutputTokens += output;
  }

  recordEvent(type: string, data: Record<string, unknown>): void {
    this.events.push({ type, data, timestamp: Date.now() });
  }

  recordToolUse(
    name: string,
    durationMs: number,
    success: boolean,
    error?: string,
  ): void {
    this.toolUses.push({ name, durationMs, success, error });
  }

  recordFileRead(path: string): void {
    this.fileReads.add(path);
  }

  recordFileEdit(path: string): void {
    this.fileEdits.add(path);
  }

  recordFileCreate(path: string): void {
    this.fileCreates.add(path);
  }

  recordMcpCall(
    server: string,
    tool: string,
    durationMs: number,
    isError: boolean,
  ): void {
    this.mcpCalls.push({ server, tool, durationMs, isError });
  }

  getStats() {
    return {
      totalInputTokens: this.totalInputTokens,
      totalOutputTokens: this.totalOutputTokens,
      apiLatencies: this.apiLatencies,
      fileReads: [...this.fileReads],
      fileEdits: [...this.fileEdits],
      fileCreates: [...this.fileCreates],
      mcpCalls: this.mcpCalls,
      toolUses: this.toolUses,
      events: this.events,
      startedAt: this.startedAt,
      uptimeMs: Date.now() - this.startedAt,
    };
  }

  stop(): void {
    if (this.persistTimer) {
      clearInterval(this.persistTimer);
      this.persistTimer = null;
    }
    this.persistToDisk();
  }

  private persistToDisk(): void {
    if (!this.persistPath) return;
    try {
      const dir = dirname(this.persistPath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const data: PersistedStats = {
        ...this.getStats(),
        lastPersistedAt: Date.now(),
      };
      writeFileSync(this.persistPath, JSON.stringify(data, null, 2));
    } catch {
      // Don't crash the agent over telemetry persistence
    }
  }

  private tryRestore(): void {
    if (!this.persistPath || !existsSync(this.persistPath)) return;
    try {
      const raw = readFileSync(this.persistPath, "utf-8");
      const data: PersistedStats = JSON.parse(raw);
      this.totalInputTokens = data.totalInputTokens;
      this.totalOutputTokens = data.totalOutputTokens;
      this.apiLatencies = data.apiLatencies;
      this.fileReads = new Set(data.fileReads);
      this.fileEdits = new Set(data.fileEdits);
      this.fileCreates = new Set(data.fileCreates);
      this.mcpCalls = data.mcpCalls;
      this.toolUses = data.toolUses;
      this.events = data.events;
      this.startedAt = data.startedAt;
    } catch {
      // Corrupted file -- start fresh
    }
  }
}
