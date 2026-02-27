/**
 * Config Loader - Load Claude Code configuration files
 *
 * Loads from:
 * 1. ~/.claude.json (MCP servers, project settings)
 * 2. ~/.claude/settings.json (hooks, permissions)
 * 3. ~/.claude/keybindings.json (keybindings)
 * 4. .claude/settings.json (project-level overrides)
 */

import { readFile, access } from "fs/promises";
import { join } from "path";
import type { MCPServerConfig, PermissionMode, HookDefinition, HookEvent } from "../types/index.js";

// ============================================
// TYPES
// ============================================

export interface ClaudeMainConfig {
  numStartups?: number;
  verbose?: boolean;
  preferredNotifChannel?: "terminal_bell" | "notification";
  projects?: Record<string, ProjectConfig>;
  mcpServers?: Record<string, MCPServerConfig>;
}

export interface ProjectConfig {
  allowedTools?: string[];
  mcpServers?: Record<string, MCPServerConfig>;
  enabledMcpjsonServers?: string[];
  disabledMcpjsonServers?: string[];
  hasTrustDialogAccepted?: boolean;
  lastSessionId?: string;
}

export interface SettingsConfig {
  hooks?: Partial<Record<HookEvent, HookMatcherConfig[]>>;
  permissions?: {
    defaultMode?: PermissionMode;
    allowedTools?: string[];
    disallowedTools?: string[];
  };
}

export interface HookMatcherConfig {
  matcher?: string;
  hooks: Array<{
    type: "command" | "prompt";
    command?: string;
    prompt?: string;
    timeout?: number;
  }>;
}

export interface KeybindingConfig {
  bindings: Array<{
    key: string;
    command: string;
    when?: string;
  }>;
}

export interface LoadedConfig {
  main: ClaudeMainConfig;
  settings: SettingsConfig;
  keybindings: KeybindingConfig;
  projectSettings: SettingsConfig;
  sources: string[];
}

// ============================================
// PATHS
// ============================================

const HOME = process.env.HOME || "";
const CLAUDE_DIR = join(HOME, ".claude");

export const CONFIG_PATHS = {
  main: join(HOME, ".claude.json"),
  settings: join(CLAUDE_DIR, "settings.json"),
  keybindings: join(CLAUDE_DIR, "keybindings.json"),
  projectSettings: (projectDir: string) => join(projectDir, ".claude", "settings.json"),
};

// ============================================
// HELPERS
// ============================================

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function loadJsonFile<T>(path: string, defaultValue: T): Promise<{ config: T; loaded: boolean }> {
  try {
    if (await fileExists(path)) {
      const content = await readFile(path, "utf-8");
      return { config: JSON.parse(content) as T, loaded: true };
    }
  } catch (error) {
    // File not readable or invalid JSON
  }
  return { config: defaultValue, loaded: false };
}

// ============================================
// LOADERS
// ============================================

/**
 * Load main ~/.claude.json config
 */
export async function loadMainConfig(): Promise<{ config: ClaudeMainConfig; loaded: boolean }> {
  return loadJsonFile<ClaudeMainConfig>(CONFIG_PATHS.main, {});
}

/**
 * Load settings from ~/.claude/settings.json
 */
export async function loadSettings(): Promise<{ config: SettingsConfig; loaded: boolean }> {
  return loadJsonFile<SettingsConfig>(CONFIG_PATHS.settings, {});
}

/**
 * Load keybindings from ~/.claude/keybindings.json
 */
export async function loadKeybindings(): Promise<{ config: KeybindingConfig; loaded: boolean }> {
  return loadJsonFile<KeybindingConfig>(CONFIG_PATHS.keybindings, { bindings: [] });
}

/**
 * Load project-level settings
 */
export async function loadProjectSettings(
  projectDir: string
): Promise<{ config: SettingsConfig; loaded: boolean }> {
  return loadJsonFile<SettingsConfig>(CONFIG_PATHS.projectSettings(projectDir), {});
}

/**
 * Get project-specific config from main config
 */
export function getProjectConfig(
  mainConfig: ClaudeMainConfig,
  projectDir: string
): ProjectConfig | undefined {
  return mainConfig.projects?.[projectDir];
}

/**
 * Load all configs at once
 */
