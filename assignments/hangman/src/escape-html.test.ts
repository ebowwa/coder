import { describe, expect, it } from "bun:test";
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
});
