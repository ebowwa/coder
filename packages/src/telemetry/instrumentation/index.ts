/**
 * Instrumentation Index - Auto-instrumentation setup
 * @module telemetry/instrumentation
 */

import { getConfig } from "../config.js";

/**
 * Initialize all instrumentation
 */
export function initializeInstrumentation(): void {
  const config = getConfig();

  if (!config.enabled) {
    return;
  }

  // Instrumentation is applied via wrapper functions
  // The actual wrapping happens at import time in the respective modules

  // Log initialization
  console.log(`[Telemetry] Initialized with exporters: ${config.exporters.join(", ")}`);
}

/**
 * Check if instrumentation is enabled
 */
export function isInstrumentationEnabled(): boolean {
  return getConfig().enabled;
}

// Re-export all instrumentation modules
export * from "./api-client.js";
export * from "./turn-executor.js";
export * from "./tool-executor.js";
export * from "./agent-loop.js";
export * from "./mcp-client.js";
