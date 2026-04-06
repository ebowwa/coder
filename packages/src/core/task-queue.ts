/**
 * Persistent task queue for daemon mode.
 *
 * Storage: .coder/tasks.jsonl  (append-only, one JSON object per line)
 * Each task has a status field that transitions:  pending -> running -> completed | failed
 *
 * Tasks can be submitted by:
 *  1. Appending a line to the file
 *  2. POST /submit on the daemon HTTP endpoint
 *  3. --daemon-task CLI flag
 */

import { existsSync, readFileSync, mkdirSync, appendFileSync, writeFileSync } from "fs";
import { dirname } from "path";

export type TaskStatus = "pending" | "running" | "completed" | "failed";

export interface QueuedTask {
  id: string;
  query: string;
  status: TaskStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  cost?: number;
  handoffs?: number;
  error?: string;
}

export class TaskQueue {
  private tasks: QueuedTask[] = [];
  private readonly path: string;

  constructor(workingDirectory: string) {
    this.path = `${workingDirectory}/.coder/tasks.jsonl`;
    this.load();
  }

  private load(): void {
    try {
      if (!existsSync(this.path)) return;
      const raw = readFileSync(this.path, "utf-8");
      this.tasks = raw
        .split("\n")
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line) as QueuedTask);
    } catch {
      this.tasks = [];
    }
  }

  private flush(): void {
    try {
      const dir = dirname(this.path);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const lines = this.tasks.map((t) => JSON.stringify(t)).join("\n") + "\n";
      writeFileSync(this.path, lines);
    } catch { /* silent */ }
  }

  submit(query: string): QueuedTask {
    const task: QueuedTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      query,
      status: "pending",
      createdAt: Date.now(),
    };
    this.tasks.push(task);
    try {
      const dir = dirname(this.path);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      appendFileSync(this.path, JSON.stringify(task) + "\n");
    } catch { /* silent */ }
    return task;
  }

  /** Reset any "running" tasks from a prior crashed session back to "pending". */
  recoverStale(): number {
    this.load();
    let recovered = 0;
    for (const task of this.tasks) {
      if (task.status === "running") {
        task.status = "pending";
        task.startedAt = undefined;
        recovered++;
      }
    }
    if (recovered > 0) this.flush();
    return recovered;
  }

  next(): QueuedTask | null {
    this.load();
    return this.tasks.find((t) => t.status === "pending") ?? null;
  }

  markRunning(id: string): void {
    const task = this.tasks.find((t) => t.id === id);
    if (task) {
      task.status = "running";
      task.startedAt = Date.now();
      this.flush();
    }
  }

  markCompleted(id: string, cost: number, handoffs: number): void {
    const task = this.tasks.find((t) => t.id === id);
    if (task) {
      task.status = "completed";
      task.completedAt = Date.now();
      task.cost = cost;
      task.handoffs = handoffs;
      this.flush();
    }
  }

  markFailed(id: string, error: string): void {
    const task = this.tasks.find((t) => t.id === id);
    if (task) {
      task.status = "failed";
      task.completedAt = Date.now();
      task.error = error;
      this.flush();
    }
  }

  list(): QueuedTask[] {
    this.load();
    return [...this.tasks];
  }

  pending(): QueuedTask[] {
    this.load();
    return this.tasks.filter((t) => t.status === "pending");
  }

  /** Return the N most recently completed tasks (for dedup context). */
  recentCompleted(n = 10): QueuedTask[] {
    this.load();
    return this.tasks
      .filter((t) => t.status === "completed" && t.completedAt)
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
      .slice(0, n);
  }

  get size(): number {
    return this.tasks.length;
  }
}
