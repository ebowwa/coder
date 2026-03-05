// TODO: "Nodes" was the first term that came to mind for this concept, not "Environments"
// Consider renaming if that better matches your mental model
import React, { useState, useEffect } from "react";
import { Environment, getEnvLocationLabel } from "../../../../../../../@ebowwa/codespaces-types/compile";
import { TagInput } from "../shared/TagInput";
import { Sheet } from "../shared/Sheet";
import { NodeServices } from "./NodeServices";
import { DopplerAuth } from "./DopplerAuth";
import { GitHubAuth } from "./GitHubAuth";
import "./NodeServices.css";
import "./DopplerAuth.css";
import "./GitHubAuth.css";

// Props passed when opening the node details modal/overlay
interface EnvironmentDetailsProps {
  environment: Environment; // The node/environment to display
  onClose: () => void; // Close the modal
  onUpdateTags?: (id: string, tags: string[]) => void; // Optional: update tags
  onMetadataChange?: () => void; // Optional: callback when metadata changes
}

// Metadata form fields for the node
interface MetadataForm {
  description: string;
  project: string;
  owner: string;
  purpose: string;
  environmentType: string;
}

// Plugin configuration structure
interface PluginForm {
  enabled: boolean;
  config: Record<string, string>;
}

export function EnvironmentDetails({
  environment,
  onClose,
  onUpdateTags,
  onMetadataChange,
}: EnvironmentDetailsProps) {
  // Local state for the component
  const [tags, setTags] = useState<string[]>(environment.tags || []);
  const [editMode, setEditMode] = useState(false);
  const [permissionsEditMode, setPermissionsEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [metadata, setMetadata] = useState<MetadataForm>({
    description: environment.description || "",
    project: environment.project || "",
    owner: environment.owner || "",
    purpose: environment.purpose || "",
    environmentType: environment.environmentType || "development",
  });
  const [newPluginId, setNewPluginId] = useState("");
  const [newSkillName, setNewSkillName] = useState("");
  const [newPluginConfigKey, setNewPluginConfigKey] = useState("");
  const [newPluginConfigValue, setNewPluginConfigValue] = useState("");

  // ===== Helper Functions =====

  // Returns the color for a node status badge
  const getStatusColor = (status: Environment["status"]) => {
    switch (status) {
      case "running":
        return "#22c55e";
      case "stopped":
        return "#ef4444";
      case "creating":
        return "#f59e0b";
      case "deleting":
        return "#6b7280";
      default:
        return "#6b7280";
    }
  };

  const formatUptime = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diff = now.getTime() - created.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days > 1 ? "s" : ""}`;
    }
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? "s" : ""}`;
    }
    return "Just now";
  };

  // ===== Event Handlers =====

  // Saves the edited metadata to the API
  const handleSaveMetadata = async () => {
    setSaving(true);
    try {
      const response = await fetch(
        `/api/environments/${environment.id}/metadata`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(metadata),
        },
      );
      if (response.ok) {
        setEditMode(false);
        onMetadataChange?.();
      }
    } catch (error) {
      console.error("Failed to save metadata:", error);
    } finally {
      setSaving(false);
    }
  };

  // Toggles a plugin on/off
  const handleTogglePlugin = async (pluginId: string) => {
    const currentPlugins = environment.permissions?.plugins || {};
    const plugin = currentPlugins[pluginId];
    if (!plugin) return;

    try {
      const response = await fetch(
        `/api/environments/${environment.id}/permissions`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            permissions: {
              ...environment.permissions,
              plugins: {
                ...currentPlugins,
                [pluginId]: {
                  ...plugin,
                  enabled: !plugin.enabled,
                },
              },
            },
          }),
        },
      );
      if (response.ok) {
        onMetadataChange?.();
      }
    } catch (error) {
      console.error("Failed to toggle plugin:", error);
    }
  };

  // Adds a new plugin configuration
  const handleAddPlugin = async () => {
    if (!newPluginId.trim()) return;

    const currentPlugins = environment.permissions?.plugins || {};
    try {
      const response = await fetch(
        `/api/environments/${environment.id}/permissions`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            permissions: {
              ...environment.permissions,
              plugins: {
                ...currentPlugins,
                [newPluginId]: {
                  enabled: true,
                  config: {},
                },
              },
            },
          }),
        },
      );
      if (response.ok) {
        setNewPluginId("");
        onMetadataChange?.();
      }
    } catch (error) {
      console.error("Failed to add plugin:", error);
    }
  };

  // Updates plugin configuration
  const handleUpdatePluginConfig = async (
    pluginId: string,
    key: string,
    value: string,
  ) => {
    const currentPlugins = environment.permissions?.plugins || {};
    const plugin = currentPlugins[pluginId];
    if (!plugin) return;

    const updatedConfig = {
      ...plugin.config,
      [key]: value,
    };

    try {
      const response = await fetch(
        `/api/environments/${environment.id}/permissions`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            permissions: {
              ...environment.permissions,
              plugins: {
                ...currentPlugins,
                [pluginId]: {
                  enabled: plugin.enabled,
                  config: updatedConfig,
                },
              },
            },
          }),
        },
      );
      if (response.ok) {
        onMetadataChange?.();
      }
    } catch (error) {
      console.error("Failed to update plugin config:", error);
    }
  };

  // Removes a plugin configuration
  const handleRemovePlugin = async (pluginId: string) => {
    const currentPlugins = environment.permissions?.plugins || {};
    const { [pluginId]: removed, ...remainingPlugins } = currentPlugins;

    try {
      const response = await fetch(
        `/api/environments/${environment.id}/permissions`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            permissions: {
              ...environment.permissions,
              plugins: remainingPlugins,
            },
          }),
        },
      );
      if (response.ok) {
        onMetadataChange?.();
      }
    } catch (error) {
      console.error("Failed to remove plugin:", error);
    }
  };

  // Adds a new skill configuration
  const handleAddSkill = async () => {
    if (!newSkillName.trim()) return;

    const currentSkills = environment.permissions?.skills || [];
    try {
      const response = await fetch(
        `/api/environments/${environment.id}/permissions`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            permissions: {
              ...environment.permissions,
              skills: [
                ...currentSkills,
                {
                  name: newSkillName.trim(),
                  enabled: true,
                },
              ],
            },
          }),
        },
      );
      if (response.ok) {
        setNewSkillName("");
        onMetadataChange?.();
      }
    } catch (error) {
      console.error("Failed to add skill:", error);
    }
  };

  // Toggles a skill on/off
  const handleToggleSkill = async (skillName: string) => {
    const currentSkills = environment.permissions?.skills || [];
    try {
      const response = await fetch(
        `/api/environments/${environment.id}/permissions`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            permissions: {
              ...environment.permissions,
              skills: currentSkills.map((s) =>
                s.name === skillName ? { ...s, enabled: !s.enabled } : s,
              ),
            },
          }),
        },
      );

      if (response.ok) {
        onMetadataChange?.();
      }
    } catch (error) {
      console.error("Failed to toggle skill:", error);
    }
  };

  // ===== Render =====

  return (
    <Sheet
      isOpen={true}
      onClose={onClose}
      title={environment.name}
      size="lg"
      side="right"
      closeOnEscape
      closeOnBackdropClick
    >
      {/* Status section - shows running/stopped/creating/deleting */}
      <div className="detail-section">
        <h3>Status</h3>
        <div
          className="status-badge"
          style={{ backgroundColor: getStatusColor(environment.status) }}
        >
          {environment.status}
        </div>
      </div>

      {/* Information section - description, project, owner, purpose, type */}
      <div className="detail-section">
        <div className="section-header">
          <h3>Information</h3>
          <button
            className="edit-toggle-btn"
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? "Cancel" : "Edit"}
          </button>
        </div>
        {editMode ? (
          <div className="metadata-form">
            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                value={metadata.description}
                onChange={(e) =>
                  setMetadata({ ...metadata, description: e.target.value })
                }
                placeholder="Environment description..."
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Project</label>
                <input
                  type="text"
                  value={metadata.project}
                  onChange={(e) =>
                    setMetadata({ ...metadata, project: e.target.value })
                  }
                  placeholder="Project name..."
                />
              </div>
              <div className="form-group">
                <label>Owner</label>
                <input
                  type="text"
                  value={metadata.owner}
                  onChange={(e) =>
                    setMetadata({ ...metadata, owner: e.target.value })
                  }
                  placeholder="Owner..."
                />
              </div>
            </div>
            <div className="form-group">
              <label>Purpose</label>
              <input
                type="text"
                value={metadata.purpose}
                onChange={(e) =>
                  setMetadata({ ...metadata, purpose: e.target.value })
                }
                placeholder="Purpose..."
              />
            </div>
            <div className="form-group">
              <label>Environment Type</label>
              <select
                value={metadata.environmentType}
                onChange={(e) =>
                  setMetadata({
                    ...metadata,
                    environmentType: e.target.value,
                  })
                }
              >
                <option value="development">Development</option>
                <option value="staging">Staging</option>
                <option value="production">Production</option>
                <option value="testing">Testing</option>
              </select>
            </div>
            <div className="form-actions">
              <button
                className="save-btn"
                onClick={handleSaveMetadata}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <div className="detail-grid">
            {environment.description && (
              <div className="detail-item full-width">
                <span className="detail-label">Description</span>
                <span className="detail-value">{environment.description}</span>
              </div>
            )}
            {environment.project && (
              <div className="detail-item">
                <span className="detail-label">Project</span>
                <span className="detail-value">{environment.project}</span>
              </div>
            )}
            {environment.owner && (
              <div className="detail-item">
                <span className="detail-label">Owner</span>
                <span className="detail-value">{environment.owner}</span>
              </div>
            )}
            {environment.purpose && (
              <div className="detail-item">
                <span className="detail-label">Purpose</span>
                <span className="detail-value">{environment.purpose}</span>
              </div>
            )}
            {environment.environmentType && (
              <div className="detail-item">
                <span className="detail-label">Type</span>
                <span className="detail-value type-badge">
                  {environment.environmentType}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Server Information - ID, type, image, region, created time */}
      <div className="detail-section">
        <h3>Server Information</h3>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">Server ID</span>
            <span className="detail-value">#{environment.serverId}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Type</span>
            <span className="detail-value">{environment.serverType}</span>
          </div>
          <div className="detail-item col-span-2">
            <span className="detail-label">Image</span>
            <div className="detail-value">
              {typeof environment.image === "string" ? (
                <div className="font-medium">{environment.image}</div>
              ) : environment.image ? (
                <>
                  <div className="font-medium">{environment.image.name}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {environment.image.description}
                  </div>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs bg-slate-700 px-2 py-0.5 rounded capitalize">
                      {environment.image.type}
                    </span>
                    <span className="text-xs bg-slate-700 px-2 py-0.5 rounded">
                      ID: {environment.image.id}
                    </span>
                  </div>
                </>
              ) : (
                <div className="font-medium">Unknown</div>
              )}
            </div>
          </div>
          <div className="detail-item">
            <span className="detail-label">Location</span>
            <span className="detail-value">{getEnvLocationLabel(environment)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Created</span>
            <span className="detail-value">
              {formatUptime(environment.createdAt)} ago
            </span>
          </div>
        </div>
      </div>

      {/* Network section - IP addresses, hours active, last active time */}
      {(environment.ipv4 || environment.ipv6) && (
        <div className="detail-section">
          <h3>Network</h3>
          <div className="detail-grid">
            {environment.ipv4 && (
              <div className="detail-item">
                <span className="detail-label">IPv4 Address</span>
                <span className="detail-value ip-address">
                  {environment.ipv4}
                </span>
              </div>
            )}
            {environment.ipv6 && (
              <div className="detail-item">
                <span className="detail-label">IPv6 Address</span>
                <span className="detail-value ip-address">
                  {environment.ipv6}
                </span>
              </div>
            )}
            {environment.hoursActive !== undefined && (
              <div className="detail-item">
                <span className="detail-label">Hours Active</span>
                <span className="detail-value">
                  {environment.hoursActive.toFixed(1)}h
                </span>
              </div>
            )}
            {environment.lastActive && (
              <div className="detail-item">
                <span className="detail-label">Last Active</span>
                <span className="detail-value">
                  {new Date(environment.lastActive).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Ports section - lists open ports and their states */}
      {environment.activePorts && environment.activePorts.length > 0 && (
        <div className="detail-section">
          <h3>Active Ports</h3>
          <div className="ports-list">
            {environment.activePorts.map((port, index) => (
              <div key={index} className={`port-item ${port.state}`}>
                <span className="port-number">
                  {port.port}/{port.protocol}
                </span>
                {port.service && (
                  <span className="port-service">{port.service}</span>
                )}
                <span className="port-state">{port.state}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SSH Connection - shows the SSH command to connect */}
      <div className="detail-section">
        <h3>SSH Connection</h3>
        <div className="ssh-command">
          <code>
            ssh root@{environment.ipv4 || environment.ipv6 || "<pending>"}
          </code>
        </div>
      </div>

      {/* Node Services - Node Agent, Ralph Loops, Worktrees */}
      <NodeServices environmentId={environment.id} />

      {/* Doppler Secrets Management */}
      {environment.status === "running" && environment.ipv4 && (
        <div className="detail-section">
          <h3>Doppler Secrets</h3>
          <DopplerAuth
            environmentId={environment.id}
            host={environment.ipv4}
          />
        </div>
      )}

      {/* GitHub CLI Authentication */}
      {environment.status === "running" && environment.ipv4 && (
        <div className="detail-section">
          <h3>GitHub CLI</h3>
          <GitHubAuth
            environmentId={environment.id}
            host={environment.ipv4}
          />
        </div>
      )}

      {/* Authentication Providers - GitHub, Doppler, Tailscale */}
      {environment.permissions?.logins && (
        <div className="detail-section">
          <h3>Authentication Providers</h3>
          <div className="permissions-grid">
            {environment.permissions.logins.github?.enabled && (
              <div className="permission-item enabled">
                <span className="permission-icon">🔑</span>
                <div>
                  <span className="permission-name">GitHub</span>
                  {environment.permissions.logins.github.username && (
                    <span className="permission-detail">
                      @{environment.permissions.logins.github.username}
                    </span>
                  )}
                </div>
              </div>
            )}
            {environment.permissions.logins.doppler?.enabled && (
              <div className="permission-item enabled">
                <span className="permission-icon">🔐</span>
                <div>
                  <span className="permission-name">Doppler</span>
                  {environment.permissions.logins.doppler.project && (
                    <span className="permission-detail">
                      {environment.permissions.logins.doppler.project}
                    </span>
                  )}
                </div>
              </div>
            )}
            {environment.permissions.logins.tailscale?.enabled && (
              <div className="permission-item enabled">
                <span className="permission-icon">🦊</span>
                <div>
                  <span className="permission-name">Tailscale</span>
                  {environment.permissions.logins.tailscale.hostname && (
                    <span className="permission-detail">
                      {environment.permissions.logins.tailscale.hostname}
                    </span>
                  )}
                </div>
              </div>
            )}
            {!environment.permissions.logins.github?.enabled &&
              !environment.permissions.logins.doppler?.enabled &&
              !environment.permissions.logins.tailscale?.enabled && (
                <div className="permission-item">
                  <span className="detail-label">
                    No authentication providers configured
                  </span>
                </div>
              )}
          </div>
        </div>
      )}

      {/* VPN Connections - lists connected VPNs */}
      {environment.permissions?.vpns &&
        environment.permissions.vpns.length > 0 && (
          <div className="detail-section">
            <h3>VPN Connections</h3>
            <div className="vpn-list">
              {environment.permissions.vpns.map((vpn, index) => (
                <div
                  key={index}
                  className={`vpn-item ${vpn.connected ? "connected" : ""}`}
                >
                  <span className="vpn-icon">
                    {vpn.connected ? "🔗" : "⚪"}
                  </span>
                  <span className="vpn-name">{vpn.name}</span>
                  <span className="vpn-type">{vpn.type}</span>
                  <span className="vpn-status">
                    {vpn.connected ? "Connected" : "Disconnected"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Permissions & Plugins section - manage plugins and skills */}
      <div className="detail-section">
        <div className="section-header">
          <h3>Permissions & Plugins</h3>
          <button
            className="edit-toggle-btn"
            onClick={() => setPermissionsEditMode(!permissionsEditMode)}
          >
            {permissionsEditMode ? "Done" : "Edit"}
          </button>
        </div>

        {permissionsEditMode ? (
          <div className="permissions-editor">
            {/* Plugin Management */}
            <div className="editor-subsection">
              <h4>Plugins</h4>
              <div className="plugin-list-editor">
                {Object.entries(environment.permissions?.plugins || {}).map(
                  ([pluginId, plugin]) => (
                    <div key={pluginId} className="plugin-editor-item">
                      <div className="plugin-editor-header">
                        <span className="plugin-name">{pluginId}</span>
                        <div className="plugin-actions">
                          <button
                            className={`toggle-btn ${plugin.enabled ? "on" : "off"}`}
                            onClick={() => handleTogglePlugin(pluginId)}
                          >
                            {plugin.enabled ? "ON" : "OFF"}
                          </button>
                          <button
                            className="delete-btn"
                            onClick={() => handleRemovePlugin(pluginId)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <div className="plugin-config-editor">
                        <div className="config-rows">
                          {Object.entries(plugin.config || {}).map(
                            ([key, value]) => (
                              <div key={key} className="config-row">
                                <input
                                  type="text"
                                  value={key}
                                  readOnly
                                  className="config-key"
                                />
                                <input
                                  type="text"
                                  value={String(value)}
                                  onChange={(e) =>
                                    handleUpdatePluginConfig(
                                      pluginId,
                                      key,
                                      e.target.value,
                                    )
                                  }
                                  className="config-value"
                                />
                              </div>
                            ),
                          )}
                          <div className="config-row">
                            <input
                              type="text"
                              placeholder="New key"
                              value={newPluginConfigKey}
                              onChange={(e) =>
                                setNewPluginConfigKey(e.target.value)
                              }
                              className="config-key"
                            />
                            <input
                              type="text"
                              placeholder="New value"
                              value={newPluginConfigValue}
                              onChange={(e) =>
                                setNewPluginConfigValue(e.target.value)
                              }
                              className="config-value"
                            />
                            <button
                              className="add-config-btn"
                              onClick={() => {
                                if (
                                  newPluginConfigKey &&
                                  newPluginConfigValue
                                ) {
                                  handleUpdatePluginConfig(
                                    pluginId,
                                    newPluginConfigKey,
                                    newPluginConfigValue,
                                  );
                                  setNewPluginConfigKey("");
                                  setNewPluginConfigValue("");
                                }
                              }}
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </div>
              <div className="add-plugin-form">
                <input
                  type="text"
                  placeholder="Plugin name (e.g., ralph-loop)"
                  value={newPluginId}
                  onChange={(e) => setNewPluginId(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddPlugin()}
                />
                <button onClick={handleAddPlugin} className="add-btn">
                  Add Plugin
                </button>
              </div>
            </div>

            {/* Skills Management */}
            <div className="editor-subsection">
              <h4>Skills</h4>
              <div className="skills-editor">
                {(environment.permissions?.skills || []).map((skill) => (
                  <div key={skill.name} className="skill-editor-item">
                    <span
                      className={`skill-badge ${skill.enabled ? "enabled" : "disabled"}`}
                    >
                      {skill.name}
                    </span>
                    <button
                      className={`toggle-btn ${skill.enabled ? "on" : "off"}`}
                      onClick={() => handleToggleSkill(skill.name)}
                    >
                      {skill.enabled ? "ON" : "OFF"}
                    </button>
                  </div>
                ))}
              </div>
              <div className="add-skill-form">
                <input
                  type="text"
                  placeholder="Skill name"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddSkill()}
                />
                <button onClick={handleAddSkill} className="add-btn">
                  Add Skill
                </button>
              </div>
            </div>

            {/* Info Message */}
            <div className="editor-info">
              <p>
                💡 Configure additional permissions through the API or directly
                edit the metadata.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Display existing plugins */}
            {environment.permissions?.plugins &&
              Object.keys(environment.permissions.plugins).length > 0 && (
                <div className="plugins-list">
                  {Object.entries(environment.permissions.plugins).map(
                    ([pluginId, plugin]) => (
                      <div
                        key={pluginId}
                        className={`plugin-item ${plugin.enabled ? "enabled" : "disabled"}`}
                      >
                        <span className="plugin-icon">
                          {plugin.enabled ? "✓" : "○"}
                        </span>
                        <span className="plugin-name">{pluginId}</span>
                        {plugin.enabled &&
                          plugin.config &&
                          Object.keys(plugin.config).length > 0 && (
                            <span className="plugin-config-summary">
                              {Object.keys(plugin.config).join(", ")}
                            </span>
                          )}
                      </div>
                    ),
                  )}
                </div>
              )}

            {/* Display existing skills */}
            {environment.permissions?.skills &&
              environment.permissions.skills.length > 0 && (
                <div className="skills-list-display">
                  {environment.permissions.skills.map((skill) => (
                    <span
                      key={skill.name}
                      className={`skill-badge ${skill.enabled ? "enabled" : "disabled"}`}
                    >
                      {skill.name}
                    </span>
                  ))}
                </div>
              )}

            {!environment.permissions?.plugins &&
              !environment.permissions?.skills && (
                <p className="no-permissions">
                  No plugins or skills configured
                </p>
              )}
          </>
        )}
      </div>

      {/* Tags section - manage node tags */}
      {onUpdateTags && (
        <div className="detail-section">
          <h3>Tags</h3>
          <TagInput
            tags={tags}
            onChange={(newTags) => {
              setTags(newTags);
              onUpdateTags(environment.id, newTags);
            }}
            placeholder="Add a tag..."
          />
        </div>
      )}
    </Sheet>
  );
}
