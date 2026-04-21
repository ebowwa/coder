/**
 * Query Execution & Daemon Loop
 * Shared query runner for CLI -q mode and 24/7 daemon mode
 */

import type { Message, ToolDefinition, ExtendedThinkingConfig, GitStatus } from "../../../../schemas/index.js";
import { builtInTools } from "../../../../ecosystem/tools/index.js";
import { buildToolCapabilities, toolsFor, type ToolCapabilityMap } from "../../../../core/tool-capabilities.js";
import { agentLoop, formatCost, formatCostBrief, createResultConditionsConfig, type ResultConditionsConfig, RALPH_CONTINUATION_CONFIG, type AgentLoopResult } from "../../../../core/agent-loop.js";
import { HookManager } from "../../../../ecosystem/hooks/index.js";
import { SessionStore } from "../../../../core/session-store.js";
import { createStreamHighlighter } from "../../../../core/stream-highlighter.js";
import { StatusWriter } from "../../../../core/agent-loop/status-writer.js";
import { TaskQueue, type QueuedTask } from "../../../../core/task-queue.js";
import {
  renderStatusLine,
  getContextWindow,
  type StatusLineOptions,
} from "./status-line.js";
import type { CLIArgs } from "./args.js";
import { execSync, spawnSync } from "child_process";
import { readFileSync, existsSync, statSync, copyFileSync } from "fs";
import { join } from "path";
import { verifyQualityGate } from "../../../../ecosystem/plugins/daemon/quality-gate.js";

const STATS_PORT = parseInt(process.env.CODER_STATS_PORT || "7420", 10);
const MAX_HANDOFF_SESSIONS = parseInt(process.env.CODER_MAX_HANDOFFS || "10", 10);
const HANDOFF_COOLDOWN_MS = 5_000;
const DAEMON_POLL_INTERVAL_MS = parseInt(process.env.CODER_DAEMON_POLL_MS || "10000", 10);
const DAEMON_ASSESS_COOLDOWN_BASE_MS = parseInt(process.env.CODER_ASSESS_COOLDOWN_MS || "45000", 10);
const DAEMON_ASSESS_COOLDOWN_MAX_MS = 3 * 60_000; // 3 min max between assessments
const DAEMON_CONSECUTIVE_CLEAN_BACKOFF = 1.5; // gentle backoff -- always stay productive

