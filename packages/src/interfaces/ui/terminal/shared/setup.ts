/**
 * Session Setup
 * Shared initialization logic for CLI and TUI modes
 */

import type { MCPServerConfig, ToolDefinition, PermissionMode } from "../../../../types/index.js";
import { MCPClientImpl, createMCPClients } from "../../../mcp/client.js";
import { HookManager } from "../../../../ecosystem/hooks/index.js";
import { createPromptEvaluator } from "../../../../ecosystem/hooks/prompt-evaluator.js";
import { SkillManager } from "../../../../ecosystem/skills/index.js";
import { TeammateManager } from "../../../../teammates/index.js";
import {
  loadAllConfigs,
  getMergedSettings,
  getPermissionMode,
  getAllowedTools,
  getDisallowedTools,
  getAllMCPServers,
  settingsToHookDefinitions,
  type LoadedConfig,
  type SettingsConfig,
} from "../../../../core/config-loader.js";
import { createSecurityHookHandlers } from "../../../../core/cognitive-security/hooks.js";
import type { CLIArgs } from "./args.js";

// ============================================
// TYPES
// ============================================

export interface SessionSetup {
  loadedConfig: LoadedConfig;
  mergedSettings: SettingsConfig;
  hookManager: HookManager;
  skillManager: SkillManager;
  teammateManager: TeammateManager;
  mcpClients: Map<string, MCPClientImpl>;
  tools: ToolDefinition[];
  permissionMode: PermissionMode;
  allowedTools: Set<string>;
  disallowedTools: Set<string>;
}

export interface SetupOptions {
  args: CLIArgs;
  apiKey: string;
  workingDirectory: string;
  onProgress?: (message: string) => void;
  /** When true, disable console logging for security hooks (prevents TUI corruption) */
  isTuiMode?: boolean;
}

// ============================================
// MCP CONFIG LOADER
// ============================================

