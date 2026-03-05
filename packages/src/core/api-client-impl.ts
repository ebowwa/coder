/**
 * API Client - SSE streaming for LLM APIs
 */

import type {
  Message,
  ContentBlock,
  ToolUseBlock,
  UsageMetrics,
  APIRequest,
  APIResponse,
  APITool,
  JSONSchema,
  CacheConfig,
  CacheControl,
  CacheMetrics,
  SystemBlock,
  ThinkingConfig,
  ExtendedThinkingConfig,
  EffortLevel,
  RedactedThinkingBlock,
  StopReason,
} from "../types/index.js";
import {
  DEFAULT_CACHE_CONFIG,
  calculateBudgetTokens,
  supportsExtendedThinking as supportsThinkingType,
  EFFORT_TO_BUDGET,
} from "../types/index.js";
import { withRetry, parseRetryAfter, type RetryOptions } from "./retry.js";
import {
  calculateCost as calculateModelCost,
  DEFAULT_MODEL,
  supportsExtendedThinking,
} from "./models.js";

export interface StreamOptions {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  tools?: APITool[];
  systemPrompt?: string | SystemBlock[];
  cacheConfig?: CacheConfig;
  /** Legacy thinking config (budget_tokens) */
  thinking?: ThinkingConfig;
  /** Extended thinking config (effort levels) */
  extendedThinking?: ExtendedThinkingConfig;
  onToken?: (text: string) => void;
  onThinking?: (thinking: string) => void;
  /** Called when redacted thinking is received (data is base64) */
  onRedactedThinking?: (data: string) => void;
  onToolUse?: (toolUse: { id: string; name: string; input: unknown }) => void;
  signal?: AbortSignal;
}

export interface StreamResult {
  message: APIResponse;
  usage: UsageMetrics;
  cacheMetrics?: CacheMetrics;
  costUSD: number;
  durationMs: number;
  ttftMs: number;
  /** Thinking tokens used (if extended thinking was enabled) */
  thinkingTokens?: number;
}

/**
 * Calculate cost for API usage including cache metrics
 * Delegates to models.ts for centralized pricing
 */
export function calculateCost(
  model: string,
  usage: UsageMetrics
): { costUSD: number; estimatedSavingsUSD: number } {
  return calculateModelCost(model, usage);
}

/**
 * Build system prompt with cache control
 */
export function buildSystemPrompt(
  systemPrompt: string | SystemBlock[] | undefined,
  cacheConfig: CacheConfig
): string | SystemBlock[] | undefined {
  if (!systemPrompt || !cacheConfig.enabled || !cacheConfig.cacheSystemPrompt) {
    return typeof systemPrompt === "string" ? systemPrompt : undefined;
  }

  // If already in block format, add cache_control to the last block
  if (Array.isArray(systemPrompt)) {
    const blocks = [...systemPrompt];
    if (blocks.length > 0) {
      const lastBlock = blocks[blocks.length - 1];
      if (lastBlock && lastBlock.type === "text") {
        blocks[blocks.length - 1] = {
          type: "text" as const,
          text: lastBlock.text,
          cache_control: { type: "ephemeral" as const, ttl: cacheConfig.ttl },
        };
      }
    }
    return blocks;
  }

  // Convert string to block format with cache_control
  return [
    {
      type: "text",
      text: systemPrompt,
      cache_control: { type: "ephemeral", ttl: cacheConfig.ttl },
    },
  ];
}

/**
 * Build messages with cache control for long context blocks
 */
export function buildCachedMessages(
  messages: Message[],
  cacheConfig: CacheConfig
): Message[] {
  if (!cacheConfig.enabled) {
    return messages;
  }

  const result: Message[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]!;

    // Convert string content to content blocks array
    const contentBlocks: ContentBlock[] = typeof msg.content === "string"
      ? [{ type: "text", text: msg.content }]
      : msg.content;

    const cachedContent: ContentBlock[] = [];

    for (let j = 0; j < contentBlocks.length; j++) {
      const block = contentBlocks[j]!;
      const isLastBlock = j === contentBlocks.length - 1;
      const isLastMessage = i === messages.length - 1;

      // Add cache_control to large text blocks (especially in user messages)
      if (
        block.type === "text" &&
        block.text.length >= cacheConfig.minTokensForCache * 4 && // Approximate chars per token
        !block.cache_control &&
        (isLastBlock || isLastMessage)
      ) {
        cachedContent.push({
          ...block,
          cache_control: { type: "ephemeral", ttl: cacheConfig.ttl },
        });
      } else {
        cachedContent.push(block);
      }
    }

    result.push({ ...msg, content: cachedContent });
  }

  // Ensure the last message has cache_control on its last content block
  if (result.length > 0 && cacheConfig.enabled) {
    const lastMsg = result[result.length - 1]!;
    const lastBlock = lastMsg.content[lastMsg.content.length - 1];
    if (lastBlock && !("cache_control" in lastBlock)) {
      lastMsg.content[lastMsg.content.length - 1] = {
        ...lastBlock,
        cache_control: { type: "ephemeral", ttl: cacheConfig.ttl },
      } as ContentBlock;
    }
  }

  return result;
}

