/**
 * Alert System
 * Threshold-based alerting for telemetry metrics
 * @module telemetry/observability/alerts
 */

import {
  type Alert,
  type AlertRule,
  type AlertSeverity,
  DEFAULT_ALERT_RULES,
} from "./types.js";
import { getMetricsRegistry } from "../metrics.js";
import { logger } from "../logger.js";

/**
 * Active alerts
 */
const activeAlerts = new Map<string, Alert>();

/**
 * Alert rules
 */
const alertRules = new Map<string, AlertRule>();

/**
 * Alert cooldowns (last triggered time)
 */
const alertCooldowns = new Map<string, number>();

/**
 * Alert ID counter
 */
let alertIdCounter = 0;

/**
 * Generate unique alert ID
 */
function generateAlertId(): string {
  return `alert-${++alertIdCounter}-${Date.now()}`;
}

/**
 * Alert callback type
 */
export type AlertCallback = (alert: Alert) => void;

/**
 * Alert callbacks
 */
const alertCallbacks = new Set<AlertCallback>();

/**
 * Register an alert callback
 */
export function onAlert(callback: AlertCallback): () => void {
  alertCallbacks.add(callback);
  return () => alertCallbacks.delete(callback);
}

/**
 * Trigger alert callbacks
 */
function triggerCallbacks(alert: Alert): void {
  for (const callback of alertCallbacks) {
    try {
      callback(alert);
    } catch (error) {
      logger.error("Alert callback error", error);
    }
  }
}

/**
 * Add alert rule
 */
export function addAlertRule(rule: AlertRule): void {
  alertRules.set(rule.name, rule);
}

/**
 * Remove alert rule
 */
export function removeAlertRule(name: string): void {
  alertRules.delete(name);
}

/**
 * Get all alert rules
 */
export function getAlertRules(): AlertRule[] {
  return Array.from(alertRules.values());
}

/**
 * Compare value against threshold
 */
function compareValues(
  value: number,
  threshold: number,
  comparison: AlertRule["comparison"]
): boolean {
  switch (comparison) {
    case "gt":
      return value > threshold;
    case "lt":
      return value < threshold;
    case "gte":
      return value >= threshold;
    case "lte":
      return value <= threshold;
    case "eq":
      return value === threshold;
    default:
      return false;
  }
}

/**
 * Get metric value from registry
 */
function getMetricValue(metricName: string): number {
  const registry = getMetricsRegistry();
  const summary = registry.getSummary();

  const value = summary[metricName];
  if (typeof value === "number") {
    return value;
  }

  // Try to get from exported metrics
  const exported = registry.export();
  const metric = exported.find((m) => m.name === metricName);
  if (metric && metric.dataPoints.length > 0) {
    // Sum all data points
    return metric.dataPoints.reduce((sum, dp) => sum + dp.value, 0);
  }

  return 0;
}

/**
 * Check alert rules against current metrics
 */
export function checkAlerts(): Alert[] {
  const now = Date.now();
  const newAlerts: Alert[] = [];

  for (const rule of alertRules.values()) {
    if (!rule.enabled) continue;

    // Check cooldown
    const lastTriggered = alertCooldowns.get(rule.name) ?? 0;
    if (now - lastTriggered < rule.cooldownMs) continue;

    // Get current value
    const currentValue = getMetricValue(rule.metric);

    // Check threshold
    if (compareValues(currentValue, rule.threshold, rule.comparison)) {
      const alert: Alert = {
        id: generateAlertId(),
        name: rule.name,
        severity: rule.severity,
        message: `${rule.metric} ${rule.comparison} ${rule.threshold} (current: ${currentValue.toFixed(2)})`,
        threshold: rule.threshold,
        currentValue,
        timestamp: now,
        acknowledged: false,
        metadata: {
          rule: rule.name,
          metric: rule.metric,
        },
      };

      activeAlerts.set(alert.id, alert);
      alertCooldowns.set(rule.name, now);
      newAlerts.push(alert);

      // Log alert
      logger.warn(`Alert triggered: ${rule.name}`, {
        severity: rule.severity,
        metric: rule.metric,
        threshold: rule.threshold,
        currentValue,
      });

      // Trigger callbacks
      triggerCallbacks(alert);
    }
  }

  return newAlerts;
}

/**
 * Get active alerts
 */
export function getActiveAlerts(): Alert[] {
  return Array.from(activeAlerts.values())
    .filter((a) => !a.acknowledged)
    .sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Get all alerts (including acknowledged)
 */
export function getAllAlerts(): Alert[] {
  return Array.from(activeAlerts.values()).sort(
    (a, b) => b.timestamp - a.timestamp
  );
}

/**
 * Acknowledge alert
 */
export function acknowledgeAlert(alertId: string): boolean {
  const alert = activeAlerts.get(alertId);
  if (alert) {
    alert.acknowledged = true;
    return true;
  }
  return false;
}

/**
 * Clear alert
 */
export function clearAlert(alertId: string): boolean {
  return activeAlerts.delete(alertId);
}

/**
 * Clear all alerts
 */
export function clearAllAlerts(): void {
  activeAlerts.clear();
}

/**
 * Format alert severity with icon
 */
export function formatAlertSeverity(severity: AlertSeverity): string {
  switch (severity) {
    case "info":
      return "ℹ info";
    case "warning":
      return "⚠ warning";
    case "error":
      return "✗ error";
    case "critical":
      return "‼ critical";
  }
}

/**
 * Initialize alert system with default rules
 */
export function initializeAlerts(): void {
  for (const rule of DEFAULT_ALERT_RULES) {
    addAlertRule(rule);
  }
}

/**
 * Alert manager singleton
 */
export const alerts = {
  addRule: addAlertRule,
  removeRule: removeAlertRule,
  getRules: getAlertRules,
  check: checkAlerts,
  getActive: getActiveAlerts,
  getAll: getAllAlerts,
  acknowledge: acknowledgeAlert,
  clear: clearAlert,
  clearAll: clearAllAlerts,
  onAlert,
  formatSeverity: formatAlertSeverity,
  initialize: initializeAlerts,
};

export default alerts;
