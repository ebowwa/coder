# AI Streaming Documentation

## Overview

The AI module now fully supports streaming responses using Server-Sent Events (SSE) protocol. Streaming allows you to receive text incrementally as it's generated, providing real-time feedback and better user experience.

### Key Features

- **SSE Protocol**: OpenAI-compatible Server-Sent Events implementation
- **AsyncGenerator Interface**: Modern, easy-to-use async generator API
- **Error Handling**: Robust error handling with retries and timeouts
- **Token Tracking**: Real-time token usage information in final chunk
- **Type Safety**: Full TypeScript support with Zod validation
- **Retry Logic**: Automatic retry with exponential backoff on failures
- **Timeout Support**: Configurable timeouts per request

---

## How Streaming Works

### SSE Protocol

Streaming responses follow the Server-Sent Events (SSE) protocol:

1. Client sends request with `stream: true`
2. Server responds with multiple JSON objects, each on a line prefixed with `data: `
3. Each object contains incremental text in `choices[0].delta.content`
4. Stream ends with `data: [DONE]`

### Response Format

Each streaming chunk has the following structure:

```typescript
{
  id: "msg_abc123",
  object: "chat.completion.chunk",
  created: 1234567890,
  model: "GLM-4.7",
  choices: [{
    index: 0,
    delta: {
      content: "Hello",  // Incremental text
      role: "assistant"  // Only in first chunk
    },
    finish_reason: null  // "stop", "length", etc. in final chunk
  }],
  usage: {  // Only in final chunk
    prompt_tokens: 10,
    completion_tokens: 5,
    total_tokens: 15
  }
}
```

---

## API Reference

### streamChatCompletion

Stream a chat completion with full control.

```typescript
async *streamChatCompletion(
  messages: ChatMessage[],
  options?: Partial<ChatCompletionOptions>
): AsyncGenerator<StreamChunk, void, unknown>
```

**Parameters:**
- `messages`: Array of chat messages (system, user, assistant)
- `options`: Optional configuration (model, temperature, maxTokens, timeout, maxRetries)

**Returns:** AsyncGenerator yielding `StreamChunk` objects

**Example:**
```typescript
for await (const chunk of client.streamChatCompletion([
  { role: "system", content: "You are helpful" },
  { role: "user", content: "Hello!" }
])) {
  if (chunk.type === "text") {
    process.stdout.write(chunk.content);
  }
}
```

---

### streamGenerate

Stream a simple prompt (shorthand for single user message).

```typescript
async *streamGenerate(
  prompt: string,
  options?: Partial<ChatCompletionOptions>
): AsyncGenerator<StreamChunk, void, unknown>
```

**Parameters:**
- `prompt`: User prompt text
- `options`: Optional configuration

**Example:**
```typescript
for await (const chunk of client.streamGenerate("Tell me a joke")) {
  if (chunk.type === "text") {
    console.log(chunk.content);
  }
}
```

---

### streamGenerateWithSystem

Stream with both system and user prompts.

```typescript
async *streamGenerateWithSystem(
  systemPrompt: string,
  userPrompt: string,
  options?: Partial<ChatCompletionOptions>
): AsyncGenerator<StreamChunk, void, unknown>
```

**Parameters:**
- `systemPrompt`: System prompt to set AI behavior
- `userPrompt`: User prompt
- `options`: Optional configuration

**Example:**
```typescript
for await (const chunk of client.streamGenerateWithSystem(
  "You are a code reviewer",
  "Review this function"
)) {
  if (chunk.type === "text") {
    console.log(chunk.content);
  }
}
```

---

## StreamChunk Type

All streaming methods yield `StreamChunk` objects:

```typescript
type StreamChunk = 
  | TextChunk      // Contains incremental content
  | DoneChunk       // Stream completed
  | ErrorChunk;     // Error occurred

interface TextChunk {
  type: "text";
  id?: string;          // Message ID
  content: string;      // Incremental text
  finishReason?: string; // "stop", "length", etc.
  usage?: TokenUsage;   // Token counts (final chunk only)
}

interface DoneChunk {
  type: "done";
}

interface ErrorChunk {
  type: "error";
  error: string;        // Error message
}
```

---

## Usage Examples

### Basic Streaming

```typescript
import { getGLMClient } from "./lib/ai";

const client = getGLMClient();

for await (const chunk of client.streamGenerate("Explain quantum computing")) {
  if (chunk.type === "text") {
    // Print as it arrives
    process.stdout.write(chunk.content);
  } else if (chunk.type === "done") {
    console.log("\n✓ Complete!");
  } else if (chunk.type === "error") {
    console.error("✗ Error:", chunk.error);
  }
}
```

---

### Accumulate Full Response

```typescript
const chunks: string[] = [];

for await (const chunk of client.streamGenerate("Write a story")) {
  if (chunk.type === "text") {
    chunks.push(chunk.content);
    process.stdout.write(chunk.content);
  }
}

const fullText = chunks.join("");
console.log(`Total length: ${fullText.length} characters`);
```

