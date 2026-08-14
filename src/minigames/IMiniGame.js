import StateMachine from './core/StateMachine.js';
import Scorer from './core/Scorer.js';

/**
 * Abstract base class for all mini-games.
 *
 * Subclasses MUST implement: mount(), start(), dispose().
 * Subclasses MAY override: pause(), resume(), update(dt).
 *
 * Lifecycle (driven by MiniGameController + StateMachine):
 *   construct -> mount -> start -> [pause/resume]* -> complete|fail -> dispose
 *
 * Subclasses should never call completeRoadblock directly — they call
 * this._complete(partial) or this._fail(partial) and the controller
 * forwards the result to the roadblock system.
 */
export default class IMiniGame {
  /** @param {import('./types.js').MiniGameContext} ctx */
  constructor(ctx) {
    if (new.target === IMiniGame) {
      throw new Error('IMiniGame is abstract — subclass it.');
    }
    this.ctx = ctx;
    this.state = new StateMachine('idle');
    this._startedAt = 0;
    this._attempts = 0;
    this._score = 0;
    this._resolve = null;
    this._reject = null;
  }

  // ---- Public lifecycle (called by controller) ------------------------------

  /** Mount DOM into ctx.container. Must be idempotent. */
  mount() { throw new Error(`${this.constructor.name}.mount() not implemented`); }

  /** Begin gameplay. Returns a Promise<MiniGameResult>. */
  run() {
    return new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
      try {
        this.state.transition('ready');
        this.mount();
        this.state.transition('playing');
        this._startedAt = performance.now();
        this._attempts = 1;
        this.ctx.emit('game.start', { gameId: this.ctx.gameId });
        this.start();
      } catch (err) {
        this._reject(err);
      }
    });
  }

  start() { throw new Error(`${this.constructor.name}.start() not implemented`); }

  pause() {
    if (this.state.current !== 'playing') return;
    this.state.transition('paused');
    this.ctx.emit('game.pause');
  }

  resume() {
    if (this.state.current !== 'paused') return;
    this.state.transition('playing');
    this.ctx.emit('game.resume');
  }

  /** Optional per-frame hook for games that want a ticker. */
  update(/* dt */) {}

  /** Called by controller when modal is being torn down. */
  dispose() {
    if (!['completed', 'failed', 'disposed'].includes(this.state.current)) {
      this.state.transition('disposed');
    }
    // Subclasses should override to remove listeners/timers.
  }

  // ---- Protected helpers for subclasses -------------------------------------

  /**
   * @param {Partial<import('./types.js').MiniGameResult>} partial
   */
  _complete(partial = {}) {
    if (!this.state.is('playing', 'paused')) return;
    this.state.transition('completed');
    this._finish(true, partial);
  }

  _fail(partial = {}) {
    if (!this.state.is('playing', 'paused')) return;
    this.state.transition('failed');
    this._finish(false, partial);
  }

  _finish(success, partial) {
    const durationMs = Math.round(performance.now() - this._startedAt);
    const finalScore = partial.score ?? this._score;

    // Auto-calculate stars from score if not explicitly provided.
    // On failure, always 0 stars. On success, use Scorer with difficulty thresholds.
    let stars = partial.starsEarned;
    if (stars == null || stars === undefined) {
      if (!success) {
        stars = 0;
      } else {
        stars = new Scorer(this.ctx.difficulty || 'easy').stars(finalScore);
        // Guarantee at least 1 star on any successful completion
        if (stars < 1) stars = 1;
      }
    }

    /** @type {import('./types.js').MiniGameResult} */
    const result = {
      gameId: this.ctx.gameId,
      completed: true,
      success,
      score: finalScore,
      starsEarned: stars,
      durationMs,
      attempts: partial.attempts ?? this._attempts,
      skillTags: partial.skillTags ?? [],
      events: [],
      ...partial,
      starsEarned: stars, // ensure stars override any spread from partial
    };
    this.ctx.emit(success ? 'game.success' : 'game.fail', { durationMs, score: result.score });
    this._resolve?.(result);
  }
}
