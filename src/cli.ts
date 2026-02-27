#!/usr/bin/env bun
/**
 * Claude Code Remake - CLI Entry Point
 * Based on Claude Code v2.1.50 binary analysis
 */

import type { PermissionMode, ClaudeModel, Message, ContentBlock, MCPServerConfig, MCPConfig, ToolDefinition, EffortLevel, ExtendedThinkingConfig } from "./types/index.js";
import { agentLoop, formatCost, formatCostBrief } from "./core/agent-loop.js";
import { builtInTools } from "./tools/index.js";
import { MCPClientImpl, createMCPClients } from "./mcp/client.js";
import { HookManager, builtInHooks } from "./hooks/index.js";
import { SkillManager, isSkillInvocation, parseSkillFile, buildSkillPrompt } from "./skills/index.js";
import { TeammateManager } from "./teammates/index.js";
import {
  SessionStore,
  printSessionsList,
  type SessionSummary,
} from "./core/session-store.js";
import { getGitStatus } from "./core/git-status.js";
import {
  createCheckpoint,
  restoreCheckpoint,
  applyCheckpoint,
  listCheckpoints,
  deleteCheckpoint,
  clearCheckpoints,
  printCheckpointsList,
  formatCheckpoint,
  getCheckpointSummary,
  registerCheckpoint,
  undoCheckpoint,
  redoCheckpoint,
  getNavigationStatus,
  type Checkpoint,
} from "./core/checkpoints.js";
import { loadClaudeMd, buildClaudeMdPrompt } from "./core/claude-md.js";
import {
  loadAllConfigs,
  getMergedSettings,
  getPermissionMode,
  getAllowedTools,
  getDisallowedTools,
  getAllMCPServers,
  settingsToHookDefinitions,
  type LoadedConfig,
} from "./core/config-loader.js";

// ============================================
// MCP CONFIG LOADER
// ============================================

