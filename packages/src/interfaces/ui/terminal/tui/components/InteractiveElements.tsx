/** @jsx React.createElement */
/**
 * Interactive Elements for TUI
 *
 * Components:
 * - Toast: Notification messages that auto-dismiss
 * - Modal: Dialog overlay for confirmations
 * - SelectableList: Keyboard-navigable list with selection
 * - Link: Clickable OSC 8 hyperlinks
 *
 * NOTE: All components use InputContext for keyboard input.
 * Do NOT use process.stdin directly - it conflicts with the main input loop.
 */

import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { Box, Text, useStdout } from "ink";
import { useInputHandler, InputPriority, type NativeKeyEvent } from "../InputContext.js";

// ============================================
// TOAST COMPONENT
// ============================================

export type ToastType = "info" | "success" | "warning" | "error";

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number; // ms, 0 = no auto-dismiss
  timestamp: number;
}

export interface ToastProps {
  toasts: ToastMessage[];
  position?: "top" | "bottom";
  maxVisible?: number;
  onDismiss?: (id: string) => void;
}

const TOAST_ICONS: Record<ToastType, string> = {
  info: "i",
  success: "+",
  warning: "!",
  error: "x",
};

const TOAST_COLORS: Record<ToastType, string> = {
  info: "blue",
  success: "green",
  warning: "yellow",
  error: "red",
};

export function Toast({ toasts, position = "top", maxVisible = 3, onDismiss }: ToastProps) {
  const visibleToasts = toasts.slice(0, maxVisible);

  if (visibleToasts.length === 0) return null;

  return (
    <Box
      flexDirection="column"
      width="100%"
      paddingX={1}
    >
      {visibleToasts.map((toast) => (
        <Box
          key={toast.id}
          borderStyle="round"
          borderColor={TOAST_COLORS[toast.type]}
          paddingX={1}
          marginBottom={1}
        >
          <Text color={TOAST_COLORS[toast.type]} bold>
            [{TOAST_ICONS[toast.type]}]
          </Text>
          <Text> {toast.message}</Text>
        </Box>
      ))}
    </Box>
  );
}

// Toast Manager Hook
export interface ToastManager {
  toasts: ToastMessage[];
  showToast: (type: ToastType, message: string, duration?: number) => string;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
}

export function useToast(defaultDuration = 5000): ToastManager {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const showToast = useCallback((type: ToastType, message: string, duration = defaultDuration): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const toast: ToastMessage = {
      id,
      type,
      message,
      duration,
      timestamp: Date.now(),
    };

    setToasts((prev) => [...prev, toast]);

    // Auto-dismiss
    if (duration > 0) {
      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        timersRef.current.delete(id);
      }, duration);
      timersRef.current.set(id, timer);
    }

    return id;
  }, [defaultDuration]);

  const dismissToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    setToasts([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return { toasts, showToast, dismissToast, clearAllToasts };
}

// ============================================
// MODAL COMPONENT
// ============================================

export interface ModalAction {
  id: string;
  label: string;
  style?: "primary" | "secondary" | "danger";
  onActivate?: () => void | Promise<void>;
}

export interface ModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  actions: ModalAction[];
  defaultAction?: string;
  onDismiss?: () => void;
  width?: number;
}

const ACTION_COLORS: Record<string, string> = {
  primary: "cyan",
  secondary: "gray",
  danger: "red",
};

