/**
 * Permission System - Interactive permission prompts
 */

import * as readline from "readline";

// ============================================
// TYPES
// ============================================

export type PermissionMode =
  | "default"
  | "acceptEdits"
  | "bypassPermissions"
  | "dontAsk"
  | "interactive"
  | "plan";

export type PermissionDecision =
  | "allow"
  | "deny"
  | "allowAlways"
  | "denyAlways";

export interface PermissionRequest {
  toolName: string;
  toolInput: Record<string, unknown>;
  riskLevel: "low" | "medium" | "high" | "critical";
  description: string;
  file?: string;
  command?: string;
}

export interface PermissionResult {
  decision: PermissionDecision;
  reason?: string;
}

export interface PermissionCache {
  [key: string]: {
    decision: PermissionDecision;
    timestamp: number;
  };
}

export type PermissionPromptCallback = (
  request: PermissionRequest
) => Promise<PermissionResult>;

// ============================================
// RISK LEVEL ASSESSMENT
// ============================================

const TOOL_RISK_LEVELS: Record<string, "low" | "medium" | "high" | "critical"> = {
  // Low risk - read-only, non-destructive
  Read: "low",
  Glob: "low",
  Grep: "low",
  Task: "low",

  // Medium risk - modifies files but reversible
  Write: "medium",
  Edit: "medium",
  NotebookEdit: "medium",

  // Bash is assessed dynamically based on command
  // Default to medium, elevated to high/critical by assessRiskLevel
  Bash: "medium",

  // Critical risk - irreversible operations
  // (handled by input analysis)
};

// Read-only commands that are safe to auto-approve
const READ_ONLY_COMMANDS = [
  /^date\b/,
  /^ls\b/,
  /^cat\b/,
  /^head\b/,
  /^tail\b/,
  /^echo\b/,
  /^pwd\b/,
  /^whoami\b/,
  /^which\b/,
  /^uname\b/,
  /^hostname\b/,
  /^id\b/,
  /^printenv\b/,
  /^env\b/,
  /^git\s+status\b/,
  /^git\s+log\b/,
  /^git\s+diff\b/,
  /^git\s+branch\b/,
  /^git\s+remote\b/,
  /^git\s+rev-parse\b/,
  /^git\s+show\b/,
  /^npm\s+list\b/,
  /^bun\s+--version\b/,
  /^bun\s+-v\b/,
  /^node\s+--version\b/,
  /^node\s+-v\b/,
  /^python\s+--version\b/,
  /^python3\s+--version\b/,
  /^uv\s+--version\b/,
  /^doppler\s+\w+\s+--help\b/,
];

const CRITICAL_PATTERNS = [
  /\brm\s+-rf\b/,
  /\brm\s+-r\b/,
  /\brm\s+[^-]/,
  /\bgit\s+push\s+--force\b/,
  /\bgit\s+reset\s+--hard\b/,
  /\bgit\s+clean\s+-fd\b/,
  /\bdrop\b/i,
  /\bdelete\b/i,
  /\btruncate\b/i,
  /\bformat\b/i,
  /\bdd\s+if=/,
  /\bshred\b/,
  /\b:\(\)\{\s*:\|:\s*&\s*\};\s*:\b/, // Fork bomb
];

/**
 * Assess risk level for a tool operation
 */
export function assessRiskLevel(
  toolName: string,
  toolInput: Record<string, unknown>
): "low" | "medium" | "high" | "critical" {
  // Start with base risk level
  let riskLevel = TOOL_RISK_LEVELS[toolName] ?? "medium";

  // Check for critical patterns in Bash commands
  if (toolName === "Bash") {
    const command = String(toolInput.command ?? "");

    for (const pattern of CRITICAL_PATTERNS) {
      if (pattern.test(command)) {
        return "critical";
      }
    }

    // Elevated commands increase risk
    if (/\bsudo\b/.test(command) || /\bchmod\b/.test(command)) {
      riskLevel = "high";
    }
  }

  // Write to sensitive files increases risk
  if (toolName === "Write" || toolName === "Edit") {
    const filePath = String(toolInput.file_path ?? toolInput.path ?? "");

    if (/\.(env|pem|key|secret|credentials)/.test(filePath)) {
      riskLevel = "high";
    }
    if (/\/\.ssh\//.test(filePath) || /\/\.gnupg\//.test(filePath)) {
      riskLevel = "critical";
    }
  }

  return riskLevel;
}

