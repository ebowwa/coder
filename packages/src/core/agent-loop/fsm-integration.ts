/**
 * FSM Integration - Bridges the FSM with LoopState
 *
 * This module provides a unified interface that:
 * - Uses FSM for phase tracking and transition validation
 * - Uses LoopState for data (messages, metrics, costs)
 * - Emits events for observability
 * - Maintains backward compatibility with existing agentLoop()
 *
 * @module agent-loop/fsm-integration
 */

import type { Message, ToolUseBlock, QueryMetrics, StopReason } from "../../schemas/index.js";
import { LoopState, type LoopStateOptions } from "./loop-state.js";
import {
  createAgentLoopFSM,
  type AgentLoopState,
  type AgentLoopEvent,
  type AgentLoopContext,
  DEFAULT_LOOP_CONTEXT,
  getLoopStats,
  getStopReason as getFSMStopReason,
} from "./loop-fsm.js";
import type { FSM } from "../fsm/index.js";

// ============================================
// TYPES
// ============================================

/**
 * Event emitted during FSM transitions
 */
export interface FSMIntegrationEvent {
  type: "state_change" | "guard_failed" | "action_executed" | "error";
  timestamp: number;
  fromState: AgentLoopState;
  toState: AgentLoopState;
  event: AgentLoopEvent;
  context: Partial<AgentLoopContext>;
  error?: Error;
  guardReason?: string;
}

/**
 * Options for creating FSMIntegratedLoopState
 */
export interface FSMIntegrationOptions extends LoopStateOptions {
  /** Enable FSM event logging */
  enableFSMLogging?: boolean;
  /** Callback for FSM events */
  onFSMEvent?: (event: FSMIntegrationEvent) => void;
  /** Initial FSM state (default: "idle") */
  initialFSMState?: AgentLoopState;
}

/**
 * Result of a turn from the FSM perspective
 */
export interface FSMTurnResult {
  /** Current FSM state */
  fsmState: AgentLoopState;
  /** Whether the FSM is in a final state */
  isComplete: boolean;
  /** Whether the turn should continue */
  shouldContinue: boolean;
  /** Stop reason if any */
  stopReason?: StopReason;
  /** Metrics from the turn */
  metrics?: QueryMetrics;
  /** FSM events that occurred during the turn */
  fsmEvents: FSMIntegrationEvent[];
}

/**
 * Combined state for debugging/inspection
 */
export interface CombinedState {
  /** FSM state */
  fsm: {
    current: AgentLoopState;
    done: boolean;
    context: AgentLoopContext;
  };
  /** LoopState data */
  loop: {
    turnNumber: number;
    totalCost: number;
    messageCount: number;
    toolUseCount: number;
    compactionCount: number;
  };
}

// ============================================
// FSM INTEGRATION CLASS
// ============================================

/**
 * FSMIntegratedLoopState - Wraps FSM and LoopState together
 *
 * This class provides:
 * - Phase tracking via FSM
 * - Data management via LoopState
 * - Event emission for observability
 * - Guard validation before transitions
 */
export class FSMIntegratedLoopState {
  private fsm: FSM<AgentLoopContext>;
  private loopState: LoopState;
  private events: FSMIntegrationEvent[] = [];
  private onFSMEvent?: (event: FSMIntegrationEvent) => void;
  private enableLogging: boolean;

  constructor(options: FSMIntegrationOptions) {
    this.loopState = new LoopState(options);
    this.enableLogging = options.enableFSMLogging ?? false;
    this.onFSMEvent = options.onFSMEvent;

    // Create FSM context from LoopState
    const fsmContext = this.createFSMContext(options);

    // Create FSM instance
    this.fsm = createAgentLoopFSM(fsmContext);
  }

  // ============================================
  // CONTEXT SYNC
  // ============================================

  /**
   * Create FSM context from options and loop state
   */
  private createFSMContext(options: FSMIntegrationOptions): Partial<AgentLoopContext> {
    const loopBehavior = this.loopState.loopBehavior;

    return {
      sessionId: "", // Will be set on START
      goal: "",
      startTime: 0,
      turnNumber: 0,
      maxTurns: loopBehavior.maxTurns,
      totalCost: 0,
      maxCost: loopBehavior.costThresholds.stopAt,
      estimatedTokens: 0,
      contextWindow: loopBehavior.contextWindowTarget,
      errorCount: 0,
      maxErrors: loopBehavior.errorHandling.maxRetries + 1,
      toolsUsed: [],
      pendingTools: [],
      compactionCount: 0,
      tokensCompacted: 0,
      canResume: false,
      isInterrupted: false,
    };
  }

