/**
 * Telemetry Configuration
 * Load configuration from environment variables
 * @module telemetry/config
 */

import { TelemetryConfigSchema, type TelemetryConfig } from "./types.js";

/**
 * Default telemetry configuration
 */
export const DEFAULT_CONFIG: TelemetryConfig = {
  enabled: true,
  logLevel: "info",
  prettyPrint: true,
  tracingEnabled: true,
  samplingRate: 1.0,
  metricsEnabled: true,
  exporters: ["console"],
  includeStackTrace: true,
  flushIntervalMs: 5000,
  batchSize: 100,
};

/**
 * Parse environment variable as boolean
 */
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value === "true" || value === "1" || value === "yes";
}

/**
 * Parse environment variable as number
 */
function parseNumber(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse environment variable as array
 */
function parseArray(value: string | undefined, defaultValue: string[]): string[] {
  if (value === undefined) return defaultValue;
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

/**
 * Load telemetry configuration from environment variables
 */
export function loadConfig(): TelemetryConfig {
  const rawConfig = {
    enabled: parseBoolean(process.env.CODER_TELEMETRY_ENABLED, DEFAULT_CONFIG.enabled),
    logLevel: (process.env.CODER_TELEMETRY_LOG_LEVEL ?? DEFAULT_CONFIG.logLevel) as TelemetryConfig["logLevel"],
    prettyPrint: parseBoolean(process.env.CODER_TELEMETRY_PRETTY_PRINT, DEFAULT_CONFIG.prettyPrint),
    tracingEnabled: parseBoolean(process.env.CODER_TELEMETRY_TRACING_ENABLED, DEFAULT_CONFIG.tracingEnabled),
    samplingRate: parseNumber(process.env.CODER_TELEMETRY_SAMPLING_RATE, DEFAULT_CONFIG.samplingRate),
    metricsEnabled: parseBoolean(process.env.CODER_TELEMETRY_METRICS_ENABLED, DEFAULT_CONFIG.metricsEnabled),
    exporters: parseArray(process.env.CODER_TELEMETRY_EXPORTERS, DEFAULT_CONFIG.exporters) as TelemetryConfig["exporters"],
    otlpEndpoint: process.env.CODER_TELEMETRY_OTLP_ENDPOINT,
    filePath: process.env.CODER_TELEMETRY_FILE_PATH ?? expandPath("~/.claude/telemetry.jsonl"),
    includeStackTrace: parseBoolean(process.env.CODER_TELEMETRY_INCLUDE_STACK_TRACE, DEFAULT_CONFIG.includeStackTrace),
    flushIntervalMs: parseNumber(process.env.CODER_TELEMETRY_FLUSH_INTERVAL_MS, DEFAULT_CONFIG.flushIntervalMs),
    batchSize: parseNumber(process.env.CODER_TELEMETRY_BATCH_SIZE, DEFAULT_CONFIG.batchSize),
  };

  // Validate and parse with Zod schema
  const result = TelemetryConfigSchema.safeParse(rawConfig);
  if (!result.success) {
    console.warn(`[Telemetry] Invalid config, using defaults: ${result.error.message}`);
    return DEFAULT_CONFIG;
  }

  return result.data;
}

/**
 * Expand tilde in file path
 */
function expandPath(path: string): string {
  if (path.startsWith("~/")) {
    return path.replace("~", process.env.HOME ?? "");
  }
  return path;
}

/**
 * Global config instance (lazy loaded)
 */
let _config: TelemetryConfig | null = null;

/**
 * Get the global telemetry configuration
 */
export function getConfig(): TelemetryConfig {
  if (!_config) {
    _config = loadConfig();
  }
  return _config;
}

/**
 * Reset the global config (for testing)
 */
export function resetConfig(): void {
  _config = null;
}

/**
 * Check if telemetry is enabled
 */
export function isEnabled(): boolean {
  return getConfig().enabled;
}

/**
 * Check if tracing is enabled
 */
export function isTracingEnabled(): boolean {
  const config = getConfig();
  return config.enabled && config.tracingEnabled;
}

/**
 * Check if metrics are enabled
 */
export function isMetricsEnabled(): boolean {
  const config = getConfig();
  return config.enabled && config.metricsEnabled;
}

/**
 * Should sample this request based on sampling rate
 */
export function shouldSample(): boolean {
  const config = getConfig();
  if (config.samplingRate >= 1.0) return true;
  if (config.samplingRate <= 0) return false;
  return Math.random() < config.samplingRate;
}
