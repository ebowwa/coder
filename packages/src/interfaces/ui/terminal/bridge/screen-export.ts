/**
 * Screen Export API for TUI Bridge
 * Provides screen capture, ANSI parsing, and export utilities
 *
 * @module screen-export
 */

import type {
  ScreenCell,
  ScreenBuffer,
  ParsedScreen,
  UIElement,
  UIElementType,
} from "./types.js";

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Safely get a cell from the screen buffer
 */
function getCell(buffer: ScreenBuffer, x: number, y: number): ScreenCell {
 const row = buffer.cells[y];
  if (!row) return { char: " ", fg: undefined, bg: undefined, bold: false, italic: false, underline: false, dim: false, inverse: false };
  const cell = row[x];
  if (!cell) return { char: " ", fg: undefined, bg: undefined, bold: false, italic: false, underline: false, dim: false, inverse: false };
  return cell;
}

/**
 * Check if a cell exists at a buffer at position
 */
function hasCell(buffer: ScreenBuffer, x: number, y: number): boolean {
  return buffer.cells[y]?.[x] !== undefined;
}

// ============================================
// ANSI PARSING CONSTANTS
// ============================================

/** ANSI escape sequence patterns */
const ANSI_PATTERNS = {
  /** Full ANSI escape sequence */
  escape: /\x1b\[[^@-~]*[@-~]/g,
  /** SGR (Select Graphic Rendition) sequence */
  sgr: /\x1b\[([0-9;]*)m/g,
  /** Cursor position sequence */
  cursor: /\x1b\[(\d+);(\d+)([Hf])/g,
  /** Erase sequence */
  erase: /\x1b\[(\??[0-9;]*)([JK])/g,
  /** 256 color foreground */
  color256Fg: /\x1b\[38;5;(\d+)m/g,
  /** 256 color background */
  color256Bg: /\x1b\[48;5;(\d+)m/g,
  /** True color foreground */
  colorTrueFg: /\x1b\[38;2;(\d+);(\d+);(\d+)m/g,
  /** True color background */
  colorTrueBg: /\x1b\[48;2;(\d+);(\d+);(\d+)m/g,
};

/** SGR attribute codes */
const SGR_CODES = {
  RESET: 0,
  BOLD: 1,
  DIM: 2,
  ITALIC: 3,
  UNDERLINE: 4,
  INVERSE: 7,
  BOLD_OFF: 22,
  DIM_OFF: 22,
  ITALIC_OFF: 23,
  UNDERLINE_OFF: 24,
  INVERSE_OFF: 27,
  FG_BLACK: 30,
  FG_RED: 31,
  FG_GREEN: 32,
  FG_YELLOW: 33,
  FG_BLUE: 34,
  FG_MAGENTA: 35,
  FG_CYAN: 36,
  FG_WHITE: 37,
  FG_DEFAULT: 39,
  BG_BLACK: 40,
  BG_RED: 41,
  BG_GREEN: 42,
  BG_YELLOW: 43,
  BG_BLUE: 44,
  BG_MAGENTA: 45,
  BG_CYAN: 46,
  BG_WHITE: 47,
  BG_DEFAULT: 49,
};

/** Standard ANSI color names to hex mapping */
const ANSI_COLORS: Record<number, string> = {
  30: "#000000", // Black
  31: "#cd0000", // Red
  32: "#00cd00", // Green
  33: "#cdcd00", // Yellow
  34: "#0000ee", // Blue
  35: "#cd00cd", // Magenta
  36: "#00cdcd", // Cyan
  37: "#e5e5e5", // White
  90: "#7f7f7f", // Bright Black (Gray)
  91: "#ff0000", // Bright Red
  92: "#00ff00", // Bright Green
  93: "#ffff00", // Bright Yellow
  94: "#5c5cff", // Bright Blue
  95: "#ff00ff", // Bright Magenta
  96: "#00ffff", // Bright Cyan
  97: "#ffffff", // Bright White
};

// ============================================
// DEFAULT CELL
// ============================================

/** Default empty cell state */
export const DEFAULT_CELL: ScreenCell = {
  char: " ",
  fg: undefined,
  bg: undefined,
  bold: false,
  italic: false,
  underline: false,
  dim: false,
  inverse: false,
};

// ============================================
// ANSI PARSER
// ============================================

/**
 * Parse result for a single character with attributes
 */
interface ParsedChar {
  char: string;
  attrs: ScreenCell;
}

/**
 * ANSI Parser state
 */
interface ParserState {
  attrs: ScreenCell;
  pos: number;
}

/**
 * Parse ANSI color code to hex string
 */
function parseColorCode(code: number, is256: boolean, r?: number, g?: number, b?: number): string | undefined {
  if (is256) {
    // 256 color palette
    if (code < 16) {
      // Standard colors
      return ANSI_COLORS[30 + code] ?? ANSI_COLORS[90 + code - 8];
    } else if (code < 232) {
      // 216 color cube
      const n = code - 16;
      const r = Math.floor(n / 36) * 51;
      const g = Math.floor((n % 36) / 6) * 51;
      const b = (n % 6) * 51;
      return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    } else {
      // Grayscale
      const gray = (code - 232) * 10 + 8;
      return `#${gray.toString(16).padStart(2, "0")}${gray.toString(16).padStart(2, "0")}${gray.toString(16).padStart(2, "0")}`;
    }
  } else if (r !== undefined && g !== undefined && b !== undefined) {
    // True color
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }
  return undefined;
}

/**
 * Parse SGR sequence and update attributes
 */
function parseSGR(params: string, state: ParserState): void {
  if (params === "" || params === "0") {
    // Reset
    state.attrs = { ...DEFAULT_CELL };
    return;
  }

  const codes = params.split(";").map((s) => parseInt(s, 10) || 0);
  let i = 0;

  while (i < codes.length) {
    const code = codes[i];

    switch (code) {
      case SGR_CODES.RESET:
        state.attrs = { ...DEFAULT_CELL };
        break;
      case SGR_CODES.BOLD:
        state.attrs.bold = true;
        break;
      case SGR_CODES.DIM:
        state.attrs.dim = true;
        break;
      case SGR_CODES.ITALIC:
        state.attrs.italic = true;
        break;
      case SGR_CODES.UNDERLINE:
        state.attrs.underline = true;
        break;
      case SGR_CODES.INVERSE:
        state.attrs.inverse = true;
        break;
      case SGR_CODES.BOLD_OFF:
      case SGR_CODES.DIM_OFF:
        state.attrs.bold = false;
        state.attrs.dim = false;
        break;
      case SGR_CODES.ITALIC_OFF:
        state.attrs.italic = false;
        break;
      case SGR_CODES.UNDERLINE_OFF:
        state.attrs.underline = false;
        break;
      case SGR_CODES.INVERSE_OFF:
        state.attrs.inverse = false;
        break;
      // Standard foreground colors
      case 30:
      case 31:
      case 32:
      case 33:
      case 34:
      case 35:
      case 36:
      case 37:
        state.attrs.fg = ANSI_COLORS[code];
        break;
      case 90:
      case 91:
      case 92:
      case 93:
      case 94:
      case 95:
      case 96:
      case 97:
        state.attrs.fg = ANSI_COLORS[code];
        break;
      case SGR_CODES.FG_DEFAULT:
        state.attrs.fg = undefined;
        break;
      // Standard background colors
      case 40:
      case 41:
      case 42:
      case 43:
      case 44:
      case 45:
      case 46:
      case 47:
        state.attrs.bg = ANSI_COLORS[code - 10];
        break;
      case 100:
      case 101:
      case 102:
      case 103:
      case 104:
      case 105:
      case 106:
      case 107:
        state.attrs.bg = ANSI_COLORS[code];
        break;
      case SGR_CODES.BG_DEFAULT:
        state.attrs.bg = undefined;
        break;
      // 256 color
      case 38:
        if (codes[i + 1] === 5 && codes[i + 2] !== undefined) {
          state.attrs.fg = parseColorCode(codes[i + 2] as number, true);
          i += 2;
        } else if (codes[i + 1] === 2 && codes[i + 4] !== undefined) {
          state.attrs.fg = parseColorCode(0, false, codes[i + 2] as number, codes[i + 3] as number, codes[i + 4] as number);
          i += 4;
        }
        break;
      case 48:
        if (codes[i + 1] === 5 && codes[i + 2] !== undefined) {
          state.attrs.bg = parseColorCode(codes[i + 2] as number, true);
          i += 2;
        } else if (codes[i + 1] === 2 && codes[i + 4] !== undefined) {
          state.attrs.bg = parseColorCode(0, false, codes[i + 2] as number, codes[i + 3] as number, codes[i + 4] as number);
          i += 4;
        }
        break;
    }
    i++;
  }
}

/**
 * Parse ANSI text into characters with attributes
 */
export function parseANSIText(text: string): ParsedChar[] {
  const result: ParsedChar[] = [];
  const state: ParserState = {
    attrs: { ...DEFAULT_CELL },
    pos: 0,
  };

  let remaining = text;

  while (remaining.length > 0) {
    // Check for ANSI escape sequence
    if (remaining.startsWith("\x1b[")) {
      // Find the end of the sequence
      const match = remaining.match(/^\x1b\[([0-9;]*)([A-Za-z])/);
      if (match) {
        const [, params = "", cmd] = match;
        if (cmd === "m") {
          parseSGR(params, state);
        }
        remaining = remaining.slice(match[0].length);
        continue;
      }
    }

    // Handle UTF-8 characters properly
    const char = remaining[0];
    remaining = remaining.slice(1);

    // Skip control characters except newline
    if (char === "\n") {
      result.push({ char: "\n", attrs: { ...state.attrs } });
    } else if (char && char.charCodeAt(0) >= 32 || (char && char.charCodeAt(0) === 9)) {
      result.push({ char, attrs: { ...state.attrs } });
    }
  }

  return result;
}

/**
 * Strip ANSI escape sequences from text
 */
export function stripANSI(text: string): string {
  return text.replace(ANSI_PATTERNS.escape, "");
}

// ============================================
// SCREEN BUFFER CAPTURE
// ============================================

/**
 * Create an empty screen buffer
 */
export function createScreenBuffer(width: number, height: number): ScreenBuffer {
  const cells: ScreenCell[][] = [];
  for (let y = 0; y < height; y++) {
    cells.push(Array(width).fill(null).map(() => ({ ...DEFAULT_CELL })));
  }

  return {
    width,
    height,
    cells,
    cursor: { x: 0, y: 0, visible: true },
    timestamp: Date.now(),
  };
}

/**
 * Render parsed characters to a screen buffer
 */
export function renderToScreenBuffer(
  chars: ParsedChar[],
  width: number,
  height: number
): ScreenBuffer {
  const buffer = createScreenBuffer(width, height);
  let x = 0;
  let y = 0;

  for (const { char, attrs } of chars) {
    if (char === "\n") {
      x = 0;
      y++;
      if (y >= height) break;
      continue;
    }

    if (char === "\t") {
      x = Math.min(x + 4 - (x % 4), width - 1);
      continue;
    }

    if (x < width && y < height) {
      const row = buffer.cells[y];
      if (row && row[x] !== undefined) {
        row[x] = { ...attrs, char };
      }
    }

    x++;
    if (x >= width) {
      x = 0;
      y++;
      if (y >= height) break;
    }
  }

  buffer.cursor = { x, y: Math.min(y, height - 1), visible: true };
  return buffer;
}

/**
 * Capture terminal screen as buffer
 * Note: This requires terminal access via Bun's APIs or external capture
 */
export async function captureScreen(
  width: number,
  height: number,
  rawContent?: string
): Promise<ScreenBuffer> {
  // If raw content provided, parse and render it
  if (rawContent) {
    const chars = parseANSIText(rawContent);
    return renderToScreenBuffer(chars, width, height);
  }

  // Otherwise return empty buffer (actual capture done by TUI Bridge MCP)
  return createScreenBuffer(width, height);
}

// ============================================
// UI ELEMENT DETECTION
// ============================================

/**
 * Detect UI elements in a screen buffer
 */
export function detectUIElements(buffer: ScreenBuffer): UIElement[] {
  const elements: UIElement[] = [];
  const visited: boolean[][] = buffer.cells.map((row) => row.map(() => false));

  for (let y = 0; y < buffer.height; y++) {
    for (let x = 0; x < buffer.width; x++) {
      if (visited[y]?.[x]) continue;

      const cell = getCell(buffer, x, y);
      if (cell.char === " ") continue;

      // Try to detect element type based on surrounding context
      const elementType = detectElementType(buffer, x, y);
      const element = extractElement(buffer, x, y, elementType, visited);

      if (element) {
        elements.push(element);
      }
    }
  }

  return elements;
}

/**
 * Detect the type of UI element at a position
 */
function detectElementType(buffer: ScreenBuffer, x: number, y: number): UIElementType {
  const row = buffer.cells[y];
  if (!row) return "text";
  const cell = row[x];
  if (!cell) return "text";

  // Check for button-like patterns (text in brackets or with borders)
  if (cell.char === "[" || cell.char === "<") {
    return "button";
  }

  // Check for menu items (lines with > or * prefixes)
  if (cell.char === ">" || cell.char === "*") {
    return "menu_item";
  }

  // Check for list items (lines with - or numbers)
  if (cell.char === "-" || /^\d$/.test(cell.char)) {
    return "list_item";
  }

  // Check for borders (box drawing characters)
  if (/[\u2500-\u257F]/.test(cell.char)) {
    return "dialog";
  }

  // Check for header (first few lines, often bold or colored)
  if (y < 3 && (cell.bold || cell.inverse)) {
    return "header";
  }

  // Check for footer (last few lines)
  if (y >= buffer.height - 3) {
    return "footer";
  }

  // Default to text
  return "text";
}

/**
 * Extract a UI element starting at a position
 */
function extractElement(
  buffer: ScreenBuffer,
  startX: number,
  startY: number,
  type: UIElementType,
  visited: boolean[][]
): UIElement | null {
  const text = extractText(buffer, startX, startY, visited);
  if (!text || text.trim().length === 0) {
    return null;
  }

  // Calculate bounds
  let minX = buffer.width;
  let maxX = 0;
  let minY = buffer.height;
  let maxY = 0;

  // Re-scan for bounds based on text length
  let x = startX;
  let y = startY;
  for (const char of text) {
    if (char === "\n") {
      x = startX;
      y++;
      continue;
    }
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    x++;
  }

  return {
    type,
    bounds: {
      x: minX,
      y: minY,
      width: Math.max(1, maxX - minX + 1),
      height: Math.max(1, maxY - minY + 1),
    },
    text: text.trim(),
    focused: isFocused(buffer, startX, startY),
    clickable: type === "button" || type === "menu_item",
  };
}

/**
 * Extract continuous text from a position
 */
function extractText(
  buffer: ScreenBuffer,
  startX: number,
  startY: number,
  visited: boolean[][]
): string {
  let text = "";
  let x = startX;
  let y = startY;

  // Extract horizontal line of text
  while (y < buffer.height) {
    x = startX;
    while (x < buffer.width) {
      if (visited[y]?.[x]) {
        x++;
        continue;
      }

      const cell = getCell(buffer, x, y);
      if (cell.char === " " && text.length > 0) {
        // Check if this is end of element
        const nextNonSpace = findNextNonSpace(buffer, x, y);
        if (!nextNonSpace || nextNonSpace.y > y) {
          break;
        }
      }

      const visitedRow = visited[y];
      if (visitedRow) visitedRow[x] = true;
      text += cell.char;
      x++;
    }

    // Check if next line continues this element
    if (y + 1 < buffer.height && shouldContinueElement(buffer, startX, y)) {
      text += "\n";
      y++;
    } else {
      break;
    }
  }

  return text;
}

/**
 * Find next non-space character
 */
function findNextNonSpace(
  buffer: ScreenBuffer,
  startX: number,
  y: number
): { x: number; y: number } | null {
  for (let x = startX; x < buffer.width; x++) {
    const cell = getCell(buffer, x, y);
    if (cell.char !== " ") {
      return { x, y };
    }
  }
  if (y + 1 < buffer.height) {
    return findNextNonSpace(buffer, 0, y + 1);
  }
  return null;
}

/**
 * Check if element continues to next line
 */
function shouldContinueElement(buffer: ScreenBuffer, startX: number, y: number): boolean {
  // Check if next line has similar indentation and content
  if (y + 1 >= buffer.height) return false;

  const currentRow = buffer.cells[y];
  if (!currentRow) return false;

  const currentLineHasContent = currentRow.some((c) => c.char !== " ");
  const nextRow = buffer.cells[y + 1];
  if (!nextRow) return false;
  const nextLineHasContent = nextRow.some((c) => c.char !== " ");

  return currentLineHasContent && nextLineHasContent;
}

/**
 * Check if element appears focused
 */
function isFocused(buffer: ScreenBuffer, x: number, y: number): boolean {
  const cell = getCell(buffer, x, y);
  return cell.inverse || cell.bold || false;
}

// ============================================
// EXPORT FORMATS
// ============================================

/** Export format options */
export type ExportFormat = "text" | "json" | "html" | "markdown";

/**
 * Export options
 */
export interface ExportOptions {
  /** Export format */
  format: ExportFormat;
  /** Include cursor position (for JSON) */
  includeCursor?: boolean;
  /** Include UI elements (for JSON) */
  includeElements?: boolean;
  /** CSS class prefix for HTML */
  cssPrefix?: string;
  /** Use inline styles for HTML */
  inlineStyles?: boolean;
}

/**
 * Export screen buffer to plain text
 */
export function exportToText(buffer: ScreenBuffer): string {
  const lines: string[] = [];

  for (let y = 0; y < buffer.height; y++) {
    const row = buffer.cells[y];
    if (!row) continue;
    let line = "";
    for (let x = 0; x < buffer.width; x++) {
      const cell = row[x];
      line += cell?.char ?? " ";
    }
    // Trim trailing spaces but preserve leading
    lines.push(line.trimEnd());
  }

  // Remove trailing empty lines
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  return lines.join("\n");
}

/**
 * Export screen buffer to JSON
 */
export function exportToJSON(
  buffer: ScreenBuffer,
  options: { includeCursor?: boolean; includeElements?: boolean } = {}
): string {
  const result: Record<string, unknown> = {
    width: buffer.width,
    height: buffer.height,
    cells: buffer.cells,
    timestamp: buffer.timestamp,
  };

  if (options.includeCursor) {
    result.cursor = buffer.cursor;
  }

  if (options.includeElements) {
    result.elements = detectUIElements(buffer);
  }

  return JSON.stringify(result, null, 2);
}

/**
 * Export screen buffer to HTML
 */
export function exportToHTML(
  buffer: ScreenBuffer,
  options: { cssPrefix?: string; inlineStyles?: boolean } = {}
): string {
  const prefix = options.cssPrefix || "tui";
  const inline = options.inlineStyles !== false;

  let html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Terminal Screen</title>
<style>
.${prefix}-screen {
  font-family: monospace;
  white-space: pre;
  line-height: 1.2;
  background: #1a1a1a;
  color: #e5e5e5;
  padding: 8px;
}
.${prefix}-line {
  display: block;
}
.${prefix}-cell {
  display: inline;
}
.${prefix}-bold { font-weight: bold; }
.${prefix}-italic { font-style: italic; }
.${prefix}-underline { text-decoration: underline; }
.${prefix}-dim { opacity: 0.6; }
.${prefix}-inverse { filter: invert(1); }
</style>
</head>
<body>
<div class="${prefix}-screen">
`;

  for (let y = 0; y < buffer.height; y++) {
    html += `<span class="${prefix}-line">`;
    for (let x = 0; x < buffer.width; x++) {
      const cell = getCell(buffer, x, y);
      if (cell.char === " ") {
        html += " ";
        continue;
      }

      const classes: string[] = [`${prefix}-cell`];
      const styles: string[] = [];

      if (cell.bold) classes.push(`${prefix}-bold`);
      if (cell.italic) classes.push(`${prefix}-italic`);
      if (cell.underline) classes.push(`${prefix}-underline`);
      if (cell.dim) classes.push(`${prefix}-dim`);
      if (cell.inverse) classes.push(`${prefix}-inverse`);

      if (cell.fg) styles.push(`color: ${cell.fg}`);
      if (cell.bg) styles.push(`background-color: ${cell.bg}`);

      const styleAttr = inline && styles.length > 0 ? ` style="${styles.join("; ")}"` : "";
      const classAttr = classes.length > 1 ? ` class="${classes.join(" ")}"` : "";

      if (classAttr || styleAttr) {
        html += `<span${classAttr}${styleAttr}>${escapeHTML(cell.char)}</span>`;
      } else {
        html += escapeHTML(cell.char);
      }
    }
    html += `</span>\n`;
  }

  html += `</div>
</body>
</html>`;

  return html;
}

/**
 * Escape HTML special characters
 */
function escapeHTML(char: string): string {
  switch (char) {
    case "&": return "&amp;";
    case "<": return "&lt;";
    case ">": return "&gt;";
    case '"': return "&quot;";
    case "'": return "&#39;";
    default: return char;
  }
}

/**
 * Export screen buffer to Markdown
 */
export function exportToMarkdown(buffer: ScreenBuffer): string {
  let md = "```\n";

  for (let y = 0; y < buffer.height; y++) {
    let line = "";
    for (let x = 0; x < buffer.width; x++) {
      line += getCell(buffer, x, y).char;
    }
    md += line.trimEnd() + "\n";
  }

  md += "```\n";

  // Add detected elements as a list
  const elements = detectUIElements(buffer);
  if (elements.length > 0) {
    md += "\n### Detected Elements\n\n";
    for (const el of elements) {
      const emoji = getElementEmoji(el.type);
      md += `- ${emoji} **${el.type}**: "${el.text}" at (${el.bounds.x}, ${el.bounds.y})\n`;
    }
  }

  return md;
}

/**
 * Get emoji for element type
 */
function getElementEmoji(type: UIElementType): string {
  switch (type) {
    case "button": return "[ ]";
    case "input": return "[_]";
    case "menu": return "||";
    case "menu_item": return ">";
    case "list": return "-";
    case "list_item": return "*";
    case "dialog": return "+";
    case "header": return "#";
    case "footer": return "_";
    default: return " ";
  }
}

/**
 * Export screen buffer to specified format
 */
export function exportScreen(
  buffer: ScreenBuffer,
  format: ExportFormat,
  options: ExportOptions = { format: "text" }
): string {
  switch (format) {
    case "text":
      return exportToText(buffer);
    case "json":
      return exportToJSON(buffer, {
        includeCursor: options.includeCursor,
        includeElements: options.includeElements,
      });
    case "html":
      return exportToHTML(buffer, {
        cssPrefix: options.cssPrefix,
        inlineStyles: options.inlineStyles,
      });
    case "markdown":
      return exportToMarkdown(buffer);
    default:
      throw new Error(`Unknown export format: ${format}`);
  }
}

// ============================================
// PARSED SCREEN
// ============================================

/**
 * Parse raw terminal output into a full ParsedScreen
 */
export function parseScreen(
  rawContent: string,
  width: number,
  height: number
): ParsedScreen {
  const chars = parseANSIText(rawContent);
  const buffer = renderToScreenBuffer(chars, width, height);
  const elements = detectUIElements(buffer);
  const text = exportToText(buffer);

  return {
    text,
    buffer,
    elements,
    timestamp: Date.now(),
  };
}

// ============================================
// INTEGRATION WITH TUI BRIDGE
// ============================================

/**
 * Screen export API for TUIBridge
 */
export interface ScreenExportAPI {
  /** Get screen buffer */
  getScreenBuffer: () => Promise<ScreenBuffer>;
  /** Export screen to format */
  exportScreen: (format: ExportFormat, options?: ExportOptions) => Promise<string>;
  /** Parse raw content */
  parseRawContent: (content: string, width: number, height: number) => ParsedScreen;
  /** Get current screen dimensions */
  getDimensions: () => { width: number; height: number };
}

/**
 * Create screen export API for TUIBridge integration
 */
export function createScreenExportAPI(
  getRawContent: () => Promise<string>,
  getDimensions: () => { width: number; height: number }
): ScreenExportAPI {
  return {
    async getScreenBuffer(): Promise<ScreenBuffer> {
      const { width, height } = getDimensions();
      const content = await getRawContent();
      return captureScreen(width, height, content);
    },

    async exportScreen(format: ExportFormat, options: ExportOptions = { format }): Promise<string> {
      const buffer = await this.getScreenBuffer();
      return exportScreen(buffer, format, options);
    },

    parseRawContent(content: string, width: number, height: number): ParsedScreen {
      return parseScreen(content, width, height);
    },

    getDimensions(): { width: number; height: number } {
      return getDimensions();
    },
  };
}