  /**
   * Sync FSM context from LoopState (one-way sync)
   *
   * Note: We only sync data where LoopState is the source of truth.
   * Turn tracking is managed by FSM actions, so we don't sync turnNumber.
   */
  private syncFSMFromLoopState(): void {
    const ctx = this.fsm.context;
    // Sync costs (LoopState tracks actual API costs)
    ctx.totalCost = this.loopState.totalCost;
    // Sync tokens (LoopState tracks actual token usage)
    ctx.estimatedTokens = this.loopState.estimatedContextTokens;
    // Sync compaction stats
    ctx.compactionCount = this.loopState.compactionCount;
    ctx.tokensCompacted = this.loopState.totalTokensCompacted;
    // Sync error count from loop behavior
    // Note: LoopState doesn't track errors directly, FSM does
  }

  /**
   * Get combined state for debugging
   */
  get combinedState(): CombinedState {
    return {
      fsm: {
        current: this.fsm.current as AgentLoopState,
        done: this.fsm.done,
        context: { ...this.fsm.context },
      },
      loop: {
        turnNumber: this.loopState.turnNumber,
        totalCost: this.loopState.totalCost,
        messageCount: this.loopState.messages.length,
        toolUseCount: this.loopState.allToolsUsed.length,
        compactionCount: this.loopState.compactionCount,
      },
    };
  }

  // ============================================
  // FSM EVENT HANDLING
  // ============================================

  /**
   * Send an event to the FSM and record it
   */
  sendEvent(event: AgentLoopEvent): {
    transitioned: boolean;
    fromState: AgentLoopState;
    toState: AgentLoopState;
    guardReason?: string;
  } {
    const fromState = this.fsm.current as AgentLoopState;
    // Cast event to FSMEvent for type compatibility
    const result = this.fsm.send(event as import("../fsm/types.js").FSMEvent);
    const toState = this.fsm.current as AgentLoopState;

    // Extract guard failure reason from guardsChecked
    const failedGuard = result.guardsChecked.find(g => !g.passed);
    const guardReason = failedGuard?.reason || (failedGuard ? `Guard '${failedGuard.guard}' failed` : undefined);

    const integrationEvent: FSMIntegrationEvent = {
      type: result.transitioned ? "state_change" : "guard_failed",
      timestamp: Date.now(),
      fromState,
      toState,
      event,
      context: { ...this.fsm.context },
      guardReason,
    };

    this.events.push(integrationEvent);

    if (this.enableLogging) {
      console.log(
        `[FSM] ${fromState} → ${toState} (${event.type})` +
          (guardReason ? ` [${guardReason}]` : "")
      );
    }

    this.onFSMEvent?.(integrationEvent);

    return {
      transitioned: result.transitioned,
      fromState,
      toState,
      guardReason,
    };
  }

  /**
   * Get all recorded FSM events
   */
  getFSMEvents(): FSMIntegrationEvent[] {
    return [...this.events];
  }

  /**
   * Clear FSM event history
   */
  clearFSMEvents(): void {
    this.events = [];
  }

  // ============================================
  // FSM TRANSITION METHODS
  // ============================================

  /**
   * Start the agent loop
   */
  start(goal?: string): boolean {
    const result = this.sendEvent({
      type: "START",
      payload: { goal },
    });

    if (result.transitioned) {
      // Initialize LoopState session
      this.loopState.sessionStartTime = Date.now();
    }

    return result.transitioned;
  }

  /**
   * Begin streaming response
   */
  beginStreaming(): boolean {
    return this.sendEvent({ type: "STREAM_START" }).transitioned;
  }

  /**
   * End streaming response
   */
  endStreaming(): boolean {
    return this.sendEvent({ type: "STREAM_END" }).transitioned;
  }

  /**
   * Record a turn completion
   */
  completeTurn(payload: {
    turnNumber: number;
    tokensUsed: number;
    cost: number;
    stopReason: string;
  }): { transitioned: boolean; isComplete: boolean } {
    // Sync FSM context before transition
    this.syncFSMFromLoopState();

    const result = this.sendEvent({
      type: "TURN_COMPLETE",
      payload,
    });

    // Check if we're in a final state
    const isComplete = this.fsm.done;

    return {
      transitioned: result.transitioned,
      isComplete,
    };
  }

  /**
   * Request tool execution
   */
  requestTool(toolId: string, toolName: string, input: unknown): boolean {
    return this.sendEvent({
      type: "TOOL_NEEDED",
      payload: { toolId, toolName, input },
    }).transitioned;
  }

