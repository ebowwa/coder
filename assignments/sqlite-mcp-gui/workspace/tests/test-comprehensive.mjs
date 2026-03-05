/**
 * Comprehensive End-to-End SSH Command Testing
 *
 * LESSON LEARNED (2026-01-19): Run all tests in one script to verify
 * the complete data flow: SSH commands → parsing → API response
 *
 * This test validates:
 * 1. SSH commands execute correctly on node
 * 2. Parsing functions handle outputs correctly
 * 3. API endpoint returns properly formatted data
 */

import { execSSHParallel } from "../src/lib/ssh/index.ts";
import { parseResources, parseCPU, parseMemory, parseDisk, parseGPU } from "../../../packages/src/types/resources.ts";

// All SSH commands used in production
const ALL_SSH_COMMANDS = {
  // Resource monitoring commands
  cpu: `cat /proc/stat | head -1 | awk '{print ($2+$4)*100/($2+$4+$5)}'`,
  memory: `cat /proc/meminfo | grep -E '^MemTotal|^MemAvailable' | awk '{if(NR==1)t=$2; else a=$2} END {print (t-a)*100/t, (t-a)/1024/1024, t/1024/1024}'`,
  disk: `df -h / | grep -v '^Filesystem' | awk '{print $5, $3, $2}' | head -1`,
  gpu: `type nvidia-smi 2>/dev/null && nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits | head -1 || echo NOGPU`,
  network: `cat /proc/net/dev | grep -E ': ' | head -1 | awk '{print $2, $10}'`,
  loadavg: `cut -d' ' -f1-3 /proc/loadavg`,
  processes: `ls /proc 2>/dev/null | grep -cE '^[0-9]+$'`,
  connections: `cat /proc/net/tcp /proc/net/tcp6 2>/dev/null | wc -l`,
  ports: `cat /proc/net/tcp /proc/net/tcp6 2>/dev/null | grep -v 'local_address' | awk '{print $2}' | cut -d: -f2 | sort -u | tr '\\n' ';' | sed 's/;$//'`,

  // Node Agent check command (FIXED 2026-01-19)
  "node-agent-check": `STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8911/api/status 2>/dev/null); if [ "$STATUS" = "000" ] || [ -z "$STATUS" ]; then echo 'offline'; else echo "$STATUS"; fi`,
};

const host = "46.224.35.21";
const user = "root";
const keyPath = "/Users/ebowwa/apps/com.hetzner.codespaces/.ssh-keys/hetzner-codespaces-default";

console.log("╔════════════════════════════════════════════════════════════╗");
console.log("║  COMPREHENSIVE SSH COMMAND TESTING - END TO END          ║");
console.log("╚════════════════════════════════════════════════════════════╝");
console.log(`Node: ${host}`);
console.log(`User: ${user}`);
console.log(`Key: ${keyPath}`);
console.log("");

let passCount = 0;
let failCount = 0;

function testResult(name, passed, details = "") {
  const status = passed ? "✅ PASS" : "❌ FAIL";
  if (passed) passCount++; else failCount++;
  console.log(`${status} | ${name}${details ? ": " + details : ""}`);
}

console.log("─".repeat(60));
console.log("PHASE 1: SSH Command Execution");
console.log("─".repeat(60));

const startTime = Date.now();
let rawResults;

try {
  rawResults = await execSSHParallel(ALL_SSH_COMMANDS, { host, user, keyPath, timeout: 10 });
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  testResult("SSH Connection", true, `connected in ${elapsed}s`);
} catch (error) {
  testResult("SSH Connection", false, String(error));
  process.exit(1);
}

// Test each command returned non-empty result
for (const [key, value] of Object.entries(rawResults)) {
  const hasOutput = value && value.trim().length > 0;
  const isOffline = key === "node-agent-check" && value.includes("offline");
  const isNoGpu = key === "gpu" && value.includes("NOGPU");

  if (hasOutput && (isOffline || isNoGpu || !value.includes("Command failed"))) {
    testResult(key, true, `"${value}"`);
  } else {
    testResult(key, false, `"${value}"`);
  }
}

console.log("");
console.log("─".repeat(60));
console.log("PHASE 2: Parsing Function Validation");
console.log("─".repeat(60));

// Test individual parsing functions
const cpuParsed = parseCPU(rawResults.cpu);
testResult("parseCPU", cpuParsed >= 0 && cpuParsed <= 100, `${cpuParsed}%`);

