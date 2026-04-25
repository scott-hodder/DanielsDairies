// Pausable countdown timer. Used by every timed mini-game.
// Drives a callback with remaining ms; fires onExpire when it hits zero.

export default class Timer {
  constructor({ durationMs, onTick, onExpire, tickInterval = 100 }) {
    this.durationMs = durationMs;
    this.remaining = durationMs;
    this.onTick = onTick || (() => {});
    this.onExpire = onExpire || (() => {});
    this.tickInterval = tickInterval;
    this._handle = null;
    this._lastTick = 0;
    this._running = false;
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._lastTick = performance.now();
    this._handle = setInterval(() => this._tick(), this.tickInterval);
  }

  pause() {
    if (!this._running) return;
    this._running = false;
    clearInterval(this._handle);
    this._handle = null;
    this._drain();
  }

  resume() { if (!this._running) this.start(); }

  stop() {
    this._running = false;
    if (this._handle) clearInterval(this._handle);
    this._handle = null;
  }

  reset(ms = this.durationMs) {
    this.stop();
    this.durationMs = ms;
    this.remaining = ms;
  }

  _drain() {
    const now = performance.now();
    this.remaining = Math.max(0, this.remaining - (now - this._lastTick));
    this._lastTick = now;
  }

  _tick() {
    this._drain();
    this.onTick(this.remaining, this.durationMs);
    if (this.remaining <= 0) {
      this.stop();
      this.onExpire();
    }
  }
}
