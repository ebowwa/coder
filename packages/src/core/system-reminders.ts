/**
 * System Reminders - Context injection for agent loop
 * Provides token warnings, cost tracking, tool summaries, and environment info
 */

import type {
  ToolUseBlock,
  GitStatus,
  UsageMetrics,
  TokenWarningOptions,
  CostUpdateOptions,
  ToolSummaryOptions,
  EnvInfoOptions,
  SystemReminderConfig,
} from "../schemas/index.js";
import { DEFAULT_REMINDER_CONFIG } from "../schemas/index.js";

// Re-export types for backward compatibility
export type {
  TokenWarningOptions,
  CostUpdateOptions,
  ToolSummaryOptions,
  EnvInfoOptions,
  SystemReminderConfig,
} from "../schemas/index.js";

// Re-export DEFAULT_REMINDER_CONFIG
export { DEFAULT_REMINDER_CONFIG } from "../schemas/index.js";

// Token limit thresholds
const TOKEN_THRESHOLDS = {
  WARNING: 0.8, // 80% - warning
  CRITICAL: 0.9, // 90% - critical
  EMERGENCY: 0.95, // 95% - emergency
} as const;

// ============================================
// TOKEN WARNING BUILDER
// ============================================

/**
 * Build a token usage warning message
 * @param current - Current token count
 * @param max - Maximum token limit
 * @param threshold - Optional custom threshold percentage
 * @returns Formatted warning string or empty string if under threshold
 */
export function buildTokenWarning(options: TokenWarningOptions): string {
  const { current, max, threshold = TOKEN_THRESHOLDS.WARNING } = options;

  if (max <= 0) {
    return "";
  }

  const percentage = current / max;

  // Only warn if above threshold
  if (percentage < threshold) {
    return "";
  }

  const remaining = max - current;
  const percentUsed = Math.round(percentage * 100);

  let severity: "warning" | "critical" | "emergency";
  let emoji: string;

  if (percentage >= TOKEN_THRESHOLDS.EMERGENCY) {
    severity = "emergency";
    emoji = "🚨";
  } else if (percentage >= TOKEN_THRESHOLDS.CRITICAL) {
    severity = "critical";
    emoji = "⚠️";
  } else {
    severity = "warning";
    emoji = "⚡";
  }

  const lines: string[] = [
    `${emoji} Token Usage ${severity.toUpperCase()}`,
    "",
    `Current: ${current.toLocaleString()} / ${max.toLocaleString()} tokens (${percentUsed}%)`,
    `Remaining: ${remaining.toLocaleString()} tokens`,
  ];

  if (severity === "emergency") {
    lines.push("");
    lines.push("Consider summarizing or compacting the conversation to continue.");
  } else if (severity === "critical") {
    lines.push("");
    lines.push("Approaching token limit. Consider wrapping up soon.");
  }

  return lines.join("\n");
}

// ============================================
// COST UPDATE BUILDER
// ============================================

/**
 * Build a cost tracking update message
 * @param cost - Current total cost in USD
 * @param previousCost - Previous cost for delta calculation
 * @param currency - Currency symbol (default: USD)
 * @returns Formatted cost update string
 */
export function buildCostUpdate(options: CostUpdateOptions): string {
  const { cost, previousCost = 0, currency = "USD" } = options;

  const currencySymbol = getCurrencySymbol(currency);
  const formattedCost = formatCurrency(cost, currencySymbol);
  const delta = cost - previousCost;
  const formattedDelta = formatCurrency(Math.abs(delta), currencySymbol);

  const lines: string[] = [
    `💰 Cost Update`,
    "",
    `Total: ${formattedCost} ${currency}`,
  ];

  if (delta !== 0) {
    const direction = delta > 0 ? "+" : "-";
    lines.push(`This turn: ${direction}${formattedDelta} ${currency}`);
  }

  return lines.join("\n");
}

/**
 * Format currency value with appropriate precision
 */
function formatCurrency(value: number, symbol: string): string {
  if (value < 0.01) {
    return `${symbol}${value.toFixed(4)}`;
  } else if (value < 1) {
    return `${symbol}${value.toFixed(3)}`;
  }
  return `${symbol}${value.toFixed(2)}`;
}

/**
 * Get currency symbol from currency code
 */
function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
  };
  return symbols[currency] || currency;
}

// ============================================
// TOOL SUMMARY BUILDER
// ============================================

/**
 * Build a summary of tool usage
 * @param tools - Array of tool use blocks
 * @param maxDisplay - Maximum number of tools to display (default: 10)
 * @returns Formatted tool summary string
 */
export function buildToolSummary(options: ToolSummaryOptions): string {
  const { tools, maxDisplay = 10 } = options;

  if (tools.length === 0) {
    return "No tools used this session.";
  }

  // Count tool usage
  const toolCounts = new Map<string, number>();
  for (const tool of tools) {
    const count = toolCounts.get(tool.name) || 0;
    toolCounts.set(tool.name, count + 1);
  }

  // Sort by usage count
  const sortedTools = [...toolCounts.entries()].sort((a, b) => b[1] - a[1]);

  const lines: string[] = [
    `🔧 Tool Usage Summary (${tools.length} total calls)`,
    "",
  ];

  const displayTools = sortedTools.slice(0, maxDisplay);
  for (const [name, count] of displayTools) {
    lines.push(`  • ${name}: ${count} call${count === 1 ? "" : "s"}`);
  }

  if (sortedTools.length > maxDisplay) {
    const remaining = sortedTools.length - maxDisplay;
    lines.push(`  ... and ${remaining} more tool${remaining === 1 ? "" : "s"}`);
  }

  return lines.join("\n");
}

