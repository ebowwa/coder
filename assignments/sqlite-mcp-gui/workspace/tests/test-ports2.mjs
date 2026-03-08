import { NodeSSH } from "node-ssh";

const ssh = new NodeSSH();
await ssh.connect({
  host: "46.224.35.21",
  username: "root",
  privateKeyPath: "./.ssh-keys/hetzner-codespaces-default",
  readyTimeout: 10000,
});

// Check the raw format of /proc/net/tcp
console.log("=== Checking /proc/net/tcp format ===");
const result1 = await ssh.execCommand("head -5 /proc/net/tcp");
console.log("First 5 lines of /proc/net/tcp:");
console.log(result1.stdout);

// The issue is the header line: "  sl  local_address..."
// We need to skip lines that don't match the hex address pattern
console.log("\n=== Testing grep filter for hex addresses ===");
const cmd2 = `cat /proc/net/tcp /proc/net/tcp6 2>/dev/null | grep -E '^[0-9]+:|[0-9A-F]+:' | awk '{print $2}' | cut -d: -f2 | sort -u | tr '\\n' ';' | sed 's/;$//'`;
const result2 = await ssh.execCommand(cmd2);
console.log("With grep filter:");
console.log("stdout:", result2.stdout);

// Even better: use awk to filter
console.log("\n=== Testing awk-only solution ===");
const cmd3 = `cat /proc/net/tcp /proc/net/tcp6 2>/dev/null | awk 'NR>1 && $2 ~ /:/ {split($2, a, ":"); ports[a[2]]=1} END {for(p in ports) printf "%s;", p}'`;
const result3 = await ssh.execCommand(cmd3);
console.log("With awk filter:");
console.log("stdout:", result3.stdout);

await ssh.dispose();
