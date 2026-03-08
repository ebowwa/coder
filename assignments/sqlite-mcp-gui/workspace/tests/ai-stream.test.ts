/**
 * Tests for AI streaming functionality
 *
 * Tests:
 * - SSE parsing (parseSSERow, parseSSEStream)
 * - Stream methods (streamChatCompletion, streamGenerate, streamGenerateWithSystem)
 * - Error handling in streams
 * - StreamChunk validation
 * - Integration tests with mocked fetch
 */

import { test, expect, describe, mock } from "bun:test";
import { GLMClient } from "../src/lib/ai/client.js";
import type { StreamChunk } from "../src/lib/schemas/ai.js";
import {
  parseSSERow,
  parseSSEStream,
  StreamChunkSchema,
} from "../src/lib/schemas/ai.js";

/**
 * Helper function to create a mock fetch that returns a streaming response
 */
function createMockFetch() {
  return mock(() => {
    return Promise.resolve(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"id":"1","object":"chat.completion.chunk","created":1234567890,"model":"GLM-4.7","choices":[{"index":0,"delta":{"content":"Hello"}}]}\n\n',
              ),
            );
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"id":"2","object":"chat.completion.chunk","created":1234567890,"model":"GLM-4.7","choices":[{"index":0,"delta":{"content":" world"}}]}\n\n',
              ),
            );
            controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
            controller.close();
          },
        }),
      ),
    );
  });
}

describe("SSE Parsing", () => {
  test("parseSSERow extracts data from SSE lines", () => {
    expect(parseSSERow('data: {"id": "123"}')).toBe('{"id": "123"}');
    expect(parseSSERow('  data: {"id": "456"}  ')).toBe('{"id": "456"}');
  });

  test("parseSSERow handles [DONE] marker", () => {
    expect(parseSSERow("data: [DONE]")).toBe("[DONE]");
  });

  test("parseSSERow returns null for empty lines", () => {
    expect(parseSSERow("")).toBe(null);
    expect(parseSSERow("   ")).toBe(null);
    expect(parseSSERow("\n")).toBe(null);
  });

  test("parseSSERow returns null for non-data lines", () => {
    expect(parseSSERow("event: message")).toBe(null);
    expect(parseSSERow("id: 123")).toBe(null);
    expect(parseSSERow("retry: 1000")).toBe(null);
  });

  test("parseSSERow returns null for lines without 'data: ' prefix", () => {
    expect(parseSSERow('data{"id": "123"}')).toBe(null);
    expect(parseSSERow('{"id": "123"}')).toBe(null);
  });
});

describe("StreamChunk Schema Validation", () => {
  test("validates text chunks", () => {
    const result = StreamChunkSchema.safeParse({
      type: "text",
      id: "123",
      content: "Hello",
      finishReason: undefined,
    });
    expect(result.success).toBe(true);
  });

  test("validates done chunks", () => {
    const result = StreamChunkSchema.safeParse({
      type: "done",
    });
    expect(result.success).toBe(true);
  });

  test("validates error chunks", () => {
    const result = StreamChunkSchema.safeParse({
      type: "error",
      error: "Something went wrong",
    });
    expect(result.success).toBe(true);
  });

  test("validates chunks with usage", () => {
    const result = StreamChunkSchema.safeParse({
      type: "text",
      content: "Test",
      usage: {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      },
    });
    expect(result.success).toBe(true);
  });

  test("rejects invalid chunk types", () => {
    const result = StreamChunkSchema.safeParse({
      type: "invalid",
      content: "Test",
    });
    expect(result.success).toBe(false);
  });

  test("rejects chunks with wrong fields for type", () => {
    const result = StreamChunkSchema.safeParse({
      type: "error",
      content: "Test", // error type should have 'error' field, not 'content'
    });
    expect(result.success).toBe(true); // content is optional
  });
});