export function Modal({
  isOpen,
  title,
  message,
  actions,
  defaultAction,
  onDismiss,
  width = 60,
}: ModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { stdout } = useStdout();

  useEffect(() => {
    // Reset selection when modal opens
    if (isOpen) {
      const defaultIndex = defaultAction
        ? actions.findIndex((a) => a.id === defaultAction)
        : 0;
      setSelectedIndex(defaultIndex >= 0 ? defaultIndex : 0);
    }
  }, [isOpen, defaultAction, actions]);

  // Handle keyboard input via centralized InputContext
  const handleKey = useCallback((event: NativeKeyEvent): boolean => {
    if (!isOpen) return false;

    // Escape or q to dismiss
    if ((event.code === "escape" && event.kind === "press") ||
        (event.code === "q" && !event.ctrl && event.kind === "press")) {
      onDismiss?.();
      return true;
    }

    // Enter to select
    if (event.code === "enter" && event.kind === "press") {
      const action = actions[selectedIndex];
      if (action?.onActivate) {
        action.onActivate();
      }
      return true;
    }

    // Left arrow or h
    if ((event.code === "left" && event.kind === "press") ||
        (event.code === "h" && !event.ctrl && event.kind === "press")) {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
      return true;
    }

    // Right arrow or l
    if ((event.code === "right" && event.kind === "press") ||
        (event.code === "l" && !event.ctrl && event.kind === "press")) {
      setSelectedIndex((prev) => Math.min(actions.length - 1, prev + 1));
      return true;
    }

    return false;
  }, [isOpen, actions, selectedIndex, onDismiss]);

  // Register with input system - modals have high priority
  useInputHandler("modal", handleKey, {
    priority: InputPriority.MODAL,
    isActive: isOpen,
  });

  if (!isOpen) return null;

  const modalWidth = Math.min(width, stdout.columns || 80);

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="cyan"
      width={modalWidth}
      paddingX={2}
      paddingY={1}
    >
      {/* Title */}
      {title && (
        <Box>
          <Text bold color="cyan">{title}</Text>
        </Box>
      )}

      {/* Message */}
      <Box marginBottom={1}>
        <Text>{message}</Text>
      </Box>

      {/* Actions */}
      <Box justifyContent="center">
        {actions.map((action, index) => {
          const isSelected = index === selectedIndex;
          const color = ACTION_COLORS[action.style || "secondary"];

          return (
            <Box
              key={action.id}
              borderStyle={isSelected ? "single" : undefined}
              borderColor={isSelected ? color : undefined}
              paddingX={1}
              marginRight={1}
            >
              <Text
                color={color}
                bold={isSelected}
                inverse={isSelected}
              >
                {action.label}
              </Text>
            </Box>
          );
        })}
      </Box>

      {/* Hint */}
      <Box marginTop={1}>
        <Text dimColor>
          {"<-"}/{"->"} or h/l to select | Enter to confirm | Esc to cancel
        </Text>
      </Box>
    </Box>
  );
}

// Confirmation Modal Helper
export interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmModal({
  isOpen,
  title = "Confirm",
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
}: ConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      title={title}
      message={message}
      actions={[
        {
          id: "cancel",
          label: cancelLabel,
          style: "secondary",
          onActivate: onCancel,
        },
        {
          id: "confirm",
          label: confirmLabel,
          style: "primary",
          onActivate: onConfirm,
        },
      ]}
      defaultAction="confirm"
      onDismiss={onCancel}
    />
  );
}

// ============================================
// SELECTABLE LIST COMPONENT
// ============================================

export interface SelectableItem {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  metadata?: Record<string, unknown>;
}

export interface SelectableListProps {
  items: SelectableItem[];
  selectedIndex?: number;
  onSelect?: (item: SelectableItem, index: number) => void;
  onActivate?: (item: SelectableItem, index: number) => void;
  showIndices?: boolean;
  showDescriptions?: boolean;
  maxHeight?: number;
  emptyMessage?: string;
  /** Whether this list is focused (receives input) */
  isFocused?: boolean;
  /** Unique ID for input handling */
  inputId?: string;
}

