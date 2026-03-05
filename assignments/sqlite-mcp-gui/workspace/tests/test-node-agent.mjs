/**
 * Test the node-agent-check SSH command on actual node
 *
 * LESSON LEARNED (2026-01-19): The node-agent-check command exists in two files
 * with different error handling. This test verifies it works correctly.
 */
import { execSSHParallel } from "../src/lib/ssh/index.ts";

const host = "46.224.35.21";
const user = "root";
const keyPath = "/Users/ebowwa/apps/com.hetzner.codespaces/.ssh-keys/hetzner-codespaces-default";

// Test both versions of the command
const commands = {
  // Version from api.ts (line 1228) - missing 2>/dev/null
  "node-agent-check-v1": `curl -s -o /dev/null -w '%{http_code}' http://localhost:8911/api/status || echo 'offline'`,

  // Version from index.ts (line 1856) - has 2>/dev/null
  "node-agent-check-v2": `curl -s -o /dev/null -w '%{http_code}' http://localhost:8911/api/status 2>/dev/null || echo 'offline'`,

  // Also test if curl is available and if port 8911 is listening
  "curl-available": `type curl 2>/dev/null && echo 'yes' || echo 'no'`,

  "port-listening": `cat /proc/net/tcp /proc/net/tcp6 2>/dev/null | grep -c ':22B4' || echo '0'`, // 8911 in hex is 22B4
};

console.log("Testing Node Agent check commands on node:", host);
console.log("Using key path:", keyPath);
console.log("");

try {
  const results = await execSSHParallel(commands, { host, user, keyPath, timeout: 10 });

  console.log("=== RESULTS ===");
  for (const [key, value] of Object.entries(results)) {
    console.log(`${key}: "${value}"`);
  }

  console.log("\n=== ANALYSIS ===");
  const v1 = results["node-agent-check-v1"]?.trim();
  const v2 = results["node-agent-check-v2"]?.trim();
  const curlAvailable = results["curl-available"]?.trim();
  const portListening = results["port-listening"]?.trim();

  console.log(`curl available: ${curlAvailable === "yes" ? "✅ YES" : "❌ NO"}`);
  console.log(`Port 8911 listening: ${portListening !== "0" ? `✅ YES (${portListening} connections)` : "❌ NO"}`);

  if (v1 === v2) {
    console.log(`Command versions match: ✅ BOTH return "${v1}"`);
  } else {
    console.log(`Command versions differ:`);
    console.log(`  v1 (api.ts): "${v1}"`);
    console.log(`  v2 (index.ts): "${v2}"`);
    console.log(`  ⚠️  v2 has 2>/dev/null, suppresses curl errors`);
  }

  console.log("\n=== CONCLUSION ===");
  if (v1 === "200" || v2 === "200") {
    console.log("✅ Node Agent is RUNNING on port 8911");
  } else if (v1 === "offline" || v2 === "offline") {
    console.log("⚠️  Node Agent is NOT RUNNING (curl succeeded but returned non-200)");
  } else {
    console.log(`❓ Unexpected result: v1="${v1}", v2="${v2}"`);
    console.log("   This likely means curl is not installed or connection failed");
  }

} catch (error) {
  console.error("\n=== ERROR ===");
  console.error(error);
}
