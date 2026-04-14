/**
 * HTML escaping utility to prevent XSS when interpolating
 * dynamic data into innerHTML template literals.
 *
 * @module escape-html
 */

/**
 * Escapes HTML special characters in a string to prevent XSS injection.
 *
 * Covers the five characters required by OWASP:
 *   & → &amp;
 *   < → &lt;
 *   > → &gt;
 *   " → &quot;
 *   ' → &#x27;
 *
 * @param str - The raw string to escape
 * @returns The HTML-safe escaped string
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
