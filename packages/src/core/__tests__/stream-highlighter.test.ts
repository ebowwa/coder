import { describe, it, expect } from "bun:test";
import {
  createStreamHighlighter,
  highlightTextWithCodeBlocks,
} from "../stream-highlighter.js";

describe("createStreamHighlighter", () => {
  describe("process()", () => {
    it("handles empty string", () => {
      const highlighter = createStreamHighlighter();
      const result = highlighter.process("");
      expect(result).toBe("");
    });

    it("handles plain text", () => {
      const highlighter = createStreamHighlighter();
      const result = highlighter.process("Hello world\nThis is plain text");
      const flushed = highlighter.flush();
      expect(result + flushed).toContain("Hello world");
    });

    it("handles code blocks with ```typescript", () => {
      const highlighter = createStreamHighlighter();
      const input = "```typescript\nconst x = 42;\n```";
      const result = highlighter.process(input);
      expect(result).toContain("```");
      expect(result).toContain("typescript");
    });
  });

  describe("flush()", () => {
    it("returns remaining buffer", () => {
      const highlighter = createStreamHighlighter();
      highlighter.process("Some text");
      const result = highlighter.flush();
      expect(result).toContain("Some text");
    });
  });
});

describe("highlightTextWithCodeBlocks", () => {
  it("handles code blocks with typescript", () => {
    const input = "```typescript\nconst x: number = 1;\n```";
    const result = highlightTextWithCodeBlocks(input);
    expect(result).toContain("```");
    expect(result).toContain("typescript");
  });

  it("handles code blocks with rust", () => {
    const input = "```rust\nfn main() {}\n```";
    const result = highlightTextWithCodeBlocks(input);
    expect(result).toContain("```");
    expect(result).toContain("rust");
  });

  it("handles code blocks with python", () => {
    const input = "```python\ndef hello():\n    pass\n```";
    const result = highlightTextWithCodeBlocks(input);
    expect(result).toContain("```");
    expect(result).toContain("python");
  });

  it("handles code blocks with bash", () => {
    const input = "```bash\necho hello\n```";
    const result = highlightTextWithCodeBlocks(input);
    expect(result).toContain("```");
    expect(result).toContain("bash");
  });
});

describe("ANSI codes", () => {
  it("includes ANSI codes in highlighted code blocks", () => {
    const input = "```typescript\nconst x = 42;\n```";
    const result = highlightTextWithCodeBlocks(input);
    // ANSI escape sequence pattern
    expect(result).toMatch(/\x1b\[/);
  });
});

describe("streaming in chunks", () => {
  it("processes text split across multiple process() calls", () => {
    const highlighter = createStreamHighlighter();
    const result1 = highlighter.process("Hello ");
    const result2 = highlighter.process("world");
    const result3 = highlighter.process("!");
    const flushed = highlighter.flush();
    const fullOutput = result1 + result2 + result3 + flushed;
    expect(fullOutput).toContain("Hello");
    expect(fullOutput).toContain("world");
  });

  it("processes code block split across chunks", () => {
    const highlighter = createStreamHighlighter();
    const result1 = highlighter.process("```type");
    const result2 = highlighter.process("script\nconst x = ");
    const result3 = highlighter.process("1;\n```");
    const flushed = highlighter.flush();
    const fullOutput = result1 + result2 + result3 + flushed;
    expect(fullOutput).toContain("typescript");
  });
});

describe("incomplete code fence buffering", () => {
  it("buffers single backtick as inline code", () => {
    const highlighter = createStreamHighlighter();
    const result = highlighter.process("This has `inline` code");
    const flushed = highlighter.flush();
    expect(result + flushed).toContain("inline");
  });

  it("buffers two backticks without treating as code fence", () => {
    const highlighter = createStreamHighlighter();
    const result = highlighter.process("Text with `` incomplete");
    const flushed = highlighter.flush();
    expect(result + flushed).toContain("incomplete");
  });
});

describe("multiple code blocks", () => {
  it("handles two code blocks with text between", () => {
    const input = "```ts\ncode1\n```\nText\n```rust\ncode2\n```";
    const result = highlightTextWithCodeBlocks(input);
    expect(result).toContain("ts");
    expect(result).toContain("rust");
    expect(result).toContain("Text");
  });

  it("handles adjacent code blocks", () => {
    const input = "```python\na\n```\n```js\nb\n```";
    const result = highlightTextWithCodeBlocks(input);
    expect(result).toContain("python");
    expect(result).toContain("js");
  });
});

describe("diff highlighting", () => {
  it("highlights unified diff format", () => {
    const input = "```diff\n--- a/file\n+++ b/file\n-old\n+new\n```";
    const result = highlightTextWithCodeBlocks(input);
    expect(result).toContain("---");
    expect(result).toContain("+++");
  });

  it("highlights git diff format", () => {
    const input = "```diff\ndiff --git\n-index..\n```";
    const result = highlightTextWithCodeBlocks(input);
    expect(result).toContain("diff");
  });
});

describe("edge cases", () => {
  it("handles empty code block", () => {
    const input = "```typescript\n```";
    const result = highlightTextWithCodeBlocks(input);
    expect(result).toContain("typescript");
  });

  it("handles code block with no language", () => {
    const input = "```\nplain code\n```";
    const result = highlightTextWithCodeBlocks(input);
    expect(result).toContain("plain code");
  });

  it("handles unclosed code block", () => {
    const highlighter = createStreamHighlighter();
    const result = highlighter.process("```ts\ncode");
    const flushed = highlighter.flush();
    expect(result + flushed).toContain("ts");
  });

  it("handles very long text", () => {
    const longText = "x".repeat(10000);
    const result = highlightTextWithCodeBlocks(longText);
    expect(result).toContain("x");
  });

  it("handles unicode content", () => {
    const input = "Hello 世界 🌍";
    const result = highlightTextWithCodeBlocks(input);
    expect(result).toContain("世界");
  });

  it("handles code block with file path", () => {
    const input = "```typescript src/file.ts\ncode\n```";
    const result = highlightTextWithCodeBlocks(input);
    expect(result).toContain("src/file.ts");
  });
});
