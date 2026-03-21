/**
 * TUI Renderer Bridge
 *
 * Provides a high-level API for terminal UI rendering using Rust primitives.
 * This module wraps the native TUI functions with a more ergonomic interface.
 */

import {
  native,
  loadNative,
  type TuiStyle,
  type TuiColor,
  type TuiRgb,
  type TuiModifiers,
  type TuiTextSegment,
  type TuiTextLine,
  type TuiTextBlock,
  type TuiBorders,
  type TuiPadding,
  type NativeModule,
} from "../../../../../native/index.js";

// Type alias for the TUI-specific subset of NativeModule
export type TuiNativeModule = Pick<NativeModule,
  | 'tui_style_default'
  | 'tui_style_fg'
  | 'tui_style_bg'
  | 'tui_style_rgb_fg'
  | 'tui_style_rgb_bg'
  | 'tui_style_bold'
  | 'tui_style_dim'
  | 'tui_style_user'
  | 'tui_style_assistant'
  | 'tui_style_system'
  | 'tui_style_error'
  | 'tui_style_success'
  | 'tui_style_tool'
  | 'tui_style_highlight'
  | 'tui_style_muted'
  | 'tui_text_segment'
  | 'tui_text_line_plain'
  | 'tui_text_line_styled'
  | 'tui_text_line'
  | 'tui_text_block'
  | 'tui_text_block_plain'
  | 'tui_borders_all'
  | 'tui_borders_none'
  | 'tui_borders_horizontal'
  | 'tui_borders_vertical'
  | 'tui_borders_top'
  | 'tui_borders_bottom'
  | 'tui_padding_uniform'
  | 'tui_padding_horizontal'
  | 'tui_padding_vertical'
  | 'tui_draw_horizontal_line'
  | 'tui_draw_vertical_line'
  | 'tui_draw_box_border'
  | 'tui_draw_box'
  | 'tui_draw_separator'
  | 'tui_draw_double_separator'
  | 'tui_render_line'
  | 'tui_render_block'
  | 'tui_render_message'
  | 'tui_render_status_bar'
  | 'tui_clear_screen'
  | 'tui_hide_cursor'
  | 'tui_show_cursor'
  | 'tui_move_cursor'
  | 'tui_enter_alt_screen'
  | 'tui_exit_alt_screen'
  | 'tui_reset_style'
  | 'tui_styled_text'
>;

/**
 * Get the TUI-native module with proper typing
 */
export function getTuiNative(): TuiNativeModule {
  return loadNative() as TuiNativeModule;
}

// Re-export types
export type {
  TuiStyle,
  TuiColor,
  TuiRgb,
  TuiModifiers,
  TuiTextSegment,
  TuiTextLine,
  TuiTextBlock,
  TuiBorders,
  TuiPadding,
};

// ===== Color Constants =====

export const Colors = {
  // Basic colors
  Black: "Black" as TuiColor,
  Red: "Red" as TuiColor,
  Green: "Green" as TuiColor,
  Yellow: "Yellow" as TuiColor,
  Blue: "Blue" as TuiColor,
  Magenta: "Magenta" as TuiColor,
  Cyan: "Cyan" as TuiColor,
  White: "White" as TuiColor,

  // Bright colors
  BrightBlack: "BrightBlack" as TuiColor,
  BrightRed: "BrightRed" as TuiColor,
  BrightGreen: "BrightGreen" as TuiColor,
  BrightYellow: "BrightYellow" as TuiColor,
  BrightBlue: "BrightBlue" as TuiColor,
  BrightMagenta: "BrightMagenta" as TuiColor,
  BrightCyan: "BrightCyan" as TuiColor,
  BrightWhite: "BrightWhite" as TuiColor,

  // Special
  Reset: "Reset" as TuiColor,
};

// ===== Style Builder =====

const defaultModifiers: TuiModifiers = {
  bold: false,
  dim: false,
  italic: false,
  underline: false,
  strikethrough: false,
  reverse: false,
  hidden: false,
};

export class StyleBuilder {
  private style: TuiStyle = {};

  fg(color: TuiColor): this {
    this.style.fg = color;
    return this;
  }

  bg(color: TuiColor): this {
    this.style.bg = color;
    return this;
  }

  rgbFg(r: number, g: number, b: number): this {
    this.style.fg = "Rgb";
    this.style.fg_rgb = { r, g, b };
    return this;
  }

  rgbBg(r: number, g: number, b: number): this {
    this.style.bg = "Rgb";
    this.style.bg_rgb = { r, g, b };
    return this;
  }

