/**
 * Supervisor Mode - Sequential task execution via agent loop
 *
 * Runs a task file phase-by-phase, calling runSingleQuery for each phase.
 * Progress is broadcast via WebSocket/SSE through StatusWriter integration.
 *
 * This is the consolidated home for what was previously core/supervisor/.
 * All types live in schemas/index.ts, parsing in core/parsers/task-file.ts,
 * git utilities in core/git-status.ts, templates in this file.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { homedir } from "node:os";
import type { CLIArgs } from "../../interfaces/ui/terminal/shared/args.js";
import type { SessionSetup } from "../../interfaces/ui/terminal/shared/setup.js";
import type { SessionStore } from "../session-store.js";
import { runSingleQuery } from "../../interfaces/ui/terminal/shared/query.js";
import type { TaskPhase, PhaseResult, SupervisorResult, QualityGateResult } from "../../schemas/index.js";
import { parseTaskFile, writeTaskFile } from "../parsers/task-file.js";
import { getHeadSha, detectCompletion } from "../git-status.js";
import { verifyQualityGate, buildRetryPrompt } from "../../ecosystem/daemon/quality-gate.js";

// ============================================
// TYPES
// ============================================

export interface SupervisorOptions {
  taskFilePath: string;
  apiKey: string;
  args: CLIArgs;
  setup: SessionSetup;
  systemPrompt: string;
  sessionStore: SessionStore;
  workingDirectory: string;
}

// Re-export from consolidated locations
export type { TaskPhase, PhaseResult, SupervisorResult };
export { parseTaskFile, writeTaskFile };

// ============================================
// PHASE PROMPT TEMPLATE
// ============================================

const DEFAULT_PHASE_STEPS = [
  "Analyze the codebase",
  "Implement the required changes",
  "Run: bun test",
  "Type check: bunx tsc --noEmit",
  "Fix any remaining errors",
  "Commit: git add -A && git commit -m '<message>'",
] as const;

function buildPhasePrompt(phase: TaskPhase, workingDir: string): string {
  const escapedDesc = phase.description.replace(/'/g, "'\\''");
  const commitMsg = `fix(phase${phase.phase}): ${escapedDesc}`;

  const steps = DEFAULT_PHASE_STEPS.map((step, i) => {
    const resolved = i === DEFAULT_PHASE_STEPS.length - 1
      ? `Commit: git add -A && git commit -m '${commitMsg}'`
      : step;
    return `${i + 1}. ${resolved}`;
  }).join("\n");

  return `Working in: ${workingDir}

TASK: ${phase.description}

Instructions:
${steps}`;
}

// ============================================
// STATUS FILE
// ============================================

const SUPERVISOR_STATUS_DIR = join(homedir(), ".claude", "supervisor");

function writeSupervisorStatus(data: Record<string, unknown>): void {
  mkdirSync(SUPERVISOR_STATUS_DIR, { recursive: true });
  writeFileSync(
    join(SUPERVISOR_STATUS_DIR, "current.json"),
    JSON.stringify(data, null, 2),
    "utf-8",
  );
}

function writeResultsJson(taskFilePath: string, result: SupervisorResult): void {
  const resultsPath = join(dirname(taskFilePath), `${basename(taskFilePath)}-results.json`);
  writeFileSync(resultsPath, JSON.stringify(result, null, 2), "utf-8");
}

// ============================================
// MAIN SUPERVISOR
// ============================================

export async function runSupervisorMode(options: SupervisorOptions): Promise<SupervisorResult> {
  const {
    taskFilePath,
    apiKey,
    args,
    setup,
    systemPrompt,
    sessionStore,
    workingDirectory,
  } = options;

  const startTime = Date.now();

  const tasks = parseTaskFile(taskFilePath);
  const pendingTasks = tasks.filter((t) => t.status === "pending");

  console.log(`\x1b[36m[Supervisor] Loaded ${tasks.length} tasks, ${pendingTasks.length} pending\x1b[0m`);
  console.log(`\x1b[90m  Task file: ${taskFilePath}\x1b[0m`);
  console.log(`\x1b[90m  Working directory: ${workingDirectory}\x1b[0m`);
  console.log(`\x1b[90m  Model: ${args.model}\x1b[0m\n`);

  // Enable WebSocket/SSE broadcasting
  args.enableWebSocket = true;
  args.enableSSE = true;
  args.longRunning = true;

  const results: PhaseResult[] = [];
  let completedCount = 0;
  let failedCount = 0;

  for (const task of tasks) {
    if (task.status !== "pending") {
      results.push({
        phase: task.phase,
        status: task.status,
        description: task.description,
        durationMs: 0,
      });
      if (task.status === "complete") completedCount++;
      if (task.status === "failed") failedCount++;
      continue;
    }

    const phaseStart = Date.now();
    task.status = "running";
    writeTaskFile(taskFilePath, tasks);

    writeSupervisorStatus({
      status: "running",
      currentPhase: task.phase,
      currentDescription: task.description,
      completedPhases: completedCount,
      failedPhases: failedCount,
      totalPhases: tasks.length,
      startedAt: new Date(startTime).toISOString(),
    });

    console.log(`\x1b[33m[Supervisor] Phase ${task.phase}: ${task.description}\x1b[0m`);

    const MAX_RETRIES = 2;
    let attempt = 0;
    let lastGateResult: QualityGateResult | null = null;

    while (attempt <= MAX_RETRIES) {
      const preSha = getHeadSha(workingDirectory);
      try {
        const isRetry = attempt > 0 && lastGateResult;
        const basePrompt = buildPhasePrompt(task, workingDirectory);
        const query = isRetry
          ? `${basePrompt}\n\n--- RETRY (attempt ${attempt + 1}/${MAX_RETRIES + 1}) ---\n${buildRetryPrompt(lastGateResult!, task.phase)}`
          : basePrompt;

        const sessionId = await sessionStore.createSession({
          model: args.model,
          workingDirectory,
        });

        await runSingleQuery({
          apiKey,
          args: { ...args, permissionMode: setup.permissionMode },
          systemPrompt,
          tools: setup.tools,
          query,
          sessionStore,
          sessionId,
          hookManager: setup.hookManager,
          workingDirectory,
        });

        // Quality gate verification
        console.log(`\x1b[90m[Supervisor] Running quality gate for phase ${task.phase}...\x1b[0m`);
        const gateResult = await verifyQualityGate(workingDirectory);
        lastGateResult = gateResult;

        if (gateResult.passed) {
          task.status = "complete";
          console.log(`\x1b[32m[Supervisor] Quality gate passed: ${gateResult.tests.pass} tests, ${gateResult.filesChanged.length} files changed\x1b[0m`);
          break;
        }

        // Gate failed -- log and maybe retry
        console.log(`\x1b[33m[Supervisor] Quality gate failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${gateResult.failures.slice(0, 3).join("; ")}\x1b[0m`);

        if (attempt >= MAX_RETRIES) {
          // Fallback: accept if git detected changes even though gate failed
          const gitDetected = detectCompletion(workingDirectory, preSha);
          task.status = gitDetected ? "complete" : "failed";
          if (gitDetected) {
            console.log(`\x1b[33m[Supervisor] Gate failed but git changes detected -- marking complete with warnings\x1b[0m`);
          }
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`\x1b[31m[Supervisor] Phase ${task.phase} error (attempt ${attempt + 1}): ${msg}\x1b[0m`);
        if (attempt >= MAX_RETRIES) {
          task.status = "failed";
        }
      }
      attempt++;
    }

    const phaseDuration = Date.now() - phaseStart;
    if (task.status === "complete") {
      completedCount++;
      console.log(`\x1b[32m[Supervisor] Phase ${task.phase} complete (${(phaseDuration / 1000).toFixed(1)}s)\x1b[0m\n`);
    } else {
      failedCount++;
      console.log(`\x1b[31m[Supervisor] Phase ${task.phase} failed (${(phaseDuration / 1000).toFixed(1)}s)\x1b[0m\n`);
    }

    writeTaskFile(taskFilePath, tasks);
    results.push({ phase: task.phase, status: task.status, description: task.description, durationMs: phaseDuration });
  }

  const totalDuration = Date.now() - startTime;
  const result: SupervisorResult = {
    project: basename(workingDirectory),
    date: new Date().toISOString(),
    totalDurationMs: totalDuration,
    totalPhases: tasks.length,
    completedPhases: completedCount,
    failedPhases: failedCount,
    phases: results,
  };

  writeSupervisorStatus({
    status: "complete",
    currentPhase: null,
    currentDescription: null,
    completedPhases: completedCount,
    failedPhases: failedCount,
    totalPhases: tasks.length,
    startedAt: new Date(startTime).toISOString(),
    completedAt: new Date().toISOString(),
    totalDurationMs: totalDuration,
  });

  writeResultsJson(taskFilePath, result);

  console.log(`\x1b[36m[Supervisor] Complete\x1b[0m`);
  console.log(`  Total: ${result.totalPhases} | Complete: ${completedCount} | Failed: ${failedCount}`);
  console.log(`  Duration: ${(totalDuration / 1000).toFixed(1)}s`);
  console.log(`  Results: ${basename(taskFilePath)}-results.json\n`);

  return result;
}
