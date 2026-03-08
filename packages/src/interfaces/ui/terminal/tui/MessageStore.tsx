/** @jsx React.createElement */
/**
 * Message Store - Centralized message state management
 *
 * Single source of truth for all messages in the TUI.
 * Replaces the fragmented message handling with a clean, * append-only store with efficient updates.
 */

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import type { Message as ApiMessage } from "../../../../types/index.js";

// ============================================
// TYPES
// ============================================

export type MessageSubType =
  | "tool_call"
  | "tool_result"
  | "hook"
  | "info"
  | "error"
  | "thinking";

export interface UIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  subType?: MessageSubType;
  toolName?: string;
  isError?: boolean;
}

export interface MessageStoreValue {
  /** UI messages for display */
  messages: UIMessage[];
  /** API messages for context */
  apiMessages: ApiMessage[];
  /** Add a UI message */
  addMessage: (msg: Omit<UIMessage, "id" | "timestamp">) => string;
  /** Add multiple messages from API response */
  addApiMessages: (msgs: ApiMessage[]) => void;
  /** Add system message (convenience) */
  addSystem: (content: string, subType?: MessageSubType, toolName?: string, isError?: boolean) => string;
  /** Clear all messages */
  clear: () => void;
  /** Replace messages (for undo/redo) */
  replace: (ui: UIMessage[], api: ApiMessage[]) => void;
  /** Total token count */
  tokenCount: number;
  /** Update token count */
  setTokenCount: (count: number) => void;
}

// ============================================
// CONTEXT
// ============================================

const MessageStoreContext = createContext<MessageStoreValue | null>(null);

export function useMessageStore(): MessageStoreValue {
  const ctx = useContext(MessageStoreContext);
  if (!ctx) {
    throw new Error("useMessageStore must be used within MessageStoreProvider");
  }
  return ctx;
}

// ============================================
// PROVIDER
// ============================================

export interface MessageStoreProviderProps {
  children: React.ReactNode;
  initialMessages?: ApiMessage[];
}

let globalMessageId = 0;

function generateId(): string {
  globalMessageId += 1;
  return `msg-${globalMessageId}-${Date.now()}`;
}

/**
 * Extract text content from API message content blocks
 */
function extractTextContent(content: ApiMessage["content"]): string {
  if (typeof content === "string") {
    return content;
  }

  return content.map((block) => {
    switch (block.type) {
      case "text":
        return block.text;
      case "tool_use":
        return `[Tool: ${block.name}]\n${JSON.stringify(block.input, null, 2)}`;
      case "tool_result": {
        const resultContent = typeof block.content === "string"
          ? block.content
          : extractTextContent(block.content);
        const prefix = block.is_error ? "[Tool Error]" : "[Tool Result]";
        const truncated = resultContent.length > 500
          ? resultContent.slice(0, 500) + "..."
          : resultContent;
        return `${prefix}\n${truncated}`;
      }
      case "thinking":
        return `[Thinking]\n${block.thinking}`;
      case "redacted_thinking":
        return "[Redacted Thinking]";
      case "image":
        return "[Image]";
      default:
        return "";
    }
  }).join("\n\n");
}

/**
 * Convert API message to UI message
 */
function apiToUi(msg: ApiMessage): UIMessage | null {
  const content = extractTextContent(msg.content);
  if (!content) return null;

  return {
    id: generateId(),
    role: msg.role,
    content,
    timestamp: Date.now(),
  };
}

export function MessageStoreProvider({
  children,
  initialMessages = [],
}: MessageStoreProviderProps) {
  const [messages, setMessages] = useState<UIMessage[]>(() => {
    // Convert initial API messages to UI messages
    return initialMessages
      .map(apiToUi)
      .filter((m): m is UIMessage => m !== null);
  });

  const [apiMessages, setApiMessages] = useState<ApiMessage[]>(initialMessages);
  const [tokenCount, setTokenCount] = useState(0);

  // Track pending user messages that were added manually (to skip in addApiMessages)
  const pendingUserMessagesRef = useRef<Set<string>>(new Set());

  const addMessage = useCallback((msg: Omit<UIMessage, "id" | "timestamp">): string => {
    const id = generateId();
    const fullMsg: UIMessage = {
      ...msg,
      id,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, fullMsg]);

    // Track user messages that were added manually
    if (msg.role === "user") {
      pendingUserMessagesRef.current.add(msg.content);
    }

    return id;
  }, []);

  const addApiMessages = useCallback((newApiMsgs: ApiMessage[]) => {
    if (newApiMsgs.length === 0) return;

    // Update API messages
    setApiMessages((prev) => [...prev, ...newApiMsgs]);

    // Convert API messages to UI messages, skipping user messages that were already added manually
    const newUiMsgs = newApiMsgs
      .map(apiToUi)
      .filter((m): m is UIMessage => m !== null)
      .filter((m) => {
        // Skip user messages that were already added manually
        if (m.role === "user" && pendingUserMessagesRef.current.has(m.content)) {
          pendingUserMessagesRef.current.delete(m.content); // Clean up
          return false;
        }
        return true;
      });

    if (newUiMsgs.length > 0) {
      setMessages((prev) => [...prev, ...newUiMsgs]);
    }
  }, []);

  const addSystem = useCallback((
    content: string,
    subType?: MessageSubType,
    toolName?: string,
    isError?: boolean
  ): string => {
    return addMessage({
      role: "system",
      content,
      subType,
      toolName,
      isError,
    });
  }, [addMessage]);

  const clear = useCallback(() => {
    setMessages([]);
    setApiMessages([]);
    pendingUserMessagesRef.current.clear();
  }, []);

  const replace = useCallback((ui: UIMessage[], api: ApiMessage[]) => {
    setMessages(ui);
    setApiMessages(api);
    pendingUserMessagesRef.current.clear();
  }, []);

  const value: MessageStoreValue = {
    messages,
    apiMessages,
    addMessage,
    addApiMessages,
    addSystem,
    clear,
    replace,
    tokenCount,
    setTokenCount,
  };

  return (
    <MessageStoreContext.Provider value={value}>
      {children}
    </MessageStoreContext.Provider>
  );
}

export default MessageStoreContext;
