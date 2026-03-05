/**
 * User activity tracking system
 * Tracks user actions for audit trail and analytics
 *
 * TODO: Implement automatic cleanup of old activities (older than 30 days)
 * TODO: Add scheduled cleanup task or cron job for maintenance
 */

import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { z } from "zod";
import { AddActivityRequestSchema, ActivitiesQueryParamsSchema } from "@ebowwa/codespaces-types/runtime/api";

// Use relative path from lib directory (db is in workspace/src/lib/db/)
const METADATA_DB_PATH = "./db/metadata.db";

let db: Database | null = null;

/**
 * Activity entry type - exported for use across codebase
 */
export interface ActivityEntry {
  id: number;
  environmentId: string;
  action: string;
  environmentName: string;
  details?: string;
  timestamp: string;
}

// Re-export schemas from lib/schemas/api.ts to avoid duplication
// Import and re-export for convenience
export { AddActivityRequestSchema as AddActivitySchema } from "@ebowwa/codespaces-types/runtime/api";
export { ActivitiesQueryParamsSchema as ActivitiesQuerySchema } from "@ebowwa/codespaces-types/runtime/api";

// Type aliases for backward compatibility
export type AddActivityInput = z.infer<typeof AddActivityRequestSchema>;
export type ActivitiesQueryInput = z.infer<typeof ActivitiesQueryParamsSchema>;

// Internal schema for direct function calls (accepts numbers, not strings)
const InternalActivitiesQuerySchema = z.object({
  environmentId: z.string().optional(),
  limit: z.number().int().positive().max(1000).default(100),
  hours: z.number().int().positive().optional(),
  since: z.string().datetime().optional(),
  until: z.string().datetime().optional(),
  action: z.string().optional(),
});

/**
 * Initialize database connection and create activities table if needed
 */
function getDb(): Database {
  if (!db) {
    // Resolve relative path and ensure directory exists
    const dbPath = new URL(METADATA_DB_PATH, import.meta.url).pathname;
    const dbDir = dbPath.substring(0, dbPath.lastIndexOf('/'));
    if (dbDir) {
      mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(dbPath);
    // Enable WAL mode for better concurrency
    db.exec("PRAGMA journal_mode = WAL");

    // Create activities table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        environment_id TEXT NOT NULL,
        action TEXT NOT NULL,
        environment_name TEXT NOT NULL,
        details TEXT,
        timestamp TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        FOREIGN KEY (environment_id) REFERENCES environment_metadata(id) ON DELETE CASCADE
      )
    `);

    // Create index for environment-based queries (most common use case)
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_activities_env_time
      ON activities(environment_id, timestamp DESC)
    `);

    // Create index for time-based queries (for cleanup and analytics)
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_activities_timestamp
      ON activities(timestamp DESC)
    `);

    // Create index for action-based filtering
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_activities_action
      ON activities(action)
    `);

    // Create composite index for environment + action filtering
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_activities_env_action
      ON activities(environment_id, action, timestamp DESC)
    `);
  }
  return db;
}

/**
 * Add a new activity entry
 *
 * @param activity - The activity to add
 * @returns The ID of the newly created activity
 *
 * @example
 * ```ts
 * const id = addActivity({
 *   environmentId: "123",
 *   action: "server_created",
 *   environmentName: "my-server",
 *   details: "Created cpx21 server in nbg1"
 * });
 * ```
 */
export function addActivity(
  activity: z.infer<typeof AddActivityRequestSchema>,
): number {
  // Validate input with Zod
  const validated = AddActivityRequestSchema.safeParse(activity);
  if (!validated.success) {
    throw new Error(
      `Invalid activity data: ${validated.error.issues.map((i) => i.message).join(", ")}`,
    );
  }

  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO activities (environment_id, action, environment_name, details)
    VALUES (?, ?, ?, ?)
  `);

  const data = validated.data;
  const result = stmt.run(
    data.environmentId,
    data.action,
    data.environmentName,
    data.details || null,
  );

  return result.lastInsertRowid as number;
}

/**
 * Get activities with optional filtering
 *
 * @param options - Filter and pagination options
 * @returns Array of activity entries
 *
 * @example
 * ```ts
 * // Get last 50 activities for an environment
 * const activities = getActivities({ environmentId: "123", limit: 50 });
 *
 * // Get activities from last 24 hours
 * const recent = getActivities({ hours: 24 });
 *
 * // Get activities for a specific action type
 * const creations = getActivities({ action: "server_created" });
 *
 * // Get activities in a date range
 * const range = getActivities({
 *   since: "2024-01-01T00:00:00Z",
 *   until: "2024-01-31T23:59:59Z"
 * });
 * ```
 */
