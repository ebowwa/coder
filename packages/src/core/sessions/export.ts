/**
 * Session Export - Export sessions to various formats
 * Supports JSONL, JSON, and Markdown
 */

import { join } from "path";
import type {
  LoadedSession,
  SessionSummary,
  ExportFormat,
  ISessionExporter,
  SessionToolUse,
} from "./types.js";
import type { ContentBlock, ToolUseBlock, ToolResultBlock } from "../../types/index.js";
import { SessionPersistence } from "./persistence.js";

export class SessionExporter implements ISessionExporter {
  private persistence: SessionPersistence;

  constructor(persistence: SessionPersistence) {
    this.persistence = persistence;
  }

  /**
   * Export a loaded session to the specified format
   */
  export(session: LoadedSession, format: ExportFormat): string {
    switch (format) {
      case "jsonl":
        return this.toJsonl(session);
      case "json":
        return this.toJson(session);
      case "markdown":
        return this.toMarkdown(session);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export a session to a file
   */
  async exportToFile(
    sessionId: string,
    format: ExportFormat,
    outputPath?: string
  ): Promise<string> {
    const sessionFile = this.persistence.getSessionPath(sessionId);

    // For JSONL, just return the original file
    if (format === "jsonl") {
      const content = await Bun.file(sessionFile).text();
      const finalPath = outputPath ?? join(process.cwd(), `session-${sessionId}.jsonl`);
      await Bun.write(finalPath, content);
      return finalPath;
    }

    // For other formats, we'd need to load and convert
    // This is handled by the SessionStore which has access to the full session
    throw new Error("Use SessionStore.exportSession for full export functionality");
  }

  /**
   * Export to JSONL format (raw session file)
   */
  private toJsonl(session: LoadedSession): string {
    const lines: string[] = [];

    // Metadata first (with explicit type)
    lines.push(JSON.stringify({ ...session.metadata, type: "metadata" }));

    // Context
    if (session.context) {
      lines.push(JSON.stringify(session.context));
    }

    // Messages
    for (const msg of session.messages) {
      lines.push(JSON.stringify({ type: "message", timestamp: Date.now(), data: msg }));
    }

    // Tools
    for (const tool of session.tools) {
      lines.push(JSON.stringify(tool));
    }

    // Metrics
    for (const metric of session.metrics) {
      lines.push(JSON.stringify({ type: "metrics", timestamp: Date.now(), data: metric }));
    }

    // Checkpoints
    for (const checkpoint of session.checkpoints) {
      lines.push(JSON.stringify(checkpoint));
    }

    return lines.join("\n");
  }

  /**
   * Export to JSON format (pretty-printed)
   */
  private toJson(session: LoadedSession): string {
    return JSON.stringify(session, null, 2);
  }

  /**
   * Export to Markdown format
   */
  private toMarkdown(session: LoadedSession): string {
    const lines: string[] = [];

    // Header
    lines.push(`# Session: ${session.metadata.id}`);
    lines.push("");
    lines.push(`**Created:** ${new Date(session.metadata.created).toISOString()}`);
    lines.push(`**Model:** ${session.metadata.model}`);
    lines.push(`**Working Directory:** ${session.metadata.workingDirectory}`);

    if (session.metadata.agentName) {
      lines.push(`**Agent:** ${session.metadata.agentName}`);
    }

    if (session.metadata.teamName) {
      lines.push(`**Team:** ${session.metadata.teamName}`);
    }

    lines.push("");

    // Messages
    lines.push("## Conversation");
    lines.push("");

    for (const message of session.messages) {
      const role = message.role === "user" ? "**User**" : "**Claude**";
      lines.push(`### ${role}`);
      lines.push("");

      for (const block of message.content) {
        this.formatBlock(block, lines);
      }
    }

    // Tools
    if (session.tools.length > 0) {
      lines.push("## Tool Calls");
      lines.push("");

      for (const tool of session.tools) {
        lines.push(`### ${tool.toolName}`);
        lines.push("");
        lines.push("**Input:**");
        lines.push("```json");
        lines.push(JSON.stringify(tool.input, null, 2));
        lines.push("```");

        if (tool.result) {
          lines.push("");
          lines.push(`**Result:**${tool.isError ? " (error)" : ""}`);
          lines.push("```");
          lines.push(tool.result);
          lines.push("```");
        }
        lines.push("");
      }
    }

    // Metrics
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

    // Checkpoints
    if (session.checkpoints.length > 0) {
      lines.push("");
      lines.push("## Checkpoints");
      lines.push("");

      for (const cp of session.checkpoints) {
        const date = new Date(cp.timestamp).toISOString();
        lines.push(`- ${cp.label ?? cp.checkpointId} (${date}) - ${cp.messageCount} messages`);
      }
    }

    return lines.join("\n");
  }

  /**
   * Format a content block for markdown
   */
  private formatBlock(block: ContentBlock, lines: string[]): void {
    switch (block.type) {
      case "text":
        lines.push(block.text);
        lines.push("");
        break;

      case "tool_use": {
        const tool = block as ToolUseBlock;
        lines.push(`\`\`\`tool:${tool.name}`);
        lines.push(JSON.stringify(tool.input, null, 2));
        lines.push("```");
        lines.push("");
        break;
      }

      case "tool_result": {
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
        break;
      }

      case "thinking":
        lines.push("> **Thinking**");
        lines.push(`> ${block.thinking.replace(/\n/g, "\n> ")}`);
        lines.push("");
        break;

      case "image":
        lines.push("*(Image)*");
        lines.push("");
        break;

      default:
        break;
    }
  }

  /**
   * Format a session summary for display
   */
  static formatSummary(session: SessionSummary): string {
    const created = new Date(session.created);
    const updated = session.lastActivity
      ? new Date(session.lastActivity)
      : new Date(session.updated);
    const age = this.formatRelativeTime(updated);

    const lines: string[] = [];

    // Session ID and age
    lines.push(`\x1b[1m${session.id}\x1b[0m (${age})`);

    // Model and message count
    lines.push(`  Model: ${session.model} | Messages: ${session.messageCount}`);

    // Cost and tokens
    const cost =
      session.totalCost < 0.01
        ? `$${session.totalCost.toFixed(4)}`
        : `$${session.totalCost.toFixed(2)}`;
    lines.push(
      `  Cost: ${cost} | Tokens: ${session.totalTokens.input.toLocaleString()} in, ${session.totalTokens.output.toLocaleString()} out`
    );

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
  static formatRelativeTime(date: Date): string {
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
  static printList(sessions: SessionSummary[]): void {
    if (sessions.length === 0) {
      console.log("No sessions found.");
      console.log("\nStart a new conversation to create a session.");
      return;
    }

    console.log(`\x1b[1mRecent Sessions (${sessions.length})\x1b[0m\n`);

    for (const session of sessions) {
      console.log(this.formatSummary(session));
      console.log("");
    }

    console.log("To resume a session:");
    console.log("  coder --resume <session-id>");
  }
}
