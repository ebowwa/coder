/**
 * Spinner Animation
 * Provides animated spinner frames for loading indicators
 *
 * This is the single source of truth for all spinner frames in Coder.
 * Other modules should import from here rather than defining their own.
 */

// ============================================
// SPINNER FRAME DEFINITIONS
// ============================================

/**
 * Standard braille spinner frames (default)
 * Used by: ora spinner, TUI footer, Ink components
 */
export const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"] as const;

/**
 * Alternative dot spinner frames
 * Rising dots pattern
 */
export const dotSpinnerFrames = ["⠁", "⠂", "⠄", "⡀", "⢀", "⠠", "⠐", "⠈"] as const;

/**
 * Simple ASCII spinner frames
 * Fallback for limited terminal support
 */
export const asciiSpinnerFrames = ["|", "/", "-", "\\"] as const;

/**
 * Arrow spinner frames
 * Used for tool execution indicators
 */
export const arrowSpinnerFrames = ["←", "↖", "↑", "↗", "→", "↘", "↓", "↙"] as const;

/**
 * Simple dots for minimal display
 */
export const simpleDotFrames = [".  ", ".. ", "...", "   "] as const;

// ============================================
// FRAME ITERATION UTILITIES
// ============================================

/**
 * Get the next spinner frame index
 */
export function nextFrame(currentIndex: number, frames: readonly string[] = spinnerFrames): number {
  return (currentIndex + 1) % frames.length;
}

/**
 * Get a spinner frame by index (with wraparound)
 */
export function getFrame(index: number, frames: readonly string[] = spinnerFrames): string {
  return frames[index % frames.length] ?? frames[0] ?? "";
}

/**
 * Create a spinner iterator
 */
export function* createSpinnerIterator(frames: readonly string[] = spinnerFrames): Generator<string, never, unknown> {
  let index = 0;
  while (true) {
    yield getFrame(index, frames);
    index = nextFrame(index, frames);
  }
}