// ============================================
// ENVIRONMENT INFO BUILDER
// ============================================

/**
 * Build environment information message
 * @param workingDirectory - Current working directory
 * @param gitStatus - Optional git status information
 * @param platform - Optional platform info
 * @param shell - Optional shell info
 * @returns Formatted environment info string
 */
export function buildEnvInfo(options: EnvInfoOptions): string {
  const {
    workingDirectory,
    gitStatus,
    platform = process.platform,
    shell = process.env.SHELL || "unknown",
  } = options;

  const lines: string[] = [
    "📍 Environment Information",
    "",
    `Working Directory: ${workingDirectory}`,
    `Platform: ${platform}`,
    `Shell: ${shell}`,
  ];

  if (gitStatus) {
    lines.push("");
    lines.push("Git Status:");
    lines.push(`  Branch: ${gitStatus.branch}`);

    if (gitStatus.ahead > 0 || gitStatus.behind > 0) {
      lines.push(`  Ahead: ${gitStatus.ahead}, Behind: ${gitStatus.behind}`);
    }

    const totalChanges =
      gitStatus.staged.length +
      gitStatus.unstaged.length +
      gitStatus.untracked.length +
      gitStatus.conflicted.length;

    if (totalChanges > 0) {
      lines.push(`  Changes: ${totalChanges} file${totalChanges === 1 ? "" : "s"}`);

      if (gitStatus.staged.length > 0) {
        lines.push(`    Staged: ${gitStatus.staged.length}`);
      }
      if (gitStatus.unstaged.length > 0) {
        lines.push(`    Unstaged: ${gitStatus.unstaged.length}`);
      }
      if (gitStatus.untracked.length > 0) {
        lines.push(`    Untracked: ${gitStatus.untracked.length}`);
      }
      if (gitStatus.conflicted.length > 0) {
        lines.push(`    Conflicted: ${gitStatus.conflicted.length}`);
      }
    } else {
      lines.push("  Working tree clean");
    }
  }

  return lines.join("\n");
}

// ============================================
// COMBINED REMINDER BUILDER
// ============================================

export interface CombinedReminderOptions {
  usage: UsageMetrics;
  /** Context window size (e.g. 200000), NOT per-request output limit (e.g. 4096) */
  contextWindow: number;
  totalCost: number;
  previousCost?: number;
  toolsUsed: ToolUseBlock[];
  workingDirectory: string;
  gitStatus?: GitStatus | null;
  turnNumber: number;
  config?: Partial<SystemReminderConfig>;
}

/**
 * Build a combined system reminder based on current state
 * Intelligently includes relevant reminders based on thresholds and intervals
 */
export function buildCombinedReminder(options: CombinedReminderOptions): string {
  const {
    usage,
    contextWindow,
    totalCost,
    previousCost,
    toolsUsed,
    workingDirectory,
    gitStatus,
    turnNumber,
    config: userConfig,
  } = options;

  const config = { ...DEFAULT_REMINDER_CONFIG, ...userConfig };
  const reminders: string[] = [];

  // Token warning against context window (not per-request output limit)
  const currentTokens = usage.input_tokens + usage.output_tokens;
  const tokenWarning = buildTokenWarning({
    current: currentTokens,
    max: contextWindow,
    threshold: config.tokenWarningThreshold,
  });
  if (tokenWarning) {
    reminders.push(tokenWarning);
  }

  // Cost update (on interval) - DISABLED if interval is 0
  if (config.costUpdateInterval > 0 && turnNumber % config.costUpdateInterval === 0) {
    const costUpdate = buildCostUpdate({
      cost: totalCost,
      previousCost,
    });
    reminders.push(costUpdate);
  }

  // Tool summary (on interval) - DISABLED if interval is 0
  if (config.toolSummaryInterval > 0 && turnNumber % config.toolSummaryInterval === 0 && toolsUsed.length > 0) {
    const toolSummary = buildToolSummary({ tools: toolsUsed });
    reminders.push(toolSummary);
  }

  // Environment info (first turn only)
  if (turnNumber === 1 && config.envInfoOnStart) {
    const envInfo = buildEnvInfo({
      workingDirectory,
      gitStatus,
    });
    reminders.push(envInfo);
  }

  if (reminders.length === 0) {
    return "";
  }

  return ["---", "System Reminders:", "", ...reminders, "---"].join("\n");
}

// ============================================
// REMINDER INJECTOR
// ============================================

/**
 * Inject system reminders into the conversation
 * This should be called before sending messages to the API
 */
export function injectSystemReminder(
  messages: Array<{ role: string; content: unknown }>,
  reminder: string
): void {
  if (!reminder || messages.length === 0) {
    return;
  }

  // Find the last user message and append the reminder
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message && message.role === "user") {
      // Append reminder to content
      if (typeof message.content === "string") {
        message.content = `${message.content}\n\n${reminder}`;
      } else if (Array.isArray(message.content)) {
        // Handle array content (tool results, etc.)
        // Add as a new text block at the end
        message.content.push({
          type: "text",
          text: `\n\n${reminder}`,
        });
      }
      break;
    }
  }
}