export async function loadAllConfigs(projectDir: string = process.cwd()): Promise<LoadedConfig> {
  const sources: string[] = [];

  const { config: main, loaded: mainLoaded } = await loadMainConfig();
  if (mainLoaded) sources.push(CONFIG_PATHS.main);

  const { config: settings, loaded: settingsLoaded } = await loadSettings();
  if (settingsLoaded) sources.push(CONFIG_PATHS.settings);

  const { config: keybindings, loaded: kbLoaded } = await loadKeybindings();
  if (kbLoaded) sources.push(CONFIG_PATHS.keybindings);

  const { config: projectSettings, loaded: projLoaded } = await loadProjectSettings(projectDir);
  if (projLoaded) sources.push(CONFIG_PATHS.projectSettings(projectDir));

  return {
    main,
    settings,
    keybindings,
    projectSettings,
    sources,
  };
}

// ============================================
// MERGED CONFIG
// ============================================

/**
 * Get merged settings (global + project overrides)
 */
export function getMergedSettings(
  global: SettingsConfig,
  project: SettingsConfig
): SettingsConfig {
  return {
    hooks: { ...global.hooks, ...project.hooks },
    permissions: {
      ...global.permissions,
      ...project.permissions,
    },
  };
}

/**
 * Get all MCP servers (global + project-specific)
 */
export function getAllMCPServers(
  mainConfig: ClaudeMainConfig,
  projectDir: string
): Record<string, MCPServerConfig> {
  const servers: Record<string, MCPServerConfig> = {};

  // Global MCP servers
  if (mainConfig.mcpServers) {
    Object.assign(servers, mainConfig.mcpServers);
  }

  // Project-specific MCP servers
  const projectConfig = getProjectConfig(mainConfig, projectDir);
  if (projectConfig?.mcpServers) {
    // Project servers can override global
    Object.assign(servers, projectConfig.mcpServers);
  }

  return servers;
}

// Note: HookDefinition is imported at the top of the file

/**
 * Get hooks for a specific event and tool
 */
export function getHooksForEvent(
  settings: SettingsConfig,
  event: HookEvent,
  toolName?: string
): HookMatcherConfig["hooks"] {
  const eventHooks = settings.hooks?.[event];
  if (!eventHooks) return [];

  // Find matching hooks
  for (const hookConfig of eventHooks) {
    if (!hookConfig.matcher) {
      // No matcher = matches all
      return hookConfig.hooks;
    }

    // Check if tool name matches
    if (toolName) {
      const regex = new RegExp(hookConfig.matcher);
      if (regex.test(toolName)) {
        return hookConfig.hooks;
      }
    }
  }

  return [];
}

/**
 * Convert settings hooks to HookDefinitions for HookManager
 */
export function settingsToHookDefinitions(
  settings: SettingsConfig
): Partial<Record<HookEvent, HookDefinition[]>> {
  const result: Partial<Record<HookEvent, HookDefinition[]>> = {};

  if (!settings.hooks) return result;

  for (const [event, matcherConfigs] of Object.entries(settings.hooks)) {
    const definitions: HookDefinition[] = [];
    const hookEvent = event as HookEvent;

    for (const matcherConfig of matcherConfigs) {
      for (const hook of matcherConfig.hooks) {
        definitions.push({
          event: hookEvent,
          command: hook.type === "command" ? hook.command || "" : "",
          timeout: hook.timeout || 60000,
          enabled: true,
          // Store matcher for runtime filtering
          _matcher: matcherConfig.matcher,
          _prompt: hook.type === "prompt" ? hook.prompt : undefined,
        } as HookDefinition & { _matcher?: string; _prompt?: string });
      }
    }

    if (definitions.length > 0) {
      result[hookEvent] = definitions;
    }
  }

  return result;
}

/**
 * Get permission mode from settings
 */
export function getPermissionMode(settings: SettingsConfig): PermissionMode {
  return settings.permissions?.defaultMode || "default";
}

/**
 * Get allowed tools from settings
 */
export function getAllowedTools(settings: SettingsConfig): Set<string> {
  return new Set(settings.permissions?.allowedTools || []);
}

/**
 * Get disallowed tools from settings
 */
export function getDisallowedTools(settings: SettingsConfig): Set<string> {
  return new Set(settings.permissions?.disallowedTools || []);
}
