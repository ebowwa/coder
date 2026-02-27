/**
 * Agent Loop - Turn-based processing system
 * Based on Claude Code binary analysis
 */

import type {
  AgentState,
  ContentBlock,
  Message,
  StopReason,
  ToolDefinition,
  ToolResult,
  ToolResultBlock,
  ToolUseBlock,
  QueryMetrics,
  ContextSnapshot,
  PermissionMode,
  APITool,
  GitStatus,
  TextBlock,
  CacheConfig,
  CacheMetrics,
  ThinkingConfig,
  ExtendedThinkingConfig,
} from "../types/index.js";
import { DEFAULT_CACHE_CONFIG } from "../types/index.js";
import { createMessageStream, type StreamResult } from "./api-client.js";
import {
  buildCombinedReminder,
  type SystemReminderConfig,
  DEFAULT_REMINDER_CONFIG,
} from "./system-reminders.js";
import {
  PermissionManager,
  type PermissionRequest,
  type PermissionResult,
} from "./permissions.js";
import {
  needsCompaction,
  compactMessages,
  estimateMessagesTokens,
  type CompactionResult,
  getCompactionStats,
} from "./context-compaction.js";

export interface AgentLoopOptions {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  systemPrompt: string;
  tools: ToolDefinition[];
  permissionMode: PermissionMode;
  workingDirectory: string;
  gitStatus?: GitStatus | null;
  reminderConfig?: Partial<SystemReminderConfig>;
  cacheConfig?: CacheConfig;
  /** Legacy thinking config (budget_tokens) */
  thinking?: ThinkingConfig;
  /** Extended thinking config with effort levels */
  extendedThinking?: ExtendedThinkingConfig;
  /** Enable extended thinking mode */
  extendedThinkingEnabled?: boolean;
  /** Effort level for extended thinking */
  extendedThinkingEffort?: "low" | "medium" | "high" | "max";
  /** Enable interleaved thinking */
  extendedThinkingInterleaved?: boolean;
  onText?: (text: string) => void;
  onThinking?: (thinking: string) => void;
  onToolUse?: (toolUse: { id: string; name: string; input: unknown }) => void;
  onToolResult?: (result: { id: string; result: ToolResult }) => void;
  onMetrics?: (metrics: QueryMetrics) => void;
  onReminder?: (reminder: string) => void;
  onPermissionRequest?: (request: PermissionRequest) => Promise<PermissionResult>;
  signal?: AbortSignal;
}

export interface AgentLoopResult {
  messages: Message[];
  metrics: QueryMetrics[];
  totalCost: number;
  totalDuration: number;
  totalCacheMetrics: CacheMetrics;
  compactionCount: number;
  totalTokensCompacted: number;
}

