/**
 * Time series metrics storage for resource usage
 * Enables historical analysis and better AI inferences
 */

import { Database } from "bun:sqlite";
import { mkdirSync } from "fs";
import { z } from "zod";
import { getActiveSSHConnections } from "./ssh/index.ts";

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
    db.exec("PRAGMA journal_mode = WAL");

    // Check if table exists and needs migration
    const tableExists = db
      .prepare(
        `
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='resource_metrics'
    `,
      )
      .get() as any;

    if (tableExists) {
      // Check if migration is needed
      const tableInfo = db
        .prepare("PRAGMA table_info(resource_metrics)")
        .all() as any[];
      const capturedAtCol = tableInfo.find((col) => col.name === "captured_at");
      const gpuPercentCol = tableInfo.find((col) => col.name === "gpu_percent");

      // Check if we need to migrate for ISO timestamps
      const needsTimestampMigration = capturedAtCol && !capturedAtCol.dflt_value?.includes("strftime");

      // Check if we need to add GPU columns
      const needsGPUMigration = !gpuPercentCol;

      if (needsTimestampMigration || needsGPUMigration) {
        console.log(
          `Migrating resource_metrics table${needsTimestampMigration ? " (ISO timestamps)" : ""}${needsGPUMigration ? " (GPU columns)" : ""}...`,
        );

        // Get existing data before migration
        const existingData = db
          .prepare("SELECT * FROM resource_metrics")
          .all() as any[];

        // Drop and recreate table with new schema
        db.exec("DROP TABLE IF EXISTS resource_metrics");

        // Recreate with new schema including GPU columns
        db.exec(`
          CREATE TABLE resource_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            environment_id TEXT NOT NULL,
            cpu_percent REAL NOT NULL,
            memory_percent REAL NOT NULL,
            disk_percent REAL NOT NULL,
            network_rx_bytes INTEGER,
            network_tx_bytes INTEGER,
            load_avg_1m REAL,
            load_avg_5m REAL,
            load_avg_15m REAL,
            active_processes INTEGER,
            active_connections INTEGER,
            gpu_percent REAL,
            gpu_memory_used INTEGER,
            gpu_memory_total INTEGER,
            gpu_temperature REAL,
            captured_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
            FOREIGN KEY (environment_id) REFERENCES environment_metadata(id) ON DELETE CASCADE
          )
        `);

        // Recreate indexes
        db.exec(`
          CREATE INDEX idx_metrics_env_time ON resource_metrics(environment_id, captured_at DESC)
        `);
        db.exec(`
          CREATE INDEX idx_metrics_captured_at ON resource_metrics(captured_at DESC)
        `);

        // Re-insert data with converted timestamps
        const insertStmt = db.prepare(`
          INSERT INTO resource_metrics
          (environment_id, cpu_percent, memory_percent, disk_percent,
           network_rx_bytes, network_tx_bytes, load_avg_1m, load_avg_5m, load_avg_15m,
           active_processes, active_connections, captured_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const row of existingData) {
          // Convert SQLite timestamp to ISO format
          const ts = row.captured_at;
          let isoTs: string;
          if (ts.includes("T")) {
            isoTs = ts;
          } else {
            // Convert "YYYY-MM-DD HH:MM:SS" to ISO format
            const [datePart, timePart] = ts.split(" ");
            isoTs = `${datePart}T${timePart}Z`;
          }

          insertStmt.run(
            row.environment_id,
            row.cpu_percent,
            row.memory_percent,
            row.disk_percent,
            row.network_rx_bytes,
            row.network_tx_bytes,
            row.load_avg_1m,
            row.load_avg_5m,
            row.load_avg_15m,
            row.active_processes,
            row.active_connections,
            isoTs,
          );
        }

        console.log(`Migrated ${existingData.length} metric records`);
      }
    }

    // Create time series metrics table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS resource_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        environment_id TEXT NOT NULL,
        cpu_percent REAL NOT NULL,
        memory_percent REAL NOT NULL,
        disk_percent REAL NOT NULL,
        network_rx_bytes INTEGER,
        network_tx_bytes INTEGER,
        load_avg_1m REAL,
        load_avg_5m REAL,
        load_avg_15m REAL,
        active_processes INTEGER,
        active_connections INTEGER,
        gpu_percent REAL,
        gpu_memory_used INTEGER,
        gpu_memory_total INTEGER,
        gpu_temperature REAL,
        captured_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        FOREIGN KEY (environment_id) REFERENCES environment_metadata(id) ON DELETE CASCADE
      )
    `);

    // Index for time-based queries
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_metrics_env_time
      ON resource_metrics(environment_id, captured_at DESC)
    `);

    // Index for time range queries
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_metrics_captured_at
      ON resource_metrics(captured_at DESC)
    `);

    // Create SSH pool metrics table for monitoring connection pool
    db.exec(`
      CREATE TABLE IF NOT EXISTS ssh_pool_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        total_connections INTEGER NOT NULL,
        connection_details TEXT,
        captured_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      )
    `);

    // Index for SSH pool metrics time queries
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_ssh_pool_captured_at
      ON ssh_pool_metrics(captured_at DESC)
    `);
  }
  return db;
}

// Type definitions
export interface ResourceMetric {
  id?: number;
  environmentId: string;
  cpuPercent: number;
  memoryPercent: number;
  memoryUsed?: number;
  memoryTotal?: number;
  diskPercent: number;
  diskUsed?: number;
  diskTotal?: number;
  gpuPercent?: number;
  gpuMemoryUsed?: number;
  gpuMemoryTotal?: number;
  gpuTemperature?: number;
  networkRxBytes?: number;
  networkTxBytes?: number;
  loadAvg1m?: number;
  loadAvg5m?: number;
  loadAvg15m?: number;
  activeProcesses?: number;
  activeConnections?: number;
  capturedAt?: string;
}

// Zod schema for ResourceMetric validation
const ResourceMetricSchema = z.object({
  id: z.number().int().positive().optional(),
  environmentId: z.string().min(1),
  cpuPercent: z.number().min(0).max(100),
  memoryPercent: z.number().min(0).max(100),
  memoryUsed: z.number().min(0).nullable().optional(),
  memoryTotal: z.number().min(0).nullable().optional(),
  diskPercent: z.number().min(0).max(100),
  diskUsed: z.number().min(0).nullable().optional(),
  diskTotal: z.number().min(0).nullable().optional(),
  gpuPercent: z.number().min(0).max(100).nullable().optional(),
  gpuMemoryUsed: z.number().min(0).nullable().optional(),
  gpuMemoryTotal: z.number().min(0).nullable().optional(),
  gpuTemperature: z.number().min(0).max(150).nullable().optional(),
  networkRxBytes: z.number().int().min(0).nullable().optional(),
  networkTxBytes: z.number().int().min(0).nullable().optional(),
  loadAvg1m: z.number().min(0).nullable().optional(),
  loadAvg5m: z.number().min(0).nullable().optional(),
  loadAvg15m: z.number().min(0).nullable().optional(),
  activeProcesses: z.number().int().min(0).nullable().optional(),
  activeConnections: z.number().int().min(0).nullable().optional(),
  capturedAt: z.string().datetime().optional(),
});

export interface MetricStats {
  avg: number;
  min: number;
  max: number;
  count: number;
  trend?: "rising" | "falling" | "stable";
}

export interface MetricsSummary {
  cpu: MetricStats;
  memory: MetricStats;
  disk: MetricStats;
  period: {
    start: string;
    end: string;
    hours: number;
  };
  dataPoints: number;
}

/**
 * Insert a new metric reading
 */
export function insertMetric(metric: ResourceMetric): number {
  // Validate input with Zod
  const validated = ResourceMetricSchema.safeParse(metric);
  if (!validated.success) {
    throw new Error(
      `Invalid metric data: ${validated.error.issues.map((i) => i.message).join(", ")}`,
    );
  }

  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO resource_metrics
    (environment_id, cpu_percent, memory_percent, disk_percent,
     network_rx_bytes, network_tx_bytes, load_avg_1m, load_avg_5m, load_avg_15m,
     active_processes, active_connections, gpu_percent, gpu_memory_used, gpu_memory_total, gpu_temperature)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const data = validated.data;
  const result = stmt.run(
    data.environmentId,
    data.cpuPercent,
    data.memoryPercent,
    data.diskPercent,
    data.networkRxBytes ?? null,
    data.networkTxBytes ?? null,
    data.loadAvg1m ?? null,
    data.loadAvg5m ?? null,
    data.loadAvg15m ?? null,
    data.activeProcesses ?? null,
    data.activeConnections ?? null,
    data.gpuPercent ?? null,
    data.gpuMemoryUsed ?? null,
    data.gpuMemoryTotal ?? null,
    data.gpuTemperature ?? null,
  );

  return result.lastInsertRowid as number;
}

/**
 * Get metrics for an environment within a time range
 */
export function getMetrics(
  environmentId: string,
  options: {
    limit?: number;
    hours?: number;
    since?: string;
    until?: string;
  } = {},
): ResourceMetric[] {
  const db = getDb();

  let sql = "SELECT * FROM resource_metrics WHERE environment_id = ?";
  const params: any[] = [environmentId];

  if (options.since) {
    sql += " AND captured_at >= ?";
    params.push(options.since);
  } else if (options.hours) {
    sql += ' AND captured_at >= datetime("now", "-" || ? || " hours")';
    params.push(options.hours);
  }

  if (options.until) {
    sql += " AND captured_at <= ?";
    params.push(options.until);
  }

  sql += " ORDER BY captured_at DESC";

  if (options.limit) {
    sql += " LIMIT ?";
    params.push(options.limit);
  }

  const stmt = db.prepare(sql);
  const rows = stmt.all(...params) as any[];

  return rows.map((row) => {
    // Convert null to undefined for cleaner API responses
    const metric = {
      id: row.id,
      environmentId: row.environment_id,
      cpuPercent: row.cpu_percent,
      memoryPercent: row.memory_percent,
      memoryUsed: row.memory_used ?? undefined,
      memoryTotal: row.memory_total ?? undefined,
      diskPercent: row.disk_percent,
      diskUsed: row.disk_used ?? undefined,
      diskTotal: row.disk_total ?? undefined,
      gpuPercent: row.gpu_percent ?? undefined,
      gpuMemoryUsed: row.gpu_memory_used ?? undefined,
      gpuMemoryTotal: row.gpu_memory_total ?? undefined,
      networkRxBytes: row.network_rx_bytes ?? undefined,
      networkTxBytes: row.network_tx_bytes ?? undefined,
      loadAvg1m: row.load_avg_1m ?? undefined,
      loadAvg5m: row.load_avg_5m ?? undefined,
      loadAvg15m: row.load_avg_15m ?? undefined,
      activeProcesses: row.active_processes ?? undefined,
      activeConnections: row.active_connections ?? undefined,
      capturedAt: row.captured_at,
    };

    // Validate with Zod (log warnings but don't fail)
    const validated = ResourceMetricSchema.safeParse(metric);
    if (!validated.success) {
      console.warn("Metric validation warning:", validated.error.issues);
      return metric as ResourceMetric; // Return unvalidated for backward compatibility
    }

    return validated.data;
  }) as ResourceMetric[];
}

/**
 * Get latest metric for an environment
 */
export function getLatestMetric(environmentId: string): ResourceMetric | null {
  const metrics = getMetrics(environmentId, { limit: 1 });
  return metrics[0] || null;
}

/**
 * Calculate statistics for a metric type over a time period
 */
function calculateStats(values: number[]): MetricStats {
  if (values.length === 0) {
    return { avg: 0, min: 0, max: 0, count: 0 };
  }

  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  // Simple trend detection (compare first half vs second half)
  let trend: "rising" | "falling" | "stable" | undefined;
  if (values.length >= 4) {
    const mid = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, mid).slice(0, 5).reverse(); // Most recent 5 of first half
    const secondHalf = values.slice(mid).slice(0, 5); // Most recent 5 of second half
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const diff = secondAvg - firstAvg;

    if (Math.abs(diff) < 5) {
      trend = "stable";
    } else if (diff > 0) {
      trend = "rising";
    } else {
      trend = "falling";
    }
  }

  return { avg, min, max, count: values.length, trend };
}

/**
 * Get metrics summary with statistics
 */
export function getMetricsSummary(
  environmentId: string,
  hours: number = 24,
): MetricsSummary | null {
  const metrics = getMetrics(environmentId, { hours });

  if (metrics.length === 0) {
    return null;
  }

  // Reverse to get chronological order for trend calculation
  const chronological = [...metrics].reverse();

  const cpuValues = chronological.map((m) => m.cpuPercent);
  const memoryValues = chronological.map((m) => m.memoryPercent);
  const diskValues = chronological.map((m) => m.diskPercent);

  return {
    cpu: calculateStats(cpuValues),
    memory: calculateStats(memoryValues),
    disk: calculateStats(diskValues),
    period: {
      start: chronological[0].capturedAt!,
      end: chronological[chronological.length - 1].capturedAt!,
      hours,
    },
    dataPoints: metrics.length,
  };
}

/**
 * Delete old metrics (cleanup)
 */
export function deleteOldMetrics(
  environmentId: string,
  keepHours: number = 720,
): number {
  // Default: keep 30 days (720 hours)
  const db = getDb();
  const stmt = db.prepare(`
    DELETE FROM resource_metrics
    WHERE environment_id = ?
      AND captured_at < datetime("now", "-" || ? || " hours")
  `);

  const result = stmt.run(environmentId, keepHours);
  return result.changes;
}

/**
 * Get all environments with metrics
 */
export function getEnvironmentsWithMetrics(): string[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT DISTINCT environment_id
    FROM resource_metrics
    ORDER BY environment_id
  `);

  const rows = stmt.all() as any[];
  return rows.map((row) => row.environment_id);
}

