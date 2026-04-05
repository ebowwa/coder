/**
 * Task File Parser - Parse and write task files for supervisor mode
 *
 * Task file format:
 *   # Comment lines start with #
 *   1|pending|Fix TypeScript errors in src/api/routes.ts
 *   2|complete|Already done task
 *   3|pending|Add integration tests
 *
 * @module task-file-parser
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { TaskPhase } from "../../schemas/index.js";

/**
 * Parse a task file into sorted TaskPhase array.
 * Skips comment lines (#) and lines with fewer than 3 pipe-delimited fields.
 */
export function parseTaskFile(filePath: string): TaskPhase[] {
  if (!existsSync(filePath)) {
    throw new Error(`Task file not found: ${filePath}`);
  }

  const content = readFileSync(filePath, "utf-8");
  const tasks: TaskPhase[] = [];

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const parts = trimmed.split("|");
    if (parts.length < 3) continue;

    const phase = parseInt(parts[0]!.trim(), 10);
    if (isNaN(phase)) continue;

    const status = parts[1]!.trim() as TaskPhase["status"];
    const description = parts.slice(2).join("|").trim();

    tasks.push({ phase, status, description });
  }

  return tasks.sort((a, b) => a.phase - b.phase);
}

/**
 * Write a TaskPhase array back to a task file.
 * Creates parent directories if they don't exist.
 */
export function writeTaskFile(filePath: string, tasks: TaskPhase[]): void {
  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true });
  const lines = tasks.map((t) => `${t.phase}|${t.status}|${t.description}`);
  writeFileSync(filePath, lines.join("\n") + "\n", "utf-8");
}
