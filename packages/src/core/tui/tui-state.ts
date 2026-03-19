/**
 * TUI State Management
 *
 * Encapsulates mutable TUI state following the LoopState pattern.
 * Provides serialization for persistence and callbacks for UI updates.
 */

import type { Message as ApiMessage, ClaudeModel } from "../../schemas/index.js";
import type { UIMessage } from "../../schemas/ui.zod.js";
import type {
  TUIStateSnapshot,
  TUIStateData,
  TUIStateCallbacks,
} from "./types.js";
import { estimateMessagesTokens } from "./token-utils.js";

// ============================================
// DEFAULT VALUES
// ============================================

const DEFAULT_MODEL: ClaudeModel = "claude-sonnet-4-6";

// ============================================
// TUI STATE CLASS
// ============================================

/**
 * TUIState manages the mutable state of a terminal UI session.
 *
 * Similar to LoopState in the agent loop, this class:
 * - Encapsulates all mutable state
 * - Provides getters/setters for state access
 * - Supports serialization for persistence
 * - Uses callbacks for UI updates
 */
export class TUIState {
  // Message state
  private messages: UIMessage[] = [];
  private apiMessages: ApiMessage[] = [];

  // Cost/token tracking
  private tokenCount = 0;
  private totalCost = 0;

  // Model configuration
  private model: ClaudeModel;

  // Callbacks for UI updates
  private callbacks: TUIStateCallbacks;

  // Timestamp for session tracking
  private sessionStartTime: number;

  constructor(
    callbacks: TUIStateCallbacks,
    initialModel: ClaudeModel = DEFAULT_MODEL
  ) {
    this.callbacks = callbacks;
    this.model = initialModel;
    this.sessionStartTime = Date.now();
  }

  // ============================================
  // GETTERS
  // ============================================

  /**
   * Get all UI messages (immutable copy)
   */
  getMessages(): readonly UIMessage[] {
    return [...this.messages];
  }

  /**
   * Get all API messages (immutable copy)
   */
  getApiMessages(): readonly ApiMessage[] {
    return [...this.apiMessages];
  }

  /**
   * Get current token count
   */
  getTokenCount(): number {
    return this.tokenCount;
  }

  /**
   * Get total session cost
   */
  getTotalCost(): number {
    return this.totalCost;
  }

  /**
   * Get current model
   */
  getModel(): ClaudeModel {
    return this.model;
  }

  /**
   * Get session start time
   */
  getSessionStartTime(): number {
    return this.sessionStartTime;
  }

  /**
   * Get message count
   */
  getMessageCount(): number {
    return this.messages.length;
  }

  /**
   * Get API message count
   */
  getApiMessageCount(): number {
    return this.apiMessages.length;
  }

  // ============================================
  // MUTATIONS
  // ============================================

  /**
   * Add a new UI message
   */
  addMessage(msg: UIMessage): void {
    this.messages.push(msg);
    this.callbacks.onMessage(msg);
  }

  /**
   * Add an API message for context tracking
   */
  addApiMessage(msg: ApiMessage): void {
    this.apiMessages.push(msg);
    this.recalculateTokens();
  }

  /**
   * Clear all messages
   */
  clearMessages(): void {
    this.messages = [];
    this.apiMessages = [];
    this.tokenCount = 0;
    this.callbacks.onClear();
  }

  /**
   * Update token count manually
   */
  updateTokenCount(count: number): void {
    this.tokenCount = count;
    this.callbacks.onCostUpdate(this.totalCost, this.tokenCount);
  }

  /**
   * Add cost from API usage
   */
  addCost(cost: number): void {
    this.totalCost += cost;
    this.callbacks.onCostUpdate(this.totalCost, this.tokenCount);
  }

  /**
   * Set the current model
   */
  setModel(model: ClaudeModel): void {
    this.model = model;
    this.callbacks.onModelChange(model);
  }

  /**
   * Replace all messages (for restoration)
   */
  setMessages(messages: UIMessage[], apiMessages: ApiMessage[]): void {
    this.messages = [...messages];
    this.apiMessages = [...apiMessages];
    this.recalculateTokens();
  }

  // ============================================
  // INTERNAL HELPERS
  // ============================================

  /**
   * Recalculate token count from API messages
   */
  private recalculateTokens(): void {
    this.tokenCount = estimateMessagesTokens(this.apiMessages);
    this.callbacks.onCostUpdate(this.totalCost, this.tokenCount);
  }

  // ============================================
  // SERIALIZATION
  // ============================================

  /**
   * Create a serializable snapshot of current state
   */
  serialize(): TUIStateSnapshot {
    return {
      messages: [...this.messages],
      apiMessages: [...this.apiMessages],
      tokenCount: this.tokenCount,
      totalCost: this.totalCost,
      model: this.model,
      timestamp: Date.now(),
    };
  }

  /**
   * Restore state from a snapshot
   */
  static deserialize(data: TUIStateSnapshot, callbacks: TUIStateCallbacks): TUIState {
    const state = new TUIState(callbacks, data.model);
    state.messages = [...data.messages];
    state.apiMessages = [...data.apiMessages];
    state.tokenCount = data.tokenCount;
    state.totalCost = data.totalCost;
    state.sessionStartTime = data.timestamp;
    return state;
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Get a status summary for display
   */
  getStatusSummary(): {
    model: ClaudeModel;
    messageCount: number;
    apiMessageCount: number;
    tokenCount: number;
    totalCost: number;
    sessionDuration: number;
  } {
    return {
      model: this.model,
      messageCount: this.messages.length,
      apiMessageCount: this.apiMessages.length,
      tokenCount: this.tokenCount,
      totalCost: this.totalCost,
      sessionDuration: Date.now() - this.sessionStartTime,
    };
  }
}
