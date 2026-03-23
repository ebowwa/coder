/**
 * CLI Argument Parsing
 * Shared between CLI and TUI modes
 */

import type { PermissionMode, ClaudeModel, EffortLevel, MCPServerConfig, AgentType } from "../../../../schemas/index.js";
import { VERSION } from "./status-line.js";
import { DEFAULT_MODEL, resolveModelAlias } from "../../../../core/models.js";

// ============================================
// CLI ARGUMENTS INTERFACE
// ============================================

export interface CLIArgs {
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
  /** Disable progress indicators */
  noProgress?: boolean;
  /** Show version and exit */
  showVersion?: boolean;
  /** Show current status from status file */
  showStatus?: boolean;
  /** Enable debug output */
  debug?: boolean;

  // Claude Code parity - Template and agent type support
  /** Template name to use for spawning */
  template?: string;
  /** Agent type (general-purpose, Explore, Plan, claude-code-guide) */
  agentType?: AgentType;
  /** Comma-separated list of allowed tools */
  allowedTools?: string[];
  /** Comma-separated list of disallowed tools */
  disallowedTools?: string[];
  /** Enable worktree isolation */
  useWorktree?: boolean;

  /** Custom stop sequences that will cause generation to stop */
  stopSequences?: string[];
  /** Result conditions as JSON string or path to JSON file */
  resultConditions?: string;
  /** Stop on unhandled tool errors */
  stopOnUnhandledError?: boolean;

  /** Use readline-based REPL instead of Ink TUI */
  repl?: boolean;

  /** Enable autonomous loop continuation (Ralph-style) */
  continuation?: boolean;

  /** Enable long-running mode for days/weeks of autonomous work */
  longRunning?: boolean;
  /** Original goal for long-running sessions */
  longRunningGoal?: string;
  /** Enable WebSocket streaming for real-time status */
  enableWebSocket?: boolean;
  /** WebSocket port for streaming */
  websocketPort?: number;
  /** Enable SSE streaming for real-time status */
  enableSSE?: boolean;
  /** SSE port for streaming */
  ssePort?: number;

  // Daemon mode options
  /** Enable daemon mode (autonomous, self-healing execution) */
  daemon?: boolean;
  /** Check daemon status */
  daemonStatus?: boolean;
  /** Stop running daemon */
  daemonStop?: boolean;
  /** Stop all running daemons */
  daemonStopAll?: boolean;
  /** List all running daemons */
  daemonList?: boolean;
  /** Force replace existing daemon */
  daemonReplace?: boolean;
  /** Path to daemon config file */
  daemonConfig?: string;
  /** Enable auto-commit in daemon mode */
  daemonAutoCommit?: boolean;
  /** Enable watchdog in daemon mode */
  daemonWatchdog?: boolean;
  /** Enable Telegram alerts in daemon mode */
  daemonTelegram?: boolean;
  /** Max restart attempts in daemon mode */
  daemonMaxRestarts?: number;
  /** Goal for daemon mode */
  daemonGoal?: string;

  // Daemon Observability
  /** Show daemon logs (real-time event stream) */
  daemonLogs?: boolean;
  /** Show daemon progress metrics */
  daemonProgress?: boolean;
  /** Show daemon file activity */
  daemonFiles?: boolean;
  /** Show daemon tool calls */
  daemonTools?: boolean;
  /** Tail mode for logs (follow) */
  daemonFollow?: boolean;

  // Autonomous Daemon
  /** Daemon role: maintainer, developer, reviewer, watcher, researcher, custom */
  daemonRole?: "maintainer" | "developer" | "reviewer" | "watcher" | "researcher" | "custom";
  /** Jurisdiction - directory/domain the daemon is responsible for */
  daemonJurisdiction?: string;
  /** Custom role prompt (for role: "custom") */
  daemonCustomPrompt?: string;
  /** Turn cooldown in ms */
  daemonCooldown?: number;
  /** Max turns per session (0 = unlimited) */
  daemonMaxTurns?: number;
  /** Inject a message into a running daemon */
  daemonInject?: string;

  // MCP server presets (from templates)
  /** Preset MCP servers from templates */
  presetMcpServers?: Record<string, MCPServerConfig>;
}

// ============================================
// ARGUMENT PARSING
// ============================================

