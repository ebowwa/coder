import { NodeSSH } from "node-ssh";

const ssh = new NodeSSH();
await ssh.connect({
  host: "46.224.35.21",
  username: "root",
  privateKeyPath: "./.ssh-keys/hetzner-codespaces-default",
  readyTimeout: 10000,
});

// Check the exact output of the grep command
const cmd = `cat /proc/net/tcp /proc/net/tcp6 2>/dev/null | grep -E '^[0-9]+:' | awk '{print $2}' | cut -d: -f2 | sort -u | tr '\\n' ';' | sed 's/;$//'`;

console.log("Command:", cmd);
const result = await ssh.execCommand(cmd);
console.log("stdout:", result.stdout);
console.log("stderr:", result.stderr);
console.log("code:", result.code);

// Check if the pattern is matching
const grepTest = await ssh.execCommand("cat /proc/net/tcp | grep -E '^[0-9]+:'");
console.log("\ngrep test output:");
console.log(grepTest.stdout);

await ssh.dispose();
