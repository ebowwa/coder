/**
 * EcosystemPlugin — standard contract for self-registering modules.
 *
 * Modules implement this interface so the PluginRegistry can load them,
 * check availability, respect user enable/disable preferences, and
 * call register() with a dependency-injected context.
 *
 * Mirrors upstream's BuiltinPluginDefinition shape (name, description,
 * version, defaultEnabled, isAvailable) while preserving active
 * registration via register().
 */

import type { HookManager } from "../hooks/index.js";
import type { SkillManager, SkillFile } from "../skills/index.js";
import type { ToolDefinition } from "../../schemas/index.js";
import type { PluginError } from "./errors.js";

export interface PluginContext {
  hookManager: HookManager;
  skillManager: SkillManager;
  tools: ToolDefinition[];
  config: Record<string, unknown>;
}

export interface EcosystemPlugin {
  readonly name: string;
  readonly description: string;
  readonly version?: string;
  /** Default enabled state before user sets a preference (defaults to true) */
  readonly defaultEnabled?: boolean;
  /** System capability check; return false to hide the plugin entirely */
  isAvailable?: () => boolean;
  register(ctx: PluginContext): void | Promise<void>;
}

/**
 * Runtime representation of a registered plugin.
 * Parallels upstream's LoadedPlugin — flat shape, no nested manifest.
 */
export interface LoadedPlugin {
  readonly name: string;
  readonly description: string;
  readonly version: string;
  /** Plugin identifier: "{name}@builtin" */
  readonly source: string;
  enabled: boolean;
  readonly isBuiltin: boolean;
  loadedAt?: number;
}

export interface PluginLoadResult {
  enabled: LoadedPlugin[];
  disabled: LoadedPlugin[];
  errors: PluginError[];
}
