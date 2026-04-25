// Focus Fireflies — Night forest tap game
// Dark forest scene. Fireflies appear, MOVE around, glow and fade.
// Tap to collect them into a jar. Fill the jar to win.
// Red fireflies = imposters, lose a life if tapped.

import IMiniGame from '../../IMiniGame.js';
import { register } from '../../registry.js';
import { DIFFICULTY } from '../../content/difficulty.js';

class FocusFirefliesGame extends IMiniGame {
  constructor(ctx) {
    super(ctx);
    const tier = DIFFICULTY[ctx.difficulty] || DIFFICULTY.easy;
    this.target = Math.max(8, Math.round(12 * tier.targetCountMultiplier));
    this.lifetimeMs = Math.round(2200 / tier.speedMultiplier);
    this.spawnRate = Math.round(800 / tier.speedMultiplier);
    this.caught = 0;
    this.lives = 3;
    this.flies = [];
    this._raf = null;
    this._spawnHandle = null;
    this._lastFrame = 0;
  }

  mount() {
    const { container } = this.ctx;
    container.innerHTML = `
      <div class="mg-ff-game">
        <div class="mg-ff-hud">
          <span id="mgFfLives">❤️❤️❤️</span>
          <span class="mg-ff-jar-hud">🫙 <span id="mgFfCaught">0</span>/${this.target}</span>
        </div>
        <div class="mg-ff-forest" id="mgFfForest">
          <div class="mg-ff-trees">🌲🌳🌲🌳🌲🌳🌲</div>
        </div>
        <div class="mg-ff-jar-wrap">
          <div class="mg-ff-jar" id="mgFfJar">
            <div class="mg-ff-jar-fill" id="mgFfJarFill"></div>
          </div>
        </div>
      </div>
    `;
    this.forest = container.querySelector('#mgFfForest');
    this.caughtEl = container.querySelector('#mgFfCaught');
    this.livesEl = container.querySelector('#mgFfLives');
    this.jarFill = container.querySelector('#mgFfJarFill');
  }

  start() {
    this._spawnHandle = setInterval(() => this._spawn(), this.spawnRate);
    this._spawn();
    this._lastFrame = performance.now();
    this._loop();
  }

  _spawn() {
    if (!this.state.is('playing')) return;
    const isImposter = Math.random() < 0.2;
    const fly = {
      el: null,
      x: 10 + Math.random() * 80,
      y: 10 + Math.random() * 70,
      vx: (Math.random() - 0.5) * 40,
      vy: (Math.random() - 0.5) * 30,
      age: 0,
      lifetime: this.lifetimeMs,
      imposter: isImposter,
      done: false,
    };

    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'mg-ff-fly' + (isImposter ? ' imposter' : '');
    el.textContent = isImposter ? '🔴' : '✨';
    el.style.left = fly.x + '%';
    el.style.top = fly.y + '%';
    el.addEventListener('click', () => this._tap(fly));
    this.forest.appendChild(el);
    fly.el = el;
    this.flies.push(fly);
  }

  _tap(fly) {
    if (fly.done) return;
    fly.done = true;

    if (fly.imposter) {
      this.lives -= 1;
      this._updateLives();
      fly.el.classList.add('bad-tap');
      this.ctx.audio.play('wrong');
      setTimeout(() => fly.el.remove(), 300);
      if (this.lives <= 0) {
        clearInterval(this._spawnHandle);
        setTimeout(() => this._endGame(false), 300);
      }
    } else {
      this.caught += 1;
      this.caughtEl.textContent = this.caught;
      this.jarFill.style.height = Math.min(100, (this.caught / this.target) * 100) + '%';
      fly.el.classList.add('caught');
      this.ctx.audio.play('chime');
      setTimeout(() => fly.el.remove(), 200);
      if (this.caught >= this.target) {
        clearInterval(this._spawnHandle);
        setTimeout(() => this._endGame(true), 300);
      }
    }
  }

  _loop() {
    const now = performance.now();
    const dt = (now - this._lastFrame) / 1000;
    this._lastFrame = now;

    if (!this.state.is('playing')) return;

    for (const fly of this.flies) {
      if (fly.done) continue;
      fly.age += dt * 1000;

      // Move
      fly.x += fly.vx * dt;
      fly.y += fly.vy * dt;
      // Bounce off edges
      if (fly.x < 5 || fly.x > 92) fly.vx *= -1;
      if (fly.y < 5 || fly.y > 80) fly.vy *= -1;
      fly.x = Math.max(3, Math.min(95, fly.x));
      fly.y = Math.max(3, Math.min(85, fly.y));

      fly.el.style.left = fly.x + '%';
      fly.el.style.top = fly.y + '%';

      // Fade out near end of life
      const lifeRatio = fly.age / fly.lifetime;
      if (lifeRatio > 0.7) {
        fly.el.style.opacity = String(Math.max(0, 1 - (lifeRatio - 0.7) / 0.3));
      }

      // Expire
      if (fly.age >= fly.lifetime) {
        fly.done = true;
        fly.el.remove();
      }
    }

    this.flies = this.flies.filter(f => !f.done);
    this._raf = requestAnimationFrame(() => this._loop());
  }

  _updateLives() {
    this.livesEl.textContent = '❤️'.repeat(Math.max(0, this.lives)) + '🖤'.repeat(Math.max(0, 3 - this.lives));
  }

  _endGame(won) {
    if (!this.state.is('playing')) return;
    this._complete({
      score: this.caught / this.target,
      success: won,
      skillTags: ['focus', 'attention'],
    });
  }

  dispose() {
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this._spawnHandle) clearInterval(this._spawnHandle);
    super.dispose();
  }
}

register({
  id: 'focus-fireflies',
  displayName: 'Focus Fireflies',
  skillTags: ['focus', 'attention'],
  factory: (ctx) => new FocusFirefliesGame(ctx),
  defaultConfig: {},
});

export default {};
