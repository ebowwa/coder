import { NodeSSH } from "node-ssh";

const ssh = new NodeSSH();
await ssh.connect({
  host: "46.224.35.21",
  username: "root",
  privateKeyPath: "./.ssh-keys/hetzner-codespaces-default",
  readyTimeout: 10000,
});

const netCmd = `cat /proc/net/dev | grep -E ': ' | head -1 | awk '{print $2, $10}'`;

console.log("Testing network command:", netCmd);
const result = await ssh.execCommand(netCmd);
console.log("stdout:", result.stdout);
console.log("stderr:", result.stderr);
console.log("code:", result.code);

await ssh.dispose();
