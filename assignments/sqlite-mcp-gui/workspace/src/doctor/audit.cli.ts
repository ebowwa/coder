/**
 * CLI entrypoint for `bun run doctor`
 * Runs config audit and prints formatted results
 */

import { auditConfig } from "../lib/audit";
import type { AuditIssue } from "../lib/audit";
import pkg from "../../../package.json";

const SEVERITY_ICON: Record<AuditIssue["severity"], string> = {
  error: "\x1b[31m✗\x1b[0m",
  warning: "\x1b[33m!\x1b[0m",
  info: "\x1b[36mi\x1b[0m",
};

const SEVERITY_LABEL: Record<AuditIssue["severity"], string> = {
  error: "\x1b[31merror\x1b[0m",
  warning: "\x1b[33mwarning\x1b[0m",
  info: "\x1b[36minfo\x1b[0m",
};

console.log(`\n${pkg.name} Config Audit v${pkg.version}`);
console.log("========================\n");

const result = await auditConfig();

if (result.issues.length === 0) {
  console.log("\x1b[32m✓ All checks passed\x1b[0m\n");
} else {
  for (const issue of result.issues) {
    console.log(
      `  ${SEVERITY_ICON[issue.severity]} [${SEVERITY_LABEL[issue.severity]}] ${issue.message}`,
    );
    if (issue.detail) {
      console.log(`    ${issue.detail}`);
    }
  }

  const errors = result.issues.filter((i) => i.severity === "error").length;
  const warnings = result.issues.filter((i) => i.severity === "warning").length;
  const infos = result.issues.filter((i) => i.severity === "info").length;

  console.log("");
  const parts: string[] = [];
  if (errors > 0) parts.push(`\x1b[31m${errors} error(s)\x1b[0m`);
  if (warnings > 0) parts.push(`\x1b[33m${warnings} warning(s)\x1b[0m`);
  if (infos > 0) parts.push(`\x1b[36m${infos} info\x1b[0m`);
  console.log(`  ${parts.join(", ")}`);
}

console.log(`  Timestamp: ${result.timestamp}\n`);

process.exit(result.ok ? 0 : 1);
