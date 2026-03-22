/**
 * Status Line Component for Coder CLI
 *
 * Displays:
 * - Context left until auto-compact (%)
 * - Token count
 * - Permission mode (with cycle hint)
 * - Version number
 */

import chalk from "chalk";
import type { PermissionMode } from "../../../../schemas/index.js";
import {
  getContextWindow as getContextWindowBase,
  getModelDisplayName as getModelDisplayNameBase,
} from "../../../../core/models.js";
import { VERSION, BUILD_TIME } from "../../../../core/version.js";

// Re-export VERSION and BUILD_TIME for consumers
export { VERSION, BUILD_TIME };

// ============================================
// TYPES
// ============================================

export interface StatusLineOptions {
  /** Current permission mode */
  permissionMode: PermissionMode;
  /** Total tokens used in context */
  tokensUsed: number;
  /** Maximum context tokens */
  maxTokens: number;
  /** Current model */
  model: string;
  /** Is loading/spinning */
  isLoading?: boolean;
  /** Is in plan mode */
  isPlanMode?: boolean;
  /** Show verbose status */
  verbose?: boolean;
  /** Terminal width */
  terminalWidth?: number;
}

export interface ContextInfo {
  /** Percentage of context remaining (0-100) */
  percentRemaining: number;
  /** Human-readable token count */
  tokenDisplay: string;
  /** Whether auto-compact is imminent (< 10%) */
  isLow: boolean;
  /** Whether context is critical (< 5%) */
  isCritical: boolean;
}

// ============================================
// PERMISSION MODE DISPLAY
// ============================================

const permissionModeDisplay: Record<PermissionMode, { symbol: string; label: string; color: string }> = {
  default: { symbol: "○", label: "default", color: "gray" },
  ask: { symbol: "?", label: "ask", color: "yellow" },
  acceptEdits: { symbol: "●", label: "accept edits", color: "green" },
  bypassPermissions: { symbol: "⏵⏵", label: "bypass permissions", color: "yellow" },
  bypass: { symbol: "⏵", label: "bypass", color: "yellow" },
  plan: { symbol: "◐", label: "plan", color: "cyan" },
  dontAsk: { symbol: "■", label: "don't ask", color: "red" },
  interactive: { symbol: "◉", label: "interactive", color: "blue" },
  auto: { symbol: "◎", label: "auto", color: "green" },
};

/**
 * Get display info for a permission mode
 */
export function getPermissionModeDisplay(mode: PermissionMode): { symbol: string; label: string; color: string } {
  return permissionModeDisplay[mode] || permissionModeDisplay.default;
}

/**
 * Format permission mode with cycle hint
 */
export function formatPermissionMode(mode: PermissionMode): string {
  const display = getPermissionModeDisplay(mode);
  const colorFn = ((chalk as unknown) as Record<string, unknown>)[display.color] as ((s: string) => string) | undefined ?? chalk.gray;

  // Show cycle hint only for certain modes
  const cycleHint = mode === "bypassPermissions" || mode === "acceptEdits"
    ? chalk.dim(" (shift+tab to cycle)")
    : "";

  return `${colorFn(display.symbol)} ${colorFn(display.label + " on")}${cycleHint}`;
}

/**
 * Format permission mode without cycle hint (simplified)
 */
function formatPermissionModeSimple(mode: PermissionMode): string {
  const display = getPermissionModeDisplay(mode);
  const colorFn = ((chalk as unknown) as Record<string, unknown>)[display.color] as ((s: string) => string) | undefined ?? chalk.gray;
  return `${colorFn(display.symbol)} ${colorFn(display.label)}`;
}

// ============================================
// CONTEXT CALCULATIONS
// ============================================

/** Context window sizes by model */
const modelContextWindows: Record<string, number> = {
  "claude-opus-4-6": 200_000,
  "claude-sonnet-4-6": 200_000,
  "claude-haiku-4-5-20251001": 200_000,
  "claude-haiku-4-5": 200_000,
  "claude-opus-4-5": 200_000,
  "claude-sonnet-4-5": 200_000,
  "claude-3-5-sonnet": 200_000,
  "claude-3-opus": 200_000,
  "claude-3-sonnet": 200_000,
  "claude-3-haiku": 200_000,
  "glm-5": 200_000,  // GLM-5: 200K context, 128K max output
};

/** Default context window if model not found */
const DEFAULT_CONTEXT_WINDOW = 200_000;

/** Buffer percentage for auto-compact (compact when < 8% remaining) */
const AUTO_COMPACT_THRESHOLD = 0.08;

/**
 * Get the context window size for a model
 */
export function getContextWindow(model: string): number {
  // Check for exact match first
  if (modelContextWindows[model]) {
    return modelContextWindows[model];
  }

  // Check for partial matches (e.g., "opus" in model name)
  const modelLower = model.toLowerCase();
  for (const [key, value] of Object.entries(modelContextWindows)) {
    if (modelLower.includes(key.split("-")[1] ?? "")) {
      return value;
    }
  }

  return DEFAULT_CONTEXT_WINDOW;
}

/**
 * Calculate context information
 */
export function calculateContextInfo(tokensUsed: number, model: string): ContextInfo {
  const maxTokens = getContextWindow(model);
  const remaining = maxTokens - tokensUsed;
  const percentRemaining = Math.max(0, Math.min(100, (remaining / maxTokens) * 100));

  return {
    percentRemaining: Math.round(percentRemaining * 10) / 10,
    tokenDisplay: formatTokenCount(tokensUsed),
    isLow: percentRemaining < 15,
    isCritical: percentRemaining < 8,
  };
}

