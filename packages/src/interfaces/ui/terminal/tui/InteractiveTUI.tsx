/**
 * InteractiveTUI - Simplified terminal UI
 *
 * Principles:
 * 1. Use Ink's useInput directly (no native polling)
 * 2. Single state source (no dual message tracking)
 * 3. No context providers
 * 4. No global state hacks
 * 5. Show tool calls and results in UI
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { render, Box, Text, useInput, useApp } from "ink";
import type { Key } from "ink";
import type { PermissionMode, Message as ApiMessage, ToolDefinition } from "../../../../types/index.js";
import type { HookManager } from "../../../../ecosystem/hooks/index.js";
import { agentLoop } from "../../../../core/agent-loop.js";
import { getGitStatus } from "../../../../core/git-status.js";
import { calculateContextInfo, VERSION } from "../shared/status-line.js";
import { spinnerFrames } from "./spinner.js";
import type { SessionStore, ContextInfo } from "./types.js";
import { useTerminalSize } from "./useTerminalSize.js";

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
  type?: "tool_call" | "tool_result" | "text";
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
    return "";
  }).join("\n");
}

const HELP_TEXT = `
Commands:
  /help     - Show this help
  /clear    - Clear messages
  /compact  - Compact context
  /exit     - Exit Coder
  Ctrl+C    - Exit Coder

Navigation:
  Shift+↑/↓  - Scroll chat history
  PgUp/PgDn  - Page through messages
`;

// ============================================
// COMPONENT
// ============================================

function InteractiveTUI({
  apiKey,
  model,
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
  const [spinnerFrame, setSpinnerFrame] = useState(0);
  const [tokenCount, setTokenCount] = useState(0);

  // Refs for history (no re-renders needed)
  const historyRef = useRef<string[]>([]);
  const historyIdxRef = useRef(-1);
  const savedInputRef = useRef("");
  const isProcessingRef = useRef(false);

  // Scroll state for chat history
  const [scrollOffset, setScrollOffset] = useState(0); // 0 = bottom, higher = scrolled up

  const { exit } = useApp();

  // Track terminal dimensions with resize support
  const { width: terminalWidth, height: terminalHeight } = useTerminalSize();

  // Dynamic limits based on terminal size
  const maxContentWidth = Math.max(terminalWidth - 20, 40); // Reserve space for labels/padding
  const visibleMessageCount = Math.max(terminalHeight - 4, 5); // Reserve lines for status/input
  const maxToolPreview = Math.floor(maxContentWidth * 2); // Tool previews can span ~2 lines
  const maxMessageLength = Math.floor(maxContentWidth * 10); // Messages can span ~10 lines

  // Spinner animation
  useEffect(() => {
    if (!isLoading) return;
    const iv = setInterval(() => setSpinnerFrame(f => (f + 1) % spinnerFrames.length), 80);
    return () => clearInterval(iv);
  }, [isLoading]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    setScrollOffset(0); // Reset scroll when new messages come in
  }, [messages.length]);

  // Process message
  const processMessage = useCallback(async (input: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    // Add user message
    setMessages(prev => [...prev, { id: genId(), role: "user", content: input }]);

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
        }]);
        await sessionStore.saveMessage(lastAssistant);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setMessages(prev => [...prev, { id: genId(), role: "system", content: `Error: ${errorMessage}` }]);
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

    switch (command) {
      case "help":
        setMessages(prev => [...prev, { id: genId(), role: "system", content: HELP_TEXT }]);
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

      default:
        setMessages(prev => [...prev, { id: genId(), role: "system", content: `Unknown command: /${command}` }]);
    }
  }, [onExit, exit, sessionStore, setSessionId]);

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

    // Chat history scroll (Shift+Up/Down or Page Up/Down)
    if ((key.upArrow && key.shift) || (key.pageUp)) {
      const maxOffset = Math.max(0, messages.length - visibleMessageCount);
      setScrollOffset(prev => Math.min(prev + visibleMessageCount, maxOffset));
      return;
    }

    if ((key.downArrow && key.shift) || (key.pageDown)) {
      setScrollOffset(prev => Math.max(prev - visibleMessageCount, 0));
      return;
    }

    // Jump to top/bottom (Shift+Home/End)
    if (key.shift && input === "\x1b[H") { // Home
      const maxOffset = Math.max(0, messages.length - visibleMessageCount);
      setScrollOffset(maxOffset);
      return;
    }
    if (key.shift && input === "\x1b[F") { // End
      setScrollOffset(0);
      return;
    }

    // Input history up (without shift)
    if (key.upArrow && !key.shift) {
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

    if (key.downArrow && !key.shift) {
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

  // Calculate scroll bounds
  const maxScrollOffset = Math.max(0, messages.length - visibleMessageCount);
  const clampedScrollOffset = Math.min(scrollOffset, maxScrollOffset);

  // Render messages based on terminal height and scroll position
  // scrollOffset=0 means show latest (bottom), higher means scrolled up
  const startIndex = Math.max(0, messages.length - visibleMessageCount - clampedScrollOffset);
  const endIndex = messages.length - clampedScrollOffset;
  const visibleMessages = messages.slice(startIndex, endIndex);
  const canScrollUp = clampedScrollOffset < maxScrollOffset;
  const canScrollDown = clampedScrollOffset > 0;

  return (
    <Box flexDirection="column" height={terminalHeight} width={terminalWidth}>
      {/* Messages */}
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {contextInfo.isLow && (
          <Text color={contextInfo.isCritical ? "red" : "yellow"} bold>
            Context: {contextInfo.percentRemaining.toFixed(0)}% remaining
          </Text>
        )}

        {visibleMessages.length === 0 && !isLoading && !streamingText && (
          <Text dimColor>
            Welcome to Coder v{VERSION}. Type your message or /help for commands.
          </Text>
        )}

        {visibleMessages.map(msg => {
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
        {isLoading ? spinnerFrames[spinnerFrame] + " " : ""}
        Context: {tokenCount} tokens | {permissionMode}
        {canScrollUp && " | ↑more"}
        {canScrollDown && " | ↓more"}
        {clampedScrollOffset > 0 && ` | ${clampedScrollOffset}/${maxScrollOffset} scrolled`}
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

export function createInteractiveTUI(
  initialProps: InteractiveTUIProps
): InteractiveTUIHandle {
  let currentProps = { ...initialProps };
  let rerenderFn: ((node: React.ReactNode) => void) | null = null;
  let unmountFn: (() => void) | null = null;
  let waitFn: (() => Promise<void>) | null = null;

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
    unmount: () => unmountFn?.(),
    waitUntilExit: () => waitFn?.() || Promise.resolve(),
  };
}

export default InteractiveTUI;
