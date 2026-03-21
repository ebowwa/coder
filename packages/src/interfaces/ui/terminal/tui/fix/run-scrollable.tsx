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
 * - Uses @ebowwa/tui-core for UI rendering
 * - Uses core/tui module for shared logic
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  render,
  Box,
  Text,
  useInput,
  useApp,
  useTerminalSize,
} from "@ebowwa/tui-core";
import type { Key } from "@ebowwa/tui-core";
import { getVisibleRange } from "@ebowwa/tui-core/algorithms";
import type { PermissionMode, Message as ApiMessage, ToolDefinition } from "../../../../../schemas/index.js";
import type { HookManager } from "../../../../../ecosystem/hooks/index.js";
import { agentLoop } from "../../../../../core/agent-loop.js";
import { getGitStatus } from "../../../../../core/git-status.js";
import { calculateContextInfo, VERSION, getModelDisplayName, formatTokenCount } from "../../shared/status-line.js";
import { formatCost } from "../../../../../core/agent-loop/formatters.js";
import { spinnerFrames } from "../spinner.js";
import type { SessionStore, UIMessage } from "../types.js";
import type { ChatUIProps } from "../ChatUI.js";
import {
  suppressConsole,
  restoreConsole,
  replayBuffer,
  type SuppressOptions,
} from "../console.js";

// Import from core/tui module
import {
  genId,
  estimateMessagesTokens,
  apiToText,
  HELP_TEXT,
  TerminalControl,
  CommandHandler,
  type CommandContext,
} from "../../../../../core/tui/index.js";

// Debug options
const DEBUG_TUI_BUFFER = process.env.DEBUG_TUI_BUFFER === "true";
const DEBUG_TUI_LOG = process.env.DEBUG_TUI_LOG;

// NOTE: TerminalControl is now imported from core/tui

// Mouse scroll (SGR extended mode)
const ENABLE_MOUSE_SCROLL = "\x1b[?1000h\x1b[?1006h";
const DISABLE_MOUSE_SCROLL = "\x1b[?1000l\x1b[?1006l";

// ============================================
// MESSAGE STORE (in memory)
// ============================================

const messages: UIMessage[] = [];

function addMessage(msg: Omit<UIMessage, "id" | "timestamp">) {
  messages.push({
    ...msg,
    id: genId(),
    timestamp: Date.now(),
  });
}

function clearMessages() {
  messages.length = 0;
}

// ============================================
// SCROLLABLE TUI COMPONENT
// ============================================

interface ScrollableViewProps extends ChatUIProps {}

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
  const [totalCost, setTotalCost] = useState(0);

  // Scroll state
  const [scrollOffset, setScrollOffset] = useState(0);
  const [forceUpdate, setForceUpdate] = useState(0);

  // Virtual scroll config
  const itemHeight = 1; // Each message takes 1 line minimum
  const overscan = 5; // Extra items to render above/below viewport for smooth scrolling

  const { exit } = useApp();
  const { height: terminalHeight, width: terminalWidth } = useTerminalSize();

  // Reserve space for status bar + input (3 lines)
  const viewportHeight = terminalHeight - 3;

  // Calculate visible range using virtual scroll algorithm
  const virtualScrollResult = getVisibleRange({
    totalCount: messages.length,
    viewportHeight,
    itemHeight,
    scrollTop: scrollOffset * itemHeight,
    overscan,
  });

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
  }, [messages.length, viewportHeight, itemHeight]);

  // Calculate visible start/end for display
  const displayStart = virtualScrollResult ? virtualScrollResult.startIndex + 1 : scrollOffset + 1;
  const displayEnd = virtualScrollResult
    ? Math.min(virtualScrollResult.endIndex, messages.length)
    : Math.min(scrollOffset + viewportHeight, messages.length);

  // Render messages in viewport using virtual scroll
  const visibleMessages = virtualScrollResult
    ? messages.slice(virtualScrollResult.startIndex, virtualScrollResult.endIndex)
    : messages.slice(scrollOffset, scrollOffset + viewportHeight);

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
            subType: "tool_call",
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
            subType: "tool_result",
            isError: tr.result.is_error,
          });
          setForceUpdate(n => n + 1);
        },
        onMetrics: async (m) => {
          const tokens = m.usage.input_tokens + m.usage.output_tokens;
          if (tokens > 0) setTokenCount(tokens);
          setTotalCost(prev => prev + (m.costUSD ?? 0));
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
        subType: "error",
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
        clearMessages();
        addMessage({ role: "system", content: "[Cleared]" });
        break;
      case "exit":
      case "quit":
        onExit?.();
        exit();
        break;
      case "cost":
        addMessage({
          role: "system",
          content: `Session Cost: ${formatCost(totalCost)}\nTokens: ${tokenCount}`,
        });
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
          content: `Session: ${sessionId.slice(0, 8)}... | Model: ${getModelDisplayName(model)} | Context: ${contextInfo.percentRemaining.toFixed(0)}% | Cost: ${formatCost(totalCost)}`,
        });
        break;
      default:
        addMessage({ role: "system", content: `Unknown: /${command}` });
    }
    setForceUpdate(n => n + 1);
  }, [onExit, exit, model, sessionId, contextInfo.percentRemaining, totalCost, tokenCount]);

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

        {visibleMessages.map((msg) => {
          if (msg.subType === "tool_call") {
            return (
              <Box key={msg.id} flexDirection="column">
                <Text bold color="yellow">▶ {msg.toolName}</Text>
                {msg.content && <Text dimColor>  {msg.content.slice(0, 100)}</Text>}
              </Box>
            );
          }
          if (msg.subType === "tool_result") {
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
          [{displayStart}-{displayEnd}/{messages.length}] ↑↓ PgUp/PgDn
          {virtualScrollResult && <Text dimColor> | Virtual Scroll</Text>}
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
// RUNNER
// ============================================

export async function runScrollableTUI(
  options: ChatUIProps,
  suppressOptions?: SuppressOptions
): Promise<void> {
  const opts: SuppressOptions = {
    buffer: DEBUG_TUI_BUFFER || suppressOptions?.buffer || false,
    logFile: DEBUG_TUI_LOG || suppressOptions?.logFile,
    ...suppressOptions,
  };

  suppressConsole(opts);

  // Enter alternate screen buffer
  TerminalControl.enterAltScreen();
  TerminalControl.hideCursor();
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
    // Disable mouse + exit alternate screen buffer
    process.stdout.write(DISABLE_MOUSE_SCROLL);
    TerminalControl.showCursor();
    TerminalControl.exitAltScreen();
    restoreConsole();

    if (opts.buffer) {
      replayBuffer();
    }
  }
}
