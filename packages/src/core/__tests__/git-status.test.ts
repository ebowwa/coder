/**
 * Git Status Tests
 *
 * Tests for git repository status detection and analysis.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import {
  getGitStatus,
  hasUncommittedChanges,
  isRepositoryClean,
  getGitStatusSummary,
} from "../git-status.js";
import type { GitStatus } from "../schemas/index.js";

describe("Git Status", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join("/tmp", "git-status-test-" + Date.now());
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe("getGitStatus", () => {
    it("should return null for non-git directory", async () => {
      const status = await getGitStatus(testDir);
      expect(status).toBeNull();
    });

    it("should detect git repository", async () => {
      // Initialize a git repo
      await Bun.spawn(["git", "init"], { cwd: testDir }).exited;

      const status = await getGitStatus(testDir);

      expect(status).not.toBeNull();
      expect(status?.branch).toBeDefined();
    });

    it("should detect current branch after initial commit", async () => {
      // Initialize a git repo
      await Bun.spawn(["git", "init"], { cwd: testDir }).exited;

      // Need an initial commit for branch name to be stable
      await Bun.write(join(testDir, "initial.txt"), "initial");
      await Bun.spawn(["git", "add", "initial.txt"], { cwd: testDir }).exited;
      await Bun.spawn(["git", "commit", "-m", "initial"], {
        cwd: testDir,
        env: { ...process.env, GIT_AUTHOR_NAME: "Test", GIT_AUTHOR_EMAIL: "test@test.com" },
      }).exited;

      // Create and checkout a new branch
      await Bun.spawn(["git", "checkout", "-b", "test-branch"], { cwd: testDir }).exited;

      const status = await getGitStatus(testDir);

      expect(status).not.toBeNull();
      expect(status?.branch).toBe("test-branch");
    });

    it("should detect untracked files", async () => {
      // Initialize a git repo
      await Bun.spawn(["git", "init"], { cwd: testDir }).exited;

      // Create an untracked file
      await Bun.write(join(testDir, "untracked.txt"), "content");

      const status = await getGitStatus(testDir);

      expect(status).not.toBeNull();
      expect(status?.untracked.length).toBe(1);
      expect(status?.untracked[0]).toBe("untracked.txt");
    });

    it("should detect staged files", async () => {
      // Initialize a git repo
      await Bun.spawn(["git", "init"], { cwd: testDir }).exited;

      // Create and stage a file
      await Bun.write(join(testDir, "staged.txt"), "content");
      await Bun.spawn(["git", "add", "staged.txt"], { cwd: testDir }).exited;

      const status = await getGitStatus(testDir);

      expect(status).not.toBeNull();
      expect(status?.staged.length).toBe(1);
      expect(status?.staged[0]).toBe("staged.txt");
    });

    it("should detect multiple file states", async () => {
      // Initialize a git repo
      await Bun.spawn(["git", "init"], { cwd: testDir }).exited;

      // Untracked file
      await Bun.write(join(testDir, "new.txt"), "new");

      // Staged file
      await Bun.write(join(testDir, "staged.txt"), "staged");
      await Bun.spawn(["git", "add", "staged.txt"], { cwd: testDir }).exited;

      const status = await getGitStatus(testDir);

      expect(status).not.toBeNull();
      expect(status?.untracked.length).toBe(1);
      expect(status?.staged.length).toBe(1);
    });
  });
});

describe("hasUncommittedChanges", () => {
  it("should return false for clean status", () => {
    const status: GitStatus = {
      branch: "main",
      ahead: 0,
      behind: 0,
      staged: [],
      unstaged: [],
      untracked: [],
      conflicted: [],
      clean: true,
      detached: false,
    };

    expect(hasUncommittedChanges(status)).toBe(false);
  });

  it("should return true for untracked files", () => {
    const status: GitStatus = {
      branch: "main",
      ahead: 0,
      behind: 0,
      staged: [],
      unstaged: [],
      untracked: ["new.txt"],
      conflicted: [],
      clean: false,
      detached: false,
    };

    expect(hasUncommittedChanges(status)).toBe(true);
  });

  it("should return true for staged files", () => {
    const status: GitStatus = {
      branch: "main",
      ahead: 0,
      behind: 0,
      staged: ["staged.txt"],
      unstaged: [],
      untracked: [],
      conflicted: [],
      clean: false,
      detached: false,
    };

    expect(hasUncommittedChanges(status)).toBe(true);
  });

  it("should return true for unstaged changes", () => {
    const status: GitStatus = {
      branch: "main",
      ahead: 0,
      behind: 0,
      staged: [],
      unstaged: ["modified.txt"],
      untracked: [],
      conflicted: [],
      clean: false,
      detached: false,
    };

    expect(hasUncommittedChanges(status)).toBe(true);
  });

  it("should return true for conflicted files", () => {
    const status: GitStatus = {
      branch: "main",
      ahead: 0,
      behind: 0,
      staged: [],
      unstaged: [],
      untracked: [],
      conflicted: ["conflict.txt"],
      clean: false,
      detached: false,
    };

    expect(hasUncommittedChanges(status)).toBe(true);
  });
});

describe("isRepositoryClean", () => {
  it("should return true for clean repository", () => {
    const status: GitStatus = {
      branch: "main",
      ahead: 0,
      behind: 0,
      staged: [],
      unstaged: [],
      untracked: [],
      conflicted: [],
      clean: true,
      detached: false,
    };

    expect(isRepositoryClean(status)).toBe(true);
  });

  it("should return false with uncommitted changes", () => {
    const status: GitStatus = {
      branch: "main",
      ahead: 0,
      behind: 0,
      staged: ["file.txt"],
      unstaged: [],
      untracked: [],
      conflicted: [],
      clean: false,
      detached: false,
    };

    expect(isRepositoryClean(status)).toBe(false);
  });

  it("should return false when ahead of remote", () => {
    const status: GitStatus = {
      branch: "main",
      ahead: 2,
      behind: 0,
      staged: [],
      unstaged: [],
      untracked: [],
      conflicted: [],
      clean: false,
      detached: false,
    };

    expect(isRepositoryClean(status)).toBe(false);
  });

  it("should return false when behind remote", () => {
    const status: GitStatus = {
      branch: "main",
      ahead: 0,
      behind: 3,
      staged: [],
      unstaged: [],
      untracked: [],
      conflicted: [],
      clean: false,
      detached: false,
    };

    expect(isRepositoryClean(status)).toBe(false);
  });
});

describe("getGitStatusSummary", () => {
  it("should return branch name in summary", () => {
    const status: GitStatus = {
      branch: "feature-branch",
      ahead: 0,
      behind: 0,
      staged: [],
      unstaged: [],
      untracked: [],
      conflicted: [],
      clean: true,
      detached: false,
    };

    const summary = getGitStatusSummary(status);
    expect(summary).toContain("branch: feature-branch");
  });

  it("should show ahead/behind in summary", () => {
    const status: GitStatus = {
      branch: "main",
      ahead: 2,
      behind: 1,
      staged: [],
      unstaged: [],
      untracked: [],
      conflicted: [],
      clean: false,
      detached: false,
    };

    const summary = getGitStatusSummary(status);
    expect(summary).toContain("ahead 2");
    expect(summary).toContain("behind 1");
  });

  it("should show staged files count", () => {
    const status: GitStatus = {
      branch: "main",
      ahead: 0,
      behind: 0,
      staged: ["a.txt", "b.txt"],
      unstaged: [],
      untracked: [],
      conflicted: [],
      clean: false,
      detached: false,
    };

    const summary = getGitStatusSummary(status);
    expect(summary).toContain("2 staged");
  });

  it("should show untracked files count", () => {
    const status: GitStatus = {
      branch: "main",
      ahead: 0,
      behind: 0,
      staged: [],
      unstaged: [],
      untracked: ["new.txt"],
      conflicted: [],
      clean: false,
      detached: false,
    };

    const summary = getGitStatusSummary(status);
    expect(summary).toContain("1 untracked");
  });

  it("should show unstaged files count", () => {
    const status: GitStatus = {
      branch: "main",
      ahead: 0,
      behind: 0,
      staged: [],
      unstaged: ["mod.txt"],
      untracked: [],
      conflicted: [],
      clean: false,
      detached: false,
    };

    const summary = getGitStatusSummary(status);
    expect(summary).toContain("1 unstaged");
  });

  it("should show conflicted files count", () => {
    const status: GitStatus = {
      branch: "main",
      ahead: 0,
      behind: 0,
      staged: [],
      unstaged: [],
      untracked: [],
      conflicted: ["conflict.txt"],
      clean: false,
      detached: false,
    };

    const summary = getGitStatusSummary(status);
    expect(summary).toContain("1 conflicted");
  });

  it("should show all change types together", () => {
    const status: GitStatus = {
      branch: "main",
      ahead: 1,
      behind: 2,
      staged: ["a.txt"],
      unstaged: ["b.txt"],
      untracked: ["c.txt"],
      conflicted: ["d.txt"],
      clean: false,
      detached: false,
    };

    const summary = getGitStatusSummary(status);
    expect(summary).toContain("branch: main");
    expect(summary).toContain("ahead 1");
    expect(summary).toContain("behind 2");
    expect(summary).toContain("1 staged");
    expect(summary).toContain("1 unstaged");
    expect(summary).toContain("1 untracked");
    expect(summary).toContain("1 conflicted");
  });
});
