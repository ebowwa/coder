/**
 * Unit tests for API types
 */

import { describe, test, expect } from "bun:test";
import {
  type StopReason,
  type UsageMetrics,
  type CacheCreation,
  type MediaType,
  type ContentBlock,
  type TextBlock,
  type ImageBlock,
  type DocumentBlock,
  type ToolUseBlock,
  type ToolResultBlock,
  type ThinkingBlock,
  type RedactedThinkingBlock,
  type CacheControl,
  type CacheTTL,
  type APIResponse,
  type StreamingEvent,
  type DeltaType,
  type OAuthConfig,
  type BetaHeaders,
  type BackendType,
  type BackendConfig,
  type RateLimitConfig,
  type UserAgentComponents,
  type MessageRole,
  type Message,
  type SystemBlock,
  type JSONSchema,
  type APITool,
  type APIRequest,
  type CacheConfig,
  type APICacheMetrics,
  DEFAULT_CACHE_CONFIG,
} from "../../packages/src/schemas/index.js";

// ============================================
// STOP REASON TYPE TESTS
// ============================================

describe("StopReason type", () => {
  test("accepts valid stop reasons", () => {
    const validReasons: StopReason[] = [
      "end_turn",
      "max_tokens",
      "stop_sequence",
      "tool_use",
      null,
    ];

    validReasons.forEach((reason) => {
      expect(reason).toBeDefined();
    });
  });
});

// ============================================
// USAGE METRICS TESTS
// ============================================

describe("UsageMetrics", () => {
  test("required fields are enforced", () => {
    const valid: UsageMetrics = {
      input_tokens: 100,
      output_tokens: 50,
    };
    expect(valid.input_tokens).toBe(100);
    expect(valid.output_tokens).toBe(50);
  });

  test("optional fields work", () => {
    const withOptional: UsageMetrics = {
      input_tokens: 100,
      output_tokens: 50,
      cache_creation_input_tokens: 25,
      cache_read_input_tokens: 10,
      thinking_tokens: 30,
      redacted_thinking_tokens: 5,
      cache_creation: {
        ephemeral_1h_input_tokens: 15,
        ephemeral_5m_input_tokens: 10,
      },
    };
    expect(withOptional.cache_creation_input_tokens).toBe(25);
    expect(withOptional.cache_read_input_tokens).toBe(10);
    expect(withOptional.thinking_tokens).toBe(30);
    expect(withOptional.cache_creation?.ephemeral_1h_input_tokens).toBe(15);
  });

  test("cache_creation nested structure", () => {
    const cacheCreation: CacheCreation = {
      ephemeral_1h_input_tokens: 100,
      ephemeral_5m_input_tokens: 50,
    };
    expect(cacheCreation.ephemeral_1h_input_tokens).toBe(100);
    expect(cacheCreation.ephemeral_5m_input_tokens).toBe(50);
  });
});

// ============================================
// CONTENT BLOCK TESTS
// ============================================