export async function loadMCPConfig(configPath: string): Promise<Record<string, MCPServerConfig>> {
  try {
    const file = Bun.file(configPath);
    const content = await file.text();
    const config = JSON.parse(content) as Record<string, unknown>;

    // Support both formats:
    // 1. { "servers": { "name": {...} } }
    // 2. { "name": {...} } (direct server config)
    if ("servers" in config && typeof config.servers === "object" && config.servers !== null) {
      return config.servers as Record<string, MCPServerConfig>;
    }

    // Check if it looks like direct server config (has "type" at top level)
    if ("type" in config) {
      // Single server config without "servers" wrapper
      const servers: Record<string, MCPServerConfig> = {};
      servers["default"] = config as unknown as MCPServerConfig;
      return servers;
    }

    return config as Record<string, MCPServerConfig>;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load MCP config from ${configPath}: ${errorMessage}`);
  }
}

// ============================================
// MCP TOOLS CONVERTER
// ============================================

export function mcpToolsToToolDefinitions(mcpClients: Map<string, MCPClientImpl>): ToolDefinition[] {
  const tools: ToolDefinition[] = [];

  for (const [serverName, client] of mcpClients) {
    for (const mcpTool of client.tools) {
      tools.push({
        name: `mcp__${serverName}__${mcpTool.name}`,
        description: mcpTool.description,
        input_schema: mcpTool.inputSchema,
        handler: async (args, context) => {
          if (!client.connected) {
            return {
              content: `Error: MCP server "${serverName}" is not connected`,
              is_error: true,
            };
          }
          return client.callTool(mcpTool.name, args);
        },
      });
    }
  }

  return tools;
}

// ============================================
// SESSION SETUP
// ============================================

export async function setupSession(options: SetupOptions): Promise<SessionSetup> {
  const { args, apiKey, workingDirectory, onProgress } = options;

  const log = (msg: string) => {
    if (onProgress) onProgress(msg);
    else console.log(`\x1b[90m${msg}\x1b[0m`);
  };

  // ============================================
  // LOAD CONFIGURATION
  // ============================================
  log("Loading configuration...");

  let loadedConfig: LoadedConfig;
  try {
    loadedConfig = await loadAllConfigs(workingDirectory);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Warning: Failed to load config: ${errorMessage}`);
    // Use empty defaults
    loadedConfig = {
      main: {},
      settings: {},
      keybindings: { bindings: [] },
      projectSettings: {},
      sources: [],
    };
  }

  // Get merged settings (project overrides global)
  const mergedSettings = getMergedSettings(loadedConfig.settings, loadedConfig.projectSettings);

  // Log loaded config sources
  if (loadedConfig.sources.length > 0) {
    log(`  Config sources: ${loadedConfig.sources.length} files`);
  }

  // Determine permission mode
  let permissionMode = args.permissionMode;
  if (permissionMode === "default") {
    const configMode = getPermissionMode(mergedSettings);
    if (configMode !== "default") {
      permissionMode = configMode;
      log(`  Permission mode: ${configMode} (from config)`);
    }
  }

  // Get allowed/disallowed tools from config
  const allowedTools = getAllowedTools(mergedSettings);
  const disallowedTools = getDisallowedTools(mergedSettings);

  // ============================================
  // INITIALIZE MANAGERS
  // ============================================

  // Create prompt evaluator for LLM-based hooks
  const promptEvaluator = createPromptEvaluator({
    apiKey,
    model: "claude-haiku-4-5", // Fast model for hook evaluation
    maxTokens: 256,
  });

  // Initialize components
  const hookManager = new HookManager(60000, promptEvaluator);
  const skillManager = new SkillManager();
  const teammateManager = new TeammateManager();

  // ============================================
  // REGISTER HOOKS
  // ============================================

  // Register hooks from config
  const hookDefinitions = settingsToHookDefinitions(mergedSettings);
  for (const [event, definitions] of Object.entries(hookDefinitions)) {
    for (const def of definitions) {
      hookManager.register(event as import("../../../../types/index.js").HookEvent, def);
    }
  }
  if (Object.keys(hookDefinitions).length > 0) {
    log(`  Hooks registered: ${Object.keys(hookDefinitions).length} events`);
  }

  // Register cognitive security hooks (in-process handlers)
  // When bypassPermissions is set, disable all security checks
  // In TUI mode, disable console logging to prevent corrupting the display
  const isBypassMode = permissionMode === "bypassPermissions";
  const isTuiMode = options.isTuiMode ?? false;
  const securityHandlers = createSecurityHookHandlers({
    enabled: !isBypassMode, // Disable entirely in bypass mode
    checkIntentAlignment: !isBypassMode,
    enforceFlowPolicies: !isBypassMode,
    preventLeaks: !isBypassMode,
    trackTaints: !isBypassMode,
    logEvents: !isTuiMode, // Disable console logging in TUI mode to prevent display corruption
    blockOnViolation: false, // Never block - log only
    minAlignmentScore: 0.3,
    approvalRequiredSensitivities: ["secret", "top_secret"],
  });

  hookManager.registerHandler("SessionStart", securityHandlers.SessionStart);
  hookManager.registerHandler("PreToolUse", securityHandlers.PreToolUse);
  hookManager.registerHandler("PostToolUse", securityHandlers.PostToolUse);
  hookManager.registerHandler("UserPromptSubmit", securityHandlers.UserPromptSubmit);
  hookManager.registerHandler("SessionEnd", securityHandlers.SessionEnd);

  // Load skills from project
  const skillsDir = workingDirectory + "/.claude/skills";
  skillManager.loadFromDirectory(skillsDir, "project");

  // ============================================
  // MCP SETUP
  // ============================================

  const mcpClients = new Map<string, MCPClientImpl>();

  // Get MCP servers from loaded config
  const configServers = getAllMCPServers(loadedConfig.main, workingDirectory);

  // If --mcp-config is specified, it overrides config file servers
  let servers = configServers;
  if (args.mcpConfig) {
    try {
      log(`Loading MCP config from ${args.mcpConfig}...`);
      const fileServers = await loadMCPConfig(args.mcpConfig);
      servers = fileServers;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`Warning: Failed to load MCP config file: ${errorMessage}`);
    }
  }

  // Connect to MCP servers
  if (Object.keys(servers).length > 0) {
    // Only count enabled servers
    const enabledServers = Object.entries(servers).filter(([_, config]) => !config.disabled);
    const serverCount = enabledServers.length;

    if (serverCount > 0) {
      log(`  Connecting to ${serverCount} MCP server(s)...`);

      const connectedClients = await createMCPClients(servers, (message) => {
        log(`    ${message}`);
      });

      for (const [name, client] of connectedClients) {
        mcpClients.set(name, client);
      }

      if (mcpClients.size > 0) {
        log(`  Connected to ${mcpClients.size} MCP server(s)`);
      } else {
        log(`  Warning: No MCP servers connected successfully`);
      }
    } else if (Object.keys(servers).length > 0) {
      log(`  MCP config loaded but all ${Object.keys(servers).length} server(s) are disabled`);
    }
  }

  // ============================================
  // BUILD TOOLS
  // ============================================

  // Import built-in tools dynamically to avoid circular deps
  const { builtInTools } = await import("../../../../ecosystem/tools/index.js");

  const tools: ToolDefinition[] = [
    ...builtInTools,
    ...mcpToolsToToolDefinitions(mcpClients),
  ];

  return {
    loadedConfig,
    mergedSettings,
    hookManager,
    skillManager,
    teammateManager,
    mcpClients,
    tools,
    permissionMode,
    allowedTools,
    disallowedTools,
  };
}
