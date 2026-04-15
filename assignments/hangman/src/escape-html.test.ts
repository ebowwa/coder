import { describe, it, expect } from 'bun:test';
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
});