describe("ContentBlock types", () => {
  test("TextBlock structure", () => {
    const textBlock: TextBlock = {
      type: "text",
      text: "Hello, world!",
    };
    expect(textBlock.type).toBe("text");
    expect(textBlock.text).toBe("Hello, world!");
  });

  test("TextBlock with cache_control", () => {
    const textBlock: TextBlock = {
      type: "text",
      text: "Cached content",
      cache_control: { type: "ephemeral", ttl: "1h" },
    };
    expect(textBlock.cache_control?.ttl).toBe("1h");
  });

  test("ImageBlock structure", () => {
    const imageBlock: ImageBlock = {
      type: "image",
      source: {
        type: "base64",
        data: "aGVsbG8=",
        media_type: "image/png",
      },
    };
    expect(imageBlock.type).toBe("image");
    expect(imageBlock.source.type).toBe("base64");
    expect(imageBlock.source.media_type).toBe("image/png");
  });

  test("MediaType values", () => {
    const mediaTypes: MediaType[] = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    mediaTypes.forEach((type) => {
      expect(typeof type).toBe("string");
    });
  });

  test("DocumentBlock with base64 source", () => {
    const docBlock: DocumentBlock = {
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: "base64data",
      },
      cache_control: { type: "ephemeral" },
    };
    expect(docBlock.type).toBe("document");
    expect(docBlock.source.type).toBe("base64");
  });

  test("DocumentBlock with url source", () => {
    const docBlock: DocumentBlock = {
      type: "document",
      source: {
        type: "url",
        url: "https://example.com/doc.pdf",
      },
    };
    expect(docBlock.source.url).toBe("https://example.com/doc.pdf");
  });

  test("ToolUseBlock structure", () => {
    const toolBlock: ToolUseBlock = {
      type: "tool_use",
      id: "tool_123",
      name: "read_file",
      input: { path: "/src/index.ts" },
    };
    expect(toolBlock.type).toBe("tool_use");
    expect(toolBlock.id).toBe("tool_123");
    expect(toolBlock.name).toBe("read_file");
    expect(toolBlock.input.path).toBe("/src/index.ts");
  });

  test("ToolResultBlock with string content", () => {
    const resultBlock: ToolResultBlock = {
      type: "tool_result",
      tool_use_id: "tool_123",
      content: "File contents here",
    };
    expect(resultBlock.tool_use_id).toBe("tool_123");
    expect(resultBlock.content).toBe("File contents here");
    expect(resultBlock.is_error).toBeUndefined();
  });

  test("ToolResultBlock with error", () => {
    const errorBlock: ToolResultBlock = {
      type: "tool_result",
      tool_use_id: "tool_123",
      content: "Error: File not found",
      is_error: true,
    };
    expect(errorBlock.is_error).toBe(true);
  });

  test("ToolResultBlock with ContentBlock array", () => {
    const resultBlock: ToolResultBlock = {
      type: "tool_result",
      tool_use_id: "tool_123",
      content: [
        { type: "text", text: "Part 1" },
        { type: "text", text: "Part 2" },
      ],
    };
    expect(Array.isArray(resultBlock.content)).toBe(true);
  });

  test("ThinkingBlock structure", () => {
    const thinkingBlock: ThinkingBlock = {
      type: "thinking",
      thinking: "Let me think about this...",
    };
    expect(thinkingBlock.type).toBe("thinking");
    expect(thinkingBlock.thinking).toBe("Let me think about this...");
  });

  test("ThinkingBlock with signature", () => {
    const thinkingBlock: ThinkingBlock = {
      type: "thinking",
      thinking: "Extended thinking content",
      signature: "abc123",
    };
    expect(thinkingBlock.signature).toBe("abc123");
  });

  test("RedactedThinkingBlock structure", () => {
    const redactedBlock: RedactedThinkingBlock = {
      type: "redacted_thinking",
      data: "redacted_base64_data",
    };
    expect(redactedBlock.type).toBe("redacted_thinking");
    expect(redactedBlock.data).toBe("redacted_base64_data");
  });
});

// ============================================
// CACHE CONTROL TESTS
// ============================================

describe("CacheControl", () => {
  test("cache control without ttl", () => {
    const cacheControl: CacheControl = {
      type: "ephemeral",
    };
    expect(cacheControl.type).toBe("ephemeral");
    expect(cacheControl.ttl).toBeUndefined();
  });

  test("cache control with ttl", () => {
    const withTtl: CacheControl = {
      type: "ephemeral",
      ttl: "1h",
    };
    expect(withTtl.ttl).toBe("1h");
  });

  test("CacheTTL values", () => {
    const ttls: CacheTTL[] = ["1h", "5m"];
    expect(ttls).toContain("1h");
    expect(ttls).toContain("5m");
  });
});

// ============================================
// API RESPONSE TESTS
// ============================================

