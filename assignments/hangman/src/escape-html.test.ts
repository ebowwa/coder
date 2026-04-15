import { describe, expect, it } from "vitest";
import { escapeHtml } from "./escape-html";

describe("escapeHtml", () => {
  it("escapes & to &amp;", () => {
    expect(escapeHtml("&")).toBe("&amp;");
  });

  it("escapes < to &lt;", () => {
    expect(escapeHtml("<")).toBe("&lt;");
  });

  it("escapes > to &gt;", () => {
    expect(escapeHtml(">")).toBe("&gt;");
  });

  it('escapes " to &quot;', () => {
    expect(escapeHtml('"')).toBe("&quot;");
  });

  it("escapes ' to &#x27;", () => {
    expect(escapeHtml("'")).toBe("&#x27;");
  });

  it("escapes mixed entities in a string", () => {
    expect(escapeHtml("<div class=\"foo\">&bar</div>")).toBe(
      "&lt;div class=&quot;foo&quot;&gt;&amp;bar&lt;/div&gt;"
    );
  });

  it("returns strings with no special characters unchanged", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });

  it("returns empty string unchanged", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("passes numeric and symbol characters through unchanged", () => {
    expect(escapeHtml("price: $100 (50%) + tax!")).toBe(
      "price: $100 (50%) + tax!"
    );
  });

  it("handles multiple consecutive special characters", () => {
    expect(escapeHtml("<<<>>>")).toBe("&lt;&lt;&lt;&gt;&gt;&gt;");
    expect(escapeHtml("&&&")).toBe("&amp;&amp;&amp;");
    expect(escapeHtml('"""')).toBe("&quot;&quot;&quot;");
    expect(escapeHtml("'''")).toBe("&#x27;&#x27;&#x27;");
  });

  it("escapes & before other entities to avoid double-encoding", () => {
    expect(escapeHtml("&<")).toBe("&amp;&lt;");
    expect(escapeHtml("a&b<c")).toBe("a&amp;b&lt;c");
  });

  it("returns a string type", () => {
    const result = escapeHtml("test");
    expect(typeof result).toBe("string");
  });

  it("double-escapes already-escaped entities (no double-escape prevention)", () => {
    // This escape function is not idempotent — calling it on already-escaped
    // content will re-escape the & in the entity references.
    expect(escapeHtml("&amp;")).toBe("&amp;amp;");
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
    expect(escapeHtml("&quot;")).toBe("&amp;quot;");
    expect(escapeHtml("&#x27;")).toBe("&amp;#x27;");
  });

  it("preserves unicode characters unchanged", () => {
    expect(escapeHtml("café")).toBe("café");
    expect(escapeHtml("日本語")).toBe("日本語");
    expect(escapeHtml("emoji 🎉")).toBe("emoji 🎉");
  });

  it("handles whitespace-only strings", () => {
    expect(escapeHtml("   ")).toBe("   ");
    expect(escapeHtml("\t\n")).toBe("\t\n");
  });

  it("escapes all five OWASP characters at once", () => {
    expect(escapeHtml("&<>\"'")).toBe("&amp;&lt;&gt;&quot;&#x27;");
  });

  it("does not mutate the input (pure function)", () => {
    const original = '<script>alert("xss")</script>';
    const copy = original;
    escapeHtml(original);
    expect(original).toBe(copy);
  });
});
