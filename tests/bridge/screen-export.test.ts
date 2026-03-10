/**
 * Tests for screen-export utilities
 */

import { describe, test, expect } from "bun:test";
import {
  parseANSIText,
  stripANSI,
  createScreenBuffer,
  renderToScreenBuffer,
  detectUIElements,
  exportToText,
  exportToJSON,
  exportToHTML,
  exportToMarkdown,
  exportScreen,
  parseScreen,
  DEFAULT_CELL,
} from "../../packages/src/interfaces/ui/terminal/bridge/screen-export.js";

describe("ANSI Parsing", () => {
  test("stripANSI removes escape sequences", () => {
    const input = "\x1b[31mHello\x1b[0m World";
    expect(stripANSI(input)).toBe("Hello World");
  });

  test("parseANSIText extracts plain text", () => {
    const input = "\x1b[1mBold\x1b[0m text";
    const result = parseANSIText(input);
    expect(result.length).toBe(9); // "Bold text"
    expect(result[0].char).toBe("B");
    expect(result[0].attrs.bold).toBe(true);
  });

  test("parseANSIText handles colors", () => {
    const input = "\x1b[31mRed\x1b[0m";
    const result = parseANSIText(input);
    expect(result[0].attrs.fg).toBe("#cd0000"); // Red
  });

  test("parseANSIText handles 256 colors", () => {
    const input = "\x1b[38;5;196mColor\x1b[0m";
    const result = parseANSIText(input);
    expect(result[0].attrs.fg).toBeDefined();
  });

  test("parseANSIText handles true colors", () => {
    const input = "\x1b[38;2;255;0;0mTrueColor\x1b[0m";
    const result = parseANSIText(input);
    expect(result[0].attrs.fg).toBe("#ff0000");
  });

  test("parseANSIText handles multiple attributes", () => {
    const input = "\x1b[1;3;4mBoldItalicUnderline\x1b[0m";
    const result = parseANSIText(input);
    expect(result[0].attrs.bold).toBe(true);
    expect(result[0].attrs.italic).toBe(true);
    expect(result[0].attrs.underline).toBe(true);
  });
});

describe("Screen Buffer", () => {
  test("createScreenBuffer creates correct dimensions", () => {
    const buffer = createScreenBuffer(80, 24);
    expect(buffer.width).toBe(80);
    expect(buffer.height).toBe(24);
    expect(buffer.cells.length).toBe(24);
    expect(buffer.cells[0].length).toBe(80);
  });

  test("createScreenBuffer initializes with empty cells", () => {
    const buffer = createScreenBuffer(10, 5);
    expect(buffer.cells[0][0]).toEqual(DEFAULT_CELL);
  });

  test("renderToScreenBuffer renders text", () => {
    const chars = parseANSIText("Hello");
    const buffer = renderToScreenBuffer(chars, 80, 24);
    expect(buffer.cells[0][0].char).toBe("H");
    expect(buffer.cells[0][4].char).toBe("o");
  });

  test("renderToScreenBuffer handles newlines", () => {
    const chars = parseANSIText("Line1\nLine2");
    const buffer = renderToScreenBuffer(chars, 80, 24);
    expect(buffer.cells[0][0].char).toBe("L");
    expect(buffer.cells[1][0].char).toBe("L");
  });
});

describe("UI Element Detection", () => {
  test("detectUIElements returns array", () => {
    const buffer = createScreenBuffer(80, 24);
    const elements = detectUIElements(buffer);
    expect(Array.isArray(elements)).toBe(true);
  });

  test("detectUIElements finds text", () => {
    const chars = parseANSIText("Hello World");
    const buffer = renderToScreenBuffer(chars, 80, 24);
    const elements = detectUIElements(buffer);
    expect(elements.length).toBeGreaterThan(0);
    expect(elements[0].text).toContain("Hello");
  });
});

describe("Export Formats", () => {
  test("exportToText produces plain text", () => {
    const chars = parseANSIText("Test Output");
    const buffer = renderToScreenBuffer(chars, 80, 24);
    const text = exportToText(buffer);
    expect(text).toContain("Test Output");
    expect(text).not.toContain("\x1b[");
  });

  test("exportToJSON produces valid JSON", () => {
    const chars = parseANSIText("Test Output");
    const buffer = renderToScreenBuffer(chars, 80, 24);
    const json = exportToJSON(buffer);
    const parsed = JSON.parse(json);
    expect(parsed.width).toBe(80);
    expect(parsed.height).toBe(24);
  });

  test("exportToJSON with options", () => {
    const chars = parseANSIText("Test Output");
    const buffer = renderToScreenBuffer(chars, 80, 24);
    const json = exportToJSON(buffer, { includeCursor: true, includeElements: true });
    const parsed = JSON.parse(json);
    expect(parsed.cursor).toBeDefined();
    expect(parsed.elements).toBeDefined();
  });

  test("exportToHTML produces HTML", () => {
    const chars = parseANSIText("Test Output");
    const buffer = renderToScreenBuffer(chars, 80, 24);
    const html = exportToHTML(buffer);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<div");
  });

  test("exportToMarkdown produces markdown", () => {
    const chars = parseANSIText("Test Output");
    const buffer = renderToScreenBuffer(chars, 80, 24);
    const md = exportToMarkdown(buffer);
    expect(md).toContain("```");
    expect(md).toContain("Test Output");
  });

  test("exportScreen dispatches to correct format", () => {
    const chars = parseANSIText("Test Output");
    const buffer = renderToScreenBuffer(chars, 80, 24);
    const text = exportScreen(buffer, "text");
    expect(text).toContain("Test Output");

    const json = exportScreen(buffer, "json");
    expect(() => JSON.parse(json)).not.toThrow();
  });
});

describe("Full Parse", () => {
  test("parseScreen returns complete ParsedScreen", () => {
    const raw = "\x1b[1mHeader\x1b[0m\nContent here";
    const parsed = parseScreen(raw, 80, 24);

    expect(parsed.text).toBeDefined();
    expect(parsed.buffer).toBeDefined();
    expect(parsed.elements).toBeDefined();
    expect(parsed.timestamp).toBeDefined();

    expect(parsed.buffer.width).toBe(80);
    expect(parsed.buffer.height).toBe(24);
  });

  test("parseScreen handles complex ANSI", () => {
    const raw = "\x1b[38;5;196m\x1b[48;5;17mStyled\x1b[0m";
    const parsed = parseScreen(raw, 80, 24);
    expect(parsed.text).toBe("Styled");
  });
});
