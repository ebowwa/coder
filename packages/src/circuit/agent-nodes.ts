/**
 * Agent Steps
 *
 * Specialized step processors for LLM agent integration:
 * - LLM inference steps
 * - Tool execution steps
 * - Cache/persistence steps
 * - Teammate coordination steps
 *
 * ============================================
 * TERMINOLOGY MAPPING (Neuroscience → Workflow)
 * ============================================
 *
 * | Old Term     | New Term          | Description                    |
 * |--------------|-------------------|--------------------------------|
 * | Node         | Step              | Processing unit                |
 * | Signal       | Message           | Data flowing through           |
 * | strength     | priority          | Message importance             |
 * | CircuitContext | WorkflowContext | Execution context              |
 * | NodeResult   | StepResult        | Processing result              |
 * | NodeConfig   | StepConfig        | Configuration                  |
 *
 * ============================================
 */

import type {
  Message,
  StepProcessor,
  WorkflowContext,
  StepResult,
} from "./types.js";
import { createMessage, cloneMessage } from "./engine.js";

// ============================================
// LLM STEP TYPES
// ============================================

/**
 * LLM step configuration
 *
 * Neuroscience: "cortical column" = processes information in layers
 * Workflow: LLM step = processes text through language model
 */
export interface LLMStepConfig {
  /** Model identifier */
  model: string;
  /** System prompt */
  systemPrompt?: string;
  /** Temperature */
  temperature?: number;
  /** Max tokens */
  maxTokens?: number;
  /** Stop sequences */
  stopSequences?: string[];
  /** Tools available */
  tools?: LLMTool[];
}

/**
 * LLM tool definition
 */
export interface LLMTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  handler?: (args: Record<string, unknown>) => Promise<unknown>;
}

/**
 * LLM response message payload
 */
export interface LLMResponsePayload {
  content: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    args: Record<string, unknown>;
  }>;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  model: string;
}

// ============================================
// LLM STEP PROCESSOR
// ============================================

/**
 * Create an LLM inference step processor
 *
 * Neuroscience: "cortical processing" = neurons in cortex process inputs
 * Workflow: LLM step = language model processes messages
 */
export function createLLMStep(
  config: LLMStepConfig,
  client: {
    messages: {
      create: (params: unknown) => Promise<unknown>;
    };
  }
): StepProcessor {
  return async (message: Message, context: WorkflowContext): Promise<StepResult> => {
    // Build messages from input
    const messages: Array<{ role: string; content: string }> = [];

    if (config.systemPrompt) {
      messages.push({ role: "system", content: config.systemPrompt });
    }

    // Extract prompt from message
    const prompt = typeof message.payload === "string"
      ? message.payload
      : (message.payload as { prompt?: string })?.prompt || JSON.stringify(message.payload);

    messages.push({ role: "user", content: prompt });

    try {
      // Call LLM
      const response = await client.messages.create({
        model: config.model,
        messages,
        max_tokens: config.maxTokens ?? 1024,
        temperature: config.temperature ?? 0.7,
        stop_sequences: config.stopSequences,
        tools: config.tools?.map(t => ({
          name: t.name,
          description: t.description,
          input_schema: t.parameters,
        })),
      }) as {
        content: Array<{ type: string; text?: string; id?: string; name?: string; input?: unknown }>;
        usage?: { input_tokens: number; output_tokens: number };
      };

      // Extract content and tool calls
      const textContent: string[] = [];
      const toolCalls: Array<{ id: string; name: string; args: Record<string, unknown> }> = [];

      for (const block of response.content) {
        if (block.type === "text" && block.text) {
          textContent.push(block.text);
        } else if (block.type === "tool_use" && block.name) {
          toolCalls.push({
            id: block.id || `tool_${Date.now()}`,
            name: block.name,
            args: block.input as Record<string, unknown>,
          });
        }
      }

      // Create output messages
      const outputMessages: Message[] = [];

      // Text response message
      if (textContent.length > 0) {
        outputMessages.push(createMessage(
          "llm.response",
          {
            content: textContent.join("\n"),
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
            usage: response.usage ? {
              inputTokens: response.usage.input_tokens,
              outputTokens: response.usage.output_tokens,
            } : undefined,
            model: config.model,
          } as LLMResponsePayload,
          message.target || "llm"
        ));
      }

      // Tool call messages
      for (const toolCall of toolCalls) {
        outputMessages.push(createMessage(
          `tool.${toolCall.name}`,
          toolCall.args,
          message.target || "llm",
          { metadata: { toolCallId: toolCall.id } }
        ));
      }

      return {
        messages: outputMessages,
        continue: true,
      };

    } catch (error) {
      return {
        messages: [createMessage(
          "llm.error",
          { error: error instanceof Error ? error.message : String(error) },
          message.target || "llm"
        )],
        continue: true,
      };
    }
  };
}

