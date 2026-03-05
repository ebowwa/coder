#!/usr/bin/env bun
/**
 * SSH Connection Pool Integration Test
 *
 * Tests persistent SSH connections with live Hetzner servers
 *
 * Prerequisites:
 * - HETZNER_API_TOKEN environment variable set
 * - Network access to Hetzner API
 *
 * Run with: bun test tests/ssh-pool-integration.test.ts
 */

import { test, describe, expect, beforeAll, afterAll } from "bun:test";
import { homedir } from "node:os";
import { Socket } from "node:net";
import { HetznerClient } from "../src/lib/hetzner/index.js";
import { getSSHPool, closeGlobalSSHPool, getActiveSSHConnections } from "../src/lib/ssh/pool.js";
import { execSSH } from "../src/lib/ssh/client.js";
import { testSSHConnection } from "../src/lib/ssh/exec.js";
import { generateSSHKeyPair, cleanupSSHKeyPair } from "./helpers/ssh-key.js";
import type { SSHOptions } from "../src/lib/ssh/types.js";

/**
 * Check if a host's port is reachable using TCP connection
 */
async function checkPortReachable(host: string, port: number, timeoutMs = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new Socket();
    let resolved = false;

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve(false);
      }
    };

    socket.setTimeout(timeoutMs, cleanup);

    socket.on('connect', () => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve(true);
      }
    });

    socket.on('error', cleanup);
    socket.on('timeout', cleanup);

    socket.connect(port, host);
  });
}

const TEST_SERVER_NAME = `ssh-pool-test-${Date.now()}`;
const TEST_SSH_KEY_NAME = `ssh-pool-test-key-${Date.now()}`;

