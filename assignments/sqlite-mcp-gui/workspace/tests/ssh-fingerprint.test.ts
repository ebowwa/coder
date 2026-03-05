/**
 * Tests for ssh/fingerprint.ts Bun.$ and Bun.spawn migration
 * Validates that the exec → Bun shell migration preserves behavior
 */

import { test, expect, describe } from "bun:test";
import { getLocalKeyFingerprint, testSSHKeyConnection, normalizeFingerprint } from "../src/lib/ssh/fingerprint.js";
import path from "node:path";

const SSH_KEYS_DIR = path.resolve(import.meta.dir, "../../.ssh-keys");
const PRIVATE_KEY = path.join(SSH_KEYS_DIR, "hetzner-codespaces-default");
const PUBLIC_KEY = path.join(SSH_KEYS_DIR, "hetzner-codespaces-default.pub");

describe("getLocalKeyFingerprint", () => {
  test("returns SHA256 fingerprint for a valid private key", async () => {
    const fp = await getLocalKeyFingerprint(PRIVATE_KEY);
    expect(fp).not.toBeNull();
    // SHA256 fingerprints are base64-encoded, typically 43 chars
    expect(fp!.length).toBeGreaterThan(20);
    // Should not contain the "SHA256:" prefix — just the hash
    expect(fp!.startsWith("SHA256:")).toBe(false);
  });

  test("returns consistent fingerprint across calls", async () => {
    const fp1 = await getLocalKeyFingerprint(PRIVATE_KEY);
    const fp2 = await getLocalKeyFingerprint(PRIVATE_KEY);
    expect(fp1).toBe(fp2);
  });

  test("returns null for nonexistent key", async () => {
    const fp = await getLocalKeyFingerprint("/nonexistent/path/key");
    expect(fp).toBeNull();
  });

  test("handles paths with spaces", async () => {
    // Create a temp dir with spaces to test Bun.$ escaping
    const tmpDir = path.join(import.meta.dir, "tmp key dir");
    await Bun.$`mkdir -p ${tmpDir}`.quiet();
    await Bun.$`cp ${PRIVATE_KEY} ${path.join(tmpDir, "test key")}`.quiet();

    try {
      const fp = await getLocalKeyFingerprint(path.join(tmpDir, "test key"));
      expect(fp).not.toBeNull();

      // Should match the original key's fingerprint
      const originalFp = await getLocalKeyFingerprint(PRIVATE_KEY);
      expect(fp).toBe(originalFp);
    } finally {
      await Bun.$`rm -rf ${tmpDir}`.quiet();
    }
  });
});

describe("Bun.$ echo pipe pattern", () => {
  test("public key pipes intact through echo to ssh-keygen", async () => {
    // Read the public key file
    const pubKeyContent = await Bun.file(PUBLIC_KEY).text();
    const line = pubKeyContent.trim();

    // This is the exact pattern used in getLocalKeyFingerprint fallback
    const result = await Bun.$`echo ${line} | ssh-keygen -lf -`.quiet().nothrow();
    const stdout = result.stdout.toString();

    expect(result.exitCode).toBe(0);
    expect(stdout).toContain("SHA256:");
    expect(stdout).toContain("ED25519");
  });

  test("key with special characters in comment pipes correctly", async () => {
    // Simulate a key line with special chars in the comment field
    const pubKeyContent = await Bun.file(PUBLIC_KEY).text();
    const parts = pubKeyContent.trim().split(" ");
    // Replace comment with something containing special chars
    const testLine = `${parts[0]} ${parts[1]} user@host (test)`;

    const result = await Bun.$`echo ${testLine} | ssh-keygen -lf -`.quiet().nothrow();
    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain("SHA256:");
  });
});

describe("testSSHKeyConnection", () => {
  test("returns false for unreachable host (timeout works)", { timeout: 15000 }, async () => {
    // 192.0.2.1 is TEST-NET — guaranteed unroutable, will timeout
    const start = Date.now();
    const result = await testSSHKeyConnection("192.0.2.1", PRIVATE_KEY);
    const elapsed = Date.now() - start;

    expect(result).toBe(false);
    // Should timeout within ~10s (ConnectTimeout=5 + Bun.spawn timeout=10000)
    // Give some slack for process overhead
    expect(elapsed).toBeLessThan(15000);
  });

  test("returns false for invalid key path", async () => {
    const result = await testSSHKeyConnection("localhost", "/nonexistent/key");
    expect(result).toBe(false);
  });
});

describe("normalizeFingerprint", () => {
  test("strips colons from MD5 format", () => {
    expect(normalizeFingerprint("29:cd:c1:c3:84:eb:ca:31"))
      .toBe("29cdc1c384ebca31");
  });

  test("lowercases the result", () => {
    expect(normalizeFingerprint("AB:CD:EF"))
      .toBe("abcdef");
  });

  test("passes through SHA256 format unchanged (no colons)", () => {
    expect(normalizeFingerprint("7o4onbo4wsgqjnhonogvvte0vscea6z053popfu5fv8"))
      .toBe("7o4onbo4wsgqjnhonogvvte0vscea6z053popfu5fv8");
  });
});
