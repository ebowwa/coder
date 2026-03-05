/** @jsx React.createElement */
/** @jsxFrag React.Fragment */
/**
 * Centralized Input Management System
 *
 * Single source of truth for keyboard input across all TUI components.
 * Solves the problem of multiple components fighting over stdin.
 *
 * Architecture:
 * - InputProvider wraps the entire TUI
 * - Components register/unregister as input handlers
 * - Focus system ensures only ONE handler receives input
 * - Priority system for modals/overlays
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import type { NativeKeyEvent } from "../../../../native/index.js";

// Re-export NativeKeyEvent for convenience
export type { NativeKeyEvent } from "../../../../native/index.js";

// ============================================
// TYPES
// ============================================

export type InputHandler = (event: NativeKeyEvent) => boolean;

export interface InputHandlerOptions {
  /** Unique ID for this handler */
  id: string;
  /** Priority (higher = receives input first) */
  priority?: number;
  /** Handler function - return true to consume, false to pass through */
  handler: InputHandler;
  /** Whether this handler is currently active */
  isActive?: boolean;
}

export interface InputContextValue {
  /** Register an input handler */
  register: (options: InputHandlerOptions) => () => void;
  /** Set focus to a specific handler */
  focus: (handlerId: string) => void;
  /** Get currently focused handler ID */
  focusedId: string | null;
  /** Dispatch a key event to handlers */
  dispatch: (event: NativeKeyEvent) => boolean;
  /** Whether input is currently blocked */
  isBlocked: boolean;
  /** Block/unblock input (for loading states) */
  setBlocked: (blocked: boolean) => void;
}

// ============================================
// CONTEXT
// ============================================

const InputContext = createContext<InputContextValue | null>(null);

export function useInputContext(): InputContextValue {
  const ctx = useContext(InputContext);
  if (!ctx) {
    throw new Error("useInputContext must be used within InputProvider");
  }
  return ctx;
}

// ============================================
// PROVIDER
// ============================================

export interface InputProviderProps {
  children: React.ReactNode;
  /** Initial blocked state */
  initialBlocked?: boolean;
}

export function InputProvider({ children, initialBlocked = false }: InputProviderProps) {
  const handlersRef = useRef<Map<string, InputHandlerOptions>>(new Map());
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(initialBlocked);

  const register = useCallback((options: InputHandlerOptions) => {
    const { id } = options;
    handlersRef.current.set(id, options);

    // If no focus set, focus this handler
    if (!focusedId) {
      setFocusedId(id);
    }

    // Return unregister function
    return () => {
      handlersRef.current.delete(id);
      if (focusedId === id) {
        // Focus next available handler (highest priority)
        const remaining = Array.from(handlersRef.current.values())
          .filter(h => h.isActive !== false)
          .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
        setFocusedId(remaining[0]?.id ?? null);
      }
    };
  }, [focusedId]);

  const focus = useCallback((handlerId: string) => {
    if (handlersRef.current.has(handlerId)) {
      setFocusedId(handlerId);
    }
  }, []);

  const dispatch = useCallback((event: NativeKeyEvent): boolean => {
    if (isBlocked) return false;

    // Get all active handlers sorted by priority (highest first)
    const activeHandlers = Array.from(handlersRef.current.values())
      .filter(h => h.isActive !== false)
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    // First, try the focused handler
    if (focusedId) {
      const focused = handlersRef.current.get(focusedId);
      if (focused?.isActive !== false && focused?.handler) {
        const consumed = focused.handler(event);
        if (consumed) return true;
      }
    }

    // Then try other handlers by priority
    for (const h of activeHandlers) {
      if (h.id === focusedId) continue; // Already tried
      const consumed = h.handler(event);
      if (consumed) return true;
    }

    return false;
  }, [isBlocked, focusedId]);

  const setBlocked = useCallback((blocked: boolean) => {
    setIsBlocked(blocked);
  }, []);

  const value: InputContextValue = {
    register,
    focus,
    focusedId,
    dispatch,
    isBlocked,
    setBlocked,
  };

  return (
    <InputContext.Provider value={value}>
      {children}
    </InputContext.Provider>
  );
}

// ============================================
// CONVENIENCE HOOKS
// ============================================

/**
 * Hook to register an input handler with the centralized system
 * Automatically unregisters on unmount
 */
export function useInputRegistration(
  id: string,
  handler: InputHandler,
  options: { priority?: number; isActive?: boolean } = {}
) {
  const { register } = useInputContext();

  useEffect(() => {
    return register({
      id,
      handler,
      priority: options.priority,
      isActive: options.isActive,
    });
  }, [id, handler, options.priority, options.isActive, register]);
}

// Alias for convenience
export const useInputHandler = useInputRegistration;

/**
 * Hook to receive focus for a handler
 */
export function useInputFocus(handlerId: string) {
  const { focus, focusedId } = useInputContext();
  const isFocused = focusedId === handlerId;

  return {
    isFocused,
    focus: () => focus(handlerId),
  };
}

/**
 * Hook for components that need to block input
 */
export function useInputBlock() {
  const { isBlocked, setBlocked } = useInputContext();
  return { isBlocked, setBlocked };
}

// ============================================
// PRIORITY CONSTANTS
// ============================================

export const InputPriority = {
  /** Normal components */
  DEFAULT: 0,
  /** Focused input fields */
  INPUT: 10,
  /** Selectable lists */
  LIST: 20,
  /** Sidebar */
  SIDEBAR: 30,
  /** Modal dialogs */
  MODAL: 100,
  /** Toast notifications (can dismiss) */
  TOAST: 110,
  /** System-level (Ctrl+C, etc.) */
  SYSTEM: 1000,
} as const;

// ============================================
// EXPORTS
// ============================================

export default InputContext;
