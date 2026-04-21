/**
 * PluginRegistry — manages plugin lifecycle, enable/disable toggle,
 * availability gating, and settings persistence.
 *
 * Parallels upstream's builtinPlugins.ts registry pattern but built
 * around active registration (plugins call register() with a
 * PluginContext) rather than passive data bags the host reads.
 *
 * Settings are persisted to disk so enable/disable survives restarts.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import type {
  EcosystemPlugin,
  PluginContext,
  LoadedPlugin,
  PluginLoadResult,
} from "./types.js";
import type { PluginError } from "./errors.js";

export const BUILTIN_SOURCE = "builtin";

interface PluginSettings {
  enabledPlugins: Record<string, boolean>;
}

export class PluginRegistry {
  private plugins = new Map<string, EcosystemPlugin>();
  private loaded = new Map<string, LoadedPlugin>();
  private errors: PluginError[] = [];
  private settings: PluginSettings = { enabledPlugins: {} };
  private readonly settingsPath: string;

  constructor(settingsPath?: string) {
    this.settingsPath =
      settingsPath || join(process.cwd(), ".coder", "plugin-settings.json");
    this.readSettings();
  }

  /**
   * Queue a plugin for loading. Does not call register() yet —
   * that happens in loadAll().
   */
  add(plugin: EcosystemPlugin): void {
    this.plugins.set(plugin.name, plugin);
  }

  /**
   * Load all queued plugins: check isAvailable(), respect enabled
   * state from user settings, call register(), collect errors.
   */
  async loadAll(ctx: PluginContext): Promise<PluginLoadResult> {
    this.loaded.clear();
    this.errors = [];
    const enabled: LoadedPlugin[] = [];
    const disabled: LoadedPlugin[] = [];

    for (const [name, plugin] of this.plugins) {
      // Gate: isAvailable()
      if (plugin.isAvailable) {
        try {
          if (!plugin.isAvailable()) continue;
        } catch (e) {
          this.errors.push({
            type: "availability-check-failed",
            source: `${name}@${BUILTIN_SOURCE}`,
            plugin: name,
            error: e instanceof Error ? e.message : String(e),
          });
          continue;
        }
      }

      // Resolve enabled state: user preference > plugin default > true
      const userPref = this.settings.enabledPlugins[name];
      const isEnabled =
        userPref !== undefined ? userPref : (plugin.defaultEnabled ?? true);

      const loaded: LoadedPlugin = {
        name,
        description: plugin.description,
        version: plugin.version || "0.0.0",
        source: `${name}@${BUILTIN_SOURCE}`,
        enabled: isEnabled,
        isBuiltin: true,
      };

      this.loaded.set(name, loaded);

      if (!isEnabled) {
        disabled.push(loaded);
        continue;
      }

      // Register
      try {
        await plugin.register(ctx);
        loaded.loadedAt = Date.now();
        enabled.push(loaded);
      } catch (e) {
        loaded.enabled = false;
        this.errors.push({
          type: "register-failed",
          source: `${name}@${BUILTIN_SOURCE}`,
          plugin: name,
          error: e instanceof Error ? e.message : String(e),
        });
        disabled.push(loaded);
      }
    }

    return { enabled, disabled, errors: this.errors };
  }

  /**
   * Enable a plugin by name. Persists to disk.
   * Returns false if plugin not found in registry.
   */
  enable(name: string): boolean {
    if (!this.plugins.has(name)) return false;
    const loaded = this.loaded.get(name);
    if (loaded) loaded.enabled = true;
    this.settings.enabledPlugins[name] = true;
    this.writeSettings();
    return true;
  }

  /**
   * Disable a plugin by name. Persists to disk.
   * Returns false if plugin not found in registry.
   */
  disable(name: string): boolean {
    if (!this.plugins.has(name)) return false;
    const loaded = this.loaded.get(name);
    if (loaded) loaded.enabled = false;
    this.settings.enabledPlugins[name] = false;
    this.writeSettings();
    return true;
  }

  isEnabled(name: string): boolean {
    return this.loaded.get(name)?.enabled ?? false;
  }

  getPlugin(name: string): LoadedPlugin | undefined {
    return this.loaded.get(name);
  }

  getDefinition(name: string): EcosystemPlugin | undefined {
    return this.plugins.get(name);
  }

  listPlugins(): PluginLoadResult {
    const enabled: LoadedPlugin[] = [];
    const disabled: LoadedPlugin[] = [];
    for (const plugin of this.loaded.values()) {
      if (plugin.enabled) enabled.push(plugin);
      else disabled.push(plugin);
    }
    return { enabled, disabled, errors: this.errors };
  }

  isBuiltinPluginId(pluginId: string): boolean {
    return pluginId.endsWith(`@${BUILTIN_SOURCE}`);
  }

  /**
   * Clear all registered plugins. Useful for testing.
   */
  clear(): void {
    this.plugins.clear();
    this.loaded.clear();
    this.errors = [];
  }

  get size(): number {
    return this.plugins.size;
  }

  private readSettings(): void {
    try {
      if (existsSync(this.settingsPath)) {
        const raw = readFileSync(this.settingsPath, "utf-8");
        this.settings = JSON.parse(raw);
      }
    } catch {
      this.settings = { enabledPlugins: {} };
    }
  }

  private writeSettings(): void {
    try {
      const dir = dirname(this.settingsPath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2));
    } catch {
      // Silent fail — don't break the session over settings persistence
    }
  }
}
