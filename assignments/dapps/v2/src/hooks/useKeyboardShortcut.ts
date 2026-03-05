/**
 * Keyboard Shortcut Hook
 * Register global keyboard shortcuts
 */

import { useEffect, useCallback } from 'react';

export interface KeyboardShortcutOptions {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  handler: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcut({
  key,
  ctrlKey = false,
  shiftKey = false,
  altKey = false,
  metaKey = false,
  handler,
  enabled = true,
}: KeyboardShortcutOptions): void {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        e.key === key &&
        e.ctrlKey === ctrlKey &&
        e.shiftKey === shiftKey &&
        e.altKey === altKey &&
        e.metaKey === metaKey
      ) {
        e.preventDefault();
        handler();
      }
    },
    [key, ctrlKey, shiftKey, altKey, metaKey, handler]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
}

// Shortcut preset hooks
export const useSaveShortcut = (handler: () => void, enabled = true) => {
  useKeyboardShortcut({
    key: 's',
    ctrlKey: true,
    metaKey: true, // Cmd on Mac
    handler,
    enabled,
  });
};

export const useEscapeShortcut = (handler: () => void, enabled = true) => {
  useKeyboardShortcut({
    key: 'Escape',
    handler,
    enabled,
  });
};
