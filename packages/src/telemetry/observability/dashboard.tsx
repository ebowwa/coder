/**
 * Observability Dashboard
 * Real-time TUI dashboard for telemetry and observability
 *
 * Uses @ebowwa/tui-core for Ink components and spinner algorithms.
 * @module telemetry/observability/dashboard
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { render, useApp, useInput } from "ink";
import type { Key } from "ink";
import { Box, Text, Bold, Muted, ErrorText, Success, Warning, Info, Panel, ErrorPanel, LoadingPanel, StatusBar } from "@ebowwa/tui-core/components";
import { SPINNERS, getFrame, nextFrame } from "@ebowwa/tui-core/algorithms";

// Get spinner frames from SPINNERS
const spinnerFrames = SPINNERS.dots?.[0]?.frames ?? ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
import { useTerminalSize } from "@ebowwa/tui-core";
import {
  type SystemHealth,
  type Alert,
  type Insight,
  type PerformanceAnalysis,
  type SessionReport,
  type DashboardConfig,
  type DashboardWidget,
} from "./types.js";
import { health, formatHealthStatus, formatUptime } from "./health.js";
import { alerts, formatAlertSeverity } from "./alerts.js";
import { insights, formatInsight } from "./insights.js";
import { reports, formatSessionReport } from "./reports.js";
import { getSessionMetrics, getAllSessionSummaries } from "../instrumentation/agent-loop.js";
import { getMetricsRegistry } from "../metrics.js";
import { telemetry } from "../index.js";

// ============================================
// DASHBOARD COMPONENTS
// ============================================

interface DashboardProps {
  sessionId?: string;
  refreshInterval?: number;
  onExit?: () => void;
}

/**
 * Main Dashboard Component
 */
function ObservabilityDashboard({
  sessionId,
  refreshInterval = 1000,
  onExit,
}: DashboardProps) {
  const [healthData, setHealthData] = useState<SystemHealth | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [insightList, setInsightList] = useState<Insight[]>([]);
  const [performance, setPerformance] = useState<PerformanceAnalysis | null>(null);
  const [sessionReport, setSessionReport] = useState<SessionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [frame, setFrame] = useState(0);
  const [activeTab, setActiveTab] = useState<"overview" | "alerts" | "insights" | "session">("overview");

  const { exit } = useApp();

  // Loading animation
  useEffect(() => {
    if (!loading) return;
    const iv = setInterval(() => setFrame((f) => (f + 1) % spinnerFrames.length), 80);
    return () => clearInterval(iv);
  }, [loading]);

  // Refresh data
  useEffect(() => {
    let mounted = true;

    const refresh = async () => {
      try {
        // Get health data
        const h = await health.runAll();
        if (!mounted) return;
        setHealthData(h);

        // Check alerts
        const newAlerts = alerts.check();
        const allAlerts = alerts.getActive();
        if (!mounted) return;
        setActiveAlerts(allAlerts);

        // Generate insights
        const ins = insights.generate();
        if (!mounted) return;
        setInsightList(ins);

        // Performance analysis
        const perf = insights.analyze();
        if (!mounted) return;
        setPerformance(perf);

        // Session report
        if (sessionId) {
          const report = reports.generate(sessionId);
          if (!mounted) return;
          setSessionReport(report);
        }

        setLoading(false);
      } catch (error) {
        console.error("Dashboard refresh error:", error);
        setLoading(false);
      }
    };

    refresh();
    const iv = setInterval(refresh, refreshInterval);

    return () => {
      mounted = false;
      clearInterval(iv);
    };
  }, [sessionId, refreshInterval]);

  // Keyboard input
  useInput((input: string, key: Key) => {
    if (key.escape || (key.ctrl && input === "c")) {
      onExit?.();
      exit();
      return;
    }

    if (key.leftArrow || key.rightArrow) {
      const tabs: Array<typeof activeTab> = ["overview", "alerts", "insights", "session"];
      const idx = tabs.indexOf(activeTab);
      if (idx >= 0) {
        if (key.rightArrow) {
          setActiveTab(tabs[(idx + 1) % tabs.length]!);
        } else {
          setActiveTab(tabs[(idx - 1 + tabs.length) % tabs.length]!);
        }
      }
    }

    // Tab shortcuts
    if (input === "1") setActiveTab("overview");
    if (input === "2") setActiveTab("alerts");
    if (input === "3") setActiveTab("insights");
    if (input === "4") setActiveTab("session");

    // Acknowledge alerts
    if (input === "a" && activeTab === "alerts" && activeAlerts.length > 0 && activeAlerts[0]) {
      alerts.acknowledge(activeAlerts[0].id);
      setActiveAlerts(alerts.getActive());
    }

    // Clear all alerts
    if (input === "c" && activeTab === "alerts") {
      alerts.clearAll();
      setActiveAlerts([]);
    }
  });

  if (loading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text dim>{spinnerFrames[frame]} Loading observability data...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Coder Observability Dashboard
        </Text>
        <Text dim> | Tab: {activeTab} | </Text>
        <Text dim>Uptime: {healthData ? formatUptime(healthData.uptime) : "unknown"}</Text>
      </Box>

      {/* Tab bar */}
      <Box marginBottom={1}>
        <TabButton active={activeTab === "overview"} label="Overview" shortcut="1" />
        <TabButton active={activeTab === "alerts"} label="Alerts" shortcut="2" count={activeAlerts.length} />
        <TabButton active={activeTab === "insights"} label="Insights" shortcut="3" count={insightList.length} />
        <TabButton active={activeTab === "session"} label="Session" shortcut="4" />
      </Box>

      {/* Content */}
      {activeTab === "overview" && (
        <OverviewTab health={healthData} performance={performance} />
      )}

      {activeTab === "alerts" && (
        <AlertsTab alerts={activeAlerts} />
      )}

      {activeTab === "insights" && (
        <InsightsTab insights={insightList} />
      )}

      {activeTab === "session" && (
        <SessionTab report={sessionReport} sessionId={sessionId} />
      )}

      {/* Footer */}
      <Box marginTop={1}>
        <Text dim>
          ←→ Switch tabs | a: Acknowledge | c: Clear alerts | ESC: Exit
        </Text>
      </Box>
    </Box>
  );
}