describe("SSH Connection Pool - Live Integration Tests", () => {
  let hetzner: HetznerClient;
  let serverId: number;
  let serverIP: string;
  let sshKeyId: number;
  let keyPair: { publicKey: string; privateKeyPath: string };

  // Skip these tests if no API token is available
  const skipTests = !process.env.HETZNER_API_TOKEN;

  beforeAll(async () => {
    if (skipTests) return;

    hetzner = new HetznerClient(process.env.HETZNER_API_TOKEN);

    // Try to find an existing running server to use
    const servers = await hetzner.servers.list();
    // Prefer dev-server, but fall back to any running server
    let existingServer = servers.find(s => s.status === "running" && s.name.startsWith("dev-"));

    // If dev-server not found or not reachable, try other servers
    if (!existingServer) {
      existingServer = servers.find(s => s.status === "running");
    }

    if (existingServer) {
      // Test connectivity first by checking if port 22 is reachable
      serverIP = existingServer.public_net.ipv4.ip;
      console.log(`[Test] Checking connectivity to ${existingServer.name} (${serverIP})...`);

      // Simple TCP connection test using Node.js net.Socket
      let reachable = await checkPortReachable(serverIP, 22, 3000);

      if (!reachable) {
        console.log(`[Test] Server ${existingServer.name} not reachable, trying other servers...`);
        // Try another server
        const otherServers = servers.filter(s => s.status === "running" && s.id !== existingServer.id);
        for (const server of otherServers) {
          const ip = server.public_net.ipv4.ip;
          console.log(`[Test] Checking ${server.name} (${ip})...`);
          const serverReachable = await checkPortReachable(ip, 22, 3000);
          if (serverReachable) {
            existingServer = server;
            reachable = true;
            console.log(`[Test] Found reachable server: ${server.name} (${ip})`);
            break;
          }
        }
      }

      if (!reachable) {
        console.log(`[Test] No reachable servers found, will create new server`);
        existingServer = null;
      }

      if (existingServer) {
        console.log(`[Test] Using existing server: ${existingServer.name} (${existingServer.public_net.ipv4.ip})`);
        serverId = existingServer.id;
        serverIP = existingServer.public_net.ipv4.ip;

        // Set up SSH key for existing server
        // Don't set keyPath - let node-ssh use SSH agent
        const existingKeyPath = process.env.TEST_SSH_KEY_PATH || "";
        if (existingKeyPath) {
          const expandedPath = existingKeyPath.replace(/^~/, homedir());
          console.log(`[Test] SSH key from env: ${expandedPath}`);
          keyPair = {
            publicKey: "",
            privateKeyPath: expandedPath,
          };
        } else {
          // No keyPath - use SSH agent
          console.log(`[Test] Using SSH agent for authentication`);
          keyPair = {
            publicKey: "",
            privateKeyPath: "", // Empty string means use agent/default
          };
        }
        return;
      }
    }

    // Generate SSH key pair
    keyPair = await generateSSHKeyPair(TEST_SSH_KEY_NAME);

    // Upload SSH key to Hetzner
    const sshKey = await hetzner.ssh_keys.create({
      name: TEST_SSH_KEY_NAME,
      public_key: keyPair.publicKey,
    });
    sshKeyId = sshKey.id;

    // Create test server with SSH key
    // ARM servers (cpx11) are only available in specific locations
    const server = await hetzner.servers.createAndWait({
      name: TEST_SERVER_NAME,
      server_type: "cpx11", // ARM cloud server
      image: "ubuntu-24.04",
      location: "hil", // Hillsboro, Oregon - supports ARM servers
      ssh_keys: [sshKeyId],
    });

    serverId = server.id;
    serverIP = server.public_net.ipv4.ip;

    // Wait a bit for server to be fully ready for SSH connections
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Test initial SSH connection with retries
    let connected = false;
    for (let i = 0; i < 10; i++) {
      console.log(`[Test] SSH connection attempt ${i + 1}/10 to ${serverIP}`);
      connected = await testSSHConnection({
        host: serverIP,
        user: "root",
        ...(keyPair.privateKeyPath && { keyPath: keyPair.privateKeyPath }),
        timeout: 30,
      });
      if (connected) {
        console.log(`[Test] SSH connection successful on attempt ${i + 1}`);
        break;
      }
      // Wait 10 seconds before retry
      await new Promise(resolve => setTimeout(resolve, 10000));
    }

    expect(connected).toBe(true);
  }, {
    // Increase timeout for server creation (can take 60+ seconds)
    timeout: 120000 // 2 minutes
  });

  afterAll(async () => {
    if (skipTests) return;

    // Close all SSH connections
    await closeGlobalSSHPool();

    // Only clean up if we created the server (not using existing dev-server)
    if (serverId && !serverId.toString().startsWith("116")) { // dev-server ID starts with 116
      try {
        await hetzner.servers.delete(serverId);
        // Wait for server deletion
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.warn("Failed to delete test server:", error);
      }
    }

    // Delete SSH key from Hetzner if we created one
    if (sshKeyId) {
      try {
        await hetzner.ssh_keys.delete(sshKeyId);
      } catch (error) {
        console.warn("Failed to delete SSH key:", error);
      }
    }

    // Clean up local key files
    if (keyPair?.privateKeyPath) {
      await cleanupSSHKeyPair(keyPair.privateKeyPath);
    }
  }, {
    timeout: 30000 // 30 seconds for cleanup
  });

  test.skipIf(skipTests)("should execute command on live server", async () => {
    console.log(`[Test] SSH key path: ${keyPair.privateKeyPath}`);
    const sshOptions: SSHOptions = {
      host: serverIP,
      user: "root",
      timeout: 10,
      ...(keyPair.privateKeyPath && { keyPath: keyPair.privateKeyPath }),
    };

    const result = await execSSH("hostname", sshOptions);
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  test.skipIf(skipTests)("should reuse connection for multiple commands", async () => {
    const sshOptions: SSHOptions = {
      host: serverIP,
      user: "root",
      ...(keyPair.privateKeyPath && { keyPath: keyPair.privateKeyPath }),
      timeout: 10,
    };

    // Get initial pool stats (may have connections from previous tests)
    const pool = getSSHPool();
    const initialCount = pool.getStats().totalConnections;
    console.log(`[Test] Initial connection count: ${initialCount}`);

    // Execute first command
    await execSSH("echo 'first'", sshOptions);
    let stats = pool.getStats();
    expect(stats.totalConnections).toBeGreaterThanOrEqual(initialCount);

    // Execute second command - should reuse connection
    await execSSH("echo 'second'", sshOptions);
    stats = pool.getStats();
    // Connection count should not have increased (connection was reused)
    expect(stats.totalConnections).toBeGreaterThanOrEqual(initialCount);
    expect(stats.totalConnections).toBeLessThanOrEqual(initialCount + 1);
  });

  test.skipIf(skipTests)("should handle multiple concurrent connections", async () => {
    const sshOptions: SSHOptions = {
      host: serverIP,
      user: "root",
      ...(keyPair.privateKeyPath && { keyPath: keyPair.privateKeyPath }),
      timeout: 10,
    };

    // Execute multiple commands concurrently
    const commands = Array.from({ length: 5 }, (_, i) =>
      execSSH(`echo 'concurrent-${i}'`, sshOptions)
    );

    const results = await Promise.all(commands);
    expect(results).toHaveLength(5);
    expect(results.every(r => r.includes("concurrent-"))).toBe(true);
  });

  test.skipIf(skipTests)("should get pool stats correctly", async () => {
    const sshOptions: SSHOptions = {
      host: serverIP,
      user: "root",
      ...(keyPair.privateKeyPath && { keyPath: keyPair.privateKeyPath }),
      timeout: 10,
    };

    const pool = getSSHPool();

    // Get initial stats (may have connections from previous tests)
    const initialStats = pool.getStats();
    console.log(`[Test] Initial pool stats: ${initialStats.totalConnections} connections`);

    // After connection
    await execSSH("whoami", sshOptions);
    const stats = pool.getStats();
    expect(stats.totalConnections).toBeGreaterThanOrEqual(1);
    expect(stats.connections).not.toHaveLength(0);

    // Find the connection for our server
    const serverConnection = stats.connections.find(c => c.host === serverIP);
    expect(serverConnection).toBeDefined();
  });

  test.skipIf(skipTests)("should close specific connection", async () => {
    const sshOptions: SSHOptions = {
      host: serverIP,
      user: "root",
      ...(keyPair.privateKeyPath && { keyPath: keyPair.privateKeyPath }),
      timeout: 10,
    };

    const pool = getSSHPool();

    // Get initial count
    const initialCount = pool.getStats().totalConnections;

    // Create connection if needed
    if (initialCount === 0) {
      await execSSH("echo 'test'", sshOptions);
    }

    const afterCreateCount = pool.getStats().totalConnections;
    expect(afterCreateCount).toBeGreaterThan(0);

    // Close specific connection
    await pool.closeConnection(sshOptions);
    expect(pool.getStats().totalConnections).toBeLessThan(afterCreateCount);
  });

  test.skipIf(skipTests)("should verify connection before reuse", async () => {
    const sshOptions: SSHOptions = {
      host: serverIP,
      user: "root",
      ...(keyPair.privateKeyPath && { keyPath: keyPair.privateKeyPath }),
      timeout: 10,
    };

    const pool = getSSHPool();

    // First connection
    await execSSH("echo 'first'", sshOptions);
    const stats1 = pool.getStats();
    expect(stats1.totalConnections).toBe(1);

    // Wait a bit, then use again - should verify and reuse
    await new Promise(resolve => setTimeout(resolve, 1000));
    await execSSH("echo 'second'", sshOptions);

    const stats2 = pool.getStats();
    expect(stats2.totalConnections).toBe(1); // Still 1, was reused
  });

  test.skipIf(skipTests)("should handle parallel SSH commands efficiently", async () => {
    const sshOptions: SSHOptions = {
      host: serverIP,
      user: "root",
      ...(keyPair.privateKeyPath && { keyPath: keyPair.privateKeyPath }),
      timeout: 15,
    };

    const pool = getSSHPool();

    // Execute 10 commands in parallel
    const commands = Array.from({ length: 10 }, (_, i) =>
      execSSH(`sleep 0.1 && echo "parallel-${i}"`, sshOptions)
    );

    const startTime = Date.now();
    await Promise.all(commands);
    const duration = Date.now() - startTime;

    // With connection pooling, parallel commands should be relatively fast
    // If each created a new connection, it would be much slower
    expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds

    // Should have only 1 connection in pool (all reused)
    const stats = pool.getStats();
    expect(stats.totalConnections).toBe(1);
  });

  test.skipIf(skipTests)("should test SSH connection health", async () => {
    const sshOptions: SSHOptions = {
      host: serverIP,
      user: "root",
      ...(keyPair.privateKeyPath && { keyPath: keyPair.privateKeyPath }),
      timeout: 10,
    };

    // Test connection
    const isHealthy = await testSSHConnection(sshOptions);
    expect(isHealthy).toBe(true);
  });
});
