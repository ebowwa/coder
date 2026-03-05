/**
 * Tests for the activities module
 */

import { test, expect, beforeAll, beforeEach, afterAll } from "bun:test";
import {
  addActivity,
  getActivities,
  getActivitiesForEnvironment,
  getLatestActivity,
  getActivitySummary,
  getActivityStatistics,
  deleteOldActivities,
  deleteActivitiesForEnvironment,
  getEnvironmentsWithActivities,
  closeActivitiesDb,
} from "../src/lib/activities";

beforeAll(() => {
  // Clean up test data from previous runs
  const { Database } = require("bun:sqlite");
  const { resolve, join } = require("node:path");
  // db is in the root directory
  const dbPath = resolve(import.meta.dir, "../../db/metadata.db");
  const db = new Database(dbPath);
  db.exec("DELETE FROM activities WHERE environment_id LIKE 'test-env-%'");
  db.close();
});

afterAll(() => {
  closeActivitiesDb();
});

// Clean up before each test to ensure isolation
beforeEach(() => {
  // No-op since we use unique environment IDs per test
});

test("addActivity should create a new activity entry", () => {
  const id = addActivity({
    environmentId: "test-env-1",
    action: "server_created",
    environmentName: "test-server",
    details: "Created test server",
  });

  expect(id).toBeGreaterThan(0);
});

test("getActivities should return activities for an environment", () => {
  // Clean up first
  deleteActivitiesForEnvironment("test-env-2");

  // Add test activities
  addActivity({
    environmentId: "test-env-2",
    action: "server_started",
    environmentName: "test-server-2",
  });

  addActivity({
    environmentId: "test-env-2",
    action: "server_stopped",
    environmentName: "test-server-2",
  });

  const activities = getActivities({ environmentId: "test-env-2" });
  expect(activities.length).toBeGreaterThanOrEqual(2);
  expect(activities[0].action).toBe("server_stopped"); // Most recent first
});

test("getActivitiesForEnvironment should be an alias for getActivities with environmentId", () => {
  addActivity({
    environmentId: "test-env-3",
    action: "ssh_connected",
    environmentName: "test-server-3",
  });

  const activities = getActivitiesForEnvironment("test-env-3");
  expect(activities.length).toBeGreaterThanOrEqual(1);
  expect(activities[0].environmentId).toBe("test-env-3");
});

test("getLatestActivity should return the most recent activity", () => {
  // Clean up first
  deleteActivitiesForEnvironment("test-env-4");

  addActivity({
    environmentId: "test-env-4",
    action: "action_1",
    environmentName: "test-server-4",
  });

  addActivity({
    environmentId: "test-env-4",
    action: "action_2",
    environmentName: "test-server-4",
  });

  const latest = getLatestActivity("test-env-4");
  expect(latest).not.toBeNull();
  expect(latest?.action).toBe("action_2");
});

test("getActivitySummary should return counts by action type", () => {
  addActivity({
    environmentId: "test-env-5",
    action: "server_started",
    environmentName: "test-server-5",
  });

  addActivity({
    environmentId: "test-env-5",
    action: "server_started",
    environmentName: "test-server-5",
  });

  addActivity({
    environmentId: "test-env-5",
    action: "server_stopped",
    environmentName: "test-server-5",
  });

  const summary = getActivitySummary("test-env-5", 24);
  expect(summary["server_started"]).toBeGreaterThanOrEqual(2);
  expect(summary["server_stopped"]).toBeGreaterThanOrEqual(1);
});

test("getEnvironmentsWithActivities should return list of environments", () => {
  addActivity({
    environmentId: "test-env-6",
    action: "test_action",
    environmentName: "test-server-6",
  });

  const environments = getEnvironmentsWithActivities();
  expect(environments.length).toBeGreaterThan(0);
  expect(environments).toContain("test-env-6");
});

test("deleteActivitiesForEnvironment should remove all activities for an environment", () => {
  addActivity({
    environmentId: "test-env-delete",
    action: "test_action",
    environmentName: "test-server-delete",
  });

  const before = getActivities({ environmentId: "test-env-delete" });
  const countBefore = before.length;

  const deleted = deleteActivitiesForEnvironment("test-env-delete");
  expect(deleted).toBe(countBefore);

  const after = getActivities({ environmentId: "test-env-delete" });
  expect(after.length).toBe(0);
});

test("getActivities should filter by action type", () => {
  addActivity({
    environmentId: "test-env-filter",
    action: "server_created",
    environmentName: "test-server-filter",
  });

  addActivity({
    environmentId: "test-env-filter",
    action: "server_deleted",
    environmentName: "test-server-filter",
  });

  const created = getActivities({
    environmentId: "test-env-filter",
    action: "server_created",
  });

  expect(created.length).toBeGreaterThanOrEqual(1);
  expect(created.every((a) => a.action === "server_created")).toBe(true);
});

test("getActivities should respect limit parameter", () => {
  // Add multiple activities
  for (let i = 0; i < 5; i++) {
    addActivity({
      environmentId: "test-env-limit",
      action: `action_${i}`,
      environmentName: "test-server-limit",
    });
  }

  const limited = getActivities({ environmentId: "test-env-limit", limit: 3 });
  expect(limited.length).toBe(3);
});
