/**
 * Wrap long text to fit within terminal width
 */

/**
 * Wrap long text to fit within width
 */
export function wrapText(text: string, width: number): string {
  // Guard against invalid width
  if (width < 1) return text;

  const words = text.split(/\s+/).filter(w => w);
  if (words.length === 0) return "";

  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    // If word alone exceeds width, we still need to include it
    const potentialLength = currentLine.length > 0
      ? currentLine.length + 1 + word.length
      : word.length;

    if (potentialLength > width && currentLine.length > 0) {
      // Current word doesn't fit - push current line and start new line with this word
      lines.push(currentLine);
      currentLine = word;
    } else if (currentLine.length > 0) {
      // Add to existing line with space
      currentLine += " " + word;
    } else {
      // First word on line
      currentLine = word;
    }
  }

  // Don't forget the last line
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines.join("\n");
}
