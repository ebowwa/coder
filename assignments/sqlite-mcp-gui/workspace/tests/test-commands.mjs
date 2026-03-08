/**
 * Test script to verify SSH resource commands work correctly on Hetzner nodes
 *
 * LESSON LEARNED (2026-01-19): Always keep this test file in sync with
 * app/backend/shared/lib/resources.ts. When updating commands there,
 * update them here too. This was found when ports command had "local_address"
 * bug here but was fixed in resources.ts.
 */
import { execSSHParallel } from "../src/lib/ssh/index.ts";

// NOTE: These commands MUST match app/backend/shared/lib/resources.ts exactly
// If you update one, update the other!
const RESOURCE_COMMANDS = {
  cpu: `cat /proc/stat | head -1 | awk '{print ($2+$4)*100/($2+$4+$5)}'`,
  memory: `cat /proc/meminfo | grep -E '^MemTotal|^MemAvailable' | awk '{if(NR==1)t=$2; else a=$2} END {print (t-a)*100/t, (t-a)/1024/1024, t/1024/1024}'`,
  disk: `df -h / | grep -v '^Filesystem' | awk '{print $5, $3, $2}' | head -1`,
  gpu: `type nvidia-smi 2>/dev/null && nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits | head -1 || echo NOGPU`,
  network: `cat /proc/net/dev | grep -E ': ' | head -1 | awk '{print $2, $10}'`,
  loadavg: `cut -d' ' -f1-3 /proc/loadavg`,
  processes: `ls /proc 2>/dev/null | grep -cE '^[0-9]+$'`,
  connections: `cat /proc/net/tcp /proc/net/tcp6 2>/dev/null | wc -l`,
  ports: `cat /proc/net/tcp /proc/net/tcp6 2>/dev/null | grep -v 'local_address' | awk '{print $2}' | cut -d: -f2 | sort -u | tr '\\n' ';' | sed 's/;$//'`,
};

const host = "46.224.35.21";
const user = "root";
const keyPath = "/Users/ebowwa/apps/com.hetzner.codespaces/.ssh-keys/hetzner-codespaces-default";

console.log("Testing SSH commands on node:", host);
console.log("Using key path:", keyPath);

try {
  const results = await execSSHParallel(RESOURCE_COMMANDS, { host, user, keyPath, timeout: 10 });
  
  console.log("\n=== RESULTS ===");
  for (const [key, value] of Object.entries(results)) {
    console.log(`${key}: "${value}"`);
  }
} catch (error) {
  console.error("\n=== ERROR ===");
  console.error(error);
}
