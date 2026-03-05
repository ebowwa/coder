/**
 * Environment metadata storage
 * Stores custom fields not supported by Hetzner API
 */

import { Database } from "bun:sqlite";
import { mkdirSync } from "fs";
import { z } from "zod";
import {
  ActivePortSchema,
  EnvironmentMetadataSchema,
  ActivityUpdateSchema,
} from "@ebowwa/codespaces-types/runtime/database";
import { EnvironmentMetadata, ActivePort } from "@ebowwa/codespaces-types/compile";

const METADATA_DB_PATH = "./db/metadata.db";

let db: Database | null = null;

function getDb(): Database {
  if (!db) {
    // Ensure the database directory exists
    const dbPath = new URL(METADATA_DB_PATH, import.meta.url).pathname;
    const dbDir = dbPath.substring(0, dbPath.lastIndexOf('/'));
    if (dbDir) {
      mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(dbPath);
    // Enable WAL mode for better concurrency
    db.exec("PRAGMA journal_mode = WAL");

    // Always create/update the table schema
    // This ensures the table exists with all required columns
    db.exec(`
      CREATE TABLE IF NOT EXISTS environment_metadata (
        id TEXT PRIMARY KEY,
        description TEXT,
        project TEXT,
        owner TEXT,
        purpose TEXT,
        environment_type TEXT,
        hours_active REAL DEFAULT 0,
        last_active TEXT,
        active_ports_json TEXT,
        permissions_json TEXT,
        ssh_key_path TEXT,
        ssh_password TEXT,
        bootstrap_status TEXT,
        updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      )
    `);

    // Add ssh_key_path column if it doesn't exist (migration for existing databases)
    try {
      db.exec(`ALTER TABLE environment_metadata ADD COLUMN ssh_key_path TEXT`);
    } catch {
      // Column already exists, ignore error
    }

    // Add ssh_password column if it doesn't exist (migration for existing databases)
    try {
      db.exec(`ALTER TABLE environment_metadata ADD COLUMN ssh_password TEXT`);
    } catch {
      // Column already exists, ignore error
    }

    // Add bootstrap_status column if it doesn't exist (migration for existing databases)
    try {
      db.exec(`ALTER TABLE environment_metadata ADD COLUMN bootstrap_status TEXT`);
    } catch {
      // Column already exists, ignore error
    }
  }
  return db;
}

/**
 * Get metadata for an environment
 */
export function getMetadata(id: string): EnvironmentMetadata | null {
  const db = getDb();
  const stmt = db.prepare(
    "SELECT id, description, project, owner, purpose, environment_type, hours_active, last_active, active_ports_json, permissions_json, ssh_key_path, ssh_password, bootstrap_status, updated_at FROM environment_metadata WHERE id = ?",
  );
  const row = stmt.get(id) as
    | {
        id: string;
        description: string | null;
        project: string | null;
        owner: string | null;
        purpose: string | null;
        environment_type: string | null;
        hours_active: number | null;
        last_active: string | null;
        active_ports_json: string | null;
        permissions_json: string | null;
        ssh_key_path: string | null;
        ssh_password: string | null;
        bootstrap_status: string | null;
        updated_at: string | null;
      }
    | undefined;

  if (!row) return null;

  // Parse and validate with Zod
  const rawData = {
    id: row.id,
    description: row.description || undefined,
    project: row.project || undefined,
    owner: row.owner || undefined,
    purpose: row.purpose || undefined,
    environmentType:
      (row.environment_type as EnvironmentMetadata["environmentType"]) ||
      undefined,
    hoursActive: row.hours_active || undefined,
    lastActive: row.last_active || undefined,
    activePorts: row.active_ports_json
      ? JSON.parse(row.active_ports_json)
      : undefined,
    permissions: row.permissions_json
      ? JSON.parse(row.permissions_json)
      : undefined,
    sshKeyPath: row.ssh_key_path || undefined,
    sshPassword: row.ssh_password || undefined,
    bootstrapStatus: (row.bootstrap_status as EnvironmentMetadata["bootstrapStatus"]) || undefined,
    updatedAt: row.updated_at || undefined,
  };

  const validated = EnvironmentMetadataSchema.safeParse(rawData);
  if (!validated.success) {
    console.warn(
      "Metadata validation warning for id:",
      id,
      validated.error.issues,
    );
    return rawData as unknown as EnvironmentMetadata; // Return unvalidated data for backward compatibility
  }

  return validated.data as unknown as EnvironmentMetadata;
}

/**
 * Set metadata for an environment
 */
export function setMetadata(metadata: EnvironmentMetadata): void {
  // Validate input with Zod
  const validated = EnvironmentMetadataSchema.safeParse(metadata);
  if (!validated.success) {
    throw new Error(
      `Invalid metadata: ${validated.error.issues.map((i) => i.message).join(", ")}`,
    );
  }

  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO environment_metadata (id, description, project, owner, purpose, environment_type, hours_active, last_active, active_ports_json, permissions_json, ssh_key_path, ssh_password, bootstrap_status, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    ON CONFLICT(id) DO UPDATE SET
      description = excluded.description,
      project = excluded.project,
      owner = excluded.owner,
      purpose = excluded.purpose,
      environment_type = excluded.environment_type,
      hours_active = excluded.hours_active,
      last_active = excluded.last_active,
      active_ports_json = excluded.active_ports_json,
      permissions_json = excluded.permissions_json,
      ssh_key_path = excluded.ssh_key_path,
      ssh_password = excluded.ssh_password,
      bootstrap_status = excluded.bootstrap_status,
      updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
  `);

  const data = validated.data;
  stmt.run(
    data.id,
    data.description || null,
    data.project || null,
    data.owner || null,
    data.purpose || null,
    data.environmentType || null,
    data.hoursActive || null,
    data.lastActive || null,
    data.activePorts ? JSON.stringify(data.activePorts) : null,
    data.permissions ? JSON.stringify(data.permissions) : null,
    data.sshKeyPath || null,
    (data as any).sshPassword || null,
    (data as any).bootstrapStatus || null,
  );
}

/**
 * Update activity tracking (hours active, last active, ports)
 */
export function updateActivity(
  id: string,
  activity: {
    hoursActive?: number;
    lastActive?: string;
    activePorts?: ActivePort[];
  },
): void {
  // Validate activity input with Zod
  const validatedActivity = ActivityUpdateSchema.safeParse(activity);
  if (!validatedActivity.success) {
    throw new Error(
      `Invalid activity data: ${validatedActivity.error.issues.map((i) => i.message).join(", ")}`,
    );
  }

  const existing = getMetadata(id) || { id };
  setMetadata({
    ...existing,
    ...validatedActivity.data,
  });
}

/**
 * Update plugins configuration
 */
export function updatePlugins(
  id: string,
  plugins: Record<
    string,
    {
      enabled: boolean;
      config?: Record<string, unknown>;
    }
  >,
): void {
  const existing = getMetadata(id) || { id };
  setMetadata({
    ...existing,
    permissions: {
      ...existing.permissions,
      plugins,
    },
  });
}

/**
 * Delete metadata for an environment
 */
export function deleteMetadata(id: string): void {
  const db = getDb();
  const stmt = db.prepare("DELETE FROM environment_metadata WHERE id = ?");
  stmt.run(id);
}

/**
 * Get all metadata
 */
export function getAllMetadata(): EnvironmentMetadata[] {
  const db = getDb();
  const stmt = db.prepare(
    "SELECT id, description, project, owner, purpose, environment_type, hours_active, last_active, active_ports_json, permissions_json, ssh_key_path, ssh_password, bootstrap_status, updated_at FROM environment_metadata",
  );
  const rows = stmt.all() as Array<{
    id: string;
    description: string | null;
    project: string | null;
    owner: string | null;
    purpose: string | null;
    environment_type: string | null;
    hours_active: number | null;
    last_active: string | null;
    active_ports_json: string | null;
    permissions_json: string | null;
    ssh_key_path: string | null;
    ssh_password: string | null;
    bootstrap_status: string | null;
    updated_at: string | null;
  }>;

  return rows.map((row) => {
    const rawData = {
      id: row.id,
      description: row.description || undefined,
      project: row.project || undefined,
      owner: row.owner || undefined,
      purpose: row.purpose || undefined,
      environmentType:
        (row.environment_type as EnvironmentMetadata["environmentType"]) ||
        undefined,
      hoursActive: row.hours_active || undefined,
      lastActive: row.last_active || undefined,
      activePorts: row.active_ports_json
        ? JSON.parse(row.active_ports_json)
        : undefined,
      permissions: row.permissions_json
        ? JSON.parse(row.permissions_json)
        : undefined,
      sshKeyPath: row.ssh_key_path || undefined,
      sshPassword: row.ssh_password || undefined,
      bootstrapStatus: (row.bootstrap_status as EnvironmentMetadata["bootstrapStatus"]) || undefined,
      updatedAt: row.updated_at || undefined,
    };

    // Validate each entry with Zod
    const validated = EnvironmentMetadataSchema.safeParse(rawData);
    if (!validated.success) {
      console.warn(
        "Metadata validation warning for id:",
        row.id,
        validated.error.issues,
      );
      return rawData as unknown as EnvironmentMetadata; // Return unvalidated data for backward compatibility
    }

    return validated.data as unknown as EnvironmentMetadata;
  });
}
