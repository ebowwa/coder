/**
 * Quality Gate - External verification that coder's work compiles, passes tests, and changed files.
 *
 * Called by supervisor-mode.ts after each phase completes.
 * Runs bun test, bunx tsc --noEmit, and git diff --stat in the working directory.
 */

import type { QualityGateResult } from "../../../schemas/index.js";

interface ShellResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function shell(cmd: string[], cwd: string): Promise<ShellResult> {
  const proc = Bun.spawn(cmd, { cwd, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
}

function parseTestOutput(stdout: string, stderr: string, exitCode: number): {
  pass: number;
  fail: number;
  error: number;
  skipped: number;
  failures: string[];
} {
  const combined = stdout + "\n" + stderr;
  let pass = 0, fail = 0, error = 0, skipped = 0;
  const failures: string[] = [];

  // bun test output: "X pass, Y fail, Z skip"
  const passMatch = combined.match(/(\d+)\s+pass/);
  const failMatch = combined.match(/(\d+)\s+fail/);
  const skipMatch = combined.match(/(\d+)\s+skip/);

  if (passMatch) pass = parseInt(passMatch[1]!, 10);
  if (failMatch) fail = parseInt(failMatch[1]!, 10);
  if (skipMatch) skipped = parseInt(skipMatch[1]!, 10);

  if (exitCode !== 0 && fail === 0 && pass === 0) {
    error = 1;
    failures.push(`Test runner exited ${exitCode}: ${stderr.slice(0, 300)}`);
  }

  // Capture individual failure messages (bun test format: "✗ <test name>")
  for (const line of combined.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("✗") || trimmed.startsWith("FAIL")) {
      failures.push(trimmed.slice(0, 200));
    }
  }

  return { pass, fail, error, skipped, failures };
}

function parseTscOutput(stdout: string, stderr: string, exitCode: number): {
  tsErrors: number;
  failures: string[];
} {
  if (exitCode === 0) return { tsErrors: 0, failures: [] };

  const combined = stdout + "\n" + stderr;
  const failures: string[] = [];

  // Count TS errors: "Found N errors" or individual "file.ts(line,col): error TS..."
  const foundMatch = combined.match(/Found (\d+) error/);
  if (foundMatch) {
    return { tsErrors: parseInt(foundMatch[1]!, 10), failures: extractTsFailures(combined) };
  }

  // Count individual error lines
  const errorLines = combined.split("\n").filter(l => l.includes(": error TS"));
  for (const line of errorLines.slice(0, 10)) {
    failures.push(line.trim().slice(0, 200));
  }

  return { tsErrors: Math.max(errorLines.length, 1), failures };
}

function extractTsFailures(output: string): string[] {
  return output
    .split("\n")
    .filter(l => l.includes(": error TS"))
    .slice(0, 10)
    .map(l => l.trim().slice(0, 200));
}

async function getChangedFiles(cwd: string): Promise<string[]> {
  const { stdout, exitCode } = await shell(["git", "diff", "--stat", "--name-only"], cwd);
  if (exitCode !== 0 || !stdout) return [];
  return stdout.split("\n").filter(Boolean);
}

/**
 * Run the full quality gate suite against a working directory.
 * Returns a structured result indicating pass/fail + details.
 */
export async function verifyQualityGate(workingDirectory: string): Promise<QualityGateResult> {
  const start = Date.now();
  const allFailures: string[] = [];

  // Run tests and typecheck in parallel
  const [testResult, tscResult, filesChanged] = await Promise.all([
    shell(["bun", "test"], workingDirectory).catch(() => ({
      stdout: "", stderr: "bun test not available", exitCode: 127,
    })),
    shell(["bunx", "tsc", "--noEmit"], workingDirectory).catch(() => ({
      stdout: "", stderr: "tsc not available", exitCode: 127,
    })),
    getChangedFiles(workingDirectory),
  ]);

  const tests = parseTestOutput(testResult.stdout, testResult.stderr, testResult.exitCode);
  const ts = parseTscOutput(tscResult.stdout, tscResult.stderr, tscResult.exitCode);

  allFailures.push(...tests.failures, ...ts.failures);

  // Gate passes when: no test failures/errors AND no TS errors
  const passed = tests.fail === 0
    && tests.error === 0
    && ts.tsErrors === 0;

  return {
    passed,
    tests: {
      pass: tests.pass,
      fail: tests.fail,
      error: tests.error,
      skipped: tests.skipped,
    },
    tsErrors: ts.tsErrors,
    filesChanged,
    duration: Date.now() - start,
    failures: allFailures,
  };
}

/**
 * Format a quality gate result as a retry prompt for the agent.
 * Injected when the gate fails so the agent knows exactly what to fix.
 */
export function buildRetryPrompt(result: QualityGateResult, phase: number): string {
  const parts = [`Phase ${phase} quality gate FAILED.`];

  if (result.tests.fail > 0 || result.tests.error > 0) {
    parts.push(`Tests: ${result.tests.pass} pass, ${result.tests.fail} fail, ${result.tests.error} error.`);
  }
  if (result.tsErrors > 0) {
    parts.push(`TypeScript: ${result.tsErrors} error(s).`);
  }
  if (result.filesChanged.length === 0) {
    parts.push("No files were changed -- make sure to actually edit code.");
  }
  if (result.failures.length > 0) {
    parts.push("Specific failures:");
    for (const f of result.failures.slice(0, 8)) {
      parts.push(`  - ${f}`);
    }
  }

  parts.push("Fix these issues and try again.");
  return parts.join("\n");
}
