/**
 * TUI App Component for Coder CLI
 * Full Ink-based TUI with message area, status bar, and input field
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { render, Box, Text, useInput, useApp, useStdout } from "ink";
import type { Key } from "ink";
import chalk from "chalk";
import type { PermissionMode } from "../../../../types/index.js";
import {
  calculateContextInfo,
  getPermissionModeDisplay,
} from "../shared/status-line.js";
import { spinnerFrames } from "./spinner.js";

// ============================================
// TYPES
// ============================================

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface TUIAppProps {
  permissionMode: PermissionMode;
  tokensUsed: number;
  model: string;
  messages: Message[];
  isLoading?: boolean;
  onSubmit: (value: string) => Promise<void>;
  onExit?: () => void;
}

// ============================================
// MESSAGE AREA COMPONENT
// ============================================

interface MessageAreaProps {
  messages: Message[];
  isLoading?: boolean;
  height: number;
}

function MessageArea({ messages, isLoading, height }: MessageAreaProps) {
  const visibleMessages = messages.slice(-height + 2); // Reserve 2 lines for padding

  return (
    <Box flexDirection="column" height={height} overflow="hidden">
      {visibleMessages.map((msg) => (
        <Box key={msg.id} flexDirection="column" marginBottom={1}>
          <Text bold color={msg.role === "user" ? "cyan" : "magenta"}>
            {msg.role === "user" ? "You:" : "Claude:"}
          </Text>
          <Text dimColor={msg.role === "system"}>{msg.content}</Text>
        </Box>
      ))}
      {isLoading && (
        <Box>
          <Text dimColor>Thinking...</Text>
        </Box>
      )}
    </Box>
  );
}

// ============================================
// STATUS BAR COMPONENT
// ============================================

interface StatusBarProps {
  permissionMode: PermissionMode;
  tokensUsed: number;
  model: string;
  isLoading?: boolean;
}

function StatusBar({
  permissionMode,
  tokensUsed,
  model,
  isLoading,
}: StatusBarProps) {
  const [frame, setFrame] = useState(0);
  const contextInfo = calculateContextInfo(tokensUsed, model);
  const permDisplay = getPermissionModeDisplay(permissionMode);

  // Spinner animation
  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % spinnerFrames.length);
    }, 80);

    return () => clearInterval(interval);
  }, [isLoading]);

  // Build status line
  const parts: string[] = [];

  // Loading spinner
  if (isLoading) {
    parts.push(chalk.cyan(spinnerFrames[frame]));
  }

  // Context percentage
  const contextValue = contextInfo.isCritical
    ? chalk.red(`${contextInfo.percentRemaining.toFixed(0)}%`)
    : contextInfo.isLow
      ? chalk.yellow(`${contextInfo.percentRemaining.toFixed(0)}%`)
      : `${contextInfo.percentRemaining.toFixed(0)}%`;
  parts.push(`Context: ${contextValue}`);

  // Permission mode
  const permColor = permDisplay.color as "red" | "green" | "yellow" | "blue" | "magenta" | "cyan" | "white" | "gray";
  const colorFn = chalk[permColor]?.bind(chalk) ?? chalk.gray;
  parts.push(`${colorFn(permDisplay.symbol)} ${permDisplay.label}`);

  const statusText = parts.join(" | ");

  return (
    <Box width="100%" paddingX={1}>
      <Text dimColor>{statusText}</Text>
    </Box>
  );
}

// ============================================
// INPUT FIELD COMPONENT
// ============================================

interface InputFieldProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  isActive?: boolean;
}

function InputField({
  value,
  onChange,
  onSubmit,
  placeholder = "Type your message... (/help for commands)",
  isActive = true,
}: InputFieldProps) {
  const [cursorPos, setCursorPos] = useState(0);

  useInput(
    (input, key) => {
      if (!isActive) return;

      if (key.return) {
        if (value.trim()) {
          onSubmit(value);
        }
        return;
      }

      if (key.backspace || key.delete) {
        if (cursorPos > 0) {
          onChange(value.slice(0, cursorPos - 1) + value.slice(cursorPos));
          setCursorPos(cursorPos - 1);
        }
        return;
      }

      if (key.leftArrow) {
        setCursorPos(Math.max(0, cursorPos - 1));
        return;
      }

      if (key.rightArrow) {
        setCursorPos(Math.min(value.length, cursorPos + 1));
        return;
      }

      if (key.upArrow || key.downArrow) {
        // Ignore up/down for now (could be used for history)
        return;
      }

      // Regular character input
      if (input && !key.ctrl && !key.meta) {
        onChange(value.slice(0, cursorPos) + input + value.slice(cursorPos));
        setCursorPos(cursorPos + input.length);
      }
    },
    { isActive }
  );

  // Display value with cursor
  const displayValue = value.length > 0 ? value : chalk.dim(placeholder);
  const cursorChar = value.length > 0 ? "▋" : chalk.dim("▋");

  // Calculate where cursor should appear
  const beforeCursor = value.slice(0, cursorPos);
  const afterCursor = value.slice(cursorPos);

  return (
    <Box borderStyle="round" borderColor="cyan" paddingX={1} width="100%">
      <Text bold color="cyan">
        You:{" "}
      </Text>
      {value.length > 0 ? (
        <Text>
          {beforeCursor}
          {cursorChar}
          {afterCursor}
        </Text>
      ) : (
        <Text dimColor>{placeholder}</Text>
      )}
    </Box>
  );
}

// ============================================
// MAIN TUI APP COMPONENT
// ============================================

function TUIApp({
  permissionMode,
  tokensUsed,
  model,
  messages,
  isLoading = false,
  onSubmit,
  onExit,
}: TUIAppProps) {
  const [inputValue, setInputValue] = useState("");
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Calculate heights
  const terminalHeight = stdout.rows || 24;
  const inputHeight = 3; // Input field with border
  const statusHeight = 1; // Status bar
  const messageHeight = Math.max(5, terminalHeight - inputHeight - statusHeight - 2);

  // Handle global keybindings
  useInput(
    (input, key) => {
      // Ctrl+C to exit
      if (key.ctrl && input === "c") {
        if (onExit) onExit();
        exit();
      }
    },
    { isActive: true }
  );

  // Handle submit
  const handleSubmit = useCallback(
    async (value: string) => {
      if (!value.trim()) return;

      // Clear input
      setInputValue("");

      // Call onSubmit
      await onSubmit(value);
    },
    [onSubmit]
  );

  return (
    <Box flexDirection="column" height={terminalHeight} width="100%">
      {/* Message area (scrollable) */}
      <Box flexGrow={1} flexDirection="column" overflow="hidden">
        <MessageArea
          messages={messages}
          isLoading={isLoading}
          height={messageHeight}
        />
      </Box>

      {/* Status bar */}
      <StatusBar
        permissionMode={permissionMode}
        tokensUsed={tokensUsed}
        model={model}
        isLoading={isLoading}
      />

      {/* Input field */}
      <InputField
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSubmit}
        isActive={!isLoading}
      />
    </Box>
  );
}

