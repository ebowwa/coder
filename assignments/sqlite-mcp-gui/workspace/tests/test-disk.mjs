import { execSSH } from "../src/lib/ssh/index.ts";

const host = "46.224.35.21";
const user = "root";
const keyPath = "/Users/ebowwa/apps/com.hetzner.codespaces/.ssh-keys/hetzner-codespaces-default";

const diskCommand = `df -h / | grep -v '^Filesystem' | awk '{print $5, $3, $2}' | head -1`;

console.log("Testing disk command:", diskCommand);

try {
  const result = await execSSH(diskCommand, { host, user, keyPath, timeout: 5 });
  console.log("Success:", result);
} catch (error) {
  console.error("Error:", error);
  console.error("Error details:", error.cause || error.message);
}
