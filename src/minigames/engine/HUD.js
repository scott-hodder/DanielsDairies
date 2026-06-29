/**
 * DOM overlay HUD for game UI: health, objective, score, progress.
 * Sits on top of the game canvas as an absolute-positioned div.
 */
export default class HUD {
  constructor(container) {
    this.el = document.createElement('div');
    this.el.className = 'mg-hud';
    this.el.style.cssText = `
      position:absolute;top:0;left:0;right:0;
      display:flex;justify-content:space-between;align-items:flex-start;
      padding:8px 44px 8px 10px;pointer-events:none;z-index:10;
      font-family:'League Spartan',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    `;
    container.style.position = 'relative';
    container.appendChild(this.el);

    this._left = document.createElement('div');
    this._center = document.createElement('div');
    this._right = document.createElement('div');
    this._left.style.cssText = 'display:flex;gap:4px;align-items:center;';
    this._center.style.cssText = 'text-align:center;flex:1;min-width:0;';
    this._right.style.cssText = 'text-align:right;white-space:nowrap;';
    this.el.append(this._left, this._center, this._right);

    this._hearts = 0;
    this._maxHearts = 0;
  }

  /** Set lives display (hearts). */
  setLives(current, max) {
    this._hearts = current;
    this._maxHearts = max;
    let html = '';
    for (let i = 0; i < max; i++) {
      html += `<span style="font-size:20px;filter:${i < current ? 'none' : 'grayscale(1) opacity(0.3)'}">\u2764\uFE0F</span>`;
    }
    this._left.innerHTML = html;
  }

  /** Set center objective text. */
  setObjective(text) {
    this._center.innerHTML = `<span style="font-size:14px;font-weight:600;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.5);background:rgba(0,0,0,0.35);padding:4px 12px;border-radius:10px;">${text}</span>`;
  }

  /** Set right-side score/progress text. */
  setScore(text) {
    this._right.innerHTML = `<span style="font-size:15px;font-weight:700;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.5)">${text}</span>`;
  }

  /** Show a brief floating message (e.g., "+10", "Great!"). */
  flash(text, color = '#FFD700') {
    const msg = document.createElement('div');
    msg.textContent = text;
    msg.style.cssText = `
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      font-size:28px;font-weight:800;color:${color};
      text-shadow:0 2px 6px rgba(0,0,0,0.4);
      pointer-events:none;z-index:20;
      animation:mg-hud-flash 0.8s ease-out forwards;
    `;
    this.el.parentElement.appendChild(msg);
    setTimeout(() => msg.remove(), 850);
  }

  dispose() {
    this.el.remove();
  }
}

// Inject flash animation if not already present
if (typeof document !== 'undefined' && !document.getElementById('mg-hud-styles')) {
  const style = document.createElement('style');
  style.id = 'mg-hud-styles';
  style.textContent = `
    @keyframes mg-hud-flash {
      0% { opacity:1; transform:translate(-50%,-50%) scale(0.5); }
      30% { opacity:1; transform:translate(-50%,-50%) scale(1.2); }
      100% { opacity:0; transform:translate(-50%,-80%) scale(1); }
    }
  `;
  document.head.appendChild(style);
}
