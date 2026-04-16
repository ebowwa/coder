import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../escape-html';

describe('escapeHtml', () => {
  it('should escape ampersands', () => {
    expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
  });

  it('should escape less-than signs', () => {
    expect(escapeHtml('a < b')).toBe('a &lt; b');
  });

  it('should escape greater-than signs', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  it('should escape double quotes', () => {
    expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;');
  });

  it('should escape single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#x27;s');
  });

  it('should return an empty string unchanged', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('should return a safe string unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });

  it('should escape a full XSS payload', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('should handle all five special characters in one string', () => {
    expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#x27;');
  });

  it('should escape ampersands first to avoid double-escaping', () => {
    // If & were not escaped first, &lt; would become &amp;lt;
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });

  it('should handle unicode text without modification', () => {
    expect(escapeHtml('café 你 knockout')).toBe('café 你 knockout');
  });
});
