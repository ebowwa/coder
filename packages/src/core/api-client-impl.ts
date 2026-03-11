/**
 * API Client - SSE streaming for LLM APIs
 *
 * Supports multiple providers:
 * - Zhipu (Z.AI / GLM models) - OpenAI format
 * - MiniMax (M2.5) - Anthropic format
 * - OpenAI (future)
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
import {
  resolveProvider,
  getProviderForModel,
  recordProviderSuccess,
  recordProviderFailure,
  type ProviderName,
  type ProviderConfig,
} from "./providers/index.js";

/**
 * Convert Anthropic-style tools to OpenAI-style tools
 * Anthropic: { name, description, input_schema }
 * OpenAI: { type: "function", function: { name, description, parameters } }
 */
function convertToolsToOpenAIFormat(tools: APITool[]): unknown[] {
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  }));
}

/**
 * OpenAI-format message types
 */
interface OpenAIToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

interface OpenAIMessage {
  role: "user" | "assistant" | "tool" | "system";
  content: string | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
  name?: string;
}

/**
 * Convert Anthropic-style messages to OpenAI-style messages
 *
 * Key conversions:
 * 1. Assistant messages with tool_use → add tool_calls array
 * 2. User messages with tool_result → separate role: "tool" messages
 *
 * This is required because OpenAI-format APIs (Zhipu, etc.) don't understand
 * Anthropic's tool_result content block type.
 */
function convertMessagesToOpenAIFormat(messages: Message[]): OpenAIMessage[] {
  const result: OpenAIMessage[] = [];

  for (const msg of messages) {
    if (msg.role === "assistant") {
      // Assistant message - check for tool_use blocks
      const toolCalls: OpenAIToolCall[] = [];
      const textParts: string[] = [];

      for (const block of msg.content) {
        if (block.type === "text") {
          textParts.push(block.text);
        } else if (block.type === "tool_use") {
          toolCalls.push({
            id: block.id,
            type: "function",
            function: {
              name: block.name,
              arguments: JSON.stringify(block.input),
            },
          });
        } else if (block.type === "thinking" || block.type === "redacted_thinking") {
          // Skip thinking blocks in OpenAI format (not supported)
        }
      }

      const openAIMsg: OpenAIMessage = {
        role: "assistant",
        content: textParts.join("\n") || null,
      };

      if (toolCalls.length > 0) {
        openAIMsg.tool_calls = toolCalls;
      }

      result.push(openAIMsg);
    } else if (msg.role === "user") {
      // User message - check for tool_result blocks
      const textParts: string[] = [];
      const toolResults: { tool_use_id: string; content: string; is_error?: boolean }[] = [];

      for (const block of msg.content) {
        if (block.type === "text") {
          textParts.push(block.text);
        } else if (block.type === "tool_result") {
          // Extract content as string
          const contentStr = typeof block.content === "string"
            ? block.content
            : block.content.map(c => c.type === "text" ? c.text : JSON.stringify(c)).join("\n");
          toolResults.push({
            tool_use_id: block.tool_use_id,
            content: contentStr,
            is_error: block.is_error,
          });
        }
      }

      // Add text content as user message if present
      if (textParts.length > 0) {
        result.push({
          role: "user",
          content: textParts.join("\n"),
        });
      }

      // Add each tool result as a separate "tool" role message
      for (const tr of toolResults) {
        result.push({
          role: "tool",
          tool_call_id: tr.tool_use_id,
          content: tr.content,
        });
      }
    }
  }

  return result;
}

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
  /** Called when a retry is about to start - UI should reset streaming state */
  onRetryStart?: () => void;
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
 * Callbacks to emit during streaming (passed in, not buffered)
 */
interface StreamCallbacks {
  onToken?: (text: string) => void;
  onThinking?: (thinking: string) => void;
  onRedactedThinking?: (data: string) => void;
  onToolUse?: (toolUse: { id: string; name: string; input: unknown }) => void;
  onRetryStart?: () => void;
}

/**
 * Internal result from a single stream attempt
 */
interface StreamAttemptResult {
  message: APIResponse | null;
  content: ContentBlock[];
  usage: UsageMetrics;
  thinkingTokens: number;
  ttftMs: number;
}

/**
 * Execute a single streaming API attempt
 * Emits callbacks in real-time for streaming display
 */
