/**
 * CLI Argument Parsing
 * Shared between CLI and TUI modes
 */

import type { PermissionMode, ClaudeModel, EffortLevel } from "../../../../types/index.js";
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
      case "--debug":
      case "-d":
        result.debug = true;
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
  --max-tokens <tokens>         Maximum output tokens (default: 4096)
  -v, --version                 Show version and exit
  -d, --debug                   Enable debug output

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
  --no-progress                 Disable progress indicators
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