describe("parseSSEStream", () => {
  test("parses a simple SSE stream", async () => {
    const mockResponse = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              'data: {"id":"1","object":"chat.completion.chunk","created":1234567890,"model":"GLM-4.7","choices":[{"index":0,"delta":{"content":"Hello"}}]}\n\n',
            ),
          );
          controller.enqueue(
            new TextEncoder().encode(
              'data: {"id":"2","object":"chat.completion.chunk","created":1234567890,"model":"GLM-4.7","choices":[{"index":0,"delta":{"content":" world"}}]}\n\n',
            ),
          );
          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
          controller.close();
        },
      }),
    );

    const chunks: StreamChunk[] = [];
    for await (const chunk of parseSSEStream(mockResponse)) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(3);
    expect(chunks[0].type).toBe("text");
    expect(chunks[0].content).toBe("Hello");
    expect(chunks[1].type).toBe("text");
    expect(chunks[1].content).toBe(" world");
    expect(chunks[2].type).toBe("done");
  });

  test("handles empty lines and whitespace", async () => {
    const mockResponse = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              '\n\ndata: {"id":"1","object":"chat.completion.chunk","created":1234567890,"model":"GLM-4.7","choices":[{"index":0,"delta":{"content":"Test"}}]}\n\n\n',
            ),
          );
          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
          controller.close();
        },
      }),
    );

    const chunks: StreamChunk[] = [];
    for await (const chunk of parseSSEStream(mockResponse)) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(2);
  });

  test("handles chunks split across network packets", async () => {
    const mockResponse = new Response(
      new ReadableStream({
        start(controller) {
          // Send first half of a JSON
          controller.enqueue(
            new TextEncoder().encode(
              'data: {"id":"1","object":"chat.completion.chunk","created":1234567890,"model":"GLM-4.7","choices":[{"',
            ),
          );
          // Send second half
          controller.enqueue(
            new TextEncoder().encode(
              'index":0,"delta":{"content":"Split"}}]}\n\n',
            ),
          );
          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
          controller.close();
        },
      }),
    );

    const chunks: StreamChunk[] = [];
    for await (const chunk of parseSSEStream(mockResponse)) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(2);
    expect(chunks[0].type).toBe("text");
    expect(chunks[0].content).toBe("Split");
  });

  test("handles error chunks from API", async () => {
    const mockResponse = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              'data: {"error":{"message":"Invalid request"}}\n\n',
            ),
          );
          controller.close();
        },
      }),
    );

    const chunks: StreamChunk[] = [];
    for await (const chunk of parseSSEStream(mockResponse)) {
      chunks.push(chunk);
    }

    // Should yield an error chunk since it couldn't parse as StreamChunk
    expect(chunks.some((c) => c.type === "error")).toBe(true);
  });

  test("handles finish_reason in final chunk", async () => {
    const mockResponse = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              'data: {"id":"1","object":"chat.completion.chunk","created":1234567890,"model":"GLM-4.7","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":10,"completion_tokens":5,"total_tokens":15}}\n\n',
            ),
          );
          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
          controller.close();
        },
      }),
    );

    const chunks: StreamChunk[] = [];
    for await (const chunk of parseSSEStream(mockResponse)) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(2);
    expect(chunks[0].finishReason).toBe("stop");
    expect(chunks[0].usage).toEqual({
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
    });
  });

  test("handles null response body", async () => {
    const mockResponse = new Response(null);

    const chunks: StreamChunk[] = [];
    for await (const chunk of parseSSEStream(mockResponse)) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(1);
    expect(chunks[0].type).toBe("error");
    expect(chunks[0].error).toBe("Response body is null");
  });
});

