/**
 * DOM overlay for NPC dialogue and choice prompts.
 * Speech-bubble style, supports 2-3 choice buttons.
 * Returns a promise that resolves with the chosen index.
 */
export default class DialogueBox {
  constructor(container) {
    this.container = container;
    this.el = null;
    this._resolve = null;
  }

  /**
   * Show dialogue with optional choices.
   * @param {Object} opts
   * @param {string} opts.text
   * @param {string} [opts.speaker]
   * @param {string[]} [opts.choices] — if provided, buttons shown; resolves with index
   * @param {number} [opts.autoCloseMs] — auto-close after N ms (no choices)
   * @returns {Promise<number>} — chosen index, or -1 if auto-closed
   */
  show(opts) {
    this.hide();
    return new Promise((resolve) => {
      this._resolve = resolve;
      this.el = document.createElement('div');
      this.el.className = 'mg-dialogue';
      this.el.style.cssText = `
        position:absolute;bottom:16px;left:12px;right:12px;
        background:rgba(255,255,255,0.95);backdrop-filter:blur(6px);
        border-radius:16px;padding:14px 18px;z-index:20;
        box-shadow:0 4px 20px rgba(0,0,0,0.2);
        pointer-events:auto;
        animation:mg-dialogue-in 0.25s ease-out;
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      `;

      let html = '';
      if (opts.speaker) {
        html += `<div style="font-size:12px;font-weight:700;color:#405878;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;font-family:'League Spartan',sans-serif">${opts.speaker}</div>`;
      }
      html += `<div style="font-size:15px;color:#1E293B;line-height:1.5;margin-bottom:${opts.choices ? '12' : '0'}px;font-family:'League Spartan',sans-serif">${opts.text}</div>`;

      if (opts.choices && opts.choices.length) {
        html += '<div style="display:flex;gap:8px;flex-wrap:wrap">';
        opts.choices.forEach((choice, i) => {
          html += `<button class="mg-dialogue-btn" data-idx="${i}" style="
            flex:1;min-width:80px;padding:12px 14px;border:2px solid #E2E8F0;
            border-radius:12px;background:#F8FAFC;color:#334155;
            font-size:14px;font-weight:600;cursor:pointer;
            transition:all 0.15s ease;min-height:44px;
            font-family:'League Spartan',-apple-system,sans-serif;
          ">${choice}</button>`;
        });
        html += '</div>';
      }
      this.el.innerHTML = html;
      this.container.appendChild(this.el);

      // Choice buttons
      if (opts.choices && opts.choices.length) {
        this.el.querySelectorAll('.mg-dialogue-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.idx, 10);
            this._flashChoice(btn, idx);
          });
          // Hover
          btn.addEventListener('pointerenter', () => {
            btn.style.borderColor = '#6366F1';
            btn.style.background = '#EEF2FF';
          });
          btn.addEventListener('pointerleave', () => {
            btn.style.borderColor = '#E2E8F0';
            btn.style.background = '#F8FAFC';
          });
        });
      }

      // Auto-close
      if (opts.autoCloseMs && (!opts.choices || !opts.choices.length)) {
        setTimeout(() => {
          this.hide();
          resolve(-1);
        }, opts.autoCloseMs);
      }
    });
  }

  _flashChoice(btn, idx) {
    btn.style.borderColor = '#6366F1';
    btn.style.background = '#6366F1';
    btn.style.color = '#fff';
    setTimeout(() => {
      this.hide();
      this._resolve?.(idx);
    }, 200);
  }

  /** Highlight a choice as correct (green) or wrong (red). */
  showResult(idx, correct) {
    const btn = this.el?.querySelector(`[data-idx="${idx}"]`);
    if (!btn) return;
    btn.style.borderColor = correct ? '#22C55E' : '#EF4444';
    btn.style.background = correct ? '#DCFCE7' : '#FEE2E2';
    btn.style.color = correct ? '#166534' : '#991B1B';
  }

  hide() {
    if (this.el) {
      this.el.remove();
      this.el = null;
    }
  }

  dispose() {
    this.hide();
  }
}

// Inject animation
if (typeof document !== 'undefined' && !document.getElementById('mg-dialogue-styles')) {
  const style = document.createElement('style');
  style.id = 'mg-dialogue-styles';
  style.textContent = `
    @keyframes mg-dialogue-in {
      from { opacity:0; transform:translateY(12px); }
      to { opacity:1; transform:translateY(0); }
    }
  `;
  document.head.appendChild(style);
}