  bold(value = true): this {
    this.style.modifiers = { ...defaultModifiers, ...this.style.modifiers, bold: value };
    return this;
  }

  dim(value = true): this {
    this.style.modifiers = { ...defaultModifiers, ...this.style.modifiers, dim: value };
    return this;
  }

  italic(value = true): this {
    this.style.modifiers = { ...defaultModifiers, ...this.style.modifiers, italic: value };
    return this;
  }

  underline(value = true): this {
    this.style.modifiers = { ...defaultModifiers, ...this.style.modifiers, underline: value };
    return this;
  }

  build(): TuiStyle {
    return this.style;
  }
}

// ===== Predefined Styles =====

export const Styles = {
  default: (): TuiStyle => native.tui_style_default(),
  fg: (color: TuiColor): TuiStyle => native.tui_style_fg(color),
  bg: (color: TuiColor): TuiStyle => native.tui_style_bg(color),
  rgbFg: (r: number, g: number, b: number): TuiStyle => native.tui_style_rgb_fg(r, g, b),
  rgbBg: (r: number, g: number, b: number): TuiStyle => native.tui_style_rgb_bg(r, g, b),
  bold: (): TuiStyle => native.tui_style_bold(),
  dim: (): TuiStyle => native.tui_style_dim(),

  // Semantic styles
  user: (): TuiStyle => native.tui_style_user(),
  assistant: (): TuiStyle => native.tui_style_assistant(),
  system: (): TuiStyle => native.tui_style_system(),
  error: (): TuiStyle => native.tui_style_error(),
  success: (): TuiStyle => native.tui_style_success(),
  tool: (): TuiStyle => native.tui_style_tool(),
  highlight: (): TuiStyle => native.tui_style_highlight(),
  muted: (): TuiStyle => native.tui_style_muted(),
};

// ===== Text Building =====

export const Text = {
  segment: (content: string, style?: TuiStyle): TuiTextSegment =>
    native.tui_text_segment(content, style),

  linePlain: (content: string): TuiTextLine =>
    native.tui_text_line_plain(content),

  lineStyled: (content: string, style: TuiStyle): TuiTextLine =>
    native.tui_text_line_styled(content, style),

  line: (segments: TuiTextSegment[]): TuiTextLine =>
    native.tui_text_line(segments),

  block: (lines: TuiTextLine[]): TuiTextBlock =>
    native.tui_text_block(lines),

  blockPlain: (content: string): TuiTextBlock =>
    native.tui_text_block_plain(content),
};

// ===== Box/Border Building =====

export const Borders = {
  all: (): TuiBorders => native.tui_borders_all(),
  none: (): TuiBorders => native.tui_borders_none(),
  horizontal: (): TuiBorders => native.tui_borders_horizontal(),
  vertical: (): TuiBorders => native.tui_borders_vertical(),
  top: (): TuiBorders => native.tui_borders_top(),
  bottom: (): TuiBorders => native.tui_borders_bottom(),
};

export const Padding = {
  uniform: (value: number): TuiPadding => native.tui_padding_uniform(value),
  horizontal: (value: number): TuiPadding => native.tui_padding_horizontal(value),
  vertical: (value: number): TuiPadding => native.tui_padding_vertical(value),
};

// ===== Drawing Functions =====

export const Draw = {
  horizontalLine: (width: number, style?: TuiStyle): string =>
    native.tui_draw_horizontal_line(width, style),

  verticalLine: (height: number, style?: TuiStyle): string =>
    native.tui_draw_vertical_line(height, style),

  boxBorder: (width: number, height: number, title?: string, style?: TuiStyle): string =>
    native.tui_draw_box_border(width, height, title, style),

  box: (width: number, height: number, title: string | null, content: string, style?: TuiStyle): string =>
    native.tui_draw_box(width, height, title, content, style),

  separator: (width: number, style?: TuiStyle): string =>
    native.tui_draw_separator(width, style),

  doubleSeparator: (width: number, style?: TuiStyle): string =>
    native.tui_draw_double_separator(width, style),
};

// ===== Render Functions =====

export const Render = {
  line: (line: TuiTextLine, width?: number): string =>
    native.tui_render_line(line, width),

  block: (block: TuiTextBlock, width?: number): string =>
    native.tui_render_block(block, width),

  message: (prefix: string, content: string, prefixStyle?: TuiStyle, width?: number): string =>
    native.tui_render_message(prefix, content, prefixStyle, width),

  statusBar: (left: string, right: string, style?: TuiStyle, width?: number): string =>
    native.tui_render_status_bar(left, right, style, width),
};

// ===== Terminal Control =====

