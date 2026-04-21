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

  /** Enable WebSocket status broadcasting (supervisor mode) */
  enableWebSocket?: boolean;
  /** Enable SSE status broadcasting (supervisor mode) */
  enableSSE?: boolean;

  /** Run as a 24/7 daemon -- picks tasks from queue, idles when empty */
  daemon?: boolean;
  /** Initial task for daemon mode (optional -- can also submit via HTTP) */
  daemonTask?: string;

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
    // 0 = use model's declared maxOutput (capped at 32K per-turn in agentLoop, CC-style)
    maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || process.env.CODER_MAX_TOKENS || "0"),
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
        result.maxTokens = parseInt(args[++i] ?? "16384", 10);
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
      case "--daemon":
        result.daemon = true;
        break;
      case "--daemon-task":
        result.daemonTask = args[++i];
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
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
  --max-tokens <tokens>         Maximum output tokens per turn (default: model max, capped at 32000)
  -v, --version                 Show version and exit
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
  --daemon                      Run as 24/7 daemon (picks tasks from queue, idles when empty)
  --daemon-task <task>          Seed the daemon queue with an initial task
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
