/**
 * InteractiveTUI - Terminal UI built on @ebowwa/tui-core
 *
 * Clean implementation following tui-core patterns.
 * Uses core/tui module for shared logic (CommandHandler, InputManager, TerminalControl).
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  render,
  Box,
  Text,
  Bold,
  Muted,
  ErrorText,
  Success,
  Warning,
  Info,
  App,
  useAppContext,
  Panel,
  StatusBar,
  useInput,
  useTerminalSize,
} from "@ebowwa/tui-core";
import type { Key } from "@ebowwa/tui-core";
import { SPINNERS, getFrame, nextFrame } from "@ebowwa/tui-core/algorithms";

import type { PermissionMode, Message as ApiMessage, ToolDefinition } from "../../../../schemas/index.js";
import type { HookManager } from "../../../../ecosystem/hooks/index.js";
import { agentLoop } from "../../../../core/agent-loop.js";
import { getGitStatus } from "../../../../core/git-status.js";
import { calculateContextInfo, VERSION, getModelDisplayName } from "../shared/status-line.js";
import { formatCost } from "../../../../core/agent-loop/formatters.js";
import type { SessionStore, UIMessage } from "./types.js";

// Import from core/tui module
import {
  genId,
  estimateTokens,
  apiToText,
  HELP_TEXT,
  formatTokenCount as useTokenCount,
  TerminalControl,
  InputManager,
  CommandHandler,
  type CommandContext,
} from "../../../../core/tui/index.js";
import { SuggestionAgent } from "./suggestion-agent.js";

// ============================================
// CONSTANTS
// ============================================

const IDLE_DELAY_MS = 2500; // Show proactive suggestions after 2.5s of idle

// ============================================
// TYPES
// ============================================

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
  stopSequences?: string[];
  resultConditions?: string;
  stopOnUnhandledError?: boolean;
  /** Enable extended thinking */
  extendedThinking?: boolean;
  /** Thinking effort level */
  effort?: "low" | "medium" | "high" | "max";
  /** Enable interleaved thinking */
  interleaved?: boolean;
}

export interface InteractiveTUIHandle {
  rerender: (props: Partial<InteractiveTUIProps>) => void;
  unmount: () => void;
  waitUntilExit: () => Promise<void>;
}

// ============================================
// MESSAGE VIEW COMPONENT
// ============================================

interface MessageViewProps {
  msg: UIMessage;
}

function MessageView({ msg }: MessageViewProps): React.ReactElement {
  if (msg.subType === "tool_call") {
    return (
      <Box flexDirection="column">
        <Warning>▶ {msg.toolName}</Warning>
        {msg.content && <Muted>  {msg.content.slice(0, 200)}</Muted>}
      </Box>
    );
  }
  if (msg.subType === "tool_result") {
    return (
      <Box flexDirection="column">
        {msg.isError ? (
          <ErrorText>✗ {msg.toolName}</ErrorText>
        ) : (
          <Success>✓ {msg.toolName}</Success>
        )}
        {msg.content && <Muted>  {msg.content.slice(0, 200)}</Muted>}
      </Box>
    );
  }
  return (
    <Box>
      {msg.role === "user" ? (
        <Text bold color="cyan">You: </Text>
      ) : msg.role === "assistant" ? (
        <Text bold color="magenta">Claude: </Text>
      ) : (
        <Info>System: </Info>
      )}
      <Muted>{msg.content}</Muted>
    </Box>
  );
}

// ============================================
// MAIN TUI COMPONENT
// ============================================

