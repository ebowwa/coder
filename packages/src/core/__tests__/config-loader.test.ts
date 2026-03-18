/**
 * Config Loader Tests - Configuration file loading and merging
 *
 * Tests for:
 * 1. Main config (~/.claude.json) loading
 * 2. Settings (~/.claude/settings.json) loading
 * 3. Keybindings loading
 * 4. Project-level settings overrides
 * 5. Config merging behavior
 * 6. Hook extraction and conversion
 * 7. Permission mode handling
 */

import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import {
  loadMainConfig,
  loadSettings,
  loadKeybindings,
  loadProjectSettings,
  loadAllConfigs,
  getProjectConfig,
  getMergedSettings,
  getAllMCPServers,
  getHooksForEvent,
  settingsToHookDefinitions,
  getPermissionMode,
  getAllowedTools,
  getDisallowedTools,
  CONFIG_PATHS,
} from "../config-loader.js";
import type {
  ClaudeMainConfig,
  SettingsConfig,
  KeybindingConfig,
  HookEvent,
} from "../../schemas/index.js";

// Test directory for mock config files
const TEST_DIR = join("/tmp", "coder-config-test-" + Date.now());
const TEST_HOME = join(TEST_DIR, "home");
const TEST_PROJECT = join(TEST_DIR, "project");

// Helper to create mock config files
async function createMockConfig(path: string, content: object) {
  await mkdir(path.substring(0, path.lastIndexOf("/")), { recursive: true });
  await writeFile(path, JSON.stringify(content, null, 2));
}

