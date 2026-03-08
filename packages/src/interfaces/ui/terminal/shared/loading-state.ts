/**
 * Loading State Manager for Coder CLI
 * Tracks global loading state across the application
 */

import { EventEmitter } from "events";

// ============================================
// TYPES
// ============================================

export type LoadingPhase =
  | "idle"
  | "initializing"
  | "loading-config"
  | "connecting-mcp"
  | "api-request"
  | "streaming"
  | "tool-execution"
  | "processing"
  | "checkpointing";

export interface LoadingStateData {
  isLoading: boolean;
  phase: LoadingPhase;
  message: string;
  startTime: number;
  activeTools: Set<string>;
  activeToolCount: number;
  hasActiveTools: boolean;
  responseLength: number;
  paused: boolean;
  pausedTime: number;
}

export interface LoadingStateEvents {
  "state-change": (state: LoadingStateData) => void;
  "tool-start": (toolName: string) => void;
  "tool-end": (toolName: string) => void;
  "phase-change": (phase: LoadingPhase, previousPhase: LoadingPhase) => void;
  "progress": (message: string) => void;
}

// ============================================
// LOADING STATE CLASS
// ============================================

export class LoadingState extends EventEmitter {
  private state: LoadingStateData;
  private static instance: LoadingState | null = null;

  private constructor() {
    super();
    this.state = {
      isLoading: false,
      phase: "idle",
      message: "",
      startTime: 0,
      activeTools: new Set(),
      activeToolCount: 0,
      hasActiveTools: false,
      responseLength: 0,
      paused: false,
      pausedTime: 0,
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(): LoadingState {
    if (!LoadingState.instance) {
      LoadingState.instance = new LoadingState();
    }
    return LoadingState.instance;
  }

  /**
   * Reset singleton (for testing)
   */
  static reset(): void {
    if (LoadingState.instance) {
      LoadingState.instance.removeAllListeners();
      LoadingState.instance = null;
    }
  }

  /**
   * Start loading
   */
  start(phase: LoadingPhase = "processing", message = ""): void {
    const previousPhase = this.state.phase;

    this.state.isLoading = true;
    this.state.phase = phase;
    this.state.message = message;
    this.state.startTime = Date.now();

    this.emit("state-change", this.getState());
    if (previousPhase !== phase) {
      this.emit("phase-change", phase, previousPhase);
    }
  }

  /**
   * Stop loading
   */
  stop(): void {
    const previousPhase = this.state.phase;

    this.state.isLoading = false;
    this.state.phase = "idle";
    this.state.message = "";
    this.state.activeTools.clear();
    this.state.activeToolCount = 0;
    this.state.responseLength = 0;

    this.emit("state-change", this.getState());
    this.emit("phase-change", "idle", previousPhase);
  }

  /**
   * Update phase
   */
  setPhase(phase: LoadingPhase): void {
    const previousPhase = this.state.phase;
    this.state.phase = phase;
    this.emit("phase-change", phase, previousPhase);
    this.emit("state-change", this.getState());
  }

  /**
   * Update message
   */
  setMessage(message: string): void {
    this.state.message = message;
    this.emit("state-change", this.getState());
  }

  /**
   * Update both phase and message
   */
  update(phase: LoadingPhase, message: string): void {
    const previousPhase = this.state.phase;
    this.state.phase = phase;
    this.state.message = message;
    this.emit("phase-change", phase, previousPhase);
    this.emit("state-change", this.getState());
  }

  /**
   * Report progress
   */
  progress(message: string): void {
    this.state.message = message;
    this.emit("progress", message);
    this.emit("state-change", this.getState());
  }

  /**
   * Mark tool as started
   */
  toolStart(toolName: string): void {
    this.state.activeTools.add(toolName);
    this.state.activeToolCount = this.state.activeTools.size;
    this.state.hasActiveTools = true;
    this.emit("tool-start", toolName);
    this.emit("state-change", this.getState());
  }

  /**
   * Mark tool as completed
   */
  toolEnd(toolName: string): void {
    this.state.activeTools.delete(toolName);
    this.state.activeToolCount = this.state.activeTools.size;
    if (this.state.activeTools.size === 0) {
      this.state.hasActiveTools = false;
    }
    this.emit("tool-end", toolName);
    this.emit("state-change", this.getState());
  }

  /**
   * Update response length (for streaming)
   */
  setResponseLength(length: number): void {
    this.state.responseLength = length;
    this.emit("state-change", this.getState());
  }

  /**
   * Pause loading state
   */
  pause(): void {
    if (!this.state.paused) {
      this.state.paused = true;
      this.state.pausedTime = Date.now();
      this.emit("state-change", this.getState());
    }
  }

  /**
   * Resume loading state
   */
  resume(): void {
    if (this.state.paused) {
      this.state.paused = false;
      this.state.pausedTime = 0;
      this.emit("state-change", this.getState());
    }
  }

  /**
   * Get current state (copy)
   */
  getState(): LoadingStateData {
    return {
      ...this.state,
      activeTools: new Set(this.state.activeTools),
    };
  }

  /**
   * Check if loading
   */
  isLoading(): boolean {
    return this.state.isLoading;
  }

  /**
   * Get current phase
   */
  getPhase(): LoadingPhase {
    return this.state.phase;
  }

  /**
   * Get elapsed time in ms
   */
  getElapsedMs(): number {
    if (this.state.startTime === 0) {
      return 0;
    }
    return Date.now() - this.state.startTime;
  }

  /**
   * Get active tool names
   */
  getActiveTools(): string[] {
    return Array.from(this.state.activeTools);
  }

  /**
   * Check if specific tool is active
   */
  isToolActive(toolName: string): boolean {
    return this.state.activeTools.has(toolName);
  }

  /**
   * Get formatted state for display
   */
  getFormattedState(): string {
    if (!this.state.isLoading) {
      return "Ready";
    }

    const parts: string[] = [];

    if (this.state.message) {
      parts.push(this.state.message);
    }

    if (this.state.activeToolCount > 0) {
      parts.push(`(${this.state.activeToolCount} tool${this.state.activeToolCount > 1 ? "s" : ""} active)`);
    }

    const elapsed = Math.floor(this.getElapsedMs() / 1000);
    if (elapsed > 0) {
      parts.push(`[${elapsed}s]`);
    }

    return parts.join(" ") || this.state.phase;
  }
}

// ============================================
// CONVENIENCE EXPORTS
// ============================================

/**
 * Get the global loading state instance
 */
export function getLoadingState(): LoadingState {
  return LoadingState.getInstance();
}

/**
 * Quick access to loading state methods
 * These call getInstance() each time to handle reset() properly
 */
export const setLoading = (phase: LoadingPhase, message?: string) => {
  LoadingState.getInstance().start(phase, message);
};

export const stopLoading = () => {
  LoadingState.getInstance().stop();
};

export const updateLoading = (message: string) => {
  LoadingState.getInstance().progress(message);
};

export const startTool = (toolName: string) => {
  LoadingState.getInstance().toolStart(toolName);
};

export const endTool = (toolName: string) => {
  LoadingState.getInstance().toolEnd(toolName);
};
