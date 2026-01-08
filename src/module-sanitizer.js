// Module Content Sanitizer
// Converts raw HTML into safe, declarative module content

export class ModuleSanitizer {
  constructor() {
    // Allowed HTML tags
    this.allowedTags = new Set([
      'article', 'section', 'div', 'span', 'header', 'footer',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'ul', 'ol', 'li', 'dl', 'dt', 'dd',
      'strong', 'em', 'b', 'i', 'u', 'mark',
      'blockquote', 'pre', 'code',
      'a', 'img',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
      'label', 'input', 'textarea', 'select', 'option', 'button'
    ]);

    // Allowed attributes (global)
    this.allowedAttrs = new Set([
      'class', 'id', 'title', 'alt', 'src', 'href',
      'type', 'placeholder', 'rows', 'cols', 'value',
      'for', 'name', 'disabled', 'readonly', 'checked'
    ]);

    // Validation warnings/errors
    this.warnings = [];
    this.errors = [];
  }

  /**
   * Main sanitization method
   * @param {string} htmlContent - Raw HTML content
   * @returns {object} { sanitized: string, warnings: [], errors: [], manifest: {} }
   */
  sanitize(htmlContent) {
    this.warnings = [];
    this.errors = [];

    // Parse HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    // Extract body content or find article
    let content = doc.querySelector('article[data-module]') || doc.body;

    // Remove dangerous elements
    this.removeDangerousElements(content);

    // Sanitize attributes
    this.sanitizeAttributes(content);

    // Extract manifest
    const manifest = this.extractManifest(content);

    // Wrap in container if needed
    let sanitized = content.innerHTML;
    if (!htmlContent.includes('data-module')) {
      sanitized = `<article class="dd-module" data-module>\n${sanitized}\n</article>`;
    }

    return {
      sanitized,
      warnings: this.warnings,
      errors: this.errors,
      manifest,
      isValid: this.errors.length === 0
    };
  }

  /**
   * Remove scripts, iframes, and dangerous elements
   */
  removeDangerousElements(root) {
    // Remove scripts
    const scripts = root.querySelectorAll('script');
    scripts.forEach(script => {
      this.warnings.push(`Removed <script> tag`);
      script.remove();
    });

    // Remove iframes
    const iframes = root.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      this.warnings.push(`Removed <iframe> tag`);
      iframe.remove();
    });

    // Remove objects and embeds
    const objects = root.querySelectorAll('object, embed');
    objects.forEach(obj => {
      this.warnings.push(`Removed <${obj.tagName.toLowerCase()}> tag`);
      obj.remove();
    });

    // Remove style tags
    const styles = root.querySelectorAll('style');
    styles.forEach(style => {
      this.warnings.push(`Removed <style> tag`);
      style.remove();
    });

    // Remove link tags (external CSS)
    const links = root.querySelectorAll('link[rel="stylesheet"]');
    links.forEach(link => {
      this.warnings.push(`Removed external stylesheet: ${link.href}`);
      link.remove();
    });

    // Check for disallowed tags
    const allElements = root.querySelectorAll('*');
    allElements.forEach(el => {
      if (!this.allowedTags.has(el.tagName.toLowerCase())) {
        this.warnings.push(`Removed disallowed tag: <${el.tagName.toLowerCase()}>`);
        el.remove();
      }
    });
  }

  /**
   * Sanitize attributes on all elements
   */
  sanitizeAttributes(root) {
    const allElements = root.querySelectorAll('*');
    
    allElements.forEach(el => {
      const attrs = Array.from(el.attributes);
      
      attrs.forEach(attr => {
        const name = attr.name.toLowerCase();
        
        // Allow data-* attributes
        if (name.startsWith('data-')) {
          return;
        }
        
        // Remove event handlers
        if (name.startsWith('on')) {
          this.warnings.push(`Removed event handler: ${name} on <${el.tagName.toLowerCase()}>`);
          el.removeAttribute(name);
          return;
        }
        
        // Remove style attribute
        if (name === 'style') {
          this.warnings.push(`Removed inline style on <${el.tagName.toLowerCase()}>`);
          el.removeAttribute(name);
          return;
        }
        
        // Check if attribute is allowed
        if (!this.allowedAttrs.has(name)) {
          this.warnings.push(`Removed disallowed attribute: ${name} on <${el.tagName.toLowerCase()}>`);
          el.removeAttribute(name);
          return;
        }
        
        // Sanitize href and src
        if (name === 'href' || name === 'src') {
          const value = attr.value.toLowerCase().trim();
          if (value.startsWith('javascript:') || value.startsWith('data:')) {
            this.errors.push(`Dangerous ${name} detected: ${attr.value}`);
            el.removeAttribute(name);
          }
        }
      });
    });
  }

  /**
   * Extract interactive markers and build manifest
   */
  extractManifest(root) {
    const manifest = {
      pages: [],
      activities: [],
      actions: [],
      components: [],
      bindings: []
    };

    // Extract pages
    const pages = root.querySelectorAll('[data-page]');
    pages.forEach((page, idx) => {
      manifest.pages.push({
        index: idx,
        title: page.getAttribute('data-page-title') || `Page ${idx + 1}`,
        icon: page.getAttribute('data-page-icon') || '📄'
      });
    });

    // Extract activities (checkboxes)
    const activities = root.querySelectorAll('[data-activity]');
    activities.forEach(activity => {
      manifest.activities.push(activity.getAttribute('data-activity'));
    });

    // Extract actions
    const actions = root.querySelectorAll('[data-action]');
    actions.forEach(action => {
      manifest.actions.push({
        action: action.getAttribute('data-action'),
        amount: action.getAttribute('data-amount'),
        element: action.tagName.toLowerCase()
      });
    });

    // Extract components
    const components = root.querySelectorAll('[data-component]');
    components.forEach(comp => {
      manifest.components.push({
        type: comp.getAttribute('data-component'),
        bind: comp.getAttribute('data-bind')
      });
    });

    // Extract data bindings
    const bindings = root.querySelectorAll('[data-bind]');
    bindings.forEach(binding => {
      const key = binding.getAttribute('data-bind');
      if (!manifest.bindings.includes(key)) {
        manifest.bindings.push(key);
      }
    });

    return manifest;
  }

  /**
   * Generate validation report HTML
   */
  generateReport() {
    let html = '<div class="validation-report">';
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      html += '<p class="report-success">✅ Content is valid and safe!</p>';
    }
    
    if (this.errors.length > 0) {
      html += '<div class="report-errors">';
      html += '<h4>❌ Errors (must fix):</h4><ul>';
      this.errors.forEach(err => {
        html += `<li>${err}</li>`;
      });
      html += '</ul></div>';
    }
    
    if (this.warnings.length > 0) {
      html += '<div class="report-warnings">';
      html += '<h4>⚠️ Warnings (auto-fixed):</h4><ul>';
      this.warnings.forEach(warn => {
        html += `<li>${warn}</li>`;
      });
      html += '</ul></div>';
    }
    
    html += '</div>';
    return html;
  }
}
