/**
 * TUI Types
 * Type definitions for Terminal User Interface primitives
 */

// ===== Color Types =====

/** RGB color components */
export interface TuiRgb {
  r: number;
  g: number;
  b: number;
}

/** Color value - can be a named color, RGB, or indexed */
export type TuiColor =
  | "Reset" | "Black" | "Red" | "Green" | "Yellow" | "Blue"
  | "Magenta" | "Cyan" | "White"
  | "BrightBlack" | "BrightRed" | "BrightGreen" | "BrightYellow"
  | "BrightBlue" | "BrightMagenta" | "BrightCyan" | "BrightWhite"
  | "Rgb" | "Indexed";

/** Text modifiers */
export interface TuiModifiers {
  bold: boolean;
  dim: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  reverse: boolean;
  hidden: boolean;
}

/** Complete style (fg, bg, modifiers) */
export interface TuiStyle {
  fg?: TuiColor;
  bg?: TuiColor;
  modifiers?: TuiModifiers;
  /** RGB values when fg is Rgb */
  fg_rgb?: TuiRgb;
  /** RGB values when bg is Rgb */
  bg_rgb?: TuiRgb;
  /** Index when fg is Indexed */
  fg_index?: number;
  /** Index when bg is Indexed */
  bg_index?: number;
}

// ===== Text Types =====

/** A styled text segment */
export interface TuiTextSegment {
  content: string;
  style?: TuiStyle;
}

/** A line of styled text */
export interface TuiTextLine {
  segments: TuiTextSegment[];
}

/** A block of text */
export interface TuiTextBlock {
  lines: TuiTextLine[];
}

// ===== Layout Types =====

/** Border type */
export type TuiBorderType = "Plain" | "Rounded" | "Double" | "Thick";

/** Which sides to render borders on */
export interface TuiBorders {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}

/** Box padding */
export interface TuiPadding {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

// ===== TUI State types =====

/** Message for display in the native TUI */
export interface TuiMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: number;
  subType?: string;
  toolName?: string;
  isError?: boolean;
}

/** TUI state for rendering */
export interface TuiState {
  messages: TuiMessage[];
  inputValue: string;
  cursorPos: number;
  isLoading: boolean;
  spinnerFrame: number;
  model: string;
  tokensUsed: number;
  permissionMode: string;
  streamingText: string;
  scrollOffset: number;
  contextWarning?: string;
}

/** Result of handling input in native TUI */
export interface InputResult {
  submitted: boolean;
  text?: string;
  exitRequested: boolean;
  command?: string;
  scrollUp: boolean;
  scrollDown: boolean;
  inputValue: string;
  cursorPos: number;
  historyNavigated: boolean;
  historyDirection: number;
}

// ===== Native TUI handle =====

/** Native TUI handle from Rust */
export interface NativeTuiHandle {
  init(): void;
  cleanup(): void;
  render(state: TuiState): void;
  pollInput(state: TuiState, timeoutMs?: number): InputResult;
  addToHistory(input: string): void;
}
