#!/usr/bin/env bun

/**
 * Simple script to check what the API returns for environments
 * This will help us debug why image is showing as "Unknown"
 */

import { getEnvRegionName } from "../../../packages/src/types";

const API_BASE = "http://localhost:3000";

async function checkAPI() {
  console.log("\n" + "=".repeat(60));
  console.log("Checking API Response for Environments");
  console.log("=".repeat(60) + "\n");

  try {
    console.log(`Fetching from: ${API_BASE}/api/environments\n`);

    const response = await fetch(`${API_BASE}/api/environments`);
    console.log(`Response status: ${response.status} ${response.statusText}\n`);

    const data = await response.json();

    if (!data.success) {
      console.log("❌ API returned failure");
      console.log("Error:", data.error);
      return;
    }

    console.log("✅ API returned success\n");

    if (!data.environments || data.environments.length === 0) {
      console.log("⚠️  No environments found");
      return;
    }

    console.log(`Found ${data.environments.length} environment(s)\n`);

    // Show details for each environment
    data.environments.forEach((env: any, index: number) => {
      console.log("-".repeat(60));
      console.log(`Environment #${index + 1}: ${env.name}`);
      console.log("-".repeat(60));
      console.log(`  ID: ${env.id}`);
      console.log(`  Status: ${env.status}`);
      console.log(`  Server Type: ${env.serverType}`);
      console.log(`  Region: ${getEnvRegionName(env)}`);
      console.log(`  IPv4: ${env.ipv4 || 'N/A'}`);
      console.log(`  IPv6: ${env.ipv6 || 'N/A'}`);

      // Focus on the image field
      console.log(`\n  📦 IMAGE DATA:`);
      console.log(`    - Has 'image' field: ${'image' in env}`);
      console.log(`    - Image value: ${env.image}`);
      console.log(`    - Type of image: ${typeof env.image}`);
      console.log(`    - Is undefined: ${env.image === undefined}`);
      console.log(`    - Is null: ${env.image === null}`);

      if (typeof env.image === "string") {
        console.log(`    ❌ ERROR: Image is a string (old format)`);
        console.log(`       Value: "${env.image}"`);
      } else if (env.image && typeof env.image === "object") {
        console.log(`    ✅ Image is an object`);
        console.log(`       - id: ${env.image.id}`);
        console.log(`       - name: ${env.image.name}`);
        console.log(`       - description: ${env.image.description}`);
        console.log(`       - type: ${env.image.type}`);
      } else {
        console.log(`    ❌ ERROR: Image is ${env.image === null ? 'null' : 'undefined'}`);
      }

      console.log("");
    });

    console.log("=".repeat(60));
    console.log("SUMMARY");
    console.log("=".repeat(60));

    const stringImages = data.environments.filter((env: any) => typeof env.image === "string").length;
    const objectImages = data.environments.filter((env: any) => typeof env.image === "object" && env.image !== null).length;
    const undefinedImages = data.environments.filter((env: any) => !env.image).length;

    console.log(`Total environments: ${data.environments.length}`);
    console.log(`  - Image as string (old format): ${stringImages}`);
    console.log(`  - Image as object (new format): ${objectImages}`);
    console.log(`  - Image undefined/null: ${undefinedImages}`);

    if (stringImages > 0 || undefinedImages > 0) {
      console.log("\n❌ PROBLEM DETECTED:");
      if (stringImages > 0) {
        console.log(`   - ${stringImages} environment(s) have old string format`);
      }
      if (undefinedImages > 0) {
        console.log(`   - ${undefinedImages} environment(s) have undefined/null image`);
      }
      console.log("\nThis explains why the frontend shows 'Unknown'!");
    } else if (objectImages === data.environments.length) {
      console.log("\n✅ SUCCESS: All environments have the correct object format");
    }

  } catch (error) {
    console.error("\n❌ ERROR:", error);
    console.log("\nMake sure the backend server is running:");
    console.log("  bun run server");
  }
}

// Run the check
checkAPI();
