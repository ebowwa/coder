import React, { useState, useEffect } from "react";
import {
  validateAPIToken,
  validateSSHKeyName,
} from "../../../../../../../@ebowwa/codespaces-types/compile/validation";
import {
  useServerTypes,
  useLocations,
  formatServerTypeInfo,
  getCountryFlag,
} from "../../hooks/useHetznerData";
import { PickerModal, PickerOption } from "./PickerModal";

const API_BASE = ""; // Relative URL - same port as frontend

interface AuthStatus {
  method: "env" | "cli" | "none";
  hasEnvToken: boolean;
  hasCliToken: boolean;
  cliConfigPath: string | null;
}

interface SettingsPanelProps {
  onClose: () => void;
}

interface Settings {
  hetznerApiToken: string;
  defaultServerType: string;
  defaultRegion: string;
  sshKeyName: string;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { serverTypes: availableServerTypes, loading: serverTypesLoading } =
    useServerTypes();
  const { locations: availableLocations, loading: locationsLoading } =
    useLocations();
  const [settings, setSettings] = useState<Settings>({
    hetznerApiToken: "",
    defaultServerType: "",
    defaultRegion: "",
    sshKeyName: "",
  });
  const [saved, setSaved] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    apiToken?: string;
    sshKey?: string;
  }>({});
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [authStatusLoading, setAuthStatusLoading] = useState(true);

  // Picker states
  const [serverTypePickerOpen, setServerTypePickerOpen] = useState(false);
  const [regionPickerOpen, setRegionPickerOpen] = useState(false);

  // Fetch auth status on mount
  useEffect(() => {
    const fetchAuthStatus = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/auth/status`);
        const data = await response.json();
        if (data.success) {
          setAuthStatus(data.auth);
        }
      } catch (error) {
        console.error("Failed to fetch auth status:", error);
      } finally {
        setAuthStatusLoading(false);
      }
    };
    fetchAuthStatus();
  }, []);

  // Set default values from API when available
  React.useEffect(() => {
    if (availableServerTypes.length > 0 && !settings.defaultServerType) {
      setSettings((prev) => ({
        ...prev,
        defaultServerType: availableServerTypes[0].name,
      }));
    }
  }, [availableServerTypes, settings.defaultServerType]);

  React.useEffect(() => {
    if (availableLocations.length > 0 && !settings.defaultRegion) {
      setSettings((prev) => ({
        ...prev,
        defaultRegion: availableLocations[0].name,
      }));
    }
  }, [availableLocations, settings.defaultRegion]);

  const validateField = (field: "apiToken" | "sshKey", value: string) => {
    if (field === "apiToken") {
      const result = validateAPIToken(value);
      setValidationErrors((prev) => ({
        ...prev,
        apiToken: result.isValid ? undefined : result.error,
      }));
    } else if (field === "sshKey") {
      const result = validateSSHKeyName(value);
      setValidationErrors((prev) => ({
        ...prev,
        sshKey: result.isValid ? undefined : result.error,
      }));
    }
  };

  const handleSave = () => {
    // Validate all fields before saving
    const apiTokenResult = validateAPIToken(settings.hetznerApiToken);
    const sshKeyResult = validateSSHKeyName(settings.sshKeyName);

    setValidationErrors({
      apiToken: apiTokenResult.isValid ? undefined : apiTokenResult.error,
      sshKey: sshKeyResult.isValid ? undefined : sshKeyResult.error,
    });

    if (apiTokenResult.isValid && sshKeyResult.isValid) {
      localStorage.setItem("cheapspaces-settings", JSON.stringify(settings));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleLoad = () => {
    const saved = localStorage.getItem("cheapspaces-settings");
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  };

  // Prepare picker options
  const serverTypeOptions: PickerOption[] = availableServerTypes.map((type) => {
    const info = formatServerTypeInfo(type);
    return {
      value: type.name,
      title: type.name,
      subtitle: `€${info.price}/mo`,
      detail: `${info.vcpus} vCPUs • ${info.ram} RAM • ${info.disk}`,
      description: type.description,
    };
  });

  const regionOptions: PickerOption[] = availableLocations.map((location) => ({
    value: location.name,
    title: location.name,
    subtitle: getCountryFlag(location.country),
    detail: `${location.city}, ${location.country}`,
    description: location.description,
  }));

  const selectedServerType = availableServerTypes.find(
    (t) => t.name === settings.defaultServerType
  );
  const selectedServerTypeInfo = selectedServerType
    ? formatServerTypeInfo(selectedServerType)
    : null;

  const selectedRegion = availableLocations.find(
    (l) => l.name === settings.defaultRegion
  );

  return (
    <div className="settings-panel">
      <div className="settings-content">
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="settings-body">
          <section className="setting-group">
            <h3>Hetzner API</h3>

            {/* Auth Status Badge */}
            {!authStatusLoading && authStatus && (
              <div className={`auth-status-badge auth-${authStatus.method}`}>
                {authStatus.method === "cli" && (
                  <>
                    <span className="auth-icon">🔧</span>
                    <div className="auth-info">
                      <strong>CLI Auth Active</strong>
                      <small>Using {authStatus.cliConfigPath}</small>
                    </div>
                  </>
                )}
                {authStatus.method === "env" && (
                  <>
                    <span className="auth-icon">🔒</span>
                    <div className="auth-info">
                      <strong>Environment Auth Active</strong>
                      <small>HETZNER_API_TOKEN is set</small>
                    </div>
                  </>
                )}
                {authStatus.method === "none" && (
                  <>
                    <span className="auth-icon">⚠️</span>
                    <div className="auth-info">
                      <strong>No Auth Configured</strong>
                      <small>Add API token below or configure CLI</small>
                    </div>
                  </>
                )}
              </div>
            )}

            <label>
              <span>API Token</span>
              <input
                type="password"
                value={settings.hetznerApiToken}
                onChange={(e) => {
                  setSettings({ ...settings, hetznerApiToken: e.target.value });
                  validateField("apiToken", e.target.value);
                }}
                placeholder="Enter your Hetzner API token"
                className={validationErrors.apiToken ? "input-error" : ""}
                disabled={authStatus?.method === "cli" || authStatus?.method === "env"}
              />
            </label>
            {validationErrors.apiToken && (
              <p className="error-text">{validationErrors.apiToken}</p>
            )}
            {authStatus?.method === "cli" && (
              <p className="help-text info-text">
                API token is managed by Hetzner CLI. Update using:
                <code>hcloud context create</code>
              </p>
            )}
            {authStatus?.method === "env" && (
              <p className="help-text info-text">
                API token is set via HETZNER_API_TOKEN environment variable.
              </p>
            )}
            {authStatus?.method === "none" && (
              <p className="help-text">
                Get your API token from{" "}
                <a
                  href="https://console.hetzner.cloud/security/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Hetzner Cloud Console
                </a>
              </p>
            )}
          </section>

          <section className="setting-group">
            <h3>Default Server Type</h3>
            {serverTypesLoading ? (
              <div className="picker-selector">
                <button className="picker-selector-button" disabled>
                  <span className="picker-selected-primary">Loading server types...</span>
                </button>
              </div>
            ) : (
              <>
                <div className="picker-selector">
                  <button
                    className="picker-selector-button"
                    onClick={() => setServerTypePickerOpen(true)}
                  >
                    <div className="picker-selected-info">
                      <span className="picker-selected-primary">
                        {selectedServerType?.name || "Select server type"}
                      </span>
                      <span className="picker-selected-secondary">
                        {selectedServerTypeInfo ? `€${selectedServerTypeInfo.price}/mo` : ""}
                      </span>
                    </div>
                    <svg className="picker-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m6 9 6 6 6-6"></path>
                    </svg>
                  </button>
                </div>
                <PickerModal
                  isOpen={serverTypePickerOpen}
                  onClose={() => setServerTypePickerOpen(false)}
                  title="Select Default Server Type"
                  options={serverTypeOptions}
                  selectedValue={settings.defaultServerType}
                  onSelect={(value) =>
                    setSettings({ ...settings, defaultServerType: value as string })
                  }
                />
              </>
            )}
          </section>

          <section className="setting-group">
            <h3>Default Region</h3>
            {locationsLoading ? (
              <div className="picker-selector">
                <button className="picker-selector-button" disabled>
                  <span className="picker-selected-primary">Loading locations...</span>
                </button>
              </div>
            ) : (
              <>
                <div className="picker-selector">
                  <button
                    className="picker-selector-button"
                    onClick={() => setRegionPickerOpen(true)}
                  >
                    <div className="picker-selected-info">
                      <span className="picker-selected-primary">
                        {selectedRegion?.city || selectedRegion?.name || "Select region"}
                      </span>
                      <span className="picker-selected-secondary region-flag">
                        {selectedRegion ? getCountryFlag(selectedRegion.country) : ""}
                      </span>
                    </div>
                    <svg className="picker-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m6 9 6 6 6-6"></path>
                    </svg>
                  </button>
                </div>
                <PickerModal
                  isOpen={regionPickerOpen}
                  onClose={() => setRegionPickerOpen(false)}
                  title="Select Default Region"
                  options={regionOptions}
                  selectedValue={settings.defaultRegion}
                  onSelect={(value) =>
                    setSettings({ ...settings, defaultRegion: value as string })
                  }
                />
              </>
            )}
          </section>

          <section className="setting-group">
            <h3>SSH Key</h3>
            <label>
              <span>SSH Key Name</span>
              <input
                type="text"
                value={settings.sshKeyName}
                onChange={(e) => {
                  setSettings({ ...settings, sshKeyName: e.target.value });
                  validateField("sshKey", e.target.value);
                }}
                placeholder="Name of your SSH key in Hetzner"
                className={validationErrors.sshKey ? "input-error" : ""}
              />
            </label>
            {validationErrors.sshKey && (
              <p className="error-text">{validationErrors.sshKey}</p>
            )}
            <p className="help-text">
              SSH keys must be added to your Hetzner account first
            </p>
          </section>
        </div>

        <div className="settings-footer">
          <button onClick={handleLoad}>Load</button>
          <button className="save-btn" onClick={handleSave}>
            {saved ? "Saved!" : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
