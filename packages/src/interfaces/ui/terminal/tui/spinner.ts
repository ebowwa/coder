/**
 * Spinner Animation
 * Re-exports from @ebowwa/tui-core/algorithms for backwards compatibility
 *
 * This module provides animated spinner frames for loading indicators.
 * All spinner implementations now come from @ebowwa/tui-core.
 */

// Re-export from @ebowwa/tui-core/algorithms
export {
  SPINNERS,
  getFrame,
  nextFrame,
} from "@ebowwa/tui-core/algorithms"

// Import for local use
import { SPINNERS, getFrame, nextFrame } from "@ebowwa/tui-core/algorithms"

// ============================================
// BACKWARDS COMPATIBILITY EXPORTS
// ============================================

/**
 * Standard braille spinner frames (default)
 * @deprecated Use SPINNERS.dots[0].frames from @ebowwa/tui-core/algorithms
 */
export const spinnerFrames = SPINNERS.dots?.[0]?.frames ?? ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]

/**
 * Alternative dot spinner frames
 * @deprecated Use SPINNERS.dots2[0].frames from @ebowwa/tui-core/algorithms
 */
export const dotSpinnerFrames = SPINNERS.dots2?.[0]?.frames ?? ["⠁", "⠂", "⠄", "⡀", "⢀", "⠠", "⠐", "⠈"]

/**
 * Simple ASCII spinner frames
 * @deprecated Use SPINNERS.line[0].frames from @ebowwa/tui-core/algorithms
 */
export const asciiSpinnerFrames = SPINNERS.line?.[0]?.frames ?? ["|", "/", "-", "\\"]

/**
 * Arrow spinner frames
 * @deprecated Use SPINNERS.arrow[0].frames from @ebowwa/tui-core/algorithms
 */
export const arrowSpinnerFrames = SPINNERS.arrow?.[0]?.frames ?? ["←", "↖", "↑", "↗", "→", "↘", "↓", "↙"]

/**
 * Simple dots for minimal display
 */
export const simpleDotFrames = [".  ", ".. ", "...", "   "] as const

// ============================================
// LOCAL IMPLEMENTATIONS (not in tui-core)
// ============================================

/**
 * Create a spinner iterator
 * Local implementation for backwards compatibility
 */
export function* createSpinnerIterator(frames: readonly string[] = spinnerFrames): Generator<string, never, unknown> {
  let index = 0;
  while (true) {
    yield getFrame(index, frames);
    index = nextFrame(index, frames);
  }
}
