// Coping Kit Builder — Conveyor Belt Catch
// Items slide across a conveyor belt. Tap helpful coping tools to grab
// them into your backpack. Let bad ones pass. Grabbing a bad item costs
// a life. Fill the backpack to win.

import IMiniGame from '../../IMiniGame.js';
import { register } from '../../registry.js';
import { DIFFICULTY } from '../../content/difficulty.js';

const GOOD = [
  { text: 'Deep breaths', icon: '🌬️' },
  { text: 'Ask for help', icon: '🤝' },
  { text: 'Kind words', icon: '💬' },
  { text: 'Take a walk', icon: '🚶' },
  { text: 'Count to ten', icon: '🔢' },
  { text: 'Draw it out', icon: '🎨' },
  { text: 'Listen to music', icon: '🎵' },
  { text: 'Hug a pet', icon: '🐶' },
  { text: 'Drink water', icon: '💧' },
  { text: 'Squeeze a toy', icon: '🧸' },
];
const BAD = [
  { text: 'Yell at people', icon: '😤' },
  { text: 'Throw things', icon: '💥' },
  { text: 'Blame others', icon: '👉' },
  { text: 'Hit something', icon: '👊' },
  { text: 'Say mean words', icon: '😠' },
  { text: 'Give up', icon: '🚫' },
];

class CopingKitGame extends IMiniGame {
  constructor(ctx) {
    super(ctx);
    const tier = DIFFICULTY[ctx.difficulty] || DIFFICULTY.easy;
    this.neededItems = Math.max(5, Math.round(6 * tier.targetCountMultiplier));
    this.beltSpeed = 60 * tier.speedMultiplier; // px/s
    this.spawnRate = 1400 / tier.speedMultiplier;
    this.collected = 0;
    this.lives = 3;
    this.items = [];
    this._raf = null;
    this._spawnHandle = null;
    this._lastFrame = 0;
    // Track recently spawned items to avoid duplicates
    this._recentGood = [];
    this._recentBad = [];
  }

  mount() {
    const { container } = this.ctx;
    container.innerHTML = `
      <div class="mg-ck-game">
        <div class="mg-ck-hud">
          <span>🎒 <span id="mgCkCollected">0</span>/${this.neededItems}</span>
          <span id="mgCkLives">❤️❤️❤️</span>
        </div>
        <div class="mg-ck-belt" id="mgCkBelt">
          <div class="mg-ck-belt-line"></div>
        </div>
        <div class="mg-ck-backpack" id="mgCkBackpack">
          <div class="mg-ck-bp-label">🎒 Your Kit</div>
          <div class="mg-ck-bp-items" id="mgCkBpItems"></div>
        </div>
      </div>
    `;
    this.belt = container.querySelector('#mgCkBelt');
    this.collectedEl = container.querySelector('#mgCkCollected');
    this.livesEl = container.querySelector('#mgCkLives');
    this.bpItems = container.querySelector('#mgCkBpItems');
  }

  start() {
    this._spawnHandle = setInterval(() => this._spawn(), this.spawnRate);
    this._spawn();
    this._lastFrame = performance.now();
    this._loop();
  }

  _pickUnique(bank, recent, maxRecent) {
    const available = bank.filter(b => !recent.includes(b.text));
    const pool = available.length > 0 ? available : bank;
    const item = pool[Math.floor(Math.random() * pool.length)];
    recent.push(item.text);
    if (recent.length > maxRecent) recent.shift();
    return item;
  }

  _spawn() {
    if (!this.state.is('playing')) return;
    const isGood = Math.random() < 0.6;
    const item = isGood
      ? this._pickUnique(GOOD, this._recentGood, Math.min(7, GOOD.length - 1))
      : this._pickUnique(BAD, this._recentBad, Math.min(4, BAD.length - 1));

    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'mg-ck-item ' + (isGood ? 'good' : 'bad');
    el.innerHTML = `<span class="mg-ck-item-icon">${item.icon}</span><span class="mg-ck-item-text">${item.text}</span>`;
    el.style.left = '-120px';
    el.style.top = (10 + Math.random() * 30) + '%';

    el.addEventListener('click', () => this._grab(el, isGood, item));

    this.belt.appendChild(el);
    this.items.push({ el, x: -120, done: false });
  }

  _grab(el, isGood, item) {
    if (el.dataset.done) return;
    el.dataset.done = '1';

    if (isGood) {
      this.collected += 1;
      this.collectedEl.textContent = this.collected;
      el.classList.add('grabbed');
      this.ctx.audio.play('pop');
      // Add to backpack
      const chip = document.createElement('span');
      chip.className = 'mg-ck-bp-chip';
      chip.textContent = item.icon + ' ' + item.text;
      this.bpItems.appendChild(chip);

      if (this.collected >= this.neededItems) {
        clearInterval(this._spawnHandle);
        setTimeout(() => this._win(), 400);
      }
    } else {
      this.lives -= 1;
      this._updateLives();
      el.classList.add('bad-grab');
      this.ctx.audio.play('wrong');
      if (this.lives <= 0) {
        clearInterval(this._spawnHandle);
        setTimeout(() => this._lose(), 400);
      }
    }
    setTimeout(() => el.remove(), 400);
  }

  _loop() {
    const now = performance.now();
    const dt = (now - this._lastFrame) / 1000;
    this._lastFrame = now;

    if (!this.state.is('playing')) return;

    const beltW = this.belt.offsetWidth;
    for (const item of this.items) {
      if (item.done) continue;
      item.x += this.beltSpeed * dt;
      item.el.style.left = item.x + 'px';

      if (item.x > beltW + 50) {
        item.done = true;
        item.el.remove();
      }
    }
    this.items = this.items.filter(i => !i.done);
    this._raf = requestAnimationFrame(() => this._loop());
  }

  _updateLives() {
    this.livesEl.textContent = '❤️'.repeat(Math.max(0, this.lives)) + '🖤'.repeat(Math.max(0, 3 - this.lives));
  }

  _win() {
    this._complete({ score: 1, success: true, skillTags: ['coping-skills'] });
  }

  _lose() {
    this._complete({ score: this.collected / this.neededItems, success: false, skillTags: ['coping-skills'] });
  }

  dispose() {
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this._spawnHandle) clearInterval(this._spawnHandle);
    super.dispose();
  }
}

register({
  id: 'coping-kit',
  displayName: 'Coping Kit Builder',
  skillTags: ['coping-skills'],
  factory: (ctx) => new CopingKitGame(ctx),
  defaultConfig: {},
});

export default {};
