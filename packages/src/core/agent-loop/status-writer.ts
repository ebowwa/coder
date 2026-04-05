/**
 * StatusWriter — telemetry recorder for the agent loop.
 *
 * Tracks API latency, token usage, tool executions, file operations,
 * and MCP calls. Provides event recording for downstream consumers.
 */

export interface StatusEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
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
    };
  }
}
