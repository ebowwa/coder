/**
 * Terminal Input Types
 * Type definitions for native terminal input handling
 */

// ===== Key Event Types =====

/** Native key event from terminal */
export interface NativeKeyEvent {
  /** The key code (character or special key name) */
  code: string;
  /** Whether this is a special key (arrow, function, etc.) */
  is_special: boolean;
  /** Ctrl modifier */
  ctrl: boolean;
  /** Alt/Meta modifier */
  alt: boolean;
  /** Shift modifier */
  shift: boolean;
  /** Event kind: "press", "release", "repeat" */
  kind: "press" | "release" | "repeat";
}

/** Terminal handle for raw mode input */
export interface TerminalHandle {
  /** Enter raw terminal mode */
  enterRawMode(): void;
  /** Exit raw terminal mode */
  exitRawMode(): void;
  /** Check if in raw mode (getter) */
  readonly isRawMode: boolean;
  /** Poll for a key event (non-blocking), returns null if no event */
  pollEvent(timeoutMs?: number): NativeKeyEvent | null;
  /** Read next key event (blocking, async) */
  readEvent(): Promise<NativeKeyEvent>;
}