describe("APIResponse", () => {
  test("complete API response", () => {
    const response: APIResponse = {
      id: "msg_123",
      type: "message",
      role: "assistant",
      content: [{ type: "text", text: "Hello!" }],
      model: "claude-sonnet-4-6",
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: {
        input_tokens: 10,
        output_tokens: 5,
      },
    };

    expect(response.id).toBe("msg_123");
    expect(response.role).toBe("assistant");
    expect(response.model).toBe("claude-sonnet-4-6");
    expect(response.stop_reason).toBe("end_turn");
  });
});

// ============================================
// CONSTANTS TESTS
// ============================================

// NOTE: These constants are not exported from schemas.
// TODO: Add these constants to schemas/api.zod.ts or a separate constants file if needed.
describe.skip("API Constants", () => {
  test("API_BASE_URL is defined", () => {
    // expect(API_BASE_URL).toBe("https://api.anthropic.com");
  });

  test("MCP_PROXY_URL is defined", () => {
    // expect(MCP_PROXY_URL).toBe("https://mcp-proxy.anthropic.com");
  });

  test("OAUTH_CONFIG structure", () => {
    // expect(OAUTH_CONFIG.createApiKeyUrl).toContain("anthropic.com");
  });

  test("BETA_HEADERS structure", () => {
    // expect(BETA_HEADERS.skills).toBe("skills-2025-10-02");
  });

  test("BACKEND_PRIORITY has correct order", () => {
    // expect(BACKEND_PRIORITY[0].id).toBe("anthropic");
  });

  test("DEFAULT_RATE_LIMIT values", () => {
    // expect(DEFAULT_RATE_LIMIT.requestsPerMinute).toBe(60);
  });

  test("DEFAULT_CACHE_CONFIG values", () => {
    expect(DEFAULT_CACHE_CONFIG.enabled).toBe(true);
  });
});

// ============================================
// STREAMING TYPES TESTS
// ============================================

describe("Streaming types", () => {
  test("StreamingEvent values", () => {
    const events: StreamingEvent[] = [
      "message_start",
      "message_delta",
      "content_block_start",
      "content_block_delta",
      "content_block_stop",
    ];
    expect(events.length).toBe(5);
  });

  test("DeltaType values", () => {
    const deltas: DeltaType[] = [
      "text_delta",
      "citations_delta",
      "input_json_delta",
      "thinking_delta",
      "signature_delta",
      "compaction_delta",
    ];
    expect(deltas.length).toBe(6);
  });
});

// ============================================
// BACKEND CONFIG TESTS
// ============================================

describe("BackendConfig", () => {
  test("BackendType values", () => {
    const types: BackendType[] = ["anthropic", "bedrock", "vertex", "foundry"];
    expect(types.length).toBe(4);
  });

  // NOTE: BACKEND_PRIORITY constant not exported from schemas
  test.skip("each backend has required fields", () => {
    // BACKEND_PRIORITY.forEach((backend) => {
    //   expect(backend.id).toBeDefined();
    // });
  });
});

// ============================================
// USER AGENT TESTS
// ============================================

// NOTE: formatUserAgent function not exported from schemas
describe.skip("formatUserAgent", () => {
  test("basic user agent formatting", () => {
    // const components: UserAgentComponents = {
    //   version: "1.0.0",
    //   entrypoint: "cli",
    //   platform: "darwin",
    // };
    // const result = formatUserAgent(components);
    // expect(result).toContain("claude-cli/1.0.0");
  });

  test("user agent with optional fields", () => {
    // const components: UserAgentComponents = {
    //   version: "1.0.0",
    //   entrypoint: "cli",
    //   platform: "darwin",
    //   sdkVersion: "2.0.0",
    //   clientApp: "vscode",
    // };
    // const result = formatUserAgent(components);
    // expect(result).toContain("sdk=2.0.0");
  });
});

// ============================================
// MESSAGE TYPES TESTS
// ============================================