export function getActivities(
  options: Partial<z.infer<typeof InternalActivitiesQuerySchema>> = {},
): ActivityEntry[] {
  // Validate options with Zod
  const validated = InternalActivitiesQuerySchema.safeParse(options);
  if (!validated.success) {
    throw new Error(
      `Invalid query options: ${validated.error.issues.map((i) => i.message).join(", ")}`,
    );
  }

  const db = getDb();
  const data = validated.data;

  // Build dynamic SQL query based on filters
  let sql = "SELECT * FROM activities WHERE 1=1";
  const params: (string | number)[] = [];

  if (data.environmentId) {
    sql += " AND environment_id = ?";
    params.push(data.environmentId);
  }

  if (data.action) {
    sql += " AND action = ?";
    params.push(data.action);
  }

  if (data.since) {
    sql += " AND timestamp >= ?";
    params.push(data.since);
  } else if (data.hours) {
    sql += ' AND timestamp >= datetime("now", "-" || ? || " hours")';
    params.push(data.hours);
  }

  if (data.until) {
    sql += " AND timestamp <= ?";
    params.push(data.until);
  }

  // Always order by timestamp desc (newest first), then by id as tiebreaker
  sql += " ORDER BY timestamp DESC, id DESC";

  // Apply limit
  sql += " LIMIT ?";
  params.push(data.limit);

  const stmt = db.prepare(sql);
  const rows = stmt.all(...params) as any[];

  return rows.map((row) => {
    const activity: ActivityEntry = {
      id: row.id,
      environmentId: row.environment_id,
      action: row.action,
      environmentName: row.environment_name,
      details: row.details ?? undefined,
      timestamp: row.timestamp,
    };

    // Validate with Zod (log warnings but don't fail for backward compatibility)
    const validatedRow = AddActivityRequestSchema.safeParse(activity);
    if (!validatedRow.success) {
      console.warn("Activity validation warning:", validatedRow.error.issues);
      return activity; // Return unvalidated for backward compatibility
    }

    return validatedRow.data as ActivityEntry;
  });
}

/**
 * Get activities for a specific environment
 *
 * @param environmentId - The environment ID
 * @param options - Optional filters (limit, hours, since, until, action)
 * @returns Array of activity entries for the environment
 *
 * @example
 * ```ts
 * const activities = getActivitiesForEnvironment("123", { limit: 50 });
 * const recent = getActivitiesForEnvironment("123", { hours: 24 });
 * ```
 */
export function getActivitiesForEnvironment(
  environmentId: string,
  options: Omit<Partial<z.infer<typeof InternalActivitiesQuerySchema>>, "environmentId"> = {},
): ActivityEntry[] {
  return getActivities({ ...options, environmentId });
}

/**
 * Get latest activity for an environment
 *
 * @param environmentId - The environment ID
 * @returns The latest activity entry or null if none found
 *
 * @example
 * ```ts
 * const latest = getLatestActivity("123");
 * if (latest) {
 *   console.log(`Last action: ${latest.action} at ${latest.timestamp}`);
 * }
 * ```
 */
export function getLatestActivity(
  environmentId: string,
): ActivityEntry | null {
  const activities = getActivities({ environmentId, limit: 1 });
  return activities[0] || null;
}

/**
 * Get activity count summary by action type for an environment
 *
 * @param environmentId - The environment ID
 * @param hours - Optional time range in hours (default: 24)
 * @returns Record mapping action types to counts
 *
 * @example
 * ```ts
 * const summary = getActivitySummary("123", 24);
 * // Returns: { server_created: 5, server_deleted: 2, ssh_connected: 15 }
 * ```
 */
