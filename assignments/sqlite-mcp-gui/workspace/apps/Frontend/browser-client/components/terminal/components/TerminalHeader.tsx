import React from "react";
import { Environment, getEnvRegionName } from "../../../../../../../../@ebowwa/codespaces-types/compile";

interface TerminalHeaderProps {
  environment: Environment;
  connected: boolean;
  isBooting: boolean;
  bootRetryCount: number;
  error: string | null;
  isMinimized: boolean;
  onMinimizeToggle: () => void;
  onClose: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "running":
      return "var(--success)";
    case "stopped":
      return "var(--text-tertiary)";
    case "creating":
      return "var(--warning)";
    case "deleting":
      return "var(--error)";
    default:
      return "var(--text-secondary)";
  }
};

const formatUptime = (hoursActive?: number) => {
  if (!hoursActive) return "N/A";
  const hours = Math.floor(hoursActive);
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (days > 0) {
    return `${days}d ${remainingHours}h`;
  }
  return `${remainingHours}h`;
};

export function TerminalHeader({
  environment,
  connected,
  isBooting,
  bootRetryCount,
  error,
  isMinimized,
  onMinimizeToggle,
  onClose,
}: TerminalHeaderProps) {
  return (
    <div className="terminal-header">
      <div className="terminal-header-main">
        <div className="terminal-title">
          <span className="terminal-icon">⌘</span>
          <span className="terminal-name">{environment.name}</span>
          <span
            className="terminal-status-indicator"
            style={{ color: getStatusColor(environment.status) }}
          >
            ● {environment.status}
          </span>
          {connected && (
            <span className="terminal-status connected">Connected</span>
          )}
          {!connected && isBooting && (
            <span className="terminal-status connecting">
              ⏳ Server booting... ({bootRetryCount}/12)
            </span>
          )}
          {!connected && !isBooting && error && (
            <span className="terminal-status error">{error}</span>
          )}
          {!connected && !isBooting && !error && (
            <span className="terminal-status connecting">Connecting...</span>
          )}
        </div>

        <div className="terminal-info">
          <div className="terminal-info-item">
            <span className="terminal-info-label">Server:</span>
            <span className="terminal-info-value">{environment.serverType}</span>
          </div>
          <div className="terminal-info-item">
            <span className="terminal-info-label">Region:</span>
            <span className="terminal-info-value">{getEnvRegionName(environment)}</span>
          </div>
          <div className="terminal-info-item">
            <span className="terminal-info-label">IPv4:</span>
            <span className="terminal-info-value terminal-ip">{environment.ipv4}</span>
          </div>
          {environment.ipv6 && (
            <div className="terminal-info-item">
              <span className="terminal-info-label">IPv6:</span>
              <span className="terminal-info-value terminal-ip">{environment.ipv6}</span>
            </div>
          )}
          {environment.environmentType && (
            <div className="terminal-info-item">
              <span className="terminal-info-label">Type:</span>
              <span className="terminal-info-value">{environment.environmentType}</span>
            </div>
          )}
          {environment.hoursActive !== undefined && (
            <div className="terminal-info-item">
              <span className="terminal-info-label">Uptime:</span>
              <span className="terminal-info-value">{formatUptime(environment.hoursActive)}</span>
            </div>
          )}
          {environment.resources && (
            <div className="terminal-resources">
              <div className="terminal-resource-item">
                <span className="terminal-resource-label">CPU:</span>
                <span className="terminal-resource-value">{environment.resources.cpuPercent}%</span>
              </div>
              <div className="terminal-resource-item">
                <span className="terminal-resource-label">RAM:</span>
                <span className="terminal-resource-value">
                  {environment.resources.memoryUsed} / {environment.resources.memoryTotal}
                </span>
              </div>
              <div className="terminal-resource-item">
                <span className="terminal-resource-label">Disk:</span>
                <span className="terminal-resource-value">
                  {environment.resources.diskUsed} / {environment.resources.diskTotal}
                </span>
              </div>
            </div>
          )}
          {isMinimized && (
            <span className="terminal-minimized-hint">Click restore to expand</span>
          )}
        </div>
      </div>

      <div className="terminal-header-actions">
        <button
          className={`terminal-minimize ${isMinimized ? "restore" : ""}`}
          onClick={onMinimizeToggle}
          title={isMinimized ? "Restore" : "Minimize"}
        >
          {isMinimized ? "⬆" : "⬇"}
        </button>
        <button className="terminal-close" onClick={onClose} title="Close Terminal">
          ✕
        </button>
      </div>
    </div>
  );
}
