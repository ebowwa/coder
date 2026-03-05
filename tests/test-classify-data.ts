#!/usr/bin/env bun
/**
 * Test script for cognitive security classifyData function
 */

import { classifyData } from "../packages/src/core/cognitive-security/index.js";

async function testClassifyData() {
  console.log("Testing classifyData function with 'api_key=secret'\n");

  const testContent = "api_key=secret";
  const source = "test_input";
  const tags = ["test", "security"];

  try {
    const result = await classifyData(testContent, source, tags);

    console.log("Classification Result:");
    console.log(JSON.stringify(result, null, 2));

    console.log("\n--- Breakdown ---");
    console.log("ID:", result.id);
    console.log("Sensitivity:", result.sensitivity);
    console.log("Category:", result.category);
    console.log("Source:", result.source);
    console.log("Tags:", result.tags);
    console.log("Can Log:", result.can_log);
    console.log("Can Transmit:", result.can_transmit);
    console.log("Can Store:", result.can_store);
    console.log("Created At:", result.created_at);
    console.log("Expires At:", result.expires_at);

  } catch (error) {
    console.error("Error during classification:", error);
    process.exit(1);
  }
}

testClassifyData();
