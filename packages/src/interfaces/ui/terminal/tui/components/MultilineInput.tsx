/** @jsx React.createElement */
/**
 * Multiline Input Component
 * Enhanced text input with:
 * - Multi-line support (Ctrl+Enter for newline)
 * - Command autocomplete
 * - Input history navigation
 * - Syntax highlighting for input
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Box, Text, useStdout } from "ink";

// ============================================
// TYPES
// ============================================

export interface AutocompleteSuggestion {
  id: string;
  label: string;
  description?: string;
  category?: string;
}

export interface MultilineInputProps {
  /** Current input value */
  value: string;
  /** Cursor position (0 = start) */
  cursorPos: number;
  /** Current line for multiline (0-based) */
  currentLine?: number;
  /** Placeholder text */
  placeholder?: string;
  /** Whether input is active */
  isActive?: boolean;
  /** Whether to show autocomplete */
  showAutocomplete?: boolean;
  /** Autocomplete suggestions */
  autocompleteSuggestions?: AutocompleteSuggestion[];
  /** Selected autocomplete index */
  autocompleteIndex?: number;
  /** Input history for navigation */
  inputHistory?: string[];
  /** History index (-1 = none) */
  historyIndex?: number;
  /** Called when input changes */
  onChange?: (value: string, cursorPos: number, currentLine: number) => void;
  /** Called when submit (Enter on single line, Ctrl+Enter on multiline) */
  onSubmit?: (value: string) => void;
  /** Called when requesting autocomplete */
  onRequestAutocomplete?: (prefix: string) => AutocompleteSuggestion[];
  /** Max lines before scrolling */
  maxLines?: number;
  /** Show line numbers */
  showLineNumbers?: boolean;
  /** Width override */
  width?: number;
}

export interface MultilineInputState {
  value: string;
  cursorPos: number;
  currentLine: number;
  historyIndex: number;
  savedInput: string;
  showAutocomplete: boolean;
  autocompleteSuggestions: AutocompleteSuggestion[];
  autocompleteIndex: number;
}

export interface UseMultilineInputOptions {
  isActive?: boolean;
  onSubmit?: (value: string) => void;
  onRequestAutocomplete?: (prefix: string) => AutocompleteSuggestion[];
  inputHistory?: string[];
  initialHistory?: string[];
}

// ============================================
// COMMAND AUTOCOMPLETE DEFINITIONS
// ============================================

const COMMAND_SUGGESTIONS: AutocompleteSuggestion[] = [
  // Session commands
  { id: "/help", label: "/help", description: "Show help", category: "session" },
  { id: "/exit", label: "/exit", description: "Exit session", category: "session" },
  { id: "/new", label: "/new", description: "Start new session", category: "session" },
  { id: "/clear", label: "/clear", description: "Clear conversation", category: "session" },
  { id: "/status", label: "/status", description: "Show session status", category: "session" },
  { id: "/cost", label: "/cost", description: "Show total cost", category: "session" },

  // Model commands
  { id: "/model", label: "/model", description: "Switch model", category: "model" },
  { id: "/models", label: "/models", description: "List available models", category: "model" },
  { id: "/tools", label: "/tools", description: "List available tools", category: "model" },

  // Context commands
  { id: "/compact", label: "/compact", description: "Force context compaction", category: "context" },
  { id: "/export", label: "/export", description: "Export session", category: "context" },
  { id: "/checkpoint", label: "/checkpoint", description: "Save checkpoint", category: "context" },
  { id: "/checkpoints", label: "/checkpoints", description: "List checkpoints", category: "context" },
  { id: "/restore", label: "/restore", description: "Restore checkpoint", category: "context" },
  { id: "/undo", label: "/undo", description: "Undo last action", category: "context" },
  { id: "/redo", label: "/redo", description: "Redo action", category: "context" },

  // Session management
  { id: "/resume", label: "/resume", description: "Resume session", category: "sessions" },
  { id: "/sessions", label: "/sessions", description: "List sessions", category: "sessions" },
];

/**
 * Filter autocomplete suggestions based on prefix
 */
export function filterSuggestions(prefix: string): AutocompleteSuggestion[] {
  if (!prefix || !prefix.startsWith("/")) {
    return [];
  }

  const query = prefix.toLowerCase();
  return COMMAND_SUGGESTIONS.filter((cmd) => {
    return (
      cmd.id.toLowerCase().startsWith(query) ||
      cmd.label.toLowerCase().includes(query) ||
      (cmd.description?.toLowerCase().includes(query) ?? false)
    );
  }).slice(0, 5);
}

