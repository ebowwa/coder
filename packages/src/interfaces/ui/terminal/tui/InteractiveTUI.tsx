/**
 * Main Interactive TUI Component
 * Orchestrates all sub-components and manages state and agent loop
 *
 * Uses:
 * - MessageStore: Centralized message state management
 * - InputContext: Centralized keyboard input handling
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Box, Text, useApp, useStdout } from "ink";
import type { ExtendedThinkingConfig } from "../../../../types/index.js";
import { agentLoop } from "../../../../core/agent-loop.js";
import { getGitStatus } from "../../../../core/git-status.js";
import { createStreamHighlighter } from "../../../../core/stream-highlighter.js";
import { calculateContextInfo } from "../shared/status-line.js";
import { spinnerFrames } from "./spinner.js";
import { MessageArea } from "./MessageArea.js";
import { InputField, setGlobalInput } from "./InputField.js";
import { handleCommand } from "./commands.js";
import { useNativeInput, KeyEvents } from "./useNativeInput.js";
import { InputProvider } from "./InputContext.js";
import { MessageStoreProvider, useMessageStore } from "./MessageStore.js";
import type { InteractiveTUIProps, MessageSubType } from "./types.js";

/**
 * Estimate token count from text
 * Uses ~4 characters per token as rough approximation
 */
function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Estimate total tokens from messages
 */
function estimateMessagesTokens(messages: import("../../../../types/index.js").Message[]): number {
  let total = 0;
  for (const msg of messages) {
    if (typeof msg.content === "string") {
      total += estimateTokens(msg.content);
    } else if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === "text") {
          total += estimateTokens(block.text);
        } else if (block.type === "tool_use") {
          total += estimateTokens(JSON.stringify(block.input));
        } else if (block.type === "tool_result") {
          if (typeof block.content === "string") {
            total += estimateTokens(block.content);
          }
        }
      }
    }
  }
  return total;
}

/**
 * Inner component that uses MessageStore
 */