  /**
   * Report tool result
   */
  reportToolResult(
    toolId: string,
    result: unknown,
    success: boolean
  ): boolean {
    return this.sendEvent({
      type: "TOOL_RESULT",
      payload: { toolId, result, success },
    }).transitioned;
  }

  /**
   * Request permission for a tool
   */
  requestPermission(toolId: string, toolName: string): boolean {
    return this.sendEvent({
      type: "PERMISSION_REQUEST",
      payload: { toolId, toolName },
    }).transitioned;
  }

  /**
   * Grant permission
   */
  grantPermission(toolId: string): boolean {
    return this.sendEvent({
      type: "PERMISSION_GRANTED",
      payload: { toolId },
    }).transitioned;
  }

  /**
   * Deny permission
   */
  denyPermission(toolId: string, reason?: string): boolean {
    return this.sendEvent({
      type: "PERMISSION_DENIED",
      payload: { toolId, reason },
    }).transitioned;
  }

  /**
   * Begin compaction
   */
  beginCompaction(): boolean {
    return this.sendEvent({ type: "COMPACT_START" }).transitioned;
  }

  /**
   * End compaction
   */
  endCompaction(tokensSaved: number): boolean {
    return this.sendEvent({
      type: "COMPACT_END",
      payload: { tokensSaved },
    }).transitioned;
  }

  /**
   * Pause the loop
   */
  pause(): boolean {
    return this.sendEvent({ type: "PAUSE" }).transitioned;
  }

  /**
   * Resume the loop
   */
  resume(): boolean {
    return this.sendEvent({ type: "RESUME" }).transitioned;
  }

  /**
   * Stop the loop
   */
  stop(reason?: string): boolean {
    const result = this.sendEvent({
      type: "STOP",
      ...(reason ? { payload: { reason } } : {}),
    } as AgentLoopEvent);
    return result.transitioned;
  }

  /**
   * Cancel the loop
   */
  cancel(reason?: string): boolean {
    return this.sendEvent({
      type: "CANCEL",
      ...(reason ? { payload: { reason } } : {}),
    } as AgentLoopEvent).transitioned;
  }

  /**
   * Report an error
   */
  reportError(error: Error, recoverable: boolean): boolean {
    const result = this.sendEvent({
      type: "ERROR",
      payload: { error, recoverable },
    });
    return result.transitioned;
  }

  // ============================================
  // LOOP STATE DELEGATION
  // ============================================

  // Expose LoopState properties and methods

  get messages(): Message[] {
    return this.loopState.messages;
  }

  get metrics(): QueryMetrics[] {
    return this.loopState.metrics;
  }

  get totalCost(): number {
    return this.loopState.totalCost;
  }

  get turnNumber(): number {
    return this.loopState.turnNumber;
  }

  get fsmState(): AgentLoopState {
    return this.fsm.current as AgentLoopState;
  }

  get isComplete(): boolean {
    return this.fsm.done;
  }

  get shouldContinue(): boolean {
    // Check both FSM state and LoopState limits
    if (this.fsm.done) return false;
    return this.loopState.shouldContinue;
  }

  get stopReason(): StopReason | null {
    // Check FSM first
    if (this.fsm.done) {
      const fsmState = this.fsm.current;
      if (fsmState === "completed") return "end_turn";
      if (fsmState === "cancelled") return "stop_sequence";
      if (fsmState === "error") return "stop_sequence";
    }
    return this.loopState.stopReason;
  }

  // Delegate to LoopState methods

  addTurnResult(result: Parameters<LoopState["addTurnResult"]>[0]): QueryMetrics {
    return this.loopState.addTurnResult(result);
  }

  addAssistantMessage(content: unknown[]): void {
    this.loopState.addAssistantMessage(content);
  }

  addUserMessage(
    content: Parameters<LoopState["addUserMessage"]>[0]
  ): void {
    this.loopState.addUserMessage(content);
  }

  trackToolUse(toolUseBlocks: ToolUseBlock[]): void {
    this.loopState.trackToolUse(toolUseBlocks);
  }

  incrementTurn(): number {
    return this.loopState.incrementTurn();
  }

  applyCompaction(
    compactionResult: Parameters<LoopState["applyCompaction"]>[0],
    getStats: Parameters<LoopState["applyCompaction"]>[1]
  ): boolean {
    return this.loopState.applyCompaction(compactionResult, getStats);
  }

  serialize(sessionId: string, options?: Parameters<LoopState["serialize"]>[1]) {
    return this.loopState.serialize(sessionId, options);
  }

  toResult(): import("./types.js").AgentLoopResult {
    return this.loopState.toResult();
  }

  // Expose LoopState getters

  get loopBehavior() {
    return this.loopState.loopBehavior;
  }

