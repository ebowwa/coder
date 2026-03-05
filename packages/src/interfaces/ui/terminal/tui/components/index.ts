/**
 * TUI Components Module
 * Composable components for building rich terminal UIs
 *
 * Components:
 * - PaneManager: Resizable split pane layout
 * - MultilineInput: Enhanced text input with autocomplete
 * - Toast: Notification messages
 * - Modal: Dialog overlays
 * - SelectableList: Keyboard-navigable lists
 * - Link: OSC 8 hyperlinks
 * - Sidebar: Collapsible sidebar with tabs
 *
 * IMPORTANT: All keyboard input is handled via InputContext.
 * Do NOT use process.stdin directly - it conflicts with the main input loop.
 */

// ============================================
// INPUT CONTEXT (centralized input management)
// ============================================

export {
  InputProvider,
  useInputContext,
  useInputRegistration,
  useInputRegistration as useInputHandler,
  useInputFocus,
  useInputBlock,
  InputPriority,
  type InputHandler,
  type InputHandlerOptions,
  type InputContextValue,
  type NativeKeyEvent,
} from "../InputContext.js";

// ============================================
// PANE MANAGER
// ============================================

export {
  PaneManager,
  type PaneConfig,
  type PaneDirection,
  type PaneManagerProps,
  usePane,
  PaneContext,
} from "./PaneManager.js";

// ============================================
// MULTILINE INPUT
// ============================================

export {
  MultilineInput,
  useMultilineInputHandler,
  filterSuggestions,
  highlightSyntax,
  type MultilineInputProps,
  type MultilineInputState,
  type UseMultilineInputOptions,
  type AutocompleteSuggestion,
} from "./MultilineInput.js";

// ============================================
// INTERACTIVE ELEMENTS
// ============================================

export {
  // Toast
  Toast,
  useToast,
  type ToastMessage,
  type ToastType,
  type ToastProps,
  type ToastManager,

  // Modal
  Modal,
  ConfirmModal,
  type ModalAction,
  type ModalProps,
  type ConfirmModalProps,

  // SelectableList
  SelectableList,
  type SelectableItem,
  type SelectableListProps,

  // Link
  Link,
  createOsc8Link,
  type LinkProps,

  // Context
  InteractiveProvider,
  useInteractive,
} from "./InteractiveElements.js";

// ============================================
// SIDEBAR
// ============================================

export {
  Sidebar,
  type SidebarTab,
  type SidebarSession,
  type SidebarFile,
  type SidebarTodo,
  type SidebarTool,
  type SidebarProps,
} from "./Sidebar.js";

// ============================================
// RE-EXPORT INK COMPONENTS (convenience)
// ============================================

// Re-export commonly used Ink components for convenience
export { Box, Text, useApp, useInput, useStdout, type Key } from "ink";
