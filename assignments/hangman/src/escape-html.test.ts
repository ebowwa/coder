/**
 * Tests for escapeHtml utility
 * Verifies XSS prevention for all OWASP-required characters
 * and common injection patterns.
 */

import { describe, it, expect } from 'vitest';
import { escapeHtml } from './escape-html';

describe('escapeHtml', () => {
  it('returns plain text unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });

  it('returns empty string unchanged', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('escapes ampersands', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('escapes less-than signs', () => {
    expect(escapeHtml('a < b')).toBe('a &lt; b');
  });

  it('escapes greater-than signs', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's fine")).toBe('it&#x27;s fine');
  });

  it('escapes all five special characters together', () => {
    expect(escapeHtml('<>&"\'')).toBe('&lt;&gt;&amp;&quot;&#x27;');
  });

  it('escapes a script tag injection', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
    );
  });

  it('escapes an img onerror injection', () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe(
      '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;',
    );
  });

  it('escapes an event handler in attribute', () => {
    expect(escapeHtml('" onclick="alert(1)')).toBe(
      '&quot; onclick=&quot;alert(1)',
    );
  });

  it('handles unicode characters without modification', () => {
    expect(escapeHtml('日本太郎')).toBe('日本太郎');
  });

  it('handles emoji without modification', () => {
    expect(escapeHtml('🎮 Game Room 🎯')).toBe('🎮 Game Room 🎯');
  });

  it('handles numbers converted to strings', () => {
    expect(escapeHtml(String(42))).toBe('42');
  });

  it('escapes double quotes in template literal injection', () => {
    const malicious = '${constructor.constructor("return this")()}';
    // Double quotes are escaped even though $ and { are not HTML-special
    expect(escapeHtml(malicious)).toBe('${constructor.constructor(&quot;return this&quot;)()}');
    expect(escapeHtml(malicious)).not.toContain('<');
  });

  it('escapes double-encoded ampersand', () => {
    expect(escapeHtml('&amp;')).toBe('&amp;amp;');
  });

  it('handles long strings efficiently', () => {
    const long = '<script>'.repeat(1000);
    const escaped = escapeHtml(long);
    expect(escaped).not.toContain('<');
    expect(escaped).not.toContain('>');
  });
});