async function loadMCPConfig(configPath: string): Promise<Record<string, MCPServerConfig>> {
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

// Convert MCP tools to built-in tool format
function mcpToolsToToolDefinitions(mcpClients: Map<string, MCPClientImpl>): ToolDefinition[] {
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
// CLI ARGUMENTS
// ============================================

interface CLIArgs {
  model: ClaudeModel;
  permissionMode: PermissionMode;
  maxTokens: number;
  systemPrompt?: string;
  appendSystemPrompt?: string;
  configFile?: string;
  mcpConfig?: string;
  resumeSession?: string;
  listSessions?: boolean;
  teammateMode?: boolean;
  agentId?: string;
  agentName?: string;
  teamName?: string;
  agentColor?: string;
  /** Enable extended thinking with effort level */
  extendedThinking?: boolean;
  /** Effort level: low, medium, high, max */
  effort?: EffortLevel;
  /** Enable interleaved thinking (default: true) */
  interleaved?: boolean;
  query?: string;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const result: CLIArgs = {
    model: "claude-sonnet-4-6",
    permissionMode: "default",
    maxTokens: 4096,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--model":
      case "-m":
        result.model = (args[++i] ?? "claude-sonnet-4-6") as ClaudeModel;
        break;
      case "--permission-mode":
      case "-p":
        result.permissionMode = (args[++i] ?? "default") as PermissionMode;
        break;
      case "--max-tokens":
        result.maxTokens = parseInt(args[++i] ?? "4096", 10);
        break;
      case "--system-prompt":
        result.systemPrompt = args[++i];
        break;
      case "--append-system-prompt":
        result.appendSystemPrompt = args[++i];
        break;
      case "--config":
        result.configFile = args[++i];
        break;
      case "--mcp-config":
        result.mcpConfig = args[++i];
        break;
      case "--resume":
        result.resumeSession = args[++i];
        break;
      case "--sessions":
        result.listSessions = true;
        break;
      case "--teammate-mode":
        result.teammateMode = true;
        break;
      case "--agent-id":
        result.agentId = args[++i];
        break;
      case "--agent-name":
        result.agentName = args[++i];
        break;
      case "--team-name":
        result.teamName = args[++i];
        break;
      case "--agent-color":
        result.agentColor = args[++i];
        break;
      case "--interleaved":
        result.interleaved = true;
        break;
      case "--no-interleaved":
        result.interleaved = false;
        break;
      case "--extended-thinking":
      case "-e":
        result.extendedThinking = true;
        break;
      case "--effort":
        result.effort = (args[++i] as EffortLevel) ?? "medium";
        break;
      case "--query":
      case "-q":
        result.query = args[++i];
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
    }
  }


  return result;
}

function printHelp(): void {
  console.log(`
Claude Code Remake v0.1.0
A reimplementation of Claude Code CLI

USAGE:
  claude-remake [OPTIONS] [QUERY]

OPTIONS:
  -m, --model <model>           Model to use (default: claude-sonnet-4-6)
  -p, --permission-mode <mode>  Permission mode (default, acceptEdits, bypassPermissions)
  --max-tokens <tokens>         Maximum output tokens (default: 4096)

Extended Thinking:
  -e, --extended-thinking       Enable extended thinking mode
  --effort <level>              Thinking effort: low, medium, high, max
  --interleaved                 Enable interleaved thinking (default: true)
  --no-interleaved              Disable interleaved thinking
  --system-prompt <prompt>      Override system prompt
  --append-system-prompt <p>    Append to system prompt
  --config <file>               Configuration file path
  --mcp-config <file>           MCP server configuration file
  --resume <session-id>         Resume a previous session
  --sessions                    List recent sessions
  --teammate-mode               Run as teammate agent
  --agent-id <id>               Agent identifier
  --agent-name <name>           Agent display name
  --team-name <name>            Team name
  --agent-color <color>         Agent color for UI
  -q, --query <query>           Single query to execute
  -h, --help                    Show this help message

EXAMPLES:
  claude-remake "What files are in this directory?"
  claude-remake -m claude-opus-4-6 "Explain this codebase"
  claude-remake --permission-mode acceptEdits "Add a test"
  claude-remake --sessions
  claude-remake --resume abc123-def456
`);
}

// ============================================
// MAIN ENTRY POINT
// ============================================

async function main(): Promise<void> {
  const args = parseArgs();

  // Initialize session store
  const sessionStore = new SessionStore();
  await sessionStore.init();

  // Handle --sessions flag
  if (args.listSessions) {
    const sessions = await sessionStore.listSessions(20);
    printSessionsList(sessions);
    process.exit(0);
  }

  // Check for API key (support multiple env var names including Doppler's Z_AI_API_KEY)
  const apiKey = process.env.ANTHROPIC_API_KEY ||
                 process.env.CLAUDE_API_KEY ||
                 process.env.ANTHROPIC_AUTH_TOKEN ||
                 process.env.Z_AI_API_KEY;
  if (!apiKey) {
    console.error("Error: ANTHROPIC_API_KEY, CLAUDE_API_KEY, ANTHROPIC_AUTH_TOKEN, or Z_AI_API_KEY environment variable required");
    process.exit(1);
  }

  // ============================================
  // LOAD CONFIGURATION
  // ============================================
  console.log("\x1b[90mLoading configuration...\x1b[0m");

  let loadedConfig: LoadedConfig;
  try {
    loadedConfig = await loadAllConfigs(process.cwd());
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`\x1b[33mWarning: Failed to load config: ${errorMessage}\x1b[0m`);
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
    console.log(`\x1b[90m  Config sources: ${loadedConfig.sources.length} files\x1b[0m`);
  }

  // Override permission mode from config if not explicitly set via CLI
  if (args.permissionMode === "default") {
    const configMode = getPermissionMode(mergedSettings);
    if (configMode !== "default") {
      args.permissionMode = configMode;
      console.log(`\x1b[90m  Permission mode: ${configMode} (from config)\x1b[0m`);
    }
  }

  // Get allowed/disallowed tools from config
  const allowedToolsConfig = getAllowedTools(mergedSettings);
  const disallowedToolsConfig = getDisallowedTools(mergedSettings);

  // Initialize components
  const hookManager = new HookManager();
  const skillManager = new SkillManager();
  const teammateManager = new TeammateManager();

  // Register hooks from config
  const hookDefinitions = settingsToHookDefinitions(mergedSettings);
  for (const [event, definitions] of Object.entries(hookDefinitions)) {
    for (const def of definitions) {
      hookManager.register(event as import("./types/index.js").HookEvent, def);
    }
  }
  if (Object.keys(hookDefinitions).length > 0) {
    console.log(`\x1b[90m  Hooks registered: ${Object.keys(hookDefinitions).length} events\x1b[0m`);
  }

  // Load skills from project
  const skillsDir = process.cwd() + "/.claude/skills";
  skillManager.loadFromDirectory(skillsDir, "project");

  // Load MCP clients from config + CLI override
  const mcpClients = new Map<string, MCPClientImpl>();

  // Get MCP servers from loaded config
  const configServers = getAllMCPServers(loadedConfig.main, process.cwd());

  // If --mcp-config is specified, it overrides config file servers
  let servers = configServers;
  if (args.mcpConfig) {
    try {
      console.log(`\x1b[90mLoading MCP config from ${args.mcpConfig}...\x1b[0m`);
      const fileServers = await loadMCPConfig(args.mcpConfig);
      servers = fileServers;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`\x1b[33mWarning: Failed to load MCP config file: ${errorMessage}\x1b[0m`);
    }
  }

  // Connect to MCP servers
  if (Object.keys(servers).length > 0) {
    // Only count enabled servers
    const enabledServers = Object.entries(servers).filter(([_, config]) => !config.disabled);
    const serverCount = enabledServers.length;

    if (serverCount > 0) {
      console.log(`\x1b[90m  Connecting to ${serverCount} MCP server(s)...\x1b[0m`);

      const connectedClients = await createMCPClients(servers, (message) => {
        console.log(`\x1b[90m    ${message}\x1b[0m`);
      });

      for (const [name, client] of connectedClients) {
        mcpClients.set(name, client);
      }

      if (mcpClients.size > 0) {
        console.log(`\x1b[32m  Connected to ${mcpClients.size} MCP server(s)\x1b[0m`);
      } else {
        console.log(`\x1b[33m  Warning: No MCP servers connected successfully\x1b[0m`);
      }
    } else if (Object.keys(servers).length > 0) {
      console.log(`\x1b[90m  MCP config loaded but all ${Object.keys(servers).length} server(s) are disabled\x1b[0m`);
    }
  }

  // Merge built-in tools with MCP tools
  const allTools: ToolDefinition[] = [
    ...builtInTools,
    ...mcpToolsToToolDefinitions(mcpClients),
  ];

  // Get git status for system prompt
  const gitStatus = await getGitStatus(process.cwd());

  // Build system prompt
  let systemPrompt = args.systemPrompt || await buildDefaultSystemPrompt(gitStatus);

  if (args.appendSystemPrompt) {
    systemPrompt += `\n\n${args.appendSystemPrompt}`;
  }

  // Teammate mode adjustments
  if (args.teammateMode && args.teamName) {
    systemPrompt += `\n\nYou are running as a teammate agent in the "${args.teamName}" team.`;
    systemPrompt += `\nAgent ID: ${args.agentId}`;
    systemPrompt += `\nAgent Name: ${args.agentName}`;
  }

  // Handle session resume
  let messages: Message[] = [];
  let sessionId: string;

  if (args.resumeSession) {
    const loadedSession = await sessionStore.resumeSession(args.resumeSession);
    if (!loadedSession) {
      console.error(`Error: Session not found: ${args.resumeSession}`);
      process.exit(1);
    }

    messages = loadedSession.messages;
    sessionId = args.resumeSession;

    // Update args from session metadata
    args.model = loadedSession.metadata.model as ClaudeModel;
    args.agentName = loadedSession.metadata.agentName;
    args.agentColor = loadedSession.metadata.agentColor;
    args.teamName = loadedSession.metadata.teamName;

    console.log(`\x1b[90mResumed session: ${args.resumeSession}\x1b[0m`);
    console.log(`\x1b[90mModel: ${args.model} | Messages: ${messages.length}\x1b[0m\n`);
  } else {
    // Create new session
    sessionId = await sessionStore.createSession({
      model: args.model,
      workingDirectory: process.cwd(),
      agentName: args.agentName,
      agentColor: args.agentColor,
      teamName: args.teamName,
    });
  }

  // Get initial query
  let query = args.query;
  const firstArg = process.argv[2];
  if (!query && process.argv.length > 2 && firstArg && !firstArg.startsWith("-")) {
    query = process.argv.slice(2).join(" ");
  }

  if (!query) {
    console.log("Claude Code Remake v0.1.0");
    console.log(`Session: ${sessionId}`);
    console.log("Type your message or /help for commands.\n");

    // Interactive mode
    await runInteractiveMode(
      apiKey,
      args,
      systemPrompt,
      allTools,
      hookManager,
      skillManager,
      sessionStore,
      messages,
      sessionId,
      mcpClients
    );
  } else {
    // Single query mode
    await runSingleQuery(
      apiKey,
      args,
      systemPrompt,
      allTools,
      query,
      sessionStore,
      sessionId
    );
  }
}

