/**
 * Query Execution & Daemon Loop
 * Shared query runner for CLI -q mode and 24/7 daemon mode
 */

import type { Message, ToolDefinition, ExtendedThinkingConfig, GitStatus } from "../../../../schemas/index.js";
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
import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { verifyQualityGate } from "../../../../ecosystem/plugins/daemon/quality-gate.js";

const STATS_PORT = parseInt(process.env.CODER_STATS_PORT || "7420", 10);
const MAX_HANDOFF_SESSIONS = parseInt(process.env.CODER_MAX_HANDOFFS || "10", 10);
const HANDOFF_COOLDOWN_MS = 5_000;
const DAEMON_POLL_INTERVAL_MS = parseInt(process.env.CODER_DAEMON_POLL_MS || "10000", 10);
const DAEMON_ASSESS_COOLDOWN_BASE_MS = parseInt(process.env.CODER_ASSESS_COOLDOWN_MS || "45000", 10);
const DAEMON_ASSESS_COOLDOWN_MAX_MS = 3 * 60_000; // 3 min max between assessments
const DAEMON_CONSECUTIVE_CLEAN_BACKOFF = 1.5; // gentle backoff -- always stay productive

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

        const endpoints = ["/stats", ...(taskQueue ? ["/tasks", "/submit (POST)"] : [])];
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
        maxTokens: args.maxTokens,
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
    } catch { /* ignore */ }
  }

  try {
    const todos = execSync(
      "rg -n 'TODO|FIXME|HACK|XXX' --type ts --type tsx -g '!node_modules' -g '!dist' 2>/dev/null | head -20",
      { cwd: workingDirectory, timeout: 10_000 },
    ).toString().trim();
    if (todos) signals.push(`CODE TODOS:\n${todos}`);
  } catch { /* rg not available or no matches */ }

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
    statusWriter.recordMcpCall("daemon", "QualityGate", gateMs, !gate.passed);
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
  await runVisionVerification(workingDirectory, taskId, statusWriter);
}

/**
 * Start the project's dev server, screenshot it, analyze with vision LLM, then tear down.
 * Only runs for projects with web dependencies and a dev/start script.
 */
