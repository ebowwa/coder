import { NodeSSH } from "node-ssh";

const ssh = new NodeSSH();
await ssh.connect({
  host: "46.224.35.21",
  username: "root",
  privateKeyPath: "./.ssh-keys/hetzner-codespaces-default",
  readyTimeout: 10000,
});

// Get the raw format to see what we're working with
console.log("=== Raw /proc/net/tcp (first 5 lines) ===");
const raw = await ssh.execCommand("head -5 /proc/net/tcp");
console.log(raw.stdout);

// Try different patterns
console.log("\n=== Pattern 1: Match lines with colon ===");
const p1 = await ssh.execCommand("cat /proc/net/tcp | grep ':'");
console.log("Lines with colon:", p1.stdout);

console.log("\n=== Pattern 2: Match data lines (skip header) ===");
const p2 = await ssh.execCommand("cat /proc/net/tcp | grep -v 'local_address'");
console.log("Non-header lines:", p2.stdout);

await ssh.dispose();