function InteractiveTUIContent({
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
  extendedThinking,
  effort,
  interleaved,
}: InteractiveTUIProps): React.ReactElement {
  const app = useAppContext();
  const size = useTerminalSize();

  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [apiMessages, setApiMessages] = useState<ApiMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamingThinking, setStreamingThinking] = useState<string | null>(null);
  const [spinnerIndex, setSpinnerIndex] = useState(0);
  const [tokenCount, setTokenCount] = useState(0);
  const [model, setModel] = useState(initialModel);
  const [totalCost, setTotalCost] = useState(0);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [suggestionSource, setSuggestionSource] = useState<"local" | "ai" | null>(null);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [isFetchingSuggestion, setIsFetchingSuggestion] = useState(false);

  const historyRef = useRef<string[]>([]);
  const historyIdxRef = useRef(-1);
  const savedInputRef = useRef("");
  const isProcessingRef = useRef(false);
  const suggestionsRef = useRef<string[]>([]);

  // Rich context for suggestions
  const [gitBranch, setGitBranch] = useState<string | undefined>();
  const [gitDirty, setGitDirty] = useState(false);
  const [recentFiles, setRecentFiles] = useState<string[]>([]);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Suggestion agent instance
  const suggestionAgentRef = useRef<SuggestionAgent | null>(null);

  // Initialize suggestion agent with glm-5-turbo for faster suggestions
  useEffect(() => {
    suggestionAgentRef.current = new SuggestionAgent({
      apiKey,
      model: "glm-5-turbo", // Use turbo model for faster suggestions
      minInputLength: 2,
      debounceMs: 400,
      maxTokens: 30,
      contextSize: 4,
    });

    return () => {
      suggestionAgentRef.current?.destroy();
    };
  }, [apiKey]); // Only re-create if apiKey changes

  // Update agent config when apiKey changes
  useEffect(() => {
    suggestionAgentRef.current?.updateConfig({ apiKey });
  }, [apiKey]);

  // Fetch rich context (git status, recent files) for better suggestions
  useEffect(() => {
    const fetchContext = async () => {
      try {
        // Get git status
        const gitStatus = await getGitStatus(workingDirectory);
        if (gitStatus) {
          setGitBranch(gitStatus.branch);
          setGitDirty(!gitStatus.clean);
        }

        // Get recent files (last 10 from current directory)
        const fs = await import("fs/promises");
        const files = await fs.readdir(workingDirectory).catch(() => [] as string[]);
        const recentFilesList = files.slice(0, 10);
        setRecentFiles(recentFilesList);
      } catch {
        // Silently fail - context is optional
      }
    };

    fetchContext();
  }, [workingDirectory]);

  // Update suggestions using the suggestion agent (AI only)
  const updateSuggestions = useCallback(async (input: string) => {
    const agent = suggestionAgentRef.current;
    if (!agent) return;

    // Clear suggestion while fetching
    setSuggestion(null);
    setSuggestionSource(null);
    setSuggestionIndex(0);
    suggestionsRef.current = [];

    // Fetch AI suggestion (debounced internally by agent)
    if (input.length >= 2 && !input.startsWith("/") && !isProcessingRef.current && agent) {
      setIsFetchingSuggestion(true);
      try {
        const aiResult = await agent.fetchAISuggestion({
          input,
          messages: apiMessages,
          history: historyRef.current,
          // Rich context for better suggestions
          workingDirectory: {
            path: workingDirectory,
            gitBranch,
            gitDirty,
            recentFiles,
          },
        });

        if (aiResult && aiResult.source === "ai") {
          suggestionsRef.current = [aiResult.text];
          setSuggestion(aiResult.text);
          setSuggestionSource("ai");
          setSuggestionIndex(0);
        }
      } finally {
        setIsFetchingSuggestion(false);
      }
    }
  }, [apiMessages, workingDirectory, gitBranch, gitDirty, recentFiles]);

  // Idle suggestions - show suggestions when user stops typing (not during typing)
  const IDLE_DELAY_MS = 1500; // Wait 1.5s after last keystroke

  const scheduleIdleSuggestion = useCallback((input: string) => {
    // Clear any existing timer
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }

    // Don't schedule if processing or input is a command
    if (isProcessingRef.current || input.startsWith("/")) return;

    // Schedule idle suggestion
    idleTimerRef.current = setTimeout(async () => {
      const agent = suggestionAgentRef.current;
      if (!agent || isProcessingRef.current) return;

      setIsFetchingSuggestion(true);
      try {
        // For idle suggestions, we can suggest even with shorter input
        // because the user has paused - they might want help
        const aiResult = await agent.fetchAISuggestion({
          input: input || " ", // Use space for empty input to trigger context-based suggestion
          messages: apiMessages,
          history: historyRef.current,
          workingDirectory: {
            path: workingDirectory,
            gitBranch,
            gitDirty,
            recentFiles,
          },
        });

        if (aiResult && aiResult.source === "ai") {
          suggestionsRef.current = [aiResult.text];
          setSuggestion(aiResult.text);
          setSuggestionSource("ai");
          setSuggestionIndex(0);
        }
      } finally {
        setIsFetchingSuggestion(false);
        idleTimerRef.current = null;
      }
    }, IDLE_DELAY_MS);
  }, [apiMessages, workingDirectory, gitBranch, gitDirty, recentFiles]);

  // Cleanup idle timer on unmount
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, []);

  // Start idle suggestion timer on mount (for empty input suggestions)
  useEffect(() => {
    if (!isLoading && !isProcessingRef.current) {
      scheduleIdleSuggestion("");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Get spinner frames
  const spinnerFrames = SPINNERS.dots?.[0]?.frames ?? ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

  // Spinner animation
  useEffect(() => {
    if (!isLoading) return;
    const iv = setInterval(() => {
      setSpinnerIndex(i => nextFrame(i, spinnerFrames));
    }, 80);
    return () => clearInterval(iv);
  }, [isLoading, spinnerFrames]);

  // Process message
  const processMessage = useCallback(async (input: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    setMessages(prev => [...prev, {
      id: genId(),
      role: "user",
      content: input,
      timestamp: Date.now(),
    }]);
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
        extendedThinking: extendedThinking
          ? {
              enabled: true,
              effort: effort ?? "medium",
              interleaved: interleaved ?? true,
            }
          : undefined,
        hookManager,
        sessionId,
        onText: (text) => setStreamingText(prev => prev + text),
        onThinking: (thinking) => setStreamingThinking(prev => (prev ?? "") + thinking),
        onToolUse: (tu) => {
          setMessages(prev => [...prev, {
            id: genId(),
            role: "system",
            content: JSON.stringify(tu.input).slice(0, 200),
            toolName: tu.name,
            subType: "tool_call",
            timestamp: Date.now(),
          }]);
        },
        onToolResult: (tr) => {
          const output = typeof tr.result.content === "string"
            ? tr.result.content.slice(0, 200)
            : JSON.stringify(tr.result.content).slice(0, 200);
          setMessages(prev => [...prev, {
            id: genId(),
            role: "system",
            content: output,
            toolName: "result",
            isError: tr.result.is_error,
            subType: "tool_result",
            timestamp: Date.now(),
          }]);
        },
        onMetrics: async (m) => {
          const tokens = m.usage.input_tokens + m.usage.output_tokens;
          if (tokens > 0) setTokenCount(tokens);
          setTotalCost(prev => prev + (m.costUSD ?? 0));
          await sessionStore.saveMetrics(m);
        },
      });

      setApiMessages(result.messages);
      setTokenCount(estimateTokens(JSON.stringify(result.messages)));

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
      setMessages(prev => [...prev, {
        id: genId(),
        role: "system",
        content: `Error: ${errorMessage}`,
        subType: "error",
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
      isProcessingRef.current = false;
      setStreamingText("");
      setStreamingThinking(null);
    }
  }, [apiMessages, apiKey, model, maxTokens, systemPrompt, tools, permissionMode, workingDirectory, hookManager, sessionId, sessionStore]);

  // Handle commands
  const handleCommand = useCallback(async (cmd: string) => {
    const parts = cmd.slice(1).split(" ");
    const command = parts[0]?.toLowerCase();
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
        app.exit(0);
        break;
      case "compact":
        setMessages([]);
        setApiMessages([]);
        break;
      case "cost":
        setMessages(prev => [...prev, {
          id: genId(),
          role: "system",
          content: `Session Cost: ${formatCost(totalCost)}\nTokens: ${tokenCount}`,
          timestamp: now,
        }]);
        break;
      case "status":
        const contextInfo = calculateContextInfo(tokenCount, model);
        setMessages(prev => [...prev, {
          id: genId(),
          role: "system",
          content: `Session: ${sessionId.slice(0, 8)}...\nModel: ${getModelDisplayName(model)}\nContext: ${contextInfo.percentRemaining.toFixed(0)}% remaining\nCost: ${formatCost(totalCost)}`,
          timestamp: now,
        }]);
        break;
      default:
        setMessages(prev => [...prev, { id: genId(), role: "system", content: `Unknown command: /${command}`, timestamp: now }]);
    }
  }, [onExit, app, totalCost, tokenCount, model, sessionId]);

  // Keyboard input
  useInput((input: string, key: Key) => {
    // Clear idle timer on any keystroke
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }

    if (key.ctrl && input === "c") {
      onExit?.();
      app.exit(0);
      return;
    }

    if (isLoading) return;

    if (key.return) {
      const value = inputValue.trim();
      if (!value) return;
      setInputValue("");
      setSuggestion(null);
      setSuggestionIndex(0);
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
        if (historyIdxRef.current === -1) savedInputRef.current = inputValue;
        const newIdx = Math.min(historyIdxRef.current + 1, historyRef.current.length - 1);
        historyIdxRef.current = newIdx;
        setInputValue(historyRef.current[newIdx] ?? "");
      }
      return;
    }

    if (key.downArrow) {
      if (historyIdxRef.current > 0) {
        const newIdx = historyIdxRef.current - 1;
        historyIdxRef.current = newIdx;
        setInputValue(historyRef.current[newIdx] ?? "");
      } else if (historyIdxRef.current === 0) {
        historyIdxRef.current = -1;
        setInputValue(savedInputRef.current);
      }
      return;
    }

    if (key.backspace || key.delete) {
      const newValue = inputValue.slice(0, -1);
      setInputValue(newValue);
      // Update suggestions (debounced, includes AI)
      updateSuggestions(newValue);
      // Schedule idle suggestion for after user stops typing
      scheduleIdleSuggestion(newValue);
      return;
    }

    if (key.leftArrow || key.rightArrow) {
      setSuggestion(null);
      setSuggestionIndex(0);
      return;
    }

    // Tab to accept AI suggestion (append completion part only)
    if (key.tab && suggestion && suggestionSource === "ai") {
      // Only append the part that hasn't been typed yet
      if (suggestion.startsWith(inputValue)) {
        const completion = suggestion.slice(inputValue.length);
        if (completion) {
          setInputValue(suggestion);
        }
      } else {
        // Suggestion doesn't match input, use full suggestion
        setInputValue(suggestion);
      }
      setSuggestion(null);
      setSuggestionSource(null);
      return;
    }

    if (input && !key.ctrl && !key.meta) {
      historyIdxRef.current = -1;
      const newValue = inputValue + input;
      setInputValue(newValue);

      // Update suggestions (debounced, includes AI)
      updateSuggestions(newValue);

      // Schedule idle suggestion for after user stops typing
      scheduleIdleSuggestion(newValue);
    }
  }, { isActive: !isLoading });

  // Context info
  const contextInfo = calculateContextInfo(tokenCount, model);

  return (
    <Box flexDirection="column" height={size.height} width={size.width}>
      {/* Header */}
      <Box justifyContent="space-between" width="100%" paddingX={1}>
        <Box>
          <Text bold color="magenta">Coder v{VERSION}</Text>
          <Text dimColor> | </Text>
          <Text color="cyan">{getModelDisplayName(model)}</Text>
          <Text dimColor> | </Text>
          <Text color="yellow">{permissionMode}</Text>
        </Box>
        <Box>
          <Text dimColor>Session: </Text>
          <Text color="gray">{sessionId}</Text>
        </Box>
      </Box>

      {/* Messages */}
      <Box flexDirection="column" flexGrow={1}>
        {/* Context warning */}
        {contextInfo.isLow && (
          <Box>
            <Warning>
              <Bold>Context: {contextInfo.percentRemaining.toFixed(0)}% remaining</Bold>
            </Warning>
          </Box>
        )}

        {/* Welcome */}
        {messages.length === 0 && !isLoading && !streamingText && (
          <Muted>Type your message or /help for commands.</Muted>
        )}

        {/* Messages */}
        {messages.map(msg => <MessageView key={msg.id} msg={msg} />)}

        {/* Streaming Thinking */}
        {streamingThinking && (
          <Box flexDirection="column">
            <Text dimColor italic>[Thinking]</Text>
            <Muted>{streamingThinking}</Muted>
          </Box>
        )}

        {/* Streaming */}
        {streamingText && (
          <Box>
            <Text bold color="magenta">Claude: </Text>
            <Muted>{streamingText.slice(-500)}</Muted>
          </Box>
        )}

        {/* Loading */}
        {isLoading && !streamingText && (
          <Info>{getFrame(spinnerIndex, spinnerFrames)} Processing...</Info>
        )}
      </Box>

      {/* Input panel */}
      <Panel title="Input" borderStyle="round" borderColor={isLoading ? "gray" : "green"}>
        <Box flexDirection="column" width="100%">
          <Box justifyContent="space-between" width="100%">
            <Box>
              <Text bold color={isLoading ? "gray" : "cyan"}>&gt; </Text>
              {inputValue.length > 0 ? (
                <Text>
                  {inputValue}
                  {/* Show inline completion (suggestion suffix) in grey */}
                  {suggestion && suggestionSource === "ai" && suggestion.startsWith(inputValue) && (
                    <Text dimColor>{suggestion.slice(inputValue.length)}</Text>
                  )}
                  <Text backgroundColor="cyan" color="black"> </Text>
                </Text>
              ) : (
                <Muted>Type your message...</Muted>
              )}
            </Box>
            <Box>
              {inputValue.length > 0 && (
                <Text dimColor>{inputValue.length} chars</Text>
              )}
            </Box>
          </Box>
          {/* Loading indicator for suggestions */}
          {isFetchingSuggestion && inputValue.length >= 2 && !inputValue.startsWith("/") && (
            <Box marginTop={0}>
              <Text dimColor color="yellow">✨ Thinking...</Text>
            </Box>
          )}
        </Box>
      </Panel>

      {/* Status bar */}
      <StatusBar
        left={[
          { content: "Coder", icon: "◉" },
          { content: permissionMode, color: "yellow" },
        ]}
        right={[
          { content: useTokenCount(tokenCount) },
          { content: formatCost(totalCost), color: "green" },
        ]}
        showDivider
      />
    </Box>
  );
}

// ============================================
// WRAPPER WITH APP CONTEXT
// ============================================

function InteractiveTUI(props: InteractiveTUIProps): React.ReactElement {
  return (
    <App>
      <InteractiveTUIContent {...props} />
    </App>
  );
}

// ============================================
// RENDER FUNCTION
// ============================================

// TerminalControl is now imported from core/tui

export function createInteractiveTUI(
  initialProps: InteractiveTUIProps
): InteractiveTUIHandle {
  let currentProps = { ...initialProps };

  TerminalControl.enterAltScreen();

  const { rerender, unmount, waitUntilExit } = render(
    <InteractiveTUI {...currentProps} />,
    { exitOnCtrlC: false }
  );

  return {
    rerender: (newProps) => {
      currentProps = { ...currentProps, ...newProps };
      rerender(<InteractiveTUI {...currentProps} />);
    },
    unmount: () => {
      unmount();
      TerminalControl.exitAltScreen();
    },
    waitUntilExit: () => waitUntilExit(),
  };
}

export default InteractiveTUI;