export async function agentLoop(
  initialMessages: Message[],
  options: AgentLoopOptions
): Promise<AgentLoopResult> {
  const {
    apiKey,
    model = "claude-sonnet-4-6",
    maxTokens = 4096,
    systemPrompt,
    tools,
    permissionMode,
    workingDirectory,
    gitStatus = null,
    reminderConfig,
    cacheConfig = DEFAULT_CACHE_CONFIG,
    thinking,
    extendedThinking,
    onText,
    onThinking,
    onToolUse,
    onToolResult,
    onMetrics,
    onReminder,
    onPermissionRequest,
    signal,
  } = options;

  // Initialize permission manager
  const permissionManager = new PermissionManager(
    permissionMode,
    onPermissionRequest
  );

  const messages: Message[] = [...initialMessages];
  const metrics: QueryMetrics[] = [];
  const allToolsUsed: ToolUseBlock[] = [];
  let totalCost = 0;
  let totalDuration = 0;
  let turnNumber = 0;
  let previousCost = 0;
  let compactionCount = 0;
  let totalTokensCompacted = 0;

  // Cache metrics tracking
  const totalCacheMetrics: CacheMetrics = {
    cacheHits: 0,
    cacheMisses: 0,
    totalCacheReadTokens: 0,
    totalCacheWriteTokens: 0,
    cacheHitRate: 0,
    estimatedSavingsUSD: 0,
  };

  const mergedReminderConfig = { ...DEFAULT_REMINDER_CONFIG, ...reminderConfig };

  let shouldContinue = true;

  while (shouldContinue) {
    if (signal?.aborted) {
      break;
    }

    turnNumber++;

    // Build system reminder for this turn
    const latestMetrics = metrics[metrics.length - 1];
    const reminder = buildCombinedReminder({
      usage: latestMetrics?.usage ?? {
        input_tokens: 0,
        output_tokens: 0,
      },
      maxTokens,
      totalCost,
      previousCost,
      toolsUsed: allToolsUsed,
      workingDirectory,
      gitStatus,
      turnNumber,
      config: mergedReminderConfig,
    });

    if (reminder) {
      onReminder?.(reminder);
    }

    // Proactive compaction check - compact BEFORE hitting the limit
    if (needsCompaction(messages, maxTokens)) {
      const compactionResult = await compactMessages(messages, maxTokens, {
        keepFirst: 0,  // Don't preserve first message - summary covers it
        keepLast: 3,   // Only keep last 3 messages for more aggressive compaction
        preserveToolPairs: true,
      });

      // Only apply compaction if it actually saved tokens
      if (compactionResult.didCompact && compactionResult.tokensAfter < compactionResult.tokensBefore) {
        // Replace messages array content
        messages.length = 0;
        messages.push(...compactionResult.messages);

        compactionCount++;
        const tokensSaved = compactionResult.tokensBefore - compactionResult.tokensAfter;
        totalTokensCompacted += tokensSaved;

        const stats = getCompactionStats(compactionResult);
        console.log(`Context compacted: ${stats.reductionPercent}% reduction, ${stats.tokensSaved} tokens saved`);
      }
    }

    // Build API messages with system reminders
    const apiMessages = buildAPIMessages(messages, systemPrompt, reminder);

    // Create streaming request
    const streamResult = await createMessageStream(apiMessages, {
      apiKey,
      model,
      maxTokens,
      systemPrompt,
      cacheConfig,
      thinking,
      extendedThinking,
      tools: tools.map((t): APITool => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema,
      })),
      onToken: onText,
      onThinking,
      onToolUse,
      signal,
    });

    const { message, usage, cacheMetrics, costUSD, durationMs, ttftMs } = streamResult;

    // Track metrics
    const queryMetrics: QueryMetrics = {
      model,
      messageCount: messages.length,
      messageTokens: usage.input_tokens + usage.output_tokens,
      usage,
      cacheMetrics,
      durationMs,
      ttftMs,
      costUSD,
      stopReason: message.stop_reason,
      requestId: message.id,
    };

    metrics.push(queryMetrics);
    previousCost = totalCost;
    totalCost += costUSD;
    totalDuration += durationMs;

    // Aggregate cache metrics
    if (cacheMetrics) {
      totalCacheMetrics.cacheHits += cacheMetrics.cacheHits;
      totalCacheMetrics.cacheMisses += cacheMetrics.cacheMisses;
      totalCacheMetrics.totalCacheReadTokens += cacheMetrics.totalCacheReadTokens;
      totalCacheMetrics.totalCacheWriteTokens += cacheMetrics.totalCacheWriteTokens;
      totalCacheMetrics.estimatedSavingsUSD += cacheMetrics.estimatedSavingsUSD;
    }

    // Update cache hit rate
    const totalCacheOps = totalCacheMetrics.cacheHits + totalCacheMetrics.cacheMisses;
    totalCacheMetrics.cacheHitRate = totalCacheOps > 0
      ? totalCacheMetrics.cacheHits / totalCacheOps
      : 0;

    onMetrics?.(queryMetrics);

    // Add assistant message to history
    messages.push({
      role: "assistant",
      content: message.content,
    });

    // Check stop reason
    if (message.stop_reason === "end_turn" || message.stop_reason === "stop_sequence") {
      shouldContinue = false;
      break;
    }

    if (message.stop_reason === "max_tokens") {
      // Context window limit reached - compact and continue
      const compactionResult = await compactMessages(messages, maxTokens, {
        keepFirst: 0,  // Don't preserve first message
        keepLast: 3,   // More aggressive - only keep last 3
        preserveToolPairs: true,
      });

      // Only apply if it actually saved tokens
      if (compactionResult.didCompact && compactionResult.tokensAfter < compactionResult.tokensBefore) {
        // Replace messages array content
        messages.length = 0;
        messages.push(...compactionResult.messages);

        compactionCount++;
        const tokensSaved = compactionResult.tokensBefore - compactionResult.tokensAfter;
        totalTokensCompacted += tokensSaved;

        const stats = getCompactionStats(compactionResult);
        console.log(`Context compacted: ${stats.reductionPercent}% reduction, ${stats.tokensSaved} tokens saved`);

        // Continue the loop with compacted context
        continue;
      } else {
        // Could not compact further or compaction didn't help, must stop
        shouldContinue = false;
        break;
      }
    }

    // Handle tool use
    const toolUseBlocks = message.content.filter(
      (block): block is ToolUseBlock => block.type === "tool_use"
    );

    // Track all tools used for summary
    allToolsUsed.push(...toolUseBlocks);

    if (toolUseBlocks.length === 0) {
      shouldContinue = false;
      break;
    }

    // Execute tools in parallel and collect results
    const toolResults: ToolResultBlock[] = [];

    // Check for abort before starting parallel execution
    if (signal?.aborted) {
      // Return empty results if aborted
    } else {
      // Map each tool use to an async operation
      const toolExecutions = toolUseBlocks.map(async (toolUse) => {
        const tool = tools.find((t) => t.name === toolUse.name);

        if (!tool) {
          return {
            toolUseId: toolUse.id,
            result: {
              type: "tool_result" as const,
              tool_use_id: toolUse.id,
              content: `Error: Unknown tool "${toolUse.name}"`,
              is_error: true,
            },
            toolResult: null as { id: string; result: ToolResult } | null,
          };
        }

        // Check permissions using PermissionManager
        const permissionResult = await permissionManager.checkPermission(
          tool.name,
          toolUse.input as Record<string, unknown>
        );

        if (permissionResult.decision === "deny" || permissionResult.decision === "denyAlways") {
          return {
            toolUseId: toolUse.id,
            result: {
              type: "tool_result" as const,
              tool_use_id: toolUse.id,
              content: `Permission denied for tool "${toolUse.name}"${permissionResult.reason ? `: ${permissionResult.reason}` : ""}`,
              is_error: true,
            },
            toolResult: null as { id: string; result: ToolResult } | null,
          };
        }

        // Execute tool
        try {
          const handlerResult = await tool.handler(toolUse.input as Record<string, unknown>, {
            workingDirectory,
            permissionMode,
            abortSignal: signal,
          });

          return {
            toolUseId: toolUse.id,
            result: {
              type: "tool_result" as const,
              tool_use_id: toolUse.id,
              content: handlerResult.content,
              is_error: handlerResult.is_error,
            },
            toolResult: {
              id: toolUse.id,
              result: handlerResult,
            },
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            toolUseId: toolUse.id,
            result: {
              type: "tool_result" as const,
              tool_use_id: toolUse.id,
              content: `Error: ${errorMessage}`,
              is_error: true,
            },
            toolResult: null as { id: string; result: ToolResult } | null,
          };
        }
      });

      // Execute all tools in parallel
      const executionResults = await Promise.all(toolExecutions);

      // Collect results in original order
      for (const executionResult of executionResults) {
        toolResults.push(executionResult.result);
        if (executionResult.toolResult) {
          onToolResult?.(executionResult.toolResult);
        }
      }
    }

    // Add tool results as user message
    messages.push({
      role: "user",
      content: toolResults,
    });

    // Continue loop to process tool results
  }

  return {
    messages,
    metrics,
    totalCost,
    totalDuration,
    totalCacheMetrics,
    compactionCount,
    totalTokensCompacted,
  };
}

