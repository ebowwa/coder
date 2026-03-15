/**
 * Scrollable TUI Runner
 *
 * Like `less`, `htop`, `vim` - uses alternate screen buffer
 * with internal scrolling (keyboard + mouse wheel).
 *
 * Features:
 * - Alternate screen buffer (isolation from pre-app terminal)
 * - Internal scrolling (Up/Down/PageUp/PageDown/Mouse wheel)
 * - Messages stored in memory, viewport renders visible portion
 * - Hybrid rendering: Ink for UI, native Rust TUI for performance-critical components
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { render, Box, Text, useInput, useApp } from "ink";
import type { Key } from "ink";
import type { PermissionMode, Message as ApiMessage, ToolDefinition, QueryMetrics } from "../../../../schemas/index.js";
import type { HookManager } from "../../../../ecosystem/hooks/index.js";
import { agentLoop } from "../../../../core/agent-loop.js";
import { getGitStatus } from "../../../../core/git-status.js";
import { calculateContextInfo, VERSION, getModelDisplayName, formatTokenCount } from "../shared/status-line.js";
import { formatCost } from "../../../../core/agent-loop/formatters.js";
import { spinnerFrames } from "./spinner.js";
import type { SessionStore } from "./types.js";
import type { InteractiveTUIProps } from "./InteractiveTUI.js";
import { useTerminalSize } from "./useTerminalSize.js";
import {
  suppressConsole,
  restoreConsole,
  replayBuffer,
  type SuppressOptions,
} from "./console.js";

// Native TUI rendering bridge (Rust-backed)
import {
  Terminal,
  renderStatusBar,
  renderMessage,
  Styles,
  type TuiStyle,
} from "./tui-renderer.js";

// Debug options
const DEBUG_TUI_BUFFER = process.env.DEBUG_TUI_BUFFER === "true";
const DEBUG_TUI_LOG = process.env.DEBUG_TUI_LOG;

// Use native Rust TUI for terminal control (replaces manual ANSI codes)
const NativeTerminal = {
  enterAltScreen: (): void => process.stdout.write(Terminal.enterAltScreen()),
  exitAltScreen: (): void => process.stdout.write(Terminal.exitAltScreen()),
  clearScreen: (): void => process.stdout.write(Terminal.clearScreen()),
  hideCursor: (): void => process.stdout.write(Terminal.hideCursor()),
  showCursor: (): void => process.stdout.write(Terminal.showCursor()),
};

// Mouse scroll (still using ANSI codes for now - native doesn't have this yet)
const ENABLE_MOUSE_SCROLL = "\x1b[?1000h\x1b[?1006h";
const DISABLE_MOUSE_SCROLL = "\x1b[?1000l\x1b[?1006l";

// Colors (keeping for compatibility with any remaining direct ANSI usage)
const C = {
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  reset: "\x1b[0m",
  clearLine: "\x1b[2K",
  cursorUp: (n: number) => `\x1b[${n}A`,
  cursorDown: (n: number) => `\x1b[${n}B`,
};

// ============================================
// MESSAGE STORE (in memory)
// ============================================

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolName?: string;
  type?: "tool_call" | "tool_result" | "text";
  isError?: boolean;
  timestamp: number;
}

let msgId = 0;
const genId = () => `msg-${++msgId}-${Date.now()}`;

// Global message store
const messages: Message[] = [];

function addMessage(msg: Omit<Message, "id" | "timestamp">) {
  messages.push({
    ...msg,
    id: genId(),
    timestamp: Date.now(),
  });
}

// ============================================
// SCROLLABLE TUI COMPONENT
// ============================================

interface ScrollableViewProps {
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
}

function ScrollableView({
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
}: ScrollableViewProps) {
  const [apiMessages, setApiMessages] = useState<ApiMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [cursorPos, setCursorPos] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [spinnerFrame, setSpinnerFrame] = useState(0);
  const [tokenCount, setTokenCount] = useState(0);
  const [model, setModel] = useState(initialModel);

  // Scroll state
  const [scrollOffset, setScrollOffset] = useState(0);
  const [forceUpdate, setForceUpdate] = useState(0);

  const { exit } = useApp();
  const { height: terminalHeight, width: terminalWidth } = useTerminalSize();

  // Reserve space for status bar + input (3 lines)
  const viewportHeight = terminalHeight - 3;

  const historyRef = useRef<string[]>([]);
  const historyIdxRef = useRef(-1);
  const savedInputRef = useRef("");
  const isProcessingRef = useRef(false);

  // Spinner
  useEffect(() => {
    if (!isLoading) return;
    const iv = setInterval(() => setSpinnerFrame(f => (f + 1) % spinnerFrames.length), 80);
    return () => clearInterval(iv);
  }, [isLoading]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const maxOffset = Math.max(0, messages.length - viewportHeight);
    setScrollOffset(maxOffset);
    setForceUpdate(n => n + 1);
  }, [messages.length, viewportHeight]);

  // Render messages in viewport
  const visibleMessages = messages.slice(scrollOffset, scrollOffset + viewportHeight);

  // Context info
  const contextInfo = calculateContextInfo(tokenCount, model);

  // Process message
  const processMessage = useCallback(async (input: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    addMessage({ role: "user", content: input });
    setForceUpdate(n => n + 1);
    setIsLoading(true);

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
        onToolUse: (tu) => {
          const preview = typeof tu.input === "object"
            ? JSON.stringify(tu.input, null, 2).slice(0, 200)
            : String(tu.input).slice(0, 200);
          addMessage({
            role: "system",
            content: preview,
            toolName: tu.name,
            type: "tool_call",
          });
          setForceUpdate(n => n + 1);
        },
        onToolResult: (tr) => {
          const preview = typeof tr.result.content === "string"
            ? tr.result.content.slice(0, 200)
            : JSON.stringify(tr.result.content).slice(0, 200);
          addMessage({
            role: "system",
            content: preview,
            toolName: "result",
            type: "tool_result",
            isError: tr.result.is_error,
          });
          setForceUpdate(n => n + 1);
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
        addMessage({
          role: "assistant",
          content: apiToText(lastAssistant),
        });
        setForceUpdate(n => n + 1);
        await sessionStore.saveMessage(lastAssistant);
      }
    } catch (err) {
      addMessage({
        role: "system",
        content: `Error: ${err instanceof Error ? err.message : String(err)}`,
      });
      setForceUpdate(n => n + 1);
    } finally {
      setIsLoading(false);
      isProcessingRef.current = false;
    }
  }, [apiMessages, apiKey, model, maxTokens, systemPrompt, tools, permissionMode, workingDirectory, hookManager, sessionId, sessionStore]);

  // Handle commands
  const handleCommand = useCallback(async (cmd: string) => {
    const [command, ...argsArr] = cmd.slice(1).split(" ");
    const args = argsArr.join(" ");

    switch (command?.toLowerCase()) {
      case "help":
        addMessage({ role: "system", content: HELP_TEXT });
        break;
      case "clear":
        messages.length = 0;
        addMessage({ role: "system", content: "[Cleared]" });
        break;
      case "exit":
      case "quit":
        onExit?.();
        exit();
        break;
      case "model":
        if (args) {
          setModel(args);
          addMessage({ role: "system", content: `Model: ${getModelDisplayName(args)}` });
        } else {
          addMessage({ role: "system", content: `Model: ${getModelDisplayName(model)}` });
        }
        break;
      case "status":
        addMessage({
          role: "system",
          content: `Session: ${sessionId.slice(0, 8)}... | Model: ${getModelDisplayName(model)} | Context: ${contextInfo.percentRemaining.toFixed(0)}%`,
        });
        break;
      default:
        addMessage({ role: "system", content: `Unknown: /${command}` });
    }
    setForceUpdate(n => n + 1);
  }, [onExit, exit, model, sessionId, contextInfo.percentRemaining]);

  // Keyboard + mouse input
  useInput((input: string, key: Key) => {
    // Check for mouse scroll events (SGR extended mode: ESC [ < 64/65 ; x ; y M)
    if (input.includes("\x1b[<64")) {
      // Scroll up
      setScrollOffset(prev => Math.max(0, prev - 3));
      return;
    }
    if (input.includes("\x1b[<65")) {
      // Scroll down
      const maxOffset = Math.max(0, messages.length - viewportHeight);
      setScrollOffset(prev => Math.min(maxOffset, prev + 3));
      return;
    }

    // Exit
    if (key.ctrl && input === "c") {
      onExit?.();
      exit();
      return;
    }

    // Scroll controls (work even during loading)
    if (key.upArrow && !key.ctrl) {
      setScrollOffset(prev => Math.max(0, prev - 1));
      return;
    }
    if (key.downArrow && !key.ctrl) {
      const maxOffset = Math.max(0, messages.length - viewportHeight);
      setScrollOffset(prev => Math.min(maxOffset, prev + 1));
      return;
    }
    if (key.pageUp) {
      setScrollOffset(prev => Math.max(0, prev - viewportHeight));
      return;
    }
    if (key.pageDown) {
      const maxOffset = Math.max(0, messages.length - viewportHeight);
      setScrollOffset(prev => Math.min(maxOffset, prev + viewportHeight));
      return;
    }

    if (isLoading) return;

    // Enter - submit
    if (key.return) {
      const value = inputValue.trim();
      if (!value) return;

      setInputValue("");
      setCursorPos(0);
      historyIdxRef.current = -1;

      if (!value.startsWith("/") && value !== historyRef.current[0]) {
        historyRef.current = [value, ...historyRef.current].slice(0, 100);
      }

      setTimeout(() => {
        if (value.startsWith("/")) {
          handleCommand(value);
        } else {
          processMessage(value);
        }
      }, 0);
      return;
    }

    // History navigation
    if (key.upArrow && key.ctrl) {
      if (historyRef.current.length > 0) {
        if (historyIdxRef.current === -1) savedInputRef.current = inputValue;
        const newIdx = Math.min(historyIdxRef.current + 1, historyRef.current.length - 1);
        historyIdxRef.current = newIdx;
        setInputValue(historyRef.current[newIdx] || "");
        setCursorPos((historyRef.current[newIdx] || "").length);
      }
      return;
    }
    if (key.downArrow && key.ctrl) {
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

    // Input editing
    if (key.backspace || key.delete) {
      if (cursorPos > 0) {
        setInputValue(prev => prev.slice(0, cursorPos - 1) + prev.slice(cursorPos));
        setCursorPos(p => p - 1);
      }
      return;
    }

    if (key.leftArrow) {
      setCursorPos(p => Math.max(0, p - 1));
      return;
    }
    if (key.rightArrow) {
      setCursorPos(p => Math.min(inputValue.length, p + 1));
      return;
    }

    if (key.ctrl && input === "a") {
      setCursorPos(0);
      return;
    }
    if (key.ctrl && input === "e") {
      setCursorPos(inputValue.length);
      return;
    }
    if (key.ctrl && input === "u") {
      setInputValue("");
      setCursorPos(0);
      return;
    }

    // Regular input
    if (input && !key.ctrl && !key.meta) {
      if (historyIdxRef.current !== -1) {
        historyIdxRef.current = -1;
        savedInputRef.current = "";
      }
      setInputValue(prev => prev.slice(0, cursorPos) + input + prev.slice(cursorPos));
      setCursorPos(p => p + input.length);
    }
  });

  return (
    <Box flexDirection="column" height={terminalHeight} width={terminalWidth}>
      {/* Messages viewport */}
      <Box flexDirection="column" height={viewportHeight} flexGrow={1}>
        {visibleMessages.length === 0 && !isLoading && (
          <Text dimColor>
            Welcome to Coder v{VERSION}. Type /help for commands.
          </Text>
        )}

        {visibleMessages.map((msg, idx) => {
          if (msg.type === "tool_call") {
            return (
              <Box key={msg.id} flexDirection="column">
                <Text bold color="yellow">▶ {msg.toolName}</Text>
                {msg.content && <Text dimColor>  {msg.content.slice(0, 100)}</Text>}
              </Box>
            );
          }
          if (msg.type === "tool_result") {
            return (
              <Box key={msg.id} flexDirection="column">
                <Text bold color={msg.isError ? "red" : "green"}>
                  {msg.isError ? "✗" : "✓"} {msg.toolName}
                </Text>
                {msg.content && <Text dimColor>  {msg.content.slice(0, 100)}</Text>}
              </Box>
            );
          }
          return (
            <Text key={msg.id}>
              {msg.role === "user" ? (
                <Text bold color="cyan">You: </Text>
              ) : msg.role === "assistant" ? (
                <Text bold color="magenta">Claude: </Text>
              ) : (
                <Text bold color="yellow">System: </Text>
              )}
              <Text dimColor={msg.role === "system"}>{msg.content}</Text>
            </Text>
          );
        })}

        {isLoading && (
          <Text color="cyan">{spinnerFrames[spinnerFrame]} Processing...</Text>
        )}
      </Box>

      {/* Scroll indicator */}
      {messages.length > viewportHeight && (
        <Text dimColor>
          [{scrollOffset + 1}-{Math.min(scrollOffset + viewportHeight, messages.length)}/{messages.length}] ↑↓ PgUp/PgDn
        </Text>
      )}

      {/* Status bar */}
      <Text dimColor>
        {isLoading ? spinnerFrames[spinnerFrame] + " " : ""}Context: {tokenCount}t ({contextInfo.percentRemaining.toFixed(0)}%) | {permissionMode}
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
          <Text dimColor>Type... (/help)</Text>
        )}
      </Text>
    </Box>
  );
}