// ============================================
// TOOL STEP PROCESSOR
// ============================================

/**
 * Tool step configuration
 *
 * Neuroscience: "motor output" = brain sends commands to muscles
 * Workflow: tool step = workflow executes external actions
 */
export interface ToolStepConfig {
  /** Tool name */
  name: string;
  /** Tool handler */
  handler: (args: Record<string, unknown>, context: WorkflowContext) => Promise<unknown>;
  /** Output message type */
  outputType?: string;
  /** Error handling */
  onError?: "continue" | "halt" | "retry";
}

/**
 * Create a tool execution step processor
 */
export function createToolStep(config: ToolStepConfig): StepProcessor {
  return async (message: Message, context: WorkflowContext): Promise<StepResult> => {
    try {
      // Extract args from message
      const args = message.payload as Record<string, unknown>;

      // Execute tool
      const result = await config.handler(args, context);

      // Create output message
      const outputMessage = createMessage(
        config.outputType || `tool.${config.name}.result`,
        { input: args, output: result },
        message.target || config.name
      );

      return {
        messages: [outputMessage],
        continue: true,
      };

    } catch (error) {
      const errorMessage = createMessage(
        `tool.${config.name}.error`,
        {
          input: message.payload,
          error: error instanceof Error ? error.message : String(error),
        },
        message.target || config.name
      );

      return {
        messages: [errorMessage],
        continue: config.onError !== "halt",
      };
    }
  };
}

// ============================================
// CACHE STEP PROCESSOR
// ============================================

/**
 * Cache storage backend
 *
 * Neuroscience: "hippocampus" = stores and retrieves memories
 * Workflow: cache backend = stores and retrieves data
 */
export interface CacheBackend {
  store(key: string, value: unknown, ttl?: number): Promise<void>;
  retrieve(key: string): Promise<unknown | null>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<Array<{ key: string; value: unknown }>>;
}

/**
 * Cache step configuration
 */
export interface CacheStepConfig {
  /** Cache backend */
  backend: CacheBackend;
  /** Key prefix for namespacing */
  keyPrefix?: string;
  /** Default TTL in ms */
  defaultTTL?: number;
}

/**
 * Create a cache step processor
 *
 * Neuroscience: "memory consolidation" = storing experiences
 * Workflow: cache step = store/retrieve data
 */