function buildAPIMessages(
  messages: Message[],
  systemPrompt: string,
  systemReminder?: string
): Message[] {
  // In a full implementation, this would:
  // 1. Apply prompt caching
  // 2. Handle context compaction
  // 3. Add system reminders

  // If we have a system reminder, inject it into the last user message
  if (systemReminder && messages.length > 0) {
    const result = [...messages];
    // Find the last user message
    for (let i = result.length - 1; i >= 0; i--) {
      const msg = result[i];
      if (msg && msg.role === "user") {
        // Clone the message to avoid mutating original
        const updatedMessage: Message = {
          role: "user",
          content: Array.isArray(msg.content)
            ? injectReminderIntoContent(msg.content, systemReminder)
            : [{ type: "text" as const, text: `${String(msg.content)}\n\n${systemReminder}` }],
        };
        result[i] = updatedMessage;
        break;
      }
    }
    return result;
  }

  return messages;
}

/**
 * Inject system reminder into content blocks
 */
function injectReminderIntoContent(
  content: ContentBlock[],
  reminder: string
): ContentBlock[] {
  // Check if the last block is a text block we can append to
  if (content.length > 0) {
    const lastBlock = content[content.length - 1];
    if (lastBlock && lastBlock.type === "text") {
      // Append to existing text block
      const textBlock: TextBlock = {
        type: "text",
        text: `${lastBlock.text}\n\n${reminder}`,
      };
      return [...content.slice(0, -1), textBlock];
    }
  }

  // Add as new text block
  const newBlock: TextBlock = { type: "text", text: `\n\n${reminder}` };
  return [...content, newBlock];
}

