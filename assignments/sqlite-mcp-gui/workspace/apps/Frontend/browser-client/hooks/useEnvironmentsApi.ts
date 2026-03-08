import { Environment, EnvironmentStatus, getEnvRegionName } from "../../../../../../@ebowwa/codespaces-types/compile";
import { validateEnvironmentName } from "../../../../../../@ebowwa/codespaces-types/compile/validation";
import { pollActions, pollAction } from "../lib/hetznerActionPolling";

const API_BASE = ""; // Relative URL - same port as frontend

/**
 * Track server-side activity for an environment (updates hoursActive, lastActive)
 */
async function trackEnvironmentActivity(
  environmentId: string,
  activePorts?: number[],
): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/environments/${environmentId}/activity`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hoursActive: 0.1, // Small increment for each interaction
        activePorts,
      }),
    });
  } catch (err) {
    console.warn("[trackEnvironmentActivity] Failed to track activity:", err);
    // Silently fail - activity tracking is optional
  }
}

interface EnvironmentsResponse {
  success: boolean;
  environments?: Environment[];
  error?: string;
}

interface ScreenshotResponse {
  success: boolean;
  path?: string;
  error?: string;
}

interface UseEnvironmentsApiProps {
  setEnvironments: (
    envs: Environment[] | ((prev: Environment[]) => Environment[]),
  ) => void;
  setLoading: (loading: boolean) => void;
  addActivity: (action: string, environment: string, details?: string) => void;
  showNotification: (
    message: string,
    type: "info" | "success" | "error" | "warning",
  ) => void;
  setError: (error: string | null) => void;
}

interface CreateEnvironmentProps {
  newEnvName: string;
  selectedServerType: string;
  selectedRegion: string;
  selectedSSHKeys?: string[];
  newEnvDescription: string;
  newEnvProject: string;
  newEnvOwner: string;
  newEnvPurpose: string;
  newEnvType: "development" | "staging" | "production" | "testing";
  setCreating: (creating: boolean) => void;
  setNewEnvName: (name: string) => void;
  setNewEnvDescription: (desc: string) => void;
  setNewEnvProject: (project: string) => void;
  setNewEnvOwner: (owner: string) => void;
  setNewEnvPurpose: (purpose: string) => void;
  setNewEnvType: (
    type: "development" | "staging" | "production" | "testing",
  ) => void;
}

export function useEnvironmentsApi({
  setEnvironments,
  setLoading,
  addActivity,
  showNotification,
  setError,
}: UseEnvironmentsApiProps) {
  const loadEnvironments = async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }
    try {
      const response = await fetch(`${API_BASE}/api/environments`);
      const data: EnvironmentsResponse = await response.json();

      if (data.success && data.environments) {
        setEnvironments(data.environments);
        // Load resources for running servers
        data.environments.forEach((env) => {
          if (env.status === EnvironmentStatus.Running && env.ipv4) {
            loadResources(env.id);
          }
        });
      } else if (data.error) {
        console.error("[loadEnvironments] API error:", data.error);
      }
    } catch (err) {
      console.error("[loadEnvironments] Failed to load environments:", err);
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  };

  const loadResources = async (envId: string) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/environments/${envId}/resources`,
      );
      const data = await response.json();

      if (data.success && data.resources) {
        const resourcesWithTimestamp = {
          ...data.resources,
          lastUpdated: new Date().toISOString(),
        };
        setEnvironments((prev) =>
          prev.map((env) =>
            env.id === envId
              ? { ...env, resources: resourcesWithTimestamp }
              : env,
          ),
        );
        // Metrics are stored server-side in /api/environments/:id/resources endpoint
      } else if (data.error) {
        console.error(`[loadResources] API error for ${envId}:`, data.error);
      }
    } catch (err) {
      console.error(`[loadResources] Failed to load resources for ${envId}:`, err);
    }
  };

  const handleScreenshot = async (
    setScreenshotLoading: (loading: boolean) => void,
    setScreenshot: (path: string | null) => void,
  ) => {
    setScreenshotLoading(true);
    setError(null);
    setScreenshot(null);
    try {
      const response = await fetch(`${API_BASE}/api/screenshot`, {
        method: "POST",
      });
      const data: ScreenshotResponse = await response.json();

      if (data.success && data.path) {
        setScreenshot(data.path);
        showNotification("Screenshot captured successfully", "success");
      } else {
        setError(data.error || "Failed to take screenshot");
        showNotification(data.error || "Failed to take screenshot", "error");
      }
    } catch (err) {
      console.error("[handleScreenshot] Failed to capture screenshot:", err);
      setError("Failed to connect to backend server");
      showNotification(
        "Backend server not running - start with: bun run server",
        "error",
      );
    } finally {
      setScreenshotLoading(false);
    }
  };

  const handleCreateEnvironment = async ({
    newEnvName,
    selectedServerType,
    selectedRegion,
    selectedSSHKeys,
    newEnvDescription,
    newEnvProject,
    newEnvOwner,
    newEnvPurpose,
    newEnvType,
    setCreating,
    setNewEnvName,
    setNewEnvDescription,
    setNewEnvProject,
    setNewEnvOwner,
    setNewEnvPurpose,
    setNewEnvType,
  }: CreateEnvironmentProps) => {
    if (!newEnvName.trim()) return;

    // Validate environment name
    const validation = validateEnvironmentName(newEnvName);
    if (!validation.isValid) {
      showNotification(validation.error || "Invalid environment name", "error");
      return;
    }

    setCreating(true);
    setError(null);

    // Optimistic update
    const tempEnv: Environment = {
      id: Date.now().toString(),
      name: newEnvName,
      status: EnvironmentStatus.Creating,
      serverId: 0,
      serverType: selectedServerType,
      image: {
        id: 0,
        name: "ubuntu-24.04",
        description: "Ubuntu 24.04 LTS",
        type: "system",
      },
      ipv4: null,
      ipv6: null,
      createdAt: new Date().toISOString(),
      lastUsed: null,
      tags: [],
      // Include optional metadata
      description: newEnvDescription || undefined,
      project: newEnvProject || undefined,
      owner: newEnvOwner || undefined,
      purpose: newEnvPurpose || undefined,
      environmentType: newEnvType || undefined,
    };

    setEnvironments((prev) => [...prev, tempEnv]);

    try {
      const response = await fetch(`${API_BASE}/api/environments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tempEnv.name,
          serverType: selectedServerType,
          location: selectedRegion,
          sshKeys: selectedSSHKeys,
          // Include metadata in create request
          metadata: {
            description: newEnvDescription || undefined,
            project: newEnvProject || undefined,
            owner: newEnvOwner || undefined,
            purpose: newEnvPurpose || undefined,
            environmentType: newEnvType || undefined,
          },
        }),
      });

      const data = await response.json();

      if (data.success && data.environment) {
        // Update with actual environment data
        setEnvironments((prev) =>
          prev.map((env) =>
            env.id === tempEnv.id ? { ...data.environment, progress: 0 } : env,
          ),
        );

        // If there are actions to poll, track progress
        if (data.actions && data.actions.length > 0) {
          try {
            // Poll all actions and track progress
            await pollActions(data.actions, {
              onProgress: (action) => {
                setEnvironments((prev) =>
                  prev.map((env) =>
                    env.id === data.environment.id
                      ? { ...env, progress: action.progress }
                      : env,
                  ),
                );
              },
              onComplete: () => {
                // Reload environments to get final state
                loadEnvironments();
                addActivity(
                  data.environment.id,
                  "Created Environment",
                  tempEnv.name,
                  `Server ${data.environment.serverType} in ${data.environment.location?.name || "Unknown"}`,
                );

                // Show root password if available (for servers without SSH keys)
                if (data.rootPassword) {
                  showNotification(
                    `Root password for ${tempEnv.name}: ${data.rootPassword}`,
                    "success",
                    15000, // Show for 15 seconds so user can copy it
                  );
                } else {
                  showNotification(
                    `Created ${tempEnv.name} successfully`,
                    "success",
                  );
                }
              },
              onError: (action) => {
                showNotification(
                  `Failed to create ${tempEnv.name}: ${action.error?.message || "Unknown error"}`,
                  "error",
                );
                setEnvironments((prev) =>
                  prev.filter((env) => env.id !== data.environment.id),
                );
              },
            });
          } catch (pollError) {
            console.error("Error polling actions:", pollError);
            // Still try to load final state
            loadEnvironments();
          }
        } else {
          // No actions to poll (mock mode)
          addActivity(
            data.environment.id,
            "Created Environment",
            tempEnv.name,
            `Server ${data.environment.serverType} in ${getEnvRegionName(data.environment)}`,
          );
          showNotification(`Created ${tempEnv.name} successfully`, "success");
        }

        // Clear form fields
        setNewEnvName("");
        setNewEnvDescription("");
        setNewEnvProject("");
        setNewEnvOwner("");
        setNewEnvPurpose("");
        setNewEnvType("development");
      } else {
        console.error("[handleCreateEnvironment] API error:", data.error);
        setEnvironments((prev) => prev.filter((env) => env.id !== tempEnv.id));
        showNotification(data.error || "Failed to create environment", "error");
      }
    } catch (err) {
      console.error("[handleCreateEnvironment] Failed to create environment:", err);
      setEnvironments((prev) => prev.filter((env) => env.id !== tempEnv.id));
      showNotification("Failed to connect to backend", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteEnvironment = async (
    environments: Environment[],
    id: string,
  ) => {
    const env = environments.find((e) => e.id === id);
    if (!env) return;

    setEnvironments((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, status: EnvironmentStatus.Deleting } : e,
      ),
    );

    try {
      const response = await fetch(`${API_BASE}/api/environments/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setEnvironments((prev) => prev.filter((e) => e.id !== id));
        addActivity(id, "Deleted Environment", env.name);
      } else {
        console.error("[handleDeleteEnvironment] Failed to delete environment:", response.status);
        // Revert on failure
        setEnvironments((prev) =>
          prev.map((e) =>
            e.id === id ? { ...e, status: EnvironmentStatus.Running } : e,
          ),
        );
      }
    } catch (err) {
      console.error("[handleDeleteEnvironment] Failed to delete environment:", err);
      setEnvironments((prev) => prev.filter((e) => e.id !== id));
    }
  };

  const handleStartEnvironment = async (
    environments: Environment[],
    id: string,
  ) => {
    const env = environments.find((e) => e.id === id);
    if (!env) return;

    setEnvironments((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, status: EnvironmentStatus.Creating, progress: 0 } : e,
      ),
    );

    try {
      const response = await fetch(`${API_BASE}/api/environments/${id}/start`, {
        method: "POST",
      });

      const data = await response.json();

      if (data.success && data.actionId) {
        // Poll the action for progress
        await pollAction(data.actionId, {
          onProgress: (action) => {
            setEnvironments((prev) =>
              prev.map((e) =>
                e.id === id ? { ...e, progress: action.progress } : e,
              ),
            );
          },
          onComplete: () => {
            // Reload environments to get final state
            loadEnvironments();
            addActivity(id, "Started Environment", env.name);
            // Track activity on server
            trackEnvironmentActivity(id);
            showNotification(`Started ${env.name} successfully`, "success");
          },
          onError: (action) => {
            showNotification(
              `Failed to start ${env.name}: ${action.error?.message || "Unknown error"}`,
              "error",
            );
            setEnvironments((prev) =>
              prev.map((e) =>
                e.id === id ? { ...e, status: EnvironmentStatus.Stopped } : e,
              ),
            );
          },
        });
      } else if (response.ok) {
        // Mock mode or no action ID
        setEnvironments((prev) =>
          prev.map((e) =>
            e.id === id ? { ...e, status: EnvironmentStatus.Running } : e,
          ),
        );
        addActivity(id, "Started Environment", env.name);
      } else {
        setEnvironments((prev) =>
          prev.map((e) =>
            e.id === id ? { ...e, status: EnvironmentStatus.Stopped } : e,
          ),
        );
        showNotification(data.error || "Failed to start environment", "error");
      }
    } catch (err) {
      console.error("[handleStartEnvironment] Failed to start environment:", err);
      setEnvironments((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, status: EnvironmentStatus.Stopped } : e,
        ),
      );
      showNotification("Failed to connect to backend", "error");
    }
  };

  const handleStopEnvironment = async (
    environments: Environment[],
    id: string,
  ) => {
    const env = environments.find((e) => e.id === id);
    if (!env) return;

    try {
      await fetch(`${API_BASE}/api/environments/${id}/stop`, {
        method: "POST",
      });

      setEnvironments((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, status: EnvironmentStatus.Stopped } : e,
        ),
      );
      addActivity(id, "Stopped Environment", env.name);
    } catch (err) {
      console.error("[handleStopEnvironment] Failed to stop environment:", err);
    }
  };

  const handleConnectEnvironment = async (
    environments: Environment[],
    id: string,
  ) => {
    const env = environments.find((e) => e.id === id);
    if (!env || !env.ipv4) return;

    try {
      const response = await fetch(`${API_BASE}/api/ssh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host: env.ipv4 }),
      });

      if (response.ok) {
        addActivity(id, "SSH Connected", env.name, `Connected to ${env.ipv4}`);
        // Track activity on server
        await trackEnvironmentActivity(id);
      } else {
        console.error("[handleConnectEnvironment] Failed to open SSH:", response.status);
        setError("Failed to open SSH connection");
      }
    } catch (err) {
      console.error("[handleConnectEnvironment] Failed to connect to backend:", err);
      setError("Failed to connect to backend");
    }
  };

  const handleCloneEnvironment = async (
    environments: Environment[],
    id: string,
    setCreating: (creating: boolean) => void,
  ) => {
    const env = environments.find((e) => e.id === id);
    if (!env) return;

    const cloneName = `${env.name} (copy)`;
    setCreating(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/environments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cloneName,
          serverType: env.serverType,
          location: env.location?.name,
        }),
      });

      const data = await response.json();

      if (data.success && data.environment) {
        setEnvironments((prev) => [...prev, data.environment]);
        addActivity(data.environment.id, "Cloned Environment", cloneName, `Cloned from ${env.name}`);
      } else {
        console.error("[handleCloneEnvironment] API error:", data.error);
        setError(data.error || "Failed to clone environment");
      }
    } catch (err) {
      console.error("[handleCloneEnvironment] Failed to clone environment:", err);
      setError("Failed to connect to backend");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateTags = (id: string, tags: string[]) => {
    setEnvironments((prev) =>
      prev.map((env) => (env.id === id ? { ...env, tags } : env)),
    );
  };

  /**
   * Test SSH connection to an environment
   */
  const handleTestSSH = async (
    host: string,
    user: string = "root",
    port: number = 22,
  ): Promise<{ success: boolean; connected?: boolean; error?: string }> => {
    try {
      const response = await fetch(`${API_BASE}/api/ssh/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host, user, port }),
      });

      const data = await response.json();
      return {
        success: response.ok,
        connected: data.connected,
        error: data.error,
      };
    } catch (err) {
      console.error("[handleTestSSH] Failed to test SSH connection:", err);
      return {
        success: false,
        connected: false,
        error: "Failed to connect to backend",
      };
    }
  };

  /**
   * Get SSH fingerprint for an environment
   */
  const handleGetSSHFingerprint = async (
    host: string,
    user: string = "root",
    port: number = 22,
  ): Promise<{ success: boolean; fingerprint?: string; error?: string }> => {
    try {
      const response = await fetch(`${API_BASE}/api/ssh/fingerprint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host, user, port }),
      });

      const data = await response.json();
      return {
        success: response.ok,
        fingerprint: data.fingerprint,
        error: data.error,
      };
    } catch (err) {
      console.error("[handleGetSSHFingerprint] Failed to get SSH fingerprint:", err);
      return { success: false, error: "Failed to connect to backend" };
    }
  };

  return {
    loadEnvironments,
    loadResources,
    handleScreenshot,
    handleCreateEnvironment,
    handleDeleteEnvironment,
    handleStartEnvironment,
    handleStopEnvironment,
    handleConnectEnvironment,
    handleCloneEnvironment,
    handleUpdateTags,
    handleTestSSH,
    handleGetSSHFingerprint,
  };
}
