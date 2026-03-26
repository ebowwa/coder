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
  JSONSchemaType,
  CacheConfig,
  CacheControl,
  CacheMetrics,
  SystemBlock,
  ThinkingConfig,
  ExtendedThinkingConfig,
  EffortLevel,
  RedactedThinkingBlock,
  StopReason,
  StreamOptions,
  StreamResult,
} from "../schemas/index.js";
import {
  DEFAULT_CACHE_CONFIG,
  calculateBudgetTokens,
  supportsExtendedThinking as supportsThinkingType,
  EFFORT_TO_BUDGET,
} from "../schemas/index.js";
import { withRetry, parseRetryAfter, type RetryOptions } from "./retry.js";
import {
  calculateCost as calculateModelCost,
  DEFAULT_MODEL,
  supportsExtendedThinking,
  getModel,
  getBackupModel,
  getBackupApiKey,
  getBackupBaseUrl,
  isBackupModelAvailable,
  BACKUP_MODEL_MAX_ATTEMPTS,
} from "./models.js";
import { createLogger } from "./logger.js";
import { createRepetitionDetector, type RepetitionDetectorOptions } from "./repetition-detector.js";

const logger = createLogger("[API]");

// Re-export types for backward compatibility
export type { StreamOptions, StreamResult } from "../schemas/index.js";

// Backup model attempt counter (module-level for tracking across calls)
let backupModelAttempts = 0;

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
        cacheConfig.minTokensForCache !== undefined &&
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
    if (lastBlock && typeof lastBlock === "object" && !("cache_control" in lastBlock)) {
      // Create new array with updated last block instead of mutating
      const updatedContent: ContentBlock[] = [...lastMsg.content] as ContentBlock[];
      updatedContent[updatedContent.length - 1] = {
        ...lastBlock,
        cache_control: { type: "ephemeral", ttl: cacheConfig.ttl },
      } as ContentBlock;
      result[result.length - 1] = { ...lastMsg, content: updatedContent };
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
    cacheReadTokens,
    cacheWriteTokens,
    totalCacheReadTokens: cacheReadTokens,
    totalCacheWriteTokens: cacheWriteTokens,
    cacheHitRate: total > 0 ? cacheHits / total : 0,
    estimatedSavingsUSD: 0, // Will be calculated after pricing lookup
  };
}

/**
 * Create a streaming message request to Anthropic API
 */
// Default timeout for API requests (2 minutes)
const DEFAULT_API_TIMEOUT_MS = 120_000;

