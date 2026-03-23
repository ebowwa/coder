/**
 * Aggressive Telemetry - Auto-enabled, always-on observability
 *
 * Features:
 * - Auto-instruments EVERYTHING by default
 * - No opt-in required - telemetry is always running
 * - Tracks every function call, every token, every millisecond
 * - Real-time streaming to status file
 * - Proactive anomaly detection
 * - Auto-triggers alerts on thresholds
 *
 * @module telemetry/aggressive
 */

import { performance } from "perf_hooks";
import { writeFileSync, appendFileSync, existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

// ============================================
// AGGRESSIVE CONFIG
// ============================================

export const AGGRESSIVE_CONFIG = {
  // Always enabled
  enabled: true,

  // Track everything
  trackAllFunctionCalls: true,
  trackAllMemory: true,
  trackAllTiming: true,
  trackAllTokens: true,

  // Real-time streaming
  realtimeStreaming: true,
  flushIntervalMs: 100, // Very aggressive flush

  // Proactive alerts
  alertOnHighLatency: 5000, // 5s
  alertOnHighMemory: 500 * 1024 * 1024, // 500MB
  alertOnHighErrorRate: 0.1, // 10%
  alertOnContextNearFull: 0.8, // 80%
  alertOnStuckLoop: 60000, // 60s without progress

  // Granular tracking
  tokenGranularity: true, // Track per-token timing
  toolGranularity: true, // Track sub-operations within tools
  apiGranularity: true, // Track request/response phases

  // Auto-sampling
  sampleResourcesMs: 1000, // Sample every second
  sampleContextMs: 5000, // Check context every 5s

  // Persistence
  persistToDisk: true,
  maxLogSizeMB: 100,
};

// ============================================
// REAL-TIME METRICS BUFFER
// ============================================

interface MetricPoint {
  timestamp: number;
  name: string;
  value: number;
  tags: Record<string, string>;
}

interface AggressiveTelemetryState {
  sessionId: string;
  startTime: number;

  // Counters (all time)
  turns: number;
  apiCalls: number;
  toolCalls: number;
  errors: number;
  tokens: { input: number; output: number };

  // Current state
  currentTurn: {
    startTime: number;
    tokensGenerated: number;
    toolsUsed: string[];
  } | null;

  // Recent history (last 1000)
  recentLatencies: number[];
  recentTokenRates: number[];

  // Gauges
  currentMemoryMB: number;
  currentContextPercent: number;
  currentErrorRate: number;

  // Alerts triggered
  alerts: Array<{
    timestamp: number;
    type: string;
    message: string;
    severity: "info" | "warning" | "critical";
  }>;

  // Metrics buffer for real-time streaming
  metricsBuffer: MetricPoint[];
  lastFlush: number;
}

let state: AggressiveTelemetryState | null = null;
let flushTimer: Timer | null = null;
let resourceTimer: Timer | null = null;

const TELEMETRY_DIR = join(homedir(), ".claude", "telemetry");
const CURRENT_FILE = join(TELEMETRY_DIR, "current.json");
const STREAM_FILE = join(TELEMETRY_DIR, "stream.jsonl");

// ============================================
// AUTO-INITIALIZATION
// ============================================

/**
 * Auto-initialize aggressive telemetry on import
 */
function autoInit(): void {
  if (state) return;

  // Ensure directory exists
  if (!existsSync(TELEMETRY_DIR)) {
    mkdirSync(TELEMETRY_DIR, { recursive: true });
  }

  // Initialize state
  state = {
    sessionId: `auto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    startTime: Date.now(),
    turns: 0,
    apiCalls: 0,
    toolCalls: 0,
    errors: 0,
    tokens: { input: 0, output: 0 },
    currentTurn: null,
    recentLatencies: [],
    recentTokenRates: [],
    currentMemoryMB: 0,
    currentContextPercent: 0,
    currentErrorRate: 0,
    alerts: [],
    metricsBuffer: [],
    lastFlush: Date.now(),
  };

  // Start flush timer
  flushTimer = setInterval(() => flushMetrics(), AGGRESSIVE_CONFIG.flushIntervalMs);

  // Start resource sampling
  resourceTimer = setInterval(() => sampleResources(), AGGRESSIVE_CONFIG.sampleResourcesMs);

  // Write initial state
  persistState();
}

// Auto-init on module load
autoInit();

// ============================================
// PUBLIC API
// ============================================

/**
 * Set session ID (call once at session start)
 */
export function setSession(sessionId: string): void {
  if (!state) autoInit();
  state!.sessionId = sessionId;
  persistState();
}

/**
 * Track turn start
 */
export function turnStart(): void {
  if (!state) autoInit();
  state!.turns++;
  state!.currentTurn = {
    startTime: performance.now(),
    tokensGenerated: 0,
    toolsUsed: [],
  };
  recordMetric("turn.start", 1, { turn: String(state!.turns) });
  checkAlerts();
}

/**
 * Track turn end
 */
export function turnEnd(durationMs?: number, tokens?: { input: number; output: number }): void {
  if (!state) return;

  const turnDuration = durationMs ?? (state.currentTurn ? performance.now() - state.currentTurn.startTime : 0);

  state.recentLatencies.push(turnDuration);
  if (state.recentLatencies.length > 1000) state.recentLatencies.shift();

  if (tokens) {
    state.tokens.input += tokens.input;
    state.tokens.output += tokens.output;

    // Calculate token rate
    if (turnDuration > 0) {
      const rate = (tokens.output / turnDuration) * 1000; // tokens per second
      state.recentTokenRates.push(rate);
      if (state.recentTokenRates.length > 100) state.recentTokenRates.shift();
    }
  }

  recordMetric("turn.end", turnDuration, {
    turn: String(state!.turns),
    tokens_in: String(tokens?.input ?? 0),
    tokens_out: String(tokens?.output ?? 0),
  });

  state.currentTurn = null;
  checkAlerts();
  persistState();
}

/**
 * Track API call
 */
export function apiCall(latencyMs: number, success: boolean, tokens?: { input: number; output: number }): void {
  if (!state) return;

  state.apiCalls++;

  if (tokens) {
    state.tokens.input += tokens.input;
    state.tokens.output += tokens.output;
  }

  recordMetric("api.call", latencyMs, {
    success: String(success),
    tokens_in: String(tokens?.input ?? 0),
    tokens_out: String(tokens?.output ?? 0),
  });

  // Check for high latency alert
  if (latencyMs > AGGRESSIVE_CONFIG.alertOnHighLatency) {
    triggerAlert("high_latency", `API call took ${latencyMs.toFixed(0)}ms`, "warning");
  }

  checkAlerts();
}

/**
 * Track tool call
 */
export function toolCall(toolName: string, durationMs: number, success: boolean, error?: string): void {
  if (!state) return;

  state.toolCalls++;

  if (state.currentTurn) {
    state.currentTurn.toolsUsed.push(toolName);
  }

  recordMetric("tool.call", durationMs, {
    tool: toolName,
    success: String(success),
    error: error ?? "",
  });

  if (!success) {
    state.errors++;
    state.currentErrorRate = state.toolCalls > 0 ? state.errors / state.toolCalls : 0;
  }

  checkAlerts();
}

/**
 * Track error
 */
export function error(type: string, message: string, context?: Record<string, unknown>): void {
  if (!state) return;

  state.errors++;
  state.currentErrorRate = state.toolCalls > 0 ? state.errors / state.toolCalls : 0;

  recordMetric("error", 1, {
    type,
    message: message.slice(0, 100),
    ...Object.fromEntries(Object.entries(context ?? {}).map(([k, v]) => [k, String(v)])),
  });

  triggerAlert("error", `[${type}] ${message.slice(0, 100)}`, "warning");
  checkAlerts();
}

/**
 * Track context usage
 */
export function contextUpdate(usedTokens: number, maxTokens: number): void {
  if (!state) return;

  state.currentContextPercent = (usedTokens / maxTokens) * 100;

  recordMetric("context.usage", state.currentContextPercent, {
    used: String(usedTokens),
    max: String(maxTokens),
  });

  // Alert on context near full
  if (state.currentContextPercent > AGGRESSIVE_CONFIG.alertOnContextNearFull * 100) {
    triggerAlert("context_full", `Context at ${state.currentContextPercent.toFixed(1)}% capacity`, "warning");
  }

  checkAlerts();
}

/**
 * Track memory usage
 */
export function memoryUpdate(heapUsedMB: number): void {
  if (!state) return;

  state.currentMemoryMB = heapUsedMB;

  recordMetric("memory.heap", heapUsedMB, {});

  // Alert on high memory
  if (heapUsedMB > AGGRESSIVE_CONFIG.alertOnHighMemory / (1024 * 1024)) {
    triggerAlert("high_memory", `Heap usage at ${heapUsedMB.toFixed(0)}MB`, "warning");
  }

  checkAlerts();
}

/**
 * Get current telemetry state
 */
export function getState(): AggressiveTelemetryState | null {
  return state;
}

/**
 * Get real-time metrics
 */
export function getRealtimeMetrics(): {
  sessionId: string;
  uptime: number;
  turns: number;
  apiCalls: number;
  toolCalls: number;
  errors: number;
  errorRate: number;
  tokens: { input: number; output: number };
  avgLatency: number;
  p95Latency: number;
  currentMemoryMB: number;
  currentContextPercent: number;
  activeAlerts: number;
} | null {
  if (!state) return null;

  const sortedLatencies = [...state.recentLatencies].sort((a, b) => a - b);
  const p95Index = Math.floor(sortedLatencies.length * 0.95);
  const p95 = sortedLatencies[p95Index] ?? 0;
  const avg = state.recentLatencies.length > 0
    ? state.recentLatencies.reduce((a, b) => a + b, 0) / state.recentLatencies.length
    : 0;

  return {
    sessionId: state.sessionId,
    uptime: Date.now() - state.startTime,
    turns: state.turns,
    apiCalls: state.apiCalls,
    toolCalls: state.toolCalls,
    errors: state.errors,
    errorRate: state.currentErrorRate,
    tokens: state.tokens,
    avgLatency: avg,
    p95Latency: p95,
    currentMemoryMB: state.currentMemoryMB,
    currentContextPercent: state.currentContextPercent,
    activeAlerts: state.alerts.filter(a => Date.now() - a.timestamp < 60000).length,
  };
}

/**
 * Get all alerts
 */
export function getAlerts(): AggressiveTelemetryState["alerts"] {
  return state?.alerts ?? [];
}

/**
 * Clear state (for testing)
 */
export function reset(): void {
  if (flushTimer) clearInterval(flushTimer);
  if (resourceTimer) clearInterval(resourceTimer);
  state = null;
  autoInit();
}

// ============================================
// INTERNAL FUNCTIONS
// ============================================

function recordMetric(name: string, value: number, tags: Record<string, string>): void {
  if (!state) return;

  state.metricsBuffer.push({
    timestamp: Date.now(),
    name,
    value,
    tags,
  });

  // Flush if buffer is large
  if (state.metricsBuffer.length > 1000) {
    flushMetrics();
  }
}

function flushMetrics(): void {
  if (!state || state.metricsBuffer.length === 0) return;

  const metrics = [...state.metricsBuffer];
  state.metricsBuffer = [];
  state.lastFlush = Date.now();

  if (AGGRESSIVE_CONFIG.persistToDisk) {
    try {
      for (const m of metrics) {
        appendFileSync(STREAM_FILE, JSON.stringify(m) + "\n");
      }
    } catch {
      // Ignore write errors
    }
  }
}

function sampleResources(): void {
  if (!state) return;

  const mem = process.memoryUsage();
  state.currentMemoryMB = mem.heapUsed / (1024 * 1024);

  recordMetric("resource.memory", state.currentMemoryMB, {
    heap_total: String(mem.heapTotal / (1024 * 1024)),
    rss: String(mem.rss / (1024 * 1024)),
    external: String(mem.external / (1024 * 1024)),
  });

  // Check for stuck loop
  if (state.currentTurn) {
    const turnDuration = performance.now() - state.currentTurn.startTime;
    if (turnDuration > AGGRESSIVE_CONFIG.alertOnStuckLoop) {
      triggerAlert("stuck_loop", `Turn running for ${(turnDuration / 1000).toFixed(0)}s`, "critical");
    }
  }

  persistState();
}

function checkAlerts(): void {
  if (!state) return;

  // Check error rate
  if (state.currentErrorRate > AGGRESSIVE_CONFIG.alertOnHighErrorRate) {
    const hasRecentAlert = state.alerts.some(
      a => a.type === "high_error_rate" && Date.now() - a.timestamp < 60000
    );
    if (!hasRecentAlert) {
      triggerAlert("high_error_rate", `Error rate at ${(state.currentErrorRate * 100).toFixed(1)}%`, "warning");
    }
  }
}

function triggerAlert(type: string, message: string, severity: "info" | "warning" | "critical"): void {
  if (!state) return;

  state.alerts.push({
    timestamp: Date.now(),
    type,
    message,
    severity,
  });

  // Keep only last 100 alerts
  if (state.alerts.length > 100) {
    state.alerts = state.alerts.slice(-100);
  }

  recordMetric("alert", 1, { type, severity });

  // Log critical alerts
  if (severity === "critical") {
    console.error(`[TELEMETRY ALERT] ${type}: ${message}`);
  }
}

function persistState(): void {
  if (!state || !AGGRESSIVE_CONFIG.persistToDisk) return;

  try {
    writeFileSync(CURRENT_FILE, JSON.stringify(getRealtimeMetrics(), null, 2));
  } catch {
    // Ignore write errors
  }
}

// ============================================
// AUTO-WRAP FUNCTIONS
// ============================================

/**
 * Wrap any async function with automatic telemetry
 */
export function wrapAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  name: string
): T {
  return (async (...args: Parameters<T>) => {
    const start = performance.now();
    try {
      const result = await fn(...args);
      const duration = performance.now() - start;
      recordMetric(`function.${name}`, duration, { success: "true" });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      recordMetric(`function.${name}`, duration, { success: "false" });
      throw error;
    }
  }) as T;
}

/**
 * Wrap any sync function with automatic telemetry
 */
export function wrapSync<T extends (...args: any[]) => any>(
  fn: T,
  name: string
): T {
  return ((...args: Parameters<T>) => {
    const start = performance.now();
    try {
      const result = fn(...args);
      const duration = performance.now() - start;
      recordMetric(`function.${name}`, duration, { success: "true" });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      recordMetric(`function.${name}`, duration, { success: "false" });
      throw error;
    }
  }) as T;
}

// ============================================
// DECORATOR FOR CLASSES (if using TypeScript)
// ============================================

/**
 * Decorator to auto-track method calls
 */
export function Tracked(name?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<any>
  ) {
    const original = descriptor.value;
    const metricName = name ?? `${target.constructor.name}.${propertyKey}`;

    if (typeof original === "function") {
      descriptor.value = function (...args: any[]) {
        const start = performance.now();
        try {
          const result = original.apply(this, args);

          // Handle async functions
          if (result instanceof Promise) {
            return result.then((r: any) => {
              recordMetric(`method.${metricName}`, performance.now() - start, { success: "true" });
              return r;
            }).catch((e: any) => {
              recordMetric(`method.${metricName}`, performance.now() - start, { success: "false" });
              throw e;
            });
          }

          recordMetric(`method.${metricName}`, performance.now() - start, { success: "true" });
          return result;
        } catch (error) {
          recordMetric(`method.${metricName}`, performance.now() - start, { success: "false" });
          throw error;
        }
      };
    }

    return descriptor;
  };
}

// ============================================
// EXPORT ALL
// ============================================

export const aggressiveTelemetry = {
  setSession,
  turnStart,
  turnEnd,
  apiCall,
  toolCall,
  error,
  contextUpdate,
  memoryUpdate,
  getState,
  getRealtimeMetrics,
  getAlerts,
  reset,
  wrapAsync,
  wrapSync,
  Tracked,
};

export default aggressiveTelemetry;