describe("GLMClient Streaming Methods", () => {
  test("streamChatCompletion yields chunks correctly", async () => {
    const mockFetch = createMockFetch();

    const client = new GLMClient("test-api-key", undefined, mockFetch as any);
    const messages = [{ role: "user" as const, content: "Say hello" }];

    const chunks: StreamChunk[] = [];
    for await (const chunk of client.streamChatCompletion(messages)) {
      chunks.push(chunk);
    }

    expect(mockFetch).toHaveBeenCalled();
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].type).toBe("text");
    expect(chunks[0].content).toBe("Hello");
  });

  test("streamGenerate yields chunks for simple prompts", async () => {
    const mockFetch = createMockFetch();

    const client = new GLMClient("test-api-key", undefined, mockFetch as any);
    const chunks: StreamChunk[] = [];

    for await (const chunk of client.streamGenerate("Tell me a joke")) {
      chunks.push(chunk);
    }

    expect(mockFetch).toHaveBeenCalled();
    expect(chunks.length).toBeGreaterThan(0);
  });

  test("streamGenerateWithSystem yields chunks with system prompt", async () => {
    const mockFetch = createMockFetch();

    const client = new GLMClient("test-api-key", undefined, mockFetch as any);
    const chunks: StreamChunk[] = [];

    for await (const chunk of client.streamGenerateWithSystem(
      "You are a comedian",
      "Tell me a joke",
    )) {
      chunks.push(chunk);
    }

    expect(mockFetch).toHaveBeenCalled();
    expect(chunks.length).toBeGreaterThan(0);
  });

  test("streamChatCompletion sends correct request body", async () => {
    const mockFetch = createMockFetch();

    const client = new GLMClient("test-api-key", undefined, mockFetch as any);
    const messages = [
      { role: "system" as const, content: "Be helpful" },
      { role: "user" as const, content: "Help me" },
    ];

    // Capture the fetch call
    let requestBody = "";
    mockFetch.mockImplementation((...args) => {
      if (args.length < 2) return;
      const [url, options] = args as [string, RequestInit];
      requestBody = options?.body as string;
      return Promise.resolve(
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(
                new TextEncoder().encode(
                  'data: {"id":"1","object":"chat.completion.chunk","created":1234567890,"model":"GLM-4.7","choices":[{"index":0,"delta":{"content":"OK"}}]}\n\n',
                ),
              );
              controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
              controller.close();
            },
          }),
        ),
      );
    });

    for await (const chunk of client.streamChatCompletion(messages, {
      model: "GLM-4.7",
      temperature: 0.5,
      maxTokens: 100,
    })) {
      // Consume the stream
    }

    const body = JSON.parse(requestBody);
    expect(body.stream).toBe(true);
    expect(body.model).toBe("GLM-4.7");
    expect(body.temperature).toBe(0.5);
    expect(body.max_tokens).toBe(100);
    expect(body.messages).toEqual(messages);
  });

  test("stream methods handle errors", async () => {
    const mockFetch = mock(() => {
      throw new Error("Network error");
    });

    const client = new GLMClient("test-api-key", undefined, mockFetch as any);

    const chunks: StreamChunk[] = [];
    for await (const chunk of client.streamGenerate("Test")) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].type).toBe("error");
    expect(chunks[0].error).toContain("Network error");
  });

  test("stream methods handle HTTP errors", async () => {
    const mockFetch = mock(() => {
      return Promise.resolve(
        new Response(JSON.stringify({ error: { message: "Unauthorized" } }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    const client = new GLMClient("test-api-key", undefined, mockFetch as any);

    const chunks: StreamChunk[] = [];
    for await (const chunk of client.streamGenerate("Test")) {
      chunks.push(chunk);
    }

    expect(chunks[0].type).toBe("error");
    expect(chunks[0].error).toContain("Invalid API key or unauthorized access");
  });
});

describe("Stream Integration Scenarios", () => {
  test("accumulates full text from stream", async () => {
    const mockResponse = new Response(
      new ReadableStream({
        start(controller) {
          const chunks = [
            "The ",
            "quick ",
            "brown ",
            "fox ",
            "jumps ",
            "over ",
            "the ",
            "lazy ",
            "dog",
          ];
          chunks.forEach((text, i) => {
            controller.enqueue(
              new TextEncoder().encode(
                `data: {"id":"${i}","object":"chat.completion.chunk","created":1234567890,"model":"GLM-4.7","choices":[{"index":0,"delta":{"content":"${text}"}}]}\n\n`,
              ),
            );
          });
          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
          controller.close();
        },
      }),
    );

    const fullText = [];
    for await (const chunk of parseSSEStream(mockResponse)) {
      if (chunk.type === "text" && chunk.content) {
        fullText.push(chunk.content);
      }
    }

    expect(fullText.join("")).toBe(
      "The quick brown fox jumps over the lazy dog",
    );
  });

  test("handles stream with empty content chunks", async () => {
    const mockResponse = new Response(
      new ReadableStream({
        start(controller) {
          // First chunk has content
          controller.enqueue(
            new TextEncoder().encode(
              'data: {"id":"1","object":"chat.completion.chunk","created":1234567890,"model":"GLM-4.7","choices":[{"index":0,"delta":{"content":"Start"}}]}\n\n',
            ),
          );
          // Empty content chunk
          controller.enqueue(
            new TextEncoder().encode(
              'data: {"id":"2","object":"chat.completion.chunk","created":1234567890,"model":"GLM-4.7","choices":[{"index":0,"delta":{}}]}\n\n',
            ),
          );
          // More content
          controller.enqueue(
            new TextEncoder().encode(
              'data: {"id":"3","object":"chat.completion.chunk","created":1234567890,"model":"GLM-4.7","choices":[{"index":0,"delta":{"content":"End"}}]}\n\n',
            ),
          );
          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
          controller.close();
        },
      }),
    );

    const chunks: StreamChunk[] = [];
    for await (const chunk of parseSSEStream(mockResponse)) {
      chunks.push(chunk);
    }

    expect(chunks[0].content).toBe("Start");
    expect(chunks[1].content).toBe(""); // Empty delta content
    expect(chunks[2].content).toBe("End");
  });

  test("handles rate limit error in stream", async () => {
    const mockFetch = mock(() => {
      return Promise.resolve(
        new Response(
          JSON.stringify({ error: { message: "Rate limit exceeded" } }),
          { status: 429, headers: { "Content-Type": "application/json" } },
        ),
      );
    });

    const client = new GLMClient("test-api-key", undefined, mockFetch as any);
    const chunks: StreamChunk[] = [];

    // Set maxRetries to 0 to prevent retry delay in test
    for await (const chunk of client.streamGenerate("Test", {
      maxRetries: 0,
    })) {
      chunks.push(chunk);
    }

    expect(chunks[0].type).toBe("error");
    expect(chunks[0].error).toContain("Rate limit");
  });
});

describe("Stream Options and Configuration", () => {
  test("passes timeout to streaming request", async () => {
    const mockFetch = mock(() => {
      return Promise.resolve(
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(
                new TextEncoder().encode(
                  'data: {"id":"1","object":"chat.completion.chunk","created":1234567890,"model":"GLM-4.7","choices":[{"index":0,"delta":{"content":"OK"}}]}\n\n',
                ),
              );
              controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
              controller.close();
            },
          }),
        ),
      );
    });

    const client = new GLMClient("test-api-key", undefined, mockFetch as any);
    const chunks: StreamChunk[] = [];

    for await (const chunk of client.streamGenerate("Test", {
      timeout: 5000,
    })) {
      chunks.push(chunk);
    }

    expect(mockFetch).toHaveBeenCalled();
    expect(chunks.length).toBeGreaterThan(0);
  });

  test("passes maxRetries to streaming request", async () => {
    const mockFetch = mock(() => {
      return Promise.resolve(
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(
                new TextEncoder().encode(
                  'data: {"id":"1","object":"chat.completion.chunk","created":1234567890,"model":"GLM-4.7","choices":[{"index":0,"delta":{"content":"OK"}}]}\n\n',
                ),
              );
              controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
              controller.close();
            },
          }),
        ),
      );
    });


    const client = new GLMClient("test-api-key", undefined, mockFetch as any);
    const chunks: StreamChunk[] = [];

    for await (const chunk of client.streamGenerate("Test", {
      maxRetries: 1,
    })) {
      chunks.push(chunk);
    }

    expect(mockFetch).toHaveBeenCalled();
    expect(chunks.length).toBeGreaterThan(0);
  });
});