export function getActivitySummary(
  environmentId: string,
  hours: number = 24,
): Record<string, number> {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT action, COUNT(*) as count
    FROM activities
    WHERE environment_id = ?
      AND timestamp >= datetime("now", "-" || ? || " hours")
    GROUP BY action
    ORDER BY count DESC
  `);

  const rows = stmt.all(environmentId, hours) as any[];
  const summary: Record<string, number> = {};

  for (const row of rows) {
    summary[row.action] = row.count;
  }

  return summary;
}

/**
 * Delete old activities for cleanup
 *
 * @param environmentId - The environment ID (optional: if not provided, deletes old activities for all environments)
 * @param keepHours - Number of hours of history to keep (default: 720 = 30 days)
 * @returns Number of deleted records
 *
 * @example
 * ```ts
 * // Delete activities older than 30 days for a specific environment
 * const deleted = deleteOldActivities("123", 720);
 *
 * // Delete activities older than 90 days for all environments
 * const allDeleted = deleteOldActivities(undefined, 2160);
 * ```
 */
export function deleteOldActivities(
  environmentId?: string,
  keepHours: number = 720,
): number {
  const db = getDb();

  let sql: string;
  let result: any;

  if (environmentId) {
    sql = `
      DELETE FROM activities
      WHERE environment_id = ?
        AND timestamp < datetime("now", "-" || ? || " hours")
    `;
    const stmt = db.prepare(sql);
    result = stmt.run(environmentId, keepHours);
  } else {
    sql = `
      DELETE FROM activities
      WHERE timestamp < datetime("now", "-" || ? || " hours")
    `;
    const stmt = db.prepare(sql);
    result = stmt.run(keepHours);
  }

  return result.changes;
}

/**
 * Delete all activities for an environment
 *
 * @param environmentId - The environment ID
 * @returns Number of deleted records
 *
 * @example
 * ```ts
 * const deleted = deleteActivitiesForEnvironment("123");
 * console.log(`Deleted ${deleted} activities`);
 * ```
 */
export function deleteActivitiesForEnvironment(
  environmentId: string,
): number {
  const db = getDb();
  const stmt = db.prepare("DELETE FROM activities WHERE environment_id = ?");
  const result = stmt.run(environmentId);
  return result.changes;
}

/**
 * Get all environments with activities
 *
 * @returns Array of environment IDs that have activity records
 *
 * @example
 * ```ts
 * const environments = getEnvironmentsWithActivities();
 * console.log(`Environments with activity tracking: ${environments.length}`);
 * ```
 */
export function getEnvironmentsWithActivities(): string[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT DISTINCT environment_id
    FROM activities
    ORDER BY environment_id
  `);

  const rows = stmt.all() as any[];
  return rows.map((row) => row.environment_id);
}

/**
 * Get activity statistics for analytics
 *
 * @param options - Filter options
 * @returns Activity statistics including counts by action and time distribution
 *
 * @example
 * ```ts
 * const stats = getActivityStatistics({ hours: 24 });
 * console.log(`Total activities: ${stats.total}`);
 * console.log(`By action:`, stats.byAction);
 * ```
 */
export interface ActivityStatistics {
  total: number;
  byAction: Record<string, number>;
  byEnvironment: Record<string, number>;
  period: {
    start: string;
    end: string;
    hours: number;
  };
}

export function getActivityStatistics(
  options: Omit<Partial<z.infer<typeof InternalActivitiesQuerySchema>>, "limit"> = {},
): ActivityStatistics | null {
  const db = getDb();
  const data = options;

  // Build WHERE clause
  let whereClause = "WHERE 1=1";
  const params: (string | number)[] = [];

  if (data.environmentId) {
    whereClause += " AND environment_id = ?";
    params.push(data.environmentId);
  }

  if (data.action) {
    whereClause += " AND action = ?";
    params.push(data.action);
  }

  if (data.since) {
    whereClause += " AND timestamp >= ?";
    params.push(data.since);
  } else if (data.hours) {
    whereClause += ' AND timestamp >= datetime("now", "-" || ? || " hours")';
    params.push(data.hours);
  }

  if (data.until) {
    whereClause += " AND timestamp <= ?";
    params.push(data.until);
  }

  // Get total count
  const countStmt = db.prepare(
    `SELECT COUNT(*) as total FROM activities ${whereClause}`,
  );
  const countResult = countStmt.get(...params) as any;
  const total = countResult.total;

  if (total === 0) {
    return null;
  }

  // Get count by action
  const byActionStmt = db.prepare(`
    SELECT action, COUNT(*) as count
    FROM activities
    ${whereClause}
    GROUP BY action
    ORDER BY count DESC
  `);
  const byActionRows = byActionStmt.all(...params) as any[];
  const byAction: Record<string, number> = {};
  for (const row of byActionRows) {
    byAction[row.action] = row.count;
  }

  // Get count by environment (only if not filtering by environment)
  let byEnvironment: Record<string, number> = {};
  if (!data.environmentId) {
    const byEnvStmt = db.prepare(`
      SELECT environment_id, COUNT(*) as count
      FROM activities
      ${whereClause}
      GROUP BY environment_id
      ORDER BY count DESC
    `);
    const byEnvRows = byEnvStmt.all(...params) as any[];
    for (const row of byEnvRows) {
      byEnvironment[row.environment_id] = row.count;
    }
  }

  // Calculate time period
  let periodSql = `
    SELECT
      MIN(timestamp) as start,
      MAX(timestamp) as end
    FROM activities
    ${whereClause}
  `;
  const periodStmt = db.prepare(periodSql);
  const periodResult = periodStmt.get(...params) as any;

  return {
    total,
    byAction,
    byEnvironment,
    period: {
      start: periodResult.start,
      end: periodResult.end,
      hours: data.hours || 24,
    },
  };
}

/**
 * Close the database connection
 * Useful for testing or cleanup
 */
export function closeActivitiesDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Reinitialize the database connection
 * Useful for testing or after closing
 */
export function initActivitiesDb(): void {
  closeActivitiesDb();
  getDb();
}
