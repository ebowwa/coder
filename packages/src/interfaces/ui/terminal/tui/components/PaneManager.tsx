/** @jsx React.createElement */
/**
 * Pane Manager Component
 * Resizable split pane layout for TUI
 *
 * Supports:
 * - Horizontal and vertical splits
 * - Keyboard-driven resize (Ctrl+Arrow keys when focused)
 * - Collapsible panes
 * - Min/max widths
 */

import React, { useState, useCallback, useRef, createContext, useContext } from "react";
import { Box, Text, useStdout } from "ink";

// ============================================
// TYPES
// ============================================

export type PaneDirection = "horizontal" | "vertical";

export interface PaneConfig {
  id: string;
  /** Initial size (width for horizontal, height for vertical) as percentage or absolute */
  size: number;
  /** Size unit: "percent" or "fixed" */
  sizeUnit?: "percent" | "fixed";
  /** Minimum size in cells */
  minSize?: number;
  /** Maximum size in cells */
  maxSize?: number;
  /** Whether pane can be collapsed */
  collapsible?: boolean;
  /** Whether pane starts collapsed */
  collapsed?: boolean;
  /** Pane label for header */
  label?: string;
}

export interface PaneManagerProps {
  direction?: PaneDirection;
  panes: PaneConfig[];
  children: React.ReactNode[];
  /** Active pane index for resize focus */
  activePane?: number;
  /** Show resize handles */
  showHandles?: boolean;
  /** Handle character */
  handleChar?: string;
  /** Handle color */
  handleColor?: string;
  /** Called when pane sizes change */
  onPaneChange?: (sizes: number[]) => void;
}

export interface PaneContextValue {
  width: number;
  height: number;
  isActive: boolean;
  paneId: string;
}

export const PaneContext = createContext<PaneContextValue>({
  width: 80,
  height: 24,
  isActive: false,
  paneId: "",
});

/** Hook to access current pane context */
export function usePaneContext(): PaneContextValue {
  return useContext(PaneContext);
}

/** Alias for usePaneContext for convenience */
export const usePane = usePaneContext;

// ============================================
// RESIZE HANDLE COMPONENT
// ============================================

interface ResizeHandleProps {
  direction: PaneDirection;
  color?: string;
  char?: string;
  isFocused?: boolean;
}

function ResizeHandle({ direction, color = "gray", char = "│", isFocused }: ResizeHandleProps) {
  const handleColor = isFocused ? "cyan" : color;
  const displayChar = direction === "horizontal" ? char : "─";

  return (
    <Box>
      <Text color={handleColor}>{displayChar}</Text>
    </Box>
  );
}

// ============================================
// COLLAPSED PANE HEADER
// ============================================

interface CollapsedPaneProps {
  config: PaneConfig;
  onToggle: () => void;
}

function CollapsedPane({ config, onToggle }: CollapsedPaneProps) {
  return (
    <Box
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
      width={3}
      flexDirection="column"
    >
      <Text dimColor bold>
        {config.label?.charAt(0) || "P"}
      </Text>
      <Text dimColor>
        {config.collapsed ? "▶" : "◀"}
      </Text>
    </Box>
  );
}

// ============================================
// PANE COMPONENT
// ============================================

interface PaneProps {
  config: PaneConfig;
  width: number;
  height: number;
  isActive: boolean;
  children: React.ReactNode;
  showHeader?: boolean;
}

function Pane({ config, width, height, isActive, children, showHeader = true }: PaneProps) {
  return (
    <PaneContext.Provider value={{ width, height, isActive, paneId: config.id }}>
      <Box
        flexDirection="column"
        width={width}
        height={height}
        borderStyle={isActive ? "double" : "single"}
        borderColor={isActive ? "cyan" : "gray"}
      >
        {/* Optional header */}
        {showHeader && config.label && (
          <Box paddingX={1} {...(isActive ? { backgroundColor: "cyan" } : {})}>
            <Text bold inverse={isActive} color={isActive ? "black" : "white"}>
              {config.label}
            </Text>
          </Box>
        )}

        {/* Content */}
        <Box flexGrow={1} overflow="hidden">
          {children}
        </Box>
      </Box>
    </PaneContext.Provider>
  );
}

// ============================================
// PANE MANAGER COMPONENT
// ============================================

