#!/usr/bin/env bun
/**
 * Generate Bootstrap YAML
 *
 * Simple script to generate and review the cloud-init bootstrap YAML
 * without creating any servers.
 */

import { generateSeedBootstrap } from "../app/backend/shared/lib/bootstrap/cloud-init.js";

const bootstrapYaml = generateSeedBootstrap({
  seedRepo: "https://github.com/ebowwa/seed",
  seedBranch: "Bun-port",
  seedPath: "/root/seed",
  runSetup: true,
});

console.log(bootstrapYaml);
