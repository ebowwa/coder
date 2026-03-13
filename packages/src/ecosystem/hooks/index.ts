/**
 * Hook System - Lifecycle event handlers
 */

import type { HookEvent, HookDefinition, HookInput, HookOutput } from "../../types/index.js";
import { spawn } from "child_process";

export type HookHandler = (input: HookInput) => Promise<HookOutput>;

/**
 * Prompt evaluator function type - calls LLM to evaluate hook prompt
 */
export type PromptEvaluator = (prompt: string, context: HookInput) => Promise<HookOutput>;

/**
 * Extended hook definition that supports shell commands, in-process handlers, and LLM prompts
 */
export interface ExtendedHookDefinition extends HookDefinition {
  /** In-process handler function (alternative to command) */
  handler?: HookHandler;
  /** Prompt template for LLM-based evaluation (alternative to command) */
  prompt?: string;
  /** Matcher pattern for filtering which tools this hook applies to */
  _matcher?: string;
}

export class HookManager {
  private hooks = new Map<HookEvent, ExtendedHookDefinition[]>();
  private timeout: number;
  private promptEvaluator?: PromptEvaluator;

  constructor(timeout = 60000, promptEvaluator?: PromptEvaluator) {
    this.timeout = timeout;
    this.promptEvaluator = promptEvaluator;
  }

  /**
   * Set the prompt evaluator for LLM-based hooks
   */
  setPromptEvaluator(evaluator: PromptEvaluator): void {
    this.promptEvaluator = evaluator;
  }

  register(event: HookEvent, definition: HookDefinition | ExtendedHookDefinition): void {
    if (!this.hooks.has(event)) {
      this.hooks.set(event, []);
    }
    this.hooks.get(event)?.push(definition as ExtendedHookDefinition);
  }

  /**
   * Register an in-process handler for an event
   */
  registerHandler(event: HookEvent, handler: HookHandler, options?: { timeout?: number; enabled?: boolean }): void {
    this.register(event, {
      event,
      command: "", // Not used for in-process handlers
      handler,
      timeout: options?.timeout,
      enabled: options?.enabled ?? true,
    });
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

      // Check matcher if present
      if (def._matcher && input.tool_name) {
        try {
          const regex = new RegExp(def._matcher);
          if (!regex.test(input.tool_name)) {
            // Matcher doesn't match, skip this hook
            continue;
          }
        } catch {
          // Invalid regex, skip
          continue;
        }
      }

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

  private async executeHook(def: ExtendedHookDefinition, input: HookInput): Promise<HookOutput> {
    // If handler function is provided, use it directly
    if (def.handler) {
      try {
        return await def.handler(input);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          decision: "deny",
          reason: `Hook handler error: ${errorMessage}`,
          errors: [errorMessage],
        };
      }
    }

    // If prompt is provided, use LLM evaluation
    if (def.prompt && this.promptEvaluator) {
      try {
        return await this.promptEvaluator(def.prompt, input);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          decision: "deny",
          reason: `Prompt hook error: ${errorMessage}`,
          errors: [errorMessage],
        };
      }
    }

    // Skip hooks with empty commands (e.g., prompt-type hooks without evaluator)
    if (!def.command || def.command.trim() === "") {
      // Allow the operation to proceed if there's no command to execute
      return { decision: "allow" };
    }

    // Shell command execution
    const timeout = def.timeout || this.timeout;

    try {
      const result = await new Promise<HookOutput>((resolve, reject) => {
        const proc = spawn(def.command, [], {
          shell: true,
          stdio: ["pipe", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";
        let timedOut = false;

        const timer = setTimeout(() => {
          timedOut = true;
          proc.kill();
          resolve({
            decision: "deny",
            reason: "Hook timeout",
            errors: ["Hook execution timed out"],
          });
        }, timeout);

        proc.stdout?.on("data", (data: Buffer) => {
          stdout += data.toString();
        });

        proc.stderr?.on("data", (data: Buffer) => {
          stderr += data.toString();
        });

        proc.on("close", (code: number | null) => {
          clearTimeout(timer);
          if (timedOut) return; // Already resolved

          // Try to parse JSON from stdout first (works for all exit codes)
          let parsedOutput: HookOutput | null = null;
          if (stdout.trim()) {
            try {
              parsedOutput = JSON.parse(stdout) as HookOutput;
            } catch {
              // stdout not valid JSON, ignore
            }
          }

          if (code === 0) {
            // Success - use parsed output or default to allow
            resolve(parsedOutput || { decision: "allow" });
          } else if (code === 1) {
            // Deny - use parsed output or fall back to stderr
            if (parsedOutput) {
              resolve(parsedOutput);
            } else {
              resolve({
                decision: "deny",
                reason: stderr || "Hook denied execution",
                errors: stderr ? [stderr] : ["Hook denied execution"],
              });
            }
          } else if (code === 2) {
            // Block - use parsed output or fall back to stderr
            if (parsedOutput) {
              resolve(parsedOutput);
            } else {
              resolve({
                decision: "block",
                reason: stderr || "Hook blocked execution",
                errors: stderr ? [stderr] : ["Hook blocked execution"],
              });
            }
          } else {
            // Other error - default to deny
            resolve({
              decision: "deny",
              reason: `Hook exited with code ${code}`,
              errors: [`Hook exited with code ${code}`],
            });
          }
        });

        proc.on("error", (error: Error) => {
          clearTimeout(timer);
          resolve({
            decision: "deny",
            reason: `Hook error: ${error.message}`,
            errors: [error.message],
          });
        });

        // Send input via stdin
        proc.stdin?.write(JSON.stringify(input));
        proc.stdin?.end();
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        decision: "deny",
        reason: `Hook execution failed: ${errorMessage}`,
        errors: [errorMessage],
      };
    }
  }

  getHooks(event: HookEvent): ExtendedHookDefinition[] {
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
  PrePrompt: "Before prompt is sent to the model. Can modify system/user prompts.",
  PostPrompt: "After model response. Can process or modify response.",
  TeammateIdle: "When a teammate goes idle (no activity for 60+ seconds).",
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

// Re-export prompt evaluator utilities
export { createPromptEvaluator, createMockPromptEvaluator } from "./prompt-evaluator.js";
export type { PromptEvaluatorOptions } from "./prompt-evaluator.js";
