import React, { useEffect, useState, useMemo } from "react";
import { Environment } from "../../../../../../../@ebowwa/codespaces-types/compile";
import { useMetrics, fetchMetrics } from "../../hooks/useMetrics";

interface ResourceChartProps {
  environment: Environment;
}

interface ResourceHistory {
  timestamp: number;
  cpu: number;
  memory: number;
  disk: number;
  gpu?: number;
}

// Helper function to format time range intelligently
function formatTimeRange(startTimestamp: number, endTimestamp: number): string {
  const durationMs = endTimestamp - startTimestamp;
  const durationSec = Math.floor(durationMs / 1000);
  const durationMin = Math.floor(durationSec / 60);
  const durationHour = Math.floor(durationMin / 60);
  const durationDay = Math.floor(durationHour / 24);

  if (durationSec < 60) {
    return `Last ${durationSec}s`;
  } else if (durationMin < 60) {
    return `Last ${durationMin}m`;
  } else if (durationHour < 24) {
    return `Last ${durationHour}h`;
  } else {
    return `Last ${durationDay}d`;
  }
}

// Helper function to format timestamp markers
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function ResourceChart({ environment }: ResourceChartProps) {
  // Use metrics API to fetch historical data
  const { metrics, loading } = useMetrics(environment.status === "running" ? environment.id : null, {
    hours: 24,
    limit: 100,
  })

  // Use state with a hash key to prevent unnecessary updates
  const [history, setHistory] = useState<ResourceHistory[]>([])
  const [historyKey, setHistoryKey] = useState<string>('')

  // Also keep the current real-time data point (from environment.resources)
  const [currentDataPoint, setCurrentDataPoint] = useState<ResourceHistory | null>(null)

  // Update current data point when resources change
  useEffect(() => {
    if (environment.resources) {
      setCurrentDataPoint({
        timestamp: Date.now(),
        cpu: environment.resources.cpuPercent,
        memory: environment.resources.memoryPercent,
        disk: environment.resources.diskPercent,
        gpu: environment.resources.gpuPercent,
      })
    }
  }, [environment.resources?.cpuPercent, environment.resources?.memoryPercent, environment.resources?.diskPercent, environment.resources?.gpuPercent])

  // Compute history from metrics (only when metrics actually change)
  useEffect(() => {
    if (!metrics || metrics.length === 0) {
      setHistory([])
      setHistoryKey('')
      return
    }

    // Create a hash of metrics data to detect actual changes
    const newMetricsHash = JSON.stringify(metrics.map(m => ({
      ts: m.capturedAt,
      c: m.cpuPercent,
      m: m.memoryPercent,
      d: m.diskPercent,
      g: m.gpuPercent,
    })))

    if (newMetricsHash === historyKey) {
      return // Metrics haven't actually changed
    }

    // Handle SQLite datetime format (YYYY-MM-DD HH:MM:SS) and ISO format
    const parseTimestamp = (dateStr: string): number => {
      const parsed = new Date(dateStr)
      if (!isNaN(parsed.getTime())) {
        return parsed.getTime()
      }
      const sqliteMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/)
      if (sqliteMatch) {
        const [, year, month, day, hour, minute, second] = sqliteMatch
        return new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hour),
          parseInt(minute),
          parseInt(second)
        ).getTime()
      }
      return Date.now()
    }

    const apiHistory: ResourceHistory[] = metrics
      .filter(m => m != null && m.capturedAt != null)
      .map(m => ({
        timestamp: parseTimestamp(m.capturedAt),
        cpu: m.cpuPercent ?? 0,
        memory: m.memoryPercent ?? 0,
        disk: m.diskPercent ?? 0,
        gpu: m.gpuPercent,
      }))
      .filter(h => !isNaN(h.timestamp))

    // Add current real-time data point if available and newer than last API point
    let newHistory: ResourceHistory[]
    if (currentDataPoint && apiHistory.length > 0) {
      const lastApiTimestamp = apiHistory[apiHistory.length - 1].timestamp
      if (currentDataPoint.timestamp > lastApiTimestamp) {
        newHistory = [...apiHistory, currentDataPoint]
      } else {
        newHistory = apiHistory
      }
    } else if (currentDataPoint) {
      newHistory = [currentDataPoint]
    } else {
      newHistory = apiHistory
    }

    setHistory(newHistory)
    setHistoryKey(newMetricsHash)
  }, [metrics, currentDataPoint])

  // Calculate time range (must be before early return to maintain hook order)
  const timeRange = useMemo(() => {
    if (history.length < 2) return ''
    const start = history[0].timestamp;
    const end = history[history.length - 1].timestamp;
    return formatTimeRange(start, end);
  }, [historyKey, history.length]);

  // Calculate time markers at 25%, 50%, 75% of X-axis (must be before early return)
  const timeMarkers = useMemo(() => {
    if (history.length < 2) return []
    const markers: Array<{
      position: number;
      timestamp: number;
      label: string;
    }> = [];
    const positions = [0.25, 0.5, 0.75];

    for (const pos of positions) {
      const index = Math.floor(pos * (history.length - 1));
      const dataPoint = history[index];
      if (dataPoint) {
        markers.push({
          position: pos,
          timestamp: dataPoint.timestamp,
          label: formatTimestamp(dataPoint.timestamp),
        });
      }
    }

    return markers;
  }, [historyKey, history.length]);

  // Early return after all hooks are declared
  if (
    !environment.resources ||
    environment.status !== "running" ||
    history.length < 2
  ) {
    return null;
  }

  return (
    <div className="resource-chart">
      <div className="chart-title">
        Resource Usage ({history.length} pts) · {timeRange}
      </div>
      <div className="chart-container">
        <div className="chart-content">
          <svg viewBox="0 0 120 50" className="chart-svg">
            {/* CPU line */}
            <polyline
              className="chart-line chart-cpu"
              fill="none"
              points={history
                .map((h, i) => {
                  const x = 20 + (i / (history.length - 1)) * 100;
                  const y = 50 - (h.cpu / 100) * 50;
                  return `${x},${y}`;
                })
                .join(" ")}
            />
            {/* Memory line */}
            <polyline
              className="chart-line chart-memory"
              fill="none"
              points={history
                .map((h, i) => {
                  const x = 20 + (i / (history.length - 1)) * 100;
                  const y = 50 - (h.memory / 100) * 50;
                  return `${x},${y}`;
                })
                .join(" ")}
            />
            {/* Disk line */}
            <polyline
              className="chart-line chart-disk"
              fill="none"
              points={history
                .map((h, i) => {
                  const x = 20 + (i / (history.length - 1)) * 100;
                  const y = 50 - (h.disk / 100) * 50;
                  return `${x},${y}`;
                })
                .join(" ")}
            />
            {/* GPU line - only render if GPU data exists */}
            {history.some(h => h.gpu != null) && (
              <polyline
                className="chart-line chart-gpu"
                fill="none"
                points={history
                  .map((h, i) => {
                    const x = 20 + (i / (history.length - 1)) * 100;
                    const y = h.gpu != null ? 50 - (h.gpu / 100) * 50 : null;
                    return y != null ? `${x},${y}` : null;
                  })
                  .filter(p => p != null)
                  .join(" ")}
              />
            )}
            {/* Grid lines with varying opacity */}
            {/* 100% line (top) */}
            <line
              x1="20"
              y1="0"
              x2="120"
              y2="0"
              className="chart-grid chart-grid-primary"
              strokeOpacity="0.3"
            />
            {/* 75% line */}
            <line
              x1="20"
              y1="12.5"
              x2="120"
              y2="12.5"
              className="chart-grid chart-grid-secondary"
              strokeDasharray="2,2"
              strokeOpacity="0.2"
            />
            {/* 50% line (middle) */}
            <line
              x1="20"
              y1="25"
              x2="120"
              y2="25"
              className="chart-grid chart-grid-primary"
              strokeDasharray="2,2"
              strokeOpacity="0.3"
            />
            {/* 25% line */}
            <line
              x1="20"
              y1="37.5"
              x2="120"
              y2="37.5"
              className="chart-grid chart-grid-secondary"
              strokeDasharray="2,2"
              strokeOpacity="0.2"
            />
            {/* 0% line (bottom) */}
            <line
              x1="20"
              y1="50"
              x2="120"
              y2="50"
              className="chart-grid chart-grid-primary"
              strokeOpacity="0.3"
            />
          </svg>
          {/* Y-axis labels */}
          <div className="chart-y-axis-labels">
            <span className="y-axis-label">100%</span>
            <span className="y-axis-label">75%</span>
            <span className="y-axis-label">50%</span>
            <span className="y-axis-label">25%</span>
            <span className="y-axis-label">0%</span>
          </div>
        </div>
        {/* X-axis time markers */}
        {history.length > 4 && (
          <div className="chart-x-axis-markers">
            {timeMarkers.map((marker, index) => (
              <span
                key={index}
                className="time-marker"
                style={{ left: `${marker.position * 100}%` }}
              >
                {marker.label}
              </span>
            ))}
          </div>
        )}
        <div className="chart-legend">
          <span className="legend-item">
            <span className="legend-dot chart-cpu"></span> CPU
          </span>
          <span className="legend-item">
            <span className="legend-dot chart-memory"></span> Memory
          </span>
          <span className="legend-item">
            <span className="legend-dot chart-disk"></span> Disk
          </span>
          {history.some(h => h.gpu != null) && (
            <span className="legend-item">
              <span className="legend-dot chart-gpu"></span> GPU
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
