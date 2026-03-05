/**
 * Click Outside Hook
 * Detect clicks outside a component
 */

import { useEffect, RefObject } from 'react';

export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T>,
  callback: () => void,
  isEnabled: boolean = true
): void {
  useEffect(() => {
    if (!isEnabled) return;

    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [ref, callback, isEnabled]);
}