async function runInteractiveMode(
  apiKey: string,
  args: CLIArgs,
  systemPrompt: string,
  tools: ToolDefinition[],
  hookManager: HookManager,
  skillManager: SkillManager,
  sessionStore: SessionStore,
  messages: Message[],
  sessionId: string,
  mcpClients: Map<string, MCPClientImpl>
): Promise<void> {
  // Check if stdin is a TTY (interactive terminal)
  const isInteractive = process.stdin.isTTY;

  // Allow force-interactive mode for testing
  const forceInteractive = process.env.CLAUDE_FORCE_INTERACTIVE === "true";

  if (!isInteractive && !forceInteractive) {
    console.error("Error: Interactive mode requires a TTY. Use -q for single query mode.");
    console.error("       Or set CLAUDE_FORCE_INTERACTIVE=true for testing.");
    return;
  }

  let running = true;
  let totalCost = 0;

  // Get git status once at the start
  const gitStatus = await getGitStatus(process.cwd());

  // Create readline interface
  const rl = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
    historySize: 1000,
    removeHistoryDuplicates: true,
  });

  // Handle Ctrl+C gracefully
  process.on("SIGINT", () => {
    console.log("\n\x1b[90mGoodbye!\x1b[0m");
    rl.close();
    process.exit(0);
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (rl.closed) {
        reject(new Error("Readline closed"));
        return;
      }
      rl.question(prompt, (answer: string) => {
        resolve(answer);
      });
    });
  };

  // Permission request handler
  const handlePermissionRequest = async (request: {
    toolName: string;
    toolInput: Record<string, unknown>;
    riskLevel: string;
    description: string;
    file?: string;
    command?: string;
  }): Promise<{ decision: "allow" | "deny" | "allowAlways" | "denyAlways"; reason?: string }> => {
    console.log(`\n\x1b[36m━━━ Permission Required ━━━\x1b[0m`);
    console.log(`Tool: \x1b[1m${request.toolName}\x1b[0m`);
    console.log(`Risk: \x1b[32m${request.riskLevel.toUpperCase()}\x1b[0m`);
    console.log(`Action: ${request.description}`);

    if (request.file) {
      console.log(`File: ${request.file}`);
    } else if (request.command) {
      console.log(`Command: ${request.command}`);
    } else if (request.toolInput.file_path) {
      console.log(`File: ${request.toolInput.file_path}`);
    } else if (request.toolInput.command) {
      console.log(`Command: ${request.toolInput.command}`);
    }

    while (true) {
      try {
        const answer = await question("\nAllow? [y]es / [n]o / [a]lways / [d]eny always: ");
        const choice = answer.trim().toLowerCase();

        switch (choice) {
          case "y":
          case "yes":
          case "":
            return { decision: "allow" };
          case "n":
          case "no":
            return { decision: "deny", reason: "User denied" };
          case "a":
          case "always":
            return { decision: "allowAlways" };
          case "d":
          case "deny":
            return { decision: "denyAlways", reason: "User denied always" };
          default:
            console.log("Please enter y, n, a, or d");
        }
      } catch {
        return { decision: "deny", reason: "Input error" };
      }
    }
  };

  while (running) {
    try {
      const input = await question("\n\x1b[1;36mYou:\x1b[0m ");

      if (!input.trim()) continue;

      // Handle commands
      if (input.startsWith("/")) {
        const parts = input.slice(1).split(" ");
        const command = parts[0] ?? "";
        const rest = input.slice(command.length + 2);

        switch (command) {
          case "exit":
          case "quit":
          case "q":
            running = false;
            console.log("\x1b[90mGoodbye!\x1b[0m");
            continue;

          case "help":
          case "?":
            console.log(`
\x1b[1mCommands:\x1b[0m
  /help, /?              Show this help
  /exit, /quit, /q       Exit the session
  /clear                 Clear conversation history
  /compact               Force context compaction
  /model <model>         Switch model
  /tools                 List available tools
  /mcp                   List MCP servers and tools
  /skills                List available skills
  /cost                  Show total cost
  /status                Show session status

\x1b[1mCheckpoints (chat + code):\x1b[0m
  /checkpoint <label>    Save checkpoint (chat + files)
  /checkpoints           List saved checkpoints
  /restore <id>          Restore checkpoint (asks about files)
  /restore-chat <id>     Restore chat only (no files)
  /undo                  Go back to previous checkpoint
  /redo                  Go forward after undo
  /cps-status            Show checkpoint navigation status

\x1b[1mExport:\x1b[0m
  /export [format]       Export session (jsonl/json/md)
`);
            continue;

          case "clear":
            messages.length = 0;
            console.log("\x1b[90mConversation cleared.\x1b[0m");
            continue;

          case "compact":
            console.log("\x1b[90mForcing context compaction...\x1b[0m");
            // Will be handled in agentLoop
            continue;

          case "model":
            if (rest) {
              args.model = rest as ClaudeModel;
              console.log(`\x1b[90mSwitched to model: ${rest}\x1b[0m`);
            } else {
              console.log(`Current model: \x1b[1m${args.model}\x1b[0m`);
            }
            continue;

          case "tools":
            console.log("\x1b[1mAvailable tools:\x1b[0m");
            for (const tool of tools) {
              const desc = tool.description.split(".")[0] ?? tool.description;
              console.log(`  \x1b[33m${tool.name}\x1b[0m: ${desc}`);
            }
            continue;

          case "mcp":
            if (mcpClients.size === 0) {
              console.log("\x1b[90mNo MCP servers connected.\x1b[0m");
              console.log("\x1b[90mUse --mcp-config to specify a config file.\x1b[0m");
            } else {
              console.log("\x1b[1mConnected MCP Servers:\x1b[0m");
              for (const [name, client] of mcpClients) {
                const status = client.connected ? "\x1b[32m●\x1b[0m" : "\x1b[31m○\x1b[0m";
                console.log(`  ${status} \x1b[1m${name}\x1b[0m (${client.tools.length} tools)`);
                for (const tool of client.tools) {
                  console.log(`      \x1b[33m${tool.name}\x1b[0m: ${tool.description.slice(0, 50)}...`);
                }
              }
            }
            continue;

          case "skills":
            const allSkills = skillManager.getAll();
            if (allSkills.length === 0) {
              console.log("\x1b[90mNo skills loaded.\x1b[0m");
            } else {
              console.log("\x1b[1mAvailable skills:\x1b[0m");
              for (const skill of allSkills) {
                const desc = skill.description ?? skill.prompt.slice(0, 50);
                console.log(`  \x1b[33m/${skill.name}\x1b[0m: ${desc}...`);
              }
            }
            continue;

          case "cost":
            console.log(`Total cost: \x1b[1m${formatCost(totalCost)}\x1b[0m`);
            continue;

          case "status":
          case "session":
            console.log("\x1b[1mSession Status:\x1b[0m");
            console.log(`  ID: ${sessionId}`);
            console.log(`  Model: ${args.model}`);
            console.log(`  Messages: ${messages.length}`);
            console.log(`  Total cost: ${formatCost(totalCost)}`);
            console.log(`  Permission mode: ${args.permissionMode}`);
            continue;

          case "export":
            try {
              const format = (rest || "markdown") as "jsonl" | "json" | "markdown";
              const outputPath = await sessionStore.exportSession(sessionId, format);
              console.log(`\x1b[90mSession exported to: ${outputPath}\x1b[0m`);
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              console.error(`\x1b[31mExport failed: ${errorMessage}\x1b[0m`);
            }
            continue;

          case "checkpoint":
          case "cp":
            if (!rest) {
              console.log("\x1b[31mUsage: /checkpoint <label>\x1b[0m");
              console.log("\x1b[90mExample: /checkpoint before-refactor\x1b[0m");
              console.log("\x1b[90mCreates checkpoint with chat history + file snapshots\x1b[0m");
              continue;
            }
            try {
              const checkpoint = await createCheckpoint(sessionId, messages, {
                label: rest,
                model: args.model,
                workingDirectory: process.cwd(),
                totalCost,
                trackFiles: true,
              });

              // Register for undo/redo
              await registerCheckpoint(sessionId, checkpoint.id);

              const summary = getCheckpointSummary(checkpoint);
              console.log(`\x1b[32m✓ Checkpoint saved:\x1b[0m ${formatCheckpoint(checkpoint)}`);
              if (summary) {
                console.log(`\x1b[90m  ${summary}\x1b[0m`);
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              console.error(`\x1b[31mFailed to create checkpoint: ${errorMessage}\x1b[0m`);
            }
            continue;

          case "checkpoints":
          case "cps":
            try {
              const checkpoints = await listCheckpoints(sessionId);
              printCheckpointsList(checkpoints);
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              console.error(`\x1b[31mFailed to list checkpoints: ${errorMessage}\x1b[0m`);
            }
            continue;

          case "restore":
          case "rollback":
          case "rewind":
            if (!rest) {
              console.log("\x1b[31mUsage: /${command} <checkpoint-id>\x1b[0m");
              console.log("\x1b[90mUse /checkpoints to see available checkpoints\x1b[0m");
              continue;
            }
            try {
              const checkpointId = rest.trim();
              const checkpoint = await restoreCheckpoint(sessionId, checkpointId);

              if (!checkpoint) {
                console.log(`\x1b[31mCheckpoint not found: ${checkpointId}\x1b[0m`);
                console.log("\x1b[90mUse /checkpoints to see available checkpoints\x1b[0m");
                continue;
              }

              // Show checkpoint details
              console.log(`\n\x1b[1mRestoring checkpoint:\x1b[0m ${formatCheckpoint(checkpoint)}`);

              // Check if there are files to restore
              const hasFiles = checkpoint.files.length > 0;
              let restoreFiles = false;

              if (hasFiles) {
                console.log(`\x1b[33m${checkpoint.files.length} file(s) saved in checkpoint:\x1b[0m`);
                for (const file of checkpoint.files.slice(0, 5)) {
                  console.log(`  - ${file.path}`);
                }
                if (checkpoint.files.length > 5) {
                  console.log(`  ... and ${checkpoint.files.length - 5} more`);
                }

                // Ask user if they want to restore files
                const answer = await question("\n\x1b[36mRestore files too? [Y/n]: \x1b[0m");
                restoreFiles = answer.trim().toLowerCase() !== "n";
              }

              // Apply checkpoint
              const result = await applyCheckpoint(checkpoint, {
                restoreFiles,
                restoreMessages: true,
                workingDirectory: process.cwd(),
              });

              // Restore messages
              messages.length = 0;
              messages.push(...result.messages);

              // Update total cost to checkpoint's cost
              totalCost = checkpoint.metadata.totalCost;

              console.log(`\n\x1b[32m✓ Checkpoint restored:\x1b[0m`);
              console.log(`  Messages: ${messages.length}`);
              if (restoreFiles && hasFiles) {
                console.log(`  Files restored: ${result.filesRestored}`);
                if (result.filesFailed > 0) {
                  console.log(`  \x1b[33mFiles failed: ${result.filesFailed}\x1b[0m`);
                }
              }
              console.log(`  Cost reset to: $${totalCost.toFixed(4)}`);
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              console.error(`\x1b[31mFailed to restore checkpoint: ${errorMessage}\x1b[0m`);
            }
            continue;

          case "restore-chat":
            if (!rest) {
              console.log("\x1b[31mUsage: /restore-chat <checkpoint-id>\x1b[0m");
              console.log("\x1b[90mRestores chat only, no files\x1b[0m");
              continue;
            }
            try {
              const checkpointId = rest.trim();
              const checkpoint = await restoreCheckpoint(sessionId, checkpointId);

              if (!checkpoint) {
                console.log(`\x1b[31mCheckpoint not found: ${checkpointId}\x1b[0m`);
                continue;
              }

              // Apply checkpoint without files
              const result = await applyCheckpoint(checkpoint, {
                restoreFiles: false,
                restoreMessages: true,
              });

              messages.length = 0;
              messages.push(...result.messages);
              totalCost = checkpoint.metadata.totalCost;

              console.log(`\x1b[32m✓ Chat restored:\x1b[0m ${messages.length} messages (no files changed)`);
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              console.error(`\x1b[31mFailed to restore chat: ${errorMessage}\x1b[0m`);
            }
            continue;

          case "undo":
            try {
              const result = await undoCheckpoint(sessionId);

              if (!result.checkpoint) {
                console.log("\x1b[33mNothing to undo\x1b[0m");
                continue;
              }

              // Apply the previous checkpoint
              const applyResult = await applyCheckpoint(result.checkpoint, {
                restoreFiles: true,
                restoreMessages: true,
                workingDirectory: process.cwd(),
              });

              messages.length = 0;
              messages.push(...applyResult.messages);
              totalCost = result.checkpoint.metadata.totalCost;

              console.log(`\x1b[32m✓ Undone to:\x1b[0m ${formatCheckpoint(result.checkpoint)}`);
              console.log(`\x1b[90mMessages: ${messages.length} | Files: ${applyResult.filesRestored}\x1b[0m`);
              if (result.canRedo) {
                console.log("\x1b[90mUse /redo to go forward\x1b[0m");
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              console.error(`\x1b[31mUndo failed: ${errorMessage}\x1b[0m`);
            }
            continue;

          case "redo":
            try {
              const result = await redoCheckpoint(sessionId);

              if (!result.checkpoint) {
                console.log("\x1b[33mNothing to redo\x1b[0m");
                continue;
              }

              // Apply the checkpoint
              const applyResult = await applyCheckpoint(result.checkpoint, {
                restoreFiles: true,
                restoreMessages: true,
                workingDirectory: process.cwd(),
              });

              messages.length = 0;
              messages.push(...applyResult.messages);
              totalCost = result.checkpoint.metadata.totalCost;

              console.log(`\x1b[32m✓ Redone to:\x1b[0m ${formatCheckpoint(result.checkpoint)}`);
              console.log(`\x1b[90mMessages: ${messages.length} | Files: ${applyResult.filesRestored}\x1b[0m`);
              if (result.canRedo) {
                console.log("\x1b[90mUse /redo to go forward again\x1b[0m");
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              console.error(`\x1b[31mRedo failed: ${errorMessage}\x1b[0m`);
            }
            continue;

          case "checkpoint-status":
          case "cps-status":
            try {
              const status = await getNavigationStatus(sessionId);
              console.log(`\x1b[1mCheckpoint Navigation:\x1b[0m`);
              console.log(`  Position: ${status.current}/${status.total}`);
              console.log(`  Can undo: ${status.canUndo ? "\x1b[32myes\x1b[0m" : "\x1b[31mno\x1b[0m"}`);
              console.log(`  Can redo: ${status.canRedo ? "\x1b[32myes\x1b[0m" : "\x1b[31mno\x1b[0m"}`);
              if (status.currentId) {
                console.log(`  Current: ${status.currentId}`);
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              console.error(`\x1b[31mFailed to get status: ${errorMessage}\x1b[0m`);
            }
            continue;

          default:
            // Check if it's a skill invocation
            const skill = skillManager.get(command);
            if (skill) {
              console.log(`\x1b[90mLoading skill: ${skill.name}\x1b[0m`);
              systemPrompt += "\n\n" + buildSkillPrompt(skill);
              continue;
            }

            console.log(`\x1b[31mUnknown command: /${command}\x1b[0m`);
            console.log(`\x1b[90mType /help for available commands.\x1b[0m`);
            continue;
        }
      }

      // Add user message
      messages.push({
        role: "user",
        content: [{ type: "text", text: input }],
      });

      // Save user message to session
      await sessionStore.saveMessage(messages[messages.length - 1]!);

      // Run agent loop
      process.stdout.write("\n\x1b[1;35mClaude:\x1b[0m ");

      // Build extended thinking config
      const extendedThinkingConfig: ExtendedThinkingConfig | undefined = args.extendedThinking ? {
        enabled: true,
        effort: args.effort ?? "medium",
        interleaved: args.interleaved ?? true,
      } : undefined;

      const result = await agentLoop(messages, {
        apiKey,
        model: args.model,
        maxTokens: args.maxTokens,
        systemPrompt,
        tools,
        permissionMode: args.permissionMode,
        workingDirectory: process.cwd(),
        gitStatus,
        extendedThinking: extendedThinkingConfig,
        onText: (text) => {
          process.stdout.write(text);
        },
        onThinking: (thinking) => {
          // Show thinking in a dimmed style
          process.stdout.write(`\x1b[90m${thinking}\x1b[0m`);
        },
        onToolUse: (toolUse) => {
          // Show tool use notification
          process.stdout.write(`\n\x1b[90m[Trying: ${toolUse.name}]\x1b[0m `);
        },
        onToolResult: (result) => {
          // Show tool result briefly
          if (result.result.is_error) {
            process.stdout.write(`\x1b[31m[Error]\x1b[0m `);
          }
        },
        onMetrics: async (metrics) => {
          console.log(`\n\x1b[90m${formatCostBrief(metrics)}\x1b[0m`);
          await sessionStore.saveMetrics(metrics);
        },
        onPermissionRequest: async (request) => {
          const result = await handlePermissionRequest({
            toolName: request.toolName,
            toolInput: request.toolInput,
            riskLevel: request.riskLevel,
            description: request.description,
            file: request.file,
            command: request.command,
          });
          return result;
        },
      });

      // Save assistant message to session
      const lastMessage = result.messages[result.messages.length - 1];
      if (lastMessage && lastMessage.role === "assistant") {
        await sessionStore.saveMessage(lastMessage);
      }

      // Update messages with result
      messages.length = 0;
      messages.push(...result.messages);

      totalCost += result.totalCost;

    } catch (error) {
      if (error instanceof Error && error.message === "Readline closed") {
        break;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`\n\x1b[31mError: ${errorMessage}\x1b[0m`);
    }
  }

  rl.close();
}

async function runSingleQuery(
  apiKey: string,
  args: CLIArgs,
  systemPrompt: string,
  tools: ToolDefinition[],
  query: string,
  sessionStore: SessionStore,
  sessionId: string
): Promise<void> {
  const messages: Message[] = [
    {
      role: "user",
      content: [{ type: "text", text: query }],
    },
  ];

  // Save user message to session
  await sessionStore.saveMessage(messages[0]!);

  // Get git status before running agent loop
  const gitStatus = await getGitStatus(process.cwd());

  // Build extended thinking config
  const extendedThinkingConfig: ExtendedThinkingConfig | undefined = args.extendedThinking ? {
    enabled: true,
    effort: args.effort ?? "medium",
    interleaved: args.interleaved ?? true,
  } : undefined;

  try {
    const result = await agentLoop(messages, {
      apiKey,
      model: args.model,
      maxTokens: args.maxTokens,
      systemPrompt,
      tools,
      permissionMode: args.permissionMode,
      workingDirectory: process.cwd(),
      gitStatus,
      extendedThinking: extendedThinkingConfig,
      onText: (text) => {
        process.stdout.write(text);
      },
      onThinking: (thinking) => {
        process.stdout.write(`\x1b[90m${thinking}\x1b[0m`);
      },
      onMetrics: async (metrics) => {
        console.log(`\n\x1b[90m${formatCostBrief(metrics)}\x1b[0m`);
        await sessionStore.saveMetrics(metrics);
      },
    });

    // Save assistant message to session
    const lastMessage = result.messages[result.messages.length - 1];
    if (lastMessage && lastMessage.role === "assistant") {
      await sessionStore.saveMessage(lastMessage);
    }

    console.log(`\n\x1b[90mSession: ${sessionId}\x1b[0m`);
    console.log(`\x1b[90mTotal cost: ${formatCost(result.totalCost)}\x1b[0m`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${errorMessage}`);
    process.exit(1);
  }
}

async function buildDefaultSystemPrompt(
  gitStatus?: { branch: string; ahead: number; behind: number; staged: string[]; unstaged: string[]; untracked: string[] } | null
): Promise<string> {
  let prompt = `You are Claude Code, an AI coding assistant created by Anthropic.

You help users with software engineering tasks:
- Reading, writing, and editing code
- Running commands and scripts
- Searching and exploring codebases
- Debugging and fixing issues

Guidelines:
1. Be helpful, direct, and thorough
2. Explain your reasoning when asked
3. Follow user preferences and project conventions
4. Use tools effectively to accomplish tasks
5. Ask clarifying questions when needed

Available tools:
- Read: Read file contents
- Write: Write new files
- Edit: Make precise edits to files
- Bash: Execute shell commands
- Glob: Find files by pattern
- Grep: Search file contents

Working directory: ${process.cwd()}`;

  // Add git status information if available
  if (gitStatus) {
    prompt += `\n\nGit Status:`;
    prompt += `\nBranch: ${gitStatus.branch}`;
    if (gitStatus.ahead > 0 || gitStatus.behind > 0) {
      prompt += ` (${gitStatus.ahead} ahead, ${gitStatus.behind} behind)`;
    }
    if (gitStatus.staged.length > 0 || gitStatus.unstaged.length > 0 || gitStatus.untracked.length > 0) {
      prompt += `\nChanges: ${gitStatus.staged.length} staged, ${gitStatus.unstaged.length} unstaged, ${gitStatus.untracked.length} untracked`;
    }
  }

  // Load CLAUDE.md files
  const claudeMdContent = await buildClaudeMdPrompt();
  if (claudeMdContent) {
    prompt += `\n\n${claudeMdContent}`;
  }

  return prompt;
}

// Run main
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