export const Terminal = {
  clearScreen: (): string => native.tui_clear_screen?.() ?? "\x1b[2J",
  hideCursor: (): string => native.tui_hide_cursor?.() ?? "\x1b[?25l",
  showCursor: (): string => native.tui_show_cursor?.() ?? "\x1b[?25h",
  moveCursor: (row: number, col: number): string => native.tui_move_cursor?.(row, col) ?? `\x1b[${row};${col}H`,
  enterAltScreen: (): string => native.tui_enter_alt_screen?.() ?? "\x1b[?1049h",
  exitAltScreen: (): string => native.tui_exit_alt_screen?.() ?? "\x1b[?1049l",
  resetStyle: (): string => native.tui_reset_style?.() ?? "\x1b[0m",
  styledText: (content: string, style: TuiStyle): string => native.tui_styled_text?.(content, style) ?? content,

  // Additional helpers for native TUI
  clearLine: (): string => "\x1b[2K",
  clearLineRight: (): string => "\x1b[0K",
  clearLineLeft: (): string => "\x1b[1K",
  scrollUp: (n = 1): string => `\x1b[${n}S`,
  scrollDown: (n = 1): string => `\x1b[${n}T`,
  saveCursor: (): string => "\x1b[s",
  restoreCursor: (): string => "\x1b[u",
  setBackgroundColor: (color: string): string => `\x1b[4${color}m`,
  setForegroundColor: (color: string): string => `\x1b[3${color}m`,
};

// ===== High-Level Components =====

export interface MessageOptions {
  role: "user" | "assistant" | "system" | "tool" | "error";
  content: string;
  width?: number;
}

/**
 * Render a chat message with appropriate styling
 */
export function renderMessage(options: MessageOptions): string {
  const { role, content, width = 80 } = options;

  const roleStyles: Record<string, { prefix: string; style: TuiStyle }> = {
    user: { prefix: "You: ", style: Styles.user() },
    assistant: { prefix: "Assistant: ", style: Styles.assistant() },
    system: { prefix: "System: ", style: Styles.system() },
    tool: { prefix: "Tool: ", style: Styles.tool() },
    error: { prefix: "Error: ", style: Styles.error() },
  };

  const { prefix, style } = roleStyles[role] ?? { prefix: "", style: Styles.default() };
  return Render.message(prefix, content, style, width);
}

/**
 * Render a status bar with left and right content
 */
export function renderStatusBar(left: string, right: string, width = 80): string {
  return Render.statusBar(left, right, Styles.dim(), width);
}

/**
 * Render a separator line
 */
export function renderSeparator(width = 80, double = false): string {
  return double ? Draw.doubleSeparator(width, Styles.dim()) : Draw.separator(width, Styles.dim());
}

/**
 * Create a text line with multiple styled segments
 */
export function styledLine(...parts: Array<{ text: string; style?: TuiStyle }>): TuiTextLine {
  const segments = parts.map(({ text, style }) => Text.segment(text, style));
  return Text.line(segments);
}

// ===== Full Screen TUI Manager =====

export class TuiScreen {
  private width: number;
  private height: number;
  private buffer: string[] = [];

  constructor(width = process.stdout.columns ?? 80, height = process.stdout.rows ?? 24) {
    this.width = width;
    this.height = height;
  }

  enter(): void {
    process.stdout.write(Terminal.enterAltScreen());
    process.stdout.write(Terminal.hideCursor());
    process.stdout.write(Terminal.clearScreen());
  }

  exit(): void {
    process.stdout.write(Terminal.showCursor());
    process.stdout.write(Terminal.exitAltScreen());
  }

  clear(): void {
    this.buffer = [];
    process.stdout.write(Terminal.clearScreen());
  }

  moveCursor(row: number, col: number): void {
    process.stdout.write(Terminal.moveCursor(row, col));
  }

  write(text: string): void {
    this.buffer.push(text);
    process.stdout.write(text);
  }

  writeLine(text: string): void {
    this.write(text + "\n");
  }

  renderBlock(block: TuiTextBlock, row: number, col: number = 1): void {
    this.moveCursor(row, col);
    process.stdout.write(Render.block(block, this.width));
  }

  renderStatusBar(left: string, right: string, row?: number): void {
    const r = row ?? this.height;
    this.moveCursor(r, 1);
    process.stdout.write(renderStatusBar(left, right, this.width));
  }
}

// Default export
export default {
  Colors,
  Styles,
  StyleBuilder,
  Text,
  Borders,
  Padding,
  Draw,
  Render,
  Terminal,
  renderMessage,
  renderStatusBar,
  renderSeparator,
  styledLine,
  TuiScreen,
};
