/**
 * Message Store - Non-React Implementation
 *
 * Centralized message state management extracted from v1 TUI patterns.
 * This is a pure TypeScript class without React dependency.
 *
 * Features:
 * - Single source of truth for messages
 * - Separate UI and API message tracking
 * - Token count management
 * - Change notification system
 */

import type { Message as ApiMessage } from "../../../../../types/index.js";
import type { MessageStore, UIMessage, MessageSubType } from "./types.js";

// ============================================
// UTILITIES
// ============================================

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

/**
 * Estimate token count from text (rough: ~4 chars per token)
 */
function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Estimate total tokens from messages
 */
function estimateMessagesTokens(messages: ApiMessage[]): number {
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

// ============================================
// MESSAGE STORE CLASS
// ============================================

/**
 * Non-React message store implementation
 *
 * Usage:
 * ```ts
 * const store = new MessageStoreImpl();
 * store.addMessage({ role: "user", content: "Hello" });
 * console.log(store.messages);
 * ```
 */
export class MessageStoreImpl implements MessageStore {
  private _messages: UIMessage[] = [];
  private _apiMessages: ApiMessage[] = [];
  private _tokenCount = 0;
  private _listeners: Set<() => void> = new Set();
  private _pendingUserMessages: Set<string> = new Set();

  /** UI messages for display */
  get messages(): UIMessage[] {
    return [...this._messages];
  }

  /** API messages for context */
  get apiMessages(): ApiMessage[] {
    return [...this._apiMessages];
  }

  /** Current token count */
  get tokenCount(): number {
    return this._tokenCount;
  }

  /** Update token count */
  setTokenCount(count: number): void {
    this._tokenCount = count;
    this._notify();
  }

  /**
   * Add a UI message
   * Returns the message ID
   */
  addMessage(msg: Omit<UIMessage, "id" | "timestamp">): string {
    const id = generateId();
    const fullMsg: UIMessage = {
      ...msg,
      id,
      timestamp: Date.now(),
    };
    this._messages = [...this._messages, fullMsg];

    // Track user messages added manually (to skip in addApiMessages)
    if (msg.role === "user") {
      this._pendingUserMessages.add(msg.content);
    }

    this._notify();
    return id;
  }

  /**
   * Add multiple messages from API response
   */
  addApiMessages(msgs: ApiMessage[]): void {
    if (msgs.length === 0) return;

    // Update API messages
    this._apiMessages = [...this._apiMessages, ...msgs];

    // Convert to UI messages, skipping user messages already added manually
    const newUiMsgs = msgs
      .map(apiToUi)
      .filter((m): m is UIMessage => m !== null)
      .filter((m) => {
        if (m.role === "user" && this._pendingUserMessages.has(m.content)) {
          this._pendingUserMessages.delete(m.content);
          return false;
        }
        return true;
      });

    if (newUiMsgs.length > 0) {
      this._messages = [...this._messages, ...newUiMsgs];
    }

    // Update token estimate
    this._tokenCount = estimateMessagesTokens(this._apiMessages);

    this._notify();
  }

  /**
   * Add system message (convenience method)
   */
  addSystem(
    content: string,
    subType?: MessageSubType,
    toolName?: string,
    isError?: boolean
  ): string {
    return this.addMessage({
      role: "system",
      content,
      subType,
      toolName,
      isError,
    });
  }

  /**
   * Clear all messages
   */
  clear(): void {
    this._messages = [];
    this._apiMessages = [];
    this._pendingUserMessages.clear();
    this._tokenCount = 0;
    this._notify();
  }

  /**
   * Replace all messages (for undo/redo)
   */
  replace(ui: UIMessage[], api: ApiMessage[]): void {
    this._messages = [...ui];
    this._apiMessages = [...api];
    this._pendingUserMessages.clear();
    this._tokenCount = estimateMessagesTokens(this._apiMessages);
    this._notify();
  }

  /**
   * Subscribe to store changes
   * Returns unsubscribe function
   */
  subscribe(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of a change
   */
  private _notify(): void {
    for (const listener of this._listeners) {
      try {
        listener();
      } catch (err) {
        console.error("MessageStore listener error:", err);
      }
    }
  }
}

// ============================================
// SINGLETON (optional convenience)
// ============================================

let globalStore: MessageStoreImpl | null = null;

/**
 * Get or create the global message store
 */
export function getMessageStore(): MessageStoreImpl {
  if (!globalStore) {
    globalStore = new MessageStoreImpl();
  }
  return globalStore;
}

/**
 * Reset the global message store (for testing)
 */
export function resetMessageStore(): void {
  globalStore = null;
}

// ============================================
// EXPORTS
// ============================================

export type { MessageStore, UIMessage, MessageSubType } from "./types.js";