/**
 * Generate a human-readable description of the tool operation
 */
export function generateDescription(
  toolName: string,
  toolInput: Record<string, unknown>
): string {
  switch (toolName) {
    case "Read":
      return `Read file: ${toolInput.file_path ?? "unknown"}`;
    case "Write":
      return `Write file: ${toolInput.file_path ?? "unknown"} (${String(toolInput.content ?? "").length} chars)`;
    case "Edit":
      return `Edit file: ${toolInput.file_path ?? "unknown"}`;
    case "Bash":
      return `Execute: ${String(toolInput.command ?? "").slice(0, 100)}${String(toolInput.command ?? "").length > 100 ? "..." : ""}`;
    case "Glob":
      return `Find files: ${toolInput.pattern ?? "*"}`;
    case "Grep":
      return `Search: "${toolInput.pattern ?? ""}" in ${toolInput.path ?? "."}`;
    case "Task":
      return `Spawn agent: ${toolInput.subagent_type ?? "unknown"}`;
    default:
      return `Use tool: ${toolName}`;
  }
}

// ============================================
// PERMISSION MANAGER
// ============================================

export class PermissionManager {
  private cache: PermissionCache = {};
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private promptCallback: PermissionPromptCallback;
  private mode: PermissionMode;

  constructor(
    mode: PermissionMode = "default",
    promptCallback?: PermissionPromptCallback
  ) {
    this.mode = mode;
    this.promptCallback = promptCallback ?? this.defaultPrompt.bind(this);
  }

  /**
   * Check if a tool operation is permitted
   */
  async checkPermission(
    toolName: string,
    toolInput: Record<string, unknown>
  ): Promise<PermissionResult> {
    // Bypass mode - always allow
    if (this.mode === "bypassPermissions") {
      return { decision: "allow" };
    }

    // DontAsk mode - always deny
    if (this.mode === "dontAsk") {
      return { decision: "deny", reason: "Permission mode is dontAsk" };
    }

    // AcceptEdits mode - allow file operations and non-critical Bash commands
    if (this.mode === "acceptEdits") {
      const fileTools = ["Read", "Write", "Edit", "Glob", "Grep"];
      if (fileTools.includes(toolName)) {
        return { decision: "allow" };
      }
      // Also allow non-critical Bash commands (low/medium risk)
      if (toolName === "Bash") {
        const riskLevel = assessRiskLevel(toolName, toolInput);
        if (riskLevel === "low" || riskLevel === "medium") {
          return { decision: "allow" };
        }
      }
    }

    // Plan mode - deny all write operations
    if (this.mode === "plan") {
      const readOnlyTools = ["Read", "Glob", "Grep", "Task"];
      if (readOnlyTools.includes(toolName)) {
        return { decision: "allow" };
      }
      return { decision: "deny", reason: "Plan mode - write operations disabled" };
    }

    // Check cache for "always" decisions
    const cacheKey = this.getCacheKey(toolName, toolInput);
    const cached = this.cache[cacheKey];

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      if (cached.decision === "allowAlways") {
        return { decision: "allow", reason: "Previously approved (always)" };
      }
      if (cached.decision === "denyAlways") {
        return { decision: "deny", reason: "Previously denied (always)" };
      }
    }

    // Assess risk level
    const riskLevel = assessRiskLevel(toolName, toolInput);
    const description = generateDescription(toolName, toolInput);

    // Create permission request
    const request: PermissionRequest = {
      toolName,
      toolInput,
      riskLevel,
      description,
      file: (toolInput.file_path ?? toolInput.path) as string | undefined,
      command: toolName === "Bash" ? toolInput.command as string : undefined,
    };

