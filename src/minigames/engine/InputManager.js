/**
 * Unified input: keyboard, touch, mouse.
 * Provides directional state + action button + swipe detection.
 */
export default class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = { left: false, right: false, up: false, down: false, action: false };
    this.touch = { active: false, startX: 0, startY: 0, x: 0, y: 0 };
    this.swipe = null; // {dir: 'up'|'down'|'left'|'right'} set for one frame after swipe
    this._listeners = [];
    this._actionCallbacks = [];
    this._swipeThreshold = 30;
    this._bind();
  }

  /** Register a callback for action button / tap. */
  onAction(fn) {
    this._actionCallbacks.push(fn);
    return () => {
      const idx = this._actionCallbacks.indexOf(fn);
      if (idx >= 0) this._actionCallbacks.splice(idx, 1);
    };
  }

  /** Get canvas-relative coordinates from an event. */
  _canvasPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) / rect.width * (this.canvas.width / (window.devicePixelRatio || 1)),
      y: (clientY - rect.top) / rect.height * (this.canvas.height / (window.devicePixelRatio || 1)),
    };
  }

  _bind() {
    const on = (el, evt, fn, opts) => {
      el.addEventListener(evt, fn, opts);
      this._listeners.push([el, evt, fn, opts]);
    };

    // Keyboard — prevent page scrolling for all game keys
    const GAME_KEYS = new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Enter','a','d','w','s']);
    on(window, 'keydown', (e) => {
      if (GAME_KEYS.has(e.key)) e.preventDefault();
      switch (e.key) {
        case 'ArrowLeft': case 'a': this.keys.left = true; break;
        case 'ArrowRight': case 'd': this.keys.right = true; break;
        case 'ArrowUp': case 'w': this.keys.up = true; break;
        case 'ArrowDown': case 's': this.keys.down = true; break;
        case ' ': case 'Enter':
          this.keys.action = true;
          this._actionCallbacks.forEach(fn => fn());
          break;
      }
    });
    on(window, 'keyup', (e) => {
      switch (e.key) {
        case 'ArrowLeft': case 'a': this.keys.left = false; break;
        case 'ArrowRight': case 'd': this.keys.right = false; break;
        case 'ArrowUp': case 'w': this.keys.up = false; break;
        case 'ArrowDown': case 's': this.keys.down = false; break;
        case ' ': case 'Enter': this.keys.action = false; break;
      }
    });

    // Touch
    on(this.canvas, 'touchstart', (e) => {
      e.preventDefault();
      const pos = this._canvasPos(e);
      this.touch.active = true;
      this.touch.startX = pos.x;
      this.touch.startY = pos.y;
      this.touch.x = pos.x;
      this.touch.y = pos.y;
    }, { passive: false });

    on(this.canvas, 'touchmove', (e) => {
      e.preventDefault();
      const pos = this._canvasPos(e);
      this.touch.x = pos.x;
      this.touch.y = pos.y;
    }, { passive: false });

    on(this.canvas, 'touchend', (e) => {
      e.preventDefault();
      if (this.touch.active) {
        const dx = this.touch.x - this.touch.startX;
        const dy = this.touch.y - this.touch.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > this._swipeThreshold) {
          if (Math.abs(dx) > Math.abs(dy)) {
            this.swipe = { dir: dx > 0 ? 'right' : 'left' };
          } else {
            this.swipe = { dir: dy > 0 ? 'down' : 'up' };
          }
        } else {
          // Tap = action
          this._actionCallbacks.forEach(fn => fn());
        }
      }
      this.touch.active = false;
    }, { passive: false });

    // Mouse (for desktop testing)
    on(this.canvas, 'mousedown', (e) => {
      const pos = this._canvasPos(e);
      this.touch.active = true;
      this.touch.startX = pos.x;
      this.touch.startY = pos.y;
      this.touch.x = pos.x;
      this.touch.y = pos.y;
    });
    on(this.canvas, 'mousemove', (e) => {
      if (!this.touch.active) return;
      const pos = this._canvasPos(e);
      this.touch.x = pos.x;
      this.touch.y = pos.y;
    });
    on(window, 'mouseup', () => {
      if (this.touch.active) {
        const dx = this.touch.x - this.touch.startX;
        const dy = this.touch.y - this.touch.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > this._swipeThreshold) {
          if (Math.abs(dx) > Math.abs(dy)) {
            this.swipe = { dir: dx > 0 ? 'right' : 'left' };
          } else {
            this.swipe = { dir: dy > 0 ? 'down' : 'up' };
          }
        } else {
          this._actionCallbacks.forEach(fn => fn());
        }
      }
      this.touch.active = false;
    });
  }

  /** Get directional input as {x, y} where each is -1, 0, or 1. */
  get direction() {
    let x = 0, y = 0;

    // Keyboard
    if (this.keys.left) x -= 1;
    if (this.keys.right) x += 1;
    if (this.keys.up) y -= 1;
    if (this.keys.down) y += 1;

    // Touch drag direction (virtual joystick)
    if (this.touch.active) {
      const dx = this.touch.x - this.touch.startX;
      const dy = this.touch.y - this.touch.startY;
      if (Math.abs(dx) > 15) x = dx > 0 ? 1 : -1;
      if (Math.abs(dy) > 15) y = dy > 0 ? 1 : -1;
    }

    return { x, y };
  }

  /** Call once per frame to reset one-shot states. */
  endFrame() {
    this.swipe = null;
  }

  dispose() {
    for (const [el, evt, fn, opts] of this._listeners) {
      el.removeEventListener(evt, fn, opts);
    }
    this._listeners = [];
    this._actionCallbacks = [];
  }
}