export function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const result: CLIArgs = {
    // Read from environment variables (can be configured via Doppler)
    model: process.env.ANTHROPIC_MODEL || process.env.ANTHROPIC_DEFAULT_SONNET_MODEL || DEFAULT_MODEL,
    permissionMode: (process.env.CODER_PERMISSION_MODE || "default") as PermissionMode,
    maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || process.env.CODER_MAX_TOKENS || "4096"),
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--model":
      case "-m":
        result.model = resolveModelAlias(args[++i] ?? DEFAULT_MODEL) as ClaudeModel;
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
      case "--no-progress":
        result.noProgress = true;
        break;
      case "--version":
      case "-v":
        result.showVersion = true;
        break;
      case "--status":
        result.showStatus = true;
        break;
      case "--debug":
      case "-d":
        result.debug = true;
        break;
      case "--template":
        result.template = args[++i];
        break;
      case "--agent-type":
        result.agentType = args[++i] as AgentType;
        break;
      case "--allowed-tools":
        result.allowedTools = (args[++i] ?? "").split(",").map(t => t.trim()).filter(Boolean);
        break;
      case "--disallowed-tools":
        result.disallowedTools = (args[++i] ?? "").split(",").map(t => t.trim()).filter(Boolean);
        break;
      case "--use-worktree":
        result.useWorktree = true;
        break;
      case "--stop-sequences":
        result.stopSequences = (args[++i] ?? "").split(",").map(s => s.trim()).filter(Boolean);
        break;
      case "--result-conditions":
        result.resultConditions = args[++i];
        break;
      case "--stop-on-error":
        result.stopOnUnhandledError = true;
        break;
      case "--repl":
        result.repl = true;
        break;
      case "--continuation":
      case "--ralph":
        result.continuation = true;
        break;
      case "--long-running":
        result.longRunning = true;
        break;
      case "--long-running-goal":
        result.longRunningGoal = args[++i];
        break;
      case "--enable-websocket":
        result.enableWebSocket = true;
        break;
      case "--websocket-port":
        result.websocketPort = parseInt(args[++i] ?? "9876", 10);
        break;
      case "--enable-sse":
        result.enableSSE = true;
        break;
      case "--sse-port":
        result.ssePort = parseInt(args[++i] ?? "9877", 10);
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);

      // Daemon mode flags
      case "--daemon":
        result.daemon = true;
        break;
      case "--daemon-status":
        result.daemonStatus = true;
        break;
      case "--daemon-stop":
        result.daemonStop = true;
        break;
      case "--daemon-stop-all":
        result.daemonStopAll = true;
        break;
      case "--daemon-list":
        result.daemonList = true;
        break;
      case "--daemon-replace":
        result.daemonReplace = true;
        break;
      case "--daemon-config":
        result.daemonConfig = args[++i];
        break;
      case "--daemon-auto-commit":
        result.daemonAutoCommit = true;
        break;
      case "--no-daemon-auto-commit":
        result.daemonAutoCommit = false;
        break;
      case "--daemon-watchdog":
        result.daemonWatchdog = true;
        break;
      case "--no-daemon-watchdog":
        result.daemonWatchdog = false;
        break;
      case "--daemon-telegram":
        result.daemonTelegram = true;
        break;
      case "--daemon-max-restarts":
        result.daemonMaxRestarts = parseInt(args[++i] ?? "10", 10);
        break;
      case "--daemon-goal":
        result.daemonGoal = args[++i];
        break;
      // Observability commands
      case "--daemon-logs":
        result.daemonLogs = true;
        break;
      case "--daemon-progress":
        result.daemonProgress = true;
        break;
      case "--daemon-files":
        result.daemonFiles = true;
        break;
      case "--daemon-tools":
        result.daemonTools = true;
        break;
      case "-f":
      case "--follow":
        result.daemonFollow = true;
        break;
      // Autonomous daemon options
      case "--daemon-role":
        result.daemonRole = args[++i] as CLIArgs["daemonRole"];
        break;
      case "--daemon-jurisdiction":
        result.daemonJurisdiction = args[++i];
        break;
      case "--daemon-custom-prompt":
        result.daemonCustomPrompt = args[++i];
        break;
      case "--daemon-cooldown":
        result.daemonCooldown = parseInt(args[++i] ?? "5000", 10);
        break;
      case "--daemon-max-turns":
        result.daemonMaxTurns = parseInt(args[++i] ?? "0", 10);
        break;
      case "--daemon-inject":
        result.daemonInject = args[++i];
        break;
    }
  }

  return result;
}

// ============================================
// HELP TEXT
// ============================================

