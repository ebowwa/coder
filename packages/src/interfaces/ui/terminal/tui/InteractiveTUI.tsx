/**
 * InteractiveTUI - Enhanced terminal UI
 *
 * Principles:
 * 1. Use Ink's useInput directly (no native polling)
 * 2. Single state source (no dual message tracking)
 * 3. No context providers
 * 4. No global state hacks
 * 5. Show tool calls and results in UI
 * 6. Extended thinking block support
 * 7. Cost tracking per session
 * 8. Enhanced slash commands
 * 9. Hybrid rendering: Ink for UI, native Rust TUI for performance-critical components
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { render, Box, Text, useInput, useApp } from "ink";
import type { Key } from "ink";
import type { PermissionMode, Message as ApiMessage, ToolDefinition, QueryMetrics } from "../../../../schemas/index.js";
import type { HookManager } from "../../../../ecosystem/hooks/index.js";
import { agentLoop } from "../../../../core/agent-loop.js";
import { getGitStatus } from "../../../../core/git-status.js";
import { calculateContextInfo, VERSION, getModelDisplayName, formatTokenCount } from "../shared/status-line.js";
import { formatCost, formatCostBrief } from "../../../../core/agent-loop/formatters.js";
import { spinnerFrames } from "./spinner.js";
import type { SessionStore, ContextInfo } from "./types.js";
import { useTerminalSize } from "./useTerminalSize.js";
// Native TUI rendering bridge (Rust-backed)
import {
  Terminal,
  Styles,
  Render,
  Draw,
  renderMessage,
  renderStatusBar,
  type TuiStyle,
  type TuiRgb,
  type TuiModifiers,
  type TuiTextSegment,
  type TuiTextLine,
  type TuiTextBlock,
} from "./tui-renderer.js";

// ============================================
// TYPES
// ============================================

interface UIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  /** Tool name if this is a tool call/result */
  toolName?: string;
  /** Tool input preview */
  toolInput?: string;
  /** Tool output preview */
  toolOutput?: string;
  /** Whether tool result was an error */
  isError?: boolean;
  /** Message type for styling */
  type?: "tool_call" | "tool_result" | "text" | "thinking";
  /** Cost of this message (if applicable) */
  costUSD?: number;
  /** Token usage for this message */
  tokens?: number;
  /** Timestamp */
  timestamp: number;
}

/** Session cost tracking */
interface SessionCost {
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

// ============================================
// NATIVE TUI STATUS BAR
// ============================================

/**
 * Status bar component using native Rust TUI rendering
 * Provides better performance for frequently-updated status displays
 */
interface NativeStatusBarProps {
  isLoading: boolean;
  spinnerFrame: number;
  tokenCount: number;
  permissionMode: string;
  model: string;
  cost: QueryMetrics;
  width: number;
}

function NativeStatusBar({
  isLoading,
  spinnerFrame,
  tokenCount,
  permissionMode,
  model,
  cost,
  width,
}: NativeStatusBarProps) {
  const left = isLoading
    ? `${spinnerFrames[spinnerFrame]} Processing...`
    : `${getModelDisplayName(model)} | ${permissionMode}`;
  const right = `${formatTokenCount(tokenCount)} | ${formatCostBrief(cost)}`;

  // Use native Rust TUI rendering for status bar
  const statusBarAnsi = renderStatusBar(left, right, width);

  return (
    <Text>
      {statusBarAnsi}
    </Text>
  );
}

export interface InteractiveTUIProps {
  apiKey: string;
  model: string;
  permissionMode: PermissionMode;
  maxTokens: number;
  systemPrompt?: string;
  tools?: ToolDefinition[];
  hookManager: HookManager;
  sessionStore: SessionStore;
  sessionId: string;
  setSessionId: (id: string) => void;
  workingDirectory: string;
  onExit?: () => void;
  initialMessages?: ApiMessage[];
  /** Custom stop sequences that will cause the model to stop generating */
  stopSequences?: string[];
  /** Result conditions as JSON string (parsed at runtime) */
  resultConditions?: string;
  /** Stop loop on unhandled tool errors */
  stopOnUnhandledError?: boolean;
}

export interface InteractiveTUIHandle {
  rerender: (props: Partial<InteractiveTUIProps>) => void;
  unmount: () => void;
  waitUntilExit: () => Promise<void>;
}

// ============================================
// HELPERS
// ============================================

let msgId = 0;
const genId = () => `msg-${++msgId}-${Date.now()}`;

function estimateTokens(text: string): number {
  return Math.ceil((text?.length || 1) / 4);
}

function estimateMessagesTokens(messages: ApiMessage[]): number {
  let total = 0;
  for (const msg of messages) {
    if (typeof msg.content === "string") {
      total += estimateTokens(msg.content);
    } else if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === "text") total += estimateTokens(block.text);
        else if (block.type === "tool_use") total += estimateTokens(JSON.stringify(block.input));
        else if (block.type === "tool_result" && typeof block.content === "string") {
          total += estimateTokens(block.content);
        }
      }
    }
  }
  return total;
}

