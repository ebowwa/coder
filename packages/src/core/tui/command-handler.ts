/**
 * Command Handler
 *
 * Parses and dispatches slash commands for TUI.
 * Extracted from multiple TUI implementations to provide unified handling.
 */

import type { PermissionMode, ClaudeModel } from "../../schemas/index.js";
import type { UIMessage } from "../../schemas/ui.zod.js";
import type { TUIState } from "./tui-state.js";
import type {
  TUIStateCallbacks,
  CommandContext,
  CommandResult,
  ParsedCommand,
} from "./types.js";
import { genId } from "./token-utils.js";
import { formatCost, formatTokenCount } from "./token-utils.js";

// ============================================
// HELP TEXT
// ============================================

export const HELP_TEXT = `
Commands:
  /help              - Show this help
  /clear             - Clear messages
  /compact           - Compact context
  /cost              - Show session cost breakdown
  /model [name]      - Show or switch model
  /status            - Show session status
  /exit              - Exit Coder

Keyboard:
  Ctrl+C             - Exit
  Ctrl+U             - Clear input
  Ctrl+A/E           - Start/End of line
  Up/Down            - History navigation
  Left/Right         - Cursor movement
`;

// ============================================
// COMMAND HANDLER CLASS
// ============================================

/**
 * CommandHandler parses and executes slash commands.
 *
 * Works with TUIState for state access and TUIStateCallbacks for UI updates.
 */
export class CommandHandler {
  private state: TUIState;
  private callbacks: TUIStateCallbacks;

  constructor(state: TUIState, callbacks: TUIStateCallbacks) {
    this.state = state;
    this.callbacks = callbacks;
  }

  /**
   * Check if input is a command (starts with /)
   */
  isCommand(input: string): boolean {
    return input.trim().startsWith("/");
  }

  /**
   * Handle a command input
   */
  async handle(input: string, context: CommandContext): Promise<CommandResult> {
    const parsed = this.parse(input);

    switch (parsed.command) {
      case "help":
        return this.handleHelp();
      case "clear":
        return this.handleClear();
      case "exit":
      case "quit":
      case "q":
        return this.handleExit();
      case "model":
        return this.handleModel(parsed.args);
      case "status":
        return this.handleStatus(context);
      case "cost":
        return this.handleCost();
      case "compact":
        return this.handleCompact();
      default:
        return this.handleUnknown(parsed.command);
    }
  }

  /**
   * Parse a command string into command and args
   */
  private parse(input: string): ParsedCommand {
    const trimmed = input.trim();
    const spaceIndex = trimmed.indexOf(" ");

    if (spaceIndex === -1) {
      return {
        command: trimmed.slice(1), // Remove leading /
        args: "",
        raw: trimmed,
      };
    }

    return {
      command: trimmed.slice(1, spaceIndex),
      args: trimmed.slice(spaceIndex + 1).trim(),
      raw: trimmed,
    };
  }

  // ============================================
  // COMMAND HANDLERS
  // ============================================

  private handleHelp(): CommandResult {
    const helpMessage: UIMessage = {
      id: genId(),
      role: "system",
      subType: "info",
      content: HELP_TEXT,
      timestamp: Date.now(),
    };

    return {
      handled: true,
      message: helpMessage,
    };
  }

  private handleClear(): CommandResult {
    this.state.clearMessages();

    const clearMessage: UIMessage = {
      id: genId(),
      role: "system",
      subType: "info",
      content: "Messages cleared.",
      timestamp: Date.now(),
    };

    return {
      handled: true,
      message: clearMessage,
      action: "clear",
    };
  }

  private handleExit(): CommandResult {
    return {
      handled: true,
      exit: true,
    };
  }

  private handleModel(args: string): CommandResult {
    const currentModel = this.state.getModel();

    // No args - show current model
    if (!args) {
      const message: UIMessage = {
        id: genId(),
        role: "system",
        subType: "info",
        content: `Current model: ${currentModel}\n\nAvailable models:\n  - claude-sonnet-4-6 (default)\n  - claude-opus-4-6\n  - claude-haiku-4-5\n  - glm-5`,
        timestamp: Date.now(),
      };
      return { handled: true, message };
    }

    // Validate model name
    const validModels: ClaudeModel[] = [
      "claude-sonnet-4-6",
      "claude-opus-4-6",
      "claude-haiku-4-5",
      "glm-5",
    ];

    if (!validModels.includes(args as ClaudeModel)) {
      const message: UIMessage = {
        id: genId(),
        role: "system",
        subType: "error",
        content: `Invalid model: ${args}\nValid models: ${validModels.join(", ")}`,
        timestamp: Date.now(),
      };
      return { handled: true, message };
    }

    // Switch model
    this.state.setModel(args as ClaudeModel);

    const message: UIMessage = {
      id: genId(),
      role: "system",
      subType: "info",
      content: `Model switched to: ${args}`,
      timestamp: Date.now(),
    };

    return {
      handled: true,
      message,
      action: "model-switch",
      actionData: args,
    };
  }

  private handleStatus(context: CommandContext): CommandResult {
    const summary = this.state.getStatusSummary();
    const duration = this.formatDuration(summary.sessionDuration);

    const content = `Session Status:
  Model: ${summary.model}
  Messages: ${summary.messageCount} (${summary.apiMessageCount} API)
  Tokens: ${formatTokenCount(summary.tokenCount)}
  Cost: ${formatCost(summary.totalCost)}
  Duration: ${duration}
  Working Directory: ${context.workingDirectory}
  Permission Mode: ${context.permissionMode}`;

    const message: UIMessage = {
      id: genId(),
      role: "system",
      subType: "info",
      content,
      timestamp: Date.now(),
    };

    return { handled: true, message };
  }

  private handleCost(): CommandResult {
    const totalCost = this.state.getTotalCost();
    const tokenCount = this.state.getTokenCount();

    const content = `Session Cost:
  Total Cost: ${formatCost(totalCost)}
  Total Tokens: ${formatTokenCount(tokenCount)}
  API Messages: ${this.state.getApiMessageCount()}`;

    const message: UIMessage = {
      id: genId(),
      role: "system",
      subType: "info",
      content,
      timestamp: Date.now(),
    };

    return { handled: true, message };
  }

  private handleCompact(): CommandResult {
    // Signal that compaction is requested
    // The actual compaction is handled by the agent loop
    const message: UIMessage = {
      id: genId(),
      role: "system",
      subType: "info",
      content: "Context compaction requested. This will be handled by the agent loop.",
      timestamp: Date.now(),
    };

    return {
      handled: true,
      message,
      action: "compact",
    };
  }

  private handleUnknown(command: string): CommandResult {
    const message: UIMessage = {
      id: genId(),
      role: "system",
      subType: "error",
      content: `Unknown command: /${command}\nType /help to see available commands.`,
      timestamp: Date.now(),
    };

    return { handled: true, message };
  }

  // ============================================
  // UTILITIES
  // ============================================

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }
}