export function PaneManager({
  direction = "horizontal",
  panes,
  children,
  activePane = 0,
  showHandles = true,
  handleChar = "│",
  handleColor = "gray",
  onPaneChange,
}: PaneManagerProps) {
  const { stdout } = useStdout();
  const totalWidth = stdout.columns || 80;
  const totalHeight = stdout.rows || 24;

  const [sizes, setSizes] = useState<number[]>(() =>
    panes.map(p => p.size)
  );
  const [collapsedPanes, setCollapsedPanes] = useState<Set<string>>(
    () => new Set(panes.filter(p => p.collapsed).map(p => p.id))
  );

  const containerRef = useRef<number>(0);

  // Calculate actual sizes
  const calculateSizes = useCallback(() => {
    const availableSpace = direction === "horizontal" ? totalWidth : totalHeight;
    const visiblePanes = panes.filter(p => !collapsedPanes.has(p.id));
    const handleCount = showHandles ? Math.max(0, visiblePanes.length - 1) : 0;
    const handleSpace = handleCount * 1; // 1 char per handle
    const usableSpace = availableSpace - handleSpace;

    const calculated: number[] = [];
    let remainingSpace = usableSpace;
    let percentTotal = 0;

    panes.forEach((pane, i) => {
      if (collapsedPanes.has(pane.id)) {
        calculated.push(3); // Collapsed width
        return;
      }

      const size = sizes[i] ?? pane.size;
      const unit = pane.sizeUnit ?? "percent";

      if (unit === "fixed") {
        calculated.push(size);
        remainingSpace -= size;
      } else {
        percentTotal += size;
      }
    });

    // Distribute remaining space by percentage
    let percentSpace = remainingSpace;
    panes.forEach((pane, i) => {
      if (collapsedPanes.has(pane.id)) return;
      if (pane.sizeUnit === "fixed") return;

      const size = sizes[i] ?? pane.size;
      const actualSize = Math.round((size / percentTotal) * percentSpace);

      // Apply min/max constraints
      const constrained = Math.max(
        pane.minSize ?? 10,
        Math.min(pane.maxSize ?? availableSpace, actualSize)
      );

      calculated[i] = constrained;
    });

    return calculated;
  }, [panes, sizes, collapsedPanes, direction, totalWidth, totalHeight, showHandles]);

  const actualSizes = calculateSizes();

  // Toggle pane collapse
  const togglePane = useCallback((paneId: string) => {
    setCollapsedPanes(prev => {
      const next = new Set(prev);
      if (next.has(paneId)) {
        next.delete(paneId);
      } else {
        next.add(paneId);
      }
      return next;
    });
  }, []);

  // Resize pane (keyboard-driven)
  const resizePane = useCallback((paneIndex: number, delta: number) => {
    setSizes(prev => {
      const next = [...prev];
      const currentSize = next[paneIndex] ?? panes[paneIndex]?.size ?? 50;
      const newSize = Math.max(
        panes[paneIndex]?.minSize ?? 10,
        Math.min(panes[paneIndex]?.maxSize ?? 90, currentSize + delta)
      );
      next[paneIndex] = newSize;
      onPaneChange?.(next);
      return next;
    });
  }, [panes, onPaneChange]);

  // Build layout
  const elements: React.ReactNode[] = [];
  let childIndex = 0;

  panes.forEach((pane, i) => {
    const isCollapsed = collapsedPanes.has(pane.id);
    const size = actualSizes[i] ?? 10;

    if (isCollapsed) {
      elements.push(
        <CollapsedPane
          key={pane.id}
          config={pane}
          onToggle={() => togglePane(pane.id)}
        />
      );
    } else {
      elements.push(
        <Pane
          key={pane.id}
          config={pane}
          width={direction === "horizontal" ? size : totalWidth}
          height={direction === "vertical" ? size : totalHeight}
          isActive={i === activePane}
        >
          {children[childIndex]}
        </Pane>
      );
      childIndex++;
    }

    // Add resize handle between panes
    if (showHandles && i < panes.length - 1 && !isCollapsed) {
      elements.push(
        <ResizeHandle
          key={`handle-${i}`}
          direction={direction}
          color={handleColor}
          char={handleChar}
          isFocused={i === activePane - 1 || i === activePane}
        />
      );
    }
  });

  return (
    <Box
      ref={containerRef as any}
      flexDirection={direction === "horizontal" ? "row" : "column"}
      width={totalWidth}
      height={totalHeight}
    >
      {elements}
    </Box>
  );
}

export default PaneManager;
