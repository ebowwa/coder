#!/usr/bin/env bun
/**
 * CLI script to sync all Hetzner nodes to ~/.ssh/config
 *
 * Usage:
 *   bun run scripts/sync-ssh-config.ts
 *   bun run scripts/sync-ssh-config.ts --validate   # Also test SSH connections
 *   bun run scripts/sync-ssh-config.ts --list       # Just list current entries
 *
 * After running, you can connect with:
 *   ssh node-<id>
 *   ssh <server-name>
 */

import { HetznerClient } from "../src/lib/hetzner";
import { getAllMetadata } from "../src/lib/metadata";
import {
  syncNodesToSSHConfig,
  listSSHConfigEntries,
  ensureCorrectSSHKey,
} from "../src/lib/ssh/config";

const args = process.argv.slice(2);
const validate = args.includes("--validate") || args.includes("-v");
const listOnly = args.includes("--list") || args.includes("-l");
const help = args.includes("--help") || args.includes("-h");

if (help) {
  console.log(`
sync-ssh-config - Sync Hetzner nodes to ~/.ssh/config

Usage:
  bun run scripts/sync-ssh-config.ts [options]

Options:
  --validate, -v   Test SSH connections after syncing
  --list, -l       List current SSH config entries (no sync)
  --help, -h       Show this help

After syncing, connect with:
  ssh node-<id>           # Using server ID
  ssh <server-name>       # Using server name
`);
  process.exit(0);
}

async function main() {
  // List only mode
  if (listOnly) {
    const entries = listSSHConfigEntries();

    if (entries.length === 0) {
      console.log("No SSH config entries found.");
      console.log("Run without --list to sync nodes.");
      return;
    }

    console.log(`\n${entries.length} SSH config entries:\n`);
    for (const entry of entries) {
      const alias = entry.name.replace(/[^a-zA-Z0-9_-]/g, "-");
      console.log(`  ssh node-${entry.id}  # ${entry.host}`);
      console.log(`  ssh ${alias}`);
      console.log();
    }
    return;
  }

  // Check for Hetzner API token
  const token = process.env.HETZNER_API_TOKEN;
  if (!token) {
    console.error("Error: HETZNER_API_TOKEN environment variable not set");
    console.error("Run with: doppler run -- bun run scripts/sync-ssh-config.ts");
    process.exit(1);
  }

  console.log("Fetching servers from Hetzner...\n");

  // Create Hetzner client
  const hetznerClient = new HetznerClient(token);

  // Get all servers
  const servers = await hetznerClient.listServers();

  if (servers.length === 0) {
    console.log("No servers found in Hetzner account.");
    return;
  }

  console.log(`Found ${servers.length} server(s)\n`);

  // Get metadata for SSH key paths
  const allMetadata = getAllMetadata();
  const metadataMap = new Map(allMetadata.map((m) => [m.id, m]));

  // Build nodes list
  const nodes = servers
    .filter((s) => s.public_net.ipv4?.ip)
    .map((s) => {
      const id = s.id.toString();
      const metadata = metadataMap.get(id);
      return {
        id,
        name: s.name,
        ip: s.public_net.ipv4!.ip,
        keyPath: metadata?.sshKeyPath || "",
        status: s.status,
      };
    });

  // Warn about nodes without key paths
  const noKeyPath = nodes.filter((n) => !n.keyPath);
  if (noKeyPath.length > 0) {
    console.log(`Warning: ${noKeyPath.length} node(s) have no SSH key path in metadata:`);
    for (const n of noKeyPath) {
      console.log(`  - ${n.name} (${n.id}): ${n.ip}`);
    }
    console.log();
  }

  // Filter to nodes with key paths
  const validNodes = nodes.filter((n) => n.keyPath);

  if (validNodes.length === 0) {
    console.log("No nodes with SSH key paths found. Nothing to sync.");
    return;
  }

  // Ensure correct SSH key is loaded (use first node's key)
  if (validNodes[0].keyPath) {
    try {
      await ensureCorrectSSHKey(validNodes[0].keyPath);
    } catch (err) {
      console.warn(`Warning: Could not configure ssh-agent: ${err}`);
    }
  }

  // Sync to SSH config
  console.log(`Syncing ${validNodes.length} node(s) to ~/.ssh/config...\n`);

  const results = await syncNodesToSSHConfig(
    validNodes.map((n) => ({
      id: n.id,
      name: n.name,
      ip: n.ip,
      keyPath: n.keyPath,
    })),
    {
      validateSSH: validate,
      onProgress: (result) => {
        const icon = result.status === "added" ? "+" :
                    result.status === "updated" ? "~" :
                    result.status === "skipped" ? "=" :
                    "!";
        const sshStatus = result.sshReady === true ? " [SSH OK]" :
                         result.sshReady === false ? " [SSH FAIL]" : "";
        console.log(`  [${icon}] ${result.name} (${result.id}): ${result.ip}${sshStatus}`);
        if (result.error) {
          console.log(`      Error: ${result.error}`);
        }
      },
    }
  );

  // Summary
  const added = results.filter((r) => r.status === "added").length;
  const updated = results.filter((r) => r.status === "updated").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const errors = results.filter((r) => r.status === "error").length;

  console.log(`\nSync complete: ${added} added, ${updated} updated, ${skipped} unchanged, ${errors} errors\n`);

  // Show usage
  if (added > 0 || updated > 0) {
    console.log("You can now connect using:");
    for (const result of results.filter((r) => r.status === "added" || r.status === "updated")) {
      const alias = result.name.replace(/[^a-zA-Z0-9_-]/g, "-");
      console.log(`  ssh node-${result.id}  # or: ssh ${alias}`);
    }
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
