#!/usr/bin/env bun
/**
 * Hetzner IPv6 Test Suite
 * Tests IPv6 address handling in server responses (integration test - uses real API)
 */

import { describe, test, expect } from "bun:test";
import { HetznerClient } from "../src/lib/hetzner/client.js";

describe("IPv6 Server Data (Integration)", () => {
  test("IPv6 debug test - real API calls", async () => {
    const client = new HetznerClient();
    const servers = await client.listServers();

    expect(servers.length).toBeGreaterThan(0);

    const server = servers[0];
    expect(server.id).toBeDefined();
    expect(server.name).toBeDefined();
    expect(server.public_net).toBeDefined();

    // IPv4 mapping
    expect(server.public_net.ipv4?.ip ?? null).toBeTruthy();

    // IPv6 mapping
    expect(server.public_net.ipv6?.ip ?? null).toBeTruthy();

    // IPv6 exists?
    expect("ipv6" in server.public_net).toBe(true);

    // IPv6 object
    expect(server.public_net.ipv6).toBeDefined();

    // IPv6.ip
    expect(server.public_net.ipv6?.ip).toMatch(/^[0-9a-fA-F:]+\/\d{1,3}$/);
  });
});
