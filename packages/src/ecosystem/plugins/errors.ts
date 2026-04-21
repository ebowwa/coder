/**
 * Plugin Error Taxonomy
 *
 * Discriminated union of plugin error types. Each variant carries
 * contextual data for debugging and user guidance.
 *
 * Scoped to first-party / builtin plugin failure modes (not marketplace).
 * Upstream's 25+ variants cover git auth, network, manifest parsing, etc.
 * Those can be added when external plugin loading is implemented.
 */

export type PluginError =
  | {
      type: "register-failed";
      source: string;
      plugin: string;
      error: string;
    }
  | {
      type: "availability-check-failed";
      source: string;
      plugin: string;
      error: string;
    }
  | {
      type: "not-found";
      source: string;
      pluginId: string;
    }
  | {
      type: "config-invalid";
      source: string;
      plugin: string;
      validationError: string;
    }
  | {
      type: "hook-register-failed";
      source: string;
      plugin: string;
      hookEvent: string;
      error: string;
    }
  | {
      type: "disabled-by-user";
      source: string;
      plugin: string;
    }
  | {
      type: "generic-error";
      source: string;
      plugin?: string;
      error: string;
    };

export function getPluginErrorMessage(error: PluginError): string {
  switch (error.type) {
    case "register-failed":
      return `Plugin "${error.plugin}" failed to register: ${error.error}`;
    case "availability-check-failed":
      return `Plugin "${error.plugin}" availability check threw: ${error.error}`;
    case "not-found":
      return `Plugin "${error.pluginId}" not found in registry`;
    case "config-invalid":
      return `Plugin "${error.plugin}" config invalid: ${error.validationError}`;
    case "hook-register-failed":
      return `Plugin "${error.plugin}" hook "${error.hookEvent}" failed: ${error.error}`;
    case "disabled-by-user":
      return `Plugin "${error.plugin}" disabled by user preference`;
    case "generic-error":
      return error.plugin
        ? `Plugin "${error.plugin}": ${error.error}`
        : error.error;
  }
}
