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

const STATS_PORT = parseInt(process.env.CODER_STATS_PORT || "7420", 10);
const MAX_HANDOFF_SESSIONS = parseInt(process.env.CODER_MAX_HANDOFFS || "10", 10);
const HANDOFF_COOLDOWN_MS = 5_000;
const DAEMON_POLL_INTERVAL_MS = parseInt(process.env.CODER_DAEMON_POLL_MS || "10000", 10);
const DAEMON_ASSESS_COOLDOWN_BASE_MS = parseInt(process.env.CODER_ASSESS_COOLDOWN_MS || "60000", 10);
const DAEMON_ASSESS_COOLDOWN_MAX_MS = 30 * 60_000; // 30 min max between assessments
const DAEMON_CONSECUTIVE_CLEAN_BACKOFF = 2; // multiply cooldown by this after each "nothing actionable"
const DAEMON_MAX_SELF_TASKS = parseInt(process.env.CODER_DAEMON_MAX_SELF_TASKS || "10", 10); // max auto-generated tasks

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
    ? `\nAVAILABLE TOOLS beyond code editing: ${availableTools.join(", ")}. Use them when relevant (e.g. browser for UI verification).`
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
        `Prioritize: build errors > test failures > uncommitted work > code TODOs.`,
        recentTaskSummaries.length > 0
          ? `ALREADY DONE (do NOT repeat): ${recentTaskSummaries.join(" | ")}`
          : ``,
        `If all signals are clean and there is genuinely nothing to do, respond with exactly: NOTHING_ACTIONABLE`,
        `Output ONLY the task description (or NOTHING_ACTIONABLE), nothing else. Max 200 words.`,
      ].filter(Boolean).join(" "),
      signals,
      512,
    );

    if (result?.text) {
      console.log(`\x1b[90m[SelfAssess] Meta-LLM task: ${result.inputTokens} in, ${result.outputTokens} out, ${result.durationMs}ms\x1b[0m`);

      if (result.text.trim() === "NOTHING_ACTIONABLE") {
        console.log(`\x1b[90m[SelfAssess] Meta-LLM says nothing actionable.\x1b[0m`);
        return null;
      }

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
        `After completing: cd ${workingDirectory}, build, test (scoped), commit, update PROGRESS.md.`,
        `NEVER run bare \`bun test\` from the repo root. NEVER edit files outside ${workingDirectory}.`,
      ].join("\n");
    }
  } catch { /* fall through to template */ }

  return [
    `[AUTONOMOUS ASSESSMENT -- self-generated task #${completedCount + 1}]`,
    scopeRule,
    `You are a daemon running autonomously. The task queue is empty.`,
    `Inspect the workspace signals below and take the SINGLE most impactful action.`,
    `Prioritize: build errors > test failures > uncommitted work > open TODOs.`,
    dedupBlock,
    toolBlock,
    `Do NOT repeat work that is already done. Check git log to see recent commits.`,
    `After completing: cd ${workingDirectory}, build, test (scoped), commit, update PROGRESS.md.`,
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

  let totalDaemonCost = 0;
  let tasksCompleted = 0;
  let tasksFailed = 0;
  let selfGeneratedTasks = 0;
  let lastAssessmentAt = 0;

  console.log(`\x1b[1m\x1b[35m[Daemon] Running. Submit tasks via:\x1b[0m`);
  console.log(`\x1b[35m  curl -X POST http://localhost:${STATS_PORT}/submit -d '{"query":"your task"}'\x1b[0m`);
  console.log(`\x1b[35m  Or append to ${workingDirectory}/.coder/tasks.jsonl\x1b[0m`);
  console.log(`\x1b[90m  View queue: http://localhost:${STATS_PORT}/tasks\x1b[0m`);
  console.log(`\x1b[90m  View stats: http://localhost:${STATS_PORT}/stats\x1b[0m\n`);

  while (true) {
    let task = taskQueue.next();

    if (!task) {
      const now = Date.now();
      const canAssess =
        !options.noAutoAssess &&
        selfGeneratedTasks < DAEMON_MAX_SELF_TASKS &&
        now - lastAssessmentAt > DAEMON_ASSESS_COOLDOWN_BASE_MS;

      if (canAssess) {
        lastAssessmentAt = now;
        console.log(`\n\x1b[35m[Daemon] Queue empty. Running self-assessment...\x1b[0m`);
        statusWriter.recordEvent("self_assessment_start", { selfGenCount: selfGeneratedTasks });

        const recentTaskSummaries: string[] = []; // TODO: get from taskQueue history
        const availableTools: string[] = []; // TODO: get from registered tools
        const autoTask = await buildSelfAssessmentTask(workingDirectory, selfGeneratedTasks, recentTaskSummaries, availableTools);
        if (autoTask) {
          const submitted = taskQueue.submit(autoTask);
          selfGeneratedTasks++;
          console.log(
            `\x1b[35m[Daemon] Self-generated task ${submitted.id} (auto #${selfGeneratedTasks}/${DAEMON_MAX_SELF_TASKS})\x1b[0m`,
          );
          statusWriter.recordEvent("self_assessment_task", { taskId: submitted.id });
          task = taskQueue.next();
        } else {
          console.log(`\x1b[90m[Daemon] Assessment found nothing actionable. Idling.\x1b[0m`);
          statusWriter.recordEvent("self_assessment_clean", {});
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