export function createCacheStep(config: CacheStepConfig): StepProcessor {
  return async (message: Message, context: WorkflowContext): Promise<StepResult> => {
    const payload = message.payload as {
      action: "store" | "retrieve" | "delete" | "list";
      key?: string;
      value?: unknown;
      ttl?: number;
      prefix?: string;
    };

    const prefix = config.keyPrefix || "";

    try {
      switch (payload.action) {
        case "store": {
          if (!payload.key) throw new Error("Key required for store");
          await config.backend.store(
            `${prefix}${payload.key}`,
            payload.value,
            payload.ttl ?? config.defaultTTL
          );
          return {
            messages: [createMessage(
              "cache.stored",
              { key: payload.key },
              message.target || "cache"
            )],
            continue: true,
          };
        }

        case "retrieve": {
          if (!payload.key) throw new Error("Key required for retrieve");
          const value = await config.backend.retrieve(`${prefix}${payload.key}`);
          return {
            messages: [createMessage(
              "cache.retrieved",
              { key: payload.key, value },
              message.target || "cache"
            )],
            continue: true,
          };
        }

        case "delete": {
          if (!payload.key) throw new Error("Key required for delete");
          await config.backend.delete(`${prefix}${payload.key}`);
          return {
            messages: [createMessage(
              "cache.deleted",
              { key: payload.key },
              message.target || "cache"
            )],
            continue: true,
          };
        }

        case "list": {
          const items = await config.backend.list(`${prefix}${payload.prefix || ""}`);
          return {
            messages: [createMessage(
              "cache.listed",
              { items: items.map(i => ({ ...i, key: i.key.slice(prefix.length) })) },
              message.target || "cache"
            )],
            continue: true,
          };
        }

        default:
          throw new Error(`Unknown cache action: ${payload.action}`);
      }
    } catch (error) {
      return {
        messages: [createMessage(
          "cache.error",
          { action: payload.action, error: error instanceof Error ? error.message : String(error) },
          message.target || "cache"
        )],
        continue: true,
      };
    }
  };
}

// ============================================
// TEAMMATE STEP PROCESSOR
// ============================================

/**
 * Teammate step configuration
 *
 * Neuroscience: "neural ensemble" = group of neurons working together
 * Workflow: teammate step = coordinate with other agents
 */
export interface TeammateStepConfig {
  /** Teammate ID */
  teammateId: string;
  /** Team name */
  teamName: string;
  /** Task prompt template */
  promptTemplate?: string;
  /** Timeout for response */
  timeout?: number;
}

/**
 * Create a teammate coordination step processor
 * This integrates with the TeammateManager for multi-agent workflows
 */
export function createTeammateStep(
  config: TeammateStepConfig,
  teammateManager: {
    sendDirect: (toId: string, fromId: string, message: string) => void;
    getMessages: (teammateId: string) => Array<{ type: string; from: string; content: string }>;
    waitForTeammatesToBecomeIdle: (teamName: string, options?: { timeout?: number }) => Promise<{ success: boolean }>;
  }
): StepProcessor {
  return async (message: Message, context: WorkflowContext): Promise<StepResult> => {
    // Build task prompt
    let prompt = config.promptTemplate || "{{message}}";
    prompt = prompt.replace("{{message}}", JSON.stringify(message.payload));

    // Send task to teammate
    teammateManager.sendDirect(
      config.teammateId,
      "workflow",
      prompt
    );

    // Wait for response with timeout
    const timeout = config.timeout ?? 60000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      // Check for abort
      if (context.abortSignal?.aborted) {
        return {
          messages: [createMessage(
            "teammate.aborted",
            { teammateId: config.teammateId },
            message.target || "teammate"
          )],
          continue: false,
        };
      }

      // Check for response messages
      const messages = teammateManager.getMessages(config.teammateId);
      const responseMessages = messages.filter(
        m => m.type === "response" || m.type === "task"
      );

      if (responseMessages.length > 0) {
        // Create output messages from responses
        const outputMessages = responseMessages.map(msg =>
          createMessage(
            "teammate.response",
            { teammateId: config.teammateId, content: msg.content },
            message.target || "teammate"
          )
        );

        return {
          messages: outputMessages,
          continue: true,
        };
      }

      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Timeout
    return {
      messages: [createMessage(
        "teammate.timeout",
        { teammateId: config.teammateId, timeout },
        message.target || "teammate"
      )],
      continue: true,
    };
  };
}

// ============================================
// TRANSFORM STEP PROCESSOR
// ============================================

/**
 * Transform function type
 */
export type TransformFn<TInput, TOutput> = (
  payload: TInput,
  context: WorkflowContext
) => Promise<TOutput>;

/**
 * Create a transform step processor
 *
 * Neuroscience: "neural transformation" = neuron converts input to output
 * Workflow: transform step = function converts data
 */