/**
 * Calculate cache metrics from usage
 */
export function calculateCacheMetrics(usage: UsageMetrics): CacheMetrics {
  const cacheReadTokens = usage.cache_read_input_tokens ?? 0;
  const cacheWriteTokens = usage.cache_creation_input_tokens ?? 0;
  const totalCacheTokens = cacheReadTokens + cacheWriteTokens;

  const cacheHits = cacheReadTokens > 0 ? 1 : 0;
  const cacheMisses = cacheWriteTokens > 0 ? 1 : 0;
  const total = cacheHits + cacheMisses;

  return {
    cacheHits,
    cacheMisses,
    totalCacheReadTokens: cacheReadTokens,
    totalCacheWriteTokens: cacheWriteTokens,
    cacheHitRate: total > 0 ? cacheHits / total : 0,
    estimatedSavingsUSD: 0, // Will be calculated after pricing lookup
  };
}

/**
 * Create a streaming message request to Anthropic API
 */
export async function createMessageStream(
  messages: Message[],
  options: StreamOptions
): Promise<StreamResult> {
  const {
    apiKey,
    model = "claude-sonnet-4-6",
    maxTokens = 4096,
    tools,
    systemPrompt,
    cacheConfig = DEFAULT_CACHE_CONFIG,
    thinking,
    extendedThinking,
    onToken,
    onThinking,
    onRedactedThinking,
    onToolUse,
    signal,
  } = options;

  const startTime = Date.now();
  let ttft = 0;
  let firstToken = true;
  let totalThinkingTokens = 0;

  // Build cached messages
  const cachedMessages = buildCachedMessages(messages, cacheConfig);

  // Build system prompt with cache control
  const cachedSystemPrompt = buildSystemPrompt(systemPrompt, cacheConfig);

  // Build request
  const request: APIRequest = {
    model,
    max_tokens: maxTokens,
    messages: cachedMessages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    stream: true,
  };

  // Add system prompt if provided
  if (cachedSystemPrompt) {
    request.system = cachedSystemPrompt;
  }

  // Add tools if provided (with optional caching)
  if (tools && tools.length > 0) {
    request.tools = tools;
  }

  // Determine API endpoint (support custom base URL for GLM, etc.)
  const baseUrl = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
  const apiEndpoint = `${baseUrl}/v1/messages`;

  // Build headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
  };

  // Determine thinking configuration
  const shouldUseExtendedThinking =
    (extendedThinking?.enabled ?? false) ||
    (thinking && thinking.type !== "disabled");

  if (shouldUseExtendedThinking && supportsExtendedThinking(model)) {
    // Calculate budget tokens
    let budgetTokens: number;

    if (extendedThinking?.budgetTokens) {
      budgetTokens = extendedThinking.budgetTokens;
    } else if (thinking?.type === "enabled") {
      budgetTokens = thinking.budget_tokens;
    } else {
      // Use effort level to determine budget
      const effort = extendedThinking?.effort || "medium";
      budgetTokens = calculateBudgetTokens(
        {
          enabled: true,
          effort,
          modelMultiplier: model.includes("opus") ? 2 : 1,
        },
        model
      );
    }

    // Clamp budget to valid range
    budgetTokens = Math.max(1024, Math.min(budgetTokens, 100000));

    request.thinking = {
      type: "enabled",
      budget_tokens: budgetTokens,
    };

    // Add beta headers for extended thinking features
    const betaFeatures: string[] = ["extended-thinking-2025-01-24"];

    // Add interleaved thinking support if enabled
    if (extendedThinking?.interleaved !== false) {
      betaFeatures.push("interleaved-thinking-2025-01-24");
    }

    headers["anthropic-beta"] = betaFeatures.join(",");
  } else {
    // Default beta header
    headers["anthropic-beta"] = "max-tokens-3-5-sonnet-2024-07-15";
  }

  // Make API request with retry logic
  const retryOptions: RetryOptions = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    retryableStatusCodes: [429, 500, 502, 503, 504, 529],
    onRetry: (attempt, error, delayMs) => {
      console.log(`\x1b[33mAPI retry ${attempt}/3 after ${delayMs}ms: ${error.message}\x1b[0m`);
    },
  };

  const response = await withRetry(
    async () => {
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(request),
        signal,
      });

      // Throw for retryable status codes so withRetry can handle them
      if (!res.ok && retryOptions.retryableStatusCodes?.includes(res.status)) {
        const errorText = await res.text();
        throw new Error(`API error: ${res.status} - ${errorText}`);
      }

      return res;
    },
    retryOptions
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${response.status} - ${error}`);
  }

  if (!response.body) {
    throw new Error("No response body");
  }

  // Parse SSE stream
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let message: APIResponse | null = null;
  let currentContent: ContentBlock[] = [];
  let usage: UsageMetrics = { input_tokens: 0, output_tokens: 0 };
  let currentTextBlock: { type: "text"; text: string } | null = null;
  let currentThinkingBlock: { type: "thinking"; thinking: string } | null = null;
  let currentRedactedThinkingBlock: { type: "redacted_thinking"; data: string } | null = null;
  let currentToolUseBlock: ToolUseBlock | null = null;
  let toolUseInput = "";

  const buffer = "";

  try {
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;

        const data = line.slice(6);
        if (!data) continue;

        // Debug: Log all SSE data when debug enabled
        if (process.env.DEBUG_API === '1') {
          console.log('\x1b[90m[DEBUG] SSE data:\x1b[0m', data.substring(0, 200));
        }

        try {
          const event = JSON.parse(data) as Record<string, unknown>;

          // Debug: Log event types
          if (process.env.DEBUG_API === '1' && event.type) {
            console.log('\x1b[90m[DEBUG] SSE event type:\x1b[0m', event.type);
          }

          switch (event.type) {
            case "error": {
              // API returned an error - surface it
              const errorEvent = event as { error?: { type?: string; message?: string } };
              const errorMsg = errorEvent.error?.message || errorEvent.error?.type || "Unknown API error";
              console.error(`API error: ${errorMsg}`);
              // Include more details in debug mode
              if (process.env.DEBUG_API === '1') {
                console.log('\x1b[91m[DEBUG] API error event:', JSON.stringify(errorEvent, null, 255));
              }
              throw new Error(`API error: ${errorMsg}`);
            }

            case "message_start": {
              const msg = event.message as APIResponse;
              message = msg;
              usage = msg.usage;
              break;
            }

            case "content_block_start": {
              const block = (event as { content_block: Record<string, unknown> }).content_block;
              if (block.type === "text") {
                currentTextBlock = { type: "text", text: "" };
              } else if (block.type === "thinking") {
                currentThinkingBlock = { type: "thinking", thinking: "" };
              } else if (block.type === "redacted_thinking") {
                currentRedactedThinkingBlock = { type: "redacted_thinking", data: "" };
              } else if (block.type === "tool_use") {
                currentToolUseBlock = {
                  type: "tool_use",
                  id: block.id as string,
                  name: block.name as string,
                  input: {},
                };
                toolUseInput = "";
              }
              break;
            }

            case "content_block_delta": {
              const delta = (event as { delta: Record<string, unknown> }).delta;
              if (delta.type === "text_delta" && currentTextBlock) {
                const text = delta.text as string;
                currentTextBlock.text += text;
                onToken?.(text);

                if (firstToken) {
                  ttft = Date.now() - startTime;
                  firstToken = false;
                }
              } else if (delta.type === "thinking_delta" && currentThinkingBlock) {
                const thinking = delta.thinking as string;
                currentThinkingBlock.thinking += thinking;
                onThinking?.(thinking);
                totalThinkingTokens += Math.ceil(thinking.length / 4); // Rough estimate
              } else if (delta.type === "redacted_thinking_delta" && currentRedactedThinkingBlock) {
                // Handle redacted thinking deltas
                const redactedData = delta.data as string;
                currentRedactedThinkingBlock.data += redactedData;
                onRedactedThinking?.(redactedData);
                totalThinkingTokens += Math.ceil(redactedData.length / 4); // Rough estimate
              } else if (delta.type === "input_json_delta" && currentToolUseBlock) {
                toolUseInput += delta.partial_json as string;
              }
              break;
            }

            case "content_block_stop": {
              // content_block_stop event has { index: number }, not the block itself
              // We need to check which current block is active and push it
              if (currentTextBlock !== null) {
                currentContent.push(currentTextBlock);
                currentTextBlock = null;
              } else if (currentThinkingBlock !== null) {
                currentContent.push(currentThinkingBlock);
                currentThinkingBlock = null;
              } else if (currentRedactedThinkingBlock !== null) {
                currentContent.push(currentRedactedThinkingBlock);
                onRedactedThinking?.(currentRedactedThinkingBlock.data);
                currentRedactedThinkingBlock = null;
              } else if (currentToolUseBlock !== null) {
                try {
                  currentToolUseBlock.input = JSON.parse(toolUseInput);
                } catch {
                  currentToolUseBlock.input = {};
                }
                currentContent.push(currentToolUseBlock);
                onToolUse?.({
                  id: currentToolUseBlock.id,
                  name: currentToolUseBlock.name,
                  input: currentToolUseBlock.input,
                });
                currentToolUseBlock = null;
                toolUseInput = "";
              }
              break;
            }

            case "message_delta": {
              const evt = event as { usage?: { output_tokens: number }; delta?: { stop_reason: string } };
              if (evt.usage) {
                usage.output_tokens = evt.usage.output_tokens;
              }
              if (message && evt.delta?.stop_reason) {
                message.stop_reason = evt.delta.stop_reason as "end_turn" | "max_tokens" | "stop_sequence" | "tool_use";
              }
              break;
            }

            case "message_stop":
              // Message complete
              break;

            // OpenAI/Z.AI compatible format (for GLM-5, etc.)
            // OpenAI streaming sends chunks with choices array
            default: {
              // Check for OpenAI format: { choices: [{ delta: { content: "..." } }], usage: {...} }
              if (event.choices && Array.isArray(event.choices)) {
                const choice = event.choices[0] as { delta?: { content?: string }; finish_reason?: string } | undefined;
                if (choice?.delta?.content) {
                  const text = choice.delta.content;
                  if (currentTextBlock) {
                    currentTextBlock.text += text;
                  } else {
                    currentTextBlock = { type: "text", text };
                  }
                  onToken?.(text);
                  if (firstToken) {
                    ttft = Date.now() - startTime;
                    firstToken = false;
                  }
                }
                // Check for finish
                if (choice?.finish_reason) {
                  if (currentTextBlock) {
                    currentContent.push(currentTextBlock);
                    currentTextBlock = null;
                  }
                  if (!message) {
                    message = {
                      id: `msg-${Date.now()}`,
                      type: "message",
                      role: "assistant",
                      content: currentContent,
                      model: model,
                      stop_reason: (choice.finish_reason === "stop" ? "end_turn" : choice.finish_reason === "length" ? "max_tokens" : "end_turn") as StopReason,
                      stop_sequence: null,
                      usage: { input_tokens: 0, output_tokens: 0 },
                    };
                  } else {
                    message.stop_reason = (choice.finish_reason === "stop" ? "end_turn" : choice.finish_reason === "length" ? "max_tokens" : "end_turn") as StopReason;
                  }
                }
              }
              // OpenAI usage format (often in final chunk)
              if (event.usage) {
                const openaiUsage = event.usage as { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
                usage.input_tokens = openaiUsage.prompt_tokens || 0;
                usage.output_tokens = openaiUsage.completion_tokens || 0;
              }
              break;
            }
          }
        } catch (err: unknown) {
          // Log the parse error with more detail
          if (process.env.DEBUG_API === '1') {
            console.error('\x1b[91m[DEBUG] JSON parse error:', err);
            console.error('\x1b[91m[DEBUG] Error parsing SSE data:', data.substring(0, 200));
            console.error('\x1b[91m[DEBUG] Original buffer:', buffer.substring(0, 500));
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!message) {
    // If we received content via OpenAI format but no message_start, create a message
    if (currentContent.length > 0) {
      message = {
        id: `msg-${Date.now()}`,
        type: "message",
        role: "assistant",
        content: currentContent,
        model: model,
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 0, output_tokens: 0 },
      };
    } else {
      // Debug: Log what we did receive
      if (process.env.DEBUG_API === '1') {
        console.log('\x1b[91m[DEBUG] No message_start event received. Buffer:\x1b[0m', buffer.substring(0, 500));
      }
      throw new Error("No message received from API");
    }
  }

  message.content = currentContent;

  // Calculate cost and cache metrics
  const { costUSD, estimatedSavingsUSD } = calculateCost(model, usage);
  const cacheMetrics = calculateCacheMetrics(usage);
  cacheMetrics.estimatedSavingsUSD = estimatedSavingsUSD;

  const durationMs = Date.now() - startTime;

  return {
    message,
    usage,
    cacheMetrics,
    costUSD,
    durationMs,
    ttftMs: ttft || durationMs,
    thinkingTokens: totalThinkingTokens,
  };
}

// Re-export types
export type { StreamOptions as StreamOptionsType, StreamResult as StreamResultType };
