/**
 * Shared TUI Helpers
 *
 * Re-exports from core/tui for backwards compatibility.
 * New code should import directly from core/tui.
 *
 * @deprecated Import from core/tui instead
 */

// ============================================
// RE-EXPORTS FROM CORE
// ============================================

export {
  genId,
  estimateTokens,
  estimateMessagesTokens,
  apiToText,
  formatTokenCount as useTokenCount,
} from "../../../../core/tui/token-utils.js";

export { HELP_TEXT } from "../../../../core/tui/command-handler.js";

// ============================================
// UI-SPECIFIC HELPERS (kept here)
// ============================================

/**
 * Wrap long text to fit within width
 */
export function wrapText(text: string, width: number): string {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (!word) continue;

    const lineWidth = word.length;
    if (currentLine.length + lineWidth + 1 >= width) {
      // Wrap to next line
      lines.push(currentLine);
      currentLine = "";
    } else {
      currentLine += " " + word;
    }
  }

  return lines.map(line => line.trim()).join("\n");
}
