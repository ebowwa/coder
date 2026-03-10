/**
 * Spinner Frames
 * Single source of truth for spinner animation frames
 *
 * These are pure data arrays with no dependencies, suitable for any UI context.
 */

/**
 * Default braille spinner frames
 */
export const spinnerFrames: string[] = [
  "⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏",
];

/**
 * Dot-based spinner frames (works in more terminals)
 */
export const dotSpinnerFrames: string[] = [
  "⠁", "⠈", "⠐", "⠠", "⢀", "⣀", "⣄", "⣤", "⣦", "⣶", "⣷", "⣸", "⣼", "⣾", "⣽", "⣻",
];

/**
 * ASCII-only spinner frames (maximum compatibility)
 */
export const asciiSpinnerFrames: string[] = [
  "|", "/", "-", "\\",
];

/**
 * Arrow spinner frames
 */
export const arrowSpinnerFrames: string[] = [
  "→", "↘", "↓", "↙", "←", "↖", "↑", "↗",
];

/**
 * Simple dot progress frames
 */
export const simpleDotFrames: string[] = [
  ".  ", ".. ", "...", " ..", "  .", "   ",
];

/**
 * Tool activity spinner frames
 */
export const toolSpinnerFrames: string[] = [
  "⚙ ", "⚙⚙", " ⚙",
];

/**
 * Get next frame in sequence
 */
export function nextFrame(frames: string[], index: number): string {
  return frames[index % frames.length] ?? frames[0] ?? "";
}

/**
 * Create a spinner iterator
 */
export function* createSpinnerIterator(frames: string[]): Generator<string, never, never> {
  let index = 0;
  while (true) {
    yield frames[index % frames.length] ?? frames[0] ?? "";
    index++;
  }
}

/**
 * Get frame at specific index
 */
export function getFrame(frames: string[], index: number): string {
  return frames[index % frames.length] ?? frames[0] ?? "";
}
