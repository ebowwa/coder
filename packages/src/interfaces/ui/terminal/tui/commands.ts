/**
 * TUI Commands
 * Command handlers for slash commands in the TUI
 */

import type { ClaudeModel, Message as ApiMessage } from "../../../../types/index.js";
import {
  createCheckpoint,
  registerCheckpoint,
  restoreCheckpoint,
  applyCheckpoint,
  listCheckpoints,
  undoCheckpoint,
  redoCheckpoint,
  getNavigationStatus,
  getCheckpointSummary,
  formatCheckpoint,
} from "../../../../core/checkpoints.js";
import { formatCost } from "../../../../core/api-client.js";
import type { CommandContext, UIMessage } from "./types.js";
import { VERSION as CODER_VERSION, getContextWindow } from "../shared/status-line.js";
import {
  AVAILABLE_MODELS,
  getContextWindow as getModelContextWindow,
  getMaxOutput,
} from "../../../../core/models.js";
import { getHelpText as getSectionedHelpText, getCompactHelpText, type HelpSection } from "./HelpPanel.js";

// Debug mode state (module-level)
let debugMode = false;

/**
 * Get help text for commands
 * @param section - Optional section to display
 */
export function getHelpText(section?: string): string {
  return getSectionedHelpText(section);
}

/**
 * Get all help sections
 */
export function getHelpSections(): HelpSection[] {
  return [
    { id: "general", title: "general", content: "" },
    { id: "commands", title: "commands", content: "" },
    { id: "checkpoints", title: "checkpoints", content: "" },
    { id: "custom", title: "custom-commands", content: "" },
    { id: "keybindings", title: "keybindings", content: "" },
  ];
}

/**
 * Handle a slash command
 * Returns true if the command was handled
 */
