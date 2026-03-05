/**
 * JSONL Session Template Demo
 * Run: bun run tests/session-template-demo.ts
 */

import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Types matching packages/src/core/sessions/types.ts
interface SessionMetadata {
  type: "metadata";
  id: string;
  created: number;
  updated: number;
  model: string;
  workingDirectory: string;
  agentName?: string;
  agentColor?: string;
  totalCost?: number;
  totalTokens?: { input: number; output: number };
}

interface SessionMessage {
  type: "message";
  timestamp: number;
  data: {
    role: "user" | "assistant";
    content: Array<{
      type: string;
      text?: string;
      tool_use_id?: string;
      content?: string;
      thinking?: string;
      name?: string;
      input?: Record<string, unknown>;
    }>;
  };
}

interface SessionToolUse {
  type: "tool_use";
  timestamp: number;
  toolId: string;
  toolName: string;
  input: Record<string, unknown>;
  result?: string;
  isError?: boolean;
}

interface SessionMetrics {
  type: "metrics";
  timestamp: number;
  data: {
    usage: {
      input_tokens: number;
      output_tokens: number;
      cache_read_tokens?: number;
      cache_write_tokens?: number;
    };
    costUSD: number;
    latencyMs: number;
    model: string;
    stopReason: string;
  };
}

interface SessionContext {
  type: "context";
  timestamp: number;
  workingDirectory: string;
  gitBranch?: string;
  systemPrompt?: string;
}

interface SessionCheckpoint {
  type: "checkpoint";
  timestamp: number;
  checkpointId: string;
  label?: string;
  messageCount: number;
}

type SessionEntry = SessionMessage | SessionToolUse | SessionMetrics | SessionContext | SessionCheckpoint;

interface LoadedSession {
  metadata: SessionMetadata | null;
  context: SessionContext | null;
  messages: SessionMessage[];
  tools: SessionToolUse[];
  metrics: SessionMetrics[];
  checkpoints: SessionCheckpoint[];
}

// Parse JSONL file
async function parseSession(filePath: string): Promise<LoadedSession> {
  const content = await Bun.file(filePath).text();
  const lines = content.trim().split("\n");

  const session: LoadedSession = {
    metadata: null,
    context: null,
    messages: [],
    tools: [],
    metrics: [],
    checkpoints: [],
  };

  for (const line of lines) {
    if (!line.trim()) continue;

    const entry = JSON.parse(line);

    // All entries have explicit type field now
    if ("type" in entry) {
      switch (entry.type) {
        case "metadata":
          session.metadata = entry as SessionMetadata;
          break;
        case "message":
          session.messages.push(entry as SessionMessage);
          break;
        case "tool_use":
          session.tools.push(entry as SessionToolUse);
          break;
        case "metrics":
          session.metrics.push(entry as SessionMetrics);
          break;
        case "context":
          session.context = entry as SessionContext;
          break;
        case "checkpoint":
          session.checkpoints.push(entry as SessionCheckpoint);
          break;
      }
    }
  }

  return session;
}

// Format for display
function formatSession(session: LoadedSession): string {
  const lines: string[] = [];

  // Header
  if (session.metadata) {
    const m = session.metadata;
    lines.push("╔════════════════════════════════════════════════════════════");
    lines.push(`║ Session: ${m.id}`);
    lines.push(`║ Model: ${m.model}`);
    lines.push(`║ Directory: ${m.workingDirectory}`);
    lines.push(`║ Created: ${new Date(m.created).toISOString()}`);
    if (m.totalCost) {
      lines.push(`║ Total Cost: $${m.totalCost.toFixed(4)}`);
      lines.push(`║ Tokens: ${m.totalTokens?.input.toLocaleString()} in / ${m.totalTokens?.output.toLocaleString()} out`);
    }
    lines.push("╚════════════════════════════════════════════════════════════");
    lines.push("");
  }

  // Context
  if (session.context?.gitBranch) {
    lines.push(`📌 Branch: ${session.context.gitBranch}`);
    lines.push("");
  }

  // Messages
  lines.push("## Conversation");
  lines.push("");
  for (const msg of session.messages) {
    const role = msg.data.role === "user" ? "👤 USER" : "🤖 ASSISTANT";
    lines.push(`### ${role} (${new Date(msg.timestamp).toLocaleTimeString()})`);

    for (const block of msg.data.content) {
      if (block.type === "text" && block.text) {
        lines.push(block.text.slice(0, 100) + (block.text.length > 100 ? "..." : ""));
      } else if (block.type === "tool_use") {
        lines.push(`  🔧 ${block.name}: ${JSON.stringify(block.input)}`);
      } else if (block.type === "tool_result") {
        lines.push(`  📋 Result: ${block.content?.toString().slice(0, 50)}...`);
      } else if (block.type === "thinking") {
        lines.push(`  💭 Thinking: ${block.thinking?.slice(0, 50)}...`);
      }
    }
    lines.push("");
  }

  // Tools
  if (session.tools.length > 0) {
    lines.push("## Tool Calls");
    lines.push("");
    for (const tool of session.tools) {
      const status = tool.isError ? "❌" : "✅";
      lines.push(`${status} ${tool.toolName}(${JSON.stringify(tool.input)})`);
      if (tool.result) {
        lines.push(`   → ${tool.result.slice(0, 60)}...`);
      }
    }
    lines.push("");
  }

  // Metrics
  if (session.metrics.length > 0) {
    lines.push("## API Metrics");
    lines.push("");
    const totalCost = session.metrics.reduce((sum, m) => sum + m.data.costUSD, 0);
    const totalInput = session.metrics.reduce((sum, m) => sum + m.data.usage.input_tokens, 0);
    const totalOutput = session.metrics.reduce((sum, m) => sum + m.data.usage.output_tokens, 0);

    lines.push(`- API Calls: ${session.metrics.length}`);
    lines.push(`- Total Cost: $${totalCost.toFixed(4)}`);
    lines.push(`- Input Tokens: ${totalInput.toLocaleString()}`);
    lines.push(`- Output Tokens: ${totalOutput.toLocaleString()}`);
  }

  return lines.join("\n");
}

// Main
const templatePath = join(dirname(fileURLToPath(import.meta.url)), "session-template.jsonl");

console.log("📖 Reading JSONL template...\n");

const session = await parseSession(templatePath);

console.log(formatSession(session));

console.log("\n--- Raw Entry Count ---");
console.log(`Metadata: ${session.metadata ? 1 : 0}`);
console.log(`Messages: ${session.messages.length}`);
console.log(`Tool Uses: ${session.tools.length}`);
console.log(`Metrics: ${session.metrics.length}`);
console.log(`Checkpoints: ${session.checkpoints.length}`);