function apiToText(msg: ApiMessage): string {
  if (typeof msg.content === "string") return msg.content;
  if (!Array.isArray(msg.content)) return "";
  return msg.content.map(b => {
    if (b.type === "text") return b.text;
    if (b.type === "tool_use") return `[Tool: ${b.name}]`;
    if (b.type === "tool_result") return b.is_error ? "[Error]" : "[Result]";
    if (b.type === "thinking") return `[Thinking: ${b.thinking.slice(0, 50)}...]`;
    if (b.type === "redacted_thinking") return "[Redacted Thinking]";
    return "";
  }).join("\n");
}

/**
 * Truncate content intelligently, preserving code blocks
 */
function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;

  // Check if content has code blocks
  const codeBlockMatch = content.match(/```[\s\S]*?```/g);
  if (codeBlockMatch && codeBlockMatch.length > 0) {
    // Preserve first code block if it fits
    const firstBlock = codeBlockMatch[0];
    if (firstBlock.length <= maxLength) {
      const beforeBlock = content.slice(0, content.indexOf(firstBlock));
      const afterBlockStart = content.indexOf(firstBlock) + firstBlock.length;
      const remaining = maxLength - firstBlock.length - beforeBlock.length;
      const afterBlock = content.slice(afterBlockStart, afterBlockStart + Math.max(0, remaining - 3));
      return beforeBlock + firstBlock + afterBlock + (afterBlockStart + remaining < content.length ? "..." : "");
    }
  }

  // Default truncation
  return content.slice(0, maxLength - 3) + "...";
}

/**
 * Format thinking block for display
 */
function formatThinkingBlock(thinking: string, maxWidth: number): string {
  const lines = thinking.split("\n");
  const truncated = lines.slice(0, 3).join("\n");
  if (lines.length > 3 || truncated.length > maxWidth) {
    return truncateContent(truncated, maxWidth);
  }
  return truncated;
}

/**
 * Create empty session cost
 */
function createEmptySessionCost(): SessionCost {
  return {
    totalCost: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  };
}

/**
 * Update session cost from metrics
 */
function updateSessionCost(cost: SessionCost, metrics: QueryMetrics): SessionCost {
  return {
    totalCost: cost.totalCost + (metrics.costUSD ?? 0),
    inputTokens: cost.inputTokens + (metrics.usage?.input_tokens ?? 0),
    outputTokens: cost.outputTokens + (metrics.usage?.output_tokens ?? 0),
    cacheReadTokens: cost.cacheReadTokens + (metrics.usage?.cache_read_input_tokens ?? 0),
    cacheWriteTokens: cost.cacheWriteTokens + (metrics.usage?.cache_creation_input_tokens ?? 0),
  };
}