function InteractiveTUIInner({
  apiKey,
  model: initialModel,
  permissionMode,
  maxTokens,
  systemPrompt: initialSystemPrompt,
  tools,
  hookManager,
  sessionStore,
  sessionId,
  setSessionId,
  workingDirectory,
  teammateRunner,
  onExit,
}: InteractiveTUIProps) {
  // Message store
  const {
    messages,
    apiMessages,
    addMessage,
    addApiMessages,
    addSystem,
    tokenCount,
    setTokenCount,
  } = useMessageStore();

  // UI state - use refs for immediate input display updates
  const inputRef = useRef("");
  const cursorRef = useRef(0);
  const [isLoading, setIsLoading] = useState(false);

  // Update input and sync to global state for InputField
  // NOTE: Use inputRef.current and cursorRef.current directly in callbacks
  // to avoid stale closure values. Don't use inputValue/cursorPos variables.
  const setInputValue = useCallback((value: string) => {
    inputRef.current = value;
    setGlobalInput(value, cursorRef.current);
  }, []);

  const setCursorPos = useCallback((pos: number | ((prev: number) => number)) => {
    const newPos = typeof pos === "function" ? pos(cursorRef.current) : pos;
    cursorRef.current = newPos;
    setGlobalInput(inputRef.current, newPos);
  }, []);

  const [totalCost, setTotalCost] = useState(0);
  const [spinnerFrame, setSpinnerFrame] = useState("⠋");
  const [model, setModel] = useState(initialModel);
  const [systemPrompt] = useState(initialSystemPrompt);
  const [streamingText, setStreamingText] = useState("");
  const [scrollOffset, setScrollOffset] = useState(0);
  const [sessionSelectMode, setSessionSelectMode] = useState(false);
  const [selectableSessions, setSelectableSessions] = useState<Array<{ id: string; messageCount: number; metadata?: Record<string, unknown> }>>([]);
  const [helpMode, setHelpMode] = useState(false);
  const [helpSection, setHelpSection] = useState(0);

  // Input history
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [savedInput, setSavedInput] = useState("");

  const { exit } = useApp();
  const { stdout } = useStdout();
  const frameRef = useRef(0);
  const isProcessingRef = useRef(false);
  const highlighterRef = useRef(createStreamHighlighter());

  // Calculate terminal layout
  const terminalHeight = stdout.rows || 24;
  const inputHeight = 3;
  const statusHeight = 3;
  const messageHeight = terminalHeight - inputHeight - statusHeight;

  // Calculate context warning
  const contextInfo = calculateContextInfo(tokenCount, model);
  const contextWarning = contextInfo.isCritical
    ? "Context critical! Use /compact or start new conversation"
    : contextInfo.isLow
      ? `Context low: ${contextInfo.percentRemaining.toFixed(0)}% remaining`
      : null;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    setScrollOffset(0);
  }, [messages.length]);

  // Spinner animation
  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      frameRef.current = (frameRef.current + 1) % spinnerFrames.length;
      const frame = spinnerFrames[frameRef.current];
      if (frame) setSpinnerFrame(frame);
    }, 80);

    return () => clearInterval(interval);
  }, [isLoading]);

  // Teammate mode polling - check for incoming messages
  useEffect(() => {
    if (!teammateRunner || !teammateRunner.isActive()) return;

    const pollInterval = setInterval(() => {
      if (teammateRunner.hasPendingMessages()) {
        const messages = teammateRunner.getPendingMessages();
        for (const msg of messages) {
          // Inject teammate message as user message
          addMessage({
            role: "user",
            content: `[From ${msg.from}] ${msg.content}`,
          });
          teammateRunner.reportActivity();
        }
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [teammateRunner, addMessage]);

  // Report activity when user sends message
  useEffect(() => {
    if (teammateRunner && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === "user") {
        teammateRunner.reportActivity();
      }
    }
  }, [messages, teammateRunner]);

  // Process a message
  const processMessage = useCallback(async (input: string, messageAlreadyAdded = false) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    // Add user message to UI if not already added
    if (!messageAlreadyAdded) {
      addMessage({ role: "user", content: input });
    }

    setIsLoading(true);
    setStreamingText("");
    highlighterRef.current = createStreamHighlighter();

    try {
      // Execute UserPromptSubmit hook
      const hookResult = await hookManager.execute("UserPromptSubmit", {
        prompt: input,
        session_id: sessionId,
      });

      if (hookResult.decision === "deny" || hookResult.decision === "block") {
        addSystem(`Input blocked: ${hookResult.reason || "Security policy"}`);
        return;
      }

      const processedInput = (hookResult.modified_input?.prompt as string) ?? input;

      // Build messages for API
      const newUserMsg = {
        role: "user" as const,
        content: [{ type: "text" as const, text: processedInput }],
      };
      const messagesForApi = [...apiMessages, newUserMsg];

      // Get git status
      const gitStatus = await getGitStatus(workingDirectory);

      // Run agent loop
      const result = await agentLoop(messagesForApi, {
        apiKey,
        model,
        maxTokens,
        systemPrompt,
        tools,
        permissionMode,
        workingDirectory,
        gitStatus,
        extendedThinking: undefined,
        hookManager,
        sessionId,
        onText: (text) => {
          setStreamingText((prev) => prev + text);
        },
        onThinking: () => {
          // Could show thinking in UI
        },
        onToolUse: (toolUse) => {
          addSystem(`[Using: ${toolUse.name}]`, "tool_call", toolUse.name);
        },
        onToolResult: (toolResult) => {
          if (toolResult.result.is_error) {
            addSystem(`[Tool ${toolResult.id}: Error]`, "tool_result", undefined, true);
          }
        },
        onMetrics: async (metrics) => {
          const apiTokens = metrics.usage.input_tokens + metrics.usage.output_tokens;
          if (apiTokens > 0) {
            setTokenCount(apiTokens);
          }
          await sessionStore.saveMetrics(metrics);
        },
      });

      // Update API messages (MessageStore will convert to UI messages)
      // Note: result.messages already includes newUserMsg, so we don't add it again
      // Only add the NEW messages from the result (skip ones we already have)
      addApiMessages(result.messages.slice(apiMessages.length));
      setTotalCost((prev) => prev + result.totalCost);

      // Estimate tokens from final messages
      const estimatedTokens = estimateMessagesTokens(result.messages);
      setTokenCount(estimatedTokens);

      // Save to session
      const lastUserMsg = result.messages[result.messages.length - 2];
      const lastAssistantMsg = result.messages[result.messages.length - 1];
      if (lastUserMsg) await sessionStore.saveMessage(lastUserMsg);
      if (lastAssistantMsg) await sessionStore.saveMessage(lastAssistantMsg);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addSystem(`Error: ${errorMessage}`, "error");
    } finally {
      setIsLoading(false);
      isProcessingRef.current = false;
      setStreamingText("");
    }
  }, [apiMessages, apiKey, model, maxTokens, systemPrompt, tools, permissionMode, workingDirectory, hookManager, sessionId, sessionStore, addMessage, addSystem, addApiMessages, setTokenCount]);

  // Handle commands
  const handleCommandWrapper = useCallback(async (cmd: string) => {
    // Import command context dynamically to avoid circular deps
    const { setMessages: setExternalMessages, processedCountRef } = {
      setMessages: () => {}, // MessageStore handles this now
      processedCountRef: { current: apiMessages.length },
    };

    await handleCommand(cmd, {
      sessionId,
      setSessionId,
      model,
      setModel,
      apiMessages,
      setApiMessages: (msgs) => addApiMessages(msgs.slice(apiMessages.length)),
      setMessages: setExternalMessages,
      processedCountRef,
      totalCost,
      setTotalCost,
      totalTokens: tokenCount,
      setTotalTokens: setTokenCount,
      permissionMode,
      tools,
      workingDirectory,
      sessionStore,
      addSystemMessage: (content: string, subType?: MessageSubType, toolName?: string, isError?: boolean) => {
        addSystem(content, subType, toolName, isError);
      },
      messagesLength: messages.length,
      onExit,
      exit,
      sessionSelectMode,
      setSessionSelectMode,
      setSelectableSessions,
      helpMode,
      setHelpMode,
      helpSection,
      setHelpSection,
    });
  }, [sessionId, setSessionId, model, apiMessages, addApiMessages, totalCost, tokenCount, setTokenCount, permissionMode, tools, workingDirectory, sessionStore, addSystem, messages.length, onExit, exit, sessionSelectMode, helpMode, helpSection]);

  // Handle input with native terminal input
  useNativeInput({
    isActive: true,
    onKey: (event) => {
      // Scroll handling
      if (KeyEvents.isPageUp(event)) {
        setScrollOffset((prev) => prev + 5);
        return;
      }

      if (KeyEvents.isPageDown(event)) {
        setScrollOffset((prev) => Math.max(0, prev - 5));
        return;
      }

      if (KeyEvents.isShiftUp(event)) {
        setScrollOffset((prev) => prev + 1);
        return;
      }

      if (KeyEvents.isShiftDown(event)) {
        setScrollOffset((prev) => Math.max(0, prev - 1));
        return;
      }

      // Ctrl+C to exit
      if (KeyEvents.isCtrlC(event)) {
        onExit();
        exit();
        return;
      }

      if (isLoading) return;

      // Help mode navigation
      if (helpMode) {
        const HELP_SECTIONS_COUNT = 5;

        if (event.code === "escape" || event.code === "q") {
          setHelpMode(false);
          return;
        }

        if (event.code === "tab" || KeyEvents.isRight(event)) {
          setHelpSection((prev) => (prev + 1) % HELP_SECTIONS_COUNT);
          return;
        }

        if (KeyEvents.isLeft(event)) {
          setHelpSection((prev) => (prev - 1 + HELP_SECTIONS_COUNT) % HELP_SECTIONS_COUNT);
          return;
        }

        return;
      }

      // Session selection mode
      if (sessionSelectMode) {
        const num = parseInt(event.code, 10);
        if (!isNaN(num) && num >= 1 && num <= selectableSessions.length) {
          const selectedSession = selectableSessions[num - 1];
          if (selectedSession) {
            setSessionSelectMode(false);
            setSelectableSessions([]);
            handleCommandWrapper(`/resume ${selectedSession.id}`);
          }
        } else if (KeyEvents.isEnter(event) || (event.code && isNaN(num))) {
          setSessionSelectMode(false);
          setSelectableSessions([]);
          addSystem("Session selection cancelled.");
        }
        return;
      }

      // Submit on Enter
      if (KeyEvents.isEnter(event)) {
        // Prevent duplicate submissions while processing
        if (isProcessingRef.current) return;

        const currentInput = inputRef.current;
        if (currentInput.trim()) {
          // Capture value BEFORE clearing
          const valueToSubmit = currentInput;

          // Clear input IMMEDIATELY to prevent duplicate submissions
          // This must happen before any async operations
          inputRef.current = "";
          setGlobalInput("", 0);

          // Add user message to UI
          addMessage({ role: "user", content: valueToSubmit });

          // Clear cursor and history state
          setCursorPos(0);
          setHistoryIndex(-1);
          setSavedInput("");

          // Update history
          if (!valueToSubmit.startsWith("/") && valueToSubmit !== inputHistory[0]) {
            setInputHistory((prev) => [valueToSubmit, ...prev].slice(0, 100));
          }

          // Process after UI updates
          setTimeout(() => {
            if (valueToSubmit.startsWith("/")) {
              handleCommandWrapper(valueToSubmit);
            } else {
              processMessage(valueToSubmit, true); // true = message already added
            }
          }, 50);
        }
        return;
      }

      // History navigation
      if (KeyEvents.isUp(event)) {
        if (inputHistory.length > 0) {
          if (historyIndex === -1) {
            setSavedInput(inputRef.current);
          }
          const newIndex = Math.min(historyIndex + 1, inputHistory.length - 1);
          setHistoryIndex(newIndex);
          setInputValue(inputHistory[newIndex] ?? "");
          setCursorPos((inputHistory[newIndex] ?? "").length);
        }
        return;
      }

      if (KeyEvents.isDown(event)) {
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          setHistoryIndex(newIndex);
          setInputValue(inputHistory[newIndex] ?? "");
          setCursorPos((inputHistory[newIndex] ?? "").length);
        } else if (historyIndex === 0) {
          setHistoryIndex(-1);
          setInputValue(savedInput);
          setCursorPos(savedInput.length);
        }
        return;
      }

      // Text editing
      if (KeyEvents.isBackspace(event)) {
        const currentInput = inputRef.current;
        const currentCursor = cursorRef.current;
        if (currentCursor > 0) {
          const newVal = currentInput.slice(0, currentCursor - 1) + currentInput.slice(currentCursor);
          setInputValue(newVal);
          setCursorPos((p) => p - 1);
        }
        return;
      }

      if (KeyEvents.isDelete(event)) {
        const currentInput = inputRef.current;
        const currentCursor = cursorRef.current;
        if (currentCursor < currentInput.length) {
          const newVal = currentInput.slice(0, currentCursor) + currentInput.slice(currentCursor + 1);
          setInputValue(newVal);
        }
        return;
      }

      if (KeyEvents.isLeft(event)) {
        setCursorPos((p) => Math.max(0, p - 1));
        return;
      }

      if (KeyEvents.isRight(event)) {
        setCursorPos((p) => Math.min(inputRef.current.length, p + 1));
        return;
      }

      if (KeyEvents.isHome(event) || KeyEvents.isCtrlA(event)) {
        setCursorPos(0);
        return;
      }

      if (KeyEvents.isEnd(event) || KeyEvents.isCtrlE(event)) {
        setCursorPos(inputRef.current.length);
        return;
      }

      // Regular character
      if (KeyEvents.isPrintable(event)) {
        if (historyIndex !== -1) {
          setHistoryIndex(-1);
          setSavedInput("");
        }
        const currentInput = inputRef.current;
        const currentCursor = cursorRef.current;
        setInputValue(currentInput.slice(0, currentCursor) + event.code + currentInput.slice(currentCursor));
        setCursorPos((p) => p + 1);
      }
    },
  });

  return (
    <InputProvider initialBlocked={isLoading}>
      <Box flexDirection="column" width="100%">
        <MessageArea
          messages={messages}
          isLoading={isLoading}
          spinnerFrame={spinnerFrame}
          height={messageHeight}
          scrollOffset={scrollOffset}
          contextWarning={contextWarning}
          streamingText={streamingText}
        />

        <Text dimColor>
          {isLoading ? spinnerFrame : ""} Context: {tokenCount} tokens | {permissionMode}
        </Text>

        <InputField
          placeholder="Type your message... (/help for commands)"
          isActive={!isLoading}
        />
      </Box>
    </InputProvider>
  );
}

/**
 * Main Interactive TUI Component with providers
 */
function InteractiveTUI(props: InteractiveTUIProps) {
  return (
    <MessageStoreProvider initialMessages={props.initialMessages}>
      <InteractiveTUIInner {...props} />
    </MessageStoreProvider>
  );
}

export default InteractiveTUI;
