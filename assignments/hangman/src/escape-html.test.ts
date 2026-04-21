import { describe, it, expect } from 'vitest';
import { escapeHtml } from './escape-html';

describe('escapeHtml', () => {
  it('escapes & to &amp;', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('escapes < to &lt;', () => {
    expect(escapeHtml('a < b')).toBe('a &lt; b');
  });

  it('escapes > to &gt;', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  it('escapes " to &quot;', () => {
    expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;');
  });

  it("escapes ' to &#x27;", () => {
    expect(escapeHtml("it's")).toBe('it&#x27;s');
  });

  it('returns empty string unchanged', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('returns string with no special characters unchanged', () => {
    expect(escapeHtml('hello world 123')).toBe('hello world 123');
  });

  it('escapes mixed content with all special characters', () => {
    expect(escapeHtml('<div class="foo">&bar\'baz</div>')).toBe(
      '&lt;div class=&quot;foo&quot;&gt;&amp;bar&#x27;baz&lt;/div&gt;',
    );
  });

  it('escapes multiple special characters in sequence', () => {
    expect(escapeHtml('<<<>>>')).toBe('&lt;&lt;&lt;&gt;&gt;&gt;');
  });

  it('escapes repeated & characters without double-escaping', () => {
    expect(escapeHtml('&&&')).toBe('&amp;&amp;&amp;');
  });

  it('escapes a mix of quotes', () => {
    expect(escapeHtml("a\"b'c")).toBe('a&quot;b&#x27;c');
  });

  it('handles string that is only special characters', () => {
    expect(escapeHtml('<>&"\'')).toBe('&lt;&gt;&amp;&quot;&#x27;');
  });

  it('throws on null input', () => {
    expect(() => escapeHtml(null as unknown as string)).toThrow();
  });

  it('throws on undefined input', () => {
    expect(() => escapeHtml(undefined as unknown as string)).toThrow();
  });

  it('handles numeric-like string without modification', () => {
    expect(escapeHtml('42')).toBe('42');
  });

  it('escapes HTML script tag', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
    );
  });

  it('is idempotent: double-escaping does not produce raw HTML', () => {
    const input = '<div class="a">&foo\'bar</div>';
    const escaped = escapeHtml(input);
    const doubleEscaped = escapeHtml(escaped);
    expect(doubleEscaped).not.toMatch(/[<>"']/);
    expect(doubleEscaped).toBe(escapeHtml(escaped));
    // The double-escaped string should contain the escaped & from the first pass
    expect(doubleEscaped).toContain('&amp;lt;');
    expect(doubleEscaped).toContain('&amp;gt;');
    expect(doubleEscaped).toContain('&amp;amp;');
    expect(doubleEscaped).toContain('&amp;quot;');
    expect(doubleEscaped).toContain('&amp;#x27;');
  });
});
