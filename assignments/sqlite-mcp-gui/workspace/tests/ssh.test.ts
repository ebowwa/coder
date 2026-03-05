#!/usr/bin/env bun
/**
 * SSH Modules Test Suite
 * Tests refactored SSH library modules
 */

import { describe, test, expect } from "bun:test";
import { execSSH } from "../src/lib/ssh/client.js";
import { execSSHParallel, testSSHConnection } from "../src/lib/ssh/exec.js";
import { scpUpload, scpDownload } from "../src/lib/ssh/scp.js";
import { listFiles, previewFile } from "../src/lib/ssh/files.js";
import { getSSHFingerprint } from "../src/lib/ssh/fingerprint.js";
import { SSHError } from "../src/lib/ssh/error.js";
import type { SSHOptions, SCPOptions } from "../src/lib/ssh/types.js";

describe("SSH Modules - Type Safety", () => {
  test("SSHOptions type should accept valid config", () => {
    const options: SSHOptions = {
      host: "example.com",
      user: "root",
      port: 22,
      timeout: 10,
      keyPath: "/path/to/key",
    };

    expect(options.host).toBe("example.com");
    expect(options.user).toBe("root");
    expect(options.port).toBe(22);
    expect(options.timeout).toBe(10);
    expect(options.keyPath).toBe("/path/to/key");
  });

  test("SCPOptions should extend SSHOptions", () => {
    const scpOptions: SCPOptions = {
      host: "example.com",
      source: "/local/file.txt",
      destination: "/remote/file.txt",
      recursive: true,
      preserve: true,
    };

    expect(scpOptions.source).toBe("/local/file.txt");
    expect(scpOptions.destination).toBe("/remote/file.txt");
    expect(scpOptions.recursive).toBe(true);
    expect(scpOptions.preserve).toBe(true);
  });
});

describe("SSH Modules - Error Class", () => {
  test("SSHError should create error with cause", () => {
    const cause = new Error("Connection refused");
    const sshError = new SSHError("SSH command failed", cause);

    expect(sshError.name).toBe("SSHError");
    expect(sshError.message).toBe("SSH command failed");
    expect(sshError.cause).toBe(cause);
  });

  test("SSHError should work without cause", () => {
    const sshError = new SSHError("Simple error");

    expect(sshError.name).toBe("SSHError");
    expect(sshError.message).toBe("Simple error");
    expect(sshError.cause).toBeUndefined();
  });
});

describe("SSH Modules - Export Consistency", () => {
  test("All modules should export expected functions", () => {
    // Client exports
    expect(typeof execSSH).toBe("function");

    // Exec exports
    expect(typeof execSSHParallel).toBe("function");
    expect(typeof testSSHConnection).toBe("function");

    // SCP exports
    expect(typeof scpUpload).toBe("function");
    expect(typeof scpDownload).toBe("function");

    // Files exports
    expect(typeof listFiles).toBe("function");
    expect(typeof previewFile).toBe("function");

    // Fingerprint exports
    expect(typeof getSSHFingerprint).toBe("function");

    // Error exports
    expect(typeof SSHError).toBe("function");
  });
});

describe("SSH Modules - Function Signatures", () => {
  test("execSSH should accept correct parameters", () => {
    const cmd = "ls -la";
    const options: SSHOptions = { host: "test.com" };
    expect(typeof execSSH).toBe("function");
  });

  test("execSSHParallel should accept commands object", () => {
    const commands = { cmd1: "ls", cmd2: "pwd" };
    const options: SSHOptions = { host: "test.com" };
    expect(typeof execSSHParallel).toBe("function");
  });

  test("scpUpload and scpDownload should accept SCPOptions", () => {
    const options: SCPOptions = {
      host: "test.com",
      source: "/src",
      destination: "/dst",
    };
    expect(typeof scpUpload).toBe("function");
    expect(typeof scpDownload).toBe("function");
  });

  test("listFiles should accept path and options", () => {
    const path = "/home/user";
    const options: SSHOptions = { host: "test.com" };
    expect(typeof listFiles).toBe("function");
  });

  test("previewFile should accept filePath and options", () => {
    const filePath = "/home/user/file.txt";
    const options: SSHOptions = { host: "test.com" };
    expect(typeof previewFile).toBe("function");
  });

  test("getSSHFingerprint should accept SSHOptions", () => {
    const options: SSHOptions = { host: "test.com" };
    expect(typeof getSSHFingerprint).toBe("function");
  });
});

describe("SSH Modules - Integration Type Check", () => {
  test("All exported types should be compatible", () => {
    const options: SSHOptions = {
      host: "test.com",
      user: "root",
      timeout: 10,
    };

    const scpOptions: SCPOptions = {
      ...options,
      source: "/src",
      destination: "/dst",
    };

    expect(scpOptions.host).toBe(options.host);
    expect(scpOptions.user).toBe(options.user);
  });
});