async function runVisionVerification(
  workingDirectory: string,
  taskId: string,
  statusWriter: StatusWriter,
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

    const { appendFileSync, mkdirSync: mkdirSyncFs } = await import("fs");
    const { getVisionLLM } = await import("../../../../core/meta-llm-client.js");
    const { readImageFile } = await import("../../../../core/image.js");

    const projectVisualsDir = join(workingDirectory, "visuals");
    if (!existsSync(projectVisualsDir)) mkdirSyncFs(projectVisualsDir, { recursive: true });
    const logPath = join(workingDirectory, "VISUAL_LOG.md");
    if (!existsSync(logPath)) {
      appendFileSync(logPath, "# Visual Verification Log\n\nAutomated screenshots and vision analysis from daemon runs.\n\n---\n");
    }

    const baseUrl = `http://localhost:${expectedPort}`;

    // Use dev-browser MCP for interactive multi-view screenshots
    const views: Array<{ name: string; script: string }> = [
      {
        name: "landing",
        script: `
const page = await browser.getPage("main");
await page.setViewportSize({ width: 1280, height: 720 });
await page.goto("${baseUrl}", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
const buf = await page.screenshot({ fullPage: false });
const path = await saveScreenshot(buf, "landing.png");
console.log(JSON.stringify({ path }));
`,
      },
      {
        name: "mobile",
        script: `
const page = await browser.getPage("mobile");
await page.setViewportSize({ width: 375, height: 812 });
await page.goto("${baseUrl}", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
const buf = await page.screenshot({ fullPage: false });
const path = await saveScreenshot(buf, "mobile.png");
console.log(JSON.stringify({ path }));
`,
      },
    ];

    // Give the app extra time to render (Three.js/WebGL/React hydration)
    await new Promise((r) => setTimeout(r, 2000));

    const devBrowserCmd = join(process.env.HOME || "", ".local", "bin", "dev-browser");
    let anySuccess = false;

    for (const view of views) {
      const viewStart = Date.now();
      const viewTs = new Date().toISOString().replace(/[:.]/g, "-");
      const readableName = `${view.name}-${viewTs}.png`;
      const projectPath = join(projectVisualsDir, readableName);

      try {
        // Execute via dev-browser (Playwright under the hood)
        const dbResult = execSync(
          `echo '${view.script.replace(/'/g, "'\\''")}' | "${devBrowserCmd}" --headless 2>/dev/null`,
          { timeout: 30_000, cwd: workingDirectory },
        ).toString().trim();

        // dev-browser saves to ~/.dev-browser/tmp/<filename>.png
        let savedPath = "";
        try {
          const parsed = JSON.parse(dbResult);
          savedPath = parsed.path || "";
        } catch { /* output wasn't JSON */ }

        if (!savedPath || !existsSync(savedPath)) {
          // Fallback: try ~/.dev-browser/tmp/<name>.png
          const fallback = join(process.env.HOME || "", ".dev-browser", "tmp", `${view.name}.png`);
          if (existsSync(fallback)) savedPath = fallback;
        }

        if (savedPath && existsSync(savedPath)) {
          const { copyFileSync } = await import("fs");
          copyFileSync(savedPath, projectPath);

          // Analyze with vision LLM
          let analysisText = "";
          try {
            const imgData = await readImageFile(projectPath);
            const analysis = await getVisionLLM().completeWithImage(
              "You are a UI quality verifier for web applications.",
              `Analyze this ${view.name} screenshot. Does the UI render correctly? Any broken layouts, blank pages, error messages, overflow issues, or missing content? Be concise (2-3 sentences).`,
              { base64: imgData.base64, mediaType: imgData.mediaType },
              256,
            );
            analysisText = analysis?.text?.trim() || "";
          } catch { /* vision optional */ }

          const viewMs = Date.now() - viewStart;
          const isViewError = !analysisText;
          anySuccess = anySuccess || !isViewError;

          if (analysisText) {
            console.log(`\x1b[90m[Vision/MCP] ${view.name}: ${analysisText.slice(0, 120)}\x1b[0m`);
          }

          statusWriter.recordMcpCall("browser", `screenshot_${view.name}`, viewMs, isViewError);
          statusWriter.recordEvent("vision_verify", {
            taskId, view: view.name, port: expectedPort,
            analysis: analysisText?.slice(0, 300),
          });

          try {
            const entry = [
              `\n## ${new Date().toISOString()} -- Task \`${taskId}\` (${view.name})\n`,
              `**Port:** ${expectedPort}  `,
              `**Verdict:** ${isViewError ? "FAILED" : "OK"}  `,
              `**Latency:** ${viewMs}ms  `,
              `**Method:** dev-browser MCP\n`,
              `![${view.name}](visuals/${readableName})\n`,
              analysisText ? `> ${analysisText.replace(/\n/g, "\n> ")}\n` : "> (no analysis)\n",
              "---\n",
            ].join("\n");
            appendFileSync(logPath, entry);
          } catch { /* best-effort */ }
        } else {
          console.log(`\x1b[33m[Vision/MCP] ${view.name}: screenshot not saved\x1b[0m`);
          statusWriter.recordMcpCall("browser", `screenshot_${view.name}`, Date.now() - viewStart, true);
        }
      } catch (viewErr) {
        console.log(`\x1b[33m[Vision/MCP] ${view.name} failed: ${viewErr instanceof Error ? viewErr.message : viewErr}\x1b[0m`);
        statusWriter.recordMcpCall("browser", `screenshot_${view.name}`, Date.now() - viewStart, true);
      }
    }

    // Cleanup browser pages
    try {
      execSync(`echo 'await browser.closePage("main"); await browser.closePage("mobile");' | "${devBrowserCmd}" --headless 2>/dev/null`, { timeout: 5000 });
    } catch { /* cleanup best-effort */ }

    const visionMs = Date.now() - visionStart;
    if (!anySuccess) {
      statusWriter.recordMcpCall("browser", "screenshot_verify", visionMs, true);
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
  availableTools: string[],
): Promise<string | null> {
  const signals = gatherWorkspaceSignals(workingDirectory);

  if (!signals) return null;

  const scopeRule = `SCOPE CONSTRAINT: You MUST only work on files inside ${workingDirectory}. Do NOT touch files outside this directory.`;

  const dedupBlock = recentTaskSummaries.length > 0
    ? `\nALREADY COMPLETED (do NOT repeat these):\n${recentTaskSummaries.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n`
    : "";

  const toolBlock = availableTools.length > 0
    ? [
        `\nAVAILABLE TOOLS (you MUST use these, not just Read/Edit/Bash):`,
        ...availableTools.map((t) => `  - ${t}`),
        ``,
        `VISION-FIRST WORKFLOW (mandatory for web projects):`,
        `  1. Build the project (Bash: bun run build)`,
        `  2. Run scoped tests (Bash: cd <dir> && bun test)`,
        `  3. Start the dev server and use vision/screenshot tools to verify UI renders`,
        `  4. Use vision tools AFTER EVERY significant UI change, not just at the end`,
        `  5. Save screenshots to visuals/ (project root) with descriptive names`,
        `  6. Use QualityGate before committing`,
        `  7. Append each screenshot + analysis to VISUAL_LOG.md at project root`,
        ``,
        `VISUAL_LOG.md FORMAT (append after each vision check):`,
        `  ## [ISO timestamp] - What changed`,
        `  ![description](visuals/filename.png)`,
        `  **Analysis:** vision model's assessment`,
        `  **Action:** what you did next`,
        `  ---`,
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
        `  1. Build errors or test failures (fix immediately)`,
        `  2. Uncommitted work (commit it)`,
        `  3. Code TODOs / FIXMEs in source files`,
        `  4. Missing or low test coverage (add tests for untested modules)`,
        `  5. Performance improvements (lazy loading, bundle size, render optimization)`,
        `  6. Accessibility (ARIA labels, keyboard navigation, color contrast)`,
        `  7. UI/UX polish (animations, responsive design, error states, loading states)`,
        `  8. Code quality (extract duplicated logic, improve types, reduce complexity)`,
        `  9. Documentation (update README, add JSDoc, document APIs)`,
        ``,
        `There is ALWAYS something to improve. A clean build just means you move to categories 4-9.`,
        `NEVER respond with NOTHING_ACTIONABLE unless the project has <3 source files.`,
        `NEVER generate a task that only commits/stages files. Commits are handled automatically.`,
        `Your task MUST involve writing or modifying source code, tests, or documentation content.`,
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
          `You are a daemon running autonomously. The task queue is empty.`,
          `The meta-LLM analyzed the workspace and selected this task:`,
          ``,
          result.text,
          dedupBlock,
          toolBlock,
          ``,
          `After completing: cd ${workingDirectory}, build, test (scoped), commit.`,
          `For web projects: use vision/screenshot tools to verify UI after changes. Save screenshots to visuals/.`,
          `Append each screenshot + analysis to VISUAL_LOG.md. Update PROGRESS.md with a visual summary.`,
          `NEVER run bare \`bun test\` from the repo root. NEVER edit files outside ${workingDirectory}.`,
        ].join("\n");
      }
    }
  } catch { /* fall through to template */ }

  return [
    `[AUTONOMOUS IMPROVEMENT -- self-generated task #${completedCount + 1}]`,
    scopeRule,
    `You are a daemon running autonomously. The task queue is empty and the project builds clean.`,
    `Your job is continuous improvement. Commits are handled automatically -- focus on CODE CHANGES.`,
    `Pick ONE from this priority list (you MUST write/modify code, not just commit):`,
    `  1. Add tests for any module with <80% coverage`,
    `  2. Performance: lazy loading, bundle size reduction, render optimization`,
    `  3. Accessibility: ARIA labels, keyboard navigation, screen reader support`,
    `  4. UI polish: better error states, loading indicators, responsive breakpoints`,
    `  5. Code quality: extract duplicated logic, improve TypeScript types, reduce complexity`,
    `  6. Documentation: update README with setup/usage, add JSDoc to public APIs`,
    dedupBlock,
    toolBlock,
    `Do NOT repeat work that is already done. Check git log to see recent commits.`,
    `After completing: cd ${workingDirectory}, build, test (scoped), commit.`,
    `For web projects: use vision/screenshot tools to verify UI. Save to visuals/.`,
    `Append each screenshot + analysis to VISUAL_LOG.md. Update PROGRESS.md with a visual summary.`,
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

  // Collect MCP/tool names + descriptions for self-assessment prompts
  const builtinTools = new Set(["Read", "Edit", "Write", "Bash", "Glob", "Grep", "MultiEdit"]);
  const availableTools: string[] = [];
  if (options.tools) {
    for (const t of options.tools) {
      if (t.name && !builtinTools.has(t.name)) {
        const desc = (t as { description?: string }).description;
        availableTools.push(desc ? `${t.name} -- ${desc.slice(0, 80)}` : t.name);
      }
    }
  }

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
  if (availableTools.length > 0) {
    console.log(`\x1b[90m  MCP tools: ${availableTools.join(", ")}\x1b[0m`);
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
          availableTools,
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

    // Inject vision-first workflow directives referencing dev-browser MCP
    const visionToolList = availableTools.filter(
      (t) => /vision|image|screenshot|4_5v|glmvision|browser/i.test(t),
    );
    const hasBrowserMcp = availableTools.some((t) => /browser_navigate|browser_screenshot/i.test(t));
    const visionPreamble = visionToolList.length > 0
      ? [
          `\nVISION-FIRST DEVELOPMENT (mandatory):`,
          `You have these vision/browser tools: ${visionToolList.map((t) => t.split(" -- ")[0]).join(", ")}`,
          ``,
          `HOW TO SCREENSHOT (exact steps):`,
          `  1. Build: bun run build`,
          `  2. Start dev server: bun run dev &`,
          `  3. Wait for server: sleep 3`,
          ...(hasBrowserMcp ? [
            `  4. Use browser MCP tools (Playwright-based):`,
            `     - mcp__browser__browser_navigate to load the page`,
            `     - mcp__browser__browser_click / browser_fill to interact with UI`,
            `     - mcp__browser__browser_screenshot to capture the current state`,
            `     - mcp__browser__browser_snapshot for AI-friendly DOM inspection`,
            `     - mcp__browser__browser_evaluate to run JS in the page`,
            `  5. For multi-state captures, navigate through flows:`,
            `     navigate -> screenshot "landing" -> click button -> screenshot "gameplay" -> etc.`,
          ] : [
            `  4. Use dev-browser CLI for Playwright screenshots:`,
            `     echo 'const p=await browser.getPage("v");await p.goto("http://localhost:3000",{waitUntil:"networkidle"});await p.screenshot({path:"visuals/NAME.png"})' | dev-browser --headless`,
          ]),
          `  6. Analyze with vision: mcp__4_5v_mcp__analyze_image with absolute path to the PNG`,
          `  7. Kill dev server when done: lsof -ti:3000 | xargs kill 2>/dev/null`,
          ``,
          `AFTER EACH SCREENSHOT, append to VISUAL_LOG.md:`,
          `  ## [ISO timestamp] - What changed`,
          `  ![desc](visuals/filename.png)`,
          `  **Analysis:** paste vision model output`,
          `  **Action:** what you did next`,
          `  ---`,
          ``,
          `Capture EVERY significant UI state: landing, interaction, error, mobile. Not just the default page.`,
          `The visuals/ directory and VISUAL_LOG.md are your visual audit trail.\n`,
        ].join("\n")
      : "";
    const augmentedQuery = visionPreamble
      ? `${task.query}\n${visionPreamble}`
      : task.query;

    try {
      const result = await runSingleQuery({
        ...options,
        query: augmentedQuery,
        sessionId: taskSessionId,
        sharedStatusWriter: statusWriter,
      });

      taskQueue.markCompleted(task.id, result.cost, result.handoffs);
      totalDaemonCost += result.cost;
      tasksCompleted++;

      // Automatic post-task verification (QualityGate + Vision if web project)
      await runPostTaskVerification(workingDirectory, task.id, statusWriter);

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