const memParsed = parseMemory(rawResults.memory);
testResult("parseMemory", memParsed.percent >= 0, `${memParsed.percent}%, ${memParsed.used}, ${memParsed.total}`);

const diskParsed = parseDisk(rawResults.disk);
testResult("parseDisk", diskParsed.percent >= 0, `${diskParsed.percent}%, ${diskParsed.used}, ${diskParsed.total}`);

const gpuParsed = parseGPU(rawResults.gpu);
testResult("parseGPU", gpuParsed === undefined || typeof gpuParsed?.gpuPercent === "number",
  gpuParsed === undefined ? "NOGPU handled" : `${gpuParsed.gpuPercent}%`);

// Test full parseResources
const resourceCommands = {
  cpu: rawResults.cpu,
  memory: rawResults.memory,
  disk: rawResults.disk,
  gpu: rawResults.gpu,
  network: rawResults.network,
  loadavg: rawResults.loadavg,
  processes: rawResults.processes,
  connections: rawResults.connections,
  ports: rawResults.ports,
};

const parsed = parseResources(resourceCommands);
testResult("parseResources (full)",
  parsed.cpuPercent >= 0 &&
  parsed.memoryPercent >= 0 &&
  parsed.diskPercent >= 0 &&
  parsed.memoryUsed.includes("GB") &&
  parsed.diskUsed.includes("GB"),
  `${parsed.cpuPercent}% CPU, ${parsed.memoryPercent}% MEM, ${parsed.diskPercent}% DISK`
);

console.log("");
console.log("─".repeat(60));
console.log("PHASE 3: API Format Validation");
console.log("─".repeat(60));

// Validate the parsed output matches expected API format
const apiFormat = {
  cpu: parsed.cpu,
  memory: parsed.memory,
  disk: parsed.disk,
  gpu: parsed.gpu,
  network: parsed.network,
  loadavg: parsed.loadavg,
  processes: parsed.processes,
  connections: parsed.connections,
  ports: parsed.ports,
  cpuPercent: parsed.cpuPercent,
  memoryPercent: parsed.memoryPercent,
  memoryUsed: parsed.memoryUsed,
  memoryTotal: parsed.memoryTotal,
  diskPercent: parsed.diskPercent,
  diskUsed: parsed.diskUsed,
  diskTotal: parsed.diskTotal,
};

testResult("API has cpuPercent", typeof apiFormat.cpuPercent === "number", apiFormat.cpuPercent);
testResult("API has memoryUsed", typeof apiFormat.memoryUsed === "string", apiFormat.memoryUsed);
testResult("API has diskTotal", typeof apiFormat.diskTotal === "string", apiFormat.diskTotal);
testResult("API has network", typeof apiFormat.network === "string", apiFormat.network);
testResult("API has ports", typeof apiFormat.ports === "string", apiFormat.ports);

console.log("");
console.log("─".repeat(60));
console.log("PHASE 4: Node Agent Check");
console.log("─".repeat(60));

const nodeAgentStatus = rawResults["node-agent-check"]?.trim();
const isRunning = nodeAgentStatus === "200";
const isOffline = nodeAgentStatus === "offline";
const isInvalid = nodeAgentStatus === "000" || nodeAgentStatus === "000offline";

testResult("Node Agent check output", isRunning || isOffline, nodeAgentStatus);
testResult("Node Agent handles offline", !isRunning && isOffline && !isInvalid,
  isOffline ? "returns 'offline'" : isInvalid ? "BUG: returns '000'" : "running");

console.log("");
console.log("╔════════════════════════════════════════════════════════════╗");
console.log("║  TEST SUMMARY                                              ║");
console.log("╚════════════════════════════════════════════════════════════╝");

const totalTests = passCount + failCount;
const passRate = ((passCount / totalTests) * 100).toFixed(1);

console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${passCount} (${passRate}%)`);
console.log(`Failed: ${failCount}`);

if (failCount === 0) {
  console.log("");
  console.log("✅ ALL TESTS PASSED - SSH commands are production ready!");
  console.log("");
  console.log("Verified:");
  console.log("  • SSH connection works with key authentication");
  console.log("  • All 10 commands execute successfully");
  console.log("  • Parsing functions handle outputs correctly");
  console.log("  • API format is correct for frontend consumption");
  console.log("  • Node Agent check handles offline state");
} else {
  console.log("");
  console.log("⚠️  SOME TESTS FAILED - Review errors above");
  process.exit(1);
}

console.log("");
console.log("Commands tested on actual node: Hetzner Ubuntu 24.04");
console.log("Test date:", new Date().toISOString());