export function createTransformStep<TInput, TOutput>(
  transform: TransformFn<TInput, TOutput>,
  outputType?: string
): StepProcessor {
  return async (message: Message, context: WorkflowContext): Promise<StepResult> => {
    try {
      const output = await transform(message.payload as TInput, context);

      return {
        messages: [createMessage(
          outputType || message.type,
          output,
          message.target || "transform"
        )],
        continue: true,
      };
    } catch (error) {
      return {
        messages: [createMessage(
          "transform.error",
          { error: error instanceof Error ? error.message : String(error) },
          message.target || "transform"
        )],
        continue: true,
      };
    }
  };
}

// ============================================
// AGGREGATOR STEP PROCESSOR
// ============================================

/**
 * Aggregation strategy
 *
 * Neuroscience: "neural integration" = combining multiple signals
 * Workflow: aggregator = combining multiple messages
 */
export type AggregationStrategy =
  | "collect"     // Collect all messages until count reached
  | "merge"       // Merge payloads into single object
  | "first"       // Return first message
  | "last"        // Return last message
  | "highest";    // Return message with highest priority

/**
 * Aggregator step configuration
 */
export interface AggregatorStepConfig {
  /** Number of messages to collect */
  count?: number;
  /** Time window in ms */
  windowMs?: number;
  /** Aggregation strategy */
  strategy: AggregationStrategy;
  /** Output message type */
  outputType?: string;
}

/**
 * Create an aggregator step processor
 */
export function createAggregatorStep(config: AggregatorStepConfig): StepProcessor {
  const collected: Message[] = [];
  let windowStart = Date.now();

  return async (message: Message, _context: WorkflowContext): Promise<StepResult> => {
    const now = Date.now();

    // Reset window if expired
    if (config.windowMs && now - windowStart > config.windowMs) {
      collected.length = 0;
      windowStart = now;
    }

    // Collect message
    collected.push(message);

    // Check if ready to aggregate
    const ready = config.count
      ? collected.length >= config.count
      : config.windowMs
        ? now - windowStart >= config.windowMs
        : true;

    if (!ready) {
      return {
        messages: [],
        continue: true,
        state: { collected: collected.length },
      };
    }

    // Apply aggregation strategy
    let result: unknown;

    switch (config.strategy) {
      case "collect":
        result = collected.map(m => ({ payload: m.payload, priority: m.priority }));
        break;

      case "merge":
        result = collected.reduce((acc, m) => ({
          ...acc,
          ...(typeof m.payload === "object" ? m.payload : { value: m.payload }),
        }), {});
        break;

      case "first":
        result = collected[0]?.payload;
        break;

      case "last":
        result = collected[collected.length - 1]?.payload;
        break;

      case "highest":
        result = collected.reduce((a, b) =>
          a.priority > b.priority ? a : b
        ).payload;
        break;
    }

    // Clear collected
    const output = collected.slice();
    collected.length = 0;

    return {
      messages: [createMessage(
        config.outputType || "aggregated",
        { aggregated: result, count: output.length },
        message.target || "aggregator"
      )],
      continue: true,
    };
  };
}

// ============================================
// CONDITIONAL STEP PROCESSOR
// ============================================

/**
 * Condition function
 */
export type ConditionFn = (
  message: Message,
  context: WorkflowContext
) => Promise<boolean> | boolean;

/**
 * Conditional step configuration
 *
 * Neuroscience: "decision neuron" = routes signals based on conditions
 * Workflow: conditional step = routes messages based on conditions
 */
export interface ConditionalStepConfig {
  /** Condition to check */
  condition: ConditionFn;
  /** Target step if true */
  ifTrue: string;
  /** Target step if false */
  ifFalse?: string;
}

/**
 * Create a conditional step processor
 */
export function createConditionalStep(config: ConditionalStepConfig): StepProcessor {
  return async (message: Message, context: WorkflowContext): Promise<StepResult> => {
    const result = await config.condition(message, context);

    const outputMessage = cloneMessage(message, {
      target: result ? config.ifTrue : config.ifFalse,
      metadata: { conditionResult: result },
    });

    // Only route if we have a target
    const messages = outputMessage.target ? [outputMessage] : [];

    return {
      messages,
      continue: true,
    };
  };
}

// Functions are already exported inline with 'export function'
// No additional export block needed
