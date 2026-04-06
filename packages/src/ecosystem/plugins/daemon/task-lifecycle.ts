/**
 * Task Lifecycle - Continuous task generation so the daemon never runs out of work.
 *
 * When all phases in tasks.txt are complete (or all remaining are failed),
 * triggers an audit cycle that generates a new tasks.txt and resumes the supervisor loop.
 *
 * Cycle: tasks.txt -> supervisor runs phases -> quality gate verifies ->
 *        all done -> audit generates new tasks.txt -> loop
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import type { TaskLifecycleState } from "../../../schemas/index.js";
import { parseTaskFile, writeTaskFile } from "../../../core/parsers/task-file.js";
import { verifyQualityGate } from "./quality-gate.js";

interface LifecycleConfig {
  taskFilePath: string;
  workingDirectory: string;
  specPath?: string;
}

const LIFECYCLE_STATE_FILE = "task-lifecycle-state.json";

function getSpecPath(workingDirectory: string): string | null {
  const candidates = ["SPEC.md", "spec.md", "SPEC", "spec"];
  for (const c of candidates) {
    const p = join(workingDirectory, c);
    if (existsSync(p)) return p;
  }
  return null;
}

function loadState(workingDirectory: string): TaskLifecycleState {
  const statePath = join(workingDirectory, LIFECYCLE_STATE_FILE);
  if (existsSync(statePath)) {
    try {
      return JSON.parse(readFileSync(statePath, "utf-8"));
    } catch {
      // Corrupted state, start fresh
    }
  }
  return {
    status: "idle",
    currentCycle: 0,
    totalPhasesCompleted: 0,
    totalPhasesFailed: 0,
    lastAuditAt: null,
    lastTaskGeneratedAt: null,
  };
}

function saveState(workingDirectory: string, state: TaskLifecycleState): void {
  const statePath = join(workingDirectory, LIFECYCLE_STATE_FILE);
  writeFileSync(statePath, JSON.stringify(state, null, 2), "utf-8");
}

/**
 * Check whether the task file is exhausted (all phases complete or failed).
 */
export function isTaskFileExhausted(taskFilePath: string): boolean {
  if (!existsSync(taskFilePath)) return true;
  const tasks = parseTaskFile(taskFilePath);
  if (tasks.length === 0) return true;
  return tasks.every(t => t.status === "complete" || t.status === "failed");
}

/**
 * Build an audit prompt based on whether a SPEC.md exists.
 * Returns a prompt string suitable for feeding to `runSingleQuery`.
 */
export function buildAuditPrompt(workingDirectory: string, specPath: string | null): string {
  if (specPath && existsSync(specPath)) {
    const spec = readFileSync(specPath, "utf-8");
    return `Audit this codebase against the specification below. List every discrepancy, bug, missing feature, or quality issue as a numbered list.

Each item should be a single actionable task that can be completed in one coding session.
Format your response ONLY as a numbered list, one task per line. No prose.

SPEC:
${spec.slice(0, 8000)}`;
  }

  return `Review this codebase for bugs, missing error handling, untested paths, performance issues, and UX problems. Prioritize by impact.

List each issue as a single actionable task that can be completed in one coding session.
Format your response ONLY as a numbered list, one task per line. No prose.`;
}

/**
 * Parse an audit response (numbered list) into a tasks.txt format string.
 *
 * Input lines like:
 *   1. Fix the broken import in auth.ts
 *   2. Add error handling to the API routes
 *
 * Output:
 *   1|pending|Fix the broken import in auth.ts
 *   2|pending|Add error handling to the API routes
 */
export function parseAuditResponseToTasks(response: string): string {
  const lines = response.split("\n");
  const tasks: string[] = [];
  let phase = 1;

  for (const line of lines) {
    const trimmed = line.trim();
    // Match numbered items: "1. ...", "1) ...", "- ...", "* ..."
    const match = trimmed.match(/^(?:\d+[.)]\s*|-\s*|\*\s*)(.+)$/);
    if (match && match[1]) {
      const description = match[1].trim();
      if (description.length > 5) {
        tasks.push(`${phase}|pending|${description}`);
        phase++;
      }
    }
  }

  return tasks.join("\n") + "\n";
}

/**
 * Run the full lifecycle check:
 * 1. If task file exhausted, run audit + generate new tasks
 * 2. Return whether new tasks were generated
 */
export async function runLifecycleCheck(config: LifecycleConfig): Promise<{
  generated: boolean;
  taskCount: number;
  state: TaskLifecycleState;
}> {
  const { taskFilePath, workingDirectory } = config;
  const state = loadState(workingDirectory);

  if (!isTaskFileExhausted(taskFilePath)) {
    return { generated: false, taskCount: 0, state };
  }

  // Tally completed/failed from the exhausted file
  if (existsSync(taskFilePath)) {
    const tasks = parseTaskFile(taskFilePath);
    state.totalPhasesCompleted += tasks.filter(t => t.status === "complete").length;
    state.totalPhasesFailed += tasks.filter(t => t.status === "failed").length;
  }

  state.status = "auditing";
  state.lastAuditAt = new Date().toISOString();
  saveState(workingDirectory, state);

  // Run quality gate to get current baseline
  console.log(`\x1b[36m[Lifecycle] Running quality gate baseline for audit...\x1b[0m`);
  const baseline = await verifyQualityGate(workingDirectory);
  console.log(`\x1b[90m[Lifecycle] Baseline: ${baseline.tests.pass} pass, ${baseline.tests.fail} fail, ${baseline.tsErrors} TS errors\x1b[0m`);

  // Build audit prompt
  const specPath = config.specPath || getSpecPath(workingDirectory);
  const auditPrompt = buildAuditPrompt(workingDirectory, specPath);

  // The caller is responsible for executing the audit prompt through runSingleQuery
  // and calling completeLifecycleCycle with the response.
  // We return the prompt embedded in state for the supervisor to use.
  state.status = "generating";
  saveState(workingDirectory, state);

  return { generated: false, taskCount: 0, state };
}

/**
 * Complete a lifecycle cycle by writing new tasks from an audit response.
 * Called by the supervisor after it runs the audit prompt and gets a response.
 */
export function completeLifecycleCycle(
  taskFilePath: string,
  workingDirectory: string,
  auditResponse: string,
): { taskCount: number; state: TaskLifecycleState } {
  const state = loadState(workingDirectory);
  const tasksContent = parseAuditResponseToTasks(auditResponse);

  // Backup old task file
  if (existsSync(taskFilePath)) {
    const backupPath = `${taskFilePath}.cycle-${state.currentCycle}`;
    writeFileSync(backupPath, readFileSync(taskFilePath, "utf-8"), "utf-8");
  }

  // Write new tasks
  const dir = dirname(taskFilePath);
  mkdirSync(dir, { recursive: true });
  writeFileSync(taskFilePath, tasksContent, "utf-8");

  const newTasks = parseTaskFile(taskFilePath);
  state.currentCycle++;
  state.lastTaskGeneratedAt = new Date().toISOString();
  state.status = "running";
  saveState(workingDirectory, state);

  console.log(`\x1b[32m[Lifecycle] Cycle ${state.currentCycle}: generated ${newTasks.length} new tasks\x1b[0m`);

  return { taskCount: newTasks.length, state };
}
