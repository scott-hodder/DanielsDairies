import DOMPurify from 'dompurify';

/**
 * Sanitize a full HTML string before inserting via innerHTML.
 * Use this when setting innerHTML with complex markup that may
 * include database-sourced values.
 */
export function sanitizeHTML(dirty) {
  if (typeof dirty !== 'string') return '';
  return DOMPurify.sanitize(dirty);
}

/**
 * Escape a plain-text value for safe interpolation into HTML templates.
 * Use this to wrap any database value before embedding in innerHTML template literals.
 *
 * Example: `<span>${escapeHtml(child.name)}</span>`
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