const HELP_TEXT = `
Commands:
  /help              - Show this help
  /clear             - Clear messages
  /compact           - Compact context
  /cost              - Show session cost breakdown
  /model [name]      - Show or switch model
  /status            - Show session status
  /checkpoint [name] - Save checkpoint
  /checkpoints       - List checkpoints
  /undo              - Undo last action
  /redo              - Redo action
  /skills [search]   - Search skills marketplace
  /skills-installed  - List installed skills
  /exit              - Exit Coder

Keyboard Shortcuts:
  Ctrl+C             - Exit Coder
  Ctrl+L             - Clear screen
  Ctrl+U             - Clear input line
  Ctrl+A             - Move to start of line
  Ctrl+E             - Move to end of line
  Up/Down            - History navigation
  Tab                - Show command completions
`;

// ============================================
// COMPONENT
// ============================================

function InteractiveTUI({
  apiKey,
  model: initialModel,
  permissionMode,
  maxTokens,
  systemPrompt,
  tools,
  hookManager,
  sessionStore,
  sessionId,
  setSessionId,
  workingDirectory,
  onExit,
  initialMessages = [],
}: InteractiveTUIProps) {
  // Single state source
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [apiMessages, setApiMessages] = useState<ApiMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [cursorPos, setCursorPos] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamingThinking, setStreamingThinking] = useState("");
  const [spinnerFrame, setSpinnerFrame] = useState(0);
  const [tokenCount, setTokenCount] = useState(0);

  // Enhanced state
  const [model, setModel] = useState(initialModel);
  const [sessionCost, setSessionCost] = useState<SessionCost>(createEmptySessionCost());
  const [checkpointHistory, setCheckpointHistory] = useState<Array<{ id: string; label: string; messages: ApiMessage[]; timestamp: number }>>([]);
  const [checkpointIndex, setCheckpointIndex] = useState(-1);
  const [showCommandHints, setShowCommandHints] = useState(false);

  // Refs for history (no re-renders needed)
  const historyRef = useRef<string[]>([]);
  const historyIdxRef = useRef(-1);
  const savedInputRef = useRef("");
  const isProcessingRef = useRef(false);

  const { exit } = useApp();

  // Track terminal dimensions with resize support
  const { width: terminalWidth } = useTerminalSize();

  // Dynamic limits based on terminal size
  const maxContentWidth = Math.max(terminalWidth - 20, 40); // Reserve space for labels/padding
  const maxToolPreview = Math.floor(maxContentWidth * 2); // Tool previews can span ~2 lines
  const maxMessageLength = Math.floor(maxContentWidth * 10); // Messages can span ~10 lines
  const maxThinkingLength = Math.floor(maxContentWidth * 3); // Thinking previews are shorter

  // NOTE: We render ALL messages to enable terminal scrollback.
  // The terminal's native scroll (mouse wheel, Shift+PageUp/Down) handles history.

  // Spinner animation
  useEffect(() => {
    if (!isLoading) return;
    const iv = setInterval(() => setSpinnerFrame(f => (f + 1) % spinnerFrames.length), 80);
    return () => clearInterval(iv);
  }, [isLoading]);

  // Process message
  const processMessage = useCallback(async (input: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    // Add user message
    setMessages(prev => [...prev, { id: genId(), role: "user", content: input, timestamp: Date.now() }]);

    setIsLoading(true);
    setStreamingText("");

    try {
      const newUserMsg: ApiMessage = {
        role: "user",
        content: [{ type: "text", text: input }],
      };
      const messagesForApi = [...apiMessages, newUserMsg];

      const result = await agentLoop(messagesForApi, {
        apiKey,
        model,
        maxTokens,
        systemPrompt: systemPrompt ?? "You are a helpful AI assistant.",
        tools: tools ?? [],
        permissionMode,
        workingDirectory,
        gitStatus: await getGitStatus(workingDirectory),
        extendedThinking: undefined,
        hookManager,
        sessionId,
        onText: (text) => setStreamingText(prev => prev + text),
        onToolUse: (tu) => {
          // Show tool call with input preview
          const inputPreview = typeof tu.input === "object"
            ? JSON.stringify(tu.input, null, 2).slice(0, maxToolPreview)
            : String(tu.input).slice(0, maxToolPreview);
          setMessages(prev => [...prev, {
            id: genId(),
            role: "system",
            content: inputPreview,
            toolName: tu.name,
            type: "tool_call",
            timestamp: Date.now(),
          }]);
        },
        onToolResult: (tr) => {
          // Show tool result with output preview
          let outputPreview = "";
          const resultMaxLen = tr.result.is_error ? maxMessageLength : maxToolPreview;
          if (tr.result.is_error) {
            outputPreview = typeof tr.result.content === "string"
              ? tr.result.content.slice(0, resultMaxLen)
              : JSON.stringify(tr.result.content).slice(0, resultMaxLen);
          } else {
            outputPreview = typeof tr.result.content === "string"
              ? tr.result.content.slice(0, resultMaxLen)
              : JSON.stringify(tr.result.content).slice(0, resultMaxLen);
          }
          setMessages(prev => [...prev, {
            id: genId(),
            role: "system",
            content: outputPreview,
            toolName: "tool",
            isError: tr.result.is_error,
            type: "tool_result",
            timestamp: Date.now(),
          }]);
        },
        onMetrics: async (m) => {
          const tokens = m.usage.input_tokens + m.usage.output_tokens;
          if (tokens > 0) setTokenCount(tokens);
          await sessionStore.saveMetrics(m);
        },
      });

      setApiMessages(result.messages);
      setTokenCount(estimateMessagesTokens(result.messages));

      const lastAssistant = result.messages.filter(m => m.role === "assistant").pop();
      if (lastAssistant) {
        setMessages(prev => [...prev, {
          id: genId(),
          role: "assistant",
          content: apiToText(lastAssistant),
          timestamp: Date.now(),
        }]);
        await sessionStore.saveMessage(lastAssistant);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setMessages(prev => [...prev, { id: genId(), role: "system", content: `Error: ${errorMessage}`, timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
      isProcessingRef.current = false;
      setStreamingText("");
    }
  }, [apiMessages, apiKey, model, maxTokens, systemPrompt, tools, permissionMode, workingDirectory, hookManager, sessionId, sessionStore]);

  // Handle commands
  const handleCommand = useCallback(async (cmd: string) => {
    const parts = cmd.slice(1).split(" ");
    const command = parts[0]?.toLowerCase();
    const args = parts.slice(1).join(" ");
    const now = Date.now();

    switch (command) {
      case "help":
        setMessages(prev => [...prev, { id: genId(), role: "system", content: HELP_TEXT, timestamp: now }]);
        break;

      case "clear":
        setMessages([]);
        setApiMessages([]);
        setTokenCount(0);
        break;

      case "exit":
      case "quit":
        onExit?.();
        exit();
        break;

      case "compact":
        setMessages([]);
        setApiMessages([]);
        setTokenCount(1);
        break;

      case "sessions": {
        const sessions = await sessionStore.listSessions();
        setMessages(prev => [...prev, {
          id: genId(),
          role: "system",
          content: sessions.map((s, i) => `${i + 1}. ${s.metadata?.preview || ""} (${s.messageCount} msgs)`).join("\n") || "No sessions",
          timestamp: now,
        }]);
        break;
      }

      case "resume": {
        if (args) {
          const session = await sessionStore.resumeSession(args);
          if (session) {
            setMessages([]);
            setApiMessages(session.messages);
            setSessionId(session.metadata.id);
          }
        }
        break;
      }

      case "cost": {
        const costBreakdown = [
          `Session Cost Summary`,
          `━━━━━━━━━━━━━━━━━━━━`,
          `Total Cost: ${formatCost(sessionCost.totalCost)}`,
          `Input Tokens: ${sessionCost.inputTokens.toLocaleString()}`,
          `Output Tokens: ${sessionCost.outputTokens.toLocaleString()}`,
          `Cache Read: ${sessionCost.cacheReadTokens.toLocaleString()} tokens`,
          `Cache Write: ${sessionCost.cacheWriteTokens.toLocaleString()} tokens`,
          ``,
          `Model: ${getModelDisplayName(model)}`,
          `Context: ${formatTokenCount(tokenCount)}`,
        ].join("\n");
        setMessages(prev => [...prev, { id: genId(), role: "system", content: costBreakdown, timestamp: now }]);
        break;
      }

      case "status": {
        // Calculate context info inline since it's defined later in the component
        const statusContextInfo = calculateContextInfo(tokenCount, model);
        const statusInfo = [
          `Session Status`,
          `━━━━━━━━━━━━━━━━━━━━`,
          `Session ID: ${sessionId.slice(0, 8)}...`,
          `Model: ${getModelDisplayName(model)}`,
          `Permission Mode: ${permissionMode}`,
          `Context: ${statusContextInfo.percentRemaining.toFixed(1)}% remaining`,
          `Messages: ${apiMessages.length}`,
          `Working Dir: ${workingDirectory.split("/").pop()}`,
          `Total Cost: ${formatCost(sessionCost.totalCost)}`,
        ].join("\n");
        setMessages(prev => [...prev, { id: genId(), role: "system", content: statusInfo, timestamp: now }]);
        break;
      }

      case "model": {
        if (args) {
          // Switch model
          setModel(args);
          setMessages(prev => [...prev, {
            id: genId(),
            role: "system",
            content: `Model switched to: ${getModelDisplayName(args)}`,
            timestamp: now,
          }]);
        } else {
          // Show current model
          setMessages(prev => [...prev, {
            id: genId(),
            role: "system",
            content: `Current model: ${getModelDisplayName(model)}\n\nAvailable models:\n  - claude-opus-4-6 (Opus 4.6)\n  - claude-sonnet-4-6 (Sonnet 4.6)\n  - claude-haiku-4-5-20251001 (Haiku 4.5)\n  - glm-5 (GLM-5)`,
            timestamp: now,
          }]);
        }
        break;
      }

      case "checkpoint": {
        const label = args || `Checkpoint ${checkpointHistory.length + 1}`;
        const checkpoint = {
          id: genId(),
          label,
          messages: [...apiMessages],
          timestamp: Date.now(),
        };
        setCheckpointHistory(prev => [...prev.slice(-19), checkpoint]); // Keep last 20
        setCheckpointIndex(checkpointHistory.length); // Point to new checkpoint
        setMessages(prev => [...prev, {
          id: genId(),
          role: "system",
          content: `Checkpoint saved: "${label}" (${apiMessages.length} messages)`,
          timestamp: now,
        }]);
        break;
      }

      case "checkpoints": {
        if (checkpointHistory.length === 0) {
          setMessages(prev => [...prev, {
            id: genId(),
            role: "system",
            content: "No checkpoints saved. Use /checkpoint <name> to create one.",
            timestamp: now,
          }]);
        } else {
          const list = checkpointHistory.map((cp, i) => {
            const time = new Date(cp.timestamp).toLocaleTimeString();
            const current = i === checkpointIndex ? " ← current" : "";
            return `${i + 1}. ${cp.label} (${cp.messages.length} msgs, ${time})${current}`;
          }).join("\n");
          setMessages(prev => [...prev, {
            id: genId(),
            role: "system",
            content: `Checkpoints:\n${list}\n\nUse /undo and /redo to navigate.`,
            timestamp: now,
          }]);
        }
        break;
      }

      case "undo": {
        if (checkpointIndex > 0) {
          const newIndex = checkpointIndex - 1;
          const checkpoint = checkpointHistory[newIndex];
          if (checkpoint) {
            setCheckpointIndex(newIndex);
            setApiMessages(checkpoint.messages);
            setTokenCount(estimateMessagesTokens(checkpoint.messages));
            setMessages(prev => [...prev, {
              id: genId(),
              role: "system",
              content: `Restored: "${checkpoint.label}"`,
              timestamp: now,
            }]);
          }
        } else {
          setMessages(prev => [...prev, {
            id: genId(),
            role: "system",
            content: "Nothing to undo. Use /checkpoint to save states first.",
            timestamp: now,
          }]);
        }
        break;
      }

      case "redo": {
        if (checkpointIndex < checkpointHistory.length - 1) {
          const newIndex = checkpointIndex + 1;
          const checkpoint = checkpointHistory[newIndex];
          if (checkpoint) {
            setCheckpointIndex(newIndex);
            setApiMessages(checkpoint.messages);
            setTokenCount(estimateMessagesTokens(checkpoint.messages));
            setMessages(prev => [...prev, {
              id: genId(),
              role: "system",
              content: `Restored: "${checkpoint.label}"`,
              timestamp: now,
            }]);
          }
        } else {
          setMessages(prev => [...prev, {
            id: genId(),
            role: "system",
            content: "Nothing to redo.",
            timestamp: now,
          }]);
        }
        break;
      }

      case "skills": {
        // Skills marketplace search
        const searchQuery = args || "";

        try {
          // Dynamically import the skills client
          const { SkillsClient } = await import("../../../../ecosystem/skills/skills-client.js");
          const client = new SkillsClient(apiKey);

          setMessages(prev => [...prev, {
            id: genId(),
            role: "system",
            content: searchQuery ? `Searching marketplace for "${searchQuery}"...` : "Loading skills marketplace...",
            timestamp: now,
          }]);

          const { skills } = await client.list({ search: searchQuery, limit: 20 });

          if (skills.length === 0) {
            setMessages(prev => [...prev, {
              id: genId(),
              role: "system",
              content: searchQuery
                ? `No skills found matching "${searchQuery}"\n\nTry a different search or use /skills to browse all.`
                : "No skills available in marketplace.",
              timestamp: now,
            }]);
          } else {
            const skillList = skills.map((s, i) => {
              const author = s.author ? ` by ${s.author}` : "";
              return `${i + 1}. \x1b[1m${s.name}\x1b[0m${author}\n   ${s.description}`;
            }).join("\n\n");

            setMessages(prev => [...prev, {
              id: genId(),
              role: "system",
              content: `Skills Marketplace (${skills.length} results)\n\n${skillList}\n\nUse skills with /<skill-name> or invoke via the Skill tool.`,
              timestamp: now,
            }]);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          setMessages(prev => [...prev, {
            id: genId(),
            role: "system",
            content: `Failed to search marketplace: ${errorMsg}\n\nCheck your API key and network connection.`,
            timestamp: now,
          }]);
        }
        break;
      }

      case "skills-installed": {
        // List installed/local skills
        const { SkillManager } = await import("../../../../ecosystem/skills/index.js");
        const manager = new SkillManager();

        // Load from common locations
        const home = process.env.HOME || "";
        manager.loadFromDirectory(`${home}/.claude/skills`, "user");
        manager.loadFromDirectory(`${workingDirectory}/.claude/skills`, "project");

        const localSkills = manager.getAll();

        if (localSkills.length === 0) {
          setMessages(prev => [...prev, {
            id: genId(),
            role: "system",
            content: `No local skills installed.\n\nInstall skills by:\n  - Creating .claude/skills/<name>.md\n  - Or use /skills to browse the marketplace`,
            timestamp: now,
          }]);
        } else {
          const skillList = localSkills.map((s, i) => {
            const source = s.source === "user" ? "global" : s.source;
            return `${i + 1}. \x1b[1m${s.name}\x1b[0m (${source})\n   ${s.description || "No description"}`;
          }).join("\n\n");

          setMessages(prev => [...prev, {
            id: genId(),
            role: "system",
            content: `Installed Skills (${localSkills.length})\n\n${skillList}\n\nUse skills with /<skill-name>`,
            timestamp: now,
          }]);
        }
        break;
      }

      default:
        setMessages(prev => [...prev, { id: genId(), role: "system", content: `Unknown command: /${command}\n\nType /help to see available commands.`, timestamp: now }]);
    }
  }, [onExit, exit, sessionStore, setSessionId, sessionCost, model, permissionMode, tokenCount, apiMessages, checkpointHistory, checkpointIndex, workingDirectory, sessionId]);

  // Keyboard input using Ink's useInput
  useInput((input: string, key: Key) => {
    // Exit on Ctrl+C
    if (key.ctrl && input === "c") {
      onExit?.();
      exit();
      return;
    }

    if (isLoading) return;

    // Submit on Enter
    if (key.return) {
      const value = inputValue.trim();
      if (!value) return;

      // Clear immediately
      setInputValue("");
      setCursorPos(0);
      historyIdxRef.current = -1;

      // Add to history
      if (!value.startsWith("/") && value !== historyRef.current[0]) {
        historyRef.current = [value, ...historyRef.current].slice(0, 100);
      }

      // Process
      setTimeout(() => {
        if (value.startsWith("/")) {
          handleCommand(value);
        } else {
          processMessage(value);
        }
      }, 0);
      return;
    }

    // History up
    if (key.upArrow) {
      if (historyRef.current.length > 0) {
        if (historyIdxRef.current === -1) {
          savedInputRef.current = inputValue;
        }
        const newIdx = Math.min(historyIdxRef.current + 1, historyRef.current.length - 1);
        historyIdxRef.current = newIdx;
        setInputValue(historyRef.current[newIdx] || "");
        setCursorPos((historyRef.current[newIdx] || "").length);
      }
      return;
    }

    if (key.downArrow) {
      if (historyIdxRef.current > 0) {
        const newIdx = historyIdxRef.current - 1;
        historyIdxRef.current = newIdx;
        setInputValue(historyRef.current[newIdx] || "");
        setCursorPos((historyRef.current[newIdx] || "").length);
      } else if (historyIdxRef.current === 0) {
        historyIdxRef.current = -1;
        setInputValue(savedInputRef.current);
        setCursorPos(savedInputRef.current.length);
      }
      return;
    }

    // Backspace
    if (key.backspace || key.delete) {
      if (cursorPos > 0) {
        setInputValue(prev => prev.slice(0, cursorPos - 1) + prev.slice(cursorPos));
        setCursorPos(p => p - 1);
      }
      return;
    }

    // Arrow keys
    if (key.leftArrow) {
      setCursorPos(p => Math.max(0, p - 1));
      return;
    }

    if (key.rightArrow) {
      setCursorPos(p => Math.min(inputValue.length, p + 1));
      return;
    }

    // Home/End (Ctrl+A / Ctrl+E)
    if (key.ctrl && input === "a") {
      setCursorPos(0);
      return;
    }

    if (key.ctrl && input === "e") {
      setCursorPos(inputValue.length);
      return;
    }

    // Regular character
    if (input && !key.ctrl && !key.meta) {
      if (historyIdxRef.current !== -1) {
        historyIdxRef.current = -1;
        savedInputRef.current = "";
      }
      setInputValue(prev => prev.slice(0, cursorPos) + input + prev.slice(cursorPos));
      setCursorPos(p => p + input.length);
    }
  }, { isActive: !isLoading });

  // Context info
  const contextInfo = calculateContextInfo(tokenCount, model);

  return (
    <Box flexDirection="column" width={terminalWidth}>
      {/* Messages - render ALL to enable terminal scrollback */}
      <Box flexDirection="column">
        {contextInfo.isLow && (
          <Text color={contextInfo.isCritical ? "red" : "yellow"} bold>
            Context: {contextInfo.percentRemaining.toFixed(0)}% remaining
          </Text>
        )}

        {messages.length === 0 && !isLoading && !streamingText && (
          <Text dimColor>
            Welcome to Coder v{VERSION}. Type your message or /help for commands.
          </Text>
        )}

        {messages.map(msg => {
          // Tool call
          if (msg.type === "tool_call") {
            return (
              <Box key={msg.id} flexDirection="column">
                <Text bold color="yellow">▶ {msg.toolName}</Text>
                {msg.content && (
                  <Text dimColor color="gray">  {msg.content}</Text>
                )}
              </Box>
            );
          }
          // Tool result
          if (msg.type === "tool_result") {
            return (
              <Box key={msg.id} flexDirection="column">
                <Text bold color={msg.isError ? "red" : "green"}>
                  {msg.isError ? "✗" : "✓"} {msg.toolName}
                </Text>
                {msg.content && (
                  <Text dimColor color={msg.isError ? "red" : "green"}>  {msg.content}</Text>
                )}
              </Box>
            );
          }
          // Regular message
          return (
            <Text key={msg.id}>
              {msg.role === "user" ? (
                <Text bold color="cyan">You: </Text>
              ) : msg.role === "assistant" ? (
                <Text bold color="magenta">Claude: </Text>
              ) : (
                <Text bold color="yellow">System: </Text>
              )}
              <Text dimColor={msg.role === "system"}>{msg.content.slice(0, maxMessageLength)}{msg.content.length > maxMessageLength ? "..." : ""}</Text>
            </Text>
          );
        })}

        {streamingText && (
          <Text>
            <Text bold color="magenta">Claude: </Text>
            <Text dimColor>{streamingText.slice(-maxMessageLength)}</Text>
          </Text>
        )}

        {isLoading && !streamingText && (
          <Text color="cyan">{spinnerFrames[spinnerFrame]} Processing...</Text>
        )}
      </Box>

      {/* Status bar */}
      <Text dimColor>
        {isLoading ? spinnerFrames[spinnerFrame] + " " : ""}Context: {tokenCount} tokens | {permissionMode}
      </Text>

      {/* Input */}
      <Text>
        <Text bold color={isLoading ? "gray" : "cyan"}>You: </Text>
        {inputValue.length > 0 ? (
          <>
            {inputValue.slice(0, cursorPos)}
            <Text backgroundColor="cyan" color="black">
              {cursorPos < inputValue.length ? inputValue[cursorPos] : " "}
            </Text>
            {inputValue.slice(cursorPos + 1)}
          </>
        ) : (
          <Text dimColor>Type your message... (/help for commands)</Text>
        )}
      </Text>
    </Box>
  );
}

// ============================================
// RENDER FUNCTION
// ============================================

/**
 * Native terminal control using Rust TUI primitives
 * These replace manual ANSI escape codes with native implementations
 */
const NativeTerminal = {
  enterAltScreen: () => { process.stdout.write(Terminal.enterAltScreen()); },
  exitAltScreen: () => { process.stdout.write(Terminal.exitAltScreen()); },
  clearScreen: () => { process.stdout.write(Terminal.clearScreen()); },
  hideCursor: () => { process.stdout.write(Terminal.hideCursor()); },
  showCursor: () => { process.stdout.write(Terminal.showCursor()); },
};

export function createInteractiveTUI(
  initialProps: InteractiveTUIProps
): InteractiveTUIHandle {
  let currentProps = { ...initialProps };
  let rerenderFn: ((node: React.ReactNode) => void) | null = null;
  let unmountFn: (() => void) | null = null;
  let waitFn: (() => Promise<void>) | null = null;

  // Enter alternate screen buffer BEFORE render using native Rust TUI
  // This isolates TUI from main terminal - no pre-app history visible
  NativeTerminal.enterAltScreen();

  // Small delay to ensure terminal processes the escape code
  const { rerender, unmount, waitUntilExit } = render(
    <InteractiveTUI {...currentProps} />,
    { exitOnCtrlC: false }
  );

  rerenderFn = rerender;
  unmountFn = unmount;
  waitFn = waitUntilExit;

  return {
    rerender: (newProps) => {
      currentProps = { ...currentProps, ...newProps };
      rerenderFn?.(<InteractiveTUI {...currentProps} />);
    },
    unmount: () => {
      unmountFn?.();
      // Exit alternate screen buffer using native Rust TUI - restore original terminal
      NativeTerminal.exitAltScreen();
    },
    waitUntilExit: () => waitFn?.() || Promise.resolve(),
  };
}

export default InteractiveTUI;
