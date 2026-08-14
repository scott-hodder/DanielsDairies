/**
 * Core game canvas with render loop, camera, and screen shake.
 * All games create one of these and draw sprites into it.
 */
export default class GameCanvas {
  /**
   * @param {HTMLElement} container — DOM element to append canvas into
   * @param {Object} [opts]
   * @param {number} [opts.fps=30]
   * @param {number} [opts.width] — logical width (defaults to container width)
   * @param {number} [opts.height] — logical height (defaults to container height)
   */
  constructor(container, opts = {}) {
    this.container = container;
    this.fps = opts.fps || 30;
    this._frameDuration = 1000 / this.fps;

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    // Sizing — _fixedWidth/Height lock dimensions if explicitly provided
    this._fixedWidth = opts.width || 0;
    this._fixedHeight = opts.height || 0;
    this.logicalWidth = 0;
    this.logicalHeight = 0;
    this._resize();

    // Camera
    this.camera = { x: 0, y: 0, zoom: 1 };

    // Screen shake
    this._shakeAmount = 0;
    this._shakeDuration = 0;
    this._shakeElapsed = 0;

    // Render loop
    this._running = false;
    this._lastTime = 0;
    this._accumulator = 0;
    this._rafId = 0;
    this._updateFn = null;
    this._renderFn = null;

    // Resize observer
    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(container);
  }

  get width() { return this.logicalWidth; }
  get height() { return this.logicalHeight; }

  _resize() {
    const rect = this.container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this._fixedWidth || Math.round(rect.width);
    const h = this._fixedHeight || Math.round(rect.height);
    this.logicalWidth = w;
    this.logicalHeight = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /** Start the game loop. update(dt) is called at fixed fps. render(ctx, canvas) after. */
  run(updateFn, renderFn) {
    this._updateFn = updateFn;
    this._renderFn = renderFn;
    this._running = true;
    this._lastTime = performance.now();
    this._accumulator = 0;
    this._loop(this._lastTime);
  }

  _loop(now) {
    if (!this._running) return;
    this._rafId = requestAnimationFrame((t) => this._loop(t));

    let delta = now - this._lastTime;
    this._lastTime = now;
    if (delta > 100) delta = this._frameDuration; // clamp after tab-switch

    this._accumulator += delta;
    const dt = this._frameDuration / 1000; // fixed dt in seconds

    while (this._accumulator >= this._frameDuration) {
      this._accumulator -= this._frameDuration;
      if (this._updateFn) this._updateFn(dt);
      // Update shake
      if (this._shakeDuration > 0) {
        this._shakeElapsed += this._frameDuration;
        if (this._shakeElapsed >= this._shakeDuration) {
          this._shakeDuration = 0;
          this._shakeAmount = 0;
        }
      }
    }

    // Render
    const c = this.ctx;
    c.save();

    // Apply camera
    let ox = -this.camera.x;
    let oy = -this.camera.y;

    // Apply shake
    if (this._shakeDuration > 0) {
      const intensity = this._shakeAmount * (1 - this._shakeElapsed / this._shakeDuration);
      ox += (Math.random() - 0.5) * intensity * 2;
      oy += (Math.random() - 0.5) * intensity * 2;
    }

    c.translate(ox, oy);
    if (this.camera.zoom !== 1) {
      c.translate(this.logicalWidth / 2, this.logicalHeight / 2);
      c.scale(this.camera.zoom, this.camera.zoom);
      c.translate(-this.logicalWidth / 2, -this.logicalHeight / 2);
    }

    if (this._renderFn) this._renderFn(c, this);
    c.restore();
  }

  /** Trigger a screen shake. */
  shake(amount = 6, durationMs = 300) {
    this._shakeAmount = amount;
    this._shakeDuration = durationMs;
    this._shakeElapsed = 0;
  }

  /** Clear the canvas. Call at start of render. */
  clear(color) {
    const c = this.ctx;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (color) {
      c.fillStyle = color;
      c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    } else {
      c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    c.restore();
  }

  stop() {
    this._running = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
  }

  dispose() {
    this.stop();
    this._resizeObserver?.disconnect();
    this.canvas.remove();
  }
}