// ============================================
// HELPERS
// ============================================

const HELP_TEXT = `
Commands:
  /help              Show help
  /clear             Clear messages
  /model [name]      Switch model
  /status            Session info
  /exit              Exit

Navigation:
  ↑/↓                Scroll one line
  PgUp/PgDn          Scroll one page
  Mouse wheel        Scroll
  Ctrl+↑/↓           History nav
`;

function estimateTokens(text: string): number {
  return Math.ceil((text?.length || 1) / 4);
}

function estimateMessagesTokens(msgs: ApiMessage[]): number {
  let total = 0;
  for (const msg of msgs) {
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
    if (b.type === "tool_use") return `[${b.name}]`;
    if (b.type === "tool_result") return b.is_error ? "[Error]" : "[Result]";
    return "";
  }).join("\n");
}

// ============================================
// RUNNER
// ============================================

export async function runScrollableTUI(
  options: InteractiveTUIProps,
  suppressOptions?: SuppressOptions
): Promise<void> {
  const opts: SuppressOptions = {
    buffer: DEBUG_TUI_BUFFER || suppressOptions?.buffer || false,
    logFile: DEBUG_TUI_LOG || suppressOptions?.logFile,
    ...suppressOptions,
  };

  suppressConsole(opts);

  // Enter alternate screen buffer using native Rust TUI
  NativeTerminal.enterAltScreen();
  NativeTerminal.hideCursor();
  process.stdout.write(ENABLE_MOUSE_SCROLL);

  try {
    const { unmount, waitUntilExit } = render(
      <ScrollableView {...options} />,
      {
        exitOnCtrlC: false,
        stdin: process.stdin,
        stdout: process.stdout,
        stderr: process.stderr,
      }
    );

    await waitUntilExit();
    unmount();
  } finally {
    // Disable mouse + exit alternate screen buffer using native Rust TUI
    process.stdout.write(DISABLE_MOUSE_SCROLL);
    NativeTerminal.showCursor();
    NativeTerminal.exitAltScreen();
    restoreConsole();

    if (opts.buffer) {
      replayBuffer();
    }
  }
}