/**
 * Format token count for display
 */
export function formatTokenCount(tokens: number): string {
  if (tokens < 1000) {
    return `${tokens} tokens`;
  } else if (tokens < 1_000_000) {
    return `${(tokens / 1000).toFixed(1)}k tokens`;
  } else {
    return `${(tokens / 1_000_000).toFixed(2)}M tokens`;
  }
}

/**
 * Format context remaining percentage
 */
export function formatContextPercent(percentRemaining: number): string {
  if (percentRemaining < 5) {
    return chalk.red(`${percentRemaining.toFixed(1)}%`);
  } else if (percentRemaining < 15) {
    return chalk.yellow(`${percentRemaining.toFixed(1)}%`);
  } else if (percentRemaining < 30) {
    return chalk.dim(`${percentRemaining.toFixed(1)}%`);
  }
  return chalk.dim(`${percentRemaining.toFixed(1)}%`);
}

// ============================================
// STATUS LINE RENDERING
// ============================================

/**
 * Render the full status line
 * Simplified format: "○ default" (token info DISABLED - user is token rich)
 */
export function renderStatusLine(options: StatusLineOptions): string {
  const {
    permissionMode,
    isLoading = false,
    verbose = false,
  } = options;

  // Build status parts - DISABLED: context/tokens (user is token rich)
  const parts: string[] = [];

  // 1. Add permission mode
  parts.push(formatPermissionMode(permissionMode));

  // 2. Add version in verbose mode
  if (verbose) {
    parts.push(`currentVersion: ${VERSION}`);
  }

  // Join with comma-space
  let statusLine = parts.join(", ");

  // Add loading indicator
  if (isLoading) {
    statusLine = `${chalk.cyan("⠋")} ${statusLine}`;
  }

  return statusLine;
}

/**
 * Render a compact status line for narrow displays
 */
export function renderCompactStatusLine(options: StatusLineOptions): string {
  const { tokensUsed, model, isLoading = false } = options;
  const contextInfo = calculateContextInfo(tokensUsed, model);

  // Compact: "8% | 0 tokens"
  const parts = [
    formatContextPercent(contextInfo.percentRemaining),
    contextInfo.tokenDisplay.split(" ")[0] ?? "0", // Just the number
  ];

  let line = parts.join(chalk.dim(" | "));

  if (isLoading) {
    line = `${chalk.cyan("⠋")} ${line}`;
  }

  return line;
}

/**
 * Render minimal status (just context percentage)
 */
export function renderMinimalStatusLine(permissionMode: PermissionMode): string {
  // Just return empty or a simple indicator - permission mode no longer shown
  return "";
}

// ============================================
// AUTO-COMPACT WARNING (DISABLED - user is token rich)
// ============================================

/**
 * Check if auto-compact warning should be shown
 * DISABLED: User is token rich, no need for warnings
 */
export function shouldShowAutoCompactWarning(_contextInfo: ContextInfo): boolean {
  return false; // DISABLED
}

/**
 * Render auto-compact warning message
 * DISABLED: User is token rich, no need for warnings
 */
export function renderAutoCompactWarning(_contextInfo: ContextInfo): string {
  return ""; // DISABLED
}

// ============================================
// FOOTER STATUS
// ============================================

/**
 * Render footer status line (shown at bottom of screen)
 */
export function renderFooterStatus(options: StatusLineOptions): string {
  const { permissionMode, tokensUsed, model, isLoading = false } = options;
  const contextInfo = calculateContextInfo(tokensUsed, model);
  const permDisplay = getPermissionModeDisplay(permissionMode);
  const colorFn = ((chalk as unknown) as Record<string, unknown>)[permDisplay.color] as ((s: string) => string) | undefined ?? chalk.gray;

  // Build compact footer
  const contextStr = contextInfo.isCritical
    ? chalk.red(`${contextInfo.percentRemaining.toFixed(0)}%`)
    : contextInfo.isLow
      ? chalk.yellow(`${contextInfo.percentRemaining.toFixed(0)}%`)
      : chalk.dim(`${contextInfo.percentRemaining.toFixed(0)}%`);

  const permStr = `${colorFn(permDisplay.symbol)} ${permDisplay.label}`;

  const parts = [
    `Context: ${contextStr}`,
    permStr,
  ];

  let footer = parts.join(chalk.dim(" | "));

  if (isLoading) {
    footer = `${chalk.cyan("⠋")} ${footer}`;
  }

  return footer;
}

// ============================================
// MODEL DISPLAY
// ============================================

/**
 * Get display name for a model
 * Re-exports from models.ts for backwards compatibility
 */
export function getModelDisplayName(model: string): string {
  return getModelDisplayNameBase(model);
}

// ============================================
// EXPORTS
// ============================================

export default {
  VERSION,
  BUILD_TIME,
  renderStatusLine,
  renderCompactStatusLine,
  renderMinimalStatusLine,
  renderFooterStatus,
  renderAutoCompactWarning,
  calculateContextInfo,
  formatPermissionMode,
  formatTokenCount,
  formatContextPercent,
  getContextWindow,
  shouldShowAutoCompactWarning,
  getModelDisplayName,
  getPermissionModeDisplay,
};