---

### Track Token Usage

```typescript
let promptTokens = 0;
let completionTokens = 0;

for await (const chunk of client.streamGenerate("What is AI?")) {
  if (chunk.type === "text") {
    process.stdout.write(chunk.content);
  } else if (chunk.usage) {
    promptTokens = chunk.usage.promptTokens;
    completionTokens = chunk.usage.completionTokens;
  }
}

console.log(`\nPrompt: ${promptTokens}, Completion: ${completionTokens}`);
```

---

### Progress Indicator

```typescript
let charCount = 0;
const startTime = Date.now();

for await (const chunk of client.streamGenerate("Long prompt")) {
  if (chunk.type === "text") {
    charCount += chunk.content.length;
    process.stdout.write(chunk.content);

    if (charCount % 100 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      process.stdout.write(` [${charCount} chars, ${elapsed}s]`);
    }
  }
}
```

---

### Content Filtering

```typescript
for await (const chunk of client.streamGenerate("Story with special chars")) {
  if (chunk.type === "text") {
    // Filter while streaming
    const filtered = chunk.content.replace(/[^\w\s]/g, "");
    process.stdout.write(filtered);
  }
}
```

---

### Timeout Handling

```typescript
try {
  for await (const chunk of client.streamGenerate("Very long prompt", {
    timeout: 5000,  // 5 seconds
  })) {
    if (chunk.type === "text") {
      process.stdout.write(chunk.content);
    } else if (chunk.type === "error") {
      if (chunk.error.includes("timeout")) {
        console.log("\n⚠ Timed out");
      }
    }
  }
} catch (error) {
  console.error("Unexpected error:", error);
}
```

---

## Error Handling

### Error Types

```typescript
// Custom error types
class GLMTimeoutError extends Error {
  name: "GLMTimeoutError";
}

class GLMAuthError extends Error {
  name: "GLMAuthError";
}

class GLMRateLimitError extends Error {
  name: "GLMRateLimitError";
}

class GLMNetworkError extends Error {
  name: "GLMNetworkError";
  cause?: unknown;
}
```

### Handling Errors in Streams

```typescript
for await (const chunk of client.streamGenerate("Test")) {
  switch (chunk.type) {
    case "text":
      process.stdout.write(chunk.content);
      break;
    
    case "error":
      if (chunk.error.includes("timeout")) {
        console.error("Request timed out");
      } else if (chunk.error.includes("rate limit")) {
        console.error("Rate limited - wait before retry");
      } else if (chunk.error.includes("unauthorized")) {
        console.error("Invalid API key");
      } else {
        console.error("Error:", chunk.error);
      }
      break;
    
    case "done":
      console.log("\nStream completed successfully");
      break;
  }
}
```

### Retry Configuration

```typescript
const response = await client.streamGenerate("Retry example", {
  maxRetries: 3,           // Retry 3 times on failure
  timeout: 30000,          // 30 second timeout per attempt
});
```

**Retry Logic:**
- Retries on: timeouts, network errors, rate limits
- No retries on: auth errors, validation errors
- Backoff: exponential (1s → 2s → 4s, max 10s)

---

## Configuration Options

### ChatCompletionOptions

```typescript
interface ChatCompletionOptions {
  model?: "GLM-4.7" | "GLM-4.6" | "GLM-4.5" | "GLM-4.5-air";
  temperature?: number;      // 0-2, default 0.7
  maxTokens?: number;        // Maximum tokens in response
  stream?: boolean;          // Always true for streaming methods
  timeout?: number;          // Request timeout in ms, default 30000
  maxRetries?: number;       // Max retry attempts, default 3
}
```

### Option Examples

```typescript
// Creative response with low temperature
client.streamGenerate("Write a story", {
  temperature: 0.9,
  maxTokens: 1000
});

// Concise response
client.streamGenerate("Explain briefly", {
  temperature: 0.3,
  maxTokens: 50
});

// Fast response with short timeout
client.streamGenerate("Quick answer", {
  timeout: 5000,
  maxRetries: 1
});
```

---

## Best Practices

### 1. Always Handle All Chunk Types

```typescript
for await (const chunk of client.streamGenerate("Test")) {
  switch (chunk.type) {
    case "text":
      // Process content
      break;
    case "error":
      // Handle errors
      break;
    case "done":
      // Cleanup
      break;
  }
}
```

### 2. Use Appropriate Timeouts

```typescript
// Short prompts: 5-10 seconds
client.streamGenerate("Quick question", { timeout: 5000 });

// Long prompts: 30-60 seconds
client.streamGenerate("Write an essay", { timeout: 60000 });

// Unknown length: Use default (30s)
client.streamGenerate("Varied prompt");
```

