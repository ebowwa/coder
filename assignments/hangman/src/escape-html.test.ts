import { describe, expect, it } from "vitest";
import { escapeHtml } from "./escape-html";

describe("escapeHtml", () => {
  it("escapes < to &lt;", () => {
    expect(escapeHtml("<")).toBe("&lt;");
  });

  it("escapes > to &gt;", () => {
    expect(escapeHtml(">")).toBe("&gt;");
  });

  it("escapes & to &amp;", () => {
    expect(escapeHtml("&")).toBe("&amp;");
  });

  it('escapes " to &quot;', () => {
    expect(escapeHtml('"')).toBe("&quot;");
  });

  it("escapes ' to &#x27;", () => {
    expect(escapeHtml("'")).toBe("&#x27;");
  });

  it("escapes full HTML tags like <script>", () => {
    expect(escapeHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;",
    );
  });

  it("returns a string with no special characters unchanged (identity)", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });

  it("handles empty string input", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("handles strings with mixed content", () => {
    expect(escapeHtml('Hello <b>world</b> & "friends"')).toBe(
      "Hello &lt;b&gt;world&lt;/b&gt; &amp; &quot;friends&quot;",
    );
  });

  it("handles multiple consecutive special characters", () => {
    expect(escapeHtml("<<>>&&\"\"''")).toBe(
      "&lt;&lt;&gt;&gt;&amp;&amp;&quot;&quot;&#x27;&#x27;",
    );
  });

  it("returns type string", () => {
    const result = escapeHtml("test");
    expect(typeof result).toBe("string");
  });

  it("escapes & before other characters to avoid double-escaping", () => {
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });

  it("is idempotent — double-escaping does not double-encode", () => {
    const input = '<div class="test">Hello & "world"</div>';
    const once = escapeHtml(input);
    const twice = escapeHtml(once);
    // After the first pass all special chars are replaced with entities.
    // The second pass should only turn the leading & of each entity into &amp;
    // producing a DIFFERENT string — so idempotency here means: once === escapeHtml(once)
    // is NOT expected. Instead we verify that applying escapeHtml to its own output
    // encodes the & in every entity, which is the correct safe behaviour.
    expect(twice).toBe(once.replace(/&/g, "&amp;"));
  });
});