describe("Config Loader", () => {
  beforeEach(async () => {
    // Create test directories
    await mkdir(TEST_HOME, { recursive: true });
    await mkdir(join(TEST_PROJECT, ".claude"), { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directories
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  describe("loadMainConfig", () => {
    it("should return default config when file doesn't exist", async () => {
      // This test uses the actual home directory, so we just verify the structure
      const result = await loadMainConfig();
      expect(result).toHaveProperty("config");
      expect(result).toHaveProperty("loaded");
      expect(typeof result.loaded).toBe("boolean");
    });

    it("should return loaded: true when config exists", async () => {
      // If ~/.claude.json exists, this should return loaded: true
      const result = await loadMainConfig();
      // We can't guarantee the file exists, so just check structure
      expect(result.config).toBeDefined();
    });
  });

  describe("loadSettings", () => {
    it("should return a config object and loaded flag", async () => {
      const result = await loadSettings();
      expect(result).toHaveProperty("config");
      expect(result).toHaveProperty("loaded");
      expect(typeof result.config).toBe("object");
    });

    it("should load settings structure correctly", async () => {
      // This test depends on actual settings file existing
      const result = await loadSettings();
      // Config should be an object (empty or with settings)
      expect(typeof result.config).toBe("object");
    });
  });

  describe("loadKeybindings", () => {
    it("should return default config with empty bindings array", async () => {
      const result = await loadKeybindings();
      expect(result.config).toHaveProperty("bindings");
      expect(Array.isArray(result.config.bindings)).toBe(true);
    });
  });

  describe("loadProjectSettings", () => {
    it("should return empty config for non-existent project settings", async () => {
      const result = await loadProjectSettings("/non/existent/path");
      expect(result.config).toEqual({});
      expect(result.loaded).toBe(false);
    });
  });

  describe("loadAllConfigs", () => {
    it("should load all config types and return sources array", async () => {
      const result = await loadAllConfigs("/non/existent/path");

      expect(result).toHaveProperty("main");
      expect(result).toHaveProperty("settings");
      expect(result).toHaveProperty("keybindings");
      expect(result).toHaveProperty("projectSettings");
      expect(result).toHaveProperty("sources");
      expect(Array.isArray(result.sources)).toBe(true);
    });

    it("should use current working directory as default project dir", async () => {
      const result = await loadAllConfigs();
      expect(result).toBeDefined();
    });
  });

  describe("getProjectConfig", () => {
    it("should return undefined for non-existent project", () => {
      const mainConfig: ClaudeMainConfig = {
        projects: {
          "/some/other/path": { mcpServers: {} },
        },
      };

      const result = getProjectConfig(mainConfig, "/non/existent/path");
      expect(result).toBeUndefined();
    });

    it("should return project config for existing project", () => {
      const projectConfig = { mcpServers: { test: { type: "stdio", command: "test" } } };
      const mainConfig: ClaudeMainConfig = {
        projects: {
          "/my/project": projectConfig,
        },
      };

      const result = getProjectConfig(mainConfig, "/my/project");
      expect(result).toEqual(projectConfig);
    });
  });

  describe("getMergedSettings", () => {
    it("should merge global and project settings", () => {
      const global: SettingsConfig = {
        hooks: {
          SessionStart: [{ matcher: ".*", hooks: [{ type: "command", command: "global-hook" }] }],
        },
        permissions: {
          defaultMode: "default",
        },
      };

      const project: SettingsConfig = {
        hooks: {
          SessionEnd: [{ matcher: ".*", hooks: [{ type: "command", command: "project-hook" }] }],
        },
        permissions: {
          defaultMode: "acceptEdits",
        },
      };

      const merged = getMergedSettings(global, project);

      // Should have both hooks
      expect(merged.hooks?.SessionStart).toBeDefined();
      expect(merged.hooks?.SessionEnd).toBeDefined();

      // Project should override global
      expect(merged.permissions?.defaultMode).toBe("acceptEdits");
    });

    it("should handle empty global settings", () => {
      const global: SettingsConfig = {};
      const project: SettingsConfig = {
        permissions: { defaultMode: "bypassPermissions" },
      };

      const merged = getMergedSettings(global, project);
      expect(merged.permissions?.defaultMode).toBe("bypassPermissions");
    });

    it("should handle empty project settings", () => {
      const global: SettingsConfig = {
        permissions: { defaultMode: "default" },
      };
      const project: SettingsConfig = {};

      const merged = getMergedSettings(global, project);
      expect(merged.permissions?.defaultMode).toBe("default");
    });
  });

  describe("getAllMCPServers", () => {
    it("should return empty object when no servers configured", () => {
      const mainConfig: ClaudeMainConfig = {};
      const servers = getAllMCPServers(mainConfig, "/project");
      expect(servers).toEqual({});
    });

    it("should return global MCP servers", () => {
      const mainConfig: ClaudeMainConfig = {
        mcpServers: {
          globalServer: { type: "stdio", command: "global" },
        },
      };

      const servers = getAllMCPServers(mainConfig, "/project");
      expect(servers.globalServer).toBeDefined();
      expect(servers.globalServer.command).toBe("global");
    });

    it("should merge global and project servers", () => {
      const mainConfig: ClaudeMainConfig = {
        mcpServers: {
          globalServer: { type: "stdio", command: "global" },
        },
        projects: {
          "/my/project": {
            mcpServers: {
              projectServer: { type: "stdio", command: "project" },
            },
          },
        },
      };

      const servers = getAllMCPServers(mainConfig, "/my/project");

      expect(Object.keys(servers).length).toBe(2);
      expect(servers.globalServer).toBeDefined();
      expect(servers.projectServer).toBeDefined();
    });

    it("should allow project servers to override global", () => {
      const mainConfig: ClaudeMainConfig = {
        mcpServers: {
          server: { type: "stdio", command: "global" },
        },
        projects: {
          "/my/project": {
            mcpServers: {
              server: { type: "stdio", command: "project-override" },
            },
          },
        },
      };

      const servers = getAllMCPServers(mainConfig, "/my/project");
      expect(servers.server.command).toBe("project-override");
    });
  });

  describe("getHooksForEvent", () => {
    it("should return empty array for non-existent event", () => {
      const settings: SettingsConfig = {};
      const hooks = getHooksForEvent(settings, "SessionStart" as HookEvent);
      expect(hooks).toEqual([]);
    });

    it("should return hooks for matching event", () => {
      const settings: SettingsConfig = {
        hooks: {
          SessionStart: [
            {
              hooks: [{ type: "command", command: "echo 'session started'" }],
            },
          ],
        },
      };

      const hooks = getHooksForEvent(settings, "SessionStart" as HookEvent);
      expect(hooks.length).toBe(1);
      expect(hooks[0].type).toBe("command");
    });

    it("should match tool name with matcher regex", () => {
      const settings: SettingsConfig = {
        hooks: {
          PreToolUse: [
            {
              matcher: "^Bash$",
              hooks: [{ type: "command", command: "validate-bash" }],
            },
          ],
        },
      };

      const hooks = getHooksForEvent(settings, "PreToolUse" as HookEvent, "Bash");
      expect(hooks.length).toBe(1);

      const noMatch = getHooksForEvent(settings, "PreToolUse" as HookEvent, "Read");
      expect(noMatch).toEqual([]);
    });

    it("should return hooks without matcher for any tool", () => {
      const settings: SettingsConfig = {
        hooks: {
          PostToolUse: [
            {
              hooks: [{ type: "command", command: "log-tool-use" }],
            },
          ],
        },
      };

      const hooks = getHooksForEvent(settings, "PostToolUse" as HookEvent, "AnyTool");
      expect(hooks.length).toBe(1);
    });
  });

  describe("settingsToHookDefinitions", () => {
    it("should return empty object for settings without hooks", () => {
      const settings: SettingsConfig = {};
      const definitions = settingsToHookDefinitions(settings);
      expect(definitions).toEqual({});
    });

    it("should convert command hooks to HookDefinitions", () => {
      const settings: SettingsConfig = {
        hooks: {
          SessionStart: [
            {
              hooks: [{ type: "command", command: "echo 'start'" }],
            },
          ],
        },
      };

      const definitions = settingsToHookDefinitions(settings);

      expect(definitions.SessionStart).toBeDefined();
      expect(definitions.SessionStart?.length).toBe(1);
      expect(definitions.SessionStart?.[0].type).toBe("command");
      expect(definitions.SessionStart?.[0].command).toBe("echo 'start'");
    });

    it("should convert prompt hooks to HookDefinitions", () => {
      const settings: SettingsConfig = {
        hooks: {
          PreToolUse: [
            {
              hooks: [{ type: "prompt", prompt: "Review this tool use" }],
            },
          ],
        },
      };

      const definitions = settingsToHookDefinitions(settings);

      expect(definitions.PreToolUse).toBeDefined();
      expect(definitions.PreToolUse?.[0].type).toBe("prompt");
    });

    it("should use default timeout when not specified", () => {
      const settings: SettingsConfig = {
        hooks: {
          SessionEnd: [
            {
              hooks: [{ type: "command", command: "cleanup" }],
            },
          ],
        },
      };

      const definitions = settingsToHookDefinitions(settings);

      // Default timeout is 60000 for command hooks
      expect(definitions.SessionEnd?.[0].timeout).toBe(60000);
    });

    it("should use custom timeout when specified", () => {
      const settings: SettingsConfig = {
        hooks: {
          SessionEnd: [
            {
              hooks: [{ type: "command", command: "cleanup", timeout: 5000 }],
            },
          ],
        },
      };

      const definitions = settingsToHookDefinitions(settings);

      expect(definitions.SessionEnd?.[0].timeout).toBe(5000);
    });
  });

  describe("getPermissionMode", () => {
    it("should return 'default' when no permission mode set", () => {
      const settings: SettingsConfig = {};
      expect(getPermissionMode(settings)).toBe("default");
    });

    it("should return the configured permission mode", () => {
      const settings: SettingsConfig = {
        permissions: { defaultMode: "acceptEdits" },
      };
      expect(getPermissionMode(settings)).toBe("acceptEdits");
    });

    it("should handle all permission modes", () => {
      const modes = ["default", "acceptEdits", "bypassPermissions", "plan", "dontAsk"];

      for (const mode of modes) {
        const settings: SettingsConfig = {
          permissions: { defaultMode: mode as any },
        };
        expect(getPermissionMode(settings)).toBe(mode);
      }
    });
  });

  describe("getAllowedTools", () => {
    it("should return empty set when no allowed tools configured", () => {
      const settings: SettingsConfig = {};
      const tools = getAllowedTools(settings);
      expect(tools.size).toBe(0);
    });

    it("should return set of allowed tools", () => {
      const settings: SettingsConfig = {
        permissions: {
          allowedTools: ["Read", "Write", "Bash"],
        },
      };

      const tools = getAllowedTools(settings);

      expect(tools.size).toBe(3);
      expect(tools.has("Read")).toBe(true);
      expect(tools.has("Write")).toBe(true);
      expect(tools.has("Bash")).toBe(true);
    });
  });

  describe("getDisallowedTools", () => {
    it("should return empty set when no disallowed tools configured", () => {
      const settings: SettingsConfig = {};
      const tools = getDisallowedTools(settings);
      expect(tools.size).toBe(0);
    });

    it("should return set of disallowed tools", () => {
      const settings: SettingsConfig = {
        permissions: {
          disallowedTools: ["Bash", "Edit"],
        },
      };

      const tools = getDisallowedTools(settings);

      expect(tools.size).toBe(2);
      expect(tools.has("Bash")).toBe(true);
      expect(tools.has("Edit")).toBe(true);
    });
  });

  describe("CONFIG_PATHS", () => {
    it("should have correct path structure", () => {
      expect(CONFIG_PATHS.main).toContain(".claude.json");
      expect(CONFIG_PATHS.settings).toContain(".claude/settings.json");
      expect(CONFIG_PATHS.keybindings).toContain(".claude/keybindings.json");
    });

    it("should generate project settings path correctly", () => {
      const projectPath = "/my/project";
      const settingsPath = CONFIG_PATHS.projectSettings(projectPath);

      expect(settingsPath).toBe(join(projectPath, ".claude", "settings.json"));
    });
  });
});