async function executeStreamAttempt(
  request: APIRequest,
  headers: Record<string, string>,
  apiEndpoint: string,
  signal: AbortSignal | undefined,
  model: string,
  retryableStatusCodes: number[],
  startTime: number,
  callbacks: StreamCallbacks
): Promise<StreamAttemptResult> {
  const response = await fetch(apiEndpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(request),
    signal,
  });

  // Throw for retryable status codes so withRetry can handle them
  if (!response.ok) {
    const errorText = await response.text();
    if (retryableStatusCodes.includes(response.status)) {
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }
    throw new Error(`API error: ${response.status} - ${errorText}`);
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

  let ttft = 0;
  let firstToken = true;
  let totalThinkingTokens = 0;

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
                callbacks.onToken?.(text); // Emit in real-time

                if (firstToken) {
                  ttft = Date.now() - startTime;
                  firstToken = false;
                }
              } else if (delta.type === "thinking_delta" && currentThinkingBlock) {
                const thinking = delta.thinking as string;
                currentThinkingBlock.thinking += thinking;
                callbacks.onThinking?.(thinking); // Emit in real-time
                totalThinkingTokens += Math.ceil(thinking.length / 4);
              } else if (delta.type === "redacted_thinking_delta" && currentRedactedThinkingBlock) {
                const redactedData = delta.data as string;
                currentRedactedThinkingBlock.data += redactedData;
                callbacks.onRedactedThinking?.(redactedData); // Emit in real-time
                totalThinkingTokens += Math.ceil(redactedData.length / 4);
              } else if (delta.type === "input_json_delta" && currentToolUseBlock) {
                toolUseInput += delta.partial_json as string;
              }
              break;
            }

            case "content_block_stop": {
              if (currentTextBlock !== null) {
                currentContent.push(currentTextBlock);
                currentTextBlock = null;
              } else if (currentThinkingBlock !== null) {
                currentContent.push(currentThinkingBlock);
                currentThinkingBlock = null;
              } else if (currentRedactedThinkingBlock !== null) {
                currentContent.push(currentRedactedThinkingBlock);
                currentRedactedThinkingBlock = null;
              } else if (currentToolUseBlock !== null) {
                try {
                  currentToolUseBlock.input = JSON.parse(toolUseInput);
                } catch {
                  currentToolUseBlock.input = {};
                }
                currentContent.push(currentToolUseBlock);
                callbacks.onToolUse?.({
                  id: currentToolUseBlock.id,
                  name: currentToolUseBlock.name,
                  input: currentToolUseBlock.input,
                }); // Emit in real-time
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
              break;

            // OpenAI/Z.AI compatible format (for GLM-5, etc.)
            default: {
              if (event.choices && Array.isArray(event.choices)) {
                const choice = event.choices[0] as {
                  delta?: {
                    content?: string;
                    tool_calls?: Array<{
                      id?: string;
                      index?: number;
                      function?: {
                        name?: string;
                        arguments?: string;
                      };
                    }>;
                  };
                  finish_reason?: string;
                } | undefined;

                // Handle text content
                if (choice?.delta?.content) {
                  const text = choice.delta.content;
                  if (currentTextBlock) {
                    currentTextBlock.text += text;
                  } else {
                    currentTextBlock = { type: "text", text };
                  }
                  callbacks.onToken?.(text); // Emit in real-time
                  if (firstToken) {
                    ttft = Date.now() - startTime;
                    firstToken = false;
                  }
                }

                // Handle tool calls (OpenAI format)
                if (choice?.delta?.tool_calls && Array.isArray(choice.delta.tool_calls)) {
                  for (const toolCallDelta of choice.delta.tool_calls) {
                    const index = toolCallDelta.index ?? 0;
                    const toolCallId = toolCallDelta.id;

                    // Start a new tool call if we got an ID
                    if (toolCallId) {
                      // Finalize any existing tool use block at this index
                      if (currentToolUseBlock) {
                        try {
                          currentToolUseBlock.input = JSON.parse(toolUseInput);
                        } catch {
                          currentToolUseBlock.input = {};
                        }
                        currentContent.push(currentToolUseBlock);
                        callbacks.onToolUse?.({
                          id: currentToolUseBlock.id,
                          name: currentToolUseBlock.name,
                          input: currentToolUseBlock.input,
                        });
                      }

                      // Start new tool use block
                      currentToolUseBlock = {
                        type: "tool_use",
                        id: toolCallId,
                        name: toolCallDelta.function?.name || "",
                        input: {},
                      };
                      toolUseInput = "";

                      if (firstToken) {
                        ttft = Date.now() - startTime;
                        firstToken = false;
                      }
                    }

                    // Accumulate arguments for current tool call
                    if (toolCallDelta.function?.arguments && currentToolUseBlock) {
                      toolUseInput += toolCallDelta.function.arguments;
                    }
                  }
                }

                // Handle finish reason
                if (choice?.finish_reason) {
                  // DEBUG: Log finish reason
                  console.log(`[API] OpenAI finish_reason: ${choice.finish_reason}, content blocks: ${currentContent.length}, hasToolUse: ${!!currentToolUseBlock}`);

                  // Finalize any pending text block
                  if (currentTextBlock) {
                    currentContent.push(currentTextBlock);
                    currentTextBlock = null;
                  }

                  // Finalize any pending tool use block
                  if (currentToolUseBlock) {
                    try {
                      currentToolUseBlock.input = JSON.parse(toolUseInput);
                    } catch {
                      currentToolUseBlock.input = {};
                    }
                    currentContent.push(currentToolUseBlock);
                    callbacks.onToolUse?.({
                      id: currentToolUseBlock.id,
                      name: currentToolUseBlock.name,
                      input: currentToolUseBlock.input,
                    });
                    currentToolUseBlock = null;
                    toolUseInput = "";
                  }

                  // Map finish reasons
                  let stopReason: StopReason = "end_turn";
                  if (choice.finish_reason === "tool_calls" || choice.finish_reason === "function_call") {
                    stopReason = "tool_use";
                  } else if (choice.finish_reason === "length") {
                    stopReason = "max_tokens";
                  } else if (choice.finish_reason === "stop") {
                    stopReason = "end_turn";
                  }

                  if (!message) {
                    message = {
                      id: `msg-${Date.now()}`,
                      type: "message",
                      role: "assistant",
                      content: currentContent,
                      model: model,
                      stop_reason: stopReason,
                      stop_sequence: null,
                      usage: { input_tokens: 0, output_tokens: 0 },
                    };
                  } else {
                    message.stop_reason = stopReason;
                  }
                }
              }
              if (event.usage) {
                const openaiUsage = event.usage as { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
                usage.input_tokens = openaiUsage.prompt_tokens || 0;
                usage.output_tokens = openaiUsage.completion_tokens || 0;
              }
              break;
            }
          }
        } catch (err: unknown) {
          // Only rethrow if it's an API error, not a JSON parse error
          if (err instanceof Error && err.message.startsWith("API error:")) {
            throw err;
          }
          if (process.env.DEBUG_API === '1') {
            console.error('\x1b[91m[DEBUG] JSON parse error:', err);
            console.error('\x1b[91m[DEBUG] Error parsing SSE data:', data.substring(0, 200));
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Handle "No message received" case - this is retryable
  if (!message) {
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
      // This is a transient error - throw to trigger retry
      throw new Error("No message received from API");
    }
  }

  return {
    message,
    content: currentContent,
    usage,
    thinkingTokens: totalThinkingTokens,
    ttftMs: ttft,
  };
}

/**
 * Create a streaming message request to Anthropic API
 * Full retry support including stream parsing errors
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
    onRetryStart,
    signal,
  } = options;

  const startTime = Date.now();

  // Resolve provider FIRST to determine API format
  const providerInfo = resolveProvider(model);

  // Determine API endpoint and headers based on provider
  let apiEndpoint: string;
  let headers: Record<string, string>;
  let apiFormat: "anthropic" | "openai";

  if (providerInfo) {
    // Use provider-specific configuration
    apiEndpoint = providerInfo.endpoint;
    apiFormat = providerInfo.config.format;

    if (apiFormat === "anthropic") {
      // Anthropic/MiniMax format
      headers = {
        "Content-Type": "application/json",
        [providerInfo.config.authHeader]: providerInfo.apiKey,
        "anthropic-version": "2023-06-01",
      };
    } else {
      // OpenAI/Zhipu format
      headers = {
        "Content-Type": "application/json",
        [providerInfo.config.authHeader]: `Bearer ${providerInfo.apiKey}`,
      };
    }
  } else {
    // Fallback to environment-based configuration (legacy)
    const baseUrl = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
    apiEndpoint = `${baseUrl}/v1/messages`;
    apiFormat = "anthropic";

    headers = {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    };
  }

  // Build cached messages
  const cachedMessages = buildCachedMessages(messages, cacheConfig);

  // Build system prompt with cache control
  const cachedSystemPrompt = buildSystemPrompt(systemPrompt, cacheConfig);

  // Build request with format-appropriate message conversion
  let requestMessages: unknown;
  if (apiFormat === "openai") {
    // Convert to OpenAI format (handles tool_use and tool_result properly)
    const openAIMessages = convertMessagesToOpenAIFormat(cachedMessages);

    // Add system prompt as first message for OpenAI format
    if (cachedSystemPrompt) {
      const systemText = typeof cachedSystemPrompt === "string"
        ? cachedSystemPrompt
        : cachedSystemPrompt.map(b => b.text).join("\n\n");
      requestMessages = [
        { role: "system", content: systemText },
        ...openAIMessages,
      ];
    } else {
      requestMessages = openAIMessages;
    }
  } else {
    // Keep Anthropic format
    requestMessages = cachedMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
  }

  // Build request
  const request: APIRequest = {
    model,
    max_tokens: maxTokens,
    messages: requestMessages as Message[],
    stream: true,
  };

  if (cachedSystemPrompt && apiFormat === "anthropic") {
    // Anthropic format uses separate system field
    // OpenAI format already has system as first message
    request.system = cachedSystemPrompt;
  }

  // Set tools with format conversion if needed
  if (tools && tools.length > 0) {
    if (apiFormat === "openai") {
      // Convert Anthropic-style tools to OpenAI format
      // Cast needed because OpenAI format differs from APITool
      const openaiTools = convertToolsToOpenAIFormat(tools);
      (request as unknown as Record<string, unknown>).tools = openaiTools;
      // DEBUG: Log tools being sent
      console.log(`[API] Sending ${tools.length} tools to ${apiFormat} API:`, JSON.stringify(openaiTools).substring(0, 500));
    } else {
      // Keep Anthropic format as-is
      request.tools = tools;
      console.log(`[API] Sending ${tools.length} tools to ${apiFormat} API (Anthropic format)`);
    }
  } else {
    console.log(`[API] No tools being sent to API`);
  }

  const shouldUseExtendedThinking =
    (extendedThinking?.enabled ?? false) ||
    (thinking && thinking.type !== "disabled");

  if (shouldUseExtendedThinking && supportsExtendedThinking(model)) {
    let budgetTokens: number;

    if (extendedThinking?.budgetTokens) {
      budgetTokens = extendedThinking.budgetTokens;
    } else if (thinking?.type === "enabled") {
      budgetTokens = thinking.budget_tokens;
    } else {
      const effort = extendedThinking?.effort || "medium";
      budgetTokens = calculateBudgetTokens(
        { enabled: true, effort, modelMultiplier: model.includes("opus") ? 2 : 1 },
        model
      );
    }

    budgetTokens = Math.max(1024, Math.min(budgetTokens, 100000));

    request.thinking = { type: "enabled", budget_tokens: budgetTokens };

    const betaFeatures: string[] = ["extended-thinking-2025-01-24"];
    if (extendedThinking?.interleaved !== false) {
      betaFeatures.push("interleaved-thinking-2025-01-24");
    }
    headers["anthropic-beta"] = betaFeatures.join(",");
  } else if (apiFormat === "anthropic") {
    headers["anthropic-beta"] = "max-tokens-3-5-sonnet-2024-07-15";
  }

  // Retry options - now covers entire stream parsing
  const retryOptions: RetryOptions = {
    maxRetries: 10,
    baseDelayMs: 1000,
    maxDelayMs: 60000,
    retryableStatusCodes: [429, 500, 502, 503, 504, 529],
    onRetry: (attempt, error, delayMs) => {
      console.log(`\x1b[33mAPI retry ${attempt}/10 after ${delayMs}ms: ${error.message}\x1b[0m`);
      // Notify UI to reset streaming state before retry
      onRetryStart?.();
      // Track provider failure on retry
      const providerName = getProviderForModel(model);
      if (providerName) {
        recordProviderFailure(providerName);
      }
    },
  };

  // Execute with retry - wraps entire fetch + stream parsing
  // Callbacks are emitted in real-time during streaming
  const result = await withRetry(
    () => executeStreamAttempt(
      request,
      headers,
      apiEndpoint,
      signal,
      model,
      retryOptions.retryableStatusCodes ?? [],
      startTime,
      { onToken, onThinking, onRedactedThinking, onToolUse }
    ),
    retryOptions
  );

  // Build final message
  const message = result.message!;
  message.content = result.content;

  // Calculate cost and cache metrics
  const { costUSD, estimatedSavingsUSD } = calculateCost(model, result.usage);
  const cacheMetrics = calculateCacheMetrics(result.usage);
  cacheMetrics.estimatedSavingsUSD = estimatedSavingsUSD;

  const durationMs = Date.now() - startTime;

  // Track provider health on success
  const providerName = getProviderForModel(model);
  if (providerName) {
    recordProviderSuccess(providerName, durationMs);
  }

  return {
    message,
    usage: result.usage,
    cacheMetrics,
    costUSD,
    durationMs,
    ttftMs: result.ttftMs || durationMs,
    thinkingTokens: result.thinkingTokens,
  };
}

// Re-export types
export type { StreamOptions as StreamOptionsType, StreamResult as StreamResultType };