### 3. Filter Content While Streaming

```typescript
// Don't wait for full response to filter
for await (const chunk of client.streamGenerate("Text")) {
  if (chunk.type === "text") {
    const clean = sanitize(chunk.content);
    writeToUI(clean);
  }
}
```

### 4. Track Progress

```typescript
let progress = 0;
for await (const chunk of client.streamGenerate("Long text")) {
  if (chunk.type === "text") {
    progress += chunk.content.length;
    updateProgressBar(progress);
  }
}
```

### 5. Handle Interrupted Streams

```typescript
let abort = false;

for await (const chunk of client.streamGenerate("Test")) {
  if (abort) break;
  
  if (chunk.type === "text") {
    process.stdout.write(chunk.content);
  }
}

// Or use AbortController
const controller = new AbortController();
setTimeout(() => controller.abort(), 10000);
```

### 6. Accumulate for Final Processing

```typescript
const buffer: string[] = [];

for await (const chunk of client.streamGenerate("Text")) {
  if (chunk.type === "text") {
    buffer.push(chunk.content);
    // Stream to UI in real-time
    streamToUI(chunk.content);
  }
}

// Post-process after stream completes
const fullText = buffer.join("");
processFullText(fullText);
```

---

## Streaming vs Non-Streaming

| Aspect | Streaming | Non-Streaming |
|--------|-----------|---------------|
| **Response Time** | First chunk arrives in ~100-500ms | Full response takes longer |
| **User Experience** | Real-time feedback | Waits for completion |
| **Token Usage** | Same (tracked in final chunk) | Same |
| **Error Handling** | Same (errors in chunk) | Same (throws) |
| **Use Case** | Interactive, long responses | Batch, short responses |
| **Memory** | Lower (process incrementally) | Higher (hold full response) |

### When to Use Streaming

✅ **Use streaming when:**
- Interactive chat interfaces
- Long-form content generation
- Real-time feedback needed
- User should see progress
- Processing content as it arrives

❌ **Use non-streaming when:**
- Very short responses (< 100 chars)
- Need full response before processing
- Batch processing
- Simpler error handling preferred

---

## Testing

See `/tests/ai-stream.test.ts` for comprehensive tests covering:

- SSE parsing (parseSSERow, parseSSEStream)
- Schema validation (StreamChunk)
- Client streaming methods
- Error handling
- Chunk splitting across network packets
- Timeout and retry logic

Run tests:

```bash
bun test tests/ai-stream.test.ts
```

---

## Troubleshooting

### Common Issues

**1. No chunks received**
```typescript
// Check API key is set
const client = new GLMClient(process.env.Z_AI_API_KEY);

// Verify network connectivity
// Check for firewall/proxy issues
```

**2. Chunks are empty**
```typescript
// Some chunks have empty content
for await (const chunk of client.streamGenerate("Test")) {
  if (chunk.type === "text" && chunk.content) {
    // Only process non-empty chunks
    console.log(chunk.content);
  }
}
```

**3. Timeout errors**
```typescript
// Increase timeout
client.streamGenerate("Long prompt", {
  timeout: 60000,  // 60 seconds
});

// Or break into smaller prompts
```

**4. Rate limit errors**
```typescript
// Wait and retry
for await (const chunk of client.streamGenerate("Test", {
  maxRetries: 3,
})) {
  if (chunk.type === "error" && chunk.error.includes("rate limit")) {
    console.log("Waiting...");
    await sleep(10000);
  }
}
```

---

## Performance Tips

1. **Minimize Chunk Processing**: Keep chunk handler fast
2. **Batch UI Updates**: Update UI every N chunks
3. **Use Native Buffers**: Don't copy unnecessarily
4. **Close Streams Early**: Abort if not needed
5. **Reuse Client**: Single client instance per app

---

## Related Modules

- **`/app/server/lib/ai/client.ts`**: GLMClient implementation
- **`/app/server/lib/schemas/ai.ts`**: Streaming schemas and types
- **`/app/server/lib/ai/prompts.ts`**: Prompt building utilities
- **`/app/server/lib/ai/examples/streaming.ts`**: Complete examples

---

## API Compatibility

This implementation follows the OpenAI SSE streaming protocol and is compatible with:

- GLM-4.7, GLM-4.6, GLM-4.5, GLM-4.5-air (Z.AI API)
- OpenAI-compatible APIs
- Any OpenAI-compatible LLM endpoint

---

## Version History

- **v1.0.0** (Current): Initial streaming implementation
  - SSE parsing
  - AsyncGenerator interface
  - Error handling
  - Token tracking
  - Retry logic
  - Comprehensive tests

---

## Support

For issues or questions:
1. Check `/tests/ai-stream.test.ts` for usage patterns
2. Review `/app/server/lib/ai/examples/streaming.ts` for examples
3. Examine `/app/server/lib/schemas/ai.ts` for type definitions