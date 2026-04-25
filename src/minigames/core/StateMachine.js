// Tiny state machine for mini-game lifecycle.
// Keeps the set of allowed transitions explicit so bugs are loud.

const ALLOWED = {
  idle:      ['ready', 'disposed'],
  ready:     ['playing', 'disposed'],
  playing:   ['paused', 'completed', 'failed', 'disposed'],
  paused:    ['playing', 'completed', 'failed', 'disposed'],
  completed: ['disposed'],
  failed:    ['disposed'],
  disposed:  [],
};

export default class StateMachine {
  constructor(initial = 'idle') {
    this.current = initial;
    this.listeners = new Set();
  }

  transition(next) {
    const allowed = ALLOWED[this.current] || [];
    if (!allowed.includes(next)) {
      throw new Error(`Illegal transition: ${this.current} -> ${next}`);
    }
    const prev = this.current;
    this.current = next;
    this.listeners.forEach((fn) => {
      try { fn(next, prev); } catch (e) { console.error('[SM] listener error', e); }
    });
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  is(...states) { return states.includes(this.current); }
}
