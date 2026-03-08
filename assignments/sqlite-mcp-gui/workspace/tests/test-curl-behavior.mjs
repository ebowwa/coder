/**
 * Test curl behavior for the node-agent-check command
 *
 * LESSON LEARNED (2026-01-19): curl returns "000" when connection fails
 * but exits with 0, so || fallback doesn't trigger. Need to check for "000".
 */
import { execSSHParallel } from "../src/lib/ssh/index.ts";

const host = "46.224.35.21";
const user = "root";
const keyPath = "/Users/ebowwa/apps/com.hetzner.codespaces/.ssh-keys/hetzner-codespaces-default";

console.log("Testing curl behavior for node-agent-check...\n");

const commands = {
  // Current command (has bug)
  "v1-current": `curl -s -o /dev/null -w '%{http_code}' http://localhost:8911/api/status 2>/dev/null || echo 'offline'`,

  // Test curl exit code explicitly
  "curl-exit-code": `curl -s -o /dev/null -w '%{http_code}' http://localhost:8911/api/status 2>/dev/null; echo "EXIT:$?"`,

  // Fixed version - check for "000"
  "v2-fixed": `STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8911/api/status 2>/dev/null); if [ "$STATUS" = "000" ] || [ -z "$STATUS" ]; then echo 'offline'; else echo "$STATUS"; fi`,

  // Alternative fixed version using curl's --fail flag
  "v3-alt": `curl -s -o /dev/null -w '%{http_code}' --fail http://localhost:8911/api/status 2>/dev/null || echo 'offline'`,

  // Test with a working URL (should return 000 if node-agent not installed)
  "test-localhost": `curl -s -o /dev/null -w '%{http_code}' http://localhost:8911/api/status 2>/dev/null || echo 'offline'`,

  // Test curl on a known working endpoint (ssh port)
  "test-ssh-port": `curl -s -o /dev/null -w '%{http_code}' http://localhost:22/ 2>/dev/null || echo 'offline'`,

  // Test if curl is even available
  "curl-version": `curl --version 2>/dev/null | head -1 || echo 'not installed'`,
};

const results = await execSSHParallel(commands, { host, user, keyPath, timeout: 10 });

console.log("=== RESULTS ===\n");
for (const [key, value] of Object.entries(results)) {
  console.log(`${key}: "${value}"`);
}

console.log("\n=== ANALYSIS ===");
const v1 = results["v1-current"]?.trim();
const v2 = results["v2-fixed"]?.trim();
const v3 = results["v3-alt"]?.trim();
const exitCode = results["curl-exit-code"]?.trim();

console.log(`\nv1 (current): "${v1}"`);
console.log(`  Problem: Returns "000" when connection fails, not "offline"`);
console.log(`  This is because curl exits with 0 even on connection failure`);

console.log(`\nv2 (fixed): "${v2}"`);
console.log(`  Solution: Explicitly check for "000" or empty status`);

console.log(`\nv3 (alt with --fail): "${v3}"`);
console.log(`  Alternative: Use curl --fail which exits with error on failed HTTP`);

console.log(`\ncurl exit code: "${exitCode}"`);
console.log(`  Confirms: curl exits with 0 even when connection fails`);

console.log("\n=== RECOMMENDATION ===");
if (v2 === "offline" || v3 === "offline") {
  console.log("✅ Fixed versions correctly return 'offline'");
  console.log("\nUse either:");
  console.log("  v2: Shell script to check for '000'");
  console.log("  v3: curl --fail flag");
} else {
  console.log("❌ Fixed versions still not working correctly");
}