export function SelectableList({
  items,
  selectedIndex = 0,
  onSelect,
  onActivate,
  showIndices = true,
  showDescriptions = true,
  maxHeight = 10,
  emptyMessage = "No items",
  isFocused = true,
  inputId = "selectable-list",
}: SelectableListProps) {
  const [internalIndex, setInternalIndex] = useState(selectedIndex);

  useEffect(() => {
    setInternalIndex(selectedIndex);
  }, [selectedIndex]);

  // Handle keyboard input via centralized InputContext
  const handleKey = useCallback((event: NativeKeyEvent): boolean => {
    if (!isFocused || items.length === 0) return false;

    // Up arrow or k
    if ((event.code === "up" && event.kind === "press") ||
        (event.code === "k" && !event.ctrl && event.kind === "press")) {
      const newIndex = Math.max(0, internalIndex - 1);
      setInternalIndex(newIndex);
      const item = items[newIndex];
      if (item) onSelect?.(item, newIndex);
      return true;
    }

    // Down arrow or j
    if ((event.code === "down" && event.kind === "press") ||
        (event.code === "j" && !event.ctrl && event.kind === "press")) {
      const newIndex = Math.min(items.length - 1, internalIndex + 1);
      setInternalIndex(newIndex);
      const item = items[newIndex];
      if (item) onSelect?.(item, newIndex);
      return true;
    }

    // Enter or l to activate
    if ((event.code === "enter" && event.kind === "press") ||
        (event.code === "l" && !event.ctrl && event.kind === "press")) {
      const item = items[internalIndex];
      if (item) {
        onActivate?.(item, internalIndex);
      }
      return true;
    }

    return false;
  }, [isFocused, items, internalIndex, onSelect, onActivate]);

  // Register with input system
  useInputHandler(inputId, handleKey, {
    priority: InputPriority.LIST,
    isActive: isFocused && items.length > 0,
  });

  if (items.length === 0) {
    return (
      <Box>
        <Text dimColor>{emptyMessage}</Text>
      </Box>
    );
  }

  const visibleItems = items.slice(0, maxHeight);

  return (
    <Box flexDirection="column">
      {visibleItems.map((item, index) => {
        const isSelected = index === internalIndex;
        const prefix = showIndices
          ? `${String(index + 1).padStart(2, " ")}. `
          : "";

        return (
          <Box
            key={item.id}
            flexDirection="column"
            marginBottom={1}
          >
            <Box>
              {isSelected && (
                <Text color="cyan" bold>{"->"} </Text>
              )}
              {!isSelected && <Text>  </Text>}
              <Text dimColor>{prefix}</Text>
              {item.icon && <Text> {item.icon} </Text>}
              <Text
                color={isSelected ? "cyan" : "white"}
                bold={isSelected}
              >
                {item.label}
              </Text>
            </Box>
            {showDescriptions && item.description && (
              <Box marginLeft={4}>
                <Text dimColor>{item.description}</Text>
              </Box>
            )}
          </Box>
        );
      })}

      {items.length > maxHeight && (
        <Box>
          <Text dimColor>
            ... and {items.length - maxHeight} more (j to scroll)
          </Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>
          up/down or j/k to navigate | Enter or l to select
        </Text>
      </Box>
    </Box>
  );
}

// ============================================
// LINK COMPONENT (OSC 8 HYPERLINKS)
// ============================================

export interface LinkProps {
  url: string;
  text?: string;
  fallback?: string; // Text to show if OSC 8 not supported
}

/**
 * Create an OSC 8 hyperlink
 * OSC 8 format: ESC ] 8 ;; <url> BEL <text> ESC ] 8 ;; BEL
 */
export function createOsc8Link(url: string, text: string): string {
  // OSC 8 hyperlink format: \x1b]8;;URL\x07TEXT\x1b]8;;\x07
  return `\x1b]8;;${url}\x07${text}\x1b]8;;\x07`;
}

export function Link({ url, text, fallback }: LinkProps) {
  const displayText = text || url;
  const fallbackText = fallback || displayText;

  // Check if terminal likely supports OSC 8
  // Most modern terminals do, but we provide fallback
  const supportsOsc8 = process.env.TERM_PROGRAM === "iTerm.app" ||
    process.env.TERM_PROGRAM === "Terminal.app" ||
    process.env.TERM?.includes("xterm") ||
    process.env.WT_SESSION_ID !== undefined; // Windows Terminal

  if (supportsOsc8) {
    // Render with OSC 8 hyperlink
    // Note: Ink may escape this, so we use the raw text
    return (
      <Text color="blue">
        {createOsc8Link(url, displayText)}
      </Text>
    );
  }

  // Fallback for terminals without OSC 8 support
  return (
    <Text color="blue" underline>
      {fallbackText}
    </Text>
  );
}

// ============================================
// CONTEXT PROVIDERS
// ============================================

interface InteractiveContextValue {
  toast: ToastManager;
}

const InteractiveContext = createContext<InteractiveContextValue | null>(null);

export function InteractiveProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();

  return (
    <InteractiveContext.Provider value={{ toast }}>
      {children}
    </InteractiveContext.Provider>
  );
}

export function useInteractive(): InteractiveContextValue {
  const context = useContext(InteractiveContext);
  if (!context) {
    throw new Error("useInteractive must be used within InteractiveProvider");
  }
  return context;
}

// ============================================
// EXPORTS
// ============================================

export default {
  Toast,
  useToast,
  Modal,
  ConfirmModal,
  SelectableList,
  Link,
  createOsc8Link,
  InteractiveProvider,
  useInteractive,
};