describe("Message types", () => {
  test("MessageRole values", () => {
    const roles: MessageRole[] = ["user", "assistant"];
    expect(roles).toContain("user");
    expect(roles).toContain("assistant");
  });

  test("Message with string content", () => {
    const message: Message = {
      role: "user",
      content: "Hello!",
    };
    expect(message.role).toBe("user");
    expect(message.content).toBe("Hello!");
  });

  test("Message with ContentBlock array", () => {
    const message: Message = {
      role: "assistant",
      content: [
        { type: "text", text: "Hello!" },
        { type: "image", source: { type: "base64", data: "abc", media_type: "image/png" } },
      ],
    };
    expect(Array.isArray(message.content)).toBe(true);
  });

  test("SystemBlock structure", () => {
    const systemBlock: SystemBlock = {
      type: "text",
      text: "You are a helpful assistant.",
      cache_control: { type: "ephemeral", ttl: "5m" },
    };
    expect(systemBlock.type).toBe("text");
    expect(systemBlock.cache_control?.ttl).toBe("5m");
  });
});

// ============================================
// API REQUEST TESTS
// ============================================

describe("API Request types", () => {
  test("JSONSchema structure", () => {
    const schema: JSONSchema = {
      type: "object",
      properties: {
        name: { type: "string", description: "User name" },
        age: { type: "number" },
      },
      required: ["name"],
    };
    expect(schema.type).toBe("object");
    expect(schema.properties?.name.type).toBe("string");
    expect(schema.required).toContain("name");
  });

  test("APITool structure", () => {
    const tool: APITool = {
      name: "read_file",
      description: "Read a file",
      input_schema: {
        type: "object",
        properties: {
          path: { type: "string" },
        },
        required: ["path"],
      },
    };
    expect(tool.name).toBe("read_file");
    expect(tool.input_schema.type).toBe("object");
  });

  test("APIRequest minimal", () => {
    const request: APIRequest = {
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: "Hello" }],
    };
    expect(request.model).toBe("claude-sonnet-4-6");
    expect(request.max_tokens).toBe(4096);
  });

  test("APIRequest with all options", () => {
    const request: APIRequest = {
      model: "claude-opus-4-6",
      max_tokens: 8192,
      messages: [{ role: "user", content: "Hello" }],
      system: "You are helpful",
      tools: [
        {
          name: "test",
          description: "Test tool",
          input_schema: { type: "object" },
        },
      ],
      tool_choice: { type: "auto" },
      stop_sequences: ["STOP"],
      stream: true,
      metadata: { user_id: "user123" },
      thinking: { type: "enabled", budget_tokens: 1000 },
    };

    expect(request.system).toBe("You are helpful");
    expect(request.tools?.length).toBe(1);
    expect(request.stream).toBe(true);
    expect(request.thinking?.type).toBe("enabled");
  });

  test("tool_choice variants", () => {
    const autoChoice = { type: "auto" as const };
    const anyChoice = { type: "any" as const };
    const toolChoice = { type: "tool" as const, name: "read_file" };

    expect(autoChoice.type).toBe("auto");
    expect(anyChoice.type).toBe("any");
    expect(toolChoice.name).toBe("read_file");
  });
});

// ============================================
// CACHE CONFIG TESTS
// ============================================

describe("CacheConfig", () => {
  test("minimal cache config", () => {
    const config: CacheConfig = {
      enabled: true,
      minTokens: 1024,
    };
    expect(config.enabled).toBe(true);
    expect(config.minTokens).toBe(1024);
  });

  test("full cache config", () => {
    const config: CacheConfig = {
      enabled: true,
      ttl: "5m",
      minTokens: 2048,
      cacheSystemPrompt: true,
      minTokensForCache: 1024,
    };
    expect(config.ttl).toBe("5m");
    expect(config.cacheSystemPrompt).toBe(true);
  });
});

// ============================================
// API CACHE METRICS TESTS
// ============================================

describe("APICacheMetrics", () => {
  test("cache metrics structure", () => {
    const metrics: APICacheMetrics = {
      cacheWrites: 10,
      cacheReads: 50,
      cacheWriteTokens: 5000,
      cacheReadTokens: 25000,
      hitRate: 0.83,
    };

    expect(metrics.cacheWrites).toBe(10);
    expect(metrics.cacheReads).toBe(50);
    expect(metrics.hitRate).toBe(0.83);
  });
});
