/**
 * Lightweight particle emitter with object pooling.
 * Max 50 active particles by default.
 */
export default class ParticleEmitter {
  constructor(opts = {}) {
    this.maxParticles = opts.max || 50;
    this._pool = [];
    this._active = [];
  }

  /**
   * Emit particles.
   * @param {Object} opts
   * @param {number} opts.x
   * @param {number} opts.y
   * @param {number} [opts.count=5]
   * @param {string} [opts.color='#FFD700']
   * @param {number} [opts.size=4]
   * @param {number} [opts.life=1] — seconds
   * @param {number} [opts.spread=60] — velocity spread
   * @param {number} [opts.gravity=0]
   * @param {'circle'|'square'|'star'} [opts.shape='circle']
   */
  emit(opts) {
    const count = opts.count || 5;
    for (let i = 0; i < count; i++) {
      if (this._active.length >= this.maxParticles) break;
      const p = this._pool.pop() || {};
      p.x = opts.x + (Math.random() - 0.5) * (opts.spreadX || 10);
      p.y = opts.y + (Math.random() - 0.5) * (opts.spreadY || 10);
      const angle = Math.random() * Math.PI * 2;
      const speed = (opts.spread || 60) * (0.3 + Math.random() * 0.7);
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.gravity = opts.gravity || 0;
      p.life = opts.life || 1;
      p.maxLife = p.life;
      p.size = (opts.size || 4) * (0.5 + Math.random() * 0.5);
      p.color = opts.color || '#FFD700';
      p.shape = opts.shape || 'circle';
      p.rotation = Math.random() * Math.PI * 2;
      p.rotSpeed = (Math.random() - 0.5) * 4;
      this._active.push(p);
    }
  }

  update(dt) {
    for (let i = this._active.length - 1; i >= 0; i--) {
      const p = this._active[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.life -= dt;
      p.rotation += p.rotSpeed * dt;
      if (p.life <= 0) {
        this._active.splice(i, 1);
        this._pool.push(p);
      }
    }
  }

  render(ctx) {
    for (const p of this._active) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      const s = p.size * (0.5 + alpha * 0.5);
      if (p.shape === 'star') {
        _drawStar(ctx, 0, 0, s);
      } else if (p.shape === 'square') {
        ctx.fillRect(-s / 2, -s / 2, s, s);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  clear() {
    this._pool.push(...this._active);
    this._active = [];
  }

  get count() { return this._active.length; }
}

function _drawStar(ctx, x, y, size) {
  const spikes = 5;
  const outer = size;
  const inner = size * 0.4;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}