function checkPermission(toolName: string, mode: PermissionMode): boolean {
  switch (mode) {
    case "bypassPermissions":
      return true;
    case "dontAsk":
      return false;
    case "acceptEdits":
      // Allow file operations
      return ["Read", "Write", "Edit", "Glob", "Grep"].includes(toolName);
    case "interactive":
    case "default":
    case "plan":
      // In a full implementation, this would prompt the user
      return true;
    default:
      return true;
  }
}

/**
 * Format cost for display
 */
export function formatCost(costUSD: number): string {
  if (costUSD < 0.01) {
    return `$${costUSD.toFixed(4)}`;
  }
  return `$${costUSD.toFixed(2)}`;
}

/**
 * Format metrics for display
 */
export function formatMetrics(metrics: QueryMetrics): string {
  const cost = formatCost(metrics.costUSD);
  const tokens = `${metrics.usage.input_tokens.toLocaleString()} input, ${metrics.usage.output_tokens.toLocaleString()} output`;

  // Include cache info if available
  if (metrics.usage.cache_read_input_tokens || metrics.usage.cache_creation_input_tokens) {
    const cacheRead = metrics.usage.cache_read_input_tokens?.toLocaleString() ?? "0";
    const cacheWrite = metrics.usage.cache_creation_input_tokens?.toLocaleString() ?? "0";
    return `Cost: ${cost} | Tokens: ${tokens} | Cache: ${cacheRead} read, ${cacheWrite} write`;
  }

  return `Cost: ${cost} | Tokens: ${tokens}`;
}

/**
 * Format brief cost for per-turn display (less verbose)
 */
export function formatCostBrief(metrics: QueryMetrics): string {
  const cost = formatCost(metrics.costUSD);
  const totalTokens = metrics.usage.input_tokens + metrics.usage.output_tokens;
  return `Cost: ${cost} | Tokens: ${totalTokens.toLocaleString()}`;
}

/**
 * Format cache metrics for display
 */
export function formatCacheMetrics(cacheMetrics: CacheMetrics): string {
  const savings = formatCost(cacheMetrics.estimatedSavingsUSD);
  const hitRate = (cacheMetrics.cacheHitRate * 100).toFixed(1);
  return `Cache: ${hitRate}% hit rate | ${cacheMetrics.totalCacheReadTokens.toLocaleString()} read | ${cacheMetrics.totalCacheWriteTokens.toLocaleString()} written | Saved: ${savings}`;
}