/**
 * Syntax highlight code block
 * Returns highlighted segments for display
 */
export function highlightSyntax(
  text: string
): Array<{ text: string; color: string }> {
  const segments: Array<{ text: string; color: string }> = [];

  // Code block detection (``` ... ```)
  const codeBlockRegex = /```[\s\S]*?```/g;

  // Keywords
  const keywords =
    /\b(const|let|var|function|return|if|else|for|while|class|interface|type|import|export|from|async|await)\b/g;

  // Strings
  const strings = /(["'`])(?:(?!\1)[\s\S])*?\1/g;

  // Numbers
  const numbers = /\b(\d+\.?\d*)\b/g;

  // Comments
  const comments = /(\/\/.*$|\/\*[\s\S]*?\*\/|#.*$)/gm;

  // Check for code blocks first
  if (codeBlockRegex.test(text)) {
    segments.push({ text, color: "green" });
    return segments;
  }

  // Otherwise return as-is
  segments.push({ text, color: "white" });
  return segments;
}

// ============================================
// MULTILINE INPUT COMPONENT
// ============================================

export function MultilineInput({
  value,
  cursorPos,
  currentLine = 0,
  placeholder = "Type your message... (/help for commands)",
  isActive = true,
  showAutocomplete = false,
  autocompleteSuggestions = [],
  autocompleteIndex = 0,
  inputHistory = [],
  historyIndex = -1,
  onChange,
  onSubmit,
  maxLines = 5,
  showLineNumbers = false,
  width: propWidth,
}: MultilineInputProps) {
  const { stdout } = useStdout();
  const width = propWidth ?? stdout.columns ?? 80;

  // Split value into lines
  const lines = value.split("\n");
  const displayLines = lines.slice(-maxLines);

  // Calculate cursor display position
  const cursorLineIndex = Math.min(currentLine, displayLines.length - 1);
  const currentLineText = displayLines[cursorLineIndex] ?? "";
  const cursorColInLine = cursorPos;

  // Build line display
  const renderLines = displayLines.map((line, i) => {
    const lineNum = showLineNumbers
      ? `${String(lines.length - displayLines.length + i + 1).padStart(3, " ")} `
      : "";
    const isCurrentLine = i === cursorLineIndex;

    if (isCurrentLine) {
      const beforeCursor = line.slice(0, cursorColInLine);
      const cursorChar = line[cursorColInLine] ?? " ";
      const afterCursor = line.slice(cursorColInLine + 1);

      return (
        <Box key={i}>
          <Text dimColor>{lineNum}</Text>
          <Text>{beforeCursor}</Text>
          <Text backgroundColor="cyan" color="black">
            {cursorChar}
          </Text>
          <Text>{afterCursor}</Text>
        </Box>
      );
    }

    return (
      <Box key={i}>
        <Text dimColor>{lineNum}</Text>
        <Text dimColor={line.length === 0}>{line || " "}</Text>
      </Box>
    );
  });

  // Render autocomplete dropdown
  const renderAutocomplete = () => {
    if (!showAutocomplete || autocompleteSuggestions.length === 0) {
      return null;
    }

    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="yellow"
        paddingX={1}
        marginTop={1}
      >
        <Text dimColor>Suggestions (Tab to select):</Text>
        {autocompleteSuggestions.map((suggestion, i) => (
          <Box key={suggestion.id}>
            <Text
              color={i === autocompleteIndex ? "yellow" : "white"}
              bold={i === autocompleteIndex}
            >
              {suggestion.label}
            </Text>
            {suggestion.description && (
              <Text dimColor> - {suggestion.description}</Text>
            )}
          </Box>
        ))}
      </Box>
    );
  };

  // Line indicator
  const lineIndicator =
    lines.length > 1 ? (
      <Text dimColor> [Line {currentLine + 1}/{lines.length}]</Text>
    ) : null;

  return (
    <Box
      flexDirection="column"
      width="100%"
      borderStyle="round"
      borderColor={isActive ? "cyan" : "gray"}
      paddingX={1}
    >
      {/* Input prompt */}
      <Box>
        <Text bold color="cyan">
          You:
        </Text>
        {lineIndicator}
      </Box>

      {/* Multiline content */}
      <Box flexDirection="column">
        {lines.length === 0 || (lines.length === 1 && lines[0] === "") ? (
          <Text dimColor>{placeholder}</Text>
        ) : (
          renderLines
        )}
      </Box>

      {/* Autocomplete dropdown */}
      {renderAutocomplete()}

      {/* Footer hints */}
      <Box marginTop={1}>
        <Text dimColor>
          Ctrl+Enter: newline | up/down: history | Tab: autocomplete
        </Text>
      </Box>
    </Box>
  );
}

// ============================================
// INPUT HANDLER HOOK
// ============================================

export function useMultilineInputHandler({
  isActive = true,
  onSubmit,
  onRequestAutocomplete,
  inputHistory = [],
}: UseMultilineInputOptions) {
  const [state, setState] = useState<MultilineInputState>({
    value: "",
    cursorPos: 0,
    currentLine: 0,
    historyIndex: -1,
    savedInput: "",
    showAutocomplete: false,
    autocompleteSuggestions: [],
    autocompleteIndex: 0,
  });

  const handleKeyEvent = useCallback(
    (event: { code: string; ctrl?: boolean; shift?: boolean }) => {
      if (!isActive) return "unhandled";

      const { code, ctrl, shift } = event;

      // Update helper
      const update = (updates: Partial<MultilineInputState>) => {
        setState((prev) => ({ ...prev, ...updates }));
      };

      // Get current state
      const { value, cursorPos, currentLine, historyIndex, showAutocomplete } =
        state;

      // Split into lines for calculations
      const lines = value.split("\n");

      // Autocomplete navigation
      if (showAutocomplete) {
        if (code === "tab" || code === "down") {
          const suggestions = state.autocompleteSuggestions;
          const newIndex =
            (state.autocompleteIndex + 1) % suggestions.length;
          update({ autocompleteIndex: newIndex });
          return "handled";
        }

        if (code === "up") {
          const suggestions = state.autocompleteSuggestions;
          const newIndex =
            (state.autocompleteIndex - 1 + suggestions.length) %
            suggestions.length;
          update({ autocompleteIndex: newIndex });
          return "handled";
        }

        if (code === "enter" || code === "return") {
          const suggestion =
            state.autocompleteSuggestions[state.autocompleteIndex];
          if (suggestion) {
            // Replace current word with suggestion
            const words = value.split(" ");
            words[words.length - 1] = suggestion.id;
            const newValue = words.join(" ");
            update({
              value: newValue,
              cursorPos: newValue.length,
              showAutocomplete: false,
              autocompleteSuggestions: [],
            });
          }
          return "handled";
        }

        if (code === "escape") {
          update({ showAutocomplete: false, autocompleteSuggestions: [] });
          return "handled";
        }
      }

      // Submit (Enter without Ctrl = submit if single line, with Ctrl = always submit)
      if (code === "enter" || code === "return") {
        if (ctrl) {
          // Ctrl+Enter = submit even in multiline
          if (value.trim() && onSubmit) {
            onSubmit(value);
            update({
              value: "",
              cursorPos: 0,
              currentLine: 0,
              historyIndex: -1,
              savedInput: "",
            });
          }
          return "handled";
        }

        // Regular Enter
        if (lines.length === 1) {
          // Single line mode - submit
          if (value.trim() && onSubmit) {
            onSubmit(value);
            update({
              value: "",
              cursorPos: 0,
              currentLine: 0,
              historyIndex: -1,
              savedInput: "",
            });
          }
        } else {
          // Multiline mode - insert newline
          const newValue =
            value.slice(0, cursorPos) + "\n" + value.slice(cursorPos);
          const newCursorPos = cursorPos + 1;
          update({
            value: newValue,
            cursorPos: newCursorPos,
            currentLine: currentLine + 1,
          });
        }
        return "handled";
      }

      // Backspace
      if (code === "backspace") {
        if (cursorPos > 0) {
          const newValue =
            value.slice(0, cursorPos - 1) + value.slice(cursorPos);
          const newCursorPos = cursorPos - 1;
          const newCurrentLine =
            newValue.slice(0, newCursorPos).split("\n").length - 1;
          update({
            value: newValue,
            cursorPos: newCursorPos,
            currentLine: newCurrentLine,
          });

          // Check for autocomplete
          if (newValue.startsWith("/") && onRequestAutocomplete) {
            const suggestions = onRequestAutocomplete(newValue);
            update({
              showAutocomplete: suggestions.length > 0,
              autocompleteSuggestions: suggestions,
              autocompleteIndex: 0,
            });
          }
        }
        return "handled";
      }

      // Delete
      if (code === "delete") {
        if (cursorPos < value.length) {
          const newValue =
            value.slice(0, cursorPos) + value.slice(cursorPos + 1);
          update({ value: newValue });
        }
        return "handled";
      }

      // Arrow keys
      if (code === "left") {
        update({ cursorPos: Math.max(0, cursorPos - 1) });
        return "handled";
      }

      if (code === "right") {
        update({ cursorPos: Math.min(value.length, cursorPos + 1) });
        return "handled";
      }

      if (code === "up") {
        // History navigation
        if (inputHistory.length > 0) {
          const newIndex =
            historyIndex === -1 ? 0 : Math.min(historyIndex + 1, inputHistory.length - 1);
          const historyValue = inputHistory[newIndex] ?? "";
          update({
            historyIndex: newIndex,
            value: historyValue,
            cursorPos: historyValue.length,
            currentLine: historyValue.split("\n").length - 1,
          });
        }
        return "handled";
      }

      if (code === "down") {
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          const historyValue = inputHistory[newIndex] ?? "";
          update({
            historyIndex: newIndex,
            value: historyValue,
            cursorPos: historyValue.length,
            currentLine: historyValue.split("\n").length - 1,
          });
        } else if (historyIndex === 0) {
          // Restore saved input
          update({
            historyIndex: -1,
            value: state.savedInput,
            cursorPos: state.savedInput.length,
            currentLine: state.savedInput.split("\n").length - 1,
          });
        }
        return "handled";
      }

      // Home/End
      if (code === "home" || (code === "a" && ctrl)) {
        // Go to start of current line
        const lineStart =
          value.slice(0, cursorPos).lastIndexOf("\n") + 1;
        update({ cursorPos: lineStart });
        return "handled";
      }

      if (code === "end" || (code === "e" && ctrl)) {
        // Go to end of current line
        const lineEnd = value.indexOf("\n", cursorPos);
        update({ cursorPos: lineEnd === -1 ? value.length : lineEnd });
        return "handled";
      }

      // Ctrl+U - clear line
      if (code === "u" && ctrl) {
        const lineStart =
          value.slice(0, cursorPos).lastIndexOf("\n") + 1;
        const lineEnd = value.indexOf("\n", cursorPos);
        const newValue =
          value.slice(0, lineStart) +
          (lineEnd === -1 ? "" : value.slice(lineEnd + 1));
        update({
          value: newValue,
          cursorPos: lineStart,
        });
        return "handled";
      }

      // Ctrl+W - delete word
      if (code === "w" && ctrl) {
        const beforeCursor = value
          .slice(0, cursorPos)
          .replace(/\s+\S*$/, "");
        const newValue = beforeCursor + value.slice(cursorPos);
        update({
          value: newValue,
          cursorPos: beforeCursor.length,
        });
        return "handled";
      }

      // Regular printable character
      if (code.length === 1 && !ctrl) {
        const newValue =
          value.slice(0, cursorPos) + code + value.slice(cursorPos);
        const newCursorPos = cursorPos + 1;

        update({
          value: newValue,
          cursorPos: newCursorPos,
          historyIndex: -1, // Reset history navigation on typing
        });

        // Check for autocomplete trigger
        if (newValue.startsWith("/") && onRequestAutocomplete) {
          const suggestions = onRequestAutocomplete(newValue);
          update({
            showAutocomplete: suggestions.length > 0,
            autocompleteSuggestions: suggestions,
            autocompleteIndex: 0,
          });
        } else {
          update({ showAutocomplete: false });
        }

        return "handled";
      }

      return "unhandled";
    },
    [isActive, onSubmit, onRequestAutocomplete, inputHistory, state]
  );

  return {
    state,
    handleKeyEvent,
    // Convenience helpers
    setValue: (value: string) =>
      setState((prev) => ({ ...prev, value })),
    reset: () =>
      setState({
        value: "",
        cursorPos: 0,
        currentLine: 0,
        historyIndex: -1,
        savedInput: "",
        showAutocomplete: false,
        autocompleteSuggestions: [],
        autocompleteIndex: 0,
      }),
  };
}

export default MultilineInput;
