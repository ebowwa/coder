#!/usr/bin/env bun
/**
 * Test Bootstrap Script
 *
 * Experiments with cloud-init bootstrap on Hetzner servers
 * 1. Generates the bootstrap YAML for review
 * 2. Creates a test server with the bootstrap
 * 3. Provides SSH verification steps
 */

import { generateSeedBootstrap } from "../app/backend/shared/lib/bootstrap/cloud-init.js";
import { HetznerClient } from "../app/backend/shared/lib/hetzner/client.js";

// ============================================================================
// Configuration
// ============================================================================

const TEST_CONFIG = {
  serverName: `bootstrap-test-${Date.now()}`,
  serverType: "cx22", // Cheapest for testing
  image: "ubuntu-24.04",
  location: "fsn1", // Falkenstein
  sshKeyName: "ebowwa", // Your SSH key name
};

// ============================================================================
// Generate Bootstrap YAML
// ============================================================================

console.log("\n" + "=".repeat(60));
console.log("STEP 1: Generating Bootstrap YAML");
console.log("=".repeat(60));

const bootstrapYaml = generateSeedBootstrap({
  seedRepo: "https://github.com/ebowwa/seed",
  seedBranch: "Bun-port",
  seedPath: "/root/seed",
  runSetup: true,
});

console.log("\n--- Cloud-Init Bootstrap YAML ---");
console.log(bootstrapYaml);
console.log("--- End YAML ---\n");

// ============================================================================
// Create Test Server
// ============================================================================

console.log("=".repeat(60));
console.log("STEP 2: Creating Test Server with Bootstrap");
console.log("=".repeat(60));

const client = new HetznerClient();

if (!client.isAuthenticated) {
  console.error("❌ Not authenticated with Hetzner API");
  console.log("Please set HCLOUD_TOKEN environment variable");
  process.exit(1);
}

console.log(`\nCreating server: ${TEST_CONFIG.serverName}`);
console.log(`Type: ${TEST_CONFIG.serverType}`);
console.log(`Image: ${TEST_CONFIG.image}`);
console.log(`Location: ${TEST_CONFIG.location}\n`);

try {
  // Get SSH key ID
  const sshKeys = await client.sshKeys.list();
  const sshKey = sshKeys.find(k => k.name === TEST_CONFIG.sshKeyName);

  if (!sshKey) {
    console.error(`❌ SSH key "${TEST_CONFIG.sshKeyName}" not found`);
    console.log("Available keys:", sshKeys.map(k => k.name).join(", "));
    process.exit(1);
  }

  console.log(`✓ Using SSH key: ${sshKey.name} (ID: ${sshKey.id})`);

  // Create server with bootstrap
  const result = await client.servers.create({
    name: TEST_CONFIG.serverName,
    server_type: TEST_CONFIG.serverType,
    image: TEST_CONFIG.image,
    location: TEST_CONFIG.location,
    ssh_keys: [sshKey.id],
    user_data: bootstrapYaml,
  });

  console.log(`\n✓ Server created!`);
  console.log(`  Server ID: ${result.server.id}`);
  console.log(`  Public IP: ${result.server.publicNet.ipv4.ip}`);
  console.log(`  Root Password: ${result.root_password}`);

  // Wait for server to be ready
  console.log(`\n⏳ Waiting for server to become ready...`);

  const action = await client.actions.waitFor(result.action.id, {
    onProgress: (a) => {
      console.log(`  Status: ${a.status} (${a.progress}%)`);
    },
  });

  console.log(`\n✓ Server is ready!`);

  // ============================================================================
  // Verification Steps
  // ============================================================================

  console.log("\n" + "=".repeat(60));
  console.log("STEP 3: Verification Steps");
  console.log("=".repeat(60));

  console.log(`
To verify the bootstrap installation:

1. SSH into the server:
   ssh root@${result.server.publicNet.ipv4.ip}

2. Check bootstrap status:
   cat /root/.bootstrap-status

3. Check seed installation:
   ls -la /root/seed

4. Check setup logs:
   cat /var/log/seed-setup.log

5. Verify seed tools are installed:
   /root/seed/v2/node-agent/dist/index.js --help

6. When done testing, delete the server:
   hetzner server delete ${result.server.id}

Server Details:
  ID: ${result.server.id}
  Name: ${result.server.name}
  IP: ${result.server.publicNet.ipv4.ip}
  Datacenter: ${result.server.datacenter.name}
`);

  // ============================================================================
  // Auto-Verification (optional)
  // ============================================================================

  console.log("=".repeat(60));
  console.log("STEP 4: Auto-Verification (waiting 60s for bootstrap)");
  console.log("=".repeat(60));

  await new Promise(resolve => setTimeout(resolve, 60000));

  console.log("\n⏳ Attempting to verify bootstrap via SSH...");

  // You'll need to implement SSH verification here
  // For now, just provide manual steps

} catch (error) {
  console.error("\n❌ Error:", error);
  process.exit(1);
}