/** Vision: try browser MCP (dev-browser script: navigate + viewport + scroll/resize + screenshot), then Chrome + SwiftShader fallback for WebGL. */
function resolveHeadlessChromeExecutable(): string | null {
  const candidates =
    process.platform === "darwin"
      ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]
      : process.platform === "win32"
        ? [
            String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`,
            String.raw`C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`,
          ]
        : ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

function tryHeadlessChromeScreenshot(
  chromePath: string,
  outFile: string,
  width: number,
  height: number,
  url: string,
): boolean {
  const args = [
    "--headless=new",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--run-all-compositor-stages-before-draw",
    "--virtual-time-budget=2000",
    `--screenshot=${outFile}`,
    `--window-size=${width},${height}`,
    url,
  ];
  // Hard 15s timeout — kill the process tree if it hangs
  const r = spawnSync(chromePath, args, { stdio: "ignore", timeout: 15_000, killSignal: "SIGKILL" });
  if (r.status !== 0 && r.signal !== "SIGKILL" && !existsSync(outFile)) return false;
  try {
    return statSync(outFile).size > 800;
  } catch {
    return false;
  }
}

async function buildHandoffPrompt(
  originalQuery: string,
  previousResult: AgentLoopResult,
  workingDirectory: string,
  sessionNumber: number,
): Promise<string> {
  let gitDiff = "";
  let gitStatus = "";
  try {
    gitStatus = execSync("git status --short", { cwd: workingDirectory, timeout: 10_000 }).toString().trim();
    gitDiff = execSync("git diff --stat HEAD~5 2>/dev/null || git diff --stat", {
      cwd: workingDirectory,
      timeout: 10_000,
    }).toString().trim();
  } catch { /* not a git repo or no commits */ }

  let progress = "";
  const progressPath = join(workingDirectory, "PROGRESS.md");
  if (existsSync(progressPath)) {
    try {
      const raw = readFileSync(progressPath, "utf-8");
      progress = raw.length > 3000 ? raw.slice(0, 3000) + "\n...(truncated)" : raw;
    } catch { /* ignore */ }
  }

  // Use the meta-LLM to produce a tight handoff summary from raw signals
  let llmSummary = "";
  try {
    const { getMetaLLM } = await import("../../../../core/meta-llm-client.js");
    const rawSignals = [
      `Task: ${originalQuery}`,
      `Turns: ${previousResult.metrics.length}, Cost: $${previousResult.totalCost.toFixed(4)}, End: ${previousResult.endReason}`,
      gitStatus ? `Git status:\n${gitStatus}` : "",
      gitDiff ? `Recent diff:\n${gitDiff}` : "",
      progress ? `PROGRESS.md:\n${progress}` : "",
    ].filter(Boolean).join("\n\n");

    const result = await getMetaLLM().complete(
      `You are a session handoff summarizer. Given the task, previous session stats, git status, and progress notes, produce a concise summary: (1) what was accomplished, (2) what remains, (3) the single most important next step. Be terse -- max 300 words.`,
      rawSignals,
      1024,
    );
    if (result?.text) {
      llmSummary = result.text;
      console.log(`\x1b[90m[Handoff] Meta-LLM summary: ${result.inputTokens} in, ${result.outputTokens} out, ${result.durationMs}ms\x1b[0m`);
    }
  } catch { /* fall through to template */ }

  const lines: string[] = [
    `[SESSION HANDOFF ${sessionNumber}/${MAX_HANDOFF_SESSIONS}]`,
    `The previous session degenerated and was terminated. You are continuing the same task in a fresh context.`,
    ``,
    `ORIGINAL TASK:`,
    originalQuery,
  ];

  if (llmSummary) {
    lines.push(``, `SESSION SUMMARY (from meta-LLM):`, llmSummary);
  } else {
    lines.push(
      ``,
      `PREVIOUS SESSION STATS:`,
      `- Turns: ${previousResult.metrics.length}`,
      `- Cost: $${previousResult.totalCost.toFixed(4)}`,
      `- Compactions: ${previousResult.compactionCount}`,
      `- End reason: ${previousResult.endReason}`,
    );
    if (gitStatus) lines.push(``, `GIT STATUS:`, "```", gitStatus, "```");
    if (gitDiff) lines.push(``, `RECENT DIFF SUMMARY:`, "```", gitDiff, "```");
    if (progress) lines.push(``, `PROGRESS.md:`, "```", progress, "```");
  }

  lines.push(
    ``,
    `INSTRUCTIONS:`,
    `1. Read PROGRESS.md if it exists to understand what was already done.`,
    `2. Continue where the previous session left off -- do NOT redo completed work.`,
    `3. After each logical unit: build, run ONLY scoped tests (cd into the project dir first), then commit.`,
    `4. NEVER run a bare \`bun test\` or \`npm test\` from the repo root -- always cd to the assignment/project directory first.`,
    `5. Keep Bash output short: pipe through \`head -50\` or \`tail -30\` for large outputs. Do NOT dump full test suites into context.`,
    `6. Update PROGRESS.md with your progress.`,
    `7. Prefer writing/editing files over reasoning about them. If you've read the code, write the change.`,
  );

  return lines.join("\n");
}

interface DaemonServer {
  stop: () => void;
  updateSession: (id: string) => void;
}

const JSON_HEADERS = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

function buildDashboardHtml(stats: ReturnType<StatusWriter["getStats"]> & { sessionId: string }, tasks: Array<{ id: string; status: string; query: string; createdAt: number }> | null): string {
  const uptimeSec = Math.floor(stats.uptimeMs / 1000);
  const uptimeStr = uptimeSec > 3600 ? `${Math.floor(uptimeSec/3600)}h ${Math.floor((uptimeSec%3600)/60)}m` : uptimeSec > 60 ? `${Math.floor(uptimeSec/60)}m ${uptimeSec%60}s` : `${uptimeSec}s`;

  const totalCost = (stats.totalInputTokens * 0.0000005 + stats.totalOutputTokens * 0.0000015).toFixed(4);
  const avgLatency = stats.apiLatencies.length ? Math.round(stats.apiLatencies.reduce((a,b)=>a+b,0)/stats.apiLatencies.length) : 0;
  const p95Latency = stats.apiLatencies.length ? Math.round([...stats.apiLatencies].sort((a,b)=>a-b)[Math.floor(stats.apiLatencies.length*0.95)] ?? 0) : 0;

  const taskEvents = stats.events.filter(e => e.type === "task_started" || e.type === "task_completed" || e.type === "task_failed");
  const completedTasks = stats.events.filter(e => e.type === "task_completed").length;
  const failedTasks = stats.events.filter(e => e.type === "task_failed").length;

  const currentTaskEvent = [...stats.events].reverse().find(e => e.type === "task_started");
  const currentTaskCompleted = currentTaskEvent && stats.events.find(e => e.type === "task_completed" && e.data.taskId === currentTaskEvent.data.taskId);
  const currentTask = currentTaskEvent && !currentTaskCompleted ? currentTaskEvent.data : null;

  const toolCounts: Record<string, number> = {};
  for (const t of stats.toolUses) toolCounts[t.name] = (toolCounts[t.name] ?? 0) + 1;
  const topTools = Object.entries(toolCounts).sort((a,b)=>b[1]-a[1]).slice(0, 10);

  const mcpByServer: Record<string, { calls: number; errors: number; totalMs: number }> = {};
  for (const m of stats.mcpCalls) {
    const entry = mcpByServer[m.server] ?? (mcpByServer[m.server] = { calls: 0, errors: 0, totalMs: 0 });
    entry.calls++;
    if (m.isError) entry.errors++;
    entry.totalMs += m.durationMs;
  }

  const recentEvents = [...stats.events].reverse().slice(0, 20);
  const visionScreenshots = stats.events.filter(e => e.type === "vision_verify" && !e.data.analysis?.toString().includes("black")).slice(-14);

  const latencyBars = stats.apiLatencies.slice(-30).map(ms => {
    const h = Math.min(60, Math.round(ms / 200));
    const color = ms > 10000 ? "#ef4444" : ms > 5000 ? "#f59e0b" : "#22c55e";
    return `<div style="display:inline-block;width:8px;height:${h}px;background:${color};margin:1px;vertical-align:bottom;border-radius:2px 2px 0 0" title="${ms}ms"></div>`;
  }).join("");

  const pendingTasks = tasks?.filter(t => t.status === "pending").length ?? 0;
  const processingTasks = tasks?.filter(t => t.status === "processing").length ?? 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="refresh" content="8">
<title>Coder Daemon</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',monospace;background:#0f0f0f;color:#e5e5e5;font-size:13px}
.header{background:#1a1a1a;border-bottom:1px solid #2a2a2a;padding:12px 20px;display:flex;align-items:center;gap:16px}
.header h1{font-size:15px;font-weight:600;color:#fff}
.dot{width:8px;height:8px;border-radius:50%;background:#22c55e;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.badge{background:#1e3a1e;color:#4ade80;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600}
.badge.warn{background:#3a2a1e;color:#fb923c}
.badge.err{background:#3a1e1e;color:#f87171}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;padding:16px 20px}
.card{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:14px}
.card .label{color:#888;font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px}
.card .val{font-size:22px;font-weight:700;color:#fff}
.card .sub{color:#666;font-size:11px;margin-top:3px}
.section{margin:0 20px 16px;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px}
.section-header{padding:10px 14px;border-bottom:1px solid #2a2a2a;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#888;font-weight:600;display:flex;justify-content:space-between;align-items:center}
.section-body{padding:12px 14px}
.task-current{background:#0f1f0f;border:1px solid #1a3a1a;border-radius:6px;padding:10px 12px;font-size:12px;color:#86efac;line-height:1.5;word-break:break-word}
.task-list{list-style:none}
.task-list li{padding:6px 0;border-bottom:1px solid #222;font-size:12px;display:flex;gap:8px;align-items:flex-start}
.task-list li:last-child{border-bottom:none}
.status-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:4px}
.processing{background:#22c55e}
.pending{background:#f59e0b}
.completed{background:#3b82f6}
.failed{background:#ef4444}
table{width:100%;border-collapse:collapse;font-size:12px}
td,th{padding:6px 8px;text-align:left;border-bottom:1px solid #222}
th{color:#888;font-weight:500;font-size:11px}
tr:last-child td{border-bottom:none}
.mono{font-family:monospace;font-size:11px}
.event-row{padding:5px 0;border-bottom:1px solid #1e1e1e;display:flex;gap:10px;font-size:11px}
.event-row:last-child{border-bottom:none}
.event-type{color:#888;font-family:monospace;min-width:140px}
.event-data{color:#aaa;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.screenshots{display:flex;flex-wrap:wrap;gap:8px}
.shot{border-radius:4px;overflow:hidden;border:1px solid #333;font-size:10px;color:#666}
.shot img{display:block;max-width:120px;max-height:80px;object-fit:cover}
.shot-label{padding:3px 6px;background:#111}
.bar-chart{height:64px;display:flex;align-items:flex-end;padding:4px 0}
</style>
</head>
<body>
<div class="header">
  <div class="dot"></div>
  <h1>Coder Daemon</h1>
  <span class="badge">glm-5</span>
  <span style="color:#555;font-size:11px">${stats.sessionId.split("-").slice(0,2).join("-")}</span>
  <span style="margin-left:auto;color:#555;font-size:11px">auto-refresh 8s · <a href="/stats" style="color:#555">json</a> · <a href="/tasks" style="color:#555">tasks</a></span>
</div>

<div class="grid">
  <div class="card"><div class="label">Uptime</div><div class="val">${uptimeStr}</div></div>
  <div class="card"><div class="label">Tasks</div><div class="val">${completedTasks}</div><div class="sub">${failedTasks} failed · ${processingTasks} active · ${pendingTasks} queued</div></div>
  <div class="card"><div class="label">Input Tokens</div><div class="val">${(stats.totalInputTokens/1000).toFixed(1)}k</div></div>
  <div class="card"><div class="label">Output Tokens</div><div class="val">${(stats.totalOutputTokens/1000).toFixed(1)}k</div></div>
  <div class="card"><div class="label">Est. Cost</div><div class="val">$${totalCost}</div></div>
  <div class="card"><div class="label">Avg Latency</div><div class="val">${(avgLatency/1000).toFixed(1)}s</div><div class="sub">p95 ${(p95Latency/1000).toFixed(1)}s</div></div>
  <div class="card"><div class="label">File Ops</div><div class="val">${stats.fileEdits.length + stats.fileCreates.length}</div><div class="sub">${stats.fileEdits.length} edits · ${stats.fileCreates.length} creates</div></div>
  <div class="card"><div class="label">MCP Calls</div><div class="val">${stats.mcpCalls.length}</div><div class="sub">${stats.mcpCalls.filter(m=>m.isError).length} errors</div></div>
</div>

${currentTask ? `
<div class="section">
  <div class="section-header"><span>Current Task</span><span class="badge">running</span></div>
  <div class="section-body">
    <div class="task-current">${String(currentTask.query ?? "").slice(0, 300).replace(/</g,"&lt;")}</div>
  </div>
</div>` : ""}

<div class="section">
  <div class="section-header">API Latency (last 30 calls)</div>
  <div class="section-body"><div class="bar-chart">${latencyBars || "<span style='color:#555'>no data</span>"}</div></div>
</div>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:0 20px 16px">
  <div class="section" style="margin:0">
    <div class="section-header">Tool Usage</div>
    <div class="section-body">
      <table><thead><tr><th>Tool</th><th>Calls</th></tr></thead><tbody>
      ${topTools.map(([name, count]) => `<tr><td class="mono">${name}</td><td>${count}</td></tr>`).join("") || "<tr><td colspan=2 style='color:#555'>none yet</td></tr>"}
      </tbody></table>
    </div>
  </div>
  <div class="section" style="margin:0">
    <div class="section-header">MCP Servers</div>
    <div class="section-body">
      <table><thead><tr><th>Server</th><th>Calls</th><th>Errors</th><th>Avg ms</th></tr></thead><tbody>
      ${Object.entries(mcpByServer).map(([s,d]) => `<tr><td class="mono">${s}</td><td>${d.calls}</td><td>${d.errors > 0 ? `<span style="color:#ef4444">${d.errors}</span>` : "0"}</td><td>${Math.round(d.totalMs/d.calls)}</td></tr>`).join("") || "<tr><td colspan=4 style='color:#555'>none</td></tr>"}
      </tbody></table>
    </div>
  </div>
</div>

${tasks ? `
<div class="section">
  <div class="section-header"><span>Task Queue</span><span>${tasks.length} total</span></div>
  <div class="section-body">
    <ul class="task-list">
    ${tasks.slice(0,8).map(t => `<li>
      <div class="status-dot ${t.status}"></div>
      <div><span class="mono" style="color:#555">${t.id.split("_").pop()}</span> ${t.query.replace(/\[AUTONOMOUS[^\]]*\]\s*/g,"").replace(/SCOPE CONSTRAINT:[^\n]*/,"").trim().slice(0,120).replace(/</g,"&lt;")}</div>
    </li>`).join("")}
    </ul>
  </div>
</div>` : ""}

<div class="section">
  <div class="section-header">Recent Events</div>
  <div class="section-body">
  ${recentEvents.map(e => `<div class="event-row">
    <span class="event-type">${e.type}</span>
    <span class="event-data">${JSON.stringify(e.data).slice(0,120).replace(/</g,"&lt;")}</span>
    <span style="color:#444;margin-left:auto;white-space:nowrap">${new Date(e.timestamp).toLocaleTimeString()}</span>
  </div>`).join("") || "<div style='color:#555'>no events</div>"}
  </div>
</div>

${visionScreenshots.length ? `
<div class="section">
  <div class="section-header">Vision Snapshots</div>
  <div class="section-body"><div class="screenshots">
  ${visionScreenshots.map(e => `<div class="shot">
    <img src="/visual?route=${encodeURIComponent(String(e.data.route ?? ""))}&view=${encodeURIComponent(String(e.data.view ?? ""))}" onerror="this.style.display='none'">
    <div class="shot-label">${e.data.route} · ${e.data.view}</div>
  </div>`).join("")}
  </div></div>
</div>` : ""}

<div style="padding:12px 20px;color:#444;font-size:11px">Last updated: ${new Date().toLocaleTimeString()}</div>
</body></html>`;
}

function startDaemonServer(
  writer: StatusWriter,
  sessionId: string,
  taskQueue?: TaskQueue,
): DaemonServer {
  let currentSessionId = sessionId;

  try {
    const server = Bun.serve({
      port: STATS_PORT,
      async fetch(req) {
        const url = new URL(req.url);

        // HTML dashboard at root
        if (url.pathname === "/" || url.pathname === "/dashboard") {
          const stats = { sessionId: currentSessionId, ...writer.getStats() };
          const tasks = taskQueue ? taskQueue.list() : null;
          return new Response(buildDashboardHtml(stats, tasks), {
            headers: { "Content-Type": "text/html; charset=utf-8", "Access-Control-Allow-Origin": "*" },
          });
        }

        if (url.pathname === "/stats") {
          return new Response(
            JSON.stringify({ sessionId: currentSessionId, ...writer.getStats() }, null, 2),
            { headers: JSON_HEADERS },
          );
        }

        if (url.pathname === "/tasks" && taskQueue) {
          return new Response(JSON.stringify(taskQueue.list(), null, 2), { headers: JSON_HEADERS });
        }

        if (url.pathname === "/submit" && req.method === "POST" && taskQueue) {
          try {
            const body = (await req.json()) as { query?: string };
            if (!body.query || typeof body.query !== "string") {
              return new Response(JSON.stringify({ error: "Missing 'query' field" }), {
                status: 400,
                headers: JSON_HEADERS,
              });
            }
            const task = taskQueue.submit(body.query);
            console.log(`\x1b[35m[Daemon] Task submitted: ${task.id} -- ${body.query.slice(0, 80)}\x1b[0m`);
            return new Response(JSON.stringify(task, null, 2), { status: 201, headers: JSON_HEADERS });
          } catch {
            return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
              status: 400,
              headers: JSON_HEADERS,
            });
          }
        }

        const endpoints = ["/", "/stats", ...(taskQueue ? ["/tasks", "/submit (POST)"] : [])];
        return new Response(JSON.stringify({ endpoints }), { headers: JSON_HEADERS });
      },
    });

    const mode = taskQueue ? "Daemon" : "Stats";
    console.log(`\x1b[90m${mode} server: http://localhost:${server.port}/stats\x1b[0m`);
    return {
      stop: () => server.stop(),
      updateSession: (id: string) => { currentSessionId = id; },
    };
  } catch {
    console.log(`\x1b[33mDaemon server skipped (port ${STATS_PORT} in use)\x1b[0m`);
    return { stop: () => {}, updateSession: () => {} };
  }
}

// ============================================
// TYPES
// ============================================

export interface QueryOptions {
  apiKey: string;
  args: CLIArgs;
  systemPrompt: string;
  tools: ToolDefinition[];
  query: string;
  sessionStore: SessionStore;
  sessionId: string;
  hookManager: HookManager;
  workingDirectory: string;
  gitStatus?: GitStatus | null;
  /** Shared StatusWriter from daemon -- skips creating a new one */
  sharedStatusWriter?: StatusWriter;
  /** MCP clients map — passed to vision verification for Playwright-based routing */
  mcpClients?: Map<string, import("../../../mcp/client.js").MCPClientImpl>;
}

// ============================================
// SINGLE QUERY RUNNER
// ============================================

export interface QueryResult {
  cost: number;
  handoffs: number;
}

export async function runSingleQuery(options: QueryOptions): Promise<QueryResult> {
  const {
    apiKey,
    args,
    systemPrompt,
    tools,
    query: originalQuery,
    sessionStore,
    sessionId,
    hookManager,
    workingDirectory,
    gitStatus,
  } = options;

  const initialStatusOptions: StatusLineOptions = {
    permissionMode: args.permissionMode,
    tokensUsed: 0,
    maxTokens: getContextWindow(args.model),
    model: args.model,
    isLoading: true,
  };
  console.log(`\x1b[90m${renderStatusLine(initialStatusOptions)}\x1b[0m\n`);

  let totalTokens = 0;
  let cumulativeCost = 0;

  const ownsWriter = !options.sharedStatusWriter;
  const statusWriter = options.sharedStatusWriter
    ?? new StatusWriter(`${workingDirectory}/.coder/stats-${sessionId}.json`);
  const statsServer = ownsWriter
    ? startDaemonServer(statusWriter, sessionId)
    : { stop: () => {}, updateSession: () => {} };
  const pendingTools = new Map<string, { name: string; startMs: number }>();
  let turnCounter = 0;

  const extendedThinkingConfig: ExtendedThinkingConfig | undefined = args.extendedThinking
    ? {
        enabled: true,
        effort: args.effort ?? "medium",
        interleaved: args.interleaved ?? true,
      }
    : undefined;

  let currentQuery = originalQuery;
  let handoffCount = 0;

  try {
    while (handoffCount <= MAX_HANDOFF_SESSIONS) {
      if (handoffCount > 0) {
        console.log(
          `\n\x1b[1m\x1b[35m[Handoff ${handoffCount}/${MAX_HANDOFF_SESSIONS}] Starting fresh session...\x1b[0m\n`
        );
        await new Promise((r) => setTimeout(r, HANDOFF_COOLDOWN_MS));
      }

      const messages: Message[] = [
        { role: "user", content: [{ type: "text", text: currentQuery }] },
      ];

      if (handoffCount === 0) {
        await sessionStore.saveMessage(messages[0]!);
      }

      const highlighter = createStreamHighlighter();
      let thinkingLabeled = false;
      let responseLabeled = false;

      const result = await agentLoop(messages, {
        apiKey,
        model: args.model,
        maxTokens: args.maxTokens || undefined,
        systemPrompt,
        tools,
        permissionMode: args.permissionMode,
        workingDirectory,
        gitStatus: gitStatus ?? undefined,
        extendedThinking: extendedThinkingConfig,
        hookManager,
        sessionId: handoffCount === 0 ? sessionId : `${sessionId}-h${handoffCount}`,
        stopSequences: args.stopSequences,
        resultConditions: args.resultConditions
          ? createResultConditionsConfig(args.resultConditions, {
              stopOnUnhandledError: args.stopOnUnhandledError,
            })
          : undefined,
        continuation: RALPH_CONTINUATION_CONFIG,
        onText: (text) => {
          if (!responseLabeled) {
            process.stdout.write(`\x1b[1m\x1b[36m[Response]\x1b[0m\n`);
            responseLabeled = true;
          }
          const highlighted = highlighter.process(text);
          if (highlighted) process.stdout.write(highlighted);
        },
        onThinking: (thinking) => {
          if (!thinkingLabeled) {
            process.stdout.write(`\x1b[90m\x1b[3m[Thinking]\x1b[0m\n`);
            thinkingLabeled = true;
          }
          process.stdout.write(`\x1b[90m${thinking}\x1b[0m`);
        },
        onToolUse: (tu) => {
          const inputPreview = JSON.stringify(tu.input).slice(0, 100);
          console.log(`\x1b[33m\u25b6 ${tu.name}\x1b[0m ${inputPreview}${inputPreview.length >= 100 ? "..." : ""}`);
          pendingTools.set(tu.id, { name: tu.name, startMs: Date.now() });
          const filePath = (tu.input as Record<string, unknown>)?.file_path as string | undefined;
          if (filePath) {
            if (tu.name === "Read") statusWriter.recordFileRead(filePath);
            else if (tu.name === "Write") statusWriter.recordFileCreate(filePath);
            else if (tu.name === "Edit") statusWriter.recordFileEdit(filePath);
          }
        },
        onToolResult: (tr) => {
          const output = typeof tr.result.content === "string"
            ? tr.result.content.slice(0, 300)
            : JSON.stringify(tr.result.content).slice(0, 300);
          const isError = tr.result.is_error;
          const prefix = isError ? "\x1b[31m\u2717 Error:\x1b[0m" : "\x1b[32m\u2713 Result:\x1b[0m";
          console.log(`${prefix} ${output}${output.length >= 300 ? "..." : ""}`);
          const pending = pendingTools.get(tr.id);
          const toolName = pending?.name ?? "unknown";
          const durationMs = pending ? Date.now() - pending.startMs : 0;
          pendingTools.delete(tr.id);
          statusWriter.recordToolUse(toolName, durationMs, !isError, isError ? output : undefined);
        },
        onMetrics: async (metrics) => {
          turnCounter++;
          totalTokens = metrics.usage.input_tokens + metrics.usage.output_tokens;
          statusWriter.updateTokens(metrics.usage.input_tokens, metrics.usage.output_tokens);
          statusWriter.recordApiLatency(metrics.durationMs ?? 0);
          statusWriter.recordEvent("turn_complete", {
            turn: turnCounter,
            cost: metrics.costUSD,
            tokensIn: metrics.usage.input_tokens,
            tokensOut: metrics.usage.output_tokens,
            handoff: handoffCount,
          });
          console.log(`\n\x1b[90m${formatCostBrief(metrics)}\x1b[0m`);
          await sessionStore.saveMetrics(metrics);
        },
      });

      const remaining = highlighter.flush();
      if (remaining) process.stdout.write(remaining);

      const lastMessage = result.messages[result.messages.length - 1];
      if (lastMessage && lastMessage.role === "assistant") {
        await sessionStore.saveMessage(lastMessage);
      }

      cumulativeCost += result.totalCost;

      if (result.endReason === "degeneration") {
        handoffCount++;
        statusWriter.recordEvent("session_handoff", {
          handoff: handoffCount,
          previousCost: result.totalCost,
          previousTurns: result.metrics.length,
          reason: "degeneration",
        });

        if (handoffCount > MAX_HANDOFF_SESSIONS) {
          console.log(
            `\x1b[31m[Handoff] Max sessions (${MAX_HANDOFF_SESSIONS}) reached. Stopping.\x1b[0m`
          );
          break;
        }

        currentQuery = await buildHandoffPrompt(originalQuery, result, workingDirectory, handoffCount);
        console.log(
          `\x1b[35m[Handoff] Session degenerated after ${result.metrics.length} turns ($${result.totalCost.toFixed(4)}). Building fresh context...\x1b[0m`
        );
        continue;
      }

      // Normal completion -- done
      break;
    }

    const finalStatusOptions: StatusLineOptions = {
      permissionMode: args.permissionMode,
      tokensUsed: totalTokens,
      maxTokens: getContextWindow(args.model),
      model: args.model,
      isLoading: false,
    };
    console.log(`\n\x1b[90m${renderStatusLine(finalStatusOptions)}\x1b[0m`);
    console.log(`\x1b[90mSession: ${sessionId} (handoffs: ${handoffCount})\x1b[0m`);
    console.log(`\x1b[90mTotal cost: ${formatCost(cumulativeCost)}\x1b[0m`);

    return { cost: cumulativeCost, handoffs: handoffCount };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${errorMessage}`);
    if (ownsWriter) { statusWriter.stop(); statsServer.stop(); }
    throw error;
  } finally {
    if (ownsWriter) { statusWriter.stop(); statsServer.stop(); }
  }
}

// ============================================
// DAEMON MODE -- 24/7 task loop
// ============================================

export interface DaemonOptions extends Omit<QueryOptions, "query"> {
  initialTask?: string;
  /** Disable self-assessment when queue is empty */
  noAutoAssess?: boolean;
}

function gatherWorkspaceSignals(workingDirectory: string): string {
  const signals: string[] = [];

  // Git status scoped to workingDirectory only (use -- . to restrict)
  try {
    const status = execSync("git status --short -- . 2>/dev/null", {
      cwd: workingDirectory,
      timeout: 10_000,
    }).toString().trim();
    if (status) signals.push(`GIT STATUS (uncommitted in ${workingDirectory}):\n${status}`);
  } catch { /* not a git repo */ }

  // Build check scoped to workingDirectory
  try {
    const buildResult = execSync(
      "bun run build 2>&1 || npx tsc --noEmit 2>&1",
      { cwd: workingDirectory, timeout: 30_000 },
    ).toString().trim();
    if (buildResult && /error/i.test(buildResult)) {
      signals.push(`BUILD ERRORS:\n${buildResult.slice(0, 2000)}`);
    }
  } catch (e) {
    const out = (e as { stdout?: Buffer })?.stdout?.toString() || "";
    if (out && /error/i.test(out)) {
      signals.push(`BUILD ERRORS:\n${out.slice(0, 2000)}`);
    }
  }

  // Tests scoped to workingDirectory
  try {
    const testResult = execSync("bun test 2>&1", {
      cwd: workingDirectory,
      timeout: 60_000,
    }).toString().trim();
    const failMatch = testResult.match(/(\d+)\s+fail/i);
    if (failMatch && parseInt(failMatch[1]!) > 0) {
      signals.push(`TEST FAILURES:\n${testResult.slice(-1500)}`);
    }
  } catch (e) {
    const out = (e as { stdout?: Buffer })?.stdout?.toString() || "";
    if (out) signals.push(`TEST OUTPUT:\n${out.slice(-1500)}`);
  }

  try {
    const todos = execSync(
      "rg -n 'TODO|FIXME|HACK|XXX' --type ts -g '!node_modules' -g '!dist' 2>/dev/null | head -20",
      { cwd: workingDirectory, timeout: 10_000 },
    ).toString().trim();
    if (todos) signals.push(`CODE TODOS:\n${todos}`);
  } catch { /* rg not available or no matches */ }

  // PROGRESS.md: open todos, unchecked items, planned features
  const progressPath = join(workingDirectory, "PROGRESS.md");
  if (existsSync(progressPath)) {
    try {
      const raw = readFileSync(progressPath, "utf-8");
      const todoLines = raw.split("\n").filter(
        (l) => /\[ \]|TODO|FIXME|NEXT|remaining|not yet/i.test(l),
      );
      if (todoLines.length > 0) {
        signals.push(`OPEN TODOS (from PROGRESS.md):\n${todoLines.slice(0, 20).join("\n")}`);
      }
      const unchecked = raw.split("\n").filter((l) => /^\s*-\s*\[ \]/.test(l));
      if (unchecked.length > 0) {
        signals.push(`UNCHECKED ITEMS IN PROGRESS.md:\n${unchecked.slice(0, 15).join("\n")}`);
      }
      const futureLines = raw.split("\n").filter((l) =>
        /power.up|custom word|AI opponent|voice chat|achievement|leaderboard|spectator|replay|tournament/i.test(l)
          && !/\[x\]/i.test(l),
      );
      if (futureLines.length > 0) {
        signals.push(`PLANNED FEATURES (not yet built):\n${futureLines.slice(0, 10).join("\n")}`);
      }
    } catch { /* ignore */ }
  }

  // Detect source files with no corresponding test file
  try {
    const srcFiles = execSync(
      "find src -name '*.ts' ! -name '*.test.ts' ! -name '*.d.ts' -not -path '*/node_modules/*' 2>/dev/null | head -20",
      { cwd: workingDirectory, timeout: 10_000 },
    ).toString().trim().split("\n").filter(Boolean);
    const testFiles = execSync(
      "find src -name '*.test.ts' 2>/dev/null | head -20",
      { cwd: workingDirectory, timeout: 10_000 },
    ).toString().trim().split("\n").filter(Boolean);
    const testBases = new Set(testFiles.map((f) => f.replace(/\.test\.ts$/, ".ts")));
    const untested = srcFiles.filter((f) => !testBases.has(f));
    if (untested.length > 0) {
      signals.push(`SOURCE FILES WITH NO TESTS:\n${untested.slice(0, 10).join("\n")}`);
    }
  } catch { /* ignore */ }

  // If signals are still empty, force feature-expansion mode
  if (signals.length === 0) {
    try {
      const srcTree = execSync(
        "find src -name '*.ts' ! -name '*.d.ts' -not -path '*/node_modules/*' 2>/dev/null | head -30",
        { cwd: workingDirectory, timeout: 10_000 },
      ).toString().trim();
      signals.push(
        `PROJECT IS CLEAN. Expand it with new features.\n` +
        `Source files:\n${srcTree}\n\n` +
        `Suggested directions: add power-ups, custom word lists, AI opponent, ` +
        `improved animations, better error states, accessibility improvements, ` +
        `more robust multiplayer reconnection, spectator mode, replay viewer.`,
      );
    } catch { /* ignore */ }
  }

  return signals.join("\n\n");
}

/**
 * Post-task verification: runs QualityGate and vision checks automatically.
 * Recorded in stats as MCP calls so they appear in the mcpCalls array.
 */
async function runPostTaskVerification(
  workingDirectory: string,
  taskId: string,
  statusWriter: StatusWriter,
  mcpClients?: Map<string, import("../../../mcp/client.js").MCPClientImpl>,
): Promise<void> {
  // 1. QualityGate (build + test + typecheck)
  const gateStart = Date.now();
  try {
    const gate = await verifyQualityGate(workingDirectory);
    const gateMs = Date.now() - gateStart;
    const gateStatus = gate.passed ? "\x1b[32mPASSED\x1b[0m" : "\x1b[31mFAILED\x1b[0m";
    console.log(
      `\x1b[90m[QualityGate] ${gateStatus} -- tests: ${gate.tests.pass}/${gate.tests.pass + gate.tests.fail}, ts errors: ${gate.tsErrors}, changed: ${gate.filesChanged.length}\x1b[0m`,
    );
    // isError = true only when TS errors exist (compilation broken); test failures are expected signals
    statusWriter.recordMcpCall("daemon", "QualityGate", gateMs, gate.tsErrors > 0);
    statusWriter.recordEvent("quality_gate", {
      taskId,
      passed: gate.passed,
      testsPassed: gate.tests.pass,
      testsFailed: gate.tests.fail,
      tsErrors: gate.tsErrors,
      changedFiles: gate.filesChanged.length,
    });
  } catch (err) {
    console.log(`\x1b[33m[QualityGate] Skipped: ${err instanceof Error ? err.message : err}\x1b[0m`);
  }

  // 2. Vision verification for web projects
  // Hard 90s budget for entire vision run — prevents Chrome/Playwright hangs from blocking the daemon
  await Promise.race([
    runVisionVerification(workingDirectory, taskId, statusWriter, mcpClients),
    new Promise<void>((resolve) => setTimeout(() => {
      console.log("\x1b[33m[Vision] Total timeout (90s) — skipping remaining screenshots\x1b[0m");
      resolve();
    }, 90_000)),
  ]);
}

/**
 * Start the project's dev server, screenshot it, analyze with vision LLM, then tear down.
 * Only runs for projects with web dependencies and a dev/start script.
 */
async function runVisionVerification(
  workingDirectory: string,
  taskId: string,
  statusWriter: StatusWriter,
  mcpClients?: Map<string, import("../../../mcp/client.js").MCPClientImpl>,
): Promise<void> {
  const pkgPath = join(workingDirectory, "package.json");
  if (!existsSync(pkgPath)) return;

  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  } catch { return; }

  const deps = { ...(pkg.dependencies as Record<string, string> ?? {}), ...(pkg.devDependencies as Record<string, string> ?? {}) };
  const isWebProject = deps.express || deps.three || deps.react || deps.next || deps.vite || deps.svelte;
  if (!isWebProject) return;

  // Determine which script to run and expected port
  const scripts = (pkg.scripts ?? {}) as Record<string, string>;
  const scriptName = scripts.dev ? "dev" : scripts.start ? "start" : scripts.serve ? "serve" : null;
  if (!scriptName) return;

  const scriptValue = scripts[scriptName]!;
  const portMatch = scriptValue.match(/--port\s+(\d+)|PORT=(\d+)/);
  const expectedPort = portMatch ? parseInt(portMatch[1] || portMatch[2]!, 10) : 3000;

  const visionStart = Date.now();
  let serverProc: ReturnType<typeof import("child_process").spawn> | null = null;

  try {
    // Build first if a build script exists (needed for bundled SPAs)
    if (scripts.build) {
      try {
        execSync("bun run build", { cwd: workingDirectory, timeout: 30_000, stdio: "ignore" });
      } catch { /* build optional -- server may work without it */ }
    }

    // Start dev server via `bun run <scriptName>` (not the script value directly)
    const { spawn } = await import("child_process");
    console.log(`\x1b[90m[Vision] Starting: bun run ${scriptName} (port ${expectedPort})\x1b[0m`);
    serverProc = spawn("bun", ["run", scriptName], {
      cwd: workingDirectory,
      stdio: "ignore",
      detached: true,
      env: { ...process.env, PORT: String(expectedPort) },
    });
    serverProc.unref();

    // Wait for port to respond (up to 15s)
    let ready = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise((r) => setTimeout(r, 500));
      try {
        execSync(`curl -s -o /dev/null -w "%{http_code}" http://localhost:${expectedPort}`, { timeout: 2000 });
        ready = true;
        break;
      } catch { /* not yet */ }
    }

    if (!ready) {
      console.log(`\x1b[33m[Vision] Server didn't start on port ${expectedPort} within 15s\x1b[0m`);
      statusWriter.recordMcpCall("vision", "screenshot_verify", Date.now() - visionStart, true);
      return;
    }

    const { appendFileSync, copyFileSync, mkdirSync: mkdirSyncFs } = await import("fs");
    const { getVisionLLM } = await import("../../../../core/meta-llm-client.js");
    const { readImageFile } = await import("../../../../core/image.js");

    const coderDir = join(workingDirectory, ".coder");
    if (!existsSync(coderDir)) mkdirSyncFs(coderDir, { recursive: true });
    const cacheVisualsDir = join(coderDir, "visuals");
    if (!existsSync(cacheVisualsDir)) mkdirSyncFs(cacheVisualsDir, { recursive: true });
    const projectVisualsDir = join(workingDirectory, "visuals");
    if (!existsSync(projectVisualsDir)) mkdirSyncFs(projectVisualsDir, { recursive: true });

    // Prune both visuals dirs: keep newest 30 files to prevent unbounded disk growth
    for (const dir of [cacheVisualsDir, projectVisualsDir]) {
      try {
        const { readdirSync, statSync, unlinkSync } = await import("fs");
        const pngs = readdirSync(dir)
          .filter((f: string) => f.endsWith(".png"))
          .map((f: string) => ({ f, mt: statSync(join(dir, f)).mtimeMs }))
          .sort((a: { mt: number }, b: { mt: number }) => b.mt - a.mt);
        pngs.slice(30).forEach(({ f }: { f: string }) => { try { unlinkSync(join(dir, f)); } catch {} });
      } catch {}
    }
    const logPath = join(workingDirectory, "VISUAL_LOG.md");
    if (!existsSync(logPath)) {
      appendFileSync(logPath, "# Visual Verification Log\n\nAutomated screenshots and vision analysis from daemon runs.\n\n---\n");
    }

    const baseUrl = `http://localhost:${expectedPort}`;
    const chromePath = resolveHeadlessChromeExecutable();

    // Discover app routes from source files — prefers explicit declarations over broad scanning
    function discoverRoutes(dir: string): string[] {
      const routes = new Set<string>(["/"]);
      const srcDir = join(dir, "src");

      // 1. TypeScript union type: PageName = "auth" | "dashboard" | "lobby" | ...
      //    Most SPA routers define pages as a type union
      try {
        const typePattern = String.raw`PageName\s*=\s*([^;]+);`;
        const routerCandidates = [
          join(srcDir, "router.ts"), join(srcDir, "routes.ts"),
          join(srcDir, "router.js"), join(srcDir, "pages.ts"),
        ].filter(existsSync);
        for (const f of routerCandidates) {
          const content = readFileSync(f, "utf-8");
          const m = content.match(new RegExp(typePattern));
          if (m) {
            // Extract quoted strings from the union: "auth" | "dashboard" | ...
            const names = (m[1]?.match(/"([^"]+)"|'([^']+)'/g) || [])
              .map((s) => s.replace(/['"]/g, ""));
            names.forEach((n) => { if (n) routes.add(`#${n}`); });
          }
          // Also pull navigate("pageName") literal calls
          const navMatches = content.match(/navigate\(["']([a-zA-Z][a-zA-Z0-9_-]+)["']/g) || [];
          navMatches.forEach((s) => {
            const name = s.match(/["']([a-zA-Z][a-zA-Z0-9_-]+)["']/)?.[1];
            if (name) routes.add(`#${name}`);
          });
        }
      } catch { /* ignore */ }

      // 2. Express/Bun HTTP route registrations: app.get("/path", ...)
      try {
        const serverCandidates = [
          join(dir, "server/index.ts"), join(dir, "server/index.js"),
          join(dir, "src/server.ts"), join(dir, "app.ts"),
        ].filter(existsSync);
        for (const f of serverCandidates) {
          const content = readFileSync(f, "utf-8");
          const matches = content.match(/\.(get|post|all)\(["'](\/[a-zA-Z0-9/_:-]*)['"]/g) || [];
          matches.forEach((s) => {
            const path = s.match(/["'](\/[a-zA-Z0-9/_:-]*)['"]/)?.[1];
            // Only add paths that look like pages (no :id params, not /api/)
            if (path && !path.includes(":") && !path.startsWith("/api") && path !== "/") {
              routes.add(path);
            }
          });
        }
      } catch { /* ignore */ }

      // 3. Fallback: just root if nothing found
      return [...routes].slice(0, 10);
    }

    const appRoutes = discoverRoutes(workingDirectory);
    console.log(`\x1b[90m[Vision] Routes discovered: ${appRoutes.join(", ")}\x1b[0m`);

    // Prefer reusing an already-running server (agent started it → WebGL already rendered)
    let usedExistingServer = false;
    try {
      execSync(`curl -s -o /dev/null -w "%{http_code}" http://localhost:${expectedPort}`, { timeout: 2000 });
      usedExistingServer = true;
      console.log(`\x1b[90m[Vision] Reusing existing server on port ${expectedPort}\x1b[0m`);
    } catch { /* nothing running, proceed to start */ }

    if (usedExistingServer) {
      await new Promise((r) => setTimeout(r, 1000));
    } else {
      await new Promise((r) => setTimeout(r, 4000));
    }

    let anySuccess = false;

    // Resolve browser MCP client if available (dev-browser / Playwright — real navigation + in-page actions)
    const browserMcpClient = mcpClients?.get("browser") ?? null;

    /** Parse screenshot path from browser_execute_script stdout (last JSON line with "path") */
    function parseDevBrowserScreenshotPathFromMcpText(raw: string): string | null {
      try {
        const outer = JSON.parse(raw) as { success?: boolean; output?: string };
        if (outer.success === false) return null;
        const lines = (outer.output || "").trim().split("\n").filter(Boolean);
        for (let i = lines.length - 1; i >= 0; i--) {
          try {
            const p = JSON.parse(lines[i]!) as { path?: string };
            if (p.path && existsSync(p.path)) return p.path;
          } catch { /* line not JSON */ }
        }
      } catch { /* ignore */ }
      return null;
    }

    /**
     * One dev-browser script: goto, viewport, wait for SPA, scroll/resize (canvas/WebGL), screenshot.
     * Separate MCP calls do not share page state with dev-browser CLI — must be one execute_script.
     */
    async function captureViaBrowserMcpHarness(
      routeUrl: string,
      width: number,
      height: number,
      outFile: string,
    ): Promise<boolean> {
      if (!browserMcpClient?.connected) return false;
      const safeFilename = `coder-vision-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.png`;
      const script = `
const page = await browser.getPage("main");
const url = ${JSON.stringify(routeUrl)};
await page.goto(url, { waitUntil: "domcontentloaded" });
await page.setViewportSize({ width: ${width}, height: ${height} });
await page.evaluate(() => new Promise((r) => setTimeout(r, 1800)));
await page.evaluate(() => {
  window.dispatchEvent(new Event("resize"));
  const h = document.documentElement.scrollHeight || 1;
  window.scrollTo(0, Math.min(400, Math.floor(h / 3)));
});
const buf = await page.screenshot();
const path = await saveScreenshot(buf, ${JSON.stringify(safeFilename)});
console.log(JSON.stringify({ path }));
`;
      const t0 = Date.now();
      try {
        const r = await Promise.race([
          browserMcpClient.callTool("browser_execute_script", { script, headless: true }),
          new Promise<never>((_, rej) =>
            setTimeout(() => rej(new Error("browser_execute_script timeout")), 45_000)),
        ]);
        const text = typeof r.content === "string" ? r.content : "";
        const ms = Date.now() - t0;
        let harnessOk = true;
        try {
          const j = JSON.parse(text) as { success?: boolean };
          if (j.success === false) harnessOk = false;
        } catch { harnessOk = false; }
        statusWriter.recordMcpCall("browser", "browser_execute_script", ms, !harnessOk);
        if (!harnessOk) return false;
        const shotPath = parseDevBrowserScreenshotPathFromMcpText(text);
        if (!shotPath) return false;
        if (statSync(shotPath).size < 800) return false;
        copyFileSync(shotPath, outFile);
        return true;
      } catch {
        statusWriter.recordMcpCall("browser", "browser_execute_script", Date.now() - t0, true);
        return false;
      }
    }

    // Screenshot each route at desktop + mobile
    for (const route of appRoutes) {
      const routeUrl = route.startsWith("#")
        ? `${baseUrl}/${route}`
        : `${baseUrl}${route === "/" ? "" : route}`;
      const routeSlug = route.replace(/[^a-zA-Z0-9]/g, "-").replace(/^-/, "") || "home";

      for (const viewport of [
        { name: "desktop", width: 1280, height: 720 },
        { name: "mobile", width: 375, height: 812 },
      ]) {
        const viewStart = Date.now();
        const viewTs = new Date().toISOString().replace(/[:.]/g, "-");
        const label = `${routeSlug}-${viewport.name}`;
        const cachePath = join(cacheVisualsDir, `${viewTs}-${label}.png`);
        const readableName = `${label}-${viewTs}.png`;
        const projectPath = join(projectVisualsDir, readableName);

        // 1) Browser MCP (dev-browser): one script = goto + viewport + wait + scroll/resize + screenshot (real in-page actions)
        // 2) Headless Chrome: SwiftShader fallback when dev-browser missing or script fails
        let captured = await captureViaBrowserMcpHarness(routeUrl, viewport.width, viewport.height, cachePath);
        if (!captured && chromePath) {
          const args = [
            "--headless=new", "--no-sandbox", "--disable-dev-shm-usage",
            "--use-gl=angle", "--use-angle=swiftshader",
            "--run-all-compositor-stages-before-draw",
            "--virtual-time-budget=3000",
            `--screenshot=${cachePath}`,
            `--window-size=${viewport.width},${viewport.height}`,
            routeUrl,
          ];
          const { spawnSync: ss } = await import("child_process");
          const r = ss(chromePath, args, { stdio: "ignore", timeout: 35_000 });
          captured = r.status === 0 && existsSync(cachePath) && statSync(cachePath).size > 800;
        }

        if (!captured) {
          console.log(`\x1b[33m[Vision] ${label}: capture failed\x1b[0m`);
          statusWriter.recordMcpCall("vision", `screenshot_${label}`, Date.now() - viewStart, true);
          continue;
        }

        try { copyFileSync(cachePath, projectPath); } catch {
          statusWriter.recordMcpCall("vision", `screenshot_${label}`, Date.now() - viewStart, true);
          continue;
        }

        let analysisText = "";
        try {
          console.log(`\x1b[90m[Vision] analysing ${label} (${cachePath})\x1b[0m`);
          const imgData = await readImageFile(cachePath);
          console.log(`\x1b[90m[Vision] image loaded ${(imgData.base64.length / 1024).toFixed(0)}KB b64, calling LLM\x1b[0m`);
          const analysis = await getVisionLLM().completeWithImage(
            "You are a UI quality verifier. Be concise.",
            `Route "${route}" · ${viewport.name} ${viewport.width}x${viewport.height}. ` +
            `Is the UI rendered? List visible components and any errors in 2 sentences max.`,
            { base64: imgData.base64, mediaType: imgData.mediaType },
            512,
          );
          analysisText = analysis?.text?.trim() || "";
          console.log(`\x1b[90m[Vision] LLM result: ${analysisText.slice(0, 80) || "(empty)"}\x1b[0m`);
        } catch (e) {
          console.error(`\x1b[33m[Vision] analysis error for ${label}: ${e instanceof Error ? e.message : String(e)}\x1b[0m`);
        }

        const viewMs = Date.now() - viewStart;
        const looksBroken = /mostly black|blank page|empty|no visible content|entirely black/i.test(analysisText);
        const isViewError = !analysisText || looksBroken;
        anySuccess = anySuccess || !isViewError;

        if (analysisText) {
          console.log(`\x1b[90m[Vision] ${routeSlug}/${viewport.name}: ${analysisText.slice(0, 120)}\x1b[0m`);
        }

        statusWriter.recordMcpCall("vision", `screenshot_${label}`, viewMs, isViewError);
        statusWriter.recordEvent("vision_verify", { taskId, route, view: viewport.name, port: expectedPort, analysis: analysisText?.slice(0, 300) });

        try {
          appendFileSync(logPath, [
            `\n## ${new Date().toISOString()} -- Task \`${taskId}\` -- \`${route}\` (${viewport.name} ${viewport.width}x${viewport.height})\n`,
            `**URL:** ${routeUrl}  **Verdict:** ${isViewError ? "FAILED" : "OK"}  **Latency:** ${viewMs}ms\n`,
            `![${label}](visuals/${readableName})\n`,
            analysisText ? `> ${analysisText.replace(/\n/g, "\n> ")}\n` : "> (no analysis)\n",
            "---\n",
          ].join("\n"));
        } catch { /* best-effort */ }
      }
    }

    const visionMs = Date.now() - visionStart;
    if (!anySuccess) {
      statusWriter.recordMcpCall("vision", "screenshot_verify", visionMs, true);
    }
  } catch (err) {
    console.log(`\x1b[33m[Vision] Error: ${err instanceof Error ? err.message : err}\x1b[0m`);
    statusWriter.recordMcpCall("vision", "screenshot_verify", Date.now() - visionStart, true);
  } finally {
    // Kill the dev server
    if (serverProc?.pid) {
      try {
        process.kill(-serverProc.pid, "SIGTERM");
      } catch {
        try { process.kill(serverProc.pid, "SIGKILL"); } catch { /* already dead */ }
      }
    }
    // Also kill anything on the port as fallback
    try {
      execSync(`lsof -ti:${expectedPort} | xargs kill -9 2>/dev/null`, { timeout: 3000 });
    } catch { /* nothing to kill */ }
  }
}

async function buildSelfAssessmentTask(
  workingDirectory: string,
  completedCount: number,
  recentTaskSummaries: string[],
  cap: ToolCapabilityMap,
): Promise<string | null> {
  const signals = gatherWorkspaceSignals(workingDirectory);

  if (!signals) return null;

  const scopeRule = `SCOPE CONSTRAINT: You MUST only work on files inside ${workingDirectory}. Do NOT touch files outside this directory.`;

  const dedupBlock = recentTaskSummaries.length > 0
    ? `\nALREADY COMPLETED (do NOT repeat these):\n${recentTaskSummaries.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n`
    : "";

  const mcpTools = cap._all.filter((t) => t.name?.startsWith("mcp__")).map((t) => t.name);
  const pluginToolNames = cap._all
    .filter((t) => t.name && !t.name.startsWith("mcp__") && !builtInTools.some((b) => b.name === t.name))
    .map((t) => t.name);

  const browserTools = mcpTools.filter((t) => t?.includes("browser"));
  const hasBrowserMcp = browserTools.length > 0;

  const browserBlock = hasBrowserMcp
    ? [
        ``,
        `BROWSER TESTING (REQUIRED for any web project):`,
        `After writing or modifying code, you MUST:`,
        `  1. Start the dev server (Bash: bun run dev) if not already running`,
        `  2. Navigate to the app (${browserTools.find((t) => t?.includes("navigate")) || "mcp__browser__browser_navigate"})`,
        `  3. Click through every major page/view — don't just look at the homepage`,
        `  4. Fill forms, press buttons, trigger state changes`,
        `  5. Screenshot each meaningful state (${browserTools.find((t) => t?.includes("screenshot")) || "mcp__browser__browser_screenshot"})`,
        `  6. Write findings + screenshot paths to VISUAL_LOG.md`,
        `This is non-optional — tool calls beat file reads for verification.`,
      ].join("\n")
    : "";

  // Use meta-LLM to pick the most impactful task from raw signals
  try {
    const { getMetaLLM } = await import("../../../../core/meta-llm-client.js");
    const result = await getMetaLLM().complete(
      [
        `You are an autonomous daemon task planner scoped to: ${workingDirectory}`,
        `Given workspace signals, produce a SINGLE actionable task description.`,
        `The task must be specific: name the exact file(s) and what to do.`,
        `ONLY reference files inside ${workingDirectory}. Ignore signals from other directories.`,
        ``,
        `Priority order:`,
        `  1. Build errors or test failures → fix immediately, name exact file + line`,
        `  2. Code TODOs / FIXMEs in source files → implement them`,
        `  3. UNCHECKED items in PROGRESS.md → implement one`,
        `  4. PLANNED FEATURES listed in signals → implement the most impactful one (name the file to create/edit)`,
        `  5. SOURCE FILES WITH NO TESTS → add a test file for one of them`,
        `  6. Performance / bundle size improvements`,
        `  7. Accessibility (ARIA labels, keyboard nav, color contrast)`,
        `  8. UI/UX polish (animations, responsive design, error states, loading states)`,
        `  9. Code quality (remove duplication, tighten types, reduce complexity)`,
        ` 10. Add JSDoc to exported functions in a file that lacks it`,
        ``,
        `If the project is clean with no obvious gaps, IMPLEMENT A NEW FEATURE. Pick one from the PLANNED FEATURES`,
        `signal or invent a meaningful improvement. Always name the exact file(s) to create or edit.`,
        `NEVER respond with NOTHING_ACTIONABLE — there is always something to build or improve.`,
        `NEVER generate a task that only commits/stages files. Commits are handled automatically.`,
        `Your task MUST result in writing or modifying actual source code, tests, or docs.`,
        recentTaskSummaries.length > 0
          ? `ALREADY DONE (do NOT repeat): ${recentTaskSummaries.join(" | ")}`
          : ``,
        `Output ONLY the task description, nothing else. Max 200 words.`,
      ].filter(Boolean).join("\n"),
      signals,
      512,
    );

    if (result?.text) {
      console.log(`\x1b[90m[SelfAssess] Meta-LLM task: ${result.inputTokens} in, ${result.outputTokens} out, ${result.durationMs}ms\x1b[0m`);

      const trimmed = result.text.trim();
      const isCommitOnly = /^(commit|stage|git add|git commit)\b/i.test(trimmed)
        && !/\b(fix|implement|add|create|update|refactor|test|improve)\b/i.test(trimmed);
      if (trimmed === "NOTHING_ACTIONABLE" || trimmed.length < 20 || isCommitOnly) {
        if (isCommitOnly) {
          console.log(`\x1b[90m[SelfAssess] Rejected commit-only task, falling through to improvement scan.\x1b[0m`);
        } else {
          console.log(`\x1b[90m[SelfAssess] Meta-LLM says nothing actionable, falling through to improvement scan.\x1b[0m`);
        }
        // Fall through to template-based assessment below
      } else {
        return [
          `[AUTONOMOUS ASSESSMENT -- self-generated task #${completedCount + 1}]`,
          scopeRule,
          result.text,
          browserBlock,
          dedupBlock,
        ].filter(Boolean).join("\n");
      }
    }
  } catch { /* fall through to template */ }

  return [
    `[AUTONOMOUS IMPROVEMENT -- self-generated task #${completedCount + 1}]`,
    scopeRule,
    `Pick ONE improvement (must write/modify code, not just commit):`,
    `  1. Add tests for any module with <80% coverage`,
    `  2. Performance: lazy loading, bundle size reduction, render optimization`,
    `  3. Accessibility: ARIA labels, keyboard navigation, screen reader support`,
    `  4. UI polish: better error states, loading indicators, responsive breakpoints`,
    `  5. Code quality: extract duplicated logic, improve TypeScript types, reduce complexity`,
    `  6. Documentation: update README with setup/usage, add JSDoc to public APIs`,
    browserBlock,
    dedupBlock,
    `NEVER edit files outside ${workingDirectory}.`,
    ``,
    `WORKSPACE SIGNALS:`,
    signals,
  ].join("\n");
}

export async function runDaemonLoop(options: DaemonOptions): Promise<never> {
  const { workingDirectory, sessionStore, sessionId } = options;

  const taskQueue = new TaskQueue(workingDirectory);
  const statsPath = `${workingDirectory}/.coder/stats-${sessionId}.json`;
  const statusWriter = new StatusWriter(statsPath);
  const server = startDaemonServer(statusWriter, sessionId, taskQueue);

  const recovered = taskQueue.recoverStale();
  if (recovered > 0) {
    console.log(`\x1b[33m[Daemon] Recovered ${recovered} stale task(s) from previous session.\x1b[0m`);
  }

  if (options.initialTask) {
    taskQueue.submit(options.initialTask);
  }

  // Build capability map once from all loaded tools — single source of truth
  const cap = buildToolCapabilities(options.tools ?? []);
  const mcpToolNames = cap._all.filter((t) => t.name?.startsWith("mcp__")).map((t) => t.name);
  const pluginToolNames = cap._all
    .filter((t) => t.name && !t.name.startsWith("mcp__") && !builtInTools.some((b) => b.name === t.name))
    .map((t) => t.name);

  let totalDaemonCost = 0;
  let tasksCompleted = 0;
  let tasksFailed = 0;
  let selfGeneratedTasks = 0;
  let lastAssessmentAt = 0;
  let assessCooldownMs = DAEMON_ASSESS_COOLDOWN_BASE_MS;
  let consecutiveCleanAssessments = 0;

  console.log(`\x1b[1m\x1b[35m[Daemon] Running. Submit tasks via:\x1b[0m`);
  console.log(`\x1b[35m  curl -X POST http://localhost:${STATS_PORT}/submit -d '{"query":"your task"}'\x1b[0m`);
  console.log(`\x1b[35m  Or append to ${workingDirectory}/.coder/tasks.jsonl\x1b[0m`);
  console.log(`\x1b[90m  View queue: http://localhost:${STATS_PORT}/tasks\x1b[0m`);
  console.log(`\x1b[90m  View stats: http://localhost:${STATS_PORT}/stats\x1b[0m`);
  if (mcpToolNames.length > 0) {
    console.log(`\x1b[90m  MCP tools: ${mcpToolNames.join(", ")}\x1b[0m`);
  }
  if (pluginToolNames.length > 0) {
    console.log(`\x1b[90m  Plugin tools: ${pluginToolNames.join(", ")}\x1b[0m`);
  }
  console.log();

  while (true) {
    let task = taskQueue.next();

    // User-submitted task resets cooldown backoff
    if (task && consecutiveCleanAssessments > 0) {
      consecutiveCleanAssessments = 0;
      assessCooldownMs = DAEMON_ASSESS_COOLDOWN_BASE_MS;
    }

    if (!task) {
      const now = Date.now();
      const canAssess =
        !options.noAutoAssess &&
        now - lastAssessmentAt > assessCooldownMs;

      if (canAssess) {
        lastAssessmentAt = now;

        // Auto-commit any pending changes BEFORE assessment to break the commit loop.
        // This way the Meta-LLM never sees uncommitted changes and can focus on real work.
        try {
          const gitStatus = execSync("git status --short -- . 2>/dev/null", {
            cwd: workingDirectory, timeout: 5_000,
          }).toString().trim();
          if (gitStatus) {
            console.log(`\x1b[90m[Daemon] Auto-committing ${gitStatus.split("\n").length} pending file(s) before assessment...\x1b[0m`);
            execSync("git add -A . && git commit -m 'chore(daemon): auto-commit pending changes' --no-verify 2>/dev/null", {
              cwd: workingDirectory, timeout: 15_000,
            });
            statusWriter.recordEvent("auto_commit", { files: gitStatus.split("\n").length });
          }
        } catch { /* commit failed or nothing to commit -- fine */ }

        console.log(`\n\x1b[35m[Daemon] Queue empty. Running self-assessment (cooldown: ${Math.round(assessCooldownMs / 1000)}s)...\x1b[0m`);
        statusWriter.recordEvent("self_assessment_start", { selfGenCount: selfGeneratedTasks, cooldownMs: assessCooldownMs });

        // Dedup: feed last 10 completed task summaries to the planner
        const recentTasks = taskQueue.recentCompleted(10);
        const recentSummaries = recentTasks.map((t) =>
          t.query
            .replace(/\[AUTONOMOUS ASSESSMENT[^\]]*\]\n?/g, "")
            .replace(/SCOPE CONSTRAINT:[^\n]*\n?/g, "")
            .replace(/You are a daemon[^\n]*\n?/g, "")
            .replace(/The meta-LLM[^\n]*\n?/g, "")
            .trim()
            .slice(0, 120),
        );

        const autoTask = await buildSelfAssessmentTask(
          workingDirectory,
          selfGeneratedTasks,
          recentSummaries,
          cap,
        );
        if (autoTask) {
          const submitted = taskQueue.submit(autoTask);
          selfGeneratedTasks++;
          consecutiveCleanAssessments = 0;
          assessCooldownMs = DAEMON_ASSESS_COOLDOWN_BASE_MS;
          console.log(
            `\x1b[35m[Daemon] Self-generated task ${submitted.id} (auto #${selfGeneratedTasks})\x1b[0m`,
          );
          statusWriter.recordEvent("self_assessment_task", { taskId: submitted.id });
          task = taskQueue.next();
        } else {
          // Nothing actionable -- escalate cooldown (1min -> 2min -> 4min -> ... -> 30min max)
          consecutiveCleanAssessments++;
          assessCooldownMs = Math.min(
            assessCooldownMs * DAEMON_CONSECUTIVE_CLEAN_BACKOFF,
            DAEMON_ASSESS_COOLDOWN_MAX_MS,
          );
          console.log(
            `\x1b[90m[Daemon] Nothing actionable (${consecutiveCleanAssessments}x). Next assessment in ${Math.round(assessCooldownMs / 1000)}s.\x1b[0m`,
          );
          statusWriter.recordEvent("self_assessment_clean", { consecutiveClean: consecutiveCleanAssessments });
        }
      }

      if (!task) {
        process.stdout.write(
          `\r\x1b[90m[Daemon] Idle -- ${tasksCompleted} done, ${tasksFailed} failed, ${selfGeneratedTasks} auto, $${totalDaemonCost.toFixed(4)} spent\x1b[0m`,
        );
        await new Promise((r) => setTimeout(r, DAEMON_POLL_INTERVAL_MS));
        continue;
      }
    }

    console.log(
      `\n\x1b[1m\x1b[36m[Daemon] Task ${task.id}: ${task.query.slice(0, 100)}${task.query.length > 100 ? "..." : ""}\x1b[0m`
    );
    taskQueue.markRunning(task.id);

    const taskSessionId = `${sessionId}-${task.id}`;
    server.updateSession(taskSessionId);

    statusWriter.recordEvent("task_started", {
      taskId: task.id,
      query: task.query.slice(0, 200),
    });

    try {
      const result = await runSingleQuery({
        ...options,
        query: task.query,
        sessionId: taskSessionId,
        sharedStatusWriter: statusWriter,
      });

      taskQueue.markCompleted(task.id, result.cost, result.handoffs);
      totalDaemonCost += result.cost;
      tasksCompleted++;

      // Automatic post-task verification (QualityGate + Vision if web project)
      await runPostTaskVerification(workingDirectory, task.id, statusWriter, options.mcpClients);

      statusWriter.recordEvent("task_completed", {
        taskId: task.id,
        cost: result.cost,
        handoffs: result.handoffs,
      });

      console.log(
        `\x1b[32m[Daemon] Task ${task.id} completed ($${result.cost.toFixed(4)}, ${result.handoffs} handoffs)\x1b[0m`,
      );
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      taskQueue.markFailed(task.id, errMsg);
      tasksFailed++;
      statusWriter.recordEvent("task_failed", { taskId: task.id, error: errMsg });

      console.error(`\x1b[31m[Daemon] Task ${task.id} failed: ${errMsg}\x1b[0m`);
    }

    await new Promise((r) => setTimeout(r, 2_000));
  }
}
