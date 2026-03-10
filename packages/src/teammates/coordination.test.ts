/**
 * Tests for Coordination Callbacks
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, rmSync, mkdirSync } from "fs";
import { join } from "path";
import { TeammateManager } from "./index.js";
import {
  CoordinationManager,
  createCoordinationMessage,
  parseCoordinationMessage,
  type CoordinationEvent,
  type ProgressReport,
  type FileClaim,
} from "./coordination.js";

// Helper to clean up claims directory
const CLAIMS_PATH = join(process.env.HOME || "", ".claude", "teams", "_coordination", "claims");

function cleanupClaims(): void {
  if (existsSync(CLAIMS_PATH)) {
    try {
      rmSync(CLAIMS_PATH, { recursive: true, force: true });
    } catch {
      // Ignore errors
    }
  }
}

describe("Coordination Callbacks", () => {
  let manager: TeammateManager;
  let coordination: CoordinationManager;
  const events: CoordinationEvent[] = [];

  beforeEach(() => {
    // Clean up any stale claims before each test
    cleanupClaims();

    manager = new TeammateManager();
    coordination = new CoordinationManager(manager, {
      enableFileLocking: true,
      enableHeartbeat: false,
      onCoordinationEvent: (event) => {
        events.push(event);
      },
    });
    events.length = 0;
  });

  afterEach(() => {
    coordination.shutdown();
    // Clean up claims after each test
    cleanupClaims();
  });

  describe("Progress Reporting", () => {
    it("should report progress to team", () => {
      coordination.initialize("teammate-1", "test-team");

      const progress: ProgressReport = {
        step: "Building CSS styles",
        stepNumber: 2,
        totalSteps: 5,
        percentage: 40,
        files: ["styles.css"],
      };

      coordination.reportProgress(progress);

      expect(events.length).toBe(1);
      expect(events[0]!.type).toBe("task_progress");
      expect(events[0]!.payload.progress).toEqual(progress);
    });

    it("should track current progress", () => {
      coordination.initialize("teammate-1", "test-team");

      const progress: ProgressReport = {
        step: "Writing tests",
        stepNumber: 3,
        totalSteps: 4,
      };

      coordination.reportProgress(progress);

      // Progress should be emitted
      const progressEvents = events.filter((e) => e.type === "task_progress");
      expect(progressEvents.length).toBe(1);
    });
  });

  describe("Blocked/Unblocked", () => {
    it("should report blocked status", () => {
      coordination.initialize("teammate-1", "test-team");

      coordination.reportBlocked("Waiting for CSS file", "css-builder");

      expect(events.length).toBe(1);
      expect(events[0]!.type).toBe("blocked");
      expect(events[0]!.payload.reason).toBe("Waiting for CSS file");
      expect(events[0]!.payload.blockedBy).toBe("css-builder");
    });

    it("should report unblocked status", () => {
      coordination.initialize("teammate-1", "test-team");

      coordination.reportBlocked("Waiting for CSS file");
      coordination.reportUnblocked();

      const blockedEvents = events.filter((e) => e.type === "blocked");
      const unblockedEvents = events.filter((e) => e.type === "unblocked");

      expect(blockedEvents.length).toBe(1);
      expect(unblockedEvents.length).toBe(1);
    });
  });

  describe("File Locking", () => {
    it("should claim a file", () => {
      coordination.initialize("teammate-1", "test-team");

      const claimed = coordination.claimFile("/path/to/file.ts", "Writing code");

      expect(claimed).toBe(true);
      expect(coordination.isFileClaimed("/path/to/file.ts")).toBe(false); // We own it
      expect(coordination.getFileClaim("/path/to/file.ts")?.reason).toBe("Writing code");
    });

    it("should prevent other teammates from claiming", () => {
      coordination.initialize("teammate-1", "test-team");

      coordination.claimFile("/path/to/file.ts", "Writing code");

      // Simulate another teammate trying to claim
      const coordination2 = new CoordinationManager(manager, {
        enableFileLocking: true,
      });
      coordination2.initialize("teammate-2", "test-team");

      const claimed = coordination2.claimFile("/path/to/file.ts", "Also writing");

      expect(claimed).toBe(false);
      expect(coordination2.isFileClaimed("/path/to/file.ts")).toBe(true);

      coordination2.shutdown();
    });

    it("should release a file claim", () => {
      coordination.initialize("teammate-1", "test-team");

      coordination.claimFile("/path/to/file.ts");
      coordination.releaseFile("/path/to/file.ts");

      // Create another coordination and try to claim
      const coordination2 = new CoordinationManager(manager, {
        enableFileLocking: true,
      });
      coordination2.initialize("teammate-2", "test-team");

      const claimed = coordination2.claimFile("/path/to/file.ts");
      expect(claimed).toBe(true);

      coordination2.shutdown();
    });

    it("should release all claims on shutdown", () => {
      coordination.initialize("teammate-1", "test-team");

      coordination.claimFile("/file1.ts");
      coordination.claimFile("/file2.ts");

      coordination.shutdown();

      // Re-create and check if files are available
      const coordination2 = new CoordinationManager(manager, {
        enableFileLocking: true,
      });
      coordination2.initialize("teammate-2", "test-team");

      expect(coordination2.isFileClaimed("/file1.ts")).toBe(false);
      expect(coordination2.isFileClaimed("/file2.ts")).toBe(false);

      coordination2.shutdown();
    });

    it("should list all claims", () => {
      coordination.initialize("teammate-1", "test-team");

      coordination.claimFile("/file1.ts", "Working on file 1");
      coordination.claimFile("/file2.ts", "Working on file 2");

      const claims = coordination.getAllClaims();

      expect(claims.length).toBe(2);
      expect(claims.some((c) => c.filePath === "/file1.ts")).toBe(true);
      expect(claims.some((c) => c.filePath === "/file2.ts")).toBe(true);
    });

    it("should support expiring claims", () => {
      coordination.initialize("teammate-1", "test-team");

      // Claim with 100ms expiration
      coordination.claimFile("/file.ts", "Quick edit", 100);

      // Should be claimed initially
      expect(coordination.getFileClaim("/file.ts")).toBeDefined();

      // Wait for expiration
      // Note: In real tests, we'd use fake timers
      // For now, just test the claim exists
      const claim = coordination.getFileClaim("/file.ts");
      expect(claim?.expiresAt).toBeDefined();
    });
  });

  describe("Coordination Messages", () => {
    it("should create coordination messages", () => {
      const msg = createCoordinationMessage("task_progress", "50% complete");
      expect(msg).toBe("[COORD:TASK_PROGRESS] 50% complete");
    });

    it("should parse coordination messages", () => {
      const result = parseCoordinationMessage("[COORD:FILE_CLAIM] /path/to/file.ts");
      expect(result.isCoordination).toBe(true);
      expect(result.type).toBe("file_claim");
      expect(result.content).toBe("/path/to/file.ts");
    });

    it("should return false for non-coordination messages", () => {
      const result = parseCoordinationMessage("Hello teammates!");
      expect(result.isCoordination).toBe(false);
      expect(result.type).toBeUndefined();
    });
  });

  describe("Event Callbacks", () => {
    it("should call onProgress callback", () => {
      const progressReports: Array<{ id: string; progress: ProgressReport }> = [];

      const coordWithCallbacks = new CoordinationManager(manager, {
        enableProgressReporting: true,
        onProgress: (teammateId, progress) => {
          progressReports.push({ id: teammateId, progress });
        },
      });

      coordWithCallbacks.initialize("teammate-1", "test-team");
      coordWithCallbacks.reportProgress({
        step: "Test",
        stepNumber: 1,
      });

      expect(progressReports.length).toBe(1);
      expect(progressReports[0]!.progress.step).toBe("Test");

      coordWithCallbacks.shutdown();
    });

    it("should call onFileClaimed callback", () => {
      const claims: FileClaim[] = [];

      const coordWithCallbacks = new CoordinationManager(manager, {
        enableFileLocking: true,
        onFileClaimed: (claim) => {
          claims.push(claim);
        },
      });

      coordWithCallbacks.initialize("teammate-1", "test-team");
      coordWithCallbacks.claimFile("/test.ts", "Testing");

      expect(claims.length).toBe(1);
      expect(claims[0]!.filePath).toBe("/test.ts");

      coordWithCallbacks.shutdown();
    });
  });
});
