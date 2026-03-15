/**
 * ScrollableTUI - A TUI that supports terminal scrollback
 *
 * Architecture:
 * - Message history: Direct stdout writes (append-only, enables scrollback)
 * - Input/status bar: Ink reactive component (stays at bottom)
 *
 * This hybrid approach gives us:
 * 1. Alternate screen buffer (isolation)
 * 2. Native terminal scrollback (mouse wheel, Shift+PageUp/Down)
 * 3. Clean input handling (Ink)
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
import { useTerminalSize } from "./useTerminalSize.js";

// ============================================
// TYPES
// ============================================

interface UIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolName?: string;
  type?: "tool_call" | "tool_result" | "text" | "thinking";
  isError?: boolean;
  timestamp: number;
}

export interface ScrollableTUIProps {
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
  onMessage: (msg: UIMessage) => void;  // Callback to log messages
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

const HELP_TEXT = `
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
  Up/Down            - History
`;

// ============================================
// COMPONENT
// ============================================

function ScrollableTUI({
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
  onMessage,
}: ScrollableTUIProps) {
  const [apiMessages, setApiMessages] = useState<ApiMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [cursorPos, setCursorPos] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [spinnerFrame, setSpinnerFrame] = useState(0);
  const [tokenCount, setTokenCount] = useState(0);
  const [model, setModel] = useState(initialModel);

  const historyRef = useRef<string[]>([]);
  const historyIdxRef = useRef(-1);
  const savedInputRef = useRef("");
  const isProcessingRef = useRef(false);

  const { exit } = useApp();
  const { width: terminalWidth } = useTerminalSize();

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

    // Log user message
    onMessage({
      id: genId(),
      role: "user",
      content: input,
      timestamp: Date.now(),
    });

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
        onText: (text) => {
          // Could log streaming text here if desired
        },
        onToolUse: (tu) => {
          const inputPreview = typeof tu.input === "object"
            ? JSON.stringify(tu.input, null, 2).slice(0, 500)
            : String(tu.input).slice(0, 500);
          onMessage({
            id: genId(),
            role: "system",
            content: inputPreview,
            toolName: tu.name,
            type: "tool_call",
            timestamp: Date.now(),
          });
        },
        onToolResult: (tr) => {
          const outputPreview = typeof tr.result.content === "string"
            ? tr.result.content.slice(0, 500)
            : JSON.stringify(tr.result.content).slice(0, 500);
          onMessage({
            id: genId(),
            role: "system",
            content: outputPreview,
            toolName: "result",
            isError: tr.result.is_error,
            type: "tool_result",
            timestamp: Date.now(),
          });
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
        onMessage({
          id: genId(),
          role: "assistant",
          content: apiToText(lastAssistant),
          timestamp: Date.now(),
        });
        await sessionStore.saveMessage(lastAssistant);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      onMessage({
        id: genId(),
        role: "system",
        content: `Error: ${errorMessage}`,
        timestamp: Date.now(),
      });
    } finally {
      setIsLoading(false);
      isProcessingRef.current = false;
    }
  }, [apiMessages, apiKey, model, maxTokens, systemPrompt, tools, permissionMode, workingDirectory, hookManager, sessionId, sessionStore, onMessage]);

  // Handle commands
  const handleCommand = useCallback(async (cmd: string) => {
    const parts = cmd.slice(1).split(" ");
    const command = parts[0]?.toLowerCase();
    const args = parts.slice(1).join(" ");

    switch (command) {
      case "help":
        onMessage({ id: genId(), role: "system", content: HELP_TEXT, timestamp: Date.now() });
        break;

      case "clear":
        setApiMessages([]);
        setTokenCount(0);
        onMessage({ id: genId(), role: "system", content: "[Messages cleared]", timestamp: Date.now() });
        break;

      case "exit":
      case "quit":
        onExit?.();
        exit();
        break;

      case "model":
        if (args) {
          setModel(args);
          onMessage({ id: genId(), role: "system", content: `Model: ${getModelDisplayName(args)}`, timestamp: Date.now() });
        } else {
          onMessage({ id: genId(), role: "system", content: `Model: ${getModelDisplayName(model)}`, timestamp: Date.now() });
        }
        break;

      case "status": {
        const info = calculateContextInfo(tokenCount, model);
        onMessage({
          id: genId(),
          role: "system",
          content: `Session: ${sessionId.slice(0, 8)}... | Model: ${getModelDisplayName(model)} | Context: ${info.percentRemaining.toFixed(1)}% remaining`,
          timestamp: Date.now(),
        });
        break;
      }

      default:
        onMessage({ id: genId(), role: "system", content: `Unknown: /${command}`, timestamp: Date.now() });
    }
  }, [onExit, exit, model, tokenCount, sessionId, onMessage]);

  // Keyboard input
  useInput((input: string, key: Key) => {
    if (key.ctrl && input === "c") {
      onExit?.();
      exit();
      return;
    }

    if (isLoading) return;

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

    if (input && !key.ctrl && !key.meta) {
      if (historyIdxRef.current !== -1) {
        historyIdxRef.current = -1;
        savedInputRef.current = "";
      }
      setInputValue(prev => prev.slice(0, cursorPos) + input + prev.slice(cursorPos));
      setCursorPos(p => p + input.length);
    }
  }, { isActive: !isLoading });

  const contextInfo = calculateContextInfo(tokenCount, model);

  return (
    <Box flexDirection="column" width={terminalWidth}>
      {/* Status bar */}
      <Text dimColor>
        {isLoading ? spinnerFrames[spinnerFrame] + " " : ""}Context: {tokenCount} tokens ({contextInfo.percentRemaining.toFixed(0)}%) | {permissionMode} | {getModelDisplayName(model)}
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
          <Text dimColor>Type message... (/help)</Text>
        )}
      </Text>
    </Box>
  );
}

export default ScrollableTUI;