export async function handleCommand(cmd: string, context: CommandContext): Promise<boolean> {
  const parts = cmd.slice(1).split(" ");
  const command = parts[0]?.toLowerCase();
  const rest = parts.slice(1).join(" ");

  const {
    sessionId,
    setSessionId,
    model,
    setModel,
    apiMessages,
    setApiMessages,
    setMessages,
    processedCountRef,
    totalCost,
    setTotalCost,
    totalTokens,
    setTotalTokens,
    permissionMode,
    tools,
    workingDirectory,
    sessionStore,
    addSystemMessage,
    messagesLength,
    onExit,
    exit,
    setSessionSelectMode,
    setSelectableSessions,
    helpMode,
    setHelpMode,
    helpSection,
    setHelpSection,
  } = context;

  switch (command) {
    case "exit":
    case "quit":
    case "q":
      onExit();
      exit();
      return true;

    case "help":
    case "?":
      // If section specified, show that section; otherwise enter help mode
      if (rest) {
        addSystemMessage(getHelpText(rest));
      } else {
        // Enter interactive help mode
        setHelpMode(true);
        setHelpSection(0);
      }
      return true;

    case "keybindings":
    case "keys":
      addSystemMessage(getHelpText("keybindings"));
      return true;

    case "clear":
      setApiMessages([]);
      setMessages([]);
      processedCountRef.current = 0;
      addSystemMessage("Conversation cleared.");
      return true;

    case "new":
      try {
        // Create a new session
        const newSessionId = await sessionStore.createSession({
          model,
          workingDirectory,
        });

        // Clear all state
        setSessionId(newSessionId);
        setApiMessages([]);
        setMessages([]);
        processedCountRef.current = 0;
        setTotalCost(0);
        setTotalTokens(0);

        addSystemMessage(`Started new session: ${newSessionId}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        addSystemMessage(`Failed to create new session: ${errorMessage}`);
      }
      return true;

    case "compact":
      addSystemMessage("Forcing context compaction...");
      return true;

    case "model":
      if (rest) {
        setModel(rest as ClaudeModel);
        addSystemMessage(`Switched to model: ${rest}`);
      } else {
        addSystemMessage(`Current model: ${model}`);
      }
      return true;

    case "tools": {
      const toolList = tools.map((t) => `  ${t.name}: ${t.description.split(".")[0]}`).join("\n");
      addSystemMessage(`Available tools:\n${toolList}`);
      return true;
    }

    case "cost":
      addSystemMessage(`Total cost: ${formatCost(totalCost)}`);
      return true;

    case "status":
    case "session":
      addSystemMessage(`Session Status:
  ID: ${sessionId}
  Model: ${model}
  Messages: ${apiMessages.length}
  Total cost: ${formatCost(totalCost)}
  Permission mode: ${permissionMode}
  Tokens: ${totalTokens}
  Debug mode: ${debugMode ? "on" : "off"}`);
      return true;

    case "version":
    case "ver":
      addSystemMessage(`Coder v${CODER_VERSION}
  Model: ${model}
  Context: ${getContextWindow(model).toLocaleString()} tokens
  Node: ${process.version}
  Platform: ${process.platform} ${process.arch}`);
      return true;

    case "models":
      const modelList = AVAILABLE_MODELS.map(
        (m) => {
          const contextStr = `${(m.contextWindow / 1000).toFixed(0)}k context`;
          const outputStr = m.maxOutput ? `, ${(m.maxOutput / 1000).toFixed(0)}k output` : "";
          return `  ${m.id.padEnd(22)} ${m.fullName} (${contextStr}${outputStr})`;
        }
      ).join("\n");
      addSystemMessage(`Available models:\n${modelList}\n\nUse /model <id> to switch`);
      return true;

    case "debug":
      debugMode = !debugMode;
      addSystemMessage(`Debug mode: ${debugMode ? "ON" : "OFF"}`);
      return true;

    case "export":
      try {
        const format = (rest || "markdown") as "jsonl" | "json" | "markdown";
        const outputPath = await sessionStore.exportSession(sessionId, format);
        addSystemMessage(`Session exported to: ${outputPath}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        addSystemMessage(`Export failed: ${errorMessage}`);
      }
      return true;

    case "checkpoint":
    case "cp":
      if (!rest) {
        addSystemMessage("Usage: /checkpoint <label>\nExample: /checkpoint before-refactor");
        return true;
      }
      try {
        const checkpoint = await createCheckpoint(sessionId, apiMessages, {
          label: rest,
          model,
          workingDirectory,
          totalCost,
          trackFiles: true,
        });

        await registerCheckpoint(sessionId, checkpoint.id);
        const summary = getCheckpointSummary(checkpoint);

        addSystemMessage(`✓ Checkpoint saved: ${formatCheckpoint(checkpoint)}${summary ? `\n  ${summary}` : ""}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        addSystemMessage(`Failed to create checkpoint: ${errorMessage}`);
      }
      return true;

    case "checkpoints":
    case "cps":
      try {
        const checkpoints = await listCheckpoints(sessionId);
        if (checkpoints.length === 0) {
          addSystemMessage("No checkpoints saved.");
        } else {
          const list = checkpoints.map((cp) => `  ${formatCheckpoint(cp)}`).join("\n");
          addSystemMessage(`Checkpoints:\n${list}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        addSystemMessage(`Failed to list checkpoints: ${errorMessage}`);
      }
      return true;

    case "restore":
    case "rollback":
    case "rewind":
      if (!rest) {
        addSystemMessage("Usage: /restore <checkpoint-id>\nUse /checkpoints to see available checkpoints");
        return true;
      }
      try {
        const checkpointId = rest.trim();
        const checkpoint = await restoreCheckpoint(sessionId, checkpointId);

        if (!checkpoint) {
          addSystemMessage(`Checkpoint not found: ${checkpointId}`);
          return true;
        }

        // Apply checkpoint without files (for TUI simplicity)
        const result = await applyCheckpoint(checkpoint, {
          restoreFiles: false,
          restoreMessages: true,
        });

        setApiMessages(result.messages);
        processedCountRef.current = result.messages.length;
        setTotalCost(checkpoint.metadata.totalCost);

        addSystemMessage(`✓ Checkpoint restored: ${result.messages.length} messages (no files changed)`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        addSystemMessage(`Failed to restore checkpoint: ${errorMessage}`);
      }
      return true;

    case "restore-chat":
      if (!rest) {
        addSystemMessage("Usage: /restore-chat <checkpoint-id>");
        return true;
      }
      try {
        const checkpointId = rest.trim();
        const checkpoint = await restoreCheckpoint(sessionId, checkpointId);

        if (!checkpoint) {
          addSystemMessage(`Checkpoint not found: ${checkpointId}`);
          return true;
        }

        const result = await applyCheckpoint(checkpoint, {
          restoreFiles: false,
          restoreMessages: true,
        });

        setApiMessages(result.messages);
        processedCountRef.current = result.messages.length;
        setTotalCost(checkpoint.metadata.totalCost);

        addSystemMessage(`✓ Chat restored: ${result.messages.length} messages`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        addSystemMessage(`Failed to restore chat: ${errorMessage}`);
      }
      return true;

    case "undo":
      try {
        const result = await undoCheckpoint(sessionId);

        if (!result.checkpoint) {
          addSystemMessage("Nothing to undo");
          return true;
        }

        const applyResult = await applyCheckpoint(result.checkpoint, {
          restoreFiles: false,
          restoreMessages: true,
        });

        setApiMessages(applyResult.messages);
        processedCountRef.current = applyResult.messages.length;
        setTotalCost(result.checkpoint.metadata.totalCost);

        addSystemMessage(`✓ Undone to: ${formatCheckpoint(result.checkpoint)}${result.canRedo ? "\nUse /redo to go forward" : ""}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        addSystemMessage(`Undo failed: ${errorMessage}`);
      }
      return true;

    case "redo":
      try {
        const result = await redoCheckpoint(sessionId);

        if (!result.checkpoint) {
          addSystemMessage("Nothing to redo");
          return true;
        }

        const applyResult = await applyCheckpoint(result.checkpoint, {
          restoreFiles: false,
          restoreMessages: true,
        });

        setApiMessages(applyResult.messages);
        processedCountRef.current = applyResult.messages.length;
        setTotalCost(result.checkpoint.metadata.totalCost);

        addSystemMessage(`✓ Redone to: ${formatCheckpoint(result.checkpoint)}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        addSystemMessage(`Redo failed: ${errorMessage}`);
      }
      return true;

    case "checkpoint-status":
    case "cps-status":
      try {
        const status = await getNavigationStatus(sessionId);
        addSystemMessage(`Checkpoint Navigation:
  Position: ${status.current}/${status.total}
  Can undo: ${status.canUndo ? "yes" : "no"}
  Can redo: ${status.canRedo ? "yes" : "no"}
  Current: ${status.currentId || "none"}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        addSystemMessage(`Failed to get status: ${errorMessage}`);
      }
      return true;

    case "sessions":
    case "resume": {
      try {
        // If ID provided directly, try to resume
        if (rest) {
          const loaded = await sessionStore.resumeSession(rest.trim());
          if (loaded) {
            setApiMessages(loaded.messages);
            processedCountRef.current = loaded.messages.length;
            setMessages([]); // Clear UI messages, will be rebuilt from apiMessages
            const loadedModel = loaded.metadata?.model as ClaudeModel | undefined;
            if (loadedModel) setModel(loadedModel);
            const loadedCost = loaded.metadata?.totalCost as number | undefined;
            if (typeof loadedCost === "number") setTotalCost(loadedCost);
            const loadedTokens = loaded.metadata?.totalTokens as number | undefined;
            if (typeof loadedTokens === "number") setTotalTokens(loadedTokens);
            addSystemMessage(`Resumed session: ${rest.trim()} (${loaded.messages.length} messages)`);
          } else {
            addSystemMessage(`Session not found: ${rest.trim()}`);
          }
          return true;
        }

        // Otherwise, list sessions with numbers for selection
        const sessions = await sessionStore.listSessions(15);
        if (sessions.length === 0) {
          addSystemMessage("No recent sessions found.");
        } else {
          // Store sessions for selection
          setSelectableSessions(sessions);
          setSessionSelectMode(true);

          const list = sessions.map((s, i) => {
            const id = s.id || "unknown";
            const model = (s.metadata as Record<string, unknown>)?.model || "unknown";
            const msgs = s.messageCount || 0;
            const date = s.lastActivity ? new Date(s.lastActivity).toLocaleDateString() : "unknown";
            return `  ${String(i + 1).padStart(2)}. ${String(id).slice(0, 8)}  ${String(model).padEnd(20)} ${String(msgs).padStart(3)} msgs  ${date}`;
          }).join("\n");
          addSystemMessage(`Select a session to resume:\n${list}\n\nType the number (1-${sessions.length}) to resume, or any other key to cancel.`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        addSystemMessage(`Failed to list sessions: ${errorMessage}`);
      }
      return true;
    }

    default:
      addSystemMessage(`Unknown command: /${command}\nType /help for available commands.`);
      return true;
  }
}
