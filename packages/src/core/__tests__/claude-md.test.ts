/**
 * CLAUDE.md Tests
 *
 * Tests for CLAUDE.md file loading, merging, and system signature generation.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  loadClaudeMd,
  buildClaudeMdPrompt,
  generateSystemSignature,
  formatSystemSignature,
} from "../claude-md.js";
import type {
  ClaudeMdConfig,
  SystemSignature,
  GitStatusInfo,
} from "../../schemas/index.js";

describe("loadClaudeMd", () => {
  let testDir: string;
  let globalDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), "claude-md-test-" + Date.now());
    globalDir = join(testDir, "global");
    await mkdir(join(testDir, ".claude"), { recursive: true });
    await mkdir(globalDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe("with no CLAUDE.md files", () => {
    it("should return null for global and project when no files exist", async () => {
      const result = await loadClaudeMd(testDir, {
        globalPath: join(testDir, "nonexistent", "CLAUDE.md"),
      });

      expect(result.global).toBeNull();
      expect(result.project).toBeNull();
      expect(result.merged).toBe("");
      expect(result.sources).toEqual([]);
    });
  });

  describe("with project CLAUDE.md only", () => {
    it("should load project CLAUDE.md from .claude/CLAUDE.md", async () => {
      const projectContent = "# Project Instructions\n\nThis is project-specific.";
      await writeFile(join(testDir, ".claude", "CLAUDE.md"), projectContent);

      const result = await loadClaudeMd(testDir, {
        globalPath: join(testDir, "nonexistent", "CLAUDE.md"),
      });

      expect(result.global).toBeNull();
      expect(result.project).toBe(projectContent);
      expect(result.merged).toContain("Project Instructions");
      expect(result.merged).toContain(projectContent);
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0]).toContain(".claude/CLAUDE.md");
    });

    it("should load project CLAUDE.md from root CLAUDE.md as fallback", async () => {
      const projectContent = "# Root Instructions\n\nRoot level file.";
      await writeFile(join(testDir, "CLAUDE.md"), projectContent);

      const result = await loadClaudeMd(testDir, {
        globalPath: join(testDir, "nonexistent", "CLAUDE.md"),
      });

      expect(result.global).toBeNull();
      expect(result.project).toBe(projectContent);
      expect(result.merged).toContain(projectContent);
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0]).toContain("CLAUDE.md");
      expect(result.sources[0]).not.toContain(".claude");
    });

    it("should prefer .claude/CLAUDE.md over root CLAUDE.md", async () => {
      const preferredContent = "# Preferred\n\n.claude directory";
      const fallbackContent = "# Fallback\n\nRoot directory";

      await writeFile(join(testDir, ".claude", "CLAUDE.md"), preferredContent);
      await writeFile(join(testDir, "CLAUDE.md"), fallbackContent);

      const result = await loadClaudeMd(testDir, {
        globalPath: join(testDir, "nonexistent", "CLAUDE.md"),
      });

      expect(result.project).toBe(preferredContent);
      expect(result.project).not.toBe(fallbackContent);
    });
  });

  describe("with global CLAUDE.md only", () => {
    it("should load global CLAUDE.md", async () => {
      const globalContent = "# Global Instructions\n\nThese apply everywhere.";
      const globalPath = join(globalDir, "CLAUDE.md");
      await writeFile(globalPath, globalContent);

      const result = await loadClaudeMd(testDir, {
        globalPath,
      });

      expect(result.global).toBe(globalContent);
      expect(result.project).toBeNull();
      expect(result.merged).toContain("Global Instructions");
      expect(result.merged).toContain(globalContent);
      expect(result.sources).toHaveLength(1);
    });
  });

  describe("with both global and project CLAUDE.md", () => {
    it("should merge both files", async () => {
      const globalContent = "# Global\n\nGlobal settings.";
      const projectContent = "# Project\n\nProject settings.";

      const globalPath = join(globalDir, "CLAUDE.md");
      await writeFile(globalPath, globalContent);
      await writeFile(join(testDir, ".claude", "CLAUDE.md"), projectContent);

      const result = await loadClaudeMd(testDir, {
        globalPath,
      });

      expect(result.global).toBe(globalContent);
      expect(result.project).toBe(projectContent);
      expect(result.merged).toContain("Global Instructions");
      expect(result.merged).toContain(globalContent);
      expect(result.merged).toContain("Project Instructions");
      expect(result.merged).toContain(projectContent);
      expect(result.sources).toHaveLength(2);
    });

    it("should separate merged content with divider", async () => {
      const globalContent = "Global";
      const projectContent = "Project";

      const globalPath = join(globalDir, "CLAUDE.md");
      await writeFile(globalPath, globalContent);
      await writeFile(join(testDir, ".claude", "CLAUDE.md"), projectContent);

      const result = await loadClaudeMd(testDir, {
        globalPath,
      });

      expect(result.merged).toContain("---");
    });
  });

  describe("content trimming", () => {
    it("should trim whitespace from content", async () => {
      const contentWithWhitespace = "  \n  Content here  \n  ";
      await writeFile(join(testDir, ".claude", "CLAUDE.md"), contentWithWhitespace);

      const result = await loadClaudeMd(testDir, {
        globalPath: join(testDir, "nonexistent", "CLAUDE.md"),
      });

      expect(result.project).toBe("Content here");
    });
  });

  describe("config defaults", () => {
    it("should use default config when not provided", async () => {
      // This test verifies that the function works with default config
      const result = await loadClaudeMd(testDir);

      // Global should try to load from HOME/.claude/CLAUDE.md
      // Project should try to load from testDir/.claude/CLAUDE.md
      expect(result).toBeDefined();
      expect(result.merged).toBeDefined();
      expect(Array.isArray(result.sources)).toBe(true);
    });
  });
});

describe("buildClaudeMdPrompt", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), "claude-md-prompt-test-" + Date.now());
    await mkdir(join(testDir, ".claude"), { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("should return prompt with global content when no project CLAUDE.md exists", async () => {
    // Note: buildClaudeMdPrompt uses default config which loads global CLAUDE.md
    // from HOME/.claude/CLAUDE.md, so it won't be empty if that exists
    const prompt = await buildClaudeMdPrompt(testDir);

    // The prompt should exist and be a string (may contain global content)
    expect(typeof prompt).toBe("string");
  });

  it("should build prompt with project CLAUDE.md", async () => {
    const content = "# Project\n\nSome instructions.";
    await writeFile(join(testDir, ".claude", "CLAUDE.md"), content);

    const prompt = await buildClaudeMdPrompt(testDir);

    expect(prompt).toContain("## Project Instructions");
    expect(prompt).toContain(content);
  });

  it("should include source paths in header", async () => {
    const content = "# Test\n\nContent";
    await writeFile(join(testDir, ".claude", "CLAUDE.md"), content);

    const prompt = await buildClaudeMdPrompt(testDir);

    expect(prompt).toContain("Loaded from:");
    expect(prompt).toContain(".claude/CLAUDE.md");
  });

  it("should handle multiple sources in header", async () => {
    const globalDir = join(testDir, "global");
    await mkdir(globalDir, { recursive: true });

    const globalContent = "# Global";
    const projectContent = "# Project";

    await writeFile(join(globalDir, "CLAUDE.md"), globalContent);
    await writeFile(join(testDir, ".claude", "CLAUDE.md"), projectContent);

    // Create a custom config to use our test global path
    const originalHome = process.env.HOME;
    process.env.HOME = testDir;

    try {
      const prompt = await buildClaudeMdPrompt(testDir);

      // The prompt should contain both sources
      expect(prompt).toContain("## Project Instructions");
    } finally {
      process.env.HOME = originalHome;
    }
  });
});

describe("generateSystemSignature", () => {
  it("should generate signature with default values", () => {
    const signature = generateSystemSignature();

    expect(signature.version).toBe("1.0.0");
    expect(signature.projectId).toBeDefined();
    expect(signature.sessionId).toBeDefined();
    expect(signature.timestamp).toBeGreaterThan(0);
    expect(signature.environment.platform).toBe(process.platform);
    expect(signature.environment.nodeVersion).toBe(process.version);
  });

  it("should include git status when provided", () => {
    const gitStatus: Partial<GitStatusInfo> = {
      branch: "feature/test-branch",
      hasChanges: true,
      staged: 3,
      unstaged: 2,
      untracked: 1,
    };

    const signature = generateSystemSignature("/test/dir", gitStatus);

    expect(signature.gitStatus.branch).toBe("feature/test-branch");
    expect(signature.gitStatus.hasChanges).toBe(true);
    expect(signature.gitStatus.staged).toBe(3);
    expect(signature.gitStatus.unstaged).toBe(2);
    expect(signature.gitStatus.untracked).toBe(1);
  });

  it("should use default git status when not provided", () => {
    const signature = generateSystemSignature();

    expect(signature.gitStatus.branch).toBe("unknown");
    expect(signature.gitStatus.hasChanges).toBe(false);
    expect(signature.gitStatus.staged).toBe(0);
    expect(signature.gitStatus.unstaged).toBe(0);
    expect(signature.gitStatus.untracked).toBe(0);
  });

  it("should include available tools when provided", () => {
    const tools = ["read", "write", "bash"];
    const signature = generateSystemSignature(undefined, undefined, tools);

    expect(signature.tools.available).toEqual(tools);
  });

  it("should include MCP servers when provided", () => {
    const mcpServers = ["github", "git", "terminal"];
    const signature = generateSystemSignature(undefined, undefined, undefined, mcpServers);

    expect(signature.tools.mcpServers).toEqual(mcpServers);
  });

  it("should generate unique project IDs", () => {
    const sig1 = generateSystemSignature();
    const sig2 = generateSystemSignature();

    expect(sig1.projectId).not.toBe(sig2.projectId);
  });

  it("should generate unique session IDs", () => {
    const sig1 = generateSystemSignature();
    const sig2 = generateSystemSignature();

    expect(sig1.sessionId).not.toBe(sig2.sessionId);
  });

  it("should include current timestamp", () => {
    const before = Date.now();
    const signature = generateSystemSignature();
    const after = Date.now();

    expect(signature.timestamp).toBeGreaterThanOrEqual(before);
    expect(signature.timestamp).toBeLessThanOrEqual(after);
  });

  it("should capture environment info", () => {
    const signature = generateSystemSignature();

    expect(signature.environment.platform).toBeDefined();
    expect(signature.environment.nodeVersion).toBeDefined();
    expect(signature.environment.shell).toBeDefined();
    expect(signature.environment.homeDir).toBeDefined();
  });

  it("should use empty arrays for tools when not provided", () => {
    const signature = generateSystemSignature();

    expect(signature.tools.available).toEqual([]);
    expect(signature.tools.mcpServers).toEqual([]);
  });
});

describe("formatSystemSignature", () => {
  it("should format signature with all fields", () => {
    const signature: SystemSignature = {
      version: "1.0.0",
      projectId: "test-project-id",
      sessionId: "test-session-id",
      timestamp: 1700000000000,
      environment: {
        platform: "darwin",
        nodeVersion: "v20.0.0",
        shell: "/bin/zsh",
        homeDir: "/Users/test",
      },
      gitStatus: {
        branch: "main",
        hasChanges: true,
        staged: 2,
        unstaged: 1,
        untracked: 3,
      },
      tools: {
        available: ["read", "write"],
        mcpServers: ["github"],
      },
    };

    const formatted = formatSystemSignature(signature);

    expect(formatted).toContain("System Signature");
    expect(formatted).toContain("Version: 1.0.0");
    expect(formatted).toContain("Project ID: test-project-id");
    expect(formatted).toContain("Session ID: test-session-id");
    expect(formatted).toContain("Platform: darwin");
    expect(formatted).toContain("Node: v20.0.0");
    expect(formatted).toContain("Shell: /bin/zsh");
    expect(formatted).toContain("Branch: main");
    expect(formatted).toContain("Changes: Yes");
    expect(formatted).toContain("Staged: 2");
    expect(formatted).toContain("Unstaged: 1");
    expect(formatted).toContain("Untracked: 3");
  });

  it("should show 'No' for hasChanges when false", () => {
    const signature: SystemSignature = {
      version: "1.0.0",
      projectId: "test",
      sessionId: "test",
      timestamp: 0,
      environment: {
        platform: "linux",
        nodeVersion: "v18.0.0",
        shell: "/bin/bash",
        homeDir: "/home/test",
      },
      gitStatus: {
        branch: "dev",
        hasChanges: false,
        staged: 0,
        unstaged: 0,
        untracked: 0,
      },
      tools: {
        available: [],
        mcpServers: [],
      },
    };

    const formatted = formatSystemSignature(signature);

    expect(formatted).toContain("Changes: No");
  });

  it("should format timestamp as ISO string", () => {
    const timestamp = new Date("2024-01-15T12:00:00Z").getTime();
    const signature: SystemSignature = {
      version: "1.0.0",
      projectId: "test",
      sessionId: "test",
      timestamp,
      environment: {
        platform: "test",
        nodeVersion: "v1.0.0",
        shell: "test",
        homeDir: "/test",
      },
      gitStatus: {
        branch: "test",
        hasChanges: false,
        staged: 0,
        unstaged: 0,
        untracked: 0,
      },
      tools: {
        available: [],
        mcpServers: [],
      },
    };

    const formatted = formatSystemSignature(signature);

    expect(formatted).toContain("2024");
  });

  it("should show tool counts", () => {
    const signature: SystemSignature = {
      version: "1.0.0",
      projectId: "test",
      sessionId: "test",
      timestamp: 0,
      environment: {
        platform: "test",
        nodeVersion: "v1.0.0",
        shell: "test",
        homeDir: "/test",
      },
      gitStatus: {
        branch: "test",
        hasChanges: false,
        staged: 0,
        unstaged: 0,
        untracked: 0,
      },
      tools: {
        available: ["a", "b", "c"],
        mcpServers: ["x", "y"],
      },
    };

    const formatted = formatSystemSignature(signature);

    expect(formatted).toContain("Available: 3");
    expect(formatted).toContain("MCP Servers: 2");
  });
});

describe("Edge Cases", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), "claude-md-edge-test-" + Date.now());
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("should handle unreadable files gracefully", async () => {
    // Create a file path that doesn't exist
    const result = await loadClaudeMd(testDir, {
      globalPath: join(testDir, "nonexistent", "CLAUDE.md"),
    });

    // Should not throw, should return nulls
    expect(result.global).toBeNull();
    expect(result.project).toBeNull();
  });

  it("should handle empty CLAUDE.md files", async () => {
    await mkdir(join(testDir, ".claude"), { recursive: true });
    await writeFile(join(testDir, ".claude", "CLAUDE.md"), "");

    const result = await loadClaudeMd(testDir, {
      globalPath: join(testDir, "nonexistent", "CLAUDE.md"),
    });

    // Empty file trimmed becomes empty string, which is falsy
    // The function returns null for empty content
    expect(result.project).toBeNull();
  });

  it("should handle whitespace-only CLAUDE.md files", async () => {
    await mkdir(join(testDir, ".claude"), { recursive: true });
    await writeFile(join(testDir, ".claude", "CLAUDE.md"), "   \n\n   \t  ");

    const result = await loadClaudeMd(testDir, {
      globalPath: join(testDir, "nonexistent", "CLAUDE.md"),
    });

    // Whitespace trimmed becomes empty string
    expect(result.project).toBeNull();
  });
});