  get template() {
    return this.loopState.template;
  }

  get estimatedContextTokens() {
    return this.loopState.estimatedContextTokens;
  }

  get currentUsage() {
    return this.loopState.currentUsage;
  }

  get allToolsUsed() {
    return this.loopState.allToolsUsed;
  }

  get cacheMetrics() {
    return this.loopState.cacheMetrics;
  }

  get previousCost() {
    return this.loopState.previousCost;
  }

  get totalDuration() {
    return this.loopState.totalDuration;
  }

  get sessionStartTime() {
    return this.loopState.sessionStartTime;
  }

  get compactionCount() {
    return this.loopState.compactionCount;
  }

  get totalTokensCompacted() {
    return this.loopState.totalTokensCompacted;
  }

  get retryCount() {
    return this.loopState.retryCount;
  }

  set retryCount(value: number) {
    this.loopState.retryCount = value;
  }

  get consecutiveContinuations() {
    return this.loopState.consecutiveContinuations;
  }

  set consecutiveContinuations(value: number) {
    this.loopState.consecutiveContinuations = value;
  }

  get wasCompacted() {
    return this.loopState.wasCompacted;
  }

  set wasCompacted(value: boolean) {
    this.loopState.wasCompacted = value;
  }

  get recentToolNames() {
    return this.loopState.recentToolNames;
  }

  // Expose computed getters from LoopState
  get isMaxTurnsExceeded() {
    return this.loopState.isMaxTurnsExceeded;
  }

  get shouldWarnTurns() {
    return this.loopState.shouldWarnTurns;
  }

  get isSessionTimeoutExceeded() {
    return this.loopState.isSessionTimeoutExceeded;
  }

  get isCostThresholdExceeded() {
    return this.loopState.isCostThresholdExceeded;
  }

  get shouldWarnCost() {
    return this.loopState.shouldWarnCost;
  }

  get remainingTurns() {
    return this.loopState.remainingTurns;
  }

  get remainingSessionTime() {
    return this.loopState.remainingSessionTime;
  }

  get compactionThresholdTokens() {
    return this.loopState.compactionThresholdTokens;
  }

  get shouldProactiveCompact() {
    return this.loopState.shouldProactiveCompact;
  }

  get latestMetrics() {
    return this.loopState.latestMetrics;
  }

  markCostWarningIssued(): void {
    this.loopState.markCostWarningIssued();
  }

  markTurnWarningIssued(): void {
    this.loopState.markTurnWarningIssued();
  }

  isToolAllowed(toolName: string): boolean {
    return this.loopState.isToolAllowed(toolName);
  }

  getStatusSummary() {
    return this.loopState.getStatusSummary();
  }

  // ============================================
  // SERIALIZATION
  // ============================================

  /**
   * Serialize both FSM and LoopState
   */
  serializeWithFSM(sessionId: string, options?: {
    interrupted?: boolean;
    endedAt?: number;
    endReason?: string;
  }): {
    loopState: ReturnType<LoopState["serialize"]>;
    fsmState: {
      current: AgentLoopState;
      context: AgentLoopContext;
      events: FSMIntegrationEvent[];
    };
  } {
    return {
      loopState: this.loopState.serialize(sessionId, options),
      fsmState: {
        current: this.fsm.current as AgentLoopState,
        context: { ...this.fsm.context },
        events: this.events,
      },
    };
  }

  /**
   * Get statistics summary
   */
  getStats() {
    return {
      loop: this.loopState.getStatusSummary(),
      fsm: getLoopStats(this.fsm.context),
      eventCount: this.events.length,
    };
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

/**
 * Create an integrated loop state with FSM tracking
 */
export function createIntegratedLoopState(
  options: FSMIntegrationOptions
): FSMIntegratedLoopState {
  return new FSMIntegratedLoopState(options);
}

/**
 * Create integrated loop state from existing LoopState (for resumption)
 */
export function createIntegratedLoopStateFromLoopState(
  loopState: LoopState,
  options?: Partial<FSMIntegrationOptions>
): FSMIntegratedLoopState {
  // Extract options from loop state
  const fsmOptions: FSMIntegrationOptions = {
    initialMessages: loopState.messages,
    template: loopState.template ?? undefined,
    loopBehaviorOverrides: loopState.loopBehavior,
    sessionStartTime: loopState.sessionStartTime,
    ...options,
  };

  const integrated = new FSMIntegratedLoopState(fsmOptions);

  // Sync counters
  // Note: We can't directly set these on the new instance, but the FSM context
  // will be synced on the next syncFSMFromLoopState() call

  return integrated;
}
