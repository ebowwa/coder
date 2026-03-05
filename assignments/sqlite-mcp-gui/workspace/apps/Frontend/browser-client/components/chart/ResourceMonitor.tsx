import React from "react";
import { Environment } from "../../../../../../../@ebowwa/codespaces-types/compile";

interface ResourceMonitorProps {
  environment: Environment;
  onRefresh?: (id: string) => void;
  refreshing?: boolean;
}

export function ResourceMonitor({
  environment,
  onRefresh,
  refreshing,
}: ResourceMonitorProps) {
  if (environment.status !== "running") {
    return null;
  }

  // Don't show if no resources data available
  if (!environment.resources) {
    return null;
  }

  const {
    cpuPercent,
    memoryPercent,
    diskPercent,
    memoryUsed,
    memoryTotal,
    diskUsed,
    diskTotal,
    gpuPercent,
    gpuMemoryUsed,
    gpuMemoryTotal,
    lastUpdated,
  } = environment.resources;

  // Check if resources are still loading (all zeros indicates initial fetch)
  const isLoading =
    cpuPercent === 0 && memoryPercent === 0 && diskPercent === 0;

  const hasGPU =
    gpuPercent !== undefined &&
    gpuMemoryUsed !== undefined &&
    gpuMemoryTotal !== undefined;

  // Format the last updated time
  const formatLastUpdated = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);

    if (seconds < 60) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getIdentityColor = (label: string) => {
    switch (label.toLowerCase()) {
      case "cpu":
        return "#22c55e";
      case "memory":
        return "#8b5cf6";
      case "disk":
        return "#3b82f6";
      case "gpu":
        return "#f97316";
      default:
        return "#6b7280";
    }
  };

  const ProgressBar = ({
    label,
    percent,
    used,
    total,
    loading,
  }: {
    label: string;
    percent: number;
    used: string;
    total: string;
    loading?: boolean;
  }) => (
    <div className="resource-item">
      <div className="resource-header">
        <span className="resource-label">{label}</span>
        <span className="resource-value">
          {loading ? "..." : `${percent}%`}
        </span>
      </div>
      <div className="resource-bar-bg">
        <div
          className={`resource-bar-fill ${loading ? "loading" : ""}`}
          style={{
            width: loading ? "100%" : `${Math.min(percent, 100)}%`,
            backgroundColor: loading ? "transparent" : getIdentityColor(label),
          }}
        />
      </div>
      <div className="resource-detail">
        {loading ? "Fetching..." : `${used} / ${total}`}
      </div>
    </div>
  );

  return (
    <div className="resource-monitor">
      <div className="resource-header-row">
        <div className="resource-title">Resources</div>
        {lastUpdated && (
          <span className="resource-updated">
            {formatLastUpdated(lastUpdated)}
          </span>
        )}
        {onRefresh && (
          <button
            className="resource-refresh-btn"
            onClick={() => onRefresh(environment.id)}
            disabled={refreshing}
            title="Refresh resource data"
          >
            {refreshing ? "⟳" : "↻"}
          </button>
        )}
      </div>
      <ProgressBar
        label="CPU"
        percent={cpuPercent}
        used={`${cpuPercent}%`}
        total="100%"
        loading={isLoading}
      />
      <ProgressBar
        label="Memory"
        percent={memoryPercent}
        used={memoryUsed}
        total={memoryTotal}
        loading={isLoading}
      />
      <ProgressBar
        label="Disk"
        percent={diskPercent}
        used={diskUsed}
        total={diskTotal}
        loading={isLoading}
      />
      {hasGPU && (
        <ProgressBar
          label="GPU"
          percent={gpuPercent!}
          used={gpuMemoryUsed!}
          total={gpuMemoryTotal!}
          loading={isLoading}
        />
      )}
    </div>
  );
}