// ============================================
// SSH Pool Metrics
// ============================================

export interface SSHPoolMetric {
  id?: number;
  totalConnections: number;
  connectionDetails?: string;
  capturedAt?: string;
}

/**
 * Insert SSH pool metrics (call periodically to track pool state over time)
 */
export function insertSSHPoolMetric(): number {
  const stats = getActiveSSHConnections();
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO ssh_pool_metrics
    (total_connections, connection_details)
    VALUES (?, ?)
  `);

  const connectionDetails = JSON.stringify(stats.connections);

  const result = stmt.run(stats.totalConnections, connectionDetails);

  return result.lastInsertRowid as number;
}

/**
 * Get SSH pool metrics history
 */
export function getSSHPoolMetrics(
  options: {
    limit?: number;
    hours?: number;
    since?: string;
  } = {},
): SSHPoolMetric[] {
  const db = getDb();

  let sql = "SELECT * FROM ssh_pool_metrics WHERE 1=1";
  const params: any[] = [];

  if (options.since) {
    sql += " AND captured_at >= ?";
    params.push(options.since);
  } else if (options.hours) {
    sql += ' AND captured_at >= datetime("now", "-" || ? || " hours")';
    params.push(options.hours);
  }

  sql += " ORDER BY captured_at DESC";

  if (options.limit) {
    sql += " LIMIT ?";
    params.push(options.limit);
  }

  const stmt = db.prepare(sql);
  const rows = stmt.all(...params) as any[];

  return rows.map((row) => ({
    id: row.id,
    totalConnections: row.total_connections,
    connectionDetails: row.connection_details,
    capturedAt: row.captured_at,
  }));
}

/**
 * Get latest SSH pool metric
 */
export function getLatestSSHPoolMetric(): SSHPoolMetric | null {
  const metrics = getSSHPoolMetrics({ limit: 1 });
  return metrics[0] || null;
}

/**
 * Get SSH pool metrics summary
 */
export interface SSHPoolSummary {
  avg: number;
  min: number;
  max: number;
  current: number;
  dataPoints: number;
}

export function getSSHPoolSummary(hours: number = 24): SSHPoolSummary | null {
  const metrics = getSSHPoolMetrics({ hours });

  if (metrics.length === 0) {
    return null;
  }

  const values = metrics.map((m) => m.totalConnections);

  return {
    avg: values.reduce((a, b) => a + b, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    current: metrics[0].totalConnections,
    dataPoints: metrics.length,
  };
}

/**
 * Delete old SSH pool metrics
 */
export function deleteOldSSHPoolMetrics(keepHours: number = 168): number {
  // Default: keep 7 days (168 hours)
  const db = getDb();
  const stmt = db.prepare(`
    DELETE FROM ssh_pool_metrics
    WHERE captured_at < datetime("now", "-" || ? || " hours")
  `);

  const result = stmt.run(keepHours);
  return result.changes;
}

/**
 * GPU metrics information
 */
export interface GPUMetrics {
  percent?: number;
  memoryUsed?: number;
  memoryTotal?: number;
  temperature?: number;
  name?: string;
}

/**
 * Detect and collect GPU metrics from the system
 * Supports NVIDIA (nvidia-smi), AMD (rocm-smi), and Apple Silicon
 */
export async function getGPUMetrics(): Promise<GPUMetrics | null> {
  // Try NVIDIA GPUs first
  try {
    const nvidiaResult = await Bun.spawn(["nvidia-smi", "--query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu,name", "--format=csv,noheader,nounits"], {
      stdout: "pipe",
      stderr: "pipe",
    }).exited;

    if (nvidiaResult === 0) {
      const output = await Bun.spawn(["nvidia-smi", "--query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu,name", "--format=csv,noheader,nounits"], {
        stdout: "pipe",
      }).then(proc => proc.stdout.text());

      const lines = (await output).trim().split("\n");
      if (lines.length > 0 && lines[0]) {
        const parts = lines[0].split(",");
        return {
          percent: parts[0] ? parseFloat(parts[0].trim()) : undefined,
          memoryUsed: parts[1] ? parseInt(parts[1].trim()) * 1024 * 1024 : undefined,
          memoryTotal: parts[2] ? parseInt(parts[2].trim()) * 1024 * 1024 : undefined,
          temperature: parts[3] ? parseFloat(parts[3].trim()) : undefined,
          name: parts[4] ? parts[4].trim() : "NVIDIA GPU",
        };
      }
    }
  } catch (e) {
    // nvidia-smi not available, try AMD
  }

  // Try AMD GPUs (rocm-smi)
  try {
    const amdOutput = await Bun.spawn(["rocm-smi", "--showuse", "--showmeminfo", "--showtemp", "--csv"], {
      stdout: "pipe",
    }).then(proc => proc.stdout.text());

    const output = await amdOutput;
    const lines = output.trim().split("\n");

    // Parse AMD output (format varies by version)
    for (const line of lines) {
      if (line.includes("GPU use") || line.includes("Memory use")) {
        const match = line.match(/(\d+)%/);
        if (match) {
          return {
            percent: parseFloat(match[1]),
            name: "AMD GPU",
          };
        }
      }
    }
  } catch (e) {
    // rocm-smi not available, try Apple Silicon
  }

  // Try Apple Silicon GPU (ioreg + system_profiler)
  if (process.arch === "aarch64" && process.platform === "darwin") {
    try {
      const output = await Bun.spawn(["system_profiler", "SPDisplaysDataType"], {
        stdout: "pipe",
      }).then(proc => proc.stdout.text());

      const match = output.match(/VRAM.*?(\d+)\s*MB/);
      const vramMB = match ? parseInt(match[1]) : null;

      if (vramMB) {
        return {
          memoryTotal: vramMB * 1024 * 1024,
          name: "Apple Silicon GPU",
        };
      }
    } catch (e) {
      // Apple GPU detection failed
    }
  }

  return null;
}
