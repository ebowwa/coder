/**
 * NodeServices Component
 *
 * Displays Node Agent status, active Ralph Loops, worktrees, and resource usage
 * for a single environment/node.
 */

import React, { useState, useEffect } from "react";
import { NodeAgentInfo, NodeAgentStatus, RalphLoop } from "../../../../../../../@ebowwa/codespaces-types/compile";

interface NodeServicesProps {
  environmentId: string;
}

export function NodeServices({ environmentId }: NodeServicesProps) {
  const [nodeAgent, setNodeAgent] = useState<NodeAgentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch Node Agent status on mount and every 30 seconds
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/environments/${environmentId}/node-agent`);

        // Get response text first for debugging
        const text = await response.text();
        console.log("Node Agent response:", text);

        // Try to parse as JSON
        let data;
        try {
          data = JSON.parse(text);
        } catch (parseErr) {
          throw new Error(`Invalid JSON response: ${text.slice(0, 200)}`);
        }

        if (data.success) {
          setNodeAgent(data.nodeAgent);
          setError(null);
        } else {
          setError(data.error || "Failed to fetch Node Agent status");
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30s

    return () => clearInterval(interval);
  }, [environmentId]);

  // Render loading state
  if (loading) {
    return (
      <div className="detail-section">
        <h3>Node Services</h3>
        <div className="node-services-loading">Loading Node Agent status...</div>
      </div>
    );
  }

  // Render error state
  if (error && !nodeAgent) {
    return (
      <div className="detail-section">
        <h3>Node Services</h3>
        <div className="node-services-error">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const status = nodeAgent?.status;
  const running = nodeAgent?.running ?? false;

  return (
    <div className="detail-section">
      <h3>Node Services</h3>

      {/* Node Agent Status */}
      <div className="node-agent-status">
        <div className={`status-indicator ${running ? "running" : "offline"}`}>
          <span className="status-dot" />
          <span className="status-text">
            Node Agent {running ? `Running (port ${nodeAgent?.port || 8911})` : "Not Running"}
          </span>
        </div>
        {nodeAgent?.lastChecked && (
          <span className="last-checked">
            Last checked: {new Date(nodeAgent.lastChecked).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Active Loops & Worktrees Count */}
      {status && (
        <div className="node-services-summary">
          <div className="summary-item">
            <span className="summary-label">Active Loops</span>
            <span className="summary-value">{status.ralph_loops?.length || 0}</span>
          </div>
          {/* TODO: Worktrees not verified/tested yet - node-agent returns empty array */}
          <div className="summary-item">
            <span className="summary-label">Worktrees</span>
            <span className="summary-value">{status.worktrees?.length || 0}</span>
          </div>
        </div>
      )}

      {/* Resource Usage */}
      {status?.capacity && (
        <div className="node-resources">
          <div className="resource-bar">
            <span className="resource-label">CPU</span>
            <div className="resource-track">
              <div
                className="resource-fill cpu"
                style={{ width: `${status.capacity.cpu_percent}%` }}
              />
            </div>
            <span className="resource-value">{status.capacity.cpu_percent}%</span>
          </div>
          <div className="resource-bar">
            <span className="resource-label">Memory</span>
            <div className="resource-track">
              <div
                className="resource-fill memory"
                style={{ width: `${status.capacity.memory_percent}%` }}
              />
            </div>
            <span className="resource-value">{status.capacity.memory_percent}%</span>
          </div>
          <div className="resource-bar">
            <span className="resource-label">Disk</span>
            <div className="resource-track">
              <div
                className="resource-fill disk"
                style={{ width: `${status.capacity.disk_percent}%` }}
              />
            </div>
            <span className="resource-value">{status.capacity.disk_percent}%</span>
          </div>
        </div>
      )}

      {/* Active Ralph Loops List */}
      {/* TODO: Add click-to-view functionality for Ralph loop logs */}
      {/* TODO: Add live-updating subtask status (poll node-agent more frequently than 30s) */}
      {status?.ralph_loops && status.ralph_loops.length > 0 && (
        <div className="ralph-loops-list">
          <h4>Active Ralph Loops</h4>
          {status.ralph_loops.map((loop: RalphLoop) => (
            <div key={loop.id} className={`ralph-loop-item ${loop.status}`}>
              <div className="loop-header">
                <span className="loop-id">{loop.id}</span>
                <span className={`loop-status ${loop.status}`}>{loop.status}</span>
                {loop.phase && <span className="loop-phase">{loop.phase}</span>}
              </div>

              {/* Project path */}
              {loop.project_path && (
                <div className="loop-path">
                  <span className="path-icon">📁</span>
                  <code className="path-text">{loop.project_path}</code>
                  {loop.git_info && (loop.git_info.remote || loop.git_info.branch) && (
                    <span className="git-info">
                      {loop.git_info.remote && (
                        <span className="git-remote">
                          <span className="git-icon">🔗</span>
                          {loop.git_info.remote}
                        </span>
                      )}
                      {loop.git_info.branch && (
                        <span className="git-branch">
                          <span className="git-icon">🌿</span>
                          {loop.git_info.branch}
                        </span>
                      )}
                    </span>
                  )}
                </div>
              )}

              {/* Main prompt/task */}
              {loop.prompt && (
                <div className="loop-prompt">
                  <span className="prompt-label">Task:</span>
                  <span className="prompt-text">{loop.prompt}</span>
                </div>
              )}

              {/* Iteration progress (for legacy loops) */}
              {loop.max_iterations > 0 && (
                <div className="loop-progress">
                  <span className="loop-iteration">
                    Iteration {loop.iteration}/{loop.max_iterations}
                  </span>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min((loop.iteration / loop.max_iterations) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Subtask progress (for Ralph Iterative) */}
              {loop.total_subtasks !== undefined && loop.total_subtasks > 0 && (
                <div className="subtask-progress">
                  <span className="subtask-summary">
                    Subtasks: {loop.completed_subtasks || 0}/{loop.total_subtasks}
                  </span>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(((loop.completed_subtasks || 0) / loop.total_subtasks) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Current task */}
              {loop.current_task && (
                <div className="current-task">
                  <span className="current-task-label">Working on:</span>
                  <span className="current-task-text">{loop.current_task}</span>
                </div>
              )}

              {/* Subtasks list */}
              {loop.subtasks && loop.subtasks.length > 0 && (
                <div className="subtasks-list">
                  {loop.subtasks.map((subtask) => (
                    <div key={subtask.id} className={`subtask-item ${subtask.status}`}>
                      <span className={`subtask-status ${subtask.status}`}>
                        {subtask.status === "completed" ? "✓" : subtask.status === "in_progress" ? "→" : "○"}
                      </span>
                      <span className="subtask-title">{subtask.title}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Recent commits */}
              {loop.recent_commits && loop.recent_commits.length > 0 && (
                <div className="loop-commits">
                  {loop.recent_commits.map((commit) => (
                    <div key={commit.hash} className="commit-item">
                      <span className="commit-hash">{commit.hash.slice(0, 7)}</span>
                      <span className="commit-message">{commit.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Worktrees List */}
      {status?.worktrees && status.worktrees.length > 0 && (
        <div className="worktrees-list">
          <h4>Worktrees</h4>
          {status.worktrees.map((worktree) => (
            <div key={worktree.id} className="worktree-item">
              <span className="worktree-id">{worktree.id}</span>
              <span className="worktree-branch">{worktree.branch}</span>
              <span className="worktree-commit">{worktree.commit.slice(0, 7)}</span>
            </div>
          ))}
        </div>
      )}

      {/* No Node Agent message */}
      {!running && (
        <div className="node-agent-not-running">
          <p>Node Agent is not running on this server.</p>
          <p className="node-agent-hint">
            Deploy Node Agent via the seed repo setup.sh script to enable Ralph Loop
            orchestration.
          </p>
        </div>
      )}
    </div>
  );
}
