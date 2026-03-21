/**
 * Health Check System
 * Monitor system health and component status
 * @module telemetry/observability/health
 */

import {
  type HealthStatus,
  type ComponentHealth,
  type SystemHealth,
} from "./types.js";
import { getConfig } from "../config.js";
import { getVersion } from "../../core/version.js";

/**
 * Health check function type
 */
export type HealthCheckFn = () => Promise<ComponentHealth>;

/**
 * Registered health checks
 */
const healthChecks = new Map<string, HealthCheckFn>();

/**
 * Last health check results cache
 */
const lastResults = new Map<string, ComponentHealth>();

/**
 * System start time
 */
const startTime = Date.now();

/**
 * Register a health check
 */
export function registerHealthCheck(
  name: string,
  checkFn: HealthCheckFn
): void {
  healthChecks.set(name, checkFn);
}

/**
 * Unregister a health check
 */
export function unregisterHealthCheck(name: string): void {
  healthChecks.delete(name);
  lastResults.delete(name);
}

/**
 * Run a single health check
 */
async function runHealthCheck(name: string): Promise<ComponentHealth> {
  const checkFn = healthChecks.get(name);
  if (!checkFn) {
    return {
      name,
      status: "unhealthy",
      message: "Health check not found",
      lastCheck: Date.now(),
    };
  }

  const checkStart = performance.now();
  try {
    const result = await checkFn();
    lastResults.set(name, result);
    return result;
  } catch (error) {
    const result: ComponentHealth = {
      name,
      status: "unhealthy",
      message: error instanceof Error ? error.message : "Health check failed",
      lastCheck: Date.now(),
    };
    lastResults.set(name, result);
    return result;
  }
}

/**
 * Run all health checks
 */
export async function runAllHealthChecks(): Promise<SystemHealth> {
  const checks = Array.from(healthChecks.keys());
  const results = await Promise.all(checks.map(runHealthCheck));

  // Determine overall status
  let overallStatus: HealthStatus = "healthy";
  for (const result of results) {
    if (result.status === "unhealthy") {
      overallStatus = "unhealthy";
      break;
    } else if (result.status === "degraded") {
      overallStatus = "degraded";
    }
  }

  return {
    status: overallStatus,
    components: results,
    uptime: Date.now() - startTime,
    version: getVersion(),
    timestamp: Date.now(),
  };
}

/**
 * Get cached health check results
 */
export function getCachedHealth(): SystemHealth {
  const components = Array.from(lastResults.values());

  // Determine overall status from cached results
  let overallStatus: HealthStatus = "healthy";
  for (const result of components) {
    if (result.status === "unhealthy") {
      overallStatus = "unhealthy";
      break;
    } else if (result.status === "degraded") {
      overallStatus = "degraded";
    }
  }

  return {
    status: overallStatus,
    components,
    uptime: Date.now() - startTime,
    version: getVersion(),
    timestamp: Date.now(),
  };
}

/**
 * Format health status with icon
 */
export function formatHealthStatus(status: HealthStatus): string {
  switch (status) {
    case "healthy":
      return "✓ healthy";
    case "degraded":
      return "⚠ degraded";
    case "unhealthy":
      return "✗ unhealthy";
  }
}

/**
 * Get uptime in human-readable format
 */
export function formatUptime(uptimeMs: number): string {
  const seconds = Math.floor(uptimeMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// ============================================
// BUILT-IN HEALTH CHECKS
// ============================================

/**
 * API connectivity health check
 */
export async function checkApiHealth(): Promise<ComponentHealth> {
  const config = getConfig();
  const start = performance.now();

  // Check if API key is configured
  const hasApiKey = !!process.env.API_KEY || !!process.env.ANTHROPIC_API_KEY;

  return {
    name: "api",
    status: hasApiKey ? "healthy" : "degraded",
    message: hasApiKey ? "API key configured" : "No API key configured",
    lastCheck: Date.now(),
    latencyMs: performance.now() - start,
    details: {
      telemetryEnabled: config.enabled,
    },
  };
}

/**
 * Memory health check
 */
export async function checkMemoryHealth(): Promise<ComponentHealth> {
  const memUsage = process.memoryUsage();
  const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
  const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
  const usagePercent = (heapUsedMB / heapTotalMB) * 100;

  let status: HealthStatus = "healthy";
  let message = `Heap: ${heapUsedMB.toFixed(1)}MB / ${heapTotalMB.toFixed(1)}MB (${usagePercent.toFixed(1)}%)`;

  if (usagePercent > 90) {
    status = "unhealthy";
    message += " - Critical memory usage";
  } else if (usagePercent > 75) {
    status = "degraded";
    message += " - High memory usage";
  }

  return {
    name: "memory",
    status,
    message,
    lastCheck: Date.now(),
    details: {
      heapUsedMB,
      heapTotalMB,
      usagePercent,
      rssMB: memUsage.rss / 1024 / 1024,
      externalMB: memUsage.external / 1024 / 1024,
    },
  };
}

/**
 * Telemetry health check
 */
export async function checkTelemetryHealth(): Promise<ComponentHealth> {
  const config = getConfig();

  return {
    name: "telemetry",
    status: config.enabled ? "healthy" : "degraded",
    message: config.enabled
      ? `Telemetry enabled (level: ${config.logLevel})`
      : "Telemetry disabled",
    lastCheck: Date.now(),
    details: {
      enabled: config.enabled,
      tracing: config.tracingEnabled,
      metrics: config.metricsEnabled,
    },
  };
}

/**
 * Initialize built-in health checks
 */
export function initializeHealthChecks(): void {
  registerHealthCheck("api", checkApiHealth);
  registerHealthCheck("memory", checkMemoryHealth);
  registerHealthCheck("telemetry", checkTelemetryHealth);
}

/**
 * Health check manager singleton
 */
export const health = {
  register: registerHealthCheck,
  unregister: unregisterHealthCheck,
  runAll: runAllHealthChecks,
  getCached: getCachedHealth,
  formatStatus: formatHealthStatus,
  formatUptime,
  initialize: initializeHealthChecks,
};

export default health;
