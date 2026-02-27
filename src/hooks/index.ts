/**
 * Hook System - Lifecycle event handlers
 * Based on Claude Code binary analysis
 */

import type { HookEvent, HookDefinition, HookInput, HookOutput } from "../types/index.js";
import { spawn } from "child_process";

export type HookHandler = (input: HookInput) => Promise<HookOutput>;

export class HookManager {
  private hooks = new Map<HookEvent, HookDefinition[]>();
  private timeout: number;

  constructor(timeout = 60000) {
    this.timeout = timeout;
  }

  register(event: HookEvent, definition: HookDefinition): void {
    if (!this.hooks.has(event)) {
      this.hooks.set(event, []);
    }
    this.hooks.get(event)?.push(definition);
  }

  registerAll(hooks: Record<HookEvent, HookDefinition[]>): void {
    for (const [event, definitions] of Object.entries(hooks)) {
      for (const def of definitions) {
        this.register(event as HookEvent, def);
      }
    }
  }

  async execute(event: HookEvent, input: Omit<HookInput, "event" | "timestamp">): Promise<HookOutput> {
    const definitions = this.hooks.get(event);
    if (!definitions || definitions.length === 0) {
      return { decision: "allow" };
    }

    const fullInput: HookInput = {
      ...input,
      event,
      timestamp: Date.now(),
    };

    for (const def of definitions) {
      if (def.enabled === false) continue;

      const result = await this.executeHook(def, fullInput);

      if (result.decision === "deny" || result.decision === "block") {
        return result;
      }

      // Apply modified input if provided
      if (result.modified_input) {
        Object.assign(input, result.modified_input);
      }
    }

    return { decision: "allow" };
  }

  private async executeHook(def: HookDefinition, input: HookInput): Promise<HookOutput> {
    const timeout = def.timeout || this.timeout;

    try {
      const result = await new Promise<HookOutput>((resolve, reject) => {
        const proc = spawn(def.command, [], {
          shell: true,
          stdio: ["pipe", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";

        proc.stdout?.on("data", (data: Buffer) => {
          stdout += data.toString();
        });

        proc.stderr?.on("data", (data: Buffer) => {
          stderr += data.toString();
        });

        proc.on("close", (code: number) => {
          if (code === 0) {
            // Success - parse output
            try {
              const output = JSON.parse(stdout) as HookOutput;
              resolve(output);
            } catch {
              resolve({ decision: "allow" });
            }
          } else if (code === 1) {
            // Show stderr
            resolve({
              decision: "deny",
              reason: stderr || "Hook denied execution",
            });
          } else if (code === 2) {
            // Block
            resolve({
              decision: "block",
              reason: stderr || "Hook blocked execution",
            });
          } else {
            // Other error
            resolve({ decision: "allow" });
          }
        });

        proc.on("error", (error: Error) => {
          resolve({
            decision: "allow",
            reason: `Hook error: ${error.message}`,
          });
        });

        // Send input via stdin
        proc.stdin?.write(JSON.stringify(input));
        proc.stdin?.end();

        // Timeout
        setTimeout(() => {
          proc.kill();
          resolve({
            decision: "allow",
            reason: "Hook timeout",
          });
        }, timeout);
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        decision: "allow",
        reason: `Hook execution failed: ${errorMessage}`,
      };
    }
  }

  getHooks(event: HookEvent): HookDefinition[] {
    return this.hooks.get(event) || [];
  }

  clear(event?: HookEvent): void {
    if (event) {
      this.hooks.delete(event);
    } else {
      this.hooks.clear();
    }
  }
}

// ============================================
// BUILT-IN HOOKS
// ============================================

export const builtInHooks: Record<string, HookDefinition> = {
  /**
   * Example: Validate file paths before write
   */
  validateWrite: {
    event: "PreToolUse",
    command: `node -e '
      const input = JSON.parse(require("fs").readFileSync(0, "utf8"));
      if (input.tool_name === "Write") {
        const path = input.tool_input.file_path;
        if (path.includes("..") || path.startsWith("/etc/")) {
          console.log(JSON.stringify({ decision: "deny", reason: "Unsafe path" }));
          process.exit(1);
        }
      }
      console.log(JSON.stringify({ decision: "allow" }));
    '`,
    timeout: 5000,
    enabled: false,
  },

  /**
   * Example: Log all tool uses
   */
  logToolUse: {
    event: "PostToolUse",
    command: `node -e '
      const input = JSON.parse(require("fs").readFileSync(0, "utf8"));
      console.error(\`[LOG] Tool: \${input.tool_name}\`);
      console.log(JSON.stringify({ decision: "allow" }));
    '`,
    timeout: 5000,
    enabled: false,
  },
};

// ============================================
// HOOK EVENT DOCUMENTATION
// ============================================

export const hookEventDocs: Record<HookEvent, string> = {
  PreToolUse: "Before a tool is executed. Can modify input or deny execution.",
  PostToolUse: "After a tool successfully executes. Can process result.",
  PostToolUseFailure: "After a tool fails. Can handle error or retry.",
  Stop: "When the agent stops (end_turn, max_tokens, error).",
  UserPromptSubmit: "When user submits a prompt. Can modify or reject.",
  SessionStart: "When a new session starts.",
  SessionEnd: "When a session ends.",
  Notification: "When a notification is sent.",
  ConfigChange: "When configuration changes.",
  WorktreeCreate: "When a git worktree is created.",
};

/**
 * Exit codes for hook commands:
 * 0 = Success, allow execution
 * 1 = Show stderr, deny execution
 * 2 = Block execution silently
 */
export const hookExitCodes = {
  ALLOW: 0,
  DENY: 1,
  BLOCK: 2,
};
