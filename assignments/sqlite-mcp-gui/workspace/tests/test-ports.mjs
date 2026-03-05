import { NodeSSH } from "node-ssh";

const ssh = new NodeSSH();
await ssh.connect({
  host: "46.224.35.21",
  username: "root",
  privateKeyPath: "./.ssh-keys/hetzner-codespaces-default",
  readyTimeout: 10000,
});

// Test the current ports command
const portsCmd = `cat /proc/net/tcp /proc/net/tcp6 2>/dev/null | awk '{print $2}' | cut -d: -f2 | sort -u | tr '\\n' ';' | sed 's/;$//'`;

console.log("Current ports command:", portsCmd);
const result = await ssh.execCommand(portsCmd);
console.log("stdout:", result.stdout);
console.log("stderr:", result.stderr);

// Test with header filtering
const fixedCmd = `cat /proc/net/tcp /proc/net/tcp6 2>/dev/null | tail -n +2 | awk '{print $2}' | cut -d: -f2 | sort -u | tr '\\n' ';' | sed 's/;$//'`;

console.log("\nFixed ports command:", fixedCmd);
const fixedResult = await ssh.execCommand(fixedCmd);
console.log("stdout:", fixedResult.stdout);
console.log("stderr:", fixedResult.stderr);

await ssh.dispose();