/**
 * Tab button component
 */
function TabButton({
  active,
  label,
  shortcut,
  count,
}: {
  active: boolean;
  label: string;
  shortcut: string;
  count?: number;
}) {
  return (
    <Box marginRight={2}>
      <Text
        bold={active}
        color={active ? "cyan" : "gray"}
        inverse={active}
      >
        {shortcut}:{label}
        {count !== undefined && count > 0 && ` (${count})`}
      </Text>
    </Box>
  );
}

/**
 * Overview tab content
 */
function OverviewTab({
  health,
  performance,
}: {
  health: SystemHealth | null;
  performance: PerformanceAnalysis | null;
}) {
  if (!health) {
    return <Text dim>No health data available</Text>;
  }

  return (
    <Box flexDirection="column">
      {/* Health Status */}
      <Box marginBottom={1}>
        <Text bold>Health: </Text>
        <Text
          color={
            health.status === "healthy"
              ? "green"
              : health.status === "degraded"
              ? "yellow"
              : "red"
          }
        >
          {formatHealthStatus(health.status)}
        </Text>
      </Box>

      {/* Components */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold underline>
          Components:
        </Text>
        {health.components.map((comp) => (
          <Box key={comp.name}>
            <Text
              color={
                comp.status === "healthy"
                  ? "green"
                  : comp.status === "degraded"
                  ? "yellow"
                  : "red"
              }
            >
              {comp.status === "healthy" ? "✓" : comp.status === "degraded" ? "⚠" : "✗"}{" "}
              {comp.name}
            </Text>
            {comp.message && <Text dim> - {comp.message}</Text>}
          </Box>
        ))}
      </Box>

      {/* Performance Metrics */}
      {performance && (
        <Box flexDirection="column">
          <Text bold underline>
            Performance:
          </Text>
          <Text>
            Avg Latency: {performance.avgLatency.toFixed(0)}ms | P95:{" "}
            {performance.p95Latency.toFixed(0)}ms
          </Text>
          <Text>
            Avg TTFT: {performance.avgTTFT.toFixed(0)}ms | Error Rate:{" "}
            {performance.errorRate.toFixed(1)}%
          </Text>
          <Text>
            Cache Hit: {performance.cacheHitRate.toFixed(1)}% | Cost/Req: $
            {performance.costPerRequest.toFixed(4)}
          </Text>
        </Box>
      )}
    </Box>
  );
}

/**
 * Alerts tab content
 */
function AlertsTab({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) {
    return (
      <Box>
        <Text color="green">✓ No active alerts</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold underline>
        Active Alerts ({alerts.length}):
      </Text>
      {alerts.slice(0, 10).map((alert) => (
        <Box key={alert.id} flexDirection="column" marginBottom={1}>
          <Text
            color={
              alert.severity === "critical"
                ? "red"
                : alert.severity === "error"
                ? "red"
                : alert.severity === "warning"
                ? "yellow"
                : "blue"
            }
          >
            [{alert.severity.toUpperCase()}] {alert.name}
          </Text>
          <Text dim>  {alert.message}</Text>
          <Text dim>
            {"  "}
            Threshold: {alert.threshold} | Current: {alert.currentValue.toFixed(2)}
          </Text>
        </Box>
      ))}
    </Box>
  );
}

/**
 * Insights tab content
 */
function InsightsTab({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) {
    return (
      <Box>
        <Text color="green">✓ No insights - system performing well</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold underline>
        Performance Insights ({insights.length}):
      </Text>
      {insights.map((insight) => (
        <Box key={insight.id} flexDirection="column" marginBottom={1}>
          <Text
            color={
              insight.impact === "high"
                ? "red"
                : insight.impact === "medium"
                ? "yellow"
                : "green"
            }
          >
            [{insight.category.toUpperCase()}] {insight.title}
          </Text>
          <Text dim>  {insight.description}</Text>
          <Text color="cyan">  → {insight.recommendation}</Text>
        </Box>
      ))}
    </Box>
  );
}

/**
 * Session tab content
 */
function SessionTab({
  report,
  sessionId,
}: {
  report: SessionReport | null;
  sessionId?: string;
}) {
  const metrics = sessionId ? getSessionMetrics(sessionId) : null;

  if (!report && !metrics) {
    return (
      <Box>
        <Text dim>No session data available</Text>
      </Box>
    );
  }

  if (report) {
    // Format report as text lines
    const lines = formatSessionReport(report).split("\n");

    return (
      <Box flexDirection="column">
        {lines.slice(0, 25).map((line, i) => (
          <Text key={i}>{line}</Text>
        ))}
      </Box>
    );
  }

  // Fallback to metrics display
  if (metrics) {
    return (
      <Box flexDirection="column">
        <Text bold underline>
          Session: {sessionId?.slice(0, 8)}...
        </Text>
        <Text>Turns: {metrics.turnCount}</Text>
        <Text>API Calls: {metrics.apiCallCount}</Text>
        <Text>Tool Calls: {metrics.toolCallCount}</Text>
        <Text>Cost: ${metrics.totalCostUSD.toFixed(4)}</Text>
        <Text>
          Tokens: {metrics.totalInputTokens} in / {metrics.totalOutputTokens} out
        </Text>
        {metrics.avgTTFT && <Text>Avg TTFT: {metrics.avgTTFT.toFixed(0)}ms</Text>}
      </Box>
    );
  }

  return null;
}

// ============================================
// EXPORTS
// ============================================

export {
  ObservabilityDashboard,
  type DashboardProps,
};

/**
 * Start observability dashboard
 */
export function startDashboard(
  sessionId?: string,
  options?: { refreshInterval?: number }
): void {
  render(
    <ObservabilityDashboard
      sessionId={sessionId}
      refreshInterval={options?.refreshInterval}
    />
  );
}

/**
 * Dashboard manager singleton
 */
export const dashboard = {
  start: startDashboard,
};

export default dashboard;
