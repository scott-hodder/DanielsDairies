/**
 * Base sprite: position, velocity, size, collision, draw.
 * Subclass or use directly with a custom drawFn.
 */
export default class Sprite {
  constructor(opts = {}) {
    this.x = opts.x || 0;
    this.y = opts.y || 0;
    this.w = opts.w || 32;
    this.h = opts.h || 32;
    this.vx = opts.vx || 0;
    this.vy = opts.vy || 0;
    this.visible = opts.visible !== false;
    this.active = opts.active !== false;
    this.rotation = opts.rotation || 0;
    this.alpha = opts.alpha ?? 1;
    this.tag = opts.tag || '';
    this._drawFn = opts.draw || null;
  }

  /** Update position from velocity. Override for custom physics. */
  update(dt) {
    if (!this.active) return;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  /** AABB collision rect. */
  get rect() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  /** Check AABB overlap with another sprite. */
  overlaps(other) {
    const a = this.rect;
    const b = other.rect;
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
  }

  /** Check if point is inside this sprite. */
  containsPoint(px, py) {
    return px >= this.x && px <= this.x + this.w &&
           py >= this.y && py <= this.y + this.h;
  }

  /** Render. Override or pass drawFn in constructor. */
  render(ctx) {
    if (!this.visible) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    if (this.rotation) {
      ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
      ctx.rotate(this.rotation);
      ctx.translate(-(this.x + this.w / 2), -(this.y + this.h / 2));
    }
    if (this._drawFn) {
      this._drawFn(ctx, this);
    } else {
      ctx.fillStyle = '#ccc';
      ctx.fillRect(this.x, this.y, this.w, this.h);
    }
    ctx.restore();
  }

  /** Center coordinates. */
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  /** Set center position. */
  setCenter(cx, cy) {
    this.x = cx - this.w / 2;
    this.y = cy - this.h / 2;
  }
}