    // Prompt user for interactive/default modes
    if (this.mode === "interactive" || this.mode === "default") {
      const result = await this.promptCallback(request);

      // Cache "always" decisions
      if (result.decision === "allowAlways" || result.decision === "denyAlways") {
        this.cache[cacheKey] = {
          decision: result.decision,
          timestamp: Date.now(),
        };
      }

      return result;
    }

    // Default to allow for unknown modes
    return { decision: "allow" };
  }

  /**
   * Generate cache key for permission
   */
  private getCacheKey(toolName: string, toolInput: Record<string, unknown>): string {
    // For file operations, key on file path
    if (["Read", "Write", "Edit"].includes(toolName)) {
      return `${toolName}:${toolInput.file_path ?? toolInput.path ?? "unknown"}`;
    }

    // For bash, key on command (first 100 chars)
    if (toolName === "Bash") {
      const cmd = String(toolInput.command ?? "").slice(0, 100);
      return `${toolName}:${cmd}`;
    }

    // Default: key on tool name only
    return toolName;
  }

  /**
   * Default prompt implementation using readline
   */
  private async defaultPrompt(request: PermissionRequest): Promise<PermissionResult> {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      // Format risk level with color
      const riskColors: Record<string, string> = {
        low: "\x1b[32m",      // Green
        medium: "\x1b[33m",   // Yellow
        high: "\x1b[31m",     // Red
        critical: "\x1b[35m", // Magenta
      };
      const riskColor = riskColors[request.riskLevel] ?? "\x1b[0m";
      const reset = "\x1b[0m";

      console.log("");
      console.log(`\x1b[36m━━━ Permission Required ━━━\x1b[0m`);
      console.log(`Tool: \x1b[1m${request.toolName}\x1b[0m`);
      console.log(`Risk: ${riskColor}${request.riskLevel.toUpperCase()}${reset}`);
      console.log(`Action: ${request.description}`);

      if (request.file) {
        console.log(`File: ${request.file}`);
      }
      if (request.command) {
        console.log(`Command: ${request.command.slice(0, 200)}${request.command.length > 200 ? "..." : ""}`);
      }

      console.log("");

      const options = "[y]es / [n]o / [a]lways / [d]eny always";
      rl.question(`Allow? ${options}: `, (answer) => {
        rl.close();

        const input = answer.trim().toLowerCase();

        switch (input) {
          case "y":
          case "yes":
            resolve({ decision: "allow" });
            break;
          case "a":
          case "always":
            resolve({ decision: "allowAlways" });
            break;
          case "d":
          case "deny":
          case "deny always":
            resolve({ decision: "denyAlways" });
            break;
          case "n":
          case "no":
          default:
            resolve({ decision: "deny" });
            break;
        }
      });
    });
  }

  /**
   * Clear permission cache
   */
  clearCache(): void {
    this.cache = {};
  }

  /**
   * Set permission mode
   */
  setMode(mode: PermissionMode): void {
    this.mode = mode;
    // Clear cache when mode changes
    this.clearCache();
  }
}

// ============================================
// PERMISSION CATEGORIES
// ============================================

/**
 * Tool categories for permission decisions
 */
export const TOOL_CATEGORIES = {
  readOnly: ["Read", "Glob", "Grep", "Task"],
  fileEdit: ["Write", "Edit", "NotebookEdit"],
  system: ["Bash"],
  network: [], // Future: HTTP requests, etc.
} as const;

/**
 * Check if tool is read-only
 */
export function isReadOnlyTool(toolName: string): boolean {
  return TOOL_CATEGORIES.readOnly.includes(toolName as typeof TOOL_CATEGORIES.readOnly[number]);
}

/**
 * Check if tool modifies files
 */
export function isFileEditTool(toolName: string): boolean {
  return TOOL_CATEGORIES.fileEdit.includes(toolName as typeof TOOL_CATEGORIES.fileEdit[number]);
}

/**
 * Check if tool executes system commands
 */
export function isSystemTool(toolName: string): boolean {
  return TOOL_CATEGORIES.system.includes(toolName as typeof TOOL_CATEGORIES.system[number]);
}
