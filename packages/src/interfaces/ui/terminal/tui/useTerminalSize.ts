/**
 * useTerminalSize - Hook for tracking terminal dimensions
 *
 * Provides responsive terminal width/height that updates on resize.
 * Uses Ink's useStdout for TTY-aware dimensions.
 */

import { useState, useEffect, useCallback } from "react";
import { useStdout } from "ink";

export interface TerminalSize {
  /** Terminal width in columns (characters) */
  width: number;
  /** Terminal height in rows (lines) */
  height: number;
}

export interface UseTerminalSizeOptions {
  /** Minimum width to report (default: 40) */
  minWidth?: number;
  /** Minimum height to report (default: 12) */
  minHeight?: number;
  /** Debounce resize events in ms (default: 50) */
  debounceMs?: number;
}

/**
 * Hook that tracks terminal dimensions and responds to resize events.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { width, height } = useTerminalSize();
 *   return <Box width={width} height={height}>...</Box>;
 * }
 * ```
 */
export function useTerminalSize(options: UseTerminalSizeOptions = {}): TerminalSize {
  const { minWidth = 40, minHeight = 12, debounceMs = 50 } = options;
  const { stdout } = useStdout();

  const getSize = useCallback((): TerminalSize => {
    const rawWidth = stdout.columns || 80;
    const rawHeight = stdout.rows || 24;
    return {
      width: Math.max(rawWidth, minWidth),
      height: Math.max(rawHeight, minHeight),
    };
  }, [stdout, minWidth, minHeight]);

  const [size, setSize] = useState<TerminalSize>(getSize);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleResize = () => {
      // Debounce resize events
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        setSize(getSize());
      }, debounceMs);
    };

    // Set initial size
    setSize(getSize());

    // Listen for resize events
    stdout.on("resize", handleResize);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      stdout.off("resize", handleResize);
    };
  }, [stdout, getSize, debounceMs]);

  return size;
}

export default useTerminalSize;