// ============================================
// RENDER FUNCTION
// ============================================

export interface TUIAppHandle {
  rerender: (props: Partial<TUIAppProps>) => void;
  unmount: () => void;
  waitUntilExit: () => Promise<void>;
  addMessage: (message: Omit<Message, "id" | "timestamp">) => void;
  setMessages: (messages: Message[]) => void;
  setLoading: (isLoading: boolean) => void;
  setTokensUsed: (tokens: number) => void;
}

/**
 * Create and render the TUI app
 */
export function createTUIApp(
  initialProps: Omit<TUIAppProps, "messages"> & { messages?: Message[] }
): TUIAppHandle {
  let currentProps: TUIAppProps = {
    ...initialProps,
    messages: initialProps.messages || [],
  };

  let rerenderFn: ((node: React.ReactNode) => void) | null = null;
  let unmountFn: (() => void) | null = null;
  let waitUntilExitFn: (() => Promise<void>) | null = null;

  // Create the app
  const { rerender, unmount, waitUntilExit } = render(
    <TUIApp {...currentProps} />,
    {
      exitOnCtrlC: false,
    }
  );

  rerenderFn = rerender;
  unmountFn = unmount;
  waitUntilExitFn = waitUntilExit;

  return {
    rerender: (newProps) => {
      currentProps = { ...currentProps, ...newProps };
      rerenderFn?.(<TUIApp {...currentProps} />);
    },

    unmount: () => {
      unmountFn?.();
    },

    waitUntilExit: () => {
      return waitUntilExitFn?.() || Promise.resolve();
    },

    addMessage: (message) => {
      const newMessage: Message = {
        ...message,
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: Date.now(),
      };
      currentProps = {
        ...currentProps,
        messages: [...currentProps.messages, newMessage],
      };
      rerenderFn?.(<TUIApp {...currentProps} />);
    },

    setMessages: (messages) => {
      currentProps = { ...currentProps, messages };
      rerenderFn?.(<TUIApp {...currentProps} />);
    },

    setLoading: (isLoading) => {
      currentProps = { ...currentProps, isLoading };
      rerenderFn?.(<TUIApp {...currentProps} />);
    },

    setTokensUsed: (tokensUsed) => {
      currentProps = { ...currentProps, tokensUsed };
      rerenderFn?.(<TUIApp {...currentProps} />);
    },
  };
}

// ============================================
// EXPORTS
// ============================================

export default TUIApp;