export async function createMessageStream(
  messages: Message[],
  options: StreamOptions
): Promise<StreamResult> {
  const {
    apiKey,
    model = DEFAULT_MODEL,
    maxTokens = 4096,
    tools,
    apiFormat: providedApiFormat,
    systemPrompt,
    cacheConfig = DEFAULT_CACHE_CONFIG,
    thinking,
    extendedThinking,
    onToken,
    onThinking,
    onRedactedThinking,
    onToolUse,
    signal: externalSignal,
    enableRepetitionDetection = true,
    onRepetitionDetected,
  } = options;

  // Create internal AbortController with timeout
  const internalController = new AbortController();
  const timeoutMs = options.timeout ?? DEFAULT_API_TIMEOUT_MS;
  const timeoutId = setTimeout(() => {
    console.error(`\x1b[31m[API] Request timed out after ${timeoutMs / 1000}s\x1b[0m`);
    internalController.abort();
  }, timeoutMs);

  // Chain external signal if provided
  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timeoutId);
      internalController.abort();
    } else {
      externalSignal.addEventListener("abort", () => {
        clearTimeout(timeoutId);
        internalController.abort();
      });
    }
  }
  const signal = internalController.signal;

  // Determine apiFormat from model provider if not explicitly provided
  const modelDefForFormat = getModel(model);
  const apiFormat = providedApiFormat ?? (modelDefForFormat?.provider === "anthropic" ? "anthropic" : "openai");

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

    // Add tool_choice if specified (important for models like GLM that need explicit tool forcing)
    // Note: We cast to avoid type issues - Anthropic accepts different tool_choice formats
    if (options.toolChoice) {
      const req = request as unknown as Record<string, unknown>;
      if (options.toolChoice === "auto" || options.toolChoice === "required" || options.toolChoice === "none") {
        req.tool_choice = { type: options.toolChoice };
      } else {
        // Specific tool name
        req.tool_choice = { type: "function", function: { name: options.toolChoice } };
      }
    }
  }

  // Add stop sequences if provided
  if (options.stopSequences && options.stopSequences.length > 0) {
    request.stop_sequences = options.stopSequences;
  }

  // Determine API endpoint (support custom base URL for GLM, MiniMax, OpenRouter, etc.)
  // Priority: options.baseUrl > modelDefForFormat.baseUrl > env var > default
  const baseUrl = options.baseUrl
    || modelDefForFormat?.baseUrl
    || process.env.ANTHROPIC_BASE_URL
    || "https://api.anthropic.com";
  const apiEndpoint = apiFormat === "openai"
    ? `${baseUrl}/chat/completions`
    : `${baseUrl}/v1/messages`;

  // Build headers based on API format
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (apiFormat === "openai") {
    // OpenAI-compatible format (GLM, etc.)
    headers["Authorization"] = `Bearer ${apiKey}`;
  } else {
    // Anthropic format
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
  }

  // Convert request to OpenAI format if needed
  // OpenAI message format allows "system" role which Message type doesn't
  interface OpenAIMessage {
    role: "system" | "user" | "assistant" | "tool";
    content: string;
  }

  let openaiRequest: Record<string, unknown> | undefined;
  if (apiFormat === "openai") {
    // Convert Anthropic-style request to OpenAI format
    const openaiMessages: OpenAIMessage[] = [];
    openaiRequest = {
      model: request.model,
      max_tokens: request.max_tokens,
      messages: openaiMessages,
      stream: true,
    };

    // Add system prompt as first message if present
    if (request.system) {
      const systemContent = typeof request.system === "string"
        ? request.system
        : request.system.map(b => b.text).join("\n");
      openaiMessages.push({
        role: "system",
        content: systemContent,
      });
    }

    // Convert messages
    for (const msg of request.messages) {
      openaiMessages.push({
        role: msg.role,
        content: typeof msg.content === "string"
          ? msg.content
          : msg.content.map(b => b.type === "text" ? b.text : JSON.stringify(b)).join(""),
      });
    }

    // Convert tools to OpenAI format
    if (request.tools && request.tools.length > 0) {
      openaiRequest.tools = request.tools.map((t) => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: t.input_schema,
        },
      }));

      // Convert tool_choice
      if (request.tool_choice) {
        const tc = request.tool_choice as { type: string; function?: { name: string } };
        if (tc.type === "auto" || tc.type === "required" || tc.type === "none") {
          openaiRequest.tool_choice = tc.type;
        } else if (tc.function) {
          openaiRequest.tool_choice = { type: "function", function: tc.function };
        }
      }
    }

    // Debug: Log tool count for OpenAI format
    if (process.env.DEBUG_API === '1') {
      const toolCount = (openaiRequest.tools as unknown[])?.length || 0;
      console.log(`\x1b[90m[DEBUG] OpenAI format: ${toolCount} tools, endpoint: ${apiEndpoint}\x1b[0m`);
    }
  }

  // Determine thinking configuration
  const shouldUseExtendedThinking =
    (extendedThinking?.enabled ?? false) ||
    (thinking && thinking.type !== "disabled");

  if (shouldUseExtendedThinking && supportsExtendedThinking(model)) {
    // Calculate budget tokens
    let budgetTokens: number;

    if (extendedThinking?.budgetTokens) {
      budgetTokens = extendedThinking.budgetTokens;
    } else if (thinking?.type === "enabled" && thinking.budget_tokens !== undefined) {
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

  // Try main model first, then backup model if available and main fails
  let response: Response;
  let usedBackupModel = false;

  try {
    // Make API request with retry logic - 10 retries with fixed 15 second delay
    const retryOptions: RetryOptions = {
      maxRetries: 10,
      baseDelayMs: 15000,
      maxDelayMs: 15000, // Fixed delay - same as base
      jitterFactor: 0, // No jitter - fixed delay
      retryableStatusCodes: [429, 500, 502, 503, 504, 529],
      onRetry: (attempt, error, delayMs) => {
        console.warn(`API retry ${attempt}/10 after 15s: ${error.message}`);
      },
    };

    response = await withRetry(
      async () => {
        const res = await fetch(apiEndpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(apiFormat === "openai" ? openaiRequest : request),
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
  } catch (mainError) {
    // Main model failed - try backup model if available
    const backupModel = getBackupModel();
    const canUseBackup = backupModel && backupModelAttempts < BACKUP_MODEL_MAX_ATTEMPTS;

    if (backupModel && canUseBackup) {
      console.log(`\x1b[33mMain model failed, attempting backup model: ${backupModel}\x1b[0m`);
      console.log(`\x1b[33mBackup model attempt ${backupModelAttempts + 1}/${BACKUP_MODEL_MAX_ATTEMPTS}\x1b[0m`);

      usedBackupModel = true;
      backupModelAttempts++;

      // Get backup model info
      const backupModelDef = getModel(backupModel);
      if (!backupModelDef) {
        throw new Error(`Backup model ${backupModel} not found in model registry`);
      }

      // Build backup endpoint URL - use backup-specific base URL if provided
      const backupBaseUrl = getBackupBaseUrl() || backupModelDef.baseUrl || baseUrl;
      const backupApiFormat = backupModelDef.provider === "anthropic" ? "anthropic" : "openai";
      const backupEndpoint = backupApiFormat === "openai"
        ? `${backupBaseUrl}/chat/completions`
        : `${backupBaseUrl}/v1/messages`;

      // Use backup-specific API key if provided, otherwise fall back to main API key
      const backupApiKey = getBackupApiKey() || apiKey;

      // Build backup headers
      const backupHeaders: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (backupApiFormat === "openai") {
        backupHeaders["Authorization"] = `Bearer ${backupApiKey}`;
      } else {
        backupHeaders["x-api-key"] = backupApiKey;
        backupHeaders["anthropic-version"] = "2023-06-01";
      }

      // Update request with backup model
      const backupRequest =
        backupApiFormat === "openai"
          ? { ...openaiRequest, model: backupModel }
          : { ...request, model: backupModel };

      const backupRetryOptions: RetryOptions = {
        maxRetries: 10, // Same retry count as primary
        baseDelayMs: 15000,
        maxDelayMs: 15000, // Fixed delay - same as base
        jitterFactor: 0, // No jitter - fixed delay
        retryableStatusCodes: [429, 500, 502, 503, 504, 529],
        onRetry: (attempt, error, delayMs) => {
          console.log(
            `\x1b[33mBackup model retry ${attempt}/10 after 15s: ${error.message}\x1b[0m`
          );
        },
      };

      response = await withRetry(
        async () => {
          const res = await fetch(backupEndpoint, {
            method: "POST",
            headers: backupHeaders,
            body: JSON.stringify(backupApiFormat === "openai" ? backupRequest : request),
            signal,
          });

          if (!res.ok && backupRetryOptions.retryableStatusCodes?.includes(res.status)) {
            const errorText = await res.text();
            throw new Error(`Backup API error: ${res.status} - ${errorText}`);
          }

          return res;
        },
        backupRetryOptions
      );

      console.log(`Backup model succeeded`);
    } else {
      // No backup model available or attempts exhausted
      if (backupModel && !canUseBackup) {
        console.warn(
          `\x1b[33mBackup model available but max attempts (${BACKUP_MODEL_MAX_ATTEMPTS}) exhausted\x1b[0m`
        );
      }
      clearTimeout(timeoutId);
      throw mainError;
    }
  }

  if (!response.ok) {
    const error = await response.text();
    clearTimeout(timeoutId);
    throw new Error(`API error: ${response.status} - ${error}`);
  }

  if (!response.body) {
    clearTimeout(timeoutId);
    throw new Error("No response body");
  }

  if (usedBackupModel) {
    console.log(
      `\x1b[36m⚠ Used backup model for this request. ${BACKUP_MODEL_MAX_ATTEMPTS - backupModelAttempts} backup attempts remaining this session.\x1b[0m`
    );
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

  // Initialize repetition detector
  const repetitionDetector = enableRepetitionDetection
    ? createRepetitionDetector({
        maxConsecutiveRepeats: 3,
        windowSize: 150,
        minPhraseLength: 15,
        debug: process.env.DEBUG_REPETITION === "1",
      })
    : null;
  let repetitionDetected = false;
  let repetitionPhrase = "";
  let repetitionCount = 0;

  try {
    let buffer = "";

    while (true) {
      // Early exit if repetition was detected
      if (repetitionDetected) {
        if (process.env.DEBUG_REPETITION === "1") {
          console.log(`\x1b[33m[RepetitionDetector] Stopping stream due to repetition: "${repetitionPhrase}"\x1b[0m`);
        }
        break;
      }
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;

        const data = line.slice(6);
        if (!data) continue;

        // Handle OpenAI-format [DONE] marker - this signals end of stream
        if (data === "[DONE]" || data.trim() === "[DONE]") {
          if (process.env.DEBUG_API === '1') {
            console.log('\x1b[90m[DEBUG] SSE stream complete [DONE]\x1b[0m');
          }
          continue;
        }

        // Debug: Log all SSE data when debug enabled
        if (process.env.DEBUG_API === '1') {
          console.log('\x1b[90m[DEBUG] SSE data:\x1b[0m', data.substring(0, 200));
        }

        try {
          const event = JSON.parse(data) as Record<string, unknown>;

          // Debug: Log event types
          if (process.env.DEBUG_API === '1' && event.type) {
            console.debug('SSE event type:', event.type);
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

                // Check for repetition
                if (repetitionDetector && currentTextBlock.text.length > 50) {
                  const result = repetitionDetector.process(text);
                  if (result.detected && result.phrase) {
                    repetitionDetected = true;
                    repetitionPhrase = result.phrase;
                    repetitionCount = result.count || 0;

                    // Notify callback if provided
                    const shouldStop = onRepetitionDetected?.(result.phrase, repetitionCount);
                    if (shouldStop === false) {
                      // Callback returned false, continue anyway
                      repetitionDetected = false;
                    }
                  }
                }

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
                const choice = event.choices[0] as {
                  delta?: {
                    content?: string;
                    tool_calls?: Array<{
                      id?: string;
                      type?: string;
                      index?: number;
                      function?: {
                        name?: string;
                        arguments?: string;
                      };
                    }>;
                  };
                  finish_reason?: string;
                } | undefined;

                if (choice?.delta?.content) {
                  const text = choice.delta.content;
                  if (currentTextBlock) {
                    currentTextBlock.text += text;
                  } else {
                    currentTextBlock = { type: "text", text };
                  }
                  onToken?.(text);

                  // Check for repetition (OpenAI format)
                  if (repetitionDetector && currentTextBlock.text.length > 50) {
                    const result = repetitionDetector.process(text);
                    if (result.detected && result.phrase) {
                      repetitionDetected = true;
                      repetitionPhrase = result.phrase;
                      repetitionCount = result.count || 0;

                      // Notify callback if provided
                      const shouldStop = onRepetitionDetected?.(result.phrase, repetitionCount);
                      if (shouldStop === false) {
                        repetitionDetected = false;
                      }
                    }
                  }

                  if (firstToken) {
                    ttft = Date.now() - startTime;
                    firstToken = false;
                  }
                }

                // Handle reasoning_content (GLM-5, DeepSeek, etc. thinking tokens)
                // These models may output thinking in reasoning_content field
                if ((choice?.delta as { reasoning_content?: string })?.reasoning_content) {
                  const reasoning = (choice?.delta as { reasoning_content?: string })?.reasoning_content ?? "";
                  if (currentThinkingBlock) {
                    currentThinkingBlock.thinking += reasoning;
                  } else {
                    currentThinkingBlock = { type: "thinking", thinking: reasoning };
                  }
                  onThinking?.(reasoning);
                  if (firstToken) {
                    ttft = Date.now() - startTime;
                    firstToken = false;
                  }
                }

                // Handle OpenAI tool_calls in streaming format (GLM, OpenAI, etc.)
                if (choice?.delta?.tool_calls && Array.isArray(choice.delta.tool_calls)) {
                  for (const toolCallDelta of choice.delta.tool_calls) {
                    const index = toolCallDelta.index ?? 0;
                    const toolCallId = toolCallDelta.id;

                    // New tool call - create the block
                    if (toolCallId && toolCallDelta.function?.name) {
                      // Finalize previous tool use block if exists
                      if (currentToolUseBlock) {
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
                        toolUseInput = "";
                      }

                      // Create new tool use block
                      currentToolUseBlock = {
                        type: "tool_use",
                        id: toolCallId,
                        name: toolCallDelta.function.name,
                        input: {},
                      };
                      toolUseInput = toolCallDelta.function.arguments || "";
                      if (firstToken) {
                        ttft = Date.now() - startTime;
                        firstToken = false;
                      }
                    }
                    // Continuation of tool call - accumulate arguments
                    else if (toolCallDelta.function?.arguments && currentToolUseBlock) {
                      toolUseInput += toolCallDelta.function.arguments;
                    }
                  }
                }

                // Check for finish
                if (choice?.finish_reason) {
                  if (currentThinkingBlock) {
                    currentContent.push(currentThinkingBlock);
                    currentThinkingBlock = null;
                  }
                  if (currentTextBlock) {
                    currentContent.push(currentTextBlock);
                    currentTextBlock = null;
                  }
                  // Finalize any pending tool use block (OpenAI format)
                  if (currentToolUseBlock) {
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
                  // Map OpenAI finish_reason to Anthropic stop_reason
                  // OpenAI: "stop", "length", "tool_calls", "content_filter"
                  // Anthropic: "end_turn", "max_tokens", "stop_sequence", "tool_use"
                  let stopReason: StopReason;
                  if (choice.finish_reason === "stop") {
                    stopReason = "end_turn";
                  } else if (choice.finish_reason === "length") {
                    stopReason = "max_tokens";
                  } else if (choice.finish_reason === "tool_calls") {
                    stopReason = "tool_use";  // CRITICAL: Must map to tool_use for agent loop to continue
                  } else {
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
    clearTimeout(timeoutId);
  }

  // Handle repetition detection - finalize content and set stop reason
  if (repetitionDetected && currentTextBlock) {
    // Push any remaining content
    currentContent.push(currentTextBlock);
    currentTextBlock = null;

    // Log the detection
    console.log(
      `\x1b[33m[RepetitionDetector] Stopped stream - detected repeat: "${repetitionPhrase.slice(0, 50)}..." (x${repetitionCount})\x1b[0m`
    );
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
        console.debug('No message_start event received. Buffer:', buffer.substring(0, 500));
      }
      throw new Error("No message received from API");
    }
  }

  message.content = currentContent;

  // Override stop_reason if repetition was detected
  if (repetitionDetected) {
    message.stop_reason = "stop_sequence"; // Treat as stop_sequence to signal early termination
  }

  // Fallback: estimate tokens if API didn't return usage (e.g., OpenAI-compatible APIs like Z.AI)
  if (usage.input_tokens === 0 && usage.output_tokens === 0) {
    // Estimate output tokens from response content
    const outputText = currentContent
      .map((block) => {
        if (block.type === "text") return block.text;
        if (block.type === "tool_use") return JSON.stringify(block.input);
        if (block.type === "thinking") return block.thinking;
        return "";
      })
      .join("");
    usage.output_tokens = Math.ceil(outputText.length / 4); // ~4 chars per token

    // Estimate input tokens from request messages (rough estimate)
    // We don't have access to original messages here, so use a reasonable default
    usage.input_tokens = Math.max(100, usage.output_tokens * 2); // Rough estimate
  }

  // Calculate cost and cache metrics
  const { costUSD, estimatedSavingsUSD } = calculateCost(model, usage);
  const cacheMetrics = calculateCacheMetrics(usage);
  cacheMetrics.estimatedSavingsUSD = estimatedSavingsUSD;

  const durationMs = Date.now() - startTime;

  // Cleanup timeout
  clearTimeout(timeoutId);

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

/**
 * Get backup model usage statistics for the current session
 */
export function getBackupModelStats(): { attempts: number; maxAttempts: number } {
  return {
    attempts: backupModelAttempts,
    maxAttempts: BACKUP_MODEL_MAX_ATTEMPTS,
  };
}

/**
 * Reset backup model attempt counter (call at session start)
 */
export function resetBackupModelCounter(): void {
  backupModelAttempts = 0;
}

// Re-export types
export type { StreamOptions as StreamOptionsType, StreamResult as StreamResultType };
