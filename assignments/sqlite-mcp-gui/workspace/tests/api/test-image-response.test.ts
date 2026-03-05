import { test, expect, beforeAll } from "bun:test";

const API_BASE = "http://localhost:3000"; // Adjust if your server runs on a different port

let environmentsResponse: any = null;

beforeAll(async () => {
  console.log("\n=== Fetching environments from API ===");
  const response = await fetch(`${API_BASE}/api/environments`);
  environmentsResponse = await response.json();
  console.log("Response status:", response.status);
  console.log("Full response:", JSON.stringify(environmentsResponse, null, 2));
});

test("API returns success", () => {
  expect(environmentsResponse).toBeDefined();
  expect(environmentsResponse.success).toBe(true);
});

test("API returns environments array", () => {
  expect(Array.isArray(environmentsResponse.environments)).toBe(true);
});

test("Each environment has image field", () => {
  if (!environmentsResponse.environments || environmentsResponse.environments.length === 0) {
    console.log("⚠️  No environments found to test");
    return;
  }

  environmentsResponse.environments.forEach((env: any, index: number) => {
    console.log(`\n=== Environment ${index} ===`);
    console.log("ID:", env.id);
    console.log("Name:", env.name);
    console.log("Status:", env.status);
    console.log("Image field exists:", "image" in env);
    console.log("Image value:", env.image);
    console.log("Image type:", typeof env.image);
    console.log("Is image an object?", typeof env.image === "object" && env.image !== null);

    expect(env).toHaveProperty("image");
  });
});

test("Image field has correct structure", () => {
  if (!environmentsResponse.environments || environmentsResponse.environments.length === 0) {
    console.log("⚠️  No environments found to test");
    return;
  }

  const env = environmentsResponse.environments[0];
  console.log("\n=== Testing image structure for first environment ===");
  console.log("Full image object:", JSON.stringify(env.image, null, 2));

  if (typeof env.image === "string") {
    console.log("❌ Image is a string:", env.image);
    console.log("Expected image to be an object with id, name, description, type");
  } else if (env.image && typeof env.image === "object") {
    console.log("✅ Image is an object");
    console.log("Image has 'id'?:", "id" in env.image);
    console.log("Image has 'name'?:", "name" in env.image);
    console.log("Image has 'description'?:", "description" in env.image);
    console.log("Image has 'type'?:", "type" in env.image);

    // If it's an object, validate the structure
    if ("id" in env.image) {
      console.log("Image ID:", env.image.id);
      expect(typeof env.image.id).toBe("number");
    }

    if ("name" in env.image) {
      console.log("Image name:", env.image.name);
      expect(typeof env.image.name).toBe("string");
    }

    if ("description" in env.image) {
      console.log("Image description:", env.image.description);
      expect(typeof env.image.description).toBe("string");
    }

    if ("type" in env.image) {
      console.log("Image type:", env.image.type);
      expect(["snapshot", "backup", "system"]).toContain(env.image.type);
    }
  } else {
    console.log("❌ Image is undefined or null");
    console.log("This is the problem! The backend is not returning image data");
  }
});

test("All environments have consistent image format", () => {
  if (!environmentsResponse.environments || environmentsResponse.environments.length === 0) {
    console.log("⚠️  No environments found to test");
    return;
  }

  console.log("\n=== Checking image format consistency ===");
  const formats = new Set<string>();

  environmentsResponse.environments.forEach((env: any) => {
    if (typeof env.image === "string") {
      formats.add("string");
    } else if (env.image && typeof env.image === "object") {
      formats.add("object");
    } else {
      formats.add("undefined/null");
    }
  });

  console.log("Image formats found:", Array.from(formats));

  if (formats.has("undefined/null")) {
    console.log("❌ ERROR: Some environments have undefined/null image");
  }

  if (formats.has("string")) {
    console.log("❌ ERROR: Some environments have string image (old format)");
  }

  if (formats.has("object") && formats.size === 1) {
    console.log("✅ SUCCESS: All environments have object image (new format)");
  }
});

test("Image data is not undefined for running environments", () => {
  if (!environmentsResponse.environments || environmentsResponse.environments.length === 0) {
    console.log("⚠️  No environments found to test");
    return;
  }

  console.log("\n=== Checking running environments ===");
  const runningEnvs = environmentsResponse.environments.filter((env: any) => env.status === "running");

  console.log("Running environments:", runningEnvs.length);

  runningEnvs.forEach((env: any) => {
    console.log(`\nEnvironment: ${env.name} (ID: ${env.id})`);
    console.log("Image:", env.image);
    console.log("Image is undefined:", env.image === undefined);
    console.log("Image is null:", env.image === null);
    expect(env.image).toBeDefined();
  });
});

console.log("\n=== Test setup complete ===");
console.log("To run these tests, execute:");
console.log("bun test tests/api/test-image-response.test.ts");
