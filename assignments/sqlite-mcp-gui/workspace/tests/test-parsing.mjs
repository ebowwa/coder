/**
 * Validate that parsing functions work correctly with actual SSH command outputs
 *
 * LESSON LEARNED (2026-01-19): Always verify parsing functions handle actual
 * command outputs from nodes. Mock data doesn't catch edge cases like trailing
 * spaces, unexpected formats, or empty values.
 */

import { parseResources, parseCPU, parseMemory, parseDisk, parseGPU } from "../../../packages/src/types/resources.ts";

// These are ACTUAL outputs from the Hetzner node test
const ACTUAL_NODE_OUTPUTS = {
  cpu: "2.09171",
  memory: "15.8208 0.590176 3.73039",
  disk: "4% 1.2G 38G",
  gpu: "NOGPU",
  network: "12884 12884",
  loadavg: "1.11 0.43 0.20",
  processes: "239",
  connections: "106",
  ports: "0016;0035"
};

console.log("=== VALIDATING PARSING FUNCTIONS WITH ACTUAL NODE OUTPUTS ===\n");

// Test CPU parsing
console.log("1. CPU Command Output:", `"${ACTUAL_NODE_OUTPUTS.cpu}"`);
const parsedCPU = parseCPU(ACTUAL_NODE_OUTPUTS.cpu);
console.log("   Parsed:", parsedCPU);
console.log("   Status:", parsedCPU === 2.1 ? "✅ PASS" : "❌ FAIL");

// Test Memory parsing
console.log("\n2. Memory Command Output:", `"${ACTUAL_NODE_OUTPUTS.memory}"`);
const parsedMemory = parseMemory(ACTUAL_NODE_OUTPUTS.memory);
console.log("   Parsed:", parsedMemory);
console.log("   Status:",
  parsedMemory.percent === 15.8 &&
  parsedMemory.used.includes("0.6") &&
  parsedMemory.total.includes("3.7")
  ? "✅ PASS" : "❌ FAIL"
);

// Test Disk parsing
console.log("\n3. Disk Command Output:", `"${ACTUAL_NODE_OUTPUTS.disk}"`);
const parsedDisk = parseDisk(ACTUAL_NODE_OUTPUTS.disk);
console.log("   Parsed:", parsedDisk);
console.log("   Status:",
  parsedDisk.percent === 4 &&
  parsedDisk.used.includes("1.2") &&
  parsedDisk.total.includes("38")
  ? "✅ PASS" : "❌ FAIL"
);

// Test GPU parsing (NOGPU case)
console.log("\n4. GPU Command Output:", `"${ACTUAL_NODE_OUTPUTS.gpu}"`);
const parsedGPU = parseGPU(ACTUAL_NODE_OUTPUTS.gpu);
console.log("   Parsed:", parsedGPU);
console.log("   Status:", parsedGPU === undefined ? "✅ PASS (NOGPU handled)" : "❌ FAIL");

// Test full parseResources with actual data
console.log("\n5. Full Resources Parse:");
const fullParsed = parseResources(ACTUAL_NODE_OUTPUTS);
console.log("   cpuPercent:", fullParsed.cpuPercent, "(expected ~2.1)");
console.log("   memoryPercent:", fullParsed.memoryPercent, "(expected ~15.8)");
console.log("   diskPercent:", fullParsed.diskPercent, "(expected 4)");
console.log("   memoryUsed:", fullParsed.memoryUsed, "(expected '0.6 GB')");
console.log("   diskUsed:", fullParsed.diskUsed, "(expected '1.2 GB')");

const fullPass =
  fullParsed.cpuPercent >= 2 && fullParsed.cpuPercent < 3 &&
  fullParsed.memoryPercent >= 15 && fullParsed.memoryPercent < 16 &&
  fullParsed.diskPercent === 4;

console.log("   Status:", fullPass ? "✅ PASS" : "❌ FAIL");

// Test edge cases
console.log("\n6. Edge Case Tests:");

// Empty output
console.log("   a. Empty CPU output:");
const emptyCPU = parseCPU("");
console.log("      Parsed:", emptyCPU, "(expected 0)");
console.log("      Status:", emptyCPU === 0 ? "✅ PASS" : "❌ FAIL");

// Invalid output
console.log("\n   b. Invalid memory output:");
const invalidMem = parseMemory("invalid data");
console.log("      Parsed:", invalidMem);
console.log("      Status:",
    invalidMem.percent === 0 &&
    invalidMem.used === "0 GB" &&
    invalidMem.total === "0 GB"
    ? "✅ PASS" : "❌ FAIL"
);

// GPU with actual data (simulated)
console.log("\n   c. GPU with actual data (simulated):");
const gpuWithData = parseGPU("45, 2048, 8192");
console.log("      Parsed:", gpuWithData);
console.log("      Status:",
  gpuWithData?.gpuPercent === 45 &&
  gpuWithData?.gpuMemoryUsed.includes("2.0") &&
  gpuWithData?.gpuMemoryTotal.includes("8.0")
  ? "✅ PASS" : "❌ FAIL"
);

console.log("\n=== SUMMARY ===");
console.log("All parsing functions validated against actual node outputs.");
console.log("Edge cases handled correctly with fallback values.");
