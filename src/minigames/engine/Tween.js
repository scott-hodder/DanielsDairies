/**
 * Simple tweening utility for smooth animations.
 * Manages a list of active tweens, updated per frame.
 */
export default class TweenManager {
  constructor() {
    this._tweens = [];
  }

  /**
   * Create a tween.
   * @param {Object} target — object whose properties to animate
   * @param {Object} to — target values { x: 100, y: 200 }
   * @param {number} duration — seconds
   * @param {Object} [opts]
   * @param {string} [opts.ease='easeInOut']
   * @param {number} [opts.delay=0]
   * @param {Function} [opts.onComplete]
   * @returns {Object} tween handle with .cancel()
   */
  to(target, to, duration, opts = {}) {
    const from = {};
    for (const key of Object.keys(to)) {
      from[key] = target[key];
    }
    const tween = {
      target,
      from,
      to,
      duration,
      elapsed: -(opts.delay || 0),
      ease: EASING[opts.ease] || EASING.easeInOut,
      onComplete: opts.onComplete || null,
      _cancelled: false,
      cancel() { this._cancelled = true; },
    };
    this._tweens.push(tween);
    return tween;
  }

  update(dt) {
    for (let i = this._tweens.length - 1; i >= 0; i--) {
      const t = this._tweens[i];
      if (t._cancelled) { this._tweens.splice(i, 1); continue; }
      t.elapsed += dt;
      if (t.elapsed < 0) continue; // still in delay
      const progress = Math.min(t.elapsed / t.duration, 1);
      const eased = t.ease(progress);
      for (const key of Object.keys(t.to)) {
        t.target[key] = t.from[key] + (t.to[key] - t.from[key]) * eased;
      }
      if (progress >= 1) {
        this._tweens.splice(i, 1);
        if (t.onComplete) t.onComplete();
      }
    }
  }

  clear() {
    this._tweens = [];
  }

  get active() { return this._tweens.length; }
}

const EASING = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => t * (2 - t),
  easeInOut: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  bounce: (t) => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  },
};
