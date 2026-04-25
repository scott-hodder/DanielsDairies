// Thought Catcher — Arcade catch game
// Control a butterfly net at the bottom. Helpful thoughts (green) fall —
// catch them. Unhelpful thoughts (red) also fall — dodge them.
// Move the net by dragging/touching or mouse movement.

import IMiniGame from '../../IMiniGame.js';
import { register } from '../../registry.js';
import { DIFFICULTY } from '../../content/difficulty.js';

const HELPFUL = [
  { text: 'I can try again', short: 'Try again' },
  { text: 'Mistakes help me learn', short: 'Mistakes = learning' },
  { text: 'I am brave', short: 'I am brave' },
  { text: 'I can ask for help', short: 'Ask for help' },
  { text: 'I am kind', short: 'I am kind' },
  { text: 'I can do hard things', short: 'I can do it' },
  { text: 'One step at a time', short: 'One step' },
];
const UNHELPFUL = [
  { text: "I'm no good", short: "No good" },
  { text: 'I give up', short: 'Give up' },
  { text: "I'll never get it", short: "Never" },
  { text: "Nobody likes me", short: "Nobody" },
];

class ThoughtCatcherGame extends IMiniGame {
  constructor(ctx) {
    super(ctx);
    const tier = DIFFICULTY[ctx.difficulty] || DIFFICULTY.easy;
    this.targetCatches = Math.max(6, Math.round(8 * tier.targetCountMultiplier));
    this.fallSpeed = 80 * tier.speedMultiplier; // px per second
    this.spawnRate = 900 / tier.speedMultiplier; // ms between spawns
    this.caught = 0;
    this.missed = 0;
    this.lives = 3;
    this.netX = 50; // percentage
    this.thoughts = [];
    this._raf = null;
    this._spawnHandle = null;
    this._lastFrame = 0;
  }

  mount() {
    const { container } = this.ctx;
    container.innerHTML = `
      <div class="mg-tc-game">
        <div class="mg-tc-hud">
          <span>🦋 <span id="mgTcCaught">0</span>/${this.targetCatches}</span>
          <span class="mg-tc-keys-hint">← → Arrow keys</span>
          <span id="mgTcLives">❤️❤️❤️</span>
        </div>
        <div class="mg-tc-field" id="mgTcField">
          <div class="mg-tc-net" id="mgTcNet">🥅</div>
        </div>
      </div>
    `;
    this.field = container.querySelector('#mgTcField');
    this.net = container.querySelector('#mgTcNet');
    this.caughtEl = container.querySelector('#mgTcCaught');
    this.livesEl = container.querySelector('#mgTcLives');
  }

  start() {
    // Arrow-key control for the net
    this._keys = {};
    this._keyDown = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); this._keys[e.key] = true; }
    };
    this._keyUp = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); this._keys[e.key] = false; }
    };
    window.addEventListener('keydown', this._keyDown);
    window.addEventListener('keyup', this._keyUp);

    // Also allow touch/mouse as fallback
    const field = this.field;
    const moveNet = (clientX) => {
      const rect = field.getBoundingClientRect();
      this.netX = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100));
      this.net.style.left = this.netX + '%';
    };
    field.addEventListener('mousemove', (e) => moveNet(e.clientX));
    field.addEventListener('touchmove', (e) => {
      e.preventDefault();
      moveNet(e.touches[0].clientX);
    }, { passive: false });

    this._spawnHandle = setInterval(() => this._spawn(), this.spawnRate);
    this._lastFrame = performance.now();
    this._loop();
  }

  _spawn() {
    if (!this.state.is('playing')) return;
    const helpful = Math.random() < 0.6;
    const bank = helpful ? HELPFUL : UNHELPFUL;
    const item = bank[Math.floor(Math.random() * bank.length)];

    const el = document.createElement('div');
    el.className = 'mg-tc-thought ' + (helpful ? 'helpful' : 'unhelpful');
    el.textContent = item.short;
    const x = 5 + Math.random() * 85;
    el.style.left = x + '%';
    el.style.top = '-40px';
    this.field.appendChild(el);

    this.thoughts.push({ el, x, y: -40, helpful, done: false });
  }

  _loop() {
    const now = performance.now();
    const dt = (now - this._lastFrame) / 1000;
    this._lastFrame = now;

    if (!this.state.is('playing')) return;

    // Move net via arrow keys
    const moveSpeed = 80; // % per second
    if (this._keys['ArrowLeft']) {
      this.netX = Math.max(5, this.netX - moveSpeed * dt);
      this.net.style.left = this.netX + '%';
    }
    if (this._keys['ArrowRight']) {
      this.netX = Math.min(95, this.netX + moveSpeed * dt);
      this.net.style.left = this.netX + '%';
    }

    const fieldH = this.field.offsetHeight;
    const netY = fieldH - 50; // net position from top

    for (const t of this.thoughts) {
      if (t.done) continue;
      t.y += this.fallSpeed * dt;
      t.el.style.top = t.y + 'px';

      // Check if thought reached net zone
      if (t.y >= netY - 15 && t.y <= netY + 15) {
        const thoughtX = parseFloat(t.el.style.left);
        if (Math.abs(thoughtX - this.netX) < 12) {
          t.done = true;
          if (t.helpful) {
            this.caught += 1;
            this.caughtEl.textContent = this.caught;
            t.el.classList.add('caught');
            this.ctx.audio.play('pop');
            if (this.caught >= this.targetCatches) {
              setTimeout(() => this._win(), 300);
              return;
            }
          } else {
            this.lives -= 1;
            this._updateLives();
            t.el.classList.add('bad-catch');
            this.ctx.audio.play('wrong');
            if (this.lives <= 0) {
              setTimeout(() => this._lose(), 300);
              return;
            }
          }
          setTimeout(() => t.el.remove(), 300);
        }
      }

      // Fell off bottom
      if (t.y > fieldH + 20) {
        t.done = true;
        t.el.remove();
        if (t.helpful) this.missed += 1;
      }
    }

    this.thoughts = this.thoughts.filter(t => !t.done);
    this._raf = requestAnimationFrame(() => this._loop());
  }

  _updateLives() {
    this.livesEl.textContent = '❤️'.repeat(Math.max(0, this.lives)) + '🖤'.repeat(Math.max(0, 3 - this.lives));
  }

  _win() {
    clearInterval(this._spawnHandle);
    this._complete({ score: 1 - (this.missed * 0.05), success: true, skillTags: ['cognitive-reframing'] });
  }

  _lose() {
    clearInterval(this._spawnHandle);
    this._complete({ score: this.caught / this.targetCatches, success: false, skillTags: ['cognitive-reframing'] });
  }

  dispose() {
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this._spawnHandle) clearInterval(this._spawnHandle);
    if (this._keyDown) window.removeEventListener('keydown', this._keyDown);
    if (this._keyUp) window.removeEventListener('keyup', this._keyUp);
    super.dispose();
  }
}

register({
  id: 'thought-catcher',
  displayName: 'Thought Catcher',
  skillTags: ['cognitive-reframing'],
  factory: (ctx) => new ThoughtCatcherGame(ctx),
  defaultConfig: {},
});

export default {};