export function printHelp(): void {
  console.log(`
Coder v${VERSION}
AI-powered terminal coding assistant

USAGE:
  coder [OPTIONS] [QUERY]

  With Doppler (recommended):
    doppler run -- coder [OPTIONS] [QUERY]

OPTIONS:
  -m, --model <model>           Model to use (default: ${DEFAULT_MODEL})
  -p, --permission-mode <mode>  Permission mode (default, acceptEdits, bypassPermissions)
  --max-tokens <tokens>         Maximum output tokens (default: 4096)
  -v, --version                 Show version and exit
  --status                      Show current Coder status (from background session)
  -d, --debug                   Enable debug output

Extended Thinking:
  -e, --extended-thinking       Enable extended thinking mode
  --effort <level>              Thinking effort: low, medium, high, max
  --interleaved                 Enable interleaved thinking (default: true)
  --no-interleaved              Disable interleaved thinking

Session:
  --system-prompt <prompt>      Override system prompt
  --append-system-prompt <p>    Append to system prompt
  --config <file>               Configuration file path
  --mcp-config <file>           MCP server configuration file
  --resume <session-id>         Resume a previous session
  --sessions                    List recent sessions

Teammate/Agent Mode:
  --teammate-mode               Run as teammate agent
  --agent-id <id>               Agent identifier
  --agent-name <name>           Agent display name
  --team-name <name>            Team name
  --agent-color <color>         Agent color for UI

Templates & Agents (Claude Code parity):
  --template <name>             Use a teammate template (developer, quant, robotics, infrastructure)
  --agent-type <type>           Agent type: general-purpose, Explore, Plan, claude-code-guide
  --allowed-tools <tools>       Comma-separated list of allowed tools
  --disallowed-tools <tools>    Comma-separated list of disallowed tools
  --use-worktree                Enable git worktree isolation for safe parallel work
  --stop-sequences <seq>        Comma-separated stop sequences (e.g., "PUSHED_GIT,COMPLETED")
  --result-conditions <json>    Result conditions as JSON or JSON file path
                                Single: '{"id":"x","action":"stop_success","tools":["Bash"],"successPattern":"pushed"}'
                                Multiple: '[{"id":"push","action":"stop_success","successPattern":"pushed"}]'
  --stop-on-error               Stop loop on unhandled tool errors

Query:
  -q, --query <query>           Single query to execute
  --no-progress                 Disable progress indicators
  --repl                        Use readline-based REPL instead of TUI
  --continuation, --ralph       Enable autonomous loop continuation (keep working until done)
  --long-running                Enable long-running mode for days/weeks of autonomous work
  --long-running-goal <goal>    Original goal for long-running session (auto-saved milestones)

Real-time Streaming:
  --enable-websocket            Enable WebSocket streaming for real-time status
  --websocket-port <port>       WebSocket port (default: 9876)
  --enable-sse                  Enable SSE streaming for real-time status
  --sse-port <port>             SSE port (default: 9877)

Daemon Mode (Autonomous Execution):
  --daemon                      Start daemon mode (auto-restart, watchdog, auto-commit)
  --daemon-status               Check daemon status for current directory
  --daemon-stop                 Stop daemon for current directory
  --daemon-stop-all             Stop all running daemons
  --daemon-list                 List all running daemons
  --daemon-replace              Force replace existing daemon for this directory
  --daemon-config <file>        Load daemon config from JSON file
  --daemon-goal <goal>          Goal for daemon mode
  --daemon-max-restarts <n>     Max restart attempts (default: 10)
  --daemon-telegram             Enable Telegram alerts
  --no-daemon-auto-commit       Disable auto-commit in daemon mode
  --no-daemon-watchdog          Disable watchdog in daemon mode

Autonomous Daemon (Self-directing):
  --daemon-role <role>          Daemon role: maintainer, developer, reviewer, watcher, researcher, custom
  --daemon-jurisdiction <dir>   Directory/domain daemon is responsible for
  --daemon-custom-prompt <txt>  Custom role prompt (for role: custom)
  --daemon-cooldown <ms>        Turn cooldown in ms (default: 5000)
  --daemon-max-turns <n>        Max turns per session (0 = unlimited)
  --daemon-inject <message>     Inject a message into running daemon (redirect/guide)

Daemon Observability:
  --daemon-logs                 Show recent daemon events
  --daemon-progress             Show daemon progress metrics (turns, tokens, cost)
  --daemon-files                Show daemon file activity (read, write, create, delete)
  --daemon-tools                Show daemon tool calls with timing
  -f, --follow                  Tail mode (follow live updates)

  -h, --help                    Show this help message

EXAMPLES:
  # Interactive mode (with Doppler for secrets)
  doppler run -- coder

  # Single query
  doppler run -- coder -q "What files are in this directory?"

  # Use a specific model
  doppler run -- coder -m claude-opus-4-6 "Explain this codebase"

  # Resume a session
  doppler run -- coder --resume abc123-def456

  # Spawn with a template
  doppler run -- coder --template quant "Monitor prediction markets"

  # Spawn an Explore agent (read-only)
  doppler run -- coder --agent-type Explore "Find all TypeScript files"

  # Spawn with worktree isolation
  doppler run -- coder --use-worktree --template developer

  # Show version
  coder --version
`);
}

// ============================================
// API KEY RESOLUTION
// ============================================

export function getApiKey(): string | null {
  return process.env.ANTHROPIC_API_KEY ||
    process.env.CLAUDE_API_KEY ||
    process.env.ANTHROPIC_AUTH_TOKEN ||
    process.env.Z_AI_API_KEY ||
    null;
}

export function requireApiKey(): string {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("Error: ANTHROPIC_API_KEY, CLAUDE_API_KEY, ANTHROPIC_AUTH_TOKEN, or Z_AI_API_KEY environment variable required");
    process.exit(1);
  }
  return apiKey;
}
